import { api } from "./api";
import { authClient, readPending, safeReturnPath } from "./auth";
import type { Profile, Theme, SearchResult, Reaction, ReactionResult } from "./models";
export const accountService = {
  async read(): Promise<Profile | null> {
    if (!(await authClient().auth.getSession()).data.session) return null;
    return api<Profile>("/me", {}, true);
  },
  async signIn(method: "google" | "email", email?: string) {
    const returnPath = safeReturnPath(readPending()?.returnPath ?? window.location.pathname + window.location.search);
    localStorage.setItem("daily-spark-return", returnPath);
    if (method === "google") {
      const { error } = await authClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } });
      if (error) throw error;
    } else {
      const { error } = await authClient().auth.signInWithOtp({ email: email!, options: { emailRedirectTo: `${window.location.origin}/auth/confirm` } });
      if (error) throw error;
    }
  },
  async signOut() {
    const { error } = await authClient().auth.signOut({ scope: "local" });
    if (error) throw error;
  },
  update: (body: { displayName: string; themes: Theme[] }) => api<Profile>("/me", { method: "PATCH", body: JSON.stringify(body) }, true),
  react: (kind: "liked" | "saved", id: string, active: boolean) => api<ReactionResult>(`/me/${kind === "liked" ? "likes" : "saves"}/${id}`, { method: "PUT", body: JSON.stringify({ active }) }, true),
  reactions: (ids: string[], signal?: AbortSignal) => api<Reaction[]>(`/me/reactions?ids=${ids.join(",")}`, { signal }, true),
  collection: (kind: "liked" | "saved", offset: number, limit: number, signal?: AbortSignal) => api<SearchResult>(`/me/${kind}?offset=${offset}&limit=${limit}`, { signal }, true),
  deleteAccount: () => api<{ status: "pending" | "complete"; jobId: string }>("/me", { method: "DELETE", body: JSON.stringify({ confirmation: "DELETE" }) }, true),
};
