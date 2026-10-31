import type * as Phaser from 'phaser';
import type { FogBoss } from '@/story/types';
import type { BossSheetKey, SheetKey } from '../rules';
import type { MonsterKind } from './content';
import type { Foe, GameEvent, Mine } from './engine';
import type { FxKit } from './spFx';

/* How the monsters look in a run: each one's sprite and size, its shots, the warning it gives
   before it attacks, how it fires, and how it dies. Only drawing lives here; the engine plays the
   monster (its numbers and patterns are MONSTERS in content.ts) and the scene (scene.ts) reads
   this table. One entry per monster in FOE_FX, so swapping how one looks is a change in one place.

   Two kinds of drawing, as in spFx.ts: on the floor in engine points (`c.fx`, or `k.fade(ms,
   draw)`), or standing up in screen points (`c.mk` through `c.P`, or `k.fade(ms, draw, true)`).
   Hard rule: nothing here covers the play field; warnings are small and sit under the monster or
   on the spot that will be hit. Types only from Phaser: the scene is loaded with import(). */

type G = Phaser.GameObjects.Graphics;
export type KillEvent = Extract<GameEvent, { type: 'kill' }>;

/** How a monster is drawn: its sprite sheet, its size (1 = a 64px sheet at full size), the colors
    of the bits it bursts into, and a tint over the whole sprite. */
export interface Look {
  tex: SheetKey;
  scale: number;
  bits: number[];
  tint?: number;
}

/** What the scene lends a monster's effects: the SP kit, and a one-shot sheet animation. */
export interface FoeKit extends FxKit {
  /** Plays a sheet once at an engine point, at `scale`, then it's gone. */
  once(tex: SheetKey, x: number, y: number, scale: number): void;
}

/** One monster on one frame, for its warnings and its sprite. */
export interface FoeCtx {
  f: Foe;
  /** On the floor, in engine points (cleared every frame). */
  fx: G;
  /** Standing up, in screen points (cleared every frame). */
  mk: G;
  P(x: number, y: number): [number, number];
  /** Run seconds, and the screen's clock (ms). */
  t: number;
  now: number;
  look: Look;
}

/** A shot's picture, drawn once into a texture of w x h. `rim` is on for sandstone (the
    Plateau): warm shots get a dark rim so they read. `spin` turns it (radians a second); `point`
    turns it to the way it flies. Without either it stays upright. */
export interface ShotArt {
  w: number;
  h: number;
  paint(g: G, rim: boolean): void;
  spin?: number;
  point?: boolean;
}

export interface FoeFx {
  look: Look;
  /** Its own shots (a key in SHOT_ART). Without one they look like their style (STYLE_SHOT). */
  shot?: string;
  /** What its shots burst into (a Dust Devil's sand ball into grit), a key in SHOT_ART. */
  hatch?: string;
  /** Every frame it's alive: its warnings (a charge's line, where it will land). */
  tell?(c: FoeCtx): void;
  /** Every frame it's alive and not flashing from a hit: its sprite's tint and fade. */
  body?(s: Phaser.GameObjects.Sprite, c: FoeCtx): void;
  /** As it fires a volley. */
  fire?(k: FoeKit, f: Foe, look: Look): void;
  /** As it dies, after the pop every monster gets. `R` is its size on screen. */
  death?(k: FoeKit, e: KillEvent, R: number, look: Look): void;
  /** Its kill sound's pitch (1 by default). */
  killPitch?: number;
  /** Lands with a stomp when it shows up. */
  heavy?: boolean;
}

// ---------- the shots ----------

/** A round shot: a glow, a body and a light core. */
const round =
  (glow: number, body: number, core: number): ShotArt['paint'] =>
  (g, rim) => {
    g.fillStyle(glow, 0.35).fillCircle(7, 7, 7);
    if (rim) g.fillStyle(0x1c1712).fillCircle(7, 7, 6);
    g.fillStyle(body).fillCircle(7, 7, 5);
    g.fillStyle(core).fillCircle(6, 6, rim ? 3 : 2);
  };

/** A lumpy stone with a hot core. */
function rock(g: G, glow: number, body: number, core: number) {
  g.fillStyle(glow, 0.4).fillCircle(7, 7, 7);
  g.fillStyle(body).fillPoints([{ x: 3, y: 4 }, { x: 8, y: 2 }, { x: 12, y: 5 }, { x: 11, y: 11 }, { x: 6, y: 12 }, { x: 2, y: 9 }], true);
  g.fillStyle(core).fillCircle(7, 7, 2.5);
}

/** Every monster shot's picture, by key. Monster shots are hot, round and easy to read against
    any ground; a monster's own shot keeps that: a glow round it and a light core. */
export const SHOT_ART: Record<string, ShotArt> = {
  bullet: {
    w: 14,
    h: 14,
    paint: (g, rim) => {
      g.fillStyle(0xf43f5e, 0.35).fillCircle(7, 7, 7);
      if (rim) g.fillStyle(0x1c1712).fillCircle(7, 7, 6);
      g.fillStyle(0xfb7185).fillCircle(7, 7, 5);
      g.fillStyle(0xffe4e6).fillCircle(6, 6, 2);
    },
  },
  'bullet-boss': {
    w: 18,
    h: 18,
    paint: (g) => {
      g.fillStyle(0xa855f7, 0.35).fillCircle(9, 9, 9);
      g.fillStyle(0xc084fc).fillCircle(9, 9, 6);
      g.fillStyle(0xf5d0fe).fillCircle(8, 8, 3);
    },
  },
  'bullet-homing': { w: 14, h: 14, paint: round(0x22d3ee, 0x67e8f9, 0xecfeff) },
  'bullet-bounce': { w: 14, h: 14, paint: round(0x84cc16, 0xbef264, 0xf7fee7) },
  'bullet-ramp': { w: 14, h: 14, paint: round(0xf97316, 0xfdba74, 0xfff7ed) },
  // Tomorrow's yawns: a sleepy bubble, and the Z it lets out (its boss shots).
  // The Lull's song: a note that sways as it goes, and a slow hum, big and soft (his boss shots).
  'shot-note': {
    w: 16,
    h: 16,
    paint: (g) => {
      g.fillStyle(0xa78bfa, 0.4).fillCircle(8, 8, 8);
      g.fillStyle(0xede9fe).fillEllipse(6, 11, 6, 4.5);
      g.fillRect(8, 3, 2, 8);
      g.fillRect(8, 3, 5, 2);
    },
  },
  'shot-hum': {
    w: 24,
    h: 24,
    paint: (g) => {
      g.fillStyle(0x8b5cf6, 0.3).fillCircle(12, 12, 12);
      g.fillStyle(0xc4b5fd, 0.85).fillCircle(12, 12, 8);
      g.lineStyle(2, 0xf5f3ff, 0.9).strokeCircle(12, 12, 8);
      g.fillStyle(0xffffff).fillRect(8, 8, 3, 3);
    },
  },
  // The Unsent's words, and the Distance's fog.
  'shot-word': {
    w: 14,
    h: 10,
    point: true,
    paint: (g) => {
      g.fillStyle(0x97a0cc, 0.35).fillEllipse(7, 5, 14, 10);
      g.fillStyle(0xfffdf5).fillRect(2, 2, 10, 6);
      g.fillStyle(0x1e1b2e).fillRect(3, 3, 3, 1).fillRect(7, 3, 4, 1).fillRect(3, 5, 6, 1);
    },
  },
  'shot-fog': {
    w: 16,
    h: 16,
    paint: (g) => {
      g.fillStyle(0x55609a, 0.35).fillCircle(8, 8, 8);
      g.fillStyle(0xc8ceea, 0.8).fillCircle(8, 8, 5);
      g.fillStyle(0xffffff, 0.9).fillCircle(7, 7, 2);
    },
  },
  // The Silent Bell's toll, and the Tollkeeper's stones.
  'shot-toll': {
    w: 16,
    h: 16,
    paint: (g) => {
      g.fillStyle(0xe0b45c, 0.3).fillCircle(8, 8, 8);
      g.lineStyle(2, 0xfbe3a0, 0.95).strokeCircle(8, 8, 6);
      g.fillStyle(0xfffbeb).fillCircle(8, 8, 2);
    },
  },
  'shot-plank': {
    w: 14,
    h: 14,
    spin: 7,
    paint: (g) => {
      g.fillStyle(0xbf9460, 0.35).fillCircle(7, 7, 7);
      g.fillStyle(0x8a6038).fillRect(2, 5, 10, 4);
      g.fillStyle(0xecd3a4).fillRect(3, 6, 8, 1);
    },
  },
  // The Grinder's sparks, struck off the stone.
  'shot-whet': {
    w: 14,
    h: 14,
    point: true,
    paint: (g) => {
      g.fillStyle(0xf97316, 0.35).fillCircle(7, 7, 7);
      g.fillStyle(0xfbbf24).fillTriangle(7, 1, 11, 9, 3, 9);
      g.fillStyle(0xfef3c7).fillRect(6, 4, 2, 5);
    },
  },
  'shot-yawn': {
    w: 14,
    h: 14,
    paint: (g) => {
      g.fillStyle(0x818cf8, 0.4).fillCircle(7, 7, 7);
      g.fillStyle(0xc7d2fe).fillCircle(7, 7, 5);
      g.fillStyle(0x6366f1).fillCircle(8, 8, 3);
      g.fillStyle(0xffffff).fillRect(4, 4, 2, 2);
    },
  },
  'shot-z': {
    w: 16,
    h: 16,
    paint: (g) => {
      g.fillStyle(0x818cf8, 0.4).fillCircle(8, 8, 8);
      g.fillStyle(0xe0e7ff).fillRect(3, 3, 10, 3).fillRect(3, 10, 10, 3);
      g.fillTriangle(10, 6, 13, 6, 6, 10).fillTriangle(10, 6, 6, 10, 3, 10);
    },
  },
  // Tomorrow's alarm clock, thrown at you.
  'shot-alarm': {
    w: 18,
    h: 18,
    spin: 5,
    paint: (g) => {
      g.fillStyle(0xfbbf24, 0.35).fillCircle(9, 9, 9);
      g.fillStyle(0xfde68a).fillCircle(5, 4, 3).fillCircle(13, 4, 3);
      g.fillStyle(0xd4a017).fillCircle(9, 10, 6);
      g.fillStyle(0xfffbeb).fillCircle(9, 10, 4);
      g.fillStyle(0x1e1b2e).fillRect(9, 7, 1, 4).fillRect(9, 10, 3, 1);
    },
  },
  // A wisp's ember: a little flame, pointing the way it flies.
  'shot-ember': {
    w: 12,
    h: 16,
    point: true,
    paint: (g) => {
      g.fillStyle(0xf97316, 0.35).fillEllipse(6, 9, 12, 14);
      g.fillStyle(0xf97316).fillTriangle(6, 0, 1, 10, 11, 10).fillCircle(6, 10, 5);
      g.fillStyle(0xfde047).fillTriangle(6, 4, 3, 11, 9, 11).fillCircle(6, 11, 3);
      g.fillStyle(0xffffff).fillCircle(6, 12, 1.5);
    },
  },
  // A glass shard off a Mirror.
  'shot-shard': {
    w: 12,
    h: 16,
    point: true,
    paint: (g) => {
      g.fillStyle(0x7dd3fc, 0.35).fillEllipse(6, 8, 12, 16);
      g.fillStyle(0xbae6fd).fillPoints([{ x: 6, y: 0 }, { x: 11, y: 8 }, { x: 6, y: 16 }, { x: 1, y: 8 }], true);
      g.fillStyle(0xffffff).fillPoints([{ x: 6, y: 2 }, { x: 8, y: 8 }, { x: 6, y: 12 }, { x: 4, y: 8 }], true);
    },
  },
  // The Ash Golem's cinders: rock with a hot core.
  'shot-cinder': { w: 14, h: 14, spin: 3, paint: (g) => rock(g, 0xf97316, 0x44403c, 0xfdba74) },
  // A Seeker's tear: it curves after you.
  'shot-tear': {
    w: 12,
    h: 16,
    point: true,
    paint: (g) => {
      g.fillStyle(0x22d3ee, 0.35).fillEllipse(6, 9, 12, 14);
      g.fillStyle(0x67e8f9).fillTriangle(6, 0, 1, 10, 11, 10).fillCircle(6, 10, 5);
      g.fillStyle(0xecfeff).fillCircle(5, 10, 2);
    },
  },
  // An Excuse Jar's shards of clay, which bounce off the walls.
  'shot-clay': {
    w: 14,
    h: 14,
    spin: 5,
    paint: (g) => {
      g.fillStyle(0x84cc16, 0.4).fillCircle(7, 7, 7);
      g.fillStyle(0xd9814e).fillTriangle(2, 4, 12, 3, 7, 12);
      g.fillStyle(0xfde68a).fillTriangle(5, 5, 9, 5, 7, 8);
    },
  },
  // A Lancer Husk's iron spikes, thrown out where its charge stops.
  'shot-spike': {
    w: 10,
    h: 16,
    point: true,
    paint: (g) => {
      g.fillStyle(0xef4444, 0.35).fillEllipse(5, 8, 10, 16);
      g.fillStyle(0xd4d4d8).fillTriangle(5, 0, 1, 12, 9, 12);
      g.fillStyle(0xef4444).fillRect(3, 11, 4, 4);
      g.fillStyle(0xffffff).fillRect(4, 3, 1, 6);
    },
  },
  // A Snooze Clock's hands, ticking out in a spiral.
  'shot-hand': {
    w: 10,
    h: 16,
    point: true,
    paint: (g) => {
      g.fillStyle(0xfbbf24, 0.35).fillEllipse(5, 8, 10, 16);
      g.fillStyle(0xf2dc8a).fillTriangle(5, 0, 2, 6, 8, 6);
      g.fillStyle(0xc9a23a).fillRect(4, 5, 2, 9);
      g.fillStyle(0xfff7d6).fillCircle(5, 13, 2);
    },
  },
  // A Shade's ring: dark at first, its rim lighting up as it speeds.
  'shot-void': {
    w: 14,
    h: 14,
    paint: (g) => {
      g.fillStyle(0xc084fc, 0.4).fillCircle(7, 7, 7);
      g.fillStyle(0xe9d5ff).fillCircle(7, 7, 5);
      g.fillStyle(0x3b0764).fillCircle(7, 7, 3);
    },
  },
  // What a Smoker's bomb throws when it bursts: violet sparks.
  'shot-spark': {
    w: 12,
    h: 12,
    spin: 8,
    paint: (g) => {
      g.fillStyle(0xc084fc, 0.4).fillCircle(6, 6, 6);
      g.fillStyle(0xf0abfc).fillRect(5, 0, 2, 12).fillRect(0, 5, 12, 2);
      g.fillStyle(0xffffff).fillRect(4, 4, 4, 4);
    },
  },
  // The Warden's embers: bigger and hotter.
  'shot-ember-big': {
    w: 14,
    h: 18,
    point: true,
    paint: (g) => {
      g.fillStyle(0xef4444, 0.35).fillEllipse(7, 10, 14, 16);
      g.fillStyle(0xef4444).fillTriangle(7, 0, 1, 12, 13, 12).fillCircle(7, 12, 6);
      g.fillStyle(0xfbbf24).fillTriangle(7, 4, 3, 13, 11, 13).fillCircle(7, 13, 4);
      g.fillStyle(0xffffff).fillCircle(7, 14, 2);
    },
  },
  // ----- the story worlds' own monsters' shots -----
  // A Glass Swan's feather of glass, out and back.
  'shot-feather': {
    w: 10,
    h: 18,
    point: true,
    paint: (g) => {
      g.fillStyle(0x7dd3fc, 0.35).fillEllipse(5, 9, 10, 18);
      g.fillStyle(0xe0f2fe).fillEllipse(5, 8, 6, 14);
      g.fillStyle(0x3a7ea3).fillRect(4, 3, 2, 14);
    },
  },
  // A Measure's nails, flat and level.
  'shot-nail': {
    w: 8,
    h: 16,
    point: true,
    paint: (g) => {
      g.fillStyle(0xfbbf24, 0.35).fillEllipse(4, 8, 8, 16);
      g.fillStyle(0xb9bcc6).fillTriangle(4, 0, 2, 5, 6, 5).fillRect(3, 4, 2, 9);
      g.fillStyle(0xe5e7eb).fillRect(1, 12, 6, 2);
    },
  },
  // A Scrap Squire's offcuts.
  'shot-scrap': {
    w: 14,
    h: 14,
    spin: 6,
    paint: (g) => {
      g.fillStyle(0xf97316, 0.35).fillCircle(7, 7, 7);
      g.fillStyle(0x7b7b86).fillTriangle(2, 3, 12, 5, 5, 12);
      g.fillStyle(0xc2410c).fillRect(5, 6, 3, 2);
      g.fillStyle(0xe5e7eb).fillRect(4, 4, 2, 1);
    },
  },
  // A Dune Mole's clods of sand.
  'shot-sand': {
    w: 14,
    h: 14,
    spin: 4,
    paint: (g, rim) => rock(g, rim ? 0x1c1712 : 0xfbbf24, 0xb08850, 0xf1dcae),
  },
  // A Dust Devil's sand ball, and the grit it bursts into.
  'shot-sandball': {
    w: 20,
    h: 20,
    spin: 6,
    paint: (g) => {
      g.fillStyle(0xf59e0b, 0.35).fillCircle(10, 10, 10);
      g.fillStyle(0x1c1712).fillCircle(10, 10, 8);
      g.fillStyle(0xd9b47a).fillCircle(10, 10, 7);
      g.fillStyle(0x7a5a32).fillRect(5, 9, 10, 2);
      g.fillStyle(0xf1dcae).fillRect(7, 5, 3, 2);
    },
  },
  'shot-grit': {
    w: 12,
    h: 12,
    spin: 8,
    paint: (g, rim) => rock(g, rim ? 0x1c1712 : 0xfbbf24, 0x9a6d3c, 0xf5e2b8),
  },
  // A Maybe's doubts: pale rings with a dot, that hang in the air before they come.
  'shot-doubt': {
    w: 16,
    h: 16,
    paint: (g) => {
      g.fillStyle(0xc4b5fd, 0.35).fillCircle(8, 8, 8);
      g.lineStyle(2, 0xf6f5ff, 0.95).strokeCircle(8, 8, 5);
      g.fillStyle(0x7c3aed).fillCircle(8, 8, 2);
    },
  },
  // An Undertow's bubbles.
  'shot-bubble': {
    w: 14,
    h: 14,
    paint: (g) => {
      g.fillStyle(0x2dd4bf, 0.35).fillCircle(7, 7, 7);
      g.fillStyle(0x0f3a45).fillCircle(7, 7, 5);
      g.lineStyle(1, 0x99f6e4).strokeCircle(7, 7, 5);
      g.fillStyle(0xffffff).fillRect(4, 4, 2, 2);
    },
  },
  // A Ridge Hawk's quills.
  'shot-quill': {
    w: 10,
    h: 16,
    point: true,
    paint: (g) => {
      g.fillStyle(0xf59e0b, 0.35).fillEllipse(5, 8, 10, 16);
      g.fillStyle(0x9a6a3e).fillEllipse(5, 7, 6, 12);
      g.fillStyle(0xfafaf9).fillRect(4, 1, 2, 4);
      g.fillStyle(0x3b2414).fillRect(4, 5, 2, 9);
    },
  },
  // The plain fun ones' shots.
  'shot-drop': {
    w: 12,
    h: 16,
    point: true,
    paint: (g) => {
      g.fillStyle(0x38bdf8, 0.35).fillEllipse(6, 9, 12, 14);
      g.fillStyle(0x7dd3fc).fillTriangle(6, 0, 1, 10, 11, 10).fillCircle(6, 10, 5);
      g.fillStyle(0xf0f9ff).fillCircle(5, 10, 2);
    },
  },
  'shot-petal': {
    w: 12,
    h: 14,
    point: true,
    paint: (g) => {
      g.fillStyle(0xec4899, 0.35).fillEllipse(6, 7, 12, 14);
      g.fillStyle(0xf9a8d4).fillEllipse(6, 7, 7, 12);
      g.fillStyle(0xfff1f8).fillRect(5, 3, 2, 6);
    },
  },
  'shot-needle': {
    w: 8,
    h: 16,
    point: true,
    paint: (g, rim) => {
      g.fillStyle(rim ? 0x1c1712 : 0x84cc16, 0.4).fillEllipse(4, 8, 8, 16);
      g.fillStyle(0xf5f5dc).fillTriangle(4, 0, 2, 14, 6, 14);
      g.fillStyle(0x2f7a3b).fillRect(3, 12, 2, 3);
    },
  },
  'shot-sun': {
    w: 14,
    h: 14,
    paint: (g, rim) => {
      g.fillStyle(0xfbbf24, 0.4).fillCircle(7, 7, 7);
      if (rim) g.fillStyle(0x1c1712).fillCircle(7, 7, 5.5);
      g.fillStyle(0xf97316).fillCircle(7, 7, 4.5);
      g.fillStyle(0xfef08a).fillCircle(6, 6, 2.5);
    },
  },
  'shot-dust': {
    w: 14,
    h: 14,
    paint: (g) => {
      g.fillStyle(0xfde68a, 0.35).fillCircle(7, 7, 7);
      g.fillStyle(0xfef3c7).fillCircle(7, 7, 4);
      g.fillStyle(0xffffff).fillCircle(6, 6, 2);
    },
  },
  'shot-spore': {
    w: 12,
    h: 12,
    spin: 3,
    paint: (g) => {
      g.fillStyle(0xa78bfa, 0.4).fillCircle(6, 6, 6);
      g.fillStyle(0xc4b5fd).fillCircle(6, 6, 4);
      g.fillStyle(0x6a5a9a).fillRect(4, 4, 2, 2).fillRect(7, 6, 2, 2);
    },
  },
  'shot-snow': {
    w: 16,
    h: 16,
    spin: 4,
    paint: (g) => {
      g.fillStyle(0x93c5fd, 0.35).fillCircle(8, 8, 8);
      g.fillStyle(0xf8fafc).fillCircle(8, 8, 6);
      g.fillStyle(0xcbd5e1).fillCircle(10, 10, 2.5);
    },
  },
  'shot-icicle': {
    w: 8,
    h: 16,
    point: true,
    paint: (g) => {
      g.fillStyle(0x7dd3fc, 0.35).fillEllipse(4, 8, 8, 16);
      g.fillStyle(0xbae6fd).fillTriangle(1, 2, 7, 2, 4, 16);
      g.fillStyle(0xffffff).fillRect(3, 3, 1, 7);
    },
  },
  'shot-stone': {
    w: 14,
    h: 14,
    spin: 3,
    paint: (g) => rock(g, 0x93c5fd, 0x4c5566, 0xdbeafe),
  },
  // The Book's pages.
  'bullet-page': {
    w: 12,
    h: 12,
    spin: 6,
    paint: (g) => {
      g.fillStyle(0xfbbf24, 0.35).fillRect(0, 0, 12, 12);
      g.fillStyle(0xfef3c7).fillRect(2, 1, 8, 10);
      g.fillStyle(0xa16207).fillRect(3, 3, 6, 1).fillRect(3, 5, 6, 1).fillRect(3, 7, 4, 1);
    },
  },
};

/** Each kind of shot has its own color, so you learn what it will do. A monster's own shot
    (FoeFx.shot) wins over this; a boss's plain shot is `bullet-boss`. */
export const STYLE_SHOT = { plain: 'bullet', homing: 'bullet-homing', bounce: 'bullet-bounce', ramp: 'bullet-ramp', wiggle: 'bullet-page', back: 'shot-feather', burst: 'shot-sandball', stall: 'shot-doubt' } as const;

/** A zone boss's own shots, by its patterns' order in BOSSES (content.ts); a pattern without one
    looks like its style. */
export const BOSS_SHOTS: Partial<Record<FogBoss, string[]>> = {
  tomorrow: ['shot-z', 'shot-alarm'],
  lull: ['shot-note', 'shot-hum', 'shot-note'],
  distance: ['shot-fog', 'shot-word'],
};

/** The picture for a shot fired by `from` (a boss's when `boss`), in `style`. A boss's shot
    (`from` 'boss') is its BOSS_SHOTS entry for pattern `n`. */
export function shotOf(from: Foe['kind'] | undefined, boss: boolean, style: keyof typeof STYLE_SHOT, which?: FogBoss, n?: number): string {
  // n -1: shots thrown by another shot (a Dust Devil's sand ball bursting into grit)
  const own = from === 'boss' ? (which && n !== undefined ? BOSS_SHOTS[which]?.[n] : undefined) : from ? ((n === -1 ? FOE_FX[from].hatch : undefined) ?? FOE_FX[from].shot) : undefined;
  return own ?? (boss && style === 'plain' ? 'bullet-boss' : STYLE_SHOT[style]);
}

// ---------- the bombs ----------

/** A lobbed bomb on its way (p 0 to 1 of the flight), then on the ground filling up until it
    bursts (p 0 to 1 of the fuse). */
export function drawMine(fx: G, mk: G, P: FoeCtx['P'], m: Mine, flying: boolean, p: number, now: number) {
  // A Cairn's icicle: a shadow on the floor that darkens, then the icicle falls onto it.
  if (m.from === 'cairn') {
    const q = flying ? 0.3 * p : 0.3 + 0.7 * p;
    fx.fillStyle(0x0c1a2e, 0.15 + 0.3 * q).fillEllipse(m.x, m.y, m.r * 2 * (0.5 + 0.5 * q), m.r * 1.4 * (0.5 + 0.5 * q));
    fx.lineStyle(2, 0x7dd3fc, 0.4 + 0.5 * q).strokeEllipse(m.x, m.y, m.r * 2, m.r * 1.4);
    if (!flying && p > 0.55) {
      const [X, Y] = P(m.x, m.y),
        y = Y - 90 * (1 - (p - 0.55) / 0.45);
      mk.fillStyle(0x7dd3fc).fillTriangle(X - 4, y - 16, X + 4, y - 16, X, y);
      mk.fillStyle(0xe0f2fe).fillTriangle(X - 1, y - 15, X + 2, y - 15, X, y - 5);
    }
    return;
  }
  // the Ash Golem's boulders, and a Kiln's hot coals
  const golem = m.from === 'golem' || m.from === 'kiln';
  if (flying) {
    // its shadow grows as it falls; the bomb (a Smoker's, fuse lit) or a boulder arcs over
    fx.fillStyle(0x000000, 0.25).fillCircle(m.x, m.y, 4 + 6 * p);
    const [X, Y] = P(m.x, m.y),
      y = Y - 40 * Math.sin(Math.PI * p);
    if (golem) {
      mk.fillStyle(0x57534e).fillCircle(X, y, 7);
      mk.fillStyle(0xf97316).fillCircle(X + 1, y + 1, 2.5);
    } else {
      mk.fillStyle(0x15131f).fillCircle(X, y, 5);
      mk.fillStyle(0xc7c2e0).fillRect(X - 2, y - 3, 2, 2);
      mk.fillStyle(now % 120 < 60 ? 0xfde047 : 0xf97316).fillRect(X + 2, y - 7, 2, 2);
    }
  } else {
    // where it will burst: the edge, and a ring closing in on the bomb as the fuse burns down
    const c = golem ? 0xf97316 : 0xc084fc;
    fx.lineStyle(2, c, 0.9).strokeCircle(m.x, m.y, m.r);
    fx.fillStyle(golem ? 0xea580c : 0xa855f7, 0.08 + 0.22 * p).fillCircle(m.x, m.y, m.r);
    fx.lineStyle(2, golem ? 0xfdba74 : 0xf0abfc, 0.5 + 0.5 * p).strokeCircle(m.x, m.y, m.r * (1 - p) + 4);
    if (golem) {
      fx.fillStyle(0x57534e).fillCircle(m.x, m.y, 7);
      fx.fillStyle(p > 0.7 && now % 140 < 70 ? 0xffffff : 0xf97316).fillCircle(m.x, m.y, 3);
    } else {
      fx.fillStyle(0x15131f).fillCircle(m.x, m.y, 5);
      fx.fillStyle(now % (p > 0.7 ? 80 : 160) < 40 ? 0xffffff : 0xfde047).fillCircle(m.x + 3, m.y - 3, 2);
    }
  }
}

// ---------- the monsters ----------

/** How long before a volley a monster gives its warning: it swells, and its own tell plays (s). */
export const TELL = 0.35;
/** How far into its warning a monster is (0 to 1), or -1 when no volley is coming. Only volleys
    on a clock count, not a stream of quick shots (which would just throb). */
export function soon(f: Foe, t: number): number {
  let best = -1;
  f.def.shoots.forEach((p, i) => {
    const left = f.next[i] - t;
    if (!p.on && p.every >= 1 && left > 0 && left < TELL) best = Math.max(best, 1 - left / TELL);
  });
  return best;
}

/** A puff of bits and a soft ring where something ended. */
function puff(k: FoeKit, e: KillEvent, R: number, color: number, n = 8) {
  const { x, y } = e;
  k.burst('bits', n, x, y, -8, color);
  k.fade(320, (g, p) => g.lineStyle(2, color, 0.7 * (1 - p)).strokeCircle(x, y, R * (0.5 + p)));
}

/** A copy breaking like glass (the Mirror's images, your reflections). */
function glass(k: FoeKit, e: KillEvent, R: number, n: number, ms: number, pitch: number) {
  k.sfx('glass', pitch);
  k.burst('bits', n, e.x, e.y, 0, 0xe0f2fe);
  const { x, y } = e;
  k.fade(ms, (g, p) => {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4,
        r0 = R * (0.3 + 1.2 * p);
      g.lineStyle(2, 0xffffff, 0.9 * (1 - p)).lineBetween(x + Math.cos(a) * r0 * 0.5, y + Math.sin(a) * r0 * 0.5, x + Math.cos(a) * r0, y + Math.sin(a) * r0);
    }
  });
}

/** Each boss's stand-in until its zone's own art (BOSS_ART) is loaded, and its size for the label. */
export const BOSS_LOOKS: Record<FogBoss, Look> = {
  tomorrow: { tex: 'slime', scale: 1.5, bits: [0x94a3b8, 0x5b74c4, 0xe2e8f0] },
  mirror: { tex: 'mirror', scale: 1.35, bits: [0xe2e8f0, 0xcbd5e1, 0xffffff] },
  knight: { tex: 'knight', scale: 1.15, bits: [0xe2e8f0, 0x94a3b8, 0xdc2626] },
  plateau: { tex: 'hollow', scale: 1.5, bits: [0xa78bfa, 0x6b21a8, 0xffffff] },
  hollow: { tex: 'hollow', scale: 1.5, bits: [0xa78bfa, 0x6b21a8, 0xffffff] },
  summit: { tex: 'hollow', scale: 1.5, bits: [0xa78bfa, 0x6b21a8, 0xffffff] },
  lull: { tex: 'slime', scale: 1.6, bits: [0x8a83a0, 0x4d7a3a, 0xd1d5db] },
  distance: { tex: 'mirror', scale: 1.35, bits: [0x55609a, 0xc8ceea, 0xfde68a] },
  alone: { tex: 'knight', scale: 1.15, bits: [0x8e96a5, 0x5f4630, 0xc8ced8] },
};

/** Each zone boss's own art, in the stages of its fight (the Knight's plates falling, the
    Plateau's cracks), and its height on screen (1 = the hero's). Until a zone's sheets are loaded
    the boss wears its stand-in from BOSS_LOOKS. Swapping a boss's art is a change here. */
export const BOSS_ART: Partial<Record<FogBoss, { stages: BossSheetKey[]; size: number; bits: number[] }>> = {
  tomorrow: { stages: ['tomorrowBoss'], size: 1.7, bits: [0x94a3b8, 0x8a3f55, 0xc9a23a] },
  mirror: { stages: ['mirrorBoss'], size: 1.05, bits: [0xe0f2fe, 0x7dd3fc, 0xffffff] },
  knight: { stages: ['knightBoss', 'knightBoss1', 'knightBoss2'], size: 1.15, bits: [0xe2e8f0, 0x94a3b8, 0xdc2626] },
  plateau: { stages: ['plateauBoss', 'plateauBoss1', 'plateauBoss2'], size: 1.7, bits: [0xd9b47a, 0x8f6b3d, 0x5a4124] },
  hollow: { stages: ['hollowBoss'], size: 1.3, bits: [0xa78bfa, 0x6b21a8, 0xffffff] },
  summit: { stages: ['summitBoss'], size: 1.9, bits: [0xe2e8f0, 0xfde68a, 0xffffff] },
  lull: { stages: ['lullBoss'], size: 1.9, bits: [0x8a83a0, 0x4d7a3a, 0xd1d5db] },
  distance: { stages: ['distanceBoss'], size: 1.5, bits: [0x55609a, 0xc8ceea, 0xfde68a] },
  alone: { stages: ['aloneBoss', 'aloneBoss1', 'aloneBoss2'], size: 1.5, bits: [0x8e96a5, 0x5f4630, 0xc8ced8] },
};

/** Which stage of its art a boss is in: the Knight by plates left, the Plateau by its cracks. */
export function bossStage(which: FogBoss, f: Foe): number {
  if (which === 'knight' || which === 'alone') return f.hp > f.maxHp * (2 / 3) ? 0 : f.hp > f.maxHp / 3 ? 1 : 2;
  if (which === 'plateau') return f.phase <= 3 ? 0 : f.phase <= 6 ? 1 : 2;
  return 0;
}

/** The warnings the plain fun monsters share by how they move: a line where a leap or charge will
    go, a line where a roll will go, the mark where a blink lands. */
const chargeLine =
  (color: number, len = 330 * 0.6) =>
  ({ f, fx, t }: FoeCtx) => {
    if (t >= f.windUntil) return;
    const p = 1 - (f.windUntil - t) / 0.75;
    fx.lineStyle(f.def.r * 2, color, 0.1 + 0.25 * p).lineBetween(f.x, f.y, f.x + f.dashX * len, f.y + f.dashY * len);
  };
const rollLine =
  (color: number) =>
  ({ f, fx, t }: FoeCtx) => {
    if (t >= f.windUntil) return;
    const p = 1 - (f.windUntil - t) / 0.6;
    fx.lineStyle(f.def.r * 1.6, color, 0.08 + 0.22 * p).lineBetween(f.x, f.y, f.x + f.dashX * 160, f.y + f.dashY * 160);
  };
const blinkMark =
  (ring: number, fill: number) =>
  ({ f, fx, t }: FoeCtx) => {
    if (t >= f.windUntil) return;
    const p = 1 - (f.windUntil - t) / 0.8;
    fx.lineStyle(2, ring, 0.9).strokeCircle(f.dashX, f.dashY, 26 - 10 * p);
    fx.fillStyle(fill, 0.2 + 0.3 * p).fillCircle(f.dashX, f.dashY, 16);
  };

/** Every monster, each with its own sprite (src/sprites/characters) and effects. */
export const FOE_FX: Record<MonsterKind, FoeFx> = {
  // A bit of Tomorrow: yawns sleepy bubbles, squashes before it does, and splats when it's gone.
  slime: {
    look: { tex: 'slime', scale: 0.55, bits: [0x94a3b8, 0x5b74c4, 0xe2e8f0] },
    shot: 'shot-yawn',
    death: (k, e, R) => {
      const { x, y } = e;
      k.fade(900, (g, p) => g.fillStyle(0x64748b, 0.45 * (1 - p)).fillEllipse(x, y, R * 1.6, R * 1.1));
    },
  },
  // An ash wisp: its flame flares before it spits embers, and it gutters out into ash.
  wisp: {
    look: { tex: 'wisp', scale: 0.5, bits: [0xf97316, 0xfde68a, 0x6b7280] },
    shot: 'shot-ember',
    killPitch: 1.3,
    tell: ({ f, fx, t }) => {
      const p = soon(f, t);
      if (p >= 0) fx.fillStyle(0xf97316, 0.15 + 0.25 * p).fillCircle(f.x, f.y, f.def.r * (0.8 + 0.6 * p));
    },
    death: (k, e, R) => {
      k.burst('puffs', 4, e.x, e.y, -10);
      puff(k, e, R, 0x9ca3af, 6);
    },
  },
  // A Mirror glints before its ring of glass, and breaks like glass.
  mirror: {
    look: { tex: 'mirror', scale: 0.65, bits: [0xe2e8f0, 0xcbd5e1, 0xffffff] },
    shot: 'shot-shard',
    tell: ({ f, mk, P, t }) => {
      const p = soon(f, t);
      if (p < 0) return;
      const [X, Y] = P(f.x, f.y),
        s = 4 + 6 * p;
      mk.fillStyle(0xffffff, 0.5 + 0.5 * p).fillPoints([{ x: X + 6, y: Y - 14 - s }, { x: X + 7.5, y: Y - 14 }, { x: X + 6, y: Y - 14 + s }, { x: X + 4.5, y: Y - 14 }], true);
      mk.fillRect(X + 6 - s, Y - 14.5, s * 2, 1);
    },
    death: (k, e, R) => glass(k, e, R, 10, 240, 1.1),
  },
  // The Ash Golem, at the end of each floor: the floor glows under it before it stomps, it throws
  // boulders where you stand, and it falls apart into rock and embers.
  golem: {
    look: { tex: 'ashGolem', scale: 0.95, bits: [0x78716c, 0x44403c, 0xf97316] },
    shot: 'shot-cinder',
    heavy: true,
    tell: ({ f, fx, t }) => {
      const p = soon(f, t);
      if (p < 0) return;
      fx.fillStyle(0xea580c, 0.12 + 0.25 * p).fillCircle(f.x, f.y, f.def.r * (1.2 + 0.8 * p));
      fx.lineStyle(2, 0xfdba74, 0.3 + 0.5 * p).strokeCircle(f.x, f.y, f.def.r * (2 - 0.6 * p));
    },
    death: (k, e, R) => {
      k.burst('bits', 14, e.x, e.y, 0, 0xf97316);
      k.burst('puffs', 6, e.x, e.y, 6);
      const { x, y } = e;
      k.fade(600, (g, p) => {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + 0.3;
          g.lineStyle(2, 0xf97316, 0.8 * (1 - p)).lineBetween(x, y, x + Math.cos(a) * R * (0.6 + 0.6 * p), y + Math.sin(a) * R * (0.6 + 0.6 * p));
        }
      });
    },
  },
  // A golden copy of you, sent by the Mirror. Hitting it hurts you.
  reflection: {
    look: { tex: 'echo', scale: 0.75, bits: [0xfde68a, 0xfbbf24, 0xffffff], tint: 0xfde68a },
    death: (k, e, R) => glass(k, e, R, 12, 240, 1.2),
  },
  // The Lancer Husk (kind 'ram'), an empty suit of armor: glows red before it charges, along the
  // line it will take, throws a ring of iron spikes where it stops, and falls apart into plates.
  ram: {
    look: { tex: 'lancer', scale: 0.62, bits: [0x55555f, 0x8a8a96, 0xc0392b] },
    shot: 'shot-spike',
    death: (k, e, R) => {
      k.sfx('clank', 1.2);
      k.burst('bits', 10, e.x, e.y, -6, 0x8a8a96);
      puff(k, e, R, 0xc0392b, 3);
    },
    tell: ({ f, fx, t }) => {
      if (t >= f.windUntil) return;
      const p = 1 - (f.windUntil - t) / 0.75,
        len = 330 * 0.6;
      fx.lineStyle(f.def.r * 2, 0xef4444, 0.1 + 0.25 * p).lineBetween(f.x, f.y, f.x + f.dashX * len, f.y + f.dashY * len);
    },
    body: (s, { f, t, now, look }) => void s.setTint(t < f.windUntil && Math.floor(now / 90) % 2 ? 0xff4d4d : (look.tint ?? 0xffffff)),
  },
  // The Snooze Clock (kind 'book'), one of Tomorrow's: never moves, ticks out a spiral of clock
  // hands, and springs apart into gears when it's gone.
  book: {
    look: { tex: 'clock', scale: 0.62, bits: [0x6b4226, 0xc9a23a, 0xf4ecd8] },
    shot: 'shot-hand',
    death: (k, e) => {
      k.sfx('clank', 1.5);
      const [X, Y] = k.P(e.x, e.y);
      k.fade(
        700,
        (g, p) => {
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 - Math.PI / 2,
              x = X + Math.cos(a) * 26 * p,
              y = Y - 8 + Math.sin(a) * 18 * p + 30 * p * p;
            g.lineStyle(2, 0xc9a23a, 1 - p).strokeCircle(x, y, 3);
            g.fillStyle(0xf2dc8a, 1 - p).fillRect(x - 1, y - 1, 2, 2);
          }
        },
        true,
      );
    },
  },
  // A Smoker: lobs a bomb (drawMine), throws violet sparks when it bursts, and goes up in soot.
  smoke: {
    look: { tex: 'smoke', scale: 0.55, bits: [0x6a5d86, 0x3b3350, 0xa78bfa] },
    shot: 'shot-spark',
    death: (k, e, R) => {
      k.burst('puffs', 8, e.x, e.y, -6);
      puff(k, e, R, 0xa78bfa, 4);
    },
  },
  // A Seeker: its eye lights up before it cries tears that curve after you.
  seeker: {
    look: { tex: 'seeker', scale: 0.55, bits: [0x67e8f9, 0x0e7490, 0xffffff] },
    shot: 'shot-tear',
    tell: ({ f, mk, P, t }) => {
      const p = soon(f, t);
      if (p < 0) return;
      const [X, Y] = P(f.x, f.y);
      mk.lineStyle(2, 0x67e8f9, 0.4 + 0.5 * p).strokeCircle(X, Y - 4, 6 + 10 * (1 - p));
    },
    death: (k, e, R) => puff(k, e, R, 0x67e8f9),
  },
  // The Excuse Jar (kind 'splitter'): bounces shards of clay off the walls, and shatters into
  // three Jar Imps (kind 'splitling').
  splitter: {
    look: { tex: 'jar', scale: 0.72, bits: [0xa4502c, 0xd9814e, 0x4b4260] },
    shot: 'shot-clay',
    death: (k, e, _R, look) => k.once('jarPop', e.x, e.y, look.scale),
  },
  splitling: { look: { tex: 'imp', scale: 0.5, bits: [0x4b4260, 0xa4502c] } },
  // Fades out, and marks where it will land.
  shade: {
    look: { tex: 'shade', scale: 0.65, bits: [0xa78bfa, 0x6b21a8, 0x1e1b4b] },
    shot: 'shot-void',
    tell: ({ f, fx, t }) => {
      if (t >= f.windUntil) return;
      const p = 1 - (f.windUntil - t) / 0.8;
      fx.lineStyle(2, 0xa78bfa, 0.9).strokeCircle(f.dashX, f.dashY, 26 - 10 * p);
      fx.fillStyle(0x6b21a8, 0.2 + 0.3 * p).fillCircle(f.dashX, f.dashY, 16);
    },
    body: (s, { f, t }) => void s.setAlpha(t < f.windUntil ? 0.25 : 1),
    death: (k, e) => {
      const [X, Y] = k.P(e.x, e.y);
      k.fade(500, (g, p) => g.fillStyle(0x6b21a8, 0.5 * (1 - p)).fillEllipse(X, Y - 20 * p, 20 * (1 - p) + 4, 30 * (1 - p) + 4), true);
    },
  },
  // The Grinder (the Whetstone Pass): a line glows the way it will roll while it turns to face you,
  // its sparks fly as it hits the wall, and it cracks apart into grit.
  grinder: {
    look: { tex: 'grinder', scale: 0.6, bits: [0x64708a, 0x9c8f7a, 0xfbbf24] },
    shot: 'shot-whet',
    tell: ({ f, fx, t }) => {
      if (t >= f.windUntil) return;
      const p = 1 - (f.windUntil - t) / 0.6;
      fx.lineStyle(f.def.r * 1.6, 0xf97316, 0.08 + 0.22 * p).lineBetween(f.x, f.y, f.x + f.dashX * 160, f.y + f.dashY * 160);
    },
    fire: (k, f) => {
      k.sfx('clank', 1.6);
      k.burst('bits', 6, f.x, f.y, 0, 0xfbbf24);
    },
    death: (k, e, R) => {
      k.sfx('crack', 1.3);
      k.burst('bits', 10, e.x, e.y, -4, 0x64708a);
      puff(k, e, R, 0xfbbf24, 4);
    },
  },
  // The Warden of the Ashes: the golem, much bigger, the grey of cold ash, embers glowing under it.
  warden: { look: { tex: 'warden', scale: 1.3, bits: [0x78716c, 0xf97316, 0xfde68a] }, shot: 'shot-ember-big', heavy: true },
  // The Mirror's images look exactly like it (the scene swaps in the Mirror's own art, BOSS_ART).
  image: { look: BOSS_LOOKS.mirror, death: (k, e, R) => glass(k, e, R, 12, 240, 1) },
  // The other zones' mid-bosses: the Drowned Lantern, the Foreman, the Sand Golem (which swaps to
  // its stone sheet while it stands), the Whisper and the Gale.
  lantern: { look: { tex: 'lanternMid', scale: 1.15, bits: [0x7dd3fc, 0x0e7490, 0xe0f2fe] }, heavy: true },
  foreman: { look: { tex: 'foremanMid', scale: 1.2, bits: [0xd6a36b, 0x92400e, 0x86efac] }, heavy: true },
  sandGolem: { look: { tex: 'sandGolemMid', scale: 1.25, bits: [0xe8c48a, 0xb08850, 0x8f6b3d] }, heavy: true },
  whisper: { look: { tex: 'whisperMid', scale: 0.85, bits: [0xc4b5fd, 0x7c3aed, 0xffffff] }, heavy: true },
  gale: { look: { tex: 'galeMid', scale: 1.15, bits: [0xe2e8f0, 0x94a3b8, 0xffffff] }, heavy: true },
  // The Bellows (the Whetstone Pass): while it breathes in, rings of air close in on it and it
  // glows, open to hits.
  bellows: {
    look: { tex: 'bellowsMid', scale: 1.4, bits: [0x9a6a3e, 0x4a4a52, 0xf97316] },
    shot: 'shot-ember',
    heavy: true,
    tell: ({ f, fx, t, now }) => {
      if (t >= f.windUntil) return;
      for (let i = 0; i < 3; i++) {
        const p = ((now / 700 + i / 3) % 1),
          r = f.def.r * (6 - 5 * p);
        fx.lineStyle(2, 0xfde68a, 0.15 + 0.4 * p).strokeCircle(f.x, f.y, r);
      }
      fx.fillStyle(0xf97316, 0.18).fillCircle(f.x, f.y, f.def.r * 1.4);
    },
  },
  // The Unsent (the Quiet Miles): words fly off it, and it tears apart into scraps.
  unsent: {
    look: { tex: 'unsent', scale: 0.6, bits: [0xece6d2, 0xb91c1c, 0x55609a] },
    shot: 'shot-word',
    death: (k, e, R) => {
      k.sfx('kill', 1.4);
      k.burst('bits', 10, e.x, e.y, -6, 0xece6d2);
      puff(k, e, R, 0x97a0cc, 5);
    },
  },
  // The Loner (the Long Bridge): its shield's side is marked on the floor, so you see where to come
  // at it from.
  loner: {
    look: { tex: 'loner', scale: 0.65, bits: [0x6b4226, 0x4a4a52, 0x646380] },
    shot: 'shot-plank',
    tell: ({ f, fx }) => {
      if (f.face === undefined) return;
      const R = f.def.r + 9;
      fx.lineStyle(3, 0xc9975e, 0.55).beginPath().arc(f.x, f.y, R, f.face - 1.1, f.face + 1.1).strokePath();
    },
  },
  // ----- the story worlds' own monsters (zones 2-6): two per world with an attack of their own -----
  // The Lake Echo (Mirror Lake): a faint line on the water to where it is headed (your mirror
  // image), and it breaks like glass.
  lakeEcho: {
    look: {
      tex: 'lakeEcho',
      scale: 0.55,
      bits: [0xa8e4f5, 0x4fa3c7, 0xe8fbff],
    },
    shot: 'shot-shard',
    tell: ({ f, fx, t }) => {
      const p = soon(f, t);
      if (p >= 0) fx.lineStyle(2, 0xe8fbff, 0.3 + 0.5 * p).strokeCircle(f.x, f.y, f.def.r * (1.8 - 0.6 * p));
    },
    death: (k, e, R) => glass(k, e, R, 10, 240, 1.3),
  },
  // The Glass Swan (Mirror Lake): its wings flash before the feathers, and it breaks like glass.
  swan: {
    look: { tex: 'swan', scale: 0.6, bits: [0xdff4fb, 0x9fd3ea, 0xffffff] },
    shot: 'shot-feather',
    fire: (k, f) => k.burst('bits', 4, f.x, f.y, -6, 0xe0f2fe),
    death: (k, e, R) => glass(k, e, R, 12, 280, 1.15),
  },
  // The Measure (the Cold Forges): a level line across where its wall will fly, and it clatters
  // apart.
  measure: {
    look: { tex: 'measure', scale: 0.6, bits: [0x7b7b86, 0xc9a23a, 0xb9bcc6] },
    shot: 'shot-nail',
    tell: ({ f, fx, t }) => {
      const p = soon(f, t);
      if (p < 0) return;
      fx.fillStyle(0xfbbf24, 0.25 + 0.5 * p).fillRect(f.x - 3, f.y + f.def.r + 4, 6, 3);
      fx.fillRect(f.x - 14 * p - 3, f.y + f.def.r + 5, 28 * p + 6, 1);
    },
    fire: (k) => k.sfx('clank', 1.9),
    death: (k, e, R) => {
      k.sfx('clank', 1.4);
      k.burst('bits', 8, e.x, e.y, -6, 0xb9bcc6);
      puff(k, e, R, 0xc9a23a, 3);
    },
  },
  // The Scrap Squire (the Cold Forges): fallen, it's a pile of scrap on the floor with a ring
  // round it (stand in it to stamp it out) that fills until it stands again.
  squire: {
    look: { tex: 'squire', scale: 0.58, bits: [0x7b7b86, 0xc2410c, 0xb9bcc6] },
    shot: 'shot-scrap',
    tell: ({ f, fx, t }) => {
      if (f.pileUntil === undefined) return;
      const p = Math.max(0, Math.min(1, 1 - (f.pileUntil - t) / 2.4));
      fx.lineStyle(2, 0xfbbf24, 0.5 + 0.4 * Math.sin(t * 12)).strokeCircle(f.x, f.y, 40);
      fx.fillStyle(0xc2410c, 0.12 + 0.2 * p).fillCircle(f.x, f.y, 40 * p);
      // the pile: scraps of iron and rust
      for (let i = 0; i < 7; i++) {
        const a = i * 2.3,
          r = 4 + (i % 3) * 4;
        fx.fillStyle(i % 3 ? 0x7b7b86 : 0xc2410c).fillRect(f.x + Math.cos(a) * r - 3, f.y + Math.sin(a) * r * 0.6 - 2, 6, 3);
      }
    },
    body: (s, { f }) => void s.setAlpha(f.pileUntil !== undefined ? 0 : 1),
    death: (k, e, R) => {
      k.sfx('clank', 1.1);
      k.burst('bits', 10, e.x, e.y, -6, 0x7b7b86);
      puff(k, e, R, 0xc2410c, 3);
    },
  },
  // The Dune Mole (the Plateau): under the sand it is a mound moving across the floor, and where it
  // will come up the mound shakes and a ring closes in.
  mole: {
    look: { tex: 'mole', scale: 0.6, bits: [0x9c7448, 0xd9b47a, 0xf2a5bc] },
    shot: 'shot-sand',
    tell: ({ f, fx, t, now }) => {
      if (!f.under) return;
      const wob = t < f.windUntil ? Math.sin(now / 30) * 2 : 0;
      fx.fillStyle(0x7a5a32, 0.9).fillEllipse(f.x + wob, f.y, 26, 12);
      fx.fillStyle(0xd9b47a).fillEllipse(f.x + wob, f.y - 2, 18, 7);
      for (let i = 0; i < 3; i++) fx.fillStyle(0xf1dcae).fillRect(f.x - 10 + ((now / 40 + i * 7) % 20), f.y - 6 - (i % 2) * 2, 2, 2);
      if (t < f.windUntil) {
        const p = 1 - (f.windUntil - t) / 0.6;
        fx.lineStyle(2, 0xfbbf24, 0.9).strokeCircle(f.x, f.y, 48 - 26 * p);
      }
    },
    body: (s, { f }) => void s.setAlpha(f.under ? 0 : 1),
    death: (k, e, R) => {
      k.burst('puffs', 5, e.x, e.y, 4);
      puff(k, e, R, 0xd9b47a, 6);
    },
  },
  // The Dust Devil (the Plateau): grit whirls round it, and it blows apart into dust.
  devil: {
    look: { tex: 'devil', scale: 0.55, bits: [0xd9b47a, 0xb08850, 0x7a5a32] },
    shot: 'shot-sandball',
    hatch: 'shot-grit',
    tell: ({ f, fx, now }) => {
      for (let i = 0; i < 3; i++) {
        const a = now / 140 + i * 2.1;
        fx.fillStyle(0xd9b47a, 0.6).fillRect(f.x + Math.cos(a) * 18 - 1, f.y + 6 + Math.sin(a) * 6, 2, 2);
      }
    },
    death: (k, e, R) => {
      k.burst('puffs', 8, e.x, e.y, 0);
      puff(k, e, R, 0xd9b47a, 6);
    },
  },
  // The Maybe (the Fog): it flinches, see-through, and fades away like a thought let go.
  maybe: {
    look: { tex: 'maybe', scale: 0.55, bits: [0xd6d3ea, 0x9d9ab8, 0xffffff] },
    shot: 'shot-doubt',
    body: (s, { now, f }) => void s.setAlpha(0.75 + 0.2 * Math.sin(now / 200 + f.id)),
    death: (k, e) => {
      const [X, Y] = k.P(e.x, e.y);
      k.fade(600, (g, p) => g.fillStyle(0xd6d3ea, 0.5 * (1 - p)).fillCircle(X, Y - 26 * p, 12 * (1 - p) + 3), true);
    },
  },
  // The Undertow (the Fog): rings of water drawn in toward it show how far it pulls; it drains away.
  undertow: {
    look: { tex: 'undertow', scale: 0.7, bits: [0x1f6b78, 0x5fb3bd, 0x0f3a45] },
    shot: 'shot-bubble',
    tell: ({ f, fx, now }) => {
      for (let i = 0; i < 2; i++) {
        const p = (now / 1400 + i / 2) % 1;
        fx.lineStyle(2, 0x5fb3bd, 0.25 * p).strokeCircle(f.x, f.y, 260 - 190 * p);
      }
    },
    death: (k, e, R) => {
      const { x, y } = e;
      k.sfx('kill', 0.7);
      k.fade(700, (g, p) => g.fillStyle(0x0f3a45, 0.6 * (1 - p)).fillEllipse(x, y, R * 2.4 * (1 - p * 0.6), R * (1 - p * 0.6)));
      k.burst('bits', 6, x, y, -4, 0x5fb3bd);
    },
  },
  // The Ridge Hawk (the Summit): a line across the room where it will swoop, and feathers when it's
  // gone.
  hawk: {
    look: { tex: 'hawk', scale: 0.6, bits: [0x9a6a3e, 0xe7e5e4, 0x3b2414] },
    shot: 'shot-quill',
    tell: ({ f, fx, t }) => {
      if (t >= f.windUntil) return;
      const p = 1 - (f.windUntil - t) / 0.7,
        len = 300 * 1.6;
      fx.lineStyle(f.def.r * 2, 0xf59e0b, 0.08 + 0.22 * p).lineBetween(f.x, f.y, f.x + f.dashX * len, f.y + f.dashY * len);
    },
    body: (s, { f, t, now, look }) => void s.setTint(t < f.windUntil && Math.floor(now / 90) % 2 ? 0xffd27a : (look.tint ?? 0xffffff)),
    death: (k, e, R) => {
      k.burst('bits', 10, e.x, e.y, -10, 0x9a6a3e);
      puff(k, e, R, 0xe7e5e4, 5);
    },
  },
  // The Cairn (the Summit): it shudders before the icicles fall, and tumbles into stones.
  cairn: {
    look: { tex: 'cairn', scale: 0.62, bits: [0x7a8599, 0xdbeafe, 0x7dd3fc] },
    heavy: true,
    tell: ({ f, fx, t }) => {
      const p = soon(f, t);
      if (p >= 0) fx.fillStyle(0x7dd3fc, 0.12 + 0.2 * p).fillCircle(f.x, f.y, f.def.r * (1.2 + 0.5 * p));
    },
    death: (k, e, R) => {
      k.sfx('crack', 1.1);
      k.burst('bits', 12, e.x, e.y, 0, 0x7a8599);
      puff(k, e, R, 0xdbeafe, 6);
    },
  },
  // ----- the plain fun ones, three per story world -----
  frog: {
    look: { tex: 'frog', scale: 0.55, bits: [0x2f8f5b, 0x6fd39a, 0x7dd3fc] },
    shot: 'shot-drop',
    tell: chargeLine(0x38bdf8),
    death: (k, e, R) => puff(k, e, R, 0x6fd39a, 8),
  },
  eel: {
    look: { tex: 'eel', scale: 0.55, bits: [0x2b78ad, 0x7cc8ea, 0xd9f4ff] },
    shot: 'shot-tear',
    death: (k, e, R) => glass(k, e, R, 8, 220, 1.4),
  },
  lily: {
    look: { tex: 'lily', scale: 0.6, bits: [0xec4899, 0x22804a, 0xfbcfe8] },
    shot: 'shot-petal',
    death: (k, e, R) => puff(k, e, R, 0xf9a8d4, 10),
  },
  rat: {
    look: { tex: 'rat', scale: 0.45, bits: [0x3b3436, 0x6b6264, 0xf97316] },
    shot: 'shot-ember',
    killPitch: 1.6,
    death: (k, e, R) => puff(k, e, R, 0x6b6264, 5),
  },
  bat: {
    look: { tex: 'bat', scale: 0.5, bits: [0x3b3436, 0xf97316, 0xfbbf24] },
    shot: 'shot-ember',
    killPitch: 1.5,
    death: (k, e, R) => puff(k, e, R, 0xf97316, 6),
  },
  kiln: {
    look: { tex: 'kiln', scale: 0.65, bits: [0x8f3a22, 0xf97316, 0x6b6264] },
    shot: 'shot-cinder',
    heavy: true,
    tell: ({ f, fx, t }) => {
      const p = soon(f, t);
      if (p >= 0) fx.fillStyle(0xf97316, 0.12 + 0.25 * p).fillCircle(f.x, f.y, f.def.r * (1.2 + 0.6 * p));
    },
    death: (k, e, R) => {
      k.sfx('crack', 1.2);
      k.burst('bits', 12, e.x, e.y, 0, 0x8f3a22);
      puff(k, e, R, 0xf97316, 4);
    },
  },
  scarab: {
    look: { tex: 'scarab', scale: 0.6, bits: [0xc99a3a, 0xb08850, 0x3b2a10] },
    shot: 'shot-grit',
    tell: rollLine(0xd9b47a),
    death: (k, e, R) => puff(k, e, R, 0xc99a3a, 8),
  },
  cactus: {
    look: { tex: 'cactus', scale: 0.6, bits: [0x5fae5a, 0xf472b6, 0xf5f5dc] },
    shot: 'shot-needle',
    death: (k, e, R) => puff(k, e, R, 0x5fae5a, 10),
  },
  lizard: {
    look: { tex: 'lizard', scale: 0.6, bits: [0xf97316, 0xfde047, 0xc2410c] },
    shot: 'shot-sun',
    death: (k, e, R) => puff(k, e, R, 0xf97316, 7),
  },
  moth: {
    look: { tex: 'moth', scale: 0.55, bits: [0xb9b6cf, 0xfde68a, 0x7a7794] },
    shot: 'shot-dust',
    killPitch: 1.4,
    death: (k, e, R) => puff(k, e, R, 0xfde68a, 8),
  },
  hound: {
    look: { tex: 'hound', scale: 0.6, bits: [0x8f97a8, 0xcfd5e0, 0x2f3442] },
    shot: 'shot-void',
    tell: blinkMark(0xcfd5e0, 0x5b6273),
    body: (s, { f, t }) => void s.setAlpha(t < f.windUntil ? 0.25 : 1),
    death: (k, e, R) => {
      k.burst('puffs', 6, e.x, e.y, -6);
      puff(k, e, R, 0xcfd5e0, 4);
    },
  },
  shroom: {
    look: { tex: 'shroom', scale: 0.6, bits: [0x6a5a9a, 0xe7dcc8, 0xa294d0] },
    shot: 'shot-spore',
    death: (k, e, R) => puff(k, e, R, 0xa294d0, 10),
  },
  yeti: {
    look: { tex: 'yeti', scale: 0.62, bits: [0xf1f5f9, 0x60a5fa, 0xcbd5e1] },
    shot: 'shot-snow',
    heavy: true,
    death: (k, e, R) => puff(k, e, R, 0xf1f5f9, 12),
  },
  frost: {
    look: { tex: 'frost', scale: 0.5, bits: [0x7dd3fc, 0xe0f2fe, 0xffffff] },
    shot: 'shot-icicle',
    killPitch: 1.5,
    death: (k, e, R) => glass(k, e, R, 10, 240, 1.5),
  },
  boulder: {
    look: { tex: 'boulder', scale: 0.65, bits: [0x7a8599, 0xdbeafe, 0x4c5566] },
    shot: 'shot-stone',
    tell: rollLine(0x93c5fd),
    death: (k, e, R) => {
      k.sfx('crack', 0.9);
      k.burst('bits', 14, e.x, e.y, 0, 0x7a8599);
      puff(k, e, R, 0xdbeafe, 4);
    },
  },
  // The Silent Bell: a ring marks where its toll comes back from.
  bell: { look: { tex: 'bellMid', scale: 1.3, bits: [0xb07c32, 0x5f9a86, 0xfbe3a0] }, shot: 'shot-toll', heavy: true },
  // The Tollkeeper: stones (its plank's splinters) and a stamp.
  toll: { look: { tex: 'tollMid', scale: 1.3, bits: [0x5f4630, 0x9ca3af, 0xfde047] }, shot: 'shot-plank', heavy: true },
};

/** The Mirror breaking (the boss): like its images, bigger. */
export const mirrorBreaks = (k: FoeKit, e: KillEvent, R: number) => glass(k, e, R, 30, 500, 0.7);
