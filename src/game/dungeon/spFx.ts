import type * as Phaser from 'phaser';
import type { SfxId } from '@/lib/music';
import { SP_MOVES, type SpMoveId, type SpShape, type SpWeapon } from './content';
import type { GameEvent, Shot, SpField } from './engine';

/* How the SPs look in a run: each move's effect, each patch it leaves on the floor, and each SP
   weapon's basic attack and shots. Only drawing lives here; the scene (scene.ts) hands in a small
   kit (FxKit) to draw with, and the engine says what happened (its events).

   To change how one move looks, edit its entry in SP_FX. A move with no entry is drawn by its
   shape (SHAPE_FX). A patch on the floor that lasts: FIELD_FX (or FIELD_SHAPE_FX). A weapon's
   swing or shot: WEAPON_FX. Colors come from the SP worn (`c`: its aura, dark, middle, light).

   Two kinds of drawing: on the floor in engine points (`k.fade(ms, draw)`), or standing up in
   screen points (`k.fade(ms, draw, true)`, through `k.P`). The engine's angle `a` is `a + PI/2`
   on screen. Hard rule: nothing here covers the play field. Big finals stay big but local. Types
   only from Phaser: the scene is loaded with import(), and so is this. */

type G = Phaser.GameObjects.Graphics;
type Draw = (g: G, p: number) => void;
type Pt = { x: number; y: number };
export type SpEvent = Extract<GameEvent, { type: 'sp' }>;
export type AttackEvent = Extract<GameEvent, { type: 'attack' }>;
/** The SP's colors: dark, middle, light. */
export type Aura = readonly [number, number, number];

/** What the scene lends the effects to draw with. */
export interface FxKit {
  /** Draw for `ms` (p goes 0 to 1): on the floor in engine points, or standing up in screen points when `up`. */
  fade(ms: number, draw: Draw, up?: boolean): void;
  /** An engine point on the screen. */
  P(x: number, y: number): [number, number];
  /** Particles from an engine point: bits (in `tint`), sparks (gold) or puffs (smoke); `dy` screen px down. */
  burst(kind: 'bits' | 'sparks' | 'puffs', n: number, x: number, y: number, dy?: number, tint?: number): void;
  /** Run `f` after `ms`. */
  later(ms: number, f: () => void): void;
  /** A camera shake (none with reduced motion). */
  shake(ms: number, k: number): void;
  sfx(id: SfxId, pitch?: number): void;
  /** Afterimages of the hero from one point to another. */
  ghosts(x: number, y: number, toX: number, toY: number, color: number, n?: number): void;
  /** Up to `n` spots round (x, y): the monsters in reach first, then spots near. */
  spots(x: number, y: number, r: number, n: number): [number, number][];
  /** Where the hero is now, and the way it faces. */
  hero(): { x: number; y: number; facing: number };
  /** Keeps track of the monster nearest (x, y): where it is now (or where it was last). */
  follow(x: number, y: number): () => Pt;
  /** The hero drawn faint for `ms` (unseen). */
  hide(ms: number): void;
  /** The room's size in engine points. */
  room(): { w: number; h: number };
}

// ---------- small drawing helpers ----------

const TAU = Math.PI * 2;
const WHITE = 0xffffff;
/** Where a move lands: `to` if the engine gave one, else its x, y. */
const at = (e: SpEvent): Pt => e.to ?? { x: e.x, y: e.y };
/** The far end of a line move (beam, wall, dash): `to`, or `r` along its angle. */
const end = (e: SpEvent, len = e.r): Pt => e.to ?? { x: e.x + Math.cos(e.angle ?? 0) * len, y: e.y + Math.sin(e.angle ?? 0) * len };
/** How long a lasting move stays (ms). */
const ms = (e: SpEvent, base: number) => (e.secs ? e.secs * 1000 : base);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
/** A part of p: 0 before `from`, 1 after `to`. */
const span = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));

/** A five-pointed star. */
export function star(g: G, cx: number, cy: number, R: number, color: number, alpha: number) {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5,
      d = i % 2 ? R * 0.45 : R;
    pts.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d });
  }
  g.fillStyle(color, alpha).fillPoints(pts, true);
}

/** An arc of a circle round (x, y), `half` each side of `a`. */
function arc(g: G, x: number, y: number, R: number, a: number, half: number, w: number, color: number, alpha: number) {
  g.lineStyle(w, color, alpha).beginPath();
  g.arc(x, y, R, a - half, a + half);
  g.strokePath();
}

/** A flame standing up at screen point (X, Y), `h` tall, in three tones. */
function flame(g: G, X: number, Y: number, h: number, c: Aura, alpha: number) {
  g.fillStyle(c[0], alpha).fillTriangle(X - h * 0.36, Y, X + h * 0.36, Y, X, Y - h);
  g.fillStyle(c[1], alpha).fillTriangle(X - h * 0.25, Y, X + h * 0.25, Y, X, Y - h * 0.72);
  g.fillStyle(c[2], alpha).fillTriangle(X - h * 0.12, Y, X + h * 0.12, Y, X, Y - h * 0.4);
}

/** `n` cuts side by side across screen point (X, Y), at screen angle `a`. */
function scratches(g: G, X: number, Y: number, a: number, len: number, n: number, gap: number, color: number, alpha: number, w = 3) {
  const cx = Math.cos(a),
    sy = Math.sin(a);
  for (let i = 0; i < n; i++) {
    const o = (i - (n - 1) / 2) * gap,
      ox = -sy * o,
      oy = cx * o;
    g.lineStyle(w, color, alpha).lineBetween(X + ox - (cx * len) / 2, Y + oy - (sy * len) / 2, X + ox + (cx * len) / 2, Y + oy + (sy * len) / 2);
    g.lineStyle(1, WHITE, alpha).lineBetween(X + ox - (cx * len) / 3, Y + oy - (sy * len) / 3, X + ox + (cx * len) / 3, Y + oy + (sy * len) / 3);
  }
}

/** A wolf of light running, standing up at screen point (X, Y), facing right when `f` is 1. */
function wolf(g: G, X: number, Y: number, s: number, f: number, c: Aura, alpha: number) {
  g.fillStyle(c[1], alpha).fillEllipse(X, Y, 26 * s, 11 * s);
  g.fillTriangle(X + f * 9 * s, Y - 6 * s, X + f * 22 * s, Y - 3 * s, X + f * 11 * s, Y + 4 * s);
  g.fillTriangle(X + f * 10 * s, Y - 5 * s, X + f * 13 * s, Y - 13 * s, X + f * 16 * s, Y - 5 * s);
  g.fillTriangle(X - f * 11 * s, Y - 2 * s, X - f * 25 * s, Y - 10 * s, X - f * 12 * s, Y + 3 * s);
  g.lineStyle(3 * s, c[1], alpha)
    .lineBetween(X + f * 7 * s, Y + 3 * s, X + f * 14 * s, Y + 10 * s)
    .lineBetween(X - f * 7 * s, Y + 3 * s, X - f * 14 * s, Y + 10 * s);
  g.fillStyle(c[2], alpha).fillEllipse(X, Y - 2 * s, 16 * s, 4 * s);
  g.fillStyle(WHITE, alpha).fillCircle(X + f * 15 * s, Y - 4 * s, 1.5 * s);
}

/** A blast on the floor: a ring rolling out, a glow inside it, and bits and sparks. */
function blast(k: FxKit, x: number, y: number, r: number, c: Aura, big: boolean, time = 520) {
  k.fade(time, (g, p) => {
    const R = r * (0.25 + 0.75 * p),
      q = 1 - p;
    g.fillStyle(c[1], 0.22 * q).fillCircle(x, y, R);
    g.lineStyle((big ? 12 : 7) * q + 1, c[1], 0.9 * q).strokeCircle(x, y, R);
    g.lineStyle(3, c[2], 0.9 * q).strokeCircle(x, y, R * 0.75);
  });
  k.burst('bits', big ? 36 : 16, x, y, 0, c[1]);
  k.burst('sparks', big ? 20 : 8, x, y, -6);
}

/** Cracks running out from a point on the floor. */
function cracks(k: FxKit, x: number, y: number, r: number, color: number, n = 8) {
  k.fade(500, (g, p) => {
    const out = r * 0.75 * Math.min(1, p * 3);
    g.lineStyle(3, color, 0.8 * (1 - p));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + 0.3;
      g.lineBetween(x + Math.cos(a) * 12, y + Math.sin(a) * 12, x + Math.cos(a) * out, y + Math.sin(a) * out);
    }
  });
}

/** A jump from one point to another: a curve of bits through the air (standing up). */
function jumpArc(k: FxKit, from: Pt, to: Pt, color: number, light: number, time = 280) {
  k.fade(time, (g, p) => {
    const [AX, AY] = k.P(from.x, from.y),
      [BX, BY] = k.P(to.x, to.y),
      reach = Math.min(1, p * 1.6);
    for (let i = 0; i < 10; i++) {
      const t = (i / 10) * reach;
      g.fillStyle(i % 2 ? color : light, 0.85 * (1 - p)).fillCircle(lerp(AX, BX, t), lerp(AY, BY, t) - Math.sin(t * Math.PI) * 60, 2 + i * 0.5);
    }
  }, true);
}

