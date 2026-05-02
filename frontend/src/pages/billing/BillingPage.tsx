import { useState, useEffect } from "react";
import { CreditCard, MapPin, Pencil, Trash2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CardPreview } from "@/components/investments/CardPreview";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { SavedPaymentInfo, CardType } from "@/types";

function detectCardType(num: string): CardType {
  const n = num.replace(/\D/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^6/.test(n)) return "discover";
  return "visa";
}

function parseExpiry(val: string): [number, number] {
  const parts = val.replace(/\s/g, "").split("/");
  const month = parseInt(parts[0] ?? "0", 10);
  const yearShort = parseInt(parts[1] ?? "0", 10);
  return [month, yearShort < 100 ? 2000 + yearShort : yearShort];
}

export function BillingPage() {
  const [info, setInfo] = useState<SavedPaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Form fields
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardFocused, setCardFocused] = useState(false);
  const [expiryInput, setExpiryInput] = useState("");
  const [cvv, setCvv] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    api.get<SavedPaymentInfo>("/users/me/payment-profile/")
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, []);

  const openEdit = () => {
    if (info) {
      setCardHolder(info.card_holder);
      setCardNumber("");
      setExpiryInput(`${String(info.expiry_month).padStart(2, "0")}/${String(info.expiry_year).slice(-2)}`);
      setCvv("");
      setAddressLine1(info.address_line1);
      setAddressLine2(info.address_line2);
      setCity(info.city);
      setStateVal(info.state);
      setPostalCode(info.postal_code);
      setCountry(info.country);
    }
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const last4 = cardNumber ? cardNumber.replace(/\D/g, "").slice(-4) : info?.card_last4 ?? "";
      const cardType = cardNumber ? detectCardType(cardNumber) : info?.card_type ?? "visa";
      const [month, year] = parseExpiry(expiryInput);
      const saved = await api.put<SavedPaymentInfo>("/users/me/payment-profile/", {
        card_holder: cardHolder,
        card_last4: last4,
        card_type: cardType,
        expiry_month: month,
        expiry_year: year,
        address_line1: addressLine1,
        address_line2: addressLine2,
        city,
        state: stateVal,
        postal_code: postalCode,
        country,
      });
      setInfo(saved);
      setEditing(false);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await api.delete("/users/me/payment-profile/");
      setInfo(null);
      setEditing(false);
    } catch {
      // ignore
    } finally {
      setRemoving(false);
    }
  };

  const inputCls = "w-full border border-brand-border/[0.2] rounded-xl px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-accent transition-colors bg-white";

  const previewLast4 = editing
    ? (cardNumber ? cardNumber.replace(/\D/g, "").slice(-4) : info?.card_last4 ?? "")
    : (info?.card_last4 ?? "");
  const previewType: CardType = editing
    ? (cardNumber ? detectCardType(cardNumber) : info?.card_type ?? "visa")
    : (info?.card_type ?? "visa");
  const [previewMonth, previewYear] = editing
    ? (expiryInput ? parseExpiry(expiryInput) : [info?.expiry_month ?? 1, info?.expiry_year ?? new Date().getFullYear()])
    : [info?.expiry_month ?? 1, info?.expiry_year ?? new Date().getFullYear()];

  if (loading) return <LoadingSpinner fullscreen />;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Payment & Billing</h1>
        <p className="text-brand-muted mt-1 text-sm">
          Manage your saved payment method and billing address.
        </p>
      </div>

      {/* Card Preview */}
      {(info || editing) && (
        <div className="flex justify-start">
          <CardPreview
            cardHolder={editing ? cardHolder : info!.card_holder}
            cardLast4={previewLast4}
            cardType={previewType}
            expiryMonth={previewMonth}
            expiryYear={previewYear}
          />
        </div>
      )}

      {/* Payment Method */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-brand-muted" />
            <h2 className="text-sm font-semibold text-brand-text">Payment Method</h2>
          </div>
          {info && !editing && (
            <div className="flex items-center gap-2">
              <button onClick={openEdit} className="p-1.5 rounded-lg hover:bg-brand-bg transition-colors cursor-pointer">
                <Pencil className="w-4 h-4 text-brand-muted" />
              </button>
              <button onClick={handleRemove} disabled={removing} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          )}
        </div>

        {!info && !editing ? (
          <div className="text-center py-6">
            <p className="text-sm text-brand-muted mb-3">No payment method saved</p>
            <Button onClick={() => { setEditing(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> Add Payment Method
            </Button>
          </div>
        ) : editing ? (
          <div className="space-y-2.5">
            <input placeholder="Cardholder Name" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} className={inputCls} />
            <input
              placeholder={info ? `Card ending in ${info.card_last4} (leave blank to keep)` : "Card Number"}
              value={cardFocused ? cardNumber : cardNumber.replace(/\D/g, "").length >= 4 ? `•••• •••• •••• ${cardNumber.replace(/\D/g, "").slice(-4)}` : cardNumber}
              onFocus={() => setCardFocused(true)}
              onBlur={() => setCardFocused(false)}
              onChange={(e) => setCardNumber(e.target.value)}
              maxLength={19}
              inputMode="numeric"
              className={inputCls}
            />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="MM/YY" value={expiryInput} onChange={(e) => setExpiryInput(e.target.value)} maxLength={5} className={inputCls} />
              <input placeholder="CVV" value={cvv} onChange={(e) => setCvv(e.target.value)} maxLength={4} inputMode="numeric" className={inputCls} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <span className="font-mono text-brand-text">•••• •••• •••• {info!.card_last4}</span>
            <span className="text-brand-muted uppercase text-xs">{info!.card_type}</span>
            <span className="text-brand-muted text-xs">
              {String(info!.expiry_month).padStart(2, "0")}/{String(info!.expiry_year).slice(-2)}
            </span>
          </div>
        )}
      </Card>

      {/* Billing Address */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-brand-muted" />
          <h2 className="text-sm font-semibold text-brand-text">Billing Address</h2>
        </div>

        {!info && !editing ? (
          <p className="text-sm text-brand-muted text-center py-4">
            Add a payment method to save your billing address.
          </p>
        ) : editing ? (
          <div className="space-y-2.5">
            <input placeholder="Address Line 1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className={inputCls} />
            <input placeholder="Address Line 2 (optional)" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
              <input placeholder="State / Province" value={stateVal} onChange={(e) => setStateVal(e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Postal Code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={inputCls} />
              <input placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} />
            </div>
          </div>
        ) : (
          <address className="not-italic text-sm text-brand-text leading-relaxed">
            <p>{info!.address_line1}</p>
            {info!.address_line2 && <p>{info!.address_line2}</p>}
            <p>{info!.city}, {info!.state} {info!.postal_code}</p>
            <p>{info!.country}</p>
          </address>
        )}
      </Card>

      {/* Save / Cancel */}
      {editing && (
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Saving..." : "Save"}
          </Button>
          <button
            onClick={() => setEditing(false)}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-brand-muted border border-brand-border/[0.2] hover:bg-brand-bg transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
