/* The order record: what the browser bought, and whether it has been paid for.
 *
 * Written by /api/checkout before the customer leaves for Lemon Squeezy, so the
 * quiz answers survive the round trip without relying on the browser holding
 * them. Flipped to "paid" by the webhook. Read by /api/generate.
 *
 * This is the single source of truth for entitlement. The token proves the
 * customer is who they say they are; this record says whether they are still
 * entitled. */
import {
  CONCERN_LABELS,
  GENDER_LABELS,
  HO,
  LEVEL_LABELS,
  SO,
  TONE_LABELS,
  concernsOf,
  emptyLife,
  genderOf,
  heritageOf,
  levelOf,
  skinOf,
  toneOf,
  type Answers,
  type Life,
} from './quiz';
import type { Plan } from './paidToken';
import type { Routine } from './types';

export type Profile = {
  heritage: string;
  skin: string;
  life: Life;
  /* Stored as indices, never as text. Everything here ends up inside a model
     prompt, and an index into a fixed table cannot carry an instruction.
     Optional because orders placed before these were collected still have to
     be readable. */
  concerns?: number[];
  tone?: number | null;
  gender?: number | null;
  level?: number | null;
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
  /* Which channel took the money. Absent on orders written before there was
     more than one, which are all Stripe. This is also the Etsy sales count:
     the order records are the only place both channels meet. */
  channel?: 'stripe' | 'etsy';
  /** The redemption code spent on this order, for support and reconciliation. */
  etsyCode?: string;
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
 * Builds a profile from raw quiz answers.
 *
 * Shared by the browser (which sends it to /api/checkout, and uses it to show
 * the compatibility teaser) and by nothing else — but it lives here so the
 * teaser and the paid result are computed from an identical shape. A customer
 * shown 91% before paying and 84% after would be right to feel cheated.
 */
export function profileOf(a: Answers, l: Life): Profile {
  return {
    heritage: heritageOf(a),
    skin: skinOf(a),
    life: l,
    concerns: concernsOf(a),
    tone: toneOf(a),
    gender: genderOf(a),
    level: levelOf(a),
  };
}

/** An index the browser sent, or null if it is not one of ours. */
function coerceIndex(v: unknown, table: readonly string[]): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < table.length ? v : null;
}

function coerceIndexList(v: unknown, table: readonly string[]): number[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<number>();
  for (const x of v) {
    const i = coerceIndex(x, table);
    if (i !== null) seen.add(i);
  }
  return [...seen].sort((a, b) => a - b);
}

/**
 * Accepts a profile from the browser.
 *
 * Heritage and skin must be one of the quiz's own options rather than merely
 * short strings. Everything here is handed to a model, and "is this one of nine
 * known values" is a far stronger guarantee than "is this under 80 characters".
 */
export function parseProfile(v: unknown): Profile | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;

  const heritage = typeof o.heritage === 'string' ? o.heritage.trim() : '';
  const skin = typeof o.skin === 'string' ? o.skin.trim() : '';
  if (!HO.includes(heritage) || !SO.includes(skin)) return null;

  return {
    heritage,
    skin,
    life: coerceLife(o.life),
    concerns: coerceIndexList(o.concerns, CONCERN_LABELS),
    tone: coerceIndex(o.tone, TONE_LABELS),
    gender: coerceIndex(o.gender, GENDER_LABELS),
    level: coerceIndex(o.level, LEVEL_LABELS),
  };
}
