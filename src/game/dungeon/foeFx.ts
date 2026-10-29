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
export const STYLE_SHOT = { plain: 'bullet', homing: 'bullet-homing', bounce: 'bullet-bounce', ramp: 'bullet-ramp', wiggle: 'bullet-page' } as const;

/** A zone boss's own shots, by its patterns' order in BOSSES (content.ts); a pattern without one
    looks like its style. */
export const BOSS_SHOTS: Partial<Record<FogBoss, string[]>> = {
  tomorrow: ['shot-z', 'shot-alarm'],
};

/** The picture for a shot fired by `from` (a boss's when `boss`), in `style`. A boss's shot
    (`from` 'boss') is its BOSS_SHOTS entry for pattern `n`. */
export function shotOf(from: Foe['kind'] | undefined, boss: boolean, style: keyof typeof STYLE_SHOT, which?: FogBoss, n?: number): string {
  const own = from === 'boss' ? (which && n !== undefined ? BOSS_SHOTS[which]?.[n] : undefined) : from ? FOE_FX[from].shot : undefined;
  return own ?? (boss && style === 'plain' ? 'bullet-boss' : STYLE_SHOT[style]);
}

// ---------- the bombs ----------

/** A lobbed bomb on its way (p 0 to 1 of the flight), then on the ground filling up until it
    bursts (p 0 to 1 of the fuse). */
export function drawMine(fx: G, mk: G, P: FoeCtx['P'], m: Mine, flying: boolean, p: number, now: number) {
  const golem = m.from === 'golem';
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
};

/** Which stage of its art a boss is in: the Knight by plates left, the Plateau by its cracks. */
export function bossStage(which: FogBoss, f: Foe): number {
  if (which === 'knight') return f.hp > f.maxHp * (2 / 3) ? 0 : f.hp > f.maxHp / 3 ? 1 : 2;
  if (which === 'plateau') return f.phase <= 3 ? 0 : f.phase <= 6 ? 1 : 2;
  return 0;
}

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
};

/** The Mirror breaking (the boss): like its images, bigger. */
export const mirrorBreaks = (k: FoeKit, e: KillEvent, R: number) => glass(k, e, R, 30, 500, 0.7);
