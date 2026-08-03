import { NextResponse } from 'next/server';
import { kvGet } from '@/lib/kv';
import { isSid, orderKey, type OrderRecord } from '@/lib/order';
import { signPaidToken } from '@/lib/paidToken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* Polled by the browser after it comes back from checkout.
 *
 * The webhook and the redirect are two independent races: the webhook usually
 * lands first, but not always, and the customer may also close the tab and
 * return later. Both converge here — this asks the order record, which only the
 * webhook can change, and hands back a token once it says paid.
 *
 * Knowing a sid is not itself proof of payment: an unpaid sid gets "pending"
 * and no token, forever. */
export async function GET(req: Request) {
  const sid = new URL(req.url).searchParams.get('sid');
  if (!isSid(sid)) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const record = await kvGet<OrderRecord>(orderKey(sid));
  if (!record) return NextResponse.json({ status: 'unknown' }, { status: 404 });

  if (record.status !== 'paid' || !record.orderId) {
    return NextResponse.json({ status: record.status });
  }

  /* Signing throws only when ROZU_TOKEN_SECRET is missing or too short — a
     deployment mistake, not a customer problem. Say so with a 500 rather than
     letting it surface as an unhandled crash: the browser distinguishes "not
     paid yet, keep waiting" from "this is broken, stop waiting". */
  let token: string;
  try {
    token = signPaidToken({ sid, plan: record.plan, orderId: record.orderId });
  } catch (e) {
    console.error('[paid] cannot issue token:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 });
  }

  return NextResponse.json({ status: 'paid', plan: record.plan, token });
}
