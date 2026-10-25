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
function Welcome({ published = false }: { published?: boolean }) {
  return <section className="welcome" aria-labelledby="welcome-title">
    <div className="welcome-copy">
      <h1 id="welcome-title">A little perspective.<br />Every time you look.</h1>
      <p>Find words that meet you where you are. Thoughtfully designed wallpapers for your phone and desktop, free to download.</p>
      <div className="welcome-actions">
        <Link className="button primary" href={published ? "#daily" : "/explore"}>{published ? "Browse the collection" : "Explore wallpapers"}<ArrowRight size={18} /></Link>
        <span><Smartphone size={17} /><Monitor size={19} /> Made for both screens</span>
      </div>
    </div>
    <div className="welcome-note"><Sparkles size={28} /><p>A small reminder.<br />A fresh start.</p><span>Make your screen a space for you.</span></div>
  </section>;
}
function MoodNavigation() {
  return <section className="mood-section" aria-labelledby="mood-title">
    <div className="section-heading"><div><h2 id="mood-title">What do you need today?</h2><p>Start with a feeling. Find your reminder.</p></div><Link href="/explore" className="inline-link">All themes <ArrowUpRight size={17} /></Link></div>
    <div className="mood-rail">{moods.map(m => <Link key={m.name} className="mood" href={`/explore?themes=${m.name}`}><span className="mood-symbol" aria-hidden="true">{m.symbol}</span><span><strong>{m.name}</strong><small>{m.hint}</small></span><ArrowUpRight size={18} /></Link>)}</div>
  </section>;
}
function PublishedToday({
  collection,
  earlier,
}: {
  collection: { date: string; posts: Post[] };
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
  const isToday = new Date().toISOString().slice(0, 10) === collection.date;
  return (
    <main id="main" className="page today-page">
      <Welcome published />
      <div className="edition">
        <span>
          <i className="live-dot" />
          {isToday ? "Today?s collection" : "Latest collection"}
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
            <Sparkles size={14} /> Featured wallpaper
          </span>
          <span className="sr-only">{featured.quote}</span>
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

            </h2>
            <p>Five original reminders. Find the one that feels like you.</p>
          </div>
          <span className="collection-count">
            {String(collection.posts.length).padStart(2, "0")} <span>wallpapers</span>
          </span>
        </div>
        <Gallery posts={collection.posts} daily />
      </section>
      <MoodNavigation />
      {earlier.length > 0 && <section className="archive-section" data-sc-act="flow">
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
      }
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

export function Today({collection,earlier}: {collection:{date:string|null;posts:Post[]};earlier:Post[]}) {
  if (!collection.date || !collection.posts.length) return <main id="main" className="page today-page">
    <Welcome />
    <div className="collection-pending"><span className="empty-symbol"><Sparkles size={26} /></span><div><h2>Your first collection is on its way</h2><p>New wallpapers will appear here once published. In the meantime, explore the themes you connect with.</p></div></div>
    <MoodNavigation />
    <div className="closing-note"><Check size={20} /><p>Free to download. Yours to keep.</p></div>
  </main>;
  return <PublishedToday collection={{date:collection.date,posts:collection.posts}} earlier={earlier}/>;
}
