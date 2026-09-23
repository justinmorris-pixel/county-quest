import { useState } from 'react';
import { Button, Card } from './ui.jsx';
import OklahomaMap from './OklahomaMap.jsx';
import { STAGES } from '../lib/stages.js';
import { hasBackend } from '../lib/supabase.js';

const PIN_INPUT =
  'font-display w-full rounded-2xl border-2 border-slate-600 bg-slate-900 px-4 py-3 text-center text-3xl tracking-[0.6em] outline-none focus:border-orange-400';

const onlyDigits = (v) => v.replace(/\D/g, '').slice(0, 4);

export default function Join({ initialCode = '', onCheck, onJoin }) {
  const [step, setStep] = useState('who'); // who -> create | enter
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState('');
  const [found, setFound] = useState(null); // { status, name, class_name }
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fail = (msg) => {
    setError(msg);
    setBusy(false);
  };

  // Step 1: name + class code
  async function submitWho(e) {
    e.preventDefault();
    setError('');
    const cleanName = name.trim().replace(/\s+/g, ' ');
    if (cleanName.length < 2) return fail('Please enter your first name and last initial.');
    if (!hasBackend) {
      // practice mode has no classes or PINs
      setBusy(true);
      try {
        await onJoin('', cleanName, '');
      } catch (err) {
        fail(err.message);
      }
      return;
    }
    if (code.trim().length < 4) return fail('Please enter your class code.');
    setBusy(true);
    try {
      const info = await onCheck(code.trim().toUpperCase(), cleanName);
      setFound(info);
      setPin('');
      setPin2('');
      setStep(info.status === 'has_pin' ? 'enter' : 'create');
      setBusy(false);
    } catch (err) {
      fail(err.message || 'Something went wrong. Try again.');
    }
  }

  // Step 2a: choose a new PIN
  async function submitCreate(e) {
    e.preventDefault();
    setError('');
    if (!/^\d{4}$/.test(pin)) return fail('Your PIN must be exactly 4 numbers.');
    if (pin !== pin2) return fail('The two PINs do not match. Try again.');
    setBusy(true);
    try {
      await onJoin(code.trim().toUpperCase(), found.name, pin);
    } catch (err) {
      fail(err.message || 'Something went wrong. Try again.');
    }
  }

  // Step 2b: enter the existing PIN
  async function submitEnter(e) {
    e.preventDefault();
    setError('');
    if (!/^\d{4}$/.test(pin)) return fail('Enter the 4 numbers of your PIN.');
    setBusy(true);
    try {
      const res = await onJoin(code.trim().toUpperCase(), found.name, pin);
      if (res && res.ok === false) {
        setPin('');
        if (res.error === 'LOCKED') {
          const mins = Math.max(1, Math.ceil((res.retry_after_seconds || 300) / 60));
          fail(`Too many wrong tries. This account is locked for about ${mins} minute${mins === 1 ? '' : 's'}. Or ask your teacher to reset your PIN.`);
        } else {
          fail(`That PIN is not right. ${res.attempts_left} ${res.attempts_left === 1 ? 'try' : 'tries'} left.`);
        }
      }
    } catch (err) {
      fail(err.message || 'Something went wrong. Try again.');
    }
  }

  function back() {
    setStep('who');
    setFound(null);
    setPin('');
    setPin2('');
    setError('');
    setBusy(false);
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
          <OklahomaMap interactive={false} styleFor={(c) => ({ fill: STAGES[c.stage - 1].color, opacity: 0.9 })} />
        </Card>
      </div>

      <Card className="pop" key={step}>
        {step === 'who' && (
          <form onSubmit={submitWho} className="grid gap-4">
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
              {busy ? 'Checking…' : hasBackend ? 'Next' : 'Play'}
            </Button>
            {hasBackend ? (
              <p className="text-sm text-slate-400">
                If someone in your class has the same name, add a number, like <b>Jordan M. 2</b>.
              </p>
            ) : (
              <p className="rounded-xl bg-amber-500/15 px-3 py-2 text-sm text-amber-200">
                Practice mode: this copy is not connected to a class, so progress stays on this device only.
              </p>
            )}
          </form>
        )}

        {step === 'create' && found && (
          <form onSubmit={submitCreate} className="grid gap-4">
            <div>
              <div className="text-4xl">🔐</div>
              <h2 className="font-display mt-1 text-2xl font-semibold">
                {found.status === 'needs_pin' ? `Set a new PIN, ${found.name}` : `Welcome, ${found.name}!`}
              </h2>
              <p className="mt-1 text-slate-300">
                {found.status === 'needs_pin'
                  ? 'Pick 4 numbers. You will use them every time you sign in.'
                  : `You are new to ${found.class_name}. Pick a 4-number PIN so nobody else can use your account.`}
              </p>
            </div>
            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-300">Choose a PIN</span>
              <input
                autoFocus
                value={pin}
                onChange={(e) => setPin(onlyDigits(e.target.value))}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoComplete="new-password"
                placeholder="••••"
                className={PIN_INPUT}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-300">Type it again</span>
              <input
                value={pin2}
                onChange={(e) => setPin2(onlyDigits(e.target.value))}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoComplete="new-password"
                placeholder="••••"
                className={PIN_INPUT}
              />
            </label>
            {error && <div className="rounded-xl bg-red-500/15 px-3 py-2 text-red-200">{error}</div>}
            <Button type="submit" big color="green" disabled={busy || pin.length < 4 || pin2.length < 4}>
              {busy ? 'Saving…' : 'Save PIN and play'}
            </Button>
            <p className="text-sm text-slate-400">Do not share your PIN. If you forget it, your teacher can reset it.</p>
            <button type="button" onClick={back} className="text-sm text-slate-400 underline">
              That's not my name — go back
            </button>
          </form>
        )}

        {step === 'enter' && found && (
          <form onSubmit={submitEnter} className="grid gap-4">
            <div>
              <div className="text-4xl">👋</div>
              <h2 className="font-display mt-1 text-2xl font-semibold">Welcome back, {found.name}!</h2>
              <p className="mt-1 text-slate-300">Enter your 4-number PIN.</p>
            </div>
            <input
              autoFocus
              value={pin}
              onChange={(e) => setPin(onlyDigits(e.target.value))}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoComplete="current-password"
              placeholder="••••"
              className={PIN_INPUT}
              aria-label="PIN"
            />
            {error && <div className="rounded-xl bg-red-500/15 px-3 py-2 text-red-200">{error}</div>}
            <Button type="submit" big color="orange" disabled={busy || pin.length < 4}>
              {busy ? 'Checking…' : 'Play'}
            </Button>
            <p className="text-sm text-slate-400">Forgot your PIN? Ask your teacher to reset it.</p>
            <button type="button" onClick={back} className="text-sm text-slate-400 underline">
              That's not my name — go back
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
