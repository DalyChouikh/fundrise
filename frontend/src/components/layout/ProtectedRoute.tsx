import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner fullscreen />;
  if (!session)
    return <Navigate to="/login" state={{ from: location }} replace />;

  return <Outlet />;
}
