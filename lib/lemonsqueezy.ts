/* Lemon Squeezy, over plain fetch.
 *
 * Lemon Squeezy is the merchant of record: they take the card, they charge and
 * remit VAT, they send the receipt. We only ever do two things — ask them for a
 * checkout URL, and verify the webhook they send back.
 *
 * Their API is JSON:API, hence the vnd.api+json content type and the
 * data/attributes/relationships envelope. */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Plan } from './paidToken';

/* Overridable so the end-to-end test can point at a local mock. Production
   never sets it; if it is ever set in a deployed environment that is a
   misconfiguration, and it is loud in the logs. */
const API = process.env.LEMONSQUEEZY_API_BASE ?? 'https://api.lemonsqueezy.com/v1';
if (process.env.LEMONSQUEEZY_API_BASE && process.env.NODE_ENV === 'production') {
  console.warn(`[lemonsqueezy] API base overridden to ${process.env.LEMONSQUEEZY_API_BASE}`);
}

/* Test mode is per checkout, not per API key, so it has to be sent explicitly.
   Anything other than an explicit "off" value means test — a store that has not
   finished activation cannot take real money anyway, and defaulting the other
   way risks a live charge during testing. Set LEMONSQUEEZY_TEST_MODE=0 to go
   live. */
export function testMode(): boolean {
  const v = (process.env.LEMONSQUEEZY_TEST_MODE ?? '').trim().toLowerCase();
  return !(v === '0' || v === 'false' || v === 'no' || v === 'off');
}

export function lsConfigured(): boolean {
  return Boolean(
    process.env.LEMONSQUEEZY_API_KEY &&
      process.env.LEMONSQUEEZY_STORE_ID &&
      process.env.LEMONSQUEEZY_VARIANT_SOLO &&
      process.env.LEMONSQUEEZY_VARIANT_COUPLE,
  );
}

export function variantFor(plan: Plan): string {
  const v = plan === 'couple' ? process.env.LEMONSQUEEZY_VARIANT_COUPLE : process.env.LEMONSQUEEZY_VARIANT_SOLO;
  if (!v) throw new Error(`no variant configured for plan "${plan}"`);
  return v;
}

/** The prototype's prices. Used to sanity-check what was actually charged.
 *  Defined in lib/types so the browser can read the same numbers without
 *  pulling this module — and its node:crypto import — into a client bundle. */
export { PLAN_CENTS } from './types';

type CheckoutResponse = { data?: { attributes?: { url?: string } } };

/**
 * Creates a hosted checkout and returns its URL.
 *
 * `custom.sid` is the thread that ties the payment back to this quiz: Lemon
 * Squeezy hands it straight back on the webhook, and it is also the query
 * parameter on the return URL, so both paths converge on the same record.
 */
export async function createCheckout(opts: {
  plan: Plan;
  sid: string;
  redirectUrl: string;
  email?: string;
}): Promise<string> {
  const key = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (!key || !storeId) throw new Error('Lemon Squeezy is not configured');

  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          // Lemon Squeezy stores custom values as strings.
          custom: { sid: opts.sid, plan: opts.plan },
          ...(opts.email ? { email: opts.email } : {}),
        },
        product_options: {
          redirect_url: opts.redirectUrl,
          // Nothing to receive by email — the routine lives in the app.
          receipt_button_text: 'View your routine',
          receipt_link_url: opts.redirectUrl,
        },
        checkout_options: { embed: false },
        test_mode: testMode(),
      },
      relationships: {
        store: { data: { type: 'stores', id: String(storeId) } },
        variant: { data: { type: 'variants', id: variantFor(opts.plan) } },
      },
    },
  };

  const res = await fetch(`${API}/checkouts`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`checkout creation failed: ${res.status} ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as CheckoutResponse;
  const url = json.data?.attributes?.url;
  if (!url) throw new Error('checkout creation returned no url');
  return url;
}

/**
 * Verifies the X-Signature header against the RAW request body.
 *
 * Must be given the exact bytes Lemon Squeezy sent — re-serialising the parsed
 * JSON changes key order and whitespace and the HMAC will not match.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const want = createHmac('sha256', secret).update(rawBody, 'utf8').digest();
  let given: Buffer;
  try {
    given = Buffer.from(signature, 'hex');
  } catch {
    return false;
  }
  if (given.length !== want.length) return false;
  return timingSafeEqual(given, want);
}

export type WebhookEvent = {
  eventName: string;
  orderId: string;
  status: string;
  variantId: string;
  totalCents: number;
  custom: Record<string, unknown>;
};

/** Pulls the handful of fields we act on out of the webhook envelope. */
export function parseWebhook(payload: unknown): WebhookEvent | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const p = payload as Record<string, unknown>;

  const meta = (p.meta ?? {}) as Record<string, unknown>;
  const data = (p.data ?? {}) as Record<string, unknown>;
  const attrs = (data.attributes ?? {}) as Record<string, unknown>;
  const firstItem = (attrs.first_order_item ?? {}) as Record<string, unknown>;

  const eventName = typeof meta.event_name === 'string' ? meta.event_name : '';
  if (!eventName) return null;

  return {
    eventName,
    orderId: typeof data.id === 'string' ? data.id : String(data.id ?? ''),
    status: typeof attrs.status === 'string' ? attrs.status : '',
    variantId: String(firstItem.variant_id ?? ''),
    totalCents: typeof attrs.total === 'number' ? attrs.total : 0,
    custom:
      typeof meta.custom_data === 'object' && meta.custom_data !== null
        ? (meta.custom_data as Record<string, unknown>)
        : {},
  };
}
