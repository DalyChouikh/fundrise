import { Select } from "@/components/ui";

interface InvestorPreferencesStepProps {
  data: {
    preferred_industries: string[];
    check_size_min: number | null;
    check_size_max: number | null;
    preferred_stage: string;
  };
  onChange: (field: string, value: unknown) => void;
}

const INDUSTRIES = [
  "FinTech",
  "HealthTech",
  "EdTech",
  "E-Commerce",
  "SaaS",
  "AI / ML",
  "CleanTech",
  "BioTech",
  "PropTech",
  "AgriTech",
  "Gaming",
  "Cybersecurity",
  "Social Impact",
  "Other",
];

const CHECK_SIZES = [
  { label: "$1K - $5K", min: 1000, max: 5000 },
  { label: "$5K - $25K", min: 5000, max: 25000 },
  { label: "$25K - $100K", min: 25000, max: 100000 },
  { label: "$100K - $500K", min: 100000, max: 500000 },
  { label: "$500K+", min: 500000, max: null },
];

const STAGES = [
  { value: "pre_seed", label: "Pre-Seed" },
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b_plus", label: "Series B+" },
];

export function InvestorPreferencesStep({
  data,
  onChange,
}: InvestorPreferencesStepProps) {
  const toggleIndustry = (industry: string) => {
    const current = data.preferred_industries;
    if (current.includes(industry)) {
      onChange(
        "preferred_industries",
        current.filter((i) => i !== industry)
      );
    } else {
      onChange("preferred_industries", [...current, industry]);
    }
  };

  const checkSizeValue =
    CHECK_SIZES.find(
      (s) =>
        s.min === data.check_size_min && s.max === data.check_size_max
    )
      ? `${data.check_size_min}-${data.check_size_max}`
      : "";

  const checkSizeOptions = CHECK_SIZES.map((size) => ({
    value: `${size.min}-${size.max}`,
    label: size.label,
  }));

  const stageOptions = STAGES.map((stage) => ({
    value: stage.value,
    label: stage.label,
  }));

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-brand-text mb-2">
          Preferred Industries
        </label>
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map((industry) => (
            <button
              key={industry}
              type="button"
              onClick={() => toggleIndustry(industry)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                data.preferred_industries.includes(industry)
                  ? "bg-brand-accent text-white"
                  : "bg-brand-bg border border-brand-border/60 text-brand-muted hover:border-brand-accent/40"
              }`}
            >
              {industry}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Typical Check Size
        </label>
        <Select
          options={checkSizeOptions}
          value={checkSizeValue}
          onChange={(val) => {
            const size = CHECK_SIZES.find((s) => `${s.min}-${s.max}` === val);
            onChange("check_size_min", size?.min ?? null);
            onChange("check_size_max", size?.max ?? null);
          }}
          placeholder="Select a range..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Preferred Stage
        </label>
        <Select
          options={stageOptions}
          value={data.preferred_stage}
          onChange={(val) => onChange("preferred_stage", val)}
          placeholder="Select a stage..."
        />
      </div>
    </div>
  );
}
