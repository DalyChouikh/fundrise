import { useState, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Plus, Target, Search, X, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { Campaign, Startup } from "@/types";

export function CampaignsPage() {
  const { profile } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCampaigns = async () => {
    try {
      const data = await api.get<Campaign[]>("/campaigns/");
      setCampaigns(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const filtered = campaigns.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.startup_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canCreate =
    profile?.role === "founder" || profile?.role === "team_member";

  const handleApprove = async (campaignId: number) => {
    try {
      await api.post(`/campaigns/${campaignId}/approve/`, {});
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaignId ? { ...c, status: "active" as const } : c
        )
      );
    } catch {
      // silently fail
    }
  };

  const handleReject = async (campaignId: number) => {
    try {
      await api.post(`/campaigns/${campaignId}/reject/`, {});
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === campaignId ? { ...c, status: "rejected" as const } : c
        )
      );
    } catch {
      // silently fail
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Campaigns</h1>
          <p className="text-brand-muted mt-1 text-sm">
            {profile?.role === "investor"
              ? "Explore active fundraising campaigns."
              : "Manage and track your fundraising campaigns."}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Campaign
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-brand-border/50 text-brand-muted text-sm w-full max-w-sm shadow-card focus-within:border-brand-blue/50 transition-colors">
        <Search className="w-4 h-4 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search by title or startup..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent outline-none w-full text-brand-text placeholder:text-brand-muted"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-bg flex items-center justify-center mb-5">
              <Target className="w-7 h-7 text-brand-muted" />
            </div>
            <h2 className="text-lg font-semibold text-brand-text mb-2">
              {searchQuery ? "No matches found" : "No campaigns yet"}
            </h2>
            <p className="text-sm text-brand-muted max-w-md">
              {searchQuery
                ? "Try a different search term."
                : canCreate
                  ? "Launch your first campaign to start raising funds."
                  : "Check back soon for new campaigns."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((campaign) => (
            <Link key={campaign.id} to={`/campaigns/${campaign.id}`}>
              <Card hover className="h-full">
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-brand-text text-sm">
                        {campaign.title}
                      </h3>
                      <p className="text-xs text-brand-muted mt-0.5">
                        {campaign.startup_name}
                      </p>
                    </div>
                    <Badge status={campaign.status} />
                  </div>

                  <p className="text-sm text-brand-muted line-clamp-2 mb-4 flex-1">
                    {campaign.description}
                  </p>

                  {/* Funding progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-brand-muted mb-1.5">
                      <span className="font-medium text-brand-text">
                        ${Number(campaign.current_funding).toLocaleString()}
                      </span>
                      <span>
                        of ${Number(campaign.funding_goal).toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-brand-bg overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-accent transition-all"
                        style={{
                          width: `${Math.min(campaign.funding_percentage, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs font-medium text-brand-accent">
                        {campaign.funding_percentage}% funded
                      </span>
                      <span className="text-xs text-brand-muted">
                        {campaign.equity_offered}% equity
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-brand-muted pt-3 border-t border-brand-border/20">
                    <Calendar className="w-3.5 h-3.5" />
                    Deadline:{" "}
                    {new Date(campaign.deadline).toLocaleDateString()}
                  </div>

                  {profile?.role === "admin" &&
                    campaign.status === "pending_approval" && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-brand-border/20">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleApprove(campaign.id);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleReject(campaign.id);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateCampaignModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchCampaigns();
          }}
        />
      )}
    </div>
  );
}

function CreateCampaignModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startups, setStartups] = useState<Startup[]>([]);
  const [form, setForm] = useState({
    startup: "",
    title: "",
    description: "",
    funding_goal: "",
    equity_offered: "",
    deadline: "",
  });

  useEffect(() => {
    const fetchStartups = async () => {
      try {
        const data = await api.get<Startup[]>("/startups/");
        setStartups(data.filter((s) => s.status === "active"));
      } catch {
        // silently fail
      }
    };
    fetchStartups();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/campaigns/", {
        ...form,
        startup: Number(form.startup),
      });
      onCreated();
    } catch {
      setError(
        "Failed to create campaign. Make sure the startup is active and you are a member."
      );
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-brand-border/20">
          <h2 className="text-lg font-bold text-brand-text">
            Create Campaign
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-brand-bg text-brand-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-brand-text mb-1.5">
              Startup *
            </label>
            {startups.length === 0 ? (
              <p className="text-sm text-brand-muted px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60">
                No active startups available. Create and get a startup approved
                first.
              </p>
            ) : (
              <select
                required
                value={form.startup}
                onChange={(e) => updateField("startup", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all"
              >
                <option value="">Select a startup</option>
                {startups.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text mb-1.5">
              Campaign Title *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="e.g. Series A Round"
              className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text mb-1.5">
              Description *
            </label>
            <textarea
              required
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Describe your fundraising goals..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1.5">
                Funding Goal ($) *
              </label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={form.funding_goal}
                onChange={(e) => updateField("funding_goal", e.target.value)}
                placeholder="100000"
                className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1.5">
                Equity Offered (%) *
              </label>
              <input
                type="number"
                required
                min="0.01"
                max="100"
                step="0.01"
                value={form.equity_offered}
                onChange={(e) => updateField("equity_offered", e.target.value)}
                placeholder="10"
                className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text mb-1.5">
              Deadline *
            </label>
            <input
              type="datetime-local"
              required
              value={form.deadline}
              onChange={(e) => updateField("deadline", e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={startups.length === 0}
            >
              Create Campaign
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
