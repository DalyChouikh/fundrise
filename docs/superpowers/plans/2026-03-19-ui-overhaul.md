# SP4: UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scale up all UI elements (fonts, icons, spacing, cards) and add startup logos to campaign cards, making the app feel more substantial and visually rich.

**Architecture:** Purely visual changes — enlarge existing Tailwind classes across 9 files. One backend serializer field addition to expose `startup_logo_url` on campaigns. No new components, no structural layout changes.

**Tech Stack:** React 18, TypeScript, TailwindCSS 3, Django REST Framework

**Spec:** `docs/superpowers/specs/2026-03-19-ui-overhaul-design.md`

---

### Task 1: Add `startup_logo_url` to Campaign API and Frontend Type

**Files:**
- Modify: `backend/apps/campaigns/serializers.py:8-20`
- Modify: `frontend/src/types/index.ts:79-93`

- [ ] **Step 1: Add `startup_logo_url` field to `CampaignListSerializer`**

In `backend/apps/campaigns/serializers.py`, add the field declaration after line 8 (before `class Meta`):

```python
class CampaignListSerializer(serializers.ModelSerializer):
    startup_name = serializers.CharField(source="startup.name", read_only=True)
    startup_logo_url = serializers.URLField(source="startup.logo_url", read_only=True, default="")
    funding_percentage = serializers.ReadOnlyField()
```

And add `"startup_logo_url"` to the `fields` list:

```python
fields = [
    "id", "title", "description", "startup", "startup_name", "startup_logo_url",
    "funding_goal", "current_funding", "funding_percentage",
    "equity_offered", "deadline", "status",
    "created_at", "updated_at",
]
```

- [ ] **Step 2: Add `startup_logo_url` to the frontend `Campaign` interface**

In `frontend/src/types/index.ts`, add the field to the `Campaign` interface after `startup_name`:

```typescript
export interface Campaign {
  id: number;
  startup: number;
  startup_name: string;
  startup_logo_url: string;
  title: string;
  // ... rest unchanged
}
```

- [ ] **Step 3: Verify backend starts**

Run: `docker compose exec django-api python manage.py check`
Expected: `System check identified no issues.`

- [ ] **Step 4: Verify frontend compiles**

Run: `docker compose exec react-frontend npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add backend/apps/campaigns/serializers.py frontend/src/types/index.ts
git commit -m "Add startup_logo_url to campaign API and frontend type"
```

---

### Task 2: Scale AppLayout Padding and Banner Margins

