'use client';

import { spWorn } from '@/lib/sp';
import { useEffect, useMemo, useState } from 'react';
import { Share2 } from 'lucide-react';
import { Hero } from './Hero';
import { Enemy } from './Characters';
import { Sprite } from './Sprite';
import { music } from '@/lib/music';
import { EMBERS } from '@/lib/forge';
import { SWEAT } from '@/balance';
import { gearOf, levelInfo, totalXp, type FinishResult } from '@/lib/game';
import { tierText } from '@/lib/gear';
import { planExercises } from '@/lib/program';
import { pointsEarned } from '@/lib/stats';
import { LootIcon } from './Purse';
import type { StoryState } from '@/story/engine';
import { afterWorkoutLine } from '@/story/daily';
import { heroVariant } from '@/story/flame';

const CONFETTI = ['#fbbf24', '#f97316', '#22d3ee', '#a78bfa', '#34d399'];

interface Props {
  result: FinishResult;
  before: StoryState;
  after: StoryState;
  onClose: () => void;
  /** How the workout felt, for the coach. */
  onFelt?: (felt: Felt, comment: string) => void;
  /** Share it with friends (signed in only): opens the share page. */
  onShare?: () => void;
}

type Felt = NonNullable<FinishResult['session']['felt']>;
const FELT: { id: Felt; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'right', label: 'Just right' },
  { id: 'hard', label: 'Hard' },
];

