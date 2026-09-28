# Demo artwork provenance

Six original landscape backgrounds were generated with the built-in image-generation tool for this project. No Kie API or paid external stock service was used. Masters are saved in `assets/source/` as `mountain.png`, `forest.png`, `sunrise.png`, `urban.png`, `ocean.png`, and `desert.png`. They depict imagined scenes rather than documented locations. The urban result is an atmospheric waterfront rather than a literal Tokyo street.

All six outputs were visually inspected before use. Abstract and minimal samples are original geometric SVG compositions authored in `scripts/prepare-assets.mjs`, rendered into final JPEG assets.

## Generation prompts

Common prefix and suffix, used for each scene:

> Use case: photorealistic-natural. Asset: original downloadable motivational wallpaper background for Daily Spark. Create ONE landscape 16:9 high-resolution image, no grid. Cinematic fine-art landscape photography, authentic detailed textures, controlled film grain, rich natural contrast, no CGI sheen. [Scene below] Composition: focal landscape in lower half, quieter negative space in upper left for typography added separately. NO text, NO watermark, NO borders, NO UI.

| Master | Scene prompt |
| --- | --- |
| mountain.png | Dramatic jagged alpine mountain peak in the Dolomites, dark rugged foreground at bottom right, amber sunrise touching the peak, silver clouds and vast shadowy sky. Mountain panorama, huge depth, cinematic outdoor adventure. |
| forest.png | Misty evergreen forest of tall redwood trees, sun shafts through deep emerald canopy, dark textured trunks, tranquil and lush, no path or buildings. |
| sunrise.png | Golden orange sunrise above layered hills and clouds, a small sun low on the horizon, amber to muted lilac sky, cinematic hopeful atmosphere, dark rolling hills at bottom. |
| urban.png | Cinematic rainy Tokyo-like urban street at night without any legible signage or logos, orange lights reflected on asphalt, dark tall architecture, quiet atmospheric street, no visible people. |
| ocean.png | Aerial deep teal ocean with white surf meeting a dark rocky shoreline, flowing water texture and foam, peaceful coastal photography, no people or buildings. |
| desert.png | Sculptural orange desert sand dunes with dramatic curved crests, deep rust shadows, pale hazy distant mountains, minimalist fine-art landscape photography. |

## Compositions

Sample quotes are original writing, without claimed attribution to any real person. The local preparation script pairs the masters with Barlow Condensed typography. Downloadable products need the quote embedded in the JPEG; the website separately provides selectable text and accessible descriptions. There is no generated lettering in the masters.

- Mobile / Status: 1080 × 1920 JPEG, with headroom for a lock-screen clock.
- Desktop: 2560 × 1440 JPEG. Source photographs are upscaled and recomposed; these are demo exports, not native 2560px photographs.
- WhatsApp Background: 1080 × 1920 JPEG, muted and without quote text, intended to sit behind conversations.
- Gallery: 600 × 800 JPEG, separately composed for readability.
- Editorial previews: wide and compact-phone compositions.

Barlow Condensed is licensed under SIL OFL. The downloaded font and its license are in `assets/fonts/`. DM Sans and browser Barlow fonts are locally bundled from their Fontsource packages, which include licenses. No network font service is required at runtime.
