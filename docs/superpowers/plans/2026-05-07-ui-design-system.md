# UI Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 9 shared UI components (Input, Textarea, Alert, DateInput, DateTimeInput, Select, Modal, ConfirmDialog, Toast) and replace every inline form/modal/alert usage across the app with them.

**Architecture:** All new components live in `frontend/src/components/ui/`. A `ToastProvider` wraps the root app. Replacement tasks do surgical import + JSX swaps — no logic changes. No backend changes.

**Tech Stack:** React 18, TypeScript, TailwindCSS 3, lucide-react, `@/lib/cn`

---

## File Map

**New files:**
- `frontend/src/components/ui/Input.tsx`
- `frontend/src/components/ui/Textarea.tsx`
- `frontend/src/components/ui/Alert.tsx`
- `frontend/src/components/ui/DateInput.tsx`
- `frontend/src/components/ui/DateTimeInput.tsx`
- `frontend/src/components/ui/Select.tsx`
- `frontend/src/components/ui/Modal.tsx`
- `frontend/src/components/ui/ConfirmDialog.tsx`
- `frontend/src/components/ui/Toast.tsx`
- `frontend/src/components/ui/ToastProvider.tsx`
- `frontend/src/components/ui/index.ts`
- `frontend/src/hooks/useToast.ts`

**Modified files:**
- `frontend/src/App.tsx`
- `frontend/src/pages/auth/LoginPage.tsx`
- `frontend/src/pages/auth/SignupPage.tsx`
- `frontend/src/pages/settings/SettingsPage.tsx`
- `frontend/src/pages/startups/StartupsPage.tsx`
- `frontend/src/pages/campaigns/CampaignsPage.tsx`
- `frontend/src/components/passkey/PasskeyConfirmDialog.tsx`
- `frontend/src/components/investments/CheckoutModal.tsx`
- `frontend/src/pages/onboarding/steps/ProfileStep.tsx`
- `frontend/src/pages/onboarding/steps/FounderStartupStep.tsx`
- `frontend/src/pages/onboarding/steps/FounderDetailsStep.tsx`
- `frontend/src/pages/onboarding/steps/InvestorPreferencesStep.tsx`
- `frontend/src/pages/onboarding/steps/InvestorAccreditationStep.tsx`
- `frontend/src/pages/onboarding/steps/InvestorBackgroundStep.tsx`
- `frontend/src/pages/startups/StartupDetailPage.tsx`
- `frontend/src/pages/campaigns/CampaignDetailPage.tsx`

---

### Task 1: Input and Textarea components

**Files:**
- Create: `frontend/src/components/ui/Input.tsx`
- Create: `frontend/src/components/ui/Textarea.tsx`

- [ ] **Step 1: Create Input.tsx**

```tsx
// frontend/src/components/ui/Input.tsx
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full px-4 py-2.5 rounded-xl bg-white border text-brand-text placeholder:text-brand-muted/60 text-sm outline-none transition-all shadow-sm",
        error
          ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
          : "border-brand-border/30 focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
```

- [ ] **Step 2: Create Textarea.tsx**

```tsx
// frontend/src/components/ui/Textarea.tsx
import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full px-4 py-2.5 rounded-xl bg-white border text-brand-text placeholder:text-brand-muted/60 text-sm outline-none transition-all shadow-sm resize-none",
        error
          ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
          : "border-brand-border/30 focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
```

- [ ] **Step 3: Type-check**

```bash
docker compose exec react-frontend npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/Input.tsx frontend/src/components/ui/Textarea.tsx
git commit -m "feat: add Input and Textarea UI components"
```

---

### Task 2: Alert component

**Files:**
- Create: `frontend/src/components/ui/Alert.tsx`

- [ ] **Step 1: Create Alert.tsx**

