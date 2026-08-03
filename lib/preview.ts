/* Preview mode: skip the payment, keep everything else.
 *
 * For looking at the finished result while reviewing design and copy, without
 * putting a card through Lemon Squeezy every time. A preview order is a real
 * order — same record, same proof-of-payment token, same generate-once caching,
 * same AI call — it just starts out already marked paid.
 *
 * That is the point: what you review is what a paying customer gets, not an
 * approximation of it.
 *
 * Two things keep this from being a hole in the paywall:
 *   - it does not exist unless ROZU_PREVIEW_KEY is set, and the key must be
 *     long enough to be worth having
 *   - the comparison is timing-safe, and the key never reaches the client
 *     bundle — the browser only ever echoes back what was typed in the URL
 *
 * Delete ROZU_PREVIEW_KEY before launch. /api/setup says so out loud while it
 * is set. */
import { timingSafeEqual } from 'node:crypto';

/** Short keys are guessable, and a guessable key is an open paywall. */
const MIN_KEY_LENGTH = 16;

/* Both sides are trimmed. Pasting a value into a dashboard field on a phone
   picks up a trailing space or newline remarkably often, and the resulting
   failure is invisible — the value looks right in every UI that shows it. */
function configured(): string {
  return (process.env.ROZU_PREVIEW_KEY ?? '').trim();
}

export function previewEnabled(): boolean {
  return configured().length >= MIN_KEY_LENGTH;
}

export function previewKeyLength(): number {
  return configured().length;
}

export function previewKeyValid(given: unknown): boolean {
  if (!previewEnabled()) return false;
  if (typeof given !== 'string' || !given) return false;

  const want = Buffer.from(configured(), 'utf8');
  const got = Buffer.from(given.trim(), 'utf8');
  // timingSafeEqual throws on a length mismatch, so screen for that first.
  if (got.length !== want.length) return false;
  return timingSafeEqual(got, want);
}
