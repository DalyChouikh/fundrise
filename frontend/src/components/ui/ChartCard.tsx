import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

interface ChartCardProps {
  title: string;
  children: ReactNode;
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <Card>
      <h4 className="text-base font-semibold text-brand-text mb-4">{title}</h4>
      <div className="h-64">
        {children}
      </div>
    </Card>
  );
}
