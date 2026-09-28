# Backend feature plan

Date: September 28, 2026  
Status: Planning only. No backend implementation or frontend redesign is authorized by this document.

## 1. Objective and agreed architecture

Connect the existing Daily Spark frontend to real content, accounts and storage. Keep Next.js for the website, build application APIs in Python/FastAPI, and use Supabase for PostgreSQL, Auth and Storage. Keep both applications in this repository, with separate dependencies and deployment processes.

The existing gallery, detail pages, previews, search, profile, Saved and Liked screens are the starting point. Adapt their services and production states rather than rebuilding them.

| Component | Responsibility |
| --- | --- |
| Next.js | Pages, rendering, navigation, interactions, metadata and API adapters |
| FastAPI | Application validation, authorization, content queries, profile/reaction APIs and publishing workflow |
| Supabase PostgreSQL | Persistent application records, constraints and transactions |
| Supabase Auth | Google/email sign-in, identities, token issuance and session lifecycle |
| Supabase Storage | Hosted previews and downloadable wallpaper variants; private unpublished artwork |

Browser and Next.js server rendering call FastAPI for application data. Authentication uses Supabase Auth. Published images can load directly from Storage. Do not duplicate business rules in Next.js API routes or let the frontend write application tables directly.

Supabase already supplies authentication and storage services; do not build a second password system or file storage service in Python.

## 2. Release scope

### Required for the first production backend

1. Published daily collections, archive/search and individual wallpaper retrieval.
2. Hosted assets for every advertised preview and download format.
3. Real Google and email sign-in, session restoration and sign-out.
4. Profiles and stored theme preferences.
5. Persistent likes and saves, accurate public like counts and private collection pagination.
6. An authenticated operator workflow to upload, review and publish content.
7. Database migrations, authorization, error handling, deployment configuration and operational checks.
8. Account deletion and basic account-support behavior before public account launch.

### Deferred

AI image/quote generation, scheduled generation jobs, videos, payments, subscriptions, named personal collections, recommendations, notifications, multilingual editions, comments, following and a custom admin dashboard. These are separate features, not prerequisites for connecting the existing frontend.

Theme preferences remain saved preferences; they do not imply personalized ranking.

## 3. Content and discovery

### Daily collections

- Store an explicit collection date and ordered post membership.
- Preserve the current UTC editorial-day convention. Store operational timestamps as timezone-aware timestamps; expose `publishedAt` as the existing date string.
- Return the latest visible collection at or before the requested day, never future or draft content. A future query date must not reveal scheduled collections.
- Target five distinct designs. Proposed launch rule: publish a complete five-post collection atomically; an incomplete draft cannot publish. This keeps the current daily-five promise explicit.
- When no eligible collection exists, return an intentional empty result with a nullable date. The frontend must show a no-content state instead of reading the first post unconditionally.
- Keep earlier collections browsable. Do not fabricate today's date when serving an older collection.
- Unpublishing a post in a collection must withdraw that collection or replace the member atomically; do not leave a supposedly complete public collection broken.

### Search and details

- Support text search over title, quote and theme labels; OR matching within selected themes; AND matching across text, theme, style and date constraints.
- Preserve `newest` and `liked` sorting, exact editorial-date filters, excluded post IDs for related content and bounded ID filters where still needed by adapters.
- Use stable tie-breakers, such as publication date and ID. Validate filters and cap page sizes while allowing users to browse beyond 100 total results.
- Start with PostgreSQL queries and suitable indexes. No separate search engine is required for launch.
- Return only published, currently available posts. Unknown/unpublished slugs return 404 publicly.
- Keep slugs stable. Expose explicit asset URLs rather than deriving filenames in the UI.
- Return server-authoritative total like counts, including the signed-in user's like.

**Acceptance:** Search/filter combinations match the documented frontend semantics; more than 100 records can be browsed; empty, missing and future-only catalogues behave intentionally; draft data never appears in public responses.

## 4. Authentication, profiles and account lifecycle

- Configure Supabase Google OAuth and email magic-link sign-in, including development and production callback allowlists.
- Replace demo sign-in controls with real redirects, email-sent/resend, expired-link, cancellation and session-expired states.
- Validate access tokens in FastAPI using supported Supabase verification/JWKS handling, including signature, expiry, issuer and audience. Never trust a client-supplied user ID.
- Create the profile idempotently after first authentication. Use the Supabase Auth user ID as its identity.
- Allow users to edit display name and preferences only. Validate length and allowed themes; do not accept role, ID, liked or saved fields through profile updates.
- Restore sessions after refresh, handle expiry/refresh and clear user-specific caches on sign-out or account switching.
- Preserve a pending like/save across login and apply it once after successful authentication. Validate any return URL as an allowed local route.
- Provide authenticated account deletion, with explicit UI confirmation, cleanup of profile/reactions and deletion of the Auth identity through a privileged server operation. Define retry handling for partial failures across Auth and application data.

