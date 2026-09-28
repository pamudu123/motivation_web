# Backend setup and operations

The website uses Next.js, FastAPI and Supabase. Application data is served through FastAPI; the browser uses Supabase directly for authentication and published image downloads. There is no production fallback to sample JSON or simulated accounts.

## Local development against the hosted project

Requirements: Node 22.19+, npm, Python 3.12 and uv. Docker is only needed for containers or the full local Supabase tests.

1. Run `npm ci` at the repository root.
2. Copy `.env.example` to `.env.local`. Configure the public Supabase URL/key and `BACKEND_INTERNAL_URL`.
3. Copy `backend/.env.example` to `backend/.env`. Configure the Supabase URL/publishable key. `SUPABASE_KEY` is accepted as an alias. Add `SUPABASE_SECRET_KEY` for publishing and account administration; never give it a `NEXT_PUBLIC_` prefix.
4. In `backend/`, run `uv sync --frozen` and `uv run uvicorn app.main:app --reload --port 8000`.
5. At the root, run `npm run dev`. Open `http://localhost:3000`.

The existing project reference is `bekwpoafbkvpzobffvax`. Its initial schema and Storage buckets have been installed. It has no reviewed published content yet, so an intentional empty homepage is expected until content is imported and published.

Actual environment files are ignored. Example files contain placeholders. The supplied publishable key is not an administrative credential.

## Schema lifecycle

`supabase/migrations/` is the sole schema history. Supabase manages the Auth and Storage system schemas. Application tables use RLS and explicit grants; administrative jobs and audit records are in an unexposed `private` schema.

Use the Supabase CLI's current `--help` before running migration commands. Create new changes using `supabase migration new <name>`, test them locally, review the SQL and apply through the authenticated connector or a single controlled deployment job. Never reset the hosted project during tests. The initial migration filename has been aligned with the connector's recorded remote version, `20260928162144`; check history before subsequent pushes.

Public APIs see published posts and collections at or before today's UTC date. Individual likes/saves are private; public counts live in `post_stats` and are maintained transactionally. The two private administrative tables intentionally have RLS enabled with no client policies; the security advisor's informational notice for these tables is expected.

## Configure real authentication

- Enable Google in Supabase Auth and supply Google client credentials. Google's authorized callback is the Supabase Auth callback displayed in the dashboard. Allow the app's `/auth/callback` URL in Supabase redirect settings.
- Set the Auth Site URL to the deployed app origin and allow explicit local/staging/production callback URLs. Do not use a production wildcard.
- Configure custom SMTP and a verified sender. Set the magic-link template to link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
- Set `APP_ORIGIN` to the production HTTPS origin for canonical/share metadata.
- Verify Google redirect, email delivery, expired links, resend behavior and refresh with real accounts before public launch. These provider checks have not yet been performed.

The browser SDK owns token persistence and refresh. FastAPI verifies bearer tokens with Supabase Auth on private requests and forwards user credentials to the Data API. Public server-rendered pages do not contain private account data. Do not add HttpOnly-session handlers alongside this flow.

Pending guest reactions survive a redirect for 30 minutes. Browser locks coordinate replay across tabs. Opening the email link on another device cannot recover the first device's pending action.

## Import and publish artwork

All commands below run in `backend/` and require the server-only secret key except validation and manifest preparation.

```text
uv run python scripts/sample_manifest.py
uv run python -m app.publisher validate sample-manifest.json
uv run python -m app.publisher import sample-manifest.json
uv run python -m app.publisher assemble 2026-09-27 POST_UUID_1 POST_UUID_2 POST_UUID_3 POST_UUID_4 POST_UUID_5
uv run python -m app.publisher publish COLLECTION_UUID --operator editor-name
uv run python -m app.publisher withdraw POST_UUID --post --operator editor-name
uv run python -m app.publisher withdraw COLLECTION_UUID --operator editor-name
uv run python -m app.publisher reconcile
uv run python -m app.publisher cleanup
uv run python -m app.publisher cleanup --apply
uv run python -m app.publisher retry-deletions
```

The generated sample manifest is deliberately unapproved. Review wording, attribution, image rights and artwork, then set `editorialApproved` and `rightsApproved` explicitly before publication. Sample like counts are never imported.

Manifest entries contain `slug`, `title`, `quote`, optional `attribution`, `description`, `themes`, `styles`, `editorialDate`, the two approval booleans and `assets`. Each asset contains `path` relative to the manifest and nonempty `alt` text.

