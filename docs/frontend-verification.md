# Frontend verification

> Backend integration update (September 28, 2026): real API/auth adapters, empty-catalogue handling and pagination are now implemented. See [backend verification](backend-verification.md) for current results and hosted launch prerequisites. Demo-era authentication evidence below is historical, not production provider verification.

Verified September 28, 2026 (Asia/Colombo) against the production build at `http://localhost:3001`. Development preview remains available at `http://localhost:3000` while its server is running.

## Results

- `npm run build`: passed, all requested routes compiled.
- `npm run typecheck`: passed.
- `npm test`: five tests passed, covering collection cardinality/dates, OR filtering, sorting/pagination, every advertised image's format/dimensions, and idempotent account reactions/persistence.
- `npm audit`: zero vulnerabilities in the installed dependency tree.
- `npm run test:e2e`: 16 browser workflows passed against the production app, no uncaught browser exceptions.
- Axe WCAG 2 A/AA and 2.1 AA scans of the landing page: zero violations at 390 × 844, 360 × 640, 768 × 1024, and 1440 × 1000 with reduced motion. These scans supplement, rather than certify, accessibility.
- Additional desktop axe scans: zero violations on Explore, wallpaper detail, guest Saved, guest Profile and the sign-in dialog.

## Browser coverage

1. Latest collection contains exactly five designs and images load.
2. Search, OR themes, sorting, reset, load more and returning from detail restore filter state.
3. Guest Save resumes once after sign-in; likes and saves stay consistent across screens and refreshes.
4. Direct detail links survive refresh. All four formats change assets and download the expected JPEG, checked byte-for-byte with local files and by dimensions.
5. Profile name/theme editing, liked collection and sign-out work.
6. Email magic-link simulation and Escape dismissal work.
7. Missing posts show a useful recovery link and `noindex`. Next.js streaming can return HTTP 200 after its loading boundary, as documented by Next; non-streamed missing pages return 404.
8. Download failure reports an error without claiming success.
9. Native share is exercised with a virtual implementation; clipboard and selectable-link fallbacks are exercised separately.
10. A failed reaction storage write restores the previous count/state.
11. Failed image loading offers a retry that recovers when requests succeed.
12. Blocked authentication storage reports failure; dialog focus remains contained and browser Back dismisses it while preserving the page URL.
13–16. Phone, compact phone, tablet and reduced-motion layouts have no horizontal document overflow. Screenshots cover opening, collection, themes, archive, detail and mobile filtering.

Headless browser contexts disable native pointer lock/capture. Native operating-system share dialogs are not opened by automation. Download tests exercise browser downloads, not screenshots or device overlays.

## Visual review and corrections

Actual generated backgrounds, composed wallpapers and rendered screenshots were inspected. The first pass was more forceful than intended because the featured text sat too near its crop edge. Its wide composition was tightened to a 1800 × 680 editorial image. Tablet review also required left anchoring that image to preserve the beginning of the quote. The first mobile gallery card initially cropped the quote; it now uses the dedicated phone composition with a top-aligned crop. The mobile download block was moved out of the bottom-overlay position so the title remains readable.

Functional testing found a pre-hydration image failure that escaped the image's event handler, and Shift+Tab could leave the modal control loop. The image now checks its loaded state on mount; the dialog has explicit focus cycling. Both regressions passed on the final production run.

Earlier harness failures also exposed assumptions in the tests: React/Motion transitions need to settle before snapshots, Web Share must be simulated to test clipboard fallback, and streamed Next.js not-found responses are not always HTTP 404. The harness now checks actual resulting state and the documented noindex behavior. Timestamped later runs supersede the earlier failed checks.

## Scrollcraft review

Grammar: gallery/catalog, with product navigation preserved from the user's brief. No scroll hijacking, artificial long holds, video, or continuous-world simulation. Signature: Screen Studio moves one design between screen compositions and downloads the selected file.

Planned emotional sequence: recognition → curiosity → agency → delight → resolve. Visual reading after the first pass: impact → browsing → choice → ownership → completion. The strong hero remains appropriate to the requested energetic identity; improved crop spacing makes room for the artwork, and the device preview is the main interactive payoff. The archive resolves into useful discovery rather than empty scroll.

The registry was empty before this build, so there were no historical rows to compare. The final fingerprint is recorded in `scrollcraft/FINGERPRINTS.md`. The journey, layer contract and device score are in `scrollcraft/builds/daily-spark/BRIEF.md`.

## Evidence and limits

[Contact sheet](screenshots/contact-sheet.jpg) and [desktop opening](screenshots/desktop.jpg) are retained in the repository. Full screenshots, axe output and machine-readable results are in ignored `test-results/release/`; this complete 16-workflow run supersedes `test-results/final/` after the tablet crop correction. Rerunning the suite creates timestamped evidence by default.

Real iOS/Android hardware, Safari/Firefox, production hosting, real OAuth/email delivery, remote CDN CORS and server persistence have not been configured or tested. Likes and accounts remain the clearly labeled single-account local demo. The app does not claim automatic daily publication.
