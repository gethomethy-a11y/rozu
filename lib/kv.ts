/* Tiny key/value layer over Upstash Redis' REST API.
 *
 * Deliberately not the @upstash/redis package: the working agreement is to ask
 * before adding a dependency that is not Next, the payment SDK or the Anthropic
 * SDK, and the three commands we need are one fetch each.
 *
 * Vercel's Upstash integration sets KV_REST_API_*; a store created directly on
 * upstash.com sets UPSTASH_REDIS_REST_*. Both are accepted.
 *
 * With neither set we fall back to an in-process Map so `next dev` works
 * without a database. That memory is per-instance and vanishes on restart, so
 * it is never acceptable in production — anything that matters (an order that
 * has been paid for) would be lost. `kvConfigured()` lets callers refuse. */

const URL_ = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? '';
const TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? '';

export function kvConfigured(): boolean {
  return Boolean(URL_ && TOKEN);
}

/** Dev-only store. Values are already JSON strings, matching the Redis shape. */
const mem = new Map<string, { v: string; exp: number }>();

function memGet(key: string): string | null {
  const e = mem.get(key);
  if (!e) return null;
  if (e.exp < Date.now()) {
    mem.delete(key);
    return null;
  }
  return e.v;
}

async function cmd(args: (string | number)[]): Promise<unknown> {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`kv ${args[0]} failed: ${res.status}`);
  const json = (await res.json()) as { result?: unknown; error?: string };
  if (json.error) throw new Error(`kv ${args[0]} failed: ${json.error}`);
  return json.result;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const raw = kvConfigured() ? ((await cmd(['GET', key])) as string | null) : memGet(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const raw = JSON.stringify(value);
  if (kvConfigured()) {
    await cmd(['SET', key, raw, 'EX', ttlSeconds]);
    return;
  }
  mem.set(key, { v: raw, exp: Date.now() + ttlSeconds * 1000 });
}

/**
 * Set only if the key is absent. Returns true when this call created it.
 * Used as a lock so two concurrent requests cannot both bill or both generate.
 */
export async function kvSetIfAbsent(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
  const raw = JSON.stringify(value);
  if (kvConfigured()) {
    return (await cmd(['SET', key, raw, 'EX', ttlSeconds, 'NX'])) !== null;
  }
  if (memGet(key) !== null) return false;
  mem.set(key, { v: raw, exp: Date.now() + ttlSeconds * 1000 });
  return true;
}

export async function kvDel(key: string): Promise<void> {
  if (kvConfigured()) {
    await cmd(['DEL', key]);
    return;
  }
  mem.delete(key);
}
