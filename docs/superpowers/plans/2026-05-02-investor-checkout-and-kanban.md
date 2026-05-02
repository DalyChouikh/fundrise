# Investor Checkout & Kanban Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3-step investor checkout overlay, a Payment & Billing sidebar page, and read-only kanban board access with commenting for investors with confirmed investments in active campaigns.

**Architecture:** Backend gains a `SavedPaymentInfo` model (users app), two nullable fields on `Investment`, and updated kanban permissions. Frontend adds `CheckoutModal`, `CardPreview`, `BillingPage`, and `InvestorKanbanPage` components.

**Tech Stack:** Django 5.1 / DRF, React 18, TypeScript, TailwindCSS 3, Docker Compose

---

## File Map

**Backend — modify:**
- `backend/apps/users/models.py` — add `SavedPaymentInfo`
- `backend/apps/users/serializers.py` — add `SavedPaymentInfoSerializer`
- `backend/apps/users/views.py` — add `PaymentProfileView`
- `backend/apps/users/urls.py` — add payment-profile route
- `backend/apps/investments/models.py` — add `card_last4`, `card_type`
- `backend/apps/investments/serializers.py` — update 3 serializers + add `startup` field
- `backend/apps/kanban/permissions.py` — add `CanViewKanbanBoard`
- `backend/apps/kanban/views.py` — use `CanViewKanbanBoard` for read ops

**Frontend — create:**
- `frontend/src/components/investments/CardPreview.tsx`
- `frontend/src/components/investments/CheckoutModal.tsx`
- `frontend/src/pages/billing/BillingPage.tsx`
- `frontend/src/pages/kanban/InvestorKanbanPage.tsx`

**Frontend — modify:**
- `frontend/src/lib/api.ts` — add `put` method
- `frontend/src/types/index.ts` — add `SavedPaymentInfo`, `CardType`; update `InvestmentCampaignDetail`, `Investment`
- `frontend/src/pages/campaigns/CampaignDetailPage.tsx` — use `CheckoutModal`, add "View Startup Board"
- `frontend/src/pages/investments/InvestmentsPage.tsx` — add "View Board" button
- `frontend/src/App.tsx` — add two routes
- `frontend/src/components/layout/Sidebar.tsx` — add "Payment & Billing" nav item

---

### Task 1: SavedPaymentInfo model + migration

**Files:**
- Modify: `backend/apps/users/models.py`

- [ ] **Step 1: Add SavedPaymentInfo to models.py**

Append after the `InvestorProfile` class:

```python
class SavedPaymentInfo(TimeStampedModel):
    CARD_TYPES = [
        ("visa", "Visa"),
        ("mastercard", "Mastercard"),
        ("amex", "American Express"),
        ("discover", "Discover"),
    ]

    user = models.OneToOneField(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="payment_info",
    )
    card_holder = models.CharField(max_length=255)
    card_last4 = models.CharField(max_length=4)
    card_type = models.CharField(max_length=20, choices=CARD_TYPES)
    expiry_month = models.PositiveSmallIntegerField()
    expiry_year = models.PositiveSmallIntegerField()
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True, default="")
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.user.full_name} — {self.card_type} ···{self.card_last4}"
```

- [ ] **Step 2: Create and run migration**

```bash
docker compose exec django-api python manage.py makemigrations users
docker compose exec django-api python manage.py migrate
```

Expected: `Applying users.000X_add_savedpaymentinfo... OK`

- [ ] **Step 3: Commit**

```bash
git add backend/apps/users/models.py backend/apps/users/migrations/
git commit -m "feat: add SavedPaymentInfo model to users app"
```

---

### Task 2: Investment model — card snapshot fields + serializer updates

**Files:**
- Modify: `backend/apps/investments/models.py`
- Modify: `backend/apps/investments/serializers.py`

- [ ] **Step 1: Add fields to Investment model**

In `backend/apps/investments/models.py`, add two fields after the `status` field:

```python
    card_last4 = models.CharField(max_length=4, null=True, blank=True)
    card_type = models.CharField(max_length=20, null=True, blank=True)
```

- [ ] **Step 2: Run migration**

```bash
docker compose exec django-api python manage.py makemigrations investments
docker compose exec django-api python manage.py migrate
```

Expected: `Applying investments.000X_investment_card_fields... OK`

- [ ] **Step 3: Update InvestmentCampaignSerializer to expose startup id**

In `backend/apps/investments/serializers.py`, update `InvestmentCampaignSerializer`:

```python
class InvestmentCampaignSerializer(serializers.ModelSerializer):
    startup_name = serializers.CharField(source="startup.name", read_only=True)

    class Meta:
        model = Campaign
        fields = ["id", "title", "startup", "startup_name", "funding_goal", "current_funding", "status"]
        read_only_fields = fields
```

- [ ] **Step 4: Update InvestmentCreateSerializer to accept card fields**

```python
class InvestmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Investment
        fields = ["campaign", "amount", "card_last4", "card_type"]
        extra_kwargs = {
            "card_last4": {"required": False, "allow_null": True, "allow_blank": True},
            "card_type": {"required": False, "allow_null": True, "allow_blank": True},
        }

    def validate_campaign(self, value):
        if value.status != Campaign.Status.ACTIVE:
            raise serializers.ValidationError("Can only invest in active campaigns.")
        return value

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Investment amount must be greater than zero.")
        return value
```

- [ ] **Step 5: Update InvestmentListSerializer to expose card fields**

