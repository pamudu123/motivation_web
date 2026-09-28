Build a polished, responsive frontend for a motivational wallpaper website.

The website publishes five motivational designs every day. Visitors can discover inspiring content, preview wallpapers, like posts, save favourites and download versions for different screens.

Build the complete user experience described below. The scope is frontend only, using realistic sample content and a replaceable data layer for future backend integration.

**1. Product direction**

Create an energetic, visually impressive experience that makes people feel motivated as soon as they arrive.

The product combines a daily motivational feed with a premium wallpaper gallery. The artwork and quotes are the main attraction.

Phase one is completely free and supports images only.

Users should be able to:

* Discover today’s five designs.
* Explore previous collections.
* Browse by multiple motivational themes.
* Preview mobile and desktop versions of the same design.
* Download selected WhatsApp backgrounds and Status versions.
* Like posts.
* Save posts privately.
* Create an account or sign in.
* View their profile, liked posts and saved collection.

Browsing, previews, sharing and downloading must remain accessible without signing in. Likes and saves require an account.

Do not build admin screens, image generation, payments, subscriptions, videos, comments, messaging or following in this phase.

**2. Frontend stack and structure**

Use:

* Next.js with React and TypeScript.
* Tailwind CSS for styling.
* CSS for simple transitions and effects.
* Motion for React where coordinated animation meaningfully improves the experience.

Use compatible stable dependencies and respect existing project conventions if working inside an established repository.

Create reusable components, clear design tokens and typed data models. Keep content and authentication access behind replaceable service interfaces.

A future Python pipeline will generate images and publish metadata. The frontend should consume that published content without needing layout changes.

If a scroll-craft skill is available, follow its design workflow and uniqueness rules. Read the actual skill before applying it. Do not assume the fingerprints registry alone contains the full instructions.

**3. Visual identity**

Use the working name “Daily Spark”, stored in a central configuration so it can be changed easily.

Design a distinctive, energetic visual identity with:

* Deep ink or charcoal surfaces.
* Warm white primary text.
* Electric orange as the primary accent.
* Strong typography with expressive display headings.
* Generous spacing around important messages.
* Large cinematic artwork.
* Crisp, readable buttons and controls.

Let the artwork introduce additional colours. Avoid excessive neon, generic gradient cards, heavy glass effects and constant glowing borders.

The interface should feel lively and confident while remaining easy to browse.

Use polished sample imagery representing mountains, oceans, forests, urban nights, abstract compositions and sunrise scenes. Include variety in both visual style and emotional tone.

**4. Content structure**

Each design is one post with multiple image versions.

Do not create separate gallery posts for its mobile and desktop files.

Each post should support:

* Unique ID and URL slug.
* Title.
* Quote text.
* Optional verified attribution.
* Short supporting description.
* Publication date.
* Multiple motivational themes.
* One or more visual style tags.
* Gallery thumbnail.
* Mobile image version.
* Desktop image version.
* Optional WhatsApp background version.
* Optional WhatsApp Status version.
* Image dimensions and file type for each version.
* Accessible alternative text.
* Like count.
* Current user’s liked and saved state.

Mobile and desktop versions must depict the same artwork and message, composed appropriately for portrait and landscape.

Distinguish between motivational themes, visual styles and output formats.

Example themes:

Discipline, Focus, Confidence, Resilience, Growth, Courage, Ambition, Patience, Calm and New Beginnings.

Example visual styles:

Cinematic, Nature, Minimal, Urban and Abstract.

Use original sample quotes without fabricated attribution to famous people.

**5. Main navigation**

Desktop navigation:

* Today.
* Explore.
* Saved.
* Search.
* Sign in or profile menu.

Mobile navigation:

* Today.
* Explore.
* Saved.
* Profile.

Provide accessible search from the mobile header or Explore page.

Highlight the active destination. Preserve gallery state when opening a post and returning.

**6. Today page**

Create an engaging daily landing page.

Include:

