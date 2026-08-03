'use client';

import { IC, Raw, box } from '@/lib/icons';
import { matchOf } from '@/lib/match';
import { profileOf } from '@/lib/order';
import { heritageOf, skinOf, type Answers, type Life, type Mode } from '@/lib/quiz';
import { MatchBanner } from './MatchBanner';

export function Preview({
  mode,
  bothDone,
  selfAns,
  partAns,
  selfLife,
  partLife,
  onPurchase,
}: {
  mode: Mode | null;
  bothDone: boolean;
  selfAns: Answers;
  partAns: Answers;
  selfLife: Life;
  partLife: Life;
  onPurchase: () => void;
}) {
  const h = heritageOf(selfAns);
  const s = skinOf(selfAns);
  const isSE = h.indexOf('Southeast') > -1 || h.indexOf('East Asian') > -1;
  const isEuro = h.indexOf('European') > -1;
  const spf = isEuro ? 'SPF 50+' : 'SPF 30';
  const ki = isSE ? 'Niacinamide 5–10%' : isEuro ? 'Ceramides' : 'Vitamin C';
  const concern = isSE ? 'Dark spots / PIH' : isEuro ? 'UV sensitivity' : 'Hyperpigmentation';
  const price = mode === 'couple' ? '$12' : '$9';

  const incs = ['Morning + evening protocol', 'Heritage ingredient guide', 'What to avoid for your skin type'];
  if (mode === 'couple') incs.push('Partner profile + shared routine');

  const fakes = [
    { t: 'Cleanser for your barrier type', ic: box(38, 12, '#e6f0fa', IC.cleanser(20)) },
    { t: 'Active serum for your concern', ic: box(38, 12, '#f2ebfc', IC.serum(20)) },
    { t: 'Moisturiser matched to your skin', ic: box(38, 12, '#e8f7ee', IC.moisturiser(20)) },
    { t: 'SPF level for your melanin', ic: box(38, 12, '#fdf3e0', IC.spf(20)) },
  ];

  return (
    <>
      {mode === 'couple' && bothDone && (
        <MatchBanner
          h1={h}
          h2={heritageOf(partAns)}
          pct={matchOf(profileOf(selfAns, selfLife), profileOf(partAns, partLife)).pct}
          subtitle="Your couple profile is ready"
        />
      )}

      <div className="hcard">
        <div className="hcard-ic">
          <Raw html={IC.globe(21)} />
        </div>
        <div>
          <div className="hcard-t">{`${h} Heritage`}</div>
          <div className="hcard-s">{`${s} skin · ${concern}`}</div>
        </div>
      </div>

      <div className="tiles">
        <div className="tile">
          <div className="tile-l">Key ingredient</div>
          <div className="tile-v" style={{ fontSize: '12px' }}>
            {ki}
          </div>
        </div>
        <div className="tile">
          <div className="tile-l">SPF</div>
          <div className="tile-v">{spf}</div>
          <div className="tile-n">Matched to your melanin</div>
        </div>
      </div>

      <div className="pcard">
        <div className="pc-top">
          <span className="pc-p">{price}</span>
          <span className="pc-per">{`one time${mode === 'couple' ? ' · both' : ''}`}</span>
        </div>
        <div className="pc-t">Unlock your AI-built routine — personalised to your exact heritage</div>
        <div className="pc-list">
          {incs.map((i) => (
            <div className="pc-i" key={i}>
              <Raw html={IC.check(12, '#ffffffaa')} />
              {i}
            </div>
          ))}
        </div>
        <button className="pc-btn" onClick={onPurchase}>
          Unlock my routine →
        </button>
        <div className="pc-f">Secure · Yours forever</div>
      </div>

      <div className="blur">
        <div className="blur-in">
          <div className="fsteps">
            {fakes.map((f) => (
              <div className="fstep" key={f.t}>
                <Raw html={f.ic} />
                <div className="fs-t">{f.t}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="blur-ov">
          <div className="blur-lab">
            <Raw html={IC.lock(15, '#fff')} />
            Unlock to see your full routine
          </div>
        </div>
      </div>
    </>
  );
}
