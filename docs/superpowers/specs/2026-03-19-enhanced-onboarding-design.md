# SP2: Enhanced Onboarding — Detailed Design Spec

**Date:** 2026-03-19
**Status:** Approved
**Depends on:** SP1 (Supabase Storage Upload UI) — completed

## Context

After signup and role selection, users currently land directly on the dashboard with minimal profile info (just name/email). This doesn't feel realistic. SP2 adds a multi-step onboarding wizard that collects richer profile information before users reach the dashboard.

University project — fields look realistic but no actual verification (no KYC, no real accreditation checks).

## Flow

**Current:** Signup → Role Selection → Dashboard
**New:** Signup → Role Selection → Onboarding Wizard → Dashboard

Route guard logic (in `ProtectedRoute`, not AuthContext — follows existing pattern):
- `profile.role_selected === false` AND `location.pathname !== "/onboarding/role"` → redirect to `/onboarding/role`
- `profile.role_selected === true` AND `profile.onboarding_completed === false` AND `profile.role !== "team_member"` AND `location.pathname !== "/onboarding/profile"` → redirect to `/onboarding/profile`
- Otherwise → allow access to dashboard/app

**Team members** skip onboarding entirely — the `InvitationAcceptView` must set `onboarding_completed=True` alongside `role_selected=True` when accepting an invite.

**Existing users migration:** A data migration must backfill `onboarding_completed=True` for all users where `role_selected=True`, so existing users are not force-redirected into onboarding.

## Onboarding Steps

### Investor (4 steps)

1. **Profile** — Avatar (AvatarUpload) + bio textarea
2. **Background** — Company/organization, job title, LinkedIn URL
3. **Preferences** — Preferred industries (multi-select), check size range (dropdown), preferred stage (dropdown)
4. **Accreditation** — Self-declared status (dropdown) + brief description field

### Founder (4 steps)

1. **Profile** — Avatar (AvatarUpload) + bio textarea
2. **Your Startup** — Name, industry, location, founding date
3. **Startup Details** — Description, website, logo (LogoUpload)
4. **Pitch Deck** — Pitch deck upload (FileUpload for PDF)

### Navigation

- Each step has Back/Next buttons
- Step 1 has no Back button
- Last step shows "Complete Setup" instead of Next
- "Skip for now" link on each step (except founder step 2 — startup name is required)
- Progress indicator shows current step out of total

Note: Founder onboarding creates the first startup. Additional startups can be created later via the existing "New Startup" modal.

## Backend Changes

### New fields on UserProfile (`apps/users/models.py`)

- `onboarding_completed` (BooleanField, default=False)
- `company` (CharField, max_length=255, blank=True, default="")
- `job_title` (CharField, max_length=255, blank=True, default="")
- `linkedin_url` (URLField, blank=True, default="")

### New model: InvestorProfile (`apps/users/models.py`)

Extends `TimeStampedModel`. OneToOneField to UserProfile.

Fields:
- `user` (OneToOneField to UserProfile, related_name="investor_profile", on_delete=CASCADE)
- `preferred_industries` (JSONField, default=list, blank=True) — list of industry strings
- `check_size_min` (IntegerField, null=True, blank=True) — minimum check size in dollars
- `check_size_max` (IntegerField, null=True, blank=True) — maximum check size in dollars
- `preferred_stage` (CharField, max_length=20, choices: pre_seed/seed/series_a/series_b_plus, blank=True, default="")
- `accreditation_status` (CharField, max_length=20, choices: accredited/non_accredited/prefer_not_to_say, blank=True, default="")
- `accreditation_description` (TextField, blank=True, default="")

### New/Updated API Endpoints

**Updated:** `PATCH /api/users/me/` — already exists, serializer updated to accept new UserProfile fields (company, job_title, linkedin_url, onboarding_completed)

**New:** `GET /api/users/me/investor-profile/` — returns investor profile or 404
**New:** `POST /api/users/me/investor-profile/` — create or update investor profile (upsert via `update_or_create`)
**New:** `POST /api/users/me/complete-onboarding/` — sets `onboarding_completed=True`, returns updated profile

Founder startup creation reuses existing `POST /api/startups/` endpoint.

## Frontend Changes

### New Files

- `frontend/src/pages/onboarding/OnboardingPage.tsx` — wizard container with step state, progress bar, navigation
- `frontend/src/pages/onboarding/steps/ProfileStep.tsx` — avatar + bio (shared by both roles)
- `frontend/src/pages/onboarding/steps/InvestorBackgroundStep.tsx` — company, title, LinkedIn
- `frontend/src/pages/onboarding/steps/InvestorPreferencesStep.tsx` — industries, check size, stage
- `frontend/src/pages/onboarding/steps/InvestorAccreditationStep.tsx` — accreditation status + description
- `frontend/src/pages/onboarding/steps/FounderStartupStep.tsx` — startup name, industry, location, date
- `frontend/src/pages/onboarding/steps/FounderDetailsStep.tsx` — description, website, logo upload
- `frontend/src/pages/onboarding/steps/FounderPitchDeckStep.tsx` — pitch deck PDF upload

### Modified Files

- `frontend/src/types/index.ts` — add `InvestorProfile` type, add new fields to `UserProfile` type
- `frontend/src/pages/auth/RoleSelectionPage.tsx` — navigate to `/onboarding/profile` instead of `/dashboard`
- `frontend/src/App.tsx` — add `/onboarding/profile` route (protected, outside AppLayout)
- `frontend/src/components/layout/ProtectedRoute.tsx` — add onboarding guard (with pathname exemption to avoid redirect loop)
- `backend/apps/startups/views.py` — `InvitationAcceptView` must set `onboarding_completed=True` on the user

### Wizard Data Flow

- `OnboardingPage` holds all form data in a single state object
- Each step receives its slice of the data + an `onChange` callback
- **Investor flow:** On "Next", data for that step is sent to the backend immediately:
  - Step 1 (Profile): `PATCH /api/users/me/` with avatar_url + bio
  - Step 2 (Background): `PATCH /api/users/me/` with company + job_title + linkedin_url
  - Step 3 (Preferences): `POST /api/users/me/investor-profile/` with industries + check size + stage
  - Step 4 (Accreditation): `POST /api/users/me/investor-profile/` with accreditation fields (upsert)
- **Founder flow:** Profile is saved per-step, but startup data is accumulated and created at the end:
  - Step 1 (Profile): `PATCH /api/users/me/` with avatar_url + bio
  - Steps 2-4 (Startup data): accumulated in local state only (name, industry, location, date, description, website, logo_url, pitch_deck_url)
  - On "Complete Setup": `POST /api/startups/` with all accumulated startup data, then `POST /api/users/me/complete-onboarding/`
- On "Complete Setup" (both flows), calls `POST /api/users/me/complete-onboarding/` then redirects to `/dashboard`
- "Skip for now" advances to next step without sending data

### Step Component Interface

Each step component follows a consistent interface:
```typescript
interface StepProps {
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
}
```

### Progress Indicator

Horizontal step indicator at the top of the wizard showing:
- Step numbers (1-4)
- Current step highlighted
- Step labels (e.g., "Profile", "Background", "Preferences", "Accreditation")
- Completed steps show a checkmark

### UI Style

- Full-screen centered layout (same as RoleSelectionPage)
- Logo at top
- Card containing the step content
- Matches existing auth page styling (rounded-xl, brand colors, soft shadows)
