import { useState, useEffect } from "react";
import { ArrowLeft, ChevronRight, CreditCard, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { Modal, Input, Alert, ConfirmDialog } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { CardPreview } from "@/components/investments/CardPreview";
import { PasskeyConfirmDialog } from "@/components/passkey/PasskeyConfirmDialog";
import { usePasskeyStepUp } from "@/hooks/usePasskeyStepUp";
import { formatCardNumber, formatExpiry, parseExpiry, maxCardDigits } from "@/lib/cardUtils";
import type { CampaignDetail, SavedPaymentInfo, CardType } from "@/types";

const CARD_TYPES: { value: CardType; label: string }[] = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "amex", label: "Amex" },
  { value: "discover", label: "Discover" },
];

interface CheckoutModalProps {
  campaign: CampaignDetail;
  onClose: () => void;
  onSuccess: (updatedCampaign: CampaignDetail) => void;
}

export function CheckoutModal({ campaign, onClose, onSuccess }: CheckoutModalProps) {
  const { requireStepUp, dialogProps } = usePasskeyStepUp();
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
  const [cardNumberFormatted, setCardNumberFormatted] = useState("");
  const [cardType, setCardType] = useState<CardType>("visa");
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

  // When card type changes, reformat the number
  const handleCardTypeChange = (type: CardType) => {
    setCardType(type);
    const digits = cardNumberFormatted.replace(/\D/g, "");
    setCardNumberFormatted(formatCardNumber(digits, type));
  };

  // Handle card number input with auto-formatting
  const handleCardNumberChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const max = maxCardDigits(cardType);
    const clamped = digits.slice(0, max);
    setCardNumberFormatted(formatCardNumber(clamped, cardType));
  };

  // Handle expiry with auto-slash
  const handleExpiryChange = (raw: string) => {
    setExpiryInput((prev) => formatExpiry(raw, prev));
  };

  const cardLast4 = cardNumberFormatted.replace(/\D/g, "").slice(-4);

  const activeCardLast4 = useSavedCard ? (savedInfo?.card_last4 ?? "") : cardLast4;
  const activeCardHolder = useSavedCard ? (savedInfo?.card_holder ?? "") : cardHolder;
  const activeCardType: CardType = useSavedCard ? (savedInfo?.card_type ?? "visa") : cardType;
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

  const stepTitle = step === 1 ? "Investment Amount" : step === 2 ? "Payment Details" : "Review & Confirm";

  const handleConfirm = async () => {
    let stepUpToken: string | undefined;
    try {
      const result = await requireStepUp(
        "Confirm Pledge",
        "Verify with your passkey before placing this investment."
      );
      stepUpToken = result ?? undefined;
    } catch {
      return; // step-up cancelled
    }

    setSubmitting(true);
    try {
      await api.post("/investments/", {
        campaign: campaign.id,
        amount,
        card_last4: activeCardLast4 || null,
        card_type: activeCardType || null,
      }, { stepUpToken });
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

  return (
    <Modal open={!confirmClose} onClose={handleClose} title={stepTitle} maxWidth="lg">
      {/* Step navigation sub-row */}
      <div className="flex items-center justify-between mb-5 -mt-1">
        <div className="flex items-center gap-2">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              className="p-1.5 rounded-lg hover:bg-brand-bg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-brand-muted" />
            </button>
          )}
          <p className="text-[11px] text-brand-muted">Step {step} of 3</p>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                s === step ? "bg-brand-accent w-4" : s < step ? "bg-brand-accent/40" : "bg-brand-border/40"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {/* ── STEP 1: AMOUNT ── */}
        {step === 1 && (
          <>
            <div className="bg-white rounded-xl border border-[#E8E6E0] p-4 space-y-3">
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

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-2">
                Investment Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted text-sm font-medium z-10">$</span>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7"
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
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-brand-muted" />
                    <p className="text-sm font-semibold text-brand-text">Payment Method</p>
                  </div>

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
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        id="useSavedCard"
                        checked={useSavedCard}
                        onChange={(e) => setUseSavedCard(e.target.checked)}
                        className="accent-brand-accent"
                      />
                      <span className="text-sm text-brand-text">
                        Use saved card ending in {savedInfo.card_last4}
                      </span>
                    </label>
                  )}

                  {!useSavedCard && (
                    <div className="space-y-3">
                      {/* Card type selector */}
                      <div>
                        <label className="block text-xs font-medium text-brand-muted mb-2">Card Type</label>
                        <div className="grid grid-cols-4 gap-2">
                          {CARD_TYPES.map((ct) => (
                            <button
                              key={ct.value}
                              type="button"
                              onClick={() => handleCardTypeChange(ct.value)}
                              className={`py-2 px-1 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                                cardType === ct.value
                                  ? "border-brand-accent bg-brand-accent/[0.06] text-brand-accent"
                                  : "border-[#E8E6E0] bg-white text-brand-muted hover:border-brand-accent/40"
                              }`}
                            >
                              {ct.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Input
                        placeholder="Cardholder Name"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                      />

                      {/* Card number with auto-formatting */}
                      <div>
                        <label className="block text-xs font-medium text-brand-muted mb-1.5">Card Number</label>
                        <Input
                          placeholder={cardType === "amex" ? "•••• •••••• •••••" : "•••• •••• •••• ••••"}
                          value={cardNumberFormatted}
                          onChange={(e) => handleCardNumberChange(e.target.value)}
                          inputMode="numeric"
                          className="font-mono tracking-widest"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Expiry with auto-slash */}
                        <div>
                          <label className="block text-xs font-medium text-brand-muted mb-1.5">Expiry</label>
                          <Input
                            placeholder="MM/YY"
                            value={expiryInput}
                            onChange={(e) => handleExpiryChange(e.target.value)}
                            maxLength={5}
                            inputMode="numeric"
                            className="font-mono tracking-wider"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-brand-muted mb-1.5">CVV</label>
                          <Input
                            placeholder={cardType === "amex" ? "••••" : "•••"}
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, cardType === "amex" ? 4 : 3))}
                            maxLength={cardType === "amex" ? 4 : 3}
                            inputMode="numeric"
                            className="font-mono tracking-wider"
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveCard}
                          onChange={(e) => setSaveCard(e.target.checked)}
                          className="accent-brand-accent"
                        />
                        <span className="text-sm text-brand-text">Save this card to my profile</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Address section */}
                <div className="space-y-3 border-t border-[#E8E6E0] pt-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand-muted" />
                    <p className="text-sm font-semibold text-brand-text">Billing Address</p>
                  </div>

                  {savedInfo && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        id="useSavedAddr"
                        checked={useSavedAddress}
                        onChange={(e) => setUseSavedAddress(e.target.checked)}
                        className="accent-brand-accent"
                      />
                      <span className="text-sm text-brand-text">
                        Use saved address ({savedInfo.city}, {savedInfo.country})
                      </span>
                    </label>
                  )}

                  {!useSavedAddress && (
                    <div className="space-y-2.5">
                      <Input placeholder="Address Line 1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
                      <Input placeholder="Address Line 2 (optional)" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                        <Input placeholder="State / Province" value={stateVal} onChange={(e) => setStateVal(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Postal Code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                        <Input placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
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

            <div className="bg-white rounded-xl border border-[#E8E6E0] p-4 space-y-3">
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
                <span className="font-medium text-brand-text font-mono">
                  {activeCardType.toUpperCase()} ···· {activeCardLast4}
                </span>
              </div>
              {useSavedAddress && savedInfo && (
                <div className="flex justify-between text-sm">
                  <span className="text-brand-muted">Address</span>
                  <span className="font-medium text-brand-text text-right">
                    {savedInfo.city}, {savedInfo.country}
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

            <Alert variant="warning">
              This is a pledge — your card will not be charged. The startup founder will review and confirm your investment.
            </Alert>

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

      {dialogProps && <PasskeyConfirmDialog {...dialogProps} />}

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Close checkout?"
        message="Are you sure? Your progress will be lost."
        confirmLabel="Yes, close"
        cancelLabel="Keep going"
        onConfirm={onClose}
        onCancel={() => setConfirmClose(false)}
        danger={true}
      />
    </Modal>
  );
}
