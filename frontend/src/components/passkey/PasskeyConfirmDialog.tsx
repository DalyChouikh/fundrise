import { useState } from "react";
import { KeyRound } from "lucide-react";
import { stepUpWithPasskey } from "@/lib/passkey";
import { Modal, Alert } from "@/components/ui";
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
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button size="sm" loading={loading} onClick={handleVerify}>
            <KeyRound className="w-3.5 h-3.5" />
            Verify with passkey
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
            <KeyRound className="w-5 h-5 text-brand-accent" />
          </div>
          <p className="text-sm text-brand-muted">{description}</p>
        </div>
        {error && <Alert variant="error">{error}</Alert>}
      </div>
    </Modal>
  );
}
