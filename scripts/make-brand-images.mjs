/* Renders the Open Graph card and the app icon, then writes them where the
 * Next.js file conventions pick them up:
 *
 *   app/opengraph-image.png   1200x630, the link preview
 *   app/icon.png              512x512,  the browser tab and home screen
 *
 * Rendered in Chromium with the app's own self-hosted Inter rather than
 * generated at runtime: the wordmark contains Ō (U+014C), and every runtime
 * image generator here would have to be handed a font it can parse — satori
 * cannot read woff2, which is the only format this repo ships. Rendering once
 * and committing the PNGs also means the preview costs nothing to serve.
 *
 * Re-run after a brand change:
 *   npm i --no-save playwright-core && node scripts/make-brand-images.mjs
 */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const PLUM = '#7a1d4a';
const BG = '#f7f5f6';

/* The mark, byte-identical to components/Logo.tsx. Kept as a string here
   because this script runs outside the bundler. */
const MARK = readFileSync(join(ROOT, 'components/Logo.tsx'), 'utf8')
  .match(/<path d="[^"]+"[^>]*\/>/g)
  ?.join('\n') ?? '';
if (!MARK) throw new Error('could not read the logo paths out of components/Logo.tsx');

/* Inlined as a data URL: a file:// page cannot fetch /fonts/... */
const fontData = readFileSync(join(ROOT, 'public/fonts/inter-latin-ext.woff2')).toString('base64');
const fontLatin = readFileSync(join(ROOT, 'public/fonts/inter-latin.woff2')).toString('base64');

const face = (b64) => `
  @font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 400 800;
    src: url(data:font/woff2;base64,${b64}) format('woff2');
  }`;

const svg = (size) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">${MARK}</svg>`;

const og = `<!doctype html><meta charset="utf-8"><style>
  ${face(fontData)}${face(fontLatin)}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1200px;height:630px}
  body{
    font-family:'Inter',sans-serif;background:${BG};color:#111;
    display:flex;flex-direction:column;justify-content:center;
    padding:0 96px;position:relative;overflow:hidden;
  }
  /* A soft plum wash off the right edge, the same one the cards use. */
  .glow{position:absolute;right:-180px;top:-180px;width:720px;height:720px;
        border-radius:50%;background:${PLUM};opacity:.07}
  .row{display:flex;align-items:center;gap:18px;margin-bottom:34px}
  .wm{font-weight:700;font-size:30px;letter-spacing:.22em;color:#111}
  h1{font-size:78px;line-height:1.06;font-weight:800;letter-spacing:-.035em;max-width:900px}
  h1 em{font-style:normal;color:${PLUM}}
  p{margin-top:28px;font-size:29px;line-height:1.45;color:#6c5f65;max-width:820px}
  .rule{margin-top:44px;height:5px;width:104px;background:${PLUM};border-radius:3px}
</style>
<div class="glow"></div>
<div class="row">${svg(52)}<div class="wm">RŌZU</div></div>
<h1>Your skincare routine, built from your <em>heritage</em>.</h1>
<p>Melanin, barrier and hormones differ by ancestry. A three-minute quiz turns yours into a morning and evening protocol.</p>
<div class="rule"></div>`;

const icon = `<!doctype html><meta charset="utf-8"><style>
  *{margin:0;padding:0}
  html,body{width:512px;height:512px}
  body{background:${BG};display:flex;align-items:center;justify-content:center}
</style>${svg(360)}`;

const browser = await chromium.launch({ executablePath: CHROME });

async function shot(html, width, height, out) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({ type: 'png' });
  writeFileSync(join(ROOT, out), buf);
  console.log(`${out}  ${width}x${height}  ${(buf.length / 1024).toFixed(0)} kB`);
  await page.close();
}

await shot(og, 1200, 630, 'app/opengraph-image.png');
await shot(icon, 512, 512, 'app/icon.png');
await browser.close();
