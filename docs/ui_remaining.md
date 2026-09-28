# Remaining UI Work

Reviewed: September 28, 2026.

## Summary

The core frontend demo is built. No major screen from the frontend brief is missing. The remaining work is mainly edge-case handling, release verification, asset delivery, and UI states for future real services. This is a review and backlog only; no UI implementation was changed during this review.

Priorities:

- **P1:** Address before a public release or production integration.
- **P2:** Improve after the main release blockers are handled.
- **Later:** Optional product ideas, not unfinished phase-one requirements.

## Already implemented

- Today: featured design, latest five with the actual publication date, theme discovery and earlier collections.
- Explore: title/quote/theme search, OR theme filters, visual styles, sorting, reset, URL state and load more for the sample catalogue.
- Wallpaper detail: direct links, related posts, selectable quote text, format-specific images, device/plain previews and working downloads.
- Like/save actions, pending guest actions after demo sign-in, Saved, Liked, profile editing and optional theme selection.
- Sharing with native, clipboard and manual-link fallbacks.
- Responsive navigation, reduced motion, keyboard dialog handling, skeletons, empty states, image retry and action failure feedback.

Do not rebuild these screens just to complete this backlog. Improve the existing components.

## 1. Concrete gaps and edge cases

These findings come from source inspection. They are not all reproduced browser defects; acceptance checks below identify what to verify when addressing them.

### P1 — Make the image-free Git checkout usable

**Current:** `.gitignore` excludes wallpaper images, source artwork, screenshots and `src/app/icon.svg`. Content still points to local `/wallpapers/*.jpg` files. The existing machine has those files, but a fresh Git checkout will not. `npm run assets` also requires the ignored source artwork. README wording that committed assets are sufficient is now outdated.

**Remaining:** Decide how developers and deployments obtain assets without tracking images: an external asset bundle or hosted image URLs supplied by the content adapter. Document that setup and the icon strategy; update README and screenshot-evidence wording accordingly. Preserve the decision not to track images.

**Done when:** A fresh checkout can show all sample previews and download every advertised format using documented steps, with no missing-image requests. This requires an asset-delivery decision, not a gallery redesign.

### P1 — Handle a completely empty daily catalogue

**Current:** `Today` reads `collection.posts[0]` and immediately uses its artwork. Daily and archive labels assume five posts. The fixed sample content satisfies this, but an empty or incomplete service response is not safely represented.

**Remaining:** Design a friendly no-published-collection state. Define whether an incomplete batch is rejected by the adapter or displayed honestly; do not show a five-item label for fewer items. Never fall back to a future collection when no published collection exists at or before the requested day.

**Done when:** Zero posts, an incomplete batch and only future-dated posts produce intentional UI instead of a missing-object error or misleading date/count.

**Files:** `src/lib/content.ts`, `src/components/today.tsx`, `src/app/page.tsx`.

### P1 — Remove the 100-item browsing ceiling before growing the catalogue

**Current:** Explore clamps its loaded count to 100. If there are more than 100 matching posts, Load more can remain visible without revealing more items. Private collections also request a maximum of 100 with no pagination UI.

**Remaining:** Implement real pagination or progressive loading for Explore, Saved and Liked. Preserve the filters, loaded position and return-to-gallery experience.

**Done when:** A fixture with more than 100 matching/saved items can be fully browsed, and the control disappears or becomes a clear end state when finished.

**Files:** `src/components/explore.tsx`, `src/components/account-pages.tsx`.

### P2 — Make “Back to collection” reliably return to the site

**Current:** Detail uses browser history whenever `history.length > 1`. That does not prove the previous entry was a gallery; a shared link opened after another website can return there instead.

**Remaining:** Remember a valid in-app collection destination, preserving its filters and scroll position, with `/explore` as the direct-entry fallback.

**Done when:** Gallery entry restores the gallery; external/direct entry returns to Explore instead of unexpectedly leaving the site.

**File:** `src/components/detail.tsx`.

### Completed — Search focus and collapsed-filter feedback

**Fixed September 28, 2026:** Header Search focuses the existing Explore input without changing the query, filters, sorting or pagination. From another route it opens Explore and focuses search on arrival.

An always-visible active-filter summary shows search text, each theme, visual style and date, including when mobile filters are collapsed. Each chip can be removed independently; the badge counts these active constraints. Sorting remains visible separately. Removal preserves other filters and sorting, resets pagination and returns focus to search. Reset clears the summary.

**Verified:** Browser regression checks at 1440px, 390px and 360px cover cross-route/repeated same-page focus, preserved query state, individual removal, Back/refresh restoration, Reset, long-text overflow and automated accessibility. TypeScript and all five service/asset tests pass. This does not replace the pending real-device accessibility review.

**Files:** `src/components/shell.tsx`, `src/components/explore.tsx`.

### P2 — Keep Most liked ordering consistent with displayed counts

**Current:** Cards add the local user's reaction to the sample baseline count. Sorting uses the baseline only. Close counts can therefore display in an order that no longer matches the visible totals.

**Remaining:** Choose a shared count model and refresh/resort consistently after reactions. During API integration, ensure the current user's like is not added twice to server totals.

**Done when:** Near-tied sample counts and like/unlike actions preserve the intended ordering and count across routes.

**Files:** `src/lib/content.ts`, `src/components/gallery.tsx`, `src/components/providers.tsx`.

## 2. Release-quality UI checks still remaining

### P1 — Real devices and browser coverage

The existing automated suite covers headless Chrome, including phone/tablet-sized viewports. That is not a physical-device or Safari/Firefox sign-off.

