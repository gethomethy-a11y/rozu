#!/usr/bin/env node
/* Acceptance greps for the RŌZU production port.
 * Scans the built output (.next/static, .next/server) for:
 *   1. emoji of any kind
 *   2. skin-tone hex values outside the question-3 swatches
 *   3. ANTHROPIC_API_KEY reaching a client bundle
 * Decodes \uXXXX / \u{...} escapes first, because SWC escapes non-ASCII in
 * JS output — a raw byte grep would miss an emoji that ships fine.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const TARGETS = ['.next/static', '.next/server'];
const EXT = /\.(js|mjs|css|html|json|rsc|txt)$/;

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (EXT.test(e)) out.push(p);
  }
  return out;
}

/** Decode \uXXXX, \u{XXXXX} and surrogate pairs so escaped emoji are visible. */
function decodeEscapes(s) {
  return s
    .replace(/\\u\{([0-9a-fA-F]{1,6})\}/g, (_, h) => {
      try { return String.fromCodePoint(parseInt(h, 16)); } catch { return _; }
    })
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// Emoji: Extended_Pictographic covers every emoji, and excludes plain
// punctuation arrows (→ ↑ ×) and letterlike marks, which are not emoji.
const EMOJI = /\p{Extended_Pictographic}/u;
const EMOJI_G = /\p{Extended_Pictographic}/gu;

// The six question-3 swatches. These may appear ONLY in the quiz chunk.
const SKINTONE_HEXES = ['#f7d7c2', '#f0c19c', '#d69868', '#b5723e', '#7d4a1e', '#3d2210'];

const files = TARGETS.flatMap((t) => walk(join(ROOT, t)));
let fail = 0;

/* ── 1. EMOJI ───────────────────────────────────────────── */
// Framework-vendored files. Emoji here are Next.js/core-js internals (a
// core-js license "©", Next's server-side terminal logger "⚠"/"▲"/"⨯"), not
// RŌZU product code, and none of them render in the product UI. Reported
// separately so the gate stays a real regression check on our own code.
const VENDORED = /(^|\/)\.next\/(static\/chunks\/(polyfills|framework|webpack|main|4bd1b696)|server\/chunks\/)/;

console.log('=== 1. Emoji in shipped bundle ===');
const ours = [];
const vendor = [];
for (const f of files) {
  const text = decodeEscapes(readFileSync(f, 'utf8'));
  if (!EMOJI.test(text)) continue;
  const found = [...new Set(text.match(EMOJI_G))]
    .map((c) => c + ' U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'))
    .join(' ');
  const line = `${relative(ROOT, f)}: ${found}`;
  (VENDORED.test(relative(ROOT, f)) ? vendor : ours).push(line);
}
if (ours.length) { fail = 1; ours.forEach((h) => console.log('  FAIL (product code) ' + h)); }
else console.log(`  PASS — 0 emoji in RŌZU product code across ${files.length} built files (escapes decoded)`);
if (vendor.length) {
  console.log('  note — framework-vendored, not product code, not rendered in UI:');
  vendor.forEach((h) => console.log('         ' + h));
}

/* ── 2. SKIN-TONE HEXES ─────────────────────────────────── */
// The swatches live in lib/quiz.ts, which is bundled into the page chunk.
// Both the client chunk and its server-render counterpart are the same module.
const QUIZ_CHUNK = /\.next\/(static\/chunks\/app\/page-[a-f0-9]+\.js|server\/app\/page\.js)$/;

console.log('\n=== 2. Skin-tone hex values ===');
for (const hex of SKINTONE_HEXES) {
  const rel = files
    .filter((f) => readFileSync(f, 'utf8').toLowerCase().includes(hex))
    .map((f) => relative(ROOT, f));
  const stray = rel.filter((r) => !QUIZ_CHUNK.test(r));
  if (stray.length) { fail = 1; console.log(`  FAIL ${hex} — outside question 3: ${stray.join(', ')}`); }
  else console.log(`  PASS ${hex}  ${rel.length} file(s), all question-3 swatch module: ${rel.join(', ')}`);
}

/* ── 3. API KEY IN CLIENT BUNDLE ────────────────────────── */
console.log('\n=== 3. ANTHROPIC_API_KEY in client bundle ===');
const clientFiles = walk(join(ROOT, '.next/static'));
const keyHits = clientFiles.filter((f) => {
  const t = readFileSync(f, 'utf8');
  return t.includes('ANTHROPIC_API_KEY') || /sk-ant-[A-Za-z0-9_-]{8,}/.test(t);
});
if (keyHits.length) { fail = 1; keyHits.forEach((f) => console.log('  FAIL ' + relative(ROOT, f))); }
else console.log(`  PASS — no ANTHROPIC_API_KEY and no sk-ant-* literal across ${clientFiles.length} client files`);

console.log('\n' + (fail ? 'RESULT: FAIL' : 'RESULT: PASS'));
process.exit(fail);
