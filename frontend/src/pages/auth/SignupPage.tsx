import { useState, type FormEvent } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { Building2, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";

type SelectableRole = "founder" | "investor";

export function SignupPage() {
  const { session, signUp, signInWithGoogle, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SelectableRole>("founder");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (authLoading) return null;
  if (session) {
    if (inviteToken) return <Navigate to={`/invite/${inviteToken}`} replace />;
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await signUp(email, password, {
      full_name: fullName,
      role: inviteToken ? "team_member" : role,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    // Persist invite token for OAuth redirect flow
    if (inviteToken) {
      localStorage.setItem("pendingInviteToken", inviteToken);
    }
    const { error: authError } = await signInWithGoogle();
    if (authError) {
      setError(authError.message);
      setGoogleLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
        <div className="w-full max-w-[420px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-brand-text mb-2">
            Check your email
          </h2>
          <p className="text-sm text-brand-muted mb-6">
            We sent a confirmation link to <strong>{email}</strong>. Click it to
            activate your account.
            {inviteToken && (
              <span className="block mt-2">
                After confirming, sign in to accept the team invitation.
              </span>
            )}
          </p>
          <Link
            to={inviteToken ? `/login?redirect=/invite/${inviteToken}` : "/login"}
            className="text-brand-accent font-medium text-sm hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Logo size="lg" />
          </div>
          <p className="text-brand-muted mt-2 text-sm">
            Create your account to get started.
          </p>
        </div>

        <Card padding="lg">
          <div className="space-y-5">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Google Sign Up */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="flex items-center justify-center gap-3 w-full px-4 py-2.5 rounded-xl border border-brand-border/60 bg-white text-sm font-medium text-brand-text hover:bg-brand-bg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {googleLoading ? "Connecting..." : "Continue with Google"}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-brand-border/40" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-brand-muted">or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all"
                />
              </div>

            <div>
              <label className="block text-sm font-medium text-brand-text mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-text mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                minLength={6}
                className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all"
              />
            </div>

            {/* Role selector — hidden when signing up via invite */}
            {!inviteToken && (
              <div>
                <label className="block text-sm font-medium text-brand-text mb-2.5">
                  I want to
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("founder")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                      role === "founder"
                        ? "border-brand-accent bg-brand-accent/[0.04]"
                        : "border-brand-border/50 hover:border-brand-border bg-white"
                    }`}
                  >
                    <Building2
                      className={`w-6 h-6 ${
                        role === "founder"
                          ? "text-brand-accent"
                          : "text-brand-muted"
                      }`}
                    />
                    <span
                      className={`text-sm font-semibold ${
                        role === "founder"
                          ? "text-brand-text"
                          : "text-brand-muted"
                      }`}
                    >
                      Launch
                    </span>
                    <span className="text-xs text-brand-muted text-center leading-tight">
                      Fund my startup
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("investor")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                      role === "investor"
                        ? "border-brand-accent bg-brand-accent/[0.04]"
                        : "border-brand-border/50 hover:border-brand-border bg-white"
                    }`}
                  >
                    <TrendingUp
                      className={`w-6 h-6 ${
                        role === "investor"
                          ? "text-brand-accent"
                          : "text-brand-muted"
                      }`}
                    />
                    <span
                      className={`text-sm font-semibold ${
                        role === "investor"
                          ? "text-brand-text"
                          : "text-brand-muted"
                      }`}
                    >
                      Invest
                    </span>
                    <span className="text-xs text-brand-muted text-center leading-tight">
                      Discover startups
                    </span>
                  </button>
                </div>
              </div>
            )}

            {inviteToken && (
              <div className="px-4 py-3 rounded-xl bg-brand-accent/[0.06] border border-brand-accent/20 text-sm text-brand-text">
                You're signing up to join a startup as a <strong>team member</strong>.
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Create account
            </Button>
            </form>
          </div>
        </Card>

        <p className="text-center text-sm text-brand-muted mt-6">
          Already have an account?{" "}
          <Link
            to={inviteToken ? `/login?redirect=/invite/${inviteToken}` : "/login"}
            className="text-brand-accent font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
