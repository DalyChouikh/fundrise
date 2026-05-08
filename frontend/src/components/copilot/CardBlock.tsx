import type { CardBlock as CardBlockType, Startup, Campaign } from "@/types";
import { StartupCard } from "@/components/startups/StartupCard";
import { CampaignCard } from "@/components/campaigns/CampaignCard";
import { Link } from "react-router-dom";

interface CardBlockProps {
  block: CardBlockType;
}

export function CardBlock({ block }: CardBlockProps) {
  if (!block.items.length) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
      {block.items.map((item) =>
        block.card_type === "startup" ? (
          <Link
            key={(item as Startup).id}
            to={`/startups/${(item as Startup).id}`}
            className="block w-72 shrink-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
            aria-label={`Open ${(item as Startup).name}`}
          >
            <StartupCard startup={item as Startup} hover />
          </Link>
        ) : (
          <Link
            key={(item as Campaign).id}
            to={`/campaigns/${(item as Campaign).id}`}
            className="block w-72 shrink-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
            aria-label={`Open ${(item as Campaign).title}`}
          >
            <CampaignCard campaign={item as Campaign} hover />
          </Link>
        ),
      )}
    </div>
  );
}
