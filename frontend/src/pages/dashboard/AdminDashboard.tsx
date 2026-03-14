import { Users, Building2, Target, DollarSign, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";

const stats = [
  { label: "Total Users", value: "0", icon: Users, color: "text-brand-blue" },
  { label: "Active Startups", value: "0", icon: Building2, color: "text-brand-accent" },
  { label: "Active Campaigns", value: "0", icon: Target, color: "text-emerald-600" },
  { label: "Total Invested", value: "$0", icon: DollarSign, color: "text-violet-600" },
];

export function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Admin Dashboard</h1>
        <p className="text-brand-muted mt-1">
          Platform overview and moderation tools.
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
            Pending Approvals
          </h3>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-brand-bg flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-brand-muted" />
            </div>
            <p className="text-sm text-brand-muted">No pending approvals</p>
            <p className="text-xs text-brand-muted/70 mt-1">
              Startup and campaign requests will appear here
            </p>
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-brand-text mb-4">
            Recent Activity
          </h3>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-brand-bg flex items-center justify-center mb-3">
              <Target className="w-5 h-5 text-brand-muted" />
            </div>
            <p className="text-sm text-brand-muted">No activity yet</p>
            <p className="text-xs text-brand-muted/70 mt-1">
              Platform activity will be tracked here
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
