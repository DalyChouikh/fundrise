import { Select, Textarea } from "@/components/ui";

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
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Accreditation Status
        </label>
        <Select
          options={ACCREDITATION_OPTIONS}
          value={data.accreditation_status}
          onChange={(val) => onChange("accreditation_status", val)}
          placeholder="Select status..."
        />
        <p className="text-xs text-brand-muted mt-1.5">
          This is for informational purposes only and is not verified.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Additional Details
        </label>
        <Textarea
          value={data.accreditation_description}
          onChange={(e) =>
            onChange("accreditation_description", e.target.value)
          }
          placeholder="Optionally describe your investment experience..."
          rows={3}
        />
      </div>
    </div>
  );
}
