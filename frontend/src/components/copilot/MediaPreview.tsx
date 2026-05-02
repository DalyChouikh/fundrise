import { FileText } from "lucide-react";

interface MediaPreviewProps {
  url: string;
  mediaType: string;
  filename?: string;
  sizeBytes?: number;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaPreview({ url, mediaType, filename, sizeBytes }: MediaPreviewProps) {
  if (mediaType === "image") {
    return (
      <div className="mb-2 inline-block">
        <div className="rounded-xl overflow-hidden shadow-sm border border-brand-border/30 bg-brand-bg max-w-[240px]">
          <img src={url} alt="Attached" className="w-full h-auto object-cover max-h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-bg border border-brand-border/30 shadow-sm max-w-[240px]">
      <FileText className="w-4 h-4 text-brand-accent shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-brand-text truncate">{filename ?? "Document"}</p>
        {sizeBytes !== undefined && (
          <p className="text-[10px] text-brand-muted">{formatBytes(sizeBytes)}</p>
        )}
      </div>
    </div>
  );
}
