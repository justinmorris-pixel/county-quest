import OklahomaMap from './OklahomaMap.jsx';
import { Button, Card, masteryStyle } from './ui.jsx';
import { countiesInStage, STAGES } from '../lib/stages.js';
import { currentSeatStage, currentStage } from '../lib/game.js';

// Shown before a new group of 7 counties (or their county seats) is practiced.
export default function StageIntro({ state, kind, onStart, onBack }) {
  const isCounty = kind === 'county';
  const n = isCounty ? currentStage(state) : currentSeatStage(state);
  const stage = STAGES[n - 1];
  const list = countiesInStage(n);
  const names = list.map((c) => c.name);

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-4 p-3 sm:p-5">
      <div className="flex items-center gap-3">
        <Button color="slate" onClick={onBack}>
          ← Back
        </Button>
        <div className="text-sm font-semibold tracking-widest text-slate-400 uppercase">
          {isCounty ? 'New counties unlocked' : 'New county seats to learn'}
        </div>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_380px]">
        <Card className="p-2 sm:p-3">
          <OklahomaMap
            focus={names}
            styleFor={(c) => {
              if (c.stage === n) return { fill: stage.color, opacity: 1 };
              if (c.stage < n) return { fill: STAGES[c.stage - 1].color, opacity: 0.25 };
              return { fill: '#1e293b', opacity: 0.5 };
            }}
            labelFor={(c) => (c.stage === n ? (isCounty ? c.name : c.seat) : null)}
          />
        </Card>
        <Card className="pop">
          <div className="text-4xl">{stage.emoji}</div>
          <h1 className="font-display mt-1 text-3xl font-semibold" style={{ color: stage.color }}>
            Stage {n}: {stage.name}
          </h1>
          <p className="mt-1 text-slate-300">{stage.tag}</p>
          <ul className="mt-4 grid gap-1.5">
            {list.map((c) => (
              <li key={c.name} className="flex items-center gap-3 rounded-xl bg-slate-900/60 px-3 py-2">
                <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: stage.color }} />
                <span className="font-display text-lg font-semibold">{c.name} County</span>
                {!isCounty && <span className="ml-auto text-slate-300">→ {c.seat}</span>}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-400">
            {isCounty
              ? 'Study where each one sits on the map. You will get 3 right answers for each county to master it.'
              : 'Study each county and its seat. You will pick the seat first, then type it from memory.'}
          </p>
          <Button big color="green" className="mt-4 w-full" onClick={onStart}>
            I'm ready — let's go!
          </Button>
        </Card>
      </div>
    </div>
  );
}
