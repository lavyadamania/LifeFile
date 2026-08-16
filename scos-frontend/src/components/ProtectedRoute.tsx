import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

interface ProtectedRouteProps {
  allowedRoles?: ('patient' | 'doctor' | 'admin')[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, role } = useAuthStore();
  const location = useLocation();

  // 1. Check if user is authenticated
  if (!isAuthenticated()) {
    // Redirect to login, save the attempted URL to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Check if user has required role
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Authenticated but unauthorized for this specific route
    return <Navigate to="/unauthorized" replace />;
  }

  // 3. Authorized -> render child routes via Outlet
  return <Outlet />;
}
