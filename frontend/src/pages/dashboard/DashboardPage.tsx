import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { FounderDashboard } from "./FounderDashboard";
import { InvestorDashboard } from "./InvestorDashboard";
import { AdminDashboard } from "./AdminDashboard";

export function DashboardPage() {
  const { profile } = useAuth();

  if (!profile) return <LoadingSpinner fullscreen />;

  switch (profile.role) {
    case "investor":
      return <InvestorDashboard />;
    case "admin":
      return <AdminDashboard />;
    default:
      return <FounderDashboard />;
  }
}
