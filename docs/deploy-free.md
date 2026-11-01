# Free deployment: Vercel + Render

Frontend on Vercel Hobby, API on Render Free, scheduled jobs on GitHub Actions, data on Supabase. Total cost: $0.

| Piece | Host | Config |
|---|---|---|
| Next.js frontend | Vercel Hobby | auto-detected |
| FastAPI backend | Render Free | `render.yaml` |
| Deletion worker + keep-awake ping | GitHub Actions | `.github/workflows/scheduled.yml` |
| Database, Auth, Storage | Supabase | existing project |

## Free-plan limits

- **Vercel Hobby is for personal, non-commercial use only.** Move to Pro ($20/month) before adding ads, payments or business use.
- **Render Free sleeps after 15 idle minutes** and takes 30–60 s to wake. Server-rendered pages give up after 15 s, so the workflow pings the API every 10 minutes. One always-awake service fits Render's 750 free monthly hours; do not add a second free service to the same workspace.
- GitHub may delay scheduled runs at busy times, so an occasional cold start is still possible. For extra reliability, also add a free 5-minute HTTP monitor (for example UptimeRobot) on `<BACKEND_URL>/api/v1/health/live`.
- GitHub disables scheduled workflows in public repositories after 60 days with no repository activity. Re-enable it from the Actions tab if that happens.
- Supabase Free pauses a project after a period of inactivity. The keep-awake ping does not touch the database; the readiness check and real visitors do.

## 1. Backend on Render

1. Sign in at render.com with GitHub. **New → Blueprint**, pick `pamudu123/motivation_web`. Render reads `render.yaml`.
2. Fill in the prompted values from `backend/.env`: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`. Set `APP_ORIGIN` to a placeholder for now; you will update it after step 2.
3. Deploy. When it is live, open `https://<service>.onrender.com/api/v1/health/ready`. It should return `{"status":"ready"}`. This URL is your `BACKEND_URL`.

Choose a Render region close to your Supabase region when prompted.

## 2. Frontend on Vercel

1. Sign in at vercel.com with GitHub. **Add New → Project**, import `pamudu123/motivation_web`. Keep the defaults (Next.js, root directory `./`).
2. Add environment variables (Production and Preview):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from `.env.local` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | from `.env.local` |
   | `BACKEND_INTERNAL_URL` | your `BACKEND_URL`, no trailing slash |
   | `APP_ORIGIN` | your Vercel URL, e.g. `https://daily-spark.vercel.app` |

3. Deploy. Then set Render's `APP_ORIGIN` to the same Vercel URL and redeploy the backend.

Never put `SUPABASE_SECRET_KEY` in Vercel. `NEXT_PUBLIC_` values are rebuilt into the bundle, so redeploy Vercel after changing them.

## 3. Scheduled jobs on GitHub

In the repository: **Settings → Secrets and variables → Actions**.

- **Variables** tab: `BACKEND_URL` = your Render URL. Both jobs are skipped until this is set.
- **Secrets** tab: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.

The workflow runs only once it is on `main`. Trigger it once from **Actions → Scheduled jobs → Run workflow** and check both jobs pass.

## 4. Supabase Auth

In the Supabase dashboard, **Authentication → URL Configuration**:

- **Site URL**: your Vercel URL.
- **Redirect URLs**: `<Vercel URL>/auth/callback` and `<Vercel URL>/auth/confirm`. Keep the localhost entries for development. Do not use wildcards.

Email links use `{{ .SiteURL }}`, so they point at the deployed site from now on, including emails sent while you test locally. See [backend setup](backend-setup.md) for Google sign-in, SMTP and migrations.

## 5. Smoke test

- `<BACKEND_URL>/api/v1/health/ready` returns `ready`.
- The homepage loads content (empty until a collection is published).
- Sign in by email and Google, like/save a post, and download a wallpaper.

Pushing to `main` redeploys Vercel automatically, and Render when `backend/` changes.
