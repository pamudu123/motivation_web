"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="page">
      <div className="empty-state">
        <h1>We lost the spark for a moment.</h1>
        <p>The collection couldn’t load. Give it another try.</p>
        <button className="button primary" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
