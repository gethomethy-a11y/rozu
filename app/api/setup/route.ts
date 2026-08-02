import { NextResponse } from 'next/server';
import { kvBacking, kvConfigured, kvDel, kvGet, kvSet } from '@/lib/kv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* One-time setup checker.
 *
 * Reports which environment variables are present, whether storage works, and
 * what the Lemon Squeezy store and variant IDs actually are — the numbers the
 * dashboard makes hard to find. Output is plain text so it is readable on a
 * phone.
 *
 * Off unless ROZU_SETUP=1 is set, and never prints a secret's value, only
 * whether it is present. Delete the ROZU_SETUP variable when finished. */

const API = process.env.LEMONSQUEEZY_API_BASE ?? 'https://api.lemonsqueezy.com/v1';

const REQUIRED = [
  'ANTHROPIC_API_KEY',
  'LEMONSQUEEZY_API_KEY',
  'LEMONSQUEEZY_WEBHOOK_SECRET',
  'LEMONSQUEEZY_STORE_ID',
  'LEMONSQUEEZY_VARIANT_SOLO',
  'LEMONSQUEEZY_VARIANT_COUPLE',
  'ROZU_TOKEN_SECRET',
] as const;

/* Names that are nearly right. A variable Vercel holds under the wrong name is
   invisible to the code and produces no error anywhere — worth calling out by
   name rather than just reporting the real one as missing. */
const LOOKALIKE = /^(lemon|rozu|anthropic|upstash|kv_|supabase)/i;

function lsHeaders(key: string) {
  return { Accept: 'application/vnd.api+json', Authorization: `Bearer ${key}` };
}

type JsonApi = {
  data?: Array<{ id: string; attributes: Record<string, unknown> }>;
  errors?: Array<{ detail?: string }>;
};

async function lsGet(path: string, key: string): Promise<JsonApi | string> {
  try {
    const res = await fetch(`${API}${path}`, { headers: lsHeaders(key), cache: 'no-store' });
    if (!res.ok) return `HTTP ${res.status}${res.status === 401 ? ' — the API key is wrong or was revoked' : ''}`;
    return (await res.json()) as JsonApi;
  } catch (e) {
    return e instanceof Error ? e.message : 'request failed';
  }
}

export async function GET() {
  if (process.env.ROZU_SETUP !== '1') {
    return new NextResponse('Not found', { status: 404 });
  }

  const out: string[] = [];
  const say = (s = '') => out.push(s);
  const suggested: string[] = [];

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
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
    'LEMONSQUEEZY_API_BASE',
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

  /* ── Lemon Squeezy ─────────────────────────────────────── */
  say();
  say('3. YOUR LEMON SQUEEZY ACCOUNT');
  say();
  const key = process.env.LEMONSQUEEZY_API_KEY;
  if (!key) {
    say('   Cannot look anything up until LEMONSQUEEZY_API_KEY is set.');
  } else {
    const stores = await lsGet('/stores', key);
    if (typeof stores === 'string') {
      say(`   Could not reach Lemon Squeezy: ${stores}`);
    } else {
      for (const s of stores.data ?? []) {
        say(`   Store "${s.attributes.name}"`);
        say(`     LEMONSQUEEZY_STORE_ID=${s.id}`);
        suggested.push(`LEMONSQUEEZY_STORE_ID=${s.id}`);
      }
      say();

      const variants = await lsGet('/variants', key);
      const products = await lsGet('/products', key);
      const productName = new Map<string, string>();
      if (typeof products !== 'string') {
        for (const p of products.data ?? []) productName.set(p.id, String(p.attributes.name ?? ''));
      }

      if (typeof variants === 'string') {
        say(`   Could not list variants: ${variants}`);
      } else if (!variants.data?.length) {
        say('   No products found. Create them first, and make sure they are');
        say('   Published rather than Draft.');
      } else {
        say('   Products and their variant IDs:');
        say();
        for (const v of variants.data) {
          const a = v.attributes;
          const pid = String(a.product_id ?? '');
          const pname = productName.get(pid) ?? `product ${pid}`;
          const price = typeof a.price === 'number' ? ` $${(a.price / 100).toFixed(2)}` : '';
          const status = a.status ? ` [${a.status}]` : '';
          say(`     ${pname} / ${a.name}${price}${status}`);
          say(`       variant id: ${v.id}`);

          const n = String(pname).toLowerCase();
          if (n.includes('couple')) suggested.push(`LEMONSQUEEZY_VARIANT_COUPLE=${v.id}`);
          else if (n.includes('solo')) suggested.push(`LEMONSQUEEZY_VARIANT_SOLO=${v.id}`);
        }
      }
    }
  }

  /* ── What to do next ───────────────────────────────────── */
  say();
  say('4. COPY THESE INTO VERCEL');
  say();
  if (suggested.length) {
    for (const line of suggested) say(`   ${line}`);
  } else {
    say('   (nothing to copy yet)');
  }
  say();
  say(`   Still missing: ${missing === 0 ? 'nothing' : `${missing} variable(s), listed in section 1`}`);
  say();
  say('   When everything above says OK, DELETE the ROZU_SETUP variable in');
  say('   Vercel. This page turns itself off without it.');

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
