const mongoose = require('mongoose');
const Plan = require('./SubscriptionPlan');
const membershipSchema = new mongoose.Schema({
  plan: {type: Plan.snapshotSchema, required: true},
  startsAt: {type: Date, required: true}, endsAt: {type: Date, default: null},
  payment: {type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPayment', default: null}
}, {_id: false});
const eventSchema = new mongoose.Schema({
  type: {type: String, enum: ['free_started', 'upgrade', 'renewal', 'activation', 'expired'], required: true},
  at: {type: Date, required: true}, from: String, to: String,
  startsAt: Date, endsAt: Date,
  payment: {type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPayment'},
  planSnapshot: Plan.snapshotSchema
});
const schema = new mongoose.Schema({
  seller: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true},
  currentMembership: {type: membershipSchema, required: true},
  history: {type: [eventSchema], default: []},
  revision: {type: Number, default: 0}
}, {timestamps: true});
schema.index({'currentMembership.endsAt': 1});
module.exports = mongoose.model('SellerSubscription', schema);

