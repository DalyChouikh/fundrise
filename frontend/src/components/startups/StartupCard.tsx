import { type CSSProperties } from "react";
import { Building2, MapPin, Users, Heart, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import type { Startup } from "@/types";

interface StartupCardProps {
  startup: Startup;
  hover?: boolean;
  onFollow?: (id: number) => void;
  showAdminActions?: boolean;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  className?: string;
  style?: CSSProperties;
}

export function StartupCard({
  startup,
  hover,
  onFollow,
  showAdminActions,
  onApprove,
  onReject,
  className,
  style,
}: StartupCardProps) {
  return (
    <Card hover={hover} className={`h-full ${className ?? ""}`} style={style}>
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {startup.logo_url ? (
              <img
                src={startup.logo_url}
                alt={startup.name}
                className="w-11 h-11 rounded-xl object-cover"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-brand-accent/[0.08] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-brand-accent" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-brand-text text-sm">{startup.name}</h3>
              <p className="text-xs text-brand-muted">{startup.industry}</p>
            </div>
          </div>
          <Badge status={startup.status} />
        </div>

        <p className="text-sm text-brand-muted line-clamp-2 mb-4 flex-1 leading-relaxed">
          {startup.description}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-brand-border/[0.08]">
          <div className="flex items-center gap-3.5 text-[11px] text-brand-muted">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {startup.location}
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <Users className="w-3.5 h-3.5" />
              {startup.members_count}
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <Heart className="w-3.5 h-3.5" />
              {startup.followers_count}
            </span>
          </div>
          {onFollow && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onFollow(startup.id);
              }}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                startup.is_following
                  ? "text-rose-500 bg-rose-50 hover:bg-rose-100"
                  : "text-brand-muted hover:text-rose-500 hover:bg-rose-50"
              }`}
            >
              <Heart
                className="w-4 h-4"
                fill={startup.is_following ? "currentColor" : "none"}
              />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Avatar
            src={startup.created_by.avatar_url || undefined}
            name={startup.created_by.full_name}
            size="sm"
          />
          <span className="text-[11px] text-brand-muted">{startup.created_by.full_name}</span>
        </div>

        {showAdminActions && startup.status === "pending_approval" && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-brand-border/[0.08]">
            <button
              onClick={(e) => {
                e.preventDefault();
                onApprove?.(startup.id);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                onReject?.(startup.id);
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
