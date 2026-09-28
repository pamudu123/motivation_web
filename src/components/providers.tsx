"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { Check, Mail, Sparkles, X } from "lucide-react";
import { accountService } from "@/lib/account";
import { authClient, readPending, PENDING_KEY } from "@/lib/auth";
import { focusMain } from "@/lib/focus";
import { themes, type Profile, type Theme, type Reaction, type Post } from "@/lib/models";
type Kind = "liked" | "saved";
type AccountContext = {
  profile: Profile | null; ready: boolean; busy: string | null; error: string;
  reactions: Record<string, Reaction>; revision: number;
  register: (post: Post) => void; retry: () => void;
  openAuth: () => void; react: (kind: Kind, id: string) => void;
  signOut: () => Promise<void>; update: (name: string, selected: Theme[]) => Promise<boolean>;
  notify: (message: string) => void;
};
const Context = createContext<AccountContext | null>(null);
export function useAccount() { return useContext(Context)!; }
export function Providers({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [auth, setAuth] = useState(false);
  const [toast, setToast] = useState({text: "", id: 0});
  const [reactions, setReactions] = useState<Record<string, Reaction>>({});
  const [revision, setRevision] = useState(0);
  const [retryId, setRetryId] = useState(0);
  const epoch = useRef(0);
  const lock = useRef(false);
  const currentUser = useRef<string | null>(null);
  const knownPosts = useRef(new Map<string, Post>());
  const queue = useRef(new Set<string>());
  const versions = useRef(new Map<string, number>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((text: string) => setToast(t => ({text, id: t.id+1})), []);
  const register = useCallback((post: Post) => {
    knownPosts.current.set(post.id, post);
    queue.current.add(post.id);
    if (timer.current) return;
    timer.current = setTimeout(async () => {
      timer.current = null;
      const ids = [...queue.current]; queue.current.clear();
      if (!currentUser.current) return;
      const generation = epoch.current;
      const captured = new Map(ids.map(id=>[id,versions.current.get(id)??0]));
      try {
        for (let i=0; i<ids.length; i+=100) {
          const rows = await accountService.reactions(ids.slice(i,i+100));
          if (generation !== epoch.current) return;
          setReactions(old => { const next = {...old}; for (const r of rows) if(captured.get(r.postId)===(versions.current.get(r.postId)??0)) next[r.postId] = r; return next; });
        }
      } catch { if (generation === epoch.current) notify("Your reactions could not load. Refresh to retry."); }
    }, 40);
  }, [notify]);
  useEffect(() => {
    let live = true;
    const clear = () => {
      epoch.current++; currentUser.current = null; setError(""); versions.current.clear(); setProfile(null); setReactions({}); lock.current=false; setBusy(null);
    };
    const sync = async (uid: string | null) => {
      if (uid !== currentUser.current) clear();
      currentUser.current = uid;
      const generation = epoch.current;
      if (!uid) { setReady(true); return; }
      setReady(false); setError("");
      try {
        let p = await accountService.read();
        if (!live || generation !== epoch.current) return;
        const pending = readPending();
        if (pending && p && !window.location.pathname.startsWith("/auth/")) {
          const apply = async () => {
            if (readPending()?.id !== pending.id) return;
            await accountService.react(pending.kind, pending.postId, true);
            localStorage.removeItem(PENDING_KEY);
          };
          try {
            if (navigator.locks) await navigator.locks.request("spark-pending", apply); else await apply();
            p = await accountService.read();
          } catch { notify("Signed in, but your pending action could not be saved. Please try again."); }
        }
        if (!live || generation !== epoch.current) return;
        setProfile(p); setAuth(false); setRevision(v=>v+1);
        for (const post of knownPosts.current.values()) register(post);
      } catch (e) {
        if (live && generation === epoch.current) setError(e instanceof Error ? e.message : "Your account could not load.");
      } finally { if (live && generation === epoch.current) setReady(true); }
    };
    let unsubscribe = () => {};
    try {
      const client = authClient();
      void client.auth.getSession().then(({data}) => sync(data.session?.user.id ?? null)).catch(e => {setError(e.message);setReady(true);});
      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
        // Defer SDK calls outside the auth callback lock.
        setTimeout(() => { if (live) void sync(session?.user.id ?? null); },0);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch (e) { setError(e instanceof Error ? e.message : "Sign-in unavailable."); setReady(true); }
    return () => { live=false; epoch.current++; unsubscribe(); if(timer.current) clearTimeout(timer.current); timer.current=null; };
  }, [retryId, register, notify]);
  async function react(kind: Kind, id: string) {
    if (!ready || lock.current) return;
    if (!profile) {
      try { localStorage.setItem(PENDING_KEY, JSON.stringify({id: crypto.randomUUID(), kind, postId:id, active:true, returnPath:window.location.pathname+window.location.search, expires:Date.now()+1800000})); }
      catch { notify("Allow browser storage to keep this action during sign-in."); }
      setAuth(true); return;
    }
    const before = reactions[id];
    if (!before) { const p=knownPosts.current.get(id); if(p) register(p); notify("Please wait for your reactions to load."); return; }
    const generation=epoch.current;
    versions.current.set(id,(versions.current.get(id)??0)+1);
    lock.current=true; setBusy(id);
    const active=!before[kind];
    setReactions(r=>({...r,[id]:{...before,[kind]:active,likeCount:before.likeCount+(kind==="liked"?(active?1:-1):0)}}));
    try {
      const result=await accountService.react(kind,id,active);
      if(generation!==epoch.current) return;
      setReactions(r=>({...r,[id]:result}));
      setProfile(p=>p?{...p,likedCount:result.likedCount,savedCount:result.savedCount}:null);
      setRevision(v=>v+1); notify(active ? (kind==="liked"?"Like added.":"Wallpaper saved.") : "Removed from your collection.");
    } catch { if(generation===epoch.current) {setReactions(r=>({...r,[id]:before}));notify("That change could not be saved. Please try again.");} }
    finally {if(generation===epoch.current){lock.current=false;setBusy(null);}}
  }
  return <MotionConfig reducedMotion="user"><Context.Provider value={{ profile,ready,busy,error,reactions,revision,register,
    retry:()=>setRetryId(v=>v+1), openAuth:()=>setAuth(true), react, notify,
    signOut:async()=>{try{await accountService.signOut();epoch.current++;currentUser.current=null;localStorage.removeItem(PENDING_KEY);setProfile(null);setReactions({});notify("You are signed out.");focusMain();}catch{notify("Sign out failed. Please try again.");}},
    update:async(displayName,selected)=>{const generation=epoch.current;try{const p=await accountService.update({displayName,themes:selected});if(generation!==epoch.current)return false;setProfile(p);notify("Profile updated.");return true;}catch{notify("Your profile could not be saved.");return false;}}
  }}>{children}
  {auth && <AuthDialog onClose={()=>setAuth(false)} notification={toast}/>}
  <div className="toast" role="status" aria-live="polite" aria-atomic="true">{!auth&&toast.text&&<><Check size={18} aria-hidden="true"/><span key={toast.id}>{toast.text}</span><button aria-label="Dismiss notification" onClick={()=>{setToast(t=>({...t,text:""}));focusMain();}}><X size={16}/></button></>}</div>
  </Context.Provider></MotionConfig>;
}

function AuthDialog({
  onClose,
  notification,
}: {
  onClose: () => void;
  notification: { text: string; id: number };
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [opener] = useState(() =>
    typeof document === "undefined"
      ? null
      : (document.activeElement as HTMLElement | null),
  );
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
    ref.current?.querySelector<HTMLHeadingElement>("#auth-title")?.focus();
  }, [stage]);
  useEffect(() => {
    if (error) ref.current?.querySelector<HTMLElement>("[role=alert]")?.focus();
  }, [error]);
  useEffect(() => {
    ref.current?.showModal();
    ref.current?.querySelector<HTMLHeadingElement>("#auth-title")?.focus();
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
      requestAnimationFrame(() => {
        if (ref.current?.open) return;
        if (opener?.isConnected) opener.focus();
        else focusMain();
      });
    };
  }, []);
  async function enter(method: "google" | "email") {
    if (pending) return;
    setPending(true); setError("");
    try {
      await accountService.signIn(method, email);
      if (method === "email") setStage("email");
    } catch (e) { setError(e instanceof Error ? e.message : "Sign in could not finish. Please try again."); }
    finally { setPending(false); }
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
              setError("");
              if (
                await account.update(
                  account.profile?.displayName || "Spark Explorer",
                  selected,
                )
              )
                dismiss();
              else
                setError(
                  "Your preferences could not be saved. Please try again, or skip this step.",
                );
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
          {stage === "email" ? (
            <div className="email-success">
              <Check />
              <h3>Check your email.</h3>
              <p>
                Open the sign-in link we sent to your email address. It can be used once.
              </p>
              <button
                className="button primary full"
                disabled={pending}
                onClick={() => enter("email")}
              >
                {pending ? "Signing in…" : "Resend magic link"}
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
                onClick={() => enter("google")}
              >
                <span className="google-mark" aria-hidden="true">
                  G
                </span>
                {pending ? "Signing in…" : "Continue with Google"}
              </button>
              <div className="or">
                <span>or use email</span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!pending) void enter("email");
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
                  Send magic link
                </button>
              </form>
              <p className="fineprint">
                No passwords. We use your email to send a secure sign-in link.
              </p>
            </>
          )}
        </>
      )}
      {error && (
        <p className="error-message" role="alert" tabIndex={-1}>
          {error}
        </p>
      )}
      <p
        className="dialog-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span key={notification.id}>
          {pending
            ? "Please wait. Completing your request."
            : notification.text}
        </span>
      </p>
    </dialog>
  );
}
