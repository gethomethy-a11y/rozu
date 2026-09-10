import { NextResponse } from 'next/server';
import { kvBacking, kvConfigured, kvDel, kvGet, kvSet } from '@/lib/kv';
import { PLAN_CENTS, priceFor, taxEnabled, testMode } from '@/lib/stripe';
import { previewEnabled, previewKeyLength, previewKeyValid } from '@/lib/preview';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* One-time setup checker.
 *
 * Reports which environment variables are present, whether storage works, and
 * what each Stripe price actually is — including the two things that are only
 * visible once a checkout fails: whether the price is active, and whether it
 * has a tax_behavior, which Stripe Tax requires. Output is plain text so it is
 * readable on a phone.
 *
 * Off unless ROZU_SETUP=1 is set, and never prints a secret's value, only
 * whether it is present. Delete the ROZU_SETUP variable when finished. */

const API = process.env.STRIPE_API_BASE ?? 'https://api.stripe.com/v1';

const REQUIRED = [
  'ANTHROPIC_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_SOLO',
  'STRIPE_PRICE_COUPLE',
  'STRIPE_PRICE_GIFT',
  'ROZU_TOKEN_SECRET',
] as const;

const PLANS = ['solo', 'couple', 'gift'] as const;

/* Names that are nearly right. A variable Vercel holds under the wrong name is
   invisible to the code and produces no error anywhere — worth calling out by
   name rather than just reporting the real one as missing. */
const LOOKALIKE = /^(stripe|lemon|rozu|anthropic|upstash|kv_|supabase)/i;

type StripePrice = {
  id?: string;
  active?: boolean;
  currency?: string;
  unit_amount?: number | null;
  type?: string;
  tax_behavior?: string;
  product?: string | { name?: string };
};

async function stripeGet(path: string, key: string): Promise<Record<string, unknown> | string> {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      const err = (json.error ?? {}) as { message?: string };
      return `HTTP ${res.status}${err.message ? ` — ${err.message}` : ''}`;
    }
    return json;
  } catch (e) {
    return e instanceof Error ? e.message : 'request failed';
  }
}

/* Accept the obvious ways someone types "on". A stray space or the word "true"
   is a configuration slip, not an intent to leave this page disabled — and the
   failure it produces (a bare 404) gives no hint what went wrong. */
