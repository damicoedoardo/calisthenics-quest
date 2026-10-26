'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Star, X } from 'lucide-react';
import { Hero } from './Hero';
import { Ember } from './Characters';
import { Foe } from './Battle';
import { stopLabel } from './WorkoutFight';
import { music } from '@/lib/music';
import { gearOf, levelInfo, totalXp, type FinishResult } from '@/lib/game';
import type { StoryState } from '@/lib/story';
import { emberStage, patrolAt, roadState, stopAt } from '@/lib/road';
import type { WorkoutFight } from '@/lib/fight';

const CONFETTI = ['#fbbf24', '#f97316', '#22d3ee', '#a78bfa', '#34d399'];

interface Props {
  result: FinishResult;
  before: StoryState;
  after: StoryState;
  /** The fight the workout had, for the stars' reasons. */
  fight?: WorkoutFight;
  onClose: () => void;
}

/** After a session: the fight is won, its stars, Ember grows, then the loot. */
export function AfterSession({ result, fight, onClose }: Props) {
  const won = result.session.fight;
  const [stage, setStage] = useState<'victory' | 'loot'>(won ? 'victory' : 'loot');
  const [shown, setShown] = useState(false);
  const sessions = result.state.sessions.length;
  const emberBefore = emberStage(sessions - 1);
  const emberNow = emberStage(sessions);
  const grew = emberNow.index > emberBefore.index;

  useEffect(() => {
    if (stage !== 'victory') return;
    const t = setTimeout(() => {
      setShown(true);
      music.sting('victory');
    }, 600);
    return () => clearTimeout(t);
  }, [stage]);

  if (stage === 'victory' && won) {
    const foe = won.patrol ? patrolAt(won.g) : stopAt(won.g)!;
    const next = roadState(result.state).next;
    const grades = fight?.blows.flatMap((b) => b.guards ?? []) ?? [];
    const perfect = grades.filter((g) => g === 'perfect').length;
    const falls = fight?.blows.filter((b) => b.down).length ?? 0;
    const fell = falls > 0;
    const finalBlow = foe.kind === 'boss' && foe.blow && foe.blow.n === foe.blow.of;
    const title = won.patrol
      ? 'Patrol beaten'
      : foe.kind === 'boss'
        ? finalBlow
          ? `${foe.name} falls!`
          : `A blow lands on ${foe.name}!`
        : `${foe.name} defeated!`;
    const line = won.patrol
      ? 'The final blow still waits for your max test on the Hero tab.'
      : foe.kind === 'boss'
        ? finalBlow
          ? 'The chapter is yours. The Fog pulls back from the whole valley.'
          : `Blow ${foe.blow?.n} of ${foe.blow?.of}. It flees up the road. Next week, the next blow.`
        : result.session.kind === 'mini'
          ? 'Small still counts. Ember finished it with you.'
          : 'Your sets did that. Every one of them.';
    const reasons = [
      { ok: true, text: 'Won the fight' },
      { ok: !fell, text: fell ? `You fell ${falls === 1 ? 'once' : `${falls} times`}, and got back up` : 'Never fell' },
      { ok: !fell && perfect * 2 >= grades.length, text: grades.length ? `Perfect guards: ${perfect} of ${grades.length}` : 'Perfect guards' },
    ];

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-ink-950 px-6 py-8 text-center" onClick={() => shown && setStage('loot')}>
        <p className="font-pixel text-[10px] text-slate-400">{stopLabel(foe, won.patrol)}</p>
        <div className="relative mt-6 flex items-end gap-8">
          <Hero gear={gearOf(result.state)} classId={result.state.profile.classId} size={112} />
          <div className={`transition-all duration-700 ${shown ? 'opacity-30 grayscale' : ''}`}>
            <Foe sprite={foe.sprite} size={foe.kind === 'boss' ? 112 : 96} gear={gearOf(result.state)} classId={result.state.profile.classId} />
          </div>
        </div>
        <p className="mt-5 font-pixel text-xs leading-relaxed text-gold-300">{title}</p>
        <p className="mt-2 text-sm text-slate-300">{line}</p>

        <div className="mt-5 flex gap-2" aria-label={`${won.stars} of 3 stars`}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={shown ? 'animate-pop' : 'opacity-0'} style={{ animationDelay: `${n * 0.25}s` }}>
              <Star size={34} className={n <= won.stars ? 'fill-gold-400 text-gold-400' : 'text-ink-600'} />
            </span>
          ))}
        </div>
        <ul className="mt-3 space-y-1 text-left text-xs">
          {reasons.map((r) => (
            <li key={r.text} className={`flex items-center gap-2 ${r.ok ? 'text-slate-200' : 'text-slate-500'}`}>
              {r.ok ? <Check size={13} className="text-emerald-400" /> : <X size={13} />}
              {r.text}
            </li>
          ))}
        </ul>

        {shown && (
          <>
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-ink-800 px-4 py-3 text-left">
              <Ember size={grew ? 48 : 36} />
              <p className="text-xs text-slate-300">
                {grew ? (
                  <>
                    <span className="font-pixel text-[10px] text-gold-300">Ember became a {emberNow.stage.name}!</span>
                    <br />
                    New: {emberNow.stage.perk}
                  </>
                ) : (
                  'Ember grows a little with every workout.'
                )}
                {next && (
                  <>
                    <br />
                    <span className="text-slate-500">Next on the road: {next.name}</span>
                  </>
                )}
              </p>
            </div>
            <button className="mt-6 rounded-2xl bg-gold-400 px-8 py-3.5 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309]">Claim loot</button>
          </>
        )}
      </div>
    );
  }

  return <Loot result={result} onClose={onClose} />;
}

