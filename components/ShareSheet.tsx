'use client';

import { EV, track } from '@/lib/analytics';
import { useEffect, useRef, useState } from 'react';
import { IC, Raw, box } from '@/lib/icons';
import type { Mode } from '@/lib/quiz';
import { routineText, shortText, type ShareState } from '@/lib/routineText';
import type { CoupleInfo } from './RozuApp';
import { ShareCard, coupleCard, soloCard } from './ShareCard';

export type ToastFn = (msg: string, ok?: boolean) => void;

/* Copy with three fallbacks: async clipboard -> execCommand -> manual select.
   Ported unchanged from rozu-v7.html. All three layers are load-bearing in
   in-app browsers, where the async clipboard frequently rejects. */
export function makeCopyText(toast: ToastFn, taRef: React.RefObject<HTMLTextAreaElement | null>) {
  return function copyText(str: string, okMsg: string) {
    function manual() {
      const ta = taRef.current;
      if (ta) {
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, str.length);
      }
      toast('Text selected — press copy', false);
    }
    function legacy() {
      try {
        const tmp = document.createElement('textarea');
        tmp.value = str;
        tmp.style.position = 'fixed';
        tmp.style.opacity = '0';
        tmp.style.top = '0';
        document.body.appendChild(tmp);
        tmp.focus();
        tmp.select();
        const ok = document.execCommand && document.execCommand('copy');
        document.body.removeChild(tmp);
        if (ok) {
          toast(okMsg);
          return true;
        }
      } catch (e) {
        /* fall through to manual */
      }
      manual();
      return false;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(str)
        .then(function () {
          toast(okMsg);
        })
        .catch(function () {
          legacy();
        });
    } else {
      legacy();
    }
  };
}

type SheetOpt = {
  id: string;
  bg: string;
  ic: string;
  t: string;
  s: string;
  fn: (markDone: () => void) => void;
};

