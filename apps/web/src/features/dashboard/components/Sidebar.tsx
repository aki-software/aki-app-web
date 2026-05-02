import { LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { DASHBOARD_NAV_ITEMS } from "../constants/navigation";
import { APP_ROUTES } from "../../../router/routes.constants";

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar = ({ onCloseMobile }: SidebarProps) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";
  const visibleNavItems = DASHBOARD_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const handleLogout = async () => {
    await logout();
    navigate(APP_ROUTES.AUTH.LOGIN, { replace: true });
  };

  return (
    <div className="flex flex-col h-full bg-sidebar-bg text-sidebar-text border-r border-sidebar-border backdrop-blur-xl overflow-hidden">
      <div className="px-7 py-10 border-b border-sidebar-border flex flex-col gap-2">
        <div className="flex items-center gap-4 mb-3 rounded-2xl border border-app-border/70 bg-app-surface/80 px-4 py-4 shadow-sm">
          <div className="flex flex-col">
            <span className="text-[2.15rem] font-display font-bold text-app-text-main tracking-tight leading-none whitespace-nowrap">
              ORIENT A.KI
            </span>
            <span className="app-label !text-[10px] opacity-80 mt-2">
              Consola Operativa
            </span>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-app-surface/70 border border-app-border inline-flex items-center gap-2 max-w-fit">
          <div className="h-1.5 w-1.5 rounded-full bg-app-primary animate-pulse" />
          <span className="text-[9px] font-semibold text-app-text-muted uppercase tracking-[0.14em]">
            Vocational Diagnostics
          </span>
        </div>
      </div>

      <div className="flex-1 px-4 py-8 overflow-y-auto">
        <nav className="space-y-2">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== APP_ROUTES.DASHBOARD.ROOT && location.pathname.startsWith(item.path));
            const displayName = item.name === "Ajustes" ? (isAdmin ? "Material teórico (CMS)" : "Cuenta operativa") : item.name;

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={onCloseMobile}
                className={`flex items-center px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] rounded-2xl transition-all duration-300 group ${
                  isActive
                    ? "bg-sidebar-active-bg text-sidebar-active-text border border-app-primary/40 shadow-sm"
                    : "text-app-text-muted hover:bg-sidebar-hover hover:text-app-primary"
                }`}
              >
                <item.icon
                  className={`flex-shrink-0 w-5 h-5 mr-4 transition-all ${
                    isActive ? "text-app-primary scale-110" : "text-app-text-muted/40 group-hover:text-app-primary group-hover:scale-110"
                  }`}
                />
                <span className="transition-transform group-hover:translate-x-1">
                  {displayName}
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
};