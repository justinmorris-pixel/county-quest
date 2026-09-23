import { useMemo, useRef, useState } from 'react';
import ArcadeQ from './ArcadeQ.jsx';
import { Button, Card, Confetti } from './ui.jsx';
import { BADGES } from '../lib/game.js';
import { DAILY_LEN, dailySet } from '../lib/arcade.js';
import { sfx } from '../lib/sound.js';

const prettyDate = (d) => {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
};
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Ten questions, the same for the whole class today. One try per day.
export default function DailyChallenge({ date: dateNow, daily, streakNow, onFinish, onExit, onBoard }) {
  const date = useRef(dateNow).current; // frozen so the questions don't change if midnight passes mid-game
  const doneToday = daily.lastDate === date;
  const questions = useMemo(() => dailySet(date), [date]);
  const [phase, setPhase] = useState(doneToday ? 'done' : 'intro'); // intro | play | result | done
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const answered = useRef(0);
  const scoreRef = useRef(0);
  const startedAt = useRef(0);

  function start() {
    scoreRef.current = 0;
    answered.current = 0;
    setLeaving(false);
    setScore(0);
    setI(0);
    startedAt.current = Date.now();
    setPhase('play');
  }

  function finish() {
    const seconds = Math.round((Date.now() - startedAt.current) / 1000);
    const ev = onFinish({ score: scoreRef.current, seconds, date });
    setResult({ score: scoreRef.current, seconds, ...ev });
    setPhase('result');
    if (scoreRef.current >= 8) sfx.fanfare();
  }

  // Leaving part-way ends today's try (unanswered questions count as missed), so the answers can't be used for a second go.
  function leave() {
    if (answered.current > 0) finish();
    else onExit();
  }

  function onResolve(correct) {
    answered.current += 1;
    if (correct) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
  }

  function next() {
    if (i + 1 >= DAILY_LEN) finish();
    else setI(i + 1);
  }

  const streakBlock = (n) =>
    n > 0 && (
      <p className="font-display mt-2 text-xl text-orange-300">
        🔥 {n}-day Daily streak{n >= 7 ? ' — legend!' : n >= 3 ? ' — keep it going!' : ''}
      </p>
    );

  if (phase === 'intro') {
    return (
      <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-4 p-4">
        <Card className="pop text-center">
          <div className="text-6xl">📅</div>
          <h1 className="font-display mt-2 text-4xl font-semibold text-amber-300">Daily Challenge</h1>
          <p className="text-slate-400">{prettyDate(date)}</p>
          <p className="mx-auto mt-3 max-w-xl text-lg text-slate-200">
            <b className="text-white">{DAILY_LEN} questions</b>, the same for everyone in your class today. You only get one try, so make it count. It
            mixes tapping the map, multiple choice, and typing.
          </p>
          <p className="mt-2 text-slate-300">
            It covers the whole state, so you may see counties you have not learned yet. That is fine: every miss shows you the right answer.
          </p>
          {streakBlock(streakNow)}
          {streakNow === 0 && <p className="mt-2 text-slate-300">Finish one every day to build a streak and earn bonus XP.</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button color="slate" onClick={onExit}>
              ← Back
            </Button>
            {onBoard && (
              <Button color="sky" onClick={() => onBoard('daily')}>
                🏆 Leaderboard
              </Button>
            )}
            <Button big color="green" onClick={start}>
              Start today's challenge
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="mx-auto grid min-h-full max-w-xl place-items-center p-4">
        <Card className="pop w-full text-center">
          <div className="text-6xl">✅</div>
          <h1 className="font-display mt-2 text-3xl font-semibold">You finished today's challenge</h1>
          <p className="font-display mt-3 text-6xl font-bold text-amber-300">
            {daily.lastScore}
            <span className="text-3xl text-slate-400"> / {DAILY_LEN}</span>
          </p>
          {streakBlock(streakNow)}
          <p className="mt-3 text-slate-300">A brand new set of questions appears tomorrow.</p>
          <div className="mt-5 flex flex-col gap-2">
            {onBoard && (
              <Button color="sky" onClick={() => onBoard('daily')}>
                🏆 See today's leaderboard
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

  if (phase === 'result' && result) {
    const perfect = result.score >= DAILY_LEN;
    return (
      <div className="mx-auto grid min-h-full max-w-xl place-items-center p-4">
        <Confetti burst={result.score >= 8 ? 1 : 0} />
        <Card className="pop w-full text-center">
          <div className="text-6xl">{perfect ? '💯' : result.score >= 7 ? '🌟' : '📅'}</div>
          <h1 className="font-display mt-2 text-3xl font-semibold">{perfect ? 'Perfect day!' : 'Daily Challenge complete'}</h1>
          <p className="font-display mt-3 text-6xl font-bold text-amber-300">
            {result.score}
            <span className="text-3xl text-slate-400"> / {DAILY_LEN}</span>
          </p>
          <p className="text-slate-300">
            {fmt(result.seconds)} · +{result.xp} XP
          </p>
          {streakBlock(result.streak)}
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
          <p className="mt-3 text-sm text-slate-400">Come back tomorrow for a new set.</p>
          <div className="mt-5 flex flex-col gap-2">
            {onBoard && (
              <Button color="sky" onClick={() => onBoard('daily')}>
                🏆 See today's leaderboard
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

  const q = questions[i];
  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-3 p-3 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        {!leaving ? (
          <Button color="slate" onClick={() => setLeaving(true)}>
            Quit
          </Button>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl bg-slate-800 px-3 py-1.5 text-sm">
            <span>Leave? Today's try will end.</span>
            <Button color="orange" onClick={leave}>
              Leave
            </Button>
            <Button color="slate" onClick={() => setLeaving(false)}>
              Stay
            </Button>
          </div>
        )}
        <div className="font-display text-2xl font-semibold text-amber-300">📅 Daily Challenge</div>
        <div className="font-display ml-auto flex items-center gap-4 text-lg">
          <span className="text-slate-300">
            {i + 1} / {DAILY_LEN}
          </span>
          <span className="text-emerald-300">✔ {score}</span>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-700">
        <div className="h-full bg-emerald-400 transition-all" style={{ width: `${(i / DAILY_LEN) * 100}%` }} />
      </div>
      <ArcadeQ key={`${q.id}-${i}`} q={q} wrongMode="button" onResolve={onResolve} onNext={next} />
    </div>
  );
}
