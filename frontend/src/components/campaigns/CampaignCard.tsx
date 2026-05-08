import { type CSSProperties } from "react";
import { Building2, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Campaign } from "@/types";

interface CampaignCardProps {
  campaign: Campaign;
  hover?: boolean;
  showAdminActions?: boolean;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  className?: string;
  style?: CSSProperties;
}

export function CampaignCard({
  campaign,
  hover,
  showAdminActions,
  onApprove,
  onReject,
  className,
  style,
}: CampaignCardProps) {
  return (
    <Card hover={hover} className={`h-full ${className ?? ""}`} style={style}>
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {campaign.startup_logo_url ? (
              <img
                src={campaign.startup_logo_url}
                alt={campaign.startup_name}
                className="w-10 h-10 rounded-xl object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-brand-accent/[0.08] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-brand-accent" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-brand-text text-sm">{campaign.title}</h3>
              <p className="text-xs text-brand-muted mt-0.5">{campaign.startup_name}</p>
            </div>
          </div>
          <Badge status={campaign.status} />
        </div>

        <p className="text-sm text-brand-muted line-clamp-2 mb-4 flex-1 leading-relaxed">
          {campaign.description}
        </p>

        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] text-brand-muted mb-1.5 tabular-nums">
            <span className="font-semibold text-brand-text">
              ${Number(campaign.current_funding).toLocaleString()}
            </span>
            <span>of ${Number(campaign.funding_goal).toLocaleString()}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-brand-bg overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-accent to-brand-accent/70 transition-all"
              style={{ width: `${Math.min(campaign.funding_percentage, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[11px] font-semibold text-brand-accent tabular-nums">
              {campaign.funding_percentage}% funded
            </span>
            <span className="text-[11px] text-brand-muted tabular-nums">
              {campaign.equity_offered}% equity
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-brand-muted pt-3 border-t border-brand-border/[0.08] tabular-nums">
          <Calendar className="w-3.5 h-3.5" />
          Deadline: {new Date(campaign.deadline).toLocaleDateString()}
        </div>

        {showAdminActions && campaign.status === "pending_approval" && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-brand-border/[0.08]">
            <button
              onClick={(e) => {
                e.preventDefault();
                onApprove?.(campaign.id);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                onReject?.(campaign.id);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
