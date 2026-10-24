
const User = require("../models/User");

// ดูรายชื่อผู้ใช้
const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("name email phone role profileImage createdAt isBanned banReason bannedAt bannedBy")
      .sort({ createdAt: -1 });

    res.json({
      total: users.length,
      users,
    });
  } catch {
    res.status(500).json({
      message: "ไม่สามารถดึงข้อมูลผู้ใช้ได้",
    });
  }
};

// ดูสถิติ Dashboard
const getStats = async (req, res) => {
  try {
    const [totalUsers, totalSellers, totalAdmins] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: "seller" }),
        User.countDocuments({ role: "admin" }),
      ]);

    res.json({
      totalUsers,
      totalSellers,
      totalAdmins,
    });
  } catch {
    res.status(500).json({
      message: "ไม่สามารถดึงข้อมูลสถิติได้",
    });
  }
};


const setUserBan = async (req,res,next) => {
  try {
    const mongoose=require('mongoose');
    const {userId}=req.params;
    const {isBanned,reason}=req.body || {};
    if (!mongoose.isValidObjectId(userId) || typeof isBanned !== 'boolean') return res.status(400).json({message:'ข้อมูลสมาชิกหรือสถานะไม่ถูกต้อง'});
    if (isBanned && (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500)) return res.status(400).json({message:'กรุณาระบุเหตุผลแบน ไม่เกิน 500 ตัวอักษร'});
    const target=await User.findById(userId).select('role isBanned');
    if (!target) return res.status(404).json({message:'ไม่พบสมาชิก'});
    if (target.role === 'admin' || String(req.user._id) === userId) return res.status(403).json({message:'ไม่สามารถแบนบัญชี Admin หรือบัญชีของตนเองได้'});
    const updated=await User.findOneAndUpdate(
      {_id:userId,role:{$ne:'admin'},isBanned:isBanned ? {$ne:true} : true},
      {$set:{isBanned,banReason:isBanned ? reason.trim() : '',bannedAt:isBanned ? new Date() : null,bannedBy:isBanned ? req.user._id : null},$inc:{tokenVersion:1}},
      {returnDocument:'after',runValidators:true}
    ).select('name email phone role profileImage createdAt isBanned banReason bannedAt bannedBy');
    if (!updated) return res.status(409).json({message:'สถานะสมาชิกเปลี่ยนแล้ว กรุณาโหลดข้อมูลใหม่'});
    res.json({message:isBanned ? 'แบนสมาชิกแล้ว' : 'ปลดแบนสมาชิกแล้ว สมาชิกสามารถเข้าสู่ระบบใหม่ได้',user:updated});
  } catch(error) {next(error);}
};
module.exports = {
  setUserBan,
  getUsers,
  getStats,
};
