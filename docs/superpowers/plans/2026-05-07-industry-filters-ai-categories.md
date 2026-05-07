# Industry System + Filter Drawers + AI Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a DB-backed industry list with admin management, a Combobox for startup creation, filter drawers on the Startups and Campaigns pages, and AI tools for searching/browsing by category.

**Architecture:** `Industry` model lives in `apps/startups`. The `industry` field on `Startup` stays a `CharField` — the API just provides suggestions. All page filtering is client-side. Three new AI tools are added to `tools.py` with no stream service changes required.

**Tech Stack:** Django 5.1, DRF, React 18, TypeScript, TailwindCSS 3. Depends on Spec 1 UI components (`Input`, `FilterDrawer` uses brand tokens).

---

## File Map

**New files:**
- `backend/apps/startups/migrations/0004_add_industry_model.py`
- `backend/apps/startups/migrations/0005_seed_industries.py`
- `frontend/src/hooks/useIndustries.ts`
- `frontend/src/components/ui/Combobox.tsx`
- `frontend/src/components/ui/FilterDrawer.tsx`

**Modified files:**
- `backend/apps/startups/models.py`
- `backend/apps/startups/admin.py`
- `backend/apps/startups/serializers.py`
- `backend/apps/startups/views.py`
- `backend/apps/startups/urls.py`
- `backend/apps/campaigns/serializers.py`
- `backend/apps/copilot/tools.py`
- `backend/apps/copilot/stream_service.py`
- `frontend/src/types/index.ts`
- `frontend/src/components/ui/index.ts`
- `frontend/src/pages/startups/StartupsPage.tsx`
- `frontend/src/pages/campaigns/CampaignsPage.tsx`

---

### Task 1: Industry model and migrations

**Files:**
- Modify: `backend/apps/startups/models.py`
- Create: `backend/apps/startups/migrations/0004_add_industry_model.py`
- Create: `backend/apps/startups/migrations/0005_seed_industries.py`

- [ ] **Step 1: Add Industry model to models.py**

Add after the existing imports and before the `Startup` class:

```python
# backend/apps/startups/models.py
# Add to existing imports (TimeStampedModel already imported)

class Industry(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "industries"

    def __str__(self):
        return self.name
```

- [ ] **Step 2: Generate schema migration**

```bash
docker compose exec django-api python manage.py makemigrations startups --name add_industry_model
```

Expected output: `Migrations for 'startups': apps/startups/migrations/0004_add_industry_model.py`

Verify the generated file creates the `startups_industry` table with `name`, `is_active`, `created_at`, `updated_at` fields.

- [ ] **Step 3: Create data migration to seed industries**

Create `backend/apps/startups/migrations/0005_seed_industries.py`:

```python
from django.db import migrations

INDUSTRIES = [
    "AI / ML",
    "AgriTech",
    "Automotive",
    "Biotech",
    "CleanTech",
    "Cybersecurity",
    "E-Commerce",
    "EdTech",
    "Energy",
    "Enterprise Software",
    "FinTech",
    "FoodTech",
    "Gaming",
    "GovTech",
    "HealthTech",
    "HRTech",
    "InsurTech",
    "IoT",
    "LegalTech",
    "Logistics",
    "Manufacturing",
    "MarTech",
    "Media & Entertainment",
    "MedTech",
    "PropTech",
    "RetailTech",
    "Robotics",
    "SaaS",
    "Social Impact",
    "SpaceTech",
    "SportsTech",
    "Supply Chain",
    "TravelTech",
    "Web3 / Blockchain",
]


def seed_industries(apps, schema_editor):
    Industry = apps.get_model("startups", "Industry")
    for name in INDUSTRIES:
        Industry.objects.get_or_create(name=name)


def unseed_industries(apps, schema_editor):
    Industry = apps.get_model("startups", "Industry")
    Industry.objects.filter(name__in=INDUSTRIES).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("startups", "0004_add_industry_model"),
    ]

    operations = [
        migrations.RunPython(seed_industries, reverse_code=unseed_industries),
    ]
```

- [ ] **Step 4: Run migrations**

```bash
docker compose exec django-api python manage.py migrate
```

Expected: both migrations apply cleanly.

- [ ] **Step 5: Verify in Django shell**

```bash
docker compose exec django-api python manage.py shell -c "
from apps.startups.models import Industry
print(Industry.objects.count(), 'industries seeded')
print(Industry.objects.first())
"
```

Expected: `34 industries seeded` and prints first industry name alphabetically (`AI / ML`).

- [ ] **Step 6: Commit**

