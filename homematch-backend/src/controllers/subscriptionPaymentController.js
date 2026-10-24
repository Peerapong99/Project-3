const fs = require('fs/promises');
const path = require('path');
const {randomUUID} = require('crypto');
const Plan = require('../models/SubscriptionPlan');
const Payment = require('../models/SubscriptionPayment');
const Settings = require('../models/SubscriptionPaymentSettings');
const service = require('../services/subscriptionService');
const {safe, paging} = require('./subscriptionController');
const privateDirectory = path.join(__dirname, '../../private/subscription-slips');
const statuses = ['awaiting_payment','pending','approved','rejected','expired'];
function cleanPayment(payment) {
  const data = payment.toObject ? payment.toObject() : payment;
  if (data.slip?.filename) data.slip = {uploadedAt: data.slip.uploadedAt, mimeType: data.slip.mimeType, available: true};
  return data;
}
const {imageType}=require('../services/imageTypeService');
exports.subscribe = safe(async (req, res) => {
  if (!['premium','pro'].includes(req.body?.planCode)) service.fail(400,'INVALID_PLAN','เลือก Premium หรือ Pro ที่เปิดขาย');
  if (Object.keys(req.body).some(k => k !== 'planCode')) service.fail(400, 'INVALID_FIELDS', "ส่งได้เฉพาะ planCode");
  const idempotencyKey = req.get('Idempotency-Key');
  if (!idempotencyKey || !/^[a-zA-Z0-9_-]{8,100}$/.test(idempotencyKey)) service.fail(400, 'IDEMPOTENCY_KEY_REQUIRED', "กรุณาระบุ Idempotency-Key 8-100 ตัวอักษร");
  const existing = await Payment.findOne({seller: req.user._id, idempotencyKey});
  if (existing) {
    if (existing.planSnapshot.code !== req.body.planCode) service.fail(409, 'KEY_REUSED', "Idempotency-Key นี้ใช้กับแพ็กเกจอื่นแล้ว");
    return res.json({payment: cleanPayment(existing)});
  }
  const plan = await Plan.findOne({code: req.body.planCode, isActive: true});
  if (!plan || plan.code === 'free') service.fail(400, 'INVALID_PLAN', "เลือก Premium หรือ Pro ที่เปิดขาย");
  const settings = await Settings.findOne({key:'subscription'});
  if (!settings?.enabled) service.fail(503, 'PAYMENT_NOT_CONFIGURED', "Admin ยังไม่ได้เปิดระบบชำระเงิน");
  if (settings.mode === 'manual' && !settings.qrDataUrl && !(settings.bankName && settings.accountName && settings.accountNumber)) service.fail(503, 'PAYMENT_NOT_CONFIGURED', "ยังไม่มีข้อมูลรับเงินจริง");
  const state = await service.ensureSubscription(req.user._id);
  const currentPlan = await service.effectivePlan(state);
  service.activation({...state.currentMembership.toObject(), plan:currentPlan}, service.snapshot(plan), new Date());
  const paymentSettingsSnapshot = settings.mode === 'simulation' ? {mode:'simulation'} : {
    mode:'manual',bankName:settings.bankName,accountName:settings.accountName,accountNumber:settings.accountNumber,promptPayId:settings.promptPayId,qrDataUrl:settings.qrDataUrl
  };
  let payment;
  try {payment = await Payment.create({seller:req.user._id,plan:plan._id,planSnapshot:service.snapshot(plan), amountSatang:plan.priceSatang,
    mode:settings.mode,paymentSettingsSnapshot,idempotencyKey,orderExpiresAt:new Date(Date.now()+service.DAY)});}
  catch(e) {if (e.code !== 11000) throw e; payment = await Payment.findOne({seller:req.user._id,idempotencyKey}); if (payment.planSnapshot.code !== req.body.planCode) service.fail(409,'KEY_REUSED',"Idempotency-Key นี้ใช้กับแพ็กเกจอื่นแล้ว");}
  res.status(201).json({payment:cleanPayment(payment)});
});
exports.getPayment = safe(async (req,res) => {
  const filter = {_id:req.params.id}; if(req.user.role !== 'admin') filter.seller = req.user._id;
  let payment = await Payment.findOne(filter);
  if(!payment) service.fail(404,'NOT_FOUND',"ไม่พบคำสั่งซื้อ");
  if(payment.status === 'awaiting_payment' && payment.orderExpiresAt <= new Date()) {
    await Payment.updateOne({_id:payment._id,status:'awaiting_payment'}, {$set:{status:'expired'}});
    payment = await Payment.findById(payment._id);
  }
  res.json({payment:cleanPayment(payment)});
});
exports.submit = safe(async (req,res) => {
  if (Object.keys(req.body).some(k=>k!=='paymentId')) service.fail(400,'INVALID_FIELDS',"ส่งได้เฉพาะ paymentId และ slip");
  const payment = await Payment.findOne({_id:req.body.paymentId,seller:req.user._id});
  if(!payment) service.fail(404,'NOT_FOUND',"ไม่พบคำสั่งซื้อ");
  if(payment.status !== 'awaiting_payment') service.fail(409,'PAYMENT_ALREADY_SUBMITTED',"คำสั่งซื้อนี้ส่งหลักฐานแล้วหรือปิดแล้ว");
  if(payment.orderExpiresAt <= new Date()) service.fail(409,'ORDER_EXPIRED',"คำสั่งซื้อหมดอายุ กรุณาสร้างคำสั่งซื้อใหม่");
  if(!req.file) service.fail(400,'SLIP_REQUIRED',"กรุณาอัปโหลดหลักฐาน");
  const type = imageType(req.file.buffer);
  if(!type || type.mimeType !== req.file.mimetype) service.fail(400,'INVALID_SLIP',"ไฟล์หลักฐานต้องเป็น JPG, PNG หรือ WEBP จริง");
  const filename = randomUUID()+type.extension;
  await fs.mkdir(privateDirectory,{recursive:true});
  await fs.writeFile(path.join(privateDirectory,filename),req.file.buffer,{flag:'wx'});
  try {
    const updated = await Payment.findOneAndUpdate({_id:payment._id,seller:req.user._id,status:'awaiting_payment',orderExpiresAt:{$gt:new Date()}},
      {$set:{status:'pending',slip:{filename,mimeType:type.mimeType,uploadedAt:new Date()}}},{returnDocument:'after',runValidators:true});
    if(!updated) service.fail(409,'PAYMENT_STATE_CHANGED',"สถานะคำสั่งซื้อเปลี่ยนแล้ว");
    res.status(201).json({payment:cleanPayment(updated),message:"ส่งหลักฐานแล้ว รอ Admin ตรวจสอบ ยังไม่เปิดสิทธิ์สมาชิก"});
  } catch(e) {await fs.unlink(path.join(privateDirectory,filename)).catch(()=>{}); throw e;}
});
exports.slip = safe(async (req,res) => {
  const filter={_id:req.params.id}; if(req.user.role !== 'admin') filter.seller=req.user._id;
  const payment=await Payment.findOne(filter);
  if(!payment?.slip?.filename) service.fail(404,'NOT_FOUND',"ไม่พบหลักฐาน");
  res.set({'Content-Type':payment.slip.mimeType,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.send(await fs.readFile(path.join(privateDirectory,path.basename(payment.slip.filename))));
});
exports.list = safe(async (req,res) => {
  const {page,limit}=paging(req); const filter={};
  if(req.query.status) {if(!statuses.includes(req.query.status)) service.fail(400,'INVALID_STATUS',"สถานะไม่ถูกต้อง"); filter.status=req.query.status;}
  const [payments,total]=await Promise.all([Payment.find(filter).populate('seller','name email').populate('reviewedBy','name').sort({createdAt:-1}).skip((page-1)*limit).limit(limit),Payment.countDocuments(filter)]);
  res.json({payments:payments.map(cleanPayment),total,page,limit});
});
exports.approve = safe(async (req,res) => {
  if(Object.keys(req.body || {}).length) service.fail(400,'INVALID_FIELDS',"การอนุมัติไม่รับราคา แพ็กเกจ หรือวันหมดอายุจาก request");
  const payment=await Payment.findById(req.params.id);
  if(!payment) service.fail(404,'NOT_FOUND',"ไม่พบรายการชำระเงิน");
  const result=await service.sellerTransaction(payment.seller,async ({session,subscription,now})=>{
    const current=await Payment.findOne({_id:payment._id,status:'pending'}).session(session);
    if(!current?.slip?.filename) service.fail(409,'PAYMENT_ALREADY_REVIEWED',"รายการนี้ไม่ได้รอตรวจสอบ หรือถูกตรวจสอบแล้ว");
    const before=subscription.currentMembership;
    const activated=service.activation(before,current.planSnapshot,now);
    subscription.currentMembership={plan:service.snapshot(current.planSnapshot),startsAt:activated.startsAt,endsAt:activated.endsAt,payment:current._id};
    subscription.history.push({type:activated.type,at:now,from:before.plan.code,to:current.planSnapshot.code,
      startsAt:activated.startsAt,endsAt:activated.endsAt,payment:current._id,planSnapshot:service.snapshot(current.planSnapshot)});
    await subscription.save({session});
    const updated=await Payment.findOneAndUpdate({_id:current._id,status:'pending'},{$set:{status:'approved',reviewedBy:req.user._id,reviewedAt:now}},{returnDocument:'after',session});
    if(!updated) service.fail(409,'PAYMENT_ALREADY_REVIEWED',"รายการนี้ถูกตรวจสอบแล้ว");
    return updated;
  });
  res.json({payment:cleanPayment(result),message:"อนุมัติและเปิดสิทธิ์สมาชิกแล้ว"});
});
exports.reject = safe(async (req,res) => {
  if(Object.keys(req.body).some(k=>k!=='reason') || typeof req.body.reason !== 'string' || !req.body.reason.trim() || req.body.reason.length>1000) service.fail(400,'REASON_REQUIRED',"กรุณาระบุเหตุผลไม่เกิน 1,000 ตัวอักษร");
  const payment=await Payment.findOneAndUpdate({_id:req.params.id,status:'pending'},{$set:{status:'rejected',rejectionReason:req.body.reason.trim(),reviewedBy:req.user._id,reviewedAt:new Date()}},{returnDocument:'after'});
  if(!payment) service.fail(409,'PAYMENT_ALREADY_REVIEWED',"ไม่พบรายการที่รอตรวจสอบ");
  res.json({payment:cleanPayment(payment)});
});
exports.revenue = safe(async (req,res) => {
  const totals=await Payment.aggregate([{$match:{status:'approved'}},{$group:{_id:'$mode',totalSatang:{$sum:'$amountSatang'},count:{$sum:1}}}]);
  res.json({manual:totals.find(t=>t._id==='manual') || {totalSatang:0,count:0},simulation:totals.find(t=>t._id==='simulation') || {totalSatang:0,count:0}});
});
exports.getSettings = safe(async (req,res)=>res.json({settings:await Settings.findOne({key:'subscription'}) || {enabled:false,mode:'manual',bankName:'',accountName:'',accountNumber:'',promptPayId:'',qrDataUrl:''}}));
exports.updateSettings = safe(async (req,res)=>{
  const allowed=['enabled','mode','bankName','accountName','accountNumber','promptPayId','qrDataUrl'];
  if(Object.keys(req.body).some(k=>!allowed.includes(k))) service.fail(400,'INVALID_FIELDS',"ฟิลด์ตั้งค่าไม่ถูกต้อง");
  const old=await Settings.findOne({key:'subscription'});
  const data={...(old?.toObject() || {enabled:false,mode:'manual'}),...req.body};
  if(typeof data.enabled!=='boolean' || !['manual','simulation'].includes(data.mode)) service.fail(400,'INVALID_SETTINGS',"โหมดหรือสถานะไม่ถูกต้อง");
  for(const key of ['bankName','accountName','accountNumber','promptPayId','qrDataUrl']) if(data[key] !== undefined && typeof data[key]!=='string') service.fail(400,'INVALID_SETTINGS',"ข้อมูลรับเงินต้องเป็นข้อความ");
  if(data.qrDataUrl) {
    if(data.qrDataUrl.length>750000 || !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(data.qrDataUrl)) service.fail(400,'INVALID_QR',"QR ต้องเป็นรูปภาพ ไม่เกิน 500KB");
    const qrBuffer=Buffer.from(data.qrDataUrl.split(',')[1],'base64');
    if(qrBuffer.length>500*1024) service.fail(400,'INVALID_QR','รูป QR ต้องไม่เกิน 500KB');
    const type=imageType(qrBuffer);
    if(!type || !data.qrDataUrl.startsWith('data:'+type.mimeType+';')) service.fail(400,'INVALID_QR',"รูป QR ไม่ถูกต้อง");
  }
  if(data.enabled && data.mode==='manual' && !data.qrDataUrl && !(data.bankName?.trim() && data.accountName?.trim() && data.accountNumber?.trim())) service.fail(400,'PAYMENT_NOT_CONFIGURED',"ต้องตั้งบัญชีธนาคารหรืออัปโหลด QR จริงก่อนเปิดรับเงิน");
  const update=Object.fromEntries(allowed.filter(k=>data[k]!==undefined).map(k=>[k,data[k]]));
  const settings=await Settings.findOneAndUpdate({key:'subscription'},{$set:{...update,updatedBy:req.user._id}},{returnDocument:'after',upsert:true,runValidators:true,setDefaultsOnInsert:true});
  res.json({settings});
});
exports.imageType=imageType;

