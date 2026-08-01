'use client';

import { IC, Raw } from '@/lib/icons';

export function Toast({ show, msg, ok }: { show: boolean; msg: string; ok: boolean }) {
  return (
    <div className={'toast' + (show ? ' show' : '')} id="toast">
      <span id="toastIc">
        <Raw html={ok === false ? IC.x(13, '#ff8095') : IC.check(13, '#6ee7a8')} />
      </span>
      <span id="toastMsg">{msg}</span>
    </div>
  );
}