/** A beam from (x, y) to `b`, `w` wide: an outer glow, a body and a white core. */
function beam(g: G, a: Pt, b: Pt, w: number, c: Aura, alpha: number) {
  g.lineStyle(w * 1.6, c[0], 0.35 * alpha).lineBetween(a.x, a.y, b.x, b.y);
  g.lineStyle(w, c[1], 0.8 * alpha).lineBetween(a.x, a.y, b.x, b.y);
  g.lineStyle(Math.max(2, w * 0.3), WHITE, 0.9 * alpha).lineBetween(a.x, a.y, b.x, b.y);
}

/** Something falling from high up onto (x, y), standing up: `paint` draws it at screen (X, Y), `q` 0 high to 1 down. */
function fall(k: FxKit, x: number, y: number, time: number, height: number, paint: (g: G, X: number, Y: number, q: number) => void, slant = 0) {
  k.fade(time, (g, p) => {
    const [X, Y] = k.P(x, y),
      q = p * p;
    paint(g, X + slant * (1 - q), Y - height * (1 - q), p);
  }, true);
}

/** The points of a chain move, from the hero. */
const chainOf = (e: SpEvent): Pt[] => (e.points && e.points.length > 1 ? e.points : [{ x: e.x, y: e.y }, end(e, 120)]);

/** A ring of water: a wobbling circle, foam inside. */
function waterRing(g: G, x: number, y: number, R: number, t: number, c: Aura, alpha: number) {
  const pts: Pt[] = [];
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * TAU,
      w = R + Math.sin(a * 6 + t * 10) * 4;
    pts.push({ x: x + Math.cos(a) * w, y: y + Math.sin(a) * w });
  }
  g.lineStyle(6, c[1], 0.8 * alpha).strokePoints(pts, true);
  g.lineStyle(2, c[2], 0.9 * alpha).strokeCircle(x, y, R * 0.82);
}

/** A shield standing up at screen (X, Y): gold plate, dark rim, a light cross. */
function shield(g: G, X: number, Y: number, s: number, c: Aura, alpha: number) {
  g.fillStyle(c[0], alpha).fillRoundedRect(X - 12 * s, Y - 16 * s, 24 * s, 22 * s, 4 * s);
  g.fillTriangle(X - 12 * s, Y + 5 * s, X + 12 * s, Y + 5 * s, X, Y + 18 * s);
  g.fillStyle(c[1], alpha).fillRoundedRect(X - 9 * s, Y - 13 * s, 18 * s, 18 * s, 3 * s);
  g.fillTriangle(X - 9 * s, Y + 4 * s, X + 9 * s, Y + 4 * s, X, Y + 14 * s);
  g.fillStyle(c[2], alpha).fillRect(X - 1.5 * s, Y - 11 * s, 3 * s, 22 * s).fillRect(X - 7 * s, Y - 5 * s, 14 * s, 3 * s);
}

/** A sigil on the floor at (x, y): a ring, a star inside, turning. */
function sigil(g: G, x: number, y: number, R: number, turn: number, c: Aura, alpha: number) {
  g.lineStyle(2, c[1], alpha).strokeCircle(x, y, R);
  g.lineStyle(1, c[2], alpha).strokeCircle(x, y, R * 0.78);
  const pts: Pt[] = [];
  for (let i = 0; i < 5; i++) {
    const a = turn + (i * 2 * TAU) / 5;
    pts.push({ x: x + Math.cos(a) * R * 0.75, y: y + Math.sin(a) * R * 0.75 });
  }
  g.lineStyle(2, c[1], alpha).strokePoints(pts, true);
  for (let i = 0; i < 6; i++) {
    const a = -turn + (i / 6) * TAU;
    g.fillStyle(c[2], alpha).fillCircle(x + Math.cos(a) * R * 1.15, y + Math.sin(a) * R * 1.15, 2);
  }
}

// ---------- each move's look ----------

type MoveFx = (k: FxKit, e: SpEvent, c: Aura) => void;