### Session transport decision before implementation

Prefer same-origin routing for the website and `/api/v1` to simplify deployment. The integration notes prefer secure HttpOnly cookies; retain that preference unless the selected Supabase SDK flow requires a documented alternative.

Before building authentication, choose and document one complete flow: who handles the callback, where refresh tokens live, how server rendering identifies the user, how FastAPI receives validated credentials and how sign-out behaves. A server-managed cookie flow needs CSRF protection for mutations and a defined refresh owner. A browser-managed token flow needs supported session persistence and bearer-token forwarding. Do not combine fragments of these approaches or reuse demo local-storage session flags.

**Acceptance:** Google and email journeys work end to end; invalid/expired credentials are rejected; account switching exposes no previous user's state; pending actions survive login; users can delete their account through a verified workflow.

## 5. Likes, saves and private collections

- Store likes and saves independently, with a unique `(user_id, post_id)` constraint on each relationship.
- Mutations set an explicit desired state (`active: true/false`) and remain safe under retries and concurrent requests.
- Derive ownership from the verified session. Users cannot inspect or mutate another user's saved/liked collection.
- Return canonical reaction state and updated total likes after mutation. Keep optimistic UI with rollback on failure.
- Remove the frontend's demo behavior that adds a local like to a baseline count. Refresh affected counts and Most liked results consistently.
- Add paginated Saved and Liked queries. Avoid loading an unbounded list of all reaction IDs into every profile response.
- Return current-user reaction flags in a private batched query for visible post IDs, or in authenticated responses that cannot enter shared public caches. Prefer public catalogue responses plus a private batched reaction lookup.
- Hide withdrawn posts from private collection results without leaking their draft details. Define whether retained relationships reappear if a post is republished; proposed default is yes.

**Acceptance:** Repeated writes never duplicate reactions; counts cannot become negative; user A cannot read user B's collections; saved/liked lists work beyond 100 items; displayed counts agree with sorting after refresh.

## 6. Assets and downloads

- Move deployment asset delivery to Supabase Storage so a fresh clone does not depend on ignored local artwork.
- Store separate thumbnail, desktop hero, mobile hero and downloadable versions. Mobile and desktop downloads are required; WhatsApp background and Status are optional.
- Preserve the current JPEG asset contract initially, with dimensions, MIME type and alt text. Advertise a format only after its file is verified.
- Keep unpublished/source artwork in private storage. Only approved delivery images belong in public storage; public URLs are not protected by application authorization.
- Validate actual file type, decodability, size and expected dimensions when importing; use generated/versioned object paths rather than untrusted filenames.
- Ensure remote images support the frontend's fetch-and-blob download flow, MIME checks and required cross-origin access. Test actual browser downloads.
- Upload and verify files before committing a published record. Track and clean up orphaned uploads after failures; Storage writes and database transactions are not one atomic operation.
- Unpublish records immediately from APIs. Define removal and cache-expiry procedures for already-public image URLs; unpublishing cannot retract files already downloaded.
- Keep previews separate from original downloads. Do not include device-frame HTML in downloaded images.
- Document asset provisioning, environment setup and the ignored application-icon strategy for a fresh checkout.

**Acceptance:** A fresh checkout with documented Supabase configuration displays all published artwork and downloads every advertised format without requiring ignored local image files.

## 7. Content operations and publishing

Launch with a restricted Python command/workflow or protected operator API, rather than a new admin UI.

1. Create a draft with title, quote, description, themes, styles and optional verified attribution.
2. Upload prepared image variants and validate metadata and required files.
3. Record attribution/rights review and editorial approval.
4. Assemble five approved posts in a dated, ordered collection.
5. Publish immediately through an atomic database operation after all asset checks pass.
6. Support metadata corrections, versioned asset replacement and controlled unpublishing.

Record operator identity, action, target and timestamp for publishing changes. Operator authorization must be server-controlled, not an editable profile property. Keep privileged Auth/Storage operations separate from ordinary user requests.

