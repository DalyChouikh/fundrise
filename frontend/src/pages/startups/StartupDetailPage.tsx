import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Globe,
  Users,
  Heart,
  Target,
  Building2,
  Plus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { StartupDetail, Campaign } from "@/types";

export function StartupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [startup, setStartup] = useState<StartupDetail | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, c] = await Promise.all([
          api.get<StartupDetail>(`/startups/${id}/`),
          api.get<Campaign[]>("/campaigns/"),
        ]);
        setStartup(s);
        setCampaigns(c.filter((camp) => camp.startup === s.id));
      } catch {
        navigate("/startups", { replace: true });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleFollow = async () => {
    if (!startup) return;
    try {
      const res = await api.post<{ following: boolean }>(
        `/startups/${startup.id}/follow/`,
        {}
      );
      setStartup({
        ...startup,
        is_following: res.following,
        followers_count:
          startup.followers_count + (res.following ? 1 : -1),
      });
    } catch {
      // silently fail
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;
  if (!startup) return null;

  const founder = startup.members.find((m) => m.role === "founder");

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/startups"
        className="inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-text transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Startups
      </Link>

      {/* Header */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {startup.logo_url ? (
              <img
                src={startup.logo_url}
                alt={startup.name}
                className="w-14 h-14 rounded-xl object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-7 h-7 text-brand-accent" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-brand-text">
                  {startup.name}
                </h1>
                <Badge status={startup.status} />
              </div>
              <p className="text-sm text-brand-muted mt-1">
                {startup.industry}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-brand-muted">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {startup.location}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Founded {startup.founding_date}
                </span>
                {startup.website && (
                  <a
                    href={startup.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-brand-blue hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant={startup.is_following ? "secondary" : "ghost"}
              size="sm"
              onClick={handleFollow}
            >
              <Heart
                className="w-4 h-4 mr-1.5"
                fill={startup.is_following ? "currentColor" : "none"}
              />
              {startup.is_following ? "Following" : "Follow"}
            </Button>
            {startup.is_member && startup.status === "active" && (
              <Link to={`/campaigns?startup=${startup.id}`}>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1.5" />
                  New Campaign
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          <Card>
            <h3 className="text-base font-semibold text-brand-text mb-3">
              About
            </h3>
            <p className="text-sm text-brand-muted leading-relaxed whitespace-pre-line">
              {startup.description}
            </p>
          </Card>

          {/* Campaigns */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-brand-text">
                Campaigns
              </h3>
              <span className="text-xs text-brand-muted">
                {campaigns.length} total
              </span>
            </div>
            {campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-brand-bg flex items-center justify-center mb-3">
                  <Target className="w-5 h-5 text-brand-muted" />
                </div>
                <p className="text-sm text-brand-muted">No campaigns yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    to={`/campaigns/${campaign.id}`}
                    className="block p-4 rounded-xl border border-brand-border/40 hover:border-brand-border hover:bg-brand-bg/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-semibold text-brand-text">
                        {campaign.title}
                      </h4>
                      <Badge status={campaign.status} />
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-brand-muted mb-1.5">
                        <span>
                          ${Number(campaign.current_funding).toLocaleString()} raised
                        </span>
                        <span>
                          ${Number(campaign.funding_goal).toLocaleString()} goal
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-brand-bg overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-accent transition-all"
                          style={{
                            width: `${Math.min(campaign.funding_percentage, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <h3 className="text-base font-semibold text-brand-text mb-3">
              Stats
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-brand-muted">
                  <Users className="w-4 h-4" />
                  Members
                </span>
                <span className="text-sm font-semibold text-brand-text">
                  {startup.members_count}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-brand-muted">
                  <Heart className="w-4 h-4" />
                  Followers
                </span>
                <span className="text-sm font-semibold text-brand-text">
                  {startup.followers_count}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-brand-muted">
                  <Target className="w-4 h-4" />
                  Campaigns
                </span>
                <span className="text-sm font-semibold text-brand-text">
                  {campaigns.length}
                </span>
              </div>
            </div>
          </Card>

          {/* Team */}
          <Card>
            <h3 className="text-base font-semibold text-brand-text mb-3">
              Team
            </h3>
            <div className="space-y-3">
              {startup.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3"
                >
                  <Avatar
                    src={member.user.avatar_url || undefined}
                    name={member.user.full_name}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-text truncate">
                      {member.user.full_name}
                    </p>
                    <p className="text-xs text-brand-muted capitalize">
                      {member.role.replace("_", " ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Founder */}
          {founder && (
            <Card>
              <h3 className="text-base font-semibold text-brand-text mb-3">
                Founded by
              </h3>
              <div className="flex items-center gap-3">
                <Avatar
                  src={founder.user.avatar_url || undefined}
                  name={founder.user.full_name}
                  size="md"
                />
                <div>
                  <p className="text-sm font-semibold text-brand-text">
                    {founder.user.full_name}
                  </p>
                  <p className="text-xs text-brand-muted">Founder</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
