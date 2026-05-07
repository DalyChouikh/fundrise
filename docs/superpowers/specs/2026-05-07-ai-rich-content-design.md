# Spec 3: AI Rich Content — Enhanced Questions, Cards & Charts

**Date:** 2026-05-07  
**Status:** Approved  
**Depends on:** Spec 1 (UI Design System) — `QuestionForm` uses `Select`, `DateInput`, `Input` from Spec 1.

---

## Overview

Three enhancements to the AI Copilot, all building on the existing SSE streaming architecture:

1. **Enhanced question types** — `ask_user_questions` gains `select`, `date`, `number`, `rating`, `slider`. `QuestionForm.tsx` renders them using Spec 1 components.
2. **Card rendering** — Two new tools (`show_startup_cards`, `show_campaign_cards`). Backend emits a `card_block` SSE event. Frontend renders the same card components used on the Startups/Campaigns pages, inline in chat.
3. **Chart rendering** — One new tool (`render_chart`). AI autonomously picks type (bar/line/pie/area), title, and data. Backend emits a `chart_block` SSE event. Frontend renders via Recharts + existing `chartUtils.ts`.

**Architectural principle:** Cards and charts render as distinct blocks *after* the message text — not interleaved mid-sentence. Rendering order within a message:
```
thinking block → tool call summaries → text (markdown) → card blocks → chart blocks → question form
```

---

## Part 1: Enhanced Question Types

### New Types

| Type | Renders as | Extra props |
|------|-----------|-------------|
| `select` | `Select` component (Spec 1) — options dropdown | `options: string[]` (already in schema) |
| `date` | `DateInput` component (Spec 1) | none |
| `number` | `Input type="number"` | `min?: number`, `max?: number`, `step?: number` |
| `rating` | Row of 5 clickable star icons, value = 1–5 | none |
| `slider` | `<input type="range">` with value + min/max labels | `min?: number`, `max?: number`, `step?: number` |

### `QuestionDef` TypeScript type update (`types/index.ts`)

```ts
export interface QuestionDef {
  id: string
  type: "radio" | "checkbox" | "text" | "textarea" | "select" | "date" | "number" | "rating" | "slider"
  label: string
  options?: string[]
  placeholder?: string
  required?: boolean
  min?: number      // new — used by number, slider
  max?: number      // new — used by number, slider
  step?: number     // new — used by number, slider
}
```

### `QuestionForm.tsx` — new branches in `QuestionInput`

**`select`:** Renders `<Select>` from Spec 1. `options` prop mapped from `question.options`. Value is a single string.

**`date`:** Renders `<DateInput>` from Spec 1. Value is a date string `YYYY-MM-DD`.

**`number`:** Renders `<Input type="number">` with `min`, `max`, `step` from question def. Value is a string (same as existing text input pattern).

**`rating`:** Five `Star` icons (lucide-react). Filled gold (`text-amber-400 fill-amber-400`) up to current value, outlined beyond. Hover previews the rating. Value is a number 1–5 stored as string for consistency.

**`slider`:** Native `<input type="range">` with `min`, `max`, `step` from question def. Styled with `accent-brand-accent` (Tailwind). Shows current numeric value centered above the slider. Min/max labels at each end.

### `ASK_USER_QUESTIONS_DEFINITION` update (`stream_service.py`)

```python
"type": {
    "type": "string",
    "enum": ["radio", "checkbox", "text", "textarea", "select", "date", "number", "rating", "slider"]
},
```

Add optional properties to question item schema:
```python
"min":  {"type": "number", "description": "Minimum value (number, slider)"},
"max":  {"type": "number", "description": "Maximum value (number, slider)"},
"step": {"type": "number", "description": "Step increment (number, slider)"},
```

---

## Part 2: Card Rendering

### Card Component Extraction

Card markup currently lives inline in page `.map()` calls. Extract to standalone components:

**`frontend/src/components/startups/StartupCard.tsx`**
```ts
interface StartupCardProps {
  startup: Startup
  onFollow?: (id: number) => void
  showAdminActions?: boolean
  onApprove?: (id: number) => void
  onReject?: (id: number) => void
}
```
Renders the exact same card as the current `StartupsPage` grid item. `onFollow`, `showAdminActions`, `onApprove`, `onReject` are optional — omit them in chat context.

**`frontend/src/components/campaigns/CampaignCard.tsx`**
```ts
interface CampaignCardProps {
  campaign: Campaign
  showAdminActions?: boolean
  onApprove?: (id: number) => void
  onReject?: (id: number) => void
}
```
Renders the exact same card as the current `CampaignsPage` grid item.

