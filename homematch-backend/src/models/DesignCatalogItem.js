const mongoose = require('mongoose');

// Reference prices only. A RoomDesign remains the sole saved-design model.
const schema = new mongoose.Schema({
  category: {type: String, enum: ['furniture', 'floor', 'wall'], required: true},
  key: {type: String, required: true, trim: true},
  unitPrice: {
    type: Number,
    default: null,
    validate: {
      validator: value => value === null || (Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001),
      message: 'ราคาต้องไม่ติดลบและมีทศนิยมไม่เกิน 2 ตำแหน่ง',
    },
  },
  priceSource: {type: String, default: '', trim: true, maxlength: 500},
}, {timestamps: true});
schema.index({category: 1, key: 1}, {unique: true});
module.exports = mongoose.model('DesignCatalogItem', schema);