export function ShareSheet({
  open,
  onClose,
  share,
  toast,
  copyText,
  taRef,
  couple,
  concerns,
}: {
  open: boolean;
  onClose: () => void;
  share: ShareState;
  toast: ToastFn;
  copyText: (str: string, okMsg: string) => void;
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  couple: CoupleInfo | null;
  concerns: string[];
}) {
  const mode: Mode | null = share.mode;
  const [doneIds, setDoneIds] = useState<Record<string, boolean>>({});
  const [hasNativeShare, setHasNativeShare] = useState(false);

  // navigator.share is checked after mount so SSR and hydration agree.
  useEffect(() => {
    setHasNativeShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  useEffect(() => {
    if (open) setDoneIds({});
  }, [open]);

  /* Couple gets the comparison card; solo and gift get the ingredient card.
     Gift is the same shape as solo — one person, one routine — but the copy
     addresses the recipient rather than the buyer. */
  const cardData =
    mode === 'couple' && couple && share.pp
      ? coupleCard(couple.match.pct, share.h, share.ph, couple.facts.factors)
      : share.p
        ? soloCard(share.p, share.h, share.s, concerns, mode === 'gift')
        : null;

  /* The real score and the real shared habits, not the prototype's constants. */
  const shareCouple = couple
    ? { pct: couple.match.pct, sharedLabels: couple.facts.habits.map((h) => h.answer) }
    : null;
  const full = routineText(share, shareCouple);
  const short = shortText(share, shareCouple);

  // Opens a link in a new tab; falls back to copying if the browser blocks it.
  function openExternal(url: string) {
    try {
      const win = window.open(url, '_blank');
      if (!win) throw new Error('blocked');
      toast('Opening…');
    } catch (e) {
      copyText(full, 'Blocked here — routine copied instead');
    }
  }

  function downloadRoutine() {
    try {
      const blob = new Blob([full], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rozu-routine.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
      toast('Downloaded');
    } catch (err) {
      toast('Download blocked here', false);
    }
  }

  const opts: SheetOpt[] = [];

  if (hasNativeShare) {
    opts.push({
      id: 'native',
      bg: '#f7eef3',
      ic: IC.arrowRight(19),
      t: 'Share to an app',
      s: 'Messages, WhatsApp, Instagram…',
      fn: (markDone) => {
        navigator
          .share({ title: 'My RŌZU Routine', text: short, url: 'https://rozu.app' })
          .then(function () {
            markDone();
            toast('Shared');
          })
          .catch(function () {});
      },
    });
  }

  opts.push({
    id: 'full',
    bg: '#e8f7ee',
    ic: IC.check(19, '#2a8050'),
    t: 'Copy full routine',
    s: 'Every step, ready to paste',
    fn: (markDone) => {
      markDone();
      copyText(full, 'Routine copied');
    },
  });

  opts.push({
    id: 'short',
    bg: '#e6f0fa',
    ic: IC.hearts(19, '#4a90c8'),
    t: 'Copy short caption',
    s: 'One line for a story or post',
    fn: (markDone) => {
      markDone();
      copyText(short, 'Caption copied');
    },
  });

  opts.push({
    id: 'whatsapp',
    bg: '#e6f7ec',
    ic: IC.chat(19, '#25a35a'),
    t: 'Send on WhatsApp',
    s: 'Opens a new message',
    fn: (markDone) => {
      markDone();
      openExternal('https://wa.me/?text=' + encodeURIComponent(short + '\n\n' + full));
    },
  });

  opts.push({
    id: 'email',
    bg: '#e6f0fa',
    ic: IC.mail(19, '#4a90c8'),
    t: 'Send by email',
    s: 'Opens your mail app',
    fn: (markDone) => {
      markDone();
      const subj = mode === 'couple' ? 'Our RŌZU skincare routines' : 'My RŌZU skincare routine';
      openExternal('mailto:?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(full));
    },
  });

  opts.push({
    id: 'link',
    bg: '#fdf3e0',
    ic: IC.globe(19, '#c88818'),
    t: 'Copy link',
    s: 'rozu.app',
    fn: (markDone) => {
      markDone();
      copyText('https://rozu.app', 'Link copied');
    },
  });

  opts.push({
    id: 'file',
    bg: '#f2ebfc',
    ic: IC.serum(19),
    t: 'Download as text file',
    s: 'Keep it offline',
    fn: (markDone) => {
      markDone();
      downloadRoutine();
    },
  });

  return (
    <div
      className={'sheet-bg' + (open ? ' open' : '')}
      id="sheetBg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        <div className="sheet-grab"></div>
        <button className="sheet-close" onClick={onClose} id="sheetCloseBtn">
          <Raw html={IC.x(13, '#6d6268')} />
        </button>
        <div className="sheet-t" id="sheetTitle">
          {mode === 'couple' ? 'Share your couple routine' : 'Share your routine'}
        </div>
        <div className="sheet-s" id="sheetSub">
          {mode === 'couple' ? 'Both profiles and your shared steps.' : 'Pick how you want to send it.'}
        </div>

        {/* Above the send options on purpose: the card is the thing worth
            sharing, and most people will screenshot it rather than pick a
            channel. Couple mode only — there is no second heritage to compare
            on a solo routine. */}
        {cardData && (
          <>
            <ShareCard data={cardData} toast={toast} />
            <div className="sheet-hint" style={{ marginBottom: '18px' }}>
              Save it as an image, or pick a way to send the full routine below.
            </div>
          </>
        )}
        <div className="sheet-opts" id="sheetOpts">
          {opts.map((o) => (
            <button
              key={o.id}
              className={'sheet-opt' + (doneIds[o.id] ? ' done' : '')}
              onClick={() => {
              /* Which channel, not just that a share happened: the answer to
                 "where does this actually spread" is the whole reason to
                 report it. */
              track(EV.shared, { channel: o.id });
              o.fn(() => setDoneIds((d) => ({ ...d, [o.id]: true })));
            }}
            >
              <Raw html={box(38, 12, o.bg, o.ic)} />
              <div className="sheet-opt-b">
                <div className="sheet-opt-t">{o.t}</div>
                <div className="sheet-opt-s">{o.s}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="sheet-box">
          <div className="sheet-box-l">Your routine — tap to select all</div>
          <textarea
            className="sheet-ta"
            id="sheetText"
            ref={taRef}
            readOnly
            value={full}
            onClick={(e) => e.currentTarget.select()}
          />
        </div>
        <div className="sheet-hint">Tap the text above, then copy with your keyboard or long-press.</div>
      </div>
    </div>
  );
}