/** After a session: a short battle against the chapter enemy, then the loot. */
export function AfterSession({ result, before, after, onClose, onFelt, onShare }: Props) {
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
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink-950 px-6 text-center [@media(orientation:landscape)_and_(max-height:600px)]:py-3" onClick={() => hit && setStage('loot')}>
        <p className="font-pixel text-[10px] text-slate-400">Chapter {before.chapter.n}</p>
        <p className="mt-1 font-pixel text-xs text-gold-300">vs {before.chapter.enemy}</p>
        <div className="relative mt-8 flex items-end gap-10 [@media(orientation:landscape)_and_(max-height:600px)]:mt-4">
          <Hero gear={gearOf(result.state)} classId={result.state.profile.classId} size={110} bounce={false} variant={heroVariant(result.state)} sp={spWorn(result.state)} />
          <div className={`relative ${hit ? 'animate-shake' : ''} ${defeated && hit ? 'opacity-30 grayscale transition-all duration-700' : ''}`}>
            <Enemy id={before.chapter.enemySprite} size={96} />
            {hit && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 animate-hit font-pixel text-sm text-red-400">-{reps}</span>
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-center [@media(orientation:landscape)_and_(max-height:600px)]:mt-4">
          {Array.from({ length: before.hearts }).map((_, i) => (
            // The heart this session takes pops as it goes dark.
            <Sprite key={i} id="uiIcon" opts={{ name: i < heartsShown ? 'heart' : 'heartEmpty' }} size={18} label="" className={hit && i === heartsShown && i < before.heartsLeft ? 'animate-pop' : ''} />
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-300">
          {!hit
            ? 'Your reps strike...'
            : defeated
              ? `${before.chapter.enemy} is defeated!`
              : `Your training hit for ${reps}. One heart down.`}
        </p>
        {hit && <button className="mt-8 [@media(orientation:landscape)_and_(max-height:600px)]:mt-5 rounded-2xl bg-gold-400 px-8 py-3.5 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309]">Claim loot</button>}
      </div>
    );
  }

  return <Loot result={result} onClose={onClose} onFelt={onFelt} onShare={onShare} />;
}

function Loot({ result, onClose, onFelt, onShare }: { result: FinishResult; onClose: () => void; onFelt?: Props['onFelt']; onShare?: Props['onShare'] }) {
  const { session, newGear, levelBefore, levelAfter } = result;
  const [felt, setFelt] = useState<Felt | null>(null);
  const [comment, setComment] = useState('');
  const nameOf = (id: string) => session.entries.find((e) => e.exerciseId === id)?.name ?? planExercises().find((x) => x.id === id)?.name ?? id;
  const leveled = levelAfter > levelBefore;
  const big = leveled || newGear.length > 0;
  const lvl = levelInfo(totalXp(result.state));
  const points = pointsEarned(result.state).total - pointsEarned({ ...result.state, sessions: result.state.sessions.slice(0, -1) }).total;
  // The flame's word on this workout: the first, a comeback, a new best, a short one...
  // Until the player names their flame (in the first chapter's scene) it's just "A spark", as in the scenes.
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
    <div className="land-safe-x fixed inset-0 z-50 flex overflow-y-auto bg-black/80 p-6 backdrop-blur-sm [@media(orientation:landscape)_and_(max-height:600px)]:py-3">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        {pieces.map((p, i) => (
          <span
            key={i}
            className="absolute top-0 h-2.5 w-2.5 animate-fall"
            style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
          />
        ))}
      </div>
      {/* Held sideways: what you earned on the left, the level, gear and the flame's word on the right. */}
      <div className="m-auto w-full max-w-sm animate-pop rounded-3xl bg-ink-800 p-6 text-center pixel-border [@media(orientation:landscape)_and_(max-height:600px)]:grid [@media(orientation:landscape)_and_(max-height:600px)]:max-w-3xl [@media(orientation:landscape)_and_(max-height:600px)]:grid-cols-2 [@media(orientation:landscape)_and_(max-height:600px)]:items-center [@media(orientation:landscape)_and_(max-height:600px)]:gap-x-8 [@media(orientation:landscape)_and_(max-height:600px)]:p-5">
        <div className="contents [@media(orientation:landscape)_and_(max-height:600px)]:block">
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
        {/* What the Hero tab gets: points for the champion, embers for Mira's forge, a sweat coin.
            The same icons as the Hero tab's purse, popping in one by one. */}
        <div className="mt-2 flex justify-center gap-2">
          {[
            { id: 'points' as const, n: points, color: 'text-emerald-300', label: `point${points === 1 ? '' : 's'}` },
            { id: 'embers' as const, n: EMBERS[session.kind], color: 'text-orange-300', label: 'embers' },
            { id: 'coins' as const, n: SWEAT.perWorkout, color: 'text-yellow-200', label: `coin${SWEAT.perWorkout === 1 ? '' : 's'}` },
          ].map((c, i) => (
            <span key={c.id} className={`flex items-center gap-1.5 rounded-lg bg-ink-900 px-2.5 py-1.5 font-pixel text-[9px] ${c.color} motion-safe:animate-pop`} style={{ animationDelay: `${0.4 + i * 0.2}s` }}>
              <LootIcon id={c.id} size={14} /> +{c.n} {c.label}
            </span>
          ))}
        </div>
        {!!session.minutes && (
          <p className="mt-2 font-mono text-xs text-slate-300">
            Time {session.minutes} min{session.planned ? ` · planned about ${session.planned}` : ''}
          </p>
        )}
        {session.better && <p className="mt-1 text-xs text-emerald-300">Better than last time.</p>}
        {!!session.heavier?.length && <p className="mt-1 text-xs text-sky-300">Next time, a little heavier: {session.heavier.map(nameOf).join(', ')}.</p>}
        </div>
        <div className="contents [@media(orientation:landscape)_and_(max-height:600px)]:block">
        {leveled && (
          <p className="mt-2 [@media(orientation:landscape)_and_(max-height:600px)]:mt-0 font-pixel text-[11px] leading-relaxed text-sky-300">
            Level {levelAfter}. {lvl.title}.
            <br />
            <span className="text-slate-400">Not because you&apos;re strong. Because you came back.</span>
          </p>
        )}

        {newGear.length > 0 && (
          <div className="mt-4 [@media(orientation:landscape)_and_(max-height:600px)]:first:mt-0 flex flex-col items-center">
            <Hero gear={gearOf(result.state)} classId={result.state.profile.classId} size={130} variant={heroVariant(result.state)} sp={spWorn(result.state)} />
            {newGear.map((g) => (
              <p key={g.slot} className="mt-1 text-sm">
                Forged: <span className="font-semibold" style={{ color: tierText(g.tier) }}>{g.name}</span>
              </p>
            ))}
            <p className="mt-1 text-xs text-slate-400">Mira forged it from your workouts.</p>
          </div>
        )}

        {flameSays && (
          <p className="mt-4 [@media(orientation:landscape)_and_(max-height:600px)]:first:mt-0 text-sm italic leading-snug text-slate-300">
            <span className="not-italic text-orange-300">{result.state.profile.flame || 'A spark'}:</span> &ldquo;{flameSays}&rdquo;
          </p>
        )}

        {onFelt && (
          <div className="mt-4 rounded-xl bg-ink-900 p-3 text-left [@media(orientation:landscape)_and_(max-height:600px)]:first:mt-0">
            <p className="text-xs font-semibold text-slate-300">How did it feel?</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {FELT.map((f) => (
                <button key={f.id} aria-pressed={felt === f.id} onClick={() => setFelt(f.id)} className={`rounded-lg py-2 text-xs font-semibold ${felt === f.id ? 'bg-gold-400 text-ink-950' : 'bg-ink-800 text-slate-200'}`}>
                  {f.label}
                </button>
              ))}
            </div>
            {felt && (
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="A word for your coach (optional)"
                className="mt-2 w-full rounded-lg bg-ink-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-gold-400"
              />
            )}
          </div>
        )}

        <button
          onClick={() => {
            if (felt && onFelt) onFelt(felt, comment.trim().slice(0, 200));
            onClose();
          }}
          className="mt-6 w-full rounded-2xl bg-gold-400 py-3.5 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none">
          Continue
        </button>
        {onShare && (
          <button
            onClick={() => {
              if (felt && onFelt) onFelt(felt, comment.trim().slice(0, 200));
              onShare();
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink-700 py-3 text-sm font-semibold text-slate-100"
          >
            <Share2 size={16} /> Share with friends
          </button>
        )}
        </div>
      </div>
    </div>
  );
}
