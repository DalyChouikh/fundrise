import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from "react";
import { Upload, X, FileText, AlertCircle, Loader2 } from "lucide-react";
import { uploadFile, deleteFile, getPathFromUrl, BUCKETS, validateFile } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";

interface FileUploadProps {
  bucket: string;
  onUpload: (url: string) => void;
  existingUrl?: string;
  label?: string;
  hint?: string;
  className?: string;
}

export function FileUpload({
  bucket,
  onUpload,
  existingUrl,
  label,
  hint,
  className = "",
}: FileUploadProps) {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(existingUrl || null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const bucketConfig = BUCKETS[bucket];
  const isImage = bucketConfig?.acceptedTypes.every((t) => t.startsWith("image/"));

  const handleFile = useCallback(
    async (file: File) => {
      if (!profile?.id || !bucketConfig) return;

      setError(null);

      // Client-side validation
      const validationError = validateFile(file, bucketConfig);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Show preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreview(file.name);
      }

      setUploading(true);
      try {
        // Delete old file if replacing
        if (existingUrl) {
          const oldPath = getPathFromUrl(existingUrl, bucket);
          if (oldPath) {
            await deleteFile(bucket, oldPath).catch(() => {});
          }
        }

        const { url } = await uploadFile(file, bucket, profile.id);
        onUpload(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setPreview(existingUrl || null);
      } finally {
        setUploading(false);
      }
    },
    [profile?.id, bucket, bucketConfig, existingUrl, onUpload]
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [handleFile]
  );

  const handleRemove = useCallback(async () => {
    if (existingUrl) {
      const path = getPathFromUrl(existingUrl, bucket);
      if (path) {
        await deleteFile(bucket, path).catch(() => {});
      }
    }
    setPreview(null);
    setError(null);
    onUpload("");
  }, [existingUrl, bucket, onUpload]);

  const maxMB = bucketConfig ? bucketConfig.maxSize / (1024 * 1024) : 0;
  const acceptStr = bucketConfig?.acceptedTypes.join(",") || "";

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          {label}
        </label>
      )}

      {/* Preview state */}
      {preview && !uploading ? (
        <div className="relative group">
          {isImage && typeof preview === "string" && (preview.startsWith("http") || preview.startsWith("data:")) ? (
            <div className="relative w-full h-40 rounded-xl border border-brand-border/40 overflow-hidden bg-brand-bg">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-brand-border/40 bg-brand-bg">
              <FileText className="w-5 h-5 text-brand-accent flex-shrink-0" />
              <span className="text-sm text-brand-text truncate flex-1">
                {typeof preview === "string" && preview.startsWith("http")
                  ? preview.split("/").pop()
                  : preview}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 border border-brand-border/40 text-brand-muted hover:text-red-500 hover:border-red-200 transition-all opacity-0 group-hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Drop zone */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            flex flex-col items-center justify-center gap-2 px-6 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all
            ${dragOver
              ? "border-brand-blue bg-brand-blue/5"
              : "border-brand-border/60 hover:border-brand-blue/40 hover:bg-brand-bg/50"
            }
            ${uploading ? "pointer-events-none opacity-60" : ""}
          `}
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-brand-muted" />
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-brand-text">
              {uploading ? "Uploading..." : "Drop file here or click to browse"}
            </p>
            <p className="text-xs text-brand-muted mt-1">
              {hint || `Max ${maxMB}MB · ${bucketConfig?.acceptedTypes.map((t) => t.split("/")[1].toUpperCase()).join(", ")}`}
            </p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={acceptStr}
        onChange={handleChange}
        className="hidden"
      />

      {error && (
        <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
