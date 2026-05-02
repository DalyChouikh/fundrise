import { useState, useCallback, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ExtractedFields {
  [key: string]: string | null;
}

interface ExtractionResult {
  extracted: ExtractedFields;
  confidence: "high" | "partial" | "low";
  document_url: string;
}

interface DocumentUploadStepProps {
  docType: "investor" | "startup";
  title: string;
  description: string;
  onExtracted: (result: ExtractionResult) => void;
  isComplete: boolean;
}

async function uploadAndExtract(
  file: File,
  docType: "investor" | "startup",
  token: string,
): Promise<ExtractionResult> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`/api/users/extract-document/?type=${docType}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`Extraction failed: ${res.status}`);
  return res.json();
}

export function DocumentUploadStep({
  docType,
  title,
  description,
  onExtracted,
  isComplete,
}: DocumentUploadStepProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setError("");
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");
      const extracted = await uploadAndExtract(file, docType, session.access_token);
      setResult(extracted);
      onExtracted(extracted);
    } catch {
      setError("Failed to process document. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [docType, onExtracted]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const fieldCount = result ? Object.values(result.extracted).filter(Boolean).length : 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-brand-text">{title}</h3>
        <p className="text-sm text-brand-muted mt-1">{description}</p>
      </div>

      {result ? (
        <div className="space-y-3">
          <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl text-sm ${result.confidence === "low" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
            {result.confidence === "low" ? (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>
              {result.confidence === "low"
                ? "We couldn't read everything clearly — please check the fields below."
                : `We found ${fieldCount} field${fieldCount !== 1 ? "s" : ""} — review and edit below.`}
            </span>
          </div>
          <button
            onClick={() => { setResult(null); onExtracted({ extracted: {}, confidence: "low", document_url: "" }); }}
            className="text-xs text-brand-muted hover:text-brand-text underline"
          >
            Upload a different document
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !loading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? "border-brand-accent bg-brand-accent/5" : "border-brand-border/40 hover:border-brand-accent/50 hover:bg-brand-accent/5"} ${loading ? "pointer-events-none opacity-60" : ""}`}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-brand-accent border-t-transparent animate-spin" />
              <p className="text-sm text-brand-muted">Reading document…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-brand-accent/10 flex items-center justify-center">
                {dragging ? <FileText className="w-5 h-5 text-brand-accent" /> : <Upload className="w-5 h-5 text-brand-accent" />}
              </div>
              <p className="text-sm font-medium text-brand-text">
                {dragging ? "Drop here" : "Upload document"}
              </p>
              <p className="text-xs text-brand-muted">Drag & drop or click — JPG, PNG, PDF up to 20MB</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }}
      />
    </div>
  );
}
