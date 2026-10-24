const express = require("express");

const {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require(
  "../controllers/notificationController"
);

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ดู Notification ของตัวเอง
router.get(
  "/",
  protect,
  getMyNotifications
);

// จำนวนที่ยังไม่ได้อ่าน
router.get(
  "/unread-count",
  protect,
  getUnreadCount
);

// อ่านทั้งหมด
// ต้องอยู่ก่อน /:id/read
router.patch(
  "/read-all",
  protect,
  markAllAsRead
);

// อ่าน Notification รายการเดียว
router.patch(
  "/:id/read",
  protect,
  markAsRead
);

module.exports = router;