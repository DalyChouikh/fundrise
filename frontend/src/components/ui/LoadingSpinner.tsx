import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  fullscreen?: boolean;
  className?: string;
}

export function LoadingSpinner({
  fullscreen = false,
  className = "",
}: LoadingSpinnerProps) {
  if (fullscreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-[3px] border-brand-border/20" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-brand-accent border-t-transparent animate-spin" />
          </div>
          <p className="text-sm font-medium text-brand-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Loader2
      className={`w-5 h-5 animate-spin text-brand-accent ${className}`}
    />
  );
}