```python
class InvestmentListSerializer(serializers.ModelSerializer):
    campaign_detail = InvestmentCampaignSerializer(source="campaign", read_only=True)
    investor_name = serializers.CharField(source="investor.full_name", read_only=True)

    class Meta:
        model = Investment
        fields = [
            "id", "campaign", "campaign_detail", "investor", "investor_name",
            "amount", "status", "card_last4", "card_type", "created_at", "updated_at",
        ]
        read_only_fields = fields
```

- [ ] **Step 6: Commit**

```bash
git add backend/apps/investments/models.py backend/apps/investments/migrations/ backend/apps/investments/serializers.py
git commit -m "feat: add card snapshot fields to Investment, expose startup id in campaign serializer"
```

---

### Task 3: Payment profile API (serializer, view, URL)

**Files:**
- Modify: `backend/apps/users/serializers.py`
- Modify: `backend/apps/users/views.py`
- Modify: `backend/apps/users/urls.py`

- [ ] **Step 1: Add SavedPaymentInfoSerializer**

In `backend/apps/users/serializers.py`, add at the top of imports:
```python
from apps.users.models import InvestorProfile, SavedPaymentInfo, UserProfile
```

Then append this serializer at the end of the file:

```python
class SavedPaymentInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedPaymentInfo
        fields = [
            "card_holder", "card_last4", "card_type",
            "expiry_month", "expiry_year",
            "address_line1", "address_line2", "city",
            "state", "postal_code", "country",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_card_last4(self, value):
        if not value.isdigit() or len(value) != 4:
            raise serializers.ValidationError("Must be exactly 4 digits.")
        return value

    def validate_expiry_month(self, value):
        if not 1 <= value <= 12:
            raise serializers.ValidationError("Month must be between 1 and 12.")
        return value
```

- [ ] **Step 2: Add PaymentProfileView to views.py**

In `backend/apps/users/views.py`, update the import at the top:
```python
from apps.users.models import InvestorProfile, SavedPaymentInfo, UserProfile
from apps.users.serializers import (
    AdminUserSerializer,
    InvestorProfileSerializer,
    SavedPaymentInfoSerializer,
    UserProfileMinimalSerializer,
    UserProfileSerializer,
)
```

Then append this view before the `extract_document_view` function:

```python
class PaymentProfileView(APIView):
    """GET/PUT/DELETE /api/users/me/payment-profile/ — investor saved card + address."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            info = request.user.payment_info
        except SavedPaymentInfo.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(SavedPaymentInfoSerializer(info).data)

    def put(self, request):
        try:
            info = request.user.payment_info
        except SavedPaymentInfo.DoesNotExist:
            info = SavedPaymentInfo(user=request.user)
        serializer = SavedPaymentInfoSerializer(info, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data)

    def delete(self, request):
        try:
            request.user.payment_info.delete()
        except SavedPaymentInfo.DoesNotExist:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)
```

- [ ] **Step 3: Add URL**

In `backend/apps/users/urls.py`, add before the `search/` line:

```python
    path("me/payment-profile/", views.PaymentProfileView.as_view(), name="payment-profile"),
```

- [ ] **Step 4: Test the endpoint**

```bash
docker compose restart django-api
```

Confirm no import errors in logs.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/users/serializers.py backend/apps/users/views.py backend/apps/users/urls.py
git commit -m "feat: add payment profile API for investors"
```

---

### Task 4: Kanban — read permission for investors

**Files:**
- Modify: `backend/apps/kanban/permissions.py`
- Modify: `backend/apps/kanban/views.py`

- [ ] **Step 1: Add CanViewKanbanBoard permission**

Replace all of `backend/apps/kanban/permissions.py` with:

```python
from rest_framework.permissions import BasePermission

from apps.startups.models import StartupMember


class IsStartupMemberForKanban(BasePermission):
    """Write access: user must be a startup member."""

    def has_permission(self, request, view):
        startup_id = view.kwargs.get("startup_pk") or view.kwargs.get("startup_id")
        if not startup_id:
            return False
        return (
            StartupMember.objects.filter(startup_id=startup_id, user=request.user).exists()
            or request.user.role == "admin"
        )


class CanViewKanbanBoard(BasePermission):
    """Read access: startup members OR investors with a confirmed investment in an active campaign."""

    def has_permission(self, request, view):
        from apps.investments.models import Investment

        startup_id = view.kwargs.get("startup_pk") or view.kwargs.get("startup_id")
        if not startup_id:
            return False
        if request.user.role == "admin":
            return True
        if StartupMember.objects.filter(startup_id=startup_id, user=request.user).exists():
            return True
        if request.user.role == "investor":
            return Investment.objects.filter(
                investor=request.user,
                status="confirmed",
                campaign__status="active",
                campaign__startup_id=startup_id,
            ).exists()
        return False
```

- [ ] **Step 2: Update views.py to use CanViewKanbanBoard for read ops**

In `backend/apps/kanban/views.py`, update the import line:

```python
from apps.kanban.permissions import CanViewKanbanBoard, IsStartupMemberForKanban
```

Update `KanbanBoardView` permission class:
```python
class KanbanBoardView(generics.ListAPIView):
    """GET /api/kanban/{startup_id}/board/ — all columns with nested tasks."""

    serializer_class = KanbanColumnSerializer
    permission_classes = [permissions.IsAuthenticated, CanViewKanbanBoard]
    # rest unchanged
```

Add `get_permissions` to `KanbanColumnViewSet`:
```python
class KanbanColumnViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.IsAuthenticated(), CanViewKanbanBoard()]
        return [permissions.IsAuthenticated(), IsStartupMemberForKanban()]
    # rest unchanged
