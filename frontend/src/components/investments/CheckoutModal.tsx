import { useState, useEffect } from "react";
import { X, ArrowLeft, ChevronRight, CreditCard, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { CardPreview } from "@/components/investments/CardPreview";
import type { CampaignDetail, SavedPaymentInfo, CardType } from "@/types";

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
  const year = yearShort < 100 ? 2000 + yearShort : yearShort;
  return [month, year];
}

interface CheckoutModalProps {
  campaign: CampaignDetail;
  onClose: () => void;
  onSuccess: (updatedCampaign: CampaignDetail) => void;
}

export function CheckoutModal({ campaign, onClose, onSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [savedInfo, setSavedInfo] = useState<SavedPaymentInfo | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [confirmClose, setConfirmClose] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [amount, setAmount] = useState("");

  // Step 2 — card
  const [useSavedCard, setUseSavedCard] = useState(false);
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardFocused, setCardFocused] = useState(false);
  const [expiryInput, setExpiryInput] = useState("");
  const [cvv, setCvv] = useState("");
  const [saveCard, setSaveCard] = useState(true);

  // Step 2 — address
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    api.get<SavedPaymentInfo>("/users/me/payment-profile/")
      .then((info) => {
        setSavedInfo(info);
        setUseSavedCard(true);
        setUseSavedAddress(true);
        setSaveCard(false);
      })
      .catch(() => setSavedInfo(null))
      .finally(() => setLoadingSaved(false));
  }, []);

  const activeCardLast4 = useSavedCard
    ? (savedInfo?.card_last4 ?? "")
    : cardNumber.replace(/\D/g, "").slice(-4);

  const activeCardHolder = useSavedCard ? (savedInfo?.card_holder ?? "") : cardHolder;
  const activeCardType: CardType = useSavedCard
    ? (savedInfo?.card_type ?? "visa")
    : detectCardType(cardNumber);
  const [activeMonth, activeYear] = useSavedCard
    ? [savedInfo?.expiry_month ?? 1, savedInfo?.expiry_year ?? new Date().getFullYear()]
    : parseExpiry(expiryInput);

  const fundingPct = Math.min(
    100,
    Math.round((Number(campaign.current_funding) / Number(campaign.funding_goal)) * 100)
  );

  const handleClose = () => {
    if (step > 1) { setConfirmClose(true); return; }
    onClose();
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await api.post("/investments/", {
        campaign: campaign.id,
        amount,
        card_last4: activeCardLast4 || null,
        card_type: activeCardType || null,
      });
      if (saveCard && !useSavedCard && cardHolder && activeCardLast4) {
        const [m, y] = parseExpiry(expiryInput);
        await api.put("/users/me/payment-profile/", {
          card_holder: cardHolder,
          card_last4: activeCardLast4,
          card_type: activeCardType,
          expiry_month: m,
          expiry_year: y,
          address_line1: addressLine1,
          address_line2: addressLine2,
          city,
          state: stateVal,
          postal_code: postalCode,
          country,
        });
      }
      const updated = await api.get<CampaignDetail>(`/campaigns/${campaign.id}/`);
      onSuccess(updated);
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full border border-brand-border/[0.2] rounded-xl px-3 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-accent transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-[#FAF9F5] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border/[0.12]">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="p-1.5 rounded-lg hover:bg-brand-bg transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-brand-muted" />
              </button>
            )}
            <div>
              <p className="text-[11px] text-brand-muted">
                Step {step} of 3
              </p>
              <h2 className="text-base font-bold text-brand-text">
                {step === 1 ? "Investment Amount" : step === 2 ? "Payment Details" : "Review & Confirm"}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Step dots */}
            <div className="flex gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    s === step ? "bg-brand-accent" : s < step ? "bg-brand-accent/40" : "bg-brand-border/40"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-brand-bg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-brand-muted" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* ── STEP 1: AMOUNT ── */}
          {step === 1 && (
            <>
              {/* Campaign card */}
              <div className="bg-white rounded-xl border border-brand-border/[0.12] p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-brand-muted font-medium">{campaign.startup_name}</p>
                    <h3 className="text-sm font-bold text-brand-text mt-0.5">{campaign.title}</h3>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-brand-muted">Equity</p>
                    <p className="text-sm font-semibold text-brand-text">{campaign.equity_offered}%</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-brand-muted mb-1.5">
                    <span>${Number(campaign.current_funding).toLocaleString()} raised</span>
                    <span>Goal: ${Number(campaign.funding_goal).toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-brand-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-accent rounded-full transition-all"
                      style={{ width: `${fundingPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-2">
                  Investment Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted text-sm font-medium">$</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`${inputCls} pl-7`}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!amount || Number(amount) <= 0}
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}

          {/* ── STEP 2: PAYMENT ── */}
          {step === 2 && (
            <>
              {loadingSaved ? (
                <div className="h-20 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Card section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-brand-muted" />
                      <p className="text-sm font-semibold text-brand-text">Payment Method</p>
                    </div>

                    {/* Card preview */}
                    <div className="flex justify-center">
                      <CardPreview
                        cardHolder={activeCardHolder}
                        cardLast4={activeCardLast4}
                        cardType={activeCardType}
                        expiryMonth={activeMonth}
                        expiryYear={activeYear}
                      />
                    </div>

                    {savedInfo && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="useSavedCard"
                          checked={useSavedCard}
                          onChange={(e) => setUseSavedCard(e.target.checked)}
                          className="accent-brand-accent"
                        />
                        <label htmlFor="useSavedCard" className="text-sm text-brand-text cursor-pointer">
                          Use saved card ending in {savedInfo.card_last4}
                        </label>
                      </div>
                    )}

                    {!useSavedCard && (
                      <div className="space-y-2.5">
                        <input placeholder="Cardholder Name" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} className={inputCls} />
                        <input
                          placeholder="Card Number"
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
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} className="accent-brand-accent" />
                          <span className="text-sm text-brand-text">Save this card to my profile</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Address section */}
                  <div className="space-y-3 border-t border-brand-border/[0.12] pt-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand-muted" />
                      <p className="text-sm font-semibold text-brand-text">Billing Address</p>
                    </div>

                    {savedInfo && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="useSavedAddr"
                          checked={useSavedAddress}
                          onChange={(e) => setUseSavedAddress(e.target.checked)}
                          className="accent-brand-accent"
                        />
                        <label htmlFor="useSavedAddr" className="text-sm text-brand-text cursor-pointer">
                          Use saved address ({savedInfo.city}, {savedInfo.country})
                        </label>
                      </div>
                    )}

                    {!useSavedAddress && (
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
                    )}
                  </div>

                  <Button className="w-full" onClick={() => setStep(3)}>
                    Review Pledge <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </>
              )}
            </>
          )}

          {/* ── STEP 3: REVIEW ── */}
          {step === 3 && (
            <>
              <div className="flex justify-center">
                <CardPreview
                  cardHolder={activeCardHolder}
                  cardLast4={activeCardLast4}
                  cardType={activeCardType}
                  expiryMonth={activeMonth}
                  expiryYear={activeYear}
                />
              </div>

              <div className="bg-white rounded-xl border border-brand-border/[0.12] p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-brand-muted">Campaign</span>
                  <span className="font-medium text-brand-text">{campaign.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-brand-muted">Pledge Amount</span>
                  <span className="font-bold text-brand-text">${Number(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-brand-muted">Card</span>
                  <span className="font-medium text-brand-text">
                    {activeCardType.toUpperCase()} ···· {activeCardLast4}
                  </span>
                </div>
                {(useSavedAddress ? savedInfo : null) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-muted">Address</span>
                    <span className="font-medium text-brand-text text-right">
                      {savedInfo!.city}, {savedInfo!.country}
                    </span>
                  </div>
                )}
                {!useSavedAddress && city && (
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-muted">Address</span>
                    <span className="font-medium text-brand-text">{city}, {country}</span>
                  </div>
                )}
              </div>

              {/* Disclaimer */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-800 leading-relaxed">
                  This is a pledge — your card will not be charged. The startup founder will review and confirm your investment.
                </p>
              </div>

              <Button
                className="w-full bg-brand-accent hover:bg-brand-accent/90"
                onClick={handleConfirm}
                disabled={submitting}
              >
                {submitting ? "Confirming..." : "Confirm Pledge"}
              </Button>
            </>
          )}
        </div>

        {/* Close confirm dialog */}
        {confirmClose && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-4 p-8">
            <p className="text-sm font-medium text-brand-text text-center">
              Are you sure? Your progress will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmClose(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-brand-muted border border-brand-border/[0.2] hover:bg-brand-bg transition-colors cursor-pointer"
              >
                Keep going
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors cursor-pointer"
              >
                Yes, close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
