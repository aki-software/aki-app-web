import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../../../components/atoms/Spinner';
import { APP_ROUTES } from '../../../router/routes.constants';


export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
    <div className="flex h-screen w-full items-center justify-center bg-app-bg text-app-text-main">
        <Spinner size="lg" className='border-blue-600' />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={APP_ROUTES.AUTH.LOGIN} state={{ from: location }} replace />;
  }

  return <Outlet />;
}
