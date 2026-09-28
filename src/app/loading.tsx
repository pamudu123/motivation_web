export default function Loading() {
  return (
    <main
      id="main"
      className="page loading-page"
      aria-busy="true"
      aria-label="Loading wallpapers"
    >
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-hero" />
      <div className="gallery">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="skeleton skeleton-card" />
        ))}
      </div>
      <span className="sr-only">Loading your next spark…</span>
    </main>
  );
}
