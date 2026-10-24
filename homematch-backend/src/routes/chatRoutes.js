const express = require("express");

const {
  createConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  markConversationAsRead,
} = require("../controllers/chatController");

const {
  protect,
  allowRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// ทุก Route ต้อง Login
// Buyer / Seller เท่านั้น
// =====================================================

router.use(
  protect,
  allowRoles("buyer", "seller")
);

// =====================================================
// CONVERSATIONS
// =====================================================

// Buyer สร้างหรือเปิด Conversation ของบ้าน
router.post(
  "/conversations",
  createConversation
);

// Buyer / Seller ดูรายการ Conversation ของตัวเอง
router.get(
  "/conversations",
  getMyConversations
);

// =====================================================
// MESSAGES
// =====================================================

// อ่านข้อความ
router.get(
  "/conversations/:conversationId/messages",
  getMessages
);

// ส่งข้อความ
router.post(
  "/conversations/:conversationId/messages",
  sendMessage
);

// อ่านแล้ว
router.patch(
  "/conversations/:conversationId/read",
  markConversationAsRead
);


// The shared snapshot is readable only by the members of its original conversation.
router.get('/conversations/:conversationId/messages/:messageId/design', async (req,res,next) => {
  try {
    const mongoose=require('mongoose');
    const Conversation=require('../models/Conversation');
    const Message=require('../models/Message');
    const {conversationId,messageId}=req.params;
    if (!mongoose.isValidObjectId(conversationId) || !mongoose.isValidObjectId(messageId)) return res.status(400).json({message:'รหัสบทสนทนาหรือข้อความไม่ถูกต้อง'});
    const conversation=await Conversation.findById(conversationId).lean();
    const userId=String(req.user._id);
    if (!conversation || ![String(conversation.buyer),String(conversation.seller)].includes(userId)) return res.status(404).json({message:'ไม่พบข้อมูลที่คุณมีสิทธิ์เข้าถึง'});
    const message=await Message.findOne({_id:messageId,conversation:conversationId}).lean();
    if (!message?.sharedDesign) return res.status(404).json({message:'ไม่พบแบบที่แชร์ในข้อความนี้'});
    res.json({status:true,...message.sharedDesign});
  } catch(error) {next(error);}
});
module.exports = router;