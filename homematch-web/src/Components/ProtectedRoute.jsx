
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../services/Api";

export default function ProtectedRoute({
  children,
  allowedRoles,
}) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const checkAuth = async () => {
      try {
        const response = await api.get("/auth/me");

        if (active) {
          setUser(response.data.user);
        }
      } catch (failure) {
        if (failure.response?.status === 401 || failure.response?.data?.code === 'ACCOUNT_BANNED') {
          sessionStorage.removeItem('token'); sessionStorage.removeItem('user');
        } else if (active) {setError('ตรวจสอบสิทธิ์ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ');}
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        กำลังตรวจสอบสิทธิ์...
      </div>
    );
  }

  if (error) return <div role="alert" className="p-8 text-center">{error} <button type="button" onClick={() => window.location.reload()}>ลองใหม่</button></div>;
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (user.role === "seller") {
      return <Navigate to="/seller/dashboard" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  return children;
}
