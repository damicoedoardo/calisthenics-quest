'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Hero } from './Hero';
import { Ember, Hollow, Kindled } from './Characters';
import { PlaceBackdrop } from './Place';
import { SoundToggle, useMusic } from './Sound';
import { Sprite } from './Sprite';
import { Weather } from './Weather';
import { castMember } from '@/story/cast';
import { PLACES, type PlaceId } from '@/story/places';
import type { Line, Shot, Words } from '@/story/types';
import type { FlameStage } from '@/sprites/characters/ember';
import type { ClassId, Gear, GearSlot } from '@/lib/gear';
import type { TrackId } from '@/lib/music';
import { fastStory } from '@/lib/dev';

interface Props {
  lines: Line[];
  gear: Record<GearSlot, Gear>;
  classId?: ClassId;
  onDone: () => void;
  /** Narration as a film: no text box, bigger words, slower. */
  cinematic?: boolean;
  /** What to show above narration, by line index. */
  backdrop?: (index: number) => ReactNode;
  music?: TrackId | null;
  /** The player's words, for names like the flame's. */
  words?: Partial<Words>;
  /** Where it happens: a backdrop behind everyone. */
  place?: PlaceId;
  /** Camera beats before the first line. */
  shots?: Shot[];
  /** How grown the flame is, for its portrait. */
  flame?: FlameStage;
}

/** One step of a scene: a camera beat on its own, or a line (which can carry a beat). */
interface Beat {
  line?: Line;
  shot?: Shot;
}

interface Camera {
  place?: PlaceId;
  x: number;
  y: number;
  zoom: number;
  fade: 'none' | 'black' | 'white';
}

const FAST = fastStory();
const secondsOf = (s: Shot | undefined) => (FAST ? 0.1 : (s?.seconds ?? ('title' in (s ?? {}) ? 2.2 : 1.2)));

/** Where the camera is at a beat: moves add up over the scene. */
function cameraAt(beats: Beat[], index: number, place?: PlaceId): Camera {
  const cam: Camera = { place, x: 0, y: 0, zoom: 1, fade: 'none' };
  for (const { shot } of beats.slice(0, index + 1)) {
    if (!shot) continue;
    if ('place' in shot) cam.place = shot.place;
    if ('pan' in shot) {
      const d = { up: [0, 8], down: [0, -8], left: [8, 0], right: [-8, 0], center: [0, 0] }[shot.pan];
      cam.x = d[0];
      cam.y = d[1];
    }
    if ('zoom' in shot) cam.zoom = shot.zoom === 'in' ? 1.18 : 1;
    if ('fade' in shot) cam.fade = shot.fade === 'in' ? 'none' : shot.fade === 'white' ? 'white' : 'black';
  }
  return cam;
}

function Portrait({ line, gear, classId, flame }: { line: Line; gear: Record<GearSlot, Gear>; classId?: ClassId; flame: FlameStage }) {
  const p = castMember(line.show ?? line.who).portrait;
  switch (p.kind) {
    case 'sprite':
      return <Sprite id={p.sprite} size={p.size} />;
    case 'hero':
      return <Hero gear={gear} classId={classId} size={p.size} variant={p.variant} />;
    case 'hollow':
      return <Hollow size={p.size} />;
    case 'flame':
      // A spark is a speck in its frame: show it bigger so its face reads.
      return <Ember size={flame === 'spark' ? Math.round(p.size * 1.7) : p.size} stage={flame} mood={line.mood} />;
    case 'kindled':
      return <Kindled size={p.size} />;
    default:
      return null;
  }
}

const ENTER = { left: 'animate-enterleft', right: 'animate-enterright', below: 'animate-enterbelow' };
const TAG = { gold: 'text-gold-300', red: 'text-red-400', sky: 'text-sky-300', amber: 'text-orange-300', slate: 'text-slate-300' };

/**
 * A scene: portrait above, a text box below, tap to reveal and advance. With a place it plays
 * over a backdrop, and shots move the camera, cut, fade, shake or bring someone in.
 */
