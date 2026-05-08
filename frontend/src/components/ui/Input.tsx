import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full px-4 py-2.5 rounded-xl bg-white border text-brand-text placeholder:text-brand-muted/60 text-sm outline-none transition-all shadow-sm",
        error
          ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
          : "border-brand-border/30 focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