/** Each move's own look on screen, by move id (the words in SP_MOVES, content.ts). */
export const SP_FX: Partial<Record<SpMoveId, MoveFx>> = {
  // --- warrior ---
  // a jump onto the monster and a crash of fire where you land
  leap: (k, e, c) => {
    const to = at(e),
      from = e.to ? { x: e.x, y: e.y } : k.hero();
    jumpArc(k, from, to, c[1], c[2]);
    k.later(220, () => {
      blast(k, to.x, to.y, e.r, c, true);
      cracks(k, to.x, to.y, e.r, c[0]);
      k.fade(520, (g, p) => {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU,
            [X, Y] = k.P(to.x + Math.cos(a) * e.r * 0.6, to.y + Math.sin(a) * e.r * 0.6);
          flame(g, X, Y, 26 * Math.sin(p * Math.PI) + 4, c, 0.9 * (1 - p));
        }
      }, true);
      k.shake(140, 0.008);
    });
  },
  // the axe spins once, and a ring of fire opens round you (FIELD_FX keeps it burning)
  inferno: (k, e, c) => {
    k.fade(420, (g, p) => {
      for (let i = 0; i < 3; i++) arc(g, e.x, e.y, e.r * (0.4 + 0.6 * p), p * TAU * 1.5 + (i * TAU) / 3, 0.9, 9 * (1 - p) + 2, i === 1 ? c[2] : c[1], 0.95 * (1 - p));
    });
    blast(k, e.x, e.y, e.r, c, true, 600);
  },
  // a tower shield of gold raised in front of you while it lasts
  shieldwall: (k, e, c) => {
    k.fade(ms(e, 1500), (g, p) => {
      const h = k.hero(),
        [X, Y] = k.P(h.x + Math.cos(h.facing) * 26, h.y + Math.sin(h.facing) * 26),
        rise = Math.min(1, p * 8),
        a = p > 0.85 ? (1 - p) / 0.15 : 1;
      shield(g, X, Y - 8, 0.8 + 0.4 * rise, c, a);
      g.lineStyle(2, c[2], 0.5 * a).strokeCircle(X, Y - 8, 22 + 2 * Math.sin(p * 40));
    }, true);
    k.fade(360, (g, p) => g.lineStyle(6 * (1 - p) + 1, c[1], 0.9 * (1 - p)).strokeCircle(e.x, e.y, e.r * (0.3 + 0.7 * p)));
    k.burst('sparks', 12, e.x, e.y, -6);
  },
  // a hammer of light falls from the sky on the strongest monster
  judgment: (k, e, c) => {
    const to = at(e);
    k.fade(380, (g, p) => {
      const [X, Y] = k.P(to.x, to.y);
      g.fillStyle(c[2], 0.4 * (1 - p)).fillRect(X - 14, Y - 180, 28, 180);
    }, true);
    fall(k, to.x, to.y, 380, 170, (g, X, Y, p) => {
      g.fillStyle(c[2], 0.9).fillRect(X - 3, Y - 52, 6, 40);
      g.fillStyle(c[0], 1).fillRoundedRect(X - 22, Y - 22, 44, 22, 4);
      g.fillStyle(c[1], 1).fillRoundedRect(X - 19, Y - 19, 38, 16, 3);
      g.fillStyle(WHITE, 0.9 * (1 - p * 0.5)).fillRect(X - 16, Y - 17, 10, 4);
    });
    k.later(380, () => {
      blast(k, to.x, to.y, e.r, c, true, 700);
      cracks(k, to.x, to.y, e.r, c[0], 12);
      k.fade(600, (g, p) => {
        const [X, Y] = k.P(to.x, to.y);
        g.lineStyle(3, c[2], 0.8 * (1 - p));
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU,
            r0 = 20 + e.r * p;
          g.lineBetween(X + Math.cos(a) * r0, Y + Math.sin(a) * r0 * 0.5, X + Math.cos(a) * (r0 + 30), Y + Math.sin(a) * (r0 + 30) * 0.5);
        }
      }, true);
      k.shake(220, 0.012);
    });
  },
  // the lance flies out, then a rope drags the monster back to you
  harpoon: (k, e, c) => {
    const to = e.to ?? end(e, 220);
    k.fade(520, (g, p) => {
      const h = k.hero(),
        out = span(p, 0, 0.35),
        back = span(p, 0.4, 1),
        t = out * (1 - back),
        tip = { x: lerp(h.x, to.x, t), y: lerp(h.y, to.y, t) },
        a = Math.atan2(to.y - h.y, to.x - h.x);
      g.lineStyle(2, c[2], 0.9).lineBetween(h.x, h.y, tip.x, tip.y);
      g.lineStyle(7, c[1], 0.5).lineBetween(tip.x - Math.cos(a) * 30, tip.y - Math.sin(a) * 30, tip.x, tip.y);
      g.lineStyle(3, c[2], 1).lineBetween(tip.x - Math.cos(a) * 30, tip.y - Math.sin(a) * 30, tip.x, tip.y);
      g.fillStyle(c[2], 1).fillTriangle(tip.x + Math.cos(a) * 10, tip.y + Math.sin(a) * 10, tip.x - Math.sin(a) * 5, tip.y + Math.cos(a) * 5, tip.x + Math.sin(a) * 5, tip.y - Math.cos(a) * 5);
    });
    k.later(180, () => {
      k.burst('bits', 12, to.x, to.y, 0, c[1]);
      k.fade(260, (g, p) => g.lineStyle(4 * (1 - p) + 1, c[2], 0.9 * (1 - p)).strokeCircle(to.x, to.y, 12 + 24 * p));
    });
  },
  // you ride a wave across the room: curling crests and foam behind you
  tidalcharge: (k, e, c) => {
    const to = end(e),
      w = e.width ?? 40,
      a = Math.atan2(to.y - e.y, to.x - e.x),
      nx = -Math.sin(a),
      ny = Math.cos(a);
    k.ghosts(e.x, e.y, to.x, to.y, c[1], 5);
    k.fade(700, (g, p) => {
      const reach = Math.min(1, p * 2.2);
      for (let i = 0; i < 10; i++) {
        const t = (i / 10) * reach,
          x = lerp(e.x, to.x, t),
          y = lerp(e.y, to.y, t),
          q = 1 - p;
        arc(g, x - Math.cos(a) * 10, y - Math.sin(a) * 10, w * 0.6, a, 1.2, 6 * q + 1, c[1], 0.8 * q);
        g.fillStyle(c[2], 0.8 * q).fillCircle(x + nx * w * 0.5, y + ny * w * 0.5, 3).fillCircle(x - nx * w * 0.5, y - ny * w * 0.5, 3);
      }
      g.lineStyle(w, c[0], 0.25 * (1 - p)).lineBetween(e.x, e.y, lerp(e.x, to.x, reach), lerp(e.y, to.y, reach));
    });
    k.burst('puffs', 8, e.x, e.y, 10);
  },
  // the scythe leaves your hands spinning (its flight is the shot: WEAPON_FX.scythe)
  reap: (k, e, c) => {
    const a = e.angle ?? k.hero().facing;
    k.fade(260, (g, p) => {
      arc(g, e.x, e.y, 34 + 20 * p, a, 1.4, 6 * (1 - p) + 1, c[1], 0.9 * (1 - p));
      arc(g, e.x, e.y, 26 + 20 * p, a, 1.1, 2, c[2], 0.9 * (1 - p));
    });
  },
  // a cut on every monster, then their wisps fly to you
  soulharvest: (k, e, c) => {
    const spots = k.spots(e.x, e.y, Infinity, 12);
    k.fade(1100, (g, p) => {
      const h = k.hero(),
        [HX, HY] = k.P(h.x, h.y);
      spots.forEach(([sx, sy], i) => {
        const [X, Y] = k.P(sx, sy),
          cut = span(p, (i / spots.length) * 0.25, (i / spots.length) * 0.25 + 0.2),
          fly = span(p, 0.45 + (i % 4) * 0.05, 0.85 + (i % 4) * 0.05);
        if (cut > 0 && cut < 1) {
          g.lineStyle(4 * (1 - cut) + 1, c[1], 1 - cut).lineBetween(X - 16, Y - 22, X + 16, Y + 6);
          g.lineStyle(1, WHITE, 1 - cut).lineBetween(X - 12, Y - 19, X + 12, Y + 3);
        }
        if (fly > 0 && fly < 1) {
          const wx = lerp(X, HX, fly),
            wy = lerp(Y - 10, HY - 10, fly) - Math.sin(fly * Math.PI) * 40;
          g.fillStyle(c[1], 0.5).fillCircle(wx, wy, 7);
          g.fillStyle(c[2], 0.95).fillCircle(wx, wy, 3.5);
        }
      });
    }, true);
  },

  // --- archer ---
  // one long blue line through the whole row
  piercing: (k, e, c) => {
    const to = end(e),
      w = e.width ?? 16;
    k.fade(480, (g, p) => {
      const reach = Math.min(1, p * 5),
        b = { x: lerp(e.x, to.x, reach), y: lerp(e.y, to.y, reach) },
        q = 1 - span(p, 0.35, 1);
      beam(g, e, b, w * q + 2, c, q);
    });
    k.fade(300, (g, p) => g.lineStyle(3 * (1 - p) + 1, c[2], 0.9 * (1 - p)).strokeCircle(e.x, e.y, 10 + 30 * p));
    k.burst('bits', 10, to.x, to.y, 0, c[1]);
  },
  // arrows loosed high into the air (FIELD_FX rains them down)
  arrowrain: (k, e, c) => {
    const h = k.hero();
    k.fade(360, (g, p) => {
      const [X, Y] = k.P(h.x, h.y);
      for (let i = -2; i <= 2; i++) g.lineStyle(2, c[2], 0.9 * (1 - p)).lineBetween(X + i * 6, Y - 20 - 200 * p, X + i * 6 + 2, Y - 46 - 200 * p);
    }, true);
    k.fade(500, (g, p) => g.lineStyle(3 * (1 - p) + 1, c[1], 0.8 * (1 - p)).strokeCircle(e.x, e.y, e.r * (0.5 + 0.5 * p)));
  },
  // a lit bomb flies in an arc, bursts, and leaves the floor burning (FIELD_FX)
  bomb: (k, e, c) => {
    const to = at(e),
      from = k.hero();
    k.fade(420, (g, p) => {
      const [AX, AY] = k.P(from.x, from.y),
        [BX, BY] = k.P(to.x, to.y),
        X = lerp(AX, BX, p),
        Y = lerp(AY, BY, p) - 20 - Math.sin(p * Math.PI) * 80;
      g.fillStyle(0x1f2937, 1).fillCircle(X, Y, 7);
      g.fillStyle(0x6b7280, 1).fillCircle(X - 2, Y - 2, 2);
      g.lineStyle(2, 0xa8a29e, 1).lineBetween(X + 4, Y - 5, X + 7, Y - 10);
      g.fillStyle(c[2], 1).fillCircle(X + 7 + Math.sin(p * 60), Y - 11, 2.5);
    }, true);
    k.later(420, () => {
      blast(k, to.x, to.y, e.r, c, false);
      k.burst('puffs', 10, to.x, to.y, 8);
      k.shake(120, 0.006);
    });
  },
  // cannon shells drop on each monster and burst
  barrage: (k, e, c) => {
    const spots = k.spots(e.x, e.y, Infinity, 12);
    spots.forEach(([sx, sy], i) => {
      const wait = (i * 70) % 600;
      k.later(wait, () => {
        fall(k, sx, sy, 300, 220, (g, X, Y) => {
          g.lineStyle(5, 0x9ca3af, 0.35).lineBetween(X + 30, Y - 50, X, Y);
          g.fillStyle(0x1f2937, 1).fillCircle(X, Y, 6);
          g.fillStyle(c[2], 1).fillCircle(X - 2, Y - 2, 2);
        }, 60);
        k.later(300, () => {
          blast(k, sx, sy, 40, c, false, 380);
          k.burst('puffs', 4, sx, sy, 8);
        });
      });
    });
    k.later(300, () => k.shake(400, 0.008));
  },
  // a wolf of light leaps from you onto the strongest monster
  call: (k, e, c) => {
    const to = at(e),
      from = k.hero();
    k.fade(460, (g, p) => {
      const [AX, AY] = k.P(from.x, from.y),
        [BX, BY] = k.P(to.x, to.y),
        q = span(p, 0, 0.7),
        X = lerp(AX, BX, q),
        Y = lerp(AY, BY, q) - Math.sin(q * Math.PI) * 50;
      wolf(g, X, Y - 6, 1.1, BX >= AX ? 1 : -1, c, p < 0.7 ? 1 : (1 - p) / 0.3);
    }, true);
    k.later(320, () => {
      blast(k, to.x, to.y, e.r, c, false);
      k.fade(260, (g, p) => {
        const [X, Y] = k.P(to.x, to.y);
        scratches(g, X, Y - 8, -0.8, 28, 3, 7, c[1], 1 - p);
      }, true);
    });
  },
  // spirit wolves run the chain, biting each monster in turn
  pack: (k, e, c) => {
    const pts = chainOf(e),
      legs = pts.length - 1;
    k.fade(900, (g, p) => {
      for (let w = 0; w < 3; w++) {
        const t = clamp01(p * 1.25 - w * 0.1) * legs,
          i = Math.min(legs - 1, Math.floor(t)),
          f = t - i,
          a = pts[i],
          b = pts[i + 1],
          [AX, AY] = k.P(a.x, a.y),
          [BX, BY] = k.P(b.x, b.y);
        if (p * 1.25 - w * 0.1 <= 0 || p * 1.25 - w * 0.1 >= 1) continue;
        wolf(g, lerp(AX, BX, f) + w * 6, lerp(AY, BY, f) - 8 - Math.abs(Math.sin(f * Math.PI)) * 16 + w * 5, 0.85, BX >= AX ? 1 : -1, c, 0.95 - w * 0.2);
      }
    }, true);
    pts.slice(1).forEach((q, i) => k.later((i / legs) * 720, () => {
      k.burst('bits', 6, q.x, q.y, 0, c[1]);
      k.fade(220, (g, p) => {
        const [X, Y] = k.P(q.x, q.y);
        scratches(g, X, Y - 8, -0.7, 22, 3, 6, c[2], 1 - p, 2);
      }, true);
    }));
  },
  // a puff of smoke, and you are faint while it lasts
  vanish: (k, e, c) => {
    k.hide(ms(e, 2000));
    k.burst('puffs', 18, e.x, e.y, 6);
    k.fade(500, (g, p) => {
      g.fillStyle(c[0], 0.4 * (1 - p)).fillCircle(e.x, e.y, 20 + 30 * p);
      g.lineStyle(2, c[1], 0.8 * (1 - p)).strokeCircle(e.x, e.y, 14 + 40 * p);
    });
  },
  // you flash from monster to monster: a cut at each, lines of you between
  thousandcuts: (k, e, c) => {
    const pts = chainOf(e);
    for (let i = 1; i < pts.length; i++) k.ghosts(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, c[1], 1);
    k.fade(260, (g, p) => {
      g.lineStyle(2, c[2], 0.8 * (1 - p));
      for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    });
    k.fade(900, (g, p) => {
      pts.slice(1).forEach((q, i) => {
        const t = span(p, (i / pts.length) * 0.6, (i / pts.length) * 0.6 + 0.25);
        if (t <= 0 || t >= 1) return;
        const [X, Y] = k.P(q.x, q.y),
          len = 34 * Math.min(1, t * 3);
        g.lineStyle(3 * (1 - t) + 1, c[2], 1 - t).lineBetween(X - len / 2, Y - 10 - len / 2, X + len / 2, Y - 10 + len / 2);
        g.lineStyle(3 * (1 - t) + 1, c[1], 1 - t).lineBetween(X + len / 2, Y - 10 - len / 2, X - len / 2, Y - 10 + len / 2);
      });
    }, true);
  },

  // --- mage ---
  // flames spring up along the line in front of you (FIELD_SHAPE_FX.wall keeps them)
  firewall: (k, e, c) => {
    const to = end(e);
    k.fade(420, (g, p) => {
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        if (t > p * 1.6) continue;
        const [X, Y] = k.P(lerp(e.x, to.x, t), lerp(e.y, to.y, t));
        flame(g, X, Y, 30 * (1 - p) + 8, c, 1 - p);
      }
    }, true);
  },
  // a huge rock of fire falls on the monster and everything round it
  meteor: (k, e, c) => {
    const to = at(e);
    fall(k, to.x, to.y, 520, 260, (g, X, Y, p) => {
      const s = 0.6 + 0.4 * p;
      g.lineStyle(26 * s, c[1], 0.35).lineBetween(X + 50, Y - 80, X, Y);
      g.lineStyle(12 * s, c[2], 0.6).lineBetween(X + 30, Y - 48, X, Y);
      g.fillStyle(0x44403c, 1).fillCircle(X, Y, 20 * s);
      g.fillStyle(c[1], 1).fillCircle(X - 4, Y - 4, 13 * s);
      g.fillStyle(c[2], 1).fillCircle(X - 7, Y - 7, 6 * s);
    }, 120);
    k.later(520, () => {
      blast(k, to.x, to.y, e.r, c, true, 800);
      cracks(k, to.x, to.y, e.r, c[0], 12);
      k.fade(1200, (g, p) => g.fillStyle(c[0], 0.3 * (1 - p)).fillCircle(to.x, to.y, e.r * 0.35));
      k.burst('puffs', 12, to.x, to.y, 8);
      k.shake(260, 0.014);
    });
  },
  // the monster is held in a bubble that wobbles, then pops
  bubble: (k, e, c) => {
    const where = k.follow(at(e).x, at(e).y),
      time = ms(e, 2000);
    k.fade(time, (g, p) => {
      const q = where(),
        [X, Y] = k.P(q.x, q.y),
        R = 26 * Math.min(1, p * 10) + Math.sin(p * 30) * 1.5;
      g.fillStyle(c[1], 0.22).fillCircle(X, Y - 8, R);
      g.lineStyle(2, c[2], 0.9).strokeCircle(X, Y - 8, R);
      g.fillStyle(WHITE, 0.8).fillEllipse(X - R * 0.4, Y - 8 - R * 0.45, R * 0.35, R * 0.2);
    }, true);
    k.later(time, () => {
      const q = where();
      k.burst('bits', 12, q.x, q.y, 0, c[2]);
      k.fade(220, (g, p) => g.lineStyle(3 * (1 - p) + 1, c[2], 1 - p).strokeCircle(q.x, q.y, 26 + 20 * p));
    });
  },
  // a wave sweeps across the whole room, pushing them all back
  tsunami: (k, e, c) => {
    const a = e.angle ?? k.hero().facing,
      { w, h } = k.room(),
      L = Math.hypot(w, h),
      dx = Math.cos(a),
      dy = Math.sin(a),
      nx = -dy,
      ny = dx;
    k.fade(1000, (g, p) => {
      const d = -60 + (L + 120) * p,
        q = p > 0.8 ? (1 - p) / 0.2 : 1,
        cx = e.x + dx * d,
        cy = e.y + dy * d;
      g.lineStyle(30, c[1], 0.5 * q).lineBetween(cx - nx * L, cy - ny * L, cx + nx * L, cy + ny * L);
      g.lineStyle(8, c[2], 0.85 * q).lineBetween(cx + dx * 14 - nx * L, cy + dy * 14 - ny * L, cx + dx * 14 + nx * L, cy + dy * 14 + ny * L);
      for (let i = -12; i <= 12; i++) {
        const o = i * (L / 12) + Math.sin(p * 20 + i) * 8;
        g.fillStyle(WHITE, 0.8 * q).fillCircle(cx + dx * 20 + nx * o, cy + dy * 20 + ny * o, 4);
      }
    });
    k.burst('puffs', 10, e.x, e.y, 10);
  },
  // a halo over you and a shield of light round you while it lasts
  blessing: (k, e, c) => {
    k.fade(ms(e, 1500), (g, p) => {
      const h = k.hero(),
        [X, Y] = k.P(h.x, h.y),
        a = p > 0.85 ? (1 - p) / 0.15 : Math.min(1, p * 8);
      g.lineStyle(3, c[1], 0.95 * a).strokeEllipse(X, Y - 34, 22, 7);
      g.lineStyle(1, WHITE, 0.9 * a).strokeEllipse(X, Y - 34, 16, 4);
      g.fillStyle(c[2], 0.16 * a).fillCircle(X, Y - 4, 34);
      g.lineStyle(2, c[2], 0.8 * a).strokeCircle(X, Y - 4, 34 + Math.sin(p * 30) * 2);
      for (let i = 0; i < 4; i++) {
        const t = (p * 3 + i / 4) % 1;
        g.fillStyle(WHITE, 0.9 * a * (1 - t)).fillRect(X - 20 + i * 13, Y + 10 - 50 * t, 2, 5);
      }
    }, true);
    k.burst('sparks', 12, e.x, e.y, -6);
  },
  // a white flash ring rolls out from you, and each monster is lit
  radiance: (k, e, c) => {
    const spots = k.spots(e.x, e.y, Infinity, 12),
      R = Math.min(e.r, 520);
    k.fade(700, (g, p) => {
      g.lineStyle(14 * (1 - p) + 2, WHITE, 0.95 * (1 - p)).strokeCircle(e.x, e.y, R * p);
      g.lineStyle(4 * (1 - p) + 1, c[1], 0.9 * (1 - p)).strokeCircle(e.x, e.y, R * p * 0.9);
      g.fillStyle(WHITE, 0.5 * (1 - p)).fillCircle(e.x, e.y, 40 * (1 - p) + 10);
    });
    k.fade(900, (g, p) => {
      for (const [sx, sy] of spots) {
        const [X, Y] = k.P(sx, sy),
          t = span(p, 0.15, 0.9);
        if (t > 0 && t < 1) star(g, X, Y - 10, 6 + 12 * Math.sin(t * Math.PI), WHITE, 0.9 * (1 - t));
      }
    }, true);
  },
  // a violet sigil turns under the monster while the curse holds
  curse: (k, e, c) => {
    const where = k.follow(at(e).x, at(e).y),
      h = k.hero();
    k.fade(260, (g, p) => {
      const q = where();
      g.lineStyle(3 * (1 - p) + 1, c[1], 0.9 * (1 - p)).lineBetween(h.x, h.y, q.x, q.y);
    });
    k.fade(ms(e, 5000), (g, p) => {
      const q = where(),
        a = p > 0.9 ? (1 - p) / 0.1 : Math.min(1, p * 12);
      sigil(g, q.x, q.y, 22, p * 12, c, 0.9 * a);
    });
  },
  // a giant blade of shadow cuts along the line in front of you
  voidedge: (k, e, c) => {
    const to = end(e),
      w = e.width ?? 60,
      a = Math.atan2(to.y - e.y, to.x - e.x),
      nx = -Math.sin(a),
      ny = Math.cos(a);
    k.fade(560, (g, p) => {
      const grow = Math.min(1, p * 4),
        q = 1 - span(p, 0.4, 1),
        tip = { x: lerp(e.x, to.x, grow), y: lerp(e.y, to.y, grow) },
        hw = (w / 2) * (1 + 0.2 * Math.sin(p * 20));
      g.fillStyle(c[0], 0.75 * q).fillTriangle(e.x + nx * hw, e.y + ny * hw, e.x - nx * hw, e.y - ny * hw, tip.x, tip.y);
      g.fillStyle(c[1], 0.85 * q).fillTriangle(e.x + nx * hw * 0.6, e.y + ny * hw * 0.6, e.x - nx * hw * 0.6, e.y - ny * hw * 0.6, tip.x, tip.y);
      g.lineStyle(3, c[2], q).lineBetween(e.x + nx * hw * 0.2, e.y + ny * hw * 0.2, tip.x, tip.y);
      g.lineStyle(6, c[2], q).lineBetween(e.x + nx * hw * 1.1, e.y + ny * hw * 1.1, e.x - nx * hw * 1.1, e.y - ny * hw * 1.1);
    });
    k.burst('bits', 20, to.x, to.y, 0, c[1]);
  },

  // --- monk ---
  // an uppercut that lifts you in a column of fire
  risingdragon: (k, e, c) => {
    k.fade(560, (g, p) => {
      const [X, Y] = k.P(e.x, e.y),
        q = 1 - p,
        tall = 150 * Math.min(1, p * 3);
      g.fillStyle(c[0], 0.5 * q).fillRect(X - 22, Y - tall, 44, tall);
      g.fillStyle(c[1], 0.8 * q).fillRect(X - 14, Y - tall, 28, tall);
      g.fillStyle(c[2], 0.9 * q).fillRect(X - 5, Y - tall, 10, tall);
      for (let i = 0; i < 5; i++) flame(g, X - 20 + i * 10, Y - tall + 8, 22 + (i % 2) * 10, c, q);
    }, true);
    blast(k, e.x, e.y, e.r, c, false);
    k.burst('sparks', 16, e.x, e.y, -40);
  },
  // a dragon of fire flies out of you along the line
  dragonroar: (k, e, c) => {
    const to = end(e),
      w = e.width ?? 50,
      a = Math.atan2(to.y - e.y, to.x - e.x),
      nx = -Math.sin(a),
      ny = Math.cos(a);
    k.fade(800, (g, p) => {
      const head = Math.min(1, p * 1.5),
        q = 1 - span(p, 0.6, 1);
      g.lineStyle(w * 0.6, c[0], 0.25 * q).lineBetween(e.x, e.y, lerp(e.x, to.x, head), lerp(e.y, to.y, head));
      for (let i = 14; i >= 0; i--) {
        const t = head - i * 0.035;
        if (t < 0) continue;
        const wave = Math.sin(t * 18 - p * 6) * w * 0.35,
          x = lerp(e.x, to.x, t) + nx * wave,
          y = lerp(e.y, to.y, t) + ny * wave,
          s = (w / 2) * (1 - i / 18);
        g.fillStyle(i % 2 ? c[1] : c[0], q).fillCircle(x, y, s * 0.6);
        if (i % 3 === 0) g.fillStyle(c[2], q).fillCircle(x, y, s * 0.25);
        if (i === 0) {
          g.fillStyle(c[2], q).fillTriangle(x + Math.cos(a) * s, y + Math.sin(a) * s, x + nx * s * 0.7, y + ny * s * 0.7, x - nx * s * 0.7, y - ny * s * 0.7);
          g.fillStyle(WHITE, q).fillCircle(x + nx * s * 0.3, y + ny * s * 0.3, 2).fillCircle(x - nx * s * 0.3, y - ny * s * 0.3, 2);
        }
      }
    });
    k.burst('bits', 20, e.x, e.y, 0, c[1]);
  },
  // a tiger's leap, and claw marks where you land
  pounce: (k, e, c) => {
    const to = at(e),
      from = e.to ? { x: e.x, y: e.y } : k.hero();
    jumpArc(k, from, to, c[1], WHITE, 240);
    k.later(200, () => {
      blast(k, to.x, to.y, e.r, c, false, 380);
      k.fade(420, (g, p) => {
        const [X, Y] = k.P(to.x, to.y);
        scratches(g, X, Y - 6, -0.9, 46 * Math.min(1, p * 4), 3, 10, c[1], 1 - p, 4);
      }, true);
    });
  },
  // a storm of claws on one monster
  hundredclaws: (k, e, c) => {
    const where = k.follow(at(e).x, at(e).y),
      cuts = Array.from({ length: 14 }, (_, i) => ({ a: (i * 2.39) % TAU, at: i / 14, dx: ((i * 37) % 21) - 10, dy: ((i * 53) % 17) - 8 }));
    k.fade(1000, (g, p) => {
      const q = where(),
        [X, Y] = k.P(q.x, q.y);
      for (const cut of cuts) {
        const t = span(p, cut.at * 0.8, cut.at * 0.8 + 0.15);
        if (t > 0 && t < 1) scratches(g, X + cut.dx, Y - 8 + cut.dy, cut.a, 30, 3, 6, cut.at > 0.5 ? c[2] : c[1], 1 - t, 2);
      }
      g.lineStyle(2, c[1], 0.6 * (1 - p)).strokeCircle(X, Y - 8, 26 + 4 * Math.sin(p * 40));
    }, true);
    for (let i = 0; i < 5; i++) k.later(i * 160, () => { const q = where(); k.burst('sparks', 4, q.x, q.y, -8); });
  },
  // the staff spins like a wheel round you, in a ring of water, while it lasts
  tidespin: (k, e, c) => {
    k.fade(ms(e, 2000), (g, p) => {
      const h = k.hero(),
        a = p * TAU * 8,
        R = (e.r || 100) * 0.45,
        q = p > 0.85 ? (1 - p) / 0.15 : 1;
      g.lineStyle(5, 0x92400e, q).lineBetween(h.x - Math.cos(a) * R, h.y - Math.sin(a) * R, h.x + Math.cos(a) * R, h.y + Math.sin(a) * R);
      for (let i = 1; i <= 3; i++) arc(g, h.x, h.y, R, a - i * 0.35, 0.18, 4, c[1], (0.7 - i * 0.18) * q);
      for (let i = 1; i <= 3; i++) arc(g, h.x, h.y, R, a + Math.PI - i * 0.35, 0.18, 4, c[1], (0.7 - i * 0.18) * q);
      waterRing(g, h.x, h.y, R + 8, p * 3, c, 0.7 * q);
    });
    k.burst('bits', 12, e.x, e.y, 0, c[1]);
  },
  // you flow from monster to monster: a trail of water drawn along the way, splashes at each
  riverdance: (k, e, c) => {
    const pts = chainOf(e),
      legs = pts.length - 1;
    k.fade(1000, (g, p) => {
      const reach = Math.min(1, p * 1.4) * legs,
        q = 1 - span(p, 0.6, 1);
      for (let i = 0; i < legs && i < reach; i++) {
        const a = pts[i],
          b = pts[i + 1],
          f = Math.min(1, reach - i),
          n = 12,
          path: Pt[] = [],
          nx = -(b.y - a.y),
          ny = b.x - a.x,
          d = Math.hypot(nx, ny) || 1;
        for (let j = 0; j <= n * f; j++) {
          const t = j / n,
            wob = Math.sin(t * Math.PI * 3 + i) * 10;
          path.push({ x: lerp(a.x, b.x, t) + (nx / d) * wob, y: lerp(a.y, b.y, t) + (ny / d) * wob });
        }
        if (path.length > 1) {
          g.lineStyle(9, c[1], 0.6 * q).strokePoints(path);
          g.lineStyle(3, c[2], 0.9 * q).strokePoints(path);
        }
      }
    });
    pts.slice(1).forEach((pt, i) => k.later((i / legs) * 700, () => {
      k.burst('bits', 8, pt.x, pt.y, 0, c[2]);
      k.fade(260, (g, p) => waterRing(g, pt.x, pt.y, 10 + 22 * p, p, c, 1 - p));
    }));
  },
  // a violet beam out of both palms
  kiwave: (k, e, c) => {
    const to = end(e),
      w = e.width ?? 20;
    k.fade(460, (g, p) => {
      const reach = Math.min(1, p * 5),
        b = { x: lerp(e.x, to.x, reach), y: lerp(e.y, to.y, reach) },
        q = 1 - span(p, 0.5, 1);
      beam(g, e, b, w * (1 + 0.15 * Math.sin(p * 50)), c, q);
      g.fillStyle(c[2], q).fillCircle(e.x, e.y, w * 0.7);
      g.fillStyle(c[1], 0.8 * q).fillCircle(b.x, b.y, w * 0.6);
    });
    k.burst('bits', 12, to.x, to.y, 0, c[1]);
  },
  // a huge ball of ki grows over you, then falls on the monster
  spiritbomb: (k, e, c) => {
    const to = at(e),
      from = k.hero();
    k.fade(800, (g, p) => {
      const grow = span(p, 0, 0.45),
        fly = span(p, 0.5, 0.8),
        [AX, AY] = k.P(from.x, from.y),
        [BX, BY] = k.P(to.x, to.y),
        X = lerp(AX, BX, fly),
        Y = lerp(AY - 90, BY, fly * fly),
        R = 8 + 34 * grow;
      if (p > 0.82) return;
      g.fillStyle(c[0], 0.45).fillCircle(X, Y, R * 1.3);
      g.fillStyle(c[1], 0.9).fillCircle(X, Y, R);
      g.fillStyle(c[2], 0.95).fillCircle(X - R * 0.25, Y - R * 0.25, R * 0.5);
      if (grow < 1) for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + p * 10,
          d = 70 * (1 - grow);
        g.fillStyle(c[2], 0.8).fillCircle(X + Math.cos(a) * d, Y + Math.sin(a) * d, 3);
      }
    }, true);
    k.later(650, () => {
      blast(k, to.x, to.y, e.r, c, true, 800);
      k.fade(700, (g, p) => g.lineStyle(6 * (1 - p) + 1, WHITE, 0.8 * (1 - p)).strokeCircle(to.x, to.y, e.r * 0.5 * (0.3 + p)));
      k.shake(260, 0.014);
    });
  },
};

