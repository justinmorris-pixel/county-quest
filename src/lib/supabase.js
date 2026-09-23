import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasBackend = Boolean(url && key);
export const supabase = hasBackend ? createClient(url, key) : null;

// ---- Student-side calls (these use secure database functions; students never touch tables directly) ----

export async function joinClass(code, name) {
  const { data, error } = await supabase.rpc('join_class', { p_code: code, p_name: name });
  if (error) {
    const msg = error.message || '';
    if (msg.includes('CLASS_NOT_FOUND')) throw new Error('We could not find that class code. Check it and try again.');
    if (msg.includes('BAD_NAME')) throw new Error('Please enter your first name and last initial.');
    throw new Error('Could not connect right now. Please try again.');
  }
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
