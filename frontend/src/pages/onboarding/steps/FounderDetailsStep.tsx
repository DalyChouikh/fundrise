import { LogoUpload } from "@/components/upload/LogoUpload";

interface FounderDetailsStepProps {
  data: {
    startup_description: string;
    startup_website: string;
    startup_logo_url: string;
    startup_name: string;
  };
  onChange: (field: string, value: unknown) => void;
}

export function FounderDetailsStep({
  data,
  onChange,
}: FounderDetailsStepProps) {
  const inputClass =
    "w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all";

  return (
    <div className="space-y-4">
      <LogoUpload
        currentUrl={data.startup_logo_url || undefined}
        startupName={data.startup_name}
        onUpload={(url) => onChange("startup_logo_url", url)}
      />

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Description
        </label>
        <textarea
          value={data.startup_description}
          onChange={(e) => onChange("startup_description", e.target.value)}
          placeholder="Describe what your startup does..."
          rows={4}
          className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Website
        </label>
        <input
          type="url"
          value={data.startup_website}
          onChange={(e) => onChange("startup_website", e.target.value)}
          placeholder="https://..."
          className={inputClass}
        />
      </div>
    </div>
  );
}
