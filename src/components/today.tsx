"use client";
import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDown,
  Check,
  Monitor,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { type Post } from "@/lib/models";
import { dateLabel } from "@/lib/content";
import { Artwork, Gallery } from "./gallery";
const moods = [
  { name: "Focus", hint: "Find your clarity", symbol: "◎" },
  { name: "Confidence", hint: "Back yourself", symbol: "↗" },
  { name: "Discipline", hint: "Show up again", symbol: "✳" },
  { name: "Calm", hint: "Take a breath", symbol: "≈" },
  { name: "Growth", hint: "Keep becoming", symbol: "⌁" },
];
export function Today({
  collection,
  earlier,
}: {
  collection: { date: string | null; posts: Post[] };
  earlier: Post[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 35]);
  const featured = collection.posts[0];
  if (!featured || !collection.date) return <main id="main" className="page"><div className="empty-state"><h1>A little inspiration is on its way.</h1><p>No collection has been published yet. Please check back soon.</p></div></main>;
  const isToday = new Date().toISOString().slice(0, 10) === collection.date;
  return (
    <main id="main" className="page today-page">
      <div className="edition">
        <span>
          <i className="live-dot" />
          {isToday ? "YOUR DAILY DOSE" : "THE LATEST DROP"}
        </span>
        <time dateTime={collection.date}>{dateLabel(collection.date)}</time>
      </div>
      <section
        className="featured"
        ref={ref}
        aria-label="Featured wallpaper"
        data-sc-act="flow"
      >
        <motion.div
          className="featured-art"
          style={reduced ? undefined : { y }}
        >
          <picture>
            <source
              media="(max-width: 640px)"
              srcSet={featured.mobileHero.src}
            />
            <Artwork priority asset={featured.hero} />
          </picture>
        </motion.div>
        <div className="featured-caption">
          <span className="featured-label">
            <Sparkles size={14} /> FEATURED WALLPAPER
          </span>
          <h1 className="sr-only">{featured.quote}</h1>
          <Link className="button primary" href={`/wallpaper/${featured.slug}`}>
            Preview wallpaper <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="format-chip">
          <span className="format-chip-icons">
            <Smartphone size={21} />
            <Monitor size={27} />
          </span>
          <span>
            Your inspiration.
            <br />
            <strong>Every screen.</strong>
          </span>
        </div>
      </section>
      <div className="under-hero">
        <p>A fresh perspective, wherever life takes you.</p>
        <a href="#daily" className="inline-link">
          {isToday ? "Explore today’s five" : "Explore the latest five"}{" "}
          <ArrowDown size={15} />
        </a>
      </div>
      <section id="daily" className="daily-section" data-sc-act="flow">
        <div className="section-heading">
          <div>
            <h2>
              {isToday ? "Today’s five." : "The latest five."}
              <span className="orange"> Your next spark.</span>
            </h2>
            <p>Five original reminders. Find the one that feels like you.</p>
          </div>
          <span className="collection-count">
            05 <span>WALLPAPERS</span>
          </span>
        </div>
        <Gallery posts={collection.posts} daily />
      </section>
      <section className="mood-section" data-sc-act="flow">
        <div className="section-heading">
          <h2>What do you need today?</h2>
          <Link href="/explore" className="inline-link">
            All themes <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="mood-rail">
          {moods.map((m) => (
            <Link
              key={m.name}
              className="mood"
              href={`/explore?themes=${m.name}`}
            >
              <span className="mood-symbol" aria-hidden="true">
                {m.symbol}
              </span>
              <span>
                <strong>{m.name}</strong>
                <small>{m.hint}</small>
              </span>
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </div>
      </section>
      <section className="archive-section" data-sc-act="flow">
        <div className="section-heading">
          <div>
            <h2>Good words don’t expire.</h2>
            <p>A little inspiration from the days before.</p>
          </div>
          <Link href="/explore" className="inline-link">
            Explore the archive <ArrowRight size={17} />
          </Link>
        </div>
        <div className="archive-grid">
          {earlier.map((p) => (
            <Link
              href={`/explore?date=${p.publishedAt}`}
              key={p.id}
              className="archive-link"
            >
              <Artwork asset={p.thumbnail} />
              <div>
                <span>{dateLabel(p.publishedAt)}</span>
                <strong>Another day. Another possibility.</strong>
                <small>
                  5 wallpapers <ArrowUpRight size={16} />
                </small>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <div className="closing-note">
        <Sparkles size={20} />
        <p>Make room for a little inspiration.</p>
        <span>
          <Check size={14} /> Free to download. Yours to keep.
        </span>
      </div>
    </main>
  );
}
