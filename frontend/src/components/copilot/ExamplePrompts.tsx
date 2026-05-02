import { useAuth } from "@/contexts/AuthContext";

const PROMPTS: Record<string, string[]> = {
  founder: [
    "Summarize my active campaigns",
    "What tasks are overdue on my kanban?",
    "Draft a campaign update",
    "Who are my recent investors?",
  ],
  investor: [
    "Show my investment portfolio",
    "Find campaigns in my preferred industries",
    "What's my total committed amount?",
    "Suggest campaigns to explore",
  ],
  team_member: [
    "What tasks are assigned to me?",
    "Show recent campaign updates",
    "Summarize the kanban board",
    "What's new on my startup?",
  ],
  admin: [
    "Show platform statistics",
    "List recent user signups",
    "Summarize pending approvals",
    "How many active campaigns?",
  ],
};

interface ExamplePromptsProps {
  onSelect: (prompt: string) => void;
}

export function ExamplePrompts({ onSelect }: ExamplePromptsProps) {
  const { profile } = useAuth();
  const prompts = PROMPTS[profile?.role ?? "investor"] ?? PROMPTS.investor;

  return (
    <div className="flex flex-col items-center gap-4 py-6 px-2">
      <p className="text-sm text-brand-muted text-center">
        What can I help you with today?
      </p>
      <div className="grid grid-cols-2 gap-2 w-full">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => onSelect(p)}
            className="text-left text-xs px-3 py-2.5 rounded-xl border border-brand-border/40 bg-brand-bg hover:border-brand-accent/50 hover:bg-brand-accent/5 text-brand-muted hover:text-brand-text transition-all leading-snug"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