/** The look of a move with no entry in SP_FX, by its shape. */
export const SHAPE_FX: Record<SpShape, MoveFx> = {
  ring: (k, e, c) => {
    blast(k, e.x, e.y, e.r, c, e.final);
    cracks(k, e.x, e.y, e.r, c[0]);
  },
  drop: (k, e, c) => {
    const to = at(e);
    fall(k, to.x, to.y, 360, 220, (g, X, Y) => {
      g.lineStyle(12, c[1], 0.35).lineBetween(X, Y - 70, X, Y);
      g.fillStyle(c[1], 1).fillCircle(X, Y, e.final ? 22 : 12);
      g.fillStyle(c[2], 1).fillCircle(X - 4, Y - 4, e.final ? 9 : 5);
    });
    k.later(360, () => blast(k, to.x, to.y, e.r, c, e.final));
  },
  all: (k, e, c) => {
    for (const [sx, sy] of k.spots(e.x, e.y, Infinity, 12)) {
      fall(k, sx, sy, 300, 200, (g, X, Y) => {
        g.lineStyle(5, c[1], 0.6).lineBetween(X, Y - 50, X, Y);
        g.fillStyle(c[2], 1).fillCircle(X, Y, 5);
      });
      k.later(300, () => blast(k, sx, sy, 30, c, false, 360));
    }
  },
  dash: (k, e, c) => {
    const to = end(e);
    k.ghosts(e.x, e.y, to.x, to.y, c[1], 4);
    k.fade(320, (g, p) => beam(g, e, to, 12 * (1 - p) + 2, c, 1 - p));
  },
  chain: (k, e, c) => {
    const pts = chainOf(e);
    k.fade(e.final ? 420 : 300, (g, p) => {
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1],
          b = pts[i],
          mx = (a.x + b.x) / 2 + Math.sin(i * 7 + p * 30) * 10,
          my = (a.y + b.y) / 2 + Math.cos(i * 5 + p * 30) * 10;
        g.lineStyle(7 * (1 - p) + 1, c[1], 0.6 * (1 - p)).lineBetween(a.x, a.y, mx, my).lineBetween(mx, my, b.x, b.y);
        g.lineStyle(2, c[2], 1 - p).lineBetween(a.x, a.y, mx, my).lineBetween(mx, my, b.x, b.y);
      }
    });
    pts.slice(1).forEach((q) => k.burst('sparks', 4, q.x, q.y, -6));
  },
  guard: (k, e, c) => {
    k.fade(380, (g, p) => {
      g.lineStyle(6 * (1 - p) + 1, c[1], 0.9 * (1 - p)).strokeCircle(e.x, e.y, e.r * (0.3 + 0.7 * p));
      g.fillStyle(c[2], 0.2 * (1 - p)).fillCircle(e.x, e.y, e.r * (0.3 + 0.7 * p));
    });
    k.burst('sparks', 10, e.x, e.y, -6);
  },
  field: (k, e, c) => {
    k.fade(360, (g, p) => g.lineStyle(5 * (1 - p) + 1, c[2], 0.9 * (1 - p)).strokeCircle(e.x, e.y, e.r * (0.4 + 0.6 * p)));
    k.burst('bits', e.final ? 30 : 12, e.x, e.y, 0, c[1]);
  },
  wall: (k, e, c) => {
    const to = end(e);
    k.fade(360, (g, p) => beam(g, e, to, (e.width ?? 22) * (1 - p) + 2, c, 1 - p));
  },
  leap: (k, e, c) => {
    const to = at(e);
    jumpArc(k, e.to ? e : k.hero(), to, c[1], c[2]);
    k.later(220, () => blast(k, to.x, to.y, e.r, c, e.final));
  },
  hook: (k, e, c) => {
    const to = e.to ?? end(e, 200);
    k.fade(420, (g, p) => {
      const h = k.hero(),
        t = span(p, 0, 0.4) * (1 - span(p, 0.45, 1));
      g.lineStyle(3, c[2], 0.9).lineBetween(h.x, h.y, lerp(h.x, to.x, t), lerp(h.y, to.y, t));
    });
  },
  boomerang: (k, e, c) => {
    k.fade(240, (g, p) => arc(g, e.x, e.y, 30 + 20 * p, e.angle ?? 0, 1.2, 5 * (1 - p) + 1, c[1], 1 - p));
  },
  vanish: (k, e, c) => {
    k.hide(ms(e, 2000));
    k.burst('puffs', 14, e.x, e.y, 6);
    k.fade(400, (g, p) => g.lineStyle(2, c[1], 1 - p).strokeCircle(e.x, e.y, 14 + 30 * p));
  },
  trap: (k, e, c) => {
    const where = k.follow(at(e).x, at(e).y);
    k.fade(ms(e, 2000), (g) => {
      const q = where();
      g.lineStyle(2, c[2], 0.9).strokeCircle(q.x, q.y, 24);
    });
  },
  mark: (k, e, c) => {
    const where = k.follow(at(e).x, at(e).y);
    k.fade(ms(e, 4000), (g, p) => {
      const q = where();
      sigil(g, q.x, q.y, 20, p * 10, c, 0.8);
    });
  },
  beam: (k, e, c) => {
    const to = end(e);
    k.fade(360, (g, p) => beam(g, e, to, (e.width ?? 20) * (1 - p) + 2, c, 1 - p));
  },
};

