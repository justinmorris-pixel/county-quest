import OklahomaMap from './OklahomaMap.jsx';
import { Button } from './ui.jsx';
import { STAGES } from '../lib/stages.js';

export default function Certificate({ name, className, onBack }) {
  const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-4 p-4">
      <div className="no-print flex gap-3">
        <Button color="slate" onClick={onBack}>
          ← Back
        </Button>
        <Button color="green" onClick={() => window.print()}>
          🖨️ Print
        </Button>
      </div>
      <div className="rounded-3xl border-8 border-double border-amber-400 bg-white p-8 text-center text-slate-900">
        <div className="font-display text-sm font-semibold tracking-[0.3em] text-amber-600 uppercase">Certificate of Mastery</div>
        <h1 className="font-display mt-2 text-4xl font-bold sm:text-5xl">Oklahoma County Quest</h1>
        <p className="mt-4 text-lg">This certifies that</p>
        <p className="font-display my-2 text-4xl font-bold text-orange-600 sm:text-5xl">{name}</p>
        <p className="mx-auto max-w-lg text-lg">
          can identify all <b>77 counties</b> of Oklahoma on a blank map and name every <b>county seat</b>.
        </p>
        <div className="mx-auto my-5 max-w-md">
          <OklahomaMap interactive={false} styleFor={(c) => ({ fill: STAGES[c.stage - 1].color, opacity: 1, stroke: '#ffffff' })} />
        </div>
        <p className="text-slate-600">
          {className ? `${className} · ` : ''}
          {date}
        </p>
      </div>
    </div>
  );
}
