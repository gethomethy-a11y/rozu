'use client';

import { useState } from 'react';
import { IC, P, Raw } from '@/lib/icons';
import { FAQS, HERITAGE_ROWS, WHO, type Mode } from '@/lib/quiz';
import { LogoMark } from './Logo';

function includedFor(m: Mode | null): { title: string; items: string[] } {
  if (m === 'couple') {
    return {
      title: "What's included · $12 one-time",
      items: ['Both morning + evening protocols', 'Heritage guides for both', 'Shared routine + match score', 'Shareable couple card'],
    };
  }
  return {
    title: m ? "What's included · $9 one-time" : "What's included",
    items: ['Morning + evening protocol', 'Heritage ingredient guide', 'What to avoid for your skin type', 'Lifestyle tips (sleep, stress, diet)'],
  };
}

const CTA_SUBS: Record<Mode, string> = {
  solo: 'Free quiz · $9 to unlock',
  couple: 'Free quiz · $12 to unlock both',
  gift: 'Free quiz · $9 to unlock',
};

export function Landing({
  active,
  mode,
  onSelectWho,
  onStart,
}: {
  active: boolean;
  mode: Mode | null;
  onSelectWho: (m: Mode) => void;
  onStart: () => void;
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [openStats, setOpenStats] = useState<Record<number, boolean>>({});
  const inc = includedFor(mode);

  const toggleStat = (i: number) => setOpenStats((s) => ({ ...s, [i]: !s[i] }));

  return (
    <div id="landing" className={'screen' + (active ? ' active' : '')}>
      <nav className="nav">
        <div className="logo-wrap">
          <LogoMark size={30} />
          <span className="logo-text">RŌZU</span>
        </div>
      </nav>

      <div className="hero">
        <div className="eyebrow">Heritage × Skin × Health</div>
        <h1 className="h1">
          Stop following routines
          <br />
          made for <em>someone else.</em>
        </h1>
        <p className="sub">
          Your melanin, barrier, and hormones are shaped by where you&apos;re from. RŌZU builds from that.
        </p>

        <div className="samp-wrap">
          <div className="samp">
            <div className="samp-ic">
              <Raw html={IC.hearts(24)} />
            </div>
            <div className="samp-b">
              <div className="samp-t">Southeast Asian × N. European</div>
              <div className="samp-s">3 shared steps · different products</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div className="samp-n">87%</div>
              <div className="samp-l">Match</div>
            </div>
          </div>
        </div>

        <div className="wlabel">Who is this for?</div>
        <div className="wcards" id="whoCards">
          {WHO.map((w) => (
            <div
              key={w.m}
              className={'wcard' + (mode === w.m ? ' sel' : '')}
              data-mode={w.m}
              onClick={() => onSelectWho(w.m)}
            >
              <div className="wic">
                <Raw html={w.ic} />
              </div>
              <div className="wb">
                <div className="wt">{w.t}</div>
                <div className="ws">{w.s}</div>
              </div>
              <div className="wp">{w.p}</div>
              <div className="wck">
                <Raw html={IC.check(12, '#fff')} />
              </div>
            </div>
          ))}
        </div>

        <button className="cta" id="cta" onClick={onStart} disabled={!mode}>
          Discover my glow profile →
          <span className="cta-s" id="ctaSub">
            {mode ? CTA_SUBS[mode] : 'Select an option above'}
          </span>
        </button>
        <div className="cta-f">Quiz is free · Pay only to unlock your result</div>

        <div className="stats">
          <div className={'stat' + (openStats[0] ? ' open' : '')} onClick={() => toggleStat(0)}>
            <div className="stat-n">$9</div>
            <div className="stat-l">Solo</div>
            <div className="stat-e">Full protocol + ingredient guide · yours forever</div>
          </div>
          <div className={'stat' + (openStats[1] ? ' open' : '')} onClick={() => toggleStat(1)}>
            <div className="stat-n">$12</div>
            <div className="stat-l">Couple</div>
            <div className="stat-e">Both profiles + shared routine + match score</div>
          </div>
          <div className={'stat' + (openStats[2] ? ' open' : '')} onClick={() => toggleStat(2)}>
            <div className="stat-n">2.8k</div>
            <div className="stat-l">This week</div>
            <div className="stat-e">Routines built across 40+ heritage backgrounds</div>
          </div>
        </div>

        <div className="inc">
          <div className="inc-t" id="incTitle">
            {inc.title}
          </div>
          <div className="inc-l" id="incList">
            {inc.items.map((item) => (
              <div className="inc-i" key={item}>
                <div className="inc-c">
                  <Raw html={IC.check(11, P)} />
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="faq-w">
        <div className="faq-div"></div>
        <div className="faq-lab">Why heritage matters</div>
        <div className="faqs" id="faqList">
          {FAQS.map((f, j) => (
            <div className={'faq' + (openFaq === j ? ' open' : '')} id={'faq' + j} key={j}>
              <button className="faq-q" onClick={() => setOpenFaq(openFaq === j ? null : j)}>
                <span className="faq-qt">{f.q}</span>
                <span className="faq-ar">
                  <Raw html={IC.chevron(15)} />
                </span>
              </button>
              <div className="faq-a" dangerouslySetInnerHTML={{ __html: f.a }} />
            </div>
          ))}
        </div>
        <div className="faq-lab" style={{ marginTop: '20px' }}>
          By heritage
        </div>
        <div className="hrows" id="hRows">
          {HERITAGE_ROWS.map((r) => (
            <div className="hrow" key={r.t}>
              <div className="hrow-ic" style={{ background: r.bg }}>
                <Raw html={r.ic} />
              </div>
              <div>
                <div className="hrow-t">{r.t}</div>
                <div className="hrow-d">{r.d}</div>
                <span className="hrow-tag">{r.tag}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="faq-cta">
          <button
            className="cta"
            onClick={() => {
              if (!mode) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
              }
              onStart();
            }}
          >
            Take the free quiz →<span className="cta-s">3 min · $9 to unlock</span>
          </button>
          <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--su)', marginTop: '8px' }}>
            <span style={{ cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              ↑ Choose your option above first
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
