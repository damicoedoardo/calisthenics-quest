'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, X } from 'lucide-react';
import { Sprite } from './Sprite';
import { initialState, type GameState } from '@/lib/game';
import { CLASSES } from '@/lib/gear';
import { pointsEarned, pointsFree, resetBuild, spendEvenly } from '@/lib/stats';
import { ZONES } from '@/lib/fog';
import { addFakeWorkouts, clearNextZone, lastWorkoutAgo, newDayPage, resetFog, trainDaysInRow } from '@/lib/dev';
import { ALL_SCENES } from '@/story/engine';
import type { Scene } from '@/story/types';

interface Props {
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
  /** Play any story scene now. */
  onPlayScene: (scene: Scene) => void;
  /** On the live app dev mode can be turned off again; previews always have it. */
  onTurnOff?: () => void;
  onClose: () => void;
}

/** The wrench that opens the panel. It sits in the header, so it never covers a button. */
export function DevButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      aria-label="Developer mode"
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-full border border-dashed border-sky-400/60 text-sky-300"
    >
      <Sprite id="uiIcon" opts={{ name: 'wrench' }} size={22} label="" />
    </button>
  );
}

const chip = 'rounded-lg bg-ink-700 px-3 py-2 text-sm text-slate-200 active:scale-95';

/** Developer mode: shortcuts that normal players don't get. */
export function DevPanel({ state, update, onPlayScene, onTurnOff, onClose }: Props) {
  const [sceneId, setSceneId] = useState(ALL_SCENES[0].scene.id);
  const [flame, setFlame] = useState(state.profile.flame ?? '');
  const [skipStory, setSkipStory] = useState(true);
  const [wipe, setWipe] = useState(false);
  const cleared = state.fog?.cleared ?? 0;

  const workouts = (n: number) => update((s) => addFakeWorkouts(s, n, new Date(), skipStory));

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-ink-950/70" onClick={() => onClose()}>
      <div className="safe-bottom mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-ink-900 p-4 ring-1 ring-sky-400/30" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-pixel text-[10px] text-sky-300">Developer mode</p>
          <button aria-label="Close" onClick={() => onClose()} className="grid h-9 w-9 place-items-center rounded-lg bg-ink-800 text-slate-300">
            <X size={16} />
          </button>
        </div>

        <section className="mt-4">
          <p className="text-xs text-slate-400">Workouts: {state.sessions.length} logged</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => workouts(1)} className={chip}>
              + 1 workout
            </button>
            <button onClick={() => workouts(5)} className={chip}>
              + 5 workouts
            </button>
            <button onClick={() => update((s) => ({ ...s, sessions: [], draft: null }))} className={chip}>
              Clear all
            </button>
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={skipStory} onChange={(e) => setSkipStory(e.target.checked)} />
            Skip the story scenes they unlock
          </label>
        </section>

        <section className="mt-5 space-y-2">
          <p className="text-xs text-slate-400">
            Story and days{' '}
            <Link href="/lab/story" className="text-sky-300 underline">
              Story Lab
            </Link>
            {' · '}
            <Link href="/lab/night" className="text-sky-300 underline">
              What&apos;s new tonight
            </Link>
          </p>
          <div className="flex gap-2">
            <select aria-label="Scene to play" value={sceneId} onChange={(e) => setSceneId(e.target.value)} className="min-w-0 flex-1 rounded-lg bg-ink-700 px-2 text-sm text-slate-200">
              {ALL_SCENES.map(({ scene, chapter }) => (
                <option key={scene.id} value={scene.id}>
                  {chapter ? `${chapter} · ` : ''}
                  {scene.id}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                const s = ALL_SCENES.find((p) => p.scene.id === sceneId);
                if (!s) return;
                onClose();
                onPlayScene(s.scene);
              }}
              className={chip}
            >
              Play
            </button>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              update((s) => ({ ...s, profile: { ...s.profile, flame: flame.trim() || undefined } }));
            }}
          >
            <input
              value={flame}
              maxLength={16}
              onChange={(e) => setFlame(e.target.value)}
              placeholder="Flame name"
              aria-label="Flame name"
              className="min-w-0 flex-1 rounded-lg bg-ink-700 px-3 text-sm text-slate-200 outline-none"
            />
            <button className={chip}>Name it</button>
          </form>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => update((s) => lastWorkoutAgo(s, 1, new Date()))} className={chip}>
              Rest day today
            </button>
            <button onClick={() => update((s) => trainDaysInRow(s, 4, new Date()))} className={chip}>
              4 days in a row
            </button>
            <button onClick={() => update((s) => lastWorkoutAgo(s, 9, new Date()))} className={chip}>
              Away 9 days
            </button>
            <button onClick={() => update((s) => newDayPage(s, new Date()))} className={chip}>
              New day page
            </button>
          </div>
        </section>

        <section className="mt-5">
          <p className="text-xs text-slate-400">Class</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {CLASSES.map((c) => (
              <button
                key={c.id}
                onClick={() => update((s) => ({ ...s, profile: { ...s.profile, classId: c.id } }))}
                className={`rounded-lg py-2 text-xs ${state.profile.classId === c.id ? 'bg-sky-500/30 text-sky-100 ring-1 ring-sky-400' : 'bg-ink-700 text-slate-300'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <p className="text-xs text-slate-400">
            Stat points: {pointsFree(state)} free of {pointsEarned(state).total} (fake workouts earn more)
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => update(spendEvenly)} disabled={pointsFree(state) === 0} className={`${chip} disabled:opacity-40`}>
              Spread them evenly
            </button>
            <button onClick={() => update(resetBuild)} className={chip}>
              Take all back
            </button>
          </div>
        </section>

        <section className="mt-5">
          <p className="text-xs text-slate-400">
            The Fog: {cleared} of {ZONES.length} bosses beaten
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => update(clearNextZone)} disabled={cleared >= ZONES.length} className={`${chip} disabled:opacity-40`}>
              Beat the next boss
            </button>
            <button onClick={() => update(resetFog)} className={chip}>
              Reset the Fog
            </button>
          </div>
        </section>

        <section className="mt-5 border-t border-ink-700 pt-4">
          <button
            onClick={() => {
              if (!wipe) return setWipe(true);
              update(() => initialState());
              setWipe(false);
              onClose();
            }}
            className="w-full rounded-lg bg-red-500/15 py-2.5 text-sm text-red-300"
          >
            {wipe ? 'Tap again to wipe this save' : 'Start over as a new player'}
          </button>
          {onTurnOff && (
            <button
              onClick={() => {
                onClose();
                onTurnOff();
              }}
              className="mt-2 w-full py-2 text-xs text-slate-500"
            >
              Turn off developer mode
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
