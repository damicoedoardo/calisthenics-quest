'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Hero } from './Hero';
import { Ember, Hollow, Kindled } from './Characters';
import { PlaceBackdrop } from './Place';
import { SoundToggle, useMusic } from './Sound';
import { Sprite } from './Sprite';
import { SpTransform } from './SpTransform';
import { Weather } from './Weather';
import { PixelSnap } from './sideways';
import { useLook } from './Look';
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
  /** You wear your SP's look (once it has woken). */
  /** The SP you wear (1 to 4), or 0: the hero's portraits show it. */
  sp?: number;
  /** What Skip does, when it isn't just the end (a story scene marks itself skipped). */
  onSkip?: () => void;
  /** A Later button beside Skip: the scene waits in Story so far. */
  onLater?: () => void;
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

/** The song at a beat: a line can change it (or let it drop out), and it stays changed. */
function musicAt(beats: Beat[], index: number, start: TrackId | null): TrackId | null {
  let m = start;
  for (const { line } of beats.slice(0, index + 1)) if (line?.music) m = line.music === 'none' ? null : line.music;
  return m;
}

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

/** The SP card held up to the camera, sealed or awake. */
function CardArt({ awake, gear, classId, n }: { awake: boolean; gear: Record<GearSlot, Gear>; classId?: ClassId; n?: number }) {
  const look = useLook();
  return (
    <div className="animate-float" style={{ filter: 'drop-shadow(0 0 14px rgba(253,230,138,.35))' }}>
      <Sprite id="spCard" opts={{ classId, awake, gear, look, n }} size={144} />
    </div>
  );
}

function Portrait({ line, gear, classId, flame, sp }: { line: Line; gear: Record<GearSlot, Gear>; classId?: ClassId; flame: FlameStage; sp?: number }) {
  if (line.art === 'sp-sealed' || line.art === 'sp-awake') return <CardArt awake={line.art === 'sp-awake'} gear={gear} classId={classId} n={line.spn} />;
  const p = castMember(line.show ?? line.who).portrait;
  switch (p.kind) {
    case 'sprite':
      return <Sprite id={p.sprite} size={p.size} />;
    case 'hero':
      // Only you wear your SP: the Echo, the Hollow and the Best Self keep their own looks.
      return <Hero gear={gear} classId={classId} size={p.size} variant={p.variant} sp={p.variant === 'normal' || p.variant === 'kindled' ? sp : 0} />;
    case 'hollow':
      return <Hollow size={p.size} />;
    case 'flame':
      // A spark is a speck in its frame: show it bigger so its face reads.
      return <Ember size={flame === 'spark' ? Math.round(p.size * 1.7) : p.size} stage={flame} mood={line.mood} />;
    case 'kindled':
      return <Kindled size={p.size} wave={p.wave} />;
    case 'villager':
      return <Sprite id={p.sprite} size={p.size} opts={{ after: true }} />;
    case 'boss':
      return <Boss boss={p.boss} stage={p.stage ?? 0} size={p.size} gear={gear} classId={classId} />;
    default:
      return null;
  }
}

/** The Fog's boss sprites, shared with the story. */
function Boss({ boss, stage, size, gear, classId }: { boss: 'mirror' | 'knight' | 'plateau' | 'summit'; stage: 0 | 1 | 2; size: number; gear: Record<GearSlot, Gear>; classId?: ClassId }) {
  const look = useLook();
  if (boss === 'mirror') return <Sprite id="mirrorBoss" opts={{ gear, classId, look }} size={size} />;
  if (boss === 'knight') return <Sprite id="knightBoss" opts={{ stage }} size={size} />;
  if (boss === 'plateau') return <Sprite id="plateauBoss" opts={{ stage }} size={size} />;
  return <Sprite id="summitBoss" size={size} />;
}

/** Held sideways, where whoever is on screen stands, as a fraction of the backdrop's box (it reaches
    9% past each edge for the camera): a quarter of the way across the screen. */
const STAGE_SIDEWAYS = (0.09 + 0.25) / 1.18;

const ENTER = { left: 'animate-enterleft', right: 'animate-enterright', below: 'animate-enterbelow' };
const TAG = { gold: 'text-gold-300', red: 'text-red-400', sky: 'text-sky-300', amber: 'text-orange-300', slate: 'text-slate-300' };

/**
 * A scene: portrait above, a text box below, tap to reveal and advance. With a place it plays
 * over a backdrop, and shots move the camera, cut, fade, shake or bring someone in.
 */
