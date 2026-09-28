import { notFound } from "next/navigation";
import { contentService } from "@/lib/content";
import { Detail } from "@/components/detail";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const post = await contentService.bySlug((await params).slug);
  return {
    title: post?.title || "Wallpaper not found",
    description: post?.quote,
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const post = await contentService.bySlug((await params).slug);
  if (!post) notFound();
  const related = await contentService.search({
    themes: post.themes,
    exclude: post.id,
    limit: 4,
  });
  return <Detail key={post.id} post={post} related={related.posts} />;
}
