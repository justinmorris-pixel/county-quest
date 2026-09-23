import { useEffect, useMemo, useRef, useState } from 'react';
import OklahomaMap from './OklahomaMap.jsx';
import { Button, Card, Confetti } from './ui.jsx';
import { COUNTIES } from '../data/counties.js';
import { COUNTY_BY_NAME, STAGES } from '../lib/stages.js';
import { MAP_PASS } from '../lib/game.js';
import { sfx } from '../lib/sound.js';

const shuffle = (a) => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Fill the whole (blank) state map from memory. onFinish(result) returns { passed }.
export default function MapChallenge({ onFinish, onExit, best }) {
  const total = COUNTIES.length;
  const need = Math.ceil(total * MAP_PASS);
  const [started, setStarted] = useState(false);
  const [order, setOrder] = useState([]);
  const [idx, setIdx] = useState(0);
  const [found, setFound] = useState({}); // name -> true
  const [misses, setMisses] = useState([]); // names missed at least once
  const [tries, setTries] = useState(0); // wrong clicks on current target
  const [marks, setMarks] = useState({});
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState(null);
  const startedAt = useRef(0);
  const flash = useRef(null);

  useEffect(() => {
    if (!started || result) return undefined;
    const t = setInterval(() => setSeconds(Math.round((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [started, result]);

  useEffect(() => () => clearTimeout(flash.current), []);

  function start() {
    setOrder(shuffle(COUNTIES.map((c) => c.name)));
    setIdx(0);
    setFound({});
    setMisses([]);
    setTries(0);
    setMarks({});
    setResult(null);
    setSeconds(0);
    startedAt.current = Date.now();
    setStarted(true);
  }

  const target = order[idx];

  function onClick(c) {
    if (!target || result) return;
    if (c.name === target) {
      sfx.correct();
      const nf = { ...found, [target]: true };
      setFound(nf);
      setTries(0);
      setMarks({});
      if (idx + 1 >= total) {
        const secs = Math.round((Date.now() - startedAt.current) / 1000);
        const firstTry = total - misses.length;
        const r = onFinish({ firstTry, total, misses, seconds: secs });
        setSeconds(secs);
        setResult({ firstTry, passed: r.passed, misses });
        if (r.passed) sfx.fanfare();
      } else setIdx(idx + 1);
    } else {
      sfx.wrong();
      if (!misses.includes(target)) setMisses([...misses, target]);
      const t = tries + 1;
      setTries(t);
      const m = { [c.name]: 'wrong' };
      if (t >= 3) m[target] = 'target'; // hint after 3 wrong taps
      setMarks(m);
      clearTimeout(flash.current);
      flash.current = setTimeout(() => setMarks(t >= 3 ? { [target]: 'target' } : {}), 500);
    }
  }

  const styleFor = useMemo(
    () => (c) => (found[c.name] ? { fill: STAGES[c.stage - 1].color, opacity: 1 } : { fill: '#475569', opacity: 0.9 }),
    [found]
  );

  if (!started) {
    return (
      <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-4 p-4">
        <Card className="pop text-center">
          <div className="text-6xl">🗺️</div>
          <h1 className="font-display mt-2 text-4xl font-semibold text-amber-300">The Full Map Challenge</h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-slate-200">
            The map is blank. You will be given all 77 county names, one at a time. Tap each one to fill in the whole state.
          </p>
          <p className="mt-2 text-slate-300">
            Get at least <b className="text-white">{need} of {total}</b> on your first try to pass and unlock the county seats.
          </p>
          {best > 0 && <p className="mt-2 text-sm text-slate-400">Your best so far: {best} / {total}</p>}
          <div className="mt-6 flex justify-center gap-3">
            <Button color="slate" onClick={onExit}>
              ← Back
            </Button>
            <Button big color="green" onClick={start}>
              Start!
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-4 p-3 sm:p-5">
        <Confetti burst={result.passed ? 1 : 0} />
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_380px]">
          <Card className="p-2 sm:p-3">
            <OklahomaMap styleFor={styleFor} marks={Object.fromEntries(result.misses.map((n) => [n, 'wrong']))} />
          </Card>
          <Card className="pop text-center">
            <div className="text-6xl">{result.passed ? '🏆' : '💪'}</div>
            <h1 className="font-display mt-2 text-3xl font-semibold">
              {result.passed ? 'You filled the map!' : 'So close — keep going!'}
            </h1>
            <p className="font-display mt-3 text-5xl font-bold text-amber-300">
              {result.firstTry}
              <span className="text-2xl text-slate-400"> / {total}</span>
            </p>
            <p className="text-slate-300">found on the first try · {fmt(seconds)}</p>
            {result.misses.length > 0 && (
              <div className="mt-4 rounded-2xl bg-slate-900/60 p-3 text-left">
                <div className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Counties to review (red)</div>
                <div className="mt-1 text-sm text-slate-200">{result.misses.map((n) => COUNTY_BY_NAME[n].name).join(', ')}</div>
              </div>
            )}
            <p className="mt-4 text-slate-300">
              {result.passed
                ? 'County Seats are now unlocked!'
                : `You need ${need} to pass. Practice your weak spots, then try again.`}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button color={result.passed ? 'green' : 'orange'} onClick={onExit}>
                {result.passed ? 'Continue' : 'Back to the map'}
              </Button>
              {!result.passed && (
                <Button color="sky" onClick={start}>
                  Try again now
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-3 p-3 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button color="slate" onClick={onExit}>
          Quit
        </Button>
        <div className="font-display min-w-0 flex-1 text-2xl font-semibold sm:text-3xl">
          Find <span className="text-amber-300">{target} County</span>
        </div>
        <div className="font-display flex items-center gap-4 text-lg text-slate-300">
          <span>
            {idx} / {total}
          </span>
          <span>⏱ {fmt(seconds)}</span>
          <span className={misses.length > total - need ? 'text-red-400' : ''}>✖ {misses.length}</span>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-700">
        <div className="h-full bg-emerald-400 transition-all" style={{ width: `${(idx / total) * 100}%` }} />
      </div>
      <Card className="p-2 sm:p-3">
        <OklahomaMap styleFor={styleFor} clickable={() => true} onCountyClick={onClick} marks={marks} />
      </Card>
      {tries >= 3 && <p className="text-center text-sm text-amber-300">Hint: the county is blinking yellow.</p>}
    </div>
  );
}