```bash
git add backend/apps/startups/models.py \
        backend/apps/startups/migrations/0004_add_industry_model.py \
        backend/apps/startups/migrations/0005_seed_industries.py
git commit -m "feat: add Industry model with seed data migration"
```

---

### Task 2: Industry admin, serializer, view, and URL

**Files:**
- Modify: `backend/apps/startups/admin.py`
- Modify: `backend/apps/startups/serializers.py`
- Modify: `backend/apps/startups/views.py`
- Modify: `backend/apps/startups/urls.py`

- [ ] **Step 1: Register IndustryAdmin in admin.py**

Open `backend/apps/startups/admin.py` and add:

```python
from apps.startups.models import Industry, Startup, StartupInvitation, StartupMember

@admin.register(Industry)
class IndustryAdmin(admin.ModelAdmin):
    list_display = ["name", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name"]
    list_editable = ["is_active"]
    ordering = ["name"]
```

- [ ] **Step 2: Add IndustrySerializer to serializers.py**

Add after existing imports:

```python
from apps.startups.models import Industry, Startup, StartupMember, StartupFollow, StartupInvitation

class IndustrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Industry
        fields = ["id", "name"]
```

- [ ] **Step 3: Add IndustryListView to views.py**

Add to imports:
```python
from apps.startups.models import Industry, Startup, StartupFollow, StartupInvitation, StartupMember
from apps.startups.serializers import (
    IndustrySerializer,
    InvitationCreateSerializer,
    # ... existing imports unchanged
)
from rest_framework.permissions import AllowAny
```

Add the view after existing imports and before `StartupViewSet`:

```python
class IndustryListView(generics.ListAPIView):
    serializer_class = IndustrySerializer
    permission_classes = [AllowAny]
    queryset = Industry.objects.filter(is_active=True)
```

- [ ] **Step 4: Register the /industries/ URL in urls.py**

Add before the `router` block:

```python
from apps.startups import views

urlpatterns = [
    path("industries/", views.IndustryListView.as_view(), name="industry-list"),
    path(
        "<int:startup_pk>/members/",
        # ... existing paths unchanged
    ),
    # ... rest of existing urlpatterns unchanged
    path("", include(router.urls)),
]
```

- [ ] **Step 5: Verify the endpoint**

```bash
curl -s http://localhost:8000/api/industries/ | python3 -m json.tool | head -20
```

Expected: JSON array of `{ "id": N, "name": "..." }` objects starting with `AI / ML`.

- [ ] **Step 6: Verify Django admin**

Open http://localhost:8025 (Mailhog) — not relevant here.
Open http://localhost:8000/admin/ and confirm the "Industries" section appears under "Startups" with the list/edit/deactivate UI.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/startups/admin.py \
        backend/apps/startups/serializers.py \
        backend/apps/startups/views.py \
        backend/apps/startups/urls.py
git commit -m "feat: add Industry admin, serializer, list view, and /api/industries/ endpoint"
```

---

### Task 3: Add startup_industry to campaign serializer and TypeScript type

**Files:**
- Modify: `backend/apps/campaigns/serializers.py`
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Add startup_industry to CampaignListSerializer**

In `backend/apps/campaigns/serializers.py`, update `CampaignListSerializer`:

```python
class CampaignListSerializer(serializers.ModelSerializer):
    startup_name = serializers.CharField(source="startup.name", read_only=True)
    startup_logo_url = serializers.URLField(source="startup.logo_url", read_only=True, default="")
    startup_industry = serializers.CharField(source="startup.industry", read_only=True)  # new
    funding_percentage = serializers.ReadOnlyField()

    class Meta:
        model = Campaign
        fields = [
            "id", "title", "description", "startup", "startup_name",
            "startup_logo_url", "startup_industry",                   # startup_industry added
            "funding_goal", "current_funding", "funding_percentage",
            "equity_offered", "deadline", "status",
            "created_at", "updated_at",
        ]
        read_only_fields = fields
