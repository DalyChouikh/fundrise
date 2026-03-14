import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-7xl font-extrabold text-brand-accent mb-4">404</p>
        <h1 className="text-2xl font-bold text-brand-text mb-2">
          Page not found
        </h1>
        <p className="text-sm text-brand-muted mb-8 max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
