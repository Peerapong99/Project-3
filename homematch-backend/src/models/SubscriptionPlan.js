const mongoose = require('mongoose');
const snapshotSchema = new mongoose.Schema({
  code: {type: String, enum: ['free', 'premium', 'pro'], required: true},
  name: {type: String, required: true},
  priceSatang: {type: Number, min: 0, required: true, validate: Number.isSafeInteger},
  durationDays: {type: Number, min: 0, required: true, validate: Number.isSafeInteger},
  listingLimit: {type: Number, min: 1, required: true, validate: Number.isSafeInteger},
  imageLimit: {type: Number, min: 1, max: 30, required: true, validate: Number.isSafeInteger},
  features: {
    floorPlan2D: {type: Boolean, default: true}, chat: {type: Boolean, default: true},
    appointments: {type: Boolean, default: true}, analytics: {type: Boolean, default: false},
    detailedAnalytics: {type: Boolean, default: false}, featured: {type: Boolean, default: false}
  },
  version: {type: Number, default: 1}
}, {_id: false});
const schema = new mongoose.Schema({
  ...snapshotSchema.obj,
  code: {type: String, enum: ['free', 'premium', 'pro'], required: true, unique: true},
  isActive: {type: Boolean, default: true}
}, {timestamps: true});
const Plan = mongoose.model('SubscriptionPlan', schema);
Plan.snapshotSchema = snapshotSchema;
module.exports = Plan;

