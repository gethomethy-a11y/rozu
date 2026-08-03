'use client';

import { IC, Raw } from '@/lib/icons';

export function MatchBanner({ h1, h2, subtitle, pct }: { h1: string; h2: string; subtitle: string; pct: number }) {
  return (
    <div className="mbanner">
      <div className="mb-ics">
        <div className="mb-ic a">
          <Raw html={IC.heart(20, '#fff')} />
        </div>
        <div className="mb-ic b">
          <Raw html={IC.heart(20, '#ffffffcc')} />
        </div>
      </div>
      <div className="mb-b">
        <div className="mb-t">{`${h1} × ${h2}`}</div>
        <div className="mb-s">{subtitle}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div className="mb-n">{`${pct}%`}</div>
        <div className="mb-l">Match</div>
      </div>
    </div>
  );
}
