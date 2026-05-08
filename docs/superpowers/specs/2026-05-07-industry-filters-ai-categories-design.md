# Spec 2: Industry System + Filter Drawers + AI Category Awareness

**Date:** 2026-05-07  
**Status:** Approved  
**Depends on:** Spec 1 (UI Design System) — `Combobox` and `FilterDrawer` use `Input`, `Select`, and design tokens from Spec 1.

---

## Overview

Three interconnected pieces built in dependency order:

1. **Industry System** — `Industry` DB model, admin management, `/api/industries/` endpoint, `Combobox` UI component, industry combobox in the startup creation form
2. **Filter Drawers** — slide-out filter panels on the Startups and Campaigns pages (client-side filtering)
3. **AI Category Awareness** — `search_campaigns` updated, `search_startups` added, `list_startups` added, system prompt updated

---

## Part 1: Industry System

### Backend — `Industry` model

New model in `apps/startups/models.py`:

```python
class Industry(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "industries"

    def __str__(self):
        return self.name
```

- Extends `TimeStampedModel` for `created_at` / `updated_at`
- `unique=True` prevents duplicates
- `is_active` lets admins hide industries without deleting them
- Ordered alphabetically

### Migration + Seed Data

Two migrations:
1. Schema migration — creates the `Industry` table
2. Data migration — seeds ~40 industries:

```
AI/ML, AgriTech, Automotive, Biotech, CleanTech, Cybersecurity,
E-Commerce, EdTech, Energy, Enterprise Software, FinTech, FoodTech,
Gaming, GovTech, HealthTech, HRTech, InsurTech, IoT, LegalTech,
Logistics, Manufacturing, MarTech, Media & Entertainment, MedTech,
PropTech, RetailTech, Robotics, SaaS, Social Impact, SpaceTech,
SportsTech, Supply Chain, TravelTech, Web3 / Blockchain
```

### Admin Panel

`IndustryAdmin` registered in `apps/startups/admin.py`:

```python
@admin.register(Industry)
class IndustryAdmin(admin.ModelAdmin):
    list_display = ["name", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name"]
    list_editable = ["is_active"]
```

Standard Django admin — no custom UI needed. Admins can add, edit, deactivate industries from here.

### API Endpoint

`GET /api/industries/`

- Returns all active industries ordered alphabetically
- Response: `[{ "id": 1, "name": "FinTech" }, ...]`
- No authentication required (needed on startup creation form before full onboarding)
- Registered in `apps/startups/urls.py`

New view in `apps/startups/views.py`:

```python
class IndustryListView(generics.ListAPIView):
    serializer_class = IndustrySerializer
    permission_classes = [AllowAny]
    queryset = Industry.objects.filter(is_active=True)
```

### `Startup.industry` field

Stays as `CharField(max_length=100)` — no FK. This preserves existing data, allows custom values, and means no cascading FK concerns. The API endpoint provides suggestions only.

### Frontend — `Combobox` component

New file: `frontend/src/components/ui/Combobox.tsx`

**Props:**
```ts
interface ComboboxProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  loading?: boolean
  error?: boolean
}
```

**Behaviour:**
- Renders a styled `Input` (from Spec 1)
- As the user types, shows a dropdown of matching suggestions (case-insensitive `includes`)
- Dropdown shows max 8 suggestions at a time, scrollable
- Selecting a suggestion sets the value and closes the dropdown
- Typing something not in the list is valid — user can submit any free-text value
- `loading` shows a spinner inside the input while the industry list is fetching
- Click-outside closes the dropdown (same `useRef` + `useEffect` pattern as `Select`)
- Dropdown styling matches `Select` popover (white, rounded-xl, border, shadow-sm)

**Used in:** `CreateStartupModal` in `StartupsPage.tsx` — replaces the plain `<Input>` for the industry field. Fetches `/api/industries/` on mount.

---

## Part 2: Filter Drawers

### Shared Pattern

