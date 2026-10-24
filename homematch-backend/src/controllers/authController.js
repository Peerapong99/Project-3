
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Resend } = require("resend");
const { OAuth2Client } = require("google-auth-library");

// =====================================================
// CREATE JWT
// =====================================================

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

// =====================================================
// HELPERS
// =====================================================

const isValidEmail = (email) => {
  return (
    typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  );
};

const normalizeEmail = (email) => {
  return email.trim().toLowerCase();
};

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  role: user.role,
  profileImage: user.profileImage || "",
});

// =====================================================
// SELLER REGISTER
// =====================================================

const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body || {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !isValidEmail(email) ||
      typeof phone !== "string" ||
      !phone.trim() ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "กรุณากรอกข้อมูลให้ถูกต้องและครบถ้วน",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
      });
    }

    const cleanEmail = normalizeEmail(email);

    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "อีเมลนี้ถูกใช้งานแล้ว",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      password: hashedPassword,
      role: "seller",
    });

    return res.status(201).json({
      message: "สมัครสมาชิกสำเร็จ",
      token: generateToken(user),
      user: formatUser(user),
    });
  } catch (error) {
    console.error("SELLER REGISTER ERROR:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "อีเมลนี้ถูกใช้งานแล้ว",
      });
    }

    return res.status(500).json({
      message: "เกิดข้อผิดพลาดในการสมัครสมาชิก",
    });
  }
};

// =====================================================
// SELLER / ADMIN LOGIN
// =====================================================

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      !isValidEmail(email) ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "กรุณากรอกอีเมลและรหัสผ่าน",
      });
    }

    const user = await User.findOne({
      email: normalizeEmail(email),
      role: {
        $in: ["admin", "seller"],
      },
    }).select("+password");

    if (!user?.password) {
      return res.status(401).json({
        message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    if (user.isBanned) return res.status(403).json({code:'ACCOUNT_BANNED',message:'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ'});
    return res.status(200).json({
      message: "เข้าสู่ระบบสำเร็จ",
      token: generateToken(user),
      user: formatUser(user),
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
    });
  }
};

// =====================================================
// BUYER REGISTER
// =====================================================

const buyerRegister = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body || {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !isValidEmail(email) ||
      typeof phone !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "กรุณากรอกข้อมูลให้ถูกต้องและครบถ้วน",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
      });
    }

    const cleanPhone = phone.trim();

    if (!/^[0-9]{9,10}$/.test(cleanPhone)) {
      return res.status(400).json({
        message: "กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง",
      });
    }

    const cleanEmail = normalizeEmail(email);

    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "อีเมลนี้ถูกใช้งานแล้ว",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const buyer = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      password: hashedPassword,
      role: "buyer",
    });

    return res.status(201).json({
      message: "สมัครสมาชิกผู้ซื้อสำเร็จ",
      token: generateToken(buyer),
      user: formatUser(buyer),
    });
  } catch (error) {
    console.error("BUYER REGISTER ERROR:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "อีเมลนี้ถูกใช้งานแล้ว",
      });
    }

    return res.status(500).json({
      message: "เกิดข้อผิดพลาดในการสมัครสมาชิกผู้ซื้อ",
    });
  }
};

// =====================================================
// BUYER LOGIN
// =====================================================

const buyerLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      !isValidEmail(email) ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "กรุณากรอกอีเมลและรหัสผ่าน",
      });
    }

    const buyer = await User.findOne({
      email: normalizeEmail(email),
      role: "buyer",
    }).select("+password");

    if (!buyer?.password) {
      return res.status(401).json({
        message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      buyer.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
      });
    }

    if (buyer.isBanned) return res.status(403).json({code:'ACCOUNT_BANNED',message:'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ'});
    return res.status(200).json({
      message: "เข้าสู่ระบบสำเร็จ",
      token: generateToken(buyer),
      user: formatUser(buyer),
    });
  } catch (error) {
    console.error("BUYER LOGIN ERROR:", error);

    return res.status(500).json({
      message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
    });
  }
};

