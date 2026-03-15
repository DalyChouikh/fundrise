interface BadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Active" },
  confirmed: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Confirmed" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Completed" },
  pending_approval: { bg: "bg-amber-50", text: "text-amber-700", label: "Pending Approval" },
  pending: { bg: "bg-amber-50", text: "text-amber-700", label: "Pending" },
  draft: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  rejected: { bg: "bg-red-50", text: "text-red-700", label: "Rejected" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", label: "Cancelled" },
  suspended: { bg: "bg-red-50", text: "text-red-700", label: "Suspended" },
  founder: { bg: "bg-brand-accent/10", text: "text-brand-accent", label: "Founder" },
  team_member: { bg: "bg-blue-50", text: "text-brand-blue", label: "Team Member" },
  investor: { bg: "bg-violet-50", text: "text-violet-700", label: "Investor" },
  admin: { bg: "bg-gray-900/5", text: "text-gray-800", label: "Admin" },
};

export function Badge({ status, className = "" }: BadgeProps) {
  const config = statusConfig[status] ?? {
    bg: "bg-gray-100",
    text: "text-gray-600",
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${config.bg} ${config.text} ${className}`}
    >
      {config.label}
    </span>
  );
}
