import { COUNTIES } from '../data/counties.js';
import { N_STAGES, STAGES, COUNTY_BY_NAME } from './stages.js';

export const COUNTY_MASTER = 3; // correct-answer level needed to master a county
export const SEAT_MASTER = 2; // level needed to master a county seat
export const MAP_PASS = 0.9; // share of counties found on the first try to pass the full-map challenge

export const RANKS = [
  { at: 0, title: 'Tourist' },
  { at: 7, title: 'Road Tripper' },
  { at: 21, title: 'Trail Guide' },
  { at: 35, title: 'Trail Boss' },
  { at: 49, title: 'County Ranger' },
  { at: 63, title: 'Territory Marshal' },
  { at: 77, title: 'Oklahoma Legend' },
];

export const BADGES = {
  combo10: { emoji: '🔥', name: 'On Fire', desc: '10 correct in a row' },
  combo25: { emoji: '⚡', name: 'Unstoppable', desc: '25 correct in a row' },
  half: { emoji: '🎯', name: 'Halfway There', desc: 'Mastered 39 counties' },
  allcounties: { emoji: '🗺️', name: 'County Collector', desc: 'Mastered all 77 counties' },
  mapmaster: { emoji: '🏆', name: 'Map Master', desc: 'Passed the full-map challenge' },
  flawless: { emoji: '💎', name: 'Flawless Map', desc: 'Found every county on the first try' },
  streak3: { emoji: '📅', name: '3-Day Streak', desc: 'Played 3 days in a row' },
  streak5: { emoji: '🗓️', name: '5-Day Streak', desc: 'Played 5 days in a row' },
  seatmaster: { emoji: '🎓', name: 'Seat Scholar', desc: 'Mastered all 77 county seats' },
};
STAGES.forEach((s) => {
  BADGES[`stage${s.n}`] = { emoji: s.emoji, name: s.name, desc: `Cleared Stage ${s.n}` };
});

export function newState() {
  return {
    v: 1,
    resetAt: 0, // set by the teacher dashboard when a student's progress is reset
    xp: 0,
    bestCombo: 0,
    stagesCleared: 0,
    seatStagesCleared: 0,
    introduced: 0, // highest county stage whose intro screen was viewed
    seatIntroduced: 0,
    counties: {}, // name -> {lvl, seen, right, wrong}
    seats: {},
    map: { best: 0, attempts: 0, passed: false, bestSeconds: null },
    badges: [],
    seconds: 0,
    answers: 0,
    correct: 0,
    lastDay: null,
    dayStreak: 0,
  };
}

export function todayStr(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const rec = (s, kind, name) => (kind === 'county' ? s.counties : s.seats)[name] || { lvl: 0, seen: 0, right: 0, wrong: 0 };
export const lvlOf = (s, kind, name) => rec(s, kind, name).lvl;
export const masterLevel = (kind) => (kind === 'county' ? COUNTY_MASTER : SEAT_MASTER);

export const countiesMastered = (s) => COUNTIES.filter((c) => lvlOf(s, 'county', c.name) >= COUNTY_MASTER).length;
export const seatsMastered = (s) => COUNTIES.filter((c) => lvlOf(s, 'seat', c.name) >= SEAT_MASTER).length;

export function phaseOf(s) {
  if (s.stagesCleared < N_STAGES) return 'counties';
  if (!s.map.passed) return 'map';
  if (s.seatStagesCleared < N_STAGES) return 'seats';
  return 'done';
}

export const currentStage = (s) => Math.min(N_STAGES, s.stagesCleared + 1);
export const currentSeatStage = (s) => Math.min(N_STAGES, s.seatStagesCleared + 1);

export function unlockedCounties(s, kind = 'county') {
  const top = kind === 'county' ? currentStage(s) : currentSeatStage(s);
  return COUNTIES.filter((c) => c.stage <= top);
}

export function rankOf(s) {
  const n = countiesMastered(s);
  let r = RANKS[0];
  RANKS.forEach((x) => {
    if (n >= x.at) r = x;
  });
  return r;
}

export function nextRank(s) {
  const n = countiesMastered(s);
  return RANKS.find((r) => r.at > n) || null;
}

function stageMastered(s, kind, stage) {
  const max = masterLevel(kind);
  return COUNTIES.filter((c) => c.stage === stage).every((c) => lvlOf(s, kind, c.name) >= max);
}

function awardBadges(s) {
  const fresh = [];
  const give = (id) => {
    if (!s.badges.includes(id)) {
      s.badges.push(id);
      fresh.push(id);
    }
  };
  for (let i = 1; i <= s.stagesCleared; i++) give(`stage${i}`);
  if (s.bestCombo >= 10) give('combo10');
  if (s.bestCombo >= 25) give('combo25');
  const cm = countiesMastered(s);
  if (cm >= 39) give('half');
  if (cm >= 77) give('allcounties');
  if (s.map.passed) give('mapmaster');
  if (s.map.best >= 77) give('flawless');
  if (s.dayStreak >= 3) give('streak3');
  if (s.dayStreak >= 5) give('streak5');
  if (seatsMastered(s) >= 77) give('seatmaster');
  return fresh;
}

function touchDay(s) {
  const today = todayStr();
  if (s.lastDay === today) return;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  s.dayStreak = s.lastDay === todayStr(y) ? s.dayStreak + 1 : 1;
  s.lastDay = today;
}

// Pure: returns { state, ev } for one answered question.
export function recordAnswer(prev, kind, name, correct, combo = 0) {
  const s = {
    ...prev,
    counties: { ...prev.counties },
    seats: { ...prev.seats },
    badges: [...prev.badges],
    map: { ...prev.map },
  };
  const bucket = kind === 'county' ? s.counties : s.seats;
  const max = masterLevel(kind);
  const r = { ...rec(s, kind, name) };
  const before = r.lvl;
  r.seen += 1;
  if (correct) {
    r.right += 1;
    r.lvl = Math.min(max, r.lvl + 1);
  } else {
    r.wrong += 1;
    r.lvl = Math.max(0, r.lvl - 1);
  }
  bucket[name] = r;

  s.answers += 1;
  if (correct) s.correct += 1;
  s.bestCombo = Math.max(s.bestCombo, combo);
  touchDay(s);

  let xp = 0;
  const mastered = correct && before < max && r.lvl >= max;
  if (correct) xp += 10 + Math.min(combo, 10);
  if (mastered) xp += 25;

  let stageCleared = null;
  const key = kind === 'county' ? 'stagesCleared' : 'seatStagesCleared';
  while (s[key] < N_STAGES && stageMastered(s, kind, s[key] + 1)) {
    s[key] += 1;
    stageCleared = s[key];
    xp += 100;
  }
  s.xp += xp;
  const newBadges = awardBadges(s);
  return {
    state: s,
    ev: { xp, lvlUp: correct && r.lvl > before, lvl: r.lvl, mastered, stageCleared, newBadges, kind },
  };
}

// Pure: results of a full-map challenge attempt.
export function recordMapResult(prev, { firstTry, total, misses, seconds }) {
  const s = { ...prev, counties: { ...prev.counties }, badges: [...prev.badges], map: { ...prev.map } };
  s.map.attempts += 1;
  s.map.best = Math.max(s.map.best, firstTry);
  const passed = firstTry / total >= MAP_PASS;
  if (passed && !s.map.passed) {
    s.map.passed = true;
    s.xp += 200;
  }
  if (passed && (s.map.bestSeconds == null || seconds < s.map.bestSeconds)) s.map.bestSeconds = seconds;
  // Counties that were missed go back into practice.
  misses.forEach((n) => {
    const r = { ...rec(s, 'county', n) };
    r.lvl = Math.min(r.lvl, COUNTY_MASTER - 1);
    r.wrong += 1;
    r.seen += 1;
    s.counties[n] = r;
  });
  s.xp += firstTry; // 1 XP per first-try county
  touchDay(s);
  const newBadges = awardBadges(s);
  return { state: s, ev: { passed, newBadges } };
}

// ---------- Question selection ----------

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function weightedPick(items, weightFn) {
  const ws = items.map(weightFn);
  const total = ws.reduce((a, b) => a + b, 0);
  let x = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    x -= ws[i];
    if (x <= 0) return items[i];
  }
  return items[items.length - 1];
}

