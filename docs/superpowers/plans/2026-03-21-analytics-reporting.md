# SP5: Analytics & Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Recharts-powered analytics charts to each role's dashboard via a single backend analytics endpoint.

**Architecture:** One new Django view (`dashboard_analytics`) returns role-specific time-series and aggregate data. The frontend fetches this in a separate `useEffect` per dashboard, rendering charts inside a shared `ChartCard` wrapper in a responsive 2-column grid below existing content.

**Tech Stack:** Django ORM (TruncMonth, annotate), python-dateutil, Recharts (AreaChart, BarChart, LineChart, PieChart), TypeScript, TailwindCSS.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/requirements.txt` | Modify (append) | Add `python-dateutil` |
| `backend/apps/core/views.py` | Modify (after line 99) | Add `dashboard_analytics` view function |
| `backend/apps/core/urls.py` | Modify (line 6) | Add analytics URL route |
| `frontend/package.json` | Modify (line 21) | Add `recharts` dependency |
| `frontend/src/types/index.ts` | Modify (after line 165) | Add `FounderAnalytics`, `InvestorAnalytics`, `AdminAnalytics` types |
| `frontend/src/components/ui/ChartCard.tsx` | Create | Chart card wrapper with title + fixed-height container |
| `frontend/src/lib/chartUtils.ts` | Create | Shared chart colors, custom tooltip, currency formatter |
| `frontend/src/pages/dashboard/FounderDashboard.tsx` | Modify | Add analytics fetch + 4 charts |
| `frontend/src/pages/dashboard/InvestorDashboard.tsx` | Modify | Add analytics fetch + 3 charts |
| `frontend/src/pages/dashboard/AdminDashboard.tsx` | Modify | Add analytics fetch + 4 charts |

---

### Task 1: Backend — Add `python-dateutil` and analytics endpoint

**Files:**
- Modify: `backend/requirements.txt` (append new line at end)
- Modify: `backend/apps/core/views.py:1-9,99` (imports + new function after line 99)
- Modify: `backend/apps/core/urls.py:6`

- [ ] **Step 1: Add `python-dateutil` to requirements.txt**

Append a new line at the end of the file (after the existing `openai` line on line 9):

```
python-dateutil>=2.9,<3.0
```

- [ ] **Step 2: Add imports to `backend/apps/core/views.py`**

Replace ONLY line 1 (`from django.db.models import Sum`) with the following block. Keep all other existing imports (lines 2-9) unchanged:

```python
from collections import defaultdict

