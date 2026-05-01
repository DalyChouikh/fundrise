# SP5: Analytics & Reporting — Design Spec

## Goal

Add Recharts-powered analytics charts to each role's dashboard, placed below the existing content. A single backend endpoint returns role-specific time-series and aggregate data; the frontend renders it in a responsive 2-column grid of chart cards.

## Scope

- One new backend endpoint: `GET /api/dashboard/analytics/`
- One new shared component: `ChartCard`
- Charts added to `FounderDashboard`, `InvestorDashboard`, and `AdminDashboard`
- Install `recharts` package
- New TypeScript types for analytics response data
- No new pages — charts appear below existing dashboard content

---

## 1. Backend: Analytics Endpoint

**File:** `backend/apps/core/views.py`

Add a new view function `dashboard_analytics` below the existing `dashboard_stats` view. Register it in `backend/apps/core/urls.py` as `path("dashboard/analytics/", views.dashboard_analytics, name="dashboard-analytics")`.

**Decorators:** `@api_view(["GET"])` and `@permission_classes([IsAuthenticated])` (matching the existing `dashboard_stats` pattern).

**Role routing:** `team_member` uses the same analytics as `founder` (both derive `user_startup_ids` from `StartupMember`).

**Imports needed:**
```python
from django.db.models import Count, F, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from dateutil.relativedelta import relativedelta
```

`Sum` is already imported in the file. Add `Count`, `F`, and `TruncMonth`.

**`user_startup_ids` derivation (founder/team_member):** Same as existing `dashboard_stats`:
```python
user_startup_ids = StartupMember.objects.filter(user=user).values_list("startup_id", flat=True)
```

Also install `python-dateutil` in the backend container (add to `requirements.txt`).

**Time window:** Last 6 months from today, grouped by month using `TruncMonth`.

### Founder Response

```json
{
  "funding_over_time": [
    { "month": "2026-01", "amount": 15000.00 }
  ],
  "investments_per_period": [
    { "month": "2026-01", "count": 3 }
  ],
  "campaign_comparison": [
    { "title": "Campaign A", "raised": 25000.00, "goal": 50000.00 }
  ],
  "follower_growth": [
    { "month": "2026-01", "count": 12 }
  ]
}
```

**Queries:**
- `funding_over_time`: `Investment.objects.filter(campaign__startup_id__in=user_startup_ids, status="confirmed", created_at__gte=six_months_ago)` → `annotate(month=TruncMonth("created_at"))` → `values("month")` → `annotate(amount=Sum("amount"))` → `order_by("month")`
- `investments_per_period`: Same filter → `annotate(month=TruncMonth("created_at"))` → `values("month")` → `annotate(count=Count("id"))` → `order_by("month")`
- `campaign_comparison`: `Campaign.objects.filter(startup_id__in=user_startup_ids, status__in=["active", "completed"])` → `.annotate(raised=F("current_funding"), goal=F("funding_goal"))` → `.values("title", "raised", "goal")` (no time grouping, just current snapshot). Note: alias `current_funding` → `raised` and `funding_goal` → `goal` to match the frontend type.
- `follower_growth`: `StartupFollow.objects.filter(startup_id__in=user_startup_ids, created_at__gte=six_months_ago)` → `annotate(month=TruncMonth("created_at"))` → `values("month")` → `annotate(count=Count("id"))` → `order_by("month")`

### Investor Response

```json
{
  "portfolio_allocation": [
    { "startup_name": "Acme", "amount": 5000.00 }
  ],
  "investment_history": [
    { "month": "2026-01", "amount": 3000.00 }
  ],
  "portfolio_performance": [
    { "campaign_title": "Campaign A", "invested": 5000.00, "current_value": 5500.00 }
  ]
}
```