Both pages follow the same UX:
- A **"Filters" button** (funnel icon, `Button variant="secondary"`) sits to the right of the search bar
- When any filter is active, a count badge appears on the button: e.g. `Filters · 2`
- **Active filter chips** appear as a dismissible row below the search bar — each chip shows the filter value with an × to remove it individually
- Drawer slides in from the right over content (fixed, not pushing layout)
- Semi-transparent backdrop behind the drawer
- Filter controls inside the drawer apply **live** as the user changes them
- **"Clear all"** button at the bottom of the drawer resets all filters
- **"Done"** button (or clicking backdrop) closes the drawer

### `FilterDrawer` component

New file: `frontend/src/components/ui/FilterDrawer.tsx`

**Props:**
```ts
interface FilterDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  onClear: () => void
  activeCount: number
}
```

**Structure:**
```
fixed inset-0 z-40 (when open)
  backdrop: absolute inset-0 bg-black/20 (click closes)
  panel: absolute right-0 top-0 h-full w-80 bg-white shadow-xl
    header: title + close X button
    body: flex-1 overflow-y-auto p-4 (children)
    footer: "Clear all" + "Done" buttons
```

Animate in/out with `translate-x-full` → `translate-x-0` transition.

### Startups Page Filters

Filter state managed locally in `StartupsPage`:

```ts
interface StartupFilters {
  industries: string[]   // multi-select
  status: string         // "" | "pending_approval" | "active" | "suspended"
  location: string       // text contains match
}
```

**Filter controls in drawer:**

**Industry** — multi-select checkboxes using the industry list fetched from `/api/industries/`. Shared fetch with `CreateStartupModal` (both can use a `useIndustries()` hook).

**Status** — radio buttons: All / Pending approval / Active / Suspended

**Location** — text `Input` — contains match against `startup.location`

**Client-side filter function:**
```ts
const filtered = startups
  .filter(s => !filters.industries.length || filters.industries.includes(s.industry))
  .filter(s => !filters.status || s.status === filters.status)
  .filter(s => !filters.location || s.location.toLowerCase().includes(filters.location.toLowerCase()))
  .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
               s.industry.toLowerCase().includes(searchQuery.toLowerCase()))
```

### Campaigns Page Filters

Filter state managed locally in `CampaignsPage`:

```ts
interface CampaignFilters {
  industries: string[]   // multi-select
  status: string         // "" | "active" | "pending_approval" | "completed" | "rejected"
  minFunding: string     // funding_percentage >=
  maxFunding: string     // funding_percentage <=
}
```

**Filter controls in drawer:**

**Industry** — multi-select checkboxes derived from the loaded campaigns' `startup_industry` values (deduplicated). No API call needed — built from data already in state.

**Status** — radio buttons: All / Active / Pending approval / Completed / Rejected

**Min/Max funding %** — two `Input type="number"` fields (0–100), side by side

**Client-side filter function:**
```ts
const filtered = campaigns
  .filter(c => !filters.industries.length || filters.industries.includes(c.startup_industry))
  .filter(c => !filters.status || c.status === filters.status)
  .filter(c => !filters.minFunding || c.funding_percentage >= Number(filters.minFunding))
  .filter(c => !filters.maxFunding || c.funding_percentage <= Number(filters.maxFunding))
  .filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
               c.startup_name.toLowerCase().includes(searchQuery.toLowerCase()))
```

### Backend change for Campaigns

Add `startup_industry` to `CampaignSerializer` in `apps/campaigns/serializers.py`:

```python
startup_industry = serializers.CharField(source="startup.industry", read_only=True)
```

Add to `fields` list. No migration needed — this is a computed read field.

Also add `startup_industry` to the `Campaign` TypeScript interface in `frontend/src/types/index.ts`.

---

## Part 3: AI Tool Updates

### 1. `search_campaigns` — add optional `industry` filter

**Current:** `search_campaigns(user, query)`  
**New:** `search_campaigns(user, query, industry=None)`

```python
def search_campaigns(user, query, industry=None):
    qs = Campaign.objects.filter(status=Campaign.Status.ACTIVE).filter(
        Q(title__icontains=query) | Q(description__icontains=query)
    )
    if industry:
        qs = qs.filter(startup__industry__icontains=industry)
    campaigns = qs.select_related("startup")[:10]
    ...
```

