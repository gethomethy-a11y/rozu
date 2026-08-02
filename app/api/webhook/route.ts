import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/kv';
import { PLAN_CENTS, parseWebhook, variantFor, verifyWebhookSignature } from '@/lib/lemonsqueezy';
import { ORDER_TTL_SECONDS, isSid, orderKey, type OrderRecord } from '@/lib/order';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* Lemon Squeezy's confirmation of payment. This is the only thing that can move
   an order from "pending" to "paid" — the browser coming back from checkout
   proves nothing, since anyone can type that URL.
 *
 * Every outcome other than a bad signature returns 200. A non-2xx makes Lemon
 * Squeezy retry, and retrying will not fix an event we have no record for. */
export async function POST(req: Request) {
  // Must be the exact bytes that were signed — parsing and re-serialising
  // would reorder keys and break the HMAC.
  const raw = await req.text();

  if (!verifyWebhookSignature(raw, req.headers.get('x-signature'))) {
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

  if (ev.eventName !== 'order_created' && ev.eventName !== 'order_refunded') {
    return NextResponse.json({ ok: true, ignored: ev.eventName });
  }

  const sid = ev.custom.sid;
  if (!isSid(sid)) {
    // A purchase made outside our flow, or a sid we never issued. Nothing to
    // deliver — the customer has a Lemon Squeezy receipt and we have this log.
    console.error(`[webhook] ${ev.eventName} order ${ev.orderId} carried no usable sid`);
    return NextResponse.json({ ok: true, ignored: 'no sid' });
  }

  const record = await kvGet<OrderRecord>(orderKey(sid));
  if (!record) {
    console.error(`[webhook] ${ev.eventName} for unknown or expired sid ${sid} (order ${ev.orderId})`);
    return NextResponse.json({ ok: true, ignored: 'unknown sid' });
  }

  if (ev.eventName === 'order_refunded') {
    // Entitlement is read from this record on every generate, so flipping it
    // here is enough — no token revocation list required.
    await kvSet(orderKey(sid), { ...record, status: 'refunded' }, ORDER_TTL_SECONDS);
    console.warn(`[webhook] refunded ${sid} (order ${ev.orderId})`);
    return NextResponse.json({ ok: true });
  }

  /* order_created. Redelivery is expected, so this is written to be idempotent:
     the same values land in the same place however many times it arrives. */
  if (record.status === 'paid' && record.orderId === ev.orderId) {
    return NextResponse.json({ ok: true, already: true });
  }

  // Not a gate, a tripwire: if these ever disagree, the plan the customer is
  // about to receive is not the plan they paid for, and I want it in the log.
  try {
    if (ev.variantId && ev.variantId !== variantFor(record.plan)) {
      console.error(
        `[webhook] variant mismatch on ${sid}: paid for ${ev.variantId}, order says plan "${record.plan}"`,
      );
    }
  } catch {
    /* variantFor throws only when env is missing; already logged elsewhere. */
  }
  if (ev.totalCents && ev.totalCents < PLAN_CENTS[record.plan]) {
    console.error(`[webhook] underpaid ${sid}: ${ev.totalCents} < ${PLAN_CENTS[record.plan]}`);
  }

  await kvSet(orderKey(sid), { ...record, status: 'paid', orderId: ev.orderId }, ORDER_TTL_SECONDS);
  console.info(`[webhook] paid ${sid} (order ${ev.orderId}, plan ${record.plan})`);

  return NextResponse.json({ ok: true });
}
