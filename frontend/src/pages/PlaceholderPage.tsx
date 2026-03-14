import { Construction } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({
  title,
  description = "This feature is under development and will be available soon.",
}: PlaceholderPageProps) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">{title}</h1>
      </div>

      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-bg flex items-center justify-center mb-5">
            <Construction className="w-7 h-7 text-brand-muted" />
          </div>
          <h2 className="text-lg font-semibold text-brand-text mb-2">
            Coming Soon
          </h2>
          <p className="text-sm text-brand-muted max-w-md">{description}</p>
        </div>
      </Card>
    </div>
  );
}
