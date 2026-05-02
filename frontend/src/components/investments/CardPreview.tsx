import type { CardType } from "@/types";

// Inline SVG logos for each card brand
function VisaLogo() {
  return (
    <svg viewBox="0 0 60 20" className="h-5 w-auto" fill="none">
      <text
        x="0"
        y="17"
        fontSize="18"
        fontWeight="800"
        fontFamily="Arial, sans-serif"
        letterSpacing="-1"
        fill="white"
      >
        VISA
      </text>
    </svg>
  );
}

function MastercardLogo() {
  return (
    <svg viewBox="0 0 48 30" className="h-7 w-auto">
      <circle cx="16" cy="15" r="14" fill="#EB001B" />
      <circle cx="32" cy="15" r="14" fill="#F79E1B" />
      <path
        d="M24 4.5a14 14 0 0 1 0 21 14 14 0 0 1 0-21z"
        fill="#FF5F00"
      />
    </svg>
  );
}

function AmexLogo() {
  return (
    <svg viewBox="0 0 60 20" className="h-5 w-auto" fill="none">
      <text
        x="0"
        y="17"
        fontSize="14"
        fontWeight="800"
        fontFamily="Arial, sans-serif"
        letterSpacing="0.5"
        fill="white"
      >
        AMEX
      </text>
    </svg>
  );
}

function DiscoverLogo() {
  return (
    <svg viewBox="0 0 80 20" className="h-5 w-auto" fill="none">
      <text
        x="0"
        y="16"
        fontSize="13"
        fontWeight="800"
        fontFamily="Arial, sans-serif"
        letterSpacing="0.3"
        fill="#F76F20"
      >
        DISCOVER
      </text>
    </svg>
  );
}

const CARD_LOGOS: Record<CardType, React.FC> = {
  visa: VisaLogo,
  mastercard: MastercardLogo,
  amex: AmexLogo,
  discover: DiscoverLogo,
};

interface CardPreviewProps {
  cardHolder: string;
  cardLast4: string;
  cardType: CardType;
  expiryMonth: number;
  expiryYear: number;
}

export function CardPreview({ cardHolder, cardLast4, cardType, expiryMonth, expiryYear }: CardPreviewProps) {
  const Logo = CARD_LOGOS[cardType] ?? VisaLogo;

  // Amex shows 4-6-5 mask pattern
  const maskedNumber =
    cardType === "amex"
      ? `•••• •••••• ${cardLast4 ? "•" + cardLast4 : "·····"}`
      : `•••• •••• •••• ${cardLast4 || "····"}`;

  return (
    <div className="relative w-full max-w-sm h-48 rounded-2xl bg-gradient-to-br from-[#2a2926] to-[#141413] p-6 text-white shadow-xl overflow-hidden select-none">
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/[0.04]" />
      <div className="absolute -bottom-8 right-10 w-36 h-36 rounded-full bg-white/[0.04]" />

      {/* Top row: chip + logo */}
      <div className="flex items-start justify-between mb-5">
        {/* Chip */}
        <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500" />
        {/* Card brand logo */}
        <div className="flex items-center">
          <Logo />
        </div>
      </div>

      {/* Number */}
      <p className="font-mono text-[17px] tracking-widest text-white/90 mb-5">
        {maskedNumber}
      </p>

      {/* Bottom row */}
      <div className="flex items-end justify-between">
        <div className="min-w-0">
          <p className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Card Holder</p>
          <p className="text-sm font-medium truncate max-w-[180px]">
            {cardHolder || "Your Name"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-white/40 uppercase tracking-wider mb-0.5">Expires</p>
          <p className="text-sm font-medium tabular-nums">
            {String(expiryMonth).padStart(2, "0")}/{String(expiryYear).slice(-2)}
          </p>
        </div>
      </div>
    </div>
  );
}
