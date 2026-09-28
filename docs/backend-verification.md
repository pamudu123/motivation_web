# Backend integration verification

Recorded September 28, 2026. This report distinguishes implemented behavior from external launch prerequisites.

## Passed

| Check | Evidence |
| --- | --- |
| Python API/unit tests | 12 passed; guest protection, validation, empty/missing content, bounded pagination, profile field restrictions, Auth outage distinction, import validation and error redaction |
| Python lint | `uv run --project backend ruff check backend` passed |
| Frontend service tests | Five passed; encoded filters, safe redirects, 404 versus upstream failure, cancellation/empty content and pending-action validation |
| TypeScript | `npm run typecheck` passed after integration and final fixes |
| Next.js production build | `npm run build` passed during integration; later empty-page Motion fix and metadata additions were verified with typechecking and the dev-server browser suite; no second production build due low disk space |
| Embedded PostgreSQL | Migration replay, 120-record pagination, future/draft isolation, two-user RLS, public aggregate privacy, idempotent reactions, publication checks and deletion cascades passed in PGlite |
| Real local Supabase | CLI replayed migration; importer ran twice without duplicates; real Storage uploads/readback and five-post publication passed |
| Real local Auth/API | Two local users authenticated; FastAPI verified tokens; concurrent likes stayed at one; user B could not read/write user A's data; private collection queries passed |
| Real local deletion | Recently authenticated deletion completed, the identity was rejected afterward and like counts returned to zero |
| Browser integration | Five grouped workflows passed with no page exceptions; public render/download, >100-item browsing, dialog accessibility, pending-save replay, persistence, failed-write rollback, empty/error recovery and mobile axe |
| Container configuration | `docker compose --env-file .env.local config --quiet` passed; images were not built |
| Diff whitespace | `git diff --check` passed |

Browser report: `test-results/backend-integration/verification.json`; mobile screenshot is beside it. These are ignored local artifacts and are not included in a fresh clone.

The browser suite uses an explicitly separate fixture API and fixture session. The full local Supabase test uses real Auth/Storage services, with local password-based test sessions. Neither test claims real Google OAuth or external email delivery.

## Hosted state

- Applied migration `20260928162144_initial_backend.sql` to project `bekwpoafbkvpzobffvax`.
- Created eight application tables, two private administrative tables and the two Storage buckets.
- Live anonymous requests through FastAPI returned an intentional empty daily collection and empty catalogue; private requests without a token returned 401.
- Security advisor reported only informational RLS-without-policy notices for `private.publishing_audit` and `private.account_deletion_jobs`. Those tables deliberately have no client policies and are accessed administratively. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- No sample accounts, fictional engagement or unreviewed artwork were published to the hosted project.

## Still required before public launch

1. Configure the server-only Supabase secret key for hosted publishing and account deletion.
2. Configure Google credentials, custom SMTP/verified sender, magic-link template and redirect allowlists; verify real provider journeys.
3. Review and approve initial artwork and rights, then import/publish it.
4. Configure the production origin and TLS ingress, build the deployment images and run a deployed smoke test.
5. Rehearse database and Storage recovery separately.
6. Complete physical iOS/Android downloads, Safari/Firefox coverage and human screen-reader checks from the UI release checklist.

The test stack was stopped and its temporary local volumes/images were removed after verification. The C: drive remains low on space; avoid another full container build until more room is available. Automatic approval review rejected deletion of the generated `.next/standalone` directory, so that build artifact was retained.

Known tooling notice: Starlette's TestClient emits a deprecation warning about HTTPX; tests pass. The current test dependencies are locked, and no suppressed warning is presented as a failure-free provider sign-off.
