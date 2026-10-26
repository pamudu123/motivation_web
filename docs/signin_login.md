# Daily Spark: signup, sign-in, and saved wallpapers

Status: implementation plan only. No application changes are authorised by this document.

Prepared: 26 October 2026.

## 1. First-release decision

Release Daily Spark as a free wallpaper website with optional accounts. Visitors can browse, search, preview, and download without registering. Accounts enable private saved collections across devices.

Use Google OAuth and passwordless email links for both account creation and returning-user sign-in. Do not add passwords, password reset, paid plans, checkout, or subscription infrastructure in this release.

Product language should use “Sign up” for a new account and “Sign in” for returning users. Both entry points share the same authentication implementation. Explain that continuing creates an account if the person is new; do not require them to determine whether an email already exists before continuing.

This is primarily completion and production verification work: the repository already contains most of the authentication and saving backend.

## 2. Existing implementation and remaining work

The following was checked in the local source. This does not establish that hosted providers or production email delivery work.

| Area | Existing implementation | Planned action |
| --- | --- | --- |
| Supabase client | `src/lib/auth.ts`: PKCE, persisted browser session, token refresh | Retain the session model; review failure handling |
| Authentication requests | `src/lib/account.ts`: Google OAuth and email OTP requests | Reuse for signup and sign-in; make new-account behaviour explicit |
| Authentication UI | `src/components/providers.tsx`: shared native dialog | Extract reusable form/state logic for pages and dialog |
| OAuth callback | `/auth/callback`, `src/components/auth-callback.tsx` | Verify successful, cancelled, invalid, and repeated callbacks |
| Email confirmation | `/auth/confirm`, same callback component | Verify templates, token verification, expiry, and safe completion |
| Private account state | `Providers`: profile, reactions, account changes | Preserve isolation and review auth/profile error distinctions |
| API requests | `src/lib/api.ts`: bearer token, coordinated refresh, one retry | Retain; handle exhausted refresh without retry loops |
| Account API | `backend/app/main.py`: profile, saves, reactions, deletion | Reuse existing contracts |
| Persistence | Initial Supabase migration: profiles, saves, RLS | Verify deployed schema before proposing any migration |
| Saved page | `/saved`, `src/components/account-pages.tsx` | Simplify copy and verify all data states |
| Guest save | Expiring pending action in browser storage | Preserve replay; test failures and cancellation |
| Dedicated auth pages | No dedicated signup/sign-in page identified in the reviewed files | Add `/signup` and `/signin` using the shared component |
| Live providers | Setup documentation records verification as outstanding | Inspect hosted configuration and test real users before launch |

Read the relevant installed Next.js guides in `node_modules/next/dist/docs/` before implementing routes, navigation, or page metadata, as required by `AGENTS.md`.

## 3. Architecture

Keep the established Next.js + FastAPI + Supabase architecture.

```text
Next.js browser UI ---- authentication ----> Supabase Auth
        |
        | access token in Authorization header
        v
Same-origin /api/v1 ----> FastAPI ---- user-scoped requests ----> Supabase Postgres

Published wallpaper images ---------------------------------> Supabase Storage
```

Responsibilities:

- Next.js presents pages, handles interaction, and owns the browser session through the Supabase SDK.
- Supabase Auth manages identities, authentication, access tokens, and refresh tokens.
- FastAPI verifies protected requests with Supabase and derives identity from the verified token.
- Supabase Postgres stores profiles and saves, with row-level security enforcing ownership.
- Supabase Storage serves published wallpaper files.

The browser must not gain a second, competing session implementation. Do not introduce custom JWTs, password storage, or HttpOnly-session routes alongside the current browser SDK flow. Any later session-architecture change requires a separate, explicit plan.

Private content remains client-loaded. Public server-rendered pages must not include account-specific data or cache private responses.

## 4. Access rules

| Capability | Guest | Signed in |
| --- | --- | --- |
| Browse, search, preview, download free artwork | Yes | Yes |
| Tap Save | Opens authentication | Saves or removes the item |
| View `/saved` | Shows sign-in invitation | Shows own collection |
| View `/profile` | Shows sign-in invitation | Shows own account |
| Edit display name | No | Yes |
| Sign out or delete account | No | Yes |

