const User = require("../models/User");

// =====================================================
// PROPERTY IMAGES
// ระบบเดิม
// =====================================================

exports.uploadImages = (req, res) => {
  const images = (
    req.files?.images || []
  ).map(
    (file) =>
      `/uploads/properties/${file.filename}`
  );

  const floorPlans = (
    req.files?.floorPlans || []
  ).map(
    (file) =>
      `/uploads/floorplans/${file.filename}`
  );

  res.status(201).json({
    message: "อัปโหลดรูปภาพสำเร็จ",
    images,
    floorPlans,
  });
};

// =====================================================
// PROFILE IMAGE
// Buyer + Seller
// =====================================================

exports.uploadProfileImage = async (
  req,
  res
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "กรุณาเลือกรูปโปรไฟล์",
      });
    }

    const userId =
      req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "กรุณาเข้าสู่ระบบ",
      });
    }

    const profileImage =
      `/uploads/profiles/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        profileImage,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        message: "ไม่พบผู้ใช้งาน",
      });
    }

    return res.status(200).json({
      message: "เปลี่ยนรูปโปรไฟล์สำเร็จ",

      profileImage,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error(
      "UPLOAD PROFILE IMAGE ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "เกิดข้อผิดพลาดในการอัปโหลดรูปโปรไฟล์",
    });
  }
};