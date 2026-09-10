/* Stripe, over plain fetch.
 *
 * Replaces Lemon Squeezy. The important difference is not technical: Lemon
 * Squeezy was the merchant of record and Stripe is not, so the operator of this
 * site is now the seller and is responsible for charging and remitting tax.
 * That is why automatic_tax is on by default here — see taxEnabled() — and why
 * the legal pages had to be rewritten alongside this file.
 *
 * Stripe's REST API is form-encoded, not JSON, hence the flatten() below.
 * Responses are JSON. */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PLAN_CENTS, type PlanName as Plan } from './types';

/* Overridable so the end-to-end test can point at a local mock. Production
   never sets it; if it is ever set in a deployed environment that is a
   misconfiguration, and it is loud in the logs. */
const API = process.env.STRIPE_API_BASE ?? 'https://api.stripe.com/v1';
if (process.env.STRIPE_API_BASE && process.env.NODE_ENV === 'production') {
  console.warn(`[stripe] API base overridden to ${process.env.STRIPE_API_BASE}`);
}

/* Which environment a key belongs to is encoded in the key itself, so there is
   nothing to set and nothing to get wrong. This is strictly better than the
   LEMONSQUEEZY_TEST_MODE flag it replaces: that one defaulted to test and had
   to be explicitly turned off, which is a launch step people forget. Here,
   using the live key IS going live.

   Both key kinds count. A restricted key is rk_test_ / rk_live_, and matching
   only sk_ meant an rk_test_ key — a perfectly ordinary way to run test mode —
   was reported as LIVE. Getting that backwards is the expensive direction: it
   reads "real cards" on a screen where nothing can be charged, and it would
   have said the same about the live key if the prefix ever changed shape. */
const KEY_RE = /^(sk|rk)_(test|live)_/;

export function testMode(): boolean {
  return /^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? '');
}

/** Whether the key is one Stripe would accept at all, whatever its scopes. */
export function keyLooksValid(): boolean {
  return KEY_RE.test(process.env.STRIPE_SECRET_KEY ?? '');
}

/** 'restricted' keys carry only the scopes granted to them; 'secret' keys
 *  carry everything. Checkout needs write access either way. */
export function keyKind(): 'restricted' | 'secret' | 'unknown' {
  const k = process.env.STRIPE_SECRET_KEY ?? '';
  if (k.startsWith('rk_')) return 'restricted';
  if (k.startsWith('sk_')) return 'secret';
  return 'unknown';
}

/* Stripe Tax. On unless explicitly switched off.
 *
 * On its own this only calculates tax; it does not register or remit it. It
 * also only charges tax in jurisdictions where a registration has been added
 * in the Stripe dashboard — with none configured it calculates zero and the
 * checkout still works, which is the safe way for this to be wrong. */
export function taxEnabled(): boolean {
  const v = (process.env.STRIPE_TAX ?? '').trim().toLowerCase();
  return !(v === '0' || v === 'false' || v === 'no' || v === 'off');
}

const PRICE_ENV: Record<Plan, string> = {
  solo: 'STRIPE_PRICE_SOLO',
  couple: 'STRIPE_PRICE_COUPLE',
  gift: 'STRIPE_PRICE_GIFT',
};

export function priceFor(plan: Plan): string {
  const v = process.env[PRICE_ENV[plan]];
  if (!v) throw new Error(`no price configured for plan "${plan}" (${PRICE_ENV[plan]})`);
  return v;
}

export function stripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_SOLO &&
      process.env.STRIPE_PRICE_COUPLE &&
      process.env.STRIPE_PRICE_GIFT,
  );
}

/* Stripe takes application/x-www-form-urlencoded with bracketed paths for
   nested values: metadata[sid]=abc, line_items[0][price]=price_x. Undefined
   values are dropped so optional parameters can be passed through unguarded. */
function flatten(obj: Record<string, unknown>, prefix = '', out = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === 'object' && item !== null) flatten(item as Record<string, unknown>, `${key}[${i}]`, out);
        else out.append(`${key}[${i}]`, String(item));
      });
    } else if (typeof v === 'object') {
      flatten(v as Record<string, unknown>, key, out);
    } else {
      out.append(key, String(v));
    }
  }
  return out;
}

/**
 * Creates a hosted Checkout Session and returns its URL.
 *
 * `sid` is the thread that ties the payment back to this quiz, and it is
 * written into three places on purpose:
 *   client_reference_id        — shows up in the dashboard, useful for support
 *   metadata                   — what checkout.session.completed carries back
 *   payment_intent_data.metadata — what a refund carries back
 * The last one matters: a refund event is a Charge, not a Session, and without
 * this the refund would arrive with no way to tell which order it belongs to.
 */
