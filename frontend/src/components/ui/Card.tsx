import type { ReactNode, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  children: ReactNode;
}

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export function Card({
  hover = false,
  padding = "md",
  children,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-brand-border/[0.12] shadow-card ${
        hover
          ? "hover:shadow-card-hover hover:border-brand-border/25 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
          : "transition-shadow duration-200"
      } ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
