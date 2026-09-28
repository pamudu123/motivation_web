"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  Bookmark,
  Heart,
  ImageOff,
  RefreshCw,
} from "lucide-react";
import { type Asset, type Post } from "@/lib/models";
import { useAccount } from "./providers";

export function Artwork({
  asset,
  priority = false,
  className = "",
}: {
  asset: Asset;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = ref.current;
    if (img?.complete) {
      if (img.naturalWidth === 0) setFailed(true);
      else setLoaded(true);
    }
  }, [asset.src, attempt]);
  if (failed)
    return (
      <div
        className={`image-error ${className}`}
        role="group"
        aria-label="Image unavailable"
      >
        <ImageOff />
        <span>Artwork couldn’t load</span>
        <button
          className="button small"
          onClick={() => {
            setFailed(false);
            setAttempt((v) => v + 1);
          }}
        >
          <RefreshCw size={14} />
          Retry image
        </button>
      </div>
    );
  return (
    <img
      ref={ref}
      key={`${asset.src}-${attempt}`}
      src={asset.src}
      width={asset.width}
      height={asset.height}
      alt={asset.alt}
      className={`${className} artwork ${loaded ? "loaded" : ""}`}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
}
export function Reactions({
  post,
  expanded = false,
}: {
  post: Post;
  expanded?: boolean;
}) {
  const { profile, react, ready, busy, reactions, register } = useAccount();
  useEffect(() => { register(post); }, [post.id, post.likeCount, register]);
  const state = reactions[post.id];
  const liked = !!state?.liked;
  const saved = !!state?.saved;
  return (
    <div className={`reactions ${expanded ? "expanded" : ""}`}>
      <button
        aria-label={`${liked ? "Unlike" : "Like"} ${post.title}`}
        aria-pressed={liked}
        disabled={!ready || busy === post.id || (!!profile && !state)}
        className={liked ? "is-liked" : ""}
        onClick={() => react("liked", post.id)}
      >
        <Heart size={17} fill={liked ? "currentColor" : "none"} />
        <span>{state?.likeCount ?? post.likeCount}</span>
      </button>
      <button
        aria-label={`${saved ? "Unsave" : "Save"} ${post.title}`}
        aria-pressed={saved}
        disabled={!ready || busy === post.id || (!!profile && !state)}
        className={saved ? "is-saved" : ""}
        onClick={() => react("saved", post.id)}
      >
        <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
        {expanded && <span>{saved ? "Saved" : "Save"}</span>}
      </button>
    </div>
  );
}
export function Card({
  post,
  index = 0,
  wideMobile = false,
}: {
  post: Post;
  index?: number;
  wideMobile?: boolean;
}) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: Math.min(index, 4) * 0.035 }}
      className="gallery-card"
      data-testid="gallery-card"
    >
      <div className="card-art">
        {wideMobile ? (
          <picture>
            <source media="(max-width: 640px)" srcSet={post.mobileHero.src} />
            <Artwork asset={post.thumbnail} />
          </picture>
        ) : (
          <Artwork asset={post.thumbnail} />
        )}
        <Link
          href={`/wallpaper/${post.slug}`}
          aria-label={`Preview ${post.title}`}
          className="art-link"
        >
          <span className="preview-hint">
            <ArrowUpRight size={20} />
          </span>
        </Link>
      </div>
      <div className="card-meta">
        <div>
          <Link href={`/wallpaper/${post.slug}`} className="card-title">
            {post.title}
          </Link>
          <p>{post.themes.slice(0, 2).join(" · ")}</p>
        </div>
        <Reactions post={post} />
      </div>
    </motion.article>
  );
}
export function Gallery({
  posts,
  daily = false,
}: {
  posts: Post[];
  daily?: boolean;
}) {
  return (
    <div className={`gallery ${daily ? "daily-gallery" : ""}`}>
      {posts.map((post, index) => (
        <Card
          key={post.id}
          post={post}
          index={index}
          wideMobile={daily && index === 0}
        />
      ))}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-symbol">
        <Bookmark size={28} />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
