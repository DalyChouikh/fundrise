# Spec 1: UI Design System

**Date:** 2026-05-07  
**Status:** Approved  
**Scope:** New shared UI components + full replacement of all inline/native form element usages across the app.

---

## Overview

Build eight shared components in `frontend/src/components/ui/` and a global `ToastProvider`. These become the single source of truth for all form inputs, alerts, modals, and notifications across the entire app. All existing inline usages are replaced in this same pass.

---

## Components

### `Input`
Wrapper around `<input type="text|email|url|password|number">`. Centralizes the class string used everywhere inline. Accepts all native input props plus:
- `error?: boolean` — swaps border to red tint when true

### `Textarea`
Wrapper around `<textarea>`. Same approach as `Input`.

### `Select`
Custom-built dropdown (button trigger + absolute popover). Does **not** use native `<select>`.

**Props:**
- `options: { value: string; label: string }[]`
- `value: string`
- `onChange: (value: string) => void`
- `placeholder?: string`
- `searchable?: boolean` — adds a filter input at the top of the dropdown (used for industry combobox)
- `disabled?: boolean`
- `error?: boolean`

**Behaviour:**
- Trigger button styled identically to `Input` (rounded-xl, border-brand-border/30, shadow-sm, same height)
- Opens a popover below the trigger (or above if not enough space)
- When `searchable`, a small search input appears at the top of the list and filters options client-side
- Keyboard nav: arrow keys move selection, Enter confirms, Escape closes
- Click-outside closes via `useRef` + `useEffect`
- Accessible: `role="listbox"`, `role="option"`, `aria-selected`, `aria-expanded`

### `DateInput`
Thin wrapper around `<input type="date">`. Styled identically to `Input`. No custom date picker widget — uses native browser picker.

### `DateTimeInput`
Thin wrapper around `<input type="datetime-local">`. Same as `DateInput`.

### `Alert`
Inline alert block. Four variants: `error`, `warning`, `info`, `success`.

**Props:**
- `variant: "error" | "warning" | "info" | "success"`
- `children: ReactNode`
- `className?: string`

**Styling per variant:**
- `error` — `bg-red-50 border-red-100 text-red-700` + X circle icon
- `warning` — `bg-amber-50 border-amber-100 text-amber-700` + AlertTriangle icon
- `info` — `bg-blue-50 border-blue-100 text-blue-700` + Info icon
- `success` — `bg-emerald-50 border-emerald-100 text-emerald-700` + CheckCircle icon

All variants: `rounded-xl border px-4 py-3 text-sm flex items-start gap-2`.

### `Modal`
Reusable modal shell. All page-level modals use this.

**Props:**
- `open: boolean`
- `onClose: () => void`
- `title: string`
- `children: ReactNode` — body content
- `footer?: ReactNode` — optional sticky footer slot for action buttons
- `maxWidth?: "sm" | "md" | "lg"` — default `"md"` (max-w-xl)

**Structure:**
```
fixed inset-0 z-50
  backdrop: absolute inset-0 bg-black/40 backdrop-blur-sm (click closes)
  panel: relative bg-white rounded-2xl shadow-modal max-h-[90vh] overflow-y-auto animate-fade-in-scale
    header: flex items-center justify-between p-5 border-b (title + X button)
    body: p-5 (children)
    footer: p-5 pt-0 (if provided)
```

### `ConfirmDialog`
Built on top of `Modal`. Specialized for confirm/cancel actions.

**Props:**
- `open: boolean`
- `onClose: () => void`
- `title: string`
- `message: string`
- `confirmLabel?: string` — default "Confirm"
- `cancelLabel?: string` — default "Cancel"
- `onConfirm: () => void`
- `onCancel: () => void`
- `danger?: boolean` — makes confirm button red (destructive actions)
- `loading?: boolean` — disables confirm button and shows spinner

### `Toast` + `ToastProvider` + `useToast`

**`ToastProvider`** — React context provider, holds a `toasts` array in state. Renders a fixed `Toaster` container (bottom-right, `z-[100]`). Wraps the entire app in `App.tsx`.

**`useToast()`** — hook that reads the context and returns:
```ts
{
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
}
```

