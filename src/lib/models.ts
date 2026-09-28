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
  attribution?: string;
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
  liked: string[];
  saved: string[];
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
  daily(date?: string): Promise<{ date: string; posts: Post[] }>;
  search(query: SearchQuery): Promise<SearchResult>;
  bySlug(slug: string): Promise<Post | null>;
}
export interface AccountService {
  read(): Promise<Profile | null>;
  signIn(method: "google-demo" | "email-demo"): Promise<Profile>;
  signOut(): Promise<void>;
  update(profile: Profile): Promise<Profile>;
  react(
    kind: "liked" | "saved",
    postId: string,
    active: boolean,
  ): Promise<Profile>;
}
