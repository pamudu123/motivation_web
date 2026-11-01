"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { Check, X } from "lucide-react";
import { accountService } from "@/lib/account";
import { ApiError } from "@/lib/api";
import { authClient, readPending, clearPending, PENDING_KEY } from "@/lib/auth";
import { focusMain } from "@/lib/focus";
import { type Profile, type Theme, type Reaction, type Post } from "@/lib/models";
import { AuthForm, type AuthVariant } from "./auth-form";
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
  const [auth, setAuth] = useState<AuthVariant | null>(null);
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
  const clearRef = useRef(() => {});
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
    clearRef.current = clear;
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
            if (readPending()?.id !== pending.id) return false;
            await accountService.react(pending.kind, pending.postId, true);
            clearPending();
            return true;
          };
          try {
            const applied = navigator.locks ? await navigator.locks.request("spark-pending", apply) : await apply();
            p = await accountService.read();
            if (applied) notify(pending.kind === "saved" ? "Wallpaper saved." : "Like added.");
          } catch (e) {
            if (e instanceof ApiError && e.status === 404) { clearPending(); notify("This wallpaper is no longer available."); }
            else notify(pending.kind === "saved" ? "Signed in, but couldn’t save this wallpaper. Try again." : "Signed in, but your like couldn’t be saved. Try again.");
          }
        }
        if (!live || generation !== epoch.current) return;
        setProfile(p); setAuth(null); setRevision(v=>v+1);
        for (const post of knownPosts.current.values()) register(post);
      } catch (e) {
        if (!live || generation !== epoch.current) return;
        if (e instanceof ApiError && e.status === 401) {
          // The session is exhausted: return to the signed-out state instead of an outage.
          clear(); clearPending(); setReady(true);
          await authClient().auth.signOut({ scope: "local" }).catch(() => {});
          return;
        }
        setError("Your account could not load. Check your connection and try again.");
      } finally { if (live && generation === epoch.current) setReady(true); }
    };
    let unsubscribe = () => {};
    try {
      const client = authClient();
      void client.auth.getSession().then(({data}) => sync(data.session?.user.id ?? null)).catch(() => {setError("Sign-in is unavailable right now. Please try again later.");setReady(true);});
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
      catch { notify("Your browser blocked storage, so tap Save again after signing in."); }
      setAuth(kind === "saved" ? "save" : "signin"); return;
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
      setRevision(v=>v+1);
      notify(kind==="saved" ? (active ? "Wallpaper saved." : "Removed from saved.") : (active ? "Like added." : "Like removed."));
    } catch { if(generation===epoch.current) {setReactions(r=>({...r,[id]:before}));notify(kind==="saved" ? "Couldn’t save this wallpaper. Try again." : "That change could not be saved. Please try again.");} }
    finally {if(generation===epoch.current){lock.current=false;setBusy(null);}}
  }
  return <MotionConfig reducedMotion="user"><Context.Provider value={{ profile,ready,busy,error,reactions,revision,register,
    retry:()=>setRetryId(v=>v+1), openAuth:()=>setAuth("signin"), react, notify,
    signOut:async()=>{try{await accountService.signOut();clearRef.current();clearPending();notify("You are signed out.");focusMain();}catch{notify("Sign out failed. Please try again.");}},
    update:async(displayName,selected)=>{const generation=epoch.current;try{const p=await accountService.update({displayName,themes:selected});if(generation!==epoch.current)return false;setProfile(p);notify("Profile updated.");return true;}catch{notify("Your profile could not be saved.");return false;}}
  }}>{children}
  {auth && <AuthDialog variant={auth} onClose={()=>setAuth(null)} notification={toast}/>}
  <div className="toast" role="status" aria-live="polite" aria-atomic="true">{!auth&&toast.text&&<><Check size={18} aria-hidden="true"/><span key={toast.id}>{toast.text}</span><button aria-label="Dismiss notification" onClick={()=>{setToast(t=>({...t,text:""}));focusMain();}}><X size={16}/></button></>}</div>
  </Context.Provider></MotionConfig>;
}

function AuthDialog({
  variant,
  onClose,
  notification,
}: {
  variant: AuthVariant;
  onClose: () => void;
  notification: { text: string; id: number };
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [opener] = useState(() =>
    typeof document === "undefined"
      ? null
      : (document.activeElement as HTMLElement | null),
  );
  const [returnPath] = useState(() =>
    typeof window === "undefined" ? "/" : window.location.pathname + window.location.search,
  );
  // Once a redirect or email request starts, the pending save must survive the dialog.
  const requested = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  function dismiss() {
    if (!requested.current) clearPending();
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
    const pop = () => {
      // Browser Back is also an explicit dismissal.
      if (!requested.current) clearPending();
      closeRef.current();
    };
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
      <AuthForm
        variant={variant}
        returnPath={returnPath}
        notice={notification}
        onRequested={() => { requested.current = true; }}
      />
    </dialog>
  );
}
