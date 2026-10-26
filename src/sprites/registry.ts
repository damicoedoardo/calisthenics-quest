import { equippedGear } from '@/lib/gear';
import { CLIPS, type ClipFrame, type ClipId, type SpriteAction } from './clips';
import { toSheet, type Grid } from './engine/grid';
import { drawBook } from './characters/book';
import { drawEmber, type FlameOpts } from './characters/ember';
import { drawHero, heroAttack, heroLabel, type HeroOpts } from './characters/hero';
import { drawKnight } from './characters/knight';
import { drawMira } from './characters/mira';
import { drawMirror } from './characters/mirror';
import { drawPixelArt, type PixelArt } from './characters/pixel';
import { drawPlateau } from './characters/plateau';
import { drawSummit } from './characters/summit';
import { drawTomorrow } from './characters/tomorrow';
import { drawWanderer } from './characters/wanderer';
import { drawKid, drawLia, drawSol } from './characters/villagers';
import { drawWisp } from './characters/wisp';

/* Every sprite in the game, by id. Components draw them with <Sprite id="..." />, so swapping the
   art for a character is a change here, never in a component. Two kinds:
   - drawn: painted in code, frame by frame, from the clips in clips.ts.
   - image: a PNG sprite sheet in /public (Aseprite, PixelLab...), one row per action. */

type NoOpts = Record<never, never>;

/** How a sprite looks around its frames: a ground shadow and a CSS glow. */
export interface Presentation {
  shadow?: boolean;
  opacity?: number;
  filter?: string;
}

export interface DrawnSprite<O> {
  kind: 'drawn';
  label: (o: O) => string;
  /** Options used when a component passes none (or only some). */
  defaults: O;
  /** The clip each action plays. Actions a sprite doesn't have fall back to idle. */
  clips: (o: O) => { idle: ClipId } & Partial<Record<SpriteAction, ClipId>>;
  draw: (o: O, frame: ClipFrame, f: number) => Grid;
  look?: (o: O) => Presentation;
}

export interface ImageClip {
  /** Row in the image, from 0. */
  row: number;
  frames: number;
  ms: number;
  loop: boolean;
}

export interface ImageSprite {
  kind: 'image';
  label: string;
  /** Path under /public, e.g. '/sprites/hero.png'. */
  src: string;
  /** Size of one frame in image pixels. */
  frame: { w: number; h: number };
  /** Frames in the widest row, and number of rows: the image is columns*w by rows*h. */
  columns: number;
  rows: number;
  clips: { idle: ImageClip } & Partial<Record<SpriteAction, ImageClip>>;
  look?: Presentation;
}

const drawn = <O,>(def: Omit<DrawnSprite<O>, 'kind'>): DrawnSprite<O> => ({ kind: 'drawn', ...def });

/** A one-frame sprite from text rows. */
const pixel = (label: string, art: PixelArt) =>
  drawn<NoOpts>({ label: () => label, defaults: {}, clips: () => ({ idle: 'still' }), draw: () => drawPixelArt(art) });

/** A 64x64 creature that floats or breathes on the hover clip, with an optional attack clip. */
const creature = (label: string, draw: DrawnSprite<NoOpts>['draw'], attack?: ClipId) =>
  drawn<NoOpts>({ label: () => label, defaults: {}, clips: () => (attack ? { idle: 'hover', attack } : { idle: 'hover' }), draw });

const STARTER_GEAR = equippedGear(undefined, { push: 0, pull: 0, core: 0 });

export const SPRITES = {
  hero: drawn<HeroOpts>({
    label: heroLabel,
    defaults: { gear: STARTER_GEAR },
    clips: (o) => ({ idle: 'idle', attack: heroAttack(o.gear, o.classId) }),
    draw: drawHero,
    look: ({ variant }) =>
      variant === 'echo'
        ? { shadow: true, opacity: 0.88, filter: 'drop-shadow(0 0 6px rgba(251,191,36,.55))' }
        : variant === 'hollow'
          ? { shadow: true, filter: 'drop-shadow(0 0 6px rgba(124,58,237,.6))' }
          : { shadow: true },
  }),
  wanderer: drawn<NoOpts>({ label: () => 'The Wanderer', defaults: {}, clips: () => ({ idle: 'idle', attack: 'swing' }), draw: drawWanderer }),
  ember: drawn<FlameOpts>({
    label: ({ stage }) => `Your flame, a ${stage}`,
    defaults: { stage: 'candle', mood: 'happy' },
    clips: () => ({ idle: 'hover' }),
    draw: drawEmber,
    look: ({ mood }) => (mood === 'dim' ? {} : { filter: `drop-shadow(0 0 ${mood === 'bright' ? 10 : 5}px rgba(251,146,60,.55))` }),
  }),
  mira: drawn<NoOpts>({ label: () => 'Mira the Smith', defaults: {}, clips: () => ({ idle: 'idle', attack: 'swing' }), draw: drawMira, look: () => ({ shadow: true }) }),
  knight: drawn<NoOpts>({ label: () => 'The Perfect Knight', defaults: {}, clips: () => ({ idle: 'idle', attack: 'swing' }), draw: drawKnight, look: () => ({ shadow: true }) }),
  kid: drawn<NoOpts>({ label: () => 'The kid inside the armor', defaults: {}, clips: () => ({ idle: 'idle' }), draw: drawKid, look: () => ({ shadow: true }) }),
  lia: drawn<NoOpts>({ label: () => 'Lia the dancer', defaults: {}, clips: () => ({ idle: 'idle' }), draw: drawLia, look: () => ({ shadow: true }) }),
  sol: drawn<NoOpts>({ label: () => 'Sol the runner', defaults: {}, clips: () => ({ idle: 'idle' }), draw: drawSol, look: () => ({ shadow: true }) }),
  book: creature('The Book of Days', drawBook, 'hover'),
  slime: creature('Tomorrow', drawTomorrow, 'lunge'),
  mirror: creature('The Mirror', drawMirror, 'lunge'),
  golem: creature('The Plateau', drawPlateau, 'lunge'),
  summit: creature('The Summit', drawSummit),
  wisp: creature('Ash Wisp', drawWisp, 'lunge'),
};

