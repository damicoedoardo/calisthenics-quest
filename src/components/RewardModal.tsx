'use client';

import { useMemo } from 'react';
import { Hero } from './Hero';
import type { FinishResult } from '@/lib/game';
import { equippedGear } from '@/lib/game';

const CONFETTI = ['#fbbf24', '#f97316', '#22d3ee', '#a78bfa', '#34d399'];

export function RewardModal({ result, onClose }: { result: FinishResult; onClose: () => void }) {
  const { session, newGear, levelBefore, levelAfter } = result;
  const leveled = levelAfter > levelBefore;
  const big = leveled || newGear.length > 0;
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6 backdrop-blur-sm" onClick={onClose}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        {pieces.map((p, i) => (
          <span
            key={i}
            className="absolute top-0 h-2.5 w-2.5 animate-fall"
            style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
          />
        ))}
      </div>
      <div className="w-full max-w-sm animate-pop rounded-3xl bg-ink-800 p-6 text-center pixel-border" onClick={(e) => e.stopPropagation()}>
        <p className="font-pixel text-sm text-gold-300">{session.kind === 'full' ? 'Quest complete!' : 'Mini quest claimed!'}</p>
        <p className="mt-3 text-4xl font-bold text-gold-400">+{session.xp} XP</p>
        {leveled && <p className="mt-2 font-pixel text-xs text-sky-300">Level up! You are now level {levelAfter}</p>}

        {newGear.length > 0 && (
          <div className="mt-4 flex flex-col items-center">
            <Hero gear={equippedGear(result.state)} size={140} />
            {newGear.map((g) => (
              <p key={g.name} className="mt-1 text-sm">
                New gear: <span className="font-semibold" style={{ color: g.color }}>{g.name}</span>
              </p>
            ))}
            <p className="mt-1 text-xs text-slate-400">Next skill unlocked. Check your skill tree.</p>
          </div>
        )}

        {session.kind === 'mini' && newGear.length === 0 && (
          <p className="mt-3 text-sm text-slate-300">Showing up is the hardest rep. Your week is still alive.</p>
        )}
        {session.kind === 'full' && newGear.length === 0 && !leveled && (
          <p className="mt-3 text-sm text-slate-300">Another brick in the wall. Same time next session?</p>
        )}

        <button onClick={onClose} className="mt-6 w-full rounded-2xl bg-gold-400 py-3.5 font-pixel text-xs text-ink-950 active:scale-[.98]">
          Continue
        </button>
      </div>
    </div>
  );
}
