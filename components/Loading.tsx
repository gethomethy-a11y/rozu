'use client';

export function Loading({ active, msg }: { active: boolean; msg: string }) {
  return (
    <div id="loading" className={'load' + (active ? ' active' : '')}>
      <div className="spin"></div>
      <div className="load-t">Building your profile…</div>
      <div className="load-s" id="loadMsg">
        {msg}
      </div>
    </div>
  );
}
