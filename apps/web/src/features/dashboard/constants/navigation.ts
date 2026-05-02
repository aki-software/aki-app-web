import { ChartPie, LayoutDashboard, Settings, Ticket, Users, type LucideIcon } from "lucide-react";
import { APP_ROUTES } from "../../../router/routes.constants";

export interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  adminOnly: boolean;
}

export const DASHBOARD_NAV_ITEMS: NavItem[] = [
  {
    name: "Resumen",
    path: APP_ROUTES.DASHBOARD.ROOT,
    icon: LayoutDashboard,
    adminOnly: false,
  },
  {
    name: "Tests realizados",
    path: `${APP_ROUTES.DASHBOARD.ROOT}/${APP_ROUTES.DASHBOARD.RESULTS}`,
    icon: ChartPie,
    adminOnly: false,
  },
  {
    name: "Vouchers",
    path: `${APP_ROUTES.DASHBOARD.ROOT}/${APP_ROUTES.DASHBOARD.VOUCHERS}`,
    icon: Ticket,
    adminOnly: false,
  },
  {
    name: "Instituciones y terapeutas",
    path: `${APP_ROUTES.DASHBOARD.ROOT}/${APP_ROUTES.DASHBOARD.USERS}`,
    icon: Users,
    adminOnly: true,
  },
  {
    name: "Ajustes",
    path: `${APP_ROUTES.DASHBOARD.ROOT}/${APP_ROUTES.DASHBOARD.SETTINGS}`,
    icon: Settings,
    adminOnly: false,
  },
];

export const HIDDEN_DASHBOARD_ROUTES: Record<string, string> = {
  [`${APP_ROUTES.DASHBOARD.ROOT}/${APP_ROUTES.DASHBOARD.ACTIVITY}`]: "Actividad Operativa",
  // Ejemplo futuro: [`${APP_ROUTES.DASHBOARD.ROOT}/profile`]: "Mi Perfil",
};