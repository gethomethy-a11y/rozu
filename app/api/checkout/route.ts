import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createCheckout, stripeConfigured } from '@/lib/stripe';
import {
  ORDER_TTL_SECONDS,
  orderKey,
  parseProfile,
  type OrderRecord,
  type Profile,
} from '@/lib/order';
import { kvConfigured, kvSet } from '@/lib/kv';
import { previewKeyValid } from '@/lib/preview';
import type { Plan } from '@/lib/paidToken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* Attribution carried through the payment round trip. Step 4 reads it off the
   order; capturing it here costs nothing and cannot be recovered later. */
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ttclid', 'li_fat_id'];

function siteUrl(req: Request): string {
  const configured = process.env.ROZU_SITE_URL;
  if (configured) return configured.replace(/\/+$/, '');
  const host = req.headers.get('host') ?? '';
  const proto = req.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

function parseUtm(v: unknown): Record<string, string> | undefined {
  if (typeof v !== 'object' || v === null) return undefined;
  const src = v as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const k of UTM_KEYS) {
    const val = src[k];
    if (typeof val === 'string' && val && val.length <= 200) out[k] = val;
  }
  return Object.keys(out).length ? out : undefined;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const PLANS: readonly Plan[] = ['solo', 'couple', 'gift'];
  const plan: Plan | null = PLANS.find((x) => x === body.plan) ?? null;
  if (!plan) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const self: Profile | null = parseProfile(body.self);
  if (!self) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const partner: Profile | null = plan === 'couple' ? parseProfile(body.partner) : null;
  if (plan === 'couple' && !partner) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  /* PREVIEW. Skips Stripe and nothing else: the order below is written
     exactly as a real one, already marked paid, so the rest of the pipeline —
     token, generate-once, caching — runs untouched. Requires the key. */
  const wantsPreview = typeof body.preview === 'string' && body.preview.length > 0;
  if (wantsPreview) {
    if (!previewKeyValid(body.preview)) {
      console.warn('[checkout] preview key rejected');
      return NextResponse.json({ error: 'invalid preview key' }, { status: 403 });
    }

    const sid = randomUUID();
    const record: OrderRecord = {
      plan,
      status: 'paid',
      self,
      partner,
      createdAt: Date.now(),
      orderId: `preview-${sid}`,
      preview: true,
    };
    try {
      await kvSet(orderKey(sid), record, ORDER_TTL_SECONDS);
    } catch (e) {
      console.error('[checkout] preview could not persist order:', e instanceof Error ? e.message : e);
      return NextResponse.json({ error: 'preview unavailable' }, { status: 503 });
    }
    console.warn(`[checkout] PREVIEW order ${sid} (${plan}) — no payment taken`);
    return NextResponse.json({ preview: true, sid });
  }

  /* Both of these are fatal rather than degradable. An order we cannot store is
     an order we cannot honour after the redirect, and taking the money anyway
     would be the worst possible failure mode. */
  if (!stripeConfigured()) {
    console.error('[checkout] Stripe env vars are not set');
    return NextResponse.json({ error: 'payment unavailable' }, { status: 503 });
  }
  if (!kvConfigured() && process.env.NODE_ENV === 'production') {
    console.error('[checkout] no KV configured — refusing to sell what we cannot deliver');
    return NextResponse.json({ error: 'payment unavailable' }, { status: 503 });
  }

  const sid = randomUUID();
  const record: OrderRecord = {
    plan,
    status: 'pending',
    self,
    partner,
    createdAt: Date.now(),
    utm: parseUtm(body.utm),
  };

  try {
    await kvSet(orderKey(sid), record, ORDER_TTL_SECONDS);
  } catch (e) {
    console.error('[checkout] could not persist order:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'payment unavailable' }, { status: 503 });
  }

  try {
    const site = siteUrl(req);
    const url = await createCheckout({
      plan,
      sid,
      redirectUrl: `${site}/?sid=${sid}`,
      /* Back to the preview, not to the landing page. The draft in
         sessionStorage puts the quiz answers back, so an abandoned checkout
         resumes where it left off instead of starting over. */
      cancelUrl: site,
      email: typeof body.email === 'string' && body.email.includes('@') ? body.email : undefined,
    });
    return NextResponse.json({ url, sid });
  } catch (e) {
    console.error('[checkout]', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'payment unavailable' }, { status: 503 });
  }
}
