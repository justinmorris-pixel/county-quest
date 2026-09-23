import { COUNTIES } from '../data/counties.js';
import { COUNTY_BY_NAME } from './stages.js';

// ---- settings you can change ----
export const SPEED_SECONDS = 60; // length of a Speed Round
export const DAILY_LEN = 10; // questions in the Daily Challenge
export const BOSS_LIVES = 3; // misses allowed in the Boss Round

// ---- seeded random numbers (so everyone gets the same Daily Challenge) ----
export function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWith(arr, rnd = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];

// ---- how far apart two counties are (number of borders to cross) ----
const distCache = {};
function distancesFrom(name) {
  if (distCache[name]) return distCache[name];
  const dist = { [name]: 0 };
  const queue = [name];
  while (queue.length) {
    const cur = queue.shift();
    COUNTY_BY_NAME[cur].nb.forEach((n) => {
      if (COUNTY_BY_NAME[n] && dist[n] === undefined) {
        dist[n] = dist[cur] + 1;
        queue.push(n);
      }
    });
  }
  distCache[name] = dist;
  return dist;
}

// ---- question kinds ----
// hl   = "Which county is glowing?"           (choice)
// c2s  = "County seat of X County?"           (choice)
// s2c  = "Which county has ___ as its seat?"  (choice)
// nb   = "Which county borders X County?"     (choice)
// tap  = "Find X County on the map"           (tap)
// c2sT = county seat, typed                   (type)
// s2cT = county for a seat, typed             (type)
export const KINDS = ['hl', 'c2s', 's2c', 'nb', 'tap', 'c2sT', 's2cT'];

const shuffleOpts = (opts, rnd) => shuffleWith(opts, rnd);

// Wrong answers that are neighbors of the real answer make the best decoys.
function countyDecoys(name, n, rnd) {
  const c = COUNTY_BY_NAME[name];
  const others = COUNTIES.filter((x) => x.name !== name);
  const near = shuffleWith(others.filter((x) => c.nb.includes(x.name)), rnd).slice(0, 2);
  const rest = shuffleWith(others.filter((x) => !near.includes(x)), rnd);
  return [...near, ...rest].slice(0, n);
}

