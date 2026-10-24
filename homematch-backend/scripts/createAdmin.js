
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../src/models/User");

async function createAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL
      ?.trim()
      .toLowerCase();

    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password || password.length < 12) {
      throw new Error(
        "กำหนด ADMIN_EMAIL และ ADMIN_PASSWORD อย่างน้อย 12 ตัวอักษรใน .env"
      );
    }

    await mongoose.connect(process.env.MONGO_URI);

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new Error(
        "อีเมลนี้มีบัญชีอยู่แล้ว กรุณาใช้อีเมล Admin ใหม่"
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

    await User.create({
      name: "HomeMatch Admin",
      email,
      phone: "-",
      password: hashedPassword,
      role: "admin",
    });

    console.log("สร้างบัญชี Admin สำเร็จ:", email);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
