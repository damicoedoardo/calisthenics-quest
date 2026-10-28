'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { BookOpen, ChevronRight } from 'lucide-react';
import type { Checkin, GameState } from '@/lib/game';
import { CoachScreen } from './CoachChat';

// The library carries the whole exercise catalog, so it loads only when opened.
const ExerciseLibrary = dynamic(() => import('./ExerciseLibrary').then((m) => m.ExerciseLibrary), { ssr: false });

/** Training: the coach (your flame, its chat and the week it planned), and the exercise library. */
export function TrainTab({ state, update, onStart }: { state: GameState; update: (fn: (s: GameState) => GameState) => void; onStart: (c: Checkin) => void }) {
  const [library, setLibrary] = useState(false);
  return (
    <div className="space-y-4">
      <CoachScreen state={state} update={update} onStart={onStart} />
      <button onClick={() => setLibrary(true)} className="flex w-full items-center gap-3 rounded-xl bg-ink-800 p-3 text-left ring-1 ring-ink-700 active:bg-ink-700">
        <BookOpen size={18} className="shrink-0 text-gold-300" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Exercise library</span>
          <span className="block text-xs text-slate-400">870+ exercises, how to do each, pixel demos</span>
        </span>
        <ChevronRight size={16} className="text-slate-500" />
      </button>
      {library && <ExerciseLibrary state={state} onClose={() => setLibrary(false)} />}
    </div>
  );
}
