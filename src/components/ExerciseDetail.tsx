'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Play } from 'lucide-react';
import { Sprite } from '@/components/Sprite';
import { useLook } from '@/components/Look';
import { gearOf, type GameState } from '@/lib/game';
import { loadLibrary, type LibraryExercise } from '@/exercises/library';
import type { Family, Kind } from '@/exercises/coaching';
import { videoEmbedUrl, videoOf, videoSearchUrl, videoWatchUrl } from '@/exercises/videos';
import type { ExerciseId } from '@/sprites/characters/exercise';
import { STARTER_LOOKS } from '@/sprites/characters/hero';
import type { Look } from '@/sprites/engine/figure';

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

/** One exercise: the demo for a boy and a girl (yours in place of the matching one), then the how-to. */
export function ExerciseDetail({ state, x, onBack, back = 'Back to the library' }: { state: GameState; x: LibraryExercise; onBack: () => void; back?: string }) {
  const mine = useLook();
  const looks: { label: string; look: Look }[] = (['m', 'f'] as const).map((sex) => ({
    label: sex === mine.sex ? 'You' : sex === 'm' ? 'Boy' : 'Girl',
    look: sex === mine.sex ? mine : STARTER_LOOKS[sex],
  }));
  return (
    <div className="land-safe-x fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-ink-950 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="sticky top-0 -mx-4 [@media(orientation:landscape)_and_(max-height:600px)]:z-10 flex items-center gap-2 bg-ink-950 px-2 pb-2 pt-[max(1rem,env(safe-area-inset-top))] [@media(orientation:landscape)_and_(max-height:600px)]:mx-0 [@media(orientation:landscape)_and_(max-height:600px)]:px-0 [@media(orientation:landscape)_and_(max-height:600px)]:pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button onClick={onBack} className="p-2 text-slate-400" aria-label={back}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-pixel text-xs leading-relaxed text-gold-300">{x.name}</h1>
      </header>
      {/* Held sideways: the demos and facts on the left, the how-to on the right. */}
      <div className="contents [@media(orientation:landscape)_and_(max-height:600px)]:grid [@media(orientation:landscape)_and_(max-height:600px)]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] [@media(orientation:landscape)_and_(max-height:600px)]:items-start [@media(orientation:landscape)_and_(max-height:600px)]:gap-x-6">
      <div className="contents [@media(orientation:landscape)_and_(max-height:600px)]:block">
      <div className="mt-2 grid grid-cols-2 gap-2">
        {looks.map(({ label, look }) => (
          <figure key={label} className="rounded-2xl bg-ink-900 p-1.5 ring-1 ring-ink-700">
            <Sprite id="exercise" opts={{ exercise: x.demo, kit: x.kit, gear: gearOf(state), classId: state.profile.classId, look }} size={136} label={`${x.name}, ${label}`} className="mx-auto max-w-full" />
            <figcaption className="pb-1 text-center text-[11px] text-slate-400">{label}</figcaption>
          </figure>
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <Fact label="Kind" value={KIND_LABEL[x.kind]} />
        <Fact label="Movement" value={FAMILY_LABEL[x.family]} />
        <Fact label="Equipment" value={cap(x.equipment)} />
        <Fact label="Level" value={cap(x.level)} />
        <Fact label="Works" value={cap(x.primary.join(', ') || '–')} />
        <Fact label="Helps" value={cap(x.secondary.join(', ') || '–')} />
      </dl>
      </div>
      <div className="contents [@media(orientation:landscape)_and_(max-height:600px)]:block">
      <ExerciseVideo key={x.id} id={x.id} name={x.name} />
      <h2 className="mt-5 font-pixel text-[10px] text-slate-300">How to</h2>
      {x.steps.length === 0 && <p className="mt-2 text-sm text-slate-400">No written steps for this one yet.</p>}
      <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-slate-300">
        {x.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <h2 className="mt-5 font-pixel text-[10px] text-emerald-300">Do it well</h2>
      <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
        {x.tips.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-emerald-400" aria-hidden>✓</span>
            {s}
          </li>
        ))}
      </ul>
      <h2 className="mt-5 font-pixel text-[10px] text-rose-300">Common mistakes</h2>
      <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
        {x.mistakes.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-rose-400" aria-hidden>✗</span>
            {s}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[11px] text-slate-500">
        {x.source === 'catalog' ? 'From free-exercise-db, an open public-domain catalog.' : 'From the FORMA program.'}
      </p>
      </div>
      </div>
    </div>
  );
}

/** The how-to video: a hand-picked YouTube tutorial that loads only when tapped, or a YouTube
    search for exercises without one. */
function ExerciseVideo({ id, name }: { id: string; name: string }) {
  const video = videoOf(id);
  const [playing, setPlaying] = useState(false);
  const box = 'mt-5 [@media(orientation:landscape)_and_(max-height:600px)]:mt-2';
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
      {playing ? (
        <div className="aspect-video overflow-hidden rounded-2xl bg-black ring-1 ring-ink-700">
          <iframe
            src={videoEmbedUrl(video.id)}
            title={video.title}
            className="h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <button onClick={() => setPlaying(true)} className="flex w-full items-center gap-3 rounded-2xl bg-ink-900 p-3 text-left ring-1 ring-ink-700">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-300 text-ink-950">
            <Play size={18} fill="currentColor" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-slate-200">Watch how to do it</span>
            <span className="block truncate text-[11px] text-slate-500">{video.title}</span>
          </span>
        </button>
      )}
      <a href={videoWatchUrl(video.id)} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-slate-500">
        Open on YouTube <ExternalLink size={11} aria-hidden />
      </a>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-800 p-2.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-200">{value}</dd>
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
