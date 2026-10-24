const mongoose = require('mongoose');
const Plan = require('./SubscriptionPlan');
const schema = new mongoose.Schema({
  seller: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true},
  plan: {type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true},
  planSnapshot: {type: Plan.snapshotSchema, required: true},
  amountSatang: {type: Number, required: true, min: 1, validate: Number.isSafeInteger},
  mode: {type: String, enum: ['manual', 'simulation'], required: true},
  paymentSettingsSnapshot: {type: mongoose.Schema.Types.Mixed, required: true},
  status: {type: String, enum: ['awaiting_payment', 'pending', 'approved', 'rejected', 'expired'], default: 'awaiting_payment'},
  orderExpiresAt: {type: Date, required: true},
  slip: {filename: String, mimeType: String, uploadedAt: Date},
  reviewedBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}, reviewedAt: Date,
  rejectionReason: {type: String, default: ''},
  idempotencyKey: {type: String, required: true, maxlength: 100}
}, {timestamps: true});
schema.index({seller: 1, idempotencyKey: 1}, {unique: true});
schema.index({status: 1, createdAt: -1});
schema.index({mode: 1, status: 1, reviewedAt: -1});
module.exports = mongoose.model('SubscriptionPayment', schema);