```tsx
// frontend/src/components/ui/Alert.tsx
import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface AlertProps {
  variant: "error" | "warning" | "info" | "success";
  children: ReactNode;
  className?: string;
}

const VARIANTS = {
  error:   { cls: "bg-red-50 border-red-100 text-red-700",            Icon: AlertCircle },
  warning: { cls: "bg-amber-50 border-amber-100 text-amber-700",      Icon: AlertTriangle },
  info:    { cls: "bg-blue-50 border-blue-100 text-blue-700",         Icon: Info },
  success: { cls: "bg-emerald-50 border-emerald-100 text-emerald-700", Icon: CheckCircle },
};

export function Alert({ variant, children, className }: AlertProps) {
  const { cls, Icon } = VARIANTS[variant];
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm flex items-start gap-2", cls, className)}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
docker compose exec react-frontend npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/Alert.tsx
git commit -m "feat: add Alert UI component"
```

---

### Task 3: DateInput and DateTimeInput components

**Files:**
- Create: `frontend/src/components/ui/DateInput.tsx`
- Create: `frontend/src/components/ui/DateTimeInput.tsx`

- [ ] **Step 1: Create DateInput.tsx**

```tsx
// frontend/src/components/ui/DateInput.tsx
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const DateInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="date"
      className={cn(
        "w-full px-4 py-2.5 rounded-xl bg-white border border-brand-border/30 text-brand-text text-sm outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all shadow-sm",
        className
      )}
      {...props}
    />
  )
);
DateInput.displayName = "DateInput";
```

- [ ] **Step 2: Create DateTimeInput.tsx**

```tsx
// frontend/src/components/ui/DateTimeInput.tsx
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const DateTimeInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="datetime-local"
      className={cn(
        "w-full px-4 py-2.5 rounded-xl bg-white border border-brand-border/30 text-brand-text text-sm outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all shadow-sm",
        className
      )}
      {...props}
    />
  )
);
DateTimeInput.displayName = "DateTimeInput";
```

- [ ] **Step 3: Type-check and commit**

```bash
docker compose exec react-frontend npx tsc --noEmit
git add frontend/src/components/ui/DateInput.tsx frontend/src/components/ui/DateTimeInput.tsx
git commit -m "feat: add DateInput and DateTimeInput UI components"
```

---

### Task 4: Select component

**Files:**
- Create: `frontend/src/components/ui/Select.tsx`

- [ ] **Step 1: Create Select.tsx**

```tsx
// frontend/src/components/ui/Select.tsx
import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchable = false,
  disabled = false,
  error = false,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) { setSearch(""); return; }
    if (searchable) setTimeout(() => searchRef.current?.focus(), 0);
  }, [open, searchable]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white border text-sm outline-none transition-all shadow-sm text-left",
          error
            ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
            : open
              ? "border-brand-blue/40 ring-2 ring-brand-blue/10"
              : "border-brand-border/30 hover:border-brand-border/60",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        )}
      >
        <span className={selected ? "text-brand-text" : "text-brand-muted/60"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn("w-4 h-4 text-brand-muted shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-brand-border/30 shadow-lg overflow-hidden"
        >
          {searchable && (
            <div className="p-2 border-b border-brand-border/[0.08]">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-bg">
                <Search className="w-3.5 h-3.5 text-brand-muted shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="bg-transparent outline-none text-sm text-brand-text placeholder:text-brand-muted/60 w-full"
                />
              </div>
            </div>
          )}
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-2.5 text-sm text-brand-muted">
                {options.length === 0 ? "No options available" : "No results"}
              </li>
            ) : (
              filtered.map((opt) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={cn(
                    "flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors",
                    opt.value === value
                      ? "bg-brand-accent/[0.06] text-brand-accent font-medium"
                      : "text-brand-text hover:bg-brand-bg"
                  )}
                >
                  {opt.label}
                  {opt.value === value && <Check className="w-3.5 h-3.5 shrink-0" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
docker compose exec react-frontend npx tsc --noEmit
git add frontend/src/components/ui/Select.tsx
git commit -m "feat: add Select UI component with keyboard nav and search"
```

---

### Task 5: Modal component

**Files:**
- Create: `frontend/src/components/ui/Modal.tsx`

- [ ] **Step 1: Create Modal.tsx**