**Files:**
- Modify: `frontend/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Update main content padding**

In `AppLayout.tsx` line 53, change:
```tsx
<main className="p-6 lg:p-8">
```
to:
```tsx
<main className="p-6 lg:p-10">
```

- [ ] **Step 2: Update ApprovalBanner margins**

In `AppLayout.tsx` line 16, change:
```tsx
<div className="mx-6 lg:mx-8 mt-6 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
```
to:
```tsx
<div className="mx-6 lg:mx-10 mt-6 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
```

In `AppLayout.tsx` line 28, change:
```tsx
<div className="mx-6 lg:mx-8 mt-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
```
to:
```tsx
<div className="mx-6 lg:mx-10 mt-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/AppLayout.tsx
git commit -m "Scale AppLayout main padding and approval banner margins"
```

---

### Task 3: Scale Up StartupsPage — Cards, Search, Modal, Empty State

**Files:**
- Modify: `frontend/src/pages/startups/StartupsPage.tsx`

All changes are class string replacements within this single file:

- [ ] **Step 1: Scale page-level elements**

Line 113: `space-y-6` → `space-y-8`
Line 116: `text-2xl` → `text-3xl`

- [ ] **Step 2: Scale search input**

Line 140: `py-2.5` → `py-3`, `max-w-sm` → `max-w-md`
Line 141: `w-4 h-4` → `w-5 h-5`

- [ ] **Step 3: Scale empty state**

Line 155: `w-16 h-16` → `w-20 h-20`
Line 156: `w-7 h-7` → `w-9 h-9`

- [ ] **Step 4: Scale startup card elements**

Line 182 (logo img): `w-10 h-10` → `w-12 h-12`
Line 185 (fallback container): `w-10 h-10` → `w-12 h-12`
Line 186 (fallback icon): `w-5 h-5` → `w-6 h-6`
Line 190 (name): `text-sm` → `text-base` (keep `font-semibold`)
Line 193 (industry): `text-xs` → `text-sm`
Line 201 (description): `mb-4` → `mb-5`
Line 208 (MapPin): `w-3.5 h-3.5` → `w-4 h-4`
Line 212 (Users): `w-3.5 h-3.5` → `w-4 h-4`
Line 216 (Heart): `w-3.5 h-3.5` → `w-4 h-4`

- [ ] **Step 5: Scale modal**

Line 339: `max-w-lg` → `max-w-xl`
Line 341: `text-lg` → `text-xl`
All `py-2.5` in input classNames within the modal → `py-3` (lines 374, 388, 403, 416, 431, 443)

- [ ] **Step 6: Verify frontend compiles**

Run: `docker compose exec react-frontend npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/startups/StartupsPage.tsx
git commit -m "Scale up StartupsPage cards, search, modal, and empty state"
```

---

### Task 4: Redesign CampaignsPage — Add Logo to Cards, Scale Up, Scale Modal

**Files:**
- Modify: `frontend/src/pages/campaigns/CampaignsPage.tsx`

- [ ] **Step 1: Add Building2 import**

Line 3 — ensure `Building2` is in the import list from lucide-react. Current imports are: `Plus, Target, Search, X, Calendar, CheckCircle2, XCircle`. Add `Building2`:

```tsx
import { Plus, Target, Search, X, Calendar, CheckCircle2, XCircle, Building2 } from "lucide-react";
```

- [ ] **Step 2: Scale page-level elements**

Line 84: `space-y-6` → `space-y-8`
Line 87: `text-2xl` → `text-3xl`

- [ ] **Step 3: Scale search input**

Line 111: `py-2.5` → `py-3`, `max-w-sm` → `max-w-md`
Line 112: `w-4 h-4` → `w-5 h-5`

- [ ] **Step 4: Scale empty state**

Line 125: `w-16 h-16` → `w-20 h-20`
Line 126: `w-7 h-7` → `w-9 h-9`

- [ ] **Step 5: Redesign campaign card header to include startup logo**

Replace the current card header (lines 146–156) from:

```tsx
<div className="flex items-start justify-between mb-2">
  <div>
    <h3 className="font-semibold text-brand-text text-sm">
      {campaign.title}
    </h3>
    <p className="text-xs text-brand-muted mt-0.5">
      {campaign.startup_name}
    </p>
  </div>
  <Badge status={campaign.status} />
</div>
```

to:

```tsx
<div className="flex items-start justify-between mb-3">
  <div className="flex items-center gap-3">
    {campaign.startup_logo_url ? (
      <img
        src={campaign.startup_logo_url}
        alt={campaign.startup_name}
        className="w-10 h-10 rounded-xl object-cover"
      />
    ) : (
      <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
        <Building2 className="w-5 h-5 text-brand-accent" />
      </div>
    )}
    <div>
      <h3 className="font-semibold text-brand-text text-base">
        {campaign.title}
      </h3>
      <p className="text-sm text-brand-muted mt-0.5">
        {campaign.startup_name}
      </p>
    </div>
  </div>
  <Badge status={campaign.status} />
</div>
```

- [ ] **Step 6: Scale progress bar**

Line 172: `h-2` → `h-2.5`

- [ ] **Step 7: Scale modal**

Line 298: `max-w-lg` → `max-w-xl`
Line 300: `text-lg` → `text-xl`
All `py-2.5` in input/select/textarea classNames within the modal → `py-3` (lines 332, 354, 368, 385, 401, 415)

- [ ] **Step 8: Verify frontend compiles**

Run: `docker compose exec react-frontend npx tsc --noEmit`
Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/campaigns/CampaignsPage.tsx
git commit -m "Add startup logo to campaign cards and scale up CampaignsPage"
```

