import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Target,
  FileText,
  CheckCircle,
  CheckCircle2,
  Clock,
  Building2,
  XCircle,
  MessageCircle,
  Reply,
  Send,
  Plus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CheckoutModal } from "@/components/investments/CheckoutModal";
import type { CampaignDetail, CampaignUpdate, CampaignMilestone, Investment, CampaignComment } from "@/types";

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [updates, setUpdates] = useState<CampaignUpdate[]>([]);
  const [milestones, setMilestones] = useState<CampaignMilestone[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [comments, setComments] = useState<CampaignComment[]>([]);

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

        // Fetch comments and investments
        try {
          const [invs, cmts] = await Promise.all([
            api.get<Investment[]>("/investments/"),
            api.get<CampaignComment[]>(`/campaigns/${id}/comments/`),
          ]);
          setInvestments(invs.filter((inv) => inv.campaign === c.id));
          setComments(cmts);
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

  const handleConfirmInvestment = async (investmentId: number) => {
    try {
      const updated = await api.post<Investment>(
        `/investments/${investmentId}/confirm/`,
        {}
      );
      setInvestments((prev) =>
        prev.map((inv) => (inv.id === investmentId ? updated : inv))
      );
      const updatedCampaign = await api.get<CampaignDetail>(
        `/campaigns/${campaign?.id}/`
      );
      setCampaign(updatedCampaign);
    } catch {
      // ignore
    }
  };

  const handleCancelInvestment = async (investmentId: number) => {
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
    campaign?.is_startup_member || profile?.role === "admin";

  if (loading) return <LoadingSpinner fullscreen />;
  if (!campaign) return null;

  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(campaign.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  );

  const canInvest =
    profile?.role === "investor" &&
    campaign.status === "active" &&
    profile?.approval_status === "approved";

  const hasConfirmedInvestment =
    profile?.role === "investor" &&
    campaign.status === "active" &&
    investments.some((inv) => inv.status === "confirmed");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back */}
      <Link
        to="/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-text transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
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
              <Button size="sm" onClick={() => setShowCheckout(true)}>
                <DollarSign className="w-4 h-4" />
                Invest Now
              </Button>
            )}
            {hasConfirmedInvestment && (
              <button
                onClick={() =>
                  navigate(`/investments/board/${campaign.startup}`, {
                    state: { startupName: campaign.startup_name },
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-brand-text border border-brand-border/[0.2] hover:bg-brand-bg transition-colors cursor-pointer"
              >
                View Startup Board
              </button>
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
        {[
          { label: "Raised", value: `$${Number(campaign.current_funding).toLocaleString()}`, icon: DollarSign, iconColor: "text-emerald-600", iconBg: "bg-emerald-50" },
          { label: "Goal", value: `$${Number(campaign.funding_goal).toLocaleString()}`, icon: Target, iconColor: "text-brand-accent", iconBg: "bg-brand-accent/[0.08]" },
          { label: "Equity Offered", value: `${campaign.equity_offered}%`, icon: FileText, iconColor: "text-brand-blue", iconBg: "bg-blue-50" },
          { label: "Days Left", value: `${daysLeft}`, icon: Calendar, iconColor: "text-violet-600", iconBg: "bg-violet-50" },
        ].map(({ label, value, icon: Icon, iconColor, iconBg }, i) => (
          <Card key={label} style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }} className="animate-fade-in">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-brand-muted font-medium">{label}</p>
                <p className="text-xl font-bold text-brand-text mt-1 tabular-nums">
                  {value}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${iconBg}`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-brand-text">
            Funding Progress
          </h3>
          <span className="text-sm font-bold text-brand-accent tabular-nums">
            {campaign.funding_percentage}%
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-brand-bg overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-accent to-brand-accent/70 transition-all duration-500"
            style={{
              width: `${Math.min(campaign.funding_percentage, 100)}%`,
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[11px] text-brand-muted tabular-nums">
          <span>${Number(campaign.current_funding).toLocaleString()} raised</span>
          <span>${Number(campaign.funding_goal).toLocaleString()} goal</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <h3 className="text-sm font-bold text-brand-text mb-3">
              About this Campaign
            </h3>
            <p className="text-sm text-brand-muted leading-relaxed whitespace-pre-line">
              {campaign.description}
            </p>
          </Card>

          {/* Updates */}
          <UpdatesSection
            campaignId={campaign.id}
            updates={updates}
            setUpdates={setUpdates}
            isStartupMember={campaign.is_startup_member}
          />

          {/* Discussion */}
          <DiscussionSection
            campaignId={campaign.id}
            comments={comments}
            setComments={setComments}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Invest CTA for investors */}
          {canInvest && (
            <Card className="!border-2 !border-brand-accent/20">
              <div className="text-center">
                <h3 className="text-sm font-bold text-brand-text mb-1.5">
                  Invest in this Campaign
                </h3>
                <p className="text-xs text-brand-muted mb-4">
                  Join {investments.length} investor{investments.length !== 1 ? "s" : ""} backing this startup
                </p>
                <Button className="w-full" onClick={() => setShowCheckout(true)}>
                  <DollarSign className="w-4 h-4" />
                  Invest Now
                </Button>
              </div>
            </Card>
          )}

          {/* Recent Investors */}
          {investments.length > 0 && (
            <Card>
              <h3 className="text-sm font-bold text-brand-text mb-3">
                Recent Investors ({investments.length})
              </h3>
              <div className="space-y-2.5">
                {investments.slice(0, 5).map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 rounded-xl border border-brand-border/[0.1]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          name={inv.investor_name || "?"}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-brand-text truncate">
                            {inv.investor_name}
                          </p>
                          <p className="text-[11px] text-brand-muted tabular-nums">
                            {new Date(inv.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-brand-text tabular-nums">
                          ${Number(inv.amount).toLocaleString()}
                        </p>
                        <Badge status={inv.status} />
                      </div>
                    </div>
                    {canManageInvestments && inv.status === "pending" && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-brand-border/[0.08]">
                        <button
                          onClick={() => handleConfirmInvestment(inv.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirm
                        </button>
                        <button
                          onClick={() => handleCancelInvestment(inv.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Details */}
          <Card>
            <h3 className="text-sm font-bold text-brand-text mb-3">
              Details
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-brand-muted">Status</span>
                <Badge status={campaign.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-muted">Deadline</span>
                <span className="text-brand-text font-medium tabular-nums">
                  {new Date(campaign.deadline).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-muted">Equity</span>
                <span className="text-brand-text font-medium tabular-nums">
                  {campaign.equity_offered}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-muted">Updates</span>
                <span className="text-brand-text font-medium tabular-nums">
                  {campaign.updates_count}
                </span>
              </div>
            </div>
          </Card>

          {/* Milestones */}
          <MilestonesSection
            campaignId={campaign.id}
            milestones={milestones}
            setMilestones={setMilestones}
            isStartupMember={campaign.is_startup_member}
          />
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal
          campaign={campaign}
          onClose={() => setShowCheckout(false)}
          onSuccess={(updated) => {
            setCampaign(updated);
            setShowCheckout(false);
            // Refresh investments list
            api.get<Investment[]>("/investments/").then((invs) => {
              setInvestments(invs.filter((inv) => inv.campaign === campaign.id));
            }).catch(() => {});
          }}
        />
      )}
    </div>
  );
}

function UpdatesSection({
  campaignId,
  updates,
  setUpdates,
  isStartupMember,
}: {
  campaignId: number;
  updates: CampaignUpdate[];
  setUpdates: React.Dispatch<React.SetStateAction<CampaignUpdate[]>>;
  isStartupMember: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setPosting(true);
    try {
      const update = await api.post<CampaignUpdate>(
        `/campaigns/${campaignId}/updates/`,
        { title: title.trim(), content: content.trim() }
      );
      setUpdates((prev) => [update, ...prev]);
      setTitle("");
      setContent("");
      setShowForm(false);
    } catch {
      // ignore
    }
    setPosting(false);
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-brand-text">
          Updates ({updates.length})
        </h3>
        {isStartupMember && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs font-medium text-brand-accent hover:text-brand-accent/80 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Post Update
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 p-4 rounded-xl border border-brand-accent/20 bg-brand-accent/[0.02]">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Update title"
            className="w-full bg-white border border-brand-border/30 rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/60 outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all shadow-sm mb-2"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share what's new with your campaign..."
            rows={3}
            className="w-full bg-white border border-brand-border/30 rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/60 outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all resize-none shadow-sm"
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setTitle("");
                setContent("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!title.trim() || !content.trim() || posting}
            >
              {posting ? "Posting..." : "Post Update"}
            </Button>
          </div>
        </div>
      )}

      {updates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-xl bg-brand-bg flex items-center justify-center mb-2.5">
            <FileText className="w-4 h-4 text-brand-muted" />
          </div>
          <p className="text-sm text-brand-muted">No updates yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {updates.map((update) => (
            <div
              key={update.id}
              className="p-4 rounded-xl border border-brand-border/[0.1] bg-brand-bg/20"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-brand-text">
                  {update.title}
                </h4>
                <span className="text-[11px] text-brand-muted tabular-nums">
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
                <span className="text-[11px] text-brand-muted">
                  {update.created_by.full_name}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function MilestonesSection({
  campaignId,
  milestones,
  setMilestones,
  isStartupMember,
}: {
  campaignId: number;
  milestones: CampaignMilestone[];
  setMilestones: React.Dispatch<React.SetStateAction<CampaignMilestone[]>>;
  isStartupMember: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [posting, setPosting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !targetDate) return;
    setPosting(true);
    try {
      const milestone = await api.post<CampaignMilestone>(
        `/campaigns/${campaignId}/milestones/`,
        {
          title: title.trim(),
          description: description.trim(),
          target_date: targetDate,
        }
      );
      setMilestones((prev) => [...prev, milestone]);
      setTitle("");
      setDescription("");
      setTargetDate("");
      setShowForm(false);
    } catch {
      // ignore
    }
    setPosting(false);
  };

  const toggleCompletion = async (milestone: CampaignMilestone) => {
    try {
      const updated = await api.patch<CampaignMilestone>(
        `/campaigns/${campaignId}/milestones/${milestone.id}/`,
        { is_completed: !milestone.is_completed }
      );
      setMilestones((prev) =>
        prev.map((m) => (m.id === milestone.id ? updated : m))
      );
    } catch {
      // ignore
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-brand-text">
          Milestones ({milestones.length})
        </h3>
        {isStartupMember && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs font-medium text-brand-accent hover:text-brand-accent/80 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-3 p-4 rounded-xl border border-brand-accent/20 bg-brand-accent/[0.02]">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Milestone title"
            className="w-full bg-white border border-brand-border/30 rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/60 outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all shadow-sm mb-2"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-white border border-brand-border/30 rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/60 outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all shadow-sm mb-2"
          />
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full bg-white border border-brand-border/30 rounded-xl px-4 py-2.5 text-sm text-brand-text outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all shadow-sm"
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setTitle("");
                setDescription("");
                setTargetDate("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!title.trim() || !targetDate || posting}
            >
              {posting ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      )}

      {milestones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-brand-bg flex items-center justify-center mb-2">
            <Target className="w-4 h-4 text-brand-muted" />
          </div>
          <p className="text-xs text-brand-muted">No milestones set</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="flex items-start gap-3 p-3 rounded-xl border border-brand-border/[0.1]"
            >
              {isStartupMember ? (
                <button
                  onClick={() => toggleCompletion(milestone)}
                  className={`p-1 rounded-lg mt-0.5 transition-colors cursor-pointer ${
                    milestone.is_completed
                      ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      : "bg-brand-bg text-brand-muted hover:bg-brand-border/30"
                  }`}
                  title={
                    milestone.is_completed
                      ? "Mark as incomplete"
                      : "Mark as complete"
                  }
                >
                  {milestone.is_completed ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                </button>
              ) : (
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
              )}
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
                <p className="text-[11px] text-brand-muted mt-0.5 tabular-nums">
                  Target: {milestone.target_date}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function DiscussionSection({
  campaignId,
  comments,
  setComments,
}: {
  campaignId: number;
  comments: CampaignComment[];
  setComments: React.Dispatch<React.SetStateAction<CampaignComment[]>>;
}) {
  const { profile } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    const text = newComment.trim();
    if (!text) return;
    setPosting(true);
    try {
      const comment = await api.post<CampaignComment>(
        `/campaigns/${campaignId}/comments/`,
        { content: text }
      );
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
    } catch {
      // ignore
    }
    setPosting(false);
  };

  const handleReplyAdded = (parentId: number, reply: CampaignComment) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === parentId
          ? { ...c, replies: [...c.replies, reply], reply_count: c.reply_count + 1 }
          : c
      )
    );
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-brand-accent/[0.08]">
          <MessageCircle className="w-4 h-4 text-brand-accent" />
        </div>
        <h3 className="text-sm font-bold text-brand-text">
          Discussion ({comments.length})
        </h3>
      </div>

      {/* New comment input */}
      {profile && (
        <div className="flex gap-3 mb-6">
          <Avatar
            src={profile.avatar_url || undefined}
            name={profile.full_name || "?"}
            size="sm"
            className="flex-shrink-0 mt-1"
          />
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ask a question or share your thoughts..."
              rows={2}
              className="w-full bg-white border border-brand-border/30 rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/60 outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all resize-none shadow-sm"
            />
            <div className="flex justify-end mt-2">
              <Button
                size="sm"
                onClick={handlePost}
                disabled={!newComment.trim() || posting}
              >
                <Send className="w-3.5 h-3.5" />
                {posting ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comment list */}
      {comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-xl bg-brand-bg flex items-center justify-center mb-2.5">
            <MessageCircle className="w-4 h-4 text-brand-muted" />
          </div>
          <p className="text-sm text-brand-muted">
            No comments yet. Be the first to start a discussion!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              campaignId={campaignId}
              onReplyAdded={handleReplyAdded}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function CommentThread({
  comment,
  campaignId,
  onReplyAdded,
}: {
  comment: CampaignComment;
  campaignId: number;
  onReplyAdded: (parentId: number, reply: CampaignComment) => void;
}) {
  const { profile } = useAuth();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showReply) {
      replyInputRef.current?.focus();
    }
  }, [showReply]);

  const handleReply = async () => {
    const text = replyText.trim();
    if (!text) return;
    setPosting(true);
    try {
      const reply = await api.post<CampaignComment>(
        `/campaigns/${campaignId}/comments/`,
        { content: text, parent: comment.id }
      );
      onReplyAdded(comment.id, reply);
      setReplyText("");
      setShowReply(false);
    } catch {
      // ignore
    }
    setPosting(false);
  };

  return (
    <div className="p-4 rounded-xl border border-brand-border/[0.1] bg-brand-bg/10">
      {/* Main comment */}
      <div className="flex gap-3">
        <Avatar
          src={comment.author_detail.avatar_url || undefined}
          name={comment.author_detail.full_name || "?"}
          size="sm"
          className="flex-shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-brand-text">
              {comment.author_detail.full_name}
            </span>
            <span className="text-[11px] text-brand-muted capitalize">
              {comment.author_detail.role.replace("_", " ")}
            </span>
            <span className="text-[10px] text-brand-muted tabular-nums">
              {formatTimeAgo(comment.created_at)}
            </span>
          </div>
          <p className="text-sm text-brand-text/90 mt-1 leading-relaxed whitespace-pre-line">
            {comment.content}
          </p>
          {profile && (
            <button
              onClick={() => setShowReply(!showReply)}
              className="flex items-center gap-1 mt-2 text-xs text-brand-muted hover:text-brand-accent transition-colors cursor-pointer"
            >
              <Reply className="w-3.5 h-3.5" />
              Reply
              {comment.reply_count > 0 && ` (${comment.reply_count})`}
            </button>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="ml-11 mt-3 space-y-3 border-l-2 border-brand-accent/20 pl-4">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <Avatar
                src={reply.author_detail.avatar_url || undefined}
                name={reply.author_detail.full_name || "?"}
                size="sm"
                className="flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-brand-text">
                    {reply.author_detail.full_name}
                  </span>
                  <span className="text-[11px] text-brand-muted capitalize">
                    {reply.author_detail.role.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-brand-muted tabular-nums">
                    {formatTimeAgo(reply.created_at)}
                  </span>
                </div>
                <p className="text-sm text-brand-text/90 mt-1 leading-relaxed whitespace-pre-line">
                  {reply.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply input */}
      {showReply && (
        <div className="ml-11 mt-3 flex gap-2">
          <textarea
            ref={replyInputRef}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            rows={1}
            className="flex-1 bg-white border border-brand-border/30 rounded-xl px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/60 outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all resize-none shadow-sm"
          />
          <Button
            size="sm"
            onClick={handleReply}
            disabled={!replyText.trim() || posting}
          >
            {posting ? "..." : "Reply"}
          </Button>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(isoDate).toLocaleDateString();
}
