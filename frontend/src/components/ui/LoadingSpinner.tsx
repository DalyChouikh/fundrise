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
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
          <p className="text-sm text-brand-muted">Loading...</p>
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
