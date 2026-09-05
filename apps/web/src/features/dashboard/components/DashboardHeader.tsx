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
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-app-border bg-app-surface px-4 backdrop-blur-2xl sm:h-20 sm:px-6 lg:px-8 xl:h-24 xl:px-12">
      <div className="flex min-w-0 items-center gap-3 border-l-4 border-app-primary pl-3 sm:gap-4 sm:pl-4">
        <button
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-app-border bg-app-surface/80 text-app-text-muted transition-all hover:text-app-primary xl:hidden"
          onClick={onOpenMobileMenu}
          aria-label="Abrir menú"
        >
          <Menu aria-hidden="true" className="h-6 w-6" />
        </button>
        <div className="min-w-0">
          <div className="app-label mb-1 truncate opacity-70">Panel Operativo</div>
          <h1 className="truncate text-lg font-display font-bold tracking-tight text-app-text-main sm:text-xl">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:gap-6">
        <button
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Activar tema claro" : "Activar tema oscuro"}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-app-border bg-app-surface/80 text-app-text-muted shadow-sm transition-all hover:text-app-primary hover:scale-110 active:scale-95"
          title={theme === "dark" ? "LUMEN MODE" : "NOX MODE"}
        >
          {theme === "dark" ? <Sun aria-hidden="true" className="h-4 w-4" /> : <Moon aria-hidden="true" className="h-4 w-4" />}
        </button>

        <div className="hidden h-10 w-px bg-app-border sm:block" />

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden min-w-0 max-w-48 text-right lg:block">
            <div className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-app-text-main">
              {user?.name ?? "Usuario"}
            </div>
            <div className="app-data truncate text-app-text-muted opacity-80">
              {user?.email ?? "Sin email"}
            </div>
          </div>
          <div
            role="img"
            aria-label={`Avatar de ${user?.name ?? "Usuario"}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-app-border bg-app-surface/80 font-display text-lg font-bold text-app-primary shadow-sm"
          >
            {user?.name?.charAt(0).toUpperCase() || "A"}
          </div>
        </div>
      </div>
    </header>
  );
};