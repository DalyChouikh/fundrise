interface InvestorAccreditationStepProps {
  data: {
    accreditation_status: string;
    accreditation_description: string;
  };
  onChange: (field: string, value: unknown) => void;
}

const ACCREDITATION_OPTIONS = [
  { value: "accredited", label: "Accredited Investor" },
  { value: "non_accredited", label: "Non-Accredited Investor" },
  { value: "prefer_not_to_say", label: "Prefer Not to Say" },
];

export function InvestorAccreditationStep({
  data,
  onChange,
}: InvestorAccreditationStepProps) {
  const inputClass =
    "w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Accreditation Status
        </label>
        <select
          value={data.accreditation_status}
          onChange={(e) => onChange("accreditation_status", e.target.value)}
          className={inputClass}
        >
          <option value="">Select status...</option>
          {ACCREDITATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-brand-muted mt-1.5">
          This is for informational purposes only and is not verified.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Additional Details
        </label>
        <textarea
          value={data.accreditation_description}
          onChange={(e) =>
            onChange("accreditation_description", e.target.value)
          }
          placeholder="Optionally describe your investment experience..."
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all resize-none"
        />
      </div>
    </div>
  );
}
