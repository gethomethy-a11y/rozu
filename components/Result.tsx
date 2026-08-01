'use client';

import { useState } from 'react';
import { IC, Raw, box, lifeIcon, stepIcon } from '@/lib/icons';
import type { Mode } from '@/lib/quiz';
import type { Routine, Step } from '@/lib/types';
import { MatchBanner } from './MatchBanner';

function SectionHead({ label }: { label: string }) {
  return (
    <div className="rsec">
      {label}
      <div className="rsec-line"></div>
    </div>
  );
}

function StepCard({ st }: { st: Step }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={'rcard' + (open ? ' open' : '')} onClick={() => setOpen((o) => !o)}>
      <div className="rc-main">
        <Raw html={stepIcon(st.title)} />
        <div className="rc-b">
          <div className="rc-t">{st.title}</div>
        </div>
        <span className="rc-ar">
          <Raw html={IC.chevron(16)} />
        </span>
      </div>
      <div className="rc-exp">
        <div className="rc-inner">
          <div className="rc-why">Why for your heritage</div>
          <div className="rc-txt">{st.heritage_detail || st.desc || ''}</div>
        </div>
      </div>
    </div>
  );
}

function StepList({ steps, prefix }: { steps: Step[]; prefix: string }) {
  return (
    <div className="rsteps">
      {steps.map((s, i) => (
        <StepCard key={prefix + i} st={s} />
      ))}
    </div>
  );
}

function AvoidBlock({ items }: { items: string[] }) {
  return (
    <div className="avoid">
      <div className="av-l">Avoid</div>
      {items.map((i) => (
        <div className="av-i" key={i}>
          <div className="av-x">
            <Raw html={IC.x(10)} />
          </div>
          {i}
        </div>
      ))}
    </div>
  );
}

function LifeBlock({ items }: { items: { text: string }[] }) {
  return (
    <div className="life">
      {items.map((i) => (
        <div className="life-i" key={i.text}>
          <Raw html={lifeIcon(i.text)} />
          <span>{i.text}</span>
        </div>
      ))}
    </div>
  );
}

function ProfileCard({ h, s, p }: { h: string; s: string; p: Routine }) {
  return (
    <div className="hcard">
      <div className="hcard-ic">
        <Raw html={IC.globe(21)} />
      </div>
      <div>
        <div className="hcard-t">{`${h} · ${s}`}</div>
        <div className="hcard-s">{`${p.spf} · ${p.key_ingredient}`}</div>
      </div>
    </div>
  );
}

function SharedCard({ icon, title, desc, diff }: { icon: string; title: string; desc: string; diff?: React.ReactNode }) {
  return (
    <div className="shared">
      <div className="sh-top">
        <Raw html={icon} />
        <span className="sh-t">{title}</span>
        <span className="sh-badge">Shared</span>
      </div>
      <div className="sh-d">{desc}</div>
      {diff ? <div className="sh-diff">{diff}</div> : null}
    </div>
  );
}

function ShareBlock({ mode, onOpenSheet, onCopy }: { mode: Mode | null; onOpenSheet: () => void; onCopy: () => void }) {
  return (
    <div className="share">
      <div className="share-t">{mode === 'couple' ? 'Share your couple routine' : 'Share your glow routine'}</div>
      <div className="share-s">{mode === 'couple' ? 'Send it to your partner.' : 'Show your friends what changed.'}</div>
      <div className="share-btns">
        <button className="share-b p" onClick={onOpenSheet}>
          Share
        </button>
        <button className="share-b s" onClick={onCopy}>
          Copy routine
        </button>
      </div>
    </div>
  );
}

