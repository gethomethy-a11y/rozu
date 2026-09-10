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

/** What can be bought. Mirrored by lib/paidToken's `Plan`, which cannot live
 *  here — that module pulls in node:crypto and this one is imported by the
 *  browser.
 *
 *  `gift` was a UI mode that quietly charged the solo price and produced a
 *  solo routine. It is a real plan now: it has its own Stripe price, so gift
 *  volume is visible in the dashboard instead of being folded into solo. */
export type PlanName = 'solo' | 'couple' | 'gift';

/* The prices, in cents, named once.
 *
 * Read by the server to sanity-check what Lemon Squeezy actually charged, and
 * by the browser to put a value on the purchase event. Two copies would drift,
 * and the copy that drifts is the one an ad platform optimises against. */
export const PLAN_CENTS: Record<PlanName, number> = { solo: 900, couple: 1200, gift: 900 };
