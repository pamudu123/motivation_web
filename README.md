# Daily Spark

A responsive motivational wallpaper frontend built with Next.js, React, TypeScript, Tailwind CSS and Motion. Twenty original quote designs span four daily collections. Branding lives in `src/lib/config.ts`.

## Run locally

Use Node.js 22.19 or newer in the Node 22 release line, and npm.

```bash
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). No API keys or environment variables are needed. Images and fonts are local, including the actual downloadable JPEG files.

```bash
npm run build
npm start
```

## Included

- Today: featured wallpaper, latest five, theme discovery and previous collections.
- Explore: quote/title/theme search, multiple themes (OR matching), style filtering, sorting and pagination. Filters and loaded item count live in the URL.
- `/wallpaper/[slug]`: refreshable detail pages, related designs and Screen Studio previews for mobile, desktop and available WhatsApp formats.
- Like, unlike, save and unsave; guests resume the selected action once after demo sign-in.
- Private Saved and Liked views, editable profile name and favourite themes.
- Native sharing with clipboard and selectable-link fallbacks.
- Real image downloads, plain-image mode, optional phone/desktop/chat overlays, reduced motion and mobile navigation.

## Demo boundaries

Google and email authentication are **simulations**, explicitly identified in the dialog. No provider is connected and no email is sent. The email field is not persisted. There are no passwords or authentication tokens.

One simulated account (`local-demo-user`) is shared by the demo sign-in choices. Its name, preferences, likes and saves are stored in this browser's `localStorage`; the session flag is only a UI flag, not a security boundary. Signing out preserves the local collection. Clearing site data resets everything. “Private” saves are separate from public like counts, but production privacy requires a backend with real authorization.

Sample like counts are illustrative. Collection dates are fixed at September 24–27, 2026. The site shows the newest published collection and its real date if the current day has no collection; it does not generate new designs automatically. Dates use UTC consistently.

## Integration

See [docs/frontend-integration.md](docs/frontend-integration.md) for models, service contracts, downloads and production connection points. Replace `contentService` in `src/lib/content.ts` and `accountService` in `src/lib/account.ts`; keep components and asset contracts stable.

There is no admin interface, Python publishing pipeline, payment flow, video or community system in this build.

## Verification

```bash
npm run typecheck
npm test
npm run build
# With the app running and Google Chrome installed:
npm run test:e2e
```

Browser verification uses headless Chrome, disables native pointer capture/lock, exercises complete user flows and checks phone/tablet/desktop layouts with axe. Screenshots and results are written to ignored `test-results/`. `TEST_URL` can point it at another local port. Actual iOS/Android hardware still needs a device pass.

See [verification results and visual evidence](docs/frontend-verification.md). Use `node scripts/contact-sheet.mjs test-results/release` to rebuild the retained contact sheet from the release browser run.

## Assets and design

Original AI-created landscape masters are in `assets/source/`; quote compositions and delivery files are in `public/wallpapers/`. No external stock photography is redistributed. Details and generation prompts are recorded in [docs/artwork.md](docs/artwork.md). Fonts use the SIL Open Font License; the Barlow license is in `assets/fonts/OFL.txt` and installed font packages carry their licenses.

`npm run assets` deterministically rebuilds the demo JPEG compositions using Sharp. It does not generate imagery or publish content. Existing committed assets are sufficient for running the app.

The user-supplied Scrollcraft skill informed the gallery grammar, motion restraint, mobile art direction and Screen Studio interaction. The creative brief is in [scrollcraft/builds/daily-spark/BRIEF.md](scrollcraft/builds/daily-spark/BRIEF.md). The React app uses Motion/CSS rather than the standalone scroll engine.

Stack references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Tailwind's Next.js setup](https://tailwindcss.com/docs/installation/framework-guides/nextjs).
