'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, FastForward, Play, Square, X } from 'lucide-react';
import { Ember } from '@/components/Characters';
import { PlaceBackdrop } from '@/components/Place';
import { ScenePlayer, type SceneResult } from '@/components/ScenePlayer';
import { Weather } from '@/components/Weather';
import { addFakeWorkouts } from '@/lib/dev';
import { initialState, type GameState } from '@/lib/game';
import { CHAPTERS } from '@/story/chapters';
import { ANYTIME } from '@/story/anytime';
import { chapterStart, sceneFor } from '@/story/engine';
import { DEFAULT_FLAME_NAME, FLAME_STAGES } from '@/story/flame';
import { PLACES, type PlaceId } from '@/story/places';
import type { AnswerId, FlameMood, Scene, When } from '@/story/types';
import type { FlameStage } from '@/sprites/characters/ember';

/* Story Lab: play any scene with any flame name and letter, and see every place and every look
   of the flame. Not linked from the app; open /lab/story. The story itself lives in src/story. */

const MOODS: FlameMood[] = ['happy', 'bright', 'soft', 'sleepy', 'smoky', 'scared', 'dim'];

const LETTER = { why: 'I want to feel strong again', want: 'do ten pull-ups', forWho: 'my kids', remind: 'I already did this once' };
const NO_LETTER = { why: '', want: '', forWho: '', remind: '' };
const ANSWERS = {
  heart1: 'playing with friends',
  heart2: 'your confidence',
  heart3: 'I was scared of starting over.',
  heart4: "I'm kinder to myself.",
  heart5: 'The next step.',
  heart6: 'Showing up, even small.',
  // Joined every villager's story, so their lines show.
  lia: 'yes',
  sol: 'yes',
  vela: 'yes',
};

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-ink-900 p-4 pixel-border">
      <h2 className="mb-3 font-pixel text-[10px] text-gold-300">{title}</h2>
      {children}
    </section>
  );
}

