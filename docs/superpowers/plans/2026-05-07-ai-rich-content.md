# AI Rich Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add enhanced question types (select, date, number, rating, slider) to the AI copilot form, enable the AI to render startup/campaign cards inline in chat, and render charts from copilot responses.

**Architecture:** Backend adds three new tools (`show_startup_cards`, `show_campaign_cards`, `render_chart`) that return a shape the stream service recognises — it emits `card_block` / `chart_block` SSE events to the frontend instead of the normal `tool_result` event, while still feeding a minimal acknowledgment back into the AI conversation. Frontend adds `StartupCard` / `CampaignCard` extracted components, `CardBlock` / `ChartBlock` copilot components, and wires them up in the SSE hook and panel. The question form gains five new input types rendered with the Spec 1 UI components.

**Tech Stack:** Django DRF, React 18, TypeScript, TailwindCSS, Recharts 3, lucide-react

**Depends on:** Plan 1 (UI Design System) must be executed first — `QuestionForm.tsx` uses `Select`, `DateInput`, `Input` from `frontend/src/components/ui/`.

---

### Task 1: Update TypeScript types

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Update `QuestionDef` — add new types and numeric props**

In `frontend/src/types/index.ts`, replace the existing `QuestionDef` interface (lines 378–385):

```ts
export interface QuestionDef {
  id: string;
  type: "radio" | "checkbox" | "text" | "textarea" | "select" | "date" | "number" | "rating" | "slider";
  label: string;
  options?: string[];
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
}
```

- [ ] **Step 2: Add `CardBlock` and `ChartBlock` interfaces after `AIStreamState`**

After the `AIStreamState` interface (line 410 approximately), add:

```ts
export interface CardBlock {
  card_type: "startup" | "campaign";
  items: Startup[] | Campaign[];
}

export interface ChartBlock {
  chart_type: "bar" | "line" | "pie" | "area";
  title: string;
  data: { label?: string; name?: string; value: number }[];
  x_label?: string;
  y_label?: string;
}
```

- [ ] **Step 3: Add `cardBlocks` and `chartBlocks` to `AIStreamState`**

Replace the `AIStreamState` interface:

```ts
export interface AIStreamState {
  pendingUserContent: string | null;
  pendingMediaUrl: string | null;
  pendingMediaType: string | null;
  liveThinking: string;
  thinkingDuration: number | null;
  liveText: string;
  toolCalls: ToolCallState[];
  questionForm: QuestionForm | null;
  cardBlocks: CardBlock[];
  chartBlocks: ChartBlock[];
  isStreaming: boolean;
  streamError: string | null;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/dev-daly/projects/funderise/frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing errors unrelated to types/index.ts).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat: extend TypeScript types for rich AI content (CardBlock, ChartBlock, QuestionDef)"
```

---

### Task 2: Update `ASK_USER_QUESTIONS_DEFINITION` — new question types

**Files:**
- Modify: `backend/apps/copilot/stream_service.py`

- [ ] **Step 1: Extend the `type` enum and add numeric properties**

In `backend/apps/copilot/stream_service.py`, inside `ASK_USER_QUESTIONS_DEFINITION`, replace the `"type"` property and the item schema:

Find the current item schema (lines ~68–78):
```python
"type": {"type": "string", "enum": ["radio", "checkbox", "text", "textarea"]},
"label": {"type": "string"},
"options": {"type": "array", "items": {"type": "string"}},
"placeholder": {"type": "string"},
"required": {"type": "boolean"},
```

Replace with:
```python
"type": {
    "type": "string",
    "enum": ["radio", "checkbox", "text", "textarea", "select", "date", "number", "rating", "slider"],
},
"label": {"type": "string"},
"options": {"type": "array", "items": {"type": "string"}},
"placeholder": {"type": "string"},
"required": {"type": "boolean"},
"min":  {"type": "number", "description": "Minimum value (number, slider)"},
"max":  {"type": "number", "description": "Maximum value (number, slider)"},
"step": {"type": "number", "description": "Step increment (number, slider)"},
```

- [ ] **Step 2: Verify Django starts cleanly**

```bash
docker compose exec django-api python manage.py check 2>&1 | tail -5
```

Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 3: Commit**

```bash
git add backend/apps/copilot/stream_service.py
git commit -m "feat: extend ask_user_questions tool definition with new question types"
```

---

### Task 3: Backend rich tools — tests then implementation

**Files:**
- Create: `backend/apps/copilot/tests/test_rich_tools.py`
- Modify: `backend/apps/copilot/tools.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/apps/copilot/tests/test_rich_tools.py`:

