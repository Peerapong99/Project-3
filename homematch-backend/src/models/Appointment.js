const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    // บ้านที่ต้องการนัดหมาย
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },

    // ผู้ซื้อ
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ผู้ขาย
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // วันที่นัดหมาย
    appointmentDate: {
      type: Date,
      required: true,
    },

    // เวลา เช่น 10:00, 14:30
    appointmentTime: {
      type: String,
      required: true,
      trim: true,
    },

    // ข้อความจากผู้ซื้อ
    message: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    // สถานะนัดหมาย
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "rejected",
        "cancelled",
      ],
      default: "pending",
    },

    // เหตุผลกรณีผู้ขายปฏิเสธ
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Appointment",
  appointmentSchema
);