/** The sound of each kind of move. */
const SHAPE_SOUND: Record<SpShape, SfxId> = {
  ring: 'nova', drop: 'nova', all: 'nova', dash: 'dash', chain: 'spark', guard: 'nova', field: 'nova', wall: 'flame',
  leap: 'dash', hook: 'arrow', boomerang: 'slash', vanish: 'dash', trap: 'orb', mark: 'orb', beam: 'arrow',
};

/** A move's own sound, where its kind's doesn't fit. */
export const SP_SOUND: Partial<Record<SpMoveId, SfxId>> = {
  reap: 'whoosh', vanish: 'gust', blessing: 'chime', radiance: 'chime', tsunami: 'wave', tidalcharge: 'wave',
  dragonroar: 'roar', inferno: 'flame', firewall: 'flame', bubble: 'glass', pack: 'roar', tidespin: 'whoosh',
};

/** Plays an SP move: its sound, and its look (its own, or its shape's). */
export function spFx(k: FxKit, e: SpEvent, c: Aura) {
  const shape = SP_MOVES[e.id].shape;
  k.sfx(SP_SOUND[e.id] ?? (e.final ? 'nova' : SHAPE_SOUND[shape]), e.final ? 0.8 : 1.15);
  (SP_FX[e.id] ?? SHAPE_FX[shape])(k, e, c);
}