Both page files refactored to import and use these components.

### New AI Tools

**`show_startup_cards(user, startup_ids)`**

```python
def show_startup_cards(user, startup_ids):
    startups = (
        Startup.objects.filter(id__in=startup_ids[:6])
        .annotate(members_count=Count("members"), followers_count=Count("followers"))
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
                "status": s.status,
                "logo_url": s.logo_url,
                "members_count": s.members_count,
                "followers_count": s.followers_count,
                "is_following": StartupFollow.objects.filter(startup=s, user=user).exists(),
                "created_by": {
                    "id": str(s.created_by.id),
                    "full_name": s.created_by.full_name,
                    "avatar_url": s.created_by.avatar_url or "",
                    "role": s.created_by.role,
                },
            }
            for s in startups
        ],
    }
```

Max 6 cards enforced by `[:6]` slice.

**`show_campaign_cards(user, campaign_ids)`**

```python
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
            }
            for c in campaigns
        ],
    }
```

**Tool definitions:**

```python
{
    "name": "show_startup_cards",
    "description": "Display startup cards visually in the chat. Call after search_startups or list_startups to render results as rich cards. Pass the startup IDs from those results.",
    "parameters": {
        "startup_ids": {"type": "array", "items": {"type": "integer"}, "description": "List of startup IDs to display as cards (max 6)"}
    },
    "required": ["startup_ids"]
},
{
    "name": "show_campaign_cards",
    "description": "Display campaign cards visually in the chat. Call after search_campaigns or get_my_campaigns to render results as rich cards. Pass the campaign IDs from those results.",
    "parameters": {
        "campaign_ids": {"type": "array", "items": {"type": "integer"}, "description": "List of campaign IDs to display as cards (max 6)"}
    },
    "required": ["campaign_ids"]
}
```

### Stream Service Changes

In `_run_stream_loop`, after `execute_tool` returns, check result type:

```python
result = execute_tool(tool_name, user, arguments)

if "card_type" in result:
    yield "card_block", result          # emits card_block SSE event
elif "chart_type" in result:
    yield "chart_block", result         # emits chart_block SSE event
else:
    # normal tool result fed back to AI
    yield "tool_result", {"tool_call_id": ..., "content": json.dumps(result)}
```

SSE format for card block:
```
data: {"type": "card_block", "card_type": "startup", "items": [...]}
```

**Note:** When a `card_block` or `chart_block` SSE event is emitted to the frontend, the stream service also feeds a minimal acknowledgment back into the AI conversation so the tool calling loop completes normally:
- Cards: `{"status": "displayed", "count": N}` 
- Charts: `{"status": "rendered", "chart_type": "..."}`

The AI then generates its follow-up text summary based on this acknowledgment.

### System Prompt Addition

```
- Render startup or campaign cards visually using show_startup_cards / show_campaign_cards after fetching IDs
- Render charts using render_chart after computing the data with other tools
- After calling show_*_cards or render_chart, add a brief 1-2 sentence text summary
```

### Frontend — New Types (`types/index.ts`)

```ts
export interface CardBlock {
  card_type: "startup" | "campaign"
  items: Startup[] | Campaign[]
}

export interface ChartBlock {
  chart_type: "bar" | "line" | "pie" | "area"
  title: string
  data: { label?: string; name?: string; value: number }[]
  x_label?: string
  y_label?: string
}
```

`AIStreamState` gains:
```ts
cardBlocks: CardBlock[]
chartBlocks: ChartBlock[]
```

### Frontend — New Component `components/copilot/CardBlock.tsx`

```ts
interface CardBlockProps {
  block: CardBlock
}
```

Renders a horizontally scrollable row:
```html
<div class="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
  {block.items.map(item =>
    block.card_type === "startup"
      ? <div class="w-72 shrink-0"><StartupCard startup={item} /></div>
      : <div class="w-72 shrink-0"><CampaignCard campaign={item} /></div>
  )}
</div>
```

### `AICopilotPanel` render order update

After `<MarkdownMessage>`:
```tsx
{streamState.cardBlocks.map((block, i) => <CardBlock key={i} block={block} />)}
{streamState.chartBlocks.map((block, i) => <ChartBlock key={i} block={block} />)}
{streamState.questionForm && <QuestionForm ... />}
```

---

## Part 3: Chart Rendering