```

Add `get_permissions` to `KanbanTaskViewSet`:
```python
class KanbanTaskViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.IsAuthenticated(), CanViewKanbanBoard()]
        return [permissions.IsAuthenticated(), IsStartupMemberForKanban()]
    # rest unchanged
```

- [ ] **Step 3: Restart and verify**

```bash
docker compose restart django-api
```

- [ ] **Step 4: Commit**

```bash
git add backend/apps/kanban/permissions.py backend/apps/kanban/views.py
git commit -m "feat: allow investors with confirmed investments to view kanban board"
```

---

### Task 5: Frontend — API client + types

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Add `put` method to ApiClient**

In `frontend/src/lib/api.ts`, add after the `patch` method:

```typescript
  async put<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "PUT",
      headers: await this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    if (res.status === 204) return undefined as T;
    return res.json();
  }
```

- [ ] **Step 2: Add SavedPaymentInfo type and update Investment types**

In `frontend/src/types/index.ts`:

After `export type InvestmentStatus = ...`, add:

```typescript
export type CardType = "visa" | "mastercard" | "amex" | "discover";

export interface SavedPaymentInfo {
  card_holder: string;
  card_last4: string;
  card_type: CardType;
  expiry_month: number;
  expiry_year: number;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  created_at: string;
  updated_at: string;
}
```

Update `InvestmentCampaignDetail` to add `startup`:
```typescript
export interface InvestmentCampaignDetail {
  id: number;
  title: string;
  startup: number;
  startup_name: string;
  funding_goal: string;
  current_funding: string;
  status: CampaignStatus;
}
```

Update `Investment` to add optional card snapshot:
```typescript
export interface Investment {
  id: number;
  investor: string;
  investor_name: string;
  campaign: number;
  campaign_detail: InvestmentCampaignDetail;
  amount: string;
  status: InvestmentStatus;
  card_last4: string | null;
  card_type: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/types/index.ts
git commit -m "feat: add put method to API client, add SavedPaymentInfo type"
```

---

### Task 6: CardPreview component

**Files:**
- Create: `frontend/src/components/investments/CardPreview.tsx`

- [ ] **Step 1: Create the component**

```typescript
import type { CardType } from "@/types";

const CARD_LABELS: Record<CardType, string> = {
  visa: "VISA",
  mastercard: "MC",
  amex: "AMEX",
  discover: "DISC",
};

interface CardPreviewProps {
  cardHolder: string;
  cardLast4: string;
  cardType: CardType;
  expiryMonth: number;
  expiryYear: number;
}

export function CardPreview({ cardHolder, cardLast4, cardType, expiryMonth, expiryYear }: CardPreviewProps) {
  return (
    <div className="relative w-full max-w-sm h-48 rounded-2xl bg-gradient-to-br from-[#242421] to-[#141413] p-6 text-white shadow-xl overflow-hidden select-none">
      <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/[0.04]" />
      <div className="absolute -bottom-8 right-10 w-36 h-36 rounded-full bg-white/[0.04]" />

      {/* Chip */}
      <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500 mb-5" />

      {/* Number */}
      <p className="font-mono text-[17px] tracking-widest text-white/90 mb-5">
        •••• •••• •••• {cardLast4 || "····"}
      </p>

      {/* Bottom row */}
      <div className="flex items-end justify-between">
        <div className="min-w-0">
          <p className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Card Holder</p>
          <p className="text-sm font-medium truncate max-w-[160px]">
            {cardHolder || "Your Name"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Expires</p>
          <p className="text-sm font-medium">
            {String(expiryMonth).padStart(2, "0")}/{String(expiryYear).slice(-2)}
          </p>
        </div>
        <div>
          <p className="text-base font-bold tracking-widest text-white/70">
            {CARD_LABELS[cardType] ?? cardType.toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/investments/CardPreview.tsx
git commit -m "feat: add CardPreview component"
```

---

### Task 7: CheckoutModal

**Files:**
- Create: `frontend/src/components/investments/CheckoutModal.tsx`

- [ ] **Step 1: Create the full CheckoutModal**

```typescript
import { useState, useEffect } from "react";
import { X, ArrowLeft, ChevronRight, CreditCard, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { CardPreview } from "@/components/investments/CardPreview";
import type { CampaignDetail, SavedPaymentInfo, CardType } from "@/types";

function detectCardType(num: string): CardType {
  const n = num.replace(/\D/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^6/.test(n)) return "discover";
  return "visa";
}

function parseExpiry(val: string): [number, number] {
  const parts = val.replace(/\s/g, "").split("/");
  const month = parseInt(parts[0] ?? "0", 10);
  const yearShort = parseInt(parts[1] ?? "0", 10);
  const year = yearShort < 100 ? 2000 + yearShort : yearShort;
  return [month, year];
}

interface CheckoutModalProps {
  campaign: CampaignDetail;
  onClose: () => void;
  onSuccess: (updatedCampaign: CampaignDetail) => void;
}

export function CheckoutModal({ campaign, onClose, onSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [savedInfo, setSavedInfo] = useState<SavedPaymentInfo | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [confirmClose, setConfirmClose] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [amount, setAmount] = useState("");

  // Step 2 — card
  const [useSavedCard, setUseSavedCard] = useState(false);
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardFocused, setCardFocused] = useState(false);
  const [expiryInput, setExpiryInput] = useState("");
  const [cvv, setCvv] = useState("");
  const [saveCard, setSaveCard] = useState(true);

  // Step 2 — address
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    api.get<SavedPaymentInfo>("/users/me/payment-profile/")
      .then((info) => {
        setSavedInfo(info);
        setUseSavedCard(true);
        setUseSavedAddress(true);
        setSaveCard(false);
      })
      .catch(() => setSavedInfo(null))
      .finally(() => setLoadingSaved(false));
  }, []);

  const activeCardLast4 = useSavedCard
    ? (savedInfo?.card_last4 ?? "")
    : cardNumber.replace(/\D/g, "").slice(-4);

  const activeCardHolder = useSavedCard ? (savedInfo?.card_holder ?? "") : cardHolder;
  const activeCardType: CardType = useSavedCard
    ? (savedInfo?.card_type ?? "visa")
    : detectCardType(cardNumber);
  const [activeMonth, activeYear] = useSavedCard
    ? [savedInfo?.expiry_month ?? 1, savedInfo?.expiry_year ?? new Date().getFullYear()]
    : parseExpiry(expiryInput);

  const fundingPct = Math.min(
    100,
    Math.round((Number(campaign.current_funding) / Number(campaign.funding_goal)) * 100)
  );

  const handleClose = () => {
    if (step > 1) { setConfirmClose(true); return; }
    onClose();
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await api.post("/investments/", {
        campaign: campaign.id,
        amount,
        card_last4: activeCardLast4 || null,
        card_type: activeCardType || null,
      });
      if (saveCard && !useSavedCard && cardHolder && activeCardLast4) {
        const [m, y] = parseExpiry(expiryInput);
        await api.put("/users/me/payment-profile/", {
          card_holder: cardHolder,
          card_last4: activeCardLast4,
          card_type: activeCardType,
          expiry_month: m,
          expiry_year: y,
          address_line1: addressLine1,
          address_line2: addressLine2,
          city,
          state: stateVal,
          postal_code: postalCode,
          country,
        });
      }
      const updated = await api.get<CampaignDetail>(`/campaigns/${campaign.id}/`);
      onSuccess(updated);
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full border border-brand-border/[0.2] rounded-xl px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-accent transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-[#FAF9F5] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border/[0.12]">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="p-1.5 rounded-lg hover:bg-brand-bg transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-brand-muted" />
              </button>
            )}
            <div>
              <p className="text-[11px] text-brand-muted">
                Step {step} of 3
              </p>
              <h2 className="text-base font-bold text-brand-text">
                {step === 1 ? "Investment Amount" : step === 2 ? "Payment Details" : "Review & Confirm"}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Step dots */}
            <div className="flex gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    s === step ? "bg-brand-accent" : s < step ? "bg-brand-accent/40" : "bg-brand-border/40"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-brand-bg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-brand-muted" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* ── STEP 1: AMOUNT ── */}
          {step === 1 && (
            <>
              {/* Campaign card */}
              <div className="bg-white rounded-xl border border-brand-border/[0.12] p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-brand-muted font-medium">{campaign.startup_name}</p>
                    <h3 className="text-sm font-bold text-brand-text mt-0.5">{campaign.title}</h3>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-brand-muted">Equity</p>
                    <p className="text-sm font-semibold text-brand-text">{campaign.equity_offered}%</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-brand-muted mb-1.5">
                    <span>${Number(campaign.current_funding).toLocaleString()} raised</span>
                    <span>Goal: ${Number(campaign.funding_goal).toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-brand-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-accent rounded-full transition-all"
                      style={{ width: `${fundingPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-2">
                  Investment Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted text-sm font-medium">$</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`${inputCls} pl-7`}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!amount || Number(amount) <= 0}
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}

          {/* ── STEP 2: PAYMENT ── */}
          {step === 2 && (
            <>
              {loadingSaved ? (
                <div className="h-20 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Card section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-brand-muted" />
                      <p className="text-sm font-semibold text-brand-text">Payment Method</p>
                    </div>

                    {/* Card preview */}
                    <div className="flex justify-center">
                      <CardPreview
                        cardHolder={activeCardHolder}
                        cardLast4={activeCardLast4}
                        cardType={activeCardType}
                        expiryMonth={activeMonth}
                        expiryYear={activeYear}
                      />
                    </div>

                    {savedInfo && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="useSavedCard"
                          checked={useSavedCard}
                          onChange={(e) => setUseSavedCard(e.target.checked)}
                          className="accent-brand-accent"
                        />
                        <label htmlFor="useSavedCard" className="text-sm text-brand-text cursor-pointer">
                          Use saved card ending in {savedInfo.card_last4}
                        </label>
                      </div>
                    )}

                    {!useSavedCard && (
                      <div className="space-y-2.5">
                        <input placeholder="Cardholder Name" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} className={inputCls} />
                        <input
                          placeholder="Card Number"
                          value={cardFocused ? cardNumber : cardNumber.replace(/\D/g, "").length >= 4 ? `•••• •••• •••• ${cardNumber.replace(/\D/g, "").slice(-4)}` : cardNumber}
                          onFocus={() => setCardFocused(true)}
                          onBlur={() => setCardFocused(false)}
                          onChange={(e) => setCardNumber(e.target.value)}
                          maxLength={19}
                          inputMode="numeric"
                          className={inputCls}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="MM/YY" value={expiryInput} onChange={(e) => setExpiryInput(e.target.value)} maxLength={5} className={inputCls} />
                          <input placeholder="CVV" value={cvv} onChange={(e) => setCvv(e.target.value)} maxLength={4} inputMode="numeric" className={inputCls} />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} className="accent-brand-accent" />
                          <span className="text-sm text-brand-text">Save this card to my profile</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Address section */}
                  <div className="space-y-3 border-t border-brand-border/[0.12] pt-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand-muted" />
                      <p className="text-sm font-semibold text-brand-text">Billing Address</p>
                    </div>

                    {savedInfo && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="useSavedAddr"
                          checked={useSavedAddress}
                          onChange={(e) => setUseSavedAddress(e.target.checked)}
                          className="accent-brand-accent"
                        />
                        <label htmlFor="useSavedAddr" className="text-sm text-brand-text cursor-pointer">
                          Use saved address ({savedInfo.city}, {savedInfo.country})
                        </label>
                      </div>
                    )}

                    {!useSavedAddress && (
                      <div className="space-y-2.5">
                        <input placeholder="Address Line 1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className={inputCls} />
                        <input placeholder="Address Line 2 (optional)" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className={inputCls} />
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
                          <input placeholder="State / Province" value={stateVal} onChange={(e) => setStateVal(e.target.value)} className={inputCls} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="Postal Code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={inputCls} />
                          <input placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} />
                        </div>
                      </div>
                    )}
                  </div>

                  <Button className="w-full" onClick={() => setStep(3)}>
                    Review Pledge <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </>
              )}
            </>
          )}

          {/* ── STEP 3: REVIEW ── */}
          {step === 3 && (
            <>
              <div className="flex justify-center">
                <CardPreview
                  cardHolder={activeCardHolder}
                  cardLast4={activeCardLast4}
                  cardType={activeCardType}
                  expiryMonth={activeMonth}
                  expiryYear={activeYear}
                />
              </div>

              <div className="bg-white rounded-xl border border-brand-border/[0.12] p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-brand-muted">Campaign</span>
                  <span className="font-medium text-brand-text">{campaign.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-brand-muted">Pledge Amount</span>
                  <span className="font-bold text-brand-text">${Number(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-brand-muted">Card</span>
                  <span className="font-medium text-brand-text">
                    {activeCardType.toUpperCase()} ···· {activeCardLast4}
                  </span>
                </div>
                {(useSavedAddress ? savedInfo : null) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-muted">Address</span>
                    <span className="font-medium text-brand-text text-right">
                      {savedInfo!.city}, {savedInfo!.country}
                    </span>
                  </div>
                )}
                {!useSavedAddress && city && (
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-muted">Address</span>
                    <span className="font-medium text-brand-text">{city}, {country}</span>
                  </div>
                )}
              </div>

              {/* Disclaimer */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-800 leading-relaxed">
                  This is a pledge — your card will not be charged. The startup founder will review and confirm your investment.
                </p>
              </div>

              <Button
                className="w-full bg-brand-accent hover:bg-brand-accent/90"
                onClick={handleConfirm}
                disabled={submitting}
              >
                {submitting ? "Confirming..." : "Confirm Pledge"}
              </Button>
            </>
          )}
        </div>

        {/* Close confirm dialog */}
        {confirmClose && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-4 p-8">
            <p className="text-sm font-medium text-brand-text text-center">
              Are you sure? Your progress will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmClose(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-brand-muted border border-brand-border/[0.2] hover:bg-brand-bg transition-colors cursor-pointer"
              >
                Keep going
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors cursor-pointer"
              >
                Yes, close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/investments/CheckoutModal.tsx
git commit -m "feat: add CheckoutModal 3-step investment checkout overlay"
```

---

### Task 8: Update CampaignDetailPage

**Files:**
- Modify: `frontend/src/pages/campaigns/CampaignDetailPage.tsx`

- [ ] **Step 1: Replace invest modal with CheckoutModal**

Add import at the top of `CampaignDetailPage.tsx`:
```typescript
import { useNavigate } from "react-router-dom";
import { CheckoutModal } from "@/components/investments/CheckoutModal";
```

Remove the `investAmount`, `investing` state vars and the `handleInvest` function (lines ~39–111 of the original).

Add these states instead:
```typescript
const [showCheckout, setShowCheckout] = useState(false);
```

Replace the existing `setShowInvestModal(true)` call on the "Invest" button with:
```typescript
onClick={() => setShowCheckout(true)}
```

Remove the old `{showInvestModal && (...)}` modal JSX block. Replace with:
```typescript
{showCheckout && (
  <CheckoutModal
    campaign={campaign}
    onClose={() => setShowCheckout(false)}
    onSuccess={(updated) => {
      setCampaign(updated);
      setShowCheckout(false);
    }}
  />
)}
```

- [ ] **Step 2: Add "View Startup Board" button for investors with confirmed investment**

After the `canInvest` constant (around line 158), add:
```typescript
const hasConfirmedInvestment =
  profile?.role === "investor" &&
  campaign.status === "active" &&
  investments.some((inv) => inv.status === "confirmed");
```

In the JSX action area (near the Invest button), add:
```typescript
{hasConfirmedInvestment && (
  <button
    onClick={() =>
      navigate(`/investments/board/${campaign.startup}`, {
        state: { startupName: campaign.startup_name },
      })
    }
    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-brand-text border border-brand-border/[0.2] hover:bg-brand-bg transition-colors cursor-pointer"
  >
    View Startup Board
  </button>
)}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/campaigns/CampaignDetailPage.tsx
git commit -m "feat: use CheckoutModal on CampaignDetailPage, add View Startup Board button"
```

---

### Task 9: BillingPage + route + sidebar

**Files:**
- Create: `frontend/src/pages/billing/BillingPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Create BillingPage**

```typescript
import { useState, useEffect } from "react";
import { CreditCard, MapPin, Pencil, Trash2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CardPreview } from "@/components/investments/CardPreview";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { SavedPaymentInfo, CardType } from "@/types";

function detectCardType(num: string): CardType {
  const n = num.replace(/\D/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^6/.test(n)) return "discover";
  return "visa";
}

function parseExpiry(val: string): [number, number] {
  const parts = val.replace(/\s/g, "").split("/");
  const month = parseInt(parts[0] ?? "0", 10);
  const yearShort = parseInt(parts[1] ?? "0", 10);
  return [month, yearShort < 100 ? 2000 + yearShort : yearShort];
}

export function BillingPage() {
  const [info, setInfo] = useState<SavedPaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Form fields
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardFocused, setCardFocused] = useState(false);
  const [expiryInput, setExpiryInput] = useState("");
  const [cvv, setCvv] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    api.get<SavedPaymentInfo>("/users/me/payment-profile/")
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, []);

  const openEdit = () => {
    if (info) {
      setCardHolder(info.card_holder);
      setCardNumber("");
      setExpiryInput(`${String(info.expiry_month).padStart(2, "0")}/${String(info.expiry_year).slice(-2)}`);
      setCvv("");
      setAddressLine1(info.address_line1);
      setAddressLine2(info.address_line2);
      setCity(info.city);
      setStateVal(info.state);
      setPostalCode(info.postal_code);
      setCountry(info.country);
    }
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const last4 = cardNumber ? cardNumber.replace(/\D/g, "").slice(-4) : info?.card_last4 ?? "";
      const cardType = cardNumber ? detectCardType(cardNumber) : info?.card_type ?? "visa";
      const [month, year] = parseExpiry(expiryInput);
      const saved = await api.put<SavedPaymentInfo>("/users/me/payment-profile/", {
        card_holder: cardHolder,
        card_last4: last4,
        card_type: cardType,
        expiry_month: month,
        expiry_year: year,
        address_line1: addressLine1,
        address_line2: addressLine2,
        city,
        state: stateVal,
        postal_code: postalCode,
        country,
      });
      setInfo(saved);
      setEditing(false);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await api.delete("/users/me/payment-profile/");
      setInfo(null);
      setEditing(false);
    } catch {
      // ignore
    } finally {
      setRemoving(false);
    }
  };

  const inputCls = "w-full border border-brand-border/[0.2] rounded-xl px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-accent transition-colors bg-white";

  const previewLast4 = editing
    ? (cardNumber ? cardNumber.replace(/\D/g, "").slice(-4) : info?.card_last4 ?? "")
    : (info?.card_last4 ?? "");
  const previewType: CardType = editing
    ? (cardNumber ? detectCardType(cardNumber) : info?.card_type ?? "visa")
    : (info?.card_type ?? "visa");
  const [previewMonth, previewYear] = editing
    ? (expiryInput ? parseExpiry(expiryInput) : [info?.expiry_month ?? 1, info?.expiry_year ?? new Date().getFullYear()])
    : [info?.expiry_month ?? 1, info?.expiry_year ?? new Date().getFullYear()];

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Payment & Billing</h1>
        <p className="text-brand-muted mt-1 text-sm">
          Manage your saved payment method and billing address.
        </p>
      </div>

      {/* Card Preview */}
      {(info || editing) && (
        <div className="flex justify-start">
          <CardPreview
            cardHolder={editing ? cardHolder : info!.card_holder}
            cardLast4={previewLast4}
            cardType={previewType}
            expiryMonth={previewMonth}
            expiryYear={previewYear}
          />
        </div>
      )}

      {/* Payment Method */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-brand-muted" />
            <h2 className="text-sm font-semibold text-brand-text">Payment Method</h2>
          </div>
          {info && !editing && (
            <div className="flex items-center gap-2">
              <button onClick={openEdit} className="p-1.5 rounded-lg hover:bg-brand-bg transition-colors cursor-pointer">
                <Pencil className="w-4 h-4 text-brand-muted" />
              </button>
              <button onClick={handleRemove} disabled={removing} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          )}
        </div>

        {!info && !editing ? (
          <div className="text-center py-6">
            <p className="text-sm text-brand-muted mb-3">No payment method saved</p>
            <Button onClick={() => { setEditing(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> Add Payment Method
            </Button>
          </div>
        ) : editing ? (
          <div className="space-y-2.5">
            <input placeholder="Cardholder Name" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} className={inputCls} />
            <input
              placeholder={info ? `Card ending in ${info.card_last4} (leave blank to keep)` : "Card Number"}
              value={cardFocused ? cardNumber : cardNumber.replace(/\D/g, "").length >= 4 ? `•••• •••• •••• ${cardNumber.replace(/\D/g, "").slice(-4)}` : cardNumber}
              onFocus={() => setCardFocused(true)}
              onBlur={() => setCardFocused(false)}
              onChange={(e) => setCardNumber(e.target.value)}
              maxLength={19}
              inputMode="numeric"
              className={inputCls}
            />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="MM/YY" value={expiryInput} onChange={(e) => setExpiryInput(e.target.value)} maxLength={5} className={inputCls} />
              <input placeholder="CVV" value={cvv} onChange={(e) => setCvv(e.target.value)} maxLength={4} inputMode="numeric" className={inputCls} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <span className="font-mono text-brand-text">•••• •••• •••• {info!.card_last4}</span>
            <span className="text-brand-muted uppercase text-xs">{info!.card_type}</span>
            <span className="text-brand-muted text-xs">
              {String(info!.expiry_month).padStart(2, "0")}/{String(info!.expiry_year).slice(-2)}
            </span>
          </div>
        )}
      </Card>

      {/* Billing Address */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-brand-muted" />
          <h2 className="text-sm font-semibold text-brand-text">Billing Address</h2>
        </div>

        {!info && !editing ? (
          <p className="text-sm text-brand-muted text-center py-4">
            Add a payment method to save your billing address.
          </p>
        ) : editing ? (
          <div className="space-y-2.5">
            <input placeholder="Address Line 1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className={inputCls} />
            <input placeholder="Address Line 2 (optional)" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
              <input placeholder="State / Province" value={stateVal} onChange={(e) => setStateVal(e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Postal Code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={inputCls} />
              <input placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} />
            </div>
          </div>
        ) : (
          <address className="not-italic text-sm text-brand-text leading-relaxed">
            <p>{info!.address_line1}</p>
            {info!.address_line2 && <p>{info!.address_line2}</p>}
            <p>{info!.city}, {info!.state} {info!.postal_code}</p>
            <p>{info!.country}</p>
          </address>
        )}
      </Card>

      {/* Save / Cancel */}
      {editing && (
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Saving..." : "Save"}
          </Button>
          <button
            onClick={() => setEditing(false)}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-brand-muted border border-brand-border/[0.2] hover:bg-brand-bg transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add route in App.tsx**

Add import:
```typescript
import { BillingPage } from "@/pages/billing/BillingPage";
```

Add route inside the `<AppLayout>` routes:
```typescript
<Route path="/billing" element={<BillingPage />} />
```

- [ ] **Step 3: Add sidebar nav item**

In `frontend/src/components/layout/Sidebar.tsx`, add after the "My Investments" item:
```typescript
  {
    label: "Payment & Billing",
    path: "/billing",
    icon: "CreditCard",
    roles: ["investor"],
  },
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/billing/BillingPage.tsx frontend/src/App.tsx frontend/src/components/layout/Sidebar.tsx
git commit -m "feat: add Payment & Billing page for investors"
```

---

### Task 10: InvestorKanbanPage

**Files:**
- Create: `frontend/src/pages/kanban/InvestorKanbanPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create InvestorKanbanPage**

```typescript
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Lock, MessageSquare, X, Send } from "lucide-react";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import type { KanbanColumn, KanbanTask, TaskComment } from "@/types";

export function InvestorKanbanPage() {
  const { startupId } = useParams<{ startupId: string }>();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { profile } = useAuth();
  const startupName: string = (state as { startupName?: string })?.startupName ?? "Startup";

  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!startupId) return;
    api.get<KanbanColumn[]>(`/kanban/${startupId}/board/`)
      .then(setColumns)
      .catch(() => navigate("/investments", { replace: true }))
      .finally(() => setLoading(false));
  }, [startupId, navigate]);

  const handleTaskClick = async (task: KanbanTask) => {
    setSelectedTask(task);
    setComments([]);
    setCommentsLoading(true);
    try {
      const data = await api.get<TaskComment[]>(`/kanban/tasks/${task.id}/comments/`);
      setComments(data);
    } catch {
      // ignore
    } finally {
      setCommentsLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!selectedTask || !newComment.trim()) return;
    setPosting(true);
    try {
      const comment = await api.post<TaskComment>(`/kanban/tasks/${selectedTask.id}/comments/`, {
        content: newComment,
      });
      setComments((prev) => [...prev, comment]);
      setNewComment("");
    } catch {
      // ignore
    } finally {
      setPosting(false);
    }
  };

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="flex flex-col h-full -m-6 lg:-m-8">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-brand-border/[0.12] bg-white flex-shrink-0">
        <button
          onClick={() => navigate("/investments")}
          className="p-2 rounded-xl hover:bg-brand-bg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-brand-muted" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-brand-text">{startupName}</h1>
          <p className="text-xs text-brand-muted">Kanban Board</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-bg border border-brand-border/[0.12]">
          <Lock className="w-3.5 h-3.5 text-brand-muted" />
          <span className="text-xs font-medium text-brand-muted">Read-only</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Board */}
        <div className="flex-1 overflow-x-auto p-6">
          {columns.length === 0 ? (
            <div className="flex items-center justify-center h-full text-brand-muted text-sm">
              No columns yet.
            </div>
          ) : (
            <div className="flex gap-4 h-full">
              {columns.map((col) => (
                <div key={col.id} className="flex-shrink-0 w-72">
                  <div className="bg-brand-bg/60 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1 mb-1">
                      <h3 className="text-sm font-semibold text-brand-text">{col.name}</h3>
                      <span className="text-xs text-brand-muted bg-white border border-brand-border/[0.12] rounded-lg px-2 py-0.5">
                        {col.tasks.length}
                      </span>
                    </div>
                    {col.tasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className={`w-full text-left bg-white rounded-xl border transition-all duration-150 p-3 shadow-sm hover:shadow-md cursor-pointer ${
                          selectedTask?.id === task.id
                            ? "border-brand-accent/40 ring-1 ring-brand-accent/20"
                            : "border-brand-border/[0.12]"
                        }`}
                      >
                        <p className="text-sm font-medium text-brand-text leading-snug">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-brand-muted mt-1 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {task.assignee_detail && (
                            <Avatar
                              src={task.assignee_detail.avatar_url || undefined}
                              name={task.assignee_detail.full_name}
                              size="sm"
                            />
                          )}
                          {task.comments_count > 0 && (
                            <span className="ml-auto flex items-center gap-1 text-xs text-brand-muted">
                              <MessageSquare className="w-3 h-3" />
                              {task.comments_count}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                    {col.tasks.length === 0 && (
                      <div className="text-center py-6 text-xs text-brand-muted/50">
                        No tasks
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task detail side panel */}
        {selectedTask && (
          <div className="w-96 flex-shrink-0 border-l border-brand-border/[0.12] bg-white flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border/[0.12]">
              <h3 className="text-sm font-bold text-brand-text leading-snug flex-1 pr-3">
                {selectedTask.title}
              </h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1.5 rounded-lg hover:bg-brand-bg transition-colors cursor-pointer flex-shrink-0"
              >
                <X className="w-4 h-4 text-brand-muted" />
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {selectedTask.description && (
                <div>
                  <p className="text-[11px] text-brand-muted font-medium uppercase tracking-wider mb-1.5">
                    Description
                  </p>
                  <p className="text-sm text-brand-text leading-relaxed">
                    {selectedTask.description}
                  </p>
                </div>
              )}

              {selectedTask.assignee_detail && (
                <div>
                  <p className="text-[11px] text-brand-muted font-medium uppercase tracking-wider mb-1.5">
                    Assignee
                  </p>
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={selectedTask.assignee_detail.avatar_url || undefined}
                      name={selectedTask.assignee_detail.full_name}
                      size="sm"
                    />
                    <span className="text-sm text-brand-text">
                      {selectedTask.assignee_detail.full_name}
                    </span>
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <p className="text-[11px] text-brand-muted font-medium uppercase tracking-wider mb-3">
                  Comments
                </p>
                {commentsLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-brand-muted/60 text-center py-4">
                    No comments yet. Be the first!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="flex gap-2.5">
                        <Avatar
                          src={c.author_avatar || undefined}
                          name={c.author_name}
                          size="sm"
                        />
                        <div className="flex-1 bg-brand-bg/40 rounded-xl p-2.5">
                          <div className="flex items-baseline gap-2">
                            <p className="text-xs font-semibold text-brand-text">{c.author_name}</p>
                            <p className="text-[10px] text-brand-muted">
                              {new Date(c.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-xs text-brand-text mt-0.5 leading-relaxed">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Comment input */}
            <div className="p-4 border-t border-brand-border/[0.12]">
              <div className="flex gap-2.5">
                <Avatar
                  src={profile?.avatar_url || undefined}
                  name={profile?.full_name ?? ""}
                  size="sm"
                />
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handlePostComment();
                      }
                    }}
                    placeholder="Leave a comment..."
                    rows={2}
                    className="w-full resize-none text-sm border border-brand-border/[0.2] rounded-xl px-3 py-2 focus:outline-none focus:border-brand-accent transition-colors bg-brand-bg/30"
                  />
                  <button
                    onClick={handlePostComment}
                    disabled={posting || !newComment.trim()}
                    className="mt-1.5 flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-brand-accent text-white text-sm font-medium disabled:opacity-50 hover:bg-brand-accent/90 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {posting ? "Posting..." : "Post Comment"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add route in App.tsx**

Add import:
```typescript
import { InvestorKanbanPage } from "@/pages/kanban/InvestorKanbanPage";
```

Add route inside `<AppLayout>` routes:
```typescript
<Route path="/investments/board/:startupId" element={<InvestorKanbanPage />} />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/kanban/InvestorKanbanPage.tsx frontend/src/App.tsx
git commit -m "feat: add InvestorKanbanPage read-only board with task comments"
```

---

### Task 11: InvestmentsPage — "View Board" button

**Files:**
- Modify: `frontend/src/pages/investments/InvestmentsPage.tsx`

- [ ] **Step 1: Add import and button**

Add `useNavigate` to the react-router-dom import:
```typescript
import { Link, useNavigate } from "react-router-dom";
```

Add at the top of the `InvestmentsPage` function:
```typescript
const navigate = useNavigate();
```

Inside the investment card map, after the `<Badge status={inv.status} />` element, add:
```typescript
{profile?.role === "investor" &&
  inv.status === "confirmed" &&
  inv.campaign_detail.status === "active" && (
    <button
      onClick={() =>
        navigate(`/investments/board/${inv.campaign_detail.startup}`, {
          state: { startupName: inv.campaign_detail.startup_name },
        })
      }
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-brand-blue bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
    >
      View Board
    </button>
  )}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/investments/InvestmentsPage.tsx
git commit -m "feat: add View Board button on InvestmentsPage for confirmed active investments"
```

---

### Task 12: Smoke test

- [ ] **Step 1: Start the stack**

```bash
docker compose up
```

- [ ] **Step 2: Test checkout flow**
  - Log in as an investor with an approved account
  - Navigate to an active campaign
  - Click "Invest" — the full-screen `CheckoutModal` overlay should appear
  - Complete all 3 steps, confirm pledge
  - Campaign funding bar should update

- [ ] **Step 3: Test billing page**
  - Navigate to sidebar → "Payment & Billing"
  - Add a payment method and address, save
  - Reopen checkout on a campaign — Step 2 should pre-fill with saved card

- [ ] **Step 4: Test investor kanban**
  - As a founder, confirm a pending investment
  - As the investor, navigate to Investments → click "View Board"
  - Board should render in read-only mode
  - Click a task → side panel opens
  - Post a comment → appears in thread
  - Verify no drag-and-drop, no add/edit/delete controls are shown

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: investor checkout, billing page, and read-only kanban complete"
```
