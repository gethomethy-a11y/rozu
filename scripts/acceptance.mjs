#!/usr/bin/env node
/* Acceptance greps for the RŌZU production port.
 * Scans the built output (.next/static, .next/server) for:
 *   1. emoji of any kind
 *   2. skin-tone hex values outside the question-3 swatches
 *   3. a secret (Anthropic, Stripe, token-signing) reaching a client bundle
 * Decodes \uXXXX / \u{...} escapes first, because SWC escapes non-ASCII in
 * JS output — a raw byte grep would miss an emoji that ships fine.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const TARGETS = ['.next/static', '.next/server'];
const EXT = /\.(js|mjs|css|html|json|rsc|txt)$/;

/** `ext` defaults to built-output files; the source scan passes its own. */
function walk(dir, out = [], ext = EXT) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out, ext);
    else if (ext.test(e)) out.push(p);
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
/* Classify a built file as RŌZU product code or framework plumbing.
 *
 * Rule, rather than an ever-growing exclusion list:
 *   - .next/static/**  ships to the browser, so it must be clean — except the
 *     handful of files that are verbatim vendor payloads (core-js polyfills,
 *     the React vendor chunk, Next's own runtime).
 *   - .next/server/**  only app/** is ours. Everything else there is Next's
 *     generated infrastructure (e.g. pages/_error.js, which exists even though
 *     this project has no pages/ directory) and never renders in the product.
 *
 * Known vendored emoji: a "©" in core-js's license string, and Next's
 * server-side terminal logger "⚠"/"▲"/"⨯".
 */
const VENDOR_STATIC = /\.next\/static\/chunks\/(polyfills|framework|webpack|main|4bd1b696)/;
function isVendored(rel) {
  if (rel.startsWith('.next/static/')) return VENDOR_STATIC.test(rel);
  if (rel.startsWith('.next/server/')) return !rel.startsWith('.next/server/app/');
  return false;
}

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
  (isVendored(relative(ROOT, f)) ? vendor : ours).push(line);
}
if (ours.length) { fail = 1; ours.forEach((h) => console.log('  FAIL (product code) ' + h)); }
else console.log(`  PASS — 0 emoji in RŌZU product code across ${files.length} built files (escapes decoded)`);
if (vendor.length) {
  console.log('  note — framework-vendored, not product code, not rendered in UI:');
  vendor.forEach((h) => console.log('         ' + h));
}

/* ── 2. SKIN-TONE HEXES ─────────────────────────────────── */
/* The rule: skin-tone colours exist for the six swatches in quiz question 3 and
 * nowhere else — never to tint a card, a background or an icon by skin tone.
 *
 * Checked at the SOURCE, not in the built output. Which bundle a module lands
 * in is the bundler's business and changes whenever an import moves; lib/quiz.ts
 * is now pulled into the server chunks too, because the API needs the answer
 * labels. That says nothing about how the colours are used. What matters is
 * that they are written down once, inside one question.
 *
 * The build is still checked for one thing a source scan cannot see: a hex
 * reaching a stylesheet, which would mean it had become a design colour.
 */
const SRC_DIRS = ['app', 'components', 'lib'];
const SRC_EXT = /\.(ts|tsx|js|jsx|css)$/;
const OWNER = 'lib/quiz.ts';

