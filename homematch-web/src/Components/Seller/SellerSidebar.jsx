import {
  LayoutDashboard,
  Plus,
  LogOut,
  X,
  Handshake,
  Crown,
  BadgeCheck,
} from "lucide-react";

import {
  useNavigate,
  useLocation,
} from "react-router-dom";

export default function SellerSidebar({
  isOpen,
  setIsOpen,
  user,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // =====================================
  // เมนู Seller
  // =====================================

  const menus = [
    {id:'plans',label:"แพ็กเกจสมาชิก",icon:Crown,path:'/seller/subscription/plans'},
    {id:'subscription',label:"สมาชิกของฉัน",icon:BadgeCheck,path:'/seller/subscription'},
    {
      id: "overview",
      label: "ภาพรวม",
      icon: LayoutDashboard,
      path: "/seller/dashboard",
    },
    {
      id: "add",
      label: "เพิ่มประกาศ",
      icon: Plus,
      path: "/seller/add-property",
    },
    {
      id: "offers",
      label: "จัดการข้อเสนอซื้อ",
      icon: Handshake,
      path: "/seller/offers",
    },
  ];

  // =====================================
  // Logout
  // =====================================

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setIsOpen(false);

    navigate("/login", {
      replace: true,
    });
  };

  // =====================================
  // ตรวจสอบ Active Menu
  // =====================================

  const checkActive = (menu) => {
    if (location.pathname === menu.path) {
      return true;
    }

    if (
      menu.id === "add" &&
      location.pathname.startsWith(
        "/seller/edit-property/"
      )
    ) {
      return true;
    }

    return false;
  };

  // =====================================
  // UI
  // =====================================

  return (
    <>
      {/* Overlay ตอนเปิด Sidebar บนมือถือ */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-64 flex-col
          bg-[#111638] text-white
          transition-transform duration-300
          lg:translate-x-0
          ${
            isOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        {/* =================================
            Logo
        ================================= */}

        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#079486] font-bold">
              H
            </div>

            <span className="text-lg font-semibold">
              HomeMatch
            </span>
          </div>

          {/* ปุ่มปิด Sidebar บนมือถือ */}

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
            aria-label="ปิดเมนู"
          >
            <X size={20} />
          </button>
        </div>

        {/* =================================
            Menu
        ================================= */}

        <nav className="flex-1 space-y-2 p-4">
          {menus.map((menu) => {
            const Icon = menu.icon;

            const isActive = checkActive(menu);

            return (
              <button
                key={menu.id}
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate(menu.path);
                }}
                className={`
                  flex w-full
                  items-center gap-3
                  rounded-lg
                  px-4 py-3
                  text-left text-sm
                  font-medium
                  transition
                  ${
                    isActive
                      ? "bg-[#079486] text-white"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }
                `}
              >
                <Icon size={18} />
                {menu.label}
              </button>
            );
          })}
        </nav>

        {/* =================================
            Profile
        ================================= */}

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#079486] font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() || "S"}
            </div>

            {/* User */}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {user?.name || "ผู้ขาย"}
              </p>

              <p className="text-xs text-slate-400">
                ผู้ขาย
              </p>
            </div>

            {/* Logout */}

            <button
              type="button"
              onClick={logout}
              title="ออกจากระบบ"
              aria-label="ออกจากระบบ"
              className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

