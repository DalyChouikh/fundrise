import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Building2,
  Target,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import type { DashboardStatsAdmin, Startup, Campaign } from "@/types";

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStatsAdmin | null>(null);
  const [pendingStartups, setPendingStartups] = useState<Startup[]>([]);
  const [pendingCampaigns, setPendingCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, startups, campaigns] = await Promise.all([
          api.get<DashboardStatsAdmin>("/dashboard/stats/"),
          api.get<Startup[]>("/startups/"),
          api.get<Campaign[]>("/campaigns/"),
        ]);
        setStats(statsData);
        setPendingStartups(
          startups.filter((s) => s.status === "pending_approval")
        );
        setPendingCampaigns(
          campaigns.filter((c) => c.status === "pending_approval")
        );
      } catch {
        // ignore
      }
    };
    fetchData();
  }, []);

  const handleApproveStartup = async (id: number) => {
    try {
      await api.post(`/startups/${id}/approve/`, {});
      setPendingStartups((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // ignore
    }
  };

  const handleRejectStartup = async (id: number) => {
    try {
      await api.post(`/startups/${id}/reject/`, {});
      setPendingStartups((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // ignore
    }
  };

  const handleApproveCampaign = async (id: number) => {
    try {
      await api.post(`/campaigns/${id}/approve/`, {});
      setPendingCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // ignore
    }
  };

  const handleRejectCampaign = async (id: number) => {
    try {
      await api.post(`/campaigns/${id}/reject/`, {});
      setPendingCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // ignore
    }
  };

  const statItems = [
    {
      label: "Total Users",
      value: String(stats?.total_users || 0),
      icon: Users,
      color: "text-brand-blue",
    },
    {
      label: "Active Startups",
      value: String(stats?.active_startups || 0),
      icon: Building2,
      color: "text-brand-accent",
    },
    {
      label: "Active Campaigns",
      value: String(stats?.active_campaigns || 0),
      icon: Target,
      color: "text-emerald-600",
    },
    {
      label: "Total Invested",
      value: `$${Number(stats?.total_invested || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-violet-600",
    },
  ];

  const totalPending = pendingStartups.length + pendingCampaigns.length;

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
        {/* Pending Approvals */}
        <Card>
          <h3 className="text-base font-semibold text-brand-text mb-4">
            Pending Approvals
            {totalPending > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                {totalPending}
              </span>
            )}
          </h3>

          {totalPending === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-brand-bg flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-brand-muted" />
              </div>
              <p className="text-sm text-brand-muted">No pending approvals</p>
              <p className="text-xs text-brand-muted/70 mt-1">
                Startup and campaign requests will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {pendingStartups.map((startup) => (
                <div
                  key={`s-${startup.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-brand-border/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-brand-accent" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/startups/${startup.id}`}
                        className="text-sm font-medium text-brand-text hover:text-brand-accent truncate block"
                      >
                        {startup.name}
                      </Link>
                      <p className="text-xs text-brand-muted">Startup</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleApproveStartup(startup.id)}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title="Approve"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRejectStartup(startup.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      title="Reject"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {pendingCampaigns.map((campaign) => (
                <div
                  key={`c-${campaign.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-brand-border/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <Target className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="text-sm font-medium text-brand-text hover:text-brand-accent truncate block"
                      >
                        {campaign.title}
                      </Link>
                      <p className="text-xs text-brand-muted">
                        Campaign &middot; {campaign.startup_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleApproveCampaign(campaign.id)}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title="Approve"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRejectCampaign(campaign.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      title="Reject"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Links */}
        <Card>
          <h3 className="text-base font-semibold text-brand-text mb-4">
            Management
          </h3>
          <div className="space-y-2">
            {[
              {
                label: "Manage Users",
                desc: "View and edit user accounts",
                to: "/users",
                icon: Users,
              },
              {
                label: "All Startups",
                desc: "Review and moderate startups",
                to: "/startups",
                icon: Building2,
              },
              {
                label: "All Campaigns",
                desc: "Review and moderate campaigns",
                to: "/campaigns",
                icon: Target,
              },
              {
                label: "All Investments",
                desc: "View platform investments",
                to: "/investments",
                icon: DollarSign,
              },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center justify-between p-3.5 rounded-xl border border-brand-border/40 hover:border-brand-border hover:bg-brand-bg/50 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-bg">
                    <item.icon className="w-4 h-4 text-brand-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-text">
                      {item.label}
                    </p>
                    <p className="text-xs text-brand-muted mt-0.5">
                      {item.desc}
                    </p>
                  </div>
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
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
