import { useEffect, useMemo } from 'react';
import { COUNTIES } from '../data/counties.js';
import { STAGES, COUNTY_BY_NAME } from '../lib/stages.js';
import { COUNTY_MASTER, SEAT_MASTER, lvlOf } from '../lib/game.js';

export function Button({ children, onClick, color = 'orange', big = false, disabled = false, className = '', type = 'button' }) {
  const colors = {
    orange: 'bg-orange-500 hover:bg-orange-400 border-orange-700 text-white',
    green: 'bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white',
    slate: 'bg-slate-700 hover:bg-slate-600 border-slate-900 text-white',
    sky: 'bg-sky-500 hover:bg-sky-400 border-sky-700 text-white',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`font-display rounded-2xl border-b-4 font-semibold tracking-wide transition active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        big ? 'px-8 py-4 text-xl' : 'px-5 py-2.5 text-base'
      } ${colors[color]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-3xl border border-slate-700/70 bg-slate-800/70 p-5 shadow-xl ${className}`}>{children}</div>;
}

export function Confetti({ burst }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        color: ['#f97316', '#38bdf8', '#facc15', '#22c55e', '#f43f5e', '#a78bfa'][i % 6],
        dur: 2 + Math.random() * 1.5,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [burst]
  );
  if (!burst) return null;
  return (
    <>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }}
        />
      ))}
    </>
  );
}

// Fill style for a county based on stage color and mastery level.
export function masteryStyle(state, kind, c, unlockedTop) {
  if (c.stage > unlockedTop) return { fill: '#2b3854', opacity: 0.75 };
  const max = kind === 'county' ? COUNTY_MASTER : SEAT_MASTER;
  const lvl = lvlOf(state, kind, c.name);
  const color = STAGES[c.stage - 1].color;
  const opacity = [0.32, 0.55, 0.78, 1][Math.min(3, Math.round((lvl / max) * 3))];
  return { fill: color, opacity };
}

// A row of pips: one per county in a stage, filled by mastery.
export function StagePips({ state, kind, stage }) {
  const max = kind === 'county' ? COUNTY_MASTER : SEAT_MASTER;
  const color = STAGES[stage - 1].color;
  const list = COUNTIES.filter((c) => c.stage === stage);
  return (
    <div className="flex gap-1.5">
      {list.map((c) => {
        const lvl = lvlOf(state, kind, c.name);
        return (
          <div key={c.name} title={c.name} className="h-2.5 w-7 overflow-hidden rounded-full bg-slate-700 sm:w-9">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(lvl / max) * 100}%`, background: color }} />
          </div>
        );
      })}
    </div>
  );
}

export function useKey(handler, deps = []) {
  useEffect(() => {
    const fn = (e) => handler(e);
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export const countySeatText = (name) => `${COUNTY_BY_NAME[name].seat}`;
