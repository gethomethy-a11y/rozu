'use client';

import { IC, Raw } from '@/lib/icons';

export function PartnerTransition({ active, onStart }: { active: boolean; onStart: () => void }) {
  return (
    <div id="ptScreen" className={'screen' + (active ? ' active' : '')}>
      <div className="pt">
        <div className="pt-ics" id="ptIcons">
          <div className="pt-ic done">
            <Raw html={IC.heart(30, '#c8bfc4')} />
          </div>
          <div className="pt-ic next">
            <Raw html={IC.heart(30)} />
          </div>
        </div>
        <div className="pt-badge">Step 2 of 2</div>
        <h2 className="pt-h">
          Your profile is done.
          <br />
          Now your partner&apos;s.
        </h2>
        <p className="pt-s">
          Same questions, their answers. Together you get a routine that works for both heritages.
        </p>
        <div className="pt-prog" id="ptProg">
          <div className="pt-row d">
            <div className="pt-rc">
              <Raw html={IC.check(11, '#fff')} />
            </div>
            Your profile — complete
          </div>
          <div className="pt-row">
            <div className="pt-rc">
              <Raw html={IC.arrowRight(11, '#a09298')} />
            </div>
            Partner&apos;s profile — up next
          </div>
        </div>
        <button className="pt-btn" onClick={onStart}>
          Fill in partner&apos;s profile →
        </button>
      </div>
    </div>
  );
}
