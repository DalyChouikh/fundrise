import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const DateInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="date"
      className={cn(
        "w-full px-4 py-2.5 rounded-xl bg-white border border-brand-border/30 text-brand-text text-sm outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all shadow-sm",
        className
      )}
      {...props}
    />
  )
);
DateInput.displayName = "DateInput";
