const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lastMessage: {
      type: String,
      default: "",
      trim: true,
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// บ้านหลังเดียวกัน Buyer คนเดิม Seller คนเดิม
// จะมี Conversation เดียว
conversationSchema.index(
  {
    property: 1,
    buyer: 1,
    seller: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "Conversation",
  conversationSchema
);