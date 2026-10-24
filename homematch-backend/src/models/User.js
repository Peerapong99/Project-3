
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      default: "",
    },

    password: {
      type: String,
      select: false,
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    role: {
      type: String,
      enum: ["admin", "seller", "buyer"],
      default: "seller",
    },

    isBanned: {type: Boolean, default: false},
    banReason: {type: String, default: '', maxlength: 500},
    bannedAt: {type: Date, default: null},
    bannedBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},
    tokenVersion: {type: Number, default: 0, min: 0},

    profileImage: {
      type: String,
      default: "",
    },

    resetPasswordToken: {
      type: String,
      select: false,
    },

    resetPasswordExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// บัญชีทั่วไปต้องมี Password
// บัญชี Google ใช้ Google ID แทนได้
userSchema.pre("validate", function () {
  if (!this.password && !this.googleId) {
    this.invalidate(
      "password",
      "กรุณาระบุรหัสผ่านหรือบัญชี Google"
    );
  }

  if (!this.googleId && !this.phone?.trim()) {
    this.invalidate(
      "phone",
      "กรุณาระบุเบอร์โทรศัพท์"
    );
  }
});

module.exports = mongoose.model(
  "User",
  userSchema
);
