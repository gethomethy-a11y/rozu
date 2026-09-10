'use client';

import { useEffect, useState } from 'react';
import { loadPixels, readConsent, writeConsent } from '@/lib/analytics';

/* The consent banner.
 *
 * Rendered after mount so the server-rendered HTML is identical for everyone
 * and does not flash a banner at someone who already answered.
 *
 * "Decline" is a real button, the same size as "Accept". A decline that is
 * harder to click than an accept is not consent under the GDPR, and it is the
 * single most common way these banners are found non-compliant. */
export function Consent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const c = readConsent();
    if (c === 'granted') loadPixels();
    else if (c === null) setShow(true);
  }, []);

  useEffect(() => {
    // Lets the privacy page reopen this without a reload.
    const open = () => setShow(true);
    window.addEventListener('rozu:consent', open);
    return () => window.removeEventListener('rozu:consent', open);
  }, []);

  const decide = (granted: boolean) => {
    writeConsent(granted ? 'granted' : 'denied');
    if (granted) loadPixels();
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="consent" role="dialog" aria-label="Cookie settings">
      <div className="consent-b">
        <div className="consent-t">Can RŌZU see what works?</div>
        <div className="consent-s">
          We would like to know which posts lead to a routine, so we load the TikTok and
          LinkedIn counters. Nothing loads unless you say yes. Your quiz answers are
          separate — we need those either way to build your routine. Details in our{' '}
          <a href="/privacy">privacy policy</a>.
        </div>
        <div className="consent-btns">
          <button className="consent-btn a" onClick={() => decide(true)}>
            That&apos;s fine
          </button>
          <button className="consent-btn d" onClick={() => decide(false)}>
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
