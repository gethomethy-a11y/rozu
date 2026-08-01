'use client';

import { IC, Raw } from '@/lib/icons';
import {
  DIET_OPTS,
  QS,
  SLEEP_OPTS,
  STRESS_OPTS,
  canGo,
  type Answers,
  type Filling,
  type Life,
  type Mode,
} from '@/lib/quiz';

function LifeGroup({
  k,
  label,
  iconStr,
  bg,
  opts,
  value,
  onPick,
}: {
  k: keyof Life;
  label: string;
  iconStr: string;
  bg: string;
  opts: string[];
  value: number | null;
  onPick: (k: keyof Life, v: number) => void;
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div className="qsec">
        <div className="qsec-ic" style={{ background: bg }}>
          <Raw html={iconStr} />
        </div>
        {label}
      </div>
      <div className="qopts">
        {opts.map((o, i) => (
          <div key={i} className={'qopt' + (value === i ? ' sel' : '')} onClick={() => onPick(k, i)}>
            <div className="qopt-b">
              <div className="qopt-t" style={{ fontSize: '13px' }}>
                {o}
              </div>
            </div>
            <div className="qopt-ck">
              <Raw html={IC.check(12, '#fff')} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Quiz({
  active,
  cQ,
  mode,
  filling,
  ans,
  life,
  onBack,
  onNext,
  onPick,
  onPickMulti,
  onPickLife,
}: {
  active: boolean;
  cQ: number;
  mode: Mode | null;
  filling: Filling;
  ans: Answers;
  life: Life;
  onBack: () => void;
  onNext: () => void;
  onPick: (id: string, v: number) => void;
  onPickMulti: (id: string, v: number) => void;
  onPickLife: (k: keyof Life, v: number) => void;
}) {
  const q = QS[cQ];
  const tot = QS.length;
  const isLast = cQ === QS.length - 1;
  const btnTxt =
    isLast && mode === 'couple' && filling === 'self'
      ? 'Continue to partner →'
      : isLast
        ? 'See my preview →'
        : 'Continue →';
  const multi = Array.isArray(ans[q.id]) ? (ans[q.id] as number[]) : [];

  return (
    <div id="quiz" className={'screen' + (active ? ' active' : '')}>
      <div className="qnav">
        <div className="qback" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4a4247" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </div>
        <div className="qprog">
          <div className="qbar" id="qBar" style={{ width: Math.round(((cQ + 1) / tot) * 100) + '%' }}></div>
        </div>
        <div className="qstep" id="qStep">{`${cQ + 1} of ${tot}`}</div>
      </div>
      <div className="qbody" id="qBody">
        {mode === 'couple' && (
          <div className="pbar">
            <div className="pdot"></div>
            <div className="ptext">{filling === 'partner' ? 'Filling: Partner profile' : 'Filling: Your profile'}</div>
          </div>
        )}

        <div className="qlab">{q.lb}</div>
        <h2 className="qtitle">{q.ti}</h2>
        {q.sb && <p className="qsub">{q.sb}</p>}

        {q.type === 'single' && (
          <div className="qopts">
            {q.opts!.map((o, i) => (
              <div key={i} className={'qopt' + (ans[q.id] === i ? ' sel' : '')} onClick={() => onPick(q.id, i)}>
                <Raw html={o.ic!} />
                <div className="qopt-b">
                  <div className="qopt-t">{o.lb}</div>
                  {o.sb && <div className="qopt-s">{o.sb}</div>}
                </div>
                <div className="qopt-ck">
                  <Raw html={IC.check(12, '#fff')} />
                </div>
              </div>
            ))}
          </div>
        )}

        {q.type === 'grid' && (
          <div className="qgrid">
            {q.opts!.map((go, g) => (
              <div key={g} className={'qg' + (ans[q.id] === g ? ' sel' : '')} onClick={() => onPick(q.id, g)}>
                <div className="qg-sw" style={{ background: go.sw }}></div>
                <div className="qg-l">{go.lb}</div>
                <div className="qg-s">{go.sb}</div>
              </div>
            ))}
          </div>
        )}

        {q.type === 'multi' && (
          <>
            <p className="qhint">Select all that apply.</p>
            <div className="qopts">
              {q.opts!.map((mo, m) => (
                <div
                  key={m}
                  className={'qopt' + (multi.indexOf(m) > -1 ? ' sel' : '')}
                  onClick={() => onPickMulti(q.id, m)}
                >
                  <Raw html={mo.ic!} />
                  <div className="qopt-b">
                    <div className="qopt-t">{mo.lb}</div>
                  </div>
                  <div className="qopt-ck">
                    <Raw html={IC.check(12, '#fff')} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {q.type === 'lifestyle' && (
          <>
            <LifeGroup k="sleep" label="Sleep" iconStr={IC.sleep(15)} bg="#e8ecfa" opts={SLEEP_OPTS} value={life.sleep} onPick={onPickLife} />
            <LifeGroup k="stress" label="Stress" iconStr={IC.stress(15)} bg="#e8f7ee" opts={STRESS_OPTS} value={life.stress} onPick={onPickLife} />
            <LifeGroup k="diet" label="Diet" iconStr={IC.diet(15)} bg="#fdf3e0" opts={DIET_OPTS} value={life.diet} onPick={onPickLife} />
          </>
        )}

        <button className="qnext" id="nextBtn" onClick={onNext} disabled={!canGo(q, ans, life)}>
          {btnTxt}
        </button>
      </div>
    </div>
  );
}
