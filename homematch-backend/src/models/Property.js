
const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: "",
  },

  // ตำแหน่งบนแปลน คิดเป็นเปอร์เซ็นต์ 0-100
  x: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  y: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },

  images: {
    type: [String],
    default: [],
  },
});

const floorPlanSchema = new mongoose.Schema({
  floor: {
    type: Number,
    required: true,
    min: 1,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  rooms: {
    type: [roomSchema],
    default: [],
  },
});

const propertySchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["house", "townhouse", "condo", "land"],
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // ========================================
    // LOCATION + GOOGLE MAPS
    // ========================================
    location: {
      address: {
        type: String,
        required: true,
        trim: true,
      },

      district: {
        type: String,
        required: true,
        trim: true,
      },

      province: {
        type: String,
        required: true,
        trim: true,
      },

      // ลิงก์ตำแหน่งบ้านจาก Google Maps
      googleMapsUrl: {
        type: String,
        default: "",
        trim: true,
      },

      // พิกัดสำหรับแสดงแผนที่ในแอป (ถ้ามี)
      latitude: {
        type: Number,
        min: -90,
        max: 90,
        default: null,
      },

      longitude: {
        type: Number,
        min: -180,
        max: 180,
        default: null,
      },
    },

    bedrooms: {
      type: Number,
      default: 0,
      min: 0,
    },

    bathrooms: {
      type: Number,
      default: 0,
      min: 0,
    },

    area: {
      type: Number,
      required: true,
      min: 0,
    },

    // รูปภาพบ้านทั่วไป
    images: {
      type: [String],
      default: [],
    },

    // แปลนบ้านแต่ละชั้นพร้อมจุด Interactive
    floorPlans: {
      type: [floorPlanSchema],
      default: [],
    },

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "sold",
      ],
      default: "pending",
    },

    deletedAt: {type: Date, default: null},
    viewCount: {type: Number, default: 0, min: 0, select: false},
    dailyViews: {type: Map, of: Number, default: {}, select: false},
    rejectionReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

propertySchema.pre(/^(find|countDocuments)/, function () { this.where({deletedAt: null}); });
propertySchema.index({seller: 1, status: 1});
module.exports = mongoose.model(
  "Property",
  propertySchema
);
