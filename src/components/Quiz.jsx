import { useCallback, useEffect, useRef, useState } from 'react';
import OklahomaMap from './OklahomaMap.jsx';
import { Button, Card, StagePips, masteryStyle, useKey } from './ui.jsx';
import { choicesFor, currentSeatStage, currentStage, pickNext, countiesMastered, seatsMastered } from '../lib/game.js';
import { COUNTY_BY_NAME, STAGES } from '../lib/stages.js';
import { isMatch } from '../lib/match.js';
import { sfx } from '../lib/sound.js';
import { unlockedCounties } from '../lib/game.js';

const CHEERS = ['Nice!', 'Correct!', 'You got it!', 'Yes!', 'Sharp!', 'Boom!', 'Nailed it!'];
const cheer = () => CHEERS[Math.floor(Math.random() * CHEERS.length)];

export default function Quiz({ state, kind, onAnswer, onExit, onStageCleared }) {
  const isCounty = kind === 'county';
  const stateRef = useRef(state);
  stateRef.current = state;
  const recent = useRef([]);
  const timer = useRef(null);
  const inputRef = useRef(null);

  const [q, setQ] = useState(null);
  const [phase, setPhase] = useState('asking'); // asking | right | wrong | done
  const [combo, setCombo] = useState(0);
  const [marks, setMarks] = useState({});
  const [feedback, setFeedback] = useState('');
  const [text, setText] = useState('');
  const [picked, setPicked] = useState(null);
  const [gain, setGain] = useState(null);
  const [shake, setShake] = useState(0);

  // Frozen at mount so the screen doesn't jump to the next stage before the celebration appears.
  const top = useRef(isCounty ? currentStage(state) : currentSeatStage(state)).current;
  const stage = STAGES[top - 1];
  const unlocked = useRef(unlockedCounties(state, kind).map((c) => c.name)).current;

  const advance = useCallback(() => {
    const s = stateRef.current;
    const p = pickNext(s, kind, recent.current);
    if (!p) {
      setQ(null);
      setPhase('done');
      return;
    }
    recent.current = [p.name, ...recent.current].slice(0, 2);
    const options = p.mode === 'choice' ? choicesFor(s, kind, p.name) : null;
    setQ({ ...p, options });
    setPhase('asking');
    setMarks(p.mode === 'tap' ? {} : { [p.name]: 'target' });
    setText('');
    setPicked(null);
    setFeedback('');
    setGain(null);
  }, [kind]);

  useEffect(() => {
    advance();
    return () => clearTimeout(timer.current);
  }, [advance]);

  useEffect(() => {
    if (q && q.mode === 'type' && phase === 'asking' && inputRef.current) inputRef.current.focus();
  }, [q, phase]);

  const county = q ? COUNTY_BY_NAME[q.name] : null;
  const answerText = q ? (isCounty ? `${q.name} County` : county.seat) : '';

  function resolve(correct, wrongMarks, wrongMsg) {
    const newCombo = correct ? combo + 1 : 0;
    const ev = onAnswer(kind, q.name, correct, newCombo);
    setCombo(newCombo);
    setGain(ev.xp > 0 ? { xp: ev.xp, key: Date.now() } : null);
    if (correct) {
      sfx.correct();
      if (ev.lvlUp) setTimeout(sfx.levelUp, 200);
      setPhase('right');
      setMarks({ [q.name]: 'right' });
      setFeedback(ev.mastered ? '⭐ Mastered!' : cheer());
      timer.current = setTimeout(
        () => {
          if (ev.stageCleared) onStageCleared(ev.stageCleared);
          else advance();
        },
        ev.mastered ? 1100 : 750
      );
    } else {
      sfx.wrong();
      setPhase('wrong');
      setShake((k) => k + 1);
      setMarks(wrongMarks);
      setFeedback(wrongMsg);
    }
  }

  function onMapClick(c) {
    if (!q || q.mode !== 'tap' || phase !== 'asking') return;
    if (c.name === q.name) resolve(true);
    else
      resolve(false, { [q.name]: 'target', [c.name]: 'wrong' }, `That was ${c.name} County. ${q.name} County is glowing yellow.`);
  }

  function onPick(opt, i) {
    if (phase !== 'asking') return;
    setPicked(i);
    if (opt.correct) resolve(true);
    else
      resolve(
        false,
        { [q.name]: 'target' },
        isCounty ? `That one is ${q.name} County.` : `The county seat of ${q.name} County is ${county.seat}.`
      );
  }

  function onSubmitText(e) {
    e.preventDefault();
    if (phase !== 'asking' || !text.trim()) return;
    const target = isCounty ? q.name : county.seat;
    if (isMatch(text, target)) resolve(true);
    else
      resolve(
        false,
        { [q.name]: 'target' },
        isCounty
          ? `That glowing county is ${q.name} County.`
          : `The county seat of ${q.name} County is ${county.seat}.`
      );
  }

  useKey(
    (e) => {
      if (phase === 'wrong' && e.key === 'Enter') {
        e.preventDefault();
        advance();
      }
      if (phase === 'asking' && q && q.mode === 'choice' && ['1', '2', '3', '4'].includes(e.key)) {
        const i = Number(e.key) - 1;
        if (q.options[i]) onPick(q.options[i], i);
      }
    },
    [phase, q]
  );

  const progress = isCounty ? countiesMastered(state) : seatsMastered(state);

  const prompt = !q
    ? ''
    : isCounty
    ? q.mode === 'choice'
      ? 'Which county is glowing?'
      : q.mode === 'tap'
      ? `Find ${q.name} County`
      : 'Type the name of the glowing county'
    : `What is the county seat of ${q.name} County?`;

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-3 p-3 sm:p-5">
      {/* top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button color="slate" onClick={onExit}>
          ← Back
        </Button>
        <div className="min-w-0 flex-1">
          <div className="font-display truncate text-lg font-semibold" style={{ color: stage.color }}>
            {stage.emoji} Stage {top}: {stage.name}
            {!isCounty && <span className="text-slate-300"> · County Seats</span>}
          </div>
          <StagePips state={state} kind={kind} stage={top} />
        </div>
        <div className="relative flex items-center gap-3 font-display text-lg">
          <span title="Combo" className={combo >= 3 ? 'text-orange-400' : 'text-slate-400'}>
            🔥 {combo}
          </span>
          <span title="XP" className="text-amber-300">
            ⭐ {state.xp}
          </span>
          {gain && (
            <span key={gain.key} className="float-up absolute top-full right-0 font-bold text-emerald-300">
              +{gain.xp}
            </span>
          )}
        </div>
      </div>

      <div className="grid flex-1 items-start gap-4 lg:grid-cols-[1fr_390px]">
        <Card className="p-2 sm:p-3">
          <OklahomaMap
            styleFor={(c) => masteryStyle(state, kind, c, top)}
            clickable={(c) => Boolean(q && q.mode === 'tap' && phase === 'asking' && c.stage <= top)}
            onCountyClick={onMapClick}
            marks={marks}
            focus={unlocked}
          />
        </Card>

        <div className="flex flex-col gap-3">
          {phase === 'done' && (
            <Card className="text-center">
              <div className="text-5xl">🎉</div>
              <h2 className="font-display mt-2 text-2xl font-semibold">Everything here is mastered!</h2>
              <p className="mt-1 text-slate-300">
                {progress} {isCounty ? 'counties' : 'county seats'} mastered so far.
              </p>
              <Button className="mt-4" onClick={onExit}>
                Back to the map
              </Button>
            </Card>
          )}

          {q && (
            <Card key={shake} className={phase === 'wrong' ? 'shake' : 'pop'}>
              <div className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
                {q.mode === 'choice' ? 'Pick one' : q.mode === 'tap' ? 'Tap the map' : 'Type it'}
              </div>
              <h2 className="font-display mt-1 text-2xl leading-tight font-semibold sm:text-3xl">{prompt}</h2>

              {q.mode === 'tap' && phase === 'asking' && (
                <p className="mt-2 text-sm text-slate-400">Tap the county on the map. Use + and − to zoom.</p>
              )}

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
                        key={o.value}
                        disabled={phase !== 'asking'}
                        onClick={() => onPick(o, i)}
                        className={`font-display flex items-center gap-3 rounded-2xl border-b-4 px-4 py-3 text-left text-xl font-semibold transition active:translate-y-0.5 ${cls}`}
                      >
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-black/25 text-sm">{i + 1}</span>
                        {isCounty ? `${o.value} County` : o.value}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.mode === 'type' && (
                <form onSubmit={onSubmitText} className="mt-4 flex gap-2">
                  <input
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={phase !== 'asking'}
                    autoComplete="off"
                    autoCapitalize="words"
                    spellCheck={false}
                    placeholder={isCounty ? 'County name' : 'County seat'}
                    className="font-display min-w-0 flex-1 rounded-2xl border-2 border-slate-600 bg-slate-900 px-4 py-3 text-xl outline-none focus:border-orange-400"
                  />
                  <Button type="submit" color="green" disabled={phase !== 'asking' || !text.trim()}>
                    Check
                  </Button>
                </form>
              )}

              {phase === 'right' && (
                <div className="pop font-display mt-4 rounded-2xl bg-emerald-500/20 px-4 py-3 text-xl font-semibold text-emerald-300">
                  ✅ {feedback}
                  {!isCounty && <div className="text-base font-medium text-emerald-200">{answerText}</div>}
                </div>
              )}

              {phase === 'wrong' && (
                <div className="pop mt-4">
                  <div className="rounded-2xl bg-red-500/15 px-4 py-3 text-lg text-red-200">
                    <span className="font-display font-semibold">Not quite.</span> {feedback}
                  </div>
                  <Button color="orange" className="mt-3 w-full" onClick={advance}>
                    Got it — keep going ↵
                  </Button>
                </div>
              )}
            </Card>
          )}

          <p className="px-1 text-center text-sm text-slate-400">
            {isCounty ? `${progress} of 77 counties mastered` : `${progress} of 77 county seats mastered`}
          </p>
        </div>
      </div>
    </div>
  );
}
