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
