
const express = require("express");
const router = express.Router();
const checkListingLimit = require('../middleware/checkListingLimit');

const {
  createProperty,
  getMyProperties,
  getMyStats,
  updateProperty,
  updatePropertyPrice,
  deleteProperty,
  getAllProperties,
  getPropertyStats,
  reviewProperty,

  // Sold
  markPropertyAsSold,

  // Public
  getPublicProperties,
  getPublicPropertyById,
} = require("../controllers/propertyController");

const {
  protect,
  allowRoles,
} = require("../middleware/authMiddleware");

// ========================================
// PUBLIC / BUYER
// ไม่ต้อง Login
// ========================================

// ดูบ้านที่ Admin อนุมัติแล้วทั้งหมด
router.get(
  "/public",
  getPublicProperties
);

// ดูรายละเอียดบ้านที่ Admin อนุมัติแล้ว
router.get(
  "/public/:id",
  getPublicPropertyById
);

// ========================================
// ตั้งแต่ตรงนี้ต้อง Login
// ========================================

router.use(protect);

// ========================================
// ADMIN
// ========================================

// ดูประกาศทั้งหมด
router.get(
  "/admin/all",
  allowRoles("admin"),
  getAllProperties
);

// ดูสถิติประกาศ
router.get(
  "/admin/stats",
  allowRoles("admin"),
  getPropertyStats
);

// อนุมัติ / ปฏิเสธประกาศ
router.patch(
  "/admin/:id/review",
  allowRoles("admin"),
  reviewProperty
);

// ========================================
// SELLER
// ========================================

// เพิ่มประกาศ
router.post(
  "/",
  allowRoles("seller"),
  checkListingLimit,
  createProperty
);

// ดูประกาศของตัวเอง
router.get(
  "/my",
  allowRoles("seller"),
  getMyProperties
);

// ดูสถิติประกาศของตัวเอง
router.get(
  "/my/stats",
  allowRoles("seller"),
  getMyStats
);

// ========================================
// SELLER - แก้ไขราคา
// ใช้ได้แม้ Admin อนุมัติแล้ว
// ========================================

router.patch(
  "/:id/price",
  allowRoles("seller"),
  updatePropertyPrice
);

// ========================================
// ปิดการขาย
// approved -> sold
// ========================================

router.patch(
  "/:id/sold",
  allowRoles("seller"),
  markPropertyAsSold
);

// ========================================
// แก้ไขประกาศทั่วไป
// ========================================

router.patch(
  "/:id",
  allowRoles("seller"),
  updateProperty
);

// ========================================
// ลบประกาศ
// ========================================

router.delete(
  "/:id",
  allowRoles("seller"),
  deleteProperty
);

module.exports = router;
