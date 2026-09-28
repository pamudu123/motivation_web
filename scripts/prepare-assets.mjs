// One-time deterministic preparation of the supplied demo artwork.
// This is not a publishing or image-generation pipeline.
import sharp from "sharp";
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";
const root = process.cwd();
const designs = JSON.parse(
  await readFile(resolve(root, "src/data/designs.json"), "utf8"),
);
const output = resolve(root, "public/wallpapers");
await mkdir(output, { recursive: true });
await mkdir(resolve(root, "assets/fonts"), { recursive: true });
const font = resolve(root, "assets/fonts/BarlowCondensed-Bold.ttf");
try {
  await access(font);
} catch {
  for (const [file, url] of [
    [
      "BarlowCondensed-Bold.ttf",
      "https://raw.githubusercontent.com/google/fonts/main/ofl/barlowcondensed/BarlowCondensed-Bold.ttf",
    ],
    [
      "OFL.txt",
      "https://raw.githubusercontent.com/google/fonts/main/ofl/barlowcondensed/OFL.txt",
    ],
  ]) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Font fetch ${response.status}`);
    await writeFile(
      resolve(root, "assets/fonts", file),
      Buffer.from(await response.arrayBuffer()),
    );
  }
}
const escape = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
function wrap(text, max) {
  const lines = [];
  let line = "";
  for (const word of text.toUpperCase().split(" ")) {
    if (line.length + word.length + 1 > max && line) {
      lines.push(line);
      line = word;
    } else line += `${line ? " " : ""}${word}`;
  }
  if (line) lines.push(line);
  return lines;
}
async function background(seed, w, h) {
  if (seed.scene === "minimal" || seed.scene === "abstract") {
    const abstract = seed.scene === "abstract";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice"><rect width="1000" height="1000" fill="${abstract ? "#bf482c" : "#273b36"}"/><circle cx="760" cy="140" r="350" fill="${abstract ? "#f59c54" : "#bac5a4"}"/><path d="M-100 800Q300 200 1100 620V1100H-100Z" fill="${abstract ? "#3a2c31" : "#152923"}"/><path d="M-100 950Q500 430 1100 880V1100H-100Z" fill="${abstract ? "#e77343" : "#698371"}"/><circle cx="740" cy="660" r="110" fill="${abstract ? "#ffc67e" : "#dddbc4"}" opacity=".55"/></svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }
  return sharp(resolve(root, `assets/source/${seed.scene}.png`))
    .resize(w, h, {
      fit: "cover",
      position: seed.scene === "mountain" ? "east" : "centre",
    })
    .png()
    .toBuffer();
}
async function make(seed, format, w, h) {
  const portrait = w < h;
  const hero = format === "hero";
  const mobileHero = format === "mobile-hero";
  const chat = format === "whatsapp";
  const base = await background(seed, w, h);
  if (chat) {
    await sharp(base)
      .modulate({ brightness: 0.6, saturation: 0.5 })
      .jpeg({ quality: 88 })
      .toFile(resolve(output, `${seed.slug}-${format}.jpg`));
    return;
  }
  const max = portrait ? 17 : 22;
  const lines = wrap(seed.quote, max);
  const fontSize = portrait ? Math.round(w * 0.127) : Math.round(h * 0.167);
  const lineHeight = Math.round(fontSize * 1.01);
  const textHeight = lineHeight * lines.length;
  const x = Math.round(w * (portrait ? 0.09 : 0.055));
  const y = Math.round(
    mobileHero ? h * 0.19 : portrait ? h * 0.4 : hero ? h * 0.16 : h * 0.22,
  );
  const maxWidth = Math.round(w * (portrait ? 0.82 : 0.64));
  const scrim = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><radialGradient id="shade" cx="${portrait ? "50%" : "20%"}" cy="${portrait ? "50%" : "40%"}" r="70%"><stop offset="0" stop-color="#090d0b" stop-opacity=".64"/><stop offset=".8" stop-color="#090d0b" stop-opacity=".08"/><stop offset="1" stop-color="#090d0b" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#shade)"/></svg>`;
  const layers = [{ input: Buffer.from(scrim), top: 0, left: 0 }];
  for (let i = 0; i < lines.length; i++) {
    const color =
      seed.scene === "mountain" && i === lines.length - 1
        ? "#ffb077"
        : "#fff9ec";
    let line = await sharp({
      text: {
        text: `<span foreground="${color}">${escape(lines[i])}</span>`,
        font: `Barlow Condensed Bold ${fontSize}`,
        fontfile: font,
        rgba: true,
        dpi: 72,
      },
    })
      .png()
      .toBuffer();
    const meta = await sharp(line).metadata();
    if (meta.width > maxWidth)
      line = await sharp(line).resize({ width: maxWidth }).png().toBuffer();
    layers.push({ input: line, left: x, top: y + i * lineHeight });
  }
  if (portrait && !mobileHero) {
    const mark = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="40"><path d="M${w * 0.09} 20h${w * 0.07}" stroke="#fff9ec" stroke-width="3"/></svg>`,
    );
    layers.push({
      input: mark,
      top: Math.min(h - 90, y + textHeight + 30),
      left: 0,
    });
  }
  const final = await sharp(base)
    .composite(layers)
    .jpeg({ quality: format === "thumb" ? 85 : 90 })
    .toBuffer();
  await writeFile(resolve(output, `${seed.slug}-${format}.jpg`), final);
}
for (const seed of designs) {
  await make(seed, "mobile", 1080, 1920);
  await make(seed, "desktop", 2560, 1440);
  await make(seed, "thumb", 600, 800);
  await make(seed, "hero", 1800, 680);
  await make(seed, "mobile-hero", 1080, 1200);
  if (seed.chat) await make(seed, "whatsapp", 1080, 1920);
  if (seed.status) await make(seed, "status", 1080, 1920);
  console.log(`Prepared ${seed.slug}`);
}
console.log("All local wallpaper assets ready.");
