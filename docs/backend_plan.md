# Python backend and frontend integration plan

Resolved implementation specification, September 28, 2026. This supersedes the earlier planning defaults. See [setup and operations](backend-setup.md) and [verification](backend-verification.md) for execution status.

## Architecture

Retain the existing Next.js UI. Use Python 3.12/FastAPI for application APIs and the existing Supabase project `bekwpoafbkvpzobffvax` for PostgreSQL, Auth and Storage. Keep one repository with separate frontend/backend dependencies and deployable services.

The browser uses Supabase Auth for Google/email login and token refresh, FastAPI for application data and Storage for public files. Next.js server components call FastAPI for public rendering. Do not introduce Flask, SQLAlchemy, custom passwords or a parallel HttpOnly-session system.

Configuration is split between public URL/key settings and server-only administrative credentials. The supplied publishable key cannot administer users or apply migrations. All dependency resolutions are committed in lockfiles.

## Database and access rules

Use SQL migrations as the only schema history. Tables: profiles, posts, post_assets, collections, collection_posts, likes, saves and post_stats. Private administrative tables: publishing_audit and account_deletion_jobs.

- Stable UUID identities; unique slugs; unique user/post reactions; ordered unique collection membership.
- UTC editorial dates. Exactly five approved posts per published collection. No future or draft rows in public responses.
- Profiles reference Supabase Auth identities. User deletion cascades profile and reactions.
- Explicit grants and RLS on exposed tables. Users can read/change only their own account data; profile changes cannot alter identity or authorization.
- Private like/save relationships and public aggregate totals. Transactional triggers maintain totals; operator reconciliation repairs drift.
- Deletion jobs block further account mutations. Privileged trigger helpers remain in the private schema with fixed search paths and revoked client execution.
- Public reads, user-scoped writes and administrative operations use distinct credentials/clients. Request-scoped clients prevent cross-user session leakage.

## API specification

All application paths use `/api/v1`, typed camelCase responses and safe structured errors with request IDs.

| Endpoint | Behavior |
| --- | --- |
| GET /posts | Search, theme OR, style/date, newest/liked sorting, selected/excluded IDs, offset/limit |
| GET /posts/{slug} | Published wallpaper or 404 |
| GET /collections/daily | Latest eligible collection; nullable date and empty posts when none |
| GET /collections | Archive summaries with representative artwork |
| GET/PATCH /me | Profile and counts; updates restricted to display name/themes |
| GET /me/liked, /me/saved | Paginated private published collections |
| GET /me/reactions | Flags for up to 100 visible post IDs |
| PUT /me/likes/{id}, /me/saves/{id} | Idempotent explicit desired state with canonical flags/counts |
| DELETE /me | Confirmed, recently authenticated account deletion; pending/complete response |
| GET /health/live, /health/ready | Process and bounded dependency checks |

Default API page size 24, maximum 100, frontend initial batch 8. Stable tie-breakers use IDs. Collections remain browsable beyond 100 total items; changing like totals can change offset-page boundaries, so the UI deduplicates and refreshes ordering.

Use Supabase Python async Data API access; database functions provide atomic mutations/publication. Export FastAPI OpenAPI to generated frontend types.

## Auth and frontend integration

- Google OAuth PKCE callback and email token-hash confirmation. Configure exact redirects, Google credentials, custom SMTP and verified sender before public launch.
- Browser SDK owns session persistence/refresh. API receives bearer tokens and verifies users with Supabase Auth. One coordinated refresh/retry on 401; provider outages remain service errors.
- Public SSR and browser-private account loading. No authenticated response in shared caches.
- Replace sample content/local account services; keep layout, navigation, previews and accessibility behavior.
- Replace profile reaction arrays with counts plus a shared visible-post reaction map. Remove baseline-plus-local like arithmetic.
- Preserve pending guest actions through redirects with a 30-minute expiry and same-browser replay coordination.
- Paginate Explore and private collections, cancel stale requests and ignore old account responses.
- Add empty daily content, remote failures, real sign-in states and deletion confirmation/progress.
- Hosted downloads preserve JPEG validation and format-specific filenames. No production fallback to local samples.

## Publishing and account operations

Private draft bucket and public delivery bucket. Required thumbnail/hero/mobile-hero/mobile/desktop assets; optional WhatsApp/Status. Validate decodable JPEGs, expected dimensions and 20 MiB limit. Store versioned paths/checksums, not signed URLs.

Provide restricted Python commands to validate/import, assemble, publish, withdraw, reconcile, clean old orphan uploads and retry deletions. Import by slug is repeatable; fictional sample engagement is discarded. Editorial/rights approvals are explicit. Verify approvals before public copying, verify copied bytes, then atomically publish database records. Failed uploads remain retryable drafts. No custom admin dashboard or generation worker.

Deletion requires explicit confirmation and an authentication event within five minutes. Persist progress, block further mutations, revoke sessions and delete the Auth identity. Retry pending jobs once per minute without storing user tokens. Only report complete after removal succeeds.

## Implementation order and acceptance

1. Foundation, settings, migrations, grants and RLS: schema replay and isolation pass.
2. Storage/import/publishing: a complete collection imports twice without duplicates and publishes safely.
3. Public APIs and adapters: Today/search/detail/archive/downloads use remote data and handle empty/failure states.
4. Auth/profiles: callback/session lifecycle, profile editing and account switching work.
5. Reactions/private pagination: retries, concurrency, rollback, totals and >100-item browsing work.
6. Deletion/deployment/docs: recovery and release gates are recorded separately from unit tests.

Verification includes API validation, future/draft isolation, cross-user RLS, invalid/expired credentials, upstream failures, concurrent desired-state writes, account-deletion cascades, bad/missing assets, interrupted imports and browser journeys. Use local Supabase for mutating integration tests; never reset the hosted project. Provider and physical-device checks require real verification, not mocks.

## Deployment and release boundaries

Separate Next.js and FastAPI containers behind Nginx, with only the gateway published. Use an external HTTPS ingress, safe logs and gateway rate limits. A controlled deployment job applies migrations before rollout; runtime containers do not migrate on startup. Preserve additive schema compatibility for application rollback.

Release needs administrative credentials, Google/SMTP configuration, production domain/TLS and reviewed artwork. Maintain independent database and Storage backups and rehearse restoration. Container builds, real provider journeys and physical-device checks must be explicitly verified.

Excluded: AI generation, automatic daily scheduling, videos, payments, notifications, recommendations and an admin dashboard.