```python
from datetime import date, timedelta

from django.test import TestCase
from django.utils import timezone

from apps.campaigns.models import Campaign
from apps.copilot.tools import render_chart, show_campaign_cards, show_startup_cards
from apps.startups.models import Startup
from apps.users.models import UserProfile


def make_user(email, role="investor"):
    return UserProfile.objects.create(email=email, full_name="Test User", role=role)


def make_startup(created_by, name="Test Startup", industry="FinTech"):
    return Startup.objects.create(
        name=name,
        description="A test startup description",
        industry=industry,
        location="Paris",
        founding_date=date(2023, 1, 1),
        created_by=created_by,
    )


def make_campaign(startup, title="Test Campaign", status=Campaign.Status.ACTIVE):
    return Campaign.objects.create(
        startup=startup,
        title=title,
        description="A test campaign description",
        funding_goal="500000.00",
        equity_offered="10.00",
        deadline=timezone.now() + timedelta(days=30),
        status=status,
    )


class ShowStartupCardsTest(TestCase):
    def setUp(self):
        self.investor = make_user("investor@test.com")
        self.founder = make_user("founder@test.com", role="founder")
        self.startup = make_startup(self.founder)

    def test_returns_card_type_startup(self):
        result = show_startup_cards(self.investor, [self.startup.id])
        self.assertEqual(result["card_type"], "startup")
        self.assertEqual(len(result["items"]), 1)

    def test_item_has_required_fields(self):
        result = show_startup_cards(self.investor, [self.startup.id])
        item = result["items"][0]
        for field in ["id", "name", "description", "industry", "location", "status",
                      "logo_url", "members_count", "followers_count", "is_following",
                      "created_by", "founding_date", "website", "created_at", "updated_at"]:
            self.assertIn(field, item, f"Missing field: {field}")

    def test_max_six_cards(self):
        ids = [make_startup(self.founder, name=f"S{i}").id for i in range(8)]
        result = show_startup_cards(self.investor, ids)
        self.assertLessEqual(len(result["items"]), 6)

    def test_nonexistent_ids_skipped(self):
        result = show_startup_cards(self.investor, [99999])
        self.assertEqual(result["card_type"], "startup")
        self.assertEqual(result["items"], [])

    def test_is_following_false_by_default(self):
        result = show_startup_cards(self.investor, [self.startup.id])
        self.assertFalse(result["items"][0]["is_following"])


class ShowCampaignCardsTest(TestCase):
    def setUp(self):
        self.investor = make_user("investor2@test.com")
        founder = make_user("founder2@test.com", role="founder")
        startup = make_startup(founder)
        self.campaign = make_campaign(startup)

    def test_returns_card_type_campaign(self):
        result = show_campaign_cards(self.investor, [self.campaign.id])
        self.assertEqual(result["card_type"], "campaign")
        self.assertEqual(len(result["items"]), 1)

    def test_item_has_required_fields(self):
        result = show_campaign_cards(self.investor, [self.campaign.id])
        item = result["items"][0]
        for field in ["id", "title", "description", "startup", "startup_name",
                      "startup_logo_url", "startup_industry", "funding_goal",
                      "current_funding", "funding_percentage", "equity_offered",
                      "deadline", "status", "created_at", "updated_at"]:
            self.assertIn(field, item, f"Missing field: {field}")

    def test_max_six_cards(self):
        founder = make_user("founder3@test.com", role="founder")
        startup = make_startup(founder, name="Other")
        ids = [make_campaign(startup, title=f"C{i}").id for i in range(8)]
        result = show_campaign_cards(self.investor, ids)
        self.assertLessEqual(len(result["items"]), 6)

    def test_nonexistent_ids_skipped(self):
        result = show_campaign_cards(self.investor, [99999])
        self.assertEqual(result["card_type"], "campaign")
        self.assertEqual(result["items"], [])


class RenderChartTest(TestCase):
    def setUp(self):
        self.user = make_user("chartuser@test.com")

    def test_valid_bar_chart(self):
        result = render_chart(
            self.user, "bar", "Revenue",
            [{"label": "Jan", "value": 1000}, {"label": "Feb", "value": 2000}],
        )
        self.assertEqual(result["chart_type"], "bar")
        self.assertEqual(result["title"], "Revenue")
        self.assertEqual(len(result["data"]), 2)
        self.assertNotIn("error", result)

    def test_valid_pie_chart(self):
        result = render_chart(
            self.user, "pie", "Distribution",
            [{"name": "A", "value": 60}, {"name": "B", "value": 40}],
        )
        self.assertEqual(result["chart_type"], "pie")

    def test_invalid_chart_type_returns_error(self):
        result = render_chart(self.user, "scatter", "Title", [{"label": "A", "value": 1}])
        self.assertIn("error", result)

    def test_empty_data_returns_error(self):
        result = render_chart(self.user, "bar", "Title", [])
        self.assertIn("error", result)

    def test_optional_axis_labels_included(self):
        result = render_chart(
            self.user, "line", "Trend",
            [{"label": "Q1", "value": 100}],
            x_label="Quarter", y_label="Amount",
        )
        self.assertEqual(result["x_label"], "Quarter")
        self.assertEqual(result["y_label"], "Amount")

    def test_area_and_line_types_valid(self):
        for chart_type in ("line", "area"):
            result = render_chart(
                self.user, chart_type, "Chart",
                [{"label": "A", "value": 1}],
            )
            self.assertEqual(result["chart_type"], chart_type)
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
docker compose exec django-api python manage.py test apps.copilot.tests.test_rich_tools -v 2 2>&1 | tail -20
```

