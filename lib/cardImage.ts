/* Draws the share card onto a canvas and hands back a PNG.
 *
 * Not a screenshot of the DOM node: rendering HTML to an image needs
 * html2canvas or similar, and the working agreement is to ask before adding a
 * dependency. A canvas draws the same card from the same data in about a
 * hundred lines, at whatever resolution a feed wants rather than at whatever
 * resolution the phone happens to be.
 *
 * 1080x1350 is 4:5 — the tallest ratio that is not cropped by Instagram, and
 * accepted as a photo post everywhere else.
 */

export type CardData = {
  kind: 'couple' | 'solo';
  /** Couple only: drives the bar. */
  pct?: number;
  headline: { pre: string; accent: string; post: string };
  factors: { label: string; shared: boolean }[];
  footer: string;
};

const W = 1080;
const H = 1350;
const PAD = 60; // page margin around the card
const IN = 72; // padding inside the card

const PLUM = '#7a1d4a';
const TINT = '#f7eef3';
const INK = '#111111';
const MUTED = '#8b7f85';
const SUBTLE = '#a09298';
const RULE = '#eae5e8';
const DOT_OFF = '#ddd7da';

const font = (weight: number, size: number) => `${weight} ${size}px Inter, sans-serif`;

/** ctx.letterSpacing is not in every engine; fall back to normal spacing. */
function withTracking(ctx: CanvasRenderingContext2D, px: number, draw: () => void) {
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  const had = 'letterSpacing' in c;
  if (had) c.letterSpacing = `${px}px`;
  draw();
  if (had) c.letterSpacing = '0px';
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Wraps into lines, keeping track of which run each word came from so the
 *  accent word stays plum even when it lands mid-line. */
type Run = { text: string; color: string };
function layout(ctx: CanvasRenderingContext2D, runs: Run[], maxW: number): Run[][] {
  const words: Run[] = [];
  for (const r of runs) {
    for (const w of r.text.split(' ').filter(Boolean)) {
      /* Punctuation is glued to the word before it. Without this the DOM shows
         "Niacinamide 5-10%." and the PNG shows "Niacinamide 5-10% ." — the two
         renderings of the same card disagreeing over a space. */
      if (/^[.,!?;:]+$/.test(w) && words.length) words[words.length - 1].text += w;
      else words.push({ text: w, color: r.color });
    }
  }
  const lines: Run[][] = [];
  let line: Run[] = [];
  for (const w of words) {
    const test = [...line, w].map((x) => x.text).join(' ');
    if (line.length && ctx.measureText(test).width > maxW) {
      lines.push(line);
      line = [w];
    } else {
      line.push(w);
    }
  }
  if (line.length) lines.push(line);
  return lines;
}

function drawLines(ctx: CanvasRenderingContext2D, lines: Run[][], x: number, y: number, lh: number): number {
  const space = ctx.measureText(' ').width;
  for (const line of lines) {
    let cx = x;
    for (const w of line) {
      ctx.fillStyle = w.color;
      ctx.fillText(w.text, cx, y);
      cx += ctx.measureText(w.text).width + space;
    }
    y += lh;
  }
  return y;
}

export async function renderCardImage(data: CardData): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  /* Inter is self-hosted, so it is available — but only once the browser has
     actually loaded it. Drawing before that silently falls back to a system
     font and the image ships in the wrong typeface. */
  try {
    await document.fonts.ready;
  } catch {
    /* older engines: draw anyway */
  }

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = TINT;
  ctx.fillRect(0, 0, W, H);

  const cardX = PAD;
  const cardY = PAD;
  const cardW = W - PAD * 2;
  const cardH = H - PAD * 2;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, cardX, cardY, cardW, cardH, 56);
  ctx.fill();

  const left = cardX + IN;
  const right = cardX + cardW - IN;
  const innerW = right - left;
  let y = cardY + IN + 30;

  // Wordmark
  ctx.font = font(800, 26);
  ctx.fillStyle = SUBTLE;
  withTracking(ctx, 7, () => ctx.fillText('RŌZU', left, y));
  y += 78;

  // Headline
  ctx.font = font(800, 68);
  const lines = layout(
    ctx,
    [
      { text: data.headline.pre, color: INK },
      { text: data.headline.accent, color: PLUM },
      { text: data.headline.post, color: INK },
    ],
    innerW,
  );
  y = drawLines(ctx, lines, left, y, 84);
  y += 34;

  // Bar, couple only — it compares two people, and there is nothing to
  // compare on a solo routine.
  if (data.kind === 'couple' && typeof data.pct === 'number') {
    const barH = 24;
    ctx.fillStyle = '#f0ecee';
    roundRect(ctx, left, y, innerW, barH, barH / 2);
    ctx.fill();
    const fill = Math.max(0.04, Math.min(1, data.pct / 100)) * innerW;
    ctx.fillStyle = PLUM;
    roundRect(ctx, left, y, fill, barH, barH / 2);
    ctx.fill();
    y += barH + 34;

    ctx.font = font(700, 24);
    withTracking(ctx, 3.4, () => {
      ctx.fillStyle = data.pct! >= 50 ? PLUM : SUBTLE;
      ctx.fillText('SHARED', left, y);
      ctx.fillStyle = data.pct! < 50 ? PLUM : SUBTLE;
      const label = 'INDIVIDUAL';
      ctx.fillText(label, right - ctx.measureText(label).width, y);
    });
    y += 40;
  }

  /* Measure the list first, then centre the whole middle block between the
     headline and the footer. Drawing it top-aligned left a hole in the middle
     of the solo card, which has fewer lines than the couple one. */
  const LINE = 48;
  const GAP = 26;
  const wrappedAll = data.factors.map((f) => {
    ctx.font = font(f.shared ? 700 : 600, 38);
    return layout(ctx, [{ text: f.label, color: f.shared ? INK : SUBTLE }], innerW - 42);
  });
  const listH = wrappedAll.reduce((h, w) => h + w.length * LINE + GAP, 0) - GAP;
  const blockH = listH + 54 * 2 + 4; // two rules and their spacing

  const footTop = cardY + cardH - IN - 20 - 56;
  const room = footTop - y;
  if (room > blockH) y += (room - blockH) / 2;

  ctx.fillStyle = RULE;
  ctx.fillRect(left, y, innerW, 2);
  y += 54;

  for (let i = 0; i < data.factors.length; i++) {
    const f = data.factors[i];
    ctx.beginPath();
    ctx.arc(left + 10, y - 12, 10, 0, Math.PI * 2);
    ctx.fillStyle = f.shared ? PLUM : DOT_OFF;
    ctx.fill();

    ctx.font = font(f.shared ? 700 : 600, 38);
    y = drawLines(ctx, wrappedAll[i], left + 42, y, LINE);
    y += GAP;
  }

  y = cardY + cardH - IN - 20;
  ctx.fillStyle = RULE;
  ctx.fillRect(left, y - 56, innerW, 2);

  ctx.font = font(700, 28);
  ctx.fillStyle = MUTED;
  ctx.fillText(data.footer, left, y);

  ctx.font = font(800, 24);
  ctx.fillStyle = SUBTLE;
  withTracking(ctx, 7, () => {
    const m = 'RŌZU';
    ctx.fillText(m, right - ctx.measureText(m).width - 7, y);
  });

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

/**
 * Hands the PNG to the OS share sheet where that exists, and falls back to a
 * download. In-app browsers are the primary traffic and their support for
 * sharing files is uneven, so the fallback is not an edge case.
 */
export async function saveCardImage(data: CardData, filename: string): Promise<'shared' | 'downloaded' | 'failed'> {
  let blob: Blob | null = null;
  try {
    blob = await renderCardImage(data);
  } catch {
    return 'failed';
  }
  if (!blob) return 'failed';

  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return 'shared';
    } catch {
      // A cancelled share sheet is not a failure; fall through to download.
    }
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}
