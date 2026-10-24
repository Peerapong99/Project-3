import {
  useEffect,
  useState,
  useCallback,
} from "react";

import { useNavigate, useLocation } from "react-router-dom";

import {
  Menu,
  ArrowLeft,
  House,
  Clock3,
  CircleCheck,
  CircleX,
  Users,
  RefreshCw,
} from "lucide-react";

import api from "../../services/Api";

import AdminSidebar from "./AdminSidebar";
import StatCard from "./StatCard";
import PropertyTable from "./PropertyTable";
import UserManagement from './UserManagement';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeMenu, setActiveMenu] =
    useState(() => ["overview", "users"].includes(location.state?.menu) ? location.state.menu : "overview");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [user, setUser] = useState(null);

  // =====================================
  // สถิติผู้ใช้งาน
  // =====================================

  const [stats, setStats] = useState(null);

  // =====================================
  // ข้อมูลประกาศ
  // =====================================

  const [properties, setProperties] =
    useState([]);

  // =====================================
  // สถิติประกาศ
  // =====================================

  const [
    propertyStatsData,
    setPropertyStatsData,
  ] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  // =====================================
  // Status
  // =====================================

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [dataReady, setDataReady] =
    useState(false);

  // =====================================
  // โหลด Dashboard
  // =====================================

  const loadDashboard = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setError("");

        // =====================================
        // โหลดพร้อมกัน 4 API
        // =====================================

        const [
          userResponse,
          userStatsResponse,
          propertiesResponse,
          propertyStatsResponse,
        ] = await Promise.all([
          api.get("/auth/me", {
            signal,
          }),

          api.get("/admin/stats", {
            signal,
          }),

          api.get(
            "/properties/admin/all",
            {
              signal,
            }
          ),

          api.get(
            "/properties/admin/stats",
            {
              signal,
            }
          ),
        ]);

        if (signal?.aborted) {
          return;
        }

        // =====================================
        // User
        // =====================================

        setUser(
          userResponse.data.user
        );

        // =====================================
        // User Stats
        // =====================================

        setStats(
          userStatsResponse.data
        );

        // =====================================
        // Properties
        // รองรับหลายรูปแบบ response
        // =====================================

        const propertyData =
          propertiesResponse.data;

        const propertyList =
          Array.isArray(propertyData)
            ? propertyData
            : propertyData.properties ||
              [];

        setProperties(propertyList);

        // =====================================
        // Property Stats
        // รองรับ
        // { total, pending... }
        // หรือ
        // { stats: {...} }
        // =====================================

        const statsData =
          propertyStatsResponse.data
            .stats ||
          propertyStatsResponse.data;

        setPropertyStatsData({
          total:
            statsData.total ?? 0,

          pending:
            statsData.pending ?? 0,

          approved:
            statsData.approved ?? 0,

          rejected:
            statsData.rejected ?? 0,
        });

        // =====================================
        // บอก PropertyTable ว่าโหลดแล้ว
        // =====================================

        setDataReady(true);
      } catch (err) {
        // =====================================
        // Abort
        // =====================================

        if (
          signal?.aborted ||
          err.code === "ERR_CANCELED"
        ) {
          return;
        }

        const status =
          err.response?.status;

        // =====================================
        // Token หมดอายุ / ไม่มี Token
        // =====================================

        if (status === 401) {
          sessionStorage.removeItem(
            "token"
          );

          sessionStorage.removeItem(
            "user"
          );

          navigate("/login", {
            replace: true,
          });

          return;
        }

        // =====================================
        // ไม่ใช่ Admin
        // =====================================

        if (status === 403) {
          navigate(
            "/seller/dashboard",
            {
              replace: true,
            }
          );

          return;
        }

        console.error(
          "Dashboard Error:",
          err
        );

        console.error(
          "Response:",
          err.response?.data
        );

        setError(
          err.response?.data?.message ||
            "ไม่สามารถโหลดข้อมูล Dashboard ได้"
        );

        setDataReady(false);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [navigate]
  );

  // =====================================
  // โหลดข้อมูลเมื่อเปิดหน้า
  // =====================================

  useEffect(() => {
    const controller =
      new AbortController();

    const timer = setTimeout(() => {
      loadDashboard(
        controller.signal
      );
    }, 0);

    return () => {
      clearTimeout(timer);

      controller.abort();
    };
  }, [loadDashboard]);

  // =====================================
  // Refresh
  // =====================================

  const handleRefresh = async () => {
    await loadDashboard();
  };

  // =====================================
  // Property Stat Cards
  // =====================================

  const propertyStats = [
    {
      title: "ประกาศทั้งหมด",

      value:
        propertyStatsData.total,

      icon: House,

      iconColor:
        "text-teal-600",

      iconBg:
        "bg-teal-50",
    },

    {
      title: "รอการตรวจสอบ",

      value:
        propertyStatsData.pending,

      icon: Clock3,

      iconColor:
        "text-amber-600",

      iconBg:
        "bg-amber-50",
    },

    {
      title: "อนุมัติแล้ว",

      value:
        propertyStatsData.approved,

      icon: CircleCheck,

      iconColor:
        "text-emerald-600",

      iconBg:
        "bg-emerald-50",
    },

    {
      title: "ปฏิเสธ",

      value:
        propertyStatsData.rejected,

      icon: CircleX,

      iconColor:
        "text-red-600",

      iconBg:
        "bg-red-50",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* =====================================
          Sidebar
      ===================================== */}

      <AdminSidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        user={user}
      />

      <div className="min-h-screen lg:ml-64">

        {/* =====================================
            Header
        ===================================== */}

        <header className="sticky top-0 z-30 flex min-h-17 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">

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
              {activeMenu === "users" ? "จัดการผู้ใช้" : "แดชบอร์ดแอดมิน"}
            </h1>

          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/login")
            }
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-[#079486] sm:text-sm"
          >
            <ArrowLeft size={16} />
            กลับหน้าหลัก
          </button>

        </header>

        {/* =====================================
            Main
        ===================================== */}

        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">

          {activeMenu === "users" ? <UserManagement /> : (
            <>

              {/* =====================================
                  Error
              ===================================== */}

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600"
                >
                  {error}
                </div>
              )}

              {/* =====================================
                  Property Statistics
              ===================================== */}

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">

                {propertyStats.map(
                  (item) => (
                    <StatCard
                      key={item.title}
                      {...item}
                    />
                  )
                )}

              </div>

              {/* =====================================
                  Property Management
              ===================================== */}

              <PropertyTable
                properties={properties}
                dataReady={dataReady}
              />

              {/* =====================================
                  User Statistics
              ===================================== */}

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

                <div className="flex flex-wrap items-center justify-between gap-3">

                  <div className="flex items-center gap-2">

                    <Users
                      size={20}
                      className="text-[#079486]"
                    />

                    <h2 className="font-semibold text-slate-900">
                      ข้อมูลผู้ใช้งาน
                    </h2>

                  </div>

                  <button
                    type="button"
                    onClick={
                      handleRefresh
                    }
                    disabled={loading}
                    className="flex items-center gap-2 text-sm text-[#079486] disabled:opacity-50"
                  >
                    <RefreshCw
                      size={16}
                      className={
                        loading
                          ? "animate-spin"
                          : ""
                      }
                    />

                    รีเฟรช
                  </button>

                </div>

                {loading ? (
                  <p className="mt-5 text-sm text-slate-400">
                    กำลังโหลดข้อมูล...
                  </p>
                ) : (
                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">

                    {[
                      {
                        label:
                          "ผู้ใช้งานทั้งหมด",

                        value:
                          stats?.totalUsers,
                      },

                      {
                        label:
                          "ผู้ขาย",

                        value:
                          stats?.totalSellers,
                      },

                      {
                        label:
                          "แอดมิน",

                        value:
                          stats?.totalAdmins,
                      },
                    ].map(
                      (item) => (
                        <div
                          key={
                            item.label
                          }
                          className="rounded-lg bg-slate-50 p-4"
                        >
                          <p className="text-sm text-slate-500">
                            {
                              item.label
                            }
                          </p>

                          <p className="mt-2 text-2xl font-bold text-[#079486]">
                            {item.value ??
                              "—"}
                          </p>
                        </div>
                      )
                    )}

                  </div>
                )}

              </section>

            </>
          )}

        </main>

      </div>

    </div>
  );
}