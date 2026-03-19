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
        <textarea
          value={data.bio}
          onChange={(e) => onChange("bio", e.target.value)}
          placeholder="Tell us a bit about yourself..."
          rows={4}
          className="w-full px-4 py-2.5 rounded-xl bg-brand-bg border border-brand-border/60 text-brand-text placeholder:text-brand-muted text-sm outline-none focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/10 transition-all resize-none"
        />
      </div>
    </div>
  );
}
