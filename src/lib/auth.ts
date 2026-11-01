import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let instance: SupabaseClient | undefined;
export function authClient() {
  if (!instance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Sign-in is not configured. Please try again later.");
    instance = createClient(url, key, { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }});
  }
  return instance;
}
let refreshing: Promise<string | null> | undefined;
export async function accessToken(refresh = false): Promise<string | null> {
  if (!refresh) return (await authClient().auth.getSession()).data.session?.access_token ?? null;
  refreshing ??= authClient().auth.refreshSession().then(({ data, error }) => {
    if (error) throw error;
    return data.session?.access_token ?? null;
  }).finally(() => { refreshing = undefined; });
  return refreshing;
}
export const DEFAULT_RETURN = "/saved";
export const RETURN_KEY = "daily-spark-return";
const authPages = ["/signin", "/signup"];
export function safeReturnPath(value: string | null | undefined, fallback = DEFAULT_RETURN) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes(String.fromCharCode(92))) return fallback;
  const url = new URL(value, "https://local.invalid");
  if (url.origin !== "https://local.invalid" || url.pathname.startsWith("/auth/") || authPages.includes(url.pathname.replace(/\/$/, ""))) return fallback;
  return url.pathname + url.search;
}
export const PENDING_KEY = "daily-spark-pending-v1";
export type PendingAction = { id: string; kind: "liked" | "saved"; postId: string; active: true; returnPath: string; expires: number };
export function readPending(): PendingAction | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p.id !== "string" || !["liked", "saved"].includes(p.kind) || typeof p.postId !== "string" || p.active !== true || !(p.expires > Date.now())) {
      localStorage.removeItem(PENDING_KEY); return null;
    }
    return { ...p, returnPath: safeReturnPath(p.returnPath) };
  } catch { return null; }
}
export function clearPending() {
  try { localStorage.removeItem(PENDING_KEY); } catch {}
}
// Plain-language messages; raw provider text can contain internal details.
export function authMessage(e: unknown, fallback = "Sign-in couldn’t finish. Please try again.") {
  const err = (e ?? {}) as { status?: number; code?: string; name?: string; message?: string };
  const code = err.code ?? "";
  if (err.status === 429 || code.includes("rate_limit")) return "Too many requests. Wait a minute and try again.";
  if (code === "otp_expired" || code.includes("flow_state") || code === "bad_code_verifier" || /expired|invalid.*(token|code|grant)|already been used/i.test(err.message ?? ""))
    return "This link has expired or was already used. Request a new one.";
  if (code === "email_address_invalid") return "Enter a valid email address.";
  if (code === "signup_disabled" || code === "email_provider_disabled" || code === "provider_disabled") return "Sign-up is temporarily unavailable. Please try again later.";
  if (err.name === "TypeError" || err.name === "AuthRetryableFetchError" || /fetch|network/i.test(err.message ?? "")) return "Check your connection and try again.";
  if (err.message === "Sign-in is not configured. Please try again later.") return err.message;
  return fallback;
}
