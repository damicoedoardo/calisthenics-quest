'use client';

import { useEffect, useMemo, useState } from 'react';
import { Heart } from 'lucide-react';
import { Hero } from './Hero';
import { Enemy } from './Characters';
import { music } from '@/lib/music';
import { gearOf, levelInfo, totalXp, type FinishResult } from '@/lib/game';
import { tierText } from '@/lib/gear';
import { storyWords, type StoryState } from '@/story/engine';
import { afterWorkoutLine } from '@/story/daily';

const CONFETTI = ['#fbbf24', '#f97316', '#22d3ee', '#a78bfa', '#34d399'];

interface Props {
  result: FinishResult;
  before: StoryState;
  after: StoryState;
  onClose: () => void;
}

/** After a session: a short battle against the chapter enemy, then the loot. */
export function AfterSession({ result, before, after, onClose }: Props) {
  const [stage, setStage] = useState<'battle' | 'loot'>(before.chapter ? 'battle' : 'loot');
  const [hit, setHit] = useState(false);
  const reps = result.session.entries.reduce((a, e) => a + e.sets.reduce((b, s) => b + s.reps, 0), 0);
  const defeated = before.chapter && (after.index > before.index || (after.heartsLeft === 0 && before.heartsLeft > 0));
  const heartsShown = hit ? Math.max(0, before.heartsLeft - 1) : before.heartsLeft;

  useEffect(() => {
    if (stage !== 'battle') return;
    const t = setTimeout(() => {
      setHit(true);
      music.sting('victory');
    }, 700);
    return () => clearTimeout(t);
  }, [stage]);

  if (stage === 'battle' && before.chapter) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink-950 px-6 text-center" onClick={() => hit && setStage('loot')}>
        <p className="font-pixel text-[10px] text-slate-400">Chapter {before.chapter.n}</p>
        <p className="mt-1 font-pixel text-xs text-gold-300">vs {before.chapter.enemy}</p>
        <div className="relative mt-8 flex items-end gap-10">
          <Hero gear={gearOf(result.state)} classId={result.state.profile.classId} size={110} bounce={false} />
          <div className={`relative ${hit ? 'animate-shake' : ''} ${defeated && hit ? 'opacity-30 grayscale transition-all duration-700' : ''}`}>
            <Enemy id={before.chapter.enemySprite} size={96} />
            {hit && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 animate-hit font-pixel text-sm text-red-400">-{reps}</span>
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-1">
          {Array.from({ length: before.hearts }).map((_, i) => (
            <Heart key={i} size={16} className={`transition-all duration-500 ${i < heartsShown ? 'fill-red-500 text-red-500' : 'text-ink-600'}`} />
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-300">
          {!hit
            ? 'Your reps strike...'
            : defeated
              ? `${before.chapter.enemy} is defeated!`
              : before.heartsLeft === 0
                ? `Your training hit for ${reps}. Your max test on the Hero tab finishes it.`
                : `Your training hit for ${reps}. One heart down.`}
        </p>
        {hit && <button className="mt-8 rounded-2xl bg-gold-400 px-8 py-3.5 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309]">Claim loot</button>}
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
  // The flame's word on this workout: the first, a comeback, a new best, a short one...
  const flameSays = useMemo(() => afterWorkoutLine(result.state), [result.state]);
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
    // Scrolls when the card is taller than a small screen (a level-up and new gear at once).
    <div className="fixed inset-0 z-50 flex overflow-y-auto bg-black/80 p-6 backdrop-blur-sm">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        {pieces.map((p, i) => (
          <span
            key={i}
            className="absolute top-0 h-2.5 w-2.5 animate-fall"
            style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
          />
        ))}
      </div>
      <div className="m-auto w-full max-w-sm animate-pop rounded-3xl bg-ink-800 p-6 text-center pixel-border">
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
                Forged: <span className="font-semibold" style={{ color: tierText(g.tier) }}>{g.name}</span>
              </p>
            ))}
            <p className="mt-1 text-xs text-slate-400">Next skill unlocked on your tree.</p>
          </div>
        )}

        {flameSays && (
          <p className="mt-4 text-sm italic leading-snug text-slate-300">
            <span className="not-italic text-orange-300">{storyWords(result.state).flame}:</span> &ldquo;{flameSays}&rdquo;
          </p>
        )}

        <button onClick={onClose} className="mt-6 w-full rounded-2xl bg-gold-400 py-3.5 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none">
          Continue
        </button>
      </div>
    </div>
  );
}
