import {
  Crown,
  Users,
  LayoutDashboard,
  LogOut,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

export default function AdminSidebar({
  activeMenu,
  setActiveMenu,
  isOpen,
  setIsOpen,
  user,
}) {
  const navigate = useNavigate();

  const menus = [
    {id:'users',label:'จัดการผู้ใช้',icon:Users},
    {id:'subscriptions',label:"จัดการสมาชิก",icon:Crown,path:'/admin/subscriptions'},
    {
      id: "overview",
      label: "ภาพรวม",
      icon: LayoutDashboard,
    },
  ];

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-64 flex-col bg-[#111638] text-white
          transition-transform duration-300
          lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex h-17 items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#079486]">
              <span className="font-bold">H</span>
            </div>
            <span className="text-lg font-semibold">
              HomeMatch
            </span>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden"
            aria-label="ปิดเมนู"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 p-4">
          {menus.map((menu) => {
            const Icon = menu.icon;

            return (
              <button
                key={menu.id}
                onClick={() => {
                  if(menu.path) navigate(menu.path);
                  else setActiveMenu(menu.id);
                  setIsOpen(false);
                }}
                className={`
                  flex w-full items-center gap-3
                  rounded-lg px-4 py-3 text-left text-sm
                  transition
                  ${
                    activeMenu === menu.id
                      ? "bg-[#079486] text-white"
                      : "text-slate-300 hover:bg-white/10"
                  }
                `}
              >
                <Icon size={18} />
                {menu.label}
              </button>
            );
          })}
        </nav>

        {/* Admin Profile */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#079486] font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || "A"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {user?.name || "Admin"}
              </p>
              <p className="text-xs text-slate-400">
                แอดมิน
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              title="ออกจากระบบ"
              aria-label="ออกจากระบบ"
              className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

