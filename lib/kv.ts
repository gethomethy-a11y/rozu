/* The app's notepad: what was bought, whether it was paid for, what was
 * generated. Small, and read on every paid request.
 *
 * Three interchangeable backings, picked automatically from whichever
 * environment variables are set:
 *
 *   Supabase   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, over PostgREST
 *   Upstash    KV_REST_API_* or UPSTASH_REDIS_REST_*, over its REST API
 *   memory     neither — an in-process Map, for `next dev` only
 *
 * Both real backings are plain fetch. No client library, and therefore no new
 * dependency for either choice.
 *
 * The memory backing is per-instance and vanishes on restart, so it is never
 * acceptable in production: an order it forgets is an order that was paid for
 * and never delivered. `kvConfigured()` is what /api/checkout uses to refuse. */

const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const UPSTASH_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? '';
const UPSTASH_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? '';

/** Table name in Supabase. Created by the SQL in /api/setup. */
const TABLE = 'rozu_kv';

export type KvBacking = 'supabase' | 'upstash' | 'memory';

export function kvBacking(): KvBacking {
  if (SUPABASE_URL && SUPABASE_KEY) return 'supabase';
  if (UPSTASH_URL && UPSTASH_TOKEN) return 'upstash';
  return 'memory';
}

export function kvConfigured(): boolean {
  return kvBacking() !== 'memory';
}

type Driver = {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, ttl: number): Promise<void>;
  /** True when this call created the key; false when a live one already existed. */
  setIfAbsent(key: string, value: unknown, ttl: number): Promise<boolean>;
  del(key: string): Promise<void>;
};

/* ── Supabase (PostgREST) ─────────────────────────────────────────────────── */
/* Postgres has no TTL, so expiry is an `expires_at` column that reads filter
   on. Nothing needs sweeping: an expired row is invisible, and is replaced in
   place the next time that key is written. */

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

const iso = (ttl: number) => new Date(Date.now() + ttl * 1000).toISOString();

async function sbFetch(path: string, init: RequestInit): Promise<Response> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...sbHeaders, ...(init.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`supabase ${init.method ?? 'GET'} ${path}: ${res.status} ${body.slice(0, 200)}`);
  }
  return res;
}

const supabaseDriver: Driver = {
  async get(key) {
    const res = await sbFetch(
      `${TABLE}?key=eq.${encodeURIComponent(key)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=value`,
      { method: 'GET' },
    );
    const rows = (await res.json()) as Array<{ value: unknown }>;
    return rows.length ? rows[0].value : null;
  },

  async set(key, value, ttl) {
    // resolution=merge-duplicates makes this an upsert on the primary key.
    await sbFetch(TABLE, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key, value, expires_at: iso(ttl) }),
    });
  },

  async setIfAbsent(key, value, ttl) {
    /* Clear the key first only if it has expired — a live row is untouched, so
       this cannot steal a held lock. The insert that follows is atomic on the
       primary key, so exactly one concurrent caller can win it. */
    await sbFetch(
      `${TABLE}?key=eq.${encodeURIComponent(key)}&expires_at=lt.${encodeURIComponent(new Date().toISOString())}`,
      { method: 'DELETE', headers: { Prefer: 'return=minimal' } },
    );
    const res = await sbFetch(TABLE, {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({ key, value, expires_at: iso(ttl) }),
    });
    const rows = (await res.json()) as unknown[];
    return rows.length > 0;
  },

  async del(key) {
    await sbFetch(`${TABLE}?key=eq.${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });
  },
};

/* ── Upstash Redis ────────────────────────────────────────────────────────── */

async function redis(args: (string | number)[]): Promise<unknown> {
  const res = await fetch(UPSTASH_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`upstash ${args[0]}: ${res.status}`);
  const json = (await res.json()) as { result?: unknown; error?: string };
  if (json.error) throw new Error(`upstash ${args[0]}: ${json.error}`);
  return json.result;
}

const upstashDriver: Driver = {
  async get(key) {
    const raw = (await redis(['GET', key])) as string | null;
    if (raw == null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  async set(key, value, ttl) {
    await redis(['SET', key, JSON.stringify(value), 'EX', ttl]);
  },
  async setIfAbsent(key, value, ttl) {
    return (await redis(['SET', key, JSON.stringify(value), 'EX', ttl, 'NX'])) !== null;
  },
  async del(key) {
    await redis(['DEL', key]);
  },
};

/* ── In-process (development only) ────────────────────────────────────────── */

const mem = new Map<string, { v: string; exp: number }>();

function memRead(key: string): string | null {
  const e = mem.get(key);
  if (!e) return null;
  if (e.exp < Date.now()) {
    mem.delete(key);
    return null;
  }
  return e.v;
}

const memoryDriver: Driver = {
  async get(key) {
    const raw = memRead(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  async set(key, value, ttl) {
    mem.set(key, { v: JSON.stringify(value), exp: Date.now() + ttl * 1000 });
  },
  async setIfAbsent(key, value, ttl) {
    if (memRead(key) !== null) return false;
    mem.set(key, { v: JSON.stringify(value), exp: Date.now() + ttl * 1000 });
    return true;
  },
  async del(key) {
    mem.delete(key);
  },
};

function driver(): Driver {
  switch (kvBacking()) {
    case 'supabase':
      return supabaseDriver;
    case 'upstash':
      return upstashDriver;
    default:
      return memoryDriver;
  }
}

export async function kvGet<T>(key: string): Promise<T | null> {
  return (await driver().get(key)) as T | null;
}

export async function kvSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  return driver().set(key, value, ttlSeconds);
}

/**
 * Set only if the key is absent. Returns true when this call created it.
 * Used as a lock so two concurrent requests cannot both generate.
 */
export async function kvSetIfAbsent(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
  return driver().setIfAbsent(key, value, ttlSeconds);
}

export async function kvDel(key: string): Promise<void> {
  return driver().del(key);
}
