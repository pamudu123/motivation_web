import seeds from "@/data/designs.json";
import type {
  Asset,
  ContentService,
  Format,
  Post,
  SearchQuery,
  Theme,
  VisualStyle,
} from "./models";

export const formatLabels: Record<Format, string> = {
  mobile: "Mobile",
  desktop: "Desktop",
  whatsapp: "WhatsApp Background",
  status: "WhatsApp Status",
};
const sizes: Record<Format, [number, number]> = {
  mobile: [1080, 1920],
  desktop: [2560, 1440],
  whatsapp: [1080, 1920],
  status: [1080, 1920],
};
export const posts: Post[] = seeds.map((seed) => {
  const asset = (format: Format): Asset => ({
    src: `/wallpapers/${seed.slug}-${format}.jpg`,
    width: sizes[format][0],
    height: sizes[format][1],
    type: "image/jpeg",
    alt: `${seed.title}: ${seed.quote} ${seed.scene} artwork.`,
  });
  return {
    id: seed.slug,
    slug: seed.slug,
    title: seed.title,
    quote: seed.quote,
    description: `A little perspective for the moments that matter. Keep this reminder close as you make room for ${seed.themes.join(" and ").toLowerCase()}.`,
    publishedAt: seed.date,
    themes: seed.themes as Theme[],
    styles: [seed.style as VisualStyle],
    thumbnail: {
      src: `/wallpapers/${seed.slug}-thumb.jpg`,
      width: 600,
      height: 800,
      type: "image/jpeg",
      alt: `${seed.title}. ${seed.quote}`,
    },
    hero: {
      src: `/wallpapers/${seed.slug}-hero.jpg`,
      width: 1800,
      height: 680,
      type: "image/jpeg",
      alt: `${seed.title}. ${seed.quote}`,
    },
    mobileHero: {
      src: `/wallpapers/${seed.slug}-mobile-hero.jpg`,
      width: 1080,
      height: 1200,
      type: "image/jpeg",
      alt: `${seed.title}. ${seed.quote}`,
    },
    versions: {
      mobile: asset("mobile"),
      desktop: asset("desktop"),
      ...(seed.chat ? { whatsapp: asset("whatsapp") } : {}),
      ...(seed.status ? { status: asset("status") } : {}),
    },
    likeCount: seed.likes,
  };
});
export function filterPosts(query: SearchQuery) {
  const text = query.search?.trim().toLowerCase() || "";
  const filtered = posts.filter(
    (p) =>
      (!text ||
        `${p.title} ${p.quote} ${p.themes.join(" ")}`
          .toLowerCase()
          .includes(text)) &&
      (!query.themes?.length ||
        p.themes.some((t) => query.themes!.includes(t))) &&
      (!query.style || p.styles.includes(query.style as VisualStyle)) &&
      (!query.date || p.publishedAt === query.date) &&
      (!query.ids || query.ids.includes(p.id)) &&
      p.id !== query.exclude,
  );
  filtered.sort((a, b) =>
    query.sort === "liked"
      ? b.likeCount - a.likeCount
      : b.publishedAt.localeCompare(a.publishedAt),
  );
  return {
    posts: filtered.slice(
      query.offset || 0,
      (query.offset || 0) + (query.limit ?? filtered.length),
    ),
    total: filtered.length,
  };
}
export const contentService: ContentService = {
  async daily(date) {
    const available = [...new Set(posts.map((p) => p.publishedAt))]
      .sort()
      .reverse();
    const requested = date || new Date().toISOString().slice(0, 10);
    const published =
      available.find((d) => d <= requested) || available[available.length - 1];
    return {
      date: published,
      posts: posts.filter((p) => p.publishedAt === published),
    };
  },
  async search(query) {
    return filterPosts(query);
  },
  async bySlug(slug) {
    return posts.find((p) => p.slug === slug) || null;
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
