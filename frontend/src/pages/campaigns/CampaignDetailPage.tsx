import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Target,
  FileText,
  CheckCircle,
  Clock,
  Building2,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { CampaignDetail, CampaignUpdate, CampaignMilestone, Investment } from "@/types";

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [updates, setUpdates] = useState<CampaignUpdate[]>([]);
  const [milestones, setMilestones] = useState<CampaignMilestone[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [investAmount, setInvestAmount] = useState("");
  const [investing, setInvesting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [c, u, m] = await Promise.all([
          api.get<CampaignDetail>(`/campaigns/${id}/`),
          api.get<CampaignUpdate[]>(`/campaigns/${id}/updates/`),
          api.get<CampaignMilestone[]>(`/campaigns/${id}/milestones/`),
        ]);
        setCampaign(c);
        setUpdates(u);
        setMilestones(m);

        // Fetch investments visible to this user
        try {
          const invs = await api.get<Investment[]>("/investments/");
          setInvestments(invs.filter((inv) => inv.campaign === c.id));
        } catch {
          // ignore
        }
      } catch {
        navigate("/campaigns", { replace: true });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleSubmit = async () => {
    if (!campaign) return;
    try {
      const updated = await api.post<CampaignDetail>(
        `/campaigns/${campaign.id}/submit/`,
        {}
      );
      setCampaign(updated);
    } catch {
      // silently fail
    }
  };

  const handleInvest = async () => {
    if (!campaign || !investAmount) return;
    setInvesting(true);
    try {
      await api.post("/investments/", {
        campaign: campaign.id,
        amount: investAmount,
      });
      const updated = await api.get<CampaignDetail>(`/campaigns/${campaign.id}/`);
      setCampaign(updated);
      setShowInvestModal(false);
      setInvestAmount("");
      try {
        const invs = await api.get<Investment[]>("/investments/");
        setInvestments(invs.filter((inv) => inv.campaign === campaign.id));
      } catch {
        // ignore
      }
    } catch {
      // silently fail
    } finally {
      setInvesting(false);
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;
  if (!campaign) return null;

  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(campaign.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  );

  const canInvest =
    profile?.role === "investor" && campaign.status === "active";

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        to="/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-text transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Campaigns
      </Link>

      {/* Header */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-xl font-bold text-brand-text">
                {campaign.title}
              </h1>
              <Badge status={campaign.status} />
            </div>
            <Link
              to={`/startups/${campaign.startup}`}
              className="inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-blue transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              {campaign.startup_name}
            </Link>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {canInvest && (
              <Button size="sm" onClick={() => setShowInvestModal(true)}>
                <DollarSign className="w-4 h-4 mr-1" />
                Invest Now
              </Button>
            )}
            {campaign.is_startup_member &&
              campaign.status === "draft" && (
                <Button size="sm" onClick={handleSubmit}>
                  Submit for Approval
                </Button>
              )}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-brand-muted">Raised</p>
              <p className="text-2xl font-bold text-brand-text mt-1">
                ${Number(campaign.current_funding).toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-brand-bg">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-brand-muted">Goal</p>
              <p className="text-2xl font-bold text-brand-text mt-1">
                ${Number(campaign.funding_goal).toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-brand-bg">
              <Target className="w-5 h-5 text-brand-accent" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-brand-muted">Equity Offered</p>
              <p className="text-2xl font-bold text-brand-text mt-1">
                {campaign.equity_offered}%
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-brand-bg">
              <FileText className="w-5 h-5 text-brand-blue" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-brand-muted">Days Left</p>
              <p className="text-2xl font-bold text-brand-text mt-1">
                {daysLeft}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-brand-bg">
              <Calendar className="w-5 h-5 text-violet-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Progress bar */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold text-brand-text">
            Funding Progress
          </h3>
          <span className="text-sm font-semibold text-brand-accent">
            {campaign.funding_percentage}%
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-brand-bg overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-accent transition-all duration-500"
            style={{
              width: `${Math.min(campaign.funding_percentage, 100)}%`,
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-brand-muted">
          <span>${Number(campaign.current_funding).toLocaleString()} raised</span>
          <span>${Number(campaign.funding_goal).toLocaleString()} goal</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <h3 className="text-base font-semibold text-brand-text mb-3">
              About this Campaign
            </h3>
            <p className="text-sm text-brand-muted leading-relaxed whitespace-pre-line">
              {campaign.description}
            </p>
          </Card>

          {/* Updates */}
          <Card>
            <h3 className="text-base font-semibold text-brand-text mb-4">
              Updates ({updates.length})
            </h3>
            {updates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-brand-bg flex items-center justify-center mb-3">
                  <FileText className="w-5 h-5 text-brand-muted" />
                </div>
                <p className="text-sm text-brand-muted">No updates yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {updates.map((update) => (
                  <div
                    key={update.id}
                    className="p-4 rounded-xl border border-brand-border/30 bg-brand-bg/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-brand-text">
                        {update.title}
                      </h4>
                      <span className="text-xs text-brand-muted">
                        {new Date(update.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-brand-muted leading-relaxed">
                      {update.content}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Avatar
                        src={update.created_by.avatar_url || undefined}
                        name={update.created_by.full_name}
                        size="sm"
                      />
                      <span className="text-xs text-brand-muted">
                        {update.created_by.full_name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Invest CTA for investors */}
          {canInvest && (
            <Card className="border-2 border-brand-accent/20">
              <div className="text-center">
                <h3 className="text-base font-semibold text-brand-text mb-2">
                  Invest in this Campaign
                </h3>
                <p className="text-xs text-brand-muted mb-4">
                  Join {investments.length} investor{investments.length !== 1 ? "s" : ""} backing this startup
                </p>
                <Button className="w-full" onClick={() => setShowInvestModal(true)}>
                  <DollarSign className="w-4 h-4 mr-1" />
                  Invest Now
                </Button>
              </div>
            </Card>
          )}

          {/* Recent Investors */}
          {investments.length > 0 && (
            <Card>
              <h3 className="text-base font-semibold text-brand-text mb-3">
                Recent Investors ({investments.length})
              </h3>
              <div className="space-y-3">
                {investments.slice(0, 5).map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-brand-bg flex items-center justify-center text-xs font-medium text-brand-muted">
                        {inv.investor_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-brand-text truncate">
                          {inv.investor_name}
                        </p>
                        <p className="text-xs text-brand-muted">
                          {new Date(inv.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-brand-text">
                        ${Number(inv.amount).toLocaleString()}
                      </p>
                      <Badge status={inv.status} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Details */}
          <Card>
            <h3 className="text-base font-semibold text-brand-text mb-3">
              Details
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-brand-muted">Status</span>
                <Badge status={campaign.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-muted">Deadline</span>
                <span className="text-brand-text font-medium">
                  {new Date(campaign.deadline).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-muted">Equity</span>
                <span className="text-brand-text font-medium">
                  {campaign.equity_offered}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-muted">Updates</span>
                <span className="text-brand-text font-medium">
                  {campaign.updates_count}
                </span>
              </div>
            </div>
          </Card>

          {/* Milestones */}
          <Card>
            <h3 className="text-base font-semibold text-brand-text mb-3">
              Milestones ({milestones.length})
            </h3>
            {milestones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-brand-bg flex items-center justify-center mb-2">
                  <Target className="w-4 h-4 text-brand-muted" />
                </div>
                <p className="text-xs text-brand-muted">
                  No milestones set
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-brand-border/30"
                  >
                    <div
                      className={`p-1 rounded-lg mt-0.5 ${
                        milestone.is_completed
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-brand-bg text-brand-muted"
                      }`}
                    >
                      {milestone.is_completed ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          milestone.is_completed
                            ? "text-brand-muted line-through"
                            : "text-brand-text"
                        }`}
                      >
                        {milestone.title}
                      </p>
                      <p className="text-xs text-brand-muted mt-0.5">
                        Target: {milestone.target_date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Invest Modal */}
      {showInvestModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-brand-text">
                Invest in {campaign.title}
              </h2>
              <button
                onClick={() => setShowInvestModal(false)}
                className="p-1 rounded-lg hover:bg-brand-bg transition-colors"
              >
                <X className="w-5 h-5 text-brand-muted" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-brand-bg/50">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-brand-muted">Campaign</span>
                  <span className="font-medium text-brand-text">
                    {campaign.title}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-brand-muted">Startup</span>
                  <span className="font-medium text-brand-text">
                    {campaign.startup_name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-brand-muted">Equity Offered</span>
                  <span className="font-medium text-brand-text">
                    {campaign.equity_offered}%
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text mb-1.5">
                  Investment Amount ($)
                </label>
                <input
                  type="number"
                  min="1"
                  value={investAmount}
                  onChange={(e) => setInvestAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border/50 bg-white text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent/50 transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowInvestModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleInvest}
                  disabled={!investAmount || Number(investAmount) <= 0 || investing}
                >
                  {investing ? "Processing..." : "Confirm Investment"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
