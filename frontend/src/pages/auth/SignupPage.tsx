import { useState, type FormEvent } from "react";
import { Navigate, Link } from "react-router-dom";
import { Building2, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type SelectableRole = "founder" | "investor";

export function SignupPage() {
  const { session, signUp, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SelectableRole>("founder");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (authLoading) return null;
  if (session) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await signUp(email, password, {
      full_name: fullName,
      role,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
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
          </p>
          <Link
            to="/login"
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
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-brand-accent">Funder</span>
            <span className="text-brand-text">aise</span>
          </h1>
          <p className="text-brand-muted mt-2 text-sm">
            Create your account to get started.
          </p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

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

            {/* Role selector */}
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

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Create account
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-brand-muted mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-brand-accent font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
