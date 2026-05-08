import { Textarea } from "@/components/ui";
import { AvatarUpload } from "@/components/upload/AvatarUpload";

interface ProfileStepProps {
  data: { avatar_url: string; bio: string };
  onChange: (field: string, value: unknown) => void;
}

export function ProfileStep({ data, onChange }: ProfileStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center">
        <AvatarUpload
          currentUrl={data.avatar_url || undefined}
          name="User"
          onUpload={(url) => onChange("avatar_url", url)}
          size="xl"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Bio
        </label>
        <Textarea
          value={data.bio}
          onChange={(e) => onChange("bio", e.target.value)}
          placeholder="Tell us a bit about yourself..."
          rows={4}
        />
      </div>
    </div>
  );
}