function modeFor(kind, lvl, max) {
  if (kind === 'county') {
    if (lvl >= max) return Math.random() < 0.6 ? 'tap' : 'type';
    return ['choice', 'tap', 'type'][lvl] || 'tap';
  }
  if (lvl >= max) return Math.random() < 0.5 ? 'choice' : 'type';
  return lvl === 0 ? 'choice' : 'type';
}

// Returns { name, mode } or null when everything unlocked is mastered.
export function pickNext(s, kind, recent = []) {
  const max = masterLevel(kind);
  const unlocked = unlockedCounties(s, kind);
  const top = kind === 'county' ? currentStage(s) : currentSeatStage(s);
  const active = unlocked.filter((c) => lvlOf(s, kind, c.name) < max);
  const review = unlocked.filter((c) => lvlOf(s, kind, c.name) >= max);
  if (!active.length) return null;

  let pool = active;
  if (review.length >= 3 && Math.random() < 0.2) pool = review;

  const pick = weightedPick(pool, (c) => {
    const r = rec(s, kind, c.name);
    let w = max - r.lvl + 1;
    if (r.wrong > r.right) w += 1;
    if (c.stage === top) w *= 2;
    if (recent.includes(c.name)) w *= 0.05;
    return w;
  });
  return { name: pick.name, mode: modeFor(kind, lvlOf(s, kind, pick.name), max) };
}

// Multiple-choice options: neighbors make the best wrong answers.
export function choicesFor(s, kind, name, n = 4) {
  const target = COUNTY_BY_NAME[name];
  const unlocked = unlockedCounties(s, kind).filter((c) => c.name !== name);
  const pool = unlocked.length >= n - 1 ? unlocked : COUNTIES.filter((c) => c.name !== name);
  const near = shuffle(pool.filter((c) => target.nb.includes(c.name))).slice(0, 2);
  const rest = shuffle(pool.filter((c) => !near.includes(c)));
  const wrong = [...near, ...rest].slice(0, n - 1);
  const label = (c) => (kind === 'county' ? c.name : c.seat);
  return shuffle([target, ...wrong]).map((c) => ({ value: label(c), correct: c.name === name }));
}

// Summary columns the teacher dashboard reads.
export function summarize(s) {
  return {
    stages_cleared: s.stagesCleared,
    counties_mastered: countiesMastered(s),
    map_best: s.map.best,
    map_passed: s.map.passed,
    seats_mastered: seatsMastered(s),
    total_answers: s.answers,
    total_correct: s.correct,
    seconds_played: Math.round(s.seconds),
  };
}
