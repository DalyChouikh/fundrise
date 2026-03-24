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
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import type { DashboardStatsAdmin, Startup, Campaign, UserProfile } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import { ChartCard } from "@/components/ui/ChartCard";
import { CHART_COLORS, AXIS_STYLE, GRID_STROKE, formatCurrency } from "@/lib/chartUtils";
import type { AdminAnalytics } from "@/types";

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStatsAdmin | null>(null);
  const [pendingStartups, setPendingStartups] = useState<Startup[]>([]);
  const [pendingCampaigns, setPendingCampaigns] = useState<Campaign[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);

  useEffect(() => {
    api.get<AdminAnalytics>("/dashboard/analytics/").then(setAnalytics).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, startups, campaigns, usersData] = await Promise.all([
          api.get<DashboardStatsAdmin>("/dashboard/stats/"),
          api.get<Startup[]>("/startups/"),
          api.get<Campaign[]>("/campaigns/"),
          api.get<UserProfile[]>("/users/?approval_status=pending_approval"),
        ]);
        setStats(statsData);
        setPendingStartups(
          startups.filter((s) => s.status === "pending_approval")
        );
        setPendingCampaigns(
          campaigns.filter((c) => c.status === "pending_approval")
        );
        setPendingUsers(usersData);
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

  const handleApproveUser = async (id: string) => {
    try {
      await api.post(`/users/${id}/approve/`, {});
      setPendingUsers((prev) => prev.filter((u) => u.id !== id));
    } catch {
      // ignore
    }
  };

  const handleRejectUser = async (id: string) => {
    const reason = window.prompt("Reason for rejection:");
    if (!reason) return;
    try {
      await api.post(`/users/${id}/reject/`, { reason });
      setPendingUsers((prev) => prev.filter((u) => u.id !== id));
    } catch {
      // ignore
    }
  };

  const statItems = [
    { label: "Total Users", value: String(stats?.total_users || 0), icon: Users, color: "text-brand-blue", bg: "bg-blue-50" },
    { label: "Active Startups", value: String(stats?.active_startups || 0), icon: Building2, color: "text-brand-accent", bg: "bg-brand-accent/[0.08]" },
    { label: "Active Campaigns", value: String(stats?.active_campaigns || 0), icon: Target, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Invested", value: `$${Number(stats?.total_invested || 0).toLocaleString()}`, icon: DollarSign, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Pending Users", value: String(stats?.pending_users || 0), icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  const totalPending = pendingUsers.length + pendingStartups.length + pendingCampaigns.length;

  const approvalColors: Record<string, string> = {
    approved: CHART_COLORS.emerald,
    pending_approval: CHART_COLORS.amber,
    rejected: CHART_COLORS.rose,
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-text">Admin Dashboard</h1>
        <p className="text-sm text-brand-muted mt-1.5">
          Platform overview and moderation tools.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statItems.map((stat, i) => (
          <Card key={stat.label} style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }} className="animate-slide-up">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] text-brand-muted font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-brand-text mt-1.5 tabular-nums">
                  {stat.value}
                </p>
              </div>
              <div className={`p-2 rounded-xl ${stat.bg}`}>
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
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-base font-semibold text-brand-text">
              Pending Approvals
            </h3>
            {totalPending > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">
                {totalPending}
              </span>
            )}
          </div>

          {totalPending === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-bg flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-brand-muted">All caught up</p>
              <p className="text-xs text-brand-muted/60 mt-1">
                No pending approvals right now
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {pendingUsers.map((user) => (
                <div
                  key={`u-${user.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-brand-border/[0.12] hover:bg-brand-bg/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={user.avatar_url || undefined}
                      name={user.full_name}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand-text truncate">
                        {user.full_name}
                      </p>
                      <p className="text-xs text-brand-muted truncate">
                        {user.role} &middot; {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleApproveUser(user.id)}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                      title="Approve"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleRejectUser(user.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Reject"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}

              {pendingStartups.map((startup) => (
                <div
                  key={`s-${startup.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-brand-border/[0.12] hover:bg-brand-bg/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-brand-accent/[0.08] flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-brand-accent" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/startups/${startup.id}`}
                        className="text-sm font-medium text-brand-text hover:text-brand-accent truncate block transition-colors"
                      >
                        {startup.name}
                      </Link>
                      <p className="text-xs text-brand-muted">Startup</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleApproveStartup(startup.id)}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                      title="Approve"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleRejectStartup(startup.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Reject"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}

              {pendingCampaigns.map((campaign) => (
                <div
                  key={`c-${campaign.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-brand-border/[0.12] hover:bg-brand-bg/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <Target className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="text-sm font-medium text-brand-text hover:text-brand-accent truncate block transition-colors"
                      >
                        {campaign.title}
                      </Link>
                      <p className="text-xs text-brand-muted">
                        Campaign &middot; {campaign.startup_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleApproveCampaign(campaign.id)}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                      title="Approve"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleRejectCampaign(campaign.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Reject"
                    >
                      <XCircle className="w-5 h-5" />
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
              { label: "Manage Users", desc: "View and edit user accounts", to: "/users", icon: Users },
              { label: "All Startups", desc: "Review and moderate startups", to: "/startups", icon: Building2 },
              { label: "All Campaigns", desc: "Review and moderate campaigns", to: "/campaigns", icon: Target },
              { label: "All Investments", desc: "View platform investments", to: "/investments", icon: DollarSign },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group flex items-center justify-between p-3.5 rounded-xl border border-brand-border/[0.15] hover:border-brand-border/30 hover:bg-brand-bg/40 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-bg group-hover:bg-white transition-colors">
                    <item.icon className="w-4 h-4 text-brand-muted group-hover:text-brand-text transition-colors" />
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
                <ArrowRight className="w-4 h-4 text-brand-muted group-hover:text-brand-text group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Analytics Charts */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="User Registrations">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.user_registrations}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="month" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip formatter={(value: any) => `${value} users`} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={CHART_COLORS.blue}
                  fill={CHART_COLORS.blue}
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Platform Growth">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.platform_growth}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="month" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="users" stroke={CHART_COLORS.blue} fill={CHART_COLORS.blue} fillOpacity={0.1} />
                <Area type="monotone" dataKey="startups" stroke={CHART_COLORS.accent} fill={CHART_COLORS.accent} fillOpacity={0.1} />
                <Area type="monotone" dataKey="campaigns" stroke={CHART_COLORS.emerald} fill={CHART_COLORS.emerald} fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Approval Funnel">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.approval_funnel}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="status" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip formatter={(value: any) => `${value} users`} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {analytics.approval_funnel.map((entry, i) => (
                    <Cell key={i} fill={approvalColors[entry.status] || CHART_COLORS.blue} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Investment Volume">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.investment_volume}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="month" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Bar dataKey="amount" fill={CHART_COLORS.violet} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}