export type SpriteId = keyof typeof SPRITES;
export type SpriteOpts<I extends SpriteId> = (typeof SPRITES)[I] extends DrawnSprite<infer O> ? O : NoOpts;
type AnySprite = DrawnSprite<Record<string, unknown>> | ImageSprite;

const def = (id: SpriteId) => SPRITES[id] as unknown as AnySprite;
const withDefaults = <I extends SpriteId>(id: I, opts?: Partial<SpriteOpts<I>>) => {
  const d = def(id);
  return d.kind === 'drawn' ? { ...d.defaults, ...opts } : {};
};

/** A ready-to-show strip of frames for one action. */
export interface Sheet {
  src: string;
  /** Frame size in image pixels. */
  w: number;
  h: number;
  frames: number;
  ms: number;
  loop: boolean;
  row: number;
  columns: number;
  rows: number;
}

const cache = new Map<string, Sheet>();

/** The clip a sprite plays for an action (drawn sprites only). */
export function clipFor<I extends SpriteId>(id: I, action: SpriteAction, opts?: Partial<SpriteOpts<I>>): ClipId | null {
  const d = def(id);
  if (d.kind !== 'drawn') return null;
  const clips = d.clips(withDefaults(id, opts));
  return clips[action] ?? clips.idle;
}

/** Draws every frame of a drawn sprite's action as grids (works anywhere, no canvas). */
export function framesFor<I extends SpriteId>(id: I, action: SpriteAction, opts?: Partial<SpriteOpts<I>>): Grid[] {
  const d = def(id);
  if (d.kind !== 'drawn') return [];
  const o = withDefaults(id, opts),
    clip = CLIPS[clipFor(id, action, opts) ?? 'idle'];
  return clip.frames.map((fr, f) => d.draw(o, fr, f));
}

/** The sheet for a sprite's action, built once and cached. Drawn sprites need a browser (canvas). */
export function sheetFor<I extends SpriteId>(id: I, action: SpriteAction, opts?: Partial<SpriteOpts<I>>): Sheet {
  const d = def(id);
  if (d.kind === 'image') return imageSheet(d, action);
  const clipId = clipFor(id, action, opts) ?? 'idle',
    key = `${id}|${clipId}|${JSON.stringify(withDefaults(id, opts))}`,
    hit = cache.get(key);
  if (hit) return hit;
  const clip = CLIPS[clipId],
    frames = framesFor(id, action, opts),
    sheet = { src: toSheet(frames), w: frames[0][0].length, h: frames[0].length, frames: frames.length, ms: clip.ms, loop: clip.loop, row: 0, columns: frames.length, rows: 1 };
  cache.set(key, sheet);
  return sheet;
}

/** The sheet for one action of a PNG sprite: no drawing, just which row and how many frames. */
export function imageSheet(d: ImageSprite, action: SpriteAction): Sheet {
  const c = d.clips[action] ?? d.clips.idle;
  return { src: d.src, w: d.frame.w, h: d.frame.h, frames: c.frames, ms: c.ms, loop: c.loop, row: c.row, columns: d.columns, rows: d.rows };
}

export function labelFor<I extends SpriteId>(id: I, opts?: Partial<SpriteOpts<I>>): string {
  const d = def(id);
  return d.kind === 'drawn' ? d.label(withDefaults(id, opts)) : d.label;
}

export function presentationFor<I extends SpriteId>(id: I, opts?: Partial<SpriteOpts<I>>): Presentation {
  const d = def(id);
  return (d.kind === 'drawn' ? d.look?.(withDefaults(id, opts)) : d.look) ?? {};
}
