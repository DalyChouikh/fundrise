import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export function ProtectedRoute() {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner fullscreen />;
  if (!session)
    return <Navigate to="/login" state={{ from: location }} replace />;

  if (
    profile &&
    !profile.role_selected &&
    location.pathname !== "/onboarding/role"
  ) {
    return <Navigate to="/onboarding/role" replace />;
  }

  return <Outlet />;
}
