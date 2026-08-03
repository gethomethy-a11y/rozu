#!/usr/bin/env node
/* End-to-end test of the payment gate, against a mock Lemon Squeezy.
 *
 * Proves the two things that matter most about step 3:
 *   1. /api/generate cannot be reached without a real, current payment
 *   2. a real payment survives every way the round trip can go wrong
 *
 * Run against a server started with LEMONSQUEEZY_API_BASE pointed at this
 * script's mock. See scripts/run-payment-test.sh.
 */
import { createHmac, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

const APP = process.env.APP_URL ?? 'http://127.0.0.1:3000';
const MOCK_PORT = Number(process.env.MOCK_PORT ?? 3999);
const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
const VARIANT_SOLO = process.env.LEMONSQUEEZY_VARIANT_SOLO;
const VARIANT_COUPLE = process.env.LEMONSQUEEZY_VARIANT_COUPLE;

if (!WEBHOOK_SECRET) {
  console.error('LEMONSQUEEZY_WEBHOOK_SECRET must be set for this test');
  process.exit(1);
}

let pass = 0;
let fail = 0;
function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/* ── Mocks ───────────────────────────────────────────────────────────────── */
/* Two services on one port:
     /v1/checkouts — Lemon Squeezy. Records what it was asked to create, so the
                     test can read back the sid exactly as the real service
                     would hand it to the customer.
     /kv           — an Upstash-compatible Redis REST endpoint
     /rest/v1/...  — a PostgREST-compatible endpoint standing in for Supabase

   The suite runs twice, once against each storage backing, so both drivers are
   exercised by the same assertions rather than one being taken on trust. */
const checkouts = [];
const store = new Map();

function redis(args) {
  const [cmd, key] = args;
  switch (String(cmd).toUpperCase()) {
    case 'GET': {
      const e = store.get(key);
      if (!e) return null;
      if (e.exp < Date.now()) {
        store.delete(key);
        return null;
      }
      return e.v;
    }
    case 'SET': {
      const value = args[2];
      const rest = args.slice(3).map((a) => String(a).toUpperCase());
      const exIdx = rest.indexOf('EX');
      const ttl = exIdx > -1 ? Number(args[3 + exIdx + 1]) : 60 * 60;
      const nx = rest.includes('NX');
      const existing = store.get(key);
      const live = existing && existing.exp >= Date.now();
      if (nx && live) return null;
      store.set(key, { v: value, exp: Date.now() + ttl * 1000 });
      return 'OK';
    }
    case 'DEL':
      return store.delete(key) ? 1 : 0;
    default:
      throw new Error(`mock redis: unsupported command ${cmd}`);
  }
}

/* PostgREST stand-in for Supabase, over the same `store` Map.
   Rows are { value, expires_at }; expiry is a column, as in real Postgres. */
function postgrest(method, url, body, prefer) {
  const q = new URL(url, 'http://x');
  const eq = (q.searchParams.get('key') ?? '').replace(/^eq\./, '');
  const key = decodeURIComponent(eq);
  const gt = (q.searchParams.get('expires_at') ?? '').replace(/^(gt|lt)\./, '');
  const op = (q.searchParams.get('expires_at') ?? '').startsWith('lt.') ? 'lt' : 'gt';
  const row = store.get(key);

  if (method === 'GET') {
    if (!row) return [];
    if (gt && !(new Date(row.expires_at) > new Date(decodeURIComponent(gt)))) return [];
    return [{ value: row.value }];
  }

  if (method === 'POST') {
    const r = JSON.parse(body);
    const exists = store.has(r.key);
    if (prefer.includes('ignore-duplicates') && exists) return [];
    store.set(r.key, { value: r.value, expires_at: r.expires_at });
    return prefer.includes('return=representation') ? [r] : null;
  }

  if (method === 'DELETE') {
    if (!row) return null;
    // A conditional delete (expires_at=lt.now) must not remove a live row.
    if (gt && op === 'lt' && !(new Date(row.expires_at) < new Date(decodeURIComponent(gt)))) return null;
    store.delete(key);
    return null;
  }

  throw new Error(`postgrest: unsupported ${method}`);
}

const mock = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    if (req.url.startsWith('/rest/v1/')) {
      try {
        const out = postgrest(req.method, req.url, body, req.headers.prefer ?? '');
        res.writeHead(out === null ? 204 : 200, { 'Content-Type': 'application/json' });
        res.end(out === null ? '' : JSON.stringify(out));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: String(e.message) }));
      }
      return;
    }

    if (req.url.startsWith('/kv')) {
      try {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ result: redis(JSON.parse(body)) }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(e.message) }));
      }
      return;
    }

    const parsed = JSON.parse(body);
    const attrs = parsed.data.attributes;
    checkouts.push({
      custom: attrs.checkout_data.custom,
      redirectUrl: attrs.product_options.redirect_url,
      variantId: parsed.data.relationships.variant.data.id,
    });
    res.writeHead(201, { 'Content-Type': 'application/vnd.api+json' });
    res.end(JSON.stringify({ data: { attributes: { url: 'https://mock.test/checkout/abc' } } }));
  });
});
await new Promise((r) => mock.listen(MOCK_PORT, '127.0.0.1', r));

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const soloProfile = { heritage: 'Southeast Asian', skin: 'Combination', life: { sleep: 1, stress: 1, diet: 1 } };
const partnerProfile = { heritage: 'Black / African', skin: 'Dry', life: { sleep: 2, stress: 0, diet: 2 } };