// =====================================================
// BUYER ME
// =====================================================

const buyerMe = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "กรุณาเข้าสู่ระบบ",
      });
    }

    const buyer = await User.findOne({
      _id: userId,
      role: "buyer",
    });

    if (!buyer) {
      return res.status(404).json({
        message: "ไม่พบข้อมูลผู้ซื้อ",
      });
    }

    return res.status(200).json({
      message: "ดึงข้อมูลผู้ซื้อสำเร็จ",
      user: {
        ...formatUser(buyer),
        createdAt: buyer.createdAt,
      },
    });
  } catch (error) {
    console.error("BUYER ME ERROR:", error);

    return res.status(500).json({
      message: "เกิดข้อผิดพลาดในการดึงข้อมูลผู้ซื้อ",
    });
  }
};

// =====================================================
// FORGOT PASSWORD - RESEND EMAIL API
// =====================================================

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "กรุณากรอกอีเมลให้ถูกต้อง",
      });
    }

    const successMessage = {
      message:
        "หากอีเมลนี้มีบัญชีที่ตั้งรหัสผ่านไว้ ระบบจะส่งลิงก์รีเซ็ตรหัสผ่านให้",
    };

    const user = await User.findOne({
      email: normalizeEmail(email),
    }).select("+password");

    // ไม่เปิดเผยว่าบัญชีมีอยู่ในระบบหรือไม่
    if (!user?.password) {
      return res.status(200).json(successMessage);
    }

    const {
      RESEND_API_KEY,
      RESEND_FROM,
      RESET_PASSWORD_URL,
    } = process.env;

    if (
      !RESEND_API_KEY ||
      !RESEND_FROM ||
      !RESET_PASSWORD_URL
    ) {
      console.error("Missing Resend configuration");

      return res.status(503).json({
        message: "ระบบส่งอีเมลยังไม่พร้อมใช้งาน",
      });
    }

    // สร้าง Token แบบสุ่ม
    const resetToken = crypto
      .randomBytes(32)
      .toString("hex");

    // เก็บเฉพาะ Hash ของ Token ลง MongoDB
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Token หมดอายุภายใน 15 นาที
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await user.save({
      validateBeforeSave: false,
    });

    // สร้าง URL สำหรับตั้งรหัสผ่านใหม่
    const resetUrl = new URL(RESET_PASSWORD_URL);
    resetUrl.searchParams.set("token", resetToken);

    let sendError = null;

    try {
      const resend = new Resend(RESEND_API_KEY);

      const { error } = await resend.emails.send({
        from: RESEND_FROM,
        to: [user.email],
        subject: "HomeMatch - ตั้งรหัสผ่านใหม่",
        text:
          `สวัสดี ${user.name}\n\n` +
          "เราได้รับคำขอรีเซ็ตรหัสผ่าน HomeMatch\n\n" +
          "คลิกลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:\n" +
          resetUrl.toString() +
          "\n\nลิงก์นี้จะหมดอายุภายใน 15 นาที\n\n" +
          "หากคุณไม่ได้ร้องขอ สามารถละเว้นอีเมลนี้ได้",
      });

      sendError = error;
    } catch (error) {
      sendError = error;
    }

    if (sendError) {
      // ล้าง Token เฉพาะชุดที่ส่งไม่สำเร็จ
      await User.updateOne(
        {
          _id: user._id,
          resetPasswordToken: hashedToken,
        },
        {
          $unset: {
            resetPasswordToken: "",
            resetPasswordExpires: "",
          },
        }
      );

      console.error("RESEND ERROR:", sendError);

      return res.status(502).json({
        message: "ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่",
      });
    }

    return res.status(200).json(successMessage);
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);

    return res.status(500).json({
      message: "เกิดข้อผิดพลาดในการส่งอีเมลรีเซ็ตรหัสผ่าน",
    });
  }
};

