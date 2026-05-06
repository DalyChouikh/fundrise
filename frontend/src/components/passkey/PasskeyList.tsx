import { useState, useEffect, useCallback } from "react";
import { KeyRound, Trash2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { registerPasskey } from "@/lib/passkey";
import { Button } from "@/components/ui/Button";

interface Passkey {
  id: number;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

interface Props {
  onPasskeyAdded?: () => void;
}

export function PasskeyList({ onPasskeyAdded }: Props) {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("My passkey");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const fetchPasskeys = useCallback(async () => {
    try {
      const data = await api.get<Passkey[]>("/users/passkeys/");
      setPasskeys(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPasskeys();
  }, [fetchPasskeys]);

  const handleAdd = async () => {
    setAddLoading(true);
    setAddError("");
    try {
      await registerPasskey(newName.trim() || "My passkey");
      setShowAddModal(false);
      setNewName("My passkey");
      await fetchPasskeys();
      onPasskeyAdded?.();
    } catch (e) {
      if (e instanceof Error && e.name === "NotAllowedError") {
        setAddError("Registration was cancelled.");
      } else {
        setAddError(e instanceof Error ? e.message : "Failed to add passkey. Please try again.");
      }
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/users/passkeys/${id}/`);
      setPasskeys((p) => p.filter((pk) => pk.id !== id));
      onPasskeyAdded?.();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return <p className="text-sm text-brand-muted py-2">Loading passkeys...</p>;
  }

  return (
    <div className="space-y-4">
      {passkeys.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-bg flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-5 h-5 text-brand-muted" />
          </div>
          <p className="text-sm font-medium text-brand-muted">No passkeys registered</p>
          <p className="text-xs text-brand-muted/60 mt-1 max-w-xs mx-auto">
            Add a passkey to sign in with biometrics and protect sensitive actions.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {passkeys.map((pk) => (
            <div
              key={pk.id}
              className="flex items-center justify-between py-3 border-b border-brand-border/[0.08] last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-brand-bg flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-brand-muted" />
                </div>
                <div>
                  <p className="text-sm font-medium text-brand-text">{pk.name || "Passkey"}</p>
                  <p className="text-xs text-brand-muted">
                    {pk.last_used_at
                      ? `Last used ${new Date(pk.last_used_at).toLocaleDateString()}`
                      : `Added ${new Date(pk.created_at).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(pk.id)}
                className="p-1.5 rounded-lg text-brand-muted hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                title="Remove passkey"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          setAddError("");
          setShowAddModal(true);
        }}
      >
        <Plus className="w-4 h-4" />
        Add a passkey
      </Button>

      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-brand-text mb-1">Add a passkey</h3>
            <p className="text-sm text-brand-muted mb-4">
              Give this passkey a name to identify the device or authenticator.
            </p>
            {addError && (
              <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm mb-3">
                {addError}
              </div>
            )}
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. iPhone, MacBook, YubiKey"
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-border/40 text-brand-text text-sm outline-none focus:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue/10 transition-all shadow-sm mb-4"
              onKeyDown={(e) => e.key === "Enter" && !addLoading && handleAdd()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button size="sm" loading={addLoading} onClick={handleAdd}>
                <KeyRound className="w-3.5 h-3.5" />
                Register passkey
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
