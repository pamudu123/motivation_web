"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MotionConfig } from "motion/react";
import { Bookmark, Check, Mail, Sparkles, X } from "lucide-react";
import { accountService } from "@/lib/account";
import { themes, type Profile, type Theme } from "@/lib/models";
type Intent = { kind: "liked" | "saved"; id: string };
type AccountContext = {
  profile: Profile | null;
  ready: boolean;
  busy: string | null;
  openAuth: () => void;
  react: (kind: Intent["kind"], id: string) => void;
  signOut: () => Promise<void>;
  update: (name: string, selected: Theme[]) => Promise<boolean>;
  notify: (message: string) => void;
};
const Context = createContext<AccountContext | null>(null);
export function useAccount() {
  const value = useContext(Context);
  if (!value) throw new Error("Account provider missing");
  return value;
}

export function Providers({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [auth, setAuth] = useState(false);
  const [toast, setToast] = useState("");
  const intent = useRef<Intent | null>(null);
  const lock = useRef(false);
  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    const read = () =>
      accountService
        .read()
        .then(setProfile)
        .catch(() =>
          notify(
            "Local demo data could not be read. Check browser storage permissions.",
          ),
        )
        .finally(() => setReady(true));
    void read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, [notify]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  async function react(kind: Intent["kind"], id: string) {
    if (!ready || lock.current) return;
    if (!profile) {
      intent.current = { kind, id };
      setAuth(true);
      return;
    }
    lock.current = true;
    setBusy(id);
    const before = profile;
    const active = !profile[kind].includes(id);
    setProfile({
      ...profile,
      [kind]: active
        ? [...profile[kind], id]
        : profile[kind].filter((v) => v !== id),
    });
    try {
      setProfile(await accountService.react(kind, id, active));
      if (kind === "saved")
        notify(
          active
            ? "Added to your saved collection."
            : "Removed from your saved collection.",
        );
    } catch {
      setProfile(before);
      notify("That change could not be saved. Please try again.");
    } finally {
      lock.current = false;
      setBusy(null);
    }
  }
  async function signedIn(next: Profile) {
    setProfile(next);
    const pending = intent.current;
    intent.current = null;
    if (pending) {
      try {
        const updated = await accountService.react(
          pending.kind,
          pending.id,
          true,
        );
        setProfile(updated);
        notify(
          pending.kind === "saved"
            ? "Signed in. Wallpaper saved."
            : "Signed in. Like added.",
        );
      } catch {
        notify(
          "Signed in, but the action could not be saved. Please try again.",
        );
      }
    } else notify("Welcome to your demo account.");
  }
  return (
    <MotionConfig reducedMotion="user">
      <Context.Provider
        value={{
          profile,
          ready,
          busy,
          openAuth: () => {
            intent.current = null;
            setAuth(true);
          },
          react,
          notify,
          signOut: async () => {
            try {
              await accountService.signOut();
              setProfile(null);
              notify("You are signed out.");
            } catch {
              notify("Sign out failed. Please try again.");
            }
          },
          update: async (displayName, selected) => {
            if (!profile) return false;
            try {
              setProfile(
                await accountService.update({
                  ...profile,
                  displayName,
                  themes: selected,
                }),
              );
              notify("Profile updated.");
              return true;
            } catch {
              notify("Your profile could not be saved. Please try again.");
              return false;
            }
          },
        }}
      >
        {children}
        {auth && (
          <AuthDialog
            onClose={() => {
              intent.current = null;
              setAuth(false);
            }}
            onSignedIn={signedIn}
          />
        )}
        <div className="toast" role="status" aria-live="polite">
          {toast && (
            <>
              <Check size={18} />
              {toast}
              <button
                aria-label="Dismiss notification"
                onClick={() => setToast("")}
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>
      </Context.Provider>
    </MotionConfig>
  );
}

function AuthDialog({
  onClose,
  onSignedIn,
}: {
  onClose: () => void;
  onSignedIn: (p: Profile) => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [stage, setStage] = useState<"signin" | "email" | "themes">("signin");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<Theme[]>([]);
  const account = useAccount();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  function dismiss() {
    if (window.history.state?.sparkDialog) window.history.back();
    else closeRef.current();
  }
  function containFocus(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const nodes = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]',
      ),
    );
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        !nodes.includes(document.activeElement as HTMLElement))
    ) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  useEffect(() => {
    if (stage !== "signin")
      ref.current?.querySelector<HTMLHeadingElement>("#auth-title")?.focus();
  }, [stage]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!window.history.state?.sparkDialog)
      window.history.pushState(
        { ...window.history.state, sparkDialog: true },
        "",
        window.location.href,
      );
    const pop = () => closeRef.current();
    window.addEventListener("popstate", pop);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("popstate", pop);
      previous?.focus();
    };
  }, []);
  async function enter(method: "google-demo" | "email-demo") {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const p = await accountService.signIn(method);
      await onSignedIn(p);
      setStage("themes");
    } catch {
      setError(
        "Demo sign in could not finish. Allow browser storage and try again.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="auth-dialog"
      aria-labelledby="auth-title"
      onKeyDown={containFocus}
      onCancel={(e) => {
        e.preventDefault();
        dismiss();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <button
        className="icon-button dialog-close"
        aria-label="Close sign in"
        onClick={dismiss}
      >
        <X />
      </button>
      <span className="auth-symbol">
        <Sparkles size={30} />
      </span>
      {stage === "themes" ? (
        <>
          <h2 id="auth-title" tabIndex={-1}>
            Make it your spark.
          </h2>
          <p>
            Pick a few themes you connect with. You can change these anytime.
          </p>
          <div className="chips">
            {themes.map((t) => (
              <button
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
          <button
            className="button primary full"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              if (
                await account.update(
                  account.profile?.displayName || "Spark Explorer",
                  selected,
                )
              )
                dismiss();
              setPending(false);
            }}
          >
            Save preferences
          </button>
          <button className="button text-button full" onClick={dismiss}>
            Skip for now
          </button>
        </>
      ) : (
        <>
          <h2 id="auth-title" tabIndex={-1}>
            Keep what moves you.
          </h2>
          <p>
            Like the moments that resonate. Save a little inspiration for later.
          </p>
          <div className="demo-note">
            <Bookmark size={16} />
            <span>
              <strong>Try the demo account</strong>
              <br />
              Stored only in this browser. No real Google connection or email
              delivery.
            </span>
          </div>
          {stage === "email" ? (
            <div className="email-success">
              <Check />
              <h3>Your demo link is ready.</h3>
              <p>
                No email was sent. Use the button below to simulate opening a
                magic link.
              </p>
              <button
                className="button primary full"
                disabled={pending}
                onClick={() => enter("email-demo")}
              >
                {pending ? "Signing in…" : "Open demo magic link"}
              </button>
              <button
                className="button text-button full"
                onClick={() => setStage("signin")}
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <button
                className="button google full"
                disabled={pending}
                onClick={() => enter("google-demo")}
              >
                <span className="google-mark" aria-hidden="true">
                  G
                </span>
                {pending ? "Signing in…" : "Continue with Google"}
                <span className="small-label">DEMO</span>
              </button>
              <div className="or">
                <span>or use email</span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!pending) setStage("email");
                }}
              >
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                <button
                  className="button primary full"
                  type="submit"
                  disabled={pending}
                >
                  <Mail size={18} />
                  Create demo magic link
                </button>
              </form>
              <p className="fineprint">
                No passwords. Email is not stored or sent anywhere.
              </p>
            </>
          )}
        </>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </dialog>
  );
}
