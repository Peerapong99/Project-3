const mongoose = require("mongoose");

// =====================================================
// FURNITURE SCHEMA
// =====================================================

const furnitureSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      default: "",
    },

    // ตำแหน่งบน Canvas
    x: {
      type: Number,
      default: 0,
    },

    y: {
      type: Number,
      default: 0,
    },

    // การหมุน
    rotation: {
      type: Number,
      default: 0,
    },

    // ขนาดจริง หน่วยเมตร
    realWidth: {
      type: Number,
      default: 0,
    },

    realHeight: {
      type: Number,
      default: 0,
    },

    // ขนาดที่แสดงบน Canvas
    // สำคัญ: RoomCustomizerScreen ใช้ตอน Load กลับมา
    width: {
      type: Number,
      default: 0,
    },

    height: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

// =====================================================
// ROOM DESIGN SCHEMA
// =====================================================

const roomDesignSchema = new mongoose.Schema(
  {
    // ผู้ใช้ที่เป็นเจ้าของแบบห้อง
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // บ้านที่กำลังออกแบบ
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },

    designName: {type: String, default: '', trim: true, maxlength: 150},
    budget: {
      type: Number, default: null,
      validate: {validator: value => value === null || (Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001), message: 'งบประมาณไม่ถูกต้อง'},
    },
    estimatedTotal: {type: Number, default: null, min: 0},
    // Written exclusively by the server after recalculating reference prices.
    priceSnapshot: {type: mongoose.Schema.Types.Mixed, default: null},

    // ชื่อห้อง
    room: {
      type: String,
      default: "",
    },

    // ชั้น
    floor: {
      type: String,
      required: true,
    },

    // ID ห้อง
    roomId: {
      type: String,
      required: true,
    },

    // =====================================================
    // ROOM SIZE
    // =====================================================

    canvasSize: {
      width: {type: Number, min: 0},
      height: {type: Number, min: 0},
    },

    roomSize: {
      width: {
        type: Number,
        default: 5,
      },

      height: {
        type: Number,
        default: 6,
      },

      unit: {
        type: String,
        default: "meter",
      },
    },

    // =====================================================
    // FLOOR
    // =====================================================

    selectedFloor: {
      id: {
        type: String,
        default: "light-wood",
      },

      name: {
        type: String,
        default: "ไม้สว่าง",
      },
    },

    // =====================================================
    // WALL
    // =====================================================

    selectedWall: {
      id: {
        type: String,
        default: "white",
      },

      name: {
        type: String,
        default: "ขาว",
      },

      color: {
        type: String,
        default: "#FFFFFF",
      },
    },

    // =====================================================
    // FURNITURE
    // =====================================================

    furniture: {
      type: [furnitureSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// =====================================================
// UNIQUE DESIGN
// 1 USER + 1 PROPERTY + 1 FLOOR + 1 ROOM
// =====================================================

roomDesignSchema.index(
  {
    userId: 1,
    propertyId: 1,
    floor: 1,
    roomId: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "RoomDesign",
  roomDesignSchema
);