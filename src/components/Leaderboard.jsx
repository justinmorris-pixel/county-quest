import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from './ui.jsx';
import { todayStr } from '../lib/game.js';

const TABS = [
  { id: 'overall', label: '⭐ Overall', blurb: 'Total XP earned' },
  { id: 'speed', label: '⚡ Speed', blurb: 'Best Speed Round score' },
  { id: 'daily', label: '📅 Daily', blurb: "Today's Daily Challenge" },
  { id: 'boss', label: '🌪️ Boss', blurb: 'Furthest in the Boss Round' },
  { id: 'classes', label: '🏫 Class vs Class', blurb: 'How each class is doing' },
];

const METRICS = [
  { id: 'xp', label: 'Average XP' },
  { id: 'progress', label: 'Progress' },
  { id: 'daily', label: "Today's Daily" },
];

// Ranks classes against each other. Averages are per student, so a bigger class has no built-in edge.
function rankClasses(rows, metric) {
  const list = rows.map((r) => {
    const pct = r.students ? Math.round(((r.avg_counties + r.avg_seats) / 154) * 100) : 0;
    const dailyPct = r.students ? Math.round((r.daily_today / r.students) * 100) : 0;
    if (metric === 'xp') return { row: r, main: `${r.avg_xp.toLocaleString()} XP`, sub: `average per student · ${r.students} students · ${r.total_xp.toLocaleString()} total`, score: r.avg_xp };
    if (metric === 'progress') return { row: r, main: `${pct}%`, sub: `avg ${r.avg_counties} counties · ${r.avg_seats} seats mastered per student`, score: pct * 1000 + r.avg_counties };
    return { row: r, main: `${r.daily_today}/${r.students}`, sub: `${dailyPct}% of the class finished today's Daily Challenge`, score: dailyPct * 1000 + r.daily_today };
  });
  return list.sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name));
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const MEDAL = ['🥇', '🥈', '🥉'];

// Ranks rows for one tab. Returns [{ row, main, sub }] best first.
function rank(rows, tab, today, yesterday) {
  if (tab === 'overall') {
    return [...rows]
      .sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name))
      .map((r) => ({ row: r, main: `${r.xp.toLocaleString()} XP`, sub: `${r.counties}/77 counties · ${r.seats}/77 seats`, score: r.xp }));
  }
  if (tab === 'speed') {
    return rows
      .filter((r) => r.speed > 0)
      .sort((a, b) => b.speed - a.speed || b.speed_correct - a.speed_correct)
      .map((r) => ({ row: r, main: `${r.speed} pts`, sub: `${r.speed_correct} correct`, score: r.speed }));
  }
  if (tab === 'daily') {
    return rows
      .filter((r) => r.daily_date === today)
      .sort((a, b) => b.daily_score - a.daily_score || a.daily_seconds - b.daily_seconds)
      .map((r) => ({
        row: r,
        main: `${r.daily_score}/10`,
        sub: `${fmt(r.daily_seconds)}${r.daily_streak >= 2 && (r.daily_date === today || r.daily_date === yesterday) ? ` · 🔥 ${r.daily_streak}-day streak` : ''}`,
        score: r.daily_score * 100000 - r.daily_seconds,
      }));
  }
  return rows
    .filter((r) => r.boss > 0)
    .sort((a, b) => b.boss - a.boss || b.boss_wins - a.boss_wins)
    .map((r) => ({ row: r, main: `${r.boss}/77`, sub: r.boss_wins > 0 ? `🏆 beat it ${r.boss_wins}×` : 'still fighting', score: r.boss * 1000 + r.boss_wins }));
}

