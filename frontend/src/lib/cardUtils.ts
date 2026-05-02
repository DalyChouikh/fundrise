import type { CardType } from "@/types";

/** Auto-detect card type from number prefix */
export function detectCardType(num: string): CardType {
  const n = num.replace(/\D/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^6/.test(n)) return "discover";
  return "visa";
}

/** Format a raw card number string into groups: 4-4-4-4 (or 4-6-5 for Amex) */
export function formatCardNumber(raw: string, cardType: CardType = "visa"): string {
  const digits = raw.replace(/\D/g, "");
  if (cardType === "amex") {
    // Amex: 4-6-5 = 15 digits
    const p1 = digits.slice(0, 4);
    const p2 = digits.slice(4, 10);
    const p3 = digits.slice(10, 15);
    return [p1, p2, p3].filter(Boolean).join(" ");
  }
  // Standard: 4-4-4-4 = 16 digits
  const groups = [];
  for (let i = 0; i < digits.length && i < 16; i += 4) {
    groups.push(digits.slice(i, i + 4));
  }
  return groups.join(" ");
}

/** Max raw digits allowed per card type */
export function maxCardDigits(cardType: CardType): number {
  return cardType === "amex" ? 15 : 16;
}

/** Format expiry input: auto-insert '/' after 2 digits, max MM/YY */
export function formatExpiry(raw: string, prev: string): string {
  // Strip non-digits
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 2) {
    // If user just deleted the '/' (i.e., went from "12/" to "12"), keep as digits
    if (prev.endsWith("/") && raw.length < prev.length) {
      return digits.slice(0, 1); // deleted past the slash → remove last digit too
    }
    return digits.length === 2 ? digits + "/" : digits;
  }
  return digits.slice(0, 2) + "/" + digits.slice(2, 4);
}

/** Parse MM/YY or MM/YYYY into [month, year] */
export function parseExpiry(val: string): [number, number] {
  const parts = val.replace(/\s/g, "").split("/");
  const month = parseInt(parts[0] ?? "0", 10);
  const yearShort = parseInt(parts[1] ?? "0", 10);
  const year = yearShort < 100 ? 2000 + yearShort : yearShort;
  return [month, year];
}