Tool definition updated to document `industry` as an optional parameter with description: `"Filter by industry (e.g. 'FinTech', 'HealthTech'). Optional."`.

### 2. New `search_startups` tool

```python
def search_startups(user, query, industry=None):
    qs = Startup.objects.filter(
        Q(name__icontains=query) | Q(description__icontains=query)
    )
    if industry:
        qs = qs.filter(industry__icontains=industry)
    startups = qs.annotate(
        members_count=Count("members"),
        followers_count=Count("followers"),
    )[:10]
    return {
        "results": [
            {
                "id": s.id,
                "name": s.name,
                "industry": s.industry,
                "location": s.location,
                "status": s.status,
                "members_count": s.members_count,
                "followers_count": s.followers_count,
            }
            for s in startups
        ]
    }
```

**Tool definition:**
```python
{
    "name": "search_startups",
    "description": "Search startups by name or description keyword. Optionally filter by industry.",
    "parameters": {
        "query": {"type": "string", "description": "Keyword to search"},
        "industry": {"type": "string", "description": "Optional industry filter (e.g. 'FinTech')"},
    }
}
```

### 3. New `list_startups` tool

```python
def list_startups(user, industry=None, status=None):
    qs = Startup.objects.annotate(
        members_count=Count("members"),
        followers_count=Count("followers"),
    )
    if industry:
        qs = qs.filter(industry__icontains=industry)
    if status:
        qs = qs.filter(status=status)
    startups = qs[:20]
    return {
        "startups": [
            {
                "id": s.id,
                "name": s.name,
                "industry": s.industry,
                "location": s.location,
                "status": s.status,
                "members_count": s.members_count,
                "followers_count": s.followers_count,
            }
            for s in startups
        ]
    }
```

**Tool definition:**
```python
{
    "name": "list_startups",
    "description": "List and browse startups, optionally filtered by industry or status. Use when an investor asks to discover or browse startups by category.",
    "parameters": {
        "industry": {"type": "string", "description": "Filter by industry. Optional."},
        "status": {"type": "string", "description": "Filter by status: 'active', 'pending_approval', 'suspended'. Optional."},
    }
}
```

### 4. System prompt update

Two new lines added to `build_system_prompt()` in `stream_service.py`:

```
- Search and browse startups by name, description, or industry category
- Filter campaigns by industry when searching
```

---

## File Structure

```
backend/
  apps/startups/
    models.py              (updated — Industry model added)
    views.py               (updated — IndustryListView added)
    urls.py                (updated — /industries/ endpoint)
    serializers.py         (updated — IndustrySerializer added)
    admin.py               (updated — IndustryAdmin registered)
    migrations/
      XXXX_add_industry_model.py          (schema)
      XXXX_seed_industry_data.py          (data)
  apps/campaigns/
    serializers.py         (updated — startup_industry field added)
  apps/copilot/
    tools.py               (updated — search_campaigns, + search_startups, + list_startups)
    stream_service.py      (updated — system prompt + tool definitions)

frontend/src/
  components/ui/
    Combobox.tsx           (new)
    FilterDrawer.tsx       (new)
  hooks/
    useIndustries.ts       (new — fetches /api/industries/, cacheable)
  pages/startups/
    StartupsPage.tsx       (updated — Combobox in modal, FilterDrawer + filter state)
  pages/campaigns/
    CampaignsPage.tsx      (updated — FilterDrawer + filter state)
  types/index.ts           (updated — startup_industry added to Campaign interface)
```

---

## Error Handling

- `/api/industries/` failure — `Combobox` falls back gracefully to pure free-text input (loading spinner disappears, user can still type)
- Filter drawer with no results — same empty state as current search (no matches card)
- `search_startups` / `list_startups` AI tools — same error pattern as existing tools (`{"error": "..."}`)

---

## What This Does NOT Include

- No server-side filtering API params — all filtering is client-side against already-loaded data
- No custom industry management UI beyond Django admin
- No industry analytics or reporting
- No investor-facing "preferred industries" matching (that's investor profile territory, out of scope)
