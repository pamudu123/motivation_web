# Daily Spark design refresh

The interface uses a light mist canvas, white surfaces, navy text, and iris accents. DM Sans supports reading and controls; Barlow Condensed gives the home introduction its character.

The home page explains the product before showing the latest published artwork. Theme shortcuts wrap into a readable mobile grid. An unpublished collection keeps the introduction and theme navigation available without inventing content. Existing search, account, save, preview, and download behavior is preserved.

Shared controls have larger type and touch targets, visible focus, and reduced-motion support. The wallpaper preview studio uses a neutral light surround so artwork remains the focus.

Validation: TypeScript and five service tests passed. Desktop (1440px) and mobile (390px) home checks reported no horizontal overflow or axe violations using the local fixture API. Screenshots are in `test-results/redesign-1440.png` and `test-results/redesign-390.png`. Fixture checks do not certify live authentication providers or hosted content.

All five browser integration workflows passed, including empty catalogue, upstream failure, and narrow-screen accessibility.
