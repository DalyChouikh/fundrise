import { useState, useEffect, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Plus,
  Building2,
  Search,
  SlidersHorizontal,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Combobox } from "@/components/ui/Combobox";
import { FilterDrawer } from "@/components/ui/FilterDrawer";
import { useIndustries } from "@/hooks/useIndustries";
import type { Startup } from "@/types";
import { LogoUpload } from "@/components/upload/LogoUpload";
import { FileUpload } from "@/components/upload/FileUpload";
import { Input, Textarea, DateInput, Alert, Modal } from "@/components/ui";
import { useToast } from "@/hooks/useToast";
import { StartupCard } from "@/components/startups/StartupCard";

export function StartupsPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    industries: [] as string[],
    status: "",
    location: "",
  });
  const { industries: industryOptions } = useIndustries();

  // Auto-open create modal via ?action=create
  useEffect(() => {
    if (searchParams.get("action") === "create" && profile?.role === "founder") {
      setShowCreate(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, profile, setSearchParams]);

  const fetchStartups = async () => {
    try {
      const data = await api.get<Startup[]>("/startups/");
      setStartups(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStartups();
  }, []);

  const handleFollow = async (startupId: number) => {
    try {
      const res = await api.post<{ following: boolean }>(
        `/startups/${startupId}/follow/`,
        {}
      );
      setStartups((prev) =>
        prev.map((s) =>
          s.id === startupId
            ? {
                ...s,
                is_following: res.following,
                followers_count: s.followers_count + (res.following ? 1 : -1),
              }
            : s
        )
      );
    } catch {
      toast.error("Failed to update follow status.");
    }
  };

  const handleApprove = async (startupId: number) => {
    try {
      await api.post(`/startups/${startupId}/approve/`, {});
      setStartups((prev) =>
        prev.map((s) =>
          s.id === startupId ? { ...s, status: "active" as const } : s
        )
      );
    } catch {
      // silently fail
    }
  };

  const handleReject = async (startupId: number) => {
    try {
      await api.post(`/startups/${startupId}/reject/`, {});
      setStartups((prev) =>
        prev.map((s) =>
          s.id === startupId ? { ...s, status: "suspended" as const } : s
        )
      );
    } catch {
      // silently fail
    }
  };

  const filtered = startups
    .filter((s) =>
      !filters.industries.length || filters.industries.includes(s.industry)
    )
    .filter((s) => !filters.status || s.status === filters.status)
    .filter(
      (s) =>
        !filters.location ||
        s.location.toLowerCase().includes(filters.location.toLowerCase())
    )
    .filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.industry.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const activeFilterCount =
    filters.industries.length +
    (filters.status ? 1 : 0) +
    (filters.location ? 1 : 0);

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Startups</h1>
          <p className="text-brand-muted mt-1 text-sm">
            {profile?.role === "founder"
              ? "Manage your startups or browse others."
              : "Discover promising startups to invest in."}
          </p>
        </div>
        {profile?.role === "founder" && (
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
            New Startup
          </Button>
        )}
      </div>

      {/* Search + Filters row */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-brand-border/30 text-brand-muted text-sm flex-1 max-w-sm shadow-sm focus-within:border-brand-blue/40 focus-within:ring-2 focus-within:ring-brand-blue/10 transition-all">
          <Search className="w-4 h-4 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by name or industry..."
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
            <span
              key={ind}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/[0.08] text-brand-accent text-xs font-medium"
            >
              {ind}
              <button
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    industries: f.industries.filter((i) => i !== ind),
                  }))
                }
                className="hover:text-brand-accent/60 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {filters.status && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/[0.08] text-brand-accent text-xs font-medium">
              {filters.status.replace("_", " ")}
              <button
                onClick={() => setFilters((f) => ({ ...f, status: "" }))}
                className="hover:text-brand-accent/60 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.location && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/[0.08] text-brand-accent text-xs font-medium">
              {filters.location}
              <button
                onClick={() => setFilters((f) => ({ ...f, location: "" }))}
                className="hover:text-brand-accent/60 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Startup grid */}
      {filtered.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-bg flex items-center justify-center mb-4">
              <Building2 className="w-7 h-7 text-brand-muted" />
            </div>
            <h2 className="text-base font-semibold text-brand-text mb-1">
              {searchQuery ? "No matches found" : "No startups yet"}
            </h2>
            <p className="text-sm text-brand-muted max-w-md">
              {searchQuery
                ? "Try a different search term."
                : profile?.role === "founder"
                  ? "Create your first startup to get started."
                  : "Check back soon for new startups."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((startup, i) => (
            <Link key={startup.id} to={`/startups/${startup.id}`}>
              <StartupCard
                startup={startup}
                hover
                onFollow={handleFollow}
                showAdminActions={profile?.role === "admin"}
                onApprove={handleApprove}
                onReject={handleReject}
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
              />
            </Link>
          ))}
        </div>
      )}

      {/* Filter Drawer */}
      <FilterDrawer
        open={showFilters}
        onClose={() => setShowFilters(false)}
        activeCount={activeFilterCount}
        onClear={() => setFilters({ industries: [], status: "", location: "" })}
      >
        {/* Industry filter */}
        <div>
          <p className="text-[13px] font-semibold text-brand-text mb-3">Industry</p>
          <div className="space-y-2">
            {industryOptions.map((ind) => {
              const checked = filters.industries.includes(ind);
              return (
                <label key={ind} className="flex items-center gap-2.5 cursor-pointer group">
                  <div
                    className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                      checked
                        ? "border-brand-accent bg-brand-accent"
                        : "border-brand-border group-hover:border-brand-accent/60"
                    )}
                  >
                    {checked && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="text-sm text-brand-text">{ind}</span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() =>
                      setFilters((f) => ({
                        ...f,
                        industries: checked
                          ? f.industries.filter((i) => i !== ind)
                          : [...f.industries, ind],
                      }))
                    }
                  />
                </label>
              );
            })}
          </div>
        </div>

        {/* Status filter */}
        <div>
          <p className="text-[13px] font-semibold text-brand-text mb-3">Status</p>
          <div className="space-y-2">
            {[
              { value: "", label: "All" },
              { value: "active", label: "Active" },
              { value: "pending_approval", label: "Pending approval" },
              { value: "suspended", label: "Suspended" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                    filters.status === opt.value
                      ? "border-brand-accent bg-brand-accent"
                      : "border-brand-border group-hover:border-brand-accent/60"
                  )}
                >
                  {filters.status === opt.value && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <span className="text-sm text-brand-text">{opt.label}</span>
                <input
                  type="radio"
                  className="sr-only"
                  checked={filters.status === opt.value}
                  onChange={() => setFilters((f) => ({ ...f, status: opt.value }))}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Location filter */}
        <div>
          <p className="text-[13px] font-semibold text-brand-text mb-3">Location</p>
          <input
            type="text"
            value={filters.location}
            onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
            placeholder="e.g. Tunisia"
            className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-border/30 text-brand-text placeholder:text-brand-muted/60 text-sm outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all shadow-sm"
          />
        </div>
      </FilterDrawer>

      {/* Create Startup Modal */}
      {showCreate && (
        <CreateStartupModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchStartups();
          }}
        />
      )}
    </div>
  );
}

function CreateStartupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { industries, loading: industriesLoading } = useIndustries();
  const [form, setForm] = useState({
    name: "",
    description: "",
    industry: "",
    location: "",
    founding_date: "",
    website: "",
    logo_url: "",
    pitch_deck_url: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload: Record<string, unknown> = { ...form };
      if (!payload.logo_url) delete payload.logo_url;
      if (!payload.pitch_deck_url) delete payload.pitch_deck_url;
      await api.post("/startups/", payload);
      toast.success("Startup created successfully.");
      onCreated();
    } catch {
      setError("Failed to create startup. Please check your inputs.");
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Modal open={true} onClose={onClose} title="Create Startup">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <LogoUpload
          startupName={form.name}
          onUpload={(url) => updateField("logo_url", url)}
        />

        <div>
          <label className="block text-[13px] font-medium text-brand-text mb-1.5">
            Startup Name *
          </label>
          <Input
            type="text"
            required
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="My Awesome Startup"
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
            placeholder="Describe what your startup does..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-brand-text mb-1.5">
              Industry *
            </label>
            <Combobox
              options={industries}
              value={form.industry}
              onChange={(val) => updateField("industry", val)}
              placeholder="e.g. FinTech"
              loading={industriesLoading}
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-brand-text mb-1.5">
              Location *
            </label>
            <Input
              type="text"
              required
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="e.g. Tunisia"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-brand-text mb-1.5">
              Founding Date *
            </label>
            <DateInput
              required
              value={form.founding_date}
              onChange={(e) => updateField("founding_date", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-brand-text mb-1.5">
              Website
            </label>
            <Input
              type="url"
              value={form.website}
              onChange={(e) => updateField("website", e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <FileUpload
          bucket="documents"
          label="Pitch Deck (PDF)"
          onUpload={(url) => updateField("pitch_deck_url", url)}
          hint="Upload your pitch deck as PDF, max 10MB"
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Startup
          </Button>
        </div>
      </form>
    </Modal>
  );
}
