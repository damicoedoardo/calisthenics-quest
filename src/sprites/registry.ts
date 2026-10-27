import { uniformGear } from '@/lib/gear';
import type { AbilityId, RelicId } from '@/game/dungeon/engine';
import type { UpgradeId } from '@/lib/fog';
import { CLIPS, type ClipFrame, type ClipId, type SpriteAction } from './clips';
import { toSheet, type Grid } from './engine/grid';
import { drawBook } from './characters/book';
import { drawEmber, type FlameOpts } from './characters/ember';
import { drawHero, heroAttack, heroLabel, type HeroOpts } from './characters/hero';
import { drawKnight, drawKnightBoss, type KnightBossOpts } from './characters/knight';
import { drawGlassHero, drawGlassShatter } from './characters/glass';
import { drawPlateauBoss, type PlateauBossOpts } from './characters/monolith';
import { drawHollowBoss, drawHollowFade } from './characters/hollowBoss';
import { drawSummitSpirit } from './characters/summitSpirit';
import { drawMira } from './characters/mira';
import { drawMirror } from './characters/mirror';
import { drawPixelArt, type PixelArt } from './characters/pixel';
import { drawPlateau } from './characters/plateau';
import { drawSummit } from './characters/summit';
import { drawTomorrow } from './characters/tomorrow';
import { drawWanderer } from './characters/wanderer';
import { drawKid, drawLia, drawSol, type VillagerOpts } from './characters/villagers';
import { drawVela } from './characters/vela';
import { drawKindled, type KindledOpts } from './characters/kindled';
import { drawWisp } from './characters/wisp';
import { drawRam } from './characters/ram';
import { drawSmoke } from './characters/smoke';
import { drawSeeker } from './characters/seeker';
import { drawSplitling, drawSplitter, drawSplitterPop } from './characters/splitter';
import { drawShade } from './characters/shade';
import { drawWarden } from './characters/warden';
import { drawLanternMid } from './characters/lanternMid';
import { drawForemanMid } from './characters/foremanMid';
import { drawSandGolemMid } from './characters/sandGolemMid';
import { drawWhisperMid } from './characters/whisperMid';
import { drawGaleMid } from './characters/galeMid';
import { drawExercise, type ExerciseOpts } from './characters/exercise';
import { ZONE_PLACE, dress, edged } from './characters/zoned';
import { ABILITY_ICONS, DAY_ICONS, KEEPSAKE_ICONS, MARK_ICONS, RELIC_ICONS, SKILL_ICONS, UI_ICONS, ZONE_ICONS, type DayKind } from './characters/icons';

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

/** A one-frame icon from text rows, the art picked by the sprite's options. */
const icon = <O,>(label: (o: O) => string, defaults: O, art: (o: O) => PixelArt) =>
  drawn<O>({ label, defaults, clips: () => ({ idle: 'still' }), draw: (o) => drawPixelArt(art(o)) });

/** A 64x64 creature that floats or breathes on the hover clip, with an optional attack clip. */
const creature = (label: string, draw: DrawnSprite<NoOpts>['draw'], attack?: ClipId) =>
  drawn<NoOpts>({ label: () => label, defaults: {}, clips: () => (attack ? { idle: 'hover', attack } : { idle: 'hover' }), draw });

/** Which zone a regular monster lives in: 0 is the Ashlands (the monster as drawn), 1-5 dress it
    for the Mirror Lake, the Cold Forges, the Plateau, the Fog and the Summit (see zoned.ts). */
export interface ZoneOpts {
  zone: number;
}

/** A creature with a zone variant for each zone, from the same drawing. */
const zoned = (label: string, draw: DrawnSprite<NoOpts>['draw'], attack: ClipId = 'lunge') =>
  drawn<ZoneOpts>({
    label: (o) => (o.zone > 0 && ZONE_PLACE[o.zone] ? `${ZONE_PLACE[o.zone]} ${label}` : label),
    defaults: { zone: 0 },
    clips: () => ({ idle: 'hover', attack }),
    draw: (o, fr, f) => edged(dress(draw({}, fr, f), o.zone, f), o.zone),
  });

