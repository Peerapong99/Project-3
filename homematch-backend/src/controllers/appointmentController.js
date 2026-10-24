const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Property = require('../models/Property');
const Notification = require('../models/Notification');
const membership = require('../services/subscriptionService');
const active = ['pending','confirmed'];
const fail = membership.fail;
function handleError(res, error) {
  if (error.status) return res.status(error.status).json({status:false,message:error.message,code:error.code});
  if (error.name === 'ValidationError' || error.name === 'CastError') return res.status(400).json({status:false,message:'ข้อมูลนัดหมายไม่ถูกต้อง'});
  console.error('APPOINTMENT ERROR:', error);
  return res.status(500).json({status:false,message:'ไม่สามารถดำเนินการนัดหมายได้'});
}
function parseSlot(date, time, now = new Date()) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) fail(400,'INVALID_SLOT','วันที่หรือเวลานัดหมายไม่ถูกต้อง');
  const day = new Date(date+'T00:00:00.000Z');
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0,10) !== date) fail(400,'INVALID_SLOT','วันที่นัดหมายไม่ถูกต้อง');
  if (new Date(date+'T'+time+':00+07:00') <= now) fail(400,'PAST_SLOT','ไม่สามารถนัดหมายเวลาที่ผ่านมาแล้ว');
  return day;
}
async function notify(session, appointment, user, type, title, message) {
  await Notification.create([{user,type,title,message:message.slice(0,500),property:appointment.property,appointment:appointment._id,isRead:false}],{session});
}
const populate = query => query.populate('property','title price images location type status').populate('seller','name').populate('buyer','name email phone');
const createAppointment = async (req,res) => {
  try {
    const {propertyId,appointmentDate,appointmentTime,message=''} = req.body || {};
    if (!mongoose.isObjectIdOrHexString(propertyId)) fail(400,'INVALID_PROPERTY','รหัสบ้านไม่ถูกต้อง');
    if (typeof message !== 'string' || message.length > 500) fail(400,'INVALID_MESSAGE','ข้อความต้องไม่เกิน 500 ตัวอักษร');
    const day = parseSlot(appointmentDate,appointmentTime);
    const candidate = await Property.findById(propertyId).select('seller');
    if (!candidate) fail(404,'NOT_FOUND','ไม่พบประกาศ');
    const appointment = await membership.sellerTransaction(candidate.seller, async ({session,now}) => {
      parseSlot(appointmentDate,appointmentTime,now);
      const property = await Property.findOne({_id:propertyId,status:'approved'}).session(session);
      if (!property) fail(409,'PROPERTY_UNAVAILABLE','ประกาศนี้ไม่เปิดใช้งาน');
      if (await Appointment.exists({seller:property.seller,appointmentDate:{$gte:day,$lt:new Date(+day+86400000)},appointmentTime,status:{$in:active}}).session(session)) fail(409,'SLOT_TAKEN','ผู้ขายมีนัดหมายในเวลานี้แล้ว');
      const [created] = await Appointment.create([{property:propertyId,buyer:req.user._id,seller:property.seller,appointmentDate:day,appointmentTime,message:message.trim(),status:'pending'}],{session});
      await notify(session,created,property.seller,'appointment_created','มีคำขอนัดหมายใหม่',`คำขอเข้าชม "${property.title}" เวลา ${appointmentTime} น.`);
      return created;
    });
    return res.status(201).json({status:true,message:'ดำเนินการนัดหมายสำเร็จ',appointment:await populate(Appointment.findById(appointment._id))});
  } catch(error) {return handleError(res,error);}
};
const getMyAppointments = async (req,res) => {
  try {const appointments=await populate(Appointment.find({buyer:req.user._id}).sort({createdAt:-1}));res.json({status:true,count:appointments.length,appointments});}
  catch(error) {return handleError(res,error);}
};
const getSellerAppointments = async (req,res) => {
  try {const appointments=await populate(Appointment.find({seller:req.user._id}).sort({createdAt:-1}));res.json({status:true,count:appointments.length,appointments});}
  catch(error) {return handleError(res,error);}
};
const updateAppointmentStatus = async (req,res) => {
  try {
    const {id}=req.params; const {status,rejectionReason=''}=req.body || {};
    if (!mongoose.isObjectIdOrHexString(id)) fail(400,'INVALID_ID','รหัสนัดหมายไม่ถูกต้อง');
    if (!['confirmed','rejected'].includes(status)) fail(400,'INVALID_STATUS','สถานะไม่ถูกต้อง');
    if (status === 'rejected' && (typeof rejectionReason !== 'string' || !rejectionReason.trim() || rejectionReason.length>500)) fail(400,'REASON_REQUIRED','กรุณาระบุเหตุผลไม่เกิน 500 ตัวอักษร');
    const appointment=await membership.sellerTransaction(req.user._id,async ({session,now})=>{
      const existing=await Appointment.findOne({_id:id,seller:req.user._id,status:'pending'}).session(session);
      if(!existing) fail(409,'APPOINTMENT_STATE_CHANGED','นัดหมายนี้ถูกดำเนินการแล้ว หรือคุณไม่มีสิทธิ์');
      if(status==='confirmed') {
        parseSlot(existing.appointmentDate.toISOString().slice(0,10),existing.appointmentTime,now);
        if(!await Property.exists({_id:existing.property,status:'approved'}).session(session)) fail(409,'PROPERTY_UNAVAILABLE','ประกาศนี้ไม่เปิดใช้งาน');
        const day=new Date(existing.appointmentDate.toISOString().slice(0,10)+'T00:00:00Z');
        if(await Appointment.exists({_id:{$ne:existing._id},seller:req.user._id,appointmentDate:{$gte:day,$lt:new Date(+day+86400000)},appointmentTime:existing.appointmentTime,status:'confirmed'}).session(session)) fail(409,'SLOT_TAKEN','เวลานี้มีนัดหมายที่ยืนยันแล้ว');
      }
      const updated=await Appointment.findOneAndUpdate({_id:id,seller:req.user._id,status:'pending'},{$set:{status,rejectionReason:status==='rejected'?rejectionReason.trim():''}},{returnDocument:'after',runValidators:true,session});
      if(!updated) fail(409,'APPOINTMENT_STATE_CHANGED','นัดหมายนี้ถูกดำเนินการแล้ว');
      await notify(session,updated,updated.buyer,'appointment_'+status,status==='confirmed'?'ยืนยันการนัดหมายแล้ว':'คำขอนัดหมายถูกปฏิเสธ',status==='confirmed'?`ยืนยันนัดหมายเวลา ${updated.appointmentTime} น.`:`เหตุผล: ${updated.rejectionReason}`);
      return updated;
    });
    res.json({status:true,message:'ดำเนินการนัดหมายสำเร็จ',appointment:await populate(Appointment.findById(appointment._id))});
  } catch(error) {return handleError(res,error);}
};
const cancelAppointment = async (req,res) => {
  try {
    const {id}=req.params;
    if(!mongoose.isObjectIdOrHexString(id)) fail(400,'INVALID_ID','รหัสนัดหมายไม่ถูกต้อง');
    const candidate=await Appointment.findOne({_id:id,buyer:req.user._id}).select('seller');
    if(!candidate) fail(404,'NOT_FOUND','ไม่พบนัดหมาย');
    const appointment=await membership.sellerTransaction(candidate.seller,async ({session})=>{
      const updated=await Appointment.findOneAndUpdate({_id:id,buyer:req.user._id,status:{$in:active}},{$set:{status:'cancelled'}},{returnDocument:'after',runValidators:true,session});
      if(!updated) fail(409,'APPOINTMENT_STATE_CHANGED','ไม่สามารถยกเลิกนัดหมายนี้ได้');
      await notify(session,updated,updated.seller,'appointment_cancelled','ผู้ซื้อยกเลิกการนัดหมาย',`ผู้ซื้อยกเลิกนัดหมายเวลา ${updated.appointmentTime} น.`);
      return updated;
    });
    res.json({status:true,message:'ดำเนินการนัดหมายสำเร็จ',appointment});
  } catch(error) {return handleError(res,error);}
};
module.exports={createAppointment,getMyAppointments,getSellerAppointments,updateAppointmentStatus,cancelAppointment,parseSlot};