Import existing sample metadata and available local artwork through an explicit, repeatable import process. Do not convert fictional demo users/reactions into real accounts or public engagement counts. Start real like totals at zero unless independently verified reaction data exists.

Automatic scheduling can follow later; if added, publication must be idempotent and observable with safe retries. A web request should not perform long image-generation or processing jobs.

**Acceptance:** An authorized operator can publish a complete collection, retry an interrupted import without duplicates and withdraw content; an ordinary user cannot perform those operations.

## 8. Proposed data model

| Entity | Main fields and rules |
| --- | --- |
| Supabase Auth users | Managed identity; do not duplicate passwords |
| `profiles` | Auth user ID, display name, theme preferences, created/updated timestamps |
| `posts` | Stable ID, unique slug, title, quote, optional attribution, description, editorial date, draft/published/withdrawn status, review metadata |
| `post_assets` | Post ID, asset role/format, object path, MIME, dimensions, alt text; one active asset per role/format |
| `collections` | Unique editorial date, publication status and timestamps |
| `collection_posts` | Collection ID, post ID, display position; unique member and position within a collection |
| `likes` | User ID, post ID, timestamp; unique user/post |
| `saves` | User ID, post ID, timestamp; unique user/post |
| `publishing_audit` | Operator identity, action, target, timestamp and limited change metadata |

Use validated theme/style values aligned with `src/lib/models.ts`; fixed arrays are sufficient initially. Normalize into catalogue tables if editorial management requires it later. Keep stable post IDs independent of editable titles.

Define foreign keys, account-deletion cleanup and indexes for publication date, slug, collection membership and user reactions. Start with query-derived like counts; introduce a transactional counter only if measurement justifies it.

Use versioned SQL migrations under `supabase/migrations/` as the schema source of truth. Do not maintain competing SQL and ORM migration histories.

## 9. Proposed API contract

All paths below are proposed, not implemented. Prefix application endpoints with `/api/v1`.

| Method and path | Access | Purpose |
| --- | --- | --- |
| `GET /collections/daily?date=...` | Public | Latest eligible collection; nullable date and empty posts if none |
| `GET /collections` | Public | Paginated archive dates and summaries |
| `GET /posts` | Public | Validated search/filter/sort/offset/limit; posts and total |
| `GET /posts/{slug}` | Public | Published post with explicit asset metadata |
| `GET /me` | Signed in | Current profile and preferences |
| `PATCH /me` | Signed in | Allowed profile fields only |
| `DELETE /me` | Signed in | Confirmed account deletion workflow |
| `GET /me/liked` | Signed in | Paginated liked posts |
| `GET /me/saved` | Signed in | Paginated saved posts |
| `GET /me/reactions?ids=...` | Signed in | Bounded batch of current-user reaction flags |
| `PUT /me/likes/{post_id}` | Signed in | Set desired like state and return canonical state/count |
| `PUT /me/saves/{post_id}` | Signed in | Set desired save state and return canonical state |
| `GET /health/live` | Operations | Process liveness without sensitive details |
| `GET /health/ready` | Operations | Bounded check of dependencies needed to serve requests |

Supabase handles sign-in rather than a custom password endpoint. Auth callback/session endpoints depend on the selected session flow. Operator commands or APIs are separate from this public contract and require restricted access.

Use FastAPI's generated OpenAPI document and typed request/response models. Define a consistent error envelope with a stable code, safe message, optional field errors and request ID. Distinguish invalid input, unauthenticated, forbidden, missing, conflict, rate-limited and unavailable responses.

Preserve the existing `Post` and `Asset` shapes where practical. Explicit integration changes are nullable daily dates, real auth methods, paginated private collections, separate reaction state and authoritative like totals; do not silently claim the current interfaces fit unchanged.

## 10. Security and reliability requirements

- Use a least-privilege data-access strategy. Proposed default: Supabase Data API through the Python client with verified user credentials for user-scoped operations and corresponding RLS policies; use public credentials for public reads.
- Apply RLS and grants to exposed application tables and Storage. Public access sees only published records; user access sees only owned private records; editorial writes require operator authorization.
- Keep service-role/secret credentials server-side and limited to necessary administrative workflows. They can bypass RLS, so FastAPI must explicitly authorize any operation using them.
- If direct PostgreSQL access is selected instead, document database roles and ownership enforcement before implementation; a privileged database connection does not automatically inherit end-user RLS context.
- Bound input lengths, ID batches, pagination sizes, uploads and upstream timeouts. Rate-limit abusive searches, reactions and operator uploads without blocking normal use.
- Configure exact origins if cross-origin deployment is necessary. Add CSRF protection if browser cookies authorize writes.
- Keep authenticated responses out of shared caches. Define public cache expiry/invalidation so publishing, unpublishing and changing counts become visible predictably.
- Log request IDs, timings and safe error details; never log credentials, magic links or full session tokens.
- Select and verify a database backup/restore process and a separate Storage recovery process; do not assume database backups include image bytes.

