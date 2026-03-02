import { createBrowserRouter } from "react-router-dom";
import { DashboardLayout } from "../features/dashboard/layouts/DashboardLayout";
import { DashboardOverview } from "../features/dashboard/views/DashboardOverview";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <div className="p-10"><h1>A.kit Test - (Página Principal/Test UI)</h1></div>,
  },
  {
    path: "/dashboard",
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <DashboardOverview />,
      },
    ],
  },
]);
