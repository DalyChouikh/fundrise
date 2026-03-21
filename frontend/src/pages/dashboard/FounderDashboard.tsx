import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Target, DollarSign, Users, Heart, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { DashboardStatsFounder, Investment, Campaign } from "@/types";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { ChartCard } from "@/components/ui/ChartCard";
import { CHART_COLORS, AXIS_STYLE, GRID_STROKE, formatCurrency } from "@/lib/chartUtils";
import type { FounderAnalytics } from "@/types";

export function FounderDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStatsFounder | null>(null);
  const [recentInvestments, setRecentInvestments] = useState<Investment[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [analytics, setAnalytics] = useState<FounderAnalytics | null>(null);

  useEffect(() => {
    api.get<FounderAnalytics>("/dashboard/analytics/").then(setAnalytics).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, investments, campaigns] = await Promise.all([
          api.get<DashboardStatsFounder>("/dashboard/stats/"),
          api.get<Investment[]>("/investments/"),
          api.get<Campaign[]>("/campaigns/"),
        ]);
        setStats(statsData);
        setRecentInvestments(investments.slice(0, 5));
        setRecentCampaigns(campaigns.slice(0, 3));
      } catch {
        // ignore
      }
    };
    fetchData();
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

  const hasActivity = recentInvestments.length > 0 || recentCampaigns.length > 0;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold text-brand-text">
          Welcome back, {profile?.full_name?.split(" ")[0] || "Founder"}
        </h1>
        <p className="text-base text-brand-muted mt-1">
          Here&apos;s what&apos;s happening with your startups.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statItems.map((stat) => (
          <Card key={stat.label} hover>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-brand-muted">{stat.label}</p>
                <p className="text-3xl font-bold text-brand-text mt-1">
                  {stat.value}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-brand-bg">
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <h3 className="text-lg font-semibold text-brand-text mb-4">
            Recent Activity
          </h3>

          {!hasActivity ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-14 h-14 rounded-xl bg-brand-bg flex items-center justify-center mb-3">
                <Target className="w-6 h-6 text-brand-muted" />
              </div>
              <p className="text-sm text-brand-muted">No activity yet</p>
              <p className="text-xs text-brand-muted/70 mt-1">
                Create your first startup to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCampaigns.map((campaign) => (
                <Link
                  key={`c-${campaign.id}`}
                  to={`/campaigns/${campaign.id}`}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-brand-border/30 hover:bg-brand-bg/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-brand-accent/10 flex-shrink-0">
                      <Target className="w-4 h-4 text-brand-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand-text truncate">
                        {campaign.title}
                      </p>
                      <p className="text-xs text-brand-muted">
                        {campaign.funding_percentage}% funded
                      </p>
                    </div>
                  </div>
                  <Badge status={campaign.status} />
                </Link>
              ))}

              {recentInvestments.map((inv) => (
                <div
                  key={`i-${inv.id}`}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-brand-border/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-emerald-50 flex-shrink-0">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand-text truncate">
                        {inv.investor_name} invested ${Number(inv.amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-brand-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(inv.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge status={inv.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card>
          <h3 className="text-lg font-semibold text-brand-text mb-4">
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

      {/* Analytics Charts */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Funding Over Time">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.funding_over_time}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="month" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke={CHART_COLORS.accent}
                  fill={CHART_COLORS.accent}
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Investment Activity">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.investments_per_period}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="month" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip formatter={(value: any) => `${value} investments`} />
                <Bar dataKey="count" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Campaign Comparison">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.campaign_comparison} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis type="number" {...AXIS_STYLE} />
                <YAxis dataKey="title" type="category" {...AXIS_STYLE} width={100} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Bar dataKey="goal" fill="#E5E5E0" radius={[0, 4, 4, 0]} />
                <Bar dataKey="raised" fill={CHART_COLORS.accent} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Follower Growth">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.follower_growth}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="month" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip formatter={(value: any) => `${value} followers`} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={CHART_COLORS.rose}
                  dot={{ fill: CHART_COLORS.rose, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}
