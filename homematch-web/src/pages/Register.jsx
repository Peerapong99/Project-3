
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../services/Api";

import {
  House,
  UserRound,
  Phone,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !form.name.trim() ||
      !form.phone.trim() ||
      !form.email.trim() ||
      !form.password
    ) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    if (form.password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    if (!accepted) {
      setError("กรุณายอมรับข้อกำหนดก่อนสมัครสมาชิก");
      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/register", {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      alert("สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ");
      navigate("/login");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            "ไม่สามารถเชื่อมต่อ Backend ได้ กรุณาลองใหม่"
        );
      } else {
        setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = `
    w-full h-12 pl-11 pr-4
    border border-slate-300 rounded-lg
    text-sm text-slate-800
    outline-none transition
    placeholder:text-slate-400
    focus:border-[#079486]
    focus:ring-2 focus:ring-[#079486]/10
  `;

  const iconStyle =
    "absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none";

  const labelStyle =
    "block text-sm font-medium text-slate-700 mb-2";

  return (
    <div className="min-h-screen bg-white lg:flex">
      {/* LEFT */}
      <section
        className="
          hidden lg:flex lg:w-[44%] xl:w-[45%]
          bg-[#079486] text-white
        "
      >
        <div
          className="
            w-full min-h-screen flex flex-col
            px-10 xl:px-16 2xl:px-24 py-10
          "
        >
          {/* LOGO */}
          <div className="flex items-center gap-3">
            <div
              className="
                w-10 h-10 rounded-xl bg-white/15
                flex items-center justify-center
              "
            >
              <House size={22} />
            </div>

            <span className="text-xl font-semibold">
              HomeMatch
            </span>
          </div>

          {/* MAIN CONTENT */}
          <div
            className="
              flex-1 flex flex-col justify-center
              max-w-[520px] py-10
            "
          >
            <h1
              className="
                text-3xl xl:text-4xl 2xl:text-[42px]
                font-bold leading-[1.3]
              "
            >
              เริ่มต้นขายบ้าน
              <br />
              กับ HomeMatch
              <br />
              ได้ง่าย ๆ
            </h1>

            <p
              className="
                mt-6 text-sm xl:text-base
                leading-7 text-white/80
              "
            >
              สมัครสมาชิกเพื่อจัดการประกาศอสังหาริมทรัพย์
              เพิ่มข้อมูลบ้าน อัปโหลดรูปภาพ
              และเชื่อมต่อกับผู้ซื้อผ่านแอปพลิเคชัน
              HomeMatch
            </p>

            {/* INFORMATION CARD */}
            <div
              className="
                mt-8 p-5 rounded-2xl
                bg-white/10 border border-white/15
              "
            >
              <div className="flex gap-4 items-start">
                <div
                  className="
                    w-11 h-11 shrink-0
                    bg-white/20 rounded-xl
                    flex items-center justify-center
                  "
                >
                  <ShieldCheck size={23} />
                </div>

                <div>
                  <h3 className="font-semibold">
                    จัดการอสังหาริมทรัพย์ในที่เดียว
                  </h3>

                  <p
                    className="
                      mt-2 text-sm leading-6 text-white/75
                    "
                  >
                    เพิ่มประกาศบ้าน จัดการนัดหมาย
                    และติดตามข้อเสนอซื้อได้สะดวก
                    ผ่านระบบจัดการสำหรับผู้ขาย
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-white/60">
            © 2026 HomeMatch. All rights reserved.
          </p>
        </div>
      </section>

      {/* RIGHT */}
      <section
        className="
          w-full lg:w-[56%] xl:w-[55%]
          min-h-screen flex items-center justify-center
          px-5 sm:px-8 md:px-12 lg:px-10
          xl:px-16 2xl:px-24 py-8 sm:py-12
        "
      >
        <div className="w-full max-w-[460px]">
          {/* BACK */}
          <Link
            to="/login"
            className="
              inline-flex items-center gap-2
              text-sm text-slate-500
              hover:text-[#079486] mb-6
            "
          >
            <ArrowLeft size={17} />
            กลับไปหน้าเข้าสู่ระบบ
          </Link>

          {/* LOGO */}
          <div className="flex items-center gap-3 mb-7">
            <div
              className="
                w-11 h-11 bg-[#079486]
                rounded-xl text-white
                flex items-center justify-center
              "
            >
              <House size={23} />
            </div>

            <span className="text-2xl font-bold text-slate-900">
              HomeMatch
            </span>
          </div>

          {/* HEADING */}
          <h2
            className="
              text-2xl sm:text-[28px]
              font-bold text-slate-900
            "
          >
            สร้างบัญชีผู้ขาย
          </h2>

          <p
            className="
              mt-2 text-sm text-slate-400 leading-6
            "
          >
            กรอกข้อมูลเพื่อเริ่มต้นใช้งาน HomeMatch
          </p>

          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            className="mt-7 space-y-4"
          >
            {/* NAME */}
            <div>
              <label htmlFor="name" className={labelStyle}>
                ชื่อ-นามสกุล *
              </label>

              <div className="relative">
                <UserRound
                  size={18}
                  className={iconStyle}
                />

                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="กรอกชื่อและนามสกุล"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className={inputStyle}
                />
              </div>
            </div>

            {/* PHONE */}
            <div>
              <label htmlFor="phone" className={labelStyle}>
                เบอร์โทรศัพท์ *
              </label>

              <div className="relative">
                <Phone size={18} className={iconStyle} />

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="08XXXXXXXX"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  className={inputStyle}
                />
              </div>
            </div>

            {/* EMAIL */}
            <div>
              <label htmlFor="email" className={labelStyle}>
                อีเมล *
              </label>

              <div className="relative">
                <Mail size={18} className={iconStyle} />

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="example@homematch.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className={inputStyle}
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label htmlFor="password" className={labelStyle}>
                รหัสผ่าน *
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className={iconStyle}
                />

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  value={form.password}
                  onChange={handleChange}
                  minLength={8}
                  required
                  className={`${inputStyle} pr-12`}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  aria-label={
                    showPassword
                      ? "ซ่อนรหัสผ่าน"
                      : "แสดงรหัสผ่าน"
                  }
                  className="
                    absolute right-4 top-1/2
                    -translate-y-1/2 text-slate-400
                    hover:text-[#079486] cursor-pointer
                  "
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            {/* CONFIRM PASSWORD */}
            <div>
              <label
                htmlFor="confirmPassword"
                className={labelStyle}
              >
                ยืนยันรหัสผ่าน *
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className={iconStyle}
                />

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="new-password"
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  className={`${inputStyle} pr-12`}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "ซ่อนรหัสผ่าน"
                      : "แสดงรหัสผ่าน"
                  }
                  className="
                    absolute right-4 top-1/2
                    -translate-y-1/2 text-slate-400
                    hover:text-[#079486] cursor-pointer
                  "
                >
                  {showConfirmPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            {/* TERMS */}
            <label
              className="
                flex items-start gap-3 pt-1
                text-xs sm:text-sm text-slate-600
                cursor-pointer
              "
            >
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) =>
                  setAccepted(e.target.checked)
                }
                className="
                  w-4 h-4 mt-0.5 shrink-0
                  accent-[#079486] cursor-pointer
                "
              />

              <span>
                ฉันยอมรับข้อกำหนดการใช้งาน
                และนโยบายความเป็นส่วนตัวของ HomeMatch
              </span>
            </label>

            {/* ERROR */}
            {error && (
              <p
                role="alert"
                className="
                  text-sm text-red-600
                  bg-red-50 rounded-lg p-3
                "
              >
                {error}
              </p>
            )}

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full min-h-12 px-4
                bg-[#079486] hover:bg-[#087f74]
                disabled:opacity-60
                disabled:cursor-not-allowed
                text-white text-sm font-semibold
                rounded-lg transition
                active:scale-[0.99] cursor-pointer
              "
            >
              {loading
                ? "กำลังสมัครสมาชิก..."
                : "สมัครสมาชิก"}
            </button>

            {/* LOGIN LINK */}
            <p className="text-center text-sm text-slate-500 pt-1">
              มีบัญชีอยู่แล้ว?

              <Link
                to="/login"
                className="
                  ml-2 text-[#079486] font-semibold
                  hover:underline
                "
              >
                เข้าสู่ระบบ
              </Link>
            </p>
          </form>

          <p
            className="
              mt-8 text-center text-xs text-slate-400
            "
          >
            สำหรับผู้ขาย HomeMatch
          </p>
        </div>
      </section>
    </div>
  );
}

export default Register;
