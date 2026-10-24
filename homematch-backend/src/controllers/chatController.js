const mongoose = require("mongoose");

const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Property = require("../models/Property");
const Notification = require("../models/Notification");

// ==========================================
// HELPERS
// ==========================================

const isValidId = (id) => {
  return (
    typeof id === "string" &&
    mongoose.Types.ObjectId.isValid(id)
  );
};

const getUserId = (req) => {
  const id = req.user?._id || req.user?.id;

  return id ? String(id) : null;
};

const isConversationMember = (
  conversation,
  userId
) => {
  if (!conversation || !userId) {
    return false;
  }

  const buyerId = conversation.buyer?._id
    ? String(conversation.buyer._id)
    : String(conversation.buyer);

  const sellerId = conversation.seller?._id
    ? String(conversation.seller._id)
    : String(conversation.seller);

  return (
    userId === buyerId ||
    userId === sellerId
  );
};

// ==========================================
// CREATE / GET CONVERSATION
// POST /api/chat/conversations
// ==========================================

const createConversation = async (
  req,
  res
) => {
  try {
    const { propertyId } = req.body || {};

    const userId = getUserId(req);

    if (
      !userId ||
      req.user?.role !== "buyer"
    ) {
      return res.status(403).json({
        message:
          "เฉพาะผู้ซื้อเท่านั้นที่สามารถเริ่มการสนทนาได้",
      });
    }

    if (!isValidId(propertyId)) {
      return res.status(400).json({
        message:
          "ข้อมูลประกาศบ้านไม่ถูกต้อง",
      });
    }

    const property =
      await Property.findById(
        propertyId
      ).select(
        "title images seller status location"
      );

    if (!property) {
      return res.status(404).json({
        message: "ไม่พบประกาศบ้าน",
      });
    }

    if (
      property.status !== "approved"
    ) {
      return res.status(400).json({
        message:
          "ประกาศนี้ยังไม่พร้อมสำหรับการติดต่อ",
      });
    }

    if (!property.seller) {
      return res.status(400).json({
        message:
          "ไม่พบข้อมูลผู้ขายของประกาศนี้",
      });
    }

    if (
      String(property.seller) ===
      userId
    ) {
      return res.status(400).json({
        message:
          "ไม่สามารถเริ่มการสนทนากับบัญชีของตนเองได้",
      });
    }

    let conversation =
      await Conversation.findOne({
        property: property._id,
        buyer: userId,
        seller: property.seller,
      });

    if (!conversation) {
      try {
        conversation =
          await Conversation.create({
            property:
              property._id,

            buyer:
              userId,

            seller:
              property.seller,

            lastMessage:
              "",

            lastMessageAt:
              new Date(),
          });
      } catch (error) {
        if (
          error.code === 11000
        ) {
          conversation =
            await Conversation.findOne({
              property:
                property._id,

              buyer:
                userId,

              seller:
                property.seller,
            });

          if (!conversation) {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }

    const result =
      await Conversation.findById(
        conversation._id
      )
        .populate(
          "property",
          "title images location price status"
        )
        .populate(
          "buyer",
          "name email phone role"
        )
        .populate(
          "seller",
          "name email phone role"
        );

    return res.status(200).json({
      message:
        "เปิดการสนทนาสำเร็จ",

      conversation:
        result,
    });
  } catch (error) {
    console.error(
      "CREATE CONVERSATION ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "ไม่สามารถเปิดการสนทนาได้",
    });
  }
};

// ==========================================
// GET MY CONVERSATIONS
// GET /api/chat/conversations
// ==========================================

const getMyConversations = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    const role =
      req.user?.role;

    if (!userId) {
      return res.status(401).json({
        message:
          "กรุณาเข้าสู่ระบบ",
      });
    }

    let filter;

    if (role === "buyer") {
      filter = {
        buyer: userId,
      };
    } else if (
      role === "seller"
    ) {
      filter = {
        seller: userId,
      };
    } else {
      return res.status(403).json({
        message:
          "บัญชีนี้ไม่สามารถใช้งานระบบข้อความได้",
      });
    }

    const conversations =
      await Conversation.find(
        filter
      )
        .populate(
          "property",
          "title images location price status"
        )
        .populate(
          "buyer",
          "name email phone role"
        )
        .populate(
          "seller",
          "name email phone role"
        )
        .sort({
          lastMessageAt: -1,
          updatedAt: -1,
        });

    return res.status(200).json({
      conversations,
    });
  } catch (error) {
    console.error(
      "GET CONVERSATIONS ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "ไม่สามารถโหลดรายการสนทนาได้",
    });
  }
};

