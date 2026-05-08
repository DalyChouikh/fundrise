import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DollarSign, TrendingUp, Clock, XCircle, CheckCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PasskeyConfirmDialog } from "@/components/passkey/PasskeyConfirmDialog";
import { usePasskeyStepUp } from "@/hooks/usePasskeyStepUp";
import { Alert } from "@/components/ui";
import { useToast } from "@/hooks/useToast";
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
  const navigate = useNavigate();
  const toast = useToast();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InvestmentStatus | "all">("all");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const { requireStepUp, dialogProps } = usePasskeyStepUp();

  useEffect(() => {
    const fetchInvestments = async () => {
      try {
        const data = await api.get<Investment[]>("/investments/");
        setInvestments(data);
      } catch {
        toast.error("Failed to load investments. Please refresh and try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchInvestments();
  }, []);

  const handleConfirm = async (investmentId: number) => {
    setConfirmError(null);
    let token: string | undefined;
    try {
      const result = await requireStepUp(
        "Confirm Investment",
        "Verify with your passkey to confirm this investment."
      );
      token = result ?? undefined;
    } catch {
      return; // step-up cancelled
    }
    try {
      const updated = await api.post<Investment>(
        `/investments/${investmentId}/confirm/`,
        {},
        { stepUpToken: token }
      );
      setInvestments((prev) =>
        prev.map((inv) => (inv.id === investmentId ? updated : inv))
      );
      toast.success("Investment confirmed.");
    } catch {
      setConfirmError("Failed to confirm investment. Please try again.");
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
      toast.success("Investment cancelled.");
    } catch {
      toast.error("Failed to cancel investment. Please try again.");
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Investments</h1>
        <p className="text-brand-muted mt-1 text-sm">
          Track your investment portfolio and returns.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Invested", value: `$${totalInvested.toLocaleString()}`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Active", value: String(investments.filter((i) => i.status === "confirmed").length), icon: TrendingUp, color: "text-brand-blue", bg: "bg-blue-50" },
          { label: "Pending", value: String(investments.filter((i) => i.status === "pending").length), icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] text-brand-muted font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-brand-text mt-1.5 tabular-nums">
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

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-white border border-brand-border/[0.12] rounded-xl w-fit shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 cursor-pointer ${
              filter === tab.value
                ? "bg-brand-accent text-white shadow-sm"
                : "text-brand-muted hover:text-brand-text hover:bg-brand-bg/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {confirmError && (
        <Alert variant="error">{confirmError}</Alert>
      )}

      {/* Investment list */}
      {filtered.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-bg flex items-center justify-center mb-3">
              <DollarSign className="w-6 h-6 text-brand-muted" />
            </div>
            <p className="text-sm font-medium text-brand-muted">No investments found</p>
            <p className="text-xs text-brand-muted/60 mt-1">
              {filter === "all"
                ? "Invest in campaigns to build your portfolio"
                : `No ${filter} investments`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => {
            const config = statusConfig[inv.status];
            const StatusIcon = config.icon;
            return (
              <Card key={inv.id} className="hover:shadow-card-hover transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`p-2 rounded-xl ${config.bg}`}>
                      <StatusIcon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/campaigns/${inv.campaign_detail.id}`}
                        className="text-sm font-semibold text-brand-text hover:text-brand-accent transition-colors"
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
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {canManageInvestments && inv.status === "pending" && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleConfirm(inv.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirm
                        </button>
                        <button
                          onClick={() => handleCancel(inv.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      </div>
                    )}
                    {profile?.role === "investor" && inv.status === "pending" && (
                      <button
                        onClick={() => handleCancel(inv.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    )}
                    <div className="text-right">
                      <p className="text-sm font-bold text-brand-text tabular-nums">
                        ${Number(inv.amount).toLocaleString()}
                      </p>
                      <p className="text-[11px] text-brand-muted mt-0.5 tabular-nums">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge status={inv.status} />
                    {profile?.role === "investor" &&
                      inv.status === "confirmed" &&
                      inv.campaign_detail.status === "active" && (
                        <button
                          onClick={() =>
                            navigate(`/investments/board/${inv.campaign_detail.startup}`, {
                              state: { startupName: inv.campaign_detail.startup_name },
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-brand-blue bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          View Board
                        </button>
                      )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {dialogProps && <PasskeyConfirmDialog {...dialogProps} />}
    </div>
  );
}
