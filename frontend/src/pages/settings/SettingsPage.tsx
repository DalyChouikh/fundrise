import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Shield, Save, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AvatarUpload } from "@/components/upload/AvatarUpload";

export function SettingsPage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    bio: profile?.bio || "",
    avatar_url: profile?.avatar_url || "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await api.patch("/users/me/", form as unknown as Record<string, unknown>);
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Settings</h1>
        <p className="text-brand-muted mt-1 text-sm">
          Manage your profile and account settings.
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-brand-border/20">
          <AvatarUpload
            currentUrl={form.avatar_url || undefined}
            name={form.full_name || "User"}
            onUpload={(url) => setForm((f) => ({ ...f, avatar_url: url }))}
            size="lg"
          />
          <div>
            <h2 className="text-lg font-semibold text-brand-text">
              {profile?.full_name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="w-3.5 h-3.5 text-brand-muted" />
              <span className="text-sm text-brand-muted">{profile?.email}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {success && (
            <div className="px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm">
              Profile updated successfully.
            </div>
          )}

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-brand-text mb-1.5">
              <User className="w-4 h-4" />
              Full Name
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, full_name: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-brand-text mb-1.5 block">
              Bio
            </label>
            <textarea
              value={form.bio}
              onChange={(e) =>
                setForm((f) => ({ ...f, bio: e.target.value }))
              }
              placeholder="Tell us about yourself..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all resize-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={saving}>
              <Save className="w-4 h-4 mr-1.5" />
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Account Info */}
      <Card>
        <h3 className="text-base font-semibold text-brand-text mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Account Info
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-brand-muted">Email</span>
            <span className="text-sm text-brand-text">{profile?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-brand-muted">Account Type</span>
            <Badge status={profile?.role || ""} />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-brand-muted">Member Since</span>
            <span className="text-sm text-brand-text">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : "—"}
            </span>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card>
        <h3 className="text-base font-semibold text-red-500 mb-2 flex items-center gap-2">
          <Trash2 className="w-4 h-4" />
          Danger Zone
        </h3>
        <p className="text-sm text-brand-muted mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Button
          variant="secondary"
          size="sm"
          loading={deleting}
          onClick={async () => {
            const confirmed = window.confirm(
              "Are you sure you want to delete your account? This action is permanent and cannot be undone."
            );
            if (!confirmed) return;
            setDeleting(true);
            try {
              await api.post("/users/me/delete/", {});
              await signOut();
              navigate("/login");
            } catch {
              setDeleting(false);
            }
          }}
          className="!text-red-500 !border-red-200 hover:!bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          Delete Account
        </Button>
      </Card>
    </div>
  );
}