async function startCheckout(plan, extra = {}) {
  const before = checkouts.length;
  const res = await fetch(`${APP}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      plan,
      self: soloProfile,
      partner: plan === 'couple' ? partnerProfile : null,
      utm: { utm_source: 'tiktok', ttclid: 'abc123' },
      ...extra,
    }),
  });
  const json = await res.json();
  return { res, json, checkout: checkouts[before] };
}

function signedWebhook(payload) {
  const raw = JSON.stringify(payload);
  return {
    raw,
    signature: createHmac('sha256', WEBHOOK_SECRET).update(raw, 'utf8').digest('hex'),
  };
}

async function sendWebhook(payload, { badSignature = false } = {}) {
  const { raw, signature } = signedWebhook(payload);
  return fetch(`${APP}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Signature': badSignature ? 'deadbeef'.repeat(8) : signature },
    body: raw,
  });
}

const orderPayload = (eventName, sid, plan, orderId) => ({
  meta: { event_name: eventName, custom_data: { sid, plan } },
  data: {
    id: orderId,
    attributes: {
      status: eventName === 'order_refunded' ? 'refunded' : 'paid',
      total: plan === 'couple' ? 1200 : 900,
      first_order_item: { variant_id: Number(plan === 'couple' ? VARIANT_COUPLE : VARIANT_SOLO) },
    },
  },
});

