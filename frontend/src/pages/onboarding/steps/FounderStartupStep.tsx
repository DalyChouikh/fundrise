import { Input, DateInput } from "@/components/ui";

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
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Startup Name *
        </label>
        <Input
          type="text"
          value={data.startup_name}
          onChange={(e) => onChange("startup_name", e.target.value)}
          placeholder="My Awesome Startup"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Industry *
        </label>
        <Input
          type="text"
          value={data.startup_industry}
          onChange={(e) => onChange("startup_industry", e.target.value)}
          placeholder="e.g. FinTech"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Location
        </label>
        <Input
          type="text"
          value={data.startup_location}
          onChange={(e) => onChange("startup_location", e.target.value)}
          placeholder="e.g. San Francisco, CA"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Founding Date
        </label>
        <DateInput
          value={data.startup_founding_date}
          onChange={(e) => onChange("startup_founding_date", e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">Registration ID</label>
        <Input
          type="text"
          value={data.startup_registration_id || ""}
          onChange={(e) => onChange("startup_registration_id", e.target.value)}
          placeholder="Company registration number"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">Legal Form</label>
        <Input
          type="text"
          value={data.startup_legal_form || ""}
          onChange={(e) => onChange("startup_legal_form", e.target.value)}
          placeholder="e.g. SARL, SA, SAS"
        />
      </div>
    </div>
  );
}
