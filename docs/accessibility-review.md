# Accessibility remediation and verification

Reviewed September 28, 2026. Scope: the existing frontend demo, targeting WCAG 2.2 A/AA keyboard, focus, feedback and reflow behavior. This is not a conformance certification.

## Result

The keyboard journey can search, open a wallpaper, sign in to the demo, complete the pending Save, choose a format and download the actual file. Focus recovery and feedback issues identified in source and browser testing were fixed. The accessibility-audit skill guided the review toward interactive states and explicit validation limits, rather than treating an axe pass as a manual screen-reader sign-off.

**Still pending:** a human-operated NVDA/Firefox or NVDA/Chrome session, VoiceOver/Safari coverage, and actual browser-toolbar 200% zoom. No screen-reader speech was heard or verified in this environment. Keep that release gate open.

## Changes and findings

| Finding | Impact / relevant criteria | Remediation |
| --- | --- | --- |
| A removed control could leave focus on the document body | High: keyboard orientation, 2.4.3 | Profile Save returns to Edit profile; removing a focused saved card returns to the collection heading; sign-out and replaced dialog openers use the current heading as fallback |
| Route changes and disappearing Reset/Load more controls lacked explicit focus recovery | High: 2.4.3, 2.4.7 | Route focus waits for the new heading; search entry keeps its input focus; Reset returns to search; Load more moves to a focusable result-status summary |
| Dialog feedback was outside the native modal's accessible subtree | High: status messages, 4.1.3 | Pending, saved-action and account feedback now have a live region inside the dialog; actual Chromium accessibility-tree output confirms the modal and its controls are exposed |
| Sign-in stage changes and failed account actions could lose focus | High: 2.1.1, 2.1.2, 2.4.3 | Focus the stage heading or error; preserve the original opener through React development effect replay; contain Tab/Shift+Tab and retain Escape/Back dismissal |
| Notifications expired after 4.5 seconds; repeated messages were not distinct updates | Medium: time to read feedback, 4.1.3 | Keep the latest notification until dismissed or replaced, use atomic status text and a new message node for repeated actions; announce likes as well as saves |
| Format changes and result updates needed clearer context | Medium: 4.1.3 | Announce format/dimensions, result total/shown count and content errors; focus the manual share-link fallback when needed |
| Programmatically focused headings and long messages needed explicit styling | Medium: 2.4.7, 1.4.10 | Visible focus outlines, scroll margins around fixed navigation and wrapping for error/notification text; long-copy dialog fixture tested at 320px |
| Saved/Liked links only indicated selection visually | Medium: 4.1.2 | Expose the active collection with `aria-current="page"` |

Relevant W3C guidance: [Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html), [Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). The mappings guide remediation; they do not assert a complete audit of every criterion.

## Reproducible checks

Run the frontend, then:

```bash
node scripts/verify-accessibility.mjs
npm run test:e2e
npm test
npm run typecheck
npm run build
```

The focused script uses headless Chrome and only Tab/Enter/text entry/Escape to operate the primary journey. Direct navigation, isolated browser storage changes, request failure injection and CSS zoom are test setup, not substitutes for user interaction. Pointer lock/capture are disabled.

Verified in `test-results/accessibility-2026-09-28T15-22-57.511Z/` (final rerun after ensuring recovered heading focus scrolls into view):

- Keyboard-only search -> preview -> demo sign-in -> pending Save -> format selection -> actual download.
- Focus after route changes, profile editing, sign-out, dialog dismissal, removed saved items, Reset and final Load more.
- Dialog pending/success/error messages; blocked storage; download failure; long error wrapping and Escape recovery.
- Sixteen axe scans with zero violations across search results, detail, sign-in, theme selection, empty Saved, profile, errors and narrow layouts.
- Chromium accessibility-tree snapshots and DOM-derived reading-order snapshots retained separately. The modal AX tree exposes dialog controls/status rather than the inert page behind it. These checks validate exposed semantics, not speech timing or screen-reader usability.
- 320px reflow on Explore, detail, profile and Liked; 640px layouts as a 1280px-at-200%-zoom layout proxy.
- 200% CSS magnification stress checks on profile editing, Explore, detail and sign-in. CSS magnification is **not** browser-toolbar zoom; actual zoom remains pending.
- Manual visual inspection of narrow detail, magnified sign-in and the scrollable long-error dialog screenshots.

Some initial focused test runs failed while focus handling and the harness were being corrected. The completed run above supersedes them. Axe runs wait for entrance animations to settle to avoid measuring transient opacity as a static text contrast failure.

All evidence is local and ignored by Git. Re-running creates a new timestamped directory. The full browser suite passed 17 workflows with no browser exceptions in `test-results/run-2026-09-28T15-20-39.097Z/`; it also covers magic-link simulation, browser Back dismissal, focus containment, storage rollback, image retry, sharing fallback and reduced motion. The final focused rerun above covers the subsequent focus-scroll adjustment. The final production build, TypeScript validation and five service/asset tests passed.

## Human screen-reader and zoom release checklist

Record OS, browser, screen reader/version, date and outcome for each step. Do not mark this section complete using automation alone.

1. Enable NVDA or VoiceOver, use no mouse, and navigate by landmarks/headings. Confirm the header, main content, quote and related gallery have a coherent reading order. Decorative device overlays should not be read.
2. Use header Search from Today and from Explore. Type a query, change/remove filters and use Load more. Confirm result announcements are understandable and do not interrupt typing excessively.
3. Open a post with Enter. Confirm the new page context is announced, then navigate to format controls. Verify the selected state, format and dimensions are spoken.
4. Save as a guest. Confirm the dialog title/demo limitation is discoverable, background content cannot be navigated, and Tab/Shift+Tab remain inside. Complete both Google-demo and email-demo paths, then skip preferences. Confirm Save completes once and focus returns to a meaningful control.
5. Download with the keyboard. Confirm feedback describes a started download, not guaranteed file installation. Exercise a failed download and blocked account storage; ensure the error and retry path are discoverable.
6. Remove the last saved item, edit/save a profile, sign out and dismiss a notification. Confirm focus is visible, meaningful and not behind fixed navigation. Check the manual share-link fallback.
7. Set the browser toolbar to 200% zoom; check search, preview, sign-in, errors and profile editing. Test 320 CSS-pixel reflow separately. Scroll the long-error dialog to its end and verify all text and close/retry controls remain reachable.
8. Repeat with reduced motion and a long name/search query. Record any duplicate, missing or delayed announcements and fix/retest before signing off.

The remaining backlog entry should be closed only after these live assistive-technology and actual-zoom checks pass.
