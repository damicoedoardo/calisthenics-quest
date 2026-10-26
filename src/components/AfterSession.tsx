'use client';

import { useEffect, useMemo, useState } from 'react';
import { Hero } from './Hero';
import { Ember } from './Characters';
import { music } from '@/lib/music';
import { gearOf, levelInfo, totalXp, type FinishResult } from '@/lib/game';
import type { StoryState } from '@/lib/story';
import { emberStage, stopAt } from '@/lib/road';

const CONFETTI = ['#fbbf24', '#f97316', '#22d3ee', '#a78bfa', '#34d399'];

interface Props {
  result: FinishResult;
  before: StoryState;
  after: StoryState;
  onClose: () => void;
}

/** After a session: Ember grows and the Fog pulls back from one more stop, then the loot. */
export function AfterSession({ result, before, onClose }: Props) {
  const [stage, setStage] = useState<'light' | 'loot'>(before.chapter ? 'light' : 'loot');
  const [lit, setLit] = useState(false);
  const sessions = result.state.sessions.length;
  const emberBefore = emberStage(sessions - 1);
  const emberNow = emberStage(sessions);
  const grew = emberNow.index > emberBefore.index;
  const stop = stopAt(sessions - 1);

  useEffect(() => {
    if (stage !== 'light') return;
    const t = setTimeout(() => {
      setLit(true);
      music.sting('victory');
    }, 700);
    return () => clearTimeout(t);
  }, [stage]);

  if (stage === 'light' && before.chapter) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink-950 px-6 text-center" onClick={() => lit && setStage('loot')}>
        <p className="font-pixel text-[10px] text-slate-400">Chapter {before.chapter.n} · {before.chapter.name}</p>
        <div className="relative mt-8 grid h-40 place-items-end">
          <div className={`absolute inset-x-[-40px] bottom-0 h-28 rounded-full bg-orange-500/20 blur-2xl transition-opacity duration-1000 ${lit ? 'opacity-100' : 'opacity-0'}`} />
          <div className="relative transition-transform duration-700" style={{ transform: `scale(${lit ? 1 : emberBefore.size / emberNow.size})` }}>
            <Ember size={emberNow.size * 1.6} />
          </div>
        </div>
        <p className="mt-4 font-pixel text-xs text-gold-300">{lit ? (grew ? `Ember became a ${emberNow.stage.name}!` : 'Ember grows') : 'Ember drinks it in...'}</p>
        {lit && (
          <>
            <p className="mt-3 text-sm text-slate-300">
              {stop ? (
                <>
                  The Fog pulls back. <span className="text-gold-300">{stop.name}</span> is lit on the map.
                </>
              ) : (
                'The whole road is lit.'
              )}
            </p>
            {grew && <p className="mt-1 text-xs text-orange-300">New: {emberNow.stage.perk}</p>}
            <button className="mt-8 rounded-2xl bg-gold-400 px-8 py-3.5 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309]">Claim loot</button>
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
