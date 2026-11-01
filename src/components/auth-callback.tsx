"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient, authMessage, safeReturnPath, RETURN_KEY } from "@/lib/auth";

// One exchange per callback URL, including React Strict Mode's effect remount.
// A failed attempt is forgotten so a fresh link or code can start again.
let completion: { key: string; promise: Promise<void> } | undefined;
// Messages written here are already plain language; provider errors are mapped.
class CallbackError extends Error {}
function storedReturn() {
  try { return safeReturnPath(localStorage.getItem(RETURN_KEY)); } catch { return safeReturnPath(null); }
}
export function AuthCallback({ email = false }: { email?: boolean }) {
  const [error, setError] = useState("");
  const [retryPath, setRetryPath] = useState("/signin");
  useEffect(() => {
    const key = window.location.pathname + window.location.search;
    if (completion?.key !== key) completion = { key, promise: (async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.has("error")) throw new CallbackError("Sign-in was cancelled or denied. You can try again.");
      const auth = authClient().auth;
      if (email) {
        const token_hash = params.get("token_hash");
        if (!token_hash || params.get("type") !== "email") throw new CallbackError("This email link is incomplete. Request a new one.");
        const { error } = await auth.verifyOtp({ token_hash, type: "email" });
        if (error) throw error;
      } else {
        const code = params.get("code");
        if (!code) throw new CallbackError("The sign-in code is missing. Please start again.");
        const { error } = await auth.exchangeCodeForSession(code);
        if (error) throw error;
      }
      if (!(await auth.getSession()).data.session) throw new CallbackError("Sign-in didn’t create a session. Please start again.");
      const destination = storedReturn();
      try { localStorage.removeItem(RETURN_KEY); } catch {}
      window.history.replaceState({}, "", window.location.pathname);
      window.location.replace(destination);
    })() };
    const current = completion;
    let live = true;
    current.promise.catch(e => {
      if (completion === current) completion = undefined;
      window.history.replaceState({}, "", window.location.pathname);
      if (!live) return;
      setError(e instanceof CallbackError ? e.message : authMessage(e));
      setRetryPath(`/signin?next=${encodeURIComponent(storedReturn())}`);
    });
    return () => { live = false; };
  }, [email]);
  return <main id="main" className="page"><div className="empty-state"><h1>{error ? "Sign-in couldn’t finish." : "Signing you in…"}</h1>{error ? <><p role="alert">{error}</p><Link className="button primary" href={retryPath}>Try again</Link><Link className="inline-link" href="/explore">Keep browsing wallpapers</Link></> : <p role="status">Please wait while we verify your sign-in.</p>}</div></main>;
}
