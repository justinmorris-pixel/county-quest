import { useState } from 'react';
import OklahomaMap from './OklahomaMap.jsx';
import { Button, Card, masteryStyle } from './ui.jsx';
import { currentSeatStage, currentStage, phaseOf } from '../lib/game.js';
import { STAGES, N_STAGES } from '../lib/stages.js';

// A free-look map for studying. Tap a county to see its name (and seat once seats are unlocked).
export default function StudyMap({ state, onBack }) {
  const [sel, setSel] = useState(null);
  const [labels, setLabels] = useState(false);
  const phase = phaseOf(state);
  const top = phase === 'counties' ? currentStage(state) : N_STAGES;
  const seatsOpen = phase === 'seats' || phase === 'done';
  const seatTop = seatsOpen ? currentSeatStage(state) : 0;

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-3 p-3 sm:p-5">
      <div className="flex items-center gap-3">
        <Button color="slate" onClick={onBack}>
          ← Back
        </Button>
        <h1 className="font-display text-2xl font-semibold">Study Map</h1>
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} /> Show names
        </label>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="p-2 sm:p-3">
          <OklahomaMap
            styleFor={(c) => ({ ...masteryStyle({ counties: {}, seats: {} }, 'county', c, top), opacity: c.stage <= top ? 0.9 : 0.4 })}
            clickable={(c) => c.stage <= top}
            onCountyClick={(c) => setSel(c)}
            marks={sel ? { [sel.name]: 'target' } : {}}
            labelFor={(c) => (labels && c.stage <= top ? c.name : null)}
          />
        </Card>
        <Card>
          {sel ? (
            <div className="pop">
              <div className="text-sm text-slate-400">{STAGES[sel.stage - 1].name}</div>
              <h2 className="font-display text-3xl font-semibold">{sel.name} County</h2>
              {seatsOpen && sel.stage <= seatTop ? (
                <p className="mt-2 text-lg">
                  County seat: <b className="text-amber-300">{sel.seat}</b>
                </p>
              ) : (
                <p className="mt-2 text-slate-400">County seats unlock after the Full Map Challenge.</p>
              )}
            </div>
          ) : (
            <p className="text-slate-300">Tap any unlocked county to see its name.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