```tsx
// frontend/src/components/ui/Modal.tsx
import { type ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: "sm" | "md" | "lg";
}

const MAX_WIDTHS = { sm: "max-w-sm", md: "max-w-xl", lg: "max-w-2xl" };

export function Modal({ open, onClose, title, children, footer, maxWidth = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => panelRef.current?.focus(), 0);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "relative bg-white rounded-2xl shadow-modal w-full mx-4 max-h-[90vh] overflow-y-auto animate-fade-in-scale outline-none",
          MAX_WIDTHS[maxWidth]
        )}
      >
        <div className="flex items-center justify-between p-5 border-b border-brand-border/[0.1]">
          <h2 id="modal-title" className="text-base font-bold text-brand-text">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-brand-bg text-brand-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="px-5 pb-5">{footer}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
docker compose exec react-frontend npx tsc --noEmit
git add frontend/src/components/ui/Modal.tsx
git commit -m "feat: add Modal UI component"
```

---

### Task 6: ConfirmDialog component

**Files:**
- Create: `frontend/src/components/ui/ConfirmDialog.tsx`

- [ ] **Step 1: Create ConfirmDialog.tsx**

```tsx
// frontend/src/components/ui/ConfirmDialog.tsx
import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  danger = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-brand-muted leading-relaxed">{message}</p>
    </Modal>
  );
}
```

- [ ] **Step 2: Type-check and commit**

```bash
docker compose exec react-frontend npx tsc --noEmit
git add frontend/src/components/ui/ConfirmDialog.tsx
git commit -m "feat: add ConfirmDialog UI component"
```

---

### Task 7: Toast system

**Files:**
- Create: `frontend/src/components/ui/Toast.tsx`
- Create: `frontend/src/components/ui/ToastProvider.tsx`
- Create: `frontend/src/hooks/useToast.ts`

- [ ] **Step 1: Create ToastProvider.tsx**

```tsx
// frontend/src/components/ui/ToastProvider.tsx
import { createContext, useState, useCallback, type ReactNode } from "react";
import { Toast } from "./Toast";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

export interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, variant, message }].slice(-3));
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const ctx: ToastContextValue = {
    success: (msg) => addToast("success", msg),
    error:   (msg) => addToast("error", msg),
    info:    (msg) => addToast("info", msg),
    warning: (msg) => addToast("warning", msg),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <Toast key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
```

- [ ] **Step 2: Create Toast.tsx**

```tsx
// frontend/src/components/ui/Toast.tsx
import { AlertCircle, AlertTriangle, Info, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ToastItem } from "./ToastProvider";

interface ToastProps {
  item: ToastItem;
  onDismiss: () => void;
}

const VARIANTS = {
  success: { border: "border-l-emerald-500", text: "text-emerald-700", Icon: CheckCircle },
  error:   { border: "border-l-red-500",     text: "text-red-700",     Icon: AlertCircle },
  info:    { border: "border-l-blue-500",     text: "text-blue-700",    Icon: Info },
  warning: { border: "border-l-amber-500",    text: "text-amber-700",   Icon: AlertTriangle },
};

export function Toast({ item, onDismiss }: ToastProps) {
  const { border, text, Icon } = VARIANTS[item.variant];
  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 bg-white border border-brand-border/20 border-l-4 rounded-xl shadow-lg px-4 py-3 min-w-[260px] max-w-sm animate-fade-in",
        border
      )}
    >
      <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", text)} />
      <p className="text-sm text-brand-text flex-1">{item.message}</p>
      <button
        onClick={onDismiss}
        className="text-brand-muted hover:text-brand-text transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create useToast.ts**

```ts
// frontend/src/hooks/useToast.ts
import { useContext } from "react";
import { ToastContext } from "@/components/ui/ToastProvider";

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
```

- [ ] **Step 4: Type-check and commit**

```bash
docker compose exec react-frontend npx tsc --noEmit
git add frontend/src/components/ui/Toast.tsx frontend/src/components/ui/ToastProvider.tsx frontend/src/hooks/useToast.ts
git commit -m "feat: add Toast system (ToastProvider, Toast pill, useToast hook)"
```

---

### Task 8: Export barrel and wire ToastProvider

**Files:**
- Create: `frontend/src/components/ui/index.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create components/ui/index.ts**

