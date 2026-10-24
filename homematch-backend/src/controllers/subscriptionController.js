const Plan = require('../models/SubscriptionPlan');
const Subscription = require('../models/SellerSubscription');
const service = require('../services/subscriptionService');
const safe = work => async (req, res, next) => {try {await work(req, res);} catch(e) {next(e);}};
const paging = req => ({page: Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1)), limit: Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 20))});
exports.plans = safe(async (req, res) => res.json({plans: await Plan.find({isActive: true}).sort({priceSatang: 1})}));
exports.me = safe(async (req, res) => {
  const state = await service.ensureSubscription(req.user._id);
  const plan = await service.effectivePlan(state);
  const expired = state.currentMembership.plan.code !== 'free' && plan.code === 'free';
  res.json({plan, startsAt: expired ? state.currentMembership.endsAt : state.currentMembership.startsAt,
    endsAt: plan.code === 'free' ? null : state.currentMembership.endsAt, expired,
    usage: await service.getUsage(req.user._id, null, plan)});
});
exports.usage = safe(async (req, res) => {
  const state = await service.ensureSubscription(req.user._id);
  res.json(await service.getUsage(req.user._id, null, await service.effectivePlan(state)));
});
exports.history = safe(async (req, res) => {
  // Persist expiry once so history accurately reflects the entitlement change.
  const state = await service.sellerTransaction(req.user._id, async ({subscription}) => subscription);
  const {page, limit} = paging(req);
  res.json({history: [...state.history].reverse().slice((page-1)*limit, page*limit), total: state.history.length, page, limit});
});
exports.adminPlans = safe(async (req, res) => res.json({plans: await Plan.find().sort({priceSatang: 1})}));
exports.updatePlan = safe(async (req, res) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) service.fail(404, 'NOT_FOUND', "ไม่พบแพ็กเกจ");
  const allowed = ['name','priceSatang','durationDays','listingLimit','imageLimit','features','isActive'];
  if (Object.keys(req.body).some(k => !allowed.includes(k))) service.fail(400, 'INVALID_FIELDS', "พบฟิลด์ที่ไม่อนุญาต");
  const data = {...req.body};
  for (const key of ['priceSatang','durationDays','listingLimit','imageLimit']) {
    if (data[key] !== undefined && (!Number.isSafeInteger(data[key]) || data[key] < (key === 'priceSatang' || key === 'durationDays' ? 0 : 1))) service.fail(400, 'INVALID_PLAN', "ข้อมูลตัวเลขแพ็กเกจไม่ถูกต้อง");
  }
  if (data.isActive !== undefined && typeof data.isActive !== 'boolean') service.fail(400, 'INVALID_PLAN', "สถานะแพ็กเกจไม่ถูกต้อง");
  if (data.name !== undefined && (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 100)) service.fail(400, 'INVALID_PLAN', "ชื่อแพ็กเกจไม่ถูกต้อง");
  if (data.features !== undefined) {
    const keys = ['floorPlan2D','chat','appointments','analytics','detailedAnalytics','featured'];
    if (!data.features || typeof data.features !== 'object' || Array.isArray(data.features) || Object.entries(data.features).some(([k,v]) => !keys.includes(k) || typeof v !== 'boolean')) service.fail(400, 'INVALID_PLAN', "สิทธิ์แพ็กเกจไม่ถูกต้อง");
    data.features = {...plan.features.toObject(), ...data.features};
    if (!data.features.floorPlan2D || !data.features.chat || !data.features.appointments || (data.features.detailedAnalytics && !data.features.analytics)) service.fail(400, 'INVALID_PLAN', "ต้องคงสิทธิ์พื้นฐานและสิทธิ์สถิติที่เกี่ยวข้อง");
  }
  const merged = {...plan.toObject(), ...data};
  if (plan.code === 'free' && (merged.priceSatang !== 0 || merged.durationDays !== 0 || !merged.isActive)) service.fail(400, 'INVALID_FREE', "Free ต้องฟรี ไม่หมดอายุ และเปิดใช้งานเสมอ");
  if (plan.code !== 'free' && (merged.priceSatang < 1 || merged.durationDays < 1 || merged.durationDays > 365)) service.fail(400, 'INVALID_PLAN', "แพ็กเกจชำระเงินต้องมีราคาและระยะเวลา 1-365 วัน");
  Object.assign(plan, data); plan.version += 1; await plan.save();
  res.json({plan, message: "แก้ไขแพ็กเกจแล้ว สิทธิ์ที่ซื้อไว้ก่อนหน้านี้ยังคงตามคำสั่งซื้อ"});
});
exports.members = safe(async (req, res) => {
  const {page, limit} = paging(req);
  const [members, total] = await Promise.all([
    Subscription.find().populate('seller', 'name email').sort({updatedAt:-1}).skip((page-1)*limit).limit(limit), Subscription.countDocuments()
  ]);
  const result = [];
  for (const member of members) result.push({...member.toObject(), effectivePlan: await service.effectivePlan(member)});
  res.json({members: result, total, page, limit});
});
exports.safe = safe; exports.paging = paging;


exports.analytics = safe(async (req,res)=>{
  const state=await service.ensureSubscription(req.user._id);
  const plan=await service.effectivePlan(state);
  if(!plan.features.analytics) service.fail(403,'PREMIUM_REQUIRED',"สถิติยอดเข้าชมสำหรับ Premium และ Pro");
  const Property=require('../models/Property');
  const properties=await Property.find({seller:req.user._id}).select('title status +viewCount +dailyViews').lean();
  const detailed=!!plan.features.detailedAnalytics;
  const results=properties.map(p=>({_id:p._id,title:p.title,status:p.status,views:p.viewCount || 0,...(detailed?{dailyViews:p.dailyViews || {}}:{})}));
  res.json({detailed,totalViews:results.reduce((total,p)=>total+p.views,0),properties:results,metric:'successful_detail_requests'});
});
