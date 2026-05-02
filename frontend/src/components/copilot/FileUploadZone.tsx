import { useRef, useState, useCallback } from "react";
import { Paperclip, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MediaPreview } from "./MediaPreview";

interface AttachedFile {
  url: string;
  mediaType: string;
  filename: string;
  sizeBytes: number;
}

interface FileUploadZoneProps {
  children: React.ReactNode;
  onAttach: (file: AttachedFile | null) => void;
  attached: AttachedFile | null;
  disabled?: boolean;
}

async function uploadFile(file: File): Promise<AttachedFile> {
  const { data: { session } } = await supabase.auth.getSession();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/copilot/upload/", {
    method: "POST",
    headers: session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {},
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return {
    url: data.url,
    mediaType: data.media_type,
    filename: data.filename,
    sizeBytes: data.size_bytes,
  };
}

export function FileUploadZone({ children, onAttach, attached, disabled }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large (max 10MB)");
      return;
    }
    setUploading(true);
    try {
      const result = await uploadFile(file);
      onAttach(result);
    } catch {
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [onAttach]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      className="relative"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {dragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-brand-accent bg-brand-accent/5">
          <p className="text-sm font-medium text-brand-accent">Drop image or PDF</p>
        </div>
      )}
      {attached && (
        <div className="px-3 pt-2 flex items-start gap-2">
          <MediaPreview
            url={attached.url}
            mediaType={attached.mediaType}
            filename={attached.filename}
            sizeBytes={attached.sizeBytes}
          />
          <button
            onClick={() => onAttach(null)}
            className="mt-1 text-brand-muted hover:text-brand-text"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-1 pr-3">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="p-2 text-brand-muted hover:text-brand-text disabled:opacity-40 transition-colors"
          title="Attach image or PDF"
        >
          <Paperclip className={`w-4 h-4 ${uploading ? "animate-pulse" : ""}`} />
        </button>
        {children}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