```ts
// frontend/src/components/ui/index.ts
export { Input } from "./Input";
export { Textarea } from "./Textarea";
export { Alert } from "./Alert";
export { DateInput } from "./DateInput";
export { DateTimeInput } from "./DateTimeInput";
export { Select } from "./Select";
export type { SelectOption } from "./Select";
export { Modal } from "./Modal";
export { ConfirmDialog } from "./ConfirmDialog";
export { Toast } from "./Toast";
export { ToastProvider } from "./ToastProvider";
export { Button } from "./Button";
export { Card } from "./Card";
export { Badge } from "./Badge";
export { Avatar } from "./Avatar";
export { ChartCard } from "./ChartCard";
export { LoadingSpinner } from "./LoadingSpinner";
export { DynamicIcon } from "./DynamicIcon";
export { Logo } from "./Logo";
```

- [ ] **Step 2: Wrap App.tsx in ToastProvider**

In `frontend/src/App.tsx`, add the import and wrap `<BrowserRouter>`:

```tsx
// Add import at top:
import { ToastProvider } from "@/components/ui/ToastProvider";

// Wrap the return value:
export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          {/* ... all existing routes unchanged ... */}
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}
```

- [ ] **Step 3: Type-check and commit**

```bash
docker compose exec react-frontend npx tsc --noEmit
git add frontend/src/components/ui/index.ts frontend/src/App.tsx
git commit -m "feat: add UI component barrel export and wire ToastProvider to app root"
```

---

### Task 9: Replace usages in LoginPage and SignupPage

**Files:**
- Modify: `frontend/src/pages/auth/LoginPage.tsx`
- Modify: `frontend/src/pages/auth/SignupPage.tsx`

- [ ] **Step 1: Update LoginPage.tsx**

Add import:
```tsx
import { Input, Alert } from "@/components/ui";
```

Replace the inline error div:
```tsx
// Before:
{error && (
  <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm animate-fade-in">
    {error}
  </div>
)}

// After:
{error && <Alert variant="error">{error}</Alert>}
```

Replace email input:
```tsx
// Before:
<input
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="you@example.com"
  required
  className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-border/40 text-brand-text placeholder:text-brand-muted/60 text-sm outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all shadow-sm"
/>

// After:
<Input
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="you@example.com"
  required
/>
```

Replace password input (same pattern — remove className, use `<Input type="password">`).

- [ ] **Step 2: Update SignupPage.tsx**

Open `frontend/src/pages/auth/SignupPage.tsx`. Apply the same replacements:
- Add `import { Input, Alert } from "@/components/ui";`
- Replace inline error div with `<Alert variant="error">{error}</Alert>`
- Replace each `<input type="text|email|password">` with `<Input type="...">` (remove className, keep all other props)

- [ ] **Step 3: Type-check and commit**

```bash
docker compose exec react-frontend npx tsc --noEmit
git add frontend/src/pages/auth/LoginPage.tsx frontend/src/pages/auth/SignupPage.tsx
git commit -m "feat: replace inline inputs and error divs in auth pages with UI components"
```

---

### Task 10: Replace usages in SettingsPage

**Files:**
- Modify: `frontend/src/pages/settings/SettingsPage.tsx`

- [ ] **Step 1: Update SettingsPage.tsx**

Add import:
```tsx
import { Input, Textarea, Alert } from "@/components/ui";
```

Replace the inline success div (around line 75):
```tsx
// Before:
{success && (
  <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm animate-fade-in">
    Profile updated successfully.
  </div>
)}

// After:
{success && <Alert variant="success">Profile updated successfully.</Alert>}
```

Replace the full name input (around line 85):
```tsx
// Before:
<input
  type="text"
  value={form.full_name}
  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
  className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-border/40 text-brand-text text-sm outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all shadow-sm"
/>

// After:
<Input
  type="text"
  value={form.full_name}
  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
/>
```

