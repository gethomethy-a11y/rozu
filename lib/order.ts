/* The order record: what the browser bought, and whether it has been paid for.
 *
 * Written by /api/checkout before the customer leaves for Lemon Squeezy, so the
 * quiz answers survive the round trip without relying on the browser holding
 * them. Flipped to "paid" by the webhook. Read by /api/generate.
 *
 * This is the single source of truth for entitlement. The token proves the
 * customer is who they say they are; this record says whether they are still
 * entitled. */
import { emptyLife, type Life } from './quiz';
import type { Plan } from './paidToken';
import type { Routine } from './types';

export type Profile = {
  heritage: string;
  skin: string;
  life: Life;
};

export type OrderStatus = 'pending' | 'paid' | 'refunded';

export type OrderRecord = {
  plan: Plan;
  status: OrderStatus;
  self: Profile;
  /** Present only for the couple plan. */
  partner: Profile | null;
  createdAt: number;
  orderId?: string;
  /** Attribution captured at checkout; consumed by step 4. */
  utm?: Record<string, string>;
  /* Created through preview mode, so no money changed hands. Kept on the record
     so these never get counted as revenue when analytics land in step 4. */
  preview?: boolean;
};

export type GeneratedRoutines = {
  self: Routine;
  partner: Routine | null;
};

/** Orders and their routines outlive the token so support can still help. */
export const ORDER_TTL_SECONDS = 60 * 60 * 24 * 45;

export const orderKey = (sid: string) => `order:${sid}`;
export const routineKey = (sid: string) => `routine:${sid}`;
export const genLockKey = (sid: string) => `genlock:${sid}`;

/** A sid we minted: a v4 UUID. Rejecting anything else keeps the key space ours. */
export function isSid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
}

function coerceLife(v: unknown): Life {
  const l = emptyLife();
  if (typeof v !== 'object' || v === null) return l;
  const o = v as Record<string, unknown>;
  for (const k of ['sleep', 'stress', 'diet'] as const) {
    const n = o[k];
    if (typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < 10) l[k] = n;
  }
  return l;
}

/**
 * Accepts a profile from the browser. Heritage and skin are free text that goes
 * into a model prompt, so they are length-capped — the quiz only ever sends one
 * of the fixed labels, and anything longer is not a real customer.
 */
export function parseProfile(v: unknown): Profile | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  const heritage = typeof o.heritage === 'string' ? o.heritage.trim() : '';
  const skin = typeof o.skin === 'string' ? o.skin.trim() : '';
  if (!heritage || !skin) return null;
  if (heritage.length > 80 || skin.length > 80) return null;
  return { heritage, skin, life: coerceLife(o.life) };
}