export async function createCheckout(opts: {
  plan: Plan;
  sid: string;
  redirectUrl: string;
  cancelUrl: string;
  email?: string;
}): Promise<string> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe is not configured');

  const meta = { sid: opts.sid, plan: opts.plan };

  const body = flatten({
    mode: 'payment',
    line_items: [{ price: priceFor(opts.plan), quantity: 1 }],
    success_url: opts.redirectUrl,
    cancel_url: opts.cancelUrl,
    client_reference_id: opts.sid,
    metadata: meta,
    payment_intent_data: { metadata: meta },
    customer_email: opts.email,
    /* Stripe Tax needs to know where the customer is, and for digital goods
       sold into the EU the address is also the evidence the VAT rules ask for.
       Without this the session is created but every sale is taxed at zero. */
    ...(taxEnabled() ? { automatic_tax: { enabled: true }, billing_address_collection: 'required' } : {}),
  });

  const res = await fetch(`${API}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      /* One session per sid. A double-tapped Unlock button returns the same
         checkout rather than opening a second one the customer could also
         pay. */
      'Idempotency-Key': `checkout:${opts.sid}`,
    },
    body: body.toString(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`checkout creation failed: ${res.status} ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as { url?: string };
  if (!json.url) throw new Error('checkout creation returned no url');
  return json.url;
}

/** Stripe's replay window. Anything older is rejected even if it verifies. */
const TOLERANCE_SECONDS = 300;

/**
 * Verifies the Stripe-Signature header against the RAW request body.
 *
 * The header looks like `t=1699999999,v1=abc...`, and the signed payload is
 * `${t}.${rawBody}` — not the body alone. Must be given the exact bytes Stripe
 * sent; re-serialising the parsed JSON changes key order and the HMAC will not
 * match.
 *
 * More than one v1 may be present while a signing secret is being rotated, so
 * any match is accepted.
 */
export function verifyWebhookSignature(rawBody: string, header: string | null, nowMs = Date.now()): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;

  let timestamp = '';
  const candidates: string[] = [];
  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k === 't') timestamp = v;
    else if (k === 'v1') candidates.push(v);
  }
  if (!timestamp || !candidates.length) return false;

  /* Without this a signature stays valid forever, and anyone who captures one
     delivery can replay it — which for this webhook means re-marking a
     refunded order as paid. */
  const age = Math.abs(nowMs / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false;

  const want = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest();
  return candidates.some((c) => {
    let given: Buffer;
    try {
      given = Buffer.from(c, 'hex');
    } catch {
      return false;
    }
    if (given.length !== want.length) return false;
    return timingSafeEqual(given, want);
  });
}

export type WebhookEvent = {
  eventName: string;
  /** The PaymentIntent id where there is one: what the dashboard and the
   *  customer's receipt both show, and the one id a refund also carries. */
  orderId: string;
  /** Before tax and discounts, so it can be compared against the plan price
   *  whichever way tax_behavior is configured on the Price. */
  subtotalCents: number;
  metadata: Record<string, unknown>;
  /** Async payment methods can complete a session that is not yet paid. */
  paid: boolean;
};

/** Pulls the handful of fields we act on out of the event envelope. */
export function parseWebhook(payload: unknown): WebhookEvent | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const p = payload as Record<string, unknown>;

  const eventName = typeof p.type === 'string' ? p.type : '';
  if (!eventName) return null;

  const data = (p.data ?? {}) as Record<string, unknown>;
  const o = (data.object ?? {}) as Record<string, unknown>;

  const pi = o.payment_intent;
  const orderId = typeof pi === 'string' && pi ? pi : String(o.id ?? '');

  const subtotal = typeof o.amount_subtotal === 'number' ? o.amount_subtotal : null;
  /* A Charge has no subtotal. Falling back to amount is fine there: the
     refund path does not compare against a price. */
  const amount = typeof o.amount === 'number' ? o.amount : 0;

  return {
    eventName,
    orderId,
    subtotalCents: subtotal ?? amount,
    metadata:
      typeof o.metadata === 'object' && o.metadata !== null ? (o.metadata as Record<string, unknown>) : {},
    paid: o.payment_status === 'paid' || o.payment_status === undefined,
  };
}

export { PLAN_CENTS };
