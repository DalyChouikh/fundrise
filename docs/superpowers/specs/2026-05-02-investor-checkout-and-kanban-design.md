# Investor Checkout & Kanban Access — Design Spec
**Date:** 2026-05-02
**Status:** Approved

## Overview

Three interconnected features for the investor role:

1. **Checkout overlay** — full-screen multi-step investment pledge flow replacing the current simple modal
2. **Payment & Billing page** — dedicated sidebar page where investors save a card and billing address
3. **Investor kanban (read-only)** — board access for startups in which the investor has a confirmed investment in an active campaign, with the ability to leave task comments

No real payment processing. This is a pledge/commitment flow — card details are stored for display only (last 4 digits, type, expiry), never charged.

---

## 1. Backend — Data Models & API

### 1.1 New Model: `SavedPaymentInfo` (users app)

OneToOne with `UserProfile`. Extends `TimeStampedModel`.

```
SavedPaymentInfo
  user          → OneToOneField(UserProfile, related_name="payment_info")
  card_holder   → CharField(max_length=255)
  card_last4    → CharField(max_length=4)
  card_type     → CharField(max_length=20)  # visa | mastercard | amex | discover
  expiry_month  → PositiveSmallIntegerField
  expiry_year   → PositiveSmallIntegerField
  address_line1 → CharField(max_length=255)
  address_line2 → CharField(max_length=255, blank=True)
  city          → CharField(max_length=100)
  state         → CharField(max_length=100)
  postal_code   → CharField(max_length=20)
  country       → CharField(max_length=100)
```

### 1.2 Investment Model — 2 new fields

Snapshot of the payment method declared at checkout time (nullable — older investments have no snapshot).

```
card_last4  → CharField(max_length=4, null=True, blank=True)
card_type   → CharField(max_length=20, null=True, blank=True)
```

### 1.3 API Endpoints

**Payment profile:**
- `GET /api/users/payment-profile/` — returns investor's saved card + address (404 if none saved yet)
- `PUT /api/users/payment-profile/` — create or update saved card + address
- `DELETE /api/users/payment-profile/` — remove saved payment info

**Kanban (existing endpoints, permissions updated):**
- `GET /api/kanban/<startup_id>/board/` — updated to admit investors with a confirmed investment in an active campaign (read-only)
- `GET /api/kanban/<startup_id>/columns/` — same
- `GET /api/kanban/<startup_pk>/tasks/` — same
- `GET /api/kanban/<startup_pk>/tasks/<pk>/` — same
- `POST /api/kanban/tasks/<task_pk>/comments/` — updated to allow investors (POST only; edit/delete remain member-only)
- `GET /api/kanban/tasks/<task_pk>/comments/` — updated to allow investors

### 1.4 Kanban Permission Update

Current: `IsStartupMemberForKanban` — blocks all non-members.

New logic for GET-only requests:
1. Check if user is a startup member → allow (existing)
2. Else check if user is an investor with at least one confirmed investment whose campaign is active and belongs to this startup → allow read-only
3. All write operations (POST/PATCH/DELETE on columns and tasks) remain member-only
4. Task comments POST is added as an exception — investors can post comments

New permission class: `CanViewKanbanBoard` (read) and keep `IsStartupMemberForKanban` (write).

---

## 2. Checkout Modal

### 2.1 Trigger

The existing "Invest" button on `CampaignDetailPage` opens the `CheckoutModal` (full-screen fixed overlay, `z-50`, dark semi-transparent backdrop). Replaces the current simple modal.

### 2.2 Structure

Three-step wizard with step indicator (dots) at top and back arrow between steps.

**Step 1 — Amount**
- Campaign summary card: name, startup, funding progress bar, equity offered, days left
- Large currency input (`$`) with minimum investment hint
- "Continue →" button

**Step 2 — Payment**
- If saved card exists: card preview graphic (card type logo, `•••• •••• •••• {last4}`, holder name, expiry). Option to use it or enter a different card.
- "Enter a different card" toggle reveals: cardholder name, card number (masked on blur — only last 4 stored), expiry MM/YY, CVV (validated client-side only, never sent to backend)
- Checkbox: "Save this card to my profile" (pre-checked when no saved card exists)
- Address sub-section: if saved address exists, pre-filled. "Use a different address" toggle reveals address form.
- "Continue →" button