// ---------- patches on the floor that last ----------

/** What a lasting patch draws with each frame: `ground` in engine points, `up` standing up in
    screen points; `left` goes from 1 to 0 in its last moments; `ev` is the move that made it. */
export interface FieldCtx {
  k: FxKit;
  ground: G;
  up: G;
  fd: SpField;
  ev: SpEvent | undefined;
  now: number;
  left: number;
  c: Aura;
}
type FieldFx = (f: FieldCtx) => void;

/** A patch with no look of its own: a ring that beats and bits drifting in it. */
function patch({ ground: g, fd, now, left, c }: FieldCtx) {
  const beat = (Math.sin(now / 90) + 1) / 2;
  g.fillStyle(c[0], 0.18 * left).fillCircle(fd.x, fd.y, fd.r);
  g.lineStyle(2 + beat * 2, c[1], 0.7 * left).strokeCircle(fd.x, fd.y, fd.r);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + now / 600,
      d = fd.r * (0.3 + 0.6 * ((now / 400 + i * 0.37) % 1));
    g.fillStyle(c[2], 0.8 * left).fillCircle(fd.x + Math.cos(a) * d, fd.y + Math.sin(a) * d, 3);
  }
}

/** Flames dancing over spots in a patch, standing up. */
function burning({ k, up, fd, now, left, c }: FieldCtx, n: number, tall: number) {
  for (let i = 0; i < n; i++) {
    const a = i * 2.39,
      d = fd.r * (0.25 + 0.7 * ((i * 0.618) % 1)),
      [X, Y] = k.P(fd.x + Math.cos(a) * d, fd.y + Math.sin(a) * d);
    flame(up, X, Y, tall * (0.6 + 0.4 * Math.sin(now / 80 + i * 1.7)), c, 0.85 * left);
  }
}

