import { createBrowserRouter } from "react-router-dom";
import { DashboardLayout } from "../features/dashboard/layouts/DashboardLayout";
import { DashboardOverview } from "../features/dashboard/views/DashboardOverview";
import { DashboardResults } from "../features/dashboard/views/DashboardResults";
import { DashboardUsers } from "../features/dashboard/views/DashboardUsers";
import { DashboardSettings } from "../features/dashboard/views/DashboardSettings";
import { NotFoundFeature } from "../features/dashboard/views/NotFoundFeature";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <div className="p-10"><h1>A.kit Test - (Página Principal/Test UI)</h1></div>,
    errorElement: <NotFoundFeature />, /* Fallback global por si se falla en raíz */
  },
  {
    path: "/dashboard",
    element: <DashboardLayout />,
    errorElement: <NotFoundFeature />, /* Fallback local con layout 404 opcional, acá lo pisamos por toda la app */
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
        path: "users",
        element: <DashboardUsers />,
      },
      {
        path: "settings",
        element: <DashboardSettings />,
      },
      {
        path: "*",
        element: <NotFoundFeature />
      }
    ],
  },
]);
