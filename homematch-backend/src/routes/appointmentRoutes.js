const express = require("express");

const {
  createAppointment,
  getMyAppointments,
  getSellerAppointments,
  updateAppointmentStatus,
  cancelAppointment,
} = require("../controllers/appointmentController");

const {
  protect,
  allowRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// BUYER
// =====================================================

// สร้างนัดหมาย
router.post(
  "/",
  protect,
  allowRoles("buyer"),
  createAppointment
);

// ดูนัดหมายของผู้ซื้อ
router.get(
  "/my",
  protect,
  allowRoles("buyer"),
  getMyAppointments
);

// ผู้ซื้อยกเลิกนัดหมาย
router.patch(
  "/:id/cancel",
  protect,
  allowRoles("buyer"),
  cancelAppointment
);

// =====================================================
// SELLER
// =====================================================

// ผู้ขายดูคำขอนัดหมาย
router.get(
  "/seller",
  protect,
  allowRoles("seller"),
  getSellerAppointments
);

// ผู้ขายยืนยัน / ปฏิเสธ
router.patch(
  "/:id/status",
  protect,
  allowRoles("seller"),
  updateAppointmentStatus
);

module.exports = router;