```

- [ ] **Step 2: Update Campaign TypeScript interface**

In `frontend/src/types/index.ts`, add `startup_industry` to the `Campaign` interface:

```ts
export interface Campaign {
  id: number;
  startup: number;
  startup_name: string;
  startup_logo_url: string;
  startup_industry: string;   // new
  title: string;
  description: string;
  funding_goal: string;
  current_funding: string;
  funding_percentage: number;
  equity_offered: string;
  deadline: string;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 3: Verify API response includes startup_industry**

```bash
# Get a JWT token first, then:
curl -s http://localhost:8000/api/campaigns/ \
  -H "Authorization: Bearer <token>" | python3 -m json.tool | grep startup_industry
```

Expected: `"startup_industry": "..."` present in each campaign object.

- [ ] **Step 4: Type-check frontend**

```bash
docker compose exec react-frontend npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/campaigns/serializers.py frontend/src/types/index.ts
git commit -m "feat: add startup_industry to campaign serializer and TypeScript type"
```

---

### Task 4: New AI tools — search_startups, list_startups, update search_campaigns

**Files:**
- Modify: `backend/apps/copilot/tools.py`

- [ ] **Step 1: Update search_campaigns to accept optional industry filter**

Find `search_campaigns` in `tools.py` and replace it:

```python
def search_campaigns(user, query, industry=None):
    qs = Campaign.objects.filter(
        status=Campaign.Status.ACTIVE,
    ).filter(Q(title__icontains=query) | Q(description__icontains=query))
    if industry:
        qs = qs.filter(startup__industry__icontains=industry)
    campaigns = qs.select_related("startup")[:10]
    return {
        "results": [
            {
                "id": c.id,
                "title": c.title,
                "startup_name": c.startup.name,
                "startup_industry": c.startup.industry,
                "funding_goal": str(c.funding_goal),
                "current_funding": str(c.current_funding),
                "funding_percentage": c.funding_percentage,
                "deadline": str(c.deadline),
            }
            for c in campaigns
        ]
    }
```

- [ ] **Step 2: Add search_startups function**

Add after `search_campaigns`:

```python
def search_startups(user, query, industry=None):
    qs = Startup.objects.filter(
        Q(name__icontains=query) | Q(description__icontains=query)
    ).annotate(
        members_count=Count("members"),
        followers_count=Count("followers"),
    )
    if industry:
        qs = qs.filter(industry__icontains=industry)
    startups = qs[:10]
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

Note: `Count` is already imported at the top of `tools.py`.

- [ ] **Step 3: Add list_startups function**

Add after `search_startups`:

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

- [ ] **Step 4: Update TOOL_DEFINITIONS for search_campaigns**

Find the `search_campaigns` entry in `TOOL_DEFINITIONS` and replace it:

```python
{
    "type": "function",
    "function": {
        "name": "search_campaigns",
        "description": "Search active campaigns by title or description keyword. Optionally filter by industry.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search keyword to find matching campaigns",
                },
                "industry": {
                    "type": "string",
                    "description": "Optional industry filter (e.g. 'FinTech', 'HealthTech'). Case-insensitive contains match.",
                },
            },
            "required": ["query"],
        },
    },
},
```

- [ ] **Step 5: Add search_startups and list_startups to TOOL_DEFINITIONS**

Add after the `search_campaigns` entry in `TOOL_DEFINITIONS`:

```python
{
    "type": "function",
    "function": {
        "name": "search_startups",
        "description": "Search startups by name or description keyword. Optionally filter by industry.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Keyword to search in startup name and description",
                },
                "industry": {
                    "type": "string",
                    "description": "Optional industry filter (e.g. 'FinTech'). Case-insensitive contains match.",
                },
            },
            "required": ["query"],
        },
    },
},
{
    "type": "function",
    "function": {
        "name": "list_startups",
        "description": "List and browse startups, optionally filtered by industry or status. Use when an investor asks to discover startups by category or status without a specific search keyword.",
        "parameters": {
            "type": "object",
            "properties": {
                "industry": {
                    "type": "string",
                    "description": "Filter by industry (e.g. 'FinTech'). Optional.",
                },
                "status": {
                    "type": "string",
                    "description": "Filter by status: 'active', 'pending_approval', or 'suspended'. Optional.",
                },
            },
        },
    },
},
```

- [ ] **Step 6: Add search_startups and list_startups to TOOL_REGISTRY**

Find `TOOL_REGISTRY` dict and add:

```python
TOOL_REGISTRY = {
    # ... existing entries unchanged ...
    "search_campaigns": search_campaigns,   # already present — no change needed
    "search_startups": search_startups,     # new
    "list_startups": list_startups,         # new
    # ... rest unchanged ...
}
```

- [ ] **Step 7: Commit**

```bash
git add backend/apps/copilot/tools.py
git commit -m "feat: add search_startups, list_startups AI tools; add industry filter to search_campaigns"
```

---

### Task 5: Update AI system prompt

**Files:**
- Modify: `backend/apps/copilot/stream_service.py`

- [ ] **Step 1: Update build_system_prompt**

Find `build_system_prompt` in `stream_service.py`. In the capabilities list, add two new lines after the existing bullet points:

```python
def build_system_prompt(user) -> str:
    role_label = user.get_role_display() if hasattr(user, "get_role_display") else user.role
    return (
        "You are the Funderaise AI Copilot, an intelligent assistant for the "
        "Funderaise collaborative crowdfunding platform.\n\n"
        f"You are helping {user.full_name}, who is a {role_label} on the platform.\n\n"
        "Your capabilities:\n"
        "- Answer questions about the user's startups, campaigns, investments, and tasks\n"
        "- Provide platform statistics and insights\n"
        "- Help users understand their funding progress\n"
        "- Summarize notifications and recent activity\n"
        "- Create campaign updates and milestones\n"
        "- Manage kanban boards (create/delete columns, create/move/update/delete tasks)\n"
        "- Handle investments (create, confirm, cancel)\n"
        "- Follow/unfollow startups\n"
        "- Post campaign comments\n"
        "- Update user profile\n"
        "- Mark notifications as read\n"
        "- Ask the user clarifying questions using the ask_user_questions tool\n"
        "- Search and browse startups by name, description, or industry category\n"   # new
        "- Filter campaigns by industry when searching\n\n"                           # new
        "Guidelines:\n"
        "- Be concise and helpful\n"
        "- Use the available tools to fetch real data before answering data-related questions\n"
        "- Format currency values with $ signs and commas\n"
        "- Use ask_user_questions when you need specific details before taking an action\n"
        "- Never make up data — always use tools to verify\n"
        "- When showing lists, use clear formatting\n\n"
        "CRITICAL — ID lookup rule:\n"
        "NEVER guess or make up IDs. ALWAYS use read tools first to look up the correct IDs "
        "before calling action tools.\n\n"
        "IMPORTANT — Confirmation rule for action tools:\n"
        "Before calling ANY tool that creates, modifies, or deletes data, you MUST first "
        "describe exactly what you are about to do and ask the user to confirm. "
        "Read-only tools (get_*, search_*, list_*) do NOT require confirmation.\n"
    )
