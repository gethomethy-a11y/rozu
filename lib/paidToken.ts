/* Single-purchase proof-of-payment token.
 *
 * Minted by the payment webhook once Lemon Squeezy confirms an order, handed to
 * the browser, and presented back to /api/generate. It is an HMAC over a small
 * payload — no database read is needed to know the token is authentic.
 *
 * It is deliberately NOT the last word on entitlement. A token proves "this
 * order was paid at mint time"; the order record in KV is what says the order
 * is still paid *now* (a refund flips it). /api/generate checks both. That way
 * a refunded customer cannot keep replaying a valid-looking token.
 *
 * Format: base64url(payloadJSON) + "." + base64url(hmacSHA256)
 * No JWT library, no algorithm negotiation, nothing to downgrade. */
import { createHmac, timingSafeEqual } from 'node:crypto';

/* The same type as lib/types' PlanName, re-exported rather than restated.
   Two hand-written copies would drift, and the direction that drifts silently
   is a plan this module will happily sign a token for and lib/stripe has no
   price for. */
export type { PlanName as Plan } from './types';
import type { PlanName as Plan } from './types';
import { PLAN_CENTS } from './types';

export type PaidPayload = {
  /** Our session id — the key the order and its routine are stored under. */
  sid: string;
  plan: Plan;
  /** Lemon Squeezy order id, for support and for the audit trail. */
  orderId: string;
  /** Issued at / expires at, seconds since epoch. */
  iat: number;
  exp: number;
};

/** Long enough that a customer can come back to their routine days later. */
export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function secret(): string {
  const s = process.env.ROZU_TOKEN_SECRET;
  if (!s || s.length < 16) {
    throw new Error('ROZU_TOKEN_SECRET is missing or too short (need 16+ characters)');
  }
  return s;
}

function mac(body: string): Buffer {
  return createHmac('sha256', secret()).update(body).digest();
}

export function signPaidToken(p: Omit<PaidPayload, 'iat' | 'exp'>): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: PaidPayload = { ...p, iat: now, exp: now + TOKEN_TTL_SECONDS };
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  return `${body}.${b64url(mac(body))}`;
}

/** Returns the payload only if the signature verifies and it has not expired. */
export function verifyPaidToken(token: unknown): PaidPayload | null {
  if (typeof token !== 'string' || token.length > 2048) return null;
  const dot = token.indexOf('.');
  if (dot < 1) return null;

  const body = token.slice(0, dot);
  const given = unb64url(token.slice(dot + 1));
  const want = mac(body);
  // timingSafeEqual throws on a length mismatch, so screen for that first.
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  let payload: PaidPayload;
  try {
    payload = JSON.parse(unb64url(body).toString('utf8')) as PaidPayload;
  } catch {
    return null;
  }

  if (typeof payload.sid !== 'string' || !payload.sid) return null;
  /* Checked against the one plan table rather than a list written out here.
     The list that used to live here said solo and couple, and adding the gift
     plan did not reach it: the token was minted correctly and then rejected on
     the way back, so a gift customer paid and got "payment required". A plan
     table lookup cannot fall out of step that way. */
  if (typeof payload.plan !== 'string' || !Object.hasOwn(PLAN_CENTS, payload.plan)) return null;
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}