Expected: `ImportError` or `AttributeError` — `show_startup_cards`, `show_campaign_cards`, `render_chart` don't exist yet.

- [ ] **Step 3: Implement the three new tool functions in `tools.py`**

In `backend/apps/copilot/tools.py`, add the three functions before the `TOOL_DEFINITIONS` list. Find the last existing tool function (e.g., `update_my_profile`) and add after it:

```python
def show_startup_cards(user, startup_ids):
    startups = (
        Startup.objects.filter(id__in=startup_ids[:6])
        .annotate(
            members_count=Count("members"),
            followers_count=Count("followers"),
        )
        .select_related("created_by")
    )
    return {
        "card_type": "startup",
        "items": [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description[:200],
                "industry": s.industry,
                "location": s.location,
                "founding_date": str(s.founding_date),
                "status": s.status,
                "logo_url": s.logo_url,
                "website": s.website or "",
                "members_count": s.members_count,
                "followers_count": s.followers_count,
                "is_following": StartupFollow.objects.filter(startup=s, user=user).exists(),
                "created_by": {
                    "id": str(s.created_by.id),
                    "full_name": s.created_by.full_name,
                    "avatar_url": s.created_by.avatar_url or "",
                    "role": s.created_by.role,
                },
                "created_at": str(s.created_at),
                "updated_at": str(s.updated_at),
            }
            for s in startups
        ],
    }


def show_campaign_cards(user, campaign_ids):
    campaigns = (
        Campaign.objects.filter(id__in=campaign_ids[:6])
        .select_related("startup")
    )
    return {
        "card_type": "campaign",
        "items": [
            {
                "id": c.id,
                "title": c.title,
                "description": c.description[:200],
                "startup": c.startup.id,
                "startup_name": c.startup.name,
                "startup_logo_url": c.startup.logo_url,
                "startup_industry": c.startup.industry,
                "funding_goal": str(c.funding_goal),
                "current_funding": str(c.current_funding),
                "funding_percentage": c.funding_percentage,
                "equity_offered": str(c.equity_offered),
                "deadline": str(c.deadline),
                "status": c.status,
                "created_at": str(c.created_at),
                "updated_at": str(c.updated_at),
            }
            for c in campaigns
        ],
    }


def render_chart(user, chart_type, title, data, x_label=None, y_label=None):
    allowed_types = {"bar", "line", "pie", "area"}
    if chart_type not in allowed_types:
        return {"error": f"Invalid chart_type. Must be one of: {', '.join(sorted(allowed_types))}"}
    if not data or not isinstance(data, list):
        return {"error": "data must be a non-empty list"}
    return {
        "chart_type": chart_type,
        "title": title,
        "data": data,
        "x_label": x_label,
        "y_label": y_label,
    }
```

- [ ] **Step 4: Add tool definitions to `TOOL_DEFINITIONS` list**

In `tools.py`, find the closing `]` of `TOOL_DEFINITIONS` and insert these three entries before it:

```python
    {
        "type": "function",
        "function": {
            "name": "show_startup_cards",
            "description": (
                "Display startup cards visually in the chat. "
                "Call after search_startups or list_startups to render results as rich cards. "
                "Pass the startup IDs from those results."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "startup_ids": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "description": "List of startup IDs to display as cards (max 6)",
                    }
                },
                "required": ["startup_ids"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "show_campaign_cards",
            "description": (
                "Display campaign cards visually in the chat. "
                "Call after search_campaigns or get_my_campaigns to render results as rich cards. "
                "Pass the campaign IDs from those results."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "campaign_ids": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "description": "List of campaign IDs to display as cards (max 6)",
                    }
                },
                "required": ["campaign_ids"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "render_chart",
            "description": (
                "Render a chart or graph visually in the chat. "
                "Use bar for comparisons between items, line or area for trends over time, "
                "pie for proportions or breakdowns. "
                "Always call this after fetching the underlying data with other tools — do not make up data."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "chart_type": {
                        "type": "string",
                        "enum": ["bar", "line", "pie", "area"],
                    },
                    "title": {
                        "type": "string",
                        "description": "Chart title",
                    },
                    "data": {
                        "type": "array",
                        "description": "Data points. For bar/line/area: [{label, value}]. For pie: [{name, value}].",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string"},
                                "name":  {"type": "string"},
                                "value": {"type": "number"},
                            },
                        },
                    },
                    "x_label": {
                        "type": "string",
                        "description": "X-axis label (bar, line, area only). Optional.",
                    },
                    "y_label": {
                        "type": "string",
                        "description": "Y-axis label (bar, line, area only). Optional.",
                    },
                },
                "required": ["chart_type", "title", "data"],
            },
        },
    },
```

