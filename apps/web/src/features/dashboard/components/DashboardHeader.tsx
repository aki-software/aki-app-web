import { Menu, Moon, Sun } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";

interface DashboardHeaderProps {
  title: string;
  onOpenMobileMenu: () => void;
}

export const DashboardHeader = ({ title, onOpenMobileMenu }: DashboardHeaderProps) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-24 bg-app-surface backdrop-blur-2xl border-b border-app-border flex items-center justify-between px-8 md:px-12 z-10 sticky top-0">
      <div className="flex items-center border-l-4 border-app-primary pl-6 ml-2">
        <button
          className="p-3 mr-6 rounded-xl bg-app-surface/80 border border-app-border text-app-text-muted md:hidden hover:text-app-primary transition-all"
          onClick={onOpenMobileMenu}
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex flex-col">
          <div className="app-label opacity-70 mb-1">Panel Operativo</div>
          <h1 className="text-xl font-display font-bold tracking-tight text-app-text-main">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-6 md:space-x-8">
        <button
          onClick={toggleTheme}
          className="p-4 rounded-xl bg-app-surface/80 border border-app-border text-app-text-muted hover:text-app-primary transition-all shadow-sm hover:scale-110 active:scale-95 text-xs font-semibold uppercase"
          title={theme === "dark" ? "LUMEN MODE" : "NOX MODE"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
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
          <div className="w-12 h-12 rounded-[14px] bg-app-surface/80 border border-app-border flex items-center justify-center text-app-primary font-display font-bold shadow-sm text-lg">
            {user?.name?.charAt(0).toUpperCase() || "A"}
          </div>
        </div>
      </div>
    </header>
  );
};