export function Result({
  mode,
  bothDone,
  p,
  h,
  s,
  pp,
  ph,
  ps,
  onOpenSheet,
  onCopy,
}: {
  mode: Mode | null;
  bothDone: boolean;
  p: Routine;
  h: string;
  s: string;
  pp: Routine | null;
  ph: string;
  ps: string;
  onOpenSheet: () => void;
  onCopy: () => void;
}) {
  const [tab, setTab] = useState<'panelYou' | 'panelPartner' | 'panelTogether'>('panelYou');

  if (mode === 'couple' && bothDone && pp) {
    return (
      <>
        <MatchBanner h1={h} h2={ph} subtitle="AI routine — unlocked" />
        <div className="tabs">
          <button className={'tab' + (tab === 'panelYou' ? ' active' : '')} onClick={() => setTab('panelYou')}>
            You
          </button>
          <button className={'tab' + (tab === 'panelPartner' ? ' active' : '')} onClick={() => setTab('panelPartner')}>
            Partner
          </button>
          <button className={'tab' + (tab === 'panelTogether' ? ' active' : '')} onClick={() => setTab('panelTogether')}>
            Together
          </button>
        </div>

        <div className={'panel' + (tab === 'panelYou' ? ' active' : '')} id="panelYou">
          <ProfileCard h={h} s={s} p={p} />
          <SectionHead label="Morning" />
          <StepList steps={p.morning || []} prefix="ym" />
          <SectionHead label="Evening" />
          <StepList steps={p.evening || []} prefix="ye" />
          <AvoidBlock items={p.avoid || []} />
        </div>

        <div className={'panel' + (tab === 'panelPartner' ? ' active' : '')} id="panelPartner">
          <ProfileCard h={ph} s={ps} p={pp} />
          <SectionHead label="Morning" />
          <StepList steps={pp.morning || []} prefix="pm" />
          <SectionHead label="Evening" />
          <StepList steps={pp.evening || []} prefix="pe" />
          <AvoidBlock items={pp.avoid || []} />
        </div>

        <div className={'panel' + (tab === 'panelTogether' ? ' active' : '')} id="panelTogether">
          <SectionHead label="Shared habits" />
          <SharedCard
            icon={box(30, 9, '#fdf3e0', IC.spf(16))}
            title="Morning SPF — both, always"
            desc="Same habit, different products."
            diff={
              <>
                <b>You:</b> {p.spf} · <b>Partner:</b> {pp.spf}
              </>
            }
          />
          <SharedCard
            icon={box(30, 9, '#e8ecfa', IC.sleep(16))}
            title="Sleep before midnight"
            desc="Cortisol hits both skin types — same fix, different reasons."
          />
          <SharedCard
            icon={box(30, 9, '#e6f0fa', IC.water(16))}
            title="2L water daily"
            desc="Dehydration affects both heritages the same way."
          />
          <SectionHead label="Heritage insights" />
          <div className="hcard">
            <div className="hcard-ic">
              <Raw html={IC.globe(21)} />
            </div>
            <div>
              <div className="hcard-t">{h}</div>
              <div className="hcard-s">{p.heritage_insight}</div>
            </div>
          </div>
          <div style={{ height: '8px' }}></div>
          <div className="hcard">
            <div className="hcard-ic">
              <Raw html={IC.globe(21)} />
            </div>
            <div>
              <div className="hcard-t">{ph}</div>
              <div className="hcard-s">{pp.heritage_insight}</div>
            </div>
          </div>
        </div>

        <ShareBlock mode={mode} onOpenSheet={onOpenSheet} onCopy={onCopy} />
      </>
    );
  }

  return (
    <>
      <div className="hcard">
        <div className="hcard-ic">
          <Raw html={IC.globe(21)} />
        </div>
        <div>
          <div className="hcard-t">{`${h} Heritage`}</div>
          <div className="hcard-s">{p.heritage_insight}</div>
        </div>
      </div>

      <div className="tiles">
        <div className="tile">
          <div className="tile-l">Key ingredient</div>
          <div className="tile-v" style={{ fontSize: '11.5px' }}>
            {p.key_ingredient}
          </div>
        </div>
        <div className="tile">
          <div className="tile-l">SPF</div>
          <div className="tile-v">{p.spf}</div>
          <div className="tile-n">Matched to your melanin</div>
        </div>
      </div>

      <SectionHead label="Morning" />
      <StepList steps={p.morning || []} prefix="m" />
      <SectionHead label="Evening" />
      <StepList steps={p.evening || []} prefix="e" />
      <AvoidBlock items={p.avoid || []} />
      <LifeBlock items={p.lifestyle || []} />
      <div className="done">
        <div className="done-ic">
          <Raw html={IC.check(16, '#2a8050')} />
        </div>
        <div className="done-t">Routine unlocked</div>
        <div className="done-s">Tap any step to see why it works for your heritage</div>
      </div>
      <ShareBlock mode={mode} onOpenSheet={onOpenSheet} onCopy={onCopy} />
    </>
  );
}