- [ ] **Step 5: Register the three tools in `TOOL_REGISTRY`**

In `TOOL_REGISTRY` dict, add:

```python
    "show_startup_cards": show_startup_cards,
    "show_campaign_cards": show_campaign_cards,
    "render_chart": render_chart,
```

- [ ] **Step 6: Run tests and confirm they pass**

```bash
docker compose exec django-api python manage.py test apps.copilot.tests.test_rich_tools -v 2 2>&1 | tail -15
```

Expected: `OK` with all tests passing.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/copilot/tests/test_rich_tools.py backend/apps/copilot/tools.py
git commit -m "feat: add show_startup_cards, show_campaign_cards, render_chart AI tools"
```

---

### Task 4: Stream service — card/chart block SSE + system prompt update

**Files:**
- Modify: `backend/apps/copilot/stream_service.py`

- [ ] **Step 1: Replace the tool result emission block in `_run_stream_loop`**

Find the block that starts right after `result = await sync_to_async(execute_tool)(tool_name, user, tool_args)` (around line 267). Currently it reads:

```python
                result = await sync_to_async(execute_tool)(tool_name, user, tool_args)

                yield "tool_result", {"tool_call_id": tc["id"], "result": result}

                await CopilotMessage.objects.acreate(
                    conversation=conversation,
                    role="tool",
                    content=json.dumps(result, default=str),
                    tool_name=tc["id"],
                )

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": json.dumps(result, default=str),
                })
```

Replace it with:

```python
                result = await sync_to_async(execute_tool)(tool_name, user, tool_args)

                if "card_type" in result:
                    yield "card_block", result
                    ack = {"status": "displayed", "count": len(result.get("items", []))}
                    content_to_save = json.dumps(ack, default=str)
                elif "chart_type" in result and "error" not in result:
                    yield "chart_block", result
                    ack = {"status": "rendered", "chart_type": result["chart_type"]}
                    content_to_save = json.dumps(ack, default=str)
                else:
                    yield "tool_result", {"tool_call_id": tc["id"], "result": result}
                    content_to_save = json.dumps(result, default=str)

                await CopilotMessage.objects.acreate(
                    conversation=conversation,
                    role="tool",
                    content=content_to_save,
                    tool_name=tc["id"],
                )

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": content_to_save,
                })
```

- [ ] **Step 2: Update `build_system_prompt` — add card/chart capabilities**

In `build_system_prompt`, find the capabilities bullet list and add two new lines after the `search_startups` / `list_startups` bullet (or at the end of the capabilities list, before "Guidelines:"):

```python
        "- Search and browse startups by name, description, or industry category\n"
        "- Filter campaigns by industry when searching\n"
        "- Render startup or campaign cards visually using show_startup_cards / show_campaign_cards after fetching IDs\n"
        "- Render charts using render_chart after computing the data with other tools\n"
```

Also add to the Guidelines section:

```python
        "- After calling show_startup_cards, show_campaign_cards, or render_chart, add a brief 1–2 sentence text summary\n"
