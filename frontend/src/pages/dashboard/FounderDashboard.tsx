import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Target, DollarSign, Users, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import type { DashboardStatsFounder } from "@/types";

export function FounderDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStatsFounder | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.get<DashboardStatsFounder>("/dashboard/stats/");
        setStats(data);
      } catch {
        // ignore
      }
    };
    fetchStats();
  }, []);

  const statItems = [
    {
      label: "Active Campaigns",
      value: String(stats?.active_campaigns || 0),
      icon: Target,
      color: "text-brand-accent",
    },
    {
      label: "Total Raised",
      value: `$${Number(stats?.total_raised || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-600",
    },
    {
      label: "Team Members",
      value: String(stats?.team_members || 0),
      icon: Users,
      color: "text-brand-blue",
    },
    {
      label: "Followers",
      value: String(stats?.followers || 0),
      icon: Heart,
      color: "text-rose-500",
    },
  ];

  const quickActions = [
    {
      label: "Create a startup",
      desc: "Set up your startup profile",
      onClick: () => navigate("/startups?action=create"),
    },
    {
      label: "Launch a campaign",
      desc: "Start raising funds",
      onClick: () => navigate("/campaigns?action=create"),
    },
    {
      label: "Invite team members",
      desc: "Collaborate with your team",
      onClick: () => navigate("/startups"),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-brand-text">
          Welcome back, {profile?.full_name?.split(" ")[0] || "Founder"}
        </h1>
        <p className="text-brand-muted mt-1">
          Here&apos;s what&apos;s happening with your startups.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((stat) => (
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
            Recent Activity
          </h3>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-brand-bg flex items-center justify-center mb-3">
              <Target className="w-5 h-5 text-brand-muted" />
            </div>
            <p className="text-sm text-brand-muted">No activity yet</p>
            <p className="text-xs text-brand-muted/70 mt-1">
              Create your first startup to get started
            </p>
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-brand-text mb-4">
            Quick Actions
          </h3>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-brand-border/40 hover:border-brand-border hover:bg-brand-bg/50 transition-all duration-200 text-left"
              >
                <div>
                  <p className="text-sm font-medium text-brand-text">
                    {action.label}
                  </p>
                  <p className="text-xs text-brand-muted mt-0.5">
                    {action.desc}
                  </p>
                </div>
                <svg
                  className="w-4 h-4 text-brand-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
