/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { lazy } from "react";
import { APP_ROUTES } from "./routes.constants";
import { ProtectedRoute } from "../features/auth/components/ProtectedRoute";
import { DashboardLayout } from "../features/dashboard/layouts/DashboardLayout";
import { NotFoundFeature } from "../features/dashboard/views/NotFoundFeature";
import { SuspenseWrapper } from "../components/atoms/SuspenseWrapper";
import { AppErrorBoundary } from "../components/errors/AppErrorBoundary"; 
import { useAuth } from "../features/auth/hooks/useAuth";

// Auth Views
const LoginPage = lazy(() => import("../features/auth/views/LoginPage").then(m => ({ default: m.LoginPage })));
const SetupPasswordPage = lazy(() => import("../features/auth/views/SetupPasswordPage").then(m => ({ default: m.SetupPasswordPage })));
const ForgotPasswordPage = lazy(() => import("../features/auth/views/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("../features/auth/views/ResetPasswordPage").then(m => ({ default: m.ResetPasswordPage })));

// Dashboard Views
const DashboardOverview = lazy(() => import("../features/dashboard/views/DashboardOverview").then(m => ({ default: m.DashboardOverview })));
const DashboardResults = lazy(() => import("../features/dashboard/views/DashboardResults").then(m => ({ default: m.DashboardResults })));
const SessionDetailPage = lazy(() => import("../features/dashboard/views/SessionDetailPage").then(m => ({ default: m.SessionDetailPage })));
const DashboardVouchers = lazy(() => import("../features/dashboard/views/DashboardVouchers").then(m => ({ default: m.DashboardVouchers })));
const DashboardUsers = lazy(() => import("../features/dashboard/views/DashboardUsers").then(m => ({ default: m.DashboardUsers })));
const InstitutionDetailOverview = lazy(() => import("../features/dashboard/views/InstitutionDetailOverview").then(m => ({ default: m.InstitutionDetailOverview })));
const DashboardSettings = lazy(() => import("../features/dashboard/views/DashboardSettings").then(m => ({ default: m.DashboardSettings })));
const DashboardActivity = lazy(() => import("../features/dashboard/views/DashboardActivity").then(m => ({ default: m.DashboardActivity })));
const BillingDashboard = lazy(() => import("../features/billing/pages/BillingDashboard").then(m => ({ default: m.BillingDashboard })));
const AdminPricingPlansPage = lazy(() => import("../features/admin/views/AdminPricingPlansPage").then(m => ({ default: m.AdminPricingPlansPage })));

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? APP_ROUTES.DASHBOARD.ROOT : APP_ROUTES.AUTH.LOGIN} replace />;
}

function RoleGuard({ allowedRoles }: { allowedRoles: string[] }) {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase() ?? '';
  const effective = role === 'INSTITUTION_ADMIN' ? 'INSTITUTION' : role;
  if (!allowedRoles.includes(effective)) {
    return <Navigate to={APP_ROUTES.DASHBOARD.ROOT} replace />;
  }
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: APP_ROUTES.ROOT,
    element: <RootRedirect />,
  },
  {
    path: APP_ROUTES.AUTH.LOGIN,
    element: <SuspenseWrapper><LoginPage /></SuspenseWrapper>,
  },
  {
    path: APP_ROUTES.AUTH.SETUP_PASSWORD,
    element: <SuspenseWrapper><SetupPasswordPage /></SuspenseWrapper>,
  },
  {
    path: APP_ROUTES.AUTH.FORGOT_PASSWORD,
    element: <SuspenseWrapper><ForgotPasswordPage /></SuspenseWrapper>,
  },
  {
    path: APP_ROUTES.AUTH.RESET_PASSWORD,
    element: <SuspenseWrapper><ResetPasswordPage /></SuspenseWrapper>,
  },
  {
    element: <ProtectedRoute />,
    errorElement: <AppErrorBoundary />, 
    children: [
      {
        path: APP_ROUTES.DASHBOARD.ROOT,
        element: <DashboardLayout />,
        errorElement: <AppErrorBoundary />,
        children: [
          {
            index: true,
            element: <SuspenseWrapper><DashboardOverview /></SuspenseWrapper>,
          },
          {
            path: APP_ROUTES.DASHBOARD.RESULTS,
            element: <SuspenseWrapper><DashboardResults /></SuspenseWrapper>,
          },
          {
            path: APP_ROUTES.DASHBOARD.SESSIONS,
            element: <SuspenseWrapper><SessionDetailPage /></SuspenseWrapper>,
          },
          {
            path: APP_ROUTES.DASHBOARD.VOUCHERS,
            element: <SuspenseWrapper><DashboardVouchers /></SuspenseWrapper>,
          },
          {
            path: APP_ROUTES.DASHBOARD.USERS,
            element: <SuspenseWrapper><DashboardUsers /></SuspenseWrapper>,
          },
          {
            path: APP_ROUTES.DASHBOARD.INSTITUTIONS,
            element: <SuspenseWrapper><InstitutionDetailOverview /></SuspenseWrapper>,
          },
          {
            path: APP_ROUTES.DASHBOARD.SETTINGS,
            element: <SuspenseWrapper><DashboardSettings /></SuspenseWrapper>,
          },
          {
            path: APP_ROUTES.DASHBOARD.ACTIVITY,
            element: <SuspenseWrapper><DashboardActivity /></SuspenseWrapper>,
          },
          {
            path: APP_ROUTES.DASHBOARD.BILLING,
            element: <SuspenseWrapper><BillingDashboard /></SuspenseWrapper>,
          },
          {
            element: <RoleGuard allowedRoles={['ADMIN']} />,
            children: [
              {
                path: APP_ROUTES.DASHBOARD.PRICING_PLANS,
                element: <SuspenseWrapper><AdminPricingPlansPage /></SuspenseWrapper>,
              },
            ],
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
