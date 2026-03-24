interface BadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  active:           { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
  confirmed:        { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Confirmed" },
  completed:        { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Completed" },
  approved:         { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Approved" },
  pending_approval: { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500",   label: "Pending" },
  pending:          { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500",   label: "Pending" },
  draft:            { bg: "bg-gray-100",   text: "text-gray-600",    dot: "bg-gray-400",    label: "Draft" },
  rejected:         { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500",     label: "Rejected" },
  cancelled:        { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500",     label: "Cancelled" },
  suspended:        { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500",     label: "Suspended" },
  founder:          { bg: "bg-brand-accent/[0.08]", text: "text-brand-accent", dot: "bg-brand-accent", label: "Founder" },
  team_member:      { bg: "bg-blue-50",    text: "text-brand-blue",  dot: "bg-brand-blue",  label: "Team Member" },
  investor:         { bg: "bg-violet-50",  text: "text-violet-700",  dot: "bg-violet-500",  label: "Investor" },
  admin:            { bg: "bg-gray-100",   text: "text-gray-800",    dot: "bg-gray-600",    label: "Admin" },
};

export function Badge({ status, className = "" }: BadgeProps) {
  const config = statusConfig[status] ?? {
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold tracking-wide ${config.bg} ${config.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
