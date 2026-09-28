# Daily Spark creative brief

Source: the user's attached frontend brief. The product, palette, journey and constraints were supplied explicitly; remaining composition decisions are authored implementation choices, not invented interview answers.

## Eight topics

1. Vibe: user asks for “energetic, visually impressive” and “lively and confident.”
2. Sequence: featured design, latest five, theme discovery, earlier collections. Detail is artwork first, then formats and download.
3. Energy: bold opening, quieter collection labels, immersive personal preview, calm download completion.
4. Emotion: inspiration, curiosity, recognition, ownership. Peak: “I could see the same message become my phone wallpaper, then my desktop.”
5. Signature (authored): Screen Studio, an interactive format dock that recomposes a single design into a phone, desktop, or chat scene and downloads that exact composition.
6. Range: expressive display type and cinematic artwork on charcoal; orange reserved for primary actions. User explicitly rules out neon and heavy glass.
7. Distinct scenes, justified by the requested navigable gallery and explicit ban on scroll hijacking. No continuous world or artificial dwell.
8. Assets: no supplied photography. Six original backgrounds created with the built-in image-generation tool, plus original geometric compositions. Prompt records and master paths are in `docs/artwork.md`. No Kie key or external stock redistribution.

## Journey and feeling curve (before score)

- Recognition: a real featured wallpaper is already visible on arrival.
- Curiosity: five distinctly composed posters offer a small, browsable daily selection.
- Agency: theme choices lead into working discovery.
- Delight / peak: Screen Studio shows the artwork in the visitor's chosen screen context.
- Resolve: the selected, clean image downloads and remains theirs to use.

Tell-someone sentence: “It's the site where you can try a daily dose of motivation on your actual kind of screen.” No authored empty scroll.

## Grammar and gate

Gallery / catalog. Consistent artwork labels, object-first opening, direct navigation, short natural flow, collection close. The user's requested product navigation and hero quote are preserved. Quote artwork is the product, not marketing scrim copy.

Other grammars lose: filmic and continuous-world delay browsing; chaptered editorial is text-first; live surface excludes the requested photographic display; typographic poster excludes the gallery; split stage implies a comparison; rhythmic cutlist makes browsing too hurried.

Registry was empty at planning: no historical comparisons required.

## Score

| Beat | Device | Purpose |
| --- | --- | --- |
| Featured object | restrained depth: landscape behind a foreground preview chip; image-only natural-scroll translation | Make the artwork tangible while controls hold still |
| Daily five | flow entrance and pointer lift | Scan the actual collection immediately |
| Themes | native horizontal rail | Navigate options without hijacking vertical scrolling |
| Screen Studio | keyed reveal / format transition | Signature composition change with matching download target |
| Archive close | static labeled collection | Resolve into useful further discovery |

Peak occupies the detail page's largest region; no added blank span. Reduced motion disables positional motion. This is a Next.js product frontend: React/Motion and CSS implement the relevant devices instead of mounting the standalone HTML engine over React-managed DOM. Vendor engine remains untouched.

## Layer contract

Landscape artwork is the far plane; original quote typography belongs to the downloadable product; the format preview chip is foreground; UI labels and actions are stable outside the artwork. No extracted subjects, false cutouts or atmospheric particle layer. Mobile uses a shorter featured composition and dedicated portrait detail assets.
