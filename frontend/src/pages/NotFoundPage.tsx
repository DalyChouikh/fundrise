import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
      <div className="text-center animate-fade-in">
        <div className="relative inline-block mb-6">
          <p className="text-[120px] font-extrabold text-brand-accent/10 leading-none select-none">404</p>
          <p className="absolute inset-0 flex items-center justify-center text-5xl font-extrabold text-brand-accent">404</p>
        </div>
        <h1 className="text-2xl font-bold text-brand-text mb-2">
          Page not found
        </h1>
        <p className="text-sm text-brand-muted mb-8 max-w-sm mx-auto leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/dashboard">
          <Button size="lg">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
