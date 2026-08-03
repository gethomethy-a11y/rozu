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
 * The range is 5–98. It used to be floored at 68 so the number was never
 * unflattering, but the share card puts a bar next to it: a couple with nothing
 * in common got a two-thirds-full bar above four greyed-out lines, and the card
 * contradicted itself. An honest low number is also the more interesting one to
 * post — and "your skin agrees on 15% of what matters" is a statement about two
 * sets of pores, not about a relationship.
 *
 * Heritage deliberately does NOT enter the score. Two different heritages are
 * the premise of the product, not a defect in the couple, and docking them for
 * it would contradict everything the rest of the app says.
 */
import { CONCERN_LABELS, DIET_OPTS, SLEEP_OPTS, STRESS_OPTS, type Life } from './quiz';
import type { Profile } from './order';

export type Match = { pct: number; reason: string };

const MIN_PCT = 5;
const SPAN = 93;

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

  // What actually shapes a routine: what you are treating, how you live, and
  // what your skin will tolerate.
  const score = 0.35 * concerns + 0.35 * life + 0.3 * skin;
  const pct = Math.min(98, Math.max(MIN_PCT, Math.round(MIN_PCT + score * SPAN)));

  return { pct, reason: reasonFor(a, b, { life, concerns, skin, sameHeritage: a.heritage === b.heritage ? 1 : 0 }) };
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

/* The lines the share card prints. A fixed set of dimensions rather than
   whatever happened to overlap, so the card has the same shape for every couple
   — including one with nothing in common, where an empty list would look like a
   bug rather than a result. */
export type Factor = { label: string; shared: boolean };

export type TogetherFacts = {
  /** Ordered for the share card: shared first, then what they do not share. */
  factors: Factor[];
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

function shareCardFactors(a: Profile, b: Profile): Factor[] {
  const out: Factor[] = [];

  const concerns = sharedConcerns(a, b);
  if (concerns.length) for (const c of concerns.slice(0, 2)) out.push({ label: c, shared: true });
  else out.push({ label: 'Concerns — no overlap', shared: false });

  const sleepSame = a.life.sleep !== null && a.life.sleep === b.life.sleep;
  out.push(
    sleepSame
      ? { label: `Sleep — ${(SLEEP_OPTS[a.life.sleep as number] ?? '').toLowerCase()}`, shared: true }
      : { label: 'Sleep — different patterns', shared: false },
  );

  out.push(
    a.skin === b.skin
      ? { label: `Skin type — both ${a.skin.toLowerCase()}`, shared: true }
      : { label: `Skin type — ${a.skin} vs ${b.skin}`, shared: false },
  );

  // Always true, and the one thing every couple can hold each other to. It is
  // what keeps the card from being entirely grey for a couple with no overlap.
  out.push({ label: 'Both need daily SPF', shared: true });

  return [...out.filter((f) => f.shared), ...out.filter((f) => !f.shared)];
}

export function togetherFacts(a: Profile, b: Profile): TogetherFacts {
  return {
    factors: shareCardFactors(a, b),
    concerns: sharedConcerns(a, b),
    habits: sharedLife(a, b).map((k) => ({ key: k, answer: LIFE_OPTS[k][a.life[k] as number] ?? '' })),
    skinSame: a.skin === b.skin,
    selfSkin: a.skin,
    partnerSkin: b.skin,
    heritageSame: a.heritage === b.heritage,
  };
}