// ==========================================
// GET MESSAGES
// GET /api/chat/conversations/:conversationId/messages
// ==========================================

const getMessages = async (
  req,
  res
) => {
  try {
    const {
      conversationId,
    } = req.params;

    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message:
          "กรุณาเข้าสู่ระบบ",
      });
    }

    if (
      !isValidId(
        conversationId
      )
    ) {
      return res.status(400).json({
        message:
          "ข้อมูลการสนทนาไม่ถูกต้อง",
      });
    }

    const conversation =
      await Conversation.findById(
        conversationId
      )
        .populate(
          "property",
          "title images location price status"
        )
        .populate(
          "buyer",
          "name email phone role"
        )
        .populate(
          "seller",
          "name email phone role"
        );

    if (!conversation) {
      return res.status(404).json({
        message:
          "ไม่พบการสนทนา",
      });
    }

    if (
      !isConversationMember(
        conversation,
        userId
      )
    ) {
      return res.status(403).json({
        message:
          "คุณไม่มีสิทธิ์ดูข้อความนี้",
      });
    }

    // ========================================
    // MARK RECEIVED MESSAGES AS READ
    // ========================================

    await Message.updateMany(
      {
        conversation:
          conversation._id,

        sender: {
          $ne: userId,
        },

        isRead: false,
      },
      {
        $set: {
          isRead: true,
        },
      }
    );

    const messages =
      await Message.find({
        conversation:
          conversation._id,
      })
        .populate(
          "sender",
          "name role"
        )
        .sort({
          createdAt: 1,
          _id: 1,
        });

    return res.status(200).json({
      conversation,
      messages,
    });
  } catch (error) {
    console.error(
      "GET MESSAGES ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "ไม่สามารถโหลดข้อความได้",
    });
  }
};

// ==========================================
// SEND MESSAGE
// POST /api/chat/conversations/:conversationId/messages
// ==========================================

