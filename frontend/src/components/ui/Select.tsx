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
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) {
      setSearch("");
      setFocusedIndex(-1);
      return;
    }
    const idx = filtered.findIndex((o) => o.value === value);
    setFocusedIndex(idx);
    if (searchable) setTimeout(() => searchRef.current?.focus(), 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, searchable]);

  // Only attach click-outside listener while open
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement | HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < filtered.length) {
        onChange(filtered[focusedIndex].value);
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen((o) => !o); }}
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
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-brand-border/30 shadow-lg overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-brand-border/[0.08]">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-bg">
                <Search className="w-3.5 h-3.5 text-brand-muted shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search..."
                  className="bg-transparent outline-none text-sm text-brand-text placeholder:text-brand-muted/60 w-full"
                />
              </div>
            </div>
          )}
          <ul role="listbox" className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-2.5 text-sm text-brand-muted">
                {options.length === 0 ? "No options available" : "No results"}
              </li>
            ) : (
              filtered.map((opt, idx) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={cn(
                    "flex items-center justify-between px-4 py-2 text-sm cursor-pointer transition-colors",
                    opt.value === value
                      ? "bg-brand-accent/[0.06] text-brand-accent font-medium"
                      : idx === focusedIndex
                        ? "bg-brand-bg text-brand-text"
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
