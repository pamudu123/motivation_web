"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, MailCheck, Sparkles } from "lucide-react";
import { accountService } from "@/lib/account";
import { authMessage } from "@/lib/auth";
import { useAccount } from "./providers";
import { Empty } from "./gallery";
export type AuthVariant = "signup" | "signin" | "save";
// Matches the hosted Supabase per-address email frequency; the server limit stays authoritative.
export const RESEND_SECONDS = 60;
const titles: Record<AuthVariant, string> = {
  signup: "Create your free account",
  signin: "Welcome back",
  save: "Sign in to save this wallpaper",
};
export function AuthForm({
  variant,
  returnPath,
  page = false,
  notice,
  onRequested,
}: {
  variant: AuthVariant;
  returnPath: string;
  page?: boolean;
  notice?: { text: string; id: number };
  onRequested?: () => void;
}) {
  const [stage, setStage] = useState<"ready" | "email">("ready");
  const [pending, setPending] = useState<null | "google" | "email">(null);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const shownStage = useRef(stage);
  useEffect(() => {
    // Move focus only when the stage changes, not on (Strict Mode) mount.
    if (shownStage.current === stage) return;
    shownStage.current = stage;
    root.current?.querySelector<HTMLElement>(stage === "email" ? "#auth-title" : "#auth-email")?.focus();
  }, [stage]);
  useEffect(() => {
    if (error) root.current?.querySelector<HTMLElement>("[role=alert]")?.focus();
  }, [error]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);
  async function google() {
    if (pending) return;
    setPending("google"); setError("");
    try {
      await accountService.signIn("google", { returnPath });
      onRequested?.();
      // The browser is leaving for Google; keep the controls disabled.
    } catch (e) { setError(authMessage(e)); setPending(null); }
  }
  async function sendEmail(address: string) {
    if (pending || !address) return;
    setPending("email"); setError("");
    try {
      await accountService.signIn("email", { email: address, returnPath });
      onRequested?.();
      setSentTo(address); setCooldown(RESEND_SECONDS); setStage("email");
    } catch (e) { setError(authMessage(e)); }
    finally { setPending(null); }
  }
  const Heading = page ? "h1" : "h2";
  const progress = pending === "google" ? "Opening Google…" : pending === "email" ? "Sending your sign-in link…" : "";
  return (
    <div className="auth-panel" ref={root}>
      <span className="auth-symbol">
        {stage === "email" ? <MailCheck size={30} /> : <Sparkles size={30} />}
      </span>
      <Heading id="auth-title" tabIndex={-1}>
        {stage === "email" ? "Check your email" : titles[variant]}
      </Heading>
      {stage === "email" ? (
        <div className="email-success">
          <p>
            We sent a sign-in link to <strong>{sentTo}</strong>. Open it on this device to finish. The link works once and expires after an hour. If it hasn’t arrived in a few minutes, check your spam folder.
          </p>
          <button
            className="button primary full"
            disabled={!!pending || cooldown > 0}
            onClick={() => sendEmail(sentTo)}
          >
            {pending ? "Sending…" : cooldown > 0 ? `Resend link in ${cooldown}s` : "Resend link"}
          </button>
          <button
            className="button text-button full"
            disabled={!!pending}
            onClick={() => { setError(""); setStage("ready"); }}
          >
            Use a different email
          </button>
        </div>
      ) : (
        <>
          <p>Save your favourite wallpapers across devices.</p>
          <button className="button google full" disabled={!!pending} onClick={google}>
            <span className="google-mark" aria-hidden="true">G</span>
            {pending === "google" ? "Opening Google…" : "Continue with Google"}
          </button>
          <div className="or">
            <span>or</span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendEmail(email.trim());
            }}
          >
            <label htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              maxLength={254}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <button className="button primary full" type="submit" disabled={!!pending}>
              <Mail size={18} aria-hidden="true" />
              {pending === "email" ? "Sending…" : "Send sign-in link"}
            </button>
          </form>
          <p className="fineprint">
            {variant === "signup"
              ? "No password needed. Already have an account? Continuing signs you in."
              : "No password needed. New here? Continuing creates your free account."}
          </p>
          {page && variant !== "save" && (
            <p className="auth-switch">
              {variant === "signin" ? "New to Daily Spark? " : "Already have an account? "}
              <Link className="inline-link" href={`/${variant === "signin" ? "signup" : "signin"}?next=${encodeURIComponent(returnPath)}`}>
                {variant === "signin" ? "Create a free account" : "Sign in"}
              </Link>
            </p>
          )}
        </>
      )}
      {error && (
        <p className="error-message" role="alert" tabIndex={-1}>
          {error}
        </p>
      )}
      <p className="dialog-status" role="status" aria-live="polite" aria-atomic="true">
        <span key={progress ? "progress" : notice?.id}>{progress || notice?.text}</span>
      </p>
    </div>
  );
}
export function AuthPage({ variant, returnPath }: { variant: Exclude<AuthVariant, "save">; returnPath: string }) {
  const { profile, ready, error, retry } = useAccount();
  const router = useRouter();
  useEffect(() => {
    if (ready && profile) router.replace(returnPath);
  }, [ready, profile, returnPath, router]);
  if (!ready || profile)
    return (
      <main id="main" className="page" aria-busy="true">
        <div className="skeleton skeleton-hero" />
        <span className="sr-only">Checking your account…</span>
      </main>
    );
  if (error)
    return (
      <main id="main" className="page">
        <Empty title="Your account could not load.">
          {error}
          <button className="button primary" onClick={retry}>Try again</button>
        </Empty>
      </main>
    );
  return (
    <main id="main" className="page auth-page">
      <div className="auth-card">
        <AuthForm variant={variant} returnPath={returnPath} page />
      </div>
      <Link className="inline-link" href="/explore">
        Keep browsing wallpapers
      </Link>
    </main>
  );
}
