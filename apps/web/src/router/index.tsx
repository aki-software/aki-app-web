import { createBrowserRouter, Navigate } from "react-router-dom";
import { DashboardLayout } from "../features/dashboard/layouts/DashboardLayout";
import { DashboardOverview } from "../features/dashboard/views/DashboardOverview";
import { DashboardResults } from "../features/dashboard/views/DashboardResults";
import { DashboardVouchers } from "../features/dashboard/views/DashboardVouchers";
import { DashboardUsers } from "../features/dashboard/views/DashboardUsers";
import { DashboardSettings } from "../features/dashboard/views/DashboardSettings";
import { NotFoundFeature } from "../features/dashboard/views/NotFoundFeature";
import { LoginPage } from "../features/auth/views/LoginPage";
import { SetupPasswordPage } from "../features/auth/views/SetupPasswordPage";
import { ProtectedRoute } from "../features/auth/components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    /* Ruta raíz: redirigir al dashboard (ProtectedRoute se encargará del guard) */
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/setup-password",
    element: <SetupPasswordPage />,
  },
  {
    /* Rutas protegidas: solo accesibles si el usuario está autenticado */
    element: <ProtectedRoute />,
    errorElement: <NotFoundFeature />,
    children: [
      {
        path: "/dashboard",
        element: <DashboardLayout />,
        errorElement: <NotFoundFeature />,
        children: [
          {
            index: true,
            element: <DashboardOverview />,
          },
          {
            path: "results",
            element: <DashboardResults />,
          },
          {
            path: "vouchers",
            element: <DashboardVouchers />,
          },
          {
            path: "users",
            element: <DashboardUsers />,
          },
          {
            path: "settings",
            element: <DashboardSettings />,
          },
          {
            path: "*",
            element: <NotFoundFeature />,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundFeature />,
  },
]);
