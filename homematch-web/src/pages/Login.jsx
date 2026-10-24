
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../services/Api";

import {
  House,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState(
    () => localStorage.getItem("rememberedEmail") || ""
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(
    () => Boolean(localStorage.getItem("rememberedEmail"))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // เข้าสู่ระบบผ่าน Backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");

    if (!email.trim() || !password) {
      setError("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const { token, user } = response.data;

      if (
        !token ||
        !user ||
        !["admin", "seller"].includes(user.role)
      ) {
        setError("บัญชีนี้ไม่มีสิทธิ์เข้าสู่ระบบเว็บไซต์");
        return;
      }

      // จำเฉพาะอีเมล ไม่เก็บรหัสผ่าน
      if (remember) {
        localStorage.setItem(
          "rememberedEmail",
          email.trim().toLowerCase()
        );
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      // เก็บข้อมูลการเข้าสู่ระบบ
      sessionStorage.setItem("token", token);
      sessionStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      // แยกหน้า Dashboard ตาม Role
      if (user.role === "admin") {
        navigate("/admin/dashboard", {
          replace: true,
        });
      } else {
        navigate("/seller/dashboard", {
          replace: true,
        });
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          setError(
            "ไม่สามารถเชื่อมต่อ Backend ได้ กรุณาตรวจสอบ Server"
          );
        } else {
          setError(
            err.response.data?.message ||
              "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่"
          );
        }
      } else {
        setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = `
    w-full h-12 pl-11 pr-12
    border border-slate-300 rounded-lg
    text-sm text-slate-800 outline-none transition
    placeholder:text-slate-400
    focus:border-[#079486]
    focus:ring-2 focus:ring-[#079486]/10
  `;

  return (
    <div className="min-h-screen bg-white lg:flex">
      {/* LEFT SIDE */}
      <section
        className="
          hidden lg:flex lg:w-[44%] xl:w-[45%]
          min-h-screen bg-[#079486] text-white
        "
      >
        <div
          className="
            w-full min-h-screen flex flex-col
            px-10 lg:px-12 xl:px-16 2xl:px-24
            py-10 xl:py-12
          "
        >
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className="
                w-10 h-10 rounded-xl bg-white/15
                flex items-center justify-center
              "
            >
              <House size={22} strokeWidth={2.2} />
            </div>

            <span className="font-semibold text-lg xl:text-xl">
              HomeMatch
            </span>
          </div>

          {/* Main Content */}
          <div
            className="
              flex-1 flex flex-col justify-center
              max-w-[520px] py-8
            "
          >
            <h1
              className="
                text-3xl xl:text-4xl 2xl:text-[42px]
                font-bold leading-[1.25] tracking-tight
              "
            >
              ค้นหาและจัดการ
              <br />
              อสังหาริมทรัพย์
              <br />
              อย่างมืออาชีพ
            </h1>

            <p
              className="
                mt-5 text-white/75 text-sm
                xl:text-[15px] leading-7
                max-w-[460px]
              "
            >
              แพลตฟอร์มที่รวมทุกความต้องการเรื่องบ้านไว้ในที่เดียว
              สะดวก รวดเร็ว
              และเข้าถึงข้อมูลที่คุณต้องการได้ง่าย
            </p>

            {/* Information Card */}
            <div
              className="
                mt-6 xl:mt-7 p-4 xl:p-5
                max-w-[480px] rounded-xl
                bg-white/10 border border-white/10
              "
            >
              <p className="text-xs xl:text-sm leading-6 text-white/90">
                “HomeMatch ช่วยให้การจัดการประกาศบ้าน
                และข้อมูลอสังหาริมทรัพย์เป็นเรื่องง่าย
                พร้อมเชื่อมต่อข้อมูลไปยังแอปพลิเคชันได้อย่างสะดวก”
              </p>

              <div className="flex items-center gap-3 mt-4">
                <div
                  className="
                    w-10 h-10 bg-white/20 rounded-full
                    flex items-center justify-center shrink-0
                  "
                >
                  <House size={19} strokeWidth={2} />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    HomeMatch
                  </p>

                  <p className="text-xs text-white/60">
                    Real Estate Management Platform
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-white/60 shrink-0">
            © 2026 HomeMatch. All rights reserved.
          </p>
        </div>
      </section>

      {/* RIGHT SIDE */}
      <section
        className="
          w-full lg:w-[56%] xl:w-[55%]
          min-h-screen flex items-center justify-center
          px-5 sm:px-8 md:px-12 lg:px-10
          xl:px-16 2xl:px-24 py-8 sm:py-10
        "
      >
        <div className="w-full max-w-[460px]">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-7 sm:mb-8">
            <div
              className="
                w-10 h-10 sm:w-11 sm:h-11
                bg-[#079486] text-white rounded-xl
                flex items-center justify-center
              "
            >
              <House size={23} strokeWidth={2.2} />
            </div>

            <span
              className="
                text-xl sm:text-2xl
                font-bold text-slate-900
              "
            >
              HomeMatch
            </span>
          </div>

          {/* Heading */}
          <div>
            <h2
              className="
                text-2xl sm:text-[28px]
                font-bold text-slate-900
              "
            >
              ยินดีต้อนรับกลับ
            </h2>

            <p className="mt-2 text-sm text-slate-400 leading-6">
              เข้าสู่ระบบเพื่อจัดการอสังหาริมทรัพย์ของคุณ
            </p>
          </div>

          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            className="mt-7 sm:mt-8"
          >
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                อีเมล <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="
                    absolute left-4 top-1/2
                    -translate-y-1/2 text-slate-400
                    pointer-events-none
                  "
                />

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="example@homematch.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  required
                  disabled={loading}
                  className={inputStyle}
                />
              </div>
            </div>

            {/* Password */}
            <div className="mt-5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                รหัสผ่าน <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="
                    absolute left-4 top-1/2
                    -translate-y-1/2 text-slate-400
                    pointer-events-none
                  "
                />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="กรอกรหัสผ่านของคุณ"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  required
                  disabled={loading}
                  className={inputStyle}
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
                    absolute right-4 top-1/2 -translate-y-1/2
                    text-slate-400 hover:text-[#079486]
                    transition cursor-pointer
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

            {/* Remember + Forgot */}
            <div
              className="
                mt-4 flex flex-wrap items-center
                justify-between gap-3
              "
            >
              <label
                className="
                  flex items-center gap-2
                  text-xs sm:text-sm
                  text-slate-600 cursor-pointer
                "
              >
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) =>
                    setRemember(e.target.checked)
                  }
                  className="
                    w-4 h-4 accent-[#079486]
                    cursor-pointer
                  "
                />
                จำอีเมลของฉัน
              </label>

              <button
                type="button"
                onClick={() =>
                  navigate("/forgot-password")
                }
                className="
                  text-xs sm:text-sm text-[#079486]
                  font-medium hover:underline cursor-pointer
                "
              >
                ลืมรหัสผ่าน?
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <p
                role="alert"
                className="
                  mt-5 rounded-lg border border-red-100
                  bg-red-50 p-3 text-sm text-red-600
                "
              >
                {error}
              </p>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="
                mt-6 w-full min-h-12 px-4
                bg-[#079486] hover:bg-[#087f74]
                active:scale-[0.99]
                disabled:opacity-60
                disabled:cursor-not-allowed
                text-white text-sm font-semibold
                rounded-lg transition cursor-pointer
                flex items-center justify-center gap-2
              "
            >
              {loading
                ? "กำลังเข้าสู่ระบบ..."
                : "เข้าสู่ระบบ"}

              {!loading && <ArrowRight size={18} />}
            </button>

            {/* Register */}
            <div className="mt-5 text-center">
              <p className="text-sm text-slate-500">
                ยังไม่มีบัญชี?

                <button
                  type="button"
                  onClick={() =>
                    navigate("/register")
                  }
                  className="
                    ml-2 text-[#079486] font-semibold
                    hover:text-[#087f74]
                    hover:underline cursor-pointer
                  "
                >
                  สมัครสมาชิก
                </button>
              </p>
            </div>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-7 sm:my-8">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-xs text-slate-400">
              หรือ
            </span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          {/* Social Login - UI Only */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <button
              type="button"
              disabled
              title="ยังไม่เปิดใช้งาน Google Login"
              className="
                min-h-12 px-4 border border-slate-300
                rounded-lg flex items-center justify-center
                gap-3 text-sm font-medium text-slate-700
                opacity-50 cursor-not-allowed
              "
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M21.35 12.27c0-.74-.07-1.45-.19-2.14H12v4.05h5.24a4.48 4.48 0 0 1-1.94 2.94v2.63h3.14c1.84-1.69 2.91-4.18 2.91-7.48Z"
                />
                <path
                  fill="#34A853"
                  d="M12 21.5c2.62 0 4.82-.87 6.43-2.35l-3.14-2.63c-.87.58-1.98.93-3.29.93-2.53 0-4.67-1.71-5.44-4.01H3.31v2.71A9.72 9.72 0 0 0 12 21.5Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.56 13.44A5.85 5.85 0 0 1 6.25 12c0-.5.11-.98.31-1.44V7.85H3.31A9.51 9.51 0 0 0 2.25 12c0 1.5.36 2.92 1.06 4.15l3.25-2.71Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 6.55c1.43 0 2.71.49 3.72 1.45l2.78-2.78C16.82 3.65 14.62 2.5 12 2.5a9.72 9.72 0 0 0-8.69 5.35l3.25 2.71c.77-2.3 2.91-4.01 5.44-4.01Z"
                />
              </svg>
              Google
            </button>

            <button
              type="button"
              disabled
              title="ยังไม่เปิดใช้งาน Facebook Login"
              className="
                min-h-12 px-4 border border-slate-300
                rounded-lg flex items-center justify-center
                gap-3 text-sm font-medium text-slate-700
                opacity-50 cursor-not-allowed
              "
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="#1877F2"
                  d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.49 0-1.956.931-1.956 1.887v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z"
                />
              </svg>
              Facebook
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 mt-7 sm:mt-8">
            สำหรับผู้ดูแลระบบและผู้ขาย HomeMatch
          </p>
        </div>
      </section>
    </div>
  );
}

export default Login;
