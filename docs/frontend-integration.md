# Frontend integration contract

## Product and navigation

Brand configuration is `src/lib/config.ts`. App Router pages serve `/`, `/explore`, `/wallpaper/[slug]`, `/saved`, `/liked`, `/profile` and missing-page recovery. `/wallpaper/[slug]` is a real route, not a hash or a gallery-only overlay.

Explore uses query parameters `search`, comma-separated `themes`, `style`, `sort` (`newest` or `liked`), `date` (ISO day) and `limit`. Themes match any selected theme; text, style and date narrow the result. Native history integrates with the Next router so Back restores selections and pagination.

## Published content

`src/lib/models.ts` defines `Post`, `Asset`, `Format`, `Theme`, `VisualStyle`, `SearchQuery`, `SearchResult` and the service interfaces. `src/data/designs.json` contains sample source records; `src/lib/content.ts` maps these to the public model.

```ts
interface Asset {
  src: string;              // Local path now, HTTPS CDN URL in production
  width: number;
  height: number;
  type: 'image/jpeg';
  alt: string;
}

// Abbreviated; authoritative definitions are in src/lib/models.ts.
interface Post {
  id: string;
  slug: string;
  title: string;
  quote: string;
  attribution?: string;    // Only verified attributions
  description: string;
  publishedAt: string;     // YYYY-MM-DD, UTC editorial day
  themes: Theme[];
  styles: VisualStyle[];
  thumbnail: Asset;        // 600 × 800 gallery composition
  hero: Asset;             // Wide editorial preview, 1800 × 680 in this demo
  mobileHero: Asset;       // Phone editorial preview, 1080 × 1200
  versions: Partial<Record<Format, Asset>>;
  likeCount: number;
}
```

Mobile and desktop are required by the product contract; WhatsApp background and Status are optional. They are variants of one post, not new posts. In this demo the background version intentionally omits the quote and lowers contrast to keep chat messages readable. Other versions use the same exact quote with a format-appropriate composition. Display quote text remains available as selectable HTML on detail pages.

The frontend calls:

- `daily(date?)`: newest collection at or before a UTC day; returns its actual date and five posts.
- `search(query)`: search, theme OR, style/date/ID filters, optional excluded ID, stable sorting, offset and limit; returns posts and total.
- `bySlug(slug)`: one post or `null`.

Production content should validate these shapes before returning them. A Python publisher can upload image files and emit equivalent metadata. Do not derive URLs from a layout: every rendered asset URL is supplied by the data adapter. Gallery and hero variants should be precomposed, optimized images, not cropped originals with clipped text.

## Accounts and reactions

`AccountService` exposes `read`, `signIn`, `signOut`, `update` and `react`. Its demo adapter uses one stable local user ID. Profile fields are `id`, `displayName`, `themes`, `liked` and `saved`. Current user reaction flags are derived from that profile centrally, avoiding inconsistent per-card state. `Providers` distributes account state and resolves pending guest actions.

For production:

1. Replace simulated Google/email steps with the provider's real redirect or magic-link flow. Remove demo success controls.
2. Use a server-validated session, preferably an HttpOnly secure cookie. Never treat the demo flag as authentication.
3. Store reactions by `(user_id, post_id)` with uniqueness constraints. The mutation should set the desired boolean state, not blindly increment a counter.
4. Return the canonical profile/reaction response. The UI optimistically changes a reaction, then rolls it back if the request fails.
5. Require authorization when reading saved posts or editing a profile. Never expose another user's saved collection.
6. Change like count semantics when wiring a real API: demo `likeCount` is a baseline excluding this demo user's additional like. A production adapter must normalize server totals or update the shared count model to avoid adding that like twice.

Account storage errors are reported. Likes and saves are independent; saves have no public count. Browser storage events synchronize demo account state between tabs.

## Downloads and sharing

Downloads fetch the selected `versions[format].src`, validate the HTTP response and image MIME, and download its blob with the format in the filename. Preview frames, clocks and chat bubbles are HTML layers and never enter the file. Failure shows an error without a success notification.

Cross-origin production storage must allow CORS GET for the frontend origin, send the correct image MIME and support readable responses. Alternatively, provide a same-origin download endpoint with `Content-Disposition: attachment`. That endpoint is outside this frontend. Keep originals separate from thumbnails and enforce future access policies server-side.

Sharing prefers Web Share, then clipboard, then a selectable canonical URL if permissions block the clipboard. User cancellation is not reported as an error.

## Failure and accessibility behavior

App loading and error boundaries cover initial content. Explore has loading, empty and retry states. Artwork has an explicit image failure/retry state. Unknown slugs render a recovery page. Unsupported formats are not offered; the preview also has an unavailable-format guard.

Authentication uses a native modal dialog with focus containment, Escape, backdrop dismissal and focus restoration. Reduced-motion preference disables spatial animations and CSS scroll smoothing. Native document scrolling remains intact. Forms prevent default navigation so the demo email cannot be placed into a URL.

## Deployment

Deploy as a normal Next.js app with Node support (`npm run build`, `npm start`). The homepage resolves its current collection at request time. Public image files need to be included in deployment. Do not ship `assets/source`, `other/`, tests, screenshot artifacts or local tooling as public directories. There are no credentials or production integrations configured.
