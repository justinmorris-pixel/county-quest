import { useEffect, useRef, useState } from 'react';
import ArcadeQ from './ArcadeQ.jsx';
import { Button, Card, Confetti } from './ui.jsx';
import { BADGES } from '../lib/game.js';
import { SPEED_SECONDS, speedQuestion } from '../lib/arcade.js';
import { sfx } from '../lib/sound.js';

// 60 seconds. Answer as many as you can. Points = 10 per right answer + a combo bonus.
export default function SpeedRound({ best, bestCorrect, onFinish, onExit, onBoard }) {
  const [phase, setPhase] = useState('intro'); // intro | play | result
  const [q, setQ] = useState(null);
  const [left, setLeft] = useState(SPEED_SECONDS);
  const [stat, setStat] = useState({ correct: 0, wrong: 0, points: 0, combo: 0, bestCombo: 0 });
  const [result, setResult] = useState(null);
  const statRef = useRef(stat);
  const endAt = useRef(0);
  const recent = useRef([]);
  const finished = useRef(false);

  const next = () => {
    const nq = speedQuestion(recent.current);
    recent.current = [nq.name, ...recent.current].slice(0, 12);
    setQ(nq);
  };

  function start() {
    finished.current = false;
    recent.current = [];
    const fresh = { correct: 0, wrong: 0, points: 0, combo: 0, bestCombo: 0 };
    statRef.current = fresh;
    setStat(fresh);
    setLeft(SPEED_SECONDS);
    setResult(null);
    endAt.current = Date.now() + SPEED_SECONDS * 1000;
    next();
    setPhase('play');
  }

  useEffect(() => {
    if (phase !== 'play') return undefined;
    const t = setInterval(() => {
      const ms = endAt.current - Date.now();
      setLeft(Math.max(0, ms / 1000));
      if (ms <= 0 && !finished.current) {
        finished.current = true;
        const st = statRef.current;
        const ev = onFinish({ correct: st.correct, points: st.points });
        setResult({ ...st, ...ev });
        setPhase('result');
        sfx.fanfare();
      }
    }, 100);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function onResolve(correct) {
    const s = statRef.current;
    let n;
    if (correct) {
      const combo = s.combo + 1;
      n = { ...s, correct: s.correct + 1, combo, bestCombo: Math.max(s.bestCombo, combo), points: s.points + 10 + Math.min(combo, 10) };
    } else n = { ...s, wrong: s.wrong + 1, combo: 0 };
    statRef.current = n;
    setStat(n);
  }

  if (phase === 'intro') {
    return (
      <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-4 p-4">
        <Card className="pop text-center">
          <div className="text-6xl">⚡</div>
          <h1 className="font-display mt-2 text-4xl font-semibold text-amber-300">Speed Round</h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-slate-200">
            You get <b className="text-white">{SPEED_SECONDS} seconds</b>. Answer as many questions as you can. Counties, county seats, and
            borders are all mixed together.
          </p>
          <p className="mt-2 text-slate-300">Each right answer is 10 points, plus a bonus that grows with your combo. Missing one breaks the combo but the clock keeps running.</p>
          <p className="mt-2 text-sm text-slate-400">Tip: press 1, 2, 3 or 4 on the keyboard to answer even faster.</p>
          {best > 0 && (
            <p className="font-display mt-3 text-xl text-amber-300">
              Your best: {best} points ({bestCorrect} correct)
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button color="slate" onClick={onExit}>
              ← Back
            </Button>
            {onBoard && (
              <Button color="sky" onClick={() => onBoard('speed')}>
                🏆 Leaderboard
              </Button>
            )}
            <Button big color="green" onClick={start}>
              Start!
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === 'result' && result) {
    const total = result.correct + result.wrong;
    return (
      <div className="mx-auto grid min-h-full max-w-xl place-items-center p-4">
        <Confetti burst={result.newBest ? 1 : 0} />
        <Card className="pop w-full text-center">
          <div className="text-6xl">{result.newBest ? '🏅' : '⚡'}</div>
          <h1 className="font-display mt-2 text-3xl font-semibold">{result.newBest ? 'New personal best!' : "Time's up!"}</h1>
          <p className="font-display mt-3 text-6xl font-bold text-amber-300">{result.points}</p>
          <p className="text-slate-300">points</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-slate-900/60 p-3">
              <div className="font-display text-2xl font-semibold text-emerald-300">{result.correct}</div>
              <div className="text-xs text-slate-400">correct</div>
            </div>
            <div className="rounded-2xl bg-slate-900/60 p-3">
              <div className="font-display text-2xl font-semibold text-rose-300">{result.wrong}</div>
              <div className="text-xs text-slate-400">missed</div>
            </div>
            <div className="rounded-2xl bg-slate-900/60 p-3">
              <div className="font-display text-2xl font-semibold text-orange-300">{result.bestCombo}</div>
              <div className="text-xs text-slate-400">best combo</div>
            </div>
          </div>
          <p className="mt-3 text-slate-300">
            {total ? Math.round((result.correct / total) * 100) : 0}% accuracy · +{result.xp} XP
          </p>
          {result.newBadges.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {result.newBadges.map((id) => (
                <div key={id} className="rounded-2xl bg-slate-900/70 px-3 py-2 text-left">
                  <span className="text-2xl">{BADGES[id].emoji}</span> <span className="font-display font-semibold">{BADGES[id].name}</span>
                  <div className="text-xs text-slate-400">{BADGES[id].desc}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 flex flex-col gap-2">
            <Button color="green" onClick={start}>
              ⚡ Play again
            </Button>
            {onBoard && (
              <Button color="sky" onClick={() => onBoard('speed')}>
                🏆 See the leaderboard
              </Button>
            )}
            <Button color="slate" onClick={onExit}>
              Back to the map
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const pct = (left / SPEED_SECONDS) * 100;
  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-3 p-3 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button color="slate" onClick={onExit}>
          Quit
        </Button>
        <div className="font-display text-2xl font-semibold text-amber-300">⚡ Speed Round</div>
        <div className="font-display ml-auto flex items-center gap-4 text-lg">
          <span className={stat.combo >= 3 ? 'text-orange-400' : 'text-slate-400'}>🔥 {stat.combo}</span>
          <span className="text-emerald-300">✔ {stat.correct}</span>
          <span className="text-amber-300">⭐ {stat.points}</span>
          <span className={`w-14 text-right ${left <= 10 ? 'text-red-400' : 'text-white'}`}>⏱ {Math.ceil(left)}</span>
        </div>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-700">
        <div className={`h-full transition-[width] duration-100 ease-linear ${left <= 10 ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
      </div>
      {q && <ArcadeQ key={q.id} q={q} wrongMode="auto" onResolve={onResolve} onNext={next} />}
    </div>
  );
}
