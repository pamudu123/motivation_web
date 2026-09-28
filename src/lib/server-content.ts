import "server-only";
import type { ContentService, Post } from "./models";
import { searchParams } from "./content";
async function get<T>(path: string): Promise<T> {
  const origin = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";
  const response = await fetch(`${origin}/api/v1${path}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Content service unavailable (${response.status})`);
  return response.json();
}
export const contentService: ContentService = {
  daily: (date) => get(`/collections/daily${date ? `?date=${date}` : ""}`),
  search: (query) => get(`/posts?${searchParams(query)}`),
  async bySlug(slug) {
    const origin = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";
    const r = await fetch(`${origin}/api/v1/posts/${encodeURIComponent(slug)}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("Content service unavailable");
    return r.json();
  },
};
export function earlierCollections(before?: string) {
  return get<{ collections: { date: string; postCount: number; representative: Post }[] }>(`/collections?limit=3${before ? `&before=${before}` : ""}`);
}
