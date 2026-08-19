import { ChartPie, LayoutDashboard, Settings, Ticket, Users, CreditCard, Tags, type LucideIcon } from "lucide-react";
import { APP_ROUTES } from "../../../router/routes.constants";

export interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  roles: Array<'ADMIN' | 'THERAPIST' | 'INSTITUTION'>;
}

export const DASHBOARD_NAV_ITEMS: NavItem[] = [
  {
    name: "Resumen",
    path: APP_ROUTES.DASHBOARD.ROOT,
    icon: LayoutDashboard,
    roles: ['ADMIN', 'THERAPIST', 'INSTITUTION'],
  },
  {
    name: "Tests realizados",
    path: `${APP_ROUTES.DASHBOARD.ROOT}/${APP_ROUTES.DASHBOARD.RESULTS}`,
    icon: ChartPie,
    roles: ['ADMIN', 'THERAPIST', 'INSTITUTION'],
  },
  {
    name: "Vouchers",
    path: `${APP_ROUTES.DASHBOARD.ROOT}/${APP_ROUTES.DASHBOARD.VOUCHERS}`,
    icon: Ticket,
    roles: ['ADMIN', 'INSTITUTION', 'THERAPIST'],
  },
  {
    name: "Instituciones y terapeutas",
    path: `${APP_ROUTES.DASHBOARD.ROOT}/${APP_ROUTES.DASHBOARD.USERS}`,
    icon: Users,
    roles: ['ADMIN'],
  },
  {
    name: "Saldo y Vouchers",
    path: `${APP_ROUTES.DASHBOARD.ROOT}/${APP_ROUTES.DASHBOARD.BILLING}`,
    icon: CreditCard,
    roles: ['INSTITUTION'],
  },
  {
    name: "Planes de Vouchers",
    path: `${APP_ROUTES.DASHBOARD.ROOT}/${APP_ROUTES.DASHBOARD.PRICING_PLANS}`,
    icon: Tags,
    roles: ['ADMIN'],
  },
  {
    name: "Ajustes",
    path: `${APP_ROUTES.DASHBOARD.ROOT}/${APP_ROUTES.DASHBOARD.SETTINGS}`,
    icon: Settings,
    roles: ['ADMIN', 'THERAPIST', 'INSTITUTION'],
  },
];

export const HIDDEN_DASHBOARD_ROUTES: Record<string, string> = {
  [`${APP_ROUTES.DASHBOARD.ROOT}/${APP_ROUTES.DASHBOARD.ACTIVITY}`]: "Actividad Operativa",
  // Ejemplo futuro: [`${APP_ROUTES.DASHBOARD.ROOT}/profile`]: "Mi Perfil",
};