'use client';

import { useState } from 'react';
import { IC, Raw, box, lifeIcon, stepIcon } from '@/lib/icons';
import type { Mode } from '@/lib/quiz';
import type { Routine, Step } from '@/lib/types';
import type { CoupleInfo } from './RozuApp';
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

/* One card per lifestyle answer the two of them gave identically. The title
   quotes the answer back rather than asserting a habit — the old card said
   "Sleep before midnight" to couples who had both answered "after 1am". */
const HABIT_IC: Record<'sleep' | 'stress' | 'diet', string> = {
  sleep: IC.sleep(16),
  stress: IC.stress(16),
  diet: IC.diet(16),
};
const HABIT_BG: Record<'sleep' | 'stress' | 'diet', string> = {
  sleep: '#e8ecfa',
  stress: '#f7eef3',
  diet: '#e8f7ee',
};
const HABIT_TITLE: Record<'sleep' | 'stress' | 'diet', (answer: string) => string> = {
  sleep: (a) => `You both sleep: ${a.toLowerCase()}`,
  stress: (a) => `Same stress level: ${a.toLowerCase()}`,
  diet: (a) => `You eat the same way: ${a.toLowerCase()}`,
};
const HABIT_DESC: Record<'sleep' | 'stress' | 'diet', string> = {
  sleep: 'Cortisol is working on both of you. This is the one worth fixing together.',
  stress: 'It shows up differently on each of your skin types — same cause, two effects.',
  diet: 'Whatever you cook, you are both eating it. Change it once, it counts twice.',
};

function SharedCard({
  icon, title, desc, diff, badge = 'Shared',
}: { icon: string; title: string; desc: string; diff?: React.ReactNode; badge?: string }) {
  return (
    <div className="shared">
      <div className="sh-top">
        <Raw html={icon} />
        <span className="sh-t">{title}</span>
        <span className="sh-badge">{badge}</span>
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
  couple,
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
  couple: CoupleInfo | null;
  onOpenSheet: () => void;
  onCopy: () => void;
}) {
  const [tab, setTab] = useState<'panelYou' | 'panelPartner' | 'panelTogether'>('panelYou');

  if (mode === 'couple' && bothDone && pp) {
    return (
      <>
        <MatchBanner h1={h} h2={ph} pct={couple?.match.pct ?? 87} subtitle={couple?.match.reason ?? 'AI routine — unlocked'} />
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
          <SectionHead label="What you actually share" />
          {/* SPF is always shareable as a habit, and the two values come from
              the routines themselves, so this card was already honest. */}
          <SharedCard
            icon={box(30, 9, '#fdf3e0', IC.spf(16))}
            title="Morning SPF — both, always"
            desc={p.spf === pp.spf ? 'Same habit, same level — the easy one to share.' : 'Same habit, different products.'}
            diff={
              <>
                <b>You:</b> {p.spf} · <b>Partner:</b> {pp.spf}
              </>
            }
          />
          {(couple?.facts.concerns ?? []).slice(0, 2).map((c, i) => (
            <SharedCard
              key={c}
              icon={box(30, 9, '#f7eef3', IC.darkspot(22))}
              title={`You both deal with ${c.toLowerCase()}`}
              desc="Different heritage, same target — so you can hold each other to it."
              /* Only on the first: the key ingredients do not change per
                 concern, and repeating the same line reads as a template. */
              diff={
                i === 0 ? (
                  <>
                    <b>You:</b> {p.key_ingredient} · <b>Partner:</b> {pp.key_ingredient}
                  </>
                ) : undefined
              }
            />
          ))}
          {(couple?.facts.habits ?? []).map((hb) => (
            <SharedCard
              key={hb.key}
              icon={box(30, 9, HABIT_BG[hb.key], HABIT_IC[hb.key])}
              title={HABIT_TITLE[hb.key](hb.answer)}
              desc={HABIT_DESC[hb.key]}
            />
          ))}
          {/* Nothing shared at all is a real outcome, not an empty state to
              hide: two people with no overlap still bought a couple plan. */}
          {couple && !couple.facts.concerns.length && !couple.facts.habits.length && (
            <SharedCard
              icon={box(30, 9, '#f4f1f3', IC.hearts(20))}
              title="You share the habit, not the products"
              desc="Nothing in your answers overlaps — different concerns, different routines, different sleep. The one thing you can do together is show up daily."
            />
          )}

          {!couple?.facts.skinSame && couple && (
            <>
              <SectionHead label="Where you differ" />
              <SharedCard
                icon={box(30, 9, '#e6f0fa', IC.drySkin(20))}
                title={`${couple.facts.selfSkin} vs ${couple.facts.partnerSkin}`}
                desc="Do not share a moisturiser. Almost everything else, you can."
                badge="Different"
              />
            </>
          )}

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
