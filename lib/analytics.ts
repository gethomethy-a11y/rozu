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
    (window as unknown as { _linkedin_partner_id?: string })._linkedin_partner_id = linkedin;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
    document.head.appendChild(s);
  }
}

/** Fires an event if — and only if — consent has been given. */
export function track(name: EventName, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (readConsent() !== 'granted') return;
  try {
    window.ttq?.track(name, props);
    window.lintrk?.('track', { conversion_id: name });
  } catch {
    /* analytics must never break the product */
  }
}