Keep existing likes functional if already exposed, but do not expand likes into a new release requirement. Focus new work on signup, sign-in, and saving. Theme preferences are optional and must never block account creation or a pending save.

## 5. Routes and navigation

| Route | Purpose |
| --- | --- |
| `/signup` | New-user entry point |
| `/signin` | Returning-user entry point |
| `/auth/callback` | Complete Google PKCE exchange |
| `/auth/confirm` | Verify email token hash |
| `/saved` | Private saved wallpapers |
| `/profile` | Minimal account controls |
| `/auth/deleted` | Existing account-deletion outcome |

Header: keep “Sign in” secondary to the wallpaper content. The sign-in page links to “Create a free account”; signup links back to “Sign in”. On successful authentication replace the guest control with the account control.

Direct auth pages accept an optional local `next` destination. Validate it with the shared safe-return-path helper before storing or using it. Reject external, protocol-relative, backslash-containing, and auth callback destinations. Do not trust query strings or browser storage as authorisation.

Destination precedence: valid pending-save destination, then explicit safe `next`, then `/saved`. Existing code defaults to `/profile`; harmonise call sites and tests deliberately when changing this behaviour. Do not navigate an already signed-in user away from a page when their profile is still loading or has failed to load.

## 6. Shared authentication UI

Build one reusable authentication component with page and dialog presentations. Avoid duplicating provider calls, validation, resend behaviour, and error handling.

Suggested signup copy:

> Create your free account
>
> Save your favourite wallpapers across devices.
>
> Continue with Google
>
> or
>
> Email address
>
> Send sign-in link

Suggested sign-in heading: “Welcome back”. Suggested save-dialog heading: “Sign in to save this wallpaper”.

Supporting text: “No password needed. New here? Continuing creates your free account.” Include links to the actual privacy notice and terms when available; do not ship placeholder links. Account creation must not subscribe someone to marketing.

Required states:

| State | Behaviour |
| --- | --- |
| Ready | Google and email choices visible |
| Sending email | Disable duplicate submission; announce progress |
| Email requested | Show entered address, delivery guidance, resend, and change-email action |
| OAuth redirect | Disable repeated requests; show progress |
| Verification | Callback announces that sign-in is completing |
| Session established | Load or create profile before private UI is ready |
| Profile unavailable | Show retry; do not pretend the user is signed out |
| Pending save failed | Keep authentication successful; show save-specific retry |
| Authentication failed | Clear plain-language message and a way to restart |

Validate email with browser email input validation and reasonable length limits. Do not automatically alter the address beyond trimming surrounding whitespace. Do not show raw provider messages containing internal details.

The email-request response should not disclose whether an account already exists. A successful request means the request was accepted, not that delivery is guaranteed.

Use a visible resend countdown consistent with configured provider limits. A disabled button is only UX protection; Supabase/server limits remain authoritative. Allow correcting the address without waiting for the countdown.

## 7. Google signup and sign-in

1. Validate and store the intended return destination and any pending save.
2. Start Supabase OAuth with Google and the application's `/auth/callback` redirect.
3. Google authenticates the user and returns through Supabase.
4. The application callback exchanges the PKCE code for a session once.
5. Remove sensitive callback parameters from browser history.
6. Load the account through `/api/v1/me`; create the application profile idempotently if absent.
7. Return to the intended page and apply a valid pending save.

Google configuration:

- Configure a Google OAuth web client with the correct application identity and origins.
- Google's authorised redirect URI is the Supabase Auth callback shown in the Supabase dashboard, not the Next.js callback.
- Enable Google in Supabase and store the client ID/secret there.
- Allow the application callback URL in Supabase's redirect settings.
- Verify Google consent-screen status and whether public users outside a test-user list can authenticate.
- Request only identity scopes needed for sign-in; no Google Drive or other unrelated permissions.