export default function Leaderboard({ fetchBoard, fetchClasses, initialTab = 'overall', arcadeOpen, onBack, onPlay }) {
  const [tab, setTab] = useState(initialTab);
  const [rows, setRows] = useState(null);
  const [classRows, setClassRows] = useState(null);
  const [classFail, setClassFail] = useState(false);
  const [metric, setMetric] = useState('xp');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // The class comparison loads separately so a problem there never hides the main board.
      const [r, c] = await Promise.all([fetchBoard(), fetchClasses ? fetchClasses().catch(() => 'fail') : Promise.resolve([])]);
      setRows(r);
      setClassFail(c === 'fail');
      setClassRows(c === 'fail' ? null : c);
    } catch (e) {
      setError(e.message || 'Could not load the leaderboard.');
    }
    setLoading(false);
  }, [fetchBoard, fetchClasses]);

  useEffect(() => {
    load();
  }, [load]);

  const today = todayStr();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const isClasses = tab === 'classes';
  const list = isClasses ? (classRows ? rankClasses(classRows, metric) : []) : rows ? rank(rows, tab, today, todayStr(y)) : [];
  const me = list.findIndex((x) => x.row.me);
  const loaded = isClasses ? classRows !== null || classFail : rows !== null;
  const cur = TABS.find((t) => t.id === tab);
  const shown = list.slice(0, 20);
  const meOutside = me >= 20 ? list[me] : null;

  // Ties share a place.
  const place = (i) => {
    let p = i;
    while (p > 0 && list[p - 1].score === list[i].score) p -= 1;
    return p;
  };

  const row = (x, i) => {
    const p = place(i);
    return (
      <div
        key={`${x.row.name}-${i}`}
        className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${x.row.me ? 'bg-orange-500/20 ring-2 ring-orange-400' : 'bg-slate-900/50'}`}
      >
        <div className="font-display w-9 text-center text-xl font-semibold text-slate-300">{p < 3 ? MEDAL[p] : p + 1}</div>
        <div className="min-w-0 flex-1">
          <div className="font-display truncate text-lg font-semibold">
            {x.row.name}
            {x.row.me && <span className="ml-2 rounded-full bg-orange-500 px-2 py-0.5 text-xs">{isClasses ? 'your class' : 'you'}</span>}
          </div>
          <div className={`text-xs text-slate-400 ${isClasses ? '' : 'truncate'}`}>{x.sub}</div>
        </div>
        <div className="font-display text-xl font-semibold text-amber-300">{x.main}</div>
      </div>
    );
  };

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-3 p-3 sm:p-5">
      <div className="flex items-center gap-3">
        <Button color="slate" onClick={onBack}>
          ← Back
        </Button>
        <h1 className="font-display text-3xl font-semibold">🏆 Class Leaderboard</h1>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`font-display shrink-0 rounded-2xl border-b-4 px-4 py-2 text-base font-semibold transition ${
              tab === t.id ? 'border-orange-700 bg-orange-500' : 'border-slate-900 bg-slate-700 hover:bg-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="pop" key={tab}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm text-slate-400">{cur.blurb}</div>
          <button className="rounded-lg bg-slate-700 px-3 py-1 text-sm hover:bg-slate-600" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>

        {isClasses && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {METRICS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${metric === m.id ? 'bg-sky-500' : 'bg-slate-700 hover:bg-slate-600'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
        {error && <div className="rounded-xl bg-red-500/15 px-3 py-2 text-red-200">{error}</div>}
        {!error && !loaded && <p className="py-6 text-center text-slate-400">Loading…</p>}
        {!error && isClasses && classFail && (
          <p className="py-6 text-center text-slate-300">Class vs Class is not available right now. Try again in a bit.</p>
        )}
        {!error && loaded && !(isClasses && classFail) && shown.length === 0 && (
          <div className="py-6 text-center text-slate-300">
            <div className="text-4xl">{cur.label.split(' ')[0]}</div>
            <p className="mt-2">
              {tab === 'daily' ? 'Nobody has finished today’s Daily Challenge yet. Be the first!' : tab === 'overall' ? 'No one is on the board yet.' : isClasses ? 'No classes to compare yet.' : 'No scores yet. Be the first on the board!'}
            </p>
            {(tab === 'daily' || (arcadeOpen && (tab === 'speed' || tab === 'boss'))) && (
              <Button color="green" className="mt-3" onClick={() => onPlay(tab)}>
                Play now
              </Button>
            )}
          </div>
        )}

        <div className="grid gap-2">
          {shown.map(row)}
          {meOutside && (
            <>
              <div className="text-center text-slate-500">⋮</div>
              {row(meOutside, me)}
            </>
          )}
        </div>

        {isClasses && classRows && classRows.length === 1 && (
          <p className="mt-3 rounded-xl bg-slate-900/60 px-3 py-2 text-center text-sm text-slate-300">
            Only one class is set up so far. When your teacher adds more, they will show up here to compete.
          </p>
        )}
        {(tab === 'speed' || tab === 'boss') && !arcadeOpen && (
          <p className="mt-3 rounded-xl bg-slate-900/60 px-3 py-2 text-center text-sm text-slate-300">
            🔒 The Speed Round and Boss Round unlock when you master every county and county seat. Then you can climb this board.
          </p>
        )}
        {(tab === 'daily' || (arcadeOpen && (tab === 'speed' || tab === 'boss'))) && shown.length > 0 && (
          <div className="mt-4 text-center">
            <Button color="green" onClick={() => onPlay(tab)}>
              {tab === 'speed' ? '⚡ Play Speed Round' : tab === 'daily' ? '📅 Play Daily Challenge' : '🌪️ Face the Boss'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
