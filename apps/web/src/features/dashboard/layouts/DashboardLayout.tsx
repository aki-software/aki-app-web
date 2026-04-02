import {
    ChartPie,
    LayoutDashboard,
    LogOut,
    Menu,
    Moon,
    Settings,
    Sun,
    Ticket,
    Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { GlobalFooter } from "../components/GlobalFooter";

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return (
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  const navItems = [
    {
      name: "Resumen",
      path: "/dashboard",
      icon: LayoutDashboard,
      adminOnly: false,
    },
    {
      name: "Tests realizados",
      path: "/dashboard/results",
      icon: ChartPie,
      adminOnly: false,
    },
    {
      name: "Vouchers",
      path: "/dashboard/vouchers",
      icon: Ticket,
      adminOnly: false,
    },
    {
      name: "Instituciones y terapeutas",
      path: "/dashboard/users",
      icon: Users,
      adminOnly: true,
    },
    {
      name: "Material teórico (CMS)",
      path: "/dashboard/settings",
      icon: Settings,
      adminOnly: false,
    },
  ].filter((item) => !item.adminOnly || isAdmin);

  const headerTitle =
    (location.pathname.startsWith("/dashboard/activity")
      ? "Actividad Operativa"
      : navItems.find((item) => {
          if (item.path === "/dashboard")
            return location.pathname === "/dashboard";
          return location.pathname.startsWith(item.path);
        })?.name) ?? "Dashboard";

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar-bg text-sidebar-text border-r border-sidebar-border backdrop-blur-xl overflow-hidden">
      <div className="px-7 py-10 border-b border-sidebar-border flex flex-col gap-1">
        <div className="flex items-center gap-4 mb-4 rounded-2xl border border-app-border/70 bg-black/25 px-3 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.28)]">
          <div className="h-[74px] w-[122px] rounded-2xl flex items-center justify-center border border-app-border bg-black/45 shadow-[0_0_30px_rgba(204,255,0,0.18)] transition-transform hover:scale-105 overflow-hidden px-2">
            <img
              src="/logo2.fw.png"
              alt="ORIENT A.KI"
              className="max-h-full w-full object-contain object-center"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[2rem] font-display font-bold text-app-text-main tracking-tight leading-none">
              ORIENT A.KI
            </span>
            <span className="app-label !text-[10px] opacity-80 mt-1.5">
              Consola Operativa
            </span>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-black/30 border border-app-border inline-flex items-center gap-2 max-w-fit">
          <div className="h-1.5 w-1.5 rounded-full bg-app-primary animate-pulse" />
          <span className="text-[9px] font-semibold text-app-text-muted uppercase tracking-[0.14em]">
            Vocational Diagnostics
          </span>
        </div>
      </div>

      <div className="flex-1 px-4 py-8 overflow-y-auto">
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/dashboard" &&
                location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] rounded-2xl transition-all duration-300 group ${
                  isActive
                    ? "bg-sidebar-active-bg text-sidebar-active-text border border-app-primary/40 shadow-[0_0_20px_rgba(204,255,0,0.18)]"
                    : "text-app-text-muted hover:bg-sidebar-hover hover:text-app-primary"
                }`}
              >
                <item.icon
                  className={`flex-shrink-0 w-5 h-5 mr-4 transition-all ${
                    isActive
                      ? "text-app-primary scale-110"
                      : "text-app-text-muted/40 group-hover:text-app-primary group-hover:scale-110"
                  }`}
                />
                <span className="transition-transform group-hover:translate-x-1">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-6 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="flex w-full items-center px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted rounded-2xl hover:bg-rose-500/10 hover:text-rose-400 transition-all group"
        >
          <LogOut className="flex-shrink-0 w-5 h-5 mr-4 text-app-text-muted/40 group-hover:text-rose-500 group-hover:scale-110 transition-all" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-app-bg text-app-text-main overflow-hidden app-tech-grid">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-app-bg/80 backdrop-blur-md md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Desktop y Mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-sidebar-bg md:flex flex-col shadow-2xl transition-transform duration-500 md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-24 bg-app-surface backdrop-blur-2xl border-b border-app-border flex items-center justify-between px-8 md:px-12 z-10 sticky top-0">
          <div className="flex items-center border-l-4 border-app-primary pl-6 ml-2">
            <button
              className="p-3 mr-6 rounded-xl bg-black/30 border border-app-border text-app-text-muted md:hidden hover:text-app-primary transition-all"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Abrir menú de navegación"
              title="Abrir menú"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <div className="app-label opacity-70 mb-1">Panel Operativo</div>
              <h1 className="text-xl font-display font-bold tracking-tight text-app-text-main">
                {headerTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-6 md:space-x-8">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-4 rounded-xl bg-black/30 border border-app-border text-app-text-muted hover:text-app-primary transition-all shadow-xl hover:scale-110 active:scale-95 text-xs font-semibold uppercase"
              title={darkMode ? "LUMEN MODE" : "NOX MODE"}
            >
              {darkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <div className="h-10 w-[1px] bg-app-border" />

            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <div className="text-[11px] font-semibold text-app-text-main uppercase tracking-[0.12em]">
                  {user?.name ?? "Usuario"}
                </div>
                <div className="app-data text-app-text-muted opacity-80">
                  {user?.email ?? "Sin email"}
                </div>
              </div>
              <div className="w-12 h-12 rounded-[14px] bg-black/35 border border-app-border flex items-center justify-center text-app-primary font-display font-bold shadow-xl text-lg">
                {user?.name?.charAt(0).toUpperCase() || "A"}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 md:p-10 lg:p-12 scroll-smooth bg-app-bg">
          <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col animate-in">
            <div className="flex-1">
              <Outlet />
            </div>
            <GlobalFooter />
          </div>
        </main>
      </div>
    </div>
  );
}