Required asset roles/dimensions: `thumbnail` 600x800, `hero` 1800x680, `mobileHero` 1080x1200, `mobile` 1080x1920, `desktop` 2560x1440. Optional `whatsapp` and `status` are 1080x1920. Files must be decodable JPEGs no larger than 20 MiB.

Import preserves stable post IDs by slug and refuses to modify a currently published post. Withdraw before editing, then reimport and republish. Run one publisher at a time. Publishing verifies stored checksums, copies delivery files to the public bucket and commits the collection atomically. Required images and all five editorial approvals must be present.

Object keys are versioned by content hash. Upload failures leave retryable drafts. Cleanup is a dry run by default and only considers unreferenced objects older than seven days. Do not run cleanup concurrently with publishing. Withdrawal hides catalogue entries; it does not retract public URLs already cached or downloaded. Withdrawing a post also withdraws its containing collection; withdrawing only a collection leaves its individual published posts discoverable.

Images and original artwork are ignored by Git. A fresh checkout obtains published images from Supabase. `npm run assets` still requires a separately supplied local source-artwork bundle. The ignored local `src/app/icon.svg` is optional; provide a deployment icon separately if desired.

## Account deletion

The profile screen requires explicit confirmation. The API requires an authentication event in the preceding five minutes, rather than merely a recently refreshed access token. The user can sign in again from the confirmation UI.

Deletion first records a private job and blocks application mutations. It revokes sessions, deletes the Auth identity and cascades profile/reactions. Partial failures return `pending`, not a false completion. The container worker retries pending jobs every minute; outside Docker, schedule `uv run python -m app.publisher retry-deletions` at the same interval. No user token is stored in job records. Restrict operational access to deletion metadata and logs.

## Verification

```text
npm run typecheck
npm test
npm run test:db
npm run api:types
uv run --project backend ruff check backend
uv run --project backend pytest backend/tests
npm run build
```

`test:db` uses an actual embedded PostgreSQL engine (PGlite) with minimal Auth/Storage fixtures. It tests migration replay, RLS, pagination, publication and counters. It does not certify the real Supabase services.

For the real local stack, start Docker and then run:

```text
npx supabase start --exclude realtime,imgproxy,studio,edge-runtime,logflare,vector,supavisor,postgres-meta
uv run --project backend python backend/scripts/verify_local.py
```

Allow several GiB for the images and database before starting. The script refuses hosted URLs, captures local credentials without printing them, creates isolated test users/artwork and cleans up its records. It exercises real Storage, Auth, API calls, concurrent reactions, RLS and deletion. Local password sign-in is used to obtain test sessions; this is not a production password-login feature or proof of Google/email delivery.

For browser regressions, run the fixture API in one terminal (`node scripts/fixture-api.mjs`) and a separate Next dev server on port 3100 with `BACKEND_INTERNAL_URL=http://127.0.0.1:8101` and `NEXT_DIST_DIR=.next-test`. Then run `npm run test:e2e`. On PowerShell, set these with `$env:NAME='value'` before `npm run dev -- --port 3100`.

The fixture suite verifies public rendering, downloads, >100-item browsing, guest dialog accessibility, a fixture authenticated session, pending save, reload persistence, write rollback, empty/error states and mobile axe checks. It is explicitly not provider verification. Legacy `scripts/verify.mjs` and `scripts/verify-accessibility.mjs` preserve earlier demo-era checks; their simulated-login cases are not compatible with the production authentication flow. Manual screen-reader and physical-device checks remain required.

## Containers and release

Use `docker compose --env-file .env.local config --quiet` to validate configuration. Build/start with `docker compose --env-file .env.local up --build -d`. The gateway listens on port 8080; place it behind a TLS ingress before public use. Only the gateway needs a published port. Rebuild the frontend after changing public Supabase settings.

Run reviewed migrations once before the release, then deploy the application and smoke-test `/api/v1/health/ready`, public content, sign-in and downloads. No container applies migrations automatically. Avoid destructive schema changes during rollout so the previous application image remains compatible for rollback.

Gateway/API logs omit authorization headers and query strings. Monitor 5xx errors, readiness, Auth failures and deletion-job backlog. Retain database backups and independent copies of Storage files; database backups do not contain image bytes. Before launch, rehearse restoring both to an isolated environment and check that asset paths and published collections agree.

Container image builds, public TLS hosting, backup restoration, live Google/SMTP and physical-device downloads require separate release verification. Do not infer these from local unit-test success.
