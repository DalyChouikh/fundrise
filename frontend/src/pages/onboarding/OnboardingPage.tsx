import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Check } from "lucide-react";

import { ProfileStep } from "./steps/ProfileStep";
import { InvestorBackgroundStep } from "./steps/InvestorBackgroundStep";
import { InvestorPreferencesStep } from "./steps/InvestorPreferencesStep";
import { InvestorAccreditationStep } from "./steps/InvestorAccreditationStep";
import { FounderStartupStep } from "./steps/FounderStartupStep";
import { FounderDetailsStep } from "./steps/FounderDetailsStep";
import { FounderPitchDeckStep } from "./steps/FounderPitchDeckStep";

const INVESTOR_STEPS = [
  { key: "profile", label: "Profile" },
  { key: "background", label: "Background" },
  { key: "preferences", label: "Preferences" },
  { key: "accreditation", label: "Accreditation" },
];

const FOUNDER_STEPS = [
  { key: "profile", label: "Profile" },
  { key: "startup", label: "Your Startup" },
  { key: "details", label: "Details" },
  { key: "pitch_deck", label: "Pitch Deck" },
];

export function OnboardingPage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isInvestor = profile?.role === "investor";
  const steps = isInvestor ? INVESTOR_STEPS : FOUNDER_STEPS;
  const isLastStep = step === steps.length - 1;

  const [data, setData] = useState({
    // Profile (shared)
    avatar_url: profile?.avatar_url || "",
    bio: profile?.bio || "",
    // Investor fields
    company: profile?.company || "",
    job_title: profile?.job_title || "",
    linkedin_url: profile?.linkedin_url || "",
    preferred_industries: [] as string[],
    check_size_min: null as number | null,
    check_size_max: null as number | null,
    preferred_stage: "",
    accreditation_status: "",
    accreditation_description: "",
    // Founder startup fields
    startup_name: "",
    startup_industry: "",
    startup_location: "",
    startup_founding_date: "",
    startup_description: "",
    startup_website: "",
    startup_logo_url: "",
    startup_pitch_deck_url: "",
  });

  const updateField = (field: string, value: unknown) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const saveInvestorStep = async (currentStep: number) => {
    if (currentStep === 0) {
      await api.patch("/users/me/", {
        avatar_url: data.avatar_url,
        bio: data.bio,
      });
    } else if (currentStep === 1) {
      await api.patch("/users/me/", {
        company: data.company,
        job_title: data.job_title,
        linkedin_url: data.linkedin_url,
      });
    } else if (currentStep === 2) {
      await api.post("/users/me/investor-profile/", {
        preferred_industries: data.preferred_industries,
        check_size_min: data.check_size_min,
        check_size_max: data.check_size_max,
        preferred_stage: data.preferred_stage,
      });
    } else if (currentStep === 3) {
      await api.post("/users/me/investor-profile/", {
        accreditation_status: data.accreditation_status,
        accreditation_description: data.accreditation_description,
      });
    }
  };

  const saveFounderStep = async (currentStep: number) => {
    if (currentStep === 0) {
      await api.patch("/users/me/", {
        avatar_url: data.avatar_url,
        bio: data.bio,
      });
    }
    // Steps 1-3: startup data is accumulated locally, saved at completion
  };

  const handleNext = async () => {
    setError("");
    setSaving(true);
    try {
      if (isInvestor) {
        await saveInvestorStep(step);
      } else {
        await saveFounderStep(step);
      }

      if (isLastStep) {
        // Create startup for founders
        if (!isInvestor) {
          const payload: Record<string, unknown> = {
            name: data.startup_name,
            description: data.startup_description,
            industry: data.startup_industry,
            location: data.startup_location,
            founding_date: data.startup_founding_date,
            website: data.startup_website,
          };
          if (data.startup_logo_url) payload.logo_url = data.startup_logo_url;
          if (data.startup_pitch_deck_url)
            payload.pitch_deck_url = data.startup_pitch_deck_url;
          await api.post("/startups/", payload);
        }
        await api.post("/users/me/complete-onboarding/", {});
        await refreshProfile();
        navigate("/dashboard", { replace: true });
      } else {
        setStep((s) => s + 1);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (isLastStep) {
      handleNext(); // still need to call complete-onboarding
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(0, s - 1));
  };

  const renderStep = () => {
    if (isInvestor) {
      switch (step) {
        case 0:
          return <ProfileStep data={data} onChange={updateField} />;
        case 1:
          return <InvestorBackgroundStep data={data} onChange={updateField} />;
        case 2:
          return <InvestorPreferencesStep data={data} onChange={updateField} />;
        case 3:
          return (
            <InvestorAccreditationStep data={data} onChange={updateField} />
          );
        default:
          return null;
      }
    } else {
      switch (step) {
        case 0:
          return <ProfileStep data={data} onChange={updateField} />;
        case 1:
          return <FounderStartupStep data={data} onChange={updateField} />;
        case 2:
          return <FounderDetailsStep data={data} onChange={updateField} />;
        case 3:
          return <FounderPitchDeckStep data={data} onChange={updateField} />;
        default:
          return null;
      }
    }
  };

  // Disable Next on founder step 1 if startup name is empty
  const isNextDisabled =
    !isInvestor && step === 1 && !data.startup_name.trim();

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[540px]">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-text">
            Complete Your Profile
          </h1>
          <p className="text-brand-muted mt-2 text-sm">
            {isInvestor
              ? "Help us match you with the right startups."
              : "Set up your profile and first startup."}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    i < step
                      ? "bg-brand-accent text-white"
                      : i === step
                        ? "bg-brand-accent text-white"
                        : "bg-brand-border/40 text-brand-muted"
                  }`}
                >
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={`text-[10px] font-medium ${
                    i <= step ? "text-brand-text" : "text-brand-muted"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-8 h-0.5 mb-4 rounded-full ${
                    i < step ? "bg-brand-accent" : "bg-brand-border/40"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card padding="lg">
          <div className="space-y-6">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            {renderStep()}

            <div className="flex items-center justify-between pt-2">
              <div>
                {step > 0 && (
                  <Button variant="ghost" onClick={handleBack}>
                    Back
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {!(!isInvestor && step === 1) && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="text-sm text-brand-muted hover:text-brand-text transition-colors"
                  >
                    Skip for now
                  </button>
                )}
                <Button
                  onClick={handleNext}
                  loading={saving}
                  disabled={isNextDisabled}
                >
                  {isLastStep ? "Complete Setup" : "Next"}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