---

### Task 5: Scale Up FounderDashboard

**Files:**
- Modify: `frontend/src/pages/dashboard/FounderDashboard.tsx`

- [ ] **Step 1: Scale welcome section**

Line 86: `text-2xl` → `text-3xl`
Line 89: add `text-base` class → `<p className="text-base text-brand-muted mt-1">`

- [ ] **Step 2: Scale stat cards**

Line 95: `gap-4` → `gap-5`
Line 101: `text-2xl` → `text-3xl`
Line 105: `p-2.5` → `p-3`
Line 106: `w-5 h-5` → `w-6 h-6`

- [ ] **Step 3: Scale content section headings and items**

Line 117: `text-base` → `text-lg`
Line 184: `text-base` → `text-lg`

Activity items padding:
Line 137: `p-3` → `p-3.5`
Line 159: `p-3` → `p-3.5`

Empty state container:
Line 123: `w-12 h-12` → `w-14 h-14`
Line 124: `w-5 h-5` → `w-6 h-6`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/dashboard/FounderDashboard.tsx
git commit -m "Scale up FounderDashboard stat cards, headings, and items"
```

---

### Task 6: Scale Up InvestorDashboard and Add Logos to Featured Campaigns

**Files:**
- Modify: `frontend/src/pages/dashboard/InvestorDashboard.tsx`

- [ ] **Step 1: Add Building2 import**

Line 3: Add `Building2` to the lucide-react imports:
```tsx
import { Wallet, TrendingUp, Heart, DollarSign, Building2 } from "lucide-react";
```

- [ ] **Step 2: Scale welcome section**

Line 64: `text-2xl` → `text-3xl`
Line 67: add `text-base` class → `<p className="text-base text-brand-muted mt-1">`

- [ ] **Step 3: Scale stat cards**

Line 73: `gap-4` → `gap-5`
Line 79: `text-2xl` → `text-3xl`
Line 83: `p-2.5` → `p-3`
Line 84: `w-5 h-5` → `w-6 h-6`

- [ ] **Step 4: Scale section headings**

Line 94: `text-base` → `text-lg`
Line 142: `text-base` → `text-lg`

- [ ] **Step 5: Scale empty states**

Line 99 (featured campaigns empty): `w-12 h-12` → `w-14 h-14`
Line 100: `w-5 h-5` → `w-6 h-6`
Line 147 (investments empty): `w-12 h-12` → `w-14 h-14`
Line 148: `w-5 h-5` → `w-6 h-6`

- [ ] **Step 6: Add startup logo to featured campaign cards and scale progress bar**

Replace the featured campaign card content (lines 114–134). The current card interior:

```tsx
<div className="flex items-center justify-between mb-2">
  <h4 className="text-sm font-semibold text-brand-text">
    {c.title}
  </h4>
  <span className="text-xs text-brand-muted">
    {c.startup_name}
  </span>
</div>
<div className="w-full h-2 rounded-full bg-brand-bg overflow-hidden">
```

Replace with:

```tsx
<div className="flex items-center gap-2.5 mb-2">
  {c.startup_logo_url ? (
    <img
      src={c.startup_logo_url}
      alt={c.startup_name}
      className="w-8 h-8 rounded-lg object-cover"
    />
  ) : (
    <div className="w-8 h-8 rounded-lg bg-brand-accent/10 flex items-center justify-center">
      <Building2 className="w-4 h-4 text-brand-accent" />
    </div>
  )}
  <div className="flex-1 min-w-0">
    <h4 className="text-sm font-semibold text-brand-text truncate">
      {c.title}
    </h4>
    <span className="text-xs text-brand-muted">
      {c.startup_name}
    </span>
  </div>
