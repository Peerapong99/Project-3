const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  key: {type: String, default: 'subscription', unique: true},
  enabled: {type: Boolean, default: false},
  mode: {type: String, enum: ['manual', 'simulation'], default: 'manual'},
  bankName: {type: String, default: '', maxlength: 100},
  accountName: {type: String, default: '', maxlength: 150},
  accountNumber: {type: String, default: '', maxlength: 50},
  promptPayId: {type: String, default: '', maxlength: 50},
  qrDataUrl: {type: String, default: '', maxlength: 750000},
  updatedBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
}, {timestamps: true});
module.exports = mongoose.model('SubscriptionPaymentSettings', schema);

