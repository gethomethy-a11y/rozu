'use client';

/* Attribution, gated on consent.
 *
 * Nothing here loads a third-party script until the visitor has said yes. That
 * is not a nicety in the EU (§ 25 TDDDG), and it is also why the consent banner
 * and this file are one commit rather than two: shipping the pixel first and
 * the banner "next" is how sites end up non-compliant for a week.
 *
 * Pixel IDs are public by design — they appear in the page source of every site
 * that uses them — so NEXT_PUBLIC_ is correct here and only here.
 */

import { PLAN_CENTS, type PlanName } from './types';

export const CONSENT_KEY = 'rozu_consent';

export type Consent = 'granted' | 'denied';

export function readConsent(): Consent | null {
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function writeConsent(v: Consent): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, v);
  } catch {
    /* private mode: the choice simply does not persist */
  }
}

/* The funnel, named once. Every call site uses these constants rather than a
   string literal, so a typo cannot quietly create a second event that never
   appears in any report. */
export const EV = {
  landing: 'ViewContent',
  whoSelected: 'ClickButton',
  quizStart: 'StartQuiz',
  quizComplete: 'CompleteQuiz',
  partnerStart: 'StartPartnerQuiz',
  previewSeen: 'ViewPreview',
  checkoutStart: 'InitiateCheckout',
  purchase: 'CompletePayment',
  routineSeen: 'ViewRoutine',
  shared: 'Share',
} as const;

export type EventName = (typeof EV)[keyof typeof EV];

type TikTokQueue = { track: (n: string, p?: Record<string, unknown>) => void; page: () => void; load: (id: string) => void };
declare global {
  interface Window {
    ttq?: TikTokQueue;
    lintrk?: (a: string, b: Record<string, unknown>) => void;
  }
}

let loaded = false;

/** Injects the pixels. Safe to call more than once. */
export function loadPixels(): void {
  if (loaded || typeof window === 'undefined') return;
  const tiktok = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const linkedin = process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID;
  if (!tiktok && !linkedin) return;
  loaded = true;

  if (tiktok) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(tiktok)}&lib=ttq`;
    document.head.appendChild(s);
  }

  if (linkedin) {
    /* The Insight Tag reads the ARRAY, not the bare id. Setting only
       _linkedin_partner_id leaves the script loaded and silently tracking
       nothing — no error anywhere, which is the worst way for a pixel to
       fail. Both, in this order, is what LinkedIn's own snippet does. */
    const w = window as unknown as {
      _linkedin_partner_id?: string;
      _linkedin_data_partner_ids?: string[];
    };
    w._linkedin_partner_id = linkedin;
    w._linkedin_data_partner_ids = w._linkedin_data_partner_ids ?? [];
    w._linkedin_data_partner_ids.push(linkedin);

    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
    document.head.appendChild(s);
  }
}

/* Both SDKs load async, and the first event of the funnel fires within a few
   hundred milliseconds of consent — well before either script has arrived.
   Firing straight at `window.ttq` would drop exactly the events at the top of
   the funnel, which is the silent failure this whole file exists to avoid.
   So: hold them here, and drain once the SDK is really there.

   Deliberately our own buffer rather than TikTok's array-stub protocol. That
   protocol is undocumented and version-specific; getting it subtly wrong looks
   identical to it working. */
type Pending = { name: EventName; props?: Record<string, unknown> };
const pending: Pending[] = [];
const MAX_PENDING = 40;
let flushTimer: ReturnType<typeof setInterval> | null = null;

function deliver(name: EventName, props?: Record<string, unknown>): boolean {
  const tt = window.ttq;
  const li = window.lintrk;
  if (!tt && !li) return false;
  try {
    tt?.track(name, props);
    li?.('track', { conversion_id: name });
  } catch {
    /* analytics must never break the product */
  }
  return true;
}

function flush(): void {
  if (!window.ttq && !window.lintrk) return;
  while (pending.length) {
    const ev = pending.shift() as Pending;
    deliver(ev.name, ev.props);
  }
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

/* Bounded: a visitor who never accepts, or whose network eats the script,
   must not leave an interval running for the life of the tab. */
function scheduleFlush(): void {
  if (flushTimer) return;
  let tries = 0;
  flushTimer = setInterval(() => {
    if (++tries > 40) {
      clearInterval(flushTimer as ReturnType<typeof setInterval>);
      flushTimer = null;
      pending.length = 0;
      return;
    }
    flush();
  }, 500);
}

/** Fires an event if — and only if — consent has been given. */
export function track(name: EventName, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (readConsent() !== 'granted') return;
  if (deliver(name, props)) return;
  /* Drop the oldest rather than grow without bound. Losing the top of a
     stalled funnel beats holding a tab's worth of events forever. */
  if (pending.length >= MAX_PENDING) pending.shift();
  pending.push({ name, props });
  scheduleFlush();
}

/* Purchase value, in whole currency units, from the one price table.
 *
 * TikTok and LinkedIn both optimise against `value`; an event without one is
 * counted but cannot be bid on, which is most of the point of sending it. */
export function planValue(plan: PlanName): { value: number; currency: 'USD' } {
  return { value: PLAN_CENTS[plan] / 100, currency: 'USD' };
}
