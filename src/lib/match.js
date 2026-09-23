// Forgiving answer matching for typed answers.

const ALIASES = {
  'Pryor Creek': ['Pryor'],
  'Oklahoma City': ['OKC', 'Oklahoma'],
  'Boise City': ['Boise'],
};

export const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/\bcounty\b/g, '')
    .replace(/[^a-z]/g, '');

export function lev(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

// Short names must be exact; longer names tolerate a small typo.
export function tolerance(target) {
  const t = norm(target);
  if (t.length >= 9) return 2;
  if (t.length >= 5) return 1;
  return 0;
}

export function isMatch(input, answer) {
  const i = norm(input);
  if (!i) return false;
  const targets = [answer, ...(ALIASES[answer] || [])];
  return targets.some((t) => {
    const n = norm(t);
    return i === n || lev(i, n) <= tolerance(t);
  });
}