Replace the bio textarea (around line 99):
```tsx
// Before:
<textarea
  value={form.bio}
  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
  placeholder="Tell us about yourself..."
  rows={3}
  className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-border/40 text-brand-text placeholder:text-brand-muted/60 text-sm outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all resize-none shadow-sm"
/>

// After:
<Textarea
  value={form.bio}
  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
  placeholder="Tell us about yourself..."
  rows={3}
/>
```

Also remove the `success` state timeout pattern and replace with `useToast`:
```tsx
// Add at top of component:
const toast = useToast();

// In handleSubmit, replace:
setSuccess(true);
setTimeout(() => setSuccess(false), 3000);
// With:
toast.success("Profile updated successfully.");

// Remove: const [success, setSuccess] = useState(false);
// Remove: the {success && <Alert>} block
```

Add `import { useToast } from "@/hooks/useToast";` to imports.

- [ ] **Step 2: Type-check and commit**

```bash
docker compose exec react-frontend npx tsc --noEmit
git add frontend/src/pages/settings/SettingsPage.tsx
git commit -m "feat: replace inline form elements and alerts in SettingsPage with UI components"
```

---

### Task 11: Replace usages in StartupsPage (CreateStartupModal)

**Files:**
- Modify: `frontend/src/pages/startups/StartupsPage.tsx`

- [ ] **Step 1: Update StartupsPage.tsx**

Add imports:
```tsx
import { Input, Textarea, DateInput, Alert, Modal } from "@/components/ui";
import { useToast } from "@/hooks/useToast";
```

In `CreateStartupModal`, add `const toast = useToast();` at the top.

Replace the inline error div:
```tsx
// Before:
{error && (
  <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
    {error}
  </div>
)}
// After:
{error && <Alert variant="error">{error}</Alert>}
```

Replace the modal shell — wrap the entire modal `<div>` structure with `<Modal>`. Put the submit button **inside** the form (not in the `footer` prop) so `type="submit"` triggers `onSubmit` correctly:
```tsx
// Before: the whole fixed inset-0 div, backdrop, panel, header with X button
// After:
<Modal open={true} onClose={onClose} title="Create Startup">
  <form onSubmit={handleSubmit} className="space-y-4">
    {error && <Alert variant="error">{error}</Alert>}
    {/* ... all existing form fields (LogoUpload, inputs, FileUpload) ... */}
    <div className="flex justify-end gap-3 pt-2">
      <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      <Button type="submit" loading={loading}>Create Startup</Button>
    </div>
  </form>
</Modal>
```

Replace the Name input with `<Input>`, Description textarea with `<Textarea>`, Industry input with `<Input>`, Location input with `<Input>`, Website input with `<Input type="url">`.

Replace the founding_date input:
```tsx
// Before:
<input type="date" required value={form.founding_date} onChange={...} className="..." />
// After:
<DateInput required value={form.founding_date} onChange={(e) => updateField("founding_date", e.target.value)} />
```

In `handleFollow`, replace silent catch with toast:
```tsx
catch {
  toast.error("Failed to update follow status.");
}
```

In `handleSubmit` success path (before `onCreated()`):
```tsx
toast.success("Startup created successfully.");
onCreated();
```

- [ ] **Step 2: Type-check and commit**

```bash
docker compose exec react-frontend npx tsc --noEmit
git add frontend/src/pages/startups/StartupsPage.tsx
git commit -m "feat: replace inline form elements, modal shell, and add toasts in StartupsPage"
```

---

### Task 12: Replace usages in CampaignsPage (CreateCampaignModal)

**Files:**
- Modify: `frontend/src/pages/campaigns/CampaignsPage.tsx`

- [ ] **Step 1: Update CampaignsPage.tsx**

Add imports:
```tsx
import { Input, Textarea, DateTimeInput, Select, Alert, Modal } from "@/components/ui";
import { useToast } from "@/hooks/useToast";
```

In `CreateCampaignModal`, add `const toast = useToast();` at the top.

Replace the error div with `<Alert variant="error">{error}</Alert>`.

