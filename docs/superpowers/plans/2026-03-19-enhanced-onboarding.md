# Enhanced Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a multi-step onboarding wizard after role selection that collects richer profile information for investors and creates the first startup for founders.

**Architecture:** Single-page wizard at `/onboarding/profile` with local step state. Backend gets new fields on UserProfile, a new InvestorProfile model, and new API endpoints. ProtectedRoute gets an onboarding guard. Data is saved per-step for investors, accumulated and saved at completion for founder startup data.

**Tech Stack:** Django 5.1, DRF, React 18, TypeScript, TailwindCSS, SP1 upload components (AvatarUpload, LogoUpload, FileUpload)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `backend/apps/users/models.py` | Add `onboarding_completed`, `company`, `job_title`, `linkedin_url` to UserProfile; add InvestorProfile model |
| `backend/apps/users/serializers.py` | Update UserProfileSerializer fields; add InvestorProfileSerializer |
| `backend/apps/users/views.py` | Add InvestorProfileView, CompleteOnboardingView |
| `backend/apps/users/urls.py` | Add new endpoint routes |
| `backend/apps/startups/views.py` | Update InvitationAcceptView to set onboarding_completed=True |
| `frontend/src/types/index.ts` | Add InvestorProfile type, update UserProfile type |
| `frontend/src/components/layout/ProtectedRoute.tsx` | Add onboarding redirect guard |
| `frontend/src/App.tsx` | Add /onboarding/profile route |
| `frontend/src/pages/auth/RoleSelectionPage.tsx` | Redirect to /onboarding/profile instead of /dashboard |
| `frontend/src/pages/onboarding/OnboardingPage.tsx` | Wizard container: step state, progress bar, navigation, data flow |
| `frontend/src/pages/onboarding/steps/ProfileStep.tsx` | Avatar + bio (shared by both roles) |
| `frontend/src/pages/onboarding/steps/InvestorBackgroundStep.tsx` | Company, job title, LinkedIn |
| `frontend/src/pages/onboarding/steps/InvestorPreferencesStep.tsx` | Industries, check size, stage |
| `frontend/src/pages/onboarding/steps/InvestorAccreditationStep.tsx` | Accreditation status + description |
| `frontend/src/pages/onboarding/steps/FounderStartupStep.tsx` | Startup name, industry, location, date |
| `frontend/src/pages/onboarding/steps/FounderDetailsStep.tsx` | Description, website, logo |
| `frontend/src/pages/onboarding/steps/FounderPitchDeckStep.tsx` | Pitch deck upload |

---

### Task 1: Backend Model Changes + Migration

**Files:**
- Modify: `backend/apps/users/models.py`

- [ ] **Step 1: Add new fields to UserProfile and create InvestorProfile model**

Add these fields to `UserProfile` (after `role_selected`):

```python
    onboarding_completed = models.BooleanField(default=False)
    company = models.CharField(max_length=255, blank=True, default="")
    job_title = models.CharField(max_length=255, blank=True, default="")
    linkedin_url = models.URLField(max_length=500, blank=True, default="")
```

Add this new model after `UserProfile`:

```python
class InvestorProfile(TimeStampedModel):
    class PreferredStage(models.TextChoices):
        PRE_SEED = "pre_seed", "Pre-Seed"
        SEED = "seed", "Seed"
        SERIES_A = "series_a", "Series A"
        SERIES_B_PLUS = "series_b_plus", "Series B+"

    class AccreditationStatus(models.TextChoices):
        ACCREDITED = "accredited", "Accredited"
        NON_ACCREDITED = "non_accredited", "Non-Accredited"
        PREFER_NOT_TO_SAY = "prefer_not_to_say", "Prefer Not to Say"

    user = models.OneToOneField(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="investor_profile",
    )
    preferred_industries = models.JSONField(default=list, blank=True)
    check_size_min = models.IntegerField(null=True, blank=True)
    check_size_max = models.IntegerField(null=True, blank=True)
    preferred_stage = models.CharField(
        max_length=20,
        choices=PreferredStage.choices,
        blank=True,
        default="",
    )
    accreditation_status = models.CharField(
        max_length=20,
        choices=AccreditationStatus.choices,
        blank=True,
        default="",
    )
    accreditation_description = models.TextField(blank=True, default="")

    def __str__(self):
        return f"InvestorProfile({self.user.full_name})"
```