// =====================================================
// RESET PASSWORD
// =====================================================

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/.test(token) ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        message:
          "Token ไม่ถูกต้อง หรือรหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

    const user = await User.findOneAndUpdate(
      {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: {
          $gt: new Date(),
        },
      },
      {
        $set: {
          password: hashedPassword,
        },
        $inc: { tokenVersion: 1 },
        $unset: {
          resetPasswordToken: "",
          resetPasswordExpires: "",
        },
      },
      {
        new: true,
      }
    );

    if (!user) {
      return res.status(400).json({
        message:
          "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว",
      });
    }

    return res.status(200).json({
      message:
        "ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return res.status(500).json({
      message: "ไม่สามารถตั้งรหัสผ่านใหม่ได้",
    });
  }
};

// =====================================================
// GOOGLE LOGIN (BUYER)
// =====================================================

const buyerGoogleLogin = async (req, res) => {
  try {
    const { idToken } = req.body || {};

    if (
      typeof idToken !== "string" ||
      !idToken.trim()
    ) {
      return res.status(400).json({
        message: "กรุณาส่ง Google ID Token",
      });
    }

    const audiences = (
      process.env.GOOGLE_CLIENT_IDS ||
      process.env.GOOGLE_CLIENT_ID ||
      ""
    )
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (!audiences.length) {
      return res.status(503).json({
        message: "ยังไม่ได้ตั้งค่า Google Client ID",
      });
    }

    const client = new OAuth2Client();

    let payload;

    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: audiences,
      });

      payload = ticket.getPayload();
    } catch (error) {
      return res.status(401).json({
        message: "Google ID Token ไม่ถูกต้องหรือหมดอายุ",
      });
    }

    if (
      !payload?.sub ||
      !payload?.email ||
      payload.email_verified !== true
    ) {
      return res.status(401).json({
        message: "Google Account ยังไม่ได้ยืนยันอีเมล",
      });
    }

    let buyer = await User.findOne({
      googleId: payload.sub,
    });

    if (buyer && buyer.role !== "buyer") {
      return res.status(403).json({
        message: "บัญชีนี้ไม่ใช่บัญชีผู้ซื้อ",
      });
    }

    if (!buyer) {
      const existingUser = await User.findOne({
        email: normalizeEmail(payload.email),
      });

      // ไม่เชื่อมบัญชีเดิมโดยอัตโนมัติ
      if (existingUser) {
        return res.status(409).json({
          message:
            "อีเมลนี้มีบัญชี HomeMatch อยู่แล้ว กรุณาเข้าสู่ระบบด้วยวิธีเดิม",
        });
      }

      try {
        buyer = await User.create({
          name:
            payload.name ||
            payload.email.split("@")[0],
          email: normalizeEmail(payload.email),
          phone: "",
          googleId: payload.sub,
          role: "buyer",
          profileImage: payload.picture || "",
        });
      } catch (error) {
        if (error.code === 11000) {
          return res.status(409).json({
            message:
              "บัญชีนี้ถูกลงทะเบียนแล้ว กรุณาลองใหม่",
          });
        }

        throw error;
      }
    }

    if (buyer.isBanned) return res.status(403).json({code:'ACCOUNT_BANNED',message:'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ'});
    return res.status(200).json({
      message: "เข้าสู่ระบบด้วย Google สำเร็จ",
      token: generateToken(buyer),
      user: formatUser(buyer),
    });
  } catch (error) {
    console.error("GOOGLE LOGIN ERROR:", error);

    return res.status(500).json({
      message: "ไม่สามารถเข้าสู่ระบบด้วย Google ได้",
    });
  }
};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  register,
  login,
  buyerRegister,
  buyerLogin,
  buyerMe,
  forgotPassword,
  resetPassword,
  buyerGoogleLogin,
};
