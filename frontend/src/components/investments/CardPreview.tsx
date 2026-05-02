import type { CardType } from "@/types";

const CARD_LABELS: Record<CardType, string> = {
  visa: "VISA",
  mastercard: "MC",
  amex: "AMEX",
  discover: "DISC",
};

interface CardPreviewProps {
  cardHolder: string;
  cardLast4: string;
  cardType: CardType;
  expiryMonth: number;
  expiryYear: number;
}

export function CardPreview({ cardHolder, cardLast4, cardType, expiryMonth, expiryYear }: CardPreviewProps) {
  return (
    <div className="relative w-full max-w-sm h-48 rounded-2xl bg-gradient-to-br from-[#242421] to-[#141413] p-6 text-white shadow-xl overflow-hidden select-none">
      <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/[0.04]" />
      <div className="absolute -bottom-8 right-10 w-36 h-36 rounded-full bg-white/[0.04]" />

      {/* Chip */}
      <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500 mb-5" />

      {/* Number */}
      <p className="font-mono text-[17px] tracking-widest text-white/90 mb-5">
        •••• •••• •••• {cardLast4 || "····"}
      </p>

      {/* Bottom row */}
      <div className="flex items-end justify-between">
        <div className="min-w-0">
          <p className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Card Holder</p>
          <p className="text-sm font-medium truncate max-w-[160px]">
            {cardHolder || "Your Name"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Expires</p>
          <p className="text-sm font-medium">
            {String(expiryMonth).padStart(2, "0")}/{String(expiryYear).slice(-2)}
          </p>
        </div>
        <div>
          <p className="text-base font-bold tracking-widest text-white/70">
            {CARD_LABELS[cardType] ?? cardType.toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}
