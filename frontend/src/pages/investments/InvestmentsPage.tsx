import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DollarSign, TrendingUp, Clock, XCircle, CheckCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { Investment, InvestmentStatus } from "@/types";

const statusConfig: Record<
  InvestmentStatus,
  { icon: typeof CheckCircle; color: string; bg: string }
> = {
  pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  confirmed: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  cancelled: { icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
};

const tabs: { label: string; value: InvestmentStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Cancelled", value: "cancelled" },
];

export function InvestmentsPage() {
  const { profile } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InvestmentStatus | "all">("all");

  useEffect(() => {
    const fetchInvestments = async () => {
      try {
        const data = await api.get<Investment[]>("/investments/");
        setInvestments(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchInvestments();
  }, []);

  const handleConfirm = async (investmentId: number) => {
    try {
      const updated = await api.post<Investment>(
        `/investments/${investmentId}/confirm/`,
        {}
      );
      setInvestments((prev) =>
        prev.map((inv) => (inv.id === investmentId ? updated : inv))
      );
    } catch {
      // ignore
    }
  };

  const handleCancel = async (investmentId: number) => {
    try {
      const updated = await api.post<Investment>(
        `/investments/${investmentId}/cancel/`,
        {}
      );
      setInvestments((prev) =>
        prev.map((inv) => (inv.id === investmentId ? updated : inv))
      );
    } catch {
      // ignore
    }
  };

  const canManageInvestments =
    profile?.role === "founder" ||
    profile?.role === "team_member" ||
    profile?.role === "admin";

  const filtered =
    filter === "all"
      ? investments
      : investments.filter((inv) => inv.status === filter);

  const totalInvested = investments
    .filter((inv) => inv.status === "confirmed")
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Investments</h1>
        <p className="text-brand-muted mt-1">
          Track your investment portfolio and returns.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-brand-muted">Total Invested</p>
              <p className="text-2xl font-bold text-brand-text mt-1">
                ${totalInvested.toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-brand-bg">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </Card>
        <Card hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-brand-muted">Active</p>
              <p className="text-2xl font-bold text-brand-text mt-1">
                {investments.filter((i) => i.status === "confirmed").length}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-brand-bg">
              <TrendingUp className="w-5 h-5 text-brand-blue" />
            </div>
          </div>
        </Card>
        <Card hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-brand-muted">Pending</p>
              <p className="text-2xl font-bold text-brand-text mt-1">
                {investments.filter((i) => i.status === "pending").length}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-brand-bg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-brand-bg rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              filter === tab.value
                ? "bg-white text-brand-text shadow-sm"
                : "text-brand-muted hover:text-brand-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Investment list */}
      {filtered.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-brand-bg flex items-center justify-center mb-3">
              <DollarSign className="w-5 h-5 text-brand-muted" />
            </div>
            <p className="text-sm text-brand-muted">No investments found</p>
            <p className="text-xs text-brand-muted/70 mt-1">
              {filter === "all"
                ? "Invest in campaigns to build your portfolio"
                : `No ${filter} investments`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => {
            const config = statusConfig[inv.status];
            const StatusIcon = config.icon;
            return (
              <Card key={inv.id} hover>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`p-2.5 rounded-xl ${config.bg}`}>
                      <StatusIcon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/campaigns/${inv.campaign_detail.id}`}
                        className="text-sm font-semibold text-brand-text hover:text-brand-blue transition-colors"
                      >
                        {inv.campaign_detail.title}
                      </Link>
                      <p className="text-xs text-brand-muted mt-0.5">
                        {inv.campaign_detail.startup_name}
                        {inv.investor_name &&
                          canManageInvestments &&
                          ` — ${inv.investor_name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {canManageInvestments && inv.status === "pending" && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleConfirm(inv.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                          title="Confirm investment"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirm
                        </button>
                        <button
                          onClick={() => handleCancel(inv.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                          title="Cancel investment"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      </div>
                    )}
                    {profile?.role === "investor" && inv.status === "pending" && (
                      <button
                        onClick={() => handleCancel(inv.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                        title="Cancel investment"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    )}
                    <div className="text-right">
                      <p className="text-sm font-bold text-brand-text">
                        ${Number(inv.amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-brand-muted mt-0.5">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge status={inv.status} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
