import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface AlertProps {
  variant: "error" | "warning" | "info" | "success";
  children: ReactNode;
  className?: string;
}

const VARIANTS = {
  error:   { cls: "bg-red-50 border-red-100 text-red-700",            Icon: AlertCircle },
  warning: { cls: "bg-amber-50 border-amber-100 text-amber-700",      Icon: AlertTriangle },
  info:    { cls: "bg-blue-50 border-blue-100 text-blue-700",         Icon: Info },
  success: { cls: "bg-emerald-50 border-emerald-100 text-emerald-700", Icon: CheckCircle },
};

export function Alert({ variant, children, className }: AlertProps) {
  const { cls, Icon } = VARIANTS[variant];
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm flex items-start gap-2", cls, className)}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
