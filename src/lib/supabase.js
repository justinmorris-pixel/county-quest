import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasBackend = Boolean(url && key);
export const supabase = hasBackend ? createClient(url, key) : null;

// ---- Student-side calls (these use secure database functions; students never touch tables directly) ----

function friendly(error) {
  const msg = (error && error.message) || '';
  const e = new Error('Could not connect right now. Please try again.');
  if (msg.includes('CLASS_NOT_FOUND')) {
    e.message = 'We could not find that class code. Check it and try again.';
    e.code = 'CLASS_NOT_FOUND';
  } else if (msg.includes('BAD_NAME')) {
    e.message = 'Please enter your first name and last initial.';
    e.code = 'BAD_NAME';
  } else if (msg.includes('BAD_PIN')) {
    e.message = 'Your PIN must be exactly 4 numbers.';
    e.code = 'BAD_PIN';
  } else if (msg.includes('SESSION_INVALID')) {
    e.message = 'This account is no longer in the class.';
    e.code = 'SESSION_INVALID';
  } else {
    e.code = 'NETWORK';
  }
  return e;
}

// Is this name new in the class, already using a PIN, or waiting to set one?
// Returns { status: 'new' | 'needs_pin' | 'has_pin', name, class_name }
export async function studentStatus(code, name) {
  const { data, error } = await supabase.rpc('student_status', { p_code: code, p_name: name });
  if (error) throw friendly(error);
  return data;
}

// Creates the student (new name) or unlocks them (existing name). Wrong PINs come back as { ok: false, error, ... }.
export async function joinClass(code, name, pin) {
  const { data, error } = await supabase.rpc('join_class', { p_code: code, p_name: name, p_pin: pin });
  if (error) throw friendly(error);
  return data;
}

// Picks up an already-unlocked student on this device without asking for the PIN again.
export async function resumeSession(studentId) {
  const { data, error } = await supabase.rpc('resume_session', { p_student: studentId });
  if (error) throw friendly(error);
  return data;
}

export async function saveProgress(studentId, state, summary) {
  const { error } = await supabase.rpc('save_progress', {
    p_student: studentId,
    p_state: state,
    p_summary: summary,
  });
  if (error) throw error;
}

// Everyone in this student's class, for the leaderboard. Never includes ids or PINs.
export async function classLeaderboard(studentId) {
  const { data, error } = await supabase.rpc('class_leaderboard', { p_student: studentId });
  if (error) throw friendly(error);
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return (Array.isArray(data) ? data : []).map((r) => ({
    name: String(r.name || ''),
    me: Boolean(r.me),
    xp: n(r.xp),
    counties: n(r.counties),
    seats: n(r.seats),
    speed: n(r.speed),
    speed_correct: n(r.speed_correct),
    boss: n(r.boss),
    boss_wins: n(r.boss_wins),
    daily_date: r.daily_date || null,
    daily_score: n(r.daily_score),
    daily_seconds: n(r.daily_seconds),
    daily_streak: n(r.daily_streak),
  }));
}

// Every class that belongs to the same teacher, as totals (no student names from other classes).
export async function classStandings(studentId, today) {
  const { data, error } = await supabase.rpc('class_standings', { p_student: studentId, p_today: today });
  if (error) throw friendly(error);
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return (Array.isArray(data) ? data : []).map((r) => ({
    name: String(r.name || ''),
    me: Boolean(r.me),
    students: n(r.students),
    total_xp: n(r.total_xp),
    avg_xp: n(r.avg_xp),
    avg_counties: n(r.avg_counties),
    avg_seats: n(r.avg_seats),
    daily_today: n(r.daily_today),
  }));
}
