interface InvestorBackgroundStepProps {
  data: { company: string; job_title: string; linkedin_url: string };
  onChange: (field: string, value: unknown) => void;
}

export function InvestorBackgroundStep({
  data,
  onChange,
}: InvestorBackgroundStepProps) {
  const inputClass =
    "w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Company / Organization
        </label>
        <input
          type="text"
          value={data.company}
          onChange={(e) => onChange("company", e.target.value)}
          placeholder="e.g. Sequoia Capital"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Job Title
        </label>
        <input
          type="text"
          value={data.job_title}
          onChange={(e) => onChange("job_title", e.target.value)}
          placeholder="e.g. Partner, Angel Investor"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          LinkedIn Profile
        </label>
        <input
          type="url"
          value={data.linkedin_url}
          onChange={(e) => onChange("linkedin_url", e.target.value)}
          placeholder="https://linkedin.com/in/..."
          className={inputClass}
        />
      </div>
    </div>
  );
}
