import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface ComboboxProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  error?: boolean;
  className?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Type or select...",
  loading = false,
  error = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options
    .filter((o) => o.toLowerCase().includes(value.toLowerCase()))
    .slice(0, 8);

  const showDropdown = open && (filtered.length > 0 || loading);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={cn(
            "w-full px-4 py-2.5 rounded-xl bg-white border text-brand-text placeholder:text-brand-muted/60 text-sm outline-none transition-all shadow-sm",
            error
              ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
              : "border-brand-border/30 focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10",
            loading && "pr-10"
          )}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted animate-spin" />
        )}
      </div>

      {showDropdown && (
        <ul className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-brand-border/30 shadow-lg overflow-hidden max-h-52 overflow-y-auto py-1">
          {loading ? (
            <li className="px-4 py-2.5 text-sm text-brand-muted">Loading...</li>
          ) : (
            filtered.map((opt) => (
              <li
                key={opt}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt);
                  setOpen(false);
                }}
                className={cn(
                  "px-4 py-2 text-sm cursor-pointer transition-colors",
                  opt === value
                    ? "bg-brand-accent/[0.06] text-brand-accent font-medium"
                    : "text-brand-text hover:bg-brand-bg"
                )}
              >
                {opt}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
