'use client';

import type { CoupleInfo } from './RozuApp';

/* The card a couple screenshots and posts.
 *
 * It is the only screen in the app designed to be seen by people who have not
 * used it, so it carries its own context: both heritages, the number, and what
 * the number is made of. Someone seeing it on TikTok should understand it
 * without a caption.
 *
 * Deliberately not the result screen in miniature. It states one thing, and the
 * bullet list underneath is the evidence for it — a shared item in plum, an
 * unshared one greyed out, so the balance is legible before a word is read.
 */
export function ShareCard({
  pct,
  h1,
  h2,
  factors,
}: {
  pct: number;
  h1: string;
  h2: string;
  factors: CoupleInfo['facts']['factors'];
}) {
  return (
    <div className="scard" id="shareCard">
      <div className="scard-brand">RŌZU</div>

      <div className="scard-h">
        Your skin agrees on <span className="scard-pct">{`${pct}%`}</span> of what matters.
      </div>

      <div className="scard-bar">
        <div className="scard-bar-f" style={{ width: `${Math.max(4, Math.min(100, pct))}%` }}></div>
      </div>
      <div className="scard-legend">
        <span className={pct >= 50 ? 'on' : ''}>Shared</span>
        <span className={pct < 50 ? 'on' : ''}>Individual</span>
      </div>

      <div className="scard-rule"></div>

      <ul className="scard-list">
        {factors.map((f) => (
          <li key={f.label} className={f.shared ? 'scard-on' : ''}>
            <span className="scard-dot"></span>
            {f.label}
          </li>
        ))}
      </ul>

      <div className="scard-rule"></div>

      <div className="scard-foot">
        <span className="scard-pair">{`${h1} × ${h2}`}</span>
        <span className="scard-mark">RŌZU</span>
      </div>
    </div>
  );
}
