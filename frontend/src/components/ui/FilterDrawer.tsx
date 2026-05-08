import { type ReactNode, useEffect } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  onClear: () => void;
  activeCount: number;
}

export function FilterDrawer({
  open,
  onClose,
  title = "Filters",
  children,
  onClear,
  activeCount,
}: FilterDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          "fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-50 flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border/[0.1]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-brand-muted" />
            <h3 className="text-base font-semibold text-brand-text">{title}</h3>
            {activeCount > 0 && (
              <span className="bg-brand-accent text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-full">
                {activeCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-brand-bg text-brand-muted transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {children}
        </div>

        <div className="px-5 py-4 border-t border-brand-border/[0.1] flex gap-3">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClear}
            disabled={activeCount === 0}
          >
            Clear all
          </Button>
          <Button type="button" className="flex-1" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </>
  );
}
