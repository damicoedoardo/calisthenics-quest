'use client';

import { ArrowLeft, Play } from 'lucide-react';
import { useModal } from './useModal';
import { Hollow } from './Characters';
import { PlaceBackdrop } from './Place';
import type { GameState } from '@/lib/game';
import { asksAgain, scenePlace, storySoFar, waitingCount, type SceneMode, type StoryEntry } from '@/story/engine';
import type { Scene } from '@/story/types';

interface Props {
  state: GameState;
  /** Play a scene: in full if it was put off, else watched again. */
  onPlay: (scene: Scene, mode: SceneMode) => void;
  onOpening: () => void;
  onClose: () => void;
}

/**
 * Story so far: the opening and every scene reached, to watch again. Scenes put off with Later or
 * skipped wait at the top with a mark. Nothing not reached yet is listed, so nothing is spoiled.
 */
export function StorySoFar({ state, onPlay, onOpening, onClose }: Props) {
  const box = useModal<HTMLDivElement>(onClose);
  const groups = storySoFar(state);
  const waiting = groups.flatMap((g) => g.entries).filter((e) => e.waits);
  const count = groups.reduce((n, g) => n + g.entries.length, 0);
  const left = waitingCount(state);
  const play = (e: StoryEntry) => onPlay(e.scene, e.waits === 'later' ? 'later' : 'again');

  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label="Story so far" className="fixed inset-0 z-50 !mt-0 overflow-y-auto bg-ink-950 outline-none">
      <div className="safe-top safe-bottom land-safe-x mx-auto max-w-md space-y-5 px-4 pb-16 [@media(orientation:landscape)_and_(max-height:600px)]:max-w-3xl [@media(orientation:landscape)_and_(max-height:600px)]:pb-8">
        <header className="flex items-center gap-3 pt-2">
          <button onClick={onClose} aria-label="Back" className="rounded-lg bg-ink-800 p-2 text-slate-300">
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-pixel text-sm text-gold-300">Story so far</h1>
            <p className="text-xs text-slate-500">
              {count} {count === 1 ? 'scene' : 'scenes'}
              {left > 0 && <span className="text-gold-300"> · {left} waiting</span>}
            </p>
          </div>
        </header>

        {waiting.length > 0 && (
          <section>
            <h2 className="mb-2 font-pixel text-[9px] text-gold-300">WAITING FOR YOU</h2>
            <ol className="space-y-2">
              {waiting.map((e) => (
                <Row key={`w-${e.id}`} entry={e} state={state} onPlay={() => play(e)} />
              ))}
            </ol>
          </section>
        )}

        <section>
          <h2 className="mb-2 font-pixel text-[9px] text-slate-500">THE OPENING</h2>
          <button onClick={onOpening} className="flex w-full items-center gap-3 rounded-xl bg-[#140f1f] p-2.5 text-left ring-1 ring-red-400/30 active:scale-[.98]">
            <span className="grid h-14 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-950">
              <Hollow size={40} bounce={false} />
            </span>
            <span className="min-w-0 flex-1 text-sm text-slate-200">The voice in your head, the first Fog, and the Wanderer.</span>
            <Play size={16} className="shrink-0 text-slate-500" />
          </button>
        </section>

        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="mb-2 font-pixel text-[9px] text-slate-500">{g.title.toUpperCase()}</h2>
            <ol className="space-y-2 [@media(orientation:landscape)_and_(max-height:600px)]:grid [@media(orientation:landscape)_and_(max-height:600px)]:grid-cols-2 [@media(orientation:landscape)_and_(max-height:600px)]:gap-2 [@media(orientation:landscape)_and_(max-height:600px)]:space-y-0">
              {g.entries.map((e) => (
                <Row key={e.id} entry={e} state={state} onPlay={() => play(e)} />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

function Row({ entry, state, onPlay }: { entry: StoryEntry; state: GameState; onPlay: () => void }) {
  // A question never answered (the flame's name skipped, a choice left open) can be answered now.
  const tag = entry.waits === 'later' ? 'Not watched yet' : entry.waits === 'skipped' ? (asksAgain(entry.scene, state) ? 'Your answer waits' : 'Skipped') : null;
  return (
    <li>
      <button onClick={onPlay} className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left active:scale-[.98] ${entry.waits ? 'bg-ink-800 ring-1 ring-gold-400/50' : 'bg-ink-900 ring-1 ring-ink-700'}`}>
        <span className="relative h-14 w-11 shrink-0 overflow-hidden rounded-lg">
          <PlaceBackdrop id={scenePlace(entry.scene, state)} className="absolute inset-0 h-full w-full" />
          {entry.waits && <span aria-hidden className="absolute right-1 top-1 h-2 w-2 rounded-full bg-gold-300 ring-2 ring-ink-900" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm text-slate-200">{entry.title}</span>
          {tag && <span className="mt-0.5 block font-pixel text-[8px] leading-relaxed text-gold-300">{tag}</span>}
        </span>
        <Play size={16} className="shrink-0 text-slate-500" />
      </button>
    </li>
  );
}