const sendMessage = async (
  req,
  res
) => {
  try {
    const {
      conversationId,
    } = req.params;

    const { message, designId, expectedUpdatedAt, pricingMode } =
      req.body || {};

    const userId =
      getUserId(req);

    // ========================================
    // CHECK LOGIN
    // ========================================

    if (!userId) {
      return res.status(401).json({
        message:
          "กรุณาเข้าสู่ระบบ",
      });
    }

    // ========================================
    // CHECK CONVERSATION ID
    // ========================================

    if (
      !isValidId(
        conversationId
      )
    ) {
      return res.status(400).json({
        message:
          "ข้อมูลการสนทนาไม่ถูกต้อง",
      });
    }

    // ========================================
    // CLEAN MESSAGE
    // ========================================

    let cleanMessage =
      typeof message === "string"
        ? message.trim()
        : "";

    if (!cleanMessage) {
      return res.status(400).json({
        message:
          "กรุณากรอกข้อความ",
      });
    }

    if (
      cleanMessage.length >
      2000
    ) {
      return res.status(400).json({
        message:
          "ข้อความต้องไม่เกิน 2000 ตัวอักษร",
      });
    }

    // ========================================
    // FIND CONVERSATION
    // ========================================

    const conversation =
      await Conversation.findById(
        conversationId
      );

    if (!conversation) {
      return res.status(404).json({
        message:
          "ไม่พบการสนทนา",
      });
    }

    // ========================================
    // CHECK MEMBER
    // ========================================

    if (
      !isConversationMember(
        conversation,
        userId
      )
    ) {
      return res.status(403).json({
        message:
          "คุณไม่มีสิทธิ์ส่งข้อความในการสนทนานี้",
      });
    }

    // ========================================
    // CREATE MESSAGE
    // ========================================

    let sharedDesign = null;
    if (designId !== undefined) {
      const {buildSharedDesign} = require('../services/designShareService');
      try {
        sharedDesign = await buildSharedDesign({designId,expectedUpdatedAt,pricingMode,userId,role:req.user.role,conversation});
      } catch (error) {
        if (error.status) return res.status(error.status).json({message:error.message});
        throw error;
      }
      cleanMessage = `แชร์แบบ: ${sharedDesign.design.designName} · ห้อง ${sharedDesign.design.room} · ยอดที่คำนวณได้ ${sharedDesign.summary.grandTotal.toLocaleString('th-TH')} บาท (ประมาณการ)`;
    }
    let newMessage =
      await Message.create({
        conversation:
          conversation._id,

        sender:
          userId,

        message:
          cleanMessage,

        sharedDesign,
        isRead:
          false,
      });

    // ========================================
    // UPDATE LAST MESSAGE
    // ========================================

    await Conversation.updateOne(
      {
        _id:
          conversation._id,

        $or: [
          {
            lastMessageAt: {
              $lte:
                newMessage.createdAt,
            },
          },

          {
            lastMessageAt: {
              $exists: false,
            },
          },

          {
            lastMessageAt:
              null,
          },
        ],
      },
      {
        $set: {
          lastMessage:
            cleanMessage,

          lastMessageAt:
            newMessage.createdAt,
        },
      }
    );

    // ========================================
    // FIND RECEIVER
    // ========================================

    const buyerId =
      String(
        conversation.buyer
      );

    const sellerId =
      String(
        conversation.seller
      );

    let receiverId =
      null;

    // Buyer ส่ง → Seller รับ
    if (
      userId === buyerId
    ) {
      receiverId =
        conversation.seller;
    }

    // Seller ส่ง → Buyer รับ
    else if (
      userId === sellerId
    ) {
      receiverId =
        conversation.buyer;
    }

    // ========================================
    // CREATE NOTIFICATION
    // ========================================

    if (receiverId) {
      try {
        // หาชื่อบ้าน
        const property =
          await Property.findById(
            conversation.property
          ).select(
            "title"
          );

        const propertyTitle =
          property?.title ||
          "อสังหาริมทรัพย์";

        // Preview ข้อความ
        const previewMessage =
          cleanMessage.length >
          80
            ? `${cleanMessage.substring(
                0,
                80
              )}...`
            : cleanMessage;

        await Notification.create({
          // คนรับ
          user:
            receiverId,

          type:
            "new_message",

          title:
            "คุณมีข้อความใหม่",

          message:
            `${propertyTitle}: ${previewMessage}`,

          property:
            conversation.property,

          conversation:
            conversation._id,

          isRead:
            false,
        });

        console.log(
          "CHAT NOTIFICATION CREATED:",
          {
            receiverId:
              String(
                receiverId
              ),

            conversationId:
              String(
                conversation._id
              ),
          }
        );
      } catch (
        notificationError
      ) {
        // Notification มีปัญหา
        // แต่ Chat ต้องส่งสำเร็จเหมือนเดิม

        console.error(
          "CREATE CHAT NOTIFICATION ERROR:",
          notificationError
        );
      }
    }

    // ========================================
    // POPULATE SENDER
    // ========================================

    newMessage =
      await Message.findById(
        newMessage._id
      ).populate(
        "sender",
        "name role"
      );

    // ========================================
    // RESPONSE
    // ========================================

    return res.status(201).json({
      message:
        "ส่งข้อความสำเร็จ",

      data:
        newMessage,
    });
  } catch (error) {
    console.error(
      "SEND MESSAGE ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "ไม่สามารถส่งข้อความได้",
    });
  }
};

// ==========================================
// MARK CONVERSATION AS READ
// PATCH /api/chat/conversations/:conversationId/read
// ==========================================

const markConversationAsRead =
  async (req, res) => {
    try {
      const {
        conversationId,
      } = req.params;

      const userId =
        getUserId(req);

      if (!userId) {
        return res.status(401).json({
          message:
            "กรุณาเข้าสู่ระบบ",
        });
      }

      if (
        !isValidId(
          conversationId
        )
      ) {
        return res.status(400).json({
          message:
            "ข้อมูลการสนทนาไม่ถูกต้อง",
        });
      }

      const conversation =
        await Conversation.findById(
          conversationId
        );

      if (!conversation) {
        return res.status(404).json({
          message:
            "ไม่พบการสนทนา",
        });
      }

      if (
        !isConversationMember(
          conversation,
          userId
        )
      ) {
        return res.status(403).json({
          message:
            "คุณไม่มีสิทธิ์เข้าถึงการสนทนานี้",
        });
      }

      const result =
        await Message.updateMany(
          {
            conversation:
              conversation._id,

            sender: {
              $ne:
                userId,
            },

            isRead:
              false,
          },
          {
            $set: {
              isRead:
                true,
            },
          }
        );

      return res.status(200).json({
        message:
          "อ่านข้อความแล้ว",

        modifiedCount:
          result.modifiedCount,
      });
    } catch (error) {
      console.error(
        "MARK READ ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "ไม่สามารถอัปเดตสถานะข้อความได้",
      });
    }
  };

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  createConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  markConversationAsRead,
};