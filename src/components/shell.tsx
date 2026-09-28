"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { focusMain } from "@/lib/focus";
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
  const previousPath = useRef(pathname);
  const previousHeading = useRef<Element | null>(null);
  useEffect(() => {
    if (previousPath.current === pathname) {
      previousHeading.current = document.querySelector("main h1");
      return;
    }
    previousPath.current = pathname;
    // Wait for streamed route content, without stealing focus on filter changes.
    const focus = () => {
      const heading = document.querySelector("main h1");
      if (!heading || heading === previousHeading.current) return false;
      previousHeading.current = heading;
      if (document.activeElement?.id !== "wallpaper-search") focusMain();
      return true;
    };
    const observer = new MutationObserver(() => {
      if (focus()) observer.disconnect();
    });
    const frame = requestAnimationFrame(() => {
      if (!focus())
        observer.observe(document.body, { childList: true, subtree: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [pathname]);
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={() => {
          const main = document.querySelector<HTMLElement>("main");
          if (main) {
            main.tabIndex = -1;
            main.focus();
          }
        }}
      >
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
              onClick={() => {
                const search = document.getElementById("wallpaper-search");
                if (pathname === "/explore" && search) search.focus();
                else router.push("/explore?search=");
              }}
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
