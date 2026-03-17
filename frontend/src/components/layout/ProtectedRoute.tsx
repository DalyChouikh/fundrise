import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export function ProtectedRoute() {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner fullscreen />;
  if (!session)
    return <Navigate to="/login" state={{ from: location }} replace />;

  // If user has a pending invite token, redirect there instead of role selection
  if (profile && !profile.role_selected) {
    const pendingInvite = localStorage.getItem("pendingInviteToken");
    if (pendingInvite) {
      return <Navigate to={`/invite/${pendingInvite}`} replace />;
    }
    if (location.pathname !== "/onboarding/role") {
      return <Navigate to="/onboarding/role" replace />;
    }
  }

  // Clean up stale invite token once role is selected
  if (profile?.role_selected) {
    localStorage.removeItem("pendingInviteToken");
  }

  return <Outlet />;
}
