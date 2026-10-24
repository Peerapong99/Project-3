
const express = require("express");

const {
  protect,
  allowRoles,
} = require("../middleware/authMiddleware");

const {
  getUsers,
  setUserBan,
  getStats,
} = require("../controllers/adminController");

const router = express.Router();

// ทุก API ในไฟล์นี้ต้องเป็น Admin
router.use(protect);
router.use(allowRoles("admin"));

router.get("/users", getUsers);
router.patch('/users/:userId/ban',setUserBan);
router.get("/stats", getStats);

module.exports = router;
