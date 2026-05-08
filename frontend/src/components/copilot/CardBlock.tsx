import type { CardBlock as CardBlockType, Startup, Campaign } from "@/types";
import { StartupCard } from "@/components/startups/StartupCard";
import { CampaignCard } from "@/components/campaigns/CampaignCard";

interface CardBlockProps {
  block: CardBlockType;
}

export function CardBlock({ block }: CardBlockProps) {
  if (!block.items.length) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
      {block.items.map((item) =>
        block.card_type === "startup" ? (
          <div key={(item as Startup).id} className="w-72 shrink-0">
            <StartupCard startup={item as Startup} />
          </div>
        ) : (
          <div key={(item as Campaign).id} className="w-72 shrink-0">
            <CampaignCard campaign={item as Campaign} />
          </div>
        ),
      )}
    </div>
  );
}