```

- [ ] **Step 3: Verify the stream service imports `json` (already present)**

```bash
grep "^import json" /home/dev-daly/projects/funderise/backend/apps/copilot/stream_service.py
```

Expected: `import json` is present (it's used already for tool result serialization).

- [ ] **Step 4: Run the existing copilot test to confirm nothing is broken**

```bash
docker compose exec django-api python manage.py test apps.copilot -v 2 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/copilot/stream_service.py
git commit -m "feat: emit card_block/chart_block SSE events and update system prompt"
```

---

### Task 5: QuestionForm — five new question type branches

**Files:**
- Modify: `frontend/src/components/copilot/QuestionForm.tsx`

> **Prerequisite:** Spec 1 (UI Design System) plan must be executed. The `Select`, `DateInput`, and `Input` components must exist in `frontend/src/components/ui/` before this task.

- [ ] **Step 1: Update imports in `QuestionForm.tsx`**

Replace the existing import block at the top of the file:

```tsx
import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, Edit2, Star } from "lucide-react";
import type { QuestionDef, QuestionForm as QuestionFormType } from "@/types";
import { Select } from "@/components/ui/Select";
import { DateInput } from "@/components/ui/DateInput";
import { Input } from "@/components/ui/Input";
```

- [ ] **Step 2: Add five new branches to `QuestionInput`**

In the `QuestionInput` function, insert the five new branches after the `textarea` branch and before the final `return` (the default text input). The final default input should become `<Input type="text" ...>` using the Spec 1 Input component.

Replace the `textarea` branch + default return with:

```tsx
  if (question.type === "textarea") {
    return (
      <textarea
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder ?? ""}
        rows={3}
        className="w-full rounded-xl border border-brand-border/40 bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-1 focus:ring-brand-accent resize-none"
      />
    );
  }

  if (question.type === "select") {
    const opts = (question.options ?? []).map((o) => ({ value: o, label: o }));
    return (
      <Select
        options={opts}
        value={(value as string) ?? ""}
        onChange={(val) => onChange(val)}
        placeholder={question.placeholder ?? "Select…"}
      />
    );
  }

  if (question.type === "date") {
    return (
      <DateInput
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (question.type === "number") {
    return (
      <Input
        type="number"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder ?? ""}
        min={question.min}
        max={question.max}
        step={question.step}
      />
    );
  }

  if (question.type === "rating") {
    const rating = Number(value as string) || 0;
    return (
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(String(star))}
            className="focus:outline-none"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                star <= rating
                  ? "text-amber-400 fill-amber-400"
                  : "text-brand-border hover:text-amber-300"
              }`}
            />
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "slider") {
    const numVal = Number(value as string) || (question.min ?? 0);
    const min = question.min ?? 0;
    const max = question.max ?? 100;
    const step = question.step ?? 1;
    return (
      <div className="space-y-2">
        <div className="text-center text-sm font-medium text-brand-text tabular-nums">
          {numVal}
        </div>
        <input
          type="range"
          value={numVal}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value)}
          className="w-full accent-brand-accent"
        />
        <div className="flex justify-between text-xs text-brand-muted tabular-nums">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    );
  }

  return (
    <Input
      type="text"
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={question.placeholder ?? ""}
    />
  );
```

- [ ] **Step 3: Update `formatAnswer` to label rating values**

Replace the `formatAnswer` function:

```tsx
function formatAnswer(q: QuestionDef, value: unknown): string {
  if (Array.isArray(value)) return (value as string[]).join(", ") || "—";
  if (q.type === "rating" && value) return `${value as string} / 5`;
  return (value as string) || "—";
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/dev-daly/projects/funderise/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/copilot/QuestionForm.tsx
git commit -m "feat: add select, date, number, rating, slider question types to QuestionForm"
```

---

### Task 6: Extract `StartupCard` component

**Files:**
- Create: `frontend/src/components/startups/StartupCard.tsx`
- Modify: `frontend/src/pages/startups/StartupsPage.tsx`

- [ ] **Step 1: Create `frontend/src/components/startups/StartupCard.tsx`**

```tsx
import { type CSSProperties } from "react";
import { Building2, MapPin, Users, Heart, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import type { Startup } from "@/types";

interface StartupCardProps {
  startup: Startup;
  hover?: boolean;
  onFollow?: (id: number) => void;
  showAdminActions?: boolean;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  className?: string;
  style?: CSSProperties;
}

export function StartupCard({
  startup,
  hover,
  onFollow,
  showAdminActions,
  onApprove,
  onReject,
  className,
  style,
}: StartupCardProps) {
  return (
    <Card hover={hover} className={`h-full ${className ?? ""}`} style={style}>
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {startup.logo_url ? (
              <img
                src={startup.logo_url}
                alt={startup.name}
                className="w-11 h-11 rounded-xl object-cover"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-brand-accent/[0.08] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-brand-accent" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-brand-text text-sm">{startup.name}</h3>
              <p className="text-xs text-brand-muted">{startup.industry}</p>
            </div>
          </div>
          <Badge status={startup.status} />
        </div>

        <p className="text-sm text-brand-muted line-clamp-2 mb-4 flex-1 leading-relaxed">
          {startup.description}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-brand-border/[0.08]">
          <div className="flex items-center gap-3.5 text-[11px] text-brand-muted">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {startup.location}
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <Users className="w-3.5 h-3.5" />
              {startup.members_count}
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <Heart className="w-3.5 h-3.5" />
              {startup.followers_count}
            </span>
          </div>
          {onFollow && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onFollow(startup.id);
              }}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                startup.is_following
                  ? "text-rose-500 bg-rose-50 hover:bg-rose-100"
                  : "text-brand-muted hover:text-rose-500 hover:bg-rose-50"
              }`}
            >
              <Heart
                className="w-4 h-4"
                fill={startup.is_following ? "currentColor" : "none"}
              />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Avatar
            src={startup.created_by.avatar_url || undefined}
            name={startup.created_by.full_name}
            size="sm"
          />
          <span className="text-[11px] text-brand-muted">{startup.created_by.full_name}</span>
        </div>

        {showAdminActions && startup.status === "pending_approval" && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-brand-border/[0.08]">
            <button
              onClick={(e) => {
                e.preventDefault();
                onApprove?.(startup.id);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                onReject?.(startup.id);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Update `StartupsPage.tsx` to use `StartupCard`**

In `frontend/src/pages/startups/StartupsPage.tsx`:

1. Add the import after existing imports:
```tsx
import { StartupCard } from "@/components/startups/StartupCard";
```

2. Remove these now-redundant imports that are only used in the card (keep any still used elsewhere):
   - `MapPin`, `Users`, `Heart`, `CheckCircle2`, `XCircle` — used only in the card, can remove if not used elsewhere in the file
   - `Badge`, `Avatar` — used only in the card, remove if not used elsewhere

3. Replace the card rendering inside the `filtered.map(...)` block. Find this block:
```tsx
          {filtered.map((startup, i) => (
            <Link key={startup.id} to={`/startups/${startup.id}`}>
              <Card hover className="h-full" style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}>
                <div className="flex flex-col h-full">
                  ... (all the card content) ...
                </div>
              </Card>
            </Link>
          ))}
```

Replace with:
```tsx
          {filtered.map((startup, i) => (
            <Link key={startup.id} to={`/startups/${startup.id}`}>
              <StartupCard
                startup={startup}
                hover
                onFollow={handleFollow}
                showAdminActions={profile?.role === "admin"}
                onApprove={handleApprove}
                onReject={handleReject}
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
              />
            </Link>
          ))}
```

4. Remove the `Card` import if it is no longer referenced elsewhere in the file.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/dev-daly/projects/funderise/frontend && npx tsc --noEmit 2>&1 | grep "startups\|StartupCard" | head -10
```

Expected: no errors relating to StartupCard or StartupsPage.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/startups/StartupCard.tsx frontend/src/pages/startups/StartupsPage.tsx
git commit -m "refactor: extract StartupCard component from StartupsPage"
```

---

### Task 7: Extract `CampaignCard` component

**Files:**
- Create: `frontend/src/components/campaigns/CampaignCard.tsx`
- Modify: `frontend/src/pages/campaigns/CampaignsPage.tsx`

- [ ] **Step 1: Create `frontend/src/components/campaigns/CampaignCard.tsx`**

```tsx
import { type CSSProperties } from "react";
import { Building2, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Campaign } from "@/types";

interface CampaignCardProps {
  campaign: Campaign;
  hover?: boolean;
  showAdminActions?: boolean;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  className?: string;
  style?: CSSProperties;
}

export function CampaignCard({
  campaign,
  hover,
  showAdminActions,
  onApprove,
  onReject,
  className,
  style,
}: CampaignCardProps) {
  return (
    <Card hover={hover} className={`h-full ${className ?? ""}`} style={style}>
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {campaign.startup_logo_url ? (
              <img
                src={campaign.startup_logo_url}
                alt={campaign.startup_name}
                className="w-10 h-10 rounded-xl object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-brand-accent/[0.08] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-brand-accent" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-brand-text text-sm">{campaign.title}</h3>
              <p className="text-xs text-brand-muted mt-0.5">{campaign.startup_name}</p>
            </div>
          </div>
          <Badge status={campaign.status} />
        </div>

        <p className="text-sm text-brand-muted line-clamp-2 mb-4 flex-1 leading-relaxed">
          {campaign.description}
        </p>

        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] text-brand-muted mb-1.5 tabular-nums">
            <span className="font-semibold text-brand-text">
              ${Number(campaign.current_funding).toLocaleString()}
            </span>
            <span>of ${Number(campaign.funding_goal).toLocaleString()}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-brand-bg overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-accent to-brand-accent/70 transition-all"
              style={{ width: `${Math.min(campaign.funding_percentage, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[11px] font-semibold text-brand-accent tabular-nums">
              {campaign.funding_percentage}% funded
            </span>
            <span className="text-[11px] text-brand-muted tabular-nums">
              {campaign.equity_offered}% equity
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-brand-muted pt-3 border-t border-brand-border/[0.08] tabular-nums">
          <Calendar className="w-3.5 h-3.5" />
          Deadline: {new Date(campaign.deadline).toLocaleDateString()}
        </div>

        {showAdminActions && campaign.status === "pending_approval" && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-brand-border/[0.08]">
            <button
              onClick={(e) => {
                e.preventDefault();
                onApprove?.(campaign.id);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                onReject?.(campaign.id);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Update `CampaignsPage.tsx` to use `CampaignCard`**

In `frontend/src/pages/campaigns/CampaignsPage.tsx`:

1. Add import:
```tsx
import { CampaignCard } from "@/components/campaigns/CampaignCard";
```

2. Replace the card block inside `filtered.map(...)`. Find:
```tsx
          {filtered.map((campaign, i) => (
            <Link key={campaign.id} to={`/campaigns/${campaign.id}`}>
              <Card hover className="h-full" style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}>
                <div className="flex flex-col h-full">
                  ... (all campaign card content) ...
                </div>
              </Card>
            </Link>
          ))}
```

Replace with:
```tsx
          {filtered.map((campaign, i) => (
            <Link key={campaign.id} to={`/campaigns/${campaign.id}`}>
              <CampaignCard
                campaign={campaign}
                hover
                showAdminActions={profile?.role === "admin"}
                onApprove={handleApprove}
                onReject={handleReject}
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
              />
            </Link>
          ))}
```

3. Remove now-unused imports from `CampaignsPage.tsx` that were only used in the inlined card markup (e.g., `Building2`, `Calendar`, `Badge` if not used elsewhere).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/dev-daly/projects/funderise/frontend && npx tsc --noEmit 2>&1 | grep "campaign\|Campaign" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/campaigns/CampaignCard.tsx frontend/src/pages/campaigns/CampaignsPage.tsx
git commit -m "refactor: extract CampaignCard component from CampaignsPage"
```

---

### Task 8: `CardBlock` component

**Files:**
- Create: `frontend/src/components/copilot/CardBlock.tsx`

- [ ] **Step 1: Create `frontend/src/components/copilot/CardBlock.tsx`**

```tsx
import type { CardBlock as CardBlockType, Startup, Campaign } from "@/types";
import { StartupCard } from "@/components/startups/StartupCard";
import { CampaignCard } from "@/components/campaigns/CampaignCard";

interface CardBlockProps {
  block: CardBlockType;
}

export function CardBlock({ block }: CardBlockProps) {
  if (!block.items.length) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
      {block.items.map((item) =>
        block.card_type === "startup" ? (
          <div key={(item as Startup).id} className="w-72 shrink-0">
            <StartupCard startup={item as Startup} />
          </div>
        ) : (
          <div key={(item as Campaign).id} className="w-72 shrink-0">
            <CampaignCard campaign={item as Campaign} />
          </div>
        ),
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/dev-daly/projects/funderise/frontend && npx tsc --noEmit 2>&1 | grep "CardBlock" | head -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/copilot/CardBlock.tsx
git commit -m "feat: add CardBlock component for inline card rendering in AI chat"
```

---

### Task 9: `ChartBlock` component

**Files:**
- Create: `frontend/src/components/copilot/ChartBlock.tsx`

- [ ] **Step 1: Create `frontend/src/components/copilot/ChartBlock.tsx`**

```tsx
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/ui/ChartCard";
import {
  AXIS_STYLE,
  CHART_COLORS,
  CHART_COLORS_ARRAY,
  GRID_STROKE,
} from "@/lib/chartUtils";
import type { ChartBlock as ChartBlockType } from "@/types";

interface ChartBlockProps {
  block: ChartBlockType;
}

export function ChartBlock({ block }: ChartBlockProps) {
  if (!block.data.length) {
    return (
      <div className="rounded-2xl border border-brand-border/20 bg-white p-4 text-sm text-brand-muted">
        No data available
      </div>
    );
  }

  return (
    <ChartCard title={block.title}>
      <ResponsiveContainer width="100%" height="100%">
        {block.chart_type === "bar" ? (
          <BarChart data={block.data}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="label" {...AXIS_STYLE} />
            <YAxis {...AXIS_STYLE} />
            <Tooltip />
            <Bar dataKey="value" fill={CHART_COLORS.accent} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : block.chart_type === "line" ? (
          <LineChart data={block.data}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="label" {...AXIS_STYLE} />
            <YAxis {...AXIS_STYLE} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke={CHART_COLORS.accent}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.accent, r: 0 }}
            />
          </LineChart>
        ) : block.chart_type === "area" ? (
          <AreaChart data={block.data}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="label" {...AXIS_STYLE} />
            <YAxis {...AXIS_STYLE} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="value"
              stroke={CHART_COLORS.accent}
              fill={`${CHART_COLORS.accent}33`}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.accent, r: 0 }}
            />
          </AreaChart>
        ) : (
          <PieChart>
            <Pie
              data={block.data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
            >
              {block.data.map((_, i) => (
                <Cell
                  key={i}
                  fill={CHART_COLORS_ARRAY[i % CHART_COLORS_ARRAY.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        )}
      </ResponsiveContainer>
    </ChartCard>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/dev-daly/projects/funderise/frontend && npx tsc --noEmit 2>&1 | grep "ChartBlock\|chartUtils" | head -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/copilot/ChartBlock.tsx
git commit -m "feat: add ChartBlock component for inline chart rendering in AI chat"
```

---

### Task 10: Update `useAIStream` — cardBlocks/chartBlocks state + SSE handlers

**Files:**
- Modify: `frontend/src/hooks/useAIStream.ts`

- [ ] **Step 1: Update imports and `INITIAL_STATE`**

In `frontend/src/hooks/useAIStream.ts`, update the type import at line 3:

```ts
import type { AIStreamState, CardBlock, ChartBlock, QuestionForm, ToolCallState } from "@/types";
```

Update `INITIAL_STATE` to include the new fields:

```ts
const INITIAL_STATE: AIStreamState = {
  pendingUserContent: null,
  pendingMediaUrl: null,
  pendingMediaType: null,
  liveThinking: "",
  thinkingDuration: null,
  liveText: "",
  toolCalls: [],
  questionForm: null,
  cardBlocks: [],
  chartBlocks: [],
  isStreaming: false,
  streamError: null,
};
```

- [ ] **Step 2: Add `card_block` and `chart_block` cases to the switch statement**

In the `switch (eventType)` block inside `_consumeStream`, add two new cases after the `"tool_result"` case:

```ts
              case "card_block":
                setState((s) => ({
                  ...s,
                  cardBlocks: [...s.cardBlocks, data as unknown as CardBlock],
                }));
                break;
              case "chart_block":
                setState((s) => ({
                  ...s,
                  chartBlocks: [...s.chartBlocks, data as unknown as ChartBlock],
                }));
                break;
```

- [ ] **Step 3: Reset `cardBlocks` and `chartBlocks` in `submitToolResult`**

In `submitToolResult`, the `setState` call already resets most state. Add the two new fields to the reset:

```ts
      setState((s) => ({
        ...s,
        questionForm: null,
        liveThinking: "",
        thinkingDuration: null,
        liveText: "",
        toolCalls: [],
        cardBlocks: [],
        chartBlocks: [],
        isStreaming: true,
        streamError: null,
      }));
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/dev-daly/projects/funderise/frontend && npx tsc --noEmit 2>&1 | grep "useAIStream\|AIStream" | head -5
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useAIStream.ts
git commit -m "feat: add cardBlocks/chartBlocks state and SSE handlers to useAIStream"
```

---

### Task 11: Update `AICopilotPanel` — render CardBlock and ChartBlock

**Files:**
- Modify: `frontend/src/components/copilot/AICopilotPanel.tsx`

- [ ] **Step 1: Add imports for `CardBlock` and `ChartBlock`**

At the top of `AICopilotPanel.tsx`, add:

```tsx
import { CardBlock } from "./CardBlock";
import { ChartBlock } from "./ChartBlock";
```

- [ ] **Step 2: Insert CardBlock and ChartBlock rendering after the live text block**

Find the existing comment `{/* Question form */}` block (around line 247). Just before that comment, after the streaming live text `div` closes, insert:

```tsx
              {stream.cardBlocks.map((block, i) => (
                <div key={i} className="flex justify-start w-full">
                  <div className="w-full max-w-[90%]">
                    <CardBlock block={block} />
                  </div>
                </div>
              ))}
              {stream.chartBlocks.map((block, i) => (
                <div key={i} className="flex justify-start w-full">
                  <div className="w-full max-w-[90%]">
                    <ChartBlock block={block} />
                  </div>
                </div>
              ))}
```

The final rendering order in the streaming assistant message area becomes:
1. `ToolCallBlock` (tool summaries)
2. `ThinkingBlock`
3. Live text + markdown
4. **CardBlock rows** (new)
5. **ChartBlock rows** (new)
6. `QuestionForm`

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/dev-daly/projects/funderise/frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/copilot/AICopilotPanel.tsx
git commit -m "feat: render CardBlock and ChartBlock in AICopilotPanel"
```

---

### Task 12: Smoke test

- [ ] **Step 1: Start all services**

```bash
docker compose up 2>&1 | grep -E "Starting|webpack|daphne" &
sleep 8
```

- [ ] **Step 2: Confirm Django is healthy**

```bash
curl -s http://localhost:8000/api/health/ | python3 -m json.tool
```

Expected: `{"status": "ok"}` or similar.

- [ ] **Step 3: Confirm frontend builds without TS errors**

```bash
cd /home/dev-daly/projects/funderise/frontend && npx tsc --noEmit 2>&1 | wc -l
```

Expected: 0 lines (no errors).

- [ ] **Step 4: Manual checklist — open http://localhost:5173 in a browser**

Check each item manually:

**Question form — new types:**
- [ ] Open AI copilot, ask it to ask you about your investment preferences — verify it can send a `select` question
- [ ] Verify `rating` renders 5 clickable stars with amber fill
- [ ] Verify `slider` shows current value above the track with min/max labels

**Card rendering:**
- [ ] Ask the AI: "Show me some startups" — verify it calls `search_startups` or `list_startups` followed by `show_startup_cards`, and cards appear inline in chat
- [ ] Verify the cards match the StartupsPage grid item style
- [ ] Ask the AI: "Show me active campaigns" — verify campaign cards appear inline

**Chart rendering:**
- [ ] Ask the AI: "Show me a chart of my investment history" — verify a chart appears inline
- [ ] Verify bar / pie / line renders with correct colours from `chartUtils.ts`

**Regression check:**
- [ ] StartupsPage grid still renders identically (extracted StartupCard looks same)
- [ ] CampaignsPage grid still renders identically (extracted CampaignCard looks same)
- [ ] QuestionForm existing types (`radio`, `checkbox`, `text`, `textarea`) still work

- [ ] **Step 5: Run full copilot test suite**

```bash
docker compose exec django-api python manage.py test apps.copilot -v 2 2>&1 | tail -10
```

Expected: all tests pass.