```

- [ ] **Step 2: Restart backend and test in the AI copilot**

```bash
docker compose restart django-api
```

Open http://localhost:5173/ai and test:
- "Show me all FinTech startups" → AI calls `list_startups(industry="FinTech")`
- "Search for campaigns in HealthTech" → AI calls `search_campaigns(query="health", industry="HealthTech")`

- [ ] **Step 3: Commit**

```bash
git add backend/apps/copilot/stream_service.py
git commit -m "feat: update AI system prompt to include startup search and industry filtering capabilities"
```

---

### Task 6: useIndustries hook and Combobox component

**Files:**
- Create: `frontend/src/hooks/useIndustries.ts`
- Create: `frontend/src/components/ui/Combobox.tsx`
- Modify: `frontend/src/components/ui/index.ts`

- [ ] **Step 1: Create useIndustries.ts**

```ts
// frontend/src/hooks/useIndustries.ts
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface Industry {
  id: number;
  name: string;
}

export function useIndustries() {
  const [industries, setIndustries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Industry[]>("/industries/")
      .then((data) => setIndustries(data.map((i) => i.name)))
      .catch(() => setIndustries([]))
      .finally(() => setLoading(false));
  }, []);

  return { industries, loading };
}
```

- [ ] **Step 2: Create Combobox.tsx**

```tsx
// frontend/src/components/ui/Combobox.tsx
import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface ComboboxProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  error?: boolean;
  className?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Type or select...",
  loading = false,
  error = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options
    .filter((o) => o.toLowerCase().includes(value.toLowerCase()))
    .slice(0, 8);

  const showDropdown = open && (filtered.length > 0 || loading);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={cn(
            "w-full px-4 py-2.5 rounded-xl bg-white border text-brand-text placeholder:text-brand-muted/60 text-sm outline-none transition-all shadow-sm",
            error
              ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
              : "border-brand-border/30 focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10",
            loading && "pr-10"
          )}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted animate-spin" />
        )}
      </div>

      {showDropdown && (
        <ul className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-brand-border/30 shadow-lg overflow-hidden max-h-52 overflow-y-auto py-1">
          {loading ? (
            <li className="px-4 py-2.5 text-sm text-brand-muted">Loading...</li>
          ) : (
            filtered.map((opt) => (
              <li
                key={opt}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt);
                  setOpen(false);
                }}
                className={cn(
                  "px-4 py-2 text-sm cursor-pointer transition-colors",
                  opt === value
                    ? "bg-brand-accent/[0.06] text-brand-accent font-medium"
                    : "text-brand-text hover:bg-brand-bg"
                )}
              >
                {opt}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add Combobox export to index.ts**

In `frontend/src/components/ui/index.ts`, add:

```ts
export { Combobox } from "./Combobox";
```

(FilterDrawer will be added to the barrel in Task 7 after it is created.)

- [ ] **Step 4: Type-check**

```bash
docker compose exec react-frontend npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useIndustries.ts \
        frontend/src/components/ui/Combobox.tsx \
        frontend/src/components/ui/index.ts
git commit -m "feat: add useIndustries hook and Combobox UI component"
```

---

### Task 7: FilterDrawer component

**Files:**
- Create: `frontend/src/components/ui/FilterDrawer.tsx`
- Modify: `frontend/src/components/ui/index.ts`

- [ ] **Step 1: Create FilterDrawer.tsx**

```tsx
// frontend/src/components/ui/FilterDrawer.tsx
import { type ReactNode, useEffect } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  onClear: () => void;
  activeCount: number;
}

export function FilterDrawer({
  open,
  onClose,
  title = "Filters",
  children,
  onClear,
  activeCount,
}: FilterDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-50 flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border/[0.1]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-brand-muted" />
            <h3 className="text-base font-semibold text-brand-text">{title}</h3>
            {activeCount > 0 && (
              <span className="bg-brand-accent text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-full">
                {activeCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-brand-bg text-brand-muted transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {children}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-brand-border/[0.1] flex gap-3">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClear}
            disabled={activeCount === 0}
          >
            Clear all
          </Button>
          <Button type="button" className="flex-1" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Add FilterDrawer to index.ts**

In `frontend/src/components/ui/index.ts`, add if not already present:

```ts
export { FilterDrawer } from "./FilterDrawer";
```

- [ ] **Step 3: Type-check and commit**

```bash
docker compose exec react-frontend npx tsc --noEmit
git add frontend/src/components/ui/FilterDrawer.tsx frontend/src/components/ui/index.ts
git commit -m "feat: add FilterDrawer UI component"
```

---

### Task 8: Startups page — industry Combobox and filter drawer

**Files:**
- Modify: `frontend/src/pages/startups/StartupsPage.tsx`

- [ ] **Step 1: Add useIndustries hook and Combobox to CreateStartupModal**

Add imports at the top of `StartupsPage.tsx`:

```tsx
import { Combobox } from "@/components/ui/Combobox";
import { useIndustries } from "@/hooks/useIndustries";
```

Inside `CreateStartupModal`, add the hook and replace the industry input:

```tsx
function CreateStartupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  // ... existing state ...
  const { industries, loading: industriesLoading } = useIndustries();  // add this

  // ... existing code ...

  // Replace the industry <Input> with <Combobox>:
  <div>
    <label className="block text-[13px] font-medium text-brand-text mb-1.5">
      Industry *
    </label>
    <Combobox
      options={industries}
      value={form.industry}
      onChange={(val) => updateField("industry", val)}
      placeholder="e.g. FinTech"
      loading={industriesLoading}
    />
  </div>
```

- [ ] **Step 2: Add filter state to StartupsPage**

Add filter state and drawer state at the top of `StartupsPage`:

```tsx
import { SlidersHorizontal } from "lucide-react";
import { FilterDrawer } from "@/components/ui/FilterDrawer";

// Inside StartupsPage component, add:
const [showFilters, setShowFilters] = useState(false);
const [filters, setFilters] = useState({
  industries: [] as string[],
  status: "",
  location: "",
});
const { industries: industryOptions } = useIndustries();
```

- [ ] **Step 3: Update the client-side filter logic**

Replace the existing `filtered` constant:

```tsx
const filtered = startups
  .filter((s) =>
    !filters.industries.length || filters.industries.includes(s.industry)
  )
  .filter((s) => !filters.status || s.status === filters.status)
  .filter(
    (s) =>
      !filters.location ||
      s.location.toLowerCase().includes(filters.location.toLowerCase())
  )
  .filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

const activeFilterCount =
  filters.industries.length +
  (filters.status ? 1 : 0) +
  (filters.location ? 1 : 0);
```

- [ ] **Step 4: Add the Filters button next to the search bar**

Replace the search bar section:

```tsx
{/* Search + Filters row */}
<div className="flex items-center gap-3">
  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-brand-border/30 text-brand-muted text-sm flex-1 max-w-sm shadow-sm focus-within:border-brand-blue/40 focus-within:ring-2 focus-within:ring-brand-blue/10 transition-all">
    <Search className="w-4 h-4 flex-shrink-0" />
    <input
      type="text"
      placeholder="Search by name or industry..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="bg-transparent outline-none w-full text-brand-text placeholder:text-brand-muted/60"
    />
  </div>
  <button
    onClick={() => setShowFilters(true)}
    className={cn(
      "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all shadow-sm cursor-pointer",
      activeFilterCount > 0
        ? "bg-brand-accent/[0.08] border-brand-accent/30 text-brand-accent"
        : "bg-white border-brand-border/30 text-brand-muted hover:text-brand-text hover:border-brand-border/60"
    )}
  >
    <SlidersHorizontal className="w-4 h-4" />
    Filters
    {activeFilterCount > 0 && (
      <span className="bg-brand-accent text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-full">
        {activeFilterCount}
      </span>
    )}
  </button>
</div>

{/* Active filter chips */}
{activeFilterCount > 0 && (
  <div className="flex flex-wrap gap-2">
    {filters.industries.map((ind) => (
      <span
        key={ind}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/[0.08] text-brand-accent text-xs font-medium"
      >
        {ind}
        <button
          onClick={() =>
            setFilters((f) => ({
              ...f,
              industries: f.industries.filter((i) => i !== ind),
            }))
          }
          className="hover:text-brand-accent/60 cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      </span>
    ))}
    {filters.status && (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/[0.08] text-brand-accent text-xs font-medium">
        {filters.status.replace("_", " ")}
        <button
          onClick={() => setFilters((f) => ({ ...f, status: "" }))}
          className="hover:text-brand-accent/60 cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      </span>
    )}
    {filters.location && (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/[0.08] text-brand-accent text-xs font-medium">
        📍 {filters.location}
        <button
          onClick={() => setFilters((f) => ({ ...f, location: "" }))}
          className="hover:text-brand-accent/60 cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      </span>
    )}
  </div>
)}
```

- [ ] **Step 5: Add FilterDrawer JSX at the end of the component return**

Add before the closing `</div>` of the main container, and before `{showCreate && <CreateStartupModal ... />}`:

```tsx
<FilterDrawer
  open={showFilters}
  onClose={() => setShowFilters(false)}
  activeCount={activeFilterCount}
  onClear={() => setFilters({ industries: [], status: "", location: "" })}
>
  {/* Industry filter */}
  <div>
    <p className="text-[13px] font-semibold text-brand-text mb-3">Industry</p>
    <div className="space-y-2">
      {industryOptions.map((ind) => {
        const checked = filters.industries.includes(ind);
        return (
          <label key={ind} className="flex items-center gap-2.5 cursor-pointer group">
            <div
              className={cn(
                "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                checked
                  ? "border-brand-accent bg-brand-accent"
                  : "border-brand-border group-hover:border-brand-accent/60"
              )}
            >
              {checked && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            <span className="text-sm text-brand-text">{ind}</span>
            <input
              type="checkbox"
              className="sr-only"
              checked={checked}
              onChange={() =>
                setFilters((f) => ({
                  ...f,
                  industries: checked
                    ? f.industries.filter((i) => i !== ind)
                    : [...f.industries, ind],
                }))
              }
            />
          </label>
        );
      })}
    </div>
  </div>

  {/* Status filter */}
  <div>
    <p className="text-[13px] font-semibold text-brand-text mb-3">Status</p>
    <div className="space-y-2">
      {[
        { value: "", label: "All" },
        { value: "active", label: "Active" },
        { value: "pending_approval", label: "Pending approval" },
        { value: "suspended", label: "Suspended" },
      ].map((opt) => (
        <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
          <div
            className={cn(
              "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
              filters.status === opt.value
                ? "border-brand-accent bg-brand-accent"
                : "border-brand-border group-hover:border-brand-accent/60"
            )}
          >
            {filters.status === opt.value && (
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            )}
          </div>
          <span className="text-sm text-brand-text">{opt.label}</span>
          <input
            type="radio"
            className="sr-only"
            checked={filters.status === opt.value}
            onChange={() => setFilters((f) => ({ ...f, status: opt.value }))}
          />
        </label>
      ))}
    </div>
  </div>

  {/* Location filter */}
  <div>
    <p className="text-[13px] font-semibold text-brand-text mb-3">Location</p>
    <input
      type="text"
      value={filters.location}
      onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
      placeholder="e.g. Tunisia"
      className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-border/30 text-brand-text placeholder:text-brand-muted/60 text-sm outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all shadow-sm"
    />
  </div>
</FilterDrawer>
```

Add `Check` to lucide-react imports: `import { ..., Check, SlidersHorizontal, ... } from "lucide-react";`
Add `cn` import: `import { cn } from "@/lib/cn";`

- [ ] **Step 6: Type-check and commit**

```bash
docker compose exec react-frontend npx tsc --noEmit
git add frontend/src/pages/startups/StartupsPage.tsx
git commit -m "feat: add industry Combobox to startup creation and filter drawer to startups page"
```

---

### Task 9: Campaigns page — filter drawer

**Files:**
- Modify: `frontend/src/pages/campaigns/CampaignsPage.tsx`

- [ ] **Step 1: Add filter state to CampaignsPage**

Add imports:

```tsx
import { SlidersHorizontal, Check } from "lucide-react";
import { FilterDrawer } from "@/components/ui/FilterDrawer";
import { cn } from "@/lib/cn";
```

Inside `CampaignsPage`, add filter state:

```tsx
const [showFilters, setShowFilters] = useState(false);
const [filters, setFilters] = useState({
  industries: [] as string[],
  status: "",
  minFunding: "",
  maxFunding: "",
});
```

- [ ] **Step 2: Update the filtered constant**

Replace the existing `filtered` constant:

```tsx
const availableIndustries = [...new Set(campaigns.map((c) => c.startup_industry).filter(Boolean))].sort();

const filtered = campaigns
  .filter((c) =>
    !filters.industries.length || filters.industries.includes(c.startup_industry)
  )
  .filter((c) => !filters.status || c.status === filters.status)
  .filter((c) =>
    !filters.minFunding || c.funding_percentage >= Number(filters.minFunding)
  )
  .filter((c) =>
    !filters.maxFunding || c.funding_percentage <= Number(filters.maxFunding)
  )
  .filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.startup_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

const activeFilterCount =
  filters.industries.length +
  (filters.status ? 1 : 0) +
  (filters.minFunding ? 1 : 0) +
  (filters.maxFunding ? 1 : 0);
```

- [ ] **Step 3: Add Filters button next to search bar**

Same pattern as Task 8 Step 4. Replace the search bar section with a row containing both the search bar and the Filters button. Add active filter chips below.

```tsx
<div className="flex items-center gap-3">
  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-brand-border/30 text-brand-muted text-sm flex-1 max-w-sm shadow-sm focus-within:border-brand-blue/40 focus-within:ring-2 focus-within:ring-brand-blue/10 transition-all">
    <Search className="w-4 h-4 flex-shrink-0" />
    <input
      type="text"
      placeholder="Search by title or startup..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="bg-transparent outline-none w-full text-brand-text placeholder:text-brand-muted/60"
    />
  </div>
  <button
    onClick={() => setShowFilters(true)}
    className={cn(
      "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all shadow-sm cursor-pointer",
      activeFilterCount > 0
        ? "bg-brand-accent/[0.08] border-brand-accent/30 text-brand-accent"
        : "bg-white border-brand-border/30 text-brand-muted hover:text-brand-text hover:border-brand-border/60"
    )}
  >
    <SlidersHorizontal className="w-4 h-4" />
    Filters
    {activeFilterCount > 0 && (
      <span className="bg-brand-accent text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-full">
        {activeFilterCount}
      </span>
    )}
  </button>
</div>
```

Active chips (show below search bar, same dismissible chip pattern as Task 8):

```tsx
{activeFilterCount > 0 && (
  <div className="flex flex-wrap gap-2">
    {filters.industries.map((ind) => (
      <span key={ind} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/[0.08] text-brand-accent text-xs font-medium">
        {ind}
        <button onClick={() => setFilters((f) => ({ ...f, industries: f.industries.filter((i) => i !== ind) }))} className="hover:text-brand-accent/60 cursor-pointer"><X className="w-3 h-3" /></button>
      </span>
    ))}
    {filters.status && (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/[0.08] text-brand-accent text-xs font-medium">
        {filters.status.replace("_", " ")}
        <button onClick={() => setFilters((f) => ({ ...f, status: "" }))} className="hover:text-brand-accent/60 cursor-pointer"><X className="w-3 h-3" /></button>
      </span>
    )}
    {filters.minFunding && (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/[0.08] text-brand-accent text-xs font-medium">
        ≥{filters.minFunding}% funded
        <button onClick={() => setFilters((f) => ({ ...f, minFunding: "" }))} className="hover:text-brand-accent/60 cursor-pointer"><X className="w-3 h-3" /></button>
      </span>
    )}
    {filters.maxFunding && (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/[0.08] text-brand-accent text-xs font-medium">
        ≤{filters.maxFunding}% funded
        <button onClick={() => setFilters((f) => ({ ...f, maxFunding: "" }))} className="hover:text-brand-accent/60 cursor-pointer"><X className="w-3 h-3" /></button>
      </span>
    )}
  </div>
)}
```

- [ ] **Step 4: Add FilterDrawer JSX**

Add before the closing `</div>` of the main container and before `{showCreate && ...}`:

```tsx
<FilterDrawer
  open={showFilters}
  onClose={() => setShowFilters(false)}
  activeCount={activeFilterCount}
  onClear={() => setFilters({ industries: [], status: "", minFunding: "", maxFunding: "" })}
>
  {/* Industry filter */}
  <div>
    <p className="text-[13px] font-semibold text-brand-text mb-3">Industry</p>
    {availableIndustries.length === 0 ? (
      <p className="text-sm text-brand-muted">No industries available</p>
    ) : (
      <div className="space-y-2">
        {availableIndustries.map((ind) => {
          const checked = filters.industries.includes(ind);
          return (
            <label key={ind} className="flex items-center gap-2.5 cursor-pointer group">
              <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center transition-colors", checked ? "border-brand-accent bg-brand-accent" : "border-brand-border group-hover:border-brand-accent/60")}>
                {checked && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className="text-sm text-brand-text">{ind}</span>
              <input type="checkbox" className="sr-only" checked={checked}
                onChange={() => setFilters((f) => ({ ...f, industries: checked ? f.industries.filter((i) => i !== ind) : [...f.industries, ind] }))}
              />
            </label>
          );
        })}
      </div>
    )}
  </div>

  {/* Status filter */}
  <div>
    <p className="text-[13px] font-semibold text-brand-text mb-3">Status</p>
    <div className="space-y-2">
      {[
        { value: "", label: "All" },
        { value: "active", label: "Active" },
        { value: "pending_approval", label: "Pending approval" },
        { value: "completed", label: "Completed" },
        { value: "rejected", label: "Rejected" },
      ].map((opt) => (
        <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
          <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors", filters.status === opt.value ? "border-brand-accent bg-brand-accent" : "border-brand-border group-hover:border-brand-accent/60")}>
            {filters.status === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
          </div>
          <span className="text-sm text-brand-text">{opt.label}</span>
          <input type="radio" className="sr-only" checked={filters.status === opt.value}
            onChange={() => setFilters((f) => ({ ...f, status: opt.value }))}
          />
        </label>
      ))}
    </div>
  </div>

  {/* Funding % range */}
  <div>
    <p className="text-[13px] font-semibold text-brand-text mb-3">Funding progress (%)</p>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-[11px] text-brand-muted mb-1">Min</label>
        <input
          type="number"
          min="0"
          max="100"
          value={filters.minFunding}
          onChange={(e) => setFilters((f) => ({ ...f, minFunding: e.target.value }))}
          placeholder="0"
          className="w-full px-3 py-2 rounded-xl bg-white border border-brand-border/30 text-brand-text text-sm outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all shadow-sm"
        />
      </div>
      <div>
        <label className="block text-[11px] text-brand-muted mb-1">Max</label>
        <input
          type="number"
          min="0"
          max="100"
          value={filters.maxFunding}
          onChange={(e) => setFilters((f) => ({ ...f, maxFunding: e.target.value }))}
          placeholder="100"
          className="w-full px-3 py-2 rounded-xl bg-white border border-brand-border/30 text-brand-text text-sm outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all shadow-sm"
        />
      </div>
    </div>
  </div>
</FilterDrawer>
```

- [ ] **Step 5: Type-check and commit**

```bash
docker compose exec react-frontend npx tsc --noEmit
git add frontend/src/pages/campaigns/CampaignsPage.tsx
git commit -m "feat: add filter drawer to campaigns page with industry, status, and funding range filters"
```

---

### Task 10: Smoke test

- [ ] **Step 1: Test the full flow**

```bash
docker compose up
```

Visit http://localhost:5173 and verify:

- [ ] `GET http://localhost:8000/api/industries/` returns 34 industries (no auth needed)
- [ ] Django admin at http://localhost:8000/admin/ shows "Industries" with list/edit/deactivate
- [ ] Startups page → "New Startup" modal → Industry field is a Combobox with suggestions, allows free-type
- [ ] Startups page → "Filters" button opens drawer with Industry checkboxes, Status radio, Location input
- [ ] Filtering works client-side (no page reload)
- [ ] Active filter chips appear below search bar and can be individually dismissed
- [ ] "Clear all" resets all filters
- [ ] Campaigns page → "Filters" button opens drawer with industry, status, funding range
- [ ] AI Copilot → "Show me FinTech startups" → AI calls `list_startups(industry="FinTech")`
- [ ] AI Copilot → "Search health campaigns" → AI calls `search_campaigns(query="health")`

- [ ] **Step 2: Final type-check**

```bash
docker compose exec react-frontend npx tsc --noEmit
```

Expected: no errors.
