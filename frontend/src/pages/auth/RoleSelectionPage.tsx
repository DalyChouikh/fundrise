import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";
import type { UserProfile } from "@/types";

type SelectableRole = "founder" | "investor";

export function RoleSelectionPage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<SelectableRole>("founder");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      await api.patch<UserProfile>("/users/me/", { role });
      await refreshProfile();
      navigate("/onboarding/profile", { replace: true });
    } catch {
      setError("Failed to save your role. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[480px]">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-text">
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}!
          </h1>
          <p className="text-brand-muted mt-2 text-sm">
            How would you like to use the platform?
          </p>
        </div>

        <Card padding="lg">
          <div className="space-y-6">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole("founder")}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 ${
                  role === "founder"
                    ? "border-brand-accent bg-brand-accent/[0.04] shadow-card"
                    : "border-brand-border/50 hover:border-brand-border bg-white"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    role === "founder"
                      ? "bg-brand-accent/10"
                      : "bg-brand-bg"
                  }`}
                >
                  <Building2
                    className={`w-6 h-6 ${
                      role === "founder"
                        ? "text-brand-accent"
                        : "text-brand-muted"
                    }`}
                  />
                </div>
                <div className="text-center">
                  <span
                    className={`block text-sm font-semibold ${
                      role === "founder"
                        ? "text-brand-text"
                        : "text-brand-muted"
                    }`}
                  >
                    I'm a Founder
                  </span>
                  <span className="block text-xs text-brand-muted mt-1 leading-tight">
                    Launch and fund my startup
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole("investor")}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 ${
                  role === "investor"
                    ? "border-brand-accent bg-brand-accent/[0.04] shadow-card"
                    : "border-brand-border/50 hover:border-brand-border bg-white"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    role === "investor"
                      ? "bg-brand-accent/10"
                      : "bg-brand-bg"
                  }`}
                >
                  <TrendingUp
                    className={`w-6 h-6 ${
                      role === "investor"
                        ? "text-brand-accent"
                        : "text-brand-muted"
                    }`}
                  />
                </div>
                <div className="text-center">
                  <span
                    className={`block text-sm font-semibold ${
                      role === "investor"
                        ? "text-brand-text"
                        : "text-brand-muted"
                    }`}
                  >
                    I'm an Investor
                  </span>
                  <span className="block text-xs text-brand-muted mt-1 leading-tight">
                    Discover and invest in startups
                  </span>
                </div>
              </button>
            </div>

            <Button
              onClick={handleSubmit}
              loading={loading}
              className="w-full"
              size="lg"
            >
              Continue
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
