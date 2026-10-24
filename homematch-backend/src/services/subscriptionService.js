const mongoose = require('mongoose');
const Plan = require('../models/SubscriptionPlan');
const Subscription = require('../models/SellerSubscription');
const Property = require('../models/Property');
const DAY = 86400000;
const ACTIVE_STATUSES = ['pending', 'approved'];
const defaults = [
  {code: 'free', name: 'Free', priceSatang: 0, durationDays: 0, listingLimit: 3, imageLimit: 5},
  {code: 'premium', name: 'Premium', priceSatang: 29900, durationDays: 30, listingLimit: 20, imageLimit: 15, features: {analytics: true}},
  {code: 'pro', name: 'Pro', priceSatang: 59900, durationDays: 30, listingLimit: 100, imageLimit: 30, features: {analytics: true, detailedAnalytics: true, featured: true}}
];
function fail(status, code, message) {const error = new Error(message); Object.assign(error, {status, code}); throw error;}
function snapshot(plan) {
  const data = plan.toObject ? plan.toObject() : plan;
  return Object.fromEntries(['code','name','priceSatang','durationDays','listingLimit','imageLimit','features','version'].map(k => [k, data[k]]));
}
async function seedPlans() {
  const Payment=require('../models/SubscriptionPayment');
  const Settings=require('../models/SubscriptionPaymentSettings');
  await Promise.all([Plan.init(),Subscription.init(),Payment.init(),Settings.init()]);
  for (const data of defaults) {
    try {await Plan.findOneAndUpdate({code: data.code}, {$setOnInsert: data}, {upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true});}
    catch (e) {if (e.code !== 11000) throw e;}
  }
}
async function ensureSubscription(seller) {
  let subscription = await Subscription.findOne({seller});
  if (subscription) return subscription;
  const plan = await Plan.findOne({code: 'free'});
  if (!plan) fail(503, 'PLANS_NOT_READY', "ยังไม่ได้เตรียมข้อมูลแพ็กเกจ");
  const now = new Date();
  try {
    subscription = await Subscription.findOneAndUpdate({seller}, {$setOnInsert: {
      seller, currentMembership: {plan: snapshot(plan), startsAt: now, endsAt: null},
      history: [{type: 'free_started', at: now, to: 'free', startsAt: now, planSnapshot: snapshot(plan)}]
    }}, {upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true});
  } catch (e) {if (e.code !== 11000) throw e; subscription = await Subscription.findOne({seller});}
  return subscription;
}
let topologySupported;
async function requireTransactions() {
  if (topologySupported === true) return;
  const hello = await mongoose.connection.db.admin().command({hello: 1});
  topologySupported = !!(hello.setName || hello.msg === 'isdbgrid');
  if (!topologySupported) fail(503, 'TRANSACTIONS_REQUIRED', "ระบบสมาชิกต้องใช้ MongoDB replica set หรือ Atlas เพื่อป้องกันโควตาเกิน");
}
async function effectivePlan(subscription, session, now = new Date()) {
  const current = subscription.currentMembership;
  if (current.plan.code === 'free' || !current.endsAt || current.endsAt <= now) {
    return snapshot(await Plan.findOne({code: 'free'}).session(session || null));
  }
  return snapshot(current.plan);
}
async function sellerTransaction(seller, work) {
  await requireTransactions();
  await ensureSubscription(seller);
  return mongoose.connection.transaction(async session => {
    // Write the common seller document before counting. Concurrent requests conflict and retry.
    const subscription = await Subscription.findOneAndUpdate({seller}, {$inc: {revision: 1}}, {returnDocument: 'after', session});
    const now = new Date();
    const plan = await effectivePlan(subscription, session, now);
    if (subscription.currentMembership.plan.code !== 'free' && plan.code === 'free') {
      const previous = subscription.currentMembership;
      subscription.history.push({type: 'expired', at: now, from: previous.plan.code, to: 'free', startsAt: previous.endsAt, planSnapshot: plan});
      subscription.currentMembership = {plan, startsAt: previous.endsAt, endsAt: null, payment: null};
      await subscription.save({session});
    }
    return work({session, subscription, plan, now});
  }, {readConcern: {level: 'snapshot'}, writeConcern: {w: 'majority'}});
}
async function getUsage(seller, session, plan) {
  const used = await Property.countDocuments({seller, status: {$in: ACTIVE_STATUSES}}).session(session || null);
  return {planCode: plan.code, listingLimit: plan.listingLimit, imageLimit: plan.imageLimit, used,
    remaining: Math.max(0, plan.listingLimit - used), overLimit: used > plan.listingLimit, canCreate: used < plan.listingLimit};
}
async function assertListingAvailable(seller, session, plan) {
  const usage = await getUsage(seller, session, plan);
  if (!usage.canCreate) fail(403, 'LISTING_LIMIT_REACHED', "ใช้โควตาประกาศครบแล้ว กรุณาอัปเกรดแพ็กเกจ");
}
function mediaImages(data) {
  return [...(data.images || []), ...(data.floorPlans || []).flatMap(p => (p.rooms || []).flatMap(r => r.images || []))];
}
function assertImageLimit(data, plan, previous) {
  const images = mediaImages(data);
  if (images.length <= plan.imageLimit) return;
  // Keep legacy images after expiry, but never add replacements above the new quota.
  const old = previous ? mediaImages(previous) : [];
  const remaining = [...old];
  const subset = images.every(image => {const at = remaining.indexOf(image); if (at < 0) return false; remaining.splice(at, 1); return true;});
  if (previous && subset) return;
  fail(403, 'IMAGE_LIMIT_REACHED', "แพ็กเกจนี้รองรับรูปภาพสูงสุด " + plan.imageLimit + " รูปต่อประกาศ (รวมรูปห้อง ไม่รวมแปลน)");
}
function activation(current, plan, now) {
  const live = current.plan.code !== 'free' && current.endsAt && current.endsAt > now;
  if (live && current.plan.code === 'pro' && plan.code === 'premium') fail(409, 'DOWNGRADE_NOT_ALLOWED', "กรุณารอให้ Pro หมดอายุก่อนสมัคร Premium");
  const renewal = live && current.plan.code === plan.code;
  return {type: renewal ? 'renewal' : live ? 'upgrade' : 'activation',
    startsAt: renewal ? current.startsAt : now,
    endsAt: new Date((renewal ? current.endsAt.getTime() : now.getTime()) + plan.durationDays * DAY)};
}
module.exports = {seedPlans, snapshot, fail, ensureSubscription, effectivePlan, sellerTransaction, getUsage,
  assertListingAvailable, assertImageLimit, mediaImages, activation, ACTIVE_STATUSES, DAY};

