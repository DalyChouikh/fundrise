interface FounderStartupStepProps {
  data: {
    startup_name: string;
    startup_industry: string;
    startup_location: string;
    startup_founding_date: string;
    startup_registration_id?: string;
    startup_legal_form?: string;
  };
  onChange: (field: string, value: unknown) => void;
}

export function FounderStartupStep({
  data,
  onChange,
}: FounderStartupStepProps) {
  const inputClass =
    "w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Startup Name *
        </label>
        <input
          type="text"
          value={data.startup_name}
          onChange={(e) => onChange("startup_name", e.target.value)}
          placeholder="My Awesome Startup"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Industry *
        </label>
        <input
          type="text"
          value={data.startup_industry}
          onChange={(e) => onChange("startup_industry", e.target.value)}
          placeholder="e.g. FinTech"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Location
        </label>
        <input
          type="text"
          value={data.startup_location}
          onChange={(e) => onChange("startup_location", e.target.value)}
          placeholder="e.g. San Francisco, CA"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Founding Date
        </label>
        <input
          type="date"
          value={data.startup_founding_date}
          onChange={(e) => onChange("startup_founding_date", e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">Registration ID</label>
        <input
          type="text"
          value={data.startup_registration_id || ""}
          onChange={(e) => onChange("startup_registration_id", e.target.value)}
          placeholder="Company registration number"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">Legal Form</label>
        <input
          type="text"
          value={data.startup_legal_form || ""}
          onChange={(e) => onChange("startup_legal_form", e.target.value)}
          placeholder="e.g. SARL, SA, SAS"
          className={inputClass}
        />
      </div>
    </div>
  );
}