## 11. Repository and deployment plan

Keep current Next.js files in place. Add `backend/` for the Python application, API routes, services, configuration and tests; add `supabase/migrations/` for schema changes. Keep documentation in `docs/`.

Run Next.js and FastAPI as separate services. Prefer one public origin with `/api/v1` routed to FastAPI, while Supabase remains managed infrastructure. Select hosting and routing before finalizing auth callbacks and cookie settings.

Document separate local, staging and production configuration; public frontend configuration must contain no privileged credentials. Provide example variable names without secrets, repeatable local startup and a migration-before-release procedure. Use one controlled migration job rather than having every API worker migrate at startup.

Keep Python business logic out of Next.js. Thin rendering or session integration in Next.js is acceptable where required by the agreed authentication flow.

## 12. Build sequence and completion gates

| Phase | Deliverable | Completion gate |
| --- | --- | --- |
| 1. Contracts and foundation | API schemas, auth transport decision, FastAPI structure, environments, migrations, RLS | Local/staging startup works; schema and access rules are tested |
| 2. Public catalogue and assets | Repeatable import, Storage setup, daily/search/detail/archive APIs | Existing public screens work with remote data and images; no future/draft leakage |
| 3. Auth and profiles | Google/email flows, session lifecycle, profile and deletion workflows | Real account journeys and user isolation pass |
| 4. Reactions and collections | Idempotent likes/saves, canonical counts, paginated lists | Retries/concurrency and lists beyond 100 items pass |
| 5. Publishing | Restricted upload/review/publish/unpublish workflow and audit | Operator can safely publish a complete collection and recover failed imports |
| 6. Release integration | Frontend adapters, production states, cache/routing configuration, monitoring and recovery documentation | Staging end-to-end checks and release gates pass |

Create launch content only through the validated publishing workflow before release. Integrate frontend adapters as each API becomes ready; the final phase consolidates verification rather than delaying all integration until the end.

## 13. Verification plan

- API/database tests: filters, stable ordering, date boundaries, empty catalogue, publication transactions, unique reactions and input validation.
- Authorization tests: guest access, expired tokens, user A versus user B, ordinary user versus operator, RLS and privileged-operation boundaries.
- Storage/publishing tests: missing required files, invalid assets, incomplete collections, upload failures, retries and withdrawal.
- Integration tests: login -> pending Save -> refresh -> Saved -> unlike/unsave -> sign-out/account switch; profile changes and account deletion.
- Browser checks: remote downloads, callback redirects, slow/failed APIs, optimistic rollback, pagination beyond 100 items and public page rendering/share metadata.
- Operational checks: clean checkout setup, migrations, readiness, safe logs, deployment rollback compatibility and a documented recovery exercise.

Coordinate with the real-device and accessibility gates in `ui_remaining.md`; automated API checks do not complete those UI checks.

## 14. Decisions to settle before their implementation phase

| Decision | Proposed default |
| --- | --- |
| Hosting and routing | Separate Next.js/FastAPI services behind one public origin |
| Session transport | Prefer secure HttpOnly cookies; specify complete Supabase callback/refresh flow first |
| Database access | Python Supabase client/Data API with scoped credentials and RLS |
| Editorial day | UTC, matching current contract |
| Incomplete daily batches | Keep draft until all five posts and required assets are ready |
| Published downloads | Public and available without an account |
| Operator interface | Restricted Python workflow/API; no custom dashboard initially |
| Search/pagination | PostgreSQL filtering with bounded offset pages and stable tie-breakers |
| Generation and scheduling | Manual reviewed publication first; automation later |

These defaults make the plan actionable but are not a claim that services, credentials or hosting have already been configured.

## References

- [Current frontend contracts](frontend-integration.md)
- [Remaining frontend integration and release work](ui_remaining.md)
- [Product concept](idea.md)
- [Current TypeScript models](../src/lib/models.ts)
- [Supabase Auth architecture](https://supabase.com/docs/guides/auth/architecture)
- [Supabase Python client](https://supabase.com/docs/reference/python/installing)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase data security](https://supabase.com/docs/guides/database/secure-data)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
