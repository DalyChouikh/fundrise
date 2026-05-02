import { useState } from "react";
import { ChevronRight, Wrench } from "lucide-react";
import type { ToolCallState } from "@/types";

interface ToolCallBlockProps {
  toolCalls: ToolCallState[];
}

function SingleTool({ tc }: { tc: ToolCallState }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-xs text-brand-muted mb-0.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 hover:text-brand-text transition-colors"
      >
        <ChevronRight className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`} />
        <Wrench className="w-3 h-3" />
        <span className="font-mono">{tc.tool_name}</span>
        {!tc.result && (
          <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse ml-1" />
        )}
      </button>
      {open && (
        <div className="mt-1 ml-4 space-y-1">
          <div className="p-2 rounded-lg bg-brand-border/20">
            <p className="font-semibold text-brand-text mb-1">Input</p>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-brand-muted">
              {JSON.stringify(tc.input, null, 2)}
            </pre>
          </div>
          {tc.result !== undefined && (
            <div className="p-2 rounded-lg bg-brand-border/20">
              <p className="font-semibold text-brand-text mb-1">Result</p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-brand-muted max-h-64 overflow-y-auto">
                {typeof tc.result === "string"
                  ? tc.result
                  : JSON.stringify(tc.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ToolCallBlock({ toolCalls }: ToolCallBlockProps) {
  const [groupOpen, setGroupOpen] = useState(false);
  if (toolCalls.length === 0) return null;

  if (toolCalls.length === 1) return <SingleTool tc={toolCalls[0]} />;

  return (
    <div className="text-xs text-brand-muted mb-0.5">
      <button
        onClick={() => setGroupOpen((o) => !o)}
        className="flex items-center gap-1 hover:text-brand-text transition-colors"
      >
        <ChevronRight className={`w-3 h-3 transition-transform ${groupOpen ? "rotate-90" : ""}`} />
        <Wrench className="w-3 h-3" />
        <span>{toolCalls.length} Tools executed</span>
      </button>
      {groupOpen && (
        <div className="ml-4 mt-1 space-y-0.5">
          {toolCalls.map((tc) => <SingleTool key={tc.tool_call_id} tc={tc} />)}
        </div>
      )}
    </div>
  );
}
