
import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/Api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("กรุณากรอกอีเมล");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post(
        "/auth/forgot-password",
        {
          email: cleanEmail,
        }
      );

      setMessage(
        response.data?.message ||
          "ส่งคำขอรีเซ็ตรหัสผ่านเรียบร้อยแล้ว"
      );

    } catch (err) {
      console.error(
        "FORGOT PASSWORD ERROR:",
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
          "ไม่สามารถส่งคำขอได้ กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-100 px-4 py-10">

      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">

        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-3xl">
            🔐
          </div>

          <h1 className="text-2xl font-bold text-slate-800">
            ลืมรหัสผ่าน
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            กรอกอีเมลที่ใช้สมัครสมาชิก HomeMatch
            เพื่อขอเปลี่ยนรหัสผ่านใหม่
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              อีเมล
            </label>

            <input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "กำลังส่งคำขอ..."
              : "ส่งคำขอรีเซ็ตรหัสผ่าน"}
          </button>
        </form>

        <div className="mt-7 text-center">
          <Link
            to="/login"
            className="text-sm font-semibold text-emerald-700 hover:underline"
          >
            ← กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>

      </div>
    </div>
  );
}
