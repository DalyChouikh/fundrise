import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";

interface ThinkingBlockProps {
  content: string;
  duration: number | null;
  isStreaming: boolean;
}

export function ThinkingBlock({ content, duration, isStreaming }: ThinkingBlockProps) {
  const [open, setOpen] = useState(isStreaming);

  useEffect(() => {
    if (!isStreaming && duration !== null) setOpen(false);
  }, [isStreaming, duration]);

  if (!content && !isStreaming) return null;

  const label = isStreaming
    ? "Thinking"
    : `Thought for ${duration?.toFixed(1) ?? "?"} seconds`;

  return (
    <div className="mb-1 text-xs text-brand-muted">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 hover:text-brand-text transition-colors"
      >
        <ChevronRight
          className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span>{label}</span>
        {isStreaming && (
          <span className="flex gap-0.5 ml-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-brand-muted animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        )}
      </button>
      {open && content && (
        <div className="mt-1 ml-4 p-2 rounded-lg bg-brand-border/20 text-brand-muted leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
          {content}
        </div>
      )}
    </div>
  );
}
