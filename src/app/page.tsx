import { Today } from "@/components/today";
import { contentService, earlierCollections } from "@/lib/server-content";
export const dynamic = "force-dynamic";
export default async function Page() {
  const collection = await contentService.daily();
  const archive = await earlierCollections(collection.date ?? undefined);
  return <Today collection={collection} earlier={archive.collections.map(c => c.representative)} />;
}
