# SP4: UI Overhaul — Design Spec

## Goal

Scale up the existing UI to feel more substantial and visually rich. The current design language (rounded-xl, soft shadows, warm palette) is good — but elements are too small, cards lack visual anchors, and the app feels spacious/empty. This overhaul enlarges everything and adds startup logos to campaign cards.

## Scope

- Frontend-only changes (except one backend serializer field)
- No structural layout changes — same grids, same columns, same page structure
- No new pages or features — purely visual scaling and card enrichment

---

## 1. Backend: Add `startup_logo_url` to Campaign API

**File:** `backend/apps/campaigns/serializers.py`

Add to `CampaignListSerializer`:
```python
startup_logo_url = serializers.URLField(source="startup.logo_url", read_only=True, default="")
```

Add `"startup_logo_url"` to `fields` list.

**File:** `frontend/src/types/index.ts`

Add `startup_logo_url: string` to the `Campaign` interface.

---

## 2. Global Scale-Up

### Typography
| Element | Before | After |
|---------|--------|-------|
| Page titles (all pages) | `text-2xl` | `text-3xl` |
| Dashboard section headings | `text-base font-semibold` | `text-lg font-semibold` |
| Card titles (startup/campaign cards) | `text-sm font-semibold` | `text-base font-semibold` |
| Dashboard stat numbers | `text-2xl font-bold` | `text-3xl font-bold` |

### Spacing
| Element | Before | After |
|---------|--------|-------|
| AppLayout main padding | `p-6 lg:p-8` | `p-6 lg:p-10` |
| ApprovalBanner margins | `mx-6 lg:mx-8` | `mx-6 lg:mx-10` |
| Startups/Campaigns/Notifications page gaps | `space-y-6` | `space-y-8` |
| Dashboards page gaps | `space-y-8` | `space-y-8` (unchanged, already correct) |
| Card default padding | `md` = `p-6` | unchanged (already `p-6`) |

### Components
| Element | Before | After |
|---------|--------|-------|
| Stat card icon containers | `p-2.5 rounded-xl` | `p-3 rounded-xl` |
| Stat card icons | `w-5 h-5` | `w-6 h-6` |
| Progress bars | `h-2` | `h-2.5` |
| Search inputs | `py-2.5 max-w-sm` | `py-3 max-w-md` |
| Search icon | `w-4 h-4` | `w-5 h-5` |
| Empty state containers (list pages) | `w-16 h-16`, icon `w-7 h-7` | `w-20 h-20`, icon `w-9 h-9` |
| Empty state containers (dashboards) | `w-12 h-12`, icon `w-5 h-5` | `w-14 h-14`, icon `w-6 h-6` |

---

## 3. Startup Card Redesign

**File:** `frontend/src/pages/startups/StartupsPage.tsx`

Changes within the existing card structure:
- Logo: `w-10 h-10 rounded-xl` → `w-12 h-12 rounded-xl`
- Fallback icon container: `w-10 h-10` → `w-12 h-12`, icon `w-5 h-5` → `w-6 h-6`
- Startup name: `text-sm font-semibold` → `text-base font-semibold`
- Industry: `text-xs` → `text-sm`
- Description spacing: `mb-4` → `mb-5`
- Stats row icons: `w-3.5 h-3.5` → `w-4 h-4`
- Page title: `text-2xl` → `text-3xl`
- Page section gap: `space-y-6` → `space-y-8`

---

## 4. Campaign Card Redesign

**File:** `frontend/src/pages/campaigns/CampaignsPage.tsx`

Currently the card header is plain text (title + startup name text + badge, no logo). Restructure to add a logo:
- New header row: flex row with startup logo (`w-10 h-10 rounded-xl`), then title/startup-name column, then badge
- Use `startup_logo_url` from API; fallback: `Building2` icon in `w-10 h-10 rounded-xl bg-brand-accent/10` container
- Campaign title: `text-sm font-semibold` → `text-base font-semibold`
- Startup name: `text-xs` → `text-sm text-brand-muted`
- Badge stays to the right of the header group
- Progress bar: `h-2` → `h-2.5`
- Page title: `text-2xl` → `text-3xl`
- Page section gap: `space-y-6` → `space-y-8`

---

## 5. Dashboard Scale-Up

