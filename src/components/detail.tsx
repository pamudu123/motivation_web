"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Monitor,
  Share2,
  Smartphone,
  MessageCircle,
  Image as ImageIcon,
  Zap,
} from "lucide-react";
import type { Format, Post } from "@/lib/models";
import { dateLabel, formatLabels } from "@/lib/content";
import { Artwork, Gallery, Reactions } from "./gallery";
import { useAccount } from "./providers";

export function Detail({ post, related }: { post: Post; related: Post[] }) {
  const [format, setFormat] = useState<Format>("mobile");
  const [framed, setFramed] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [shareLink, setShareLink] = useState("");
  const router = useRouter();
  const { notify } = useAccount();
  const asset = post.versions[format];
  useEffect(() => {
    if (window.matchMedia("(min-width: 900px)").matches) setFormat("desktop");
  }, []);
  useEffect(() => {
    if (shareLink) document.getElementById("share-link")?.focus();
  }, [shareLink]);
  async function download() {
    if (!asset || downloading) return;
    setDownloading(true);
    setDownloadError("");
    try {
      const response = await fetch(asset.src);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) throw new Error("Invalid image");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${post.slug}-${format}.jpg`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      notify("Your wallpaper download has started.");
    } catch {
      setDownloadError(
        "The download couldn’t start. Check your connection and try again.",
      );
    } finally {
      setDownloading(false);
    }
  }
  async function share() {
    const url = `${location.origin}/wallpaper/${post.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, text: post.quote, url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      notify("Wallpaper link copied.");
    } catch {
      setShareLink(url);
      notify("Copy the link below to share this wallpaper.");
    }
  }
  const icons = {
    mobile: Smartphone,
    desktop: Monitor,
    whatsapp: MessageCircle,
    status: ImageIcon,
  };
  return (
    <main id="main" className="page detail-page">
      <button
        className="back-link"
        onClick={() => {
          if (window.history.length > 1) router.back();
          else router.push("/explore");
        }}
      >
        <ArrowLeft size={17} />
        Back to collection
      </button>
      <div className="detail-grid">
        <section className="studio" aria-label="Wallpaper preview">
          <div className="studio-top">
            <span>
              <span className="orange">✳</span> SCREEN STUDIO
            </span>
            <label className="frame-switch">
              <input
                type="checkbox"
                checked={framed}
                onChange={(e) => setFramed(e.target.checked)}
              />
              <span>Device preview</span>
            </label>
          </div>
          <div className="preview-stage" data-format={format}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${format}-${framed}`}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className={`device ${format === "desktop" ? "landscape" : "portrait"} ${framed ? `framed ${format === "desktop" ? "monitor-frame" : "phone-frame"}` : "plain-frame"}`}
              >
                {asset ? (
                  <Artwork asset={asset} priority />
                ) : (
                  <div className="image-error">
                    This format isn’t available. Choose another format.
                  </div>
                )}
                {framed && format === "mobile" && (
                  <div className="phone-overlay" aria-hidden="true">
                    <div className="notch" />
                    <span>Sunday, September 27</span>
                    <strong>9:41</strong>
                  </div>
                )}
                {framed && format === "whatsapp" && (
                  <div className="chat-overlay" aria-hidden="true">
                    <div className="chat-header">A little encouragement</div>
                    <span>You've got this.</span>
                    <span>One step at a time.</span>
                  </div>
                )}
                {framed && format === "desktop" && (
                  <div className="desktop-overlay" aria-hidden="true">
                    <Zap size={13} />
                    <span>Make space for what matters</span>
                    <span>9:41</span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <div
            className="studio-bottom"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span>
              {asset
                ? `${formatLabels[format]} · ${asset.width} × ${asset.height} · JPG`
                : "Unavailable format"}
            </span>
            <span>
              {framed
                ? "Device frame is preview only"
                : "Your clean download, just as it is"}
            </span>
          </div>
        </section>
        <section className="detail-panel">
          <div className="detail-date">
            <span>DAILY COLLECTION</span>
            <time dateTime={post.publishedAt}>
              {dateLabel(post.publishedAt)}
            </time>
          </div>
          <h1>
            {post.title}
            <span className="orange">.</span>
          </h1>
          <blockquote>“{post.quote}”</blockquote>
          {post.attribution && <p>{post.attribution}</p>}
          <div className="chips">
            {post.themes.map((t) => (
              <Link
                key={t}
                href={`/explore?themes=${encodeURIComponent(t)}`}
                className="chip"
              >
                {t}
                <ArrowUpRightSmall />
              </Link>
            ))}
          </div>
          <p className="description">{post.description}</p>
          <div className="detail-social">
            <Reactions post={post} expanded />
            <button className="button text-button" onClick={share}>
              <Share2 size={17} />
              Share
            </button>
          </div>
          {shareLink && (
            <label className="share-fallback">
              Copy this link
              <input
                id="share-link"
                readOnly
                value={shareLink}
                onFocus={(e) => e.currentTarget.select()}
              />
            </label>
          )}
          <div className="format-section">
            <h2>Make it yours.</h2>
            <p>One message. A perfect fit for your screen.</p>
            <div
              className="format-options"
              role="group"
              aria-label="Wallpaper format"
            >
              {(Object.keys(post.versions) as Format[]).map((f) => {
                const Icon = icons[f];
                return (
                  <button
                    key={f}
                    aria-pressed={format === f}
                    className={`format-option ${format === f ? "selected" : ""}`}
                    onClick={() => {
                      setFormat(f);
                      setDownloadError("");
                    }}
                  >
                    <Icon size={20} />
                    <span>
                      {formatLabels[f]}
                      <small>
                        {post.versions[f]!.width} × {post.versions[f]!.height}
                      </small>
                    </span>
                    {format === f && <Check size={16} />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="download-bar">
            <span className="mobile-format-label">
              {formatLabels[format]} · JPG
            </span>
            <button
              className="button primary full"
              disabled={!asset || downloading}
              onClick={download}
            >
              <Download size={19} />
              {downloading
                ? "Preparing download…"
                : `Download ${format === "whatsapp" ? "background" : format === "status" ? "Status" : format} wallpaper`}
            </button>
            <span className="download-note">
              <Check size={13} />
              Free. No sign in needed. No watermark.
            </span>
            {downloadError && (
              <p className="error-message" role="alert">
                {downloadError}
              </p>
            )}
          </div>
        </section>
      </div>
      {!!related.length && (
        <section className="related">
          <div className="section-heading">
            <div>
              <h2>A little more of what moves you.</h2>
              <p>More inspiration with a similar feeling.</p>
            </div>
            <Link className="inline-link" href="/explore">
              Explore all <ArrowRight size={17} />
            </Link>
          </div>
          <Gallery posts={related} />
        </section>
      )}
    </main>
  );
}
function ArrowUpRightSmall() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path d="M3 9 9 3M3 3h6v6" />
    </svg>
  );
}
