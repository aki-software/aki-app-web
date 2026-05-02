import { useLocation } from "react-router-dom";
import { DASHBOARD_NAV_ITEMS, HIDDEN_DASHBOARD_ROUTES } from "../constants/navigation";
import { APP_ROUTES } from "../../../router/routes.constants";

export const useDashboardTitle = () => {
  const location = useLocation();
  const hiddenRouteKey = Object.keys(HIDDEN_DASHBOARD_ROUTES).find((path) =>
    location.pathname.startsWith(path)
  );
  
  if (hiddenRouteKey) {
    return HIDDEN_DASHBOARD_ROUTES[hiddenRouteKey];
  }

  const currentNavItem = DASHBOARD_NAV_ITEMS.find((item) =>
    location.pathname === item.path ||
    (item.path !== APP_ROUTES.DASHBOARD.ROOT && location.pathname.startsWith(item.path))
  );

  return currentNavItem?.name ?? "Dashboard";
};