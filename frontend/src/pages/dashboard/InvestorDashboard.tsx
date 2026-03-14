import { Wallet, TrendingUp, Heart, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/Card";

const stats = [
  { label: "Total Invested", value: "$0", icon: DollarSign, color: "text-emerald-600" },
  { label: "Active Investments", value: "0", icon: TrendingUp, color: "text-brand-blue" },
  { label: "Following", value: "0", icon: Heart, color: "text-rose-500" },
  { label: "Portfolio Value", value: "$0", icon: Wallet, color: "text-brand-accent" },
];

export function InvestorDashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-brand-text">
          Welcome back, {profile?.full_name?.split(" ")[0] || "Investor"}
        </h1>
        <p className="text-brand-muted mt-1">
          Discover and invest in promising startups.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} hover>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-brand-muted">{stat.label}</p>
                <p className="text-2xl font-bold text-brand-text mt-1">
                  {stat.value}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-bg">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-base font-semibold text-brand-text mb-4">
            Featured Campaigns
          </h3>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-brand-bg flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-brand-muted" />
            </div>
            <p className="text-sm text-brand-muted">No active campaigns</p>
            <p className="text-xs text-brand-muted/70 mt-1">
              Campaigns will appear here once approved
            </p>
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-brand-text mb-4">
            Portfolio Summary
          </h3>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-brand-bg flex items-center justify-center mb-3">
              <Wallet className="w-5 h-5 text-brand-muted" />
            </div>
            <p className="text-sm text-brand-muted">No investments yet</p>
            <p className="text-xs text-brand-muted/70 mt-1">
              Your investment portfolio will be shown here
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