export function makeQuestion(kind, name, rnd = Math.random) {
  const c = COUNTY_BY_NAME[name];
  const q = {
    id: `${kind}-${name}-${Math.floor(rnd() * 1e9)}`,
    kind,
    name,
    highlight: null,
    options: null,
    target: null,
    reveal: '',
    revealMarks: { [name]: 'right' },
  };

  if (kind === 'hl') {
    q.mode = 'choice';
    q.label = 'Pick one';
    q.prompt = 'Which county is glowing?';
    q.highlight = name;
    q.options = shuffleOpts(
      [c, ...countyDecoys(name, 3, rnd)].map((x) => ({ text: `${x.name} County`, county: x.name, correct: x.name === name })),
      rnd
    );
    q.reveal = `That is ${name} County.`;
  } else if (kind === 'c2s') {
    q.mode = 'choice';
    q.label = 'Pick one';
    q.prompt = `What is the county seat of ${name} County?`;
    q.highlight = name;
    q.options = shuffleOpts(
      [c, ...countyDecoys(name, 3, rnd)].map((x) => ({ text: x.seat, county: x.name, correct: x.name === name })),
      rnd
    );
    q.reveal = `The county seat of ${name} County is ${c.seat}.`;
  } else if (kind === 's2c') {
    q.mode = 'choice';
    q.label = 'Pick one';
    q.prompt = `Which county has ${c.seat} as its county seat?`;
    q.options = shuffleOpts(
      [c, ...countyDecoys(name, 3, rnd)].map((x) => ({ text: `${x.name} County`, county: x.name, correct: x.name === name })),
      rnd
    );
    q.reveal = `${c.seat} is the county seat of ${name} County.`;
  } else if (kind === 'nb') {
    q.mode = 'choice';
    q.label = 'Pick one';
    q.prompt = `Which of these counties borders ${name} County?`;
    q.highlight = name;
    const right = pick(c.nb, rnd);
    const dist = distancesFrom(name);
    const far = COUNTIES.filter((x) => x.name !== name && !c.nb.includes(x.name));
    // decoys that are three or more borders away, nearest first, so nothing is a "corner" argument
    const ranked = shuffleWith(far.filter((x) => (dist[x.name] ?? 99) >= 3), rnd).sort((a, b) => (dist[a.name] ?? 99) - (dist[b.name] ?? 99));
    const pool = ranked.length >= 3 ? ranked : far;
    const decoys = pool.slice(0, Math.max(3, Math.min(6, pool.length)));
    const wrong = shuffleWith(decoys, rnd).slice(0, 3);
    q.options = shuffleOpts(
      [COUNTY_BY_NAME[right], ...wrong].map((x) => ({ text: `${x.name} County`, county: x.name, correct: x.name === right || c.nb.includes(x.name) })),
      rnd
    );
    q.reveal = `${name} County borders ${c.nb.map((n) => `${n}`).join(', ')}.`;
    q.revealMarks = { [name]: 'target', ...Object.fromEntries(c.nb.map((n) => [n, 'right'])) };
  } else if (kind === 'tap') {
    q.mode = 'tap';
    q.label = 'Tap the map';
    q.prompt = `Find ${name} County`;
    q.reveal = `That is ${name} County.`;
  } else if (kind === 'c2sT') {
    q.mode = 'type';
    q.label = 'Type it';
    q.prompt = `What is the county seat of ${name} County?`;
    q.highlight = name;
    q.target = c.seat;
    q.placeholder = 'County seat';
    q.reveal = `The county seat of ${name} County is ${c.seat}.`;
  } else if (kind === 's2cT') {
    q.mode = 'type';
    q.label = 'Type it';
    q.prompt = `Which county has ${c.seat} as its county seat?`;
    q.target = name;
    q.placeholder = 'County name';
    q.reveal = `${c.seat} is the county seat of ${name} County.`;
  }
  return q;
}

// ---- Speed Round: endless quick multiple choice ----
const SPEED_KINDS = ['hl', 'c2s', 's2c', 'nb'];
export function speedQuestion(recent = [], rnd = Math.random) {
  const pool = COUNTIES.filter((c) => !recent.includes(c.name));
  return makeQuestion(pick(SPEED_KINDS, rnd), pick(pool, rnd).name, rnd);
}

// ---- Daily Challenge: same 10 questions for everyone on a given date ----
const DAILY_PLAN = ['hl', 'c2s', 's2c', 'nb', 'tap', 'c2sT', 's2cT', 'tap', 'nb', 'c2sT'];
export function dailySet(dateStr) {
  const rnd = mulberry32(hashStr(`county-quest:${dateStr}`));
  const names = shuffleWith(COUNTIES.map((c) => c.name), rnd).slice(0, DAILY_LEN);
  return names.map((n, i) => makeQuestion(DAILY_PLAN[i % DAILY_PLAN.length], n, rnd));
}

// ---- Boss Round: all 77 counties, getting harder as you go ----
export function bossDeck(rnd = Math.random) {
  const names = shuffleWith(COUNTIES.map((c) => c.name), rnd);
  const total = names.length;
  return names.map((n, i) => {
    const t = i / total;
    const kinds = t < 0.34 ? ['hl', 'c2s', 's2c', 'nb'] : t < 0.67 ? ['c2s', 's2c', 'nb', 'tap', 'c2sT'] : ['tap', 'c2sT', 's2cT', 'nb'];
    return makeQuestion(pick(kinds, rnd), n, rnd);
  });
}

export const bossPhase = (i, total) => {
  const t = i / total;
  return t < 0.34 ? 'The storm builds…' : t < 0.67 ? 'The winds pick up!' : 'Final stretch — full twister!';
};
