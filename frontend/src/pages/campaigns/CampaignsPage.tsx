import { useState, useEffect, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Target, Search, Calendar, CheckCircle2, XCircle, Building2, SlidersHorizontal, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Card, Button, Badge, LoadingSpinner, Input, Textarea, DateTimeInput, Select, Alert, Modal } from "@/components/ui";
import { FilterDrawer } from "@/components/ui/FilterDrawer";
import { useToast } from "@/hooks/useToast";
import type { Campaign, Startup } from "@/types";

export function CampaignsPage() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    industries: [] as string[],
    status: "",
    minFunding: "",
    maxFunding: "",
  });

  // Auto-open create modal via ?action=create
  useEffect(() => {
    if (
      searchParams.get("action") === "create" &&
      (profile?.role === "founder" || profile?.role === "team_member")
    ) {
      setShowCreate(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, profile, setSearchParams]);

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

  const availableIndustries = [...new Set(campaigns.map((c) => c.startup_industry).filter(Boolean))].sort();

  const filtered = campaigns
    .filter((c) =>
      !filters.industries.length || filters.industries.includes(c.startup_industry)
    )
    .filter((c) => !filters.status || c.status === filters.status)
    .filter((c) =>
      !filters.minFunding || c.funding_percentage >= Number(filters.minFunding)
    )
    .filter((c) =>
      !filters.maxFunding || c.funding_percentage <= Number(filters.maxFunding)
    )
    .filter(
      (c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.startup_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const activeFilterCount =
    filters.industries.length +
    (filters.status ? 1 : 0) +
    (filters.minFunding ? 1 : 0) +
    (filters.maxFunding ? 1 : 0);

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
    <div className="space-y-6 animate-fade-in">
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
          <Button
            onClick={() => setShowCreate(true)}
            disabled={profile?.approval_status !== "approved"}
            title={
              profile?.approval_status !== "approved"
                ? "Account pending approval"
                : undefined
            }
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </Button>
        )}
      </div>

      {/* Search + Filters row */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-brand-border/30 text-brand-muted text-sm flex-1 max-w-sm shadow-sm focus-within:border-brand-blue/40 focus-within:ring-2 focus-within:ring-brand-blue/10 transition-all">
          <Search className="w-4 h-4 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by title or startup..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none w-full text-brand-text placeholder:text-brand-muted/60"
          />
        </div>
        <button
          onClick={() => setShowFilters(true)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all shadow-sm cursor-pointer",
            activeFilterCount > 0
              ? "bg-brand-accent/[0.08] border-brand-accent/30 text-brand-accent"
              : "bg-white border-brand-border/30 text-brand-muted hover:text-brand-text hover:border-brand-border/60"
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-brand-accent text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.industries.map((ind) => (
            <span key={ind} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/[0.08] text-brand-accent text-xs font-medium">
              {ind}
              <button onClick={() => setFilters((f) => ({ ...f, industries: f.industries.filter((i) => i !== ind) }))} className="hover:text-brand-accent/60 cursor-pointer"><X className="w-3 h-3" /></button>
            </span>
          ))}
          {filters.status && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/[0.08] text-brand-accent text-xs font-medium">
              {filters.status.replace("_", " ")}
              <button onClick={() => setFilters((f) => ({ ...f, status: "" }))} className="hover:text-brand-accent/60 cursor-pointer"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.minFunding && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/[0.08] text-brand-accent text-xs font-medium">
              ≥{filters.minFunding}% funded
              <button onClick={() => setFilters((f) => ({ ...f, minFunding: "" }))} className="hover:text-brand-accent/60 cursor-pointer"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.maxFunding && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/[0.08] text-brand-accent text-xs font-medium">
              ≤{filters.maxFunding}% funded
              <button onClick={() => setFilters((f) => ({ ...f, maxFunding: "" }))} className="hover:text-brand-accent/60 cursor-pointer"><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-bg flex items-center justify-center mb-4">
              <Target className="w-7 h-7 text-brand-muted" />
            </div>
            <h2 className="text-base font-semibold text-brand-text mb-1">
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
          {filtered.map((campaign, i) => (
            <Link key={campaign.id} to={`/campaigns/${campaign.id}`}>
              <Card hover className="h-full" style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}>
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {campaign.startup_logo_url ? (
                        <img
                          src={campaign.startup_logo_url}
                          alt={campaign.startup_name}
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-brand-accent/[0.08] flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-brand-accent" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-brand-text text-sm">
                          {campaign.title}
                        </h3>
                        <p className="text-xs text-brand-muted mt-0.5">
                          {campaign.startup_name}
                        </p>
                      </div>
                    </div>
                    <Badge status={campaign.status} />
                  </div>

                  <p className="text-sm text-brand-muted line-clamp-2 mb-4 flex-1 leading-relaxed">
                    {campaign.description}
                  </p>

                  {/* Funding progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[11px] text-brand-muted mb-1.5 tabular-nums">
                      <span className="font-semibold text-brand-text">
                        ${Number(campaign.current_funding).toLocaleString()}
                      </span>
                      <span>
                        of ${Number(campaign.funding_goal).toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-brand-bg overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-accent to-brand-accent/70 transition-all"
                        style={{
                          width: `${Math.min(campaign.funding_percentage, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[11px] font-semibold text-brand-accent tabular-nums">
                        {campaign.funding_percentage}% funded
                      </span>
                      <span className="text-[11px] text-brand-muted tabular-nums">
                        {campaign.equity_offered}% equity
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-brand-muted pt-3 border-t border-brand-border/[0.08] tabular-nums">
                    <Calendar className="w-3.5 h-3.5" />
                    Deadline:{" "}
                    {new Date(campaign.deadline).toLocaleDateString()}
                  </div>

                  {profile?.role === "admin" &&
                    campaign.status === "pending_approval" && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-brand-border/[0.08]">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleApprove(campaign.id);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleReject(campaign.id);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
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

      {/* Filter Drawer */}
      <FilterDrawer
        open={showFilters}
        onClose={() => setShowFilters(false)}
        activeCount={activeFilterCount}
        onClear={() => setFilters({ industries: [], status: "", minFunding: "", maxFunding: "" })}
      >
        {/* Industry filter */}
        <div>
          <p className="text-[13px] font-semibold text-brand-text mb-3">Industry</p>
          {availableIndustries.length === 0 ? (
            <p className="text-sm text-brand-muted">No industries available</p>
          ) : (
            <div className="space-y-2">
              {availableIndustries.map((ind) => {
                const checked = filters.industries.includes(ind);
                return (
                  <label key={ind} className="flex items-center gap-2.5 cursor-pointer group">
                    <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center transition-colors", checked ? "border-brand-accent bg-brand-accent" : "border-brand-border group-hover:border-brand-accent/60")}>
                      {checked && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="text-sm text-brand-text">{ind}</span>
                    <input type="checkbox" className="sr-only" checked={checked}
                      onChange={() => setFilters((f) => ({ ...f, industries: checked ? f.industries.filter((i) => i !== ind) : [...f.industries, ind] }))}
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Status filter */}
        <div>
          <p className="text-[13px] font-semibold text-brand-text mb-3">Status</p>
          <div className="space-y-2">
            {[
              { value: "", label: "All" },
              { value: "active", label: "Active" },
              { value: "pending_approval", label: "Pending approval" },
              { value: "completed", label: "Completed" },
              { value: "rejected", label: "Rejected" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors", filters.status === opt.value ? "border-brand-accent bg-brand-accent" : "border-brand-border group-hover:border-brand-accent/60")}>
                  {filters.status === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className="text-sm text-brand-text">{opt.label}</span>
                <input type="radio" className="sr-only" checked={filters.status === opt.value}
                  onChange={() => setFilters((f) => ({ ...f, status: opt.value }))}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Funding % range */}
        <div>
          <p className="text-[13px] font-semibold text-brand-text mb-3">Funding progress (%)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-brand-muted mb-1">Min</label>
              <input
                type="number"
                min="0"
                max="100"
                value={filters.minFunding}
                onChange={(e) => setFilters((f) => ({ ...f, minFunding: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl bg-white border border-brand-border/30 text-brand-text text-sm outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] text-brand-muted mb-1">Max</label>
              <input
                type="number"
                min="0"
                max="100"
                value={filters.maxFunding}
                onChange={(e) => setFilters((f) => ({ ...f, maxFunding: e.target.value }))}
                placeholder="100"
                className="w-full px-3 py-2 rounded-xl bg-white border border-brand-border/30 text-brand-text text-sm outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all shadow-sm"
              />
            </div>
          </div>
        </div>
      </FilterDrawer>

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
  const toast = useToast();
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
      toast.success("Campaign created successfully.");
      onCreated();
    } catch {
      setError(
        "Failed to create campaign. Make sure the startup is active and you are a member."
      );
      toast.error("Failed to create campaign.");
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Modal open={true} onClose={onClose} title="Create Campaign">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <label className="block text-[13px] font-medium text-brand-text mb-1.5">
            Startup *
          </label>
          {startups.length === 0 ? (
            <p className="text-sm text-brand-muted px-4 py-3 rounded-xl bg-brand-bg/60 border border-brand-border/[0.12]">
              No active startups available. Create and get a startup approved
              first.
            </p>
          ) : (
            <Select
              options={startups.map((s) => ({ value: String(s.id), label: s.name }))}
              value={form.startup}
              onChange={(val) => updateField("startup", val)}
              placeholder="Select a startup"
            />
          )}
        </div>

        <div>
          <label className="block text-[13px] font-medium text-brand-text mb-1.5">
            Campaign Title *
          </label>
          <Input
            type="text"
            required
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="e.g. Series A Round"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-brand-text mb-1.5">
            Description *
          </label>
          <Textarea
            required
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Describe your fundraising goals..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-brand-text mb-1.5">
              Funding Goal ($) *
            </label>
            <Input
              type="number"
              required
              min="1"
              step="0.01"
              value={form.funding_goal}
              onChange={(e) => updateField("funding_goal", e.target.value)}
              placeholder="100000"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-brand-text mb-1.5">
              Equity Offered (%) *
            </label>
            <Input
              type="number"
              required
              min="0.01"
              max="100"
              step="0.01"
              value={form.equity_offered}
              onChange={(e) => updateField("equity_offered", e.target.value)}
              placeholder="10"
            />
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-brand-text mb-1.5">
            Deadline *
          </label>
          <DateTimeInput
            required
            value={form.deadline}
            onChange={(e) => updateField("deadline", e.target.value)}
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
    </Modal>
  );
}
