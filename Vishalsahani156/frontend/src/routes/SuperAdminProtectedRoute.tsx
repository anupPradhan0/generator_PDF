import { Navigate, Outlet } from 'react-router-dom';
import { Loader } from '../components/common/Loader';
import { useSuperAdminAuth } from '../context/SuperAdminAuthContext';

export const SuperAdminProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useSuperAdminAuth();

  if (isLoading) return <Loader fullScreen />;
  if (!isAuthenticated) return <Navigate to="/super-admin/login" replace />;
  return <Outlet />;
};

