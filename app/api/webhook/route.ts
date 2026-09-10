import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';
import { PLAN_CENTS, parseWebhook, verifyWebhookSignature } from '@/lib/stripe';
import { ORDER_TTL_SECONDS, isSid, orderKey, type OrderRecord } from '@/lib/order';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* Stripe's confirmation of payment. This is the only thing that can move an
 * order from "pending" to "paid" — the browser coming back from checkout proves
 * nothing, since anyone can type that URL.
 *
 * Every outcome other than a bad signature returns 200. A non-2xx makes Stripe
 * retry, and retrying will not fix an event we have no record for. */

/* checkout.session.completed is the ordinary card path. A delayed payment
   method completes the session before the money arrives and settles later as
   async_payment_succeeded, so both have to be able to mark an order paid. */
const PAID_EVENTS = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);
/* A Charge, not a Session — it carries the sid only because the checkout put
   it on payment_intent_data.metadata. */
const REFUND_EVENTS = new Set(['charge.refunded']);

export async function POST(req: Request) {
  // Must be the exact bytes that were signed — parsing and re-serialising
  // would reorder keys and break the HMAC.
  const raw = await req.text();

  if (!verifyWebhookSignature(raw, req.headers.get('stripe-signature'))) {
    console.warn('[webhook] rejected: bad signature');
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'bad payload' }, { status: 400 });
  }

  const ev = parseWebhook(payload);
  if (!ev) return NextResponse.json({ ok: true, ignored: 'unparseable' });

  const isPaid = PAID_EVENTS.has(ev.eventName);
  const isRefund = REFUND_EVENTS.has(ev.eventName);
  if (!isPaid && !isRefund) {
    return NextResponse.json({ ok: true, ignored: ev.eventName });
  }

  /* A session can complete without being paid — a delayed payment method that
     has not cleared. Marking that paid would hand over the routine before the
     money arrives; async_payment_succeeded is what follows if it clears. */
  if (isPaid && !ev.paid) {
    console.info(`[webhook] ${ev.eventName} for ${ev.orderId} is not paid yet, waiting`);
    return NextResponse.json({ ok: true, ignored: 'unpaid' });
  }

  const sid = ev.metadata.sid;
  if (!isSid(sid)) {
    // A purchase made outside our flow, or a sid we never issued. Nothing to
    // deliver — the customer has a Stripe receipt and we have this log.
    console.error(`[webhook] ${ev.eventName} ${ev.orderId} carried no usable sid`);
    return NextResponse.json({ ok: true, ignored: 'no sid' });
  }

  const record = await kvGet<OrderRecord>(orderKey(sid));
  if (!record) {
    console.error(`[webhook] ${ev.eventName} for unknown or expired sid ${sid} (${ev.orderId})`);
    return NextResponse.json({ ok: true, ignored: 'unknown sid' });
  }

  if (isRefund) {
    // Entitlement is read from this record on every generate, so flipping it
    // here is enough — no token revocation list required.
    await kvSet(orderKey(sid), { ...record, status: 'refunded' }, ORDER_TTL_SECONDS);
    console.warn(`[webhook] refunded ${sid} (${ev.orderId})`);
    return NextResponse.json({ ok: true });
  }

  /* Redelivery is expected, so this is written to be idempotent: the same
     values land in the same place however many times it arrives. */
  if (record.status === 'paid' && record.orderId === ev.orderId) {
    return NextResponse.json({ ok: true, already: true });
  }

  /* Not a gate, a tripwire: if these ever disagree, the plan the customer is
     about to receive is not the plan they paid for, and I want it in the log.
     Compared against the subtotal rather than the total, because with Stripe
     Tax on an exclusive price the total is the price PLUS tax and every single
     sale would look overpaid. */
  if (ev.subtotalCents && ev.subtotalCents < PLAN_CENTS[record.plan]) {
    console.error(`[webhook] underpaid ${sid}: ${ev.subtotalCents} < ${PLAN_CENTS[record.plan]}`);
  }
  const metaPlan = ev.metadata.plan;
  if (typeof metaPlan === 'string' && metaPlan !== record.plan) {
    console.error(`[webhook] plan mismatch on ${sid}: checkout said "${metaPlan}", order says "${record.plan}"`);
  }

  await kvSet(orderKey(sid), { ...record, status: 'paid', orderId: ev.orderId }, ORDER_TTL_SECONDS);
  console.info(`[webhook] paid ${sid} (${ev.orderId}, plan ${record.plan})`);

  return NextResponse.json({ ok: true });
}