**Toast pill styling:**
- Slides in from the right (`translate-x` animation)
- Background: white, border matching variant color, left accent border-l-4
- Icon + message text + manual close button
- Auto-dismisses after 4 seconds
- Max 3 visible at once; oldest slides out when queue overflows

**Variants match `Alert`:** error (red), warning (amber), info (blue), success (emerald).

---

## File Structure

```
frontend/src/
  components/ui/
    Input.tsx           (new)
    Textarea.tsx        (new)
    Select.tsx          (new)
    DateInput.tsx       (new)
    DateTimeInput.tsx   (new)
    Alert.tsx           (new)
    Modal.tsx           (new)
    ConfirmDialog.tsx   (new)
    Toast.tsx           (new — toast pill)
    ToastProvider.tsx   (new — context + Toaster)
    index.ts            (updated — re-exports all)
    Button.tsx          (existing)
    Card.tsx            (existing)
    Badge.tsx           (existing)
    Avatar.tsx          (existing)
    ChartCard.tsx       (existing)
    LoadingSpinner.tsx  (existing)
    DynamicIcon.tsx     (existing)
    Logo.tsx            (existing)
  hooks/
    useToast.ts         (new)
  App.tsx               (updated — wraps router in <ToastProvider>)
```

---

## Replacement Scope

### `Select`
| File | Usage |
|------|-------|
| `pages/campaigns/CampaignsPage.tsx` | Startup selector in `CreateCampaignModal` |
| `pages/onboarding/steps/InvestorPreferencesStep.tsx` | Stage/preferences selects |
| `pages/onboarding/steps/InvestorAccreditationStep.tsx` | Accreditation status select |
| `pages/settings/SettingsPage.tsx` | Any role/option selects |
| `components/copilot/QuestionForm.tsx` | New `select` question type (Spec 3) |

### `DateInput` / `DateTimeInput`
| File | Field |
|------|-------|
| `pages/startups/StartupsPage.tsx` | `founding_date` in `CreateStartupModal` |
| `pages/campaigns/CampaignsPage.tsx` | `deadline` in `CreateCampaignModal` |
| Any onboarding step with date fields | `date_of_birth`, etc. |

### `Alert`
All inline `bg-red-50 border border-red-100 text-red-700` error divs replaced with `<Alert variant="error">`:
- `StartupsPage.tsx` — `CreateStartupModal`
- `CampaignsPage.tsx` — `CreateCampaignModal`
- `StartupDetailPage.tsx`
- `CampaignDetailPage.tsx`
- `SettingsPage.tsx`
- `LoginPage.tsx`
- `SignupPage.tsx`
- Any other page with inline error divs

### `Modal`
| File | Component refactored |
|------|---------------------|
| `pages/startups/StartupsPage.tsx` | `CreateStartupModal` |
| `pages/campaigns/CampaignsPage.tsx` | `CreateCampaignModal` |
| `components/passkey/PasskeyConfirmDialog.tsx` | Whole component |
| `components/investments/CheckoutModal.tsx` | Whole component |

Internal form/logic stays unchanged — only the modal shell (backdrop, panel, header, close button) is replaced with `<Modal>`.

### `Toast`
- `ToastProvider` added to `App.tsx` wrapping the router
- All silent `catch {}` blocks get `toast.error(...)` with a readable message
- Successful mutations (create startup, create campaign, follow, invest, create task, etc.) get `toast.success(...)`

### `Input` / `Textarea`
All inline `<input type="text|email|url|password">` and `<textarea>` elements in every page, modal, and onboarding step replaced with `<Input>` and `<Textarea>` components. Visual output is identical — only the class string is centralized.

---

## Error Handling

- `Select` catches edge cases: empty `options` array shows a "No options available" state; `searchable` with no matches shows "No results."
- `Toast` queue is capped at 10 items; oldest is evicted silently if exceeded.
- `Modal` traps focus inside while open (prevents tab-out to background content).
- `ConfirmDialog` `loading` prop disables the confirm button and shows a spinner to prevent double-submit.

---

## What This Does NOT Include

- No Radix UI or Headless UI dependency — all components are hand-rolled to keep the bundle lean and match the existing codebase pattern.
- No custom date picker widget — native browser date input is sufficient.
- No rich-text / WYSIWYG — `Textarea` is plain text only.
- `NumberInput` is handled by `<Input type="number">` — no separate component needed.
