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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { CampaignDetail, CampaignUpdate, CampaignMilestone } from "@/types";

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [updates, setUpdates] = useState<CampaignUpdate[]>([]);
  const [milestones, setMilestones] = useState<CampaignMilestone[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <LoadingSpinner fullscreen />;
  if (!campaign) return null;

  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(campaign.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  );

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
    </div>
  );
}
