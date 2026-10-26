'use client';

import { useState } from 'react';
import { Dialogue } from './Dialogue';
import { PlaceBackdrop } from './Place';
import { useMusic } from './Sound';
import { gearOf, type GameState } from '@/lib/game';
import { flameStage, DEFAULT_FLAME_NAME } from '@/story/flame';
import { renderLines, scenePlace, storyWords } from '@/story/engine';
import type { AnswerId, Ask, Line, Scene, Words } from '@/story/types';

export interface SceneResult {
  answer?: { id: AnswerId; value: string };
  flame?: string;
  pickClass?: boolean;
}

interface Props {
  scene: Scene;
  state: GameState;
  onDone: (r: SceneResult) => void;
}

/** Plays a story scene: its lines, then its question if it has one, then the lines that answer it. */
export function ScenePlayer({ scene, state, onDone }: Props) {
  const [phase, setPhase] = useState<'lines' | 'ask' | 'after'>('lines');
  const [result, setResult] = useState<SceneResult>({});
  const [after, setAfter] = useState<Line[]>([]);
  const gear = gearOf(state);
  const place = scenePlace(scene, state);
  const music = scene.music ?? 'rise';
  const stage = flameStage(state.sessions.length).id;
  const base = storyWords(state);
  // Until it has a name, the flame's name tag reads "A spark".
  const unnamed = !state.profile.flame && !result.flame;
  const words: Words = {
    ...base,
    ...(result.flame ? { flame: result.flame } : {}),
    ...(result.answer?.id.startsWith('heart') ? { [result.answer.id]: result.answer.value } : {}),
  };

  const endLines = () => {
    const ask = scene.ask;
    if (!ask) return onDone({});
    if (ask.kind === 'class') return onDone({ pickClass: true });
    setPhase('ask');
  };

  const answered = (r: SceneResult, lines: Line[] | undefined) => {
    setResult(r);
    if (!lines?.length) return onDone(r);
    setAfter(lines);
    setPhase('after');
  };

  if (phase === 'ask' && scene.ask && scene.ask.kind !== 'class')
    return <AskCard ask={scene.ask} place={place} music={music} onAnswer={answered} />;

  return (
    <Dialogue
      key={phase}
      lines={renderLines(phase === 'lines' ? scene.lines : after, words)}
      shots={phase === 'lines' ? scene.shots : undefined}
      gear={gear}
      classId={state.profile.classId}
      music={music}
      place={place}
      words={unnamed ? { ...words, flame: '' } : words}
      flame={stage}
      onDone={phase === 'lines' ? endLines : () => onDone(result)}
    />
  );
}

const goldButton =
  'w-full rounded-2xl bg-gold-400 py-3.5 font-pixel text-[10px] text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none disabled:opacity-40';

function AskCard({
  ask,
  place,
  music,
  onAnswer,
}: {
  ask: Exclude<Ask, { kind: 'class' }>;
  place: ReturnType<typeof scenePlace>;
  music: NonNullable<Scene['music']>;
  onAnswer: (r: SceneResult, after: Line[] | undefined) => void;
}) {
  const [text, setText] = useState('');
  useMusic(music);

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-ink-950">
      <PlaceBackdrop id={place} className="absolute inset-0 opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/80 to-ink-950/40" />
      <div className="safe-top safe-bottom relative mx-auto flex w-full max-w-md flex-1 flex-col justify-end px-4 pb-8">
        <div className="animate-fadein rounded-2xl bg-ink-800/95 p-5 pixel-border">
          <p className="text-center font-pixel text-[11px] leading-relaxed text-gold-300">{ask.kind === 'name' ? ask.prompt : `"${ask.prompt}"`}</p>

          {ask.kind === 'name' ? (
            <form
              className="mt-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                onAnswer({ flame: text.trim() || DEFAULT_FLAME_NAME }, ask.after);
              }}
            >
              <input
                autoFocus
                maxLength={16}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={ask.placeholder}
                className="w-full rounded-xl bg-ink-900 px-4 py-3.5 text-center text-lg text-slate-100 outline-none ring-1 ring-ink-600 focus:ring-gold-400"
              />
              <button type="submit" disabled={!text.trim()} className={goldButton}>
                That&apos;s your name
              </button>
              <button type="button" onClick={() => onAnswer({ flame: DEFAULT_FLAME_NAME }, ask.after)} className="w-full py-2 text-xs text-slate-500">
                Skip: call it {DEFAULT_FLAME_NAME}
              </button>
            </form>
          ) : (
            <div className="mt-5 space-y-2">
              {ask.choices.map((c) => (
                <button
                  key={c.label}
                  onClick={() => onAnswer({ answer: { id: ask.id, value: c.value } }, c.after ?? ask.after)}
                  className="w-full rounded-xl bg-ink-900 px-4 py-3 text-left text-sm text-slate-100 ring-1 ring-gold-400/25 active:scale-[.98]"
                >
                  {c.label}
                </button>
              ))}
              {ask.write && (
                <form
                  className="flex gap-2 pt-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (text.trim()) onAnswer({ answer: { id: ask.id, value: text.trim() } }, ask.after);
                  }}
                >
                  <input
                    maxLength={80}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={ask.write}
                    className="min-w-0 flex-1 rounded-xl bg-ink-900 px-3 py-3 text-sm text-slate-100 outline-none ring-1 ring-ink-600 focus:ring-gold-400"
                  />
                  <button type="submit" disabled={!text.trim()} className="rounded-xl bg-gold-400 px-4 font-pixel text-[9px] text-ink-950 disabled:opacity-40">
                    Say it
                  </button>
                </form>
              )}
              <button onClick={() => onAnswer({}, undefined)} className="w-full pt-2 text-xs text-slate-500">
                Skip
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