function setupEnabled(): boolean {
  const v = (process.env.ROZU_SETUP ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export async function GET(req: Request) {
  if (!setupEnabled()) {
    return new NextResponse('Not found', { status: 404 });
  }

  const out: string[] = [];
  const say = (s = '') => out.push(s);
  /* Anything that stops a real customer paying. Collected as they are found so
     section 4 can list them: "still missing: nothing" while three prices are
     unusable was worse than saying nothing at all. */
  const blockers: string[] = [];

  /* ?trypreview=<value> answers "would this exact value work?".
     Deliberately routed through a query parameter: that puts the candidate
     through the same URL decoding the real checkout sees, so a key broken by a
     "+" or a "#" fails here for the same reason and is visible instead of
     mysterious. Comparing lengths is usually enough to spot it. */
  const candidate = new URL(req.url).searchParams.get('trypreview');
  if (candidate !== null) {
    const lines = ['PREVIEW KEY TEST', '================', ''];
    if (!previewEnabled()) {
      lines.push('   ROZU_PREVIEW_KEY is not set (or is under 16 characters).');
      lines.push('   Set it in Vercel, redeploy, then try again.');
    } else if (previewKeyValid(candidate)) {
      lines.push('   MATCH. This value works. Use it as:');
      lines.push('');
      lines.push(`   /?preview=${encodeURIComponent(candidate.trim())}`);
    } else {
      lines.push('   NO MATCH.');
      lines.push('');
      lines.push(`   what you sent : ${candidate.trim().length} characters`);
      lines.push(`   what Vercel has: ${previewKeyLength()} characters`);
      lines.push('');
      /* Order matters: a "+" decodes to a space without changing the length,
         so the length check alone would call the single most likely cause a
         typo and send you hunting for one that is not there. */
      if (/\s/.test(candidate.trim())) {
        lines.push('   What arrived contains a SPACE. In a URL a "+" decodes to a');
        lines.push('   space, so a key containing "+" cannot survive the trip.');
        lines.push('   Change the key to letters, digits and dashes only.');
      } else if (candidate.trim().length !== previewKeyLength()) {
        lines.push('   The lengths differ, so something ate part of it: everything');
        lines.push('   after a "#" is dropped, and "&" starts a new parameter.');
        lines.push('   Change the key to letters, digits and dashes only.');
      } else {
        lines.push('   Same length, no odd characters — so it is a plain typo, or');
        lines.push('   the redeploy after saving the variable has not finished.');
      }
    }
    return new NextResponse(lines.join('\n') + '\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  say('ROZU SETUP CHECK');
  say('================');
  say();

  /* ── Environment variables ─────────────────────────────── */
  say('1. ENVIRONMENT VARIABLES');
  say();
  let missing = 0;
  for (const name of REQUIRED) {
    const v = process.env[name];
    if (v) {
      say(`   OK       ${name}  (${v.length} characters)`);
    } else {
      missing++;
      say(`   MISSING  ${name}`);
    }
  }

  // Anything named almost-but-not-quite right.
  const KNOWN = new Set<string>([
    ...REQUIRED,
    'ROZU_SETUP',
    'ROZU_SITE_URL',
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
    /* Also written by Vercel's Upstash integration. We do not read them — the
       REST pair above is enough — but they are correct, not misspelled, and
       telling someone to "rename" them would be actively wrong. */
    'KV_URL',
    'KV_REST_API_READ_ONLY_TOKEN',
    'REDIS_URL',
    'UPSTASH_REDIS_REST_READ_ONLY_TOKEN',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
    'STRIPE_API_BASE',
    'STRIPE_TAX',
    'ROZU_PREVIEW_KEY',
    'ANTHROPIC_BASE_URL',
    'ANTHROPIC_AUTH_TOKEN',
  ]);
  const strays = Object.keys(process.env).filter((k) => LOOKALIKE.test(k) && !KNOWN.has(k));
  if (strays.length) {
    say();
    say('   These are set but no code reads them. Almost certainly a misspelled');
    say('   name — rename them to one of the names above (value stays the same):');
    for (const s of strays) say(`     - ${s}`);
  }

  /* ── Storage ───────────────────────────────────────────── */
  say();
  say('2. STORAGE');
  say();
  if (!kvConfigured()) {
    say('   MISSING  no database connected. Checkout refuses to take money');
    say('            without one. Pick either:');
    say();
    say('            SUPABASE — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY,');
    say('              then run the SQL at the bottom of this page once.');
    say();
    say('            UPSTASH  — Vercel -> Storage -> Upstash Redis -> Create.');
    say('              Sets its own variables, no SQL.');
  } else {
    const probe = `setup-probe:${Date.now()}`;
    try {
      await kvSet(probe, { ok: true }, 60);
      const back = await kvGet<{ ok: boolean }>(probe);
      await kvDel(probe);
      say(
        back?.ok
          ? `   OK       using ${kvBacking()}, and a write/read round trip worked`
          : `   BROKEN   using ${kvBacking()}, but the value did not come back`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'write failed';
      say(`   BROKEN   using ${kvBacking()}: ${msg}`);
      if (/does not exist|PGRST205|42P01/i.test(msg)) {
        say();
        say('            The table is missing. Run the SQL at the bottom of this');
        say('            page in Supabase -> SQL Editor, then reload this page.');
      }
    }
  }

  /* ── Stripe ────────────────────────────────────────────── */
  say();
  say('3. YOUR STRIPE ACCOUNT');
  say();
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    say('   Cannot look anything up until STRIPE_SECRET_KEY is set.');
  } else if (!/^sk_(test|live)_/.test(key)) {
    say('   STRIPE_SECRET_KEY does not look like a secret key. It must start');
    say('   with sk_test_ or sk_live_. A pk_ key is the publishable one and');
    say('   cannot create a checkout; an rk_ key is a restricted key and needs');
    say('   write access to Checkout Sessions.');
  } else {
    say(
      testMode()
        ? '   TEST MODE — this is an sk_test_ key. Test cards only, no real money.'
        : '   LIVE MODE — this is an sk_live_ key. Checkouts charge real cards.',
    );
    say();
    say(
      taxEnabled()
        ? '   Stripe Tax is ON. It calculates tax, it does not register or remit'
        : '   Stripe Tax is OFF (STRIPE_TAX is set to off).',
    );
    if (taxEnabled()) {
      say('   it. Tax is only charged where you have added a registration under');
      say('   Stripe -> Tax -> Registrations. With none, every sale calculates');
      say('   zero tax and the checkout still works.');
    }
    say();

    say();
    const acct = await stripeGet('/account', key);
    if (typeof acct === 'string') {
      say(`   Could not reach Stripe: ${acct}`);
    } else {
      const name =
        (acct.business_profile as { name?: string } | undefined)?.name ??
        (acct.settings as { dashboard?: { display_name?: string } } | undefined)?.dashboard?.display_name ??
        '(unnamed)';
      say(`   Account "${name}"  ${acct.id ?? ''}`);
      if (acct.charges_enabled === false) {
        say('   NOTE: charges are not enabled on this account yet. Finish the');
        say('         Stripe onboarding (business details + bank account)');
        say('         before going live. Test mode still works meanwhile.');
        if (!testMode()) blockers.push('Stripe has not enabled charges on this account yet');
      }
      say();
    }

    say('   Your prices:');
    say();
    for (const plan of PLANS) {
      let id: string;
      try {
        id = priceFor(plan);
      } catch {
        say(`     ${plan.padEnd(7)} MISSING — set STRIPE_PRICE_${plan.toUpperCase()}`);
        blockers.push(`STRIPE_PRICE_${plan.toUpperCase()} is not set`);
        continue;
      }

      if (!id.startsWith('price_')) {
        say(`     ${plan.padEnd(7)} ${id}`);
        say(`              WRONG KIND OF ID. This must be a price id (price_...).`);
        if (id.startsWith('prod_')) {
          say('              That is a PRODUCT id. Open the product in the Stripe');
          say('              dashboard and copy the id from its pricing section.');
        }
        blockers.push(`STRIPE_PRICE_${plan.toUpperCase()} is a ${id.split('_')[0]}_ id, not a price_ id`);
        continue;
      }

      const price = (await stripeGet(`/prices/${encodeURIComponent(id)}?expand[]=product`, key)) as
        | StripePrice
        | string;
      if (typeof price === 'string') {
        say(`     ${plan.padEnd(7)} ${id}`);
        say(`              could not be read: ${price}`);
        continue;
      }

      const product = typeof price.product === 'object' ? (price.product?.name ?? '') : '';
      const amount =
        typeof price.unit_amount === 'number'
          ? ` ${(price.unit_amount / 100).toFixed(2)} ${(price.currency ?? '').toUpperCase()}`
          : '';
      say(`     ${plan.padEnd(7)} ${product}${amount}`);
      say(`              ${id}`);

      if (price.active === false) {
        say('              NOTE: this price is ARCHIVED. A checkout using it fails.');
        blockers.push(`the ${plan} price is archived`);
      }
      if (price.type && price.type !== 'one_time') {
        say(`              NOTE: this is a "${price.type}" price. RŌZU sells one-time`);
        say('                    purchases; a recurring price would subscribe them.');
      }
      /* The single most likely reason a live checkout 400s after this all
         looks fine: Stripe refuses automatic_tax on a price that has not said
         whether its amount includes tax. Invisible until the first attempt. */
      if (taxEnabled() && (!price.tax_behavior || price.tax_behavior === 'unspecified')) {
        say('              BLOCKER: tax_behavior is unspecified, and Stripe Tax is');
        say('                    on. Every checkout will fail. Open the price in');
        say('                    Stripe and set it to inclusive or exclusive.');
        say('                    Inclusive keeps $9 as the total the customer pays.');
        blockers.push(`the ${plan} price has no tax_behavior, and Stripe Tax is on`);
      }
      const cents = PLAN_CENTS[plan];
      if (typeof price.unit_amount === 'number' && price.unit_amount !== cents) {
        say(`              NOTE: the app expects ${cents} cents for "${plan}". The`);
        say('                    underpaid tripwire in the webhook will fire on');
        say('                    every sale until these agree.');
      }
      say();
    }
  }

  /* ── What to do next ───────────────────────────────────── */
  say();
  say('4. WHAT IS LEFT');
  say();
  if (missing) say(`   ${missing} environment variable(s) missing, listed in section 1.`);
  if (!kvConfigured()) blockers.push('no database is connected');
  if (blockers.length) {
    say('   These stop a real customer paying:');
    for (const b of blockers) say(`     - ${b}`);
  } else if (!missing) {
    say('   Nothing. Checkout should work.');
  }
  say();
  say('   When everything above says OK, DELETE the ROZU_SETUP variable in');
  say('   Vercel. This page turns itself off without it.');

  if (previewEnabled()) {
    say();
    say(`   *** PREVIEW MODE IS ON *** (key is ${previewKeyLength()} characters)`);
    say('   Test a key with:  /api/setup?trypreview=YOURKEY');
    say('   Anyone with the ROZU_PREVIEW_KEY value can get a full routine');
    say('   without paying. Delete that variable before launch.');
  }

  if (kvBacking() !== 'upstash') {
    say();
    say('5. SUPABASE TABLE (only if you chose Supabase)');
    say();
    say('   Supabase -> SQL Editor -> New query -> paste this -> Run:');
    say();
    say('   create table if not exists rozu_kv (');
    say('     key        text primary key,');
    say('     value      jsonb not null,');
    say('     expires_at timestamptz not null');
    say('   );');
    say('   create index if not exists rozu_kv_expires_idx');
    say('     on rozu_kv (expires_at);');
    say('   alter table rozu_kv enable row level security;');
    say();
    say('   The last line matters: with row level security on and no policies,');
    say('   the public anon key cannot read this table at all. Only the');
    say('   service role key can, and that one never leaves the server.');
  }
  say();

  return new NextResponse(out.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