function Chips<T extends string>({ label, options, value, onChange, name = (v) => v }: { label: string; options: T[]; value: T; onChange: (v: T) => void; name?: (v: T) => string }) {
  return (
    <div>
      <p className="mb-1.5 font-pixel text-[9px] text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)} className={`rounded-lg px-2.5 py-1.5 text-xs ${o === value ? 'bg-gold-400 font-semibold text-ink-950' : 'bg-ink-800 text-slate-300'}`}>
            {name(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A scene's trigger in words, e.g. "8 workouts · rest day". */
function describe(w: When): string {
  const parts: string[] = [];
  if (w.workouts !== undefined) parts.push(`${w.workouts} workout${w.workouts === 1 ? '' : 's'}`);
  if (w.chapter) parts.push(`chapter ${w.chapter} started`);
  if (w.inChapter) parts.push(`in chapter ${w.inChapter}`);
  if (w.beaten) parts.push(`chapter ${w.beaten} beaten`);
  if (w.restDay !== undefined) parts.push(w.restDay ? 'rest day' : 'not a rest day');
  if (w.shortSession) parts.push('after a short workout');
  if (w.daysInRow) parts.push(`${w.daysInRow} days in a row`);
  if (w.perfectWeek) parts.push('a full week');
  if (w.better) parts.push(`beat last time in ${w.better} workout${w.better === 1 ? '' : 's'}`);
  if (w.noClass) parts.push('no class yet');
  if (w.answer) parts.push(w.answer.is === undefined ? `answered ${w.answer.id}` : `${w.answer.id} = ${w.answer.is || '(none)'}`);
  if (w.needs) parts.push(`needs {${w.needs}}`);
  if (w.helped !== undefined) parts.push(w.helped ? 'helped a villager' : 'helped no villager');
  if (w.away) parts.push(`away ${w.away}+ days`);
  if (w.finished) parts.push('story finished');
  return parts.join(' · ') || 'any time';
}

/** A player who reached the scene's moment, with the lab's flame name and letter. */
function stateFor(scene: Scene, chapter: number, flame: string, letter: boolean, answers: Partial<Record<AnswerId, string>>, now: Date): GameState {
  const base = initialState();
  const reach = scene.when.beaten ? chapterStart(scene.when.beaten + 1) : chapter > 0 ? chapterStart(chapter) : 0;
  const workouts = Math.max(scene.when.workouts ?? 0, reach);
  const state: GameState = {
    ...base,
    // The naming scene plays with a flame that has no name yet.
    profile: { ...base.profile, onboarded: true, flame: scene.ask?.kind === 'name' ? undefined : flame, voice: letter ? 'You always quit.' : '', letter: letter ? LETTER : NO_LETTER },
    answers,
  };
  return workouts > 0 ? addFakeWorkouts(state, workouts, now, false) : state;
}

export default function StoryLab() {
  const [stage, setStage] = useState<FlameStage>('candle');
  const [mood, setMood] = useState<FlameMood>('happy');
  const [flame, setFlame] = useState('');
  const [letter, setLetter] = useState(true);
  const [answers, setAnswers] = useState(true);
  const [playing, setPlaying] = useState<{ scene: Scene; state: GameState } | null>(null);
  // Playing the whole story: where we are in it, and what was answered along the way.
  const [run, setRun] = useState<{ at: number; between: boolean } | null>(null);
  const [given, setGiven] = useState<Partial<Record<AnswerId, string>>>({});
  const [result, setResult] = useState<string>('');
  const [place, setPlace] = useState<PlaceId | null>(null);
  const groups = useMemo(() => [...CHAPTERS.map((c) => ({ n: c.n, title: `${c.n} · ${c.name}`, scenes: c.scenes })), { n: 0, title: 'Any time', scenes: ANYTIME }], []);
  const all = useMemo(() => groups.flatMap((g) => g.scenes.map((scene) => ({ scene, chapter: g.n, group: g.title }))), [groups]);
  const name = flame.trim() || DEFAULT_FLAME_NAME;
  const said = answers ? { ...ANSWERS, ...given } : given;

  const play = (scene: Scene, chapter: number) => {
    setResult('');
    const state = stateFor(scene, chapter, name, letter, said, new Date());
    // Lines for a villager you didn't join drop out, like in the game.
    setPlaying({ scene: sceneFor(scene, state), state });
  };

  // /lab/night links here with ?play=<scene id>&back: play that scene at once, and return when it ends.
  const [backTo, setBackTo] = useState<string | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const hit = all.find((a) => a.scene.id === q.get('play'));
    if (hit) play(hit.scene, hit.chapter);
    if (q.has('back')) setBackTo('/lab/night');
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = (r: SceneResult) => {
    if (backTo) {
      window.location.href = backTo;
      return;
    }
    setPlaying(null);
    // Carry what was named and answered into the scenes that follow.
    if (r.flame) setFlame(r.flame);
    if (r.answer) setGiven((g) => ({ ...g, [r.answer!.id]: r.answer!.value }));
    const words = [r.flame && `named the flame "${r.flame}"`, r.answer && `${r.answer.id} = "${r.answer.value}"`, r.pickClass && 'opens the class picker'].filter(Boolean);
    setResult(words.length ? words.join(', ') : 'finished, nothing saved');
    if (run) setRun(run.at + 1 < all.length ? { at: run.at + 1, between: true } : null);
  };

  const playFrom = (at: number) => {
    setGiven({});
    setRun({ at, between: true });
  };

  // Between two scenes of the whole story: a moment to see what comes next, then it plays.
  useEffect(() => {
    if (!run?.between) return;
    const t = setTimeout(() => {
      const next = all[run.at];
      setRun({ at: run.at, between: false });
      play(next.scene, next.chapter);
    }, 1400);
    return () => clearTimeout(t);
    // Runs once per step: play() then sees the name and answers the last scene left behind.
  }, [run]);

  if (run) {
    const next = all[run.at];
    return (
      <>
        {run.between || !playing ? (
          <div className="fixed inset-0 z-50 flex animate-fadein flex-col items-center justify-center gap-3 bg-ink-950 px-6 text-center">
            <p className="font-pixel text-[10px] text-slate-500">{next.group.toUpperCase()}</p>
            <p className="font-mono text-sm text-gold-300">{next.scene.id}</p>
            <p className="text-xs text-slate-400">{describe(next.scene.when)}</p>
          </div>
        ) : (
          <ScenePlayer key={playing.scene.id} scene={playing.scene} state={playing.state} onDone={done} />
        )}
        <div className="safe-top pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center">
          <button
            onClick={() => {
              setRun(null);
              setPlaying(null);
            }}
            className="pointer-events-auto mt-2 flex items-center gap-2 rounded-full bg-ink-900/90 px-3 py-1.5 text-[11px] text-slate-300 ring-1 ring-ink-600"
          >
            <span className="font-mono">
              {run.at + 1}/{all.length}
            </span>
            <Square size={10} className="fill-current" /> Stop
          </button>
        </div>
        <div className="fixed inset-x-0 top-0 z-[60] h-0.5 bg-ink-800">
          <div className="h-full bg-gold-400 transition-all" style={{ width: `${((run.at + 1) / all.length) * 100}%` }} />
        </div>
      </>
    );
  }

  if (playing) return <ScenePlayer key={playing.scene.id} scene={playing.scene} state={playing.state} onDone={done} />;

  if (place)
    return (
      <div className="fixed inset-0 z-50 bg-ink-950" onClick={() => setPlace(null)}>
        <PlaceBackdrop id={place} className="absolute inset-0" />
        {PLACES[place].weather !== 'none' && <Weather kind={PLACES[place].weather} />}
        <div className="safe-top relative flex items-center justify-between px-4">
          <p className="font-pixel text-[10px] text-gold-300 drop-shadow-[0_2px_0_#0b0d14]">{PLACES[place].name}</p>
          <button aria-label="Close" className="rounded-lg bg-ink-900/80 p-2 text-slate-300">
            <X size={16} />
          </button>
        </div>
      </div>
    );

  return (
    <main className="safe-top mx-auto min-h-dvh max-w-md space-y-4 px-4 pb-16">
      <header className="flex items-center gap-3">
        <Link href="/lab" aria-label="Back to the Sprite Lab" className="rounded-lg bg-ink-800 p-2 text-slate-300">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="font-pixel text-sm text-gold-300">Story Lab</h1>
          <p className="text-xs text-slate-500">Every scene, place and flame. The story lives in src/story.</p>
        </div>
      </header>

      <Panel title="The flame">
        <div className="flex h-56 flex-col items-center justify-end gap-2 rounded-xl bg-ink-950 pb-4">
          <Ember size={128} stage={stage} mood={mood} />
          <p className="font-pixel text-[10px] text-orange-300">{name}</p>
        </div>
        <div className="mt-3 space-y-3">
          <Chips label="STAGE" options={FLAME_STAGES.map((s) => s.id)} value={stage} onChange={setStage} name={(id) => FLAME_STAGES.find((s) => s.id === id)!.name} />
          <Chips label="MOOD" options={MOODS} value={mood} onChange={setMood} />
          <p className="text-xs text-slate-500">{FLAME_STAGES.find((s) => s.id === stage)!.gives}</p>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-1">
          {FLAME_STAGES.map((s) => (
            <div key={s.id} className="flex flex-col items-center gap-1 rounded-lg bg-ink-950 py-2">
              <div className="flex h-14 items-end">
                <Ember size={56} stage={s.id} mood={mood} />
              </div>
              <p className="text-[9px] text-slate-500">{s.at}+</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Places">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(PLACES) as PlaceId[]).map((id) => (
            <button key={id} onClick={() => setPlace(id)} className="overflow-hidden rounded-lg bg-ink-950 text-left">
              <PlaceBackdrop id={id} className="aspect-[9/16] w-full" />
              <p className="px-1.5 py-1 text-[10px] leading-tight text-slate-400">{PLACES[id].name}</p>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Scenes">
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 font-pixel text-[9px] text-slate-500">FLAME NAME</p>
            <input
              value={flame}
              maxLength={16}
              onChange={(e) => setFlame(e.target.value)}
              placeholder={DEFAULT_FLAME_NAME}
              className="w-full rounded-xl bg-ink-950 px-3 py-2.5 text-sm text-slate-100 outline-none ring-1 ring-ink-600 focus:ring-gold-400"
            />
          </div>
          <Chips label="LETTER" options={['on', 'off']} value={letter ? 'on' : 'off'} onChange={(v) => setLetter(v === 'on')} name={(v) => (v === 'on' ? 'Written' : 'Left empty')} />
          <Chips label="HEART ANSWERS" options={['on', 'off']} value={answers ? 'on' : 'off'} onChange={(v) => setAnswers(v === 'on')} name={(v) => (v === 'on' ? 'Given' : 'Skipped')} />
          {result && <p className="rounded-lg bg-ink-950 px-3 py-2 text-xs text-gold-300">Last scene: {result}</p>}
          <button onClick={() => playFrom(0)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-400 py-3 font-pixel text-[10px] text-ink-950 active:scale-[.99]">
            <FastForward size={14} /> Play the whole story
          </button>
          <p className="text-[11px] text-slate-500">Every scene in order, one after the other. Skip moves to the next one, Stop comes back here. Names and answers carry forward.</p>
        </div>

        <div className="mt-4 space-y-4">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="font-pixel text-[9px] text-slate-500">{g.title.toUpperCase()}</p>
                <button onClick={() => playFrom(all.findIndex((x) => x.group === g.title))} className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-gold-300">
                  <FastForward size={11} /> Play from here
                </button>
              </div>
              <div className="space-y-1.5">
                {g.scenes.map((s) => (
                  <button key={s.id} onClick={() => play(s, g.n)} className="flex w-full items-center gap-3 rounded-xl bg-ink-950 px-3 py-2.5 text-left active:scale-[.99]">
                    <Play size={12} className="shrink-0 text-gold-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs text-slate-200">{s.id}</span>
                      <span className="block text-[11px] text-slate-500">
                        {describe(s.when)}
                        {s.ask ? ` · asks ${s.ask.kind === 'choice' ? s.ask.id : s.ask.kind}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-500">{s.lines.length}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </main>
  );
}
