import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="page">
      <div className="empty-state">
        <span className="orange">404</span>
        <h1>This spark hasn’t landed.</h1>
        <p>
          That page may have moved. There’s more inspiration waiting in the
          collection.
        </p>
        <Link className="button primary" href="/explore">
          Explore wallpapers
        </Link>
      </div>
    </main>
  );
}