Replace the startup native `<select>` with `<Select>`:
```tsx
// Before:
<select
  required
  value={form.startup}
  onChange={(e) => updateField("startup", e.target.value)}
  className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-border/30 text-brand-text text-sm outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all shadow-sm cursor-pointer"
>
  <option value="">Select a startup</option>
  {startups.map((s) => (
    <option key={s.id} value={s.id}>{s.name}</option>
  ))}
</select>

// After:
<Select
  options={startups.map((s) => ({ value: String(s.id), label: s.name }))}
  value={form.startup}
  onChange={(val) => updateField("startup", val)}
  placeholder="Select a startup"
/>
```

Replace the deadline `<input type="datetime-local">`:
```tsx
// Before:
<input type="datetime-local" required value={form.deadline} onChange={...} className="..." />
// After:
<DateTimeInput required value={form.deadline} onChange={(e) => updateField("deadline", e.target.value)} />
```

Replace Title, Description, Funding Goal, Equity inputs with `<Input>` and `<Textarea>`.

Replace the modal shell with `<Modal open={true} onClose={onClose} title="Create Campaign">`. Put the submit/cancel buttons **inside** the form (same pattern as Task 11 — buttons inside `<form>`, not in the `footer` prop).

Add toasts to success and catch paths in `handleSubmit`.

- [ ] **Step 2: Type-check and commit**

```bash
docker compose exec react-frontend npx tsc --noEmit
git add frontend/src/pages/campaigns/CampaignsPage.tsx
git commit -m "feat: replace inline form elements, modal shell, and add toasts in CampaignsPage"
```

---

### Task 13: Replace PasskeyConfirmDialog and CheckoutModal

**Files:**
- Modify: `frontend/src/components/passkey/PasskeyConfirmDialog.tsx`
- Modify: `frontend/src/components/investments/CheckoutModal.tsx`

- [ ] **Step 1: Update PasskeyConfirmDialog.tsx**

Open the file and read its current implementation. It currently has its own backdrop + panel structure. Replace the manual modal shell with `<Modal>` or `<ConfirmDialog>` depending on whether it needs custom content beyond a simple message.

If it has a simple title + message + two buttons pattern, replace with:
```tsx
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// Replace the entire rendered JSX with:
<ConfirmDialog
  open={open}
  onClose={onClose}
  title={title}
  message={message}
  confirmLabel={confirmLabel}
  cancelLabel="Cancel"
  onConfirm={onConfirm}
  onCancel={onClose}
  danger={danger}
  loading={loading}
/>
```

If it has custom content beyond a simple message (custom form elements, etc.), use `<Modal>` instead and keep the custom body.

- [ ] **Step 2: Update CheckoutModal.tsx**

Open the file and read its current modal shell structure. Replace the manual backdrop + panel + header with `<Modal open={open} onClose={onClose} title="...">`. Keep all internal form logic unchanged.

Add `import { Modal, Input, Alert } from "@/components/ui";` and replace inline elements following the same pattern as previous tasks.

- [ ] **Step 3: Type-check and commit**

```bash
docker compose exec react-frontend npx tsc --noEmit
git add frontend/src/components/passkey/PasskeyConfirmDialog.tsx frontend/src/components/investments/CheckoutModal.tsx
git commit -m "feat: replace manual modal shells in PasskeyConfirmDialog and CheckoutModal"
```

---

### Task 14: Replace usages in onboarding steps

**Files:**
- Modify: `frontend/src/pages/onboarding/steps/ProfileStep.tsx`
- Modify: `frontend/src/pages/onboarding/steps/FounderStartupStep.tsx`
- Modify: `frontend/src/pages/onboarding/steps/FounderDetailsStep.tsx`
- Modify: `frontend/src/pages/onboarding/steps/InvestorPreferencesStep.tsx`
- Modify: `frontend/src/pages/onboarding/steps/InvestorAccreditationStep.tsx`
- Modify: `frontend/src/pages/onboarding/steps/InvestorBackgroundStep.tsx`

