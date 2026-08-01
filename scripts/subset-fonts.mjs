#!/usr/bin/env node
/* Subset the Inter variable font to the range RŌZU can actually render.
 *
 * The full latin-ext subset is 85KB and exists here for exactly one glyph —
 * the Ō in the wordmark. Shipping it whole is 85KB of LCP for one character.
 *
 * Kept deliberately generous, because routine text comes from the model and
 * is not fully known ahead of time: all of Basic Latin, Latin-1 Supplement and
 * Latin Extended-A, plus general punctuation and the arrows the UI uses.
 *
 * GPOS/GSUB are preserved — dropping them would shrink the file further but
 * change kerning, and the port is verified pixel-identical to the prototype.
 *
 * Requires: pip install "fonttools[woff]"
 */
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';

const UNICODES = [
  'U+0020-007E', // Basic Latin
  'U+00A0-00FF', // Latin-1 Supplement (× · © accents)
  'U+0100-017F', // Latin Extended-A  (Ō U+014C — the wordmark)
  'U+2000-206F', // General punctuation (– — ' ' " " • …)
  'U+2190-2193', // ← ↑ → ↓
  'U+20AC',      // €
  'U+2122',      // ™
  'U+2212',      // −
].join(',');

const files = ['inter-latin', 'inter-latin-ext'];
for (const f of files) {
  const src = `public/fonts/${f}.woff2`;
  const before = statSync(src).size;
  execFileSync('python3', [
    '-m', 'fontTools.subset', src,
    `--unicodes=${UNICODES}`,
    '--layout-features=*',      // keep kerning/ligatures: shaping must not change
    '--flavor=woff2',
    '--with-zopfli',
    `--output-file=${src}`,
  ], { stdio: 'inherit' });
  const after = statSync(src).size;
  console.log(
    `${f}.woff2  ${(before / 1024).toFixed(1)}KB -> ${(after / 1024).toFixed(1)}KB` +
    `  (-${(100 - (after / before) * 100).toFixed(0)}%)`,
  );
}
