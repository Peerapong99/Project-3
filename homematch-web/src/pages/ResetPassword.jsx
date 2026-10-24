
import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../services/Api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!token) {
      setMessage("ไม่พบ Token สำหรับรีเซ็ตรหัสผ่าน");
      return;
    }

    if (password.length < 8) {
      setMessage("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post(
        "/auth/reset-password",
        {
          token,
          password,
        }
      );

      setSuccess(true);
      setMessage(
        response.data?.message ||
          "เปลี่ยนรหัสผ่านสำเร็จแล้ว"
      );
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-slate-100">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-3xl">
            🔐
          </div>

          <h1 className="text-2xl font-bold text-slate-800">
            ตั้งรหัสผ่านใหม่
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            HomeMatch — กรุณากำหนดรหัสผ่านใหม่ของคุณ
          </p>
        </div>

        {message && (
          <div
            className={`mb-5 rounded-xl p-4 text-sm ${
              success
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {message}
          </div>
        )}

        {!success && (
          <form
            onSubmit={handleResetPassword}
            className="space-y-5"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                รหัสผ่านใหม่
              </label>

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="อย่างน้อย 8 ตัวอักษร"
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                ยืนยันรหัสผ่านใหม่
              </label>

              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                placeholder="กรอกรหัสผ่านอีกครั้ง"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) =>
                  setShowPassword(e.target.checked)
                }
              />
              แสดงรหัสผ่าน
            </label>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "กำลังบันทึก..."
                : "ยืนยันรหัสผ่านใหม่"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm font-semibold text-emerald-700 hover:underline"
          >
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}
