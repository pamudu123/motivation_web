# Frontend integration contract

Updated September 28, 2026. The production frontend now connects to FastAPI and Supabase; simulated accounts and browser-local profile storage have been removed.

## Data boundary

Browser application requests use same-origin `/api/v1`. Next.js server rendering uses `BACKEND_INTERNAL_URL` through a server-only adapter. Public content and account responses are fetched without caching. Application code never writes directly to Supabase tables; the Supabase browser SDK is used for Auth only. Published image files load directly from Storage.

`backend/openapi.json` defines the API contract. `npm run api:types` exports it and regenerates `src/lib/api-schema.d.ts`; `src/lib/models.ts` derives its post/account types from that schema while retaining runtime theme/style constants.

## Public content

- `GET /posts`: text, theme OR filters, style, editorial date, newest/liked ordering, excluded/selected IDs, offset and bounded limit. Returns posts, total, offset and limit.
- `GET /posts/{slug}`: published post; 404 maps to missing-page recovery. Upstream failures remain errors.
- `GET /collections/daily`: latest eligible collection at or before the requested UTC date; never reveals future content. Empty result is `{date:null,posts:[]}`.
- `GET /collections`: paginated archive summaries, each with representative artwork. Today requests three earlier summaries instead of scanning a fixed 100-post catalogue.

Post fields remain id, slug, title, quote, optional attribution, description, publishedAt, themes, styles, thumbnail, hero, mobileHero, versions and likeCount. IDs are stable UUIDs. Assets contain explicit HTTPS URLs, dimensions, JPEG MIME and alt text. The versions map advertises only available formats; mobile and desktop are required for publication.

Explore preserves URL filters and requested visible count. It retrieves bounded pages and deduplicates by ID. Requests are cancelled on navigation/filter changes. There is no 100-item total cap. Like changes invalidate ordering; mutable offset pages are not a historical snapshot.

## Accounts and sessions

The Supabase SDK owns browser session persistence/refresh. Google uses a PKCE callback; email links use token-hash confirmation. Protected FastAPI calls send the access token as bearer authorization, retrying once after a coordinated refresh on 401. If that refresh fails, or the retry is still 401, the request fails as a plain 401: the app signs out locally and shows the signed-out state. Any other account-load failure keeps the session and shows retry. Private user data is loaded in the browser; public server-rendered content does not depend on the session.

`/signup` and `/signin` are full-page entry points; Save as a guest opens the same form in a dialog ("Sign in to save this wallpaper"). All three use `AuthForm` (`src/components/auth-form.tsx`) and one shared flow: Google, or a passwordless email link with account creation allowed, so continuing creates the account if the person is new. The form covers ready, sending, Google redirect, email requested (address shown, 60-second resend countdown, change address) and plain-language error states. Raw provider messages are never shown. A signed-in visitor to an auth page is sent to its destination once the profile loads.

Auth pages accept `?next=`. `safeReturnPath` rejects external, protocol-relative, backslash, `/auth/*`, `/signin` and `/signup` destinations and falls back to `/saved`. Destination precedence: valid pending-action return path, then safe `next` (or the dialog's current page), then `/saved`. The callback reports cancelled, missing, expired or used links with a "Try again" link back to `/signin`; a failed exchange can be retried without reloading the tab.

`Profile` contains id, displayName, themes, likedCount and savedCount. It no longer contains every liked/saved ID. Profile updates accept displayName and themes only. Visible-card flags come from a bounded `/me/reactions` request and are stored centrally by post ID.

Like/save PUT requests carry `{active:boolean}`. Responses return canonical liked/saved flags, total likes and private collection counts. Likes include the user's reaction already: the UI must never add an extra local like to a baseline. Optimistic updates roll back only the affected item; responses belonging to an old account generation are ignored.

Saved/Liked screens query `/me/saved` and `/me/liked` with pagination. Sign-out/account switching clears private state. Account-service failures produce retry UI rather than silently displaying another account or demo state.

Pending guest actions contain an action ID, desired state, post ID, local return path and 30-minute expiry. They persist through redirects, are replayed under a browser lock and removed after success. Closing the dialog (close button, Escape, backdrop or browser Back) before requesting sign-in abandons the action; once a Google redirect or email link has been requested it is kept. A replay that returns 404 (artwork withdrawn) is dropped with an "unavailable" message; other failures keep the action for a later retry. Sign-out clears it. Cross-device email login cannot retrieve another device's pending action, and the app does not claim it was saved.

Account deletion requires explicit confirmation and recent authentication. The response reports pending or complete, with a job ID. The user is signed out after acceptance; a server worker retries incomplete deletion jobs.

## Downloads, sharing and accessibility

The existing preview overlays remain HTML only. Downloads fetch the chosen hosted JPEG and verify status/MIME before saving a blob with a format-specific filename. Storage must permit readable cross-origin requests. Failures remain visible without a success notification.

Native sharing, clipboard and manual URL fallback remain available. The sign-in dialog is a native dialog with Escape, focus containment and focus restoration; remote loading/failure states preserve the existing layout and reduced-motion behavior.

## Verification boundaries

See [backend verification](backend-verification.md) and [setup](backend-setup.md). Fixture browser sessions verify UI integration, not Google or SMTP. Earlier demo-era browser scripts retain historical checks and are not the production sign-in suite. Real-device downloads, human screen-reader review, provider configuration and public deployment remain release gates.
