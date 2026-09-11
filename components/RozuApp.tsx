'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { EV, planValue, track } from '@/lib/analytics';
import { profileOf } from '@/lib/order';
import {
  QS,
  emptyLife,
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
/** Mirrors lib/types' PlanName. Not imported from paidToken: that module pulls
 *  in node:crypto. */
type Plan = 'solo' | 'couple' | 'gift';

const AI_MSGS = ['Analysing your heritage', 'Mapping your skin biology', 'Personalising your protocol', 'Almost ready…'];

/* Surviving the payment round trip.
   The customer leaves the site entirely for Stripe Checkout — a full
   navigation, not an overlay, because in-app browsers (TikTok, LinkedIn) are
   the primary traffic and they handle a redirect far more reliably than a
   third-party overlay script.
     DRAFT_KEY  — per tab. Restores the preview if they back out of checkout.
     SID_KEY    — per browser. Recovers a purchase whose tab was closed. */
const DRAFT_KEY = 'rozu_draft';
const SID_KEY = 'rozu_sid';
/* Preview mode. Typed once as ?preview=... then remembered for the tab, so
   restarting the quiz does not mean re-typing the key every time. */
const PREVIEW_KEY = 'rozu_preview';
/* An Etsy redemption code, arriving as ?code= on the link the buyer was sent.
   Remembered for the tab like the preview key, so starting the quiz over does
   not mean digging the code out of the Etsy message again. */
const ETSY_KEY = 'rozu_etsy';
const DRAFT_TTL_MS = 60 * 60 * 1000;
const SID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ttclid', 'li_fat_id'];

/** How long to wait for the payment webhook after the browser comes back. */
const PAID_POLL_MS = 1500;
const PAID_DEADLINE_MS = 120000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Computed server-side, where both full profiles live. */
export type CoupleInfo = {
  match: { pct: number; reason: string };
  sharedConcerns: string[];
  sharedLife: ('sleep' | 'stress' | 'diet')[];
  /** Only what their answers support — see lib/match.ts. */
  facts: {
    factors: { label: string; shared: boolean }[];
    concerns: string[];
    habits: { key: 'sleep' | 'stress' | 'diet'; answer: string }[];
    skinSame: boolean;
    selfSkin: string;
    partnerSkin: string;
    heritageSame: boolean;
  };
};

type Draft = {
  t: number;
  mode: Mode | null;
  bothDone: boolean;
  selfAns: Answers;
  selfLife: Life;
  partAns: Answers;
  partLife: Life;
};

/** Storage is unavailable in some in-app browsers and in private mode; every
 *  call site treats it as a nicety, never a requirement. */
function safeGet(store: 'session' | 'local', key: string): string | null {
  try {
    return (store === 'session' ? window.sessionStorage : window.localStorage).getItem(key);
  } catch {
    return null;
  }
}
function safeSet(store: 'session' | 'local', key: string, value: string): void {
  try {
    (store === 'session' ? window.sessionStorage : window.localStorage).setItem(key, value);
  } catch {
    /* ignore */
  }
}
function safeDel(store: 'session' | 'local', key: string): void {
  try {
    (store === 'session' ? window.sessionStorage : window.localStorage).removeItem(key);
  } catch {
    /* ignore */
  }
}

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

  const [routine, setRoutine] = useState<{
    p: Routine | null; h: string; s: string; pp: Routine | null; ph: string; ps: string;
    couple: CoupleInfo | null;
    concerns: string[];
  }>({ p: null, h: '', s: '', pp: null, ph: '', ps: '', couple: null, concerns: [] });

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

  /* ── FUNNEL ──────────────────────────────────────────────
     Every step of the funnel reports itself. Without these the ad platforms
     see a page load and nothing else, and cannot be asked to find more people
     who buy — which is the entire reason the pixels are here.

     track() is a no-op until consent is granted, so none of these calls need
     to think about it. */
  useEffect(() => {
    track(EV.landing);
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

  const selectWho = useCallback((m: Mode) => {
    setMode(m);
    track(EV.whoSelected, { mode: m });
  }, []);

  const startQuiz = useCallback(() => {
    if (!mode) return;
    track(EV.quizStart, { mode });
    initQuiz();
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
      /* Fired when the paywall is actually on screen, not when the quiz ended:
         this is the number the checkout rate is measured against. */
      track(EV.previewSeen);
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
    track(EV.quizComplete, { mode });
    showPreview();
  }, [cQ, mode, filling, ans, life, show, showPreview]);

  const startPartner = useCallback(() => {
    track(EV.partnerStart);
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

  /* ── PAYMENT ─────────────────────────────────────────── */

  /* The prototype's "Unlock" button called the model directly and for free.
     Now it buys first: create an order server-side, hand the customer to
     Stripe, and only generate once the webhook confirms the money arrived.
     Nothing on this path can reach the model without a verified payment. */

  /* Held only while something is actually driving the result screen. The
     background recovery below deliberately does NOT take it: a silent check
     that held this for two minutes would make the Unlock button do nothing at
     all, with no error and no explanation. */
  const busy = useRef(false);

  /** Asks whether this order is paid yet. Null means "not yet, or never". */
  const fetchToken = useCallback(
    async (sid: string): Promise<{ token: string; plan: Plan } | 'pending' | 'gone' | 'error'> => {
      try {
        const r = await fetch(`/api/paid?sid=${encodeURIComponent(sid)}`, { cache: 'no-store' });
        if (r.status === 404) return 'gone';
        if (r.status >= 500) return 'error';
        if (!r.ok) return 'error';
        const d = (await r.json()) as { status?: string; token?: string; plan?: Plan };
        if (d.status === 'paid' && d.token && d.plan) return { token: d.token, plan: d.plan };
        if (d.status === 'refunded') return 'gone';
        return 'pending';
      } catch {
        return 'error';
      }
    },
    [],
  );

  /** Fetches the paid-for routine and puts it on screen. */
  const deliver = useCallback(
    async (sid: string, token: string) => {
      if (busy.current) return;
      busy.current = true;

      safeDel('local', SID_KEY);
      safeDel('session', DRAFT_KEY);

      setAiMsg(AI_MSGS[0]);
      setResultPhase('building');
      show('result');

      let mi = 0;
      const iv = setInterval(() => {
        mi++;
        setAiMsg(AI_MSGS[mi % AI_MSGS.length]);
      }, 900);

      try {
        const r = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sid, token }),
        });
        if (!r.ok) throw new Error(`generate ${r.status}`);
        const d = (await r.json()) as {
          self: Routine;
          partner: Routine | null;
          plan: Plan;
          profile: {
            self: { heritage: string; skin: string; concerns: string[] };
            partner: { heritage: string; skin: string; concerns: string[] } | null;
          };
          couple: CoupleInfo | null;
        };

        /* After a redirect the quiz state is gone, so the labels the result
           screen prints come back with the routine rather than from `ans`. */
        setMode(d.plan === 'couple' ? 'couple' : 'solo');
        setBothDone(d.plan === 'couple');
        setRoutine({
          p: d.self,
          h: d.profile.self.heritage,
          s: d.profile.self.skin,
          pp: d.partner,
          ph: d.profile.partner?.heritage ?? '',
          ps: d.profile.partner?.skin ?? '',
          couple: d.couple ?? null,
          concerns: d.profile.self.concerns ?? [],
        });
        setResultPhase('full');
        track(EV.routineSeen, { plan: d.plan });
      } catch (e) {
        /* The customer has paid and the routine is cached server-side, so this
           is recoverable by reloading — never a dead end. */
        console.warn('[generate]', e);
        toast('Your routine is ready but did not load. Please refresh.', false);
      } finally {
        clearInterval(iv);
        busy.current = false;
      }
    },
    [show, toast],
  );

  /** Back from checkout: wait for the webhook, then deliver. */
  const resumeAfterRedirect = useCallback(
    async (sid: string) => {
      if (busy.current) return;
      busy.current = true;

      setAiMsg('Confirming your payment…');
      setResultPhase('building');
      show('result');

      /* The webhook and the redirect race each other. Usually the webhook wins
         and the first poll succeeds; if the customer is fast, or Stripe is
         slow, this waits it out rather than saying the payment failed.
         A 5xx is the server being broken, not the payment being slow, so a few
         of those end the wait early instead of burning the full two minutes. */
      const deadline = Date.now() + PAID_DEADLINE_MS;
      let result: Awaited<ReturnType<typeof fetchToken>> = 'pending';
      let serverErrors = 0;

      for (;;) {
        result = await fetchToken(sid);
        if (typeof result === 'object') break;
        if (result === 'gone') break;
        if (result === 'error' && ++serverErrors >= 5) break;
        if (result === 'pending') serverErrors = 0;
        if (Date.now() > deadline) break;
        await sleep(PAID_POLL_MS);
      }

      busy.current = false;

      if (typeof result !== 'object') {
        safeDel('local', SID_KEY);
        setResultPhase('preview');
        toast(
          result === 'gone'
            ? 'This order is no longer available.'
            : 'We could not confirm your payment. Please contact support.',
          false,
        );
        return;
      }

      /* The one event that matters. Reported here rather than in deliver(),
         because deliver() also runs for preview orders where no money changed
         hands — and a preview counted as revenue is worse than no number at
         all: it is a number the ad platform will optimise towards. */
      track(EV.purchase, { plan: result.plan, ...planValue(result.plan) });

      await deliver(sid, result.token);
    },
    [show, toast, fetchToken, deliver],
  );

  /* A purchase whose tab was closed. One check, no lock, no UI — if it is not
     paid there is nothing to say, and blocking the app while we find out would
     be far worse than never checking at all. */
  const recoverQuietly = useCallback(
    async (sid: string) => {
      const result = await fetchToken(sid);
      if (typeof result === 'object') {
        /* The other real-payment path: the tab was closed before the routine
           landed. deliver() clears the stored sid, so this cannot fire twice
           for the same order. */
        track(EV.purchase, { plan: result.plan, ...planValue(result.plan) });
        await deliver(sid, result.token);
        return;
      }
      // Only forget the handle when we know it is worthless. A network blip
      // must not throw away a purchase that was actually made.
      if (result === 'gone') safeDel('local', SID_KEY);
    },
    [fetchToken, deliver],
  );

  const doPurchase = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;

    /* Gift is its own plan now rather than a solo charge wearing a different
       label, so gift sales are visible in Stripe instead of being folded into
       solo. Same price; the difference is what the dashboard can tell you. */
    const plan: Plan = mode === 'couple' && bothDone ? 'couple' : mode === 'gift' ? 'gift' : 'solo';
    const utm: Record<string, string> = {};
    const q = new URLSearchParams(window.location.search);
    for (const k of UTM_KEYS) {
      const v = q.get(k);
      if (v) utm[k] = v;
    }

    const fromUrl = q.get('preview');
    if (fromUrl) safeSet('session', PREVIEW_KEY, fromUrl);
    const preview = fromUrl ?? safeGet('session', PREVIEW_KEY) ?? '';

    const codeFromUrl = q.get('code');
    if (codeFromUrl) safeSet('session', ETSY_KEY, codeFromUrl);
    const etsyCode = codeFromUrl ?? safeGet('session', ETSY_KEY) ?? '';

    /* Written before we navigate away: if the customer abandons the checkout
       and presses back, this is what puts them on the preview instead of the
       landing page with an empty quiz. */
    const draft: Draft = { t: Date.now(), mode, bothDone, selfAns, selfLife, partAns, partLife };
    safeSet('session', DRAFT_KEY, JSON.stringify(draft));

    setAiMsg('Opening secure checkout…');
    setResultPhase('building');

    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          self: profileOf(selfAns, selfLife),
          partner: plan === 'couple' ? profileOf(partAns, partLife) : null,
          utm,
          ...(preview ? { preview } : {}),
          ...(etsyCode ? { etsyCode } : {}),
        }),
      });

      /* 403 is a rejected key or a rejected code, never a payment failure —
         "could not open checkout" would send both the buyer and me looking in
         the wrong place. A buyer holding a code they paid for needs to know
         WHICH of the three things went wrong, because two of them they can fix
         and one of them needs an email. */
      if (r.status === 403) {
        busy.current = false;
        setResultPhase('preview');
        const why = (await r.json().catch(() => ({}))) as { reason?: string; plan?: string };
        if (!etsyCode) {
          toast('Preview key is not valid.', false);
        } else if (why.reason === 'spent') {
          toast('This code has already been used. Email us and we will sort it out.', false);
        } else if (why.reason === 'wrong_plan') {
          toast(`This code is for the ${why.plan === 'couple' ? 'Couple' : 'Solo'} routine.`, false);
        } else {
          toast('We do not recognise that code. Check it and try again.', false);
        }
        return;
      }
      if (!r.ok) throw new Error(`checkout ${r.status}`);

      const d = (await r.json()) as { url?: string; sid?: string; preview?: boolean; etsy?: boolean };

      /* Preview, and a redeemed Etsy code: the order is already marked paid, so
         there is nowhere to send the browser. Pick up the token and go straight
         to the routine. */
      if ((d.preview || d.etsy) && d.sid) {
        const result = await fetchToken(d.sid);
        busy.current = false;
        if (typeof result === 'object') await deliver(d.sid, result.token);
        else {
          setResultPhase('preview');
          toast('Preview could not be prepared.', false);
        }
        return;
      }

      if (!d.url || !d.sid) throw new Error('checkout returned nothing');

      /* Only on the path that actually leaves for Stripe. The preview
         branch above returns before this, so a review session never shows up
         as a checkout. */
      track(EV.checkoutStart, { plan, ...planValue(plan) });

      // Last thing before leaving: the recovery handle for a closed tab.
      safeSet('local', SID_KEY, d.sid);
      window.location.href = d.url;
    } catch (e) {
      console.warn('[checkout]', e);
      busy.current = false;
      setResultPhase('preview');
      toast('Could not open checkout. Please try again.', false);
    }
  }, [mode, bothDone, selfAns, selfLife, partAns, partLife, toast, fetchToken, deliver]);

  /* On load, work out which of three arrivals this is:
       ?sid= in the URL   — just came back from checkout, wait for the webhook
       a stored sid       — a purchase whose tab was closed; check it quietly
       a stored draft     — backed out of checkout; put the preview back
     Runs once. */
  const arrived = useRef(false);
  useEffect(() => {
    if (arrived.current) return;
    arrived.current = true;

    const fromUrl = new URLSearchParams(window.location.search).get('sid');
    if (fromUrl && SID_RE.test(fromUrl)) {
      void resumeAfterRedirect(fromUrl);
      return;
    }

    const stored = safeGet('local', SID_KEY);
    if (stored && SID_RE.test(stored)) void recoverQuietly(stored);

    const rawDraft = safeGet('session', DRAFT_KEY);
    if (!rawDraft) return;
    try {
      const d = JSON.parse(rawDraft) as Draft;
      if (!d || typeof d.t !== 'number' || Date.now() - d.t > DRAFT_TTL_MS) {
        safeDel('session', DRAFT_KEY);
        return;
      }
      setMode(d.mode);
      setBothDone(d.bothDone);
      setSelfAns(d.selfAns);
      setSelfLife(d.selfLife);
      setPartAns(d.partAns);
      setPartLife(d.partLife);
      setResultPhase('preview');
      show('result');
    } catch {
      safeDel('session', DRAFT_KEY);
    }
  }, [resumeAfterRedirect, recoverQuietly, show]);

  /* ── RESULT ──────────────────────────────────────────── */

  const restart = useCallback(() => {
    safeDel('session', DRAFT_KEY);
    // PREVIEW_KEY deliberately survives: restarting the quiz in preview mode
    // should stay in preview mode.
    safeDel('local', SID_KEY);
    busy.current = false;
    /* Drop ?sid= so a reload does not pull the finished order back up. Any
       other parameter is kept — stripping ?preview= here would kick a review
       session back into paying mode halfway through. */
    const q = new URLSearchParams(window.location.search);
    if (q.has('sid')) {
      q.delete('sid');
      const rest = q.toString();
      window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : ''));
    }
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
    setRoutine({ p: null, h: '', s: '', pp: null, ph: '', ps: '', couple: null, concerns: [] });
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
        onSelectWho={selectWho}
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
              selfLife={selfLife}
              partLife={partLife}
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
              couple={routine.couple}
              onOpenSheet={() => setSheetOpen(true)}
              onCopy={() =>
                copyText(
                  routineText(
                    share,
                    routine.couple
                      ? {
                          pct: routine.couple.match.pct,
                          sharedLabels: routine.couple.facts.habits.map((h) => h.answer),
                        }
                      : null,
                  ),
                  'Routine copied',
                )
              }
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
        couple={routine.couple}
        concerns={routine.concerns}
      />

      <Toast show={toastState.show} msg={toastState.msg} ok={toastState.ok} />
    </>
  );
}