from django.db.models import Count, F, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from dateutil.relativedelta import relativedelta
```

- [ ] **Step 3: Add `dashboard_analytics` view after the existing `dashboard_stats` function**

Append after line 99 (end of `dashboard_stats`):

```python


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_analytics(request):
    user = request.user
    role = user.role
    six_months_ago = timezone.now() - relativedelta(months=6)

    def fmt(qs):
        """Format TruncMonth querysets: datetime → 'YYYY-MM', Decimal → float."""
        return [
            {k: (v.strftime("%Y-%m") if hasattr(v, "strftime") else float(v) if hasattr(v, "as_tuple") else v)
             for k, v in row.items()}
            for row in qs
        ]

    if role == "admin":
        user_regs = (
            UserProfile.objects.filter(created_at__gte=six_months_ago)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )

        now = timezone.now()
        platform_growth = []
        for i in range(5, -1, -1):
            month_end = (now - relativedelta(months=i)).replace(
                day=1, hour=0, minute=0, second=0, microsecond=0
            ) + relativedelta(months=1)
            platform_growth.append({
                "month": (month_end - relativedelta(months=1)).strftime("%Y-%m"),
                "users": UserProfile.objects.filter(created_at__lt=month_end).count(),
                "startups": Startup.objects.filter(created_at__lt=month_end).count(),
                "campaigns": Campaign.objects.filter(created_at__lt=month_end).count(),
            })

        approval_funnel = list(
            UserProfile.objects.values("approval_status")
            .annotate(count=Count("id"))
        )
        for row in approval_funnel:
            row["status"] = row.pop("approval_status")

        inv_volume = (
            Investment.objects.filter(
                status=Investment.Status.CONFIRMED, created_at__gte=six_months_ago
            )
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(amount=Sum("amount"))
            .order_by("month")
        )

        return Response({
            "user_registrations": fmt(user_regs),
            "platform_growth": platform_growth,
            "approval_funnel": approval_funnel,
            "investment_volume": fmt(inv_volume),
        })

    if role == "investor":
        confirmed = Investment.objects.filter(investor=user, status=Investment.Status.CONFIRMED)

        allocation = fmt(
            confirmed.values(startup_name=F("campaign__startup__name"))
            .annotate(amount=Sum("amount"))
            .order_by("-amount")
        )

        history = fmt(
            confirmed.filter(created_at__gte=six_months_ago)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(amount=Sum("amount"))
            .order_by("month")
        )

        perf_map = defaultdict(float)
        for inv in confirmed.select_related("campaign"):
            perf_map[inv.campaign.title] += float(inv.amount)
        performance = [
            {"campaign_title": title, "invested": amt, "current_value": amt}
            for title, amt in perf_map.items()
        ]

        return Response({
            "portfolio_allocation": allocation,
            "investment_history": history,
            "portfolio_performance": performance,
        })

    # Founder / team_member
    user_startup_ids = StartupMember.objects.filter(
        user=user
    ).values_list("startup_id", flat=True)

    confirmed_inv = Investment.objects.filter(
        campaign__startup_id__in=user_startup_ids,
        status=Investment.Status.CONFIRMED,
        created_at__gte=six_months_ago,
    )

    funding = fmt(
        confirmed_inv.annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(amount=Sum("amount"))
        .order_by("month")
    )

    inv_per_period = fmt(
        confirmed_inv.annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(count=Count("id"))
        .order_by("month")
    )

    comparison = list(
        Campaign.objects.filter(
            startup_id__in=user_startup_ids,
            status__in=[Campaign.Status.ACTIVE, Campaign.Status.COMPLETED],
        )
        .annotate(raised=F("current_funding"), goal=F("funding_goal"))
        .values("title", "raised", "goal")
    )
    for row in comparison:
        row["raised"] = float(row["raised"])
        row["goal"] = float(row["goal"])

    followers = fmt(
        StartupFollow.objects.filter(
            startup_id__in=user_startup_ids,
            created_at__gte=six_months_ago,
        )
        .annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(count=Count("id"))
        .order_by("month")
    )

    return Response({
        "funding_over_time": funding,
        "investments_per_period": inv_per_period,
        "campaign_comparison": comparison,
        "follower_growth": followers,
    })
```

- [ ] **Step 4: Register the URL in `backend/apps/core/urls.py`**

Add after line 6 (`dashboard/stats/` path):

```python
    path("dashboard/analytics/", views.dashboard_analytics, name="dashboard-analytics"),
```

The full `urls.py` becomes:
```python
from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.health_check, name="health-check"),
    path("dashboard/stats/", views.dashboard_stats, name="dashboard-stats"),
    path("dashboard/analytics/", views.dashboard_analytics, name="dashboard-analytics"),
]
```

- [ ] **Step 5: Rebuild the backend container to install python-dateutil**

```bash
docker compose up --build django-api -d
```

- [ ] **Step 6: Test the endpoint manually**

```bash
# Use an existing auth token or test via the running app
curl -s http://localhost:8000/api/dashboard/analytics/ -H "Authorization: Bearer <token>" | python3 -m json.tool
```

Expected: JSON response with role-specific analytics data, all `month` values as `"YYYY-MM"` strings, all amounts as numbers (not strings).

- [ ] **Step 7: Commit**

```bash
git add backend/requirements.txt backend/apps/core/views.py backend/apps/core/urls.py
git commit -m "Add analytics endpoint with role-specific chart data"
```

---

### Task 2: Frontend — Install Recharts, add types, create shared chart utilities

**Files:**
- Modify: `frontend/package.json:21`
- Modify: `frontend/src/types/index.ts:165`
- Create: `frontend/src/components/ui/ChartCard.tsx`
- Create: `frontend/src/lib/chartUtils.ts`

- [ ] **Step 1: Install recharts**

```bash
docker compose exec react-frontend npm install recharts
```

This adds `recharts` to `frontend/package.json` dependencies.

- [ ] **Step 2: Add analytics TypeScript types**

In `frontend/src/types/index.ts`, add after line 165 (after `DashboardStatsAdmin` closing brace):

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

- [ ] **Step 3: Create `frontend/src/lib/chartUtils.ts`**

```typescript
export const CHART_COLORS = {
  accent: "#D97757",
  blue: "#2C84DB",
  emerald: "#059669",
  violet: "#7C3AED",
  rose: "#E11D48",
  amber: "#D97706",
};