Handle consent denial, missing code, invalid/used code, blocked browser storage, and callback network failures. Review the existing callback's module-level completion promise so failed or later attempts can restart correctly without a stale result, while duplicate exchanges remain prevented.

## 8. Email signup and sign-in

1. User submits an email address.
2. Call Supabase's existing passwordless sign-in method, explicitly allowing account creation for this shared flow.
3. Show a generic email-requested state.
4. The email link opens `/auth/confirm` with a token hash and the expected email verification type.
5. Validate callback parameters and verify them through Supabase.
6. Remove token-bearing URL parameters, then load the profile and return safely.

Retain the repository's token-hash confirmation approach. Do not mix an implicit-fragment email flow into the PKCE browser client.

Production email setup:

- Configure custom SMTP with a verified sending domain and sender address.
- Configure the provider's required DNS authentication records.
- Set Supabase Site URL to the production HTTPS origin.
- Configure the magic-link template for `/auth/confirm?token_hash={{ .TokenHash }}&type=email`, following the existing setup contract.
- Verify the actual first-user signup email template as well as the returning-user magic-link template; do not assume only one template is used.
- Define a staging template/redirect approach that does not send staging users into production. A template using `.SiteURL` always targets that configured origin.
- Test message delivery, spam placement, link expiry, consumed links, resend, and common email clients/link scanners.

Same-browser email completion can recover the pending save from browser storage. Another browser or device can authenticate through the verified link but cannot retrieve the original browser's local pending action. Show the saved collection or another safe destination and allow saving manually. Do not claim the original item was saved.

Do not add cross-device pending-action infrastructure for version 1 unless evidence makes it necessary.

## 9. Profile lifecycle and account identity

Supabase owns the identity in `auth.users`. Application profile data belongs in `public.profiles` with its ID referencing the auth user ID.

Retain the existing lazy profile creation through the authenticated account service. Confirm it is idempotent under concurrent requests. Do not add a second competing profile-creation trigger without a demonstrated need.

Minimum profile: ID, display name, optional theme preferences, timestamps. No password, subscription status, birthday, address, or phone number is needed.

Use an appropriate provider display name or the existing neutral default. Make editing optional. Do not delay saving with mandatory onboarding.

Test using Google and email with the same verified address against the actual Supabase identity-linking configuration. Do not implement client-side merging based on matching email strings. Account linking and recovery must follow supported Supabase behaviour.

## 10. Sessions, sign-out, and failures

- Let the Supabase SDK persist and refresh the session.
- Subscribe to authentication changes, including sign-out in another tab.
- Avoid protected requests until session initialisation is resolved.
- Keep SDK requests outside auth-event callback locks, as the current implementation does.
- Send access tokens only to the application's intended API origin.
- On protected API 401, coordinate one refresh and one retry.
- If refresh fails or the session is invalid, clear private state and offer sign-in; never retry indefinitely.
- A profile/API outage is distinct from an expired session: retain the authenticated state and show retry when appropriate.
- On sign-out or account switch, clear profile, saved flags, private lists, and pending actions associated with the old flow.
- Ignore in-flight responses belonging to an older account/session generation.
- Scope the existing sign-out to the current browser session and label it “Sign out”; do not imply it signs out every device.

Keep keys and tokens out of analytics, error reports, logs, screenshots, and shared URLs. Configure callbacks and gateway logging accordingly. Browser-persisted sessions also require careful XSS prevention: avoid unsafe HTML insertion and review third-party scripts.

## 11. Saved wallpaper persistence

Reuse `public.saves` with `user_id`, `post_id`, and `created_at`. The user/post pair must remain unique. A save is a bookmark relationship, not another image file in Storage.