const getPaid = (sid) => fetch(`${APP}/api/paid?sid=${sid}`, { cache: 'no-store' });
const generate = (sid, token) =>
  fetch(`${APP}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sid, token }),
  });

/* ── 1. The gate holds ───────────────────────────────────────────────────── */
console.log('\n=== 1. /api/generate refuses everything that is not a paid order ===');
{
  const fakeSid = randomUUID();

  check('no token → 402', (await generate(fakeSid, undefined)).status === 402);
  check('empty token → 402', (await generate(fakeSid, '')).status === 402);
  check('garbage token → 402', (await generate(fakeSid, 'not.a.token')).status === 402);

  // A structurally perfect token signed with the wrong key.
  const body = Buffer.from(
    JSON.stringify({ sid: fakeSid, plan: 'solo', orderId: '1', iat: 0, exp: 9999999999 }),
  ).toString('base64url');
  const forged = `${body}.${createHmac('sha256', 'wrong-secret').update(body).digest('base64url')}`;
  check('token signed with the wrong secret → 402', (await generate(fakeSid, forged)).status === 402);
}

/* ── 2. Webhook authentication ───────────────────────────────────────────── */
console.log('\n=== 2. Webhook only trusts a valid signature ===');
{
  const sid = randomUUID();
  const bad = await sendWebhook(orderPayload('order_created', sid, 'solo', '999'), { badSignature: true });
  check('bad signature → 401', bad.status === 401, `got ${bad.status}`);

  const noSig = await fetch(`${APP}/api/webhook`, { method: 'POST', body: '{}' });
  check('missing signature → 401', noSig.status === 401, `got ${noSig.status}`);

  const unknown = await sendWebhook(orderPayload('order_created', randomUUID(), 'solo', '998'));
  check('valid signature, unknown sid → 200 and ignored', unknown.status === 200);
}

/* ── 3. The happy path, solo ─────────────────────────────────────────────── */
console.log('\n=== 3. Solo purchase, webhook before the browser returns ===');
let soloSid;
{
  const { res, json, checkout } = await startCheckout('solo');
  check('checkout → 200 with a url', res.status === 200 && Boolean(json.url), `status ${res.status}`);
  soloSid = json.sid;
  check('sid is passed to Lemon Squeezy as custom data', checkout?.custom?.sid === soloSid);
  check('return url carries the sid', checkout?.redirectUrl?.endsWith(`/?sid=${soloSid}`));
  check('the solo variant was charged', checkout?.variantId === VARIANT_SOLO, `got ${checkout?.variantId}`);

  const pendingRes = await getPaid(soloSid);
  const pending = await pendingRes.json();
  check('before payment, /api/paid says pending and issues no token', pending.status === 'pending' && !pending.token);

  const beforePay = await generate(soloSid, 'anything');
  check('before payment, generate → 402', beforePay.status === 402);

  const wh = await sendWebhook(orderPayload('order_created', soloSid, 'solo', '1001'));
  check('order_created → 200', wh.status === 200);

  const paidRes = await getPaid(soloSid);
  const paid = await paidRes.json();
  check('after payment, /api/paid issues a token', paid.status === 'paid' && Boolean(paid.token));
  check('token reports the right plan', paid.plan === 'solo');

  const genRes = await generate(soloSid, paid.token);
  const gen = await genRes.json();
  check('generate → 200', genRes.status === 200, `status ${genRes.status}`);
  check('a complete routine came back', Array.isArray(gen.self?.morning) && gen.self.morning.length > 0);
  check('the heritage label survived the redirect', gen.profile?.self?.heritage === 'Southeast Asian');
  check('no partner routine on a solo order', gen.partner === null);

  const second = await (await generate(soloSid, paid.token)).json();
  check('a refresh returns the cached routine, not a new one', second.source === 'cached');
  check('the cached routine is identical', JSON.stringify(second.self) === JSON.stringify(gen.self));

  // Someone else's token must not unlock this order.
  const otherSid = randomUUID();
  check('token from another sid → 402', (await generate(otherSid, paid.token)).status === 402);
}

/* ── 4. Couple, and the tab-closed recovery ──────────────────────────────── */
console.log('\n=== 4. Couple purchase, browser returns before the webhook ===');
{
  const { json, checkout } = await startCheckout('couple');
  const sid = json.sid;
  check('the couple variant was charged', checkout?.variantId === VARIANT_COUPLE, `got ${checkout?.variantId}`);

  // The browser is back first: /api/paid must not hand out a token yet.
  const early = await (await getPaid(sid)).json();
  check('browser back first → still pending, no token', early.status === 'pending' && !early.token);

  // ...webhook lands a moment later, which is what the client polls for.
  await sendWebhook(orderPayload('order_created', sid, 'couple', '1002'));
  const paid = await (await getPaid(sid)).json();
  check('the next poll succeeds', paid.status === 'paid' && Boolean(paid.token));

  const gen = await (await generate(sid, paid.token)).json();
  check('two routines came back', Boolean(gen.self?.morning) && Boolean(gen.partner?.morning), JSON.stringify(gen).slice(0, 200));
  check(
    'each partner got their own heritage',
    gen.profile?.self?.heritage === 'Southeast Asian' && gen.profile?.partner?.heritage === 'Black / African',
  );
  check(
    'the two routines are actually different',
    JSON.stringify(gen.self) !== JSON.stringify(gen.partner),
  );

  // Tab closed mid-payment: the sid is all the browser kept, and it is enough.
  const recovered = await (await getPaid(sid)).json();
  check('a returning customer can recover with the sid alone', recovered.status === 'paid');
  const again = await (await generate(sid, recovered.token)).json();
  check('and gets the same routine back', JSON.stringify(again.self) === JSON.stringify(gen.self));
}

/* ── 5. Refund revokes access ────────────────────────────────────────────── */
console.log('\n=== 5. A refund revokes a token that is still cryptographically valid ===');
{
  const { json } = await startCheckout('solo');
  const sid = json.sid;
  await sendWebhook(orderPayload('order_created', sid, 'solo', '1003'));
  const paid = await (await getPaid(sid)).json();
  check('token issued', Boolean(paid.token));
  check('generate works while paid', (await generate(sid, paid.token)).status === 200);

  await sendWebhook(orderPayload('order_refunded', sid, 'solo', '1003'));
  check('after the refund, the same token → 402', (await generate(sid, paid.token)).status === 402);
  const after = await (await getPaid(sid)).json();
  check('/api/paid reports refunded and issues no token', after.status === 'refunded' && !after.token);
}

/* ── 6. Input validation ─────────────────────────────────────────────────── */
console.log('\n=== 6. Checkout input validation ===');
{
  const bad = (body) =>
    fetch(`${APP}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => r.status);

  check('unknown plan → 400', (await bad({ plan: 'free', self: soloProfile })) === 400);
  check('missing profile → 400', (await bad({ plan: 'solo' })) === 400);
  check('couple without a partner → 400', (await bad({ plan: 'couple', self: soloProfile })) === 400);
  check('over-long heritage → 400', (await bad({ plan: 'solo', self: { ...soloProfile, heritage: 'x'.repeat(500) } })) === 400);
  check(
    'malformed sid on /api/paid → 400',
    (await fetch(`${APP}/api/paid?sid=../../etc/passwd`)).status === 400,
  );
}

