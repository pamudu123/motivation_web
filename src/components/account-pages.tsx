"use client";
import { useEffect, useRef, useState } from "react";
import { focusMain } from "@/lib/focus";
import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  Heart,
  LogOut,
  Pencil,
  Sparkles,
} from "lucide-react";
import { useAccount } from "./providers";
import { Gallery, Empty } from "./gallery";
import { accountService } from "@/lib/account";
import { site } from "@/lib/config";
import { themes, type Theme, type Post } from "@/lib/models";
export function Guest({ destination }: { destination: string }) {
  const { openAuth } = useAccount();
  return (
    <main id="main" className="page">
      <div className="guest-state">
        <span className="auth-symbol">
          <Bookmark size={30} />
        </span>
        <span className="eyebrow">YOUR OWN LITTLE CORNER</span>
        <h1>
          Keep a little
          <br />
          <span className="orange">inspiration close.</span>
        </h1>
        <p>
          Sign in to see {destination}, save the words that move you, and make
          this space your own.
        </p>
        <button className="button primary" onClick={openAuth}>
          Sign in <ArrowUpRight size={18} />
        </button>
        <Link className="inline-link" href="/explore">
          Just browsing? Explore wallpapers
        </Link>
        <small>Your collections stay private to your account.</small>
      </div>
    </main>
  );
}
export function CollectionPage({ kind }: { kind: "saved" | "liked" }) {
  const { profile, ready, error, retry } = useAccount();
  if (!ready) return <AccountLoading />;
  if (error) return <main id="main" className="page"><Empty title="Your account could not load.">{error}<button className="button primary" onClick={retry}>Try again</button></Empty></main>;
  if (!profile) return <Guest destination={`your ${kind} collection`} />;
  return (
    <main id="main" className="page collection-page">
      <div className="page-heading">
        <span className="eyebrow">
          {kind === "saved" ? "JUST FOR YOU" : "THE WORDS THAT RESONATED"}
        </span>
        <h1>
          Your {kind === "saved" ? "saved sparks" : "liked wallpapers"}
          <span className="orange">.</span>
        </h1>
        <p>
          {kind === "saved"
            ? "A private collection of reminders worth keeping."
            : "A little more of what you love."}
        </p>
      </div>
      <div className="collection-tabs">
        <Link
          aria-current={kind === "saved" ? "page" : undefined}
          className={kind === "saved" ? "active" : ""}
          href="/saved"
        >
          <Bookmark size={17} />
          Saved <span>{profile.savedCount}</span>
        </Link>
        <Link
          aria-current={kind === "liked" ? "page" : undefined}
          className={kind === "liked" ? "active" : ""}
          href="/liked"
        >
          <Heart size={17} />
          Liked <span>{profile.likedCount}</span>
        </Link>
      </div>
      <PrivateGallery key={`${profile.id}-${kind}`} kind={kind} />
    </main>
  );
}
export function ProfilePage() {
  const { profile, ready, signOut, update, error, retry } = useAccount();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Theme[]>([]);
  const [pending, setPending] = useState(false);
  const [tab, setTab] = useState<"saved" | "liked">("saved");
  const editButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (editing) document.getElementById("display-name")?.focus();
  }, [editing]);
  if (!ready) return <AccountLoading />;
  if (error) return <main id="main" className="page"><Empty title="Your account could not load.">{error}<button className="button primary" onClick={retry}>Try again</button></Empty></main>;
  if (!profile) return <Guest destination="your profile" />;
  return (
    <main id="main" className="page profile-page">
      <div className="profile-top">
        <div className="avatar">
          {profile.displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <span className="eyebrow">YOUR {site.name.toUpperCase()}</span>
          <h1>{profile.displayName}</h1>
          <p>Collecting a little inspiration, one day at a time.</p>
        </div>
        <button
          ref={editButton}
          className="button secondary"
          onClick={() => {
            setName(profile.displayName);
            setSelected(profile.themes);
            setEditing((v) => !v);
          }}
        >
          <Pencil size={16} />
          {editing ? "Cancel edit" : "Edit profile"}
        </button>
      </div>
      {editing && (
        <form
          className="profile-editor"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return;
            setPending(true);
            if (await update(name.trim(), selected)) {
              setEditing(false);
              editButton.current?.focus();
            }
            setPending(false);
          }}
        >
          <label htmlFor="display-name">Display name</label>
          <input
            id="display-name"
            value={name}
            maxLength={40}
            required
            onChange={(e) => setName(e.target.value)}
          />
          <fieldset>
            <legend>Favourite themes</legend>
            <div className="chips">
              {themes.map((t) => (
                <button
                  type="button"
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
          </fieldset>
          <button className="button primary" disabled={pending || !name.trim()}>
            {pending ? "Saving…" : "Save profile"}
          </button>
        </form>
      )}
      <div className="profile-preferences">
        <Sparkles size={18} />
        <span>Favourite themes</span>
        {profile.themes.length ? (
          profile.themes.map((t) => (
            <Link
              className="chip"
              key={t}
              href={`/explore?themes=${encodeURIComponent(t)}`}
            >
              {t}
            </Link>
          ))
        ) : (
          <span className="muted">Add your themes with Edit profile.</span>
        )}
      </div>
      <div
        className="collection-tabs"
        role="group"
        aria-label="Profile collections"
      >
        <button
          className={tab === "saved" ? "active" : ""}
          aria-pressed={tab === "saved"}
          onClick={() => setTab("saved")}
        >
          <Bookmark size={17} />
          Saved <span>{profile.savedCount}</span>
        </button>
        <button
          className={tab === "liked" ? "active" : ""}
          aria-pressed={tab === "liked"}
          onClick={() => setTab("liked")}
        >
          <Heart size={17} />
          Liked <span>{profile.likedCount}</span>
        </button>
      </div>
      <PrivateGallery key={`${profile.id}-${tab}`} kind={tab} />
      <DeleteAccount />
      <div className="profile-bottom">
        <p>
          Demo profile · Preferences, likes and saves are stored on this browser
          only.
        </p>
        <button className="button secondary" onClick={signOut}>
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </main>
  );
}
function AccountLoading() {
  return (
    <main id="main" className="page" aria-busy="true">
      <div className="skeleton skeleton-hero" />
      <span className="sr-only">Loading your collection…</span>
    </main>
  );
}
function PrivateGallery({ kind }: { kind: "saved" | "liked" }) {
  const { revision, profile } = useAccount();
  const [items,setItems]=useState<Post[]>([]);
  const [total,setTotal]=useState(0);
  const [pages,setPages]=useState(1);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setError(false);
    async function load(){
      const collected=new Map<string,Post>();
      let count=0;
      for(let page=0;page<pages;page++){
        const result=await accountService.collection(kind,page*8,8,controller.signal);
        for(const p of result.posts)collected.set(p.id,p);
        count=result.total;
        if((page+1)*8>=count)break;
      }
      if(!controller.signal.aborted){
        const focused=document.activeElement as HTMLElement|null;
        const removed=focused?.closest(".gallery-card");
        setItems([...collected.values()]);setTotal(count);
        if(removed)requestAnimationFrame(()=>{if(!focused?.isConnected)focusMain();});
      }
    }
    void load().catch(()=>{if(!controller.signal.aborted)setError(true);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[kind,pages,revision,retry,profile?.id]);
  if(error)return <Empty title="Your collection couldn?t load.">Your choices are still saved.<button className="button primary" onClick={()=>setRetry(v=>v+1)}>Try again</button></Empty>;
  if(loading&&!items.length)return <div className="skeleton skeleton-hero" aria-label="Loading your collection" aria-busy="true"/>;
  if(items.length)return <><Gallery posts={items}/>{pages*8<total&&<button className="button primary" disabled={loading} onClick={()=>setPages(v=>v+1)}>{loading?"Loading?":"Load more"}</button>}</>;
  return <Empty title={kind==="saved"?"Your collection starts with a spark.":"Find a message you love."}>Tap the {kind==="saved"?"bookmark":"heart"} on any wallpaper.<Link className="button primary" href="/explore">Find your next spark <ArrowUpRight size={17}/></Link></Empty>;
}
function DeleteAccount(){
  const { signOut,openAuth }=useAccount();
  const [confirm,setConfirm]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  return <section className="profile-bottom" aria-label="Account management">
    <button className="button secondary" onClick={()=>setConfirm(v=>!v)}>Delete account</button>
    {confirm&&<div><p>This permanently removes your profile, likes and saved collection. Sign in again first if your session is older than five minutes.</p>
    <button className="button secondary" onClick={openAuth}>Sign in again</button>
    <button className="button primary" disabled={busy} onClick={async()=>{
      setBusy(true);setMessage("");
      try{const result=await accountService.deleteAccount();sessionStorage.setItem("daily-spark-deletion",result.status);await signOut();window.location.assign("/auth/deleted");}
      catch(e){setMessage(e instanceof Error?e.message:"Deletion could not be requested.");}finally{setBusy(false);}
    }}>{busy?"Requesting deletion?":"Confirm permanent deletion"}</button><button className="button secondary" onClick={()=>setConfirm(false)}>Cancel</button></div>}
    {message&&<p role="alert">{message}</p>}
  </section>;
}
