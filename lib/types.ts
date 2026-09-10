export type Step = {
  title: string;
  desc: string;
  heritage_detail: string;
};

export type Routine = {
  heritage_insight: string;
  spf: string;
  key_ingredient: string;
  morning: Step[];
  evening: Step[];
  avoid: string[];
  lifestyle: { text: string }[];
};

/** Which of the two things can be bought. Mirrored by lib/paidToken's `Plan`,
 *  which cannot live here — that module pulls in node:crypto and this one is
 *  imported by the browser. */
export type PlanName = 'solo' | 'couple';

/* The prices, in cents, named once.
 *
 * Read by the server to sanity-check what Lemon Squeezy actually charged, and
 * by the browser to put a value on the purchase event. Two copies would drift,
 * and the copy that drifts is the one an ad platform optimises against. */
export const PLAN_CENTS: Record<PlanName, number> = { solo: 900, couple: 1200 };
