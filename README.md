# Daily Spark

A motivational wallpaper website with a Next.js frontend, Python/FastAPI backend and Supabase PostgreSQL, Auth and Storage. The existing gallery, previews and responsive UI are retained.

## Run locally

Use Node 22.19+, Python 3.12 and uv. Configure `.env.local` from `.env.example` and `backend/.env` from `backend/.env.example`.

```text
npm ci
uv sync --project backend --frozen
```

In a backend terminal: `cd backend` then `uv run uvicorn app.main:app --reload --port 8000`.
In a frontend terminal: `npm run dev`, then open http://localhost:3000.

See [backend setup and operations](docs/backend-setup.md) for Supabase configuration, migrations, auth providers, publishing and deployment. An empty homepage is expected until reviewed content is published. API errors never silently fall back to demo content.

## Features

- Daily five, published archive, theme/style search and paginated discovery.
- Direct wallpaper pages, device previews and downloads from Supabase Storage.
- Supabase Google/email authentication integration; persistent profiles, likes and private saved collections.
- Server-validated sessions, database row-level security and transactional like totals.
- Restricted Python import/publishing commands, account deletion and retry worker.
- Separate frontend/backend containers behind an Nginx gateway.

Google OAuth, custom SMTP, the server-only administrative key, reviewed initial artwork and a production domain still require configuration before public launch. No AI generation, scheduling, payments, videos or admin dashboard are included.

## Verification

```text
npm run typecheck
npm test
npm run test:db
uv run --project backend pytest backend/tests
uv run --project backend ruff check backend
npm run api:types
npm run build
```

Browser fixtures and real local Supabase verification have separate setup in [the operations guide](docs/backend-setup.md). Tests with fixture sessions are not proof of real Google/email delivery. See [backend verification](docs/backend-verification.md) for recorded results and remaining release gates.

## Documentation

- [Backend implementation plan](docs/backend_plan.md)
- [Frontend integration contracts](docs/frontend-integration.md)
- [Remaining UI and manual release checks](docs/ui_remaining.md)
- [Artwork and creative prompts](docs/artwork.md)

Images and original artwork are ignored by Git. Published delivery images come from Supabase; a fresh checkout does not require local wallpaper files. `npm run assets` is optional and requires a separately supplied source-artwork bundle. The ignored local app icon is optional. Fonts retain their bundled SIL Open Font licenses.

The supplied Scrollcraft skill informed the gallery, restrained motion and preview interaction. The React app uses Motion/CSS rather than the standalone scroll engine. Branding is configured in `src/lib/config.ts`.
