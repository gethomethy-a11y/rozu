/* One-time redemption codes, for sales made somewhere other than Stripe.
 *
 * Etsy takes the money, so there is no Stripe payment to verify. What stands in
 * for it is a code that was minted here, handed to exactly one buyer, and can
 * be spent exactly once. A redeemed code writes the same order record a paid
 * Stripe checkout writes — so /api/paid, /api/generate, the token and the
 * generate-once cache all carry on unchanged, none of them aware there was a
 * second sales channel.
 *
 * Why not a shared link with a secret in it, which would have been a tenth of
 * this: because that is ROZU_PREVIEW_KEY printed in a file handed to strangers
 * and never rotated. One screenshot and every routine after it is free, and
 * each free routine is a model call that gets paid for regardless. A code that
 * burns on use bounds the damage at one.
 *
 * The plan lives ON the code, never in the URL. A link carrying plan=couple is
 * a link a buyer can edit into a $12 product they paid $9 for. */
import { randomInt, timingSafeEqual } from 'node:crypto';
import { kvGet, kvSet, kvSetIfAbsent } from './kv';
import type { PlanName } from './types';

/* No 0/O, 1/I/L, or U: these are read off a screen and typed by hand, and
   those are the characters people get wrong. U is dropped separately — it
   keeps the alphabet from spelling anything unfortunate. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const GROUP = 4;

/** A year. A code sold today has to still work for someone who buys, forgets,
 *  and comes back next season — an unredeemed code is money already taken. */
export const CODE_TTL_SECONDS = 60 * 60 * 24 * 365;

const codeKey = (code: string) => `etsycode:${code}`;
/* Separate from the code record on purpose. Claiming is the atomic step, and
   kvSetIfAbsent is atomic only against a key that does not exist yet — so the
   claim needs its own key rather than a flag flipped on the record, which two
   concurrent redemptions would both read as unflipped. */
const claimKey = (code: string) => `etsyclaim:${code}`;

export type CodeRecord = { plan: PlanName; mintedAt: number; note?: string };
export type ClaimRecord = { sid: string; at: number };

/** Uppercase, and strip anything that is not in the alphabet — so a code typed
 *  with the wrong case, extra spaces, or the dashes left out still matches. */
export function normalize(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const bare = raw.toUpperCase().replace(new RegExp(`[^${ALPHABET}]`, 'g'), '');
  if (bare.length !== GROUP * 2) return '';
  return `${bare.slice(0, GROUP)}-${bare.slice(GROUP)}`;
}

function randomCode(): string {
  let out = '';
  for (let i = 0; i < GROUP * 2; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return `${out.slice(0, GROUP)}-${out.slice(GROUP)}`;
}

/** Mints `count` unused codes for one plan. Returns the codes to hand out. */
export async function mintCodes(plan: PlanName, count: number, note?: string): Promise<string[]> {
  const made: string[] = [];
  for (let i = 0; i < count; i++) {
    /* A collision would silently overwrite a code already sold, so claim the
       key rather than setting it, and try again on the rare miss. */
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCode();
      const rec: CodeRecord = { plan, mintedAt: Date.now(), ...(note ? { note } : {}) };
      if (await kvSetIfAbsent(codeKey(code), rec, CODE_TTL_SECONDS)) {
        made.push(code);
        break;
      }
    }
  }
  return made;
}

export type RedeemResult =
  | { ok: true; plan: PlanName }
  | { ok: false; reason: 'unknown' | 'spent' | 'wrong_plan'; plan?: PlanName };

/**
 * Spends a code against one order, or explains why it cannot.
 *
 * `wantPlan` is what the buyer actually filled in the quiz for. It has to match
 * what the code was minted for: a Solo code must not pay for the Couple
 * routine, however the buyer arrived at the couple flow.
 */
export async function redeemCode(raw: unknown, sid: string, wantPlan: PlanName): Promise<RedeemResult> {
  const code = normalize(raw);
  if (!code) return { ok: false, reason: 'unknown' };

  const rec = await kvGet<CodeRecord>(codeKey(code));
  if (!rec) return { ok: false, reason: 'unknown' };
  if (rec.plan !== wantPlan) return { ok: false, reason: 'wrong_plan', plan: rec.plan };

  /* The single-use guarantee, and the only line in this file that has to be
     right under concurrency: exactly one caller creates this key. Its TTL
     starts now, so the claim always outlives the code it spends — a claim
     expiring first would quietly make the code reusable. */
  const claim: ClaimRecord = { sid, at: Date.now() };
  const won = await kvSetIfAbsent(claimKey(code), claim, CODE_TTL_SECONDS);
  if (!won) return { ok: false, reason: 'spent' };

  /* Best effort. The claim above is what makes the code spent; this only
     records which order spent it, for support. */
  try {
    await kvSet(codeKey(code), { ...rec, redeemedBy: sid } as CodeRecord, CODE_TTL_SECONDS);
  } catch {
    /* ignore — the claim already stands */
  }

  return { ok: true, plan: rec.plan };
}

/** Whether a code exists and is still unspent. Read-only; spends nothing. */
export async function codeStatus(raw: unknown): Promise<'unknown' | 'unused' | 'spent'> {
  const code = normalize(raw);
  if (!code) return 'unknown';
  if (!(await kvGet<CodeRecord>(codeKey(code)))) return 'unknown';
  return (await kvGet<ClaimRecord>(claimKey(code))) ? 'spent' : 'unused';
}

/* Minting is gated separately from ROZU_SETUP.
 *
 * The setup page is readable by anyone while ROZU_SETUP is set — that is the
 * whole reason it is meant to be switched off again. Hanging "mint free
 * routines" off that gate alone would make it an open tap for as long as it
 * stays on. Two independent things must be true instead. */
const MIN_ADMIN_KEY_LENGTH = 16;

function adminKey(): string {
  return (process.env.ROZU_ADMIN_KEY ?? '').trim();
}

export function mintingEnabled(): boolean {
  return adminKey().length >= MIN_ADMIN_KEY_LENGTH;
}

export function adminKeyValid(given: unknown): boolean {
  if (!mintingEnabled()) return false;
  if (typeof given !== 'string' || !given) return false;
  const want = Buffer.from(adminKey(), 'utf8');
  const got = Buffer.from(given.trim(), 'utf8');
  // timingSafeEqual throws on a length mismatch, so screen for that first.
  if (got.length !== want.length) return false;
  return timingSafeEqual(got, want);
}