/** Each lasting patch's own look, by move id. */
export const FIELD_FX: Partial<Record<SpMoveId, FieldFx>> = {
  // a ring of fire that goes with you, turning
  inferno: (f) => {
    const { k, ground: g, up, fd, now, left, c } = f;
    g.fillStyle(c[0], 0.14 * left).fillCircle(fd.x, fd.y, fd.r);
    g.lineStyle(3, c[1], 0.7 * left).strokeCircle(fd.x, fd.y, fd.r);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + now / 500,
        [X, Y] = k.P(fd.x + Math.cos(a) * fd.r, fd.y + Math.sin(a) * fd.r);
      flame(up, X, Y, 18 + 6 * Math.sin(now / 70 + i * 2), c, 0.9 * left);
    }
  },
  // arrows keep falling inside the circle
  arrowrain: (f) => {
    const { k, ground: g, up, fd, now, left, c } = f;
    g.lineStyle(2, c[1], 0.5 * left).strokeCircle(fd.x, fd.y, fd.r);
    g.fillStyle(c[0], 0.1 * left).fillCircle(fd.x, fd.y, fd.r);
    for (let i = 0; i < 9; i++) {
      const t = (now / 260 + i * 0.37) % 1,
        a = i * 2.39 + Math.floor(now / 260 + i * 0.37) * 1.3,
        d = fd.r * (0.15 + 0.8 * ((i * 0.618 + Math.floor(now / 260 + i * 0.37) * 0.31) % 1)),
        [X, Y] = k.P(fd.x + Math.cos(a) * d, fd.y + Math.sin(a) * d),
        ty = Y - 120 * (1 - t);
      if (t < 0.85) {
        up.lineStyle(2, c[2], 0.9 * left).lineBetween(X + 3, ty - 18, X, ty);
        up.fillStyle(c[1], left).fillTriangle(X - 3, ty - 2, X + 3, ty - 2, X, ty + 4);
      } else up.lineStyle(2, c[2], 0.8 * left).strokeEllipse(X, Y, 14, 5);
    }
  },
  // the floor burns where the bomb went off
  bomb: (f) => {
    const { ground: g, fd, left, c } = f;
    g.fillStyle(0x1c1917, 0.35 * left).fillCircle(fd.x, fd.y, fd.r * 0.9);
    g.fillStyle(c[0], 0.2 * left).fillCircle(fd.x, fd.y, fd.r);
    burning(f, 7, 16);
  },
};

/** The look of a lasting patch with no entry in FIELD_FX, by its move's shape. */
export const FIELD_SHAPE_FX: Partial<Record<SpShape, FieldFx>> = {
  // a line of fire on the floor: from where it started toward its end, `width` wide
  wall: (f) => {
    const { k, ground: g, up, fd, ev, now, left, c } = f;
    if (!ev) return patch(f);
    const to = end(ev),
      w = ev.width ?? 22;
    g.lineStyle(w, c[0], 0.3 * left).lineBetween(ev.x, ev.y, to.x, to.y);
    g.lineStyle(w * 0.4, c[1], 0.4 * left).lineBetween(ev.x, ev.y, to.x, to.y);
    for (let i = 0; i <= 8; i++) {
      const t = i / 8,
        [X, Y] = k.P(lerp(ev.x, to.x, t), lerp(ev.y, to.y, t));
      flame(up, X, Y, w + 6 * Math.sin(now / 70 + i * 1.9), c, 0.9 * left);
    }
  },
};

/** Draws every SP patch on the floor this frame. A wall is drawn once, however many patches make it. */
export function drawFields(k: FxKit, ground: G, up: G, fields: readonly SpField[], last: Partial<Record<SpMoveId, SpEvent>>, t: number, now: number, c: Aura) {
  const done = new Set<SpMoveId>();
  for (const fd of fields) {
    const shape = SP_MOVES[fd.id].shape;
    if (shape === 'wall') {
      if (done.has(fd.id)) continue;
      done.add(fd.id);
    }
    const look = FIELD_FX[fd.id] ?? FIELD_SHAPE_FX[shape] ?? patch;
    look({ k, ground, up, fd, ev: last[fd.id], now, left: Math.min(1, (fd.until - t) / 0.4), c });
  }
}

// ---------- the SP weapons: each basic attack, and the shots they throw ----------

/** A shot's look: its picture (pointing right, `w` x `h`), how fast it spins (none: it points
    the way it flies), and a trail drawn behind it each frame in engine points. */
export interface ShotLook {
  w: number;
  h: number;
  paint(g: G): void;
  spin?: number;
  trail?(g: G, s: Shot, now: number): void;
}

interface WeaponFx {
  /** The basic attack on screen: a swing, a thrust, a flash at the muzzle. */
  attack(k: FxKit, e: AttackEvent, c: Aura): void;
  /** Its shots, if it throws any. */
  shot?: ShotLook;
}

/** A swing: a crescent `half` each side of each blow, in bands of the SP's colors, with a glint on its tip. */
function swing(k: FxKit, e: AttackEvent, bands: [number, number, number, number][], half: number, time = 190) {
  const R = e.r ?? 80;
  for (let i = 0; i < e.n; i++) {
    const a = e.angle + (i * TAU) / e.n;
    k.fade(time, (g, p) => {
      const q = 1 - p,
        sweep = half * Math.min(1, p * 3),
        r0 = R * (0.75 + 0.25 * p);
      for (const [off, w, col, al] of bands) arc(g, e.x, e.y, r0 - off, a, sweep, w * q + 1, col, al * q);
      const tx = e.x + Math.cos(a + sweep) * r0,
        ty = e.y + Math.sin(a + sweep) * r0;
      g.fillStyle(WHITE, q).fillRect(tx - 1, ty - 4, 2, 8).fillRect(tx - 4, ty - 1, 8, 2);
    });
  }
}

/** The plain sword's crescent (no SP worn). */
const PLAIN: [number, number, number, number][] = [
  [0, 9, 0xfffbeb, 0.95],
  [7, 6, 0xfde68a, 0.6],
  [13, 4, 0xfbbf24, 0.35],
];
/** The SP's bands: light edge, middle, dark. */
const bandsOf = (c: Aura, w = 1): [number, number, number, number][] => [
  [0, 9 * w, c[2], 0.95],
  [7 * w, 6 * w, c[1], 0.7],
  [13 * w, 4 * w, c[0], 0.45],
];
/** The front of a blow, `d` along it. */
const front = (e: AttackEvent, d: number): Pt => ({ x: e.x + Math.cos(e.angle) * d, y: e.y + Math.sin(e.angle) * d });

/** A shot that leaves a streak behind it. */
const streak = (color: number, len: number, w = 3) => (g: G, s: Shot) => {
  const sp = Math.hypot(s.vx, s.vy) || 1,
    tx = s.x - (s.vx / sp) * len,
    ty = s.y - (s.vy / sp) * len;
  g.lineStyle(w, color, 0.45).lineBetween(tx, ty, s.x, s.y);
  g.lineStyle(1, WHITE, 0.6).lineBetween((tx + s.x) / 2, (ty + s.y) / 2, s.x, s.y);
};
/** A shot that glows round itself and drops a glow behind. */
const glow = (color: number, R: number) => (g: G, s: Shot, now: number) => {
  const sp = Math.hypot(s.vx, s.vy) || 1,
    pulse = 1 + 0.2 * Math.sin(now / 60 + s.id);
  g.fillStyle(color, 0.2).fillCircle(s.x, s.y, R * pulse);
  g.fillStyle(color, 0.3).fillCircle(s.x - (s.vx / sp) * 9, s.y - (s.vy / sp) * 9, R * 0.45);
  g.fillStyle(color, 0.15).fillCircle(s.x - (s.vx / sp) * 18, s.y - (s.vy / sp) * 18, R * 0.3);
};
/** A flash at the muzzle: a small ring and a glow where the shot leaves. */
const muzzle = (k: FxKit, e: AttackEvent, color: number, R = 10) => {
  const m = front(e, 18);
  k.fade(140, (g, p) => {
    g.fillStyle(color, 0.6 * (1 - p)).fillCircle(m.x, m.y, R * (1 - p) + 2);
    g.lineStyle(2, WHITE, 0.8 * (1 - p)).strokeCircle(m.x, m.y, R * (0.5 + p));
  });
};