function Loot({ result, onClose }: { result: FinishResult; onClose: () => void }) {
  const { session, newGear, levelBefore, levelAfter } = result;
  const leveled = levelAfter > levelBefore;
  const big = leveled || newGear.length > 0;
  const lvl = levelInfo(totalXp(result.state));
  const pieces = useMemo(
    () =>
      Array.from({ length: big ? 40 : 18 }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.8 + Math.random() * 1.6,
        color: CONFETTI[i % CONFETTI.length],
      })),
    [big],
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6 backdrop-blur-sm">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        {pieces.map((p, i) => (
          <span
            key={i}
            className="absolute top-0 h-2.5 w-2.5 animate-fall"
            style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
          />
        ))}
      </div>
      <div className="w-full max-w-sm animate-pop rounded-3xl bg-ink-800 p-6 text-center pixel-border">
        <p className="font-pixel text-sm text-gold-300">{session.kind === 'full' ? 'Quest complete!' : 'Minimum quest!'}</p>
        <ul className="mt-4 space-y-1 text-sm">
          {session.breakdown.map((l, i) => (
            <li key={i} className="flex justify-between text-slate-300">
              <span>{l.label}</span>
              <span className="font-mono text-gold-300">+{l.xp}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-ink-600 pt-3 text-4xl font-bold text-gold-400">+{session.xp} XP</p>
        {leveled && (
          <p className="mt-2 font-pixel text-[11px] leading-relaxed text-sky-300">
            Level {levelAfter}. {lvl.title}.
            <br />
            <span className="text-slate-400">Not because you&apos;re strong. Because you came back.</span>
          </p>
        )}

        {newGear.length > 0 && (
          <div className="mt-4 flex flex-col items-center">
            <Hero gear={gearOf(result.state)} classId={result.state.profile.classId} size={130} />
            {newGear.map((g) => (
              <p key={g.slot} className="mt-1 text-sm">
                Forged: <span className="font-semibold" style={{ color: g.color }}>{g.name}</span>
              </p>
            ))}
            <p className="mt-1 text-xs text-slate-400">Next skill unlocked on your tree.</p>
          </div>
        )}

        {session.kind === 'mini' && newGear.length === 0 && <p className="mt-3 text-sm text-slate-300">Small still counts. Your week is alive.</p>}

        <button onClick={onClose} className="mt-6 w-full rounded-2xl bg-gold-400 py-3.5 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none">
          Continue
        </button>
      </div>
    </div>
  );
}