export const CHART_COLORS_ARRAY = [
  CHART_COLORS.accent,
  CHART_COLORS.blue,
  CHART_COLORS.emerald,
  CHART_COLORS.violet,
  CHART_COLORS.rose,
  CHART_COLORS.amber,
];

export const AXIS_STYLE = {
  fontSize: 12,
  fill: "#BBB9AF",
};

export const GRID_STROKE = "#C2C0B6";

export function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}
```

- [ ] **Step 4: Create `frontend/src/components/ui/ChartCard.tsx`**

```tsx
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

interface ChartCardProps {
  title: string;
  children: ReactNode;
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

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/types/index.ts frontend/src/lib/chartUtils.ts frontend/src/components/ui/ChartCard.tsx
git commit -m "Add Recharts, analytics types, chart utilities, and ChartCard component"
```

---

### Task 3: Frontend — Founder Dashboard charts

**Files:**
- Modify: `frontend/src/pages/dashboard/FounderDashboard.tsx`

- [ ] **Step 1: Add imports at the top of FounderDashboard.tsx**

After the existing imports (line 8), add:

```typescript
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { ChartCard } from "@/components/ui/ChartCard";
import { CHART_COLORS, AXIS_STYLE, GRID_STROKE, formatCurrency } from "@/lib/chartUtils";
import type { FounderAnalytics } from "@/types";
```

- [ ] **Step 2: Add analytics state and fetch**

Inside the `FounderDashboard` component, after the existing state declarations (after line 15: `const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);`), add:

```typescript
  const [analytics, setAnalytics] = useState<FounderAnalytics | null>(null);

  useEffect(() => {
    api.get<FounderAnalytics>("/dashboard/analytics/").then(setAnalytics).catch(() => {});
  }, []);
