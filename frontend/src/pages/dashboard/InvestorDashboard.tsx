import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Wallet, TrendingUp, Heart, DollarSign, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import type { DashboardStatsInvestor, Campaign, Investment } from "@/types";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { ChartCard } from "@/components/ui/ChartCard";
import {
  CHART_COLORS, CHART_COLORS_ARRAY, AXIS_STYLE, GRID_STROKE, formatCurrency,
} from "@/lib/chartUtils";
import type { InvestorAnalytics } from "@/types";

export function InvestorDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStatsInvestor | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [analytics, setAnalytics] = useState<InvestorAnalytics | null>(null);

  useEffect(() => {
    api.get<InvestorAnalytics>("/dashboard/analytics/").then(setAnalytics).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, c, inv] = await Promise.all([
          api.get<DashboardStatsInvestor>("/dashboard/stats/"),
          api.get<Campaign[]>("/campaigns/"),
          api.get<Investment[]>("/investments/"),
        ]);
        setStats(s);
        setCampaigns(c.filter((x) => x.status === "active").slice(0, 3));
        setInvestments(inv.slice(0, 5));
      } catch {
        // ignore
      }
    };
    fetchData();
  }, []);

  const statItems = [
    {
      label: "Total Invested",
      value: `$${Number(stats?.total_invested || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Active Investments",
      value: String(stats?.active_investments || 0),
      icon: TrendingUp,
      color: "text-brand-blue",
      bg: "bg-blue-50",
    },
    {
      label: "Following",
      value: String(stats?.following_count || 0),
      icon: Heart,
      color: "text-rose-500",
      bg: "bg-rose-50",
    },
    {
      label: "Portfolio Value",
      value: `$${Number(stats?.portfolio_value || 0).toLocaleString()}`,
      icon: Wallet,
      color: "text-brand-accent",
      bg: "bg-brand-accent/[0.08]",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-text">
          Welcome back, {profile?.full_name?.split(" ")[0] || "Investor"}
        </h1>
        <p className="text-sm text-brand-muted mt-1.5">
          Discover and invest in promising startups.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((stat, i) => (
          <Card key={stat.label} style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }} className="animate-slide-up">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] text-brand-muted font-medium">{stat.label}</p>
                <p className="text-2xl sm:text-3xl font-bold text-brand-text mt-1.5 tabular-nums">
                  {stat.value}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${stat.bg}`}>
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
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-bg flex items-center justify-center mb-3">
                <TrendingUp className="w-6 h-6 text-brand-muted" />
              </div>
              <p className="text-sm font-medium text-brand-muted">No active campaigns</p>
              <p className="text-xs text-brand-muted/60 mt-1">
                Campaigns will appear here once approved
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <Link
                  key={c.id}
                  to={`/campaigns/${c.id}`}
                  className="block p-4 rounded-xl border border-brand-border/[0.12] hover:border-brand-border/25 hover:bg-brand-bg/30 transition-all"
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    {c.startup_logo_url ? (
                      <img
                        src={c.startup_logo_url}
                        alt={c.startup_name}
                        className="w-9 h-9 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-brand-accent/[0.08] flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-brand-accent" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-brand-text truncate">
                        {c.title}
                      </h4>
                      <span className="text-xs text-brand-muted">
                        {c.startup_name}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-brand-bg overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-accent to-brand-accent/70 transition-all"
                      style={{
                        width: `${Math.min(c.funding_percentage, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-brand-muted">
                    <span className="font-medium">${Number(c.current_funding).toLocaleString()} raised</span>
                    <span className="tabular-nums">{c.funding_percentage}%</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-brand-text mb-4">
            Recent Investments
          </h3>
          {investments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-bg flex items-center justify-center mb-3">
                <Wallet className="w-6 h-6 text-brand-muted" />
              </div>
              <p className="text-sm font-medium text-brand-muted">No investments yet</p>
              <p className="text-xs text-brand-muted/60 mt-1">
                Your investment portfolio will be shown here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {investments.map((inv) => (
                <Link
                  key={inv.id}
                  to={`/campaigns/${inv.campaign_detail.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-brand-border/[0.12] hover:border-brand-border/25 hover:bg-brand-bg/30 transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-text truncate">
                      {inv.campaign_detail.title}
                    </p>
                    <p className="text-xs text-brand-muted">
                      {inv.campaign_detail.startup_name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm font-bold text-brand-text tabular-nums">
                      ${Number(inv.amount).toLocaleString()}
                    </p>
                    <p
                      className={`text-xs font-semibold ${
                        inv.status === "confirmed"
                          ? "text-emerald-600"
                          : inv.status === "pending"
                          ? "text-amber-600"
                          : "text-red-500"
                      }`}
                    >
                      {inv.status}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Analytics Charts */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Portfolio Allocation">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.portfolio_allocation}
                  dataKey="amount"
                  nameKey="startup_name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  label={({ startup_name }) => startup_name}
                >
                  {analytics.portfolio_allocation.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS_ARRAY[i % CHART_COLORS_ARRAY.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Investment History">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.investment_history}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="month" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke={CHART_COLORS.emerald}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.emerald, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Portfolio Performance">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.portfolio_performance}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="campaign_title" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Bar dataKey="invested" fill={CHART_COLORS.blue} radius={[6, 6, 0, 0]} />
                <Bar dataKey="current_value" fill={CHART_COLORS.emerald} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}
