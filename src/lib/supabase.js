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