Reuse the existing API contracts:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/me` | Current profile and private counts |
| `PATCH /api/v1/me` | Update supported profile fields |
| `GET /api/v1/me/reactions?ids=...` | Bounded saved/liked flags for visible posts |
| `PUT /api/v1/me/saves/{postId}` | Set desired save state with `{active: true/false}` |
| `GET /api/v1/me/saved` | Paginated saved wallpapers |
| `DELETE /api/v1/me` | Existing confirmed account-deletion workflow |

The server derives user ID from verified authentication. Never accept a caller-supplied owner ID. Desired-state writes must be idempotent so retries cannot accidentally toggle twice.

Verify whether `/me/saved` currently orders by save time or artwork publication time. Target newest saved first; make any required query change explicit and test pagination with a stable tie-breaker. Show only artwork still eligible for public display. Decide consistent counts and empty states when artwork is withdrawn.

## 12. Guest save replay

Reuse the existing pending-action record: action ID, desired state, wallpaper ID, return path, and 30-minute expiry.

1. Store the save intent before redirecting or opening authentication.
2. Keep only one pending action for version 1; a later explicit save replaces the earlier intent.
3. Validate stored values and expiry on read.
4. After profile loading, replay the desired save under the existing cross-tab lock where available.
5. Remove the pending record only after successful persistence.
6. Display “Wallpaper saved” only after the server confirms it.
7. If replay fails, keep a retry path while the action is valid; do not restart authentication unnecessarily.

Handle missing browser storage by explaining that the user may need to tap Save again after signing in. Expired or deleted artwork should produce a specific unavailable-item outcome, not an endless replay loop.

Review cancellation: close/dismiss should clear an explicitly abandoned save intent, while an actual authentication redirect preserves it. Clear expired actions, clear them on sign-out, and prevent an old abandoned action applying to a later unrelated login.

## 13. Saved page and interaction design

Maintain clear states for authentication loading, signed-out invitation, collection loading, populated results, empty results, pagination, and failure/retry.

Use short copy:

- Heading: “Saved wallpapers”.
- Empty state: “No saved wallpapers yet.”
- Empty action: “Explore wallpapers”.
- Save success: “Wallpaper saved.”
- Remove success: “Removed from saved.”
- Failure: “Couldn’t save this wallpaper. Try again.”

Optimistic changes should restore the affected item's previous state on failure. Keep counts consistent with canonical server responses. Avoid making keyboard focus disappear when removing a card. A request failure must not be shown as an empty collection.

Saving must persist across refresh and devices. Immediate live synchronisation between devices is not required for version 1; reloading or revisiting the collection should retrieve current server state.

## 14. Database security

Retain RLS and explicit grants on profiles and saves. Verify that authenticated users can read/write only their own rows and can only save eligible published posts. Anonymous clients must not access private rows.

Use user-scoped database credentials for normal account operations. Reserve server-only administrative credentials for existing administrative tasks such as account deletion. Never expose them through `NEXT_PUBLIC_` variables.

Use existing cascade rules to clean up profiles/saves when an auth user is deleted. Preserve the existing recent-authentication requirement and retryable deletion job, and verify the full outcome rather than only hiding the profile in the UI.

Schema changes must be new reviewed migrations. Compare local and deployed migration history before applying them; never reset the hosted project for testing.

## 15. Environment and service configuration

| Setting | Location | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend build environment | Public project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Frontend build environment | Public client key |
| `BACKEND_INTERNAL_URL` | Next.js server environment | Internal FastAPI address |
| `APP_ORIGIN` | Application deployment configuration | Canonical HTTPS site origin |
| Supabase URL and publishable key | Backend environment, existing names | User-scoped API access |
| `SUPABASE_SECRET_KEY` | Backend secrets only | Existing administrative operations |
| Google client credentials | Supabase Auth configuration | OAuth provider |
| SMTP credentials | Supabase Auth configuration | Authentication email delivery |

Check exact backend variable names against `backend/.env.example` before implementation. Never place real values in documentation. Rebuild Next.js when public build-time settings change.

Use explicit local, staging, and production redirect allowlists. Do not use a broad wildcard for production. Prefer an isolated staging project; if sharing a project, document redirect and email-template behaviour carefully.

Review Supabase auth rate limits, provider quotas, signup availability, and abuse protection before launch. Introduce CAPTCHA when warranted by exposure/abuse, without making it an unexplained obstacle in the core flow.

## 16. Accessibility and minimal UI

- Use visible labels, semantic forms, email autocomplete, and proper submit buttons.
- Keep inputs readable on mobile and controls comfortably tappable.
- Support keyboard navigation and visible focus.
- Preserve native-dialog Escape, focus containment, and focus restoration.
- Announce progress and errors without repeated or competing live messages.
- Keep email-requested instructions available long enough to read.
- Support reduced motion and adequate colour contrast.
- Provide a browsing exit from full-page authentication.
- Use functional words on authentication screens; reserve motivational content for the wallpaper experience.

## 17. Implementation sequence

1. Audit the existing source, deployed schema, provider settings, and remaining release gaps. Do not rebuild working infrastructure.
2. Read installed Next.js guidance; define shared auth state and safe-return behaviour.
3. Extract shared authentication UI and add `/signup` and `/signin`.
4. Complete callback recovery, profile loading, resend, cancellation, and session-failure states.
5. Complete guest-save replay and saved-page behaviour, including sorting and ownership.
6. Configure staging Google, SMTP, templates, and redirects.
7. Run targeted automated checks and real-provider browser verification.
8. Configure production equivalents and run deployment smoke checks.
9. Update setup, integration, and verification documentation with actual results and outstanding limitations.

## 18. Acceptance tests and evidence

| Scenario | Required result |
| --- | --- |
| Guest browsing/download | No registration barrier |
| First Google authentication | One identity/profile; correct destination |
| Returning Google authentication | Existing profile and saves retained |
| First email authentication | Correct delivered template; usable account |
| Returning email authentication | Same existing account; no duplicate profile |
| Expired, used, malformed link | Clear recovery; no false signed-in state |
| Google denied/cancelled | Retry available; browsing remains possible |
| Guest Save then authentication | Correct item saved once after success |
| Cancelled guest save | No later unintended save |
| Email opened elsewhere | Authentication works; no false pending-save success |
| Resend and repeated clicks | Duplicate requests controlled; limits handled |
| Concurrent tabs/callbacks | No duplicate mutation; no stale account state |
| Reload and browser restart | Session and saved collection behave as configured |
| Session refresh failure | No loop; private state cleared as appropriate |
| Profile/API outage | Recoverable error, distinct from signed-out state |
| Save network failure | Optimistic state rolls back; retry works |
| Multiple users | Each sees only their own private data |
| Forged owner ID/direct data requests | Denied by API validation and RLS |
| Withdrawn wallpaper | No unpublished content leak; consistent collection/counts |
| Malicious return URL | Cannot redirect outside the app |
| Sign-out/account switch | Previous private state never appears |
| Account deletion | Confirmed cleanup, retry handling, and sign-out |
| Mobile/keyboard/screen reader | Forms, dialog, status, and errors usable |

Reuse existing service tests, database checks, backend verification, and browser workflows; add focused coverage for changed behaviour. Use `npm run typecheck`, `npm test`, `npm run test:db`, and `npm run test:e2e` as applicable, with documented test environments. Follow backend verification instructions for Python/API checks.

Fixture authentication is evidence for UI integration only. It does not prove Google configuration, real email delivery, cross-device links, or production redirects. Record those checks separately with real test accounts and without retaining sensitive links/tokens.

## 19. Release criteria

Release when guests can browse/download, real Google and email users can create/access accounts, pending saves complete reliably, saved collections persist across devices, and isolation/failure checks pass. Verify production HTTPS, callbacks, sender setup, account deletion, and mobile behaviour before claiming readiness.

Track authentication requests/completions, callback failures, save failures, and profile/API errors using privacy-conscious events without email addresses, credentials, or callback query strings. Report email request acceptance separately from confirmed sign-in.

No paid-plan UI or infrastructure is part of this work. Theme onboarding, folders, social profiles, automatic device wallpaper changes, and live cross-device updates can wait.

## 20. References

- [Existing backend setup](backend-setup.md)
- [Existing frontend integration contract](frontend-integration.md)
- [Existing backend verification](backend-verification.md)
- [Supabase passwordless email authentication](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Supabase Google authentication](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)

Recheck provider documentation and installed SDK behaviour when implementing; hosted configuration was not inspected while preparing this plan.
