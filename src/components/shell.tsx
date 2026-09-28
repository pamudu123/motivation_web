"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Bookmark,
  Compass,
  Search,
  Sparkles,
  UserRound,
  Zap,
} from "lucide-react";
import { useAccount } from "./providers";
import { site } from "@/lib/config";
const destinations = [
  { href: "/", label: "Today", icon: Sparkles },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/saved", label: "Saved", icon: Bookmark },
];
export function Header() {
  const pathname = usePathname();
  const { profile, openAuth } = useAccount();
  const router = useRouter();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="header">
        <div className="header-inner">
          <Link href="/" className="wordmark" aria-label={`${site.name} home`}>
            <span className="brand-icon">
              <Zap size={20} fill="currentColor" />
            </span>
            {site.name}
            <span className="brand-dot">.</span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {destinations.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={pathname === href ? "active" : ""}
                aria-current={pathname === href ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="icon-button"
              aria-label="Search wallpapers"
              onClick={() => router.push("/explore?search=")}
            >
              <Search size={21} />
            </button>
            <span className="header-divider" />
            {profile ? (
              <Link
                className="avatar small-avatar"
                aria-label="Your profile"
                href="/profile"
              >
                {profile.displayName.charAt(0).toUpperCase()}
              </Link>
            ) : (
              <button className="button sign-in" onClick={openAuth}>
                Sign in <ArrowUpRight size={16} />
              </button>
            )}
          </div>
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {[
          ...destinations,
          { href: "/profile", label: "Profile", icon: UserRound },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={pathname === href ? "active" : ""}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <Link className="wordmark" href="/">
        <Zap size={19} fill="currentColor" />
        {site.name}
        <span className="brand-dot">.</span>
      </Link>
      <p>{site.tagline}</p>
      <span className="footer-note">Made for your everyday. Always free.</span>
    </footer>
  );
}
