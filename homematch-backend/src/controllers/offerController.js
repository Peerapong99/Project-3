
const mongoose = require("mongoose");

const Property = require("../models/Property");
const PurchaseOffer = require("../models/PurchaseOffer");
const membership = require("../services/subscriptionService");

// ========================================
// HELPERS
// ========================================

const getUserId = (req) => {
  return req.user?.id || req.user?._id;
};

const validId = (id) => {
  return mongoose.isValidObjectId(id);
};

const isBuyer = (req) => {
  return req.user?.role === "buyer";
};

const isSeller = (req) => {
  return req.user?.role === "seller";
};

// ========================================
// BUYER - CREATE OFFER
// ส่งข้อเสนอซื้อบ้าน
// ========================================

const createOffer = async (req, res) => {
  try {
    const buyerId = getUserId(req);

    const {
      propertyId,
      offerPrice,
      message = "",
    } = req.body || {};

    // ตรวจสอบสิทธิ์ Buyer
    if (!isBuyer(req)) {
      return res.status(403).json({
        message: "เฉพาะผู้ซื้อเท่านั้นที่ส่งข้อเสนอได้",
      });
    }

    // ตรวจสอบ Buyer ID
    if (!buyerId || !validId(buyerId)) {
      return res.status(401).json({
        message: "กรุณาเข้าสู่ระบบก่อนส่งข้อเสนอ",
      });
    }

    // ตรวจสอบ Property ID
    if (!validId(propertyId)) {
      return res.status(400).json({
        message: "รหัสบ้านไม่ถูกต้อง",
      });
    }

    // ตรวจสอบราคา
    if (
      typeof offerPrice !== "number" ||
      !Number.isFinite(offerPrice) ||
      offerPrice < 1
    ) {
      return res.status(400).json({
        message: "กรุณาระบุราคาที่เสนอให้ถูกต้อง",
      });
    }

    // ตรวจสอบข้อความ
    if (
      typeof message !== "string" ||
      message.length > 1000
    ) {
      return res.status(400).json({
        message: "ข้อความต้องไม่เกิน 1000 ตัวอักษร",
      });
    }

    // ค้นหาประกาศขายบ้าน
    const candidate = await Property.findById(propertyId).select('seller');
    if (!candidate) return res.status(404).json({message:'ไม่พบประกาศ'});
    const offer = await membership.sellerTransaction(candidate.seller, async ({session}) => {
      const property = await Property.findOne({_id:propertyId,status:'approved'}).session(session);
      if (!property) membership.fail(409,'PROPERTY_UNAVAILABLE','ประกาศนี้ไม่เปิดขายแล้ว');
      if (String(property.seller) === String(buyerId)) membership.fail(400,'OWN_PROPERTY','ไม่สามารถเสนอซื้อบ้านของตัวเองได้');
      if (await PurchaseOffer.exists({property:propertyId,status:'accepted'}).session(session)) membership.fail(409,'OFFER_ACCEPTED','บ้านนี้มีข้อเสนอที่ยอมรับแล้ว');
      if (await PurchaseOffer.exists({property:propertyId,buyer:buyerId,status:'pending'}).session(session)) membership.fail(409,'OFFER_PENDING','คุณมีข้อเสนอที่รอพิจารณาแล้ว');
      const [created] = await PurchaseOffer.create([{property:propertyId,buyer:buyerId,seller:property.seller,offerPrice,message:message.trim(),status:'pending'}],{session});
      return created;
    });

    await offer.populate([
      {
        path: "property",
        select: "title price images status",
      },
      {
        path: "buyer",
        select: "name email phone",
      },
    ]);

    return res.status(201).json({
      message: "ส่งข้อเสนอซื้อบ้านสำเร็จ",
      offer,
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({message:error.message,code:error.code});
    if (error.name === "ValidationError" || error.name === "CastError") return res.status(400).json({message:"ข้อมูลข้อเสนอไม่ถูกต้อง"});
    // ป้องกันข้อเสนอซ้ำจาก Unique Index
    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "คุณมีข้อเสนอที่รอการพิจารณาสำหรับบ้านหลังนี้แล้ว",
      });
    }

    console.error("CREATE OFFER ERROR:", error);

    return res.status(500).json({
      message: "ไม่สามารถส่งข้อเสนอซื้อบ้านได้",
    });
  }
};