**Queries:**
- `portfolio_allocation`: `Investment.objects.filter(investor=user, status="confirmed")` → `values(startup_name=F("campaign__startup__name"))` → `annotate(amount=Sum("amount"))` → `order_by("-amount")`
- `investment_history`: `Investment.objects.filter(investor=user, status="confirmed", created_at__gte=six_months_ago)` → `annotate(month=TruncMonth("created_at"))` → `values("month")` → `annotate(amount=Sum("amount"))` → `order_by("month")`
- `portfolio_performance`: Compute in Python (not a single ORM query). Query `Investment.objects.filter(investor=user, status="confirmed").select_related("campaign")`. Group by campaign in Python, summing `amount` per campaign. For `current_value`, set it equal to `invested` (no real market data exists). This keeps the chart functional and avoids complex ORM expressions. Return as list of `{campaign_title, invested, current_value}` dicts.

### Admin Response

```json
{
  "user_registrations": [
    { "month": "2026-01", "count": 15 }
  ],
  "platform_growth": [
    { "month": "2026-01", "users": 50, "startups": 10, "campaigns": 5 }
  ],
  "approval_funnel": [
    { "status": "pending_approval", "count": 3 },
    { "status": "approved", "count": 45 },
    { "status": "rejected", "count": 2 }
  ],
  "investment_volume": [
    { "month": "2026-01", "amount": 50000.00 }
  ]
}
```

**Queries:**
- `user_registrations`: `UserProfile.objects.filter(created_at__gte=six_months_ago)` → `annotate(month=TruncMonth("created_at"))` → `values("month")` → `annotate(count=Count("id"))` → `order_by("month")`
- `platform_growth`: For each of the last 6 months, count cumulative totals of users, startups, campaigns up to that month end. Use a Python loop over 6 months with `filter(created_at__lte=month_end).count()` for each model (18 queries total). This is acceptable for an admin-only endpoint with low traffic; caching can be added later if needed.
- `approval_funnel`: `UserProfile.objects.values("approval_status")` → `annotate(count=Count("id"))`
- `investment_volume`: `Investment.objects.filter(status="confirmed", created_at__gte=six_months_ago)` → `annotate(month=TruncMonth("created_at"))` → `values("month")` → `annotate(amount=Sum("amount"))` → `order_by("month")`

**Month formatting:** All `month` fields serialized as `"YYYY-MM"` strings using `strftime("%Y-%m")`. Decimal amounts must be cast to `float()` before passing to `Response()` — DRF serializes `Decimal` as strings by default, but Recharts needs numbers.

**Error isolation:** The analytics endpoint is separate from `dashboard_stats`, so a failure here won't break existing dashboard data.

---

## 2. Frontend: Package & Shared Components

### Install Recharts

Add `recharts` to `frontend/package.json` dependencies.

### ChartCard Component

**File:** `frontend/src/components/ui/ChartCard.tsx`

A wrapper component for consistent chart card styling:

```tsx
interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <Card>
      <h4 className="text-base font-semibold text-brand-text mb-4">{title}</h4>
      <div className="h-64">
        {children}
      </div>
    </Card>
  );
}
```

- Fixed chart height: `h-64` (256px)
- Uses existing `Card` component for consistent styling
- Title above chart area

### Brand Color Palette for Charts

Define in a shared constants file or inline:

```typescript
export const CHART_COLORS = {
  accent: "#D97757",      // brand-accent (primary)
  blue: "#2C84DB",        // brand-blue
  emerald: "#059669",     // emerald-600
  violet: "#7C3AED",      // violet-600
  rose: "#E11D48",        // rose-600
  amber: "#D97706",       // amber-600
};
```

### Custom Tooltip

All charts use a custom tooltip matching brand styling:

```tsx
function CustomTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg shadow-card border border-brand-border/30 px-3 py-2">
      <p className="text-xs text-brand-muted mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {formatter ? formatter(entry.value, entry.name) : entry.value}
        </p>
      ))}
    </div>
  );
}
```

---

## 3. Frontend: TypeScript Types

**File:** `frontend/src/types/index.ts`

Add analytics response types:

```typescript
// Analytics types
export interface FounderAnalytics {
  funding_over_time: { month: string; amount: number }[];
  investments_per_period: { month: string; count: number }[];
  campaign_comparison: { title: string; raised: number; goal: number }[];
  follower_growth: { month: string; count: number }[];
}

export interface InvestorAnalytics {
  portfolio_allocation: { startup_name: string; amount: number }[];
  investment_history: { month: string; amount: number }[];
  portfolio_performance: { campaign_title: string; invested: number; current_value: number }[];
}

export interface AdminAnalytics {
  user_registrations: { month: string; count: number }[];
  platform_growth: { month: string; users: number; startups: number; campaigns: number }[];
  approval_funnel: { status: string; count: number }[];
  investment_volume: { month: string; amount: number }[];
}
```

---

## 4. Chart Specifications

All charts use `<ResponsiveContainer width="100%" height="100%">` inside the `ChartCard` wrapper. Rounded bar corners via `radius={[4, 4, 0, 0]}`. Grid lines use `stroke="#C2C0B6"` (brand-border). Axis tick text: `fontSize={12}`, `fill="#BBB9AF"` (brand-muted).

**Chart color palette note:** The brand palette has only 2 chromatic colors (`#D97757` accent, `#2C84DB` blue), which is insufficient for multi-series charts. The `CHART_COLORS` constant extends the palette with Tailwind standard colors (emerald, violet, rose, amber) for data visualization only.

### Founder Charts

#### 4a. Funding Over Time — Area Chart
- **Data key:** `amount` (Y-axis), `month` (X-axis)
- **Fill:** `#D97757` at 20% opacity, stroke `#D97757`
- **Tooltip:** Format as `$XX,XXX`

#### 4b. Investment Activity — Bar Chart
- **Data key:** `count` (Y-axis), `month` (X-axis)
- **Fill:** `#2C84DB`
- **Bar radius:** `[4, 4, 0, 0]`
- **Tooltip:** Format as `X investments`

#### 4c. Campaign Comparison — Horizontal Bar Chart
- **Data keys:** `raised` and `goal` as two grouped bars per campaign
- **Layout:** `layout="vertical"`, `YAxis dataKey="title"`, `XAxis type="number"`
- **Colors:** `raised` = `#D97757`, `goal` = `#E5E5E0` (muted background)
- **Tooltip:** Format as `$XX,XXX`

#### 4d. Follower Growth — Line Chart
- **Data key:** `count` (Y-axis), `month` (X-axis)
- **Stroke:** `#E11D48` (rose)
- **Dot:** `fill="#E11D48"`, `r={4}`
- **Tooltip:** Format as `X followers`

### Investor Charts

#### 4e. Portfolio Allocation — Pie/Donut Chart
- **Data key:** `amount`, `nameKey="startup_name"`
- **Inner radius:** 60, outer radius: 90 (donut style)
- **Colors:** Cycle through `CHART_COLORS` array
- **Label:** Show startup name outside
- **Tooltip:** Format as `$XX,XXX`

#### 4f. Investment History — Line Chart
- **Data key:** `amount` (Y-axis), `month` (X-axis)
- **Stroke:** `#059669` (emerald)
- **Dot:** `fill="#059669"`, `r={4}`
- **Tooltip:** Format as `$XX,XXX`

#### 4g. Portfolio Performance — Bar Chart
- **Data keys:** `invested` and `current_value` as grouped bars
- **X-axis:** `campaign_title`
- **Colors:** `invested` = `#2C84DB`, `current_value` = `#059669`
- **Tooltip:** Format as `$XX,XXX`

### Admin Charts

#### 4h. User Registrations — Area Chart
- **Data key:** `count` (Y-axis), `month` (X-axis)
- **Fill:** `#2C84DB` at 20% opacity, stroke `#2C84DB`
- **Tooltip:** Format as `X users`

#### 4i. Platform Growth — Multi-line Area Chart
- **Data keys:** `users`, `startups`, `campaigns` (three areas stacked)
- **Colors:** `users` = `#2C84DB`, `startups` = `#D97757`, `campaigns` = `#059669`
- **Fill opacity:** 15% each
- **Tooltip:** Show all three values