</div>
<div className="w-full h-2.5 rounded-full bg-brand-bg overflow-hidden">
```

- [ ] **Step 7: Scale investment item padding**

Line 161: `p-3` → `p-3.5`

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/dashboard/InvestorDashboard.tsx
git commit -m "Scale up InvestorDashboard and add logos to featured campaigns"
```

---

### Task 7: Scale Up AdminDashboard — Stats Grid, Approvals, Headings

**Files:**
- Modify: `frontend/src/pages/dashboard/AdminDashboard.tsx`

- [ ] **Step 1: Scale welcome section**

Line 142: `text-2xl` → `text-3xl`
Line 143: add `text-base` class → `<p className="text-base text-brand-muted mt-1">`

- [ ] **Step 2: Fix stat grid and scale stat cards**

Line 149: `lg:grid-cols-4 gap-4` → `lg:grid-cols-5 gap-5`
Line 155: `text-2xl` → `text-3xl`
Line 159: `p-2.5` → `p-3`
Line 160: `w-5 h-5` → `w-6 h-6`

- [ ] **Step 3: Scale section headings**

Line 171: `text-base` → `text-lg`
Line 314: `text-base` → `text-lg`

- [ ] **Step 4: Scale empty state**

Line 182: `w-12 h-12` → `w-14 h-14`
Line 183: `w-5 h-5` → `w-6 h-6`

- [ ] **Step 5: Scale pending approval items**

User items — line 195: `p-3` → `p-3.5`
User avatar — line 201: `size="sm"` → `size="md"`
Approve/reject buttons — line 218: `w-4 h-4` → `w-5 h-5`, line 225: `w-4 h-4` → `w-5 h-5`

Startup items — line 234: `p-3` → `p-3.5`
Startup icon container — line 237: `w-8 h-8` → `w-10 h-10`
Startup icon — line 238: `w-4 h-4` → `w-5 h-5`
Startup approve/reject — line 252: `w-4 h-4` → `w-5 h-5`, line 259: `w-4 h-4` → `w-5 h-5`

Campaign items — line 271: `p-3` → `p-3.5`
Campaign icon container — line 275: `w-8 h-8` → `w-10 h-10`
Campaign icon — line 276: `w-4 h-4` → `w-5 h-5`
Campaign approve/reject — line 292: `w-4 h-4` → `w-5 h-5`, line 299: `w-4 h-4` → `w-5 h-5`

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/dashboard/AdminDashboard.tsx
git commit -m "Scale up AdminDashboard stats grid, headings, and approval items"
```

---

### Task 8: Scale Up NotificationsPage

**Files:**
- Modify: `frontend/src/pages/notifications/NotificationsPage.tsx`

- [ ] **Step 1: Scale page-level elements**

Line 83: `space-y-6` → `space-y-8`
Line 86: `text-2xl` → `text-3xl`

- [ ] **Step 2: Scale empty state**

Line 104: `w-16 h-16` → `w-20 h-20`
Line 105: `w-7 h-7` → `w-9 h-9`

- [ ] **Step 3: Scale notification items**

Icon container — line 140: `p-2 rounded-lg` → `p-2.5 rounded-xl`
Icon — line 142: `w-4 h-4` → `w-5 h-5`
Title — line 147: `text-sm` → `text-base` (both read and unread variants on same line)
Unread dot — line 156: `w-2 h-2` → `w-2.5 h-2.5`
Timestamp — line 162: `text-[10px]` → `text-xs`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/notifications/NotificationsPage.tsx
git commit -m "Scale up NotificationsPage elements"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run Django check**

Run: `docker compose exec django-api python manage.py check`
Expected: `System check identified no issues.`

- [ ] **Step 2: Run TypeScript check**

Run: `docker compose exec react-frontend npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Verify all files committed**

Run: `git status`
Expected: working tree clean
