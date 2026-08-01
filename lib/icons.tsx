/* ══════════════════════════════════════
   ICON LIBRARY — all SVG, no emoji
   Each returns a plain HTML string.
   Ported unchanged from rozu-v7.html.
   ══════════════════════════════════════ */
import type { ReactElement } from 'react';

export const P = '#7a1d4a';

function sv(size: number, inner: string, fill?: string): string {
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="' + (fill || 'none') + '" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';
}

// Wrap an svg in a colored rounded square
export function box(size: number, radius: number, bg: string, svgStr: string): string {
  return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:' + radius + 'px;background:' + bg + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + svgStr + '</div>';
}

export const IC = {
  heart: function (s: number, c?: string) {
    return sv(s, '<path d="M12 20.5C12 20.5 3 14.2 3 8.2C3 5.3 5.3 3 8.2 3C10 3 11.4 3.9 12 5C12.6 3.9 14 3 15.8 3C18.7 3 21 5.3 21 8.2C21 14.2 12 20.5 12 20.5Z"/>', c || P);
  },
  hearts: function (s: number, c?: string) {
    return sv(s,
      '<path d="M9 18C9 18 1.5 12.5 1.5 7.5C1.5 5 3.5 3 6 3C7.5 3 8.7 3.8 9.2 4.7C9.7 3.8 10.9 3 12.4 3C14.9 3 16.9 5 16.9 7.5C16.9 12.5 9 18 9 18Z" opacity="0.45"/>' +
      '<path d="M15.5 21C15.5 21 7.5 15.2 7.5 10C7.5 7.4 9.6 5.3 12.2 5.3C13.8 5.3 15 6.1 15.5 7C16 6.1 17.2 5.3 18.8 5.3C21.4 5.3 23.5 7.4 23.5 10C23.5 15.2 15.5 21 15.5 21Z"/>',
      c || P);
  },
  gift: function (s: number, c?: string) {
    return sv(s,
      '<rect x="3.5" y="10.5" width="17" height="10.5" rx="2" opacity="0.9"/>' +
      '<rect x="2" y="6.5" width="20" height="5" rx="1.5" opacity="0.55"/>' +
      '<rect x="10.6" y="6.5" width="2.8" height="14.5" fill="#fff" opacity="0.55"/>' +
      '<path d="M12 6.5C12 6.5 8.5 6 8.5 4C8.5 2.9 9.4 2 10.5 2C11.7 2 12 4.5 12 6.5Z"/>' +
      '<path d="M12 6.5C12 6.5 15.5 6 15.5 4C15.5 2.9 14.6 2 13.5 2C12.3 2 12 4.5 12 6.5Z" opacity="0.6"/>',
      c || P);
  },
  woman: function (s: number, c?: string) {
    return sv(s,
      '<circle cx="12" cy="8.5" r="5.5" fill="none" stroke="' + (c || P) + '" stroke-width="2"/>' +
      '<path d="M12 14v6.5M9 18h6" stroke="' + (c || P) + '" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="12" cy="8.5" r="2.5" fill="' + (c || P) + '" opacity="0.35"/>');
  },
  man: function (s: number, c?: string) {
    return sv(s,
      '<circle cx="10" cy="13.5" r="5.5" fill="none" stroke="' + (c || P) + '" stroke-width="2"/>' +
      '<path d="M14.2 9.3L20 3.5M15.5 3.5H20V8" stroke="' + (c || P) + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="10" cy="13.5" r="2.5" fill="' + (c || P) + '" opacity="0.35"/>');
  },
  nonbinary: function (s: number, c?: string) {
    return sv(s,
      '<circle cx="12" cy="14" r="5.5" fill="none" stroke="' + (c || P) + '" stroke-width="2"/>' +
      '<path d="M12 8.5V2M9 4.5L12 2l3 2.5" stroke="' + (c || P) + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="12" cy="14" r="2.5" fill="' + (c || P) + '" opacity="0.35"/>');
  },
  globe: function (s: number, c?: string) {
    return sv(s,
      '<circle cx="12" cy="12" r="9" fill="none" stroke="' + (c || P) + '" stroke-width="1.8"/>' +
      '<ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="' + (c || P) + '" stroke-width="1.4"/>' +
      '<path d="M3.5 9h17M3.5 15h17" stroke="' + (c || P) + '" stroke-width="1.4" opacity="0.6"/>');
  },
  check: function (s: number, c?: string) {
    return sv(s, '<path d="M4 12.5L9 17.5L20 6.5" stroke="' + (c || '#fff') + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>');
  },
  chevron: function (s: number, c?: string) {
    return sv(s, '<path d="M6 9l6 6 6-6" stroke="' + (c || '#c8bfc4') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>');
  },
  x: function (s: number, c?: string) {
    return sv(s, '<path d="M6 6l12 12M18 6L6 18" stroke="' + (c || '#d84060') + '" stroke-width="2.4" stroke-linecap="round"/>');
  },
  lock: function (s: number, c?: string) {
    return sv(s,
      '<rect x="5" y="11" width="14" height="10" rx="2.5"/>' +
      '<path d="M8 11V7.5a4 4 0 018 0V11" fill="none" stroke="' + (c || '#fff') + '" stroke-width="2" stroke-linecap="round"/>',
      c || '#fff');
  },
  chat: function (s: number, c?: string) {
    return sv(s, '<path d="M20.5 11.5c0 4.4-3.8 8-8.5 8-1.3 0-2.6-.3-3.7-.8L3.5 20l1.4-4.2c-.9-1.2-1.4-2.7-1.4-4.3 0-4.4 3.8-8 8.5-8s8.5 3.6 8.5 8z"/>', c || P);
  },
  mail: function (s: number, c?: string) {
    return sv(s, '<rect x="2.5" y="5" width="19" height="14" rx="2.5" opacity="0.9"/><path d="M3.5 7l8.5 6 8.5-6" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>', c || P);
  },
  arrowRight: function (s: number, c?: string) {
    return sv(s, '<path d="M5 12h14M13 6l6 6-6 6" stroke="' + (c || P) + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>');
  },
  // ── SKIN TYPES (colored) ──
  drySkin: function (s: number) {
    return sv(s, '<path d="M12 3.5C9 8 6.5 11 6.5 14.5A5.5 5.5 0 0017.5 14.5C17.5 11 15 8 12 3.5Z" fill="#7aa8d8" opacity="0.45"/><path d="M9.8 13.5L12 16l2.2-3" stroke="#4a80b8" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>');
  },
  oilySkin: function (s: number) {
    return sv(s, '<path d="M12 3C9 8 6.5 11 6.5 14.5A5.5 5.5 0 0017.5 14.5C17.5 11 15 8 12 3Z" fill="#e8a838" opacity="0.55"/><ellipse cx="10" cy="14" rx="1.8" ry="2.4" fill="#fff" opacity="0.6"/>');
  },
  comboSkin: function (s: number) {
    return sv(s, '<path d="M12 3C9 8 6.5 11 6.5 14.5A5.5 5.5 0 0012 20V3Z" fill="#e8a838" opacity="0.55"/><path d="M12 3C15 8 17.5 11 17.5 14.5A5.5 5.5 0 0112 20V3Z" fill="#7aa8d8" opacity="0.5"/>');
  },
  normalSkin: function (s: number) {
    return sv(s, '<circle cx="12" cy="12" r="8" fill="#5cb885" opacity="0.35"/><circle cx="9.3" cy="10.3" r="1.3" fill="#2a8050"/><circle cx="14.7" cy="10.3" r="1.3" fill="#2a8050"/><path d="M9 14c.8 1.5 1.8 2.2 3 2.2s2.2-.7 3-2.2" stroke="#2a8050" stroke-width="1.7" fill="none" stroke-linecap="round"/>');
  },
  sensitiveSkin: function (s: number) {
    return sv(s, '<path d="M12 3C9 8 6.5 11 6.5 14.5A5.5 5.5 0 0017.5 14.5C17.5 11 15 8 12 3Z" fill="#e87a95" opacity="0.45"/><path d="M12 9.5v3.5" stroke="#d84060" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="15.8" r="1.2" fill="#d84060"/>');
  },
  // ── CONCERNS (colored) ──
  acne: function (s: number) {
    return sv(s, '<circle cx="12" cy="12" r="9" fill="#ffe0e5"/><circle cx="9" cy="10" r="2.3" fill="#e8506a"/><circle cx="15" cy="9.5" r="1.7" fill="#e8506a" opacity="0.7"/><circle cx="13.5" cy="15" r="2.6" fill="#e8506a" opacity="0.85"/><circle cx="8.5" cy="15.5" r="1.5" fill="#e8506a" opacity="0.6"/>');
  },
  darkspot: function (s: number) {
    return sv(s, '<circle cx="12" cy="12" r="9" fill="#f5e6d5"/><ellipse cx="10" cy="10.5" rx="3.2" ry="2.4" fill="#a06840" opacity="0.75"/><ellipse cx="15" cy="14.5" rx="2.3" ry="1.7" fill="#a06840" opacity="0.5"/>');
  },
  redness: function (s: number) {
    return sv(s, '<circle cx="12" cy="12" r="9" fill="#ffe8ec"/><ellipse cx="8.5" cy="13" rx="3.6" ry="2.8" fill="#f08098" opacity="0.7"/><ellipse cx="15.5" cy="13" rx="3.6" ry="2.8" fill="#f08098" opacity="0.7"/>');
  },
  dryness: function (s: number) {
    return sv(s, '<circle cx="12" cy="12" r="9" fill="#e0eefa"/><path d="M12 6.5C10 9.5 8.5 11.5 8.5 13.5A3.5 3.5 0 0015.5 13.5C15.5 11.5 14 9.5 12 6.5Z" fill="#6a9fd0" opacity="0.55"/><path d="M10.5 13.5L12 15l1.5-1.5" stroke="#4a80b8" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>');
  },
  puffiness: function (s: number) {
    return sv(s, '<circle cx="12" cy="12" r="9" fill="#e8ecfa"/><ellipse cx="12" cy="14" rx="6.5" ry="4.2" fill="#8095d8" opacity="0.45"/><ellipse cx="12" cy="11.5" rx="4.5" ry="3" fill="#8095d8" opacity="0.55"/>');
  },
  dullness: function (s: number) {
    return sv(s, '<circle cx="12" cy="12" r="9" fill="#f7f5e8"/><circle cx="12" cy="12" r="4" fill="#c8b850" opacity="0.55"/><path d="M12 5.5v1.5M12 17v1.5M5.5 12H7M17 12h1.5M7.5 7.5l1 1M15.5 15.5l1 1M16.5 7.5l-1 1M8.5 15.5l-1 1" stroke="#c8b850" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>');
  },
  aging: function (s: number) {
    return sv(s, '<circle cx="12" cy="12" r="9" fill="#f7ecf2"/><path d="M7 9.5C8.4 8.5 10.2 10.3 12 9.5C13.8 8.7 15.6 10.3 17 9.5" stroke="#b06888" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M7 13C8.4 12 10.2 13.8 12 13C13.8 12.2 15.6 13.8 17 13" stroke="#b06888" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.65"/><path d="M8 16.5C9.2 15.7 10.8 17 12 16.5C13.2 16 14.8 17 16 16.5" stroke="#b06888" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.4"/>');
  },
  bodyacne: function (s: number) {
    return sv(s, '<circle cx="12" cy="12" r="9" fill="#ffe8ec"/><path d="M12 5.5C10 5.5 8.5 7 8.5 9V16C8.5 17.5 9.8 18.5 12 18.5C14.2 18.5 15.5 17.5 15.5 16V9C15.5 7 14 5.5 12 5.5Z" fill="#e8506a" opacity="0.2"/><circle cx="10.5" cy="9.5" r="1.4" fill="#e8506a" opacity="0.75"/><circle cx="13.5" cy="12" r="1.4" fill="#e8506a" opacity="0.65"/><circle cx="11" cy="14.5" r="1.4" fill="#e8506a" opacity="0.6"/>');
  },
  // ── ROUTINE LEVELS ──
  levelNone: function (s: number) {
    return sv(s, '<circle cx="12" cy="12" r="8.5" fill="none" stroke="#b8b0b4" stroke-width="1.8"/><path d="M8.5 12h7" stroke="#b8b0b4" stroke-width="2" stroke-linecap="round"/>');
  },
  levelBasic: function (s: number) {
    return sv(s, '<rect x="8" y="8" width="8" height="12" rx="2" fill="#6a9fd0" opacity="0.5"/><rect x="9.8" y="4.5" width="4.4" height="4" rx="1.2" fill="#6a9fd0" opacity="0.75"/>');
  },
  levelMod: function (s: number) {
    return sv(s, '<rect x="4.5" y="13" width="4" height="6.5" rx="1.4" fill="#5cb885" opacity="0.5"/><rect x="10" y="9.5" width="4" height="10" rx="1.4" fill="#5cb885" opacity="0.7"/><rect x="15.5" y="6" width="4" height="13.5" rx="1.4" fill="#5cb885" opacity="0.9"/>');
  },
  levelAdv: function (s: number) {
    return sv(s, '<circle cx="12" cy="12" r="8.5" fill="#7a1d4a" opacity="0.14"/><path d="M8 12.5L10.8 15.3L16.2 9.2" stroke="#7a1d4a" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>');
  },
  // ── ROUTINE STEPS (colored) ──
  cleanser: function (s: number) {
    return sv(s, '<path d="M8.5 3.5h7v2.5h-7z" fill="#4a90c8"/><path d="M6.5 6h11v12.5a2.5 2.5 0 01-2.5 2.5H9a2.5 2.5 0 01-2.5-2.5V6z" fill="#4a90c8" opacity="0.35"/><path d="M6.5 6h11v3.5h-11z" fill="#4a90c8" opacity="0.6"/><path d="M10 13c.5 1.4 1.1 2 2 2s1.5-.6 2-2" stroke="#3878b0" stroke-width="1.5" fill="none" stroke-linecap="round"/>');
  },
  doubleCleanse: function (s: number) {
    return sv(s, '<path d="M8.5 4C6.8 7 5.5 9 5.5 11.2A3.5 3.5 0 0012.5 11.2C12.5 9 11.2 7 9.5 4Z" fill="#4a90c8" opacity="0.45" transform="translate(-1,0)"/><path d="M15 8C13.5 10.6 12.5 12 12.5 14A3 3 0 0018.5 14C18.5 12 17.5 10.6 16 8Z" fill="#4a90c8" opacity="0.8"/>');
  },
  serum: function (s: number) {
    return sv(s, '<path d="M10 3h4v5.2l3.6 7.6A2 2 0 0115.8 19H8.2a2 2 0 01-1.8-3.2L10 8.2V3z" fill="#8858c8" opacity="0.3"/><path d="M10 3h4v5.2l3.6 7.6A2 2 0 0115.8 19H8.2a2 2 0 01-1.8-3.2L10 8.2V3z" fill="none" stroke="#7040b8" stroke-width="1.6" stroke-linejoin="round"/><path d="M9.5 3h5" stroke="#7040b8" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="14.5" r="2" fill="#7040b8" opacity="0.7"/>');
  },
  moisturiser: function (s: number) {
    return sv(s, '<rect x="5.5" y="9.5" width="13" height="11" rx="2.5" fill="#5cb885" opacity="0.4"/><rect x="7.5" y="5.5" width="9" height="4.5" rx="1.5" fill="#5cb885" opacity="0.65"/><path d="M9.8 15c.7 1.2 1.4 1.8 2.2 1.8s1.5-.6 2.2-1.8" stroke="#2a8050" stroke-width="1.5" fill="none" stroke-linecap="round"/>');
  },
  spf: function (s: number) {
    return sv(s, '<circle cx="12" cy="12" r="4.5" fill="#e8b028"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.5 5.5l2 2M16.5 16.5l2 2M18.5 5.5l-2 2M5.5 18.5l2-2" stroke="#e8b028" stroke-width="2" stroke-linecap="round"/>');
  },
  treatment: function (s: number) {
    return sv(s, '<path d="M12 2.5l2.5 7h7.3l-5.9 4.3 2.3 7.2L12 16.6l-6.2 4.4 2.3-7.2L2.2 9.5h7.3z" fill="#7a1d4a" opacity="0.85"/>');
  },
  nightcream: function (s: number) {
    return sv(s, '<path d="M20.5 13A8.5 8.5 0 1111 3.5 6.5 6.5 0 0020.5 13z" fill="#4858b8" opacity="0.8"/><circle cx="16" cy="7" r="0.9" fill="#4858b8" opacity="0.5"/><circle cx="13.5" cy="5.5" r="0.7" fill="#4858b8" opacity="0.4"/>');
  },
  oil: function (s: number) {
    return sv(s, '<path d="M12 3.5C9.5 7.5 7.5 10.5 7.5 13.5A4.5 4.5 0 0016.5 13.5C16.5 10.5 14.5 7.5 12 3.5Z" fill="#d89828" opacity="0.6"/><ellipse cx="10.3" cy="13.5" rx="1.4" ry="2" fill="#fff" opacity="0.5"/>');
  },
  // ── LIFESTYLE ──
  sleep: function (s: number) {
    return sv(s, '<path d="M20.5 13A8.5 8.5 0 1111 3.5 6.5 6.5 0 0020.5 13z" fill="#4858b8" opacity="0.8"/>');
  },
  stress: function (s: number) {
    return sv(s, '<path d="M12 3C9.5 7 8 9.5 8 12a4 4 0 008 0c0-2.5-1.5-5-4-9z" fill="#4a9868" opacity="0.5"/><path d="M12 3c-1 3-1.8 5.8-1.8 9a1.8 1.8 0 003.6 0c0-3.2-.8-6-1.8-9z" fill="#2a8050" opacity="0.8"/>');
  },
  water: function (s: number) {
    return sv(s, '<path d="M12 3.5C9 8 6.5 11.5 6.5 14.5A5.5 5.5 0 0017.5 14.5C17.5 11.5 15 8 12 3.5Z" fill="#4a90c8" opacity="0.7"/><ellipse cx="10" cy="14.5" rx="1.3" ry="1.9" fill="#fff" opacity="0.45"/>');
  },
  diet: function (s: number) {
    return sv(s, '<circle cx="12" cy="13.5" r="6" fill="#e8a838" opacity="0.45"/><path d="M12 4.5C10.3 7.3 9.5 9.8 9.5 12a2.5 2.5 0 005 0c0-2.2-.8-4.7-2.5-7.5z" fill="#c88818" opacity="0.8"/>');
  },
};

/* Keyword routers — ported unchanged. */
export function stepIcon(title: string): string {
  const t = (title || '').toLowerCase();
  if (t.indexOf('double') > -1) return box(40, 13, '#e6f0fa', IC.doubleCleanse(21));
  if (t.indexOf('clean') > -1 || t.indexOf('wash') > -1) return box(40, 13, '#e6f0fa', IC.cleanser(21));
  if (t.indexOf('spf') > -1 || t.indexOf('sunscreen') > -1 || t.indexOf('sun') > -1) return box(40, 13, '#fdf3e0', IC.spf(21));
  if (t.indexOf('niacin') > -1 || t.indexOf('vitamin') > -1 || t.indexOf('serum') > -1 || t.indexOf('ceramide serum') > -1) return box(40, 13, '#f2ebfc', IC.serum(21));
  if (t.indexOf('treatment') > -1 || t.indexOf('active') > -1 || t.indexOf('retinol') > -1 || t.indexOf('acid') > -1) return box(40, 13, '#f7eef3', IC.treatment(21));
  if (t.indexOf('mask') > -1 || t.indexOf('night') > -1 || t.indexOf('sleeping') > -1) return box(40, 13, '#e8ecfa', IC.nightcream(21));
  if (t.indexOf('moistur') > -1 || t.indexOf('cream') > -1 || t.indexOf('lotion') > -1) return box(40, 13, '#e8f7ee', IC.moisturiser(21));
  if (t.indexOf('oil') > -1) return box(40, 13, '#fdf3e0', IC.oil(21));
  return box(40, 13, '#f7eef3', IC.serum(21));
}

export function lifeIcon(text: string): string {
  const t = (text || '').toLowerCase();
  if (t.indexOf('sleep') > -1 || t.indexOf('midnight') > -1 || t.indexOf('1am') > -1) return box(30, 9, '#e8ecfa', IC.sleep(16));
  if (t.indexOf('stress') > -1 || t.indexOf('cortisol') > -1 || t.indexOf('breath') > -1) return box(30, 9, '#e8f7ee', IC.stress(16));
  if (t.indexOf('water') > -1 || t.indexOf('hydrat') > -1) return box(30, 9, '#e6f0fa', IC.water(16));
  if (t.indexOf('dairy') > -1 || t.indexOf('sugar') > -1 || t.indexOf('diet') > -1 || t.indexOf('food') > -1) return box(30, 9, '#fdf3e0', IC.diet(16));
  return box(30, 9, '#f7eef3', IC.treatment(16));
}

/* ══════════════════════════════════════
   RENDER HELPER
   IC/box return HTML strings, so React needs an insertion point. `display:
   contents` removes this span from the box tree entirely, which means the
   icon element itself is the flex/grid child — identical layout to the
   prototype's innerHTML assignment, no extra wrapper in the cascade.
   ══════════════════════════════════════ */
export function Raw({ html }: { html: string }): ReactElement {
  return <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} />;
}
