'use client';

import { useEffect, useRef, useState } from 'react';
import { Hero } from './Hero';
import { Hollow } from './Characters';
import { SoundToggle, useMusic } from './Sound';
import { FIGHT_TURNS } from '@/story/opening';
import type { Gear, GearSlot } from '@/lib/gear';

type Phase = 'ready' | 'strike' | 'answer' | 'down';

const HERO_HP = [100, 62, 28, 0];
const HOLLOW_HP = [100, 99, 98, 97];

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="w-full">
      <p className="mb-1 font-pixel text-[9px] text-slate-400">{label}</p>
      <div className="h-2.5 overflow-hidden rounded-sm bg-ink-700">
        <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/** The fight you can't win: three strikes, three answers, and you fall. */
export function FirstFight({ voice, gear, onDone }: { voice: string; gear: Record<GearSlot, Gear>; onDone: () => void }) {
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const done = useRef(onDone);
  done.current = onDone;
  useMusic('hollow');

  useEffect(() => {
    if (phase === 'strike') {
      const t = setTimeout(() => setPhase('answer'), 1500);
      return () => clearTimeout(t);
    }
    if (phase === 'answer') {
      navigator.vibrate?.(120);
      const t = setTimeout(() => {
        if (turn + 1 >= FIGHT_TURNS.length) setPhase('down');
        else {
          setTurn(turn + 1);
          setPhase('ready');
        }
      }, 1900);
      return () => clearTimeout(t);
    }
    if (phase === 'down') {
      const t = setTimeout(() => done.current(), 2400);
      return () => clearTimeout(t);
    }
  }, [phase, turn]);

  const struck = phase === 'answer' || phase === 'down' ? turn + 1 : turn;
  const heroHp = HERO_HP[struck];
  const answer = (t: number) => FIGHT_TURNS[t].answer.replace('{voice}', voice || "You're not enough.");
  const text =
    phase === 'strike'
      ? FIGHT_TURNS[turn].strike
      : phase === 'answer' || phase === 'down'
        ? answer(turn)
        : turn === 0
          ? "The Hollow waits. It doesn't even raise its sword."
          : answer(turn - 1);
  const hollowSpeaks = phase === 'answer' || phase === 'down' || (phase === 'ready' && turn > 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-950">
      {phase === 'answer' && <div className="pointer-events-none fixed inset-0 z-[55] animate-flash bg-red-900" aria-hidden />}
      <div className="safe-top flex px-4">
        <SoundToggle />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8">
        <div className="mt-2 grid grid-cols-2 gap-6">
          <Bar label="You" pct={heroHp} color="#22c55e" />
          <Bar label="The Hollow" pct={HOLLOW_HP[struck]} color="#7c3aed" />
        </div>

        <div className="flex flex-1 items-end justify-center gap-6 pb-6">
          <div
            className={`transition-all duration-1000 ${phase === 'strike' ? 'animate-lunge' : phase === 'answer' ? 'animate-shake' : ''}`}
            style={phase === 'down' ? { transform: 'rotate(-90deg) translateX(-30px)', filter: 'grayscale(1)', opacity: 0.6 } : undefined}
          >
            <Hero gear={gear} size={128} bounce={phase !== 'down'} action={phase === 'ready' ? turn : turn + 1} />
          </div>
          <div className={`relative ${phase === 'answer' ? 'animate-recoil' : ''}`}>
            <Hollow size={160} bounce={phase !== 'down'} action={struck} />
            {phase === 'strike' && <span className="absolute -top-2 left-1/2 -translate-x-1/2 animate-hit font-pixel text-sm text-slate-400">-1</span>}
          </div>
        </div>

        <div className={`min-h-[110px] rounded-xl p-4 pixel-border ${hollowSpeaks ? 'bg-[#140f1f]' : 'bg-ink-800'}`}>
          {hollowSpeaks && <p className="mb-2 font-pixel text-[10px] text-red-400">The Hollow</p>}
          <p key={text} className={`animate-fadein text-lg leading-snug ${hollowSpeaks ? 'text-red-100' : 'italic text-slate-300'}`}>
            {text}
          </p>
        </div>

        <button
          onClick={() => setPhase('strike')}
          disabled={phase !== 'ready'}
          className="mt-4 w-full rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] transition active:translate-y-1 active:shadow-none disabled:opacity-30"
        >
          Strike
        </button>
      </div>
    </div>
  );
}
