/* routineText / shortText — ported unchanged from rozu-v7.html.
   The prototype read these off window globals; here the state is passed in. */
import type { Mode } from './quiz';
import type { Routine } from './types';

export type ShareState = {
  mode: Mode | null;
  p: Routine | null;
  h: string;
  s: string;
  pp: Routine | null;
  ph: string;
  ps: string;
};

export function routineText(st: ShareState): string {
  const p = st.p;
  if (!p) return '';
  const L: string[] = [];
  L.push('RŌZU — my heritage skincare routine');
  L.push('');
  L.push(st.h + ' · ' + st.s + ' skin');
  L.push(p.spf + ' · Key ingredient: ' + p.key_ingredient);
  L.push('');
  L.push('MORNING');
  for (let i = 0; i < (p.morning || []).length; i++) {
    L.push('  ' + (i + 1) + '. ' + p.morning[i].title + ' — ' + p.morning[i].desc);
  }
  L.push('');
  L.push('EVENING');
  for (let j = 0; j < (p.evening || []).length; j++) {
    L.push('  ' + (j + 1) + '. ' + p.evening[j].title + ' — ' + p.evening[j].desc);
  }
  L.push('');
  L.push('AVOID');
  for (let k = 0; k < (p.avoid || []).length; k++) L.push('  × ' + p.avoid[k]);

  if (st.mode === 'couple' && st.pp) {
    const pp = st.pp;
    L.push('');
    L.push('— — —');
    L.push('');
    L.push('PARTNER: ' + st.ph + ' · ' + st.ps + ' skin');
    L.push(pp.spf + ' · Key ingredient: ' + pp.key_ingredient);
    L.push('');
    L.push('MORNING');
    for (let m = 0; m < (pp.morning || []).length; m++) {
      L.push('  ' + (m + 1) + '. ' + pp.morning[m].title + ' — ' + pp.morning[m].desc);
    }
    L.push('');
    L.push('EVENING');
    for (let n = 0; n < (pp.evening || []).length; n++) {
      L.push('  ' + (n + 1) + '. ' + pp.evening[n].title + ' — ' + pp.evening[n].desc);
    }
    L.push('');
    L.push('SHARED: morning SPF · sleep before midnight · 2L water');
    L.push('Compatibility: 87%');
  }

  L.push('');
  L.push('Built with heritage in mind — rozu.app');
  return L.join('\n');
}

export function shortText(st: ShareState): string {
  if (st.mode === 'couple' && st.ph) {
    return 'We got our couple skincare routine from RŌZU — ' + st.h + ' × ' + st.ph + ', 87% compatible. rozu.app';
  }
  return 'I got my ' + st.h + ' heritage skincare routine from RŌZU. rozu.app';
}