/* ── 7. Preview mode ─────────────────────────────────────────────────────── */
/* Preview must be a door with a lock on it, not a hole. It has to work with the
   key, be invisible without it, and — the part that actually matters — must not
   weaken the paywall for anyone who does not have it. */
console.log('\n=== 7. Preview mode ===');
{
  const KEY = process.env.ROZU_PREVIEW_KEY;

  const wrong = await startCheckout('solo', { preview: 'wrong-key-wrong-key-wrong' });
  check('wrong preview key → 403', wrong.res.status === 403, `got ${wrong.res.status}`);
  check('wrong preview key creates no checkout', wrong.checkout === undefined);

  const empty = await startCheckout('solo', { preview: '' });
  check('empty preview key falls through to a real checkout', Boolean(empty.json.url));

  const ok = await startCheckout('solo', { preview: KEY });
  check('correct preview key → 200', ok.res.status === 200, `got ${ok.res.status}`);
  check('preview returns no checkout url', !ok.json.url && ok.json.preview === true);
  check('preview never contacts Lemon Squeezy', ok.checkout === undefined);

  const sid = ok.json.sid;
  const paid = await (await getPaid(sid)).json();
  check('preview order is already paid', paid.status === 'paid' && Boolean(paid.token));

  const genRes = await generate(sid, paid.token);
  const gen = await genRes.json();
  check('preview generates a real routine', genRes.status === 200 && Array.isArray(gen.self?.morning));
  check('preview goes through the same caching', (await (await generate(sid, paid.token)).json()).source === 'cached');

  // The whole point of the lock: knowing a preview sid must not unlock anything
  // else, and preview must not have made the gate any weaker.
  const other = await startCheckout('solo');
  check('a normal order is still unpaid alongside preview', (await (await getPaid(other.json.sid)).json()).status === 'pending');
  check('preview token does not unlock another order', (await generate(other.json.sid, paid.token)).status === 402);
  check('a preview sid without a token is still 402', (await generate(sid, 'no')).status === 402);
}

mock.close();
console.log(`\n${fail ? 'RESULT: FAIL' : 'RESULT: PASS'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
