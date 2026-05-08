import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Shield, Save, Trash2, Calendar, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea } from "@/components/ui";
import { useToast } from "@/hooks/useToast";
import { AvatarUpload } from "@/components/upload/AvatarUpload";
import { PasskeyList } from "@/components/passkey/PasskeyList";
import { PasskeyConfirmDialog } from "@/components/passkey/PasskeyConfirmDialog";
import { usePasskeyStepUp } from "@/hooks/usePasskeyStepUp";

export function SettingsPage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    bio: profile?.bio || "",
    avatar_url: profile?.avatar_url || "",
  });

  const { requireStepUp, dialogProps } = usePasskeyStepUp();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch("/users/me/", form as unknown as Record<string, unknown>);
      await refreshProfile();
      toast.success("Profile updated successfully.");
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Settings</h1>
        <p className="text-brand-muted mt-1 text-sm">
          Manage your profile and account settings.
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-brand-border/[0.1]">
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
          <div>
            <label className="flex items-center gap-1.5 text-[13px] font-medium text-brand-text mb-1.5">
              <User className="w-4 h-4 text-brand-muted" />
              Full Name
            </label>
            <Input
              type="text"
              value={form.full_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, full_name: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="text-[13px] font-medium text-brand-text mb-1.5 block">
              Bio
            </label>
            <Textarea
              value={form.bio}
              onChange={(e) =>
                setForm((f) => ({ ...f, bio: e.target.value }))
              }
              placeholder="Tell us about yourself..."
              rows={3}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={saving}>
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Account Info */}
      <Card>
        <h3 className="text-base font-semibold text-brand-text mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand-muted" />
          Account Info
        </h3>
        <div className="space-y-1">
          <div className="flex items-center justify-between py-3 border-b border-brand-border/[0.08]">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand-muted" />
              <span className="text-sm text-brand-muted">Email</span>
            </div>
            <span className="text-sm font-medium text-brand-text">{profile?.email}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-brand-border/[0.08]">
            <span className="text-sm text-brand-muted">Account Type</span>
            <Badge status={profile?.role || ""} />
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-muted" />
              <span className="text-sm text-brand-muted">Member Since</span>
            </div>
            <span className="text-sm font-medium text-brand-text tabular-nums">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : "—"}
            </span>
          </div>
        </div>
      </Card>

      {/* Passkeys */}
      <Card>
        <h3 className="text-base font-semibold text-brand-text mb-1 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-brand-muted" />
          Passkeys
        </h3>
        <p className="text-sm text-brand-muted mb-4">
          Sign in with biometrics and secure sensitive actions with a hardware-backed passkey.
        </p>
        <PasskeyList onPasskeyAdded={refreshProfile} />
      </Card>

      {/* Danger Zone */}
      <Card className="!border-red-200/40">
        <h3 className="text-base font-semibold text-red-600 mb-2 flex items-center gap-2">
          <Trash2 className="w-4 h-4" />
          Danger Zone
        </h3>
        <p className="text-sm text-brand-muted mb-4 leading-relaxed">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Button
          variant="danger"
          size="sm"
          loading={deleting}
          onClick={async () => {
            const confirmed = window.confirm(
              "Are you sure you want to delete your account? This action is permanent and cannot be undone."
            );
            if (!confirmed) return;

            let token: string | null;
            try {
              token = await requireStepUp(
                "Delete Account",
                "Verify your identity with your passkey before permanently deleting your account."
              );
            } catch {
              return;
            }

            setDeleting(true);
            try {
              await api.post("/users/me/delete/", {}, { stepUpToken: token ?? undefined });
              await signOut();
              navigate("/login");
            } catch {
              setDeleting(false);
            }
          }}
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </Button>
      </Card>

      {dialogProps && <PasskeyConfirmDialog {...dialogProps} />}
    </div>
  );
}