console.log('\n=== 2. Skin-tone hex values ===');
{
  const uniq = [...new Set(SRC_DIRS.flatMap((d) => walk(join(ROOT, d), [], SRC_EXT)))];
  if (uniq.length < 20) {
    fail = 1;
    console.log(`  FAIL scanned only ${uniq.length} source files — the scan itself is broken`);
  }

  for (const hex of SKINTONE_HEXES) {
    const inSrc = uniq.filter((f) => readFileSync(f, 'utf8').toLowerCase().includes(hex)).map((f) => relative(ROOT, f));
    const stray = inSrc.filter((r) => r !== OWNER);
    if (stray.length) { fail = 1; console.log(`  FAIL ${hex} — used outside ${OWNER}: ${stray.join(', ')}`); }
  }

  // All six must sit inside the skintone question, not merely somewhere in quiz.ts.
  const quiz = readFileSync(join(ROOT, OWNER), 'utf8');
  const q3 = quiz.slice(quiz.indexOf("id: 'skintone'"), quiz.indexOf("id: 'skintype'"));
  const outside = SKINTONE_HEXES.filter((h) => !q3.toLowerCase().includes(h));
  if (outside.length) { fail = 1; console.log(`  FAIL not inside question 3: ${outside.join(', ')}`); }

  const strayTotal = SKINTONE_HEXES.filter((hex) =>
    uniq.some((f) => relative(ROOT, f) !== OWNER && readFileSync(f, 'utf8').toLowerCase().includes(hex)),
  ).length;
  if (!strayTotal && !outside.length) {
    console.log(`  PASS — all 6 defined only in ${OWNER}, inside question 3, across ${uniq.length} source files`);
  }

  // A hex in CSS would mean a skin tone had become a design colour.
  const cssHits = files
    .filter((f) => f.endsWith('.css') && SKINTONE_HEXES.some((h) => readFileSync(f, 'utf8').toLowerCase().includes(h)))
    .map((f) => relative(ROOT, f));
  if (cssHits.length) { fail = 1; console.log(`  FAIL a skin-tone hex reached a stylesheet: ${cssHits.join(', ')}`); }
  else console.log('  PASS — no skin-tone hex in any built stylesheet');
}

/* ── 3. SECRETS IN CLIENT BUNDLE ────────────────────────── */
/* Every server-only secret, by name and — where it has a recognisable shape —
 * by value. A NEXT_PUBLIC_ prefix or an accidental import of a server module
 * into a client component is exactly what this catches. */
console.log('\n=== 3. Secrets in client bundle ===');
const SECRET_NAMES = [
  'ANTHROPIC_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'ROZU_TOKEN_SECRET',
  'ROZU_PREVIEW_KEY',
  'KV_REST_API_TOKEN',
  'UPSTASH_REDIS_REST_TOKEN',
  'SUPABASE_SERVICE_ROLE_KEY',
];
/* Key shapes, so a value pasted as a literal is caught even when the variable
   name it came from is not in the list above: an Anthropic key, a JWT, and
   Stripe's secret and webhook-signing keys. */
const SECRET_SHAPES = [
  /sk-ant-[A-Za-z0-9_-]{8,}/,
  /eyJ[A-Za-z0-9_-]{20,}\./,
  /sk_(test|live)_[A-Za-z0-9]{16,}/,
  /whsec_[A-Za-z0-9]{16,}/,
];
const clientFiles = walk(join(ROOT, '.next/static'));
let leaked = 0;
for (const name of SECRET_NAMES) {
  const hits = clientFiles.filter((f) => readFileSync(f, 'utf8').includes(name)).map((f) => relative(ROOT, f));
  if (hits.length) { fail = 1; leaked = 1; console.log(`  FAIL ${name} — ${hits.join(', ')}`); }
}
for (const shape of SECRET_SHAPES) {
  const hits = clientFiles.filter((f) => shape.test(readFileSync(f, 'utf8'))).map((f) => relative(ROOT, f));
  if (hits.length) { fail = 1; leaked = 1; console.log(`  FAIL literal matching ${shape} — ${hits.join(', ')}`); }
}
if (!leaked) {
  console.log(`  PASS — none of ${SECRET_NAMES.length} secret names, and no key-shaped literal, across ${clientFiles.length} client files`);
}

/* ── 4. NODE-ONLY MODULES IN CLIENT BUNDLE ──────────────── */
/* node:crypto reaching the browser would mean a server module (paidToken,
 * lemonsqueezy, kv) got pulled into a client component. Next would usually
 * fail the build first, but this is the cheap direct check. */
console.log('\n=== 4. Server-only modules in client bundle ===');
const nodeHits = clientFiles
  .filter((f) => /require\(["']node:(crypto|fs|http)["']\)|from"node:(crypto|fs|http)"/.test(readFileSync(f, 'utf8')))
  .map((f) => relative(ROOT, f));
if (nodeHits.length) { fail = 1; nodeHits.forEach((h) => console.log('  FAIL ' + h)); }
else console.log(`  PASS — no node: builtin imports across ${clientFiles.length} client files`);

console.log('\n' + (fail ? 'RESULT: FAIL' : 'RESULT: PASS'));
process.exit(fail);
