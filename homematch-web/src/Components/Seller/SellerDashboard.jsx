
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Menu,
  House,
  Clock3,
  CircleCheck,
  BadgeDollarSign,
} from "lucide-react";

import api from "../../services/Api";

import SellerSidebar from "../../Components/Seller/SellerSidebar";
import SellerPropertyTable from "../../Components/Seller/SellerPropertyTable";
import StatCard from "../../Components/Admin/StatCard";

// =====================================
// ฟังก์ชันดึงข้อมูลจาก Backend
// แยกไว้นอก Component
// =====================================

async function fetchSellerProperties(signal) {
  const config = signal ? { signal } : {};

  const [propertiesResponse, statsResponse] =
    await Promise.all([
      api.get("/properties/my", config),
      api.get("/properties/my/stats", config),
    ]);

  const propertyData = propertiesResponse.data;

  const properties = Array.isArray(propertyData)
    ? propertyData
    : propertyData.properties || [];

  const statsData =
    statsResponse.data.stats ||
    statsResponse.data;

  const stats = {
    total: statsData.total ?? 0,
    pending: statsData.pending ?? 0,
    approved: statsData.approved ?? 0,
    sold: statsData.sold ?? 0,
  };

  return { properties, stats };
}

// =====================================
// Seller Dashboard
// =====================================

export default function SellerDashboard() {
  const navigate = useNavigate();

  // Sidebar
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  // ข้อมูลผู้ขาย
  const [user, setUser] = useState(null);

  // ข้อมูลประกาศ
  const [properties, setProperties] =
    useState([]);

  // สถิติประกาศ
  const [propertyStats, setPropertyStats] =
    useState({
      total: 0,
      pending: 0,
      approved: 0,
      sold: 0,
    });

  // สถานะการโหลด
  const [loading, setLoading] =
    useState(true);

  const [
    propertiesLoading,
    setPropertiesLoading,
  ] = useState(true);

  const [error, setError] =
    useState("");

  // =====================================
  // 1. โหลดข้อมูลผู้ขาย
  // =====================================

  useEffect(() => {
    const controller = new AbortController();

    const loadUser = async () => {
      try {
        const response = await api.get(
          "/auth/me",
          {
            signal: controller.signal,
          }
        );

        if (controller.signal.aborted) {
          return;
        }

        setUser(response.data.user);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        if (err.response?.status === 401) {
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");

          navigate("/login", {
            replace: true,
          });

          return;
        }

        if (err.response?.status === 403) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        setError(
          "ไม่สามารถโหลดข้อมูลผู้ใช้งานได้"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      controller.abort();
    };
  }, [navigate]);

  // =====================================
  // 2. โหลดข้อมูลประกาศจาก MongoDB
  // =====================================

  useEffect(() => {
    const controller = new AbortController();

    const loadProperties = async () => {
      try {
        const result =
          await fetchSellerProperties(
            controller.signal
          );

        if (controller.signal.aborted) {
          return;
        }

        setProperties(result.properties);

        setPropertyStats(result.stats);
      } catch (err) {
        if (
          controller.signal.aborted ||
          err.code === "ERR_CANCELED"
        ) {
          return;
        }

        console.error(
          "โหลดประกาศไม่สำเร็จ:",
          err
        );

        setError(
          "ไม่สามารถโหลดข้อมูลประกาศได้"
        );
      } finally {
        if (!controller.signal.aborted) {
          setPropertiesLoading(false);
        }
      }
    };

    loadProperties();

    return () => {
      controller.abort();
    };
  }, []);

  // =====================================
  // 3. รีเฟรชหลังลบประกาศ
  // =====================================

  const handlePropertyDeleted = async () => {
    try {
      setPropertiesLoading(true);

      const result =
        await fetchSellerProperties();

      setProperties(result.properties);

      setPropertyStats(result.stats);

      setError("");
    } catch (err) {
      console.error(
        "รีเฟรชประกาศไม่สำเร็จ:",
        err
      );

      setError(
        "ลบประกาศแล้ว แต่ไม่สามารถโหลดข้อมูลล่าสุดได้ กรุณารีเฟรชหน้าเว็บ"
      );
    } finally {
      setPropertiesLoading(false);
    }
  };

  // =====================================
  // 4. ข้อมูล StatCard
  // =====================================

  const stats = [
    {
      title: "ประกาศทั้งหมด",

      value: propertiesLoading
        ? "—"
        : propertyStats.total,

      icon: House,

      iconColor: "text-teal-600",

      iconBg: "bg-teal-50",
    },

    {
      title: "รอการตรวจสอบ",

      value: propertiesLoading
        ? "—"
        : propertyStats.pending,

      icon: Clock3,

      iconColor: "text-amber-600",

      iconBg: "bg-amber-50",
    },

    {
      title: "อนุมัติแล้ว",

      value: propertiesLoading
        ? "—"
        : propertyStats.approved,

      icon: CircleCheck,

      iconColor: "text-emerald-600",

      iconBg: "bg-emerald-50",
    },

    {
      title: "ขายแล้ว",

      value: propertiesLoading
        ? "—"
        : propertyStats.sold,

      icon: BadgeDollarSign,

      iconColor: "text-slate-600",

      iconBg: "bg-slate-100",
    },
  ];

  // =====================================
  // 5. UI Seller Dashboard เดิม
  // =====================================

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* Sidebar */}
      <SellerSidebar
        activeMenu="overview"
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        user={user}
      />

      <div className="min-h-screen lg:ml-64">

        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={() =>
                setSidebarOpen(true)
              }
              className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
              aria-label="เปิดเมนู"
            >
              <Menu size={22} />
            </button>

            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
              แดชบอร์ดผู้ขาย
            </h1>

          </div>


        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">

          {/* Loading */}
          {loading && (
            <p className="text-sm text-slate-500">
              กำลังโหลดข้อมูลผู้ขาย...
            </p>
          )}

          {/* Error */}
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
            >
              {error}
            </p>
          )}

          {/* Welcome */}
          {user && (
            <p className="text-sm text-slate-500">
              ยินดีต้อนรับ {user.name}
            </p>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">

            {stats.map((item) => (
              <StatCard
                key={item.title}
                {...item}
              />
            ))}

          </div>

          {/* Property Table */}
          <SellerPropertyTable
            properties={properties}
            loading={propertiesLoading}
            onDeleted={handlePropertyDeleted}
          />

        </main>

      </div>

    </div>
  );
}
