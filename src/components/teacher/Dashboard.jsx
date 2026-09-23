import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card } from '../ui.jsx';
import OklahomaMap from '../OklahomaMap.jsx';
import { supabase } from '../../lib/supabase.js';
import { COUNTIES } from '../../data/counties.js';
import { STAGES } from '../../lib/stages.js';
import { COUNTY_MASTER, SEAT_MASTER } from '../../lib/game.js';
import { load, save } from '../../lib/storage.js';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const makeCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

const fmtTime = (s) => {
  if (!s) return '—';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
};
const ago = (iso) => {
  if (!iso) return '—';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`;
  const d = Math.round(s / 86400);
  return d === 1 ? 'yesterday' : `${d} days ago`;
};
const daysSince = (iso) => (iso ? (Date.now() - new Date(iso).getTime()) / 86400000 : 999);

const normalize = (row) => {
  const p = (Array.isArray(row.progress) ? row.progress[0] : row.progress) || {};
  const st = p.state || {};
  const answers = p.total_answers || 0;
  const status = !answers
    ? 'Not started'
    : (p.stages_cleared || 0) < 11
    ? `Counties · Stage ${(p.stages_cleared || 0) + 1}/11`
    : !p.map_passed
    ? 'Full Map Challenge'
    : (p.seats_mastered || 0) < 77
    ? 'County Seats'
    : 'Complete ✓';
  const stateCat = !answers ? 0 : (p.stages_cleared || 0) < 11 ? 1 : !p.map_passed ? 2 : (p.seats_mastered || 0) < 77 ? 3 : 4;
  return {
    id: row.id,
    name: row.name,
    lastActive: row.last_active,
    createdAt: row.created_at,
    stages: p.stages_cleared || 0,
    counties: p.counties_mastered || 0,
    mapBest: p.map_best || 0,
    mapPassed: Boolean(p.map_passed),
    seats: p.seats_mastered || 0,
    answers,
    correct: p.total_correct || 0,
    accuracy: answers ? Math.round(((p.total_correct || 0) / answers) * 100) : null,
    seconds: p.seconds_played || 0,
    status,
    cat: stateCat,
    state: st,
  };
};

function download(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function Dashboard({ user }) {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState(() => load('cq_class'));
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [sort, setSort] = useState({ key: 'name', dir: 1 });
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const cls = classes.find((c) => c.id === classId);

  const loadClasses = useCallback(async () => {
    const { data, error: err } = await supabase.from('classes').select('*').order('created_at');
    if (err) return setError(err.message);
    setClasses(data);
    setClassId((cur) => (data.some((c) => c.id === cur) ? cur : data[0]?.id || null));
    setLoading(false);
  }, []);

  const loadStudents = useCallback(async () => {
    if (!classId) return setStudents([]);
    const { data, error: err } = await supabase
      .from('students')
      .select('id,name,created_at,last_active,progress(*)')
      .eq('class_id', classId)
      .order('name');
    if (err) return setError(err.message);
    setStudents(data.map(normalize));
    setUpdatedAt(new Date());
  }, [classId]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);
  useEffect(() => {
    if (classId) save('cq_class', classId);
    loadStudents();
    const t = setInterval(loadStudents, 30000);
    return () => clearInterval(t);
  }, [classId, loadStudents]);

  async function createClass(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError('');
    for (let i = 0; i < 6; i++) {
      const { data, error: err } = await supabase.from('classes').insert({ name: newName.trim(), code: makeCode() }).select().single();
      if (!err) {
        setNewName('');
        setAdding(false);
        await loadClasses();
        setClassId(data.id);
        return;
      }
      if (err.code !== '23505') return setError(err.message);
    }
    setError('Could not create a unique code. Please try again.');
  }

  async function deleteClass() {
    if (!cls) return;
    if (!window.confirm(`Delete "${cls.name}" and ALL of its student progress? This cannot be undone.`)) return;
    const { error: err } = await supabase.from('classes').delete().eq('id', cls.id);
    if (err) return setError(err.message);
    setClassId(null);
    await loadClasses();
  }

  async function resetStudent(s) {
    if (!window.confirm(`Reset ALL progress for ${s.name}? They will start over from Stage 1.`)) return;
    const { error: err } = await supabase
      .from('progress')
      .update({
        state: { v: 1, resetAt: Date.now() },
        stages_cleared: 0,
        counties_mastered: 0,
        map_best: 0,
        map_passed: false,
        seats_mastered: 0,
        total_answers: 0,
        total_correct: 0,
        seconds_played: 0,
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('student_id', s.id);
    if (err) return setError(err.message);
    setDetail(null);
    loadStudents();
  }

  async function removeStudent(s) {
    if (!window.confirm(`Remove ${s.name} from this class? Their progress will be deleted.`)) return;
    const { error: err } = await supabase.from('students').delete().eq('id', s.id);
    if (err) return setError(err.message);
    setDetail(null);
    loadStudents();
  }

  const studentLink = cls ? `${window.location.origin}/?code=${cls.code}` : '';
  function copy(text, what) {
    navigator.clipboard?.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(''), 1500);
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = students.filter((s) => !q || s.name.toLowerCase().includes(q));
    const { key, dir } = sort;
    const val = (s) => (key === 'name' ? s.name.toLowerCase() : key === 'lastActive' ? new Date(s.lastActive).getTime() : key === 'status' ? s.cat * 100 + s.stages : s[key] ?? -1);
    return [...list].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * dir);
  }, [students, sort, query]);

  const insights = useMemo(() => {
    const agg = (kind) => {
      const m = {};
      students.forEach((s) => {
        const src = (kind === 'county' ? s.state.counties : s.state.seats) || {};
        Object.entries(src).forEach(([n, r]) => {
          m[n] = m[n] || { seen: 0, wrong: 0 };
          m[n].seen += r.seen || 0;
          m[n].wrong += r.wrong || 0;
        });
      });
      return Object.entries(m)
        .filter(([, v]) => v.seen >= 5 && v.wrong > 0)
        .map(([n, v]) => ({ name: n, rate: v.wrong / v.seen, wrong: v.wrong, seen: v.seen }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 8);
    };
    return { counties: agg('county'), seats: agg('seat') };
  }, [students]);

  const summary = useMemo(() => {
    const active = students.filter((s) => daysSince(s.lastActive) <= 7 && s.answers > 0).length;
    return {
      total: students.length,
      started: students.filter((s) => s.answers > 0).length,
      active,
      counties: students.filter((s) => s.stages >= 11).length,
      complete: students.filter((s) => s.cat === 4).length,
      funnel: [0, 1, 2, 3, 4].map((c) => students.filter((s) => s.cat === c).length),
    };
  }, [students]);

  function exportSummary() {
    const head = ['Student', 'Status', 'Stages cleared (of 11)', 'Counties mastered (of 77)', 'Best map score (of 77)', 'Map passed', 'Seats mastered (of 77)', 'Accuracy %', 'Answers', 'Minutes played', 'Last active'];
    const lines = [head, ...rows.map((s) => [s.name, s.status, s.stages, s.counties, s.mapBest, s.mapPassed ? 'Yes' : 'No', s.seats, s.accuracy ?? '', s.answers, Math.round(s.seconds / 60), s.lastActive ? new Date(s.lastActive).toLocaleString() : ''])];
    download(`${cls.name.replace(/\W+/g, '_')}_summary.csv`, lines.map((l) => l.map(csvCell).join(',')).join('\n'));
  }
  function exportDetail() {
    const names = COUNTIES.map((c) => c.name);
    const head = ['Student', ...names.map((n) => `${n} (county 0-3)`), ...names.map((n) => `${n} (seat 0-2)`)];
    const lines = [head, ...rows.map((s) => [s.name, ...names.map((n) => s.state.counties?.[n]?.lvl ?? 0), ...names.map((n) => s.state.seats?.[n]?.lvl ?? 0)])];
    download(`${cls.name.replace(/\W+/g, '_')}_county_detail.csv`, lines.map((l) => l.map(csvCell).join(',')).join('\n'));
  }

  const th = (key, label, cls2 = '') => (
    <th
      className={`cursor-pointer px-3 py-2 text-left text-xs font-semibold tracking-wider whitespace-nowrap text-slate-400 uppercase select-none hover:text-white ${cls2}`}
      onClick={() => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }))}
    >
      {label} {sort.key === key ? (sort.dir === 1 ? '▲' : '▼') : ''}
    </th>
  );

  if (loading) return <div className="grid h-full place-items-center text-slate-400">Loading…</div>;

  return (
    <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-4 p-3 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-semibold">
          County Quest <span className="text-orange-400">Teacher Dashboard</span>
        </h1>
        <div className="ml-auto flex items-center gap-3 text-sm text-slate-400">
          <span className="hidden sm:inline">{user.email}</span>
          <a href="#/" className="underline">
            Student game
          </a>
          <Button color="slate" onClick={() => supabase.auth.signOut()}>
            Sign out
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl bg-red-500/15 px-4 py-2 text-red-200">
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* class bar */}
      <Card className="flex flex-wrap items-center gap-3">
        {classes.length > 0 && (
          <select
            value={classId || ''}
            onChange={(e) => setClassId(e.target.value)}
            className="font-display rounded-xl border-2 border-slate-600 bg-slate-900 px-3 py-2 text-lg"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {cls && (
          <>
            <div className="rounded-xl bg-slate-900 px-4 py-2">
              <span className="text-xs tracking-widest text-slate-400 uppercase">Class code </span>
              <span className="font-display text-2xl font-bold tracking-[0.25em] text-amber-300">{cls.code}</span>
            </div>
            <Button color="sky" onClick={() => copy(studentLink, 'link')}>
              {copied === 'link' ? 'Copied!' : '🔗 Copy student link'}
            </Button>
            <Button color="slate" onClick={() => copy(cls.code, 'code')}>
              {copied === 'code' ? 'Copied!' : 'Copy code'}
            </Button>
          </>
        )}
        <div className="ml-auto flex gap-2">
          {cls && (
            <Button color="slate" onClick={deleteClass}>
              Delete class
            </Button>
          )}
          <Button color="green" onClick={() => setAdding(!adding)}>
            + New class
          </Button>
        </div>
        {adding && (
          <form onSubmit={createClass} className="flex w-full gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Class name, e.g. Oklahoma History – 3rd Hour"
              className="min-w-0 flex-1 rounded-xl border-2 border-slate-600 bg-slate-900 px-3 py-2 text-lg outline-none focus:border-orange-400"
            />
            <Button type="submit">Create</Button>
          </form>
        )}
      </Card>

      {!cls && (
        <Card className="text-center text-slate-300">
          <div className="text-4xl">👋</div>
          <p className="mt-2 text-lg">Create your first class to get a class code for students.</p>
        </Card>
      )}

      {cls && (
        <>
          {/* summary */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              ['Students', summary.total, '👥'],
              ['Started playing', summary.started, '▶️'],
              ['Active (7 days)', summary.active, '🔥'],
              ['All 77 counties', summary.counties, '🗺️'],
              ['Fully complete', summary.complete, '🎓'],
            ].map(([label, v, icon]) => (
              <Card key={label} className="p-4">
                <div className="text-sm text-slate-400">
                  {icon} {label}
                </div>
                <div className="font-display text-4xl font-bold">{v}</div>
              </Card>
            ))}
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
            {/* table */}
            <Card className="overflow-hidden p-0">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-700 p-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search students…"
                  className="min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 outline-none"
                />
                <Button color="slate" onClick={loadStudents}>
                  ↻ Refresh
                </Button>
                <Button color="slate" onClick={exportSummary} disabled={!rows.length}>
                  ⬇ Summary CSV
                </Button>
                <Button color="slate" onClick={exportDetail} disabled={!rows.length}>
                  ⬇ County detail CSV
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="bg-slate-900/60">
                    <tr>
                      {th('name', 'Student')}
                      {th('status', 'Where they are')}
                      {th('counties', 'Counties')}
                      {th('mapBest', 'Map best')}
                      {th('seats', 'Seats')}
                      {th('accuracy', 'Accuracy')}
                      {th('seconds', 'Time')}
                      {th('lastActive', 'Last active')}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s) => (
                      <tr key={s.id} onClick={() => setDetail(s)} className="cursor-pointer border-t border-slate-700/60 hover:bg-slate-700/40">
                        <td className="px-3 py-2 font-semibold">{s.name}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                              s.cat === 4 ? 'bg-emerald-500/25 text-emerald-300' : s.cat === 0 ? 'bg-slate-600/40 text-slate-400' : 'bg-sky-500/20 text-sky-200'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <Bar value={s.counties} max={77} color="#f97316" />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {s.mapBest ? (
                            <span className={s.mapPassed ? 'text-emerald-300' : 'text-amber-300'}>
                              {s.mapBest}/77 {s.mapPassed ? '✓' : ''}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Bar value={s.seats} max={77} color="#38bdf8" />
                        </td>
                        <td className="px-3 py-2">{s.accuracy === null ? '—' : `${s.accuracy}%`}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtTime(s.seconds)}</td>
                        <td className={`px-3 py-2 whitespace-nowrap ${daysSince(s.lastActive) > 7 ? 'text-amber-300' : 'text-slate-300'}`}>{ago(s.lastActive)}</td>
                      </tr>
                    ))}
                    {!rows.length && (
                      <tr>
                        <td colSpan={8} className="px-3 py-10 text-center text-slate-400">
                          {students.length ? 'No students match your search.' : 'No students yet. Share the class code or link above.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-700/60 px-3 py-2 text-xs text-slate-500">
                Auto-refreshes every 30 seconds{updatedAt ? ` · updated ${updatedAt.toLocaleTimeString()}` : ''} · click a student for details
              </div>
            </Card>

            {/* insights */}
            <div className="flex flex-col gap-4">
              <Card>
                <h3 className="font-display mb-3 text-lg font-semibold">Where the class is</h3>
                {['Not started', 'Learning counties', 'Full Map Challenge', 'County seats', 'Complete'].map((label, i) => (
                  <div key={label} className="mb-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">{label}</span>
                      <span className="font-semibold">{summary.funnel[i]}</span>
                    </div>
                    <Bar value={summary.funnel[i]} max={Math.max(1, summary.total)} color={['#64748b', '#f97316', '#facc15', '#38bdf8', '#22c55e'][i]} plain />
                  </div>
                ))}
              </Card>
              <Missed title="Most-missed counties" items={insights.counties} suffix=" County" />
              <Missed title="Most-missed county seats" items={insights.seats} seat />
            </div>
          </div>
        </>
      )}

      {detail && <Detail s={students.find((x) => x.id === detail.id) || detail} onClose={() => setDetail(null)} onReset={resetStudent} onRemove={removeStudent} />}
    </div>
  );
}

function Bar({ value, max, color, plain = false }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2.5 overflow-hidden rounded-full bg-slate-700 ${plain ? 'w-full' : 'w-24'}`}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
      </div>
      {!plain && <span className="w-10 text-xs text-slate-300">{value}/{max}</span>}
    </div>
  );
}

