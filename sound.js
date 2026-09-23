// Tiny synthesized sound effects (no audio files needed).
let ctx = null;
let on = true;
try {
  on = localStorage.getItem('cq_sound') !== '0';
} catch (e) {
  /* ignore */
}

export const isSoundOn = () => on;
export function setSoundOn(v) {
  on = v;
  try {
    localStorage.setItem('cq_sound', v ? '1' : '0');
  } catch (e) {
    /* ignore */
  }
}

function tone(freq, dur, type = 'sine', delay = 0, vol = 0.12) {
  if (!on) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch (e) {
    /* ignore */
  }
}

export const sfx = {
  correct: () => {
    tone(660, 0.12, 'triangle');
    tone(880, 0.16, 'triangle', 0.09);
  },
  wrong: () => {
    tone(220, 0.22, 'sawtooth', 0, 0.08);
    tone(165, 0.28, 'sawtooth', 0.12, 0.08);
  },
  levelUp: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'triangle', i * 0.08));
  },
  fanfare: () => {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, 'square', i * 0.11, 0.07));
  },
  click: () => tone(500, 0.05, 'sine', 0, 0.06),
};
