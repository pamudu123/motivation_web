import { notFound } from "next/navigation";
import { contentService } from "@/lib/server-content";
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
    ...(post ? {
      alternates: { canonical: new URL(`/wallpaper/${post.slug}`, process.env.APP_ORIGIN || "http://localhost:3000").href },
      openGraph: { title: post.title, description: post.quote, images: [{ url: post.hero.src, width: post.hero.width, height: post.hero.height, alt: post.hero.alt }] },
      twitter: { card: "summary_large_image" as const, title: post.title, description: post.quote, images: [post.hero.src] },
    } : {}),
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
