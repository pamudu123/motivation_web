import type { components } from "./api-schema";
export const themes = [
  "Discipline",
  "Focus",
  "Confidence",
  "Resilience",
  "Growth",
  "Courage",
  "Ambition",
  "Patience",
  "Calm",
  "New Beginnings",
] as const;
export const styles = [
  "Cinematic",
  "Nature",
  "Minimal",
  "Urban",
  "Abstract",
] as const;
export type Theme = (typeof themes)[number];
export type VisualStyle = (typeof styles)[number];
export type Format = "mobile" | "desktop" | "whatsapp" | "status";
export type Asset = components["schemas"]["Asset"];
export type Post = Omit<components["schemas"]["Post"], "versions"> & { versions: Partial<Record<Format, Asset>> };
export type Profile = Omit<components["schemas"]["Profile"], "themes"> & { themes: Theme[] };
export interface SearchQuery {
  search?: string;
  themes?: string[];
  style?: string;
  sort?: "newest" | "liked";
  date?: string;
  offset?: number;
  limit?: number;
  ids?: string[];
  exclude?: string;
}
export interface SearchResult {
  posts: Post[];
  total: number;
}
export interface ContentService {
  daily(date?: string): Promise<{ date: string | null; posts: Post[] }>;
  search(query: SearchQuery, signal?: AbortSignal): Promise<SearchResult>;
  bySlug(slug: string): Promise<Post | null>;
}
export type Reaction = components["schemas"]["Reaction"];
export type ReactionResult = components["schemas"]["ReactionResult"];
