import { api, ApiError } from "./api";
import type { ContentService, Format, SearchQuery } from "./models";
export const formatLabels: Record<Format, string> = {
  mobile: "Mobile",
  desktop: "Desktop",
  whatsapp: "WhatsApp Background",
  status: "WhatsApp Status",
};

export function searchParams(query: SearchQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  return params.toString();
}
export const contentService: ContentService = {
  daily: (date) => api(`/collections/daily${date ? `?date=${date}` : ""}`),
  search: (query, signal) => api(`/posts?${searchParams(query)}`, { signal }),
  async bySlug(slug) {
    try { return await api(`/posts/${encodeURIComponent(slug)}`); }
    catch (e) { if (e instanceof ApiError && e.status === 404) return null; throw e; }
  },
};
export function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}
