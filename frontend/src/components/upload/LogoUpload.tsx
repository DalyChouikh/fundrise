import { useState, useEffect, useRef, useCallback, type ChangeEvent } from "react";
import { Building2, Camera, Loader2 } from "lucide-react";
import { uploadFile, deleteFile, getPathFromUrl, BUCKETS, validateFile } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";

interface LogoUploadProps {
  currentUrl?: string;
  startupName?: string;
  onUpload: (url: string) => void;
}

export function LogoUpload({
  currentUrl,
  startupName,
  onUpload,
}: LogoUploadProps) {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync preview when parent prop changes
  useEffect(() => {
    setPreviewUrl(currentUrl || null);
  }, [currentUrl]);

  const bucket = BUCKETS.logos;

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

      const reader = new FileReader();
      reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
      reader.readAsDataURL(file);

      setUploading(true);
      try {
        if (currentUrl) {
          const oldPath = getPathFromUrl(currentUrl, "logos");
          if (oldPath) await deleteFile("logos", oldPath).catch(() => {});
        }

        const { url } = await uploadFile(file, "logos", profile.id);
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
    <div>
      <label className="block text-sm font-medium text-brand-text mb-1.5">
        Logo
      </label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-20 h-20 rounded-xl overflow-hidden group border border-brand-border/40 bg-brand-bg"
        disabled={uploading}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={startupName || "Logo"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-8 h-8 text-brand-muted" />
          </div>
        )}

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

      <p className="text-xs text-brand-muted mt-1.5">
        {uploading ? "Uploading..." : "Click to upload logo"}
      </p>

      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
