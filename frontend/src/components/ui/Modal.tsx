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
