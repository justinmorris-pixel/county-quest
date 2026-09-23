import { useState } from 'react';
import { Button, Card } from '../ui.jsx';
import { supabase } from '../../lib/supabase.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    setBusy(false);
  }

  return (
    <div className="mx-auto grid min-h-full max-w-md place-items-center p-4">
      <Card className="w-full">
        <h1 className="font-display text-3xl font-semibold">Teacher Login</h1>
        <p className="mt-1 text-slate-400">County Quest dashboard</p>
        <form onSubmit={submit} className="mt-5 grid gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="username"
            className="rounded-2xl border-2 border-slate-600 bg-slate-900 px-4 py-3 text-lg outline-none focus:border-orange-400"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="rounded-2xl border-2 border-slate-600 bg-slate-900 px-4 py-3 text-lg outline-none focus:border-orange-400"
          />
          {error && <div className="rounded-xl bg-red-500/15 px-3 py-2 text-red-200">{error}</div>}
          <Button type="submit" big disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <a href="#/" className="mt-4 block text-center text-sm text-slate-400 underline">
          Go to the student game
        </a>
      </Card>
    </div>
  );
}