- [ ] **Step 2: Make migrations and run them**

Run: `docker compose exec django-api python manage.py makemigrations users`

Expected: Migration file created with new fields and InvestorProfile model.

Run: `docker compose exec django-api python manage.py migrate`

Expected: Migration applied successfully.

- [ ] **Step 3: Create data migration to backfill onboarding_completed for existing users**

Run: `docker compose exec django-api python manage.py makemigrations users --empty -n backfill_onboarding_completed`

Then edit the generated migration file to add:

```python
from django.db import migrations


def backfill_onboarding(apps, schema_editor):
    UserProfile = apps.get_model("users", "UserProfile")
    UserProfile.objects.filter(role_selected=True).update(onboarding_completed=True)


class Migration(migrations.Migration):

    dependencies = [
        ("users", "<previous_migration>"),  # will be auto-filled
    ]

    operations = [
        migrations.RunPython(backfill_onboarding, migrations.RunPython.noop),
    ]
```

Run: `docker compose exec django-api python manage.py migrate`

Expected: Existing users with role_selected=True now have onboarding_completed=True.

- [ ] **Step 4: Commit**

```bash
git add backend/apps/users/models.py backend/apps/users/migrations/
git commit -m "Add onboarding fields to UserProfile and InvestorProfile model"
```

---

### Task 2: Backend Serializers + Endpoints

**Files:**
- Modify: `backend/apps/users/serializers.py`
- Modify: `backend/apps/users/views.py`
- Modify: `backend/apps/users/urls.py`

- [ ] **Step 1: Update UserProfileSerializer and add InvestorProfileSerializer**

In `backend/apps/users/serializers.py`, add the new fields to `UserProfileSerializer.Meta.fields`:

```python
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "id",
            "email",
            "full_name",
            "avatar_url",
            "role",
            "bio",
            "role_selected",
            "onboarding_completed",
            "company",
            "job_title",
            "linkedin_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "email",
            "created_at",
            "updated_at",
        ]
```

Also update `AdminUserSerializer.Meta.fields` to include the same new fields.

Add `InvestorProfile` import at the top:
```python
from apps.users.models import InvestorProfile, UserProfile
```

Add new serializer at the bottom:
```python
class InvestorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvestorProfile
        fields = [
            "preferred_industries",
            "check_size_min",
            "check_size_max",
            "preferred_stage",
            "accreditation_status",
            "accreditation_description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
```

- [ ] **Step 2: Add new views**

In `backend/apps/users/views.py`, add imports and new views:

```python
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import InvestorProfile, UserProfile
from apps.users.permissions import IsAdmin
from apps.users.serializers import (
    AdminUserSerializer,
    InvestorProfileSerializer,
    UserProfileMinimalSerializer,
    UserProfileSerializer,
)
```

Add these views after the existing ones:

```python
class InvestorProfileView(APIView):
    """GET/POST /api/users/me/investor-profile/ — get or upsert investor profile."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            profile = request.user.investor_profile
        except InvestorProfile.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = InvestorProfileSerializer(profile)
        return Response(serializer.data)

    def post(self, request):
        profile, _created = InvestorProfile.objects.update_or_create(
            user=request.user,
            defaults={},
        )
        serializer = InvestorProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class CompleteOnboardingView(APIView):
    """POST /api/users/me/complete-onboarding/ — mark onboarding as done."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        request.user.onboarding_completed = True
        request.user.save(update_fields=["onboarding_completed"])
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
```

- [ ] **Step 3: Add URL routes**

In `backend/apps/users/urls.py`:

```python
from django.urls import path

from apps.users import views

urlpatterns = [
    path("me/", views.UserProfileMeView.as_view(), name="user-me"),
    path("me/investor-profile/", views.InvestorProfileView.as_view(), name="investor-profile"),
    path("me/complete-onboarding/", views.CompleteOnboardingView.as_view(), name="complete-onboarding"),
    path("search/", views.UserSearchView.as_view(), name="user-search"),
    path("", views.UserListView.as_view(), name="user-list"),
    path("<uuid:pk>/", views.UserDetailView.as_view(), name="user-detail"),
]
```

Note: `me/investor-profile/` and `me/complete-onboarding/` must come BEFORE the `<uuid:pk>/` catch-all.

- [ ] **Step 4: Verify Django starts correctly**