#### 4j. Approval Funnel — Bar Chart
- **Data key:** `count` (Y-axis), `status` (X-axis)
- **Colors per bar:** `approved` = `#059669`, `pending_approval` = `#D97706`, `rejected` = `#E11D48`
- **Bar radius:** `[4, 4, 0, 0]`
- **Tooltip:** Format as `X users`

#### 4k. Investment Volume — Bar Chart
- **Data key:** `amount` (Y-axis), `month` (X-axis)
- **Fill:** `#7C3AED` (violet)
- **Bar radius:** `[4, 4, 0, 0]`
- **Tooltip:** Format as `$XX,XXX`

---

## 5. Dashboard Integration

### FounderDashboard (`frontend/src/pages/dashboard/FounderDashboard.tsx`)

Below the existing `grid-cols-1 lg:grid-cols-2 gap-6` content div, add:

```tsx
{/* Analytics Charts */}
{analytics && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <ChartCard title="Funding Over Time">
      {/* Area chart */}
    </ChartCard>
    <ChartCard title="Investment Activity">
      {/* Bar chart */}
    </ChartCard>
    <ChartCard title="Campaign Comparison">
      {/* Horizontal bar chart */}
    </ChartCard>
    <ChartCard title="Follower Growth">
      {/* Line chart */}
    </ChartCard>
  </div>
)}
```

Fetch analytics data in a **separate** `useEffect` so a failure doesn't break the main dashboard:
```tsx
const [analytics, setAnalytics] = useState<FounderAnalytics | null>(null);
useEffect(() => {
  api.get<FounderAnalytics>("/dashboard/analytics/").then(setAnalytics).catch(() => {});
}, []);
```

Only render the charts grid when `analytics` is non-null. If a specific chart's data array is empty, render the chart anyway (Recharts handles empty data gracefully with a blank chart area).

### InvestorDashboard (`frontend/src/pages/dashboard/InvestorDashboard.tsx`)

Same pattern — add below existing content:

```tsx
{analytics && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <ChartCard title="Portfolio Allocation">
      {/* Donut chart */}
    </ChartCard>
    <ChartCard title="Investment History">
      {/* Line chart */}
    </ChartCard>
    <ChartCard title="Portfolio Performance">
      {/* Bar chart */}
    </ChartCard>
  </div>
)}
```

3 charts — the Portfolio Performance chart gets `lg:col-span-2` to span full width on the last row.

Fetch pattern: same separate `useEffect` as FounderDashboard, using `InvestorAnalytics` type.

### AdminDashboard (`frontend/src/pages/dashboard/AdminDashboard.tsx`)

Same pattern with separate `useEffect` using `AdminAnalytics` type:

```tsx
{analytics && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <ChartCard title="User Registrations">
      {/* Area chart */}
    </ChartCard>
    <ChartCard title="Platform Growth">
      {/* Multi-line area chart */}
    </ChartCard>
    <ChartCard title="Approval Funnel">
      {/* Bar chart */}
    </ChartCard>
    <ChartCard title="Investment Volume">
      {/* Bar chart */}
    </ChartCard>
  </div>
)}
```

---

## 6. File Summary

| File | Action |
|------|--------|
| `backend/requirements.txt` | Add `python-dateutil` |
| `backend/apps/core/views.py` | Add `dashboard_analytics` view |
| `backend/apps/core/urls.py` | Add analytics URL |
| `frontend/package.json` | Add `recharts` dependency |
| `frontend/src/types/index.ts` | Add analytics types |
| `frontend/src/components/ui/ChartCard.tsx` | New — chart card wrapper |
| `frontend/src/pages/dashboard/FounderDashboard.tsx` | Add analytics fetch + 4 charts |
| `frontend/src/pages/dashboard/InvestorDashboard.tsx` | Add analytics fetch + 3 charts |
| `frontend/src/pages/dashboard/AdminDashboard.tsx` | Add analytics fetch + 4 charts |
