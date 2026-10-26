'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, X } from 'lucide-react';
import { Ember } from '@/components/Characters';
import { PlaceBackdrop } from '@/components/Place';
import { ScenePlayer, type SceneResult } from '@/components/ScenePlayer';
import { Weather } from '@/components/Weather';
import { addFakeWorkouts } from '@/lib/dev';
import { initialState, type GameState } from '@/lib/game';
import { CHAPTERS } from '@/story/chapters';
import { ANYTIME } from '@/story/anytime';
import { chapterStart } from '@/story/engine';
import { DEFAULT_FLAME_NAME, FLAME_STAGES } from '@/story/flame';
import { PLACES, type PlaceId } from '@/story/places';
import type { FlameMood, Scene, When } from '@/story/types';
import type { FlameStage } from '@/sprites/characters/ember';

/* Story Lab: play any scene with any flame name and letter, and see every place and every look
   of the flame. Not linked from the app; open /lab/story. The story itself lives in src/story. */

const MOODS: FlameMood[] = ['happy', 'bright', 'soft', 'sleepy', 'smoky', 'scared', 'dim'];

const LETTER = { why: 'I want to feel strong again', want: 'ten pull-ups', forWho: 'my kids', remind: 'I already did this once' };
const NO_LETTER = { why: '', want: '', forWho: '', remind: '' };
const ANSWERS = { heart1: 'playing with friends', heart2: 'your confidence', heart3: 'I was scared of starting over.' };

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
  if (w.awaitingTest) parts.push(`chapter ${w.awaitingTest} waits for a test`);
  if (w.restDay !== undefined) parts.push(w.restDay ? 'rest day' : 'not a rest day');
  if (w.shortSession) parts.push('after a short workout');
  if (w.daysInRow) parts.push(`${w.daysInRow} days in a row`);
  if (w.perfectWeek) parts.push('a full week');
  if (w.skill) parts.push(`${w.skill.path} past ${w.skill.past}`);
  if (w.noClass) parts.push('no class yet');
  if (w.answer) parts.push(w.answer.is === undefined ? `answered ${w.answer.id}` : `${w.answer.id} = ${w.answer.is || '(none)'}`);
  if (w.needs) parts.push(`needs {${w.needs}}`);
  if (w.away) parts.push(`away ${w.away}+ days`);
  if (w.finished) parts.push('story finished');
  return parts.join(' · ') || 'any time';
}

/** A player who reached the scene's moment, with the lab's flame name and letter. */
function stateFor(scene: Scene, chapter: number, flame: string, letter: boolean, answers: boolean, now: Date): GameState {
  const base = initialState();
  const reach = scene.when.beaten ? chapterStart(scene.when.beaten + 1) : chapter > 0 ? chapterStart(chapter) : 0;
  const workouts = Math.max(scene.when.workouts ?? 0, reach);
  const state: GameState = {
    ...base,
    // The naming scene plays with a flame that has no name yet.
    profile: { ...base.profile, onboarded: true, flame: scene.ask?.kind === 'name' ? undefined : flame, voice: letter ? 'You always quit.' : '', letter: letter ? LETTER : NO_LETTER },
    answers: answers ? ANSWERS : {},
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
  const [result, setResult] = useState<string>('');
  const [place, setPlace] = useState<PlaceId | null>(null);
  const groups = useMemo(() => [...CHAPTERS.map((c) => ({ n: c.n, title: `${c.n} · ${c.name}`, scenes: c.scenes })), { n: 0, title: 'Any time', scenes: ANYTIME }], []);
  const name = flame.trim() || DEFAULT_FLAME_NAME;

  const play = (scene: Scene, chapter: number) => {
    setResult('');
    setPlaying({ scene, state: stateFor(scene, chapter, name, letter, answers, new Date()) });
  };

  const done = (r: SceneResult) => {
    setPlaying(null);
    const said = [r.flame && `named the flame "${r.flame}"`, r.answer && `${r.answer.id} = "${r.answer.value}"`, r.pickClass && 'opens the class picker'].filter(Boolean);
    setResult(said.length ? said.join(', ') : 'finished, nothing saved');
  };

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
        </div>

        <div className="mt-4 space-y-4">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 font-pixel text-[9px] text-slate-500">{g.title.toUpperCase()}</p>
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
                    <span className="shrink-0 text-[10px] text-slate-600">{s.lines.length}</span>
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