/** Each SP weapon's look. */
export const WEAPON_FX: Record<SpWeapon, WeaponFx> = {
  // a slow, heavy swing all the way round, throwing embers
  greataxe: {
    attack: (k, e, c) => {
      swing(k, e, bandsOf(c, 1.4), Math.min(Math.PI, e.arc ?? 3.2), 280);
      k.burst('bits', 8, e.x, e.y, 0, c[1]);
    },
  },
  // a smash in front: a short heavy arc, then a ring of gold on the ground
  hammer: {
    attack: (k, e, c) => {
      swing(k, e, bandsOf(c, 1.2), 0.7, 160);
      const m = front(e, (e.r ?? 80) * 0.8);
      k.later(90, () => {
        k.fade(240, (g, p) => {
          g.lineStyle(5 * (1 - p) + 1, c[1], 0.9 * (1 - p)).strokeCircle(m.x, m.y, 10 + 26 * p);
          g.fillStyle(c[2], 0.3 * (1 - p)).fillCircle(m.x, m.y, 12 + 14 * p);
        });
        k.burst('puffs', 3, m.x, m.y, 8);
      });
    },
  },
  // a thrust: a long narrow line out ahead with a bright tip
  lance: {
    attack: (k, e, c) => {
      const R = e.r ?? 130;
      k.fade(170, (g, p) => {
        const reach = R * Math.min(1, p * 3),
          tip = front(e, reach),
          back = front(e, reach * 0.3);
        g.lineStyle(8 * (1 - p) + 2, c[1], 0.6 * (1 - p)).lineBetween(back.x, back.y, tip.x, tip.y);
        g.lineStyle(2, WHITE, 1 - p).lineBetween(back.x, back.y, tip.x, tip.y);
        g.fillStyle(c[2], 1 - p).fillCircle(tip.x, tip.y, 4);
      });
    },
    shot: {
      w: 28, h: 6,
      paint: (g) => {
        g.fillStyle(0x92400e).fillRect(0, 2, 20, 2);
        g.fillStyle(0xe0f2fe).fillTriangle(20, 0, 28, 3, 20, 6);
      },
      trail: streak(0x60a5fa, 30),
    },
  },
  // a wide thin sweep, a shadow trailing it
  scythe: {
    attack: (k, e, c) => swing(k, e, [[0, 5, c[2], 0.95], [6, 8, c[1], 0.6], [16, 6, c[0], 0.5]], Math.min(Math.PI, e.arc ?? 2), 240),
    // Reap's flight: the scythe spinning
    shot: {
      w: 26, h: 26,
      paint: (g) => {
        g.fillStyle(0x44403c).fillRect(4, 12, 18, 3);
        g.fillStyle(0xa78bfa).fillTriangle(20, 2, 26, 14, 18, 10);
        g.fillStyle(0xede9fe).fillTriangle(21, 4, 24, 12, 20, 9);
        g.fillStyle(0xa78bfa).fillTriangle(6, 24, 0, 12, 8, 16);
      },
      spin: 16,
      trail: glow(0x8b5cf6, 16),
    },
  },
  // a long arrow, fast and straight
  longbow: {
    attack: (k, e, c) => muzzle(k, e, c[2], 6),
    shot: {
      w: 24, h: 5,
      paint: (g) => {
        g.fillStyle(0xd6d3d1).fillRect(0, 2, 18, 1);
        g.fillStyle(0xe0f2fe).fillTriangle(18, 0, 24, 2.5, 18, 5);
        g.fillStyle(0x60a5fa).fillRect(0, 0, 4, 1).fillRect(0, 4, 4, 1);
      },
      trail: streak(0x93c5fd, 40, 2),
    },
  },
  // a boom and smoke at the muzzle; the ball leaves a smoke trail
  cannon: {
    attack: (k, e, c) => {
      muzzle(k, e, c[1], 14);
      const m = front(e, 20);
      k.burst('puffs', 4, m.x, m.y, 0);
      k.shake(60, 0.003);
    },
    shot: {
      w: 12, h: 12,
      paint: (g) => {
        g.fillStyle(0x1f2937).fillCircle(6, 6, 6);
        g.fillStyle(0x6b7280).fillCircle(4, 4, 2);
      },
      trail: (g, s, now) => {
        const sp = Math.hypot(s.vx, s.vy) || 1;
        for (let i = 1; i <= 4; i++) g.fillStyle(0x9ca3af, 0.3 - i * 0.06).fillCircle(s.x - (s.vx / sp) * i * 9, s.y - (s.vy / sp) * i * 9, 3 + i + Math.sin(now / 50 + i));
      },
    },
  },
  // a spinning boomerang with a thin gold arc behind it
  boomerang: {
    attack: (k, e, c) => muzzle(k, e, c[2], 6),
    shot: {
      w: 16, h: 16,
      paint: (g) => {
        g.fillStyle(0x92400e).fillTriangle(0, 0, 16, 8, 6, 8).fillTriangle(0, 16, 16, 8, 6, 8);
        g.fillStyle(0xfcd34d).fillTriangle(2, 2, 13, 8, 7, 8).fillTriangle(2, 14, 13, 8, 7, 8);
      },
      spin: 18,
      trail: glow(0xfcd34d, 10),
    },
  },
  // two quick short cuts crossing
  daggers: {
    attack: (k, e, c) => {
      const half = Math.min(1, e.arc ?? 1) * 0.7;
      swing(k, { ...e, r: (e.r ?? 70) * 0.8, angle: e.angle - 0.3 }, bandsOf(c, 0.6), half, 120);
      k.later(70, () => swing(k, { ...e, r: (e.r ?? 70) * 0.8, angle: e.angle + 0.3 }, bandsOf(c, 0.6), half, 120));
    },
  },
  // a fireball with a flickering tail
  flamestaff: {
    attack: (k, e, c) => muzzle(k, e, c[1], 8),
    shot: {
      w: 16, h: 14,
      paint: (g) => {
        g.fillStyle(0xdc2626, 0.6).fillTriangle(0, 7, 8, 2, 8, 12);
        g.fillStyle(0xf97316).fillCircle(10, 7, 6);
        g.fillStyle(0xfde047).fillCircle(11, 6, 3);
      },
      trail: glow(0xf97316, 14),
    },
  },
  // an orb of water, drops falling behind
  waterorb: {
    attack: (k, e, c) => muzzle(k, e, c[2], 6),
    shot: {
      w: 12, h: 12,
      paint: (g) => {
        g.fillStyle(0x2563eb, 0.5).fillCircle(6, 6, 6);
        g.fillStyle(0x60a5fa).fillCircle(6, 6, 4);
        g.fillStyle(0xffffff).fillCircle(4, 4, 1.5);
      },
      trail: glow(0x60a5fa, 11),
    },
  },
  // a bolt of light, a chime ring when it leaves
  bellstaff: {
    attack: (k, e, c) => {
      k.fade(220, (g, p) => g.lineStyle(2, c[1], 0.9 * (1 - p)).strokeCircle(e.x, e.y, 12 + 18 * p));
    },
    shot: {
      w: 18, h: 6,
      paint: (g) => {
        g.fillStyle(0xfcd34d).fillTriangle(0, 3, 9, 0, 9, 6).fillTriangle(18, 3, 9, 0, 9, 6);
        g.fillStyle(0xffffff).fillTriangle(4, 3, 9, 1.5, 9, 4.5).fillTriangle(15, 3, 9, 1.5, 9, 4.5);
      },
      trail: streak(0xfde68a, 26),
    },
  },
  // a sword of shadow: a dark crescent
  hexblade: {
    attack: (k, e, c) => swing(k, e, [[0, 7, c[2], 0.95], [6, 8, c[1], 0.7], [14, 6, c[0], 0.6]], Math.min(Math.PI, e.arc ?? 1.2)),
  },
  // a punch: a burst of fire at the fist
  gauntlets: {
    attack: (k, e, c) => {
      const m = front(e, (e.r ?? 70) * 0.7),
        from = front(e, 14);
      k.fade(160, (g, p) => {
        g.lineStyle(6 * (1 - p) + 1, c[1], 0.7 * (1 - p)).lineBetween(from.x, from.y, m.x, m.y);
        g.fillStyle(c[2], 0.8 * (1 - p)).fillCircle(m.x, m.y, 8 + 10 * p);
        g.lineStyle(3, c[1], 0.9 * (1 - p)).strokeCircle(m.x, m.y, 10 + 16 * p);
      });
      k.burst('sparks', 3, m.x, m.y, -4);
    },
  },
  // three scratches across the front
  claws: {
    attack: (k, e, c) => {
      const m = front(e, (e.r ?? 70) * 0.65);
      k.fade(180, (g, p) => {
        const [X, Y] = k.P(m.x, m.y);
        scratches(g, X, Y - 6, e.angle + Math.PI / 2 + 1.2, 30 * Math.min(1, p * 4), 3, 7, c[1], 1 - p);
      }, true);
    },
  },
  // the staff spins round you in a wave of water
  bo: {
    attack: (k, e, c) => {
      const R = e.r ?? 70;
      k.fade(260, (g, p) => {
        const a = e.angle + p * TAU,
          q = 1 - p;
        g.lineStyle(5, 0x92400e, q).lineBetween(e.x - Math.cos(a) * R * 0.5, e.y - Math.sin(a) * R * 0.5, e.x + Math.cos(a) * R * 0.5, e.y + Math.sin(a) * R * 0.5);
        arc(g, e.x, e.y, R * 0.5, a - 0.4, 0.4, 4, c[1], 0.7 * q);
        arc(g, e.x, e.y, R * 0.5, a + Math.PI - 0.4, 0.4, 4, c[1], 0.7 * q);
        waterRing(g, e.x, e.y, R * (0.5 + 0.5 * p), p, c, q * 0.8);
      });
    },
  },
  // a ki blast out of the palms
  kipalms: {
    attack: (k, e, c) => muzzle(k, e, c[1], 10),
    shot: {
      w: 14, h: 14,
      paint: (g) => {
        g.fillStyle(0x7c3aed, 0.5).fillCircle(7, 7, 7);
        g.fillStyle(0xa855f7).fillCircle(7, 7, 5);
        g.fillStyle(0xf3e8ff).fillCircle(7, 7, 2.5);
      },
      trail: glow(0xa855f7, 13),
    },
  },
};

/** Plays a basic attack: the SP weapon's own look, or the plain sword's crescent. */
export function attackFx(k: FxKit, e: AttackEvent, c: Aura) {
  if (e.weapon) WEAPON_FX[e.weapon].attack(k, e, c);
  else if (e.kind === 'slash') swing(k, e, PLAIN, 1.2);
}

/** The texture key for a shot: its weapon's picture, or the plain arrow or orb. */
export const shotTexture = (s: Shot) => (s.look && WEAPON_FX[s.look].shot ? `shot-${s.look}` : s.kind);