* A compact header.
* Today’s publication date.
* One featured design with a powerful motivational message.
* Clear “Preview wallpaper” and “Explore today’s five” actions.
* The full daily collection of five posts.
* Theme discovery options under a prompt such as “What do you need today?”
* A small preview of earlier collections.

The featured design is one of today’s five posts, not an additional sixth post.

Bring actual content into view quickly. Avoid a large marketing introduction that pushes the gallery below the first screen.

Show the newest published collection if today’s collection is unavailable, with its actual date. Do not relabel older content as today’s.

**7. Explore page**

Build a responsive gallery with:

* Search by quote, title and theme.
* Theme filters.
* Optional visual style filters in a secondary control.
* Sorting by Newest and Most liked.
* Active filter indicators.
* A clear reset filters action.
* A functional “Load more” control.

Multiple selected themes should match posts containing any selected theme. Search should narrow those results further.

Keep filters and sorting in URL parameters where practical so views can be shared and restored.

On mobile, use a filter sheet or compact expandable controls rather than filling the screen with filters.

Include useful empty states when no posts match.

**8. Gallery cards**

Each card should include:

* Artwork thumbnail.
* Short title or readable quote excerpt.
* A small number of theme labels.
* Like button and count.
* Save button.
* A clear way to open the full preview.

Keep the artwork dominant. Avoid placing every available action on the card.

Do not hide essential controls behind hover on touch devices.

Clicking Like or Save must not accidentally open the post.

Use suitable thumbnail compositions. Do not crop important quote text out of the gallery image.

**9. Post detail and preview**

Make this the most polished part of the website.

Every post must have a direct URL that works on refresh and when shared.

On desktop, use a large artwork preview alongside an information and action panel. On mobile, place the artwork first and controls below it.

Include:

* Full artwork preview.
* Title and quote.
* Theme labels linking to filtered discovery.
* Short supporting description.
* Publication date.
* Like button and count.
* Save button.
* Share action.
* Format selector.
* Download button.
* Related posts based on shared themes.

The format selector should offer:

* Mobile.
* Desktop.
* WhatsApp Background, when available.
* WhatsApp Status, when available.

Only show available versions.

Start with a format suitable for the visitor’s screen, while allowing manual selection.

Switch the actual preview asset, aspect ratio, dimensions and download target when the format changes.

Provide optional device previews:

* A phone frame with a clock overlay for mobile.
* A clean landscape frame for desktop.
* Sample chat bubbles for WhatsApp backgrounds.

Device overlays are preview tools only. They must never appear in downloaded files.

Allow visitors to inspect the plain image without a device frame.

On mobile, keep the selected format and download action easy to reach without obstructing content or device safe areas.

**10. Likes, saves and sharing**

Likes:

* Require sign in.
* Allow one like per user per post.
* Support unlike.
* Update the displayed count consistently.
* Use a brief, satisfying heart animation.

Saves:

* Require sign in.
* Add posts to a private saved collection.
* Support removal.
* Remain separate from likes.
* Do not expose a public saved count.

When guests select Like or Save:

* Open a lightweight sign in dialog.
* Remember the intended action and selected post.
* Complete the action once after successful sign in.
* Keep the visitor in the same browsing context.

Sharing:

* Use native sharing when supported.
* Fall back to copying the canonical post link.
* Provide clear success or error feedback.

**11. Sign in and account experience**

Include a polished authentication interface with:

* Continue with Google.
* Email sign in using a magic link.
* Clear loading, success and error states.
* A close or back action.
* No mandatory onboarding before browsing.

After account creation, offer an optional theme selection step that users can skip.

Create a profile page with:

* Avatar.
* Display name.
* Favourite themes.
* Liked posts.
* Saved posts.
* Sign out.

Allow editing the display name and theme preferences.

Prepare a stable user ID in the data model for future community features. Do not add nonfunctional Follow, Message or Comment controls.

For this frontend build, provide a clearly identified demo account flow. Do not pretend real Google authentication or email delivery is connected.

Do not collect real passwords or store authentication tokens in local storage.

**12. Saved and liked collections**

Signed in users should have dedicated views for saved and liked posts.