- [ ] **Step 1: For each step file, open it and apply replacements**

The pattern is the same for all step files:

1. Add `import { Input, Textarea, Select, DateInput, Alert } from "@/components/ui";`
2. Replace every `<input type="text|email|url|password|number">` with `<Input type="...">` — remove `className`, keep all other props (`value`, `onChange`, `placeholder`, `required`, `min`, `max`, `step`, etc.)
3. Replace every `<textarea>` with `<Textarea>` — remove `className`, keep all other props
4. Replace every native `<select>` with `<Select options={...} value={...} onChange={...} />` — map option elements to `{ value, label }` objects
5. Replace every `<input type="date">` with `<DateInput>` — remove `className`
6. Replace inline error/success divs with `<Alert variant="error|success">`

Check `FounderStartupStep.tsx` specifically — it likely has a date input for the founding date and text inputs for startup fields. `InvestorPreferencesStep.tsx` and `InvestorAccreditationStep.tsx` likely have native `<select>` elements for stage/accreditation.

- [ ] **Step 2: Type-check and commit**

```bash
docker compose exec react-frontend npx tsc --noEmit
git add frontend/src/pages/onboarding/steps/
git commit -m "feat: replace inline form elements in onboarding steps with UI components"
```

---

### Task 15: Wire toast feedback to remaining pages

**Files:**
- Modify: `frontend/src/pages/startups/StartupDetailPage.tsx`
- Modify: `frontend/src/pages/campaigns/CampaignDetailPage.tsx`
- Modify: `frontend/src/pages/investments/InvestmentsPage.tsx`
- Modify: `frontend/src/pages/kanban/KanbanBoardPage.tsx`
- Modify: `frontend/src/pages/notifications/NotificationsPage.tsx`

- [ ] **Step 1: Apply the toast pattern to each page**

For each page:

1. Add `import { useToast } from "@/hooks/useToast";`
2. Add `const toast = useToast();` at the top of the component
3. Replace inline error `<div>` elements with `<Alert variant="error">` (import `Alert` from `@/components/ui`)
4. In every `catch {}` block that currently swallows errors silently, add a `toast.error(...)` call with a readable message. Examples:
   - `catch { toast.error("Failed to load data. Please refresh."); }`
   - `catch { toast.error("Action failed. Please try again."); }`
5. In every success mutation path (approve, reject, delete, update), add a `toast.success(...)` call. Examples:
   - After startup/campaign approval: `toast.success("Startup approved.");`
   - After task creation: `toast.success("Task created.");`
   - After investment confirmation: `toast.success("Investment confirmed.");`

- [ ] **Step 2: Type-check and commit**

```bash
docker compose exec react-frontend npx tsc --noEmit
git add frontend/src/pages/startups/StartupDetailPage.tsx \
        frontend/src/pages/campaigns/CampaignDetailPage.tsx \
        frontend/src/pages/investments/InvestmentsPage.tsx \
        frontend/src/pages/kanban/KanbanBoardPage.tsx \
        frontend/src/pages/notifications/NotificationsPage.tsx
git commit -m "feat: wire toast feedback to remaining pages — replace silent catch blocks and add success notifications"
```

---

### Task 16: Smoke test the full app

- [ ] **Step 1: Run the dev server and check every touched page**

```bash
docker compose up
```
Visit http://localhost:5173 and verify:

- [ ] Login page: email/password inputs styled correctly, error alert shows on bad credentials
- [ ] Signup page: same
- [ ] Settings page: name/bio inputs render, success toast shows on save
- [ ] Startups page: "New Startup" modal opens with correct styling, DateInput for founding date, Select for industry (if already wired — will be wired in Spec 2), success toast on creation
- [ ] Campaigns page: "New Campaign" modal opens, Select for startup dropdown shows correctly, DateTimeInput for deadline
- [ ] Toast system: toasts appear bottom-right, auto-dismiss after 4s, manual close works, max 3 stack

- [ ] **Step 2: Final type-check**

```bash
docker compose exec react-frontend npx tsc --noEmit
```
Expected: no errors.
