const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // คนที่จะได้รับ Notification
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ประเภท Notification
    type: {
      type: String,
      enum: [
        "appointment_created",
        "appointment_confirmed",
        "appointment_rejected",
        "appointment_cancelled",
        "new_message",
        "general",
      ],
      required: true,
      default: "general",
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // บ้านที่เกี่ยวข้อง
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      default: null,
    },

    // นัดหมายที่เกี่ยวข้อง
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },

    // เผื่อใช้กับ Chat ต่อ
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },

    // อ่านแล้วหรือยัง
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({
  user: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "Notification",
  notificationSchema
);