export interface KeepsakeOpts {
  /** The zone whose boss gave it, 0-5. */
  zone: number;
}
export interface RelicIconOpts {
  name: RelicId;
}
export interface AbilityIconOpts {
  name: AbilityId | 'dodge';
}
export interface SkillIconOpts {
  name: UpgradeId;
}
export interface MarkIconOpts {
  name: 'warden' | 'boss';
}
export interface UiIconOpts {
  name: keyof typeof UI_ICONS;
}
export interface ZoneIconOpts {
  /** The zone's id (ZONES[i].id), 0-5. */
  zone: number;
}
export interface DayIconOpts {
  kind: DayKind;
}

const STARTER_GEAR = uniformGear(undefined, 0);

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
  // Villagers: { after: true } is how they look once you've helped them.
  lia: drawn<VillagerOpts>({ label: ({ after }) => (after ? 'Lia, dancing again' : 'Lia the dancer'), defaults: { after: false }, clips: () => ({ idle: 'idle' }), draw: drawLia, look: () => ({ shadow: true }) }),
  sol: drawn<VillagerOpts>({ label: ({ after }) => (after ? 'Sol, running again' : 'Sol the runner'), defaults: { after: false }, clips: () => ({ idle: 'idle' }), draw: drawSol, look: () => ({ shadow: true }) }),
  vela: drawn<VillagerOpts>({ label: ({ after }) => (after ? 'Old Vela, letter sealed' : 'Old Vela'), defaults: { after: false }, clips: () => ({ idle: 'idle', attack: 'raise' }), draw: drawVela, look: () => ({ shadow: true }) }),
  kindled: drawn<KindledOpts>({
    label: () => "Your flame's true form",
    defaults: { hair: 'short' },
    clips: () => ({ idle: 'hover', attack: 'wave' }),
    draw: drawKindled,
    look: () => ({ filter: 'drop-shadow(0 0 10px rgba(251,146,60,.6))' }),
  }),
  book: creature('The Book of Days', drawBook, 'hover'),
  slime: zoned('Tomorrow', drawTomorrow),
  mirror: creature('The Mirror', drawMirror, 'lunge'),
  golem: creature('The Plateau', drawPlateau, 'lunge'),
  summit: creature('The Summit', drawSummit),
  wisp: zoned('Ash Wisp', drawWisp),
  ram: zoned('Ram', drawRam),
  smoke: zoned('Smoker', drawSmoke),
  seeker: zoned('Seeker', drawSeeker),
  splitter: zoned('Splitter', drawSplitter),
  splitling: zoned('Splitling', drawSplitling),
  splitterPop: drawn<NoOpts>({ label: () => 'The Splitter splitting', defaults: {}, clips: () => ({ idle: 'pop' }), draw: drawSplitterPop }),
  shade: zoned('Shade', drawShade),
  warden: creature('The Warden of the Ashes', drawWarden, 'lunge'),
  lanternMid: creature('The Drowned Lantern', drawLanternMid, 'lunge'),
  foremanMid: creature('The Foreman', drawForemanMid, 'lunge'),
  sandGolemMid: creature('The Sand Golem', drawSandGolemMid(false), 'lunge'),
  sandGolemMidStone: creature('The Sand Golem, set to stone', drawSandGolemMid(true), 'lunge'),
  whisperMid: creature('The Whisper', drawWhisperMid, 'lunge'),
  galeMid: creature('The Gale', drawGaleMid, 'lunge'),
  // The dungeon bosses. The Mirror is you in glass (pass the player's look and gear, like the hero).
  // app icons, hand-drawn at 16x16 (keepsakes) and 12x12 (Book of Days)
  keepsake: icon<KeepsakeOpts>((o) => `Keepsake ${o.zone + 1}`, { zone: 0 }, (o) => KEEPSAKE_ICONS[o.zone] ?? KEEPSAKE_ICONS[0]),
  dayIcon: icon<DayIconOpts>((o) => o.kind, { kind: 'A visit' }, (o) => DAY_ICONS[o.kind]),
  relicIcon: icon<RelicIconOpts>((o) => o.name, { name: 'whetstone' }, (o) => RELIC_ICONS[o.name]),
  abilityIcon: icon<AbilityIconOpts>((o) => o.name, { name: 'charge' }, (o) => ABILITY_ICONS[o.name]),
  skillIcon: icon<SkillIconOpts>((o) => o.name, { name: 'power' }, (o) => SKILL_ICONS[o.name]),
  uiIcon: icon<UiIconOpts>((o) => o.name, { name: 'heart' }, (o) => UI_ICONS[o.name]),
  zoneIcon: icon<ZoneIconOpts>((o) => `zone ${o.zone}`, { zone: 0 }, (o) => ZONE_ICONS[Math.max(0, Math.min(ZONE_ICONS.length - 1, o.zone))]),
  markIcon: icon<MarkIconOpts>((o) => o.name, { name: 'boss' }, (o) => MARK_ICONS[o.name]),
  // you, doing an exercise of the program (the workout screen's demo)
  exercise: drawn<ExerciseOpts>({
    label: (o) => `How to do it: ${o.exercise}`,
    defaults: { exercise: 'pushup', gear: STARTER_GEAR },
    clips: () => ({ idle: 'rep' }),
    draw: (o, _fr, f) => drawExercise(o, f),
  }),
  mirrorBoss: drawn<HeroOpts>({
    label: () => 'The Mirror, you in glass',
    defaults: { gear: STARTER_GEAR },
    clips: (o) => ({ idle: 'idle', attack: heroAttack(o.gear, o.classId) }),
    draw: drawGlassHero,
    look: () => ({ shadow: true, filter: 'drop-shadow(0 0 6px rgba(125,211,252,.6))' }),
  }),
  mirrorBossShatter: drawn<HeroOpts>({ label: () => 'The Mirror shattering', defaults: { gear: STARTER_GEAR }, clips: () => ({ idle: 'pop' }), draw: drawGlassShatter }),
  knightBoss: drawn<KnightBossOpts>({
    label: ({ stage }) => ['The Perfect Knight', 'The Perfect Knight, plates falling', 'The Perfect Knight, helm off'][stage],
    defaults: { stage: 0 },
    clips: () => ({ idle: 'idle', attack: 'swing' }),
    draw: drawKnightBoss,
    look: () => ({ shadow: true }),
  }),
  plateauBoss: drawn<PlateauBossOpts>({
    label: ({ stage }) => ['The Plateau', 'The Plateau, cracking', 'The Plateau, breaking'][stage],
    defaults: { stage: 0 },
    clips: () => ({ idle: 'hover', attack: 'lunge' }),
    draw: drawPlateauBoss,
  }),
  hollowBoss: creature('The Hollow', drawHollowBoss, 'lunge'),
  summitBoss: creature('The Summit, the mountain spirit', drawSummitSpirit, 'lunge'),
  hollowBossFade: drawn<NoOpts>({ label: () => 'The Hollow, letting go', defaults: {}, clips: () => ({ idle: 'pop' }), draw: drawHollowFade }),
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

const stills = new Map<string, string>();

/** One frame of a drawn sprite's action as an image, built once and cached: cheaper than a whole
    sheet when a long list only shows stills. Needs a browser (canvas). */
export function stillFor<I extends SpriteId>(id: I, action: SpriteAction, opts?: Partial<SpriteOpts<I>>, frame = 0): string {
  const d = def(id);
  if (d.kind !== 'drawn') return '';
  const o = withDefaults(id, opts),
    clipId = clipFor(id, action, opts) ?? 'idle',
    key = `${id}|${clipId}|${frame}|${JSON.stringify(o)}`,
    hit = stills.get(key);
  if (hit !== undefined) return hit;
  const src = toSheet([d.draw(o, CLIPS[clipId].frames[frame], frame)]);
  stills.set(key, src);
  return src;
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
