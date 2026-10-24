
const express = require("express");

const {
  register,
  login,

  // Buyer
  buyerRegister,
  buyerLogin,
  buyerMe,

  // Forgot Password
  forgotPassword,
  resetPassword,

  // Google Login
  buyerGoogleLogin,
} = require("../controllers/authController");

const {
  protect,
  allowRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();
const rateLimit = require('../middleware/rateLimit');
const accountLimit = rateLimit({limit:20,key:req=>typeof req.body?.email==='string'?req.body.email.trim().toLowerCase():req.ip});
router.use((req,res,next)=>req.method==='POST'?authLimit(req,res,next):next());
const authLimit = rateLimit({limit:60});
router.use((req,res,next)=>req.method==='POST'?accountLimit(req,res,next):next());


// =====================================================
// SELLER / ADMIN AUTH
// =====================================================

// สมัครสมาชิก Seller
router.post("/register", register);

// Login Admin / Seller
router.post("/login", login);

// =====================================================
// ADMIN / SELLER ME
// =====================================================

router.get("/me", protect, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      profileImage: req.user.profileImage || "",
    },
  });
});

// =====================================================
// BUYER AUTH
// =====================================================

// สมัครสมาชิก Buyer
router.post("/buyer/register", buyerRegister);

// Login Buyer
router.post("/buyer/login", buyerLogin);

// ข้อมูล Buyer ที่ Login อยู่
router.get(
  "/buyer/me",
  protect,
  allowRoles("buyer"),
  buyerMe
);

// =====================================================
// FORGOT PASSWORD
// =====================================================

// ส่งอีเมลขอรีเซ็ตรหัสผ่าน
router.post(
  "/forgot-password",
  forgotPassword
);

// ตั้งรหัสผ่านใหม่
router.post(
  "/reset-password",
  resetPassword
);

// =====================================================
// GOOGLE LOGIN
// =====================================================

// Login / Register ด้วย Google สำหรับ Buyer
router.post(
  "/buyer/google",
  buyerGoogleLogin
);

// =====================================================

module.exports = router;
