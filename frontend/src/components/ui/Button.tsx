import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

const variantStyles = {
  primary:
    "bg-brand-accent text-white hover:bg-brand-accent/90 active:bg-brand-accent/80 shadow-sm hover:shadow-md",
  secondary:
    "bg-white text-brand-text border border-brand-border/40 hover:border-brand-border/60 hover:bg-brand-bg/80 shadow-sm",
  ghost:
    "text-brand-muted hover:text-brand-text hover:bg-black/[0.03] active:bg-black/[0.05]",
  danger:
    "bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 shadow-sm",
};

const sizeStyles = {
  sm: "px-3.5 py-1.5 text-[13px] rounded-lg gap-1.5",
  md: "px-4 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-6 py-3 text-[15px] rounded-xl gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-semibold transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
