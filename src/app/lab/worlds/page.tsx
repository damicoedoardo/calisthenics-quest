'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { WorldPicker } from '@/components/WorldPicker';
import { addFakeWorkouts, skipDueScenes, skipIntro } from '@/lib/dev';
import { initialState, type GameState } from '@/lib/game';
import { ZONES, type RunBest } from '@/lib/fog';

/* The Play tab's world picker on a few made-up saves, to try the swipe, the locks and the
   cleared worlds without playing. Nothing here is saved. */

const DAY = 86_400_000;

/** A hero `workouts` sessions in, with `cleared` Fog bosses down and these best runs. */
function hero(workouts: number, cleared: number, best: Record<number, RunBest> = {}): GameState {
  const now = Date.now();
  let s = skipIntro(initialState(), new Date(now - 60 * DAY));
  if (workouts) s = addFakeWorkouts(s, workouts, new Date(now - DAY), true);
  s = { ...s, fog: { cleared, runs: Object.keys(best).length * 3, best } };
  return skipDueScenes(s, new Date());
}

const won = (seconds: number, level: number): RunBest => ({ seconds, level, kills: 120, won: true });
const lost = (seconds: number, level: number): RunBest => ({ seconds, level, kills: 60, won: false });

const SAVES: { name: string; make: () => GameState }[] = [
  { name: 'Fresh hero', make: () => hero(0, 0) },
  { name: 'Mid-way', make: () => hero(ZONES[1].workouts + 3, 1, { 0: won(212, 9), 1: lost(141, 6) }) },
  { name: 'Waiting on training', make: () => hero(ZONES[1].workouts + 5, 2, { 0: won(198, 10), 1: won(233, 11) }) },
  {
    name: 'All open',
    make: () => hero(ZONES[5].workouts + 2, 5, Object.fromEntries([0, 1, 2, 3, 4].map((i) => [i, won(180 + i * 11, 10 + i)]))),
  },
];

export default function WorldsLab() {
  const [pick, setPick] = useState(1);
  const state = useMemo(() => SAVES[pick].make(), [pick]);
  const [played, setPlayed] = useState('');

  return (
    <main className="safe-top mx-auto min-h-dvh max-w-md space-y-4 px-4 pb-16">
      <header className="flex items-center gap-3">
        <Link href="/lab" aria-label="Back to the Sprite Lab" className="rounded-lg bg-ink-800 p-2 text-slate-300">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="font-pixel text-sm text-gold-300">Worlds</h1>
          <p className="text-xs text-slate-500">The Play tab&apos;s world picker on made-up saves.</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {SAVES.map((s, i) => (
          <button
            key={s.name}
            onClick={() => setPick(i)}
            className={`rounded-lg px-3 py-1.5 text-xs ${i === pick ? 'bg-gold-400 font-semibold text-ink-950' : 'bg-ink-800 text-slate-300'}`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* A new picker per save, so each opens on its own newest world. */}
      <WorldPicker key={pick} state={state} onPlay={(z) => setPlayed(`Play: ${z.name}`)} />

      <p className="text-center text-xs text-slate-500" aria-live="polite">
        {played || 'Tap Play to see what it would start.'}
      </p>
    </main>
  );
}
