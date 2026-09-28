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
export interface Asset {
  src: string;
  width: number;
  height: number;
  type: "image/jpeg";
  alt: string;
}
export interface Post {
  id: string;
  slug: string;
  title: string;
  quote: string;
  attribution?: string | null;
  description: string;
  publishedAt: string;
  themes: Theme[];
  styles: VisualStyle[];
  thumbnail: Asset;
  hero: Asset;
  mobileHero: Asset;
  versions: Partial<Record<Format, Asset>>;
  likeCount: number;
}
export interface Profile {
  id: string;
  displayName: string;
  themes: Theme[];
  likedCount: number;
  savedCount: number;
}
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
export interface Reaction { postId: string; liked: boolean; saved: boolean; likeCount: number; }
export interface ReactionResult extends Reaction { likedCount: number; savedCount: number; }
