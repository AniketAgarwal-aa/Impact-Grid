/**
 * ImpactSensei v5.0 - Protected Route
 * Supports roles: admin | project_manager | client
 */
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({ children, requiredRoles }: Props) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(user.role)) {
      // Redirect to appropriate home based on role
      const home =
        user.role === "admin"
          ? "/admin/dashboard"
          : user.role === "project_manager"
            ? "/pm/dashboard"
            : "/dashboard";
      return <Navigate to={home} replace />;
    }
  }

  return <>{children}</>;
}
