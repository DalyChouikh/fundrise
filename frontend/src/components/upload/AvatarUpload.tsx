import { useState, useEffect, useRef, useCallback, type ChangeEvent } from "react";
import { Camera, Loader2 } from "lucide-react";
import { uploadFile, deleteFile, getPathFromUrl, BUCKETS, validateFile } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";

interface AvatarUploadProps {
  currentUrl?: string;
  name: string;
  onUpload: (url: string) => void;
  size?: "md" | "lg" | "xl";
}

const sizeStyles = {
  md: "w-16 h-16",
  lg: "w-20 h-20",
  xl: "w-24 h-24",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AvatarUpload({
  currentUrl,
  name,
  onUpload,
  size = "lg",
}: AvatarUploadProps) {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync preview when parent prop changes (e.g. after refreshProfile)
  useEffect(() => {
    setPreviewUrl(currentUrl || null);
  }, [currentUrl]);

  const bucket = BUCKETS.avatars;

  const handleChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !profile?.id) return;
      e.target.value = "";

      setError(null);

      const validationError = validateFile(file, bucket);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Show local preview immediately
      const reader = new FileReader();
      reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
      reader.readAsDataURL(file);

      setUploading(true);
      try {
        // Delete old avatar if exists
        if (currentUrl) {
          const oldPath = getPathFromUrl(currentUrl, "avatars");
          if (oldPath) await deleteFile("avatars", oldPath).catch(() => {});
        }

        const { url } = await uploadFile(file, "avatars", profile.id);
        setPreviewUrl(url);
        onUpload(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setPreviewUrl(currentUrl || null);
      } finally {
        setUploading(false);
      }
    },
    [profile?.id, currentUrl, bucket, onUpload]
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`relative rounded-full overflow-hidden group ${sizeStyles[size]}`}
        disabled={uploading}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-brand-dark text-white flex items-center justify-center font-semibold text-lg">
            {getInitials(name || "?")}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-white" />
          )}
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={bucket.acceptedTypes.join(",")}
        onChange={handleChange}
        className="hidden"
      />

      <p className="text-xs text-brand-muted">
        {uploading ? "Uploading..." : "Click to change"}
      </p>

      {error && (
        <p className="text-xs text-red-600 text-center max-w-48">{error}</p>
      )}
    </div>
  );
}
