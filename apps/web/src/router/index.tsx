import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../features/auth/components/ProtectedRoute";
import { LoginPage } from "../features/auth/views/LoginPage";
import { SetupPasswordPage } from "../features/auth/views/SetupPasswordPage";
import { DashboardLayout } from "../features/dashboard/layouts/DashboardLayout";
import { DashboardActivity } from "../features/dashboard/views/DashboardActivity";
import { DashboardOverview } from "../features/dashboard/views/DashboardOverview";
import { DashboardResults } from "../features/dashboard/views/DashboardResults";
import { DashboardSettings } from "../features/dashboard/views/DashboardSettings";
import { DashboardUsers } from "../features/dashboard/views/DashboardUsers";
import { DashboardVouchers } from "../features/dashboard/views/DashboardVouchers";
import { InstitutionDetailOverview } from "../features/dashboard/views/InstitutionDetailOverview";
import { NotFoundFeature } from "../features/dashboard/views/NotFoundFeature";
import { SessionDetailPage } from "../features/dashboard/views/SessionDetailPage";

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
            path: "sessions/:id",
            element: <SessionDetailPage />,
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
            path: "institutions/:id",
            element: <InstitutionDetailOverview />,
          },
          {
            path: "settings",
            element: <DashboardSettings />,
          },
          {
            path: "activity",
            element: <DashboardActivity />,
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
