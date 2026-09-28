"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient, safeReturnPath } from "@/lib/auth";

// One exchange per URL, including React Strict Mode's effect remount.
let completion: Promise<void> | undefined;
export function AuthCallback({ email = false }: { email?: boolean }) {
  const [error, setError] = useState("");
  useEffect(() => {
    completion ??= (async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.has("error")) throw new Error("Sign-in was cancelled or denied. Please try again.");
      const auth = authClient().auth;
      if (email) {
        const token_hash = params.get("token_hash");
        if (!token_hash || params.get("type") !== "email") throw new Error("This email link is invalid. Request a new link.");
        const { error } = await auth.verifyOtp({ token_hash, type: "email" });
        if (error) throw error;
      } else {
        const code = params.get("code");
        if (!code) throw new Error("The sign-in code is missing. Please start again.");
        const { error } = await auth.exchangeCodeForSession(code);
        if (error) throw error;
      }
      if (!(await auth.getSession()).data.session) throw new Error("Sign-in did not create a session.");
      const destination = safeReturnPath(localStorage.getItem("daily-spark-return"));
      localStorage.removeItem("daily-spark-return");
      window.history.replaceState({}, "", window.location.pathname);
      window.location.replace(destination);
    })();
    void completion.catch(e => { window.history.replaceState({}, "", window.location.pathname); setError(e.message || "The link has expired. Please try again."); });
  }, [email]);
  return <main id="main" className="page"><div className="empty-state"><h1>{error ? "Sign-in couldn’t finish." : "Signing you in…"}</h1>{error ? <><p role="alert">{error}</p><Link className="button primary" href="/profile">Return to sign in</Link></> : <p role="status">Please wait while we verify your session.</p>}</div></main>;
}