**Step 3 — Review & Confirm**
- Summary: campaign name, pledge amount, card ending in XXXX, billing address
- Disclaimer banner: *"This is a pledge — your card will not be charged. The startup founder will review and confirm your investment."*
- "Confirm Pledge" button (accent color `#D97757`)
- On success: POST to `/api/investments/` with `{ campaign, amount, card_last4, card_type }`, conditionally PUT to `/api/users/payment-profile/` if "save card" was checked. Overlay closes, campaign funding bar updates, success toast shown.

### 2.3 Navigation & UX

- Back arrow between steps
- X button to close (confirmation prompt if past step 1)
- Step dots at top (3 dots, active dot filled)
- Error states inline below each field

### 2.4 Styling

- Background: `#FAF9F5`, text: `#242421`, muted: `#BBB9AF`
- `rounded-xl` cards, soft shadows
- Reuses existing `Button`, `Card` UI components
- Card preview: dark gradient card graphic (`#242421` → `#141413`), chip icon, card type logo top-right

---

## 3. Payment & Billing Page

### 3.1 Route & Navigation

- Route: `/billing`
- Sidebar nav item: "Payment & Billing" (investor-only, hidden for other roles)
- Placed below "My Investments" in the sidebar

### 3.2 Layout

Full page within `AppLayout`. Two sections stacked vertically inside a max-width container.

**Card section:**
- Heading: "Payment Method"
- If no saved card: empty state illustration + "Add payment method" button → expands inline form
- If card exists: card preview graphic (same component as checkout) + "Edit" / "Remove" actions
- Edit expands inline form pre-filled (CVV field empty — never stored)
- Form fields: cardholder name, card number, expiry MM/YY, CVV

**Billing Address section:**
- Heading: "Billing Address"
- If no saved address: "Add billing address" → inline form
- If address exists: formatted address display + "Edit" inline
- Fields: address line 1, address line 2 (optional), city, state/province, postal code, country (dropdown)

**Save button** at the bottom — `PUT /api/users/payment-profile/` with all fields.

### 3.3 Styling

Consistent with existing pages — `rounded-xl` cards, section headings in `#242421`, labels in `#BBB9AF`.

---

## 4. Investor Kanban — Read-Only Board

### 4.1 Route

`/investments/board/:startupId`

Separate from founder kanban at `/kanban/:startupId`. No sidebar nav item — investors reach this board only via two access points:

1. **InvestmentsPage** — each confirmed investment card with an active campaign shows a "View Board" button
2. **CampaignDetailPage** — a "View Startup Board" button appears for investors with a confirmed + active investment

### 4.2 Access Control

Frontend: before rendering, verify the investor has a confirmed investment in an active campaign for this startup (derived from existing `/api/investments/` data). Redirect to `/investments` if not.

Backend: `CanViewKanbanBoard` permission (see §1.4).

### 4.3 Board Layout

- Header: startup name, campaign name, back arrow (→ `/investments`), `Read-only` badge
- Columns rendered horizontally (same card styling as founder view)
- **Disabled:** drag-and-drop, "Add task", "Add column", task edit/delete, assignee changes, column rename/delete
- Task cards are clickable — opens task detail side panel

### 4.4 Task Detail Side Panel

- Task info: title, description, assignee (read-only display), attachments list
- No edit controls
- Comments thread: full display
- Comment input at bottom: avatar, textarea, "Post" button → `POST /api/kanban/tasks/<id>/comments/`

### 4.5 Styling

Same column and card styling as `KanbanBoardPage`. Disabled state communicated via cursor and muted colors on non-interactive elements, not hidden elements (the investor can see what exists, just not change it).

---

## 5. Component Map

| Component | Path | Notes |
|---|---|---|
| `CheckoutModal` | `frontend/src/components/investments/CheckoutModal.tsx` | Full-screen overlay, 3-step wizard |
| `CardPreview` | `frontend/src/components/investments/CardPreview.tsx` | Reused in checkout + billing page |
| `BillingPage` | `frontend/src/pages/billing/BillingPage.tsx` | New sidebar page |
| `InvestorKanbanPage` | `frontend/src/pages/kanban/InvestorKanbanPage.tsx` | Read-only board |
| `SavedPaymentInfo` model | `backend/apps/users/models.py` | OneToOne with UserProfile |
| `PaymentProfileView` | `backend/apps/users/views.py` | GET/PUT/DELETE payment profile |
| `CanViewKanbanBoard` | `backend/apps/kanban/permissions.py` | New read-only kanban permission |

---

## 6. Out of Scope

- Real payment processing (Stripe, PayPal, etc.)
- Multiple saved cards per investor
- Card validation against a payment network
- Investor ability to edit or delete task comments
- Kanban WebSocket live updates for investor view
