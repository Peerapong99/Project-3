
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "กรุณาเข้าสู่ระบบ",
      });
    }

    const token = authorization.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        message: "ไม่พบบัญชีผู้ใช้",
      });
    }

    if (user.isBanned) return res.status(403).json({code:'ACCOUNT_BANNED',message:'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ'});
    if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) return res.status(401).json({code:'SESSION_REVOKED',message:'กรุณาเข้าสู่ระบบใหม่'});
    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      message: "กรุณาเข้าสู่ระบบใหม่",
    });
  }
};

const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "คุณไม่มีสิทธิ์เข้าถึงส่วนนี้",
      });
    }

    next();
  };
};

module.exports = {
  protect,
  allowRoles,
};