export function Dialogue({ lines, gear, classId, onDone, cinematic = false, backdrop, music = 'rise', words, place, shots = [], flame = 'candle', sp = 0, onSkip, onLater }: Props) {
  const beats = useMemo<Beat[]>(() => [...shots.map((shot) => ({ shot })), ...lines.map((line) => ({ line, shot: line.shot }))], [shots, lines]);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  // A line with a pause waits, empty, before it starts typing.
  const [waiting, setWaiting] = useState(false);
  const beat = beats[index];
  const line = beat?.line;
  const full = line ? line.text.length : 0;
  const done = FAST || shown >= full;
  // With ?fast the typing never runs, so a finished line shows in full.
  const upTo = done ? full : shown;
  const narrator = line?.who === 'narrator';
  const film = (cinematic || !!line?.film) && narrator;
  const speed = line?.pace === 'slow' ? 62 : film ? 42 : 28;
  const cam = cameraAt(beats, index, place);
  const shot = beat?.shot;
  useMusic(musicAt(beats, index, music));

  // Only a new line restarts the typing (the lines prop is rebuilt on every parent render).
  const pause = FAST ? 0 : (line?.pause ?? 0);
  useEffect(() => {
    setShown(0);
    setWaiting(pause > 0);
    if (!pause) return;
    const t = setTimeout(() => setWaiting(false), pause * 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    if (done || waiting) return;
    const t = setTimeout(() => setShown((n) => Math.min(full, n + 1)), speed);
    return () => clearTimeout(t);
  }, [shown, full, done, speed, waiting]);

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

  // Keyboard players: Enter, Space or the right arrow do what a tap does, and focus starts on the
  // scene, not on the tabs behind it.
  const box = useRef<HTMLDivElement>(null);
  const advanceRef = useRef<() => void>(() => {});
  useEffect(() => {
    // Hand focus back where it was when the scene ends, so the next Tab doesn't start from nowhere.
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    box.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'ArrowRight') return;
      // Enter on Skip (or in a text box) means that control, not the next line.
      if (e.target instanceof HTMLElement && e.target.closest('button, input, textarea, select, a')) return;
      e.preventDefault();
      advanceRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      // After the tabs behind are interactive again (inert comes off in the same commit).
      setTimeout(() => before?.isConnected && before.focus({ preventScroll: true }));
    };
  }, []);

  if (!beat) return null;

  const advance = () => {
    if (waiting) setWaiting(false);
    else if (line && !done) setShown(full);
    else next();
  };
  advanceRef.current = advance;

  const who = line ? castMember(line.who) : null;
  const name = who?.name.replace('{flame}', words?.flame || 'A spark') ?? '';
  const dark = !!who?.dark;
  const shake = shot && 'shake' in shot ? (shot.shake === 'big' ? 'animate-bigshake' : 'animate-shake') : '';
  const enter = shot && 'enter' in shot ? ENTER[shot.enter] : 'animate-pop';
  const ms = secondsOf(shot) * 1000;
  const weather = cam.place ? PLACES[cam.place].weather : 'none';
  // Something to show beside the words (a speaker, someone shown, or the opening's pictures).
  const side = !!line && !(narrator && !line.show && !line.art && !backdrop);

  return (
    <PixelSnap.Provider value>
      <div ref={box} tabIndex={-1} className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-ink-950 outline-none" onClick={advance} role="dialog" aria-modal="true" aria-live="polite">
        {cam.place && (
          <div key={`shake-${index}`} className={`absolute inset-0 ${shake}`}>
            <div
              className="absolute -inset-[9%] transition-transform ease-in-out"
              style={{ transform: `translate(${cam.x}%, ${cam.y}%) scale(${cam.zoom})`, transitionDuration: `${ms}ms` }}
            >
              <PlaceBackdrop id={cam.place} className="h-full w-full" stage={STAGE_SIDEWAYS} />
            </div>
            {/* Held sideways the words sit beside the speaker, not at the bottom: a shorter shade keeps the ground in view. */}
            <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t [@media(orientation:landscape)_and_(max-height:600px)]:h-1/4 from-ink-950 via-ink-950/85 to-transparent" />
          </div>
        )}
        {weather !== 'none' && <Weather kind={weather} behind />}

        <div className="safe-top land-safe-x relative z-10 flex justify-between px-4">
          <SoundToggle />
          <div className="flex gap-1">
            {onLater && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLater();
                }}
                className="rounded-md px-3 py-2 text-xs text-slate-400"
              >
                Later
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                (onSkip ?? onDone)();
              }}
              className="rounded-md px-3 py-2 text-xs text-slate-400"
            >
              Skip
            </button>
          </div>
        </div>

        {shot && 'title' in shot && (
          <div key={`title-${index}`} className="relative z-10 flex flex-1 animate-fadein items-center justify-center px-6 text-center">
            <p className="font-pixel text-sm leading-relaxed text-gold-300 drop-shadow-[0_2px_0_#0b0d14]">{shot.title}</p>
          </div>
        )}

        {line && (
          // Held sideways, whoever is on screen stands on the left and the words sit beside them.
          <div className={side ? 'land-safe-x contents [@media(orientation:landscape)_and_(max-height:600px)]:flex [@media(orientation:landscape)_and_(max-height:600px)]:min-h-0 [@media(orientation:landscape)_and_(max-height:600px)]:flex-1 [@media(orientation:landscape)_and_(max-height:600px)]:items-center [@media(orientation:landscape)_and_(max-height:600px)]:gap-6' : 'contents'}>
            <div key={`shake-p-${index}`} className={`relative flex justify-center pb-6 ${narrator ? 'flex-[0.8] items-end' : 'flex-1 items-end'} ${side ? '[@media(orientation:landscape)_and_(max-height:600px)]:flex-1 [@media(orientation:landscape)_and_(max-height:600px)]:items-center [@media(orientation:landscape)_and_(max-height:600px)]:pb-4' : ''} ${cam.place ? '' : shake}`}>
              {narrator && !line.show && !line.art
                ? backdrop?.(index)
                : (
                  <div key={`${index}-${line.show ?? line.who}`} className={enter}>
                    <Portrait line={line} gear={gear} classId={classId} flame={flame} sp={sp} />
                  </div>
                )}
            </div>

            <div className={`safe-bottom relative mx-auto w-full max-w-md px-4 pb-6 ${narrator ? 'flex-1' : ''} ${side ? '[@media(orientation:landscape)_and_(max-height:600px)]:flex [@media(orientation:landscape)_and_(max-height:600px)]:flex-1 [@media(orientation:landscape)_and_(max-height:600px)]:flex-col [@media(orientation:landscape)_and_(max-height:600px)]:justify-center [@media(orientation:landscape)_and_(max-height:600px)]:px-0 [@media(orientation:landscape)_and_(max-height:600px)]:pb-4' : ''}`}>
              {film ? (
                <div key={index} className="min-h-[132px] animate-fadein px-2 text-center">
                  <p className="text-xl leading-relaxed text-slate-200">
                    {line.text.slice(0, upTo)}
                    {!done && <span className="opacity-0">{line.text.slice(shown)}</span>}
                  </p>
                  <p className="mt-4 text-xs text-slate-500">{done ? <span className="animate-blink">tap</span> : <span>&nbsp;</span>}</p>
                </div>
              ) : (
                <div className={`min-h-[132px] rounded-xl p-4 pixel-border ${dark ? 'bg-[#140f1f]' : 'bg-ink-800/95'} ${narrator ? 'text-center' : ''}`}>
                  {!narrator && <p className={`mb-2 font-pixel text-[10px] ${TAG[who?.tag ?? 'gold']}`}>{name}</p>}
                  <p className={`text-lg leading-snug ${narrator ? 'italic text-slate-300' : dark ? 'text-red-100' : 'text-slate-100'}`}>
                    {line.text.slice(0, upTo)}
                    {!done && <span className="opacity-0">{line.text.slice(shown)}</span>}
                  </p>
                  <p className="mt-2 text-right text-xs text-slate-500">{done ? <span className="animate-blink">▼ tap</span> : <span>&nbsp;</span>}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!line && !(shot && 'title' in shot) && <div className="flex-1" />}

        {line?.art === 'sp-transform' && classId && <SpTransform key={index} classId={classId} n={line.spn} gear={gear} onDone={next} />}

        <div
          className={`pointer-events-none absolute inset-0 z-20 transition-opacity ${cam.fade === 'white' ? 'bg-white' : 'bg-black'}`}
          style={{ opacity: cam.fade === 'none' ? 0 : 1, transitionDuration: `${ms}ms` }}
        />
      </div>
    </PixelSnap.Provider>
  );
}
