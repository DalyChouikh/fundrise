import { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface DialogState {
  title: string;
  description: string;
}

export interface PasskeyDialogProps {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirmed: (token: string) => void;
}

export function usePasskeyStepUp() {
  const { profile } = useAuth();
  const resolveRef = useRef<((token: string | null) => void) | null>(null);
  const rejectRef = useRef<((reason: unknown) => void) | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const requireStepUp = (title: string, description: string): Promise<string | null> => {
    if (!profile?.has_passkeys) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current = reject;
      setDialog({ title, description });
    });
  };

  const handleConfirmed = (token: string) => {
    setDialog(null);
    resolveRef.current?.(token);
    resolveRef.current = null;
    rejectRef.current = null;
  };

  const handleClose = () => {
    setDialog(null);
    rejectRef.current?.(new Error("Step-up cancelled"));
    resolveRef.current = null;
    rejectRef.current = null;
  };

  const dialogProps: PasskeyDialogProps | null = dialog
    ? {
        open: true,
        title: dialog.title,
        description: dialog.description,
        onClose: handleClose,
        onConfirmed: handleConfirmed,
      }
    : null;

  return { requireStepUp, dialogProps };
}