```

- [ ] **Step 3: Add chart grid below existing content**

In the JSX return, after the closing `</div>` of the existing `grid-cols-1 lg:grid-cols-2 gap-6` div (line 219), add before the final closing `</div>` (line 220):

```tsx

      {/* Analytics Charts */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Funding Over Time">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.funding_over_time}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="month" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke={CHART_COLORS.accent}
                  fill={CHART_COLORS.accent}
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Investment Activity">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.investments_per_period}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="month" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip formatter={(value: number) => `${value} investments`} />
                <Bar dataKey="count" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Campaign Comparison">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.campaign_comparison} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis type="number" {...AXIS_STYLE} />
                <YAxis dataKey="title" type="category" {...AXIS_STYLE} width={100} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="goal" fill="#E5E5E0" radius={[0, 4, 4, 0]} />
                <Bar dataKey="raised" fill={CHART_COLORS.accent} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Follower Growth">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.follower_growth}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="month" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip formatter={(value: number) => `${value} followers`} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={CHART_COLORS.rose}
                  dot={{ fill: CHART_COLORS.rose, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
```

- [ ] **Step 4: Verify it compiles**

```bash
docker compose exec react-frontend npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/dashboard/FounderDashboard.tsx
git commit -m "Add analytics charts to founder dashboard"
```

---

### Task 4: Frontend — Investor Dashboard charts

**Files:**
- Modify: `frontend/src/pages/dashboard/InvestorDashboard.tsx`

- [ ] **Step 1: Add imports at the top of InvestorDashboard.tsx**

After the existing imports (line 7), add:

```typescript
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { ChartCard } from "@/components/ui/ChartCard";
import {
  CHART_COLORS, CHART_COLORS_ARRAY, AXIS_STYLE, GRID_STROKE, formatCurrency,
} from "@/lib/chartUtils";
import type { InvestorAnalytics } from "@/types";
```

- [ ] **Step 2: Add analytics state and fetch**

Inside the `InvestorDashboard` component, after the existing state declarations (after line 13: `const [investments, setInvestments] = useState<Investment[]>([]);`), add:

```typescript
  const [analytics, setAnalytics] = useState<InvestorAnalytics | null>(null);

  useEffect(() => {
    api.get<InvestorAnalytics>("/dashboard/analytics/").then(setAnalytics).catch(() => {});
  }, []);
```

- [ ] **Step 3: Add chart grid below existing content**

In the JSX return, after the closing `</div>` of the existing `grid-cols-1 lg:grid-cols-2 gap-6` div, add before the final closing `</div>`:

```tsx

      {/* Analytics Charts */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Portfolio Allocation">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.portfolio_allocation}
                  dataKey="amount"
                  nameKey="startup_name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  label={({ startup_name }) => startup_name}
                >
                  {analytics.portfolio_allocation.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS_ARRAY[i % CHART_COLORS_ARRAY.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Investment History">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.investment_history}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="month" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke={CHART_COLORS.emerald}
                  dot={{ fill: CHART_COLORS.emerald, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Portfolio Performance">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.portfolio_performance}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="campaign_title" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="invested" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
                <Bar dataKey="current_value" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
```

Note: The Portfolio Performance chart is 3rd in a 2-col grid, so it sits in the left cell of the last row. Per spec, add `lg:col-span-2` to the last `ChartCard` wrapper's parent if desired — but the default (left-aligned single cell) is also acceptable.

- [ ] **Step 4: Verify it compiles**

```bash
docker compose exec react-frontend npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/dashboard/InvestorDashboard.tsx
git commit -m "Add analytics charts to investor dashboard"
```

---

### Task 5: Frontend — Admin Dashboard charts

**Files:**
- Modify: `frontend/src/pages/dashboard/AdminDashboard.tsx`

- [ ] **Step 1: Add imports at the top of AdminDashboard.tsx**

After the existing imports (line 15: `import { Avatar } from "@/components/ui/Avatar";`), add:

```typescript
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import { ChartCard } from "@/components/ui/ChartCard";
import { CHART_COLORS, AXIS_STYLE, GRID_STROKE, formatCurrency } from "@/lib/chartUtils";
import type { AdminAnalytics } from "@/types";
```

- [ ] **Step 2: Add analytics state and fetch**

Inside the `AdminDashboard` component, after the existing state declarations (after line 21: `const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);`), add:

```typescript
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);

  useEffect(() => {
    api.get<AdminAnalytics>("/dashboard/analytics/").then(setAnalytics).catch(() => {});
  }, []);
```

- [ ] **Step 3: Define approval funnel color mapping**

Inside the component, before the `return` statement, add:

```typescript
  const approvalColors: Record<string, string> = {
    approved: CHART_COLORS.emerald,
    pending_approval: CHART_COLORS.amber,
    rejected: CHART_COLORS.rose,
  };
```

- [ ] **Step 4: Add chart grid below existing content**

In the JSX return, after the closing `</div>` of the existing `grid-cols-1 lg:grid-cols-2 gap-6` div (the one containing Pending Approvals and Management cards), add before the final closing `</div>`:

```tsx

      {/* Analytics Charts */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="User Registrations">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.user_registrations}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="month" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip formatter={(value: number) => `${value} users`} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={CHART_COLORS.blue}
                  fill={CHART_COLORS.blue}
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Platform Growth">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.platform_growth}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="month" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="users" stroke={CHART_COLORS.blue} fill={CHART_COLORS.blue} fillOpacity={0.15} />
                <Area type="monotone" dataKey="startups" stroke={CHART_COLORS.accent} fill={CHART_COLORS.accent} fillOpacity={0.15} />
                <Area type="monotone" dataKey="campaigns" stroke={CHART_COLORS.emerald} fill={CHART_COLORS.emerald} fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Approval Funnel">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.approval_funnel}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="status" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip formatter={(value: number) => `${value} users`} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {analytics.approval_funnel.map((entry, i) => (
                    <Cell key={i} fill={approvalColors[entry.status] || CHART_COLORS.blue} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Investment Volume">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.investment_volume}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="month" {...AXIS_STYLE} />
                <YAxis {...AXIS_STYLE} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="amount" fill={CHART_COLORS.violet} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
```

- [ ] **Step 5: Verify it compiles**

```bash
docker compose exec react-frontend npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/dashboard/AdminDashboard.tsx
git commit -m "Add analytics charts to admin dashboard"
```
