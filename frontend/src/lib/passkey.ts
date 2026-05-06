import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { api } from "./api";
import { supabase } from "./supabase";

interface PasskeyEntry {
  id: number;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

export async function registerPasskey(name: string): Promise<PasskeyEntry> {
  const options = await api.post<Record<string, unknown>>("/users/passkeys/register/begin/", {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const credential = await startRegistration({ optionsJSON: options as any });
  return api.post<PasskeyEntry>("/users/passkeys/register/complete/", {
    credential: credential as unknown as Record<string, unknown>,
    name,
  });
}

export async function loginWithPasskey(): Promise<void> {
  const { session_id, options } = await api.postPublic<{
    session_id: string;
    options: Record<string, unknown>;
  }>("/users/passkeys/login/begin/", {});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const credential = await startAuthentication({ optionsJSON: options as any });

  const { email, token } = await api.postPublic<{ email: string; token: string }>(
    "/users/passkeys/login/complete/",
    { session_id, credential: credential as unknown as Record<string, unknown> }
  );

  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw error;
}

export async function stepUpWithPasskey(): Promise<string> {
  const options = await api.post<Record<string, unknown>>("/users/passkeys/step-up/begin/", {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const credential = await startAuthentication({ optionsJSON: options as any });
  const { action_token } = await api.post<{ action_token: string }>(
    "/users/passkeys/step-up/complete/",
    { credential: credential as unknown as Record<string, unknown> }
  );
  return action_token;
}
