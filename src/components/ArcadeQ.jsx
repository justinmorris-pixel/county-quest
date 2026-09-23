import { useEffect, useRef, useState } from 'react';
import OklahomaMap from './OklahomaMap.jsx';
import { Button, Card, useKey } from './ui.jsx';
import { isMatch } from '../lib/match.js';
import { sfx } from '../lib/sound.js';

const NEUTRAL = () => ({ fill: '#475569', opacity: 0.9 });

// One arcade question: the map plus the question card.
// Parent gives it a fresh `key` for every question.
//   wrongMode 'auto'   -> moves on by itself after a miss (Speed Round, the clock is running)
//   wrongMode 'button' -> waits for the student to tap "keep going" (Daily and Boss)
export default function ArcadeQ({ q, wrongMode = 'button', onResolve, onNext }) {
  const [phase, setPhase] = useState('asking'); // asking | right | wrong
  const [text, setText] = useState('');
  const [picked, setPicked] = useState(null);
  const [marks, setMarks] = useState(q.highlight ? { [q.highlight]: 'target' } : {});
  const timer = useRef(null);
  const inputRef = useRef(null);
  const answered = useRef(false);
  const nextRef = useRef(onNext);
  nextRef.current = onNext;

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (q.mode === 'type' && inputRef.current) inputRef.current.focus();
  }, [q]);

  function resolve(correct, wrongMarks) {
    if (answered.current) return;
    answered.current = true;
    onResolve(correct);
    if (correct) {
      sfx.correct();
      setPhase('right');
      setMarks(q.revealMarks);
      timer.current = setTimeout(() => nextRef.current(), wrongMode === 'auto' ? 450 : 700);
    } else {
      sfx.wrong();
      setPhase('wrong');
      setMarks(wrongMarks);
      if (wrongMode === 'auto') timer.current = setTimeout(() => nextRef.current(), 1100);
    }
  }

  const targetMarks = q.kind === 'nb' ? q.revealMarks : { [q.name]: 'target' };

  function onMapClick(c) {
    if (q.mode !== 'tap' || phase !== 'asking') return;
    if (c.name === q.name) resolve(true);
    else resolve(false, { [q.name]: 'target', [c.name]: 'wrong' });
  }

  function onPick(opt, i) {
    if (phase !== 'asking') return;
    setPicked(i);
    if (opt.correct) resolve(true);
    else resolve(false, { ...targetMarks, [opt.county]: 'wrong' });
  }

  function onSubmit(e) {
    e.preventDefault();
    if (phase !== 'asking' || !text.trim()) return;
    if (isMatch(text, q.target)) resolve(true);
    else resolve(false, targetMarks);
  }

  useKey(
    (e) => {
      if (phase === 'wrong' && wrongMode === 'button' && e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(timer.current);
        nextRef.current();
      }
      if (phase === 'asking' && q.mode === 'choice' && ['1', '2', '3', '4'].includes(e.key)) {
        const i = Number(e.key) - 1;
        if (q.options[i]) onPick(q.options[i], i);
      }
    },
    [phase, q]
  );

  return (
    <div data-q={q.id} className="grid flex-1 items-start gap-4 lg:grid-cols-[1fr_390px]">
      <Card className="p-2 sm:p-3">
        <OklahomaMap
          styleFor={NEUTRAL}
          clickable={() => q.mode === 'tap' && phase === 'asking'}
          onCountyClick={onMapClick}
          marks={marks}
        />
      </Card>

      <Card className={`order-first lg:order-none ${phase === 'wrong' ? 'shake' : 'pop'}`}>
        <div className="text-xs font-semibold tracking-widest text-slate-400 uppercase">{q.label}</div>
        <h2 className="font-display mt-1 text-2xl leading-tight font-semibold sm:text-3xl">{q.prompt}</h2>

        {q.mode === 'tap' && phase === 'asking' && <p className="mt-2 text-sm text-slate-400">Tap the county on the map. Use + and − to zoom.</p>}

        {q.mode === 'choice' && (
          <div className="mt-4 grid gap-2.5">
            {q.options.map((o, i) => {
              let cls = 'border-slate-600 bg-slate-700 hover:bg-slate-600';
              if (phase !== 'asking') {
                if (o.correct) cls = 'border-emerald-700 bg-emerald-500';
                else if (picked === i) cls = 'border-red-800 bg-red-500';
                else cls = 'border-slate-700 bg-slate-800 opacity-60';
              }
              return (
                <button
                  key={o.text}
                  disabled={phase !== 'asking'}
                  onClick={() => onPick(o, i)}
                  className={`font-display flex items-center gap-3 rounded-2xl border-b-4 px-4 py-3 text-left text-xl font-semibold transition active:translate-y-0.5 ${cls}`}
                >
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-black/25 text-sm">{i + 1}</span>
                  {o.text}
                </button>
              );
            })}
          </div>
        )}

        {q.mode === 'type' && (
          <form onSubmit={onSubmit} className="mt-4 flex gap-2">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={phase !== 'asking'}
              autoComplete="off"
              autoCapitalize="words"
              spellCheck={false}
              placeholder={q.placeholder}
              className="font-display min-w-0 flex-1 rounded-2xl border-2 border-slate-600 bg-slate-900 px-4 py-3 text-xl outline-none focus:border-orange-400"
            />
            <Button type="submit" color="green" disabled={phase !== 'asking' || !text.trim()}>
              Check
            </Button>
          </form>
        )}

        {phase === 'right' && (
          <div className="pop font-display mt-4 rounded-2xl bg-emerald-500/20 px-4 py-3 text-xl font-semibold text-emerald-300">✅ Correct!</div>
        )}

        {phase === 'wrong' && (
          <div className="pop mt-4">
            <div className="rounded-2xl bg-red-500/15 px-4 py-3 text-lg text-red-200">
              <span className="font-display font-semibold">Not quite.</span> {q.reveal}
            </div>
            {wrongMode === 'button' && (
              <Button
                color="orange"
                className="mt-3 w-full"
                onClick={() => {
                  clearTimeout(timer.current);
                  onNext();
                }}
              >
                Got it — keep going ↵
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
