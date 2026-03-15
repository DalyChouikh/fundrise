import { useState, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  MapPin,
  Users,
  Heart,
  Building2,
  X,
  Search,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { Startup } from "@/types";

export function StartupsPage() {
  const { profile } = useAuth();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
      // silently fail
    }
  };

  const filtered = startups.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="space-y-6">
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
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Startup
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-brand-border/50 text-brand-muted text-sm w-full max-w-sm shadow-card focus-within:border-brand-blue/50 transition-colors">
        <Search className="w-4 h-4 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search by name or industry..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent outline-none w-full text-brand-text placeholder:text-brand-muted"
        />
      </div>

      {/* Startup grid */}
      {filtered.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-bg flex items-center justify-center mb-5">
              <Building2 className="w-7 h-7 text-brand-muted" />
            </div>
            <h2 className="text-lg font-semibold text-brand-text mb-2">
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
          {filtered.map((startup) => (
            <Link key={startup.id} to={`/startups/${startup.id}`}>
              <Card hover className="h-full">
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {startup.logo_url ? (
                        <img
                          src={startup.logo_url}
                          alt={startup.name}
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-brand-accent" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-brand-text text-sm">
                          {startup.name}
                        </h3>
                        <p className="text-xs text-brand-muted">
                          {startup.industry}
                        </p>
                      </div>
                    </div>
                    <Badge status={startup.status} />
                  </div>

                  <p className="text-sm text-brand-muted line-clamp-2 mb-4 flex-1">
                    {startup.description}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-brand-border/20">
                    <div className="flex items-center gap-4 text-xs text-brand-muted">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {startup.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {startup.members_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" />
                        {startup.followers_count}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleFollow(startup.id);
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        startup.is_following
                          ? "text-rose-500 bg-rose-50 hover:bg-rose-100"
                          : "text-brand-muted hover:text-rose-500 hover:bg-rose-50"
                      }`}
                    >
                      <Heart
                        className="w-4 h-4"
                        fill={startup.is_following ? "currentColor" : "none"}
                      />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <Avatar
                      src={startup.created_by.avatar_url || undefined}
                      name={startup.created_by.full_name}
                      size="sm"
                    />
                    <span className="text-xs text-brand-muted">
                      {startup.created_by.full_name}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    industry: "",
    location: "",
    founding_date: "",
    website: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/startups/", form);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-brand-border/20">
          <h2 className="text-lg font-bold text-brand-text">
            Create Startup
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
              Startup Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="My Awesome Startup"
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
              placeholder="Describe what your startup does..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1.5">
                Industry *
              </label>
              <input
                type="text"
                required
                value={form.industry}
                onChange={(e) => updateField("industry", e.target.value)}
                placeholder="e.g. FinTech"
                className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1.5">
                Location *
              </label>
              <input
                type="text"
                required
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
                placeholder="e.g. Tunisia"
                className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1.5">
                Founding Date *
              </label>
              <input
                type="date"
                required
                value={form.founding_date}
                onChange={(e) => updateField("founding_date", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1.5">
                Website
              </label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => updateField("website", e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Startup
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
