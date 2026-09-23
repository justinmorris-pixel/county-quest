import { useEffect, useState } from 'react';
import Login from './Login.jsx';
import Dashboard from './Dashboard.jsx';
import { hasBackend, supabase } from '../../lib/supabase.js';
import { Card } from '../ui.jsx';

export default function Teacher() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    if (!hasBackend) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!hasBackend)
    return (
      <div className="mx-auto max-w-xl p-6">
        <Card>
          <h1 className="font-display text-2xl font-semibold">Database not connected</h1>
          <p className="mt-2 text-slate-300">
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in Vercel (Settings → Environment
            Variables), then redeploy. See the README for the exact steps.
          </p>
        </Card>
      </div>
    );
  if (session === undefined) return <div className="grid h-full place-items-center text-slate-400">Loading…</div>;
  if (!session) return <Login />;
  return <Dashboard user={session.user} />;
}
