import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle, XCircle, Mail, Users, LogIn, UserPlus, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { InvitationPublicInfo } from "@/types";

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { session, profile, loading: authLoading, refreshProfile, signOut } = useAuth();

  const [invite, setInvite] = useState<InvitationPublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState("");

  // Persist invite token so OAuth redirect can find it
  useEffect(() => {
    if (token) {
      localStorage.setItem("pendingInviteToken", token);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    api
      .getPublic<InvitationPublicInfo>(`/invitations/${token}/`)
      .then((data) => {
        setInvite(data);
        // Clean up token if invite is no longer pending
        if (data.status !== "pending") {
          localStorage.removeItem("pendingInviteToken");
        }
      })
      .catch(() => {
        setError("This invitation link is invalid or has expired.");
        localStorage.removeItem("pendingInviteToken");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setAcceptError("");
    try {
      const result = await api.post<{ startup_id: number; startup_name: string }>(
        `/invitations/${token}/accept/`,
        {}
      );
      setAccepted(true);
      localStorage.removeItem("pendingInviteToken");
      await refreshProfile();
      setTimeout(() => navigate(`/startups/${result.startup_id}`), 1500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to accept invitation.";
      try {
        const parsed = JSON.parse(message.replace(/^API Error \d+: /, ""));
        setAcceptError(parsed.detail || message);
      } catch {
        setAcceptError(message);
      }
    } finally {
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
        <div className="w-full max-w-[440px] text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
            <XCircle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-brand-text mb-2">
            Invalid Invitation
          </h2>
          <p className="text-sm text-brand-muted mb-6">{error}</p>
          <Link
            to="/login"
            className="text-brand-accent font-medium text-sm hover:underline"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!invite) return null;

  // Invite is no longer pending
  if (invite.status !== "pending") {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
        <div className="w-full max-w-[440px] text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-bg flex items-center justify-center mx-auto mb-5 border border-brand-border/60">
            {invite.status === "accepted" ? (
              <CheckCircle className="w-7 h-7 text-emerald-500" />
            ) : (
              <XCircle className="w-7 h-7 text-brand-muted" />
            )}
          </div>
          <h2 className="text-xl font-bold text-brand-text mb-2">
            Invitation {invite.status === "accepted" ? "Already Accepted" : "Cancelled"}
          </h2>
          <p className="text-sm text-brand-muted mb-6">
            {invite.status === "accepted"
              ? "This invitation has already been accepted."
              : "This invitation has been cancelled by the sender."}
          </p>
          <Link
            to="/dashboard"
            className="text-brand-accent font-medium text-sm hover:underline"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Accepted state
  if (accepted) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
        <div className="w-full max-w-[440px] text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-brand-text mb-2">
            You're in!
          </h2>
          <p className="text-sm text-brand-muted">
            You've joined <strong className="text-brand-text">{invite.startup_name}</strong> as a team member. Redirecting...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <Card padding="lg">
          <div className="text-center space-y-5">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-brand-accent/10 flex items-center justify-center mx-auto">
              <Users className="w-7 h-7 text-brand-accent" />
            </div>

            {/* Heading */}
            <div>
              <h2 className="text-xl font-bold text-brand-text mb-2">
                You've been invited!
              </h2>
              <p className="text-sm text-brand-muted leading-relaxed">
                <strong className="text-brand-text">{invite.invited_by_name}</strong> has
                invited you to join{" "}
                <strong className="text-brand-text">{invite.startup_name}</strong> as a
                team member.
              </p>
            </div>

            {/* Invite email (masked) */}
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-brand-bg border border-brand-border/40">
              <Mail className="w-4 h-4 text-brand-muted flex-shrink-0" />
              <span className="text-sm text-brand-text truncate">
                {invite.masked_email}
              </span>
            </div>

            {acceptError && (
              <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">
                {acceptError}
              </div>
            )}

            {/* Actions */}
            {session && profile ? (
              // Logged in — show accept button; backend validates email match
              <div className="space-y-3">
                <Button
                  onClick={handleAccept}
                  loading={accepting}
                  className="w-full"
                  size="lg"
                >
                  Accept Invitation
                </Button>
                <button
                  onClick={async () => {
                    await signOut();
                    navigate(`/login?redirect=/invite/${token}`);
                  }}
                  className="w-full text-xs text-brand-muted hover:text-brand-text transition-colors"
                >
                  Not {profile.email}? Sign in with a different account
                </button>
              </div>
            ) : (
              // Not logged in
              <div className="grid grid-cols-2 gap-3">
                <Link to={`/signup?invite=${token}`}>
                  <Button variant="primary" className="w-full" size="lg">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Sign Up
                  </Button>
                </Link>
                <Link to={`/login?redirect=/invite/${token}`}>
                  <Button variant="secondary" className="w-full" size="lg">
                    <LogIn className="w-4 h-4 mr-2" />
                    Log In
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>

        <p className="text-center text-xs text-brand-muted mt-6">
          This invitation was sent via Funderaise
        </p>
      </div>
    </div>
  );
}
