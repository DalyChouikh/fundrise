import { useState, type FormEvent } from "react";
import { Navigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";

export function LoginPage() {
  const { session, signIn, signInWithGoogle, loading: authLoading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const redirectParam = searchParams.get("redirect");
  const from = redirectParam
    || (location.state as { from?: { pathname: string } })?.from?.pathname
    || "/dashboard";

  if (authLoading) return null;
  if (session) return <Navigate to={from} replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await signIn(email, password);
    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    const { error: authError } = await signInWithGoogle();
    if (authError) {
      setError(authError.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Logo size="lg" />
          </div>
          <p className="text-brand-muted mt-2 text-sm">
            Welcome back. Sign in to continue.
          </p>
        </div>

        <Card padding="lg">
          <div className="space-y-5">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Google Sign In */}
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
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all"
                />
              </div>

              <Button type="submit" loading={loading} className="w-full" size="lg">
                Sign in
              </Button>
            </form>
          </div>
        </Card>

        <p className="text-center text-sm text-brand-muted mt-6">
          Don&apos;t have an account?{" "}
          <Link
            to="/signup"
            className="text-brand-accent font-medium hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
