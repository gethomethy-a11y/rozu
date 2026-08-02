import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { fallback } from '@/lib/fallback';
import { buildPrompt } from '@/lib/prompt';
import { emptyLife, type Life } from '@/lib/quiz';
import { ROUTINE_SCHEMA, validateRoutine } from '@/lib/validate';
import type { Routine } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = 'claude-opus-5';
/* Thinking is on by default on Opus 5 and max_tokens caps thinking + output
   together, so this is sized well above the ~600-token routine. Thinking is
   deliberately left on: disabling it can leak <thinking> tags into the visible
   response, which would corrupt the JSON. Low effort keeps it fast instead. */
const MAX_TOKENS = 4096;
const TIMEOUT_MS = 12000;

type GenerateBody = {
  heritage?: unknown;
  skin?: unknown;
  life?: unknown;
  /* Issued by the payment webhook in step 3. Not yet enforced — see the
     origin check below for the interim guard. */
  token?: unknown;
};

function coerceLife(v: unknown): Life {
  const l = emptyLife();
  if (typeof v !== 'object' || v === null) return l;
  const o = v as Record<string, unknown>;
  for (const k of ['sleep', 'stress', 'diet'] as const) {
    const n = o[k];
    if (typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < 10) l[k] = n;
  }
  return l;
}

/* INTERIM ABUSE GUARD.
   This endpoint spends real money per call and has no payment gate until
   step 3 issues the single-purchase token. Same-origin is a speed bump, not
   security — it stops casual scraping, not a determined caller who forges a
   header. Replace with token verification in step 3. */
function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin') ?? req.headers.get('referer');
  if (!origin) return false;
  const host = req.headers.get('host');
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const heritage = typeof body.heritage === 'string' ? body.heritage : '';
  const skin = typeof body.skin === 'string' ? body.skin : '';
  const life = coerceLife(body.life);

  if (!heritage || !skin) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  if (!sameOrigin(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Every failure path below resolves to the deterministic fallback. The user
  // has paid by this point and must never see an error screen.
  const useFallback = (reason: string): NextResponse => {
    console.warn(`[generate] falling back: ${reason}`);
    return NextResponse.json({ routine: fallback(heritage, skin, life), source: 'fallback' });
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return useFallback('ANTHROPIC_API_KEY not set');

  const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 });

  let raw: unknown;
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: ROUTINE_SCHEMA },
      },
      messages: [{ role: 'user', content: buildPrompt(heritage, skin, life) }],
    });

    if (res.stop_reason === 'refusal') return useFallback('model refused');
    if (res.stop_reason === 'max_tokens') return useFallback('response truncated');

    const text = res.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return useFallback('no text block');
    raw = JSON.parse(text.text);
  } catch (e) {
    return useFallback(e instanceof Error ? e.message : 'request failed');
  }

  const routine: Routine | null = validateRoutine(raw);
  if (!routine) return useFallback('validation failed');

  return NextResponse.json({ routine, source: 'model' });
}
