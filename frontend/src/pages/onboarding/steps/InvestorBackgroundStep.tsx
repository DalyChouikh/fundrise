import { Input, DateInput } from "@/components/ui";

interface InvestorBackgroundStepProps {
  data: { company: string; job_title: string; linkedin_url: string; date_of_birth?: string; id_number?: string };
  onChange: (field: string, value: unknown) => void;
}

export function InvestorBackgroundStep({
  data,
  onChange,
}: InvestorBackgroundStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Company / Organization
        </label>
        <Input
          type="text"
          value={data.company}
          onChange={(e) => onChange("company", e.target.value)}
          placeholder="e.g. Sequoia Capital"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Job Title
        </label>
        <Input
          type="text"
          value={data.job_title}
          onChange={(e) => onChange("job_title", e.target.value)}
          placeholder="e.g. Partner, Angel Investor"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          LinkedIn Profile
        </label>
        <Input
          type="url"
          value={data.linkedin_url}
          onChange={(e) => onChange("linkedin_url", e.target.value)}
          placeholder="https://linkedin.com/in/..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">Date of Birth</label>
        <DateInput
          value={data.date_of_birth || ""}
          onChange={(e) => onChange("date_of_birth", e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">ID / CIN Number</label>
        <Input
          type="text"
          value={data.id_number || ""}
          onChange={(e) => onChange("id_number", e.target.value)}
          placeholder="e.g. 12345678"
        />
      </div>
    </div>
  );
}
