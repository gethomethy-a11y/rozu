import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { fallback } from '@/lib/fallback';
import { kvGet, kvSet, kvSetIfAbsent } from '@/lib/kv';
import {
  ORDER_TTL_SECONDS,
  genLockKey,
  isSid,
  orderKey,
  routineKey,
  type GeneratedRoutines,
  type OrderRecord,
  type Profile,
} from '@/lib/order';
import { matchOf, sharedConcerns, sharedLife, togetherFacts } from '@/lib/match';
import { CONCERN_LABELS } from '@/lib/quiz';
import { verifyPaidToken } from '@/lib/paidToken';
import { buildPrompt } from '@/lib/prompt';
import { ROUTINE_SCHEMA, validateRoutine } from '@/lib/validate';
import type { Routine } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/* Two model calls for a couple, sequentially in the worst case. */
export const maxDuration = 60;

const MODEL = 'claude-opus-5';
/* Thinking is on by default on Opus 5 and max_tokens caps thinking + output
   together, so this is sized well above the ~600-token routine. Thinking is
   deliberately left on: disabling it can leak <thinking> tags into the visible
   response, which would corrupt the JSON. Low effort keeps it fast instead. */
const MAX_TOKENS = 4096;
const TIMEOUT_MS = 20000;

/** How long a concurrent caller waits for the in-flight generation to land. */
const LOCK_WAIT_MS = 20000;
const LOCK_POLL_MS = 700;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One model call. Returns null on any failure; the caller substitutes the
 *  deterministic fallback so the customer never sees an error screen. */
async function generateOne(client: Anthropic, p: Profile): Promise<Routine | null> {
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: ROUTINE_SCHEMA },
      },
      messages: [{ role: 'user', content: buildPrompt(p) }],
    });

    if (res.stop_reason === 'refusal') {
      console.warn('[generate] model refused');
      return null;
    }
    if (res.stop_reason === 'max_tokens') {
      console.warn('[generate] response truncated');
      return null;
    }

    const text = res.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') {
      console.warn('[generate] no text block');
      return null;
    }

    const routine = validateRoutine(JSON.parse(text.text));
    if (!routine) console.warn('[generate] validation failed');
    return routine;
  } catch (e) {
    console.warn(`[generate] call failed: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  /* THE PAYMENT GATE. The AI call fires only past this point. Two independent
     checks: the token proves an order was paid when it was minted, the order
     record proves it is still paid now (a refund flips it). */
  const claim = verifyPaidToken(body.token);
  if (!claim) return NextResponse.json({ error: 'payment required' }, { status: 402 });

  const sid = body.sid;
  if (!isSid(sid) || sid !== claim.sid) {
    return NextResponse.json({ error: 'payment required' }, { status: 402 });
  }

  const record = await kvGet<OrderRecord>(orderKey(sid));
  if (!record || record.status !== 'paid') {
    return NextResponse.json({ error: 'payment required' }, { status: 402 });
  }

  /* The heritage/skin labels the result screen prints. They live on the order,
     not in the browser — after the payment redirect the client has only a sid. */
  const concernsOfProfile = (pr: Profile) => (pr.concerns ?? []).map((i) => CONCERN_LABELS[i]).filter(Boolean);
  const profile = {
    self: { heritage: record.self.heritage, skin: record.self.skin, concerns: concernsOfProfile(record.self) },
    partner: record.partner
      ? { heritage: record.partner.heritage, skin: record.partner.skin, concerns: concernsOfProfile(record.partner) }
      : null,
  };

  /* Computed here rather than in the browser: after the payment redirect the
     client holds only a sid, and both full profiles live on the order. */
  const couple =
    record.plan === 'couple' && record.partner
      ? {
          match: matchOf(record.self, record.partner),
          sharedConcerns: sharedConcerns(record.self, record.partner),
          sharedLife: sharedLife(record.self, record.partner),
          facts: togetherFacts(record.self, record.partner),
        }
      : null;

  /* GENERATE ONCE. A refresh, a second tab, or a webhook retry must all return
     the routine the customer already has — not a new one, and not a second
     charge against the API. */
  const cached = await kvGet<GeneratedRoutines>(routineKey(sid));
  if (cached) return NextResponse.json({ ...cached, plan: record.plan, profile, couple, source: 'cached' });

  const gotLock = await kvSetIfAbsent(genLockKey(sid), Date.now(), 120);
  if (!gotLock) {
    // Another request is already generating this order. Wait for its result
    // rather than paying for a duplicate.
    const deadline = Date.now() + LOCK_WAIT_MS;
    while (Date.now() < deadline) {
      await sleep(LOCK_POLL_MS);
      const arrived = await kvGet<GeneratedRoutines>(routineKey(sid));
      if (arrived) return NextResponse.json({ ...arrived, plan: record.plan, profile, couple, source: 'cached' });
    }
    console.warn(`[generate] lock wait expired for ${sid}, generating anyway`);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const client = apiKey ? new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 }) : null;
  if (!client) console.warn('[generate] ANTHROPIC_API_KEY not set — serving fallback');

  const wantPartner = record.plan === 'couple' && record.partner !== null;

  /* Run the couple's two routines together: sequentially a single slow call
     would be paid for twice over in wall-clock time. */
  const [selfRes, partnerRes] = await Promise.all([
    client ? generateOne(client, record.self) : Promise.resolve(null),
    client && wantPartner && record.partner ? generateOne(client, record.partner) : Promise.resolve(null),
  ]);

  const self = selfRes ?? fallback(record.self.heritage, record.self.skin, record.self.life);
  const partner =
    wantPartner && record.partner
      ? (partnerRes ?? fallback(record.partner.heritage, record.partner.skin, record.partner.life))
      : null;

  const result: GeneratedRoutines = { self, partner };
  const source = selfRes && (!wantPartner || partnerRes) ? 'model' : 'fallback';

  /* Persist even a fallback result: the customer paid for this exact routine
     and must see the same one when they come back to it. */
  try {
    await kvSet(routineKey(sid), result, ORDER_TTL_SECONDS);
  } catch (e) {
    console.error(`[generate] could not cache routine for ${sid}:`, e instanceof Error ? e.message : e);
  }

  return NextResponse.json({ ...result, plan: record.plan, profile, couple, source });
}
