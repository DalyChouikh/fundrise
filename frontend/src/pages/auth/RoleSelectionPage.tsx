import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, TrendingUp, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import type { UserProfile } from "@/types";

type SelectableRole = "founder" | "investor";

const ROLES = [
  {
    key: "founder" as const,
    icon: Building2,
    title: "I'm a Founder",
    description: "Launch and fund my startup",
    color: "brand-accent",
  },
  {
    key: "investor" as const,
    icon: TrendingUp,
    title: "I'm an Investor",
    description: "Discover and invest in startups",
    color: "brand-blue",
  },
];

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
      <div className="w-full max-w-[520px] animate-fade-in">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-text">
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}!
          </h1>
          <p className="text-brand-muted mt-2 text-sm">
            How would you like to use the platform?
          </p>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {ROLES.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRole(opt.key)}
                className={`group relative flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                  role === opt.key
                    ? "border-brand-accent bg-white shadow-card-hover -translate-y-0.5"
                    : "border-brand-border/20 hover:border-brand-border/40 bg-white hover:shadow-card"
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    role === opt.key
                      ? "bg-brand-accent/10 scale-110"
                      : "bg-brand-bg group-hover:bg-brand-bg/80"
                  }`}
                >
                  <opt.icon
                    className={`w-7 h-7 transition-colors ${
                      role === opt.key
                        ? "text-brand-accent"
                        : "text-brand-muted group-hover:text-brand-text"
                    }`}
                  />
                </div>
                <div className="text-center">
                  <span
                    className={`block text-sm font-bold transition-colors ${
                      role === opt.key ? "text-brand-text" : "text-brand-muted"
                    }`}
                  >
                    {opt.title}
                  </span>
                  <span className="block text-xs text-brand-muted mt-1 leading-relaxed">
                    {opt.description}
                  </span>
                </div>
                {role === opt.key && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-accent flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          <Button
            onClick={handleSubmit}
            loading={loading}
            className="w-full"
            size="lg"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