### New AI Tool: `render_chart`

```python
def render_chart(user, chart_type, title, data, x_label=None, y_label=None):
    allowed_types = {"bar", "line", "pie", "area"}
    if chart_type not in allowed_types:
        return {"error": f"Invalid chart_type. Must be one of: {', '.join(allowed_types)}"}
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

**Tool definition:**
```python
{
    "name": "render_chart",
    "description": (
        "Render a chart or graph visually in the chat. "
        "Use bar for comparisons between items, line or area for trends over time, pie for proportions or breakdowns. "
        "Always call this after fetching the underlying data with other tools — do not make up data."
    ),
    "parameters": {
        "chart_type": {"type": "string", "enum": ["bar", "line", "pie", "area"]},
        "title": {"type": "string", "description": "Chart title"},
        "data": {
            "type": "array",
            "description": "Data points. For bar/line/area: [{label, value}]. For pie: [{name, value}].",
            "items": {
                "type": "object",
                "properties": {
                    "label": {"type": "string"},
                    "name":  {"type": "string"},
                    "value": {"type": "number"}
                }
            }
        },
        "x_label": {"type": "string", "description": "X-axis label (bar, line, area only). Optional."},
        "y_label": {"type": "string", "description": "Y-axis label (bar, line, area only). Optional."},
    },
    "required": ["chart_type", "title", "data"]
}
```

### Frontend — New Component `components/copilot/ChartBlock.tsx`

```ts
interface ChartBlockProps {
  block: ChartBlock
}
```

Renders inside a `ChartCard` shell (existing component, provides title + fixed-height container):
- Width: `100%`, height: `240px`
- Uses `CHART_COLORS`, `AXIS_STYLE`, `GRID_STROKE` from `chartUtils.ts`
- `ResponsiveContainer` wraps all chart types

**Per chart type:**

`bar` → `BarChart` + `CartesianGrid` + `XAxis(dataKey="label")` + `YAxis` + `Tooltip` + `Bar(fill=CHART_COLORS.accent)`

`line` → `LineChart` + `CartesianGrid` + `XAxis(dataKey="label")` + `YAxis` + `Tooltip` + `Line(stroke=CHART_COLORS.accent, dot=false)`

`area` → `AreaChart` + same as line + `Area(fill=CHART_COLORS.accent/20, stroke=CHART_COLORS.accent)`

`pie` → `PieChart` + `Pie(dataKey="value", nameKey="name")` + `CHART_COLORS_ARRAY` cell fill + `Tooltip` + `Legend`

---

## File Structure

```
backend/
  apps/copilot/
    tools.py          (updated — show_startup_cards, show_campaign_cards, render_chart added)
    stream_service.py (updated — ASK_USER_QUESTIONS_DEFINITION, card/chart SSE detection, system prompt)

frontend/src/
  components/
    startups/
      StartupCard.tsx      (new — extracted from StartupsPage)
    campaigns/
      CampaignCard.tsx     (new — extracted from CampaignsPage)
    copilot/
      CardBlock.tsx        (new)
      ChartBlock.tsx       (new)
      QuestionForm.tsx     (updated — 5 new question type branches)
  hooks/
    useAIStream.ts         (updated — cardBlocks, chartBlocks state + event handlers)
  pages/
    startups/StartupsPage.tsx    (updated — uses StartupCard component)
    campaigns/CampaignsPage.tsx  (updated — uses CampaignCard component)
  types/index.ts           (updated — QuestionDef, CardBlock, ChartBlock, AIStreamState)
```

---

## Error Handling

- `render_chart` validates `chart_type` and `data` server-side — returns `{"error": "..."}` for invalid input; the AI sees this and can correct itself
- `show_startup_cards` / `show_campaign_cards` — non-existent IDs are silently skipped (the query just returns fewer results); if all IDs are invalid, returns `{"card_type": "startup", "items": []}` and no card block is emitted
- `ChartBlock` — if `data` is empty, renders a "No data available" placeholder instead of an empty chart
- `CardBlock` — if `items` is empty, renders nothing (no empty state needed since the AI should not call this with empty results)

---

## What This Does NOT Include

- No interleaved text+card layout (cards always appear as a block after text)
- No interactive cards in chat (follow button disabled, no navigation from chat cards — user clicks through to the pages for actions)
- No chart editing or regeneration in chat
- No multi-series charts (all charts are single-series for simplicity)
- No `render_chart` streaming — chart data is returned in full when the tool resolves
