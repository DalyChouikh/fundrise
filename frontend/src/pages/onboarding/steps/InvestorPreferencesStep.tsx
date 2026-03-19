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

  const selectClass =
    "w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all";

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
        <select
          value={
            CHECK_SIZES.find(
              (s) =>
                s.min === data.check_size_min && s.max === data.check_size_max
            )
              ? `${data.check_size_min}-${data.check_size_max}`
              : ""
          }
          onChange={(e) => {
            const size = CHECK_SIZES.find(
              (s) => `${s.min}-${s.max}` === e.target.value
            );
            onChange("check_size_min", size?.min ?? null);
            onChange("check_size_max", size?.max ?? null);
          }}
          className={selectClass}
        >
          <option value="">Select a range...</option>
          {CHECK_SIZES.map((size) => (
            <option key={size.label} value={`${size.min}-${size.max}`}>
              {size.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Preferred Stage
        </label>
        <select
          value={data.preferred_stage}
          onChange={(e) => onChange("preferred_stage", e.target.value)}
          className={selectClass}
        >
          <option value="">Select a stage...</option>
          {STAGES.map((stage) => (
            <option key={stage.value} value={stage.value}>
              {stage.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
