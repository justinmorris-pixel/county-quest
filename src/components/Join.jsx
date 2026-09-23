import { useState } from 'react';
import { Button, Card } from './ui.jsx';
import OklahomaMap from './OklahomaMap.jsx';
import { STAGES } from '../lib/stages.js';
import { hasBackend } from '../lib/supabase.js';

export default function Join({ initialCode = '', onJoin }) {
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) return setError('Please enter your first name and last initial.');
    if (hasBackend && code.trim().length < 4) return setError('Please enter your class code.');
    setBusy(true);
    try {
      await onJoin(code.trim().toUpperCase(), name.trim().replace(/\s+/g, ' '));
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-full max-w-5xl items-center gap-6 p-4 lg:grid-cols-2">
      <div className="pop">
        <div className="font-display text-sm font-semibold tracking-widest text-orange-400 uppercase">Oklahoma History</div>
        <h1 className="font-display mt-1 text-5xl leading-none font-bold sm:text-6xl">
          County <span className="text-orange-400">Quest</span>
        </h1>
        <p className="mt-4 max-w-md text-lg text-slate-300">
          Learn all 77 Oklahoma counties, one region at a time. Fill in the whole map, then prove you know every county seat.
        </p>
        <Card className="mt-6 p-2">
          <OklahomaMap
            interactive={false}
            styleFor={(c) => ({ fill: STAGES[c.stage - 1].color, opacity: 0.9 })}
          />
        </Card>
      </div>

      <Card className="pop">
        <form onSubmit={submit} className="grid gap-4">
          <h2 className="font-display text-2xl font-semibold">Let's play!</h2>
          {hasBackend && (
            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-300">Class code</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={8}
                autoCapitalize="characters"
                autoComplete="off"
                placeholder="ABC123"
                className="font-display rounded-2xl border-2 border-slate-600 bg-slate-900 px-4 py-3 text-2xl tracking-widest outline-none focus:border-orange-400"
              />
            </label>
          )}
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-300">First name and last initial</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              autoComplete="off"
              placeholder="Jordan M."
              className="font-display rounded-2xl border-2 border-slate-600 bg-slate-900 px-4 py-3 text-2xl outline-none focus:border-orange-400"
            />
          </label>
          {error && <div className="rounded-xl bg-red-500/15 px-3 py-2 text-red-200">{error}</div>}
          <Button type="submit" big color="orange" disabled={busy}>
            {busy ? 'Loading…' : 'Play'}
          </Button>
          <p className="text-sm text-slate-400">
            Use the same name every time so your progress is saved and your teacher can see it.
          </p>
          {!hasBackend && (
            <p className="rounded-xl bg-amber-500/15 px-3 py-2 text-sm text-amber-200">
              Practice mode: this copy is not connected to a class, so progress stays on this device only.
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}
