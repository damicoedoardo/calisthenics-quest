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

/** The picture for a shot fired by `from` (a boss's when `boss`), in `style`. */
export function shotOf(from: Foe['kind'] | undefined, boss: boolean, style: keyof typeof STYLE_SHOT): string {
  const own = from && from !== 'boss' ? FOE_FX[from].shot : undefined;
  return own ?? (boss && style === 'plain' ? 'bullet-boss' : STYLE_SHOT[style]);
}

// ---------- the bombs ----------

/** A lobbed bomb on its way (p 0 to 1 of the flight), then on the ground filling up until it
    bursts (p 0 to 1 of the fuse). */
export function drawMine(fx: G, mk: G, P: FoeCtx['P'], m: Mine, flying: boolean, p: number) {
  if (flying) {
    fx.fillStyle(0x000000, 0.25).fillCircle(m.x, m.y, 4 + 6 * p);
    const [X, Y] = P(m.x, m.y);
    mk.fillStyle(0xc4b5fd).fillCircle(X, Y - 40 * Math.sin(Math.PI * p), 5);
  } else {
    fx.lineStyle(2, 0xc084fc, 0.9).strokeCircle(m.x, m.y, m.r);
    fx.fillStyle(0xa855f7, 0.1 + 0.3 * p).fillCircle(m.x, m.y, m.r * p);
    fx.fillStyle(0xe9d5ff).fillCircle(m.x, m.y, 4);
  }
}

// ---------- the monsters ----------

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
  slime: { look: { tex: 'slime', scale: 0.55, bits: [0x94a3b8, 0x5b74c4, 0xe2e8f0] } },
  wisp: { look: { tex: 'wisp', scale: 0.5, bits: [0xf97316, 0xfde68a, 0x6b7280] }, killPitch: 1.3 },
  mirror: { look: { tex: 'mirror', scale: 0.65, bits: [0xe2e8f0, 0xcbd5e1, 0xffffff] } },
  golem: { look: { tex: 'golem', scale: 0.95, bits: [0xa8a29e, 0x78716c, 0x84cc16] }, heavy: true },
  // A golden copy of you, sent by the Mirror. Hitting it hurts you.
  reflection: {
    look: { tex: 'echo', scale: 0.75, bits: [0xfde68a, 0xfbbf24, 0xffffff], tint: 0xfde68a },
    death: (k, e, R) => glass(k, e, R, 12, 240, 1.2),
  },
  // Glows red before it charges, along the line it will take.
  ram: {
    look: { tex: 'ram', scale: 0.62, bits: [0xe89a48, 0xb8651e, 0xe8dcc0] },
    tell: ({ f, fx, t }) => {
      if (t >= f.windUntil) return;
      const p = 1 - (f.windUntil - t) / 0.75,
        len = 330 * 0.6;
      fx.lineStyle(f.def.r * 2, 0xef4444, 0.1 + 0.25 * p).lineBetween(f.x, f.y, f.x + f.dashX * len, f.y + f.dashY * len);
    },
    body: (s, { f, t, now, look }) => void s.setTint(t < f.windUntil && Math.floor(now / 90) % 2 ? 0xff4d4d : (look.tint ?? 0xffffff)),
  },
  book: { look: { tex: 'book', scale: 0.62, bits: [0xfef3c7, 0xd6d3d1, 0x92400e] } },
  smoke: { look: { tex: 'smoke', scale: 0.55, bits: [0xa78bfa, 0x6b21a8, 0xe9d5ff] } },
  seeker: { look: { tex: 'seeker', scale: 0.55, bits: [0x67e8f9, 0x0e7490, 0xffffff] } },
  // Falls apart into its three Splitlings.
  splitter: {
    look: { tex: 'splitter', scale: 0.78, bits: [0x86efac, 0x15803d, 0xdcfce7] },
    death: (k, e, _R, look) => k.once('splitterPop', e.x, e.y, look.scale),
  },
  splitling: { look: { tex: 'splitling', scale: 0.5, bits: [0x86efac, 0x15803d] } },
  // Fades out, and marks where it will land.
  shade: {
    look: { tex: 'shade', scale: 0.65, bits: [0xa78bfa, 0x6b21a8, 0x1e1b4b] },
    tell: ({ f, fx, t }) => {
      if (t >= f.windUntil) return;
      const p = 1 - (f.windUntil - t) / 0.8;
      fx.lineStyle(2, 0xa78bfa, 0.9).strokeCircle(f.dashX, f.dashY, 26 - 10 * p);
      fx.fillStyle(0x6b21a8, 0.2 + 0.3 * p).fillCircle(f.dashX, f.dashY, 16);
    },
    body: (s, { f, t }) => void s.setAlpha(t < f.windUntil ? 0.25 : 1),
  },
  // The Warden of the Ashes: the golem, much bigger, the grey of cold ash, embers glowing under it.
  warden: { look: { tex: 'warden', scale: 1.3, bits: [0x78716c, 0xf97316, 0xfde68a] }, heavy: true },
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