Run: `docker compose exec django-api python -c "import django; django.setup(); print('OK')"`

Expected: OK

- [ ] **Step 5: Commit**

```bash
git add backend/apps/users/serializers.py backend/apps/users/views.py backend/apps/users/urls.py
git commit -m "Add investor profile endpoints and complete-onboarding endpoint"
```

---

### Task 3: Update InvitationAcceptView

**Files:**
- Modify: `backend/apps/startups/views.py`

- [ ] **Step 1: Set onboarding_completed=True in InvitationAcceptView**

In `backend/apps/startups/views.py`, find this block (around lines 297-300):

```python
            if request.user.role != "team_member":
                request.user.role = "team_member"
                request.user.role_selected = True
                request.user.save(update_fields=["role", "role_selected"])
```

Replace with:

```python
            if request.user.role != "team_member":
                request.user.role = "team_member"
                request.user.role_selected = True
                request.user.onboarding_completed = True
                request.user.save(update_fields=["role", "role_selected", "onboarding_completed"])
```

Also handle the case where user is already a team_member but onboarding not completed — add after the if block:

```python
            else:
                if not request.user.onboarding_completed:
                    request.user.onboarding_completed = True
                    request.user.save(update_fields=["onboarding_completed"])
```

- [ ] **Step 2: Commit**

```bash
git add backend/apps/startups/views.py
git commit -m "Set onboarding_completed=True when accepting team invitations"
```

---

### Task 4: Frontend Type Updates

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Update UserProfile type and add InvestorProfile type**

In `frontend/src/types/index.ts`, update the `UserProfile` interface:

```typescript
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  role: UserRole;
  bio: string;
  role_selected: boolean;
  onboarding_completed: boolean;
  company: string;
  job_title: string;
  linkedin_url: string;
  created_at: string;
  updated_at: string;
}
```

Add new type after `UserProfileMinimal`:

```typescript
export interface InvestorProfile {
  preferred_industries: string[];
  check_size_min: number | null;
  check_size_max: number | null;
  preferred_stage: string;
  accreditation_status: string;
  accreditation_description: string;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `docker compose exec react-frontend npx tsc --noEmit --pretty 2>&1 | head -20`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "Add onboarding fields to UserProfile type and InvestorProfile type"
```

---

### Task 5: ProtectedRoute Onboarding Guard + Route Setup

**Files:**
- Modify: `frontend/src/components/layout/ProtectedRoute.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/auth/RoleSelectionPage.tsx`

- [ ] **Step 1: Add onboarding guard to ProtectedRoute**

In `frontend/src/components/layout/ProtectedRoute.tsx`, add the onboarding guard after the existing `role_selected` block (after the "Clean up stale invite token" block, before `return <Outlet />`):

```tsx
  // Redirect to onboarding if not completed (skip for team_members)
  if (
    profile?.role_selected &&
    !profile?.onboarding_completed &&
    profile?.role !== "team_member" &&
    location.pathname !== "/onboarding/profile"
  ) {
    return <Navigate to="/onboarding/profile" replace />;
  }
```

- [ ] **Step 2: Add onboarding route to App.tsx**

In `frontend/src/App.tsx`, add import at top:

```tsx
import { OnboardingPage } from "@/pages/onboarding/OnboardingPage";
```

Add the route inside the `<Route element={<ProtectedRoute />}>` block, after the `/onboarding/role` route and before `<Route element={<AppLayout />}>`:

```tsx
            <Route
              path="/onboarding/profile"
              element={<OnboardingPage />}
            />
```

- [ ] **Step 3: Update RoleSelectionPage to redirect to onboarding**

In `frontend/src/pages/auth/RoleSelectionPage.tsx`, change the navigate call in `handleSubmit` (line 28):

