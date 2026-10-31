'use client';

import { useEffect } from 'react';
import { Film } from 'lucide-react';
import { warmRunSheets } from '@/game/sheets';
import type { GameState } from '@/lib/game';
import { ZONES, zoneStatus, type Zone } from '@/lib/fog';
import { waitingCount } from '@/story/engine';
import { WorldPicker } from './WorldPicker';
import { useLand } from './useLand';

interface Props {
  state: GameState;
  onPlay: (zone: Zone) => void;
  /** Open Story so far: every scene reached, to watch again. */
  onStory: () => void;
}

/**
 * While the Play tab sits idle, get the newest open zone's run ready: download and load the game
 * code and draw its sprite sheets (both are cached), so tapping Play goes straight to the run.
 */
function useWarmRun(state: GameState) {
  const zone = [...ZONES].reverse().find((z) => zoneStatus(state, z).state !== 'locked');
  const id = zone?.id;
  useEffect(() => {
    if (!zone) return;
    // Give the tab a moment to settle first.
    let stop = () => {};
    const t = window.setTimeout(() => {
      // The run's code, so a run can then start offline.
      void import('@/game/dungeon/scene')
        .then(() => import('@/game/calm'))
        .catch(() => {});
      stop = warmRunSheets(state, zone);
    }, 600);
    return () => {
      window.clearTimeout(t);
      stop();
    };
    // Once per zone: the sheets for a new look or gear are drawn when the run starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
}

/** The game between workouts: the worlds of the Fog, the story you play alone, and nothing else.
    What a world gives you today (the boss's hearts, free skills) and what you won there (its
    keepsake) are on its card. Friends, the party and the Ember Road are on the Friends tab; your
    gear, vault and forge on the Hero tab. */
export function PlayTab({ state, onPlay, onStory }: Props) {
  useWarmRun(state);
  const land = useLand();

  if (land)
    return (
      <div className="flex h-full flex-col gap-2">
        <div className="flex shrink-0 justify-end">
          <StoryRow state={state} onStory={onStory} />
        </div>
        <div className="min-h-0 flex-1">
          <WorldPicker state={state} onPlay={onPlay} land />
        </div>
      </div>
    );

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <StoryRow state={state} onStory={onStory} />
      </div>
      <WorldPicker state={state} onPlay={onPlay} />
    </div>
  );
}

/** Story so far, and how many scenes wait there (put off with Later, or skipped). */
function StoryRow({ state, onStory }: { state: GameState; onStory: () => void }) {
  const waiting = waitingCount(state);
  const label = waiting > 0 ? `Story so far: ${waiting} ${waiting === 1 ? 'scene waits' : 'scenes wait'} for you` : 'Story so far: watch any scene again';
  return (
    <button onClick={onStory} aria-label={label} className={`relative flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 active:scale-95 ${waiting ? 'bg-ink-800 ring-1 ring-gold-400/50' : 'bg-ink-800'}`}>
      <Film size={16} className="text-gold-300" />
      <span className="font-pixel text-[8px] text-slate-200">STORY</span>
      {waiting > 0 && <span className="rounded-full bg-gold-300 px-1.5 font-mono text-[10px] font-bold leading-4 text-ink-950">{waiting}</span>}
    </button>
  );
}