Use the same gallery components and preview behaviour as Explore.

Provide useful empty states with a direct route back to discovery.

Guests visiting Saved or Profile should see an inviting sign in state rather than a broken or empty page.

Account data should be designed for future server persistence. During the demo, persist simulated preferences, likes and saves locally and make that limitation clear in development documentation.

**13. Motion and interaction design**

Use animation to strengthen the content and make interactions feel responsive.

Include:

* A restrained entrance animation for the featured quote.
* Gentle featured artwork movement.
* Subtle gallery card lift or zoom on hover.
* Smooth transitions into full previews.
* Animated filter changes.
* Smooth mobile and desktop format switching.
* Brief feedback for likes, saves and downloads.

Keep regular interface transitions quick. Do not delay access to the content for an animation.

Avoid scroll hijacking, autoplay audio, excessive parallax, continuous bouncing and distracting particle effects.

Respect reduced motion preferences and provide full keyboard and touch usability.

Downloaded wallpapers remain static images.

**14. Responsive design and accessibility**

Design mobile layouts deliberately, not just as compressed desktop layouts.

Ensure:

* No horizontal overflow on small screens.
* Readable quotes and interface text.
* Comfortable touch targets.
* Visible keyboard focus.
* Accessible labels for icon buttons.
* Sufficient colour contrast.
* Correct dialog focus management.
* Escape and back behaviour for dismissible overlays.
* Text alternatives for artwork.
* A selectable text version of each quote.
* Correct layout around mobile safe areas.

Check representative phone, tablet and desktop sizes.

**15. Loading, failure and empty states**

Provide designed states for:

* Gallery loading.
* Image loading and image failure.
* No search results.
* Empty saved collection.
* Empty liked collection.
* Authentication pending or failed.
* Unavailable image format.
* Download failure.
* Missing post.
* Content loading failure.

Use restrained skeletons and helpful retry actions.

If a like or save update fails, restore the previous state and explain briefly.

Do not show success messages for actions that failed.

**16. Performance and downloads**

Use optimised thumbnails for browsing and full resolution assets for downloads.

Load below the fold imagery lazily. Reserve image dimensions to prevent layout shifts.

Prioritise only the important initial artwork. Avoid loading every original wallpaper immediately.

Downloads must retrieve the selected file, not a screenshot of the preview.

Ensure the demo download mechanism actually works for the supplied assets. Explain how production storage will support downloads if that configuration is outside this frontend.

Avoid heavy animation dependencies for effects that CSS can handle.

**17. Sample content and integration preparation**

Populate the demo with at least 20 complete posts across several daily collections.

Include:

* Exactly five posts in the latest collection.
* Multiple themes on several posts.
* Matching mobile and desktop assets.
* Several WhatsApp examples.
* Varied quote lengths and visual styles.
* Enough sample data to demonstrate filters, search, related content, likes and saved states.

Use working assets with appropriate usage rights. Do not rely on broken placeholder URLs.

Keep sample content in structured data rather than hardcoding it throughout components.

Create replaceable interfaces for:

* Fetching daily collections.
* Searching and filtering posts.
* Fetching a post by slug.
* Reading authentication state.
* Updating likes and saves.
* Reading and updating profile preferences.

Document the expected data shapes for future integration. Do not implement the Python generation pipeline or an admin system.

**18. Completion criteria**

Deliver a complete working frontend, not just a landing page.

Verify that:

* All navigation destinations work.
* Direct post links survive refresh.
* Search, filters and sorting work.
* Format selection changes both preview and download.
* Likes and saves remain consistent across screens.
* Guest actions resume correctly after demo sign in.
* Sharing has a working fallback.
* Downloads return the correct files.
* Loading, empty and error states are handled.
* Mobile layouts and keyboard navigation work.
* Reduced motion preferences are respected.
* No visible controls are decorative dead ends.

Provide a concise setup README, explain demo limitations and identify where real authentication and content services will connect.

The final experience should feel energetic, visually distinctive and easy to use, with motivational artwork at the centre.