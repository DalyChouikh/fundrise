import { FileUpload } from "@/components/upload/FileUpload";

interface FounderPitchDeckStepProps {
  data: { startup_pitch_deck_url: string };
  onChange: (field: string, value: unknown) => void;
}

export function FounderPitchDeckStep({
  data,
  onChange,
}: FounderPitchDeckStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-brand-muted mb-4">
          Upload your pitch deck to share with potential investors. You can
          always update this later.
        </p>
        <FileUpload
          bucket="documents"
          label="Pitch Deck (PDF)"
          onUpload={(url) => onChange("startup_pitch_deck_url", url)}
          existingUrl={data.startup_pitch_deck_url || undefined}
          hint="Upload your pitch deck as PDF, max 10MB"
        />
      </div>
    </div>
  );
}
