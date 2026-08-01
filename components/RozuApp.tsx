'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { fallback } from '@/lib/fallback';
import { buildPrompt } from '@/lib/prompt';
import {
  QS,
  emptyLife,
  heritageOf,
  skinOf,
  type Answers,
  type Filling,
  type Life,
  type Mode,
} from '@/lib/quiz';
import type { ShareState } from '@/lib/routineText';
import { routineText } from '@/lib/routineText';
import type { Routine } from '@/lib/types';
import { Landing } from './Landing';
import { Loading } from './Loading';
import { LogoMark } from './Logo';
import { PartnerTransition } from './PartnerTransition';
import { Preview } from './Preview';
import { Quiz } from './Quiz';
import { Result } from './Result';
import { ShareSheet, makeCopyText, type ToastFn } from './ShareSheet';
import { Toast } from './Toast';

type Screen = 'landing' | 'ptScreen' | 'quiz' | 'loading' | 'result';
/** Which of the two `#rBody` states the result screen is showing. */
type ResultPhase = 'preview' | 'building' | 'full';

const AI_MSGS = ['Analysing your heritage', 'Mapping your skin biology', 'Personalising your protocol', 'Almost ready…'];

export function RozuApp() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [mode, setMode] = useState<Mode | null>(null);
  const [cQ, setCQ] = useState(0);
  const [filling, setFilling] = useState<Filling>('self');
  const [bothDone, setBothDone] = useState(false);

  const [ans, setAns] = useState<Answers>({});
  const [life, setLife] = useState<Life>(emptyLife());
  const [selfAns, setSelfAns] = useState<Answers>({});
  const [selfLife, setSelfLife] = useState<Life>(emptyLife());
  const [partAns, setPartAns] = useState<Answers>({});
  const [partLife, setPartLife] = useState<Life>(emptyLife());

  const [loadMsg, setLoadMsg] = useState('Analysing your heritage');
  const [resultPhase, setResultPhase] = useState<ResultPhase>('preview');
  const [aiMsg, setAiMsg] = useState(AI_MSGS[0]);

  const [routine, setRoutine] = useState<{ p: Routine | null; h: string; s: string; pp: Routine | null; ph: string; ps: string }>({
    p: null, h: '', s: '', pp: null, ph: '', ps: '',
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [toastState, setToastState] = useState<{ show: boolean; msg: string; ok: boolean }>({ show: false, msg: '', ok: true });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const toast: ToastFn = useCallback((msg, ok = true) => {
    setToastState({ show: true, msg, ok });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastState((t) => ({ ...t, show: false })), 2600);
  }, []);

  const copyText = useMemo(() => makeCopyText(toast, taRef), [toast]);

  const show = useCallback((id: Screen) => {
    setScreen(id);
  }, []);

  /* The prototype swaps innerHTML and *then* calls window.scrollTo(0,0), so the
     scroll always lands against the new layout. React commits asynchronously,
     so scrolling inside the handler runs against the OLD layout — with
     `scroll-behavior:smooth` plus browser scroll anchoring that settles a few
     dozen px short of the top. Scrolling in a layout effect restores the
     prototype's render-then-scroll order. */
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [screen, cQ, resultPhase]);

  /* ── QUIZ ────────────────────────────────────────────── */

  const initQuiz = useCallback(() => {
    setAns({});
    setLife(emptyLife());
    setSelfAns({});
    setSelfLife(emptyLife());
    setPartAns({});
    setPartLife(emptyLife());
    setFilling('self');
    setBothDone(false);
    setCQ(0);
    show('quiz');
  }, [show]);

  const startQuiz = useCallback(() => {
    if (mode) initQuiz();
  }, [mode, initQuiz]);

  const pick = useCallback(
    (id: string, v: number) => {
      if (filling === 'partner') setPartAns((a) => ({ ...a, [id]: v }));
      else setAns((a) => ({ ...a, [id]: v }));
    },
    [filling],
  );

  const pickMulti = useCallback(
    (id: string, v: number) => {
      const upd = (a: Answers): Answers => {
        const cur = Array.isArray(a[id]) ? (a[id] as number[]) : [];
        const idx = cur.indexOf(v);
        const next = idx > -1 ? cur.filter((x) => x !== v) : cur.concat(v);
        return { ...a, [id]: next };
      };
      if (filling === 'partner') setPartAns(upd);
      else setAns(upd);
    },
    [filling],
  );

  const pickLife = useCallback(
    (k: keyof Life, v: number) => {
      if (filling === 'partner') setPartLife((l) => ({ ...l, [k]: v }));
      else setLife((l) => ({ ...l, [k]: v }));
    },
    [filling],
  );

  const showPreview = useCallback(() => {
    show('loading');
    setLoadMsg('Preparing your profile preview…');
    setTimeout(() => {
      setResultPhase('preview');
      show('result');
    }, 1400);
  }, [show]);

  const nextQ = useCallback(() => {
    if (cQ < QS.length - 1) {
      setCQ((c) => c + 1);
      return;
    }
    if (mode === 'couple' && filling === 'self') {
      setSelfAns(JSON.parse(JSON.stringify(ans)));
      setSelfLife(JSON.parse(JSON.stringify(life)));
      show('ptScreen');
      return;
    }
    if (mode === 'couple') {
      setBothDone(true);
    } else {
      // Solo/gift: the active buffer is the self profile.
      setSelfAns(JSON.parse(JSON.stringify(ans)));
      setSelfLife(JSON.parse(JSON.stringify(life)));
    }
    showPreview();
  }, [cQ, mode, filling, ans, life, show, showPreview]);

  const startPartner = useCallback(() => {
    setFilling('partner');
    setPartAns({});
    setPartLife(emptyLife());
    setCQ(0);
    show('quiz');
  }, [show]);

  const qBack = useCallback(() => {
    if (cQ > 0) {
      setCQ((c) => c - 1);
    } else {
      show('landing');
    }
  }, [cQ, show]);

  /* ── AI + RESULT ─────────────────────────────────────── */

  /* Ported from tryAPI(). The browser call is unauthenticated and therefore
     always fails outside the artifact sandbox — step 2 replaces this with
     POST /api/generate. Every failure path resolves null so the caller falls
     back; the user never sees an error screen. */
  const tryAPI = useCallback((prompt: string): Promise<Routine | null> => {
    return new Promise((resolve) => {
      let settled = false;
      const done = (v: Routine | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(v);
      };
      const timer = setTimeout(() => done(null), 12000);

      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
        .then((r) => {
          if (!r.ok) throw new Error('bad status');
          return r.json();
        })
        .then((d) => {
          let txt = '';
          if (d && d.content) {
            for (let i = 0; i < d.content.length; i++) {
              if (d.content[i].type === 'text') {
                txt = d.content[i].text;
                break;
              }
            }
          }
          const clean = txt.replace(/```json/g, '').replace(/```/g, '').trim();
          if (clean.charAt(0) === '{') {
            try {
              done(JSON.parse(clean));
              return;
            } catch (e) {
              /* fall through */
            }
          }
          done(null);
        })
        .catch(() => done(null));
    });
  }, []);

  const doPurchase = useCallback(async () => {
    setResultPhase('building');
    setAiMsg(AI_MSGS[0]);
    let mi = 0;
    const iv = setInterval(() => {
      mi++;
      setAiMsg(AI_MSGS[mi % AI_MSGS.length]);
    }, 900);

    const h = heritageOf(selfAns);
    const s = skinOf(selfAns);
    let p = await tryAPI(buildPrompt(h, s, selfLife));
    if (!p) p = fallback(h, s, selfLife);

    let pp: Routine | null = null;
    let ph = '';
    let ps = '';
    if (mode === 'couple' && bothDone) {
      ph = heritageOf(partAns);
      ps = skinOf(partAns);
      pp = await tryAPI(buildPrompt(ph, ps, partLife));
      if (!pp) pp = fallback(ph, ps, partLife);
    }

    clearInterval(iv);
    setRoutine({ p, h, s, pp, ph, ps });
    setResultPhase('full');
  }, [selfAns, selfLife, mode, bothDone, partAns, partLife, tryAPI]);

  const restart = useCallback(() => {
    setMode(null);
    setCQ(0);
    setFilling('self');
    setBothDone(false);
    setAns({});
    setSelfAns({});
    setPartAns({});
    setLife(emptyLife());
    setSelfLife(emptyLife());
    setPartLife(emptyLife());
    setResultPhase('preview');
    setRoutine({ p: null, h: '', s: '', pp: null, ph: '', ps: '' });
    show('landing');
  }, [show]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const share: ShareState = {
    mode,
    p: routine.p,
    h: routine.h,
    s: routine.s,
    pp: routine.pp,
    ph: routine.ph,
    ps: routine.ps,
  };

  const activeAns = filling === 'partner' ? partAns : ans;
  const activeLife = filling === 'partner' ? partLife : life;

  return (
    <>
      <Landing
        active={screen === 'landing'}
        mode={mode}
        onSelectWho={setMode}
        onStart={startQuiz}
      />

      <PartnerTransition active={screen === 'ptScreen'} onStart={startPartner} />

      <Quiz
        active={screen === 'quiz'}
        cQ={cQ}
        mode={mode}
        filling={filling}
        ans={activeAns}
        life={activeLife}
        onBack={qBack}
        onNext={nextQ}
        onPick={pick}
        onPickMulti={pickMulti}
        onPickLife={pickLife}
      />

      <Loading active={screen === 'loading'} msg={loadMsg} />

      <div id="result" className={'screen' + (screen === 'result' ? ' active' : '')}>
        <div className="rnav">
          <div className="rlogo">
            <LogoMark size={24} />
            <span>RŌZU</span>
          </div>
          <span className="rrestart" onClick={restart}>
            Start over
          </span>
        </div>
        <div className="rbody" id="rBody">
          {resultPhase === 'preview' && (
            <Preview
              mode={mode}
              bothDone={bothDone}
              selfAns={selfAns}
              partAns={partAns}
              onPurchase={doPurchase}
            />
          )}
          {resultPhase === 'building' && (
            <div
              style={{
                minHeight: '60vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '18px',
                padding: '40px',
                textAlign: 'center',
              }}
            >
              <div className="spin"></div>
              <div style={{ fontSize: '17px', fontWeight: 700 }}>Building your routine…</div>
              <div id="aiMsg" style={{ fontSize: '13px', color: '#a09298', maxWidth: '240px', lineHeight: 1.6 }}>
                {aiMsg}
              </div>
            </div>
          )}
          {resultPhase === 'full' && routine.p && (
            <Result
              mode={mode}
              bothDone={bothDone}
              p={routine.p}
              h={routine.h}
              s={routine.s}
              pp={routine.pp}
              ph={routine.ph}
              ps={routine.ps}
              onOpenSheet={() => setSheetOpen(true)}
              onCopy={() => copyText(routineText(share), 'Routine copied')}
            />
          )}
        </div>
      </div>

      <ShareSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        share={share}
        toast={toast}
        copyText={copyText}
        taRef={taRef}
      />

      <Toast show={toastState.show} msg={toastState.msg} ok={toastState.ok} />
    </>
  );
}
