import { useRef, useState } from 'react';
import ArcadeQ from './ArcadeQ.jsx';
import { Button, Card, Confetti } from './ui.jsx';
import { BADGES } from '../lib/game.js';
import { BOSS_LIVES, bossDeck, bossPhase } from '../lib/arcade.js';
import { sfx } from '../lib/sound.js';

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// All 77 counties, one at a time, getting harder. Three misses and the twister wins.
export default function BossRound({ boss, onFinish, onExit, onBoard }) {
  const [phase, setPhase] = useState('intro'); // intro | play | result
  const [deck, setDeck] = useState([]);
  const [i, setI] = useState(0);
  const [lives, setLives] = useState(BOSS_LIVES);
  const [correct, setCorrect] = useState(0);
  const [result, setResult] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const live = useRef({ lives: BOSS_LIVES, correct: 0, answered: 0 });
  const startedAt = useRef(0);
  const total = deck.length || 77;

  function start() {
    live.current = { lives: BOSS_LIVES, correct: 0, answered: 0 };
    setDeck(bossDeck());
    setI(0);
    setLives(BOSS_LIVES);
    setCorrect(0);
    setResult(null);
    setLeaving(false);
    startedAt.current = Date.now();
    setPhase('play');
  }

  function finish(won) {
    const seconds = Math.round((Date.now() - startedAt.current) / 1000);
    const ev = onFinish({ correct: live.current.correct, won, seconds });
    setResult({ correct: live.current.correct, won, seconds, ...ev });
    setPhase('result');
    if (won) sfx.fanfare();
  }

  function onResolve(ok) {
    const l = live.current;
    l.answered += 1;
    if (ok) {
      l.correct += 1;
      setCorrect(l.correct);
    } else {
      l.lives -= 1;
      setLives(l.lives);
    }
  }

  function next() {
    const l = live.current;
    if (l.lives <= 0) return finish(false);
    if (i + 1 >= deck.length) return finish(true);
    setI(i + 1);
  }

  function leave() {
    if (live.current.answered > 0) finish(false);
    else onExit();
  }

  if (phase === 'intro') {
    return (
      <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-4 p-4">
        <Card className="pop text-center">
          <div className="text-6xl">🌪️</div>
          <h1 className="font-display mt-2 text-4xl font-semibold text-rose-300">The Boss Round</h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-slate-200">
            A monster twister is bearing down on Oklahoma. Every one of the <b className="text-white">77 counties</b> comes at you one at a time, and
            each right answer hits the storm. You have <b className="text-white">{BOSS_LIVES} lives</b>.
          </p>
          <p className="mt-2 text-slate-300">It starts easy and gets harder: multiple choice, then tapping the map, then typing county seats.</p>
          <p className="mt-2 text-sm text-slate-400">Plan on 10 to 20 minutes. If you leave early, your progress still counts as a run.</p>
          {boss.attempts > 0 && (
            <p className="font-display mt-3 text-xl text-amber-300">
              Your best: {boss.best} / 77 {boss.wins > 0 && <span>· 🏆 beaten {boss.wins}×</span>}
              {boss.bestSeconds != null && <span> · fastest {fmt(boss.bestSeconds)}</span>}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button color="slate" onClick={onExit}>
              ← Back
            </Button>
            {onBoard && (
              <Button color="sky" onClick={() => onBoard('boss')}>
                🏆 Leaderboard
              </Button>
            )}
            <Button big color="orange" onClick={start}>
              Face the storm
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === 'result' && result) {
    return (
      <div className="mx-auto grid min-h-full max-w-xl place-items-center p-4">
        <Confetti burst={result.won ? 1 : 0} />
        <Card className="pop w-full text-center">
          <div className="text-6xl">{result.won ? '🏆' : '🌪️'}</div>
          <h1 className="font-display mt-2 text-3xl font-semibold">{result.won ? 'You beat the Boss Round!' : 'The storm got you this time'}</h1>
          <p className="font-display mt-3 text-6xl font-bold text-amber-300">
            {result.correct}
            <span className="text-3xl text-slate-400"> / 77</span>
          </p>
          <p className="text-slate-300">
            {fmt(result.seconds)} · +{result.xp} XP{result.newBest && !result.won ? ' · new personal best!' : ''}
          </p>
          {result.firstWin && <p className="mt-2 text-amber-200">First win bonus included: Twister Tamer badge!</p>}
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
            <Button color="orange" onClick={start}>
              🌪️ Try again
            </Button>
            {onBoard && (
              <Button color="sky" onClick={() => onBoard('boss')}>
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

  const q = deck[i];
  const hp = Math.max(0, ((77 - correct) / 77) * 100);
  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-3 p-3 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        {!leaving ? (
          <Button color="slate" onClick={() => setLeaving(true)}>
            Quit
          </Button>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl bg-slate-800 px-3 py-1.5 text-sm">
            <span>Leave the fight?</span>
            <Button color="orange" onClick={leave}>
              Leave
            </Button>
            <Button color="slate" onClick={() => setLeaving(false)}>
              Stay
            </Button>
          </div>
        )}
        <div className="font-display text-2xl font-semibold text-rose-300">🌪️ Boss Round</div>
        <div className="font-display ml-auto flex items-center gap-4 text-lg">
          <span title="Lives" aria-label={`${lives} lives left`}>
            {Array.from({ length: BOSS_LIVES }, (_, k) => (k < lives ? '❤️' : '🖤')).join(' ')}
          </span>
          <span className="text-slate-300">
            {i + 1} / {total}
          </span>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>{bossPhase(i, total)}</span>
          <span>Storm strength {Math.round(hp)}%</span>
        </div>
        <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-700">
          <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${hp}%` }} />
        </div>
      </div>
      {q && <ArcadeQ key={`${q.id}-${i}`} q={q} wrongMode="button" onResolve={onResolve} onNext={next} />}
    </div>
  );
}
