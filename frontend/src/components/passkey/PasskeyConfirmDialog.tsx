import { useState } from "react";
import { KeyRound, X } from "lucide-react";
import { stepUpWithPasskey } from "@/lib/passkey";
import { Button } from "@/components/ui/Button";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirmed: (token: string) => void;
  title: string;
  description: string;
}

export function PasskeyConfirmDialog({ open, onClose, onConfirmed, title, description }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const token = await stepUpWithPasskey();
      onConfirmed(token);
    } catch (e) {
      if (e instanceof Error && e.name === "NotAllowedError") {
        setError("Verification was cancelled.");
      } else {
        setError(e instanceof Error ? e.message : "Verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
              <KeyRound className="w-5 h-5 text-brand-accent" />
            </div>
            <h3 className="text-base font-semibold text-brand-text">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-brand-muted hover:text-brand-text transition-colors cursor-pointer ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-brand-muted mb-4">{description}</p>
        {error && (
          <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm mb-3">
            {error}
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={loading} onClick={handleVerify}>
            <KeyRound className="w-3.5 h-3.5" />
            Verify with passkey
          </Button>
        </div>
      </div>
    </div>
  );
}
