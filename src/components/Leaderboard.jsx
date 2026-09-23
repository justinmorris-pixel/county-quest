import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from './ui.jsx';
import { todayStr } from '../lib/game.js';

const TABS = [
  { id: 'overall', label: '⭐ Overall', blurb: 'Total XP earned' },
  { id: 'speed', label: '⚡ Speed', blurb: 'Best Speed Round score' },
  { id: 'daily', label: '📅 Daily', blurb: "Today's Daily Challenge" },
  { id: 'boss', label: '🌪️ Boss', blurb: 'Furthest in the Boss Round' },
];

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

export default function Leaderboard({ fetchBoard, initialTab = 'overall', arcadeOpen, onBack, onPlay }) {
  const [tab, setTab] = useState(initialTab);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await fetchBoard());
    } catch (e) {
      setError(e.message || 'Could not load the leaderboard.');
    }
    setLoading(false);
  }, [fetchBoard]);

  useEffect(() => {
    load();
  }, [load]);

  const today = todayStr();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const list = rows ? rank(rows, tab, today, todayStr(y)) : [];
  const me = list.findIndex((x) => x.row.me);
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
            {x.row.me && <span className="ml-2 rounded-full bg-orange-500 px-2 py-0.5 text-xs">you</span>}
          </div>
          <div className="truncate text-xs text-slate-400">{x.sub}</div>
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

        {error && <div className="rounded-xl bg-red-500/15 px-3 py-2 text-red-200">{error}</div>}
        {!error && rows === null && <p className="py-6 text-center text-slate-400">Loading…</p>}
        {!error && rows !== null && shown.length === 0 && (
          <div className="py-6 text-center text-slate-300">
            <div className="text-4xl">{cur.label.split(' ')[0]}</div>
            <p className="mt-2">
              {tab === 'daily' ? 'Nobody has finished today’s Daily Challenge yet. Be the first!' : tab === 'overall' ? 'No one is on the board yet.' : 'No scores yet. Be the first on the board!'}
            </p>
            {tab !== 'overall' && arcadeOpen && (
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

        {tab !== 'overall' && !arcadeOpen && (
          <p className="mt-3 rounded-xl bg-slate-900/60 px-3 py-2 text-center text-sm text-slate-300">
            🔒 The arcade unlocks when you master every county and county seat. Then you can climb this board.
          </p>
        )}
        {tab !== 'overall' && arcadeOpen && shown.length > 0 && (
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