- Test iPhone Safari, Android Chrome and desktop Firefox/Safari where supported.
- Check actual image downloads, native sharing, returning from external apps and installed wallpaper usability.
- Check browser bars, notches/safe areas, landscape orientation and the on-screen keyboard with filters, profile editing and sign-in open.
- Verify slow connections, offline transitions and recovery without losing selections.

**Done when:** Record the tested devices/browsers and outcomes, fix blockers and document any platform-specific download instructions. Do not present simulated native sharing as real-device evidence.

### P1 — Manual accessibility review

**Remediated and partly verified September 28, 2026:** Added route/action focus recovery, modal-local announcements, persistent feedback, explicit error focus, format/result status, active collection semantics and long-message wrapping. The keyboard-only search -> preview -> demo sign-in -> Save -> download journey passes, alongside 320px reflow, CSS magnification stress checks and interactive-state axe/Chromium accessibility-tree checks. See [accessibility review and release checklist](accessibility-review.md).

**Still pending:** Human-operated NVDA/VoiceOver testing and actual browser-toolbar 200% zoom. DOM/AX-tree inspection cannot prove spoken announcement timing or live screen-reader usability; CSS magnification is not browser zoom. Do not mark this release gate fully complete until those checks are recorded.

**Done when:** A user can search, preview, sign in to the demo, save and download using only a keyboard and a screen reader, with understandable feedback and no trapped or lost focus.

### P2 — Measure loading performance and expand visual regression coverage

Current imagery uses lazy loading and reserved dimensions, but there is no recorded throttled performance budget. Detail uses full download-size assets for preview; gallery images do not have multiple responsive width variants.

- Measure initial artwork loading, layout shifts and interaction responsiveness on a throttled mobile profile before choosing optimizations.
- If needed, add smaller responsive preview variants while keeping original downloads separate.
- Test long titles, long quotes, 40-character names, missing optional formats and large collections.
- Add fixtures for content-service failure, profile-update failure and empty daily content; keep evidence for initial load and recovery states.

**Done when:** Agree and record performance budgets, measure against them, and retain reproducible visual/functional checks for those cases. No performance regression is asserted here without measurement.

### P2 — Complete share-card presentation

Post metadata currently supplies a title and description, but not a dedicated Open Graph/Twitter artwork preview or canonical URL configuration.

**Remaining:** Once the public domain and asset delivery are decided, add per-post share metadata and verify how a real shared link appears. Keep the existing Share action.

**Done when:** A public post link previews the correct title, quote and image rather than a generic site card.

**Files:** `src/app/layout.tsx`, `src/app/wallpaper/[slug]/page.tsx`.

## 3. Backend-dependent UI work — not missing demo functionality

The frontend brief explicitly requested simulated authentication and sample content. These are production integration tasks, not reasons to describe the demo as unimplemented.

| Area | Remaining UI work when real services are available | Dependency |
| --- | --- | --- |
| Google/email sign-in | Redirect/callback, email-sent, expired-link, resend, denied-access and session-expired states; preserve the pending Like/Save across the redirect | Real authentication provider and session contract |
| Profile and private collections | Session restoration, remote loading/retry, authorization failures and canonical reaction state; verify account switching cannot show the previous account's items | Authorized profile/reaction APIs |
| Daily content and search | Remote loading/cancellation, stale-response protection, empty/publishing-day behavior and pagination; consider debouncing requests | Published-content API and editorial date rules |
| Downloads | Test remote asset/CORS failures and correct filenames on supported devices | Storage/CDN or same-origin download endpoint |
| Public account launch | Add genuine privacy/help/account-management destinations after their content and behavior are agreed; do not add dead footer links | Product decisions and approved copy |

Keep the demo labels until real integration exists. Theme preferences currently act as saved preferences and discovery links, not a personalized ranking engine.

## 4. Optional polish and future ideas

These are choices, not launch blockers or promised missing screens:

- Refine gallery-to-detail transitions and the featured quote entrance. Existing motion already covers artwork movement, cards, reactions and format switching; avoid slowing navigation or violating reduced motion.
- Add brief “how to set this wallpaper” help and make the fixed phone clock/date clearly an illustrative preview.
- Add a date picker/calendar for the archive, a Surprise me action or a copy-quote button.
- Consider named personal collections, language editions and gentle personalization after the first release.

Videos, payments, subscriptions, admin screens, image generation, comments, messaging and following remain outside the approved phase-one frontend scope. They should not be added as UI completion tasks.

## Recommended order

1. Resolve asset delivery for an image-free repository and correct setup documentation.
2. Harden empty daily content and pagination; add fixtures for those cases.
3. Complete real-device, cross-browser and manual accessibility checks.
4. Improve return navigation and count consistency; search/filter feedback is complete.
5. Measure performance and finish public share metadata.
6. Integrate real services only when their contracts are ready; then test the production account journey.

## Review evidence

- Compared the supplied frontend brief with `src/components/`, route files and service adapters; consulted [integration notes](frontend-integration.md), [verification notes](frontend-verification.md) and [product ideas](idea.md).
- The September 28 development run at `test-results/run-2026-09-28T03-41-13.369Z/verification.json` records 16 passing browser workflows and no browser exceptions. That result was inspected, not rerun for this documentation-only review.
- Prior verification records TypeScript, five service/asset tests and a production build passing. Those checks do not cover every edge case listed above.
- Images and test-result evidence are now ignored by Git and may exist only in the current workspace; the documentation must not imply that those files will arrive in a fresh clone.
