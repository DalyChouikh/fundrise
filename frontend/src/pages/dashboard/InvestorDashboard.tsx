import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Wallet, TrendingUp, Heart, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import type { DashboardStatsInvestor, Campaign, Investment } from "@/types";

export function InvestorDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStatsInvestor | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);

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
    },
    {
      label: "Active Investments",
      value: String(stats?.active_investments || 0),
      icon: TrendingUp,
      color: "text-brand-blue",
    },
    {
      label: "Following",
      value: String(stats?.following_count || 0),
      icon: Heart,
      color: "text-rose-500",
    },
    {
      label: "Portfolio Value",
      value: `$${Number(stats?.portfolio_value || 0).toLocaleString()}`,
      icon: Wallet,
      color: "text-brand-accent",
    },
  ];

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
            Featured Campaigns
          </h3>
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-brand-bg flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5 text-brand-muted" />
              </div>
              <p className="text-sm text-brand-muted">No active campaigns</p>
              <p className="text-xs text-brand-muted/70 mt-1">
                Campaigns will appear here once approved
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <Link
                  key={c.id}
                  to={`/campaigns/${c.id}`}
                  className="block p-4 rounded-xl border border-brand-border/30 hover:border-brand-border hover:bg-brand-bg/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-brand-text">
                      {c.title}
                    </h4>
                    <span className="text-xs text-brand-muted">
                      {c.startup_name}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-brand-bg overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-accent transition-all"
                      style={{
                        width: `${Math.min(c.funding_percentage, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs text-brand-muted">
                    <span>${Number(c.current_funding).toLocaleString()} raised</span>
                    <span>{c.funding_percentage}%</span>
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
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-brand-bg flex items-center justify-center mb-3">
                <Wallet className="w-5 h-5 text-brand-muted" />
              </div>
              <p className="text-sm text-brand-muted">No investments yet</p>
              <p className="text-xs text-brand-muted/70 mt-1">
                Your investment portfolio will be shown here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {investments.map((inv) => (
                <Link
                  key={inv.id}
                  to={`/campaigns/${inv.campaign_detail.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-brand-border/30 hover:border-brand-border transition-all"
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
                    <p className="text-sm font-bold text-brand-text">
                      ${Number(inv.amount).toLocaleString()}
                    </p>
                    <p
                      className={`text-xs font-medium ${
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
    </div>
  );
}
