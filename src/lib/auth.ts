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
export function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes(String.fromCharCode(92))) return "/profile";
  const url = new URL(value, "https://local.invalid");
  if (url.origin !== "https://local.invalid" || url.pathname.startsWith("/auth/")) return "/profile";
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