function Missed({ title, items, suffix = '', seat = false }) {
  const byName = Object.fromEntries(COUNTIES.map((c) => [c.name, c]));
  return (
    <Card>
      <h3 className="font-display mb-1 text-lg font-semibold">{title}</h3>
      <p className="mb-3 text-xs text-slate-500">Share of answers that were wrong, across the whole class (5+ answers).</p>
      {items.length === 0 && <p className="text-sm text-slate-400">Not enough data yet.</p>}
      {items.map((m) => (
        <div key={m.name} className="mb-2">
          <div className="flex justify-between text-sm">
            <span>
              {seat ? `${byName[m.name].seat}` : `${m.name}${suffix}`}
              {seat && <span className="text-slate-500"> ({m.name} Co.)</span>}
            </span>
            <span className="text-slate-300">{Math.round(m.rate * 100)}% wrong</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-700">
            <div className="h-full rounded-full bg-rose-400" style={{ width: `${m.rate * 100}%` }} />
          </div>
        </div>
      ))}
    </Card>
  );
}

function Detail({ s, onClose, onReset, onRemove }) {
  const [kind, setKind] = useState('county');
  const st = s.state || {};
  const src = (kind === 'county' ? st.counties : st.seats) || {};
  const max = kind === 'county' ? COUNTY_MASTER : SEAT_MASTER;
  const table = COUNTIES.map((c) => ({ c, r: src[c.name] || { lvl: 0, seen: 0, right: 0, wrong: 0 } })).sort((a, b) => b.r.wrong - a.r.wrong || b.r.seen - a.r.seen);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-3 sm:p-8" onClick={onClose}>
      <div className="mx-auto max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <Card className="relative">
          <button className="absolute top-4 right-4 rounded-lg bg-slate-700 px-3 py-1 text-lg" onClick={onClose}>
            ✕
          </button>
          <h2 className="font-display text-3xl font-semibold">{s.name}</h2>
          <p className="text-slate-300">
            {s.status} · {s.counties}/77 counties · map best {s.mapBest || '—'}/77 · {s.seats}/77 seats · {s.accuracy ?? '—'}% accuracy · {fmtTime(s.seconds)} played · last active {ago(s.lastActive)}
          </p>
          <div className="mt-3 flex gap-2">
            <Button color={kind === 'county' ? 'orange' : 'slate'} onClick={() => setKind('county')}>
              Counties
            </Button>
            <Button color={kind === 'seat' ? 'orange' : 'slate'} onClick={() => setKind('seat')}>
              County seats
            </Button>
          </div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <OklahomaMap
                interactive={false}
                styleFor={(c) => {
                  const r = src[c.name];
                  if (!r || !r.seen) return { fill: '#334155', opacity: 0.6 };
                  return { fill: STAGES[c.stage - 1].color, opacity: [0.3, 0.55, 0.8, 1][Math.min(3, Math.round((r.lvl / max) * 3))] };
                }}
              />
              <p className="mt-1 text-xs text-slate-400">Darker/brighter color = stronger mastery. Grey = not attempted yet.</p>
            </div>
            <div className="max-h-80 overflow-y-auto rounded-2xl bg-slate-900/60">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900 text-xs text-slate-400 uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">{kind === 'county' ? 'County' : 'Seat'}</th>
                    <th className="px-2 py-2 text-right">Right</th>
                    <th className="px-2 py-2 text-right">Wrong</th>
                    <th className="px-3 py-2 text-right">Mastery</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map(({ c, r }) => (
                    <tr key={c.name} className="border-t border-slate-800">
                      <td className="px-3 py-1.5">{kind === 'county' ? c.name : `${c.seat} (${c.name})`}</td>
                      <td className="px-2 py-1.5 text-right text-emerald-300">{r.right}</td>
                      <td className={`px-2 py-1.5 text-right ${r.wrong ? 'text-rose-300' : 'text-slate-500'}`}>{r.wrong}</td>
                      <td className="px-3 py-1.5 text-right">{r.lvl >= max ? '⭐' : `${r.lvl}/${max}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-700 pt-4">
            <Button color="slate" onClick={() => onReset(s)}>
              Reset progress
            </Button>
            <Button color="slate" onClick={() => onRemove(s)}>
              Remove from class
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
