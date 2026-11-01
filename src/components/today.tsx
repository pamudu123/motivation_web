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
  Check,
  Monitor,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { type Post } from "@/lib/models";
import { dateLabel } from "@/lib/content";
import { Artwork, Gallery } from "./gallery";
// The five daily moods from the design system, each opening the closest catalogue theme.
const moods = [
  { name: "Start", theme: "New Beginnings", hint: "A reason to begin.", color: "var(--mood-start)" },
  { name: "Focus", theme: "Focus", hint: "One clear step.", color: "var(--mood-focus)" },
  { name: "Courage", theme: "Courage", hint: "Go before you're ready.", color: "var(--mood-courage)" },
  { name: "Consistency", theme: "Discipline", hint: "Small efforts count.", color: "var(--mood-steady)" },
  { name: "Reset", theme: "Calm", hint: "Rest is part of it.", color: "var(--mood-reset)" },
];
function WelcomeArt() {
  return <div className="welcome-art" aria-hidden="true">
    <svg viewBox="0 0 420 420">
      <rect className="a-spark" x="0" y="0" width="160" height="300" rx="24" />
      <rect className="a-ink" x="184" y="0" width="236" height="236" rx="24" />
      <text x="232" y="212" fontSize="240">5</text>
      <rect className="a-start" x="184" y="260" width="236" height="72" rx="36" />
      <circle className="a-focus" cx="80" cy="356" r="56" />
      <rect className="a-steady" x="184" y="356" width="112" height="64" rx="24" />
      <rect className="a-reset" x="308" y="356" width="112" height="64" rx="24" />
    </svg>
  </div>;
}
function Welcome({ label, actionHref, actionLabel }: { label: string; actionHref: string; actionLabel: string }) {
  return <section className="welcome" aria-labelledby="welcome-title">
    <div className="welcome-copy">
      <p className="label"><span className="today-dot" aria-hidden="true" />{label}</p>
      <h1 id="welcome-title">Start where<br />you are.</h1>
      <p>Words worth seeing every time you unlock your phone. New each morning, sized for every screen, free to keep.</p>
      <div className="welcome-actions">
        <Link className="button primary" href={actionHref}>{actionLabel}<ArrowRight size={18} /></Link>
        <Link className="button secondary" href="/explore">Browse the archive</Link>
      </div>
    </div>
    <WelcomeArt />
  </section>;
}
function MoodNavigation() {
  return <section className="mood-section" aria-labelledby="mood-title">
    <div className="section-heading"><div><h2 id="mood-title">What do you need today?</h2><p>Start with a feeling.</p></div><Link href="/explore" className="inline-link">All themes <ArrowRight size={17} /></Link></div>
    <div className="mood-rail">{moods.map(m => <Link key={m.name} className="mood" href={`/explore?themes=${encodeURIComponent(m.theme)}`} style={{ "--tile-color": m.color } as React.CSSProperties}><span className="mood-swatch" aria-hidden="true" /><strong>{m.name}</strong><small>{m.hint}</small><ArrowRight size={20} aria-hidden="true" /></Link>)}</div>
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
      <Welcome
        label="Daily motivation for your screen"
        actionHref="#daily"
        actionLabel={isToday ? "See today’s five" : "See the latest five"}
      />
      <div className="edition">
        <span>
          <i className="live-dot" />
          {isToday ? "Today’s collection" : "Latest collection"}
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
            Featured wallpaper
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
            Phone, desktop
            <br />
            <strong>and chat sizes</strong>
          </span>
        </div>
      </section>
      <section id="daily" className="daily-section" data-sc-act="flow">
        <div className="section-heading">
          <div>
            <h2>{isToday ? "Today’s five" : "The latest five"}</h2>
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
                <strong>{dateLabel(p.publishedAt)}</strong>
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
        <p>Five new ones<br />every morning.</p>
        <span>
          <Check size={16} /> Free to download. Yours to keep.
        </span>
      </div>
    </main>
  );
}

export function Today({collection,earlier}: {collection:{date:string|null;posts:Post[]};earlier:Post[]}) {
  if (!collection.date || !collection.posts.length) return <main id="main" className="page today-page">
    <Welcome label="Daily Spark" actionHref="/explore" actionLabel="Explore wallpapers" />
    <div className="collection-pending"><span className="empty-symbol"><Sparkles size={26} /></span><div><h2>Your first collection is on its way</h2><p>New wallpapers will appear here once published. In the meantime, explore the themes you connect with.</p></div></div>
    <MoodNavigation />
    <div className="closing-note"><p>Free.<br />Always.</p><span><Check size={16} /> No account needed to download.</span></div>
  </main>;
  return <PublishedToday collection={{date:collection.date,posts:collection.posts}} earlier={earlier}/>;
}