export function Dialogue({ lines, gear, classId, onDone, cinematic = false, backdrop, music = 'rise', words, place, shots = [], flame = 'candle' }: Props) {
  const beats = useMemo<Beat[]>(() => [...shots.map((shot) => ({ shot })), ...lines.map((line) => ({ line, shot: line.shot }))], [shots, lines]);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const beat = beats[index];
  const line = beat?.line;
  const full = line ? line.text.length : 0;
  const done = FAST || shown >= full;
  const narrator = line?.who === 'narrator';
  const film = cinematic && narrator;
  const speed = film ? 42 : 28;
  const cam = cameraAt(beats, index, place);
  const shot = beat?.shot;
  useMusic(music);

  useEffect(() => {
    setShown(0);
  }, [index]);

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setShown((n) => Math.min(full, n + 1)), speed);
    return () => clearTimeout(t);
  }, [shown, full, done, speed]);

  const next = () => {
    if (index + 1 >= beats.length) onDone();
    else setIndex((i) => i + 1);
  };

  // A camera beat on its own plays out and moves on.
  useEffect(() => {
    if (!beat || beat.line) return;
    const t = setTimeout(next, secondsOf(beat.shot) * 1000 + 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (!beat) return null;

  const advance = () => {
    if (line && !done) setShown(full);
    else next();
  };

  const who = line ? castMember(line.who) : null;
  const name = who?.name.replace('{flame}', words?.flame || 'A spark') ?? '';
  const dark = !!who?.dark;
  const shake = shot && 'shake' in shot ? (shot.shake === 'big' ? 'animate-bigshake' : 'animate-shake') : '';
  const enter = shot && 'enter' in shot ? ENTER[shot.enter] : 'animate-pop';
  const ms = secondsOf(shot) * 1000;
  const weather = cam.place ? PLACES[cam.place].weather : 'none';

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-ink-950" onClick={advance} role="dialog" aria-live="polite">
      {cam.place && (
        <div key={`shake-${index}`} className={`absolute inset-0 ${shake}`}>
          <div
            className="absolute -inset-[9%] transition-transform ease-in-out"
            style={{ transform: `translate(${cam.x}%, ${cam.y}%) scale(${cam.zoom})`, transitionDuration: `${ms}ms` }}
          >
            <PlaceBackdrop id={cam.place} className="h-full w-full" />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-ink-950 via-ink-950/85 to-transparent" />
        </div>
      )}
      {weather !== 'none' && <Weather kind={weather} behind />}

      <div className="safe-top relative z-10 flex justify-between px-4">
        <SoundToggle />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDone();
          }}
          className="rounded-md px-3 py-2 text-xs text-slate-400"
        >
          Skip
        </button>
      </div>

      {shot && 'title' in shot && (
        <div key={`title-${index}`} className="relative z-10 flex flex-1 animate-fadein items-center justify-center px-6 text-center">
          <p className="font-pixel text-sm leading-relaxed text-gold-300 drop-shadow-[0_2px_0_#0b0d14]">{shot.title}</p>
        </div>
      )}

      {line && (
        <>
          <div key={`shake-p-${index}`} className={`relative flex justify-center pb-6 ${narrator ? 'flex-[0.8] items-end' : 'flex-1 items-end'} ${cam.place ? '' : shake}`}>
            {narrator && !line.show
              ? backdrop?.(index)
              : (
                <div key={`${index}-${line.show ?? line.who}`} className={enter}>
                  <Portrait line={line} gear={gear} classId={classId} flame={flame} />
                </div>
              )}
          </div>

          <div className={`safe-bottom relative mx-auto w-full max-w-md px-4 pb-6 ${narrator ? 'flex-1' : ''}`}>
            {film ? (
              <div key={index} className="min-h-[132px] animate-fadein px-2 text-center">
                <p className="text-xl leading-relaxed text-slate-200">
                  {line.text.slice(0, done ? full : shown)}
                  {!done && <span className="opacity-0">{line.text.slice(shown)}</span>}
                </p>
                <p className="mt-4 text-xs text-slate-600">{done ? <span className="animate-blink">tap</span> : <span>&nbsp;</span>}</p>
              </div>
            ) : (
              <div className={`min-h-[132px] rounded-xl p-4 pixel-border ${dark ? 'bg-[#140f1f]' : 'bg-ink-800/95'} ${narrator ? 'text-center' : ''}`}>
                {!narrator && <p className={`mb-2 font-pixel text-[10px] ${TAG[who?.tag ?? 'gold']}`}>{name}</p>}
                <p className={`text-lg leading-snug ${narrator ? 'italic text-slate-300' : dark ? 'text-red-100' : 'text-slate-100'}`}>
                  {line.text.slice(0, done ? full : shown)}
                  {!done && <span className="opacity-0">{line.text.slice(shown)}</span>}
                </p>
                <p className="mt-2 text-right text-xs text-slate-500">{done ? <span className="animate-blink">▼ tap</span> : <span>&nbsp;</span>}</p>
              </div>
            )}
          </div>
        </>
      )}

      {!line && !(shot && 'title' in shot) && <div className="flex-1" />}

      <div
        className={`pointer-events-none absolute inset-0 z-20 transition-opacity ${cam.fade === 'white' ? 'bg-white' : 'bg-black'}`}
        style={{ opacity: cam.fade === 'none' ? 0 : 1, transitionDuration: `${ms}ms` }}
      />
    </div>
  );
}
