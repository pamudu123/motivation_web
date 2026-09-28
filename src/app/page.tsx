import { Today } from "@/components/today";
import { contentService } from "@/lib/content";
export const dynamic = "force-dynamic";
export default async function Page() {
  const collection = await contentService.daily();
  const archive = await contentService.search({ sort: "newest", limit: 100 });
  const dates = [
    ...new Set(
      archive.posts
        .filter((p) => p.publishedAt < collection.date)
        .map((p) => p.publishedAt),
    ),
  ].slice(0, 3);
  return (
    <Today
      collection={collection}
      earlier={dates.map(
        (d) => archive.posts.find((p) => p.publishedAt === d)!,
      )}
    />
  );
}