// ========================================
// BUYER - GET MY OFFERS
// ดูข้อเสนอของตัวเอง
// ========================================

const getMyOffers = async (req, res) => {
  try {
    if (!isBuyer(req)) {
      return res.status(403).json({
        message: "เฉพาะผู้ซื้อเท่านั้น",
      });
    }

    const buyerId = getUserId(req);

    if (!buyerId || !validId(buyerId)) {
      return res.status(401).json({
        message: "กรุณาเข้าสู่ระบบ",
      });
    }

    const offers = await PurchaseOffer.find({
      buyer: buyerId,
    })
      .populate(
        "property",
        "title price images status location"
      )
      .populate(
        "seller",
        "name email phone"
      )
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      message: "ดึงข้อมูลข้อเสนอสำเร็จ",
      total: offers.length,
      offers,
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({message:error.message,code:error.code});
    if (error.name === "ValidationError" || error.name === "CastError") return res.status(400).json({message:"ข้อมูลข้อเสนอไม่ถูกต้อง"});
    console.error("GET MY OFFERS ERROR:", error);

    return res.status(500).json({
      message: "ไม่สามารถดึงข้อเสนอได้",
    });
  }
};

// ========================================
// BUYER - CANCEL OFFER
// ยกเลิกข้อเสนอซื้อบ้าน
// ========================================

