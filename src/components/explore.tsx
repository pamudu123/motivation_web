"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDown, Search, SlidersHorizontal, X } from "lucide-react";
import { contentService, dateLabel } from "@/lib/content";
import { themes, styles, type Post } from "@/lib/models";
import { Empty, Gallery } from "./gallery";

export function Explore() {
  const params = useSearchParams();
  const query = params.toString();
  const search = params.get("search") || "";
  const selected = (params.get("themes") || "").split(",").filter(Boolean);
  const style = params.get("style") || "";
  const sort = params.get("sort") === "liked" ? "liked" : "newest";
  const date = params.get("date") || "";
  const [draft, setDraft] = useState(search);
  const [expanded, setExpanded] = useState(false);
  const [result, setResult] = useState<{ posts: Post[]; total: number }>({
    posts: [],
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const limit = Math.max(8, Math.min(100, Number(params.get("limit")) || 8));
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setDraft(search);
  }, [search]);
  useEffect(() => {
    if (params.has("search") && !search) searchRef.current?.focus();
  }, []); // Initial search navigation only.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    contentService
      .search({ search, themes: selected, style, sort, date, limit })
      .then((data) => {
        if (active) setResult(data);
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
  }, [query, retry]);
  function change(key: string, value: string, replace = false) {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "limit") next.delete("limit");
    window.history[replace ? "replaceState" : "pushState"](
      null,
      "",
      `/explore${next.size ? `?${next}` : ""}`,
    );
  }
  function reset() {
    setDraft("");
    window.history.pushState(null, "", "/explore");
  }
  const filtered = !!(search || selected.length || style || date);
  return (
    <main id="main" className="page explore-page">
      <div className="page-heading">
        <span className="eyebrow">THE INSPIRATION ARCHIVE</span>
        <h1>
          Find your next <span className="orange">spark.</span>
        </h1>
        <p>A collection of good words, made for wherever you are.</p>
      </div>
      <div className="search-row">
        <form
          className="search-field"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            change("search", draft);
          }}
        >
          <Search size={21} />
          <input
            ref={searchRef}
            aria-label="Search quotes, titles or themes"
            placeholder="Search quotes, titles or themes…"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              change("search", e.target.value, true);
            }}
          />
          {draft && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setDraft("");
                change("search", "");
                searchRef.current?.focus();
              }}
            >
              <X size={17} />
            </button>
          )}
        </form>
        <button
          className={`button secondary filter-toggle ${expanded ? "selected" : ""}`}
          aria-expanded={expanded}
          aria-controls="explore-filters"
          onClick={() => setExpanded((v) => !v)}
        >
          <SlidersHorizontal size={18} />
          Filters{selected.length > 0 && <span>{selected.length}</span>}
        </button>
      </div>
      <div
        id="explore-filters"
        className={`filter-area ${expanded ? "filters-open" : ""}`}
      >
        <div className="chips theme-filters">
          <button
            className={`chip ${!selected.length ? "selected" : ""}`}
            onClick={() => change("themes", "")}
            aria-pressed={!selected.length}
          >
            All themes
          </button>
          {themes.map((t) => (
            <button
              key={t}
              className={`chip ${selected.includes(t) ? "selected" : ""}`}
              aria-pressed={selected.includes(t)}
              onClick={() =>
                change(
                  "themes",
                  selected.includes(t)
                    ? selected.filter((v) => v !== t).join(",")
                    : [...selected, t].join(","),
                )
              }
            >
              {t}
            </button>
          ))}
        </div>
        <div className="secondary-filters">
          <label>
            Visual style{" "}
            <select
              value={style}
              onChange={(e) => change("style", e.target.value)}
            >
              <option value="">All styles</option>
              {styles.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <span>Choose multiple themes to explore any of them.</span>
        </div>
      </div>
      <div className="results-heading">
        <div>
          <span aria-live="polite">
            {loading ? "Finding your spark…" : `${result.total} wallpapers`}
          </span>
          {date && (
            <span className="date-filter">
              {/^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date))
                ? dateLabel(date)
                : date}
            </span>
          )}
          {filtered && (
            <button className="reset-button" onClick={reset}>
              Reset filters <X size={13} />
            </button>
          )}
        </div>
        <label className="sort-label">
          Sort by{" "}
          <select
            aria-label="Sort wallpapers"
            value={sort}
            onChange={(e) => change("sort", e.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="liked">Most liked</option>
          </select>
        </label>
      </div>
      {error ? (
        <Empty title="The collection couldn’t load.">
          Please try again.
          <button
            className="button primary"
            onClick={() => setRetry((r) => r + 1)}
          >
            Retry collection
          </button>
        </Empty>
      ) : loading && !result.posts.length ? (
        <div className="gallery" aria-busy="true">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton skeleton-card" />
          ))}
        </div>
      ) : result.posts.length ? (
        <>
          <Gallery posts={result.posts} />
          {result.posts.length < result.total && (
            <div className="load-more">
              <p>
                Showing {result.posts.length} of {result.total} wallpapers
              </p>
              <button
                className="button secondary"
                disabled={loading}
                onClick={() => change("limit", String(limit + 8))}
              >
                Load more <ArrowDown size={17} />
              </button>
            </div>
          )}
        </>
      ) : (
        <Empty title="A fresh search might spark something.">
          No wallpapers match those filters.
          <button className="button primary" onClick={reset}>
            Clear all filters
          </button>
        </Empty>
      )}
    </main>
  );
}
