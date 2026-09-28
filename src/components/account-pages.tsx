"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  Heart,
  LogOut,
  Pencil,
  Sparkles,
} from "lucide-react";
import { useAccount } from "./providers";
import { Gallery, Empty } from "./gallery";
import { contentService } from "@/lib/content";
import { site } from "@/lib/config";
import { themes, type Theme, type Post } from "@/lib/models";
export function Guest({ destination }: { destination: string }) {
  const { openAuth } = useAccount();
  return (
    <main id="main" className="page">
      <div className="guest-state">
        <span className="auth-symbol">
          <Bookmark size={30} />
        </span>
        <span className="eyebrow">YOUR OWN LITTLE CORNER</span>
        <h1>
          Keep a little
          <br />
          <span className="orange">inspiration close.</span>
        </h1>
        <p>
          Sign in to see {destination}, save the words that move you, and make
          this space your own.
        </p>
        <button className="button primary" onClick={openAuth}>
          Try the demo account <ArrowUpRight size={18} />
        </button>
        <Link className="inline-link" href="/explore">
          Just browsing? Explore wallpapers
        </Link>
        <small>Demo account data stays in this browser.</small>
      </div>
    </main>
  );
}
export function CollectionPage({ kind }: { kind: "saved" | "liked" }) {
  const { profile, ready } = useAccount();
  if (!ready) return <AccountLoading />;
  if (!profile) return <Guest destination={`your ${kind} collection`} />;
  return (
    <main id="main" className="page collection-page">
      <div className="page-heading">
        <span className="eyebrow">
          {kind === "saved" ? "JUST FOR YOU" : "THE WORDS THAT RESONATED"}
        </span>
        <h1>
          Your {kind === "saved" ? "saved sparks" : "liked wallpapers"}
          <span className="orange">.</span>
        </h1>
        <p>
          {kind === "saved"
            ? "A private collection of reminders worth keeping."
            : "A little more of what you love."}
        </p>
      </div>
      <div className="collection-tabs">
        <Link className={kind === "saved" ? "active" : ""} href="/saved">
          <Bookmark size={17} />
          Saved <span>{profile.saved.length}</span>
        </Link>
        <Link className={kind === "liked" ? "active" : ""} href="/liked">
          <Heart size={17} />
          Liked <span>{profile.liked.length}</span>
        </Link>
      </div>
      <PrivateGallery ids={profile[kind]} kind={kind} />
    </main>
  );
}
export function ProfilePage() {
  const { profile, ready, signOut, update } = useAccount();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Theme[]>([]);
  const [pending, setPending] = useState(false);
  const [tab, setTab] = useState<"saved" | "liked">("saved");
  if (!ready) return <AccountLoading />;
  if (!profile) return <Guest destination="your profile" />;
  return (
    <main id="main" className="page profile-page">
      <div className="profile-top">
        <div className="avatar">
          {profile.displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <span className="eyebrow">YOUR {site.name.toUpperCase()}</span>
          <h1>{profile.displayName}</h1>
          <p>Collecting a little inspiration, one day at a time.</p>
        </div>
        <button
          className="button secondary"
          onClick={() => {
            setName(profile.displayName);
            setSelected(profile.themes);
            setEditing((v) => !v);
          }}
        >
          <Pencil size={16} />
          {editing ? "Cancel edit" : "Edit profile"}
        </button>
      </div>
      {editing && (
        <form
          className="profile-editor"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return;
            setPending(true);
            if (await update(name.trim(), selected)) setEditing(false);
            setPending(false);
          }}
        >
          <label htmlFor="display-name">Display name</label>
          <input
            id="display-name"
            value={name}
            maxLength={40}
            required
            onChange={(e) => setName(e.target.value)}
          />
          <fieldset>
            <legend>Favourite themes</legend>
            <div className="chips">
              {themes.map((t) => (
                <button
                  type="button"
                  key={t}
                  className={`chip ${selected.includes(t) ? "selected" : ""}`}
                  aria-pressed={selected.includes(t)}
                  onClick={() =>
                    setSelected((s) =>
                      s.includes(t) ? s.filter((v) => v !== t) : [...s, t],
                    )
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>
          <button className="button primary" disabled={pending || !name.trim()}>
            {pending ? "Saving…" : "Save profile"}
          </button>
        </form>
      )}
      <div className="profile-preferences">
        <Sparkles size={18} />
        <span>Favourite themes</span>
        {profile.themes.length ? (
          profile.themes.map((t) => (
            <Link
              className="chip"
              key={t}
              href={`/explore?themes=${encodeURIComponent(t)}`}
            >
              {t}
            </Link>
          ))
        ) : (
          <span className="muted">Add your themes with Edit profile.</span>
        )}
      </div>
      <div
        className="collection-tabs"
        role="group"
        aria-label="Profile collections"
      >
        <button
          className={tab === "saved" ? "active" : ""}
          aria-pressed={tab === "saved"}
          onClick={() => setTab("saved")}
        >
          <Bookmark size={17} />
          Saved <span>{profile.saved.length}</span>
        </button>
        <button
          className={tab === "liked" ? "active" : ""}
          aria-pressed={tab === "liked"}
          onClick={() => setTab("liked")}
        >
          <Heart size={17} />
          Liked <span>{profile.liked.length}</span>
        </button>
      </div>
      <PrivateGallery ids={profile[tab]} kind={tab} />
      <div className="profile-bottom">
        <p>
          Demo profile · Preferences, likes and saves are stored on this browser
          only.
        </p>
        <button className="button secondary" onClick={signOut}>
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </main>
  );
}
function AccountLoading() {
  return (
    <main id="main" className="page" aria-busy="true">
      <div className="skeleton skeleton-hero" />
      <span className="sr-only">Loading your collection…</span>
    </main>
  );
}
function PrivateGallery({
  ids,
  kind,
}: {
  ids: string[];
  kind: "saved" | "liked";
}) {
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const key = ids.join(",");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    contentService
      .search({ ids, limit: 100 })
      .then((result) => {
        if (active) setItems(result.posts);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [key, retry]);
  if (error)
    return (
      <Empty title="Your collection couldn’t load.">
        Your saved choices are still here.
        <button
          className="button primary"
          onClick={() => setRetry((n) => n + 1)}
        >
          Try again
        </button>
      </Empty>
    );
  if (loading && !items.length)
    return (
      <div
        className="skeleton skeleton-hero"
        aria-label="Loading your collection"
        aria-busy="true"
      />
    );
  if (items.length) return <Gallery posts={items} />;
  return (
    <Empty
      title={
        kind === "saved"
          ? "Your collection starts with a spark."
          : "Find a message you love."
      }
    >
      {kind === "saved"
        ? "Tap the bookmark on any wallpaper to keep it here."
        : "Tap the heart on a wallpaper and it will appear here."}
      <Link className="button primary" href="/explore">
        Find your next spark <ArrowUpRight size={17} />
      </Link>
    </Empty>
  );
}
