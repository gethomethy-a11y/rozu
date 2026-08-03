'use client';

import { useState } from 'react';
import { saveCardImage, type CardData } from '@/lib/cardImage';
import type { Routine } from '@/lib/types';
import type { ToastFn } from './ShareSheet';

/* The card a customer screenshots and posts.
 *
 * It is the only screen in the app seen by people who have not used it, so it
 * carries its own context: who it is about, the one number or the one
 * ingredient, and the evidence underneath. It should make sense on someone
 * else's feed with no caption.
 *
 * The DOM and the PNG are built from the same CardData, so what gets saved is
 * what was on screen — not a second implementation that drifts.
 */

/** Couple: one number and what it is made of. */
export function coupleCard(
  pct: number,
  h1: string,
  h2: string,
  factors: { label: string; shared: boolean }[],
): CardData {
  return {
    kind: 'couple',
    pct,
    headline: { pre: 'Your skin agrees on', accent: `${pct}%`, post: 'of what matters.' },
    factors,
    footer: `${h1} × ${h2}`,
  };
}

/** Solo and gift: no second person to compare with, so the hero is the one
 *  ingredient the whole routine is built around. */
export function soloCard(p: Routine, heritage: string, skin: string, concerns: string[]): CardData {
  const factors: { label: string; shared: boolean }[] = [];
  for (const c of concerns.slice(0, 2)) factors.push({ label: c, shared: true });
  factors.push({ label: `${p.spf} — matched to your melanin`, shared: true });
  const m = p.morning?.length ?? 0;
  const e = p.evening?.length ?? 0;
  if (m || e) factors.push({ label: `${m} morning steps, ${e} evening`, shared: true });
  if (p.avoid?.length) factors.push({ label: `Avoid: ${p.avoid[0].toLowerCase()}`, shared: false });

  return {
    kind: 'solo',
    headline: { pre: 'Your skin runs on', accent: p.key_ingredient, post: '.' },
    factors,
    footer: `${heritage} · ${skin} skin`,
  };
}

export function ShareCard({ data, toast }: { data: CardData; toast: ToastFn }) {
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const name = data.kind === 'couple' ? 'rozu-couple.png' : 'rozu-routine.png';
    const outcome = await saveCardImage(data, name);
    setSaving(false);
    if (outcome === 'downloaded') toast('Image saved');
    else if (outcome === 'failed') toast('Could not create the image. Screenshot it instead.', false);
    // 'shared' needs no toast — the OS sheet already confirmed it.
  };

  return (
    <>
      <div className="scard" id="shareCard">
        <div className="scard-brand">RŌZU</div>

        <div className="scard-h">
          {`${data.headline.pre} `}
          <span className="scard-pct">{data.headline.accent}</span>
          {data.headline.post === '.' ? '.' : ` ${data.headline.post}`}
        </div>

        {data.kind === 'couple' && typeof data.pct === 'number' && (
          <>
            <div className="scard-bar">
              <div className="scard-bar-f" style={{ width: `${Math.max(4, Math.min(100, data.pct))}%` }}></div>
            </div>
            <div className="scard-legend">
              <span className={data.pct >= 50 ? 'on' : ''}>Shared</span>
              <span className={data.pct < 50 ? 'on' : ''}>Individual</span>
            </div>
          </>
        )}

        <div className="scard-rule"></div>

        <ul className="scard-list">
          {data.factors.map((f) => (
            <li key={f.label} className={f.shared ? 'scard-on' : ''}>
              <span className="scard-dot"></span>
              {f.label}
            </li>
          ))}
        </ul>

        <div className="scard-rule"></div>

        <div className="scard-foot">
          <span className="scard-pair">{data.footer}</span>
          <span className="scard-mark">RŌZU</span>
        </div>
      </div>

      <button className="share-b p scard-save" onClick={save} disabled={saving}>
        {saving ? 'Preparing…' : 'Save image'}
      </button>
    </>
  );
}
