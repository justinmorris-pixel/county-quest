import OklahomaMap from './OklahomaMap.jsx';
import { Button, Card, StagePips, masteryStyle } from './ui.jsx';
import { COUNTIES } from '../data/counties.js';
import { STAGES, N_STAGES } from '../lib/stages.js';
import {
  BADGES,
  COUNTY_MASTER,
  countiesMastered,
  currentSeatStage,
  currentStage,
  lvlOf,
  nextRank,
  phaseOf,
  rankOf,
  seatsMastered,
} from '../lib/game.js';
import { isSoundOn, setSoundOn } from '../lib/sound.js';
import { useState } from 'react';

const SYNC_LABEL = {
  saved: '☁️ Saved',
  saving: '☁️ Saving…',
  offline: '⚠️ Offline — will retry',
  local: '💾 This device only',
};

export default function Hub({ state, student, sync, go, onSignOut }) {
  const [sound, setSound] = useState(isSoundOn());
  const phase = phaseOf(state);
  const cm = countiesMastered(state);
  const sm = seatsMastered(state);
  const rank = rankOf(state);
  const nr = nextRank(state);
  const stage = STAGES[currentStage(state) - 1];
  const seatStage = STAGES[currentSeatStage(state) - 1];
  const weak = COUNTIES.filter((c) => lvlOf(state, 'county', c.name) < COUNTY_MASTER).length;
  const accuracy = state.answers ? Math.round((state.correct / state.answers) * 100) : null;

  const top = phase === 'counties' ? currentStage(state) : N_STAGES;

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-4 p-3 sm:p-5">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500 font-display text-2xl font-bold">
          {student.name.trim()[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 basis-40">
          <div className="font-display truncate text-xl font-semibold">{student.name}</div>
          <div className="text-sm text-slate-300">
            {rank.title}
            {nr && <span className="hidden text-slate-500 sm:inline"> · next: {nr.title} at {nr.at} counties</span>}
          </div>
        </div>
        <div className="font-display flex w-full items-center justify-between gap-4 text-lg sm:w-auto sm:justify-start">
          <span title="Day streak" className="text-orange-400">🔥 {state.dayStreak}</span>
          <span title="XP" className="text-amber-300">⭐ {state.xp}</span>
          <button
            type="button"
            aria-label="Toggle sound"
            className="rounded-lg bg-slate-800 px-2.5 py-1 text-base"
            onClick={() => {
              setSoundOn(!sound);
              setSound(!sound);
            }}
          >
            {sound ? '🔊' : '🔇'}
          </button>
          <button type="button" className="rounded-lg bg-slate-800 px-3 py-1 text-sm text-slate-300" onClick={onSignOut}>
            Switch player
          </button>
        </div>
      </div>
      <div className="-mt-2 text-xs text-slate-500">{SYNC_LABEL[sync] || ''}</div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_400px]">
        {/* map + main action */}
        <div className="flex flex-col gap-4">
          <Card className="pop border-2" style={{}}>
            {phase === 'counties' && (
              <>
                <div className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Up next</div>
                <h2 className="font-display text-3xl font-semibold" style={{ color: stage.color }}>
                  {stage.emoji} Stage {currentStage(state)}: {stage.name}
                </h2>
                <p className="text-slate-300">{stage.tag}</p>
                <div className="mt-3">
                  <StagePips state={state} kind="county" stage={currentStage(state)} />
                </div>
                <Button big className="mt-4 w-full sm:w-auto" onClick={() => go('countyStart')}>
                  {state.introduced < currentStage(state) ? '▶ Start Stage' : '▶ Continue'}
                </Button>
              </>
            )}
            {phase === 'map' && (
              <>
                <h2 className="font-display text-3xl font-semibold text-amber-300">🗺️ The Full Map Challenge</h2>
                <p className="mt-1 text-slate-300">
                  You know all 77 counties. Now fill in the entire blank map from memory to unlock the county seats.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button big color="green" onClick={() => go('map')}>
                    ▶ Start Challenge
                  </Button>
                  {weak > 0 && (
                    <Button big color="sky" onClick={() => go('practice')}>
                      Practice weak spots ({weak})
                    </Button>
                  )}
                </div>
              </>
            )}
            {phase === 'seats' && (
              <>
                <div className="text-xs font-semibold tracking-widest text-slate-400 uppercase">County Seats</div>
                <h2 className="font-display text-3xl font-semibold" style={{ color: seatStage.color }}>
                  {seatStage.emoji} Stage {currentSeatStage(state)}: {seatStage.name}
                </h2>
                <div className="mt-3">
                  <StagePips state={state} kind="seat" stage={currentSeatStage(state)} />
                </div>
                <Button big className="mt-4" onClick={() => go('seatStart')}>
                  {state.seatIntroduced < currentSeatStage(state) ? '▶ Start Stage' : '▶ Continue'}
                </Button>
              </>
            )}
            {phase === 'done' && (
              <>
                <div className="text-5xl">🎓</div>
                <h2 className="font-display mt-1 text-3xl font-semibold text-amber-300">You did it — Oklahoma Legend!</h2>
                <p className="mt-1 text-slate-300">All 77 counties and all 77 county seats mastered.</p>
                <Button big color="green" className="mt-4" onClick={() => go('cert')}>
                  🏅 View my certificate
                </Button>
              </>
            )}
          </Card>

          <Card className="p-2 sm:p-3">
            <OklahomaMap
              interactive={false}
              styleFor={(c) => masteryStyle(state, phase === 'seats' || phase === 'done' ? 'seat' : 'county', c, top)}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-slate-300">
              <span>
                <b className="text-white">{cm}</b>/77 counties · <b className="text-white">{sm}</b>/77 seats
                {accuracy !== null && <span> · {accuracy}% accuracy</span>}
              </span>
              <Button color="slate" onClick={() => go('study')}>
                🔍 Study map
              </Button>
            </div>
          </Card>
        </div>

        {/* path */}
        <div className="flex flex-col gap-4">
          <Card>
            <h3 className="font-display mb-3 text-lg font-semibold">County Path</h3>
            <div className="grid gap-2">
              {STAGES.map((s) => {
                const cleared = state.stagesCleared >= s.n;
                const current = phase === 'counties' && currentStage(state) === s.n;
                const locked = !cleared && !current;
                return (
                  <div
                    key={s.n}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${current ? 'bg-slate-700 ring-2' : 'bg-slate-900/50'} ${locked ? 'opacity-45' : ''}`}
                    style={current ? { '--tw-ring-color': s.color } : {}}
                  >
                    <div className="text-2xl">{locked ? '🔒' : s.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display truncate font-semibold">
                        {s.n}. {s.name}
                      </div>
                      {!locked && <StagePips state={state} kind="county" stage={s.n} />}
                    </div>
                    {cleared && <span className="text-emerald-400">✓</span>}
                  </div>
                );
              })}
              <div
                className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${phase === 'map' ? 'bg-slate-700 ring-2 ring-amber-300' : 'bg-slate-900/50'} ${
                  phase === 'counties' ? 'opacity-45' : ''
                }`}
              >
                <div className="text-2xl">{phase === 'counties' ? '🔒' : '🏆'}</div>
                <div className="font-display flex-1 font-semibold">Full Map Challenge</div>
                {state.map.passed ? (
                  <span className="text-emerald-400">✓ {state.map.best}/77</span>
                ) : (
                  state.map.attempts > 0 && <span className="text-sm text-slate-400">best {state.map.best}/77</span>
                )}
              </div>
              <div
                className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${phase === 'seats' ? 'bg-slate-700 ring-2 ring-sky-300' : 'bg-slate-900/50'} ${
                  phase === 'counties' || phase === 'map' ? 'opacity-45' : ''
                }`}
              >
                <div className="text-2xl">{phase === 'counties' || phase === 'map' ? '🔒' : '🏛️'}</div>
                <div className="font-display flex-1 font-semibold">County Seats</div>
                <span className="text-sm text-slate-400">{sm}/77</span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-display mb-2 text-lg font-semibold">Badges</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(BADGES).map(([id, b]) => {
                const got = state.badges.includes(id);
                return (
                  <div
                    key={id}
                    title={`${b.name}: ${b.desc}`}
                    className={`grid h-11 w-11 place-items-center rounded-xl text-2xl ${got ? 'bg-slate-700' : 'bg-slate-900/60 opacity-30 grayscale'}`}
                  >
                    {b.emoji}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