const cancelOffer = async (req, res) => {
  try {
    if (!isBuyer(req)) {
      return res.status(403).json({
        message: "เฉพาะผู้ซื้อเท่านั้น",
      });
    }

    const buyerId = getUserId(req);
    const offerId = req.params.id;

    if (!buyerId || !validId(buyerId)) {
      return res.status(401).json({
        message: "กรุณาเข้าสู่ระบบ",
      });
    }

    if (!validId(offerId)) {
      return res.status(400).json({
        message: "รหัสข้อเสนอไม่ถูกต้อง",
      });
    }

    // ยกเลิกได้เฉพาะข้อเสนอ Pending ของตัวเอง
    const offer = await PurchaseOffer.findOneAndUpdate(
      {
        _id: offerId,
        buyer: buyerId,
        status: "pending",
      },
      {
        $set: {
          status: "cancelled",
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!offer) {
      return res.status(404).json({
        message:
          "ไม่พบข้อเสนอที่สามารถยกเลิกได้",
      });
    }

    return res.status(200).json({
      message: "ยกเลิกข้อเสนอสำเร็จ",
      offer,
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({message:error.message,code:error.code});
    if (error.name === "ValidationError" || error.name === "CastError") return res.status(400).json({message:"ข้อมูลข้อเสนอไม่ถูกต้อง"});
    console.error("CANCEL OFFER ERROR:", error);

    return res.status(500).json({
      message: "ไม่สามารถยกเลิกข้อเสนอได้",
    });
  }
};

// ========================================
// SELLER - GET OFFERS
// ดูข้อเสนอที่ได้รับ
// ========================================

const getSellerOffers = async (req, res) => {
  try {
    if (!isSeller(req)) {
      return res.status(403).json({
        message: "เฉพาะผู้ขายเท่านั้น",
      });
    }

    const sellerId = getUserId(req);

    if (!sellerId || !validId(sellerId)) {
      return res.status(401).json({
        message: "กรุณาเข้าสู่ระบบ",
      });
    }

    const offers = await PurchaseOffer.find({
      seller: sellerId,
    })
      .populate(
        "property",
        "title price images status location"
      )
      .populate(
        "buyer",
        "name email phone"
      )
      .sort({
        createdAt: -1,
      });

    // นับจำนวนแต่ละสถานะ
    const stats = {
      total: offers.length,
      pending: offers.filter(
        (offer) => offer.status === "pending"
      ).length,
      accepted: offers.filter(
        (offer) => offer.status === "accepted"
      ).length,
      rejected: offers.filter(
        (offer) => offer.status === "rejected"
      ).length,
      cancelled: offers.filter(
        (offer) => offer.status === "cancelled"
      ).length,
    };

    return res.status(200).json({
      message: "ดึงข้อเสนอที่ได้รับสำเร็จ",
      stats,
      offers,
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({message:error.message,code:error.code});
    if (error.name === "ValidationError" || error.name === "CastError") return res.status(400).json({message:"ข้อมูลข้อเสนอไม่ถูกต้อง"});
    console.error("GET SELLER OFFERS ERROR:", error);

    return res.status(500).json({
      message: "ไม่สามารถดึงข้อเสนอที่ได้รับได้",
    });
  }
};

// ========================================
// SELLER - RESPOND OFFER
// ยอมรับหรือปฏิเสธข้อเสนอ
// ========================================

const respondOffer = async (req, res) => {
  try {
    if (!isSeller(req)) {
      return res.status(403).json({
        message: "เฉพาะผู้ขายเท่านั้น",
      });
    }

    const sellerId = getUserId(req);
    const offerId = req.params.id;

    const { status } = req.body || {};

    if (!sellerId || !validId(sellerId)) {
      return res.status(401).json({
        message: "กรุณาเข้าสู่ระบบ",
      });
    }

    if (!validId(offerId)) {
      return res.status(400).json({
        message: "รหัสข้อเสนอไม่ถูกต้อง",
      });
    }

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        message:
          "สถานะต้องเป็น accepted หรือ rejected เท่านั้น",
      });
    }

    // ค้นหาข้อเสนอของ Seller
    const offer = await membership.sellerTransaction(sellerId, async ({session}) => {
      const existing = await PurchaseOffer.findOne({_id:offerId,seller:sellerId,status:'pending'}).session(session);
      if (!existing) membership.fail(409,'OFFER_STATE_CHANGED','ข้อเสนอนี้ถูกจัดการแล้ว หรือคุณไม่มีสิทธิ์');
      const property = await Property.findOne({_id:existing.property,seller:sellerId,status:'approved'}).session(session);
      if (!property) membership.fail(409,'PROPERTY_UNAVAILABLE','ประกาศนี้ไม่เปิดขายแล้ว');
      if (status === 'accepted' && await PurchaseOffer.exists({property:property._id,status:'accepted'}).session(session)) membership.fail(409,'OFFER_ACCEPTED','บ้านนี้มีข้อเสนอที่ยอมรับแล้ว');
      const updated = await PurchaseOffer.findOneAndUpdate({_id:offerId,seller:sellerId,status:'pending'},
        {$set:{status,respondedAt:new Date()}},{returnDocument:'after',runValidators:true,session});
      if (!updated) membership.fail(409,'OFFER_STATE_CHANGED','ข้อเสนอนี้ถูกจัดการแล้ว');
      return updated;
    });

    await offer.populate([
      {
        path: "property",
        select: "title price images status",
      },
      {
        path: "buyer",
        select: "name email phone",
      },
    ]);

    return res.status(200).json({
      message:
        status === "accepted"
          ? "ยอมรับข้อเสนอสำเร็จ"
          : "ปฏิเสธข้อเสนอสำเร็จ",
      offer,
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({message:error.message,code:error.code});
    if (error.name === "ValidationError" || error.name === "CastError") return res.status(400).json({message:"ข้อมูลข้อเสนอไม่ถูกต้อง"});
    console.error("RESPOND OFFER ERROR:", error);

    return res.status(500).json({
      message: "ไม่สามารถจัดการข้อเสนอได้",
    });
  }
};

// ========================================
// EXPORT
// ========================================

module.exports = {
  createOffer,
  getMyOffers,
  cancelOffer,
  getSellerOffers,
  respondOffer,
};
