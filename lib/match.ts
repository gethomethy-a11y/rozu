/* The couple compatibility score.
 *
 * It was the literal string "87%" in the prototype's markup — the same number
 * for every couple who ever bought the $12 plan, next to two real heritages.
 * That is the one number on the screen a couple will actually compare with
 * friends, so it has to come from their answers.
 *
 * Deterministic rather than model-generated, for three reasons: the same two
 * people must always get the same number, it costs nothing, and it can explain
 * itself in a line of copy underneath.
 *
 * The range is deliberately 68–97 and never 100. Nobody paid $12 to be told
 * they are 34% compatible with their partner, and a perfect score reads as a
 * gimmick rather than a measurement.
 */
import { CONCERN_LABELS, DIET_OPTS, SLEEP_OPTS, STRESS_OPTS, type Life } from './quiz';
import type { Profile } from './order';

export type Match = { pct: number; reason: string };

const MIN_PCT = 68;
const SPAN = 29;

/** Skin types that can genuinely share products, as opposed to merely coexist. */
const SKIN_AFFINITY: Record<string, string[]> = {
  Dry: ['Normal', 'Sensitive'],
  Oily: ['Combination'],
  Combination: ['Oily', 'Normal'],
  Normal: ['Dry', 'Combination', 'Sensitive'],
  Sensitive: ['Dry', 'Normal'],
};

function lifeAgreement(a: Life, b: Life): number {
  const keys = ['sleep', 'stress', 'diet'] as const;
  const answered = keys.filter((k) => a[k] !== null && b[k] !== null);
  if (!answered.length) return 0.5; // nothing to go on, so neither reward nor punish
  return answered.filter((k) => a[k] === b[k]).length / answered.length;
}

function concernOverlap(a: number[], b: number[]): number {
  if (!a.length || !b.length) return 0.35;
  const setB = new Set(b);
  const shared = a.filter((x) => setB.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union ? shared / union : 0;
}

function skinAffinity(a: string, b: string): number {
  if (a === b) return 1;
  return SKIN_AFFINITY[a]?.includes(b) ? 0.6 : 0.25;
}

/** The shared concerns, as labels, most useful first. */
export function sharedConcerns(a: Profile, b: Profile): string[] {
  const setB = new Set(b.concerns ?? []);
  return (a.concerns ?? []).filter((i) => setB.has(i)).map((i) => CONCERN_LABELS[i]).filter(Boolean);
}

/** The lifestyle answers both partners gave identically. */
export function sharedLife(a: Profile, b: Profile): (keyof Life)[] {
  return (['sleep', 'stress', 'diet'] as const).filter(
    (k) => a.life[k] !== null && a.life[k] === b.life[k],
  );
}

export function matchOf(a: Profile, b: Profile): Match {
  const life = lifeAgreement(a.life, b.life);
  const concerns = concernOverlap(a.concerns ?? [], b.concerns ?? []);
  const skin = skinAffinity(a.skin, b.skin);
  const sameHeritage = a.heritage === b.heritage ? 1 : 0;

  const score = 0.35 * life + 0.3 * concerns + 0.25 * skin + 0.1 * sameHeritage;
  const pct = Math.round(MIN_PCT + score * SPAN);

  return { pct, reason: reasonFor(a, b, { life, concerns, skin, sameHeritage }) };
}

/* One line under the score saying what it is actually reading. Ordered by how
   specific the statement is, not by how much it contributed — "you both fight
   dark spots" is worth more to a couple than "your lifestyles align". */
function reasonFor(
  a: Profile,
  b: Profile,
  w: { life: number; concerns: number; skin: number; sameHeritage: number },
): string {
  const shared = sharedConcerns(a, b);
  if (shared.length >= 2) {
    return `You both deal with ${shared[0].toLowerCase()} and ${shared[1].toLowerCase()}`;
  }
  if (shared.length === 1) {
    return `You both deal with ${shared[0].toLowerCase()}`;
  }
  if (w.skin === 1) {
    return `Same skin type — most products work for both of you`;
  }
  if (w.life >= 0.66) {
    return `Your sleep, stress and diet patterns line up`;
  }
  if (w.sameHeritage === 1) {
    return `Same heritage, so the same biology is driving both routines`;
  }
  if (w.skin <= 0.25) {
    return `Opposite skin types — same habits, different products`;
  }
  return `Two heritages, one shared set of habits`;
}

/* ── What the Together tab is allowed to claim ───────────────────────────── */
/* The tab shipped with three fixed cards: "Sleep before midnight", "2L water
   daily", "Morning SPF". Two of the three were assertions about the couple that
   nothing had checked — shown unchanged to two people who both go to bed at
   2am. This returns only what their answers actually support, so a card can
   never claim a habit they do not have. */

export type TogetherFacts = {
  /** Concern labels both partners selected. */
  concerns: string[];
  /** Lifestyle answers they gave identically, with the answer itself. */
  habits: { key: keyof Life; answer: string }[];
  skinSame: boolean;
  selfSkin: string;
  partnerSkin: string;
  heritageSame: boolean;
};

const LIFE_OPTS: Record<keyof Life, string[]> = {
  sleep: SLEEP_OPTS,
  stress: STRESS_OPTS,
  diet: DIET_OPTS,
};

export function togetherFacts(a: Profile, b: Profile): TogetherFacts {
  return {
    concerns: sharedConcerns(a, b),
    habits: sharedLife(a, b).map((k) => ({ key: k, answer: LIFE_OPTS[k][a.life[k] as number] ?? '' })),
    skinSame: a.skin === b.skin,
    selfSkin: a.skin,
    partnerSkin: b.skin,
    heritageSame: a.heritage === b.heritage,
  };
}