From: `navigate("/dashboard", { replace: true });`
To: `navigate("/onboarding/profile", { replace: true });`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/ProtectedRoute.tsx frontend/src/App.tsx frontend/src/pages/auth/RoleSelectionPage.tsx
git commit -m "Add onboarding route guard and redirect from role selection to onboarding"
```

Note: This will cause a compile error until OnboardingPage exists (Task 6). That's OK — commit the routing changes, the component comes next.

---

### Task 6: OnboardingPage Wizard Container

**Files:**
- Create: `frontend/src/pages/onboarding/OnboardingPage.tsx`

- [ ] **Step 1: Create the wizard container**

This is the main orchestrator — manages step state, renders the correct step component, handles navigation, progress indicator, and data submission.

```tsx
// frontend/src/pages/onboarding/OnboardingPage.tsx
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

  // Form data
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
          if (data.startup_pitch_deck_url) payload.pitch_deck_url = data.startup_pitch_deck_url;
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
          return <InvestorAccreditationStep data={data} onChange={updateField} />;
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
                {!((!isInvestor && step === 1)) && (
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
```

- [ ] **Step 2: Verify it compiles (will fail until step components exist)**

This is expected to fail — step components don't exist yet. Just create the file for now.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/onboarding/OnboardingPage.tsx
git commit -m "Add onboarding wizard container with step state and progress indicator"
```

---

### Task 7: Shared ProfileStep Component

**Files:**
- Create: `frontend/src/pages/onboarding/steps/ProfileStep.tsx`

- [ ] **Step 1: Create ProfileStep**

```tsx
// frontend/src/pages/onboarding/steps/ProfileStep.tsx
import { AvatarUpload } from "@/components/upload/AvatarUpload";

interface ProfileStepProps {
  data: { avatar_url: string; bio: string };
  onChange: (field: string, value: unknown) => void;
}

export function ProfileStep({ data, onChange }: ProfileStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center">
        <AvatarUpload
          currentUrl={data.avatar_url || undefined}
          name="User"
          onUpload={(url) => onChange("avatar_url", url)}
          size="xl"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Bio
        </label>
        <textarea
          value={data.bio}
          onChange={(e) => onChange("bio", e.target.value)}
          placeholder="Tell us a bit about yourself..."
          rows={4}
          className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all resize-none"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/onboarding/steps/ProfileStep.tsx
git commit -m "Add ProfileStep component for onboarding wizard"
```

---

### Task 8: Investor Step Components

**Files:**
- Create: `frontend/src/pages/onboarding/steps/InvestorBackgroundStep.tsx`
- Create: `frontend/src/pages/onboarding/steps/InvestorPreferencesStep.tsx`
- Create: `frontend/src/pages/onboarding/steps/InvestorAccreditationStep.tsx`

- [ ] **Step 1: Create InvestorBackgroundStep**

```tsx
// frontend/src/pages/onboarding/steps/InvestorBackgroundStep.tsx
interface InvestorBackgroundStepProps {
  data: { company: string; job_title: string; linkedin_url: string };
  onChange: (field: string, value: unknown) => void;
}

export function InvestorBackgroundStep({ data, onChange }: InvestorBackgroundStepProps) {
  const inputClass =
    "w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Company / Organization
        </label>
        <input
          type="text"
          value={data.company}
          onChange={(e) => onChange("company", e.target.value)}
          placeholder="e.g. Sequoia Capital"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Job Title
        </label>
        <input
          type="text"
          value={data.job_title}
          onChange={(e) => onChange("job_title", e.target.value)}
          placeholder="e.g. Partner, Angel Investor"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          LinkedIn Profile
        </label>
        <input
          type="url"
          value={data.linkedin_url}
          onChange={(e) => onChange("linkedin_url", e.target.value)}
          placeholder="https://linkedin.com/in/..."
          className={inputClass}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create InvestorPreferencesStep**

```tsx
// frontend/src/pages/onboarding/steps/InvestorPreferencesStep.tsx
interface InvestorPreferencesStepProps {
  data: {
    preferred_industries: string[];
    check_size_min: number | null;
    check_size_max: number | null;
    preferred_stage: string;
  };
  onChange: (field: string, value: unknown) => void;
}

const INDUSTRIES = [
  "FinTech", "HealthTech", "EdTech", "E-Commerce", "SaaS",
  "AI / ML", "CleanTech", "BioTech", "PropTech", "AgriTech",
  "Gaming", "Cybersecurity", "Social Impact", "Other",
];

const CHECK_SIZES = [
  { label: "$1K - $5K", min: 1000, max: 5000 },
  { label: "$5K - $25K", min: 5000, max: 25000 },
  { label: "$25K - $100K", min: 25000, max: 100000 },
  { label: "$100K - $500K", min: 100000, max: 500000 },
  { label: "$500K+", min: 500000, max: null },
];

const STAGES = [
  { value: "pre_seed", label: "Pre-Seed" },
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b_plus", label: "Series B+" },
];

export function InvestorPreferencesStep({ data, onChange }: InvestorPreferencesStepProps) {
  const toggleIndustry = (industry: string) => {
    const current = data.preferred_industries;
    if (current.includes(industry)) {
      onChange("preferred_industries", current.filter((i) => i !== industry));
    } else {
      onChange("preferred_industries", [...current, industry]);
    }
  };

  const selectClass =
    "w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all";

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-brand-text mb-2">
          Preferred Industries
        </label>
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map((industry) => (
            <button
              key={industry}
              type="button"
              onClick={() => toggleIndustry(industry)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                data.preferred_industries.includes(industry)
                  ? "bg-brand-accent text-white"
                  : "bg-brand-bg border border-brand-border/60 text-brand-muted hover:border-brand-accent/40"
              }`}
            >
              {industry}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Typical Check Size
        </label>
        <select
          value={
            CHECK_SIZES.find(
              (s) => s.min === data.check_size_min && s.max === data.check_size_max
            )
              ? `${data.check_size_min}-${data.check_size_max}`
              : ""
          }
          onChange={(e) => {
            const size = CHECK_SIZES.find(
              (s) => `${s.min}-${s.max}` === e.target.value
            );
            onChange("check_size_min", size?.min ?? null);
            onChange("check_size_max", size?.max ?? null);
          }}
          className={selectClass}
        >
          <option value="">Select a range...</option>
          {CHECK_SIZES.map((size) => (
            <option key={size.label} value={`${size.min}-${size.max}`}>
              {size.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Preferred Stage
        </label>
        <select
          value={data.preferred_stage}
          onChange={(e) => onChange("preferred_stage", e.target.value)}
          className={selectClass}
        >
          <option value="">Select a stage...</option>
          {STAGES.map((stage) => (
            <option key={stage.value} value={stage.value}>
              {stage.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create InvestorAccreditationStep**

```tsx
// frontend/src/pages/onboarding/steps/InvestorAccreditationStep.tsx
interface InvestorAccreditationStepProps {
  data: {
    accreditation_status: string;
    accreditation_description: string;
  };
  onChange: (field: string, value: unknown) => void;
}

const ACCREDITATION_OPTIONS = [
  { value: "accredited", label: "Accredited Investor" },
  { value: "non_accredited", label: "Non-Accredited Investor" },
  { value: "prefer_not_to_say", label: "Prefer Not to Say" },
];

export function InvestorAccreditationStep({ data, onChange }: InvestorAccreditationStepProps) {
  const inputClass =
    "w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Accreditation Status
        </label>
        <select
          value={data.accreditation_status}
          onChange={(e) => onChange("accreditation_status", e.target.value)}
          className={inputClass}
        >
          <option value="">Select status...</option>
          {ACCREDITATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-brand-muted mt-1.5">
          This is for informational purposes only and is not verified.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Additional Details
        </label>
        <textarea
          value={data.accreditation_description}
          onChange={(e) => onChange("accreditation_description", e.target.value)}
          placeholder="Optionally describe your investment experience..."
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all resize-none"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/onboarding/steps/InvestorBackgroundStep.tsx frontend/src/pages/onboarding/steps/InvestorPreferencesStep.tsx frontend/src/pages/onboarding/steps/InvestorAccreditationStep.tsx
git commit -m "Add investor onboarding step components"
```

---

### Task 9: Founder Step Components

**Files:**
- Create: `frontend/src/pages/onboarding/steps/FounderStartupStep.tsx`
- Create: `frontend/src/pages/onboarding/steps/FounderDetailsStep.tsx`
- Create: `frontend/src/pages/onboarding/steps/FounderPitchDeckStep.tsx`

- [ ] **Step 1: Create FounderStartupStep**

```tsx
// frontend/src/pages/onboarding/steps/FounderStartupStep.tsx
interface FounderStartupStepProps {
  data: {
    startup_name: string;
    startup_industry: string;
    startup_location: string;
    startup_founding_date: string;
  };
  onChange: (field: string, value: unknown) => void;
}

export function FounderStartupStep({ data, onChange }: FounderStartupStepProps) {
  const inputClass =
    "w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Startup Name *
        </label>
        <input
          type="text"
          value={data.startup_name}
          onChange={(e) => onChange("startup_name", e.target.value)}
          placeholder="My Awesome Startup"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Industry *
        </label>
        <input
          type="text"
          value={data.startup_industry}
          onChange={(e) => onChange("startup_industry", e.target.value)}
          placeholder="e.g. FinTech"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Location
        </label>
        <input
          type="text"
          value={data.startup_location}
          onChange={(e) => onChange("startup_location", e.target.value)}
          placeholder="e.g. San Francisco, CA"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Founding Date
        </label>
        <input
          type="date"
          value={data.startup_founding_date}
          onChange={(e) => onChange("startup_founding_date", e.target.value)}
          className={inputClass}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create FounderDetailsStep**

```tsx
// frontend/src/pages/onboarding/steps/FounderDetailsStep.tsx
import { LogoUpload } from "@/components/upload/LogoUpload";

interface FounderDetailsStepProps {
  data: {
    startup_description: string;
    startup_website: string;
    startup_logo_url: string;
    startup_name: string;
  };
  onChange: (field: string, value: unknown) => void;
}

export function FounderDetailsStep({ data, onChange }: FounderDetailsStepProps) {
  const inputClass =
    "w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all";

  return (
    <div className="space-y-4">
      <LogoUpload
        currentUrl={data.startup_logo_url || undefined}
        startupName={data.startup_name}
        onUpload={(url) => onChange("startup_logo_url", url)}
      />

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Description
        </label>
        <textarea
          value={data.startup_description}
          onChange={(e) => onChange("startup_description", e.target.value)}
          placeholder="Describe what your startup does..."
          rows={4}
          className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Website
        </label>
        <input
          type="url"
          value={data.startup_website}
          onChange={(e) => onChange("startup_website", e.target.value)}
          placeholder="https://..."
          className={inputClass}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create FounderPitchDeckStep**

```tsx
// frontend/src/pages/onboarding/steps/FounderPitchDeckStep.tsx
import { FileUpload } from "@/components/upload/FileUpload";

interface FounderPitchDeckStepProps {
  data: { startup_pitch_deck_url: string };
  onChange: (field: string, value: unknown) => void;
}

export function FounderPitchDeckStep({ data, onChange }: FounderPitchDeckStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-brand-muted mb-4">
          Upload your pitch deck to share with potential investors. You can always update this later.
        </p>
        <FileUpload
          bucket="documents"
          label="Pitch Deck (PDF)"
          onUpload={(url) => onChange("startup_pitch_deck_url", url)}
          existingUrl={data.startup_pitch_deck_url || undefined}
          hint="Upload your pitch deck as PDF, max 10MB"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify everything compiles**

Run: `docker compose exec react-frontend npx tsc --noEmit --pretty 2>&1 | head -30`

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/onboarding/steps/FounderStartupStep.tsx frontend/src/pages/onboarding/steps/FounderDetailsStep.tsx frontend/src/pages/onboarding/steps/FounderPitchDeckStep.tsx
git commit -m "Add founder onboarding step components"
```

---

### Task 10: End-to-End Verification

- [ ] **Step 1: Verify Django API starts and endpoints work**

Run: `docker compose exec django-api python manage.py check`

Expected: System check identified no issues.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `docker compose exec react-frontend npx tsc --noEmit --pretty 2>&1 | head -20`

Expected: No errors

- [ ] **Step 3: Manual smoke test — investor flow**

1. Create a new account with investor role
2. Should land on `/onboarding/profile` with step 1 (Profile)
3. Upload avatar, add bio, click Next
4. Step 2: fill company/title/LinkedIn, click Next
5. Step 3: select industries and preferences, click Next
6. Step 4: select accreditation, click "Complete Setup"
7. Should redirect to `/dashboard`
8. Refreshing should NOT redirect back to onboarding

- [ ] **Step 4: Manual smoke test — founder flow**

1. Create a new account with founder role
2. Should land on `/onboarding/profile` with step 1 (Profile)
3. Upload avatar, add bio, click Next
4. Step 2: enter startup name (required) + details, click Next
5. Step 3: upload logo, add description/website, click Next
6. Step 4: upload pitch deck, click "Complete Setup"
7. Should redirect to `/dashboard`
8. Startup should appear in `/startups`

- [ ] **Step 5: Verify existing users are not affected**

Log in with an existing user account. Should go directly to dashboard, NOT onboarding.

- [ ] **Step 6: Commit any fixes**

```bash
git add -u
git commit -m "Fix issues found during onboarding smoke testing"
```