**Files:** `FounderDashboard.tsx`, `InvestorDashboard.tsx`, `AdminDashboard.tsx`

### Stat Cards (all three dashboards)
- Icon containers: `p-2.5 rounded-xl` → `p-3 rounded-xl`
- Icons: `w-5 h-5` → `w-6 h-6`
- Numbers: `text-2xl font-bold` → `text-3xl font-bold`
- Labels: `text-sm` → `text-sm` (unchanged, already readable)
- Grid gap: `gap-4` → `gap-5`

### Welcome Section (all three dashboards)
- Greeting h1: `text-2xl font-bold` → `text-3xl font-bold`
- Subtitle p: no explicit text size (defaults to base) → add `text-base` explicitly (no visual change, just explicit)

### Content Sections (all three dashboards)
- Section headings: `text-base font-semibold` → `text-lg font-semibold`
- Activity/approval item padding: `p-3` → `p-3.5`
- Quick action/management link padding: already `p-3.5` → unchanged
- Empty state containers: `w-12 h-12` → `w-14 h-14`, icons `w-5 h-5` → `w-6 h-6`

### Investor Dashboard — Featured Campaigns
- Add startup logo (from `startup_logo_url`) to each featured campaign card
- Logo `w-8 h-8 rounded-lg` inline with campaign title
- Fallback: `Building2` icon in `w-8 h-8 rounded-lg bg-brand-accent/10`
- Progress bar: `h-2` → `h-2.5`

### Admin Dashboard — Pending Approvals
- User avatars: `size="sm"` (w-8) → `size="md"` (w-10)
- Startup/campaign icon containers: `w-8 h-8` → `w-10 h-10`, icons `w-4 h-4` → `w-5 h-5`
- Approve/reject button icons: `w-4 h-4` → `w-5 h-5`
- Admin stat grid: currently `lg:grid-cols-4` with 5 items (wraps) → change to `lg:grid-cols-5`

---

## 6. Other Pages

### Notifications (`NotificationsPage.tsx`)
- Page title: `text-2xl` → `text-3xl`
- Page gap: `space-y-6` → `space-y-8`
- Icon containers: `p-2 rounded-lg` → `p-2.5 rounded-xl`
- Icons: `w-4 h-4` → `w-5 h-5`
- Notification title: `text-sm` → `text-base`
- Timestamp: `text-[10px]` → `text-xs`
- Unread dot: `w-2 h-2` → `w-2.5 h-2.5`
- Empty state: `w-16 h-16` → `w-20 h-20`, icon `w-7 h-7` → `w-9 h-9`

### Search Inputs (StartupsPage, CampaignsPage)
- Padding: `py-2.5` → `py-3`
- Width: `max-w-sm` → `max-w-md`
- Search icon: `w-4 h-4` → `w-5 h-5`

### Modals (CreateStartupModal, CreateCampaignModal)
- Modal title: `text-lg font-bold` → `text-xl font-bold`
- Input fields: `py-2.5` → `py-3`
- Modal width: `max-w-lg` → `max-w-xl`

---

## Files Changed Summary

| File | Change Type |
|------|-------------|
| `backend/apps/campaigns/serializers.py` | Add `startup_logo_url` field |
| `frontend/src/types/index.ts` | Add `startup_logo_url` to Campaign |
| `frontend/src/components/layout/AppLayout.tsx` | Scale main padding + banner margins |
| `frontend/src/pages/startups/StartupsPage.tsx` | Enlarge card elements, bigger logo, scale modals |
| `frontend/src/pages/campaigns/CampaignsPage.tsx` | Add logo to cards, enlarge elements, scale modals |
| `frontend/src/pages/dashboard/FounderDashboard.tsx` | Scale stat cards, headings, items |
| `frontend/src/pages/dashboard/InvestorDashboard.tsx` | Scale stat cards, headings, add logos |
| `frontend/src/pages/dashboard/AdminDashboard.tsx` | Scale stat cards, headings, fix grid, enlarge approvals |
| `frontend/src/pages/notifications/NotificationsPage.tsx` | Scale elements |

---

## Out of Scope

- No new pages or routes
- No color palette changes
- No sidebar/topbar redesign
- No new components
- No animation additions
- No responsive breakpoint changes
- Card.tsx component unchanged (default `p-6` padding is already appropriate)
