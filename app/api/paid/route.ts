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

  return NextResponse.json({
    status: 'paid',
    plan: record.plan,
    token: signPaidToken({ sid, plan: record.plan, orderId: record.orderId }),
  });
}
