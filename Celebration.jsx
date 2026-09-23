import { Button, Card, Confetti } from './ui.jsx';
import { BADGES } from '../lib/game.js';
import { STAGES, N_STAGES } from '../lib/stages.js';

export default function Celebration({ kind, stageNum, badges, onContinue }) {
  const stage = STAGES[stageNum - 1];
  const last = stageNum >= N_STAGES;
  const isCounty = kind === 'county';
  return (
    <div className="mx-auto grid min-h-full max-w-xl place-items-center p-4">
      <Confetti burst={stageNum} />
      <Card className="pop text-center">
        <div className="text-7xl">{stage.emoji}</div>
        <div className="font-display mt-2 text-sm font-semibold tracking-widest text-slate-400 uppercase">
          {isCounty ? 'Stage cleared' : 'County seats cleared'}
        </div>
        <h1 className="font-display text-4xl font-bold" style={{ color: stage.color }}>
          {stage.name}
        </h1>
        <p className="mt-2 text-lg text-slate-200">+100 XP bonus</p>
        {badges.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {badges.map((id) => (
              <div key={id} className="rounded-2xl bg-slate-900/70 px-3 py-2 text-left">
                <span className="text-2xl">{BADGES[id].emoji}</span>{' '}
                <span className="font-display font-semibold">{BADGES[id].name}</span>
                <div className="text-xs text-slate-400">{BADGES[id].desc}</div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-slate-300">
          {last
            ? isCounty
              ? 'All 77 counties are yours. Time for the Full Map Challenge!'
              : 'Every county seat is mastered. Your certificate is ready!'
            : isCounty
            ? `Next up: Stage ${stageNum + 1}, ${STAGES[stageNum].name}.`
            : `Next up: the seats for ${STAGES[stageNum].name}.`}
        </p>
        <Button big color="green" className="mt-5 w-full" onClick={onContinue}>
          Continue
        </Button>
      </Card>
    </div>
  );
}
