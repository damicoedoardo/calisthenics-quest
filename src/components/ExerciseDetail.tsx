'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, ExternalLink, Play } from 'lucide-react';
import { Sprite } from '@/components/Sprite';
import { useLook } from '@/components/Look';
import { gearOf, type GameState } from '@/lib/game';
import { loadLibrary, type LibraryExercise } from '@/exercises/library';
import type { Family, Kind } from '@/exercises/coaching';
import { videoEmbedUrl, videoOf, videoSearchUrl, videoWatchUrl } from '@/exercises/videos';
import type { ExerciseId } from '@/sprites/characters/exercise';

/* How to do one exercise: its demo, facts, steps, tips and mistakes. The library opens it, and so
   does a tap on any workout card (Today, Train, the workout itself). */

/** A workout card's exercise, looked up in the library: by id, else the plainest with the same demo. */
export function ExerciseSheet({ state, id, demo, onClose }: { state: GameState; id: string; demo: ExerciseId; onClose: () => void }) {
  const [x, setX] = useState<LibraryExercise | null | undefined>(undefined);
  useEffect(() => {
    let gone = false;
    void loadLibrary().then((all) => {
      const same = all.filter((e) => e.demo === demo);
      const found = all.find((e) => e.id === id) ?? same.find((e) => e.source !== 'catalog') ?? same[0] ?? null;
      if (!gone) setX(found);
    });
    return () => {
      gone = true;
    };
  }, [id, demo]);
  if (!x) return null;
  return <ExerciseDetail state={state} x={x} onBack={onClose} back="Back" />;
}

/** One exercise, made to be read at a glance (Edoardo 2026-11-01: just the video and the do's and
    don'ts): the video, or your pixel demo when it has none, then how to do it well and what to
    avoid, with the long catalog steps folded at the end. */
export function ExerciseDetail({ state, x, onBack, back = 'Back to the library' }: { state: GameState; x: LibraryExercise; onBack: () => void; back?: string }) {
  const mine = useLook();
  const side = '[@media(orientation:landscape)_and_(max-height:600px)]';
  return (
    <div className="land-safe-x fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-ink-950 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className={`sticky top-0 z-10 -mx-4 flex items-center gap-2 bg-ink-950 px-2 pb-2 pt-[max(1rem,env(safe-area-inset-top))] ${side}:mx-0 ${side}:px-0 ${side}:pt-[max(0.5rem,env(safe-area-inset-top))]`}>
        <button onClick={onBack} className="p-2 text-slate-400" aria-label={back}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-pixel text-xs leading-relaxed text-gold-300">{x.name}</h1>
      </header>
      {/* Held sideways: the video on the left, how to do it on the right. */}
      <div className={`contents ${side}:grid ${side}:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] ${side}:items-start ${side}:gap-x-6`}>
        <div className={`contents ${side}:block`}>
          <ExerciseVideo key={x.id} id={x.id} name={x.name} />
          {!videoOf(x.id) && (
            <div className="mt-3 rounded-2xl bg-ink-900 p-1 ring-1 ring-ink-700">
              <Sprite id="exercise" opts={{ exercise: x.demo, kit: x.kit, gear: gearOf(state), classId: state.profile.classId, look: mine }} size={160} label={x.name} className="mx-auto max-w-full" />
            </div>
          )}
        </div>
        <div className={`contents ${side}:block`}>
          <Cues title="Do it well" tone="text-emerald-300" mark="✓" markTone="text-emerald-400" lines={x.tips} />
          <Cues title="Avoid" tone="text-rose-300" mark="✗" markTone="text-rose-400" lines={x.mistakes} />
          {x.steps.length > 0 && (
            <details className="group mt-5 rounded-2xl bg-ink-900 ring-1 ring-ink-700">
              <summary className="flex cursor-pointer list-none items-center justify-between p-3 font-pixel text-[10px] text-slate-300">
                Step by step
                <ChevronDown size={16} className="text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
              </summary>
              <ol className="list-decimal space-y-2 px-3 pb-3 pl-8 text-sm text-slate-300">
                {x.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </details>
          )}
          <p className="mt-6 text-[11px] text-slate-600">
            {x.source === 'catalog' ? 'From free-exercise-db, an open public-domain catalog.' : 'From the FORMA program.'}
          </p>
        </div>
      </div>
    </div>
  );
}


function Cues({ title, tone, mark, markTone, lines }: { title: string; tone: string; mark: string; markTone: string; lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <>
      <h2 className={`mt-5 font-pixel text-[10px] ${tone}`}>{title}</h2>
      <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
        {lines.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className={markTone} aria-hidden>
              {mark}
            </span>
            {s}
          </li>
        ))}
      </ul>
    </>
  );
}

/** The how-to video: a hand-picked YouTube tutorial played right in the card, or a YouTube search
    for exercises without one. */
function ExerciseVideo({ id, name }: { id: string; name: string }) {
  const video = videoOf(id);
  const box = 'mt-1';
  if (!video) {
    return (
      <a href={videoSearchUrl(name)} target="_blank" rel="noopener noreferrer" className={`${box} flex items-center gap-3 rounded-2xl bg-ink-900 p-3 text-sm text-slate-300 ring-1 ring-ink-700`}>
        <Play size={18} className="shrink-0 text-gold-300" aria-hidden />
        <span className="flex-1">Find a how-to video on YouTube</span>
        <ExternalLink size={14} className="shrink-0 text-slate-500" aria-hidden />
      </a>
    );
  }
  return (
    <div className={box}>
      <div className="aspect-video overflow-hidden rounded-2xl bg-black ring-1 ring-ink-700">
        <iframe
          src={videoEmbedUrl(video.id)}
          title={video.title}
          loading="lazy"
          className="h-full w-full"
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <a href={videoWatchUrl(video.id)} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-slate-500">
        Open on YouTube <ExternalLink size={11} aria-hidden />
      </a>
    </div>
  );
}

export const KIND_LABEL: Record<Kind, string> = { strength: 'Strength', power: 'Power', plyometric: 'Jumps', cardio: 'Cardio', stretch: 'Stretch', mobility: 'Mobility, warm-up' };

export const FAMILY_LABEL: Record<Family, string> = {
  squat: 'Squat',
  hinge: 'Hinge (deadlift, swing)',
  lunge: 'Lunge, single leg',
  'push-horizontal': 'Push forward (bench, push-up)',
  'push-vertical': 'Push up (overhead)',
  'pull-horizontal': 'Pull back (rows)',
  'pull-vertical': 'Pull down (pull-ups)',
  arms: 'Arms',
  shoulders: 'Shoulders',
  'legs-isolation': 'Legs, isolated',
  core: 'Core',
  carry: 'Carry, grip',
  power: 'Power (Olympic, throws)',
  plyometric: 'Jumps',
  cardio: 'Cardio',
  stretch: 'Stretch',
  mobility: 'Mobility, warm-up',
};

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
