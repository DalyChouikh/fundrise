# Platform Enhancements — Master Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Approach:** Sequential specs — master overview + detailed SP1, remaining sub-projects detailed when started

## Context

The Funderise platform needs enhancements to feel more like a real-world crowdfunding platform. Current state: basic onboarding (name/email/password + role selection), no admin review flow, raw URL inputs instead of file uploads, stubbed search, no analytics, and a UI that feels spacious with small text.

University project — needs to look realistic but doesn't require actual legal compliance (no KYC APIs, no real accreditation verification).

## Design Decisions

- File uploads go directly to Supabase Storage from the frontend; Django stores only URLs/metadata
- All new backend models extend `TimeStampedModel`
- Pending users get limited access (can browse, can't invest or create campaigns) until admin-approved
- UI overhaul: moderate redesign of key pages (dashboards, detail pages) with richer layouts, larger fonts, but same sidebar/topbar structure
- Charts: Recharts library

## Sub-project Map

| # | Sub-project | Depends On | Key Deliverables |
|---|------------|------------|-----------------|
| 1 | Supabase Storage Upload UI | — | Reusable upload components (avatar, file, image), Supabase Storage buckets, Django signed URL endpoint |
| 2 | Enhanced Onboarding | SP1 | Multi-step onboarding wizard for investors (accreditation, preferences, background) and startups (pitch deck, team, details), avatar/doc uploads |
| 3 | Admin Review System | SP2 | Approval queue page, approve/reject with reasons, limited-access mode for pending users, email notifications |
| 4 | UI Overhaul | SP1-3 | Larger typography, richer cards, hero sections on detail pages, denser dashboards, visual stats |
| 5 | Analytics & Reporting | SP4 | Recharts dashboards — founders (campaign perf), investors (portfolio), admins (platform growth) |
| 6 | Global Search | — | Backend search endpoint (users, startups, campaigns), topbar search wired up with results dropdown |

## Sub-project 1: Supabase Storage Upload UI (Detailed)

### Supabase Storage Buckets

Three buckets (all public — acceptable for university project, simplifies architecture):
- **`avatars`** — user profile pictures (public, max 2MB, image/* only)
- **`documents`** — pitch decks, investor docs (public, max 10MB, PDF only)
- **`logos`** — startup logos (public, max 2MB, image/* only)

### Frontend Upload Components

**`FileUpload`** — generic reusable component:
- Drag-and-drop zone + click-to-browse
- File type/size validation with error messages
- Upload progress bar (using XMLHttpRequest or Supabase client progress callback)
- Preview (image thumbnail or file icon for PDFs)
- Delete/replace functionality
- Error state handling: network errors, bucket policy rejections, and storage-level size limits shown as user-friendly messages
- Props: `bucket`, `maxSize`, `acceptedTypes`, `onUpload(url)`, `existingUrl`
- Upload mechanism: uses existing Supabase JS client (`frontend/src/lib/supabase.ts`) via `supabase.storage.from(bucket).upload()`, then `getPublicUrl()` for the permanent URL

**`AvatarUpload`** — wraps FileUpload:
- Circular preview with crop indicator
- Shows current avatar or initials fallback
- Used in: onboarding, settings page, profile

**`LogoUpload`** — wraps FileUpload:
- Square/rounded preview
- Used in: startup creation/edit

### Path Strategy

All uploads use backend-generated paths to prevent collisions and unauthorized overwrites:
- Pattern: `{user_id}/{uuid}{extension}` (e.g., `a1b2c3d4/550e8400-e29b.jpg`)
- The `FileUpload` component generates this path client-side using the authenticated user's ID + a UUID
- This avoids the need for a backend endpoint just for path generation

### Backend Changes

No new models — existing URL fields on UserProfile (`avatar_url`) and Startup (`pitch_deck_url`, `logo_url`) already store the public URLs.

No new endpoints needed for upload — all public buckets use the Supabase JS client directly with the anon key (already configured in frontend).

**Settings update needed:** Add `SUPABASE_SERVICE_ROLE_KEY` to `backend/funderaise/settings.py` (already in `.env.example` but not loaded). Not needed for SP1 (public buckets), but will be needed if we ever add private buckets.

### Upload Flow

1. User selects file -> frontend validates type/size client-side
2. Frontend generates storage path: `{user_id}/{uuid}{extension}`
3. Frontend uploads directly to Supabase Storage via `supabase.storage.from(bucket).upload(path, file)`
4. On success, frontend calls `supabase.storage.from(bucket).getPublicUrl(path)` for the permanent URL
5. Frontend sends public URL to the relevant Django endpoint (profile update, startup update, etc.)
6. On failure, component shows error message and allows retry

### Files to Create

- `frontend/src/components/upload/FileUpload.tsx`
- `frontend/src/components/upload/AvatarUpload.tsx`
- `frontend/src/components/upload/LogoUpload.tsx`
- `frontend/src/lib/storage.ts` — helper for upload logic, path generation, bucket configs

### Files to Modify

- `frontend/src/pages/settings/SettingsPage.tsx` — replace avatar URL input with AvatarUpload
- `frontend/src/pages/startups/StartupsPage.tsx` — replace URL inputs with LogoUpload/FileUpload in startup creation
- `frontend/src/pages/startups/StartupDetailPage.tsx` — replace URL inputs in startup edit forms

## Sub-project 2: Enhanced Onboarding (High-level)

Multi-step onboarding wizard shown after role selection:

**Investor onboarding steps:**
1. Profile photo (AvatarUpload) + bio
2. Professional background (company, title, LinkedIn URL)
3. Investment preferences (industries, typical check size range, preferred stage)
4. Accreditation status (self-declared, dropdown selection — visual only, no real verification)

**Founder/startup onboarding steps:**
1. Profile photo (AvatarUpload) + bio
2. Startup basics (name, industry, location, founding date)
3. Startup details (description, website, logo upload)
4. Pitch deck upload (PDF via FileUpload)

New backend fields needed on UserProfile and possibly a new InvestorProfile model.

## Sub-project 3: Admin Review System (High-level)

- New `approval_status` field on UserProfile: `pending`, `approved`, `rejected`
- New `AdminReview` model in `apps/users/`: reviewer, user, status, reason, timestamp (lives in users app since it reviews user profiles)
- Admin approval queue page with filters (pending/approved/rejected)
- Approve/reject modal with reason text field
- Email notification on approval/rejection
- Frontend middleware: pending users see a banner and have action buttons disabled (invest, create campaign, etc.)

## Sub-project 4: UI Overhaul (High-level)

- Bump base font size and heading scales in Tailwind config
- Richer dashboard cards with visual stats, progress bars, mini-charts
- Hero sections on startup/campaign detail pages (cover image, logo, key stats)
- Denser grid layouts instead of sparse single-column
- Better use of the color palette (accent colors for CTAs, blue for links/info)
- Responsive improvements

## Sub-project 5: Analytics & Reporting (High-level)

Recharts-based dashboards:
- **Founder dashboard:** campaign funding progress over time, investor count, milestone completion
- **Investor dashboard:** portfolio value, investment history, returns breakdown
- **Admin dashboard:** platform growth (users over time, total funding, active campaigns), user approval stats

New backend endpoints for aggregated data.

## Sub-project 6: Global Search (High-level)

- Backend: `GET /api/search/?q=<query>` — searches across users, startups, campaigns using Django ORM `icontains`
- Frontend: wire up topbar search input with debounced API call, dropdown results grouped by type (users, startups, campaigns), click to navigate
