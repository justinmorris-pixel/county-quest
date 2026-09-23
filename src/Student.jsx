import { useCallback, useEffect, useRef, useState } from 'react';
import Join from './components/Join.jsx';
import Hub from './components/Hub.jsx';
import Quiz from './components/Quiz.jsx';
import StageIntro from './components/StageIntro.jsx';
import MapChallenge from './components/MapChallenge.jsx';
import Celebration from './components/Celebration.jsx';
import StudyMap from './components/StudyMap.jsx';
import Certificate from './components/Certificate.jsx';
import { hasBackend, joinClass, saveProgress } from './lib/supabase.js';
import { load, save, remove } from './lib/storage.js';
import { newState, recordAnswer, recordMapResult, summarize, currentStage, currentSeatStage } from './lib/game.js';

const SESSION_KEY = 'cq_session';
const stateKey = (id) => `cq_state_${id}`;

// Older or partial saves get any missing fields filled in.
const hydrate = (raw) => {
  const base = newState();
  if (!raw || typeof raw !== 'object' || !raw.v) return base;
  return { ...base, ...raw, map: { ...base.map, ...(raw.map || {}) }, counties: raw.counties || {}, seats: raw.seats || {}, badges: raw.badges || [] };
};

export default function Student() {
  const [session, setSession] = useState(() => load(SESSION_KEY));
  const [ready, setReady] = useState(false);
  const [state, setState] = useState(newState);
  const [view, setView] = useState({ name: 'hub' });
  const [sync, setSync] = useState(hasBackend ? 'saved' : 'local');
  const stateRef = useRef(state);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const dirty = useRef(false);
  const saveTimer = useRef(null);
  const lastTouch = useRef(Date.now());
  const celebrateBadges = useRef([]);
  const ticks = useRef(0);

  const commit = useCallback((next) => {
    stateRef.current = next;
    setState(next);
    dirty.current = true;
  }, []);

  // ----- remote save (debounced) -----
  const flush = useCallback(async () => {
    const sess = sessionRef.current;
    if (!sess || !dirty.current) return;
    save(stateKey(sess.studentId), stateRef.current);
    if (!hasBackend || sess.local) {
      dirty.current = false;
      return;
    }
    dirty.current = false;
    setSync('saving');
    try {
      await saveProgress(sess.studentId, stateRef.current, summarize(stateRef.current));
      setSync('saved');
    } catch (e) {
      dirty.current = true;
      setSync('offline');
    }
  }, []);

  useEffect(() => {
    if (!dirty.current) return undefined;
    save(session ? stateKey(session.studentId) : 'cq_tmp', state);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, 1500);
    return () => clearTimeout(saveTimer.current);
  }, [state, session, flush]);

  // retry while offline, and flush when the tab is hidden or closed
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    const retry = setInterval(() => {
      if (dirty.current) flush();
    }, 15000);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      clearInterval(retry);
    };
  }, [flush]);

  // ----- time played (only counts while the student is active) -----
  useEffect(() => {
    const touch = () => {
      lastTouch.current = Date.now();
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, touch));
    const t = setInterval(() => {
      if (!sessionRef.current || document.visibilityState !== 'visible') return;
      if (Date.now() - lastTouch.current > 60000) return;
      const next = { ...stateRef.current, seconds: stateRef.current.seconds + 5 };
      stateRef.current = next;
      setState(next);
      ticks.current += 1;
      if (ticks.current % 6 === 0) dirty.current = true; // save time played about every 30s
      else if (!dirty.current) save(stateKey(sessionRef.current.studentId), next);
    }, 5000);
    return () => {
      ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.removeEventListener(ev, touch));
      clearInterval(t);
    };
  }, []);

  // ----- join / resume -----
  const startSession = useCallback(
    (sess, serverState) => {
      const local = load(stateKey(sess.studentId));
      let s = hydrate(serverState);
      const l = hydrate(local);
      const useLocal = Boolean(local) && l.answers > s.answers && (l.resetAt || 0) >= (s.resetAt || 0); // keep newer offline progress
      if (useLocal) s = l;
      stateRef.current = s;
      setState(s);
      setSession(sess);
      save(SESSION_KEY, sess);
      dirty.current = useLocal;
      setView({ name: 'hub' });
      setReady(true);
      if (dirty.current) setTimeout(flush, 300);
    },
    [flush]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sess = load(SESSION_KEY);
      if (!sess) {
        setReady(true);
        return;
      }
      if (!hasBackend || sess.local) {
        startSession(sess, load(stateKey(sess.studentId)));
        return;
      }
      try {
        const data = await joinClass(sess.code, sess.name);
        if (!cancelled) startSession({ ...sess, studentId: data.student_id, name: data.name, className: data.class_name }, data.state);
      } catch (e) {
        // offline or class removed: fall back to the cached copy if we have one
        if (!cancelled) {
          const cached = load(stateKey(sess.studentId));
          if (cached) startSession(sess, cached);
          else {
            remove(SESSION_KEY);
            setSession(null);
            setReady(true);
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleJoin(code, name) {
    if (!hasBackend) {
      const id = `local-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      startSession({ studentId: id, name, className: 'Practice', code: '', local: true }, load(stateKey(id)));
      return;
    }
    const data = await joinClass(code, name);
    startSession({ studentId: data.student_id, name: data.name, className: data.class_name, code }, data.state);
  }

  async function signOut() {
    await flush();
    remove(SESSION_KEY);
    setSession(null);
    setState(newState());
    stateRef.current = newState();
    setView({ name: 'hub' });
  }

  // ----- game actions -----
  const onAnswer = useCallback(
    (kind, name, correct, combo) => {
      const { state: next, ev } = recordAnswer(stateRef.current, kind, name, correct, combo);
      commit(next);
      celebrateBadges.current = [...celebrateBadges.current, ...ev.newBadges];
      return ev;
    },
    [commit]
  );
  function onStageCleared(kind, n) {
    const badges = celebrateBadges.current;
    celebrateBadges.current = [];
    setView({ name: 'celebrate', kind, n, badges });
  }

  function onMapFinish(result) {
    const { state: next, ev } = recordMapResult(stateRef.current, result);
    commit(next);
    return ev;
  }

  function markIntro(kind) {
    const s = stateRef.current;
    commit(kind === 'county' ? { ...s, introduced: Math.max(s.introduced, currentStage(s)) } : { ...s, seatIntroduced: Math.max(s.seatIntroduced, currentSeatStage(s)) });
  }

  function go(action) {
    const s = stateRef.current;
    if (action === 'countyStart') setView({ name: s.introduced < currentStage(s) ? 'intro' : 'quiz', kind: 'county' });
    if (action === 'seatStart') setView({ name: s.seatIntroduced < currentSeatStage(s) ? 'intro' : 'quiz', kind: 'seat' });
    if (action === 'practice') setView({ name: 'quiz', kind: 'county' });
    if (action === 'map') setView({ name: 'map' });
    if (action === 'study') setView({ name: 'study' });
    if (action === 'cert') setView({ name: 'cert' });
  }

  const hub = () => {
    flush();
    setView({ name: 'hub' });
  };

  if (!ready) return <div className="grid h-full place-items-center text-slate-400">Loading…</div>;

  if (!session) {
    const params = new URLSearchParams(window.location.search);
    return <Join initialCode={(params.get('code') || '').toUpperCase()} onJoin={handleJoin} />;
  }

  if (view.name === 'intro')
    return (
      <StageIntro
        state={state}
        kind={view.kind}
        onBack={hub}
        onStart={() => {
          markIntro(view.kind);
          setView({ name: 'quiz', kind: view.kind });
        }}
      />
    );

  if (view.name === 'quiz')
    return (
      <Quiz
        key={view.kind}
        state={state}
        kind={view.kind}
        onAnswer={onAnswer}
        onExit={hub}
        onStageCleared={(n) => onStageCleared(view.kind, n)}
      />
    );

  if (view.name === 'celebrate')
    return (
      <Celebration
        kind={view.kind}
        stageNum={view.n}
        badges={view.badges}
        onContinue={() => {
          flush();
          const s = stateRef.current;
          if (view.kind === 'seat' && s.seatStagesCleared >= 11) setView({ name: 'cert' });
          else setView({ name: 'hub' });
        }}
      />
    );

  if (view.name === 'map') return <MapChallenge best={state.map.best} onFinish={onMapFinish} onExit={hub} />;
  if (view.name === 'study') return <StudyMap state={state} onBack={hub} />;
  if (view.name === 'cert') return <Certificate name={session.name} className={session.className} onBack={hub} />;

  return <Hub state={state} student={session} sync={sync} go={go} onSignOut={signOut} />;
}
