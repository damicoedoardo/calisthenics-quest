import type { ClassId, Gear, GearSlot } from '../gear';
import { R, S, aura, autoshade, frame, grid, mix, outline, painter, tint, toSheet, type Ctx, type Grid, type Look, type Ramp, type Spec } from './engine';

// The story's cast at 64x64, in the same style as the SP sprites: your hero (with class weapon
// and gear colors), the golden Echo, your Best Self, the Hollow, the Wanderer and Ember.

const NIGHT = '#0b0d14';
export const DEFAULT_LOOK: Look = { sex: 'm', style: 'spiky', hair: 'brown', skin: 'light' };

export type HeroVariant = 'normal' | 'echo' | 'best' | 'hollow';
export type Mode = 'idle' | 'action';

export const rampOf = (col: string): Ramp => [mix(col, NIGHT, 0.5), col, mix(col, '#ffffff', 0.4)];

const LINEN: Ramp = ['#5a4630', '#8c7350', '#b89c70'];
const CAPE: Ramp = ['#5e1010', '#b02828', '#e86048'];
const GOLD_GHOST: Ramp = ['#5c3d0a', '#9a6a12', '#d9a52a', '#f3d36b', '#fff3c4'];
const SHADOW: Ramp = ['#06050b', '#0f0c1c', '#1a1530', '#2a2248', '#3d3266'];

// ---------- weapons ----------

/** A sword drawn by sampling a rotated frame: grip in the hand at (gx, gy), blade along (dx, dy). */
function sword(c: Ctx, gx: number, gy: number, dx: number, dy: number, len: number, M: Ramp) {
  const al = Math.hypot(dx, dy),
    ax = dx / al,
    ay = dy / al,
    nx = ay,
    ny = -ax,
    lit = -nx - ny > 0 ? 1 : -1,
    hilt = R.gold;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const ox = x - gx,
        oy = y - gy,
        s = ox * ax + oy * ay,
        t = ox * nx + oy * ny,
        side = t * lit;
      if (s >= -6 && s < -3.5 && Math.abs(t) <= 1.6) c.w.p(x, y, hilt[2]);
      else if (s >= -3.5 && s < 3 && Math.abs(t) <= 1.1) c.w.p(x, y, R.leather[Math.round(s) % 2 ? 1 : 2]);
      else if (s >= 3 && s <= 5 && Math.abs(t) <= 5) c.w.p(x, y, Math.abs(t) < 1.2 ? hilt[2] : hilt[1]);
      else if (s > 5 && s <= len) {
        const hw = 1.8 * Math.min(1, (len - s) / 4) + 0.3;
        if (Math.abs(t) <= hw) c.w.p(x, y, side > 0.6 ? M[2] : side < -0.6 ? M[0] : M[1]);
      }
    }
}

function slashArc(c: Ctx, glow: string) {
  for (let a = -100; a <= 70; a += 3) {
    const r = (a * Math.PI) / 180;
    c.fx.p(38 + 24 * Math.cos(r), 34 + 24 * Math.sin(r), '#ffffff');
    c.fx.p(38 + 22 * Math.cos(r), 34 + 22 * Math.sin(r), glow);
  }
}

function drawSword(c: Ctx, M: Ramp, glow: string) {
  const [hx, hy] = c.P.arms.R.hand,
    gx = hx + 1.5,
    gy = hy + 1.5;
  if (c.P.ra === 'up') sword(c, gx, gy, 0.8, -0.6, 20, M);
  else if (c.P.ra === 'fwd') sword(c, gx, gy, 0.2, 1, 20, M);
  else sword(c, gx, gy, 0.25, -1, 26, M);
  if (c.P.fx === 'slash') slashArc(c, glow);
}

/** The Adventurer's wooden stick, for a hero with no weapon yet. */
function drawStick(c: Ctx, glow: string) {
  const { w, P } = c,
    Wd = R.wood,
    [hx, hy] = P.arms.R.hand;
  if (P.ra === 'up') {
    w.thick(hx + 3, hy + 2, hx + 18, hy - 13, 3, Wd[1]);
    w.line(hx + 3, hy + 1, hx + 18, hy - 14, Wd[2]);
  } else if (P.ra === 'fwd') {
    w.r(hx, hy + 4, 3, 22, Wd[1]);
    w.col(hx, hy + 4, hy + 25, Wd[2]);
  } else {
    const wx = hx + 4;
    w.r(hx + 4, hy + 1, 1, 2, Wd[1]);
    w.r(wx, hy - 18, 3, 26, Wd[1]);
    w.col(wx, hy - 18, hy + 7, Wd[2]);
    w.col(wx + 2, hy - 18, hy + 7, Wd[0]);
    w.r(wx - 1, hy - 20, 5, 3, Wd[1]);
    w.row(hy - 20, wx - 1, wx + 3, Wd[2]);
  }
  if (P.fx === 'slash') slashArc(c, glow);
}

/** A monk's long staff with metal caps in the gear's color. */
function drawStaff(c: Ctx, M: Ramp, glow: string) {
  const { w, P } = c,
    Wd = R.wood,
    [hx, hy] = P.arms.R.hand;
  if (P.ra === 'up') {
    w.thick(hx - 8, hy + 13, hx + 18, hy - 13, 3, Wd[1]);
    w.line(hx - 8, hy + 12, hx + 18, hy - 14, Wd[2]);
    w.thick(hx + 15, hy - 10, hx + 19, hy - 14, 3, M[1]);
    w.thick(hx - 9, hy + 13, hx - 6, hy + 10, 3, M[1]);
  } else if (P.ra === 'fwd') {
    w.r(hx, hy - 12, 3, 38, Wd[1]);
    w.col(hx, hy - 12, hy + 25, Wd[2]);
    w.r(hx, hy - 14, 3, 3, M[1]);
    w.r(hx, hy + 24, 3, 3, M[1]);
  } else {
    const wx = hx + 4;
    w.r(hx + 4, hy + 1, 1, 2, Wd[1]);
    w.r(wx, hy - 28, 3, 44, Wd[1]);
    w.col(wx, hy - 28, hy + 15, Wd[2]);
    w.col(wx + 2, hy - 28, hy + 15, Wd[0]);
    w.r(wx - 1, hy - 31, 5, 4, M[1]);
    w.row(hy - 31, wx - 1, wx + 3, M[2]);
    w.r(wx, hy + 13, 3, 3, M[1]);
  }
  if (P.fx === 'slash') slashArc(c, glow);
}

/** A mage's wand with a star tip; the left hand casts. */
function drawWand(c: Ctx, M: Ramp, glow: string) {
  const { w, fx, P } = c,
    [hx, hy] = P.arms.R.hand,
    tx = hx + 10,
    ty = hy - 9;
  w.thick(hx + 2, hy + 1, tx, ty, 2, R.wood[1]);
  w.line(hx + 2, hy, tx, ty - 1, R.wood[2]);
  w.r(tx - 1, ty - 2, 4, 4, M[1]);
  w.p(tx, ty - 2, M[2]);
  fx.p(tx + 1, ty - 4, '#ffffff');
  fx.p(tx + 1, ty + 3, glow);
  fx.p(tx - 2, ty, glow);
  fx.p(tx + 4, ty, glow);
  const [lx, ly] = P.arms.L.hand,
    cx = lx + 1.5,
    cy = ly - 2;
  if (P.fx === 'charge')
    for (let a = 0; a < 360; a += 45) {
      const r = (a * Math.PI) / 180;
      fx.p(cx + 5 * Math.cos(r), cy + 5 * Math.sin(r), (a / 45 + P.f) % 2 ? glow : '#ffffff');
    }
  if (P.fx === 'burst') {
    for (let a = 0; a < 360; a += 12) {
      const r = (a * Math.PI) / 180;
      fx.p(cx + 9 * Math.cos(r), cy + 9 * Math.sin(r), glow);
      if (a % 36 === 0) fx.p(cx + 12 * Math.cos(r), cy + 12 * Math.sin(r), '#ffffff');
    }
    fx.r(cx - 1, cy - 1, 3, 3, '#ffffff');
  }
}

/** A recurve bow in the left hand; the right hand draws the string. */
function drawBow(c: Ctx, M: Ramp, glow: string) {
  const { w, fx, P } = c,
    [hx, hy] = P.arms.L.hand,
    gx = hx - 1,
    cy = hy + 2,
    STRING = '#d8dde4';
  const off = (t: number) => {
    const a = Math.abs(t);
    if (a > 16) return 5 - (a - 16);
    return Math.round(Math.pow(a / 16, 1.7) * 6);
  };
  for (let t = -18; t <= 18; t++) {
    const x = gx + off(t),
      y = cy + t,
      wd = Math.abs(t) < 14 ? 3 : 2;
    for (let i = 0; i < wd; i++) w.p(x + i, y, i === 0 ? M[2] : i === wd - 1 ? M[0] : M[1]);
  }
  for (let y = cy - 4; y <= cy + 4; y++) w.row(y, gx, gx + 2, y % 2 ? R.leather[1] : R.leather[2]);
  const sx = gx + 7,
    st = cy - 16,
    sb = cy + 16;
  if (P.ra === 'pull' && P.apexX != null) {
    const ax = P.apexX,
      ay = cy - 1;
    fx.line(sx, st, ax + 1, ay, STRING);
    fx.line(sx, sb, ax + 1, ay + 1, STRING);
    const head = gx - 4;
    w.row(ay, head + 2, ax + 2, R.wood[2]);
    w.poly(
      [
        [head - 1, ay + 0.5],
        [head + 3, ay - 2],
        [head + 3, ay + 3],
      ],
      R.silver[1],
    );
    w.row(ay - 1, ax - 2, ax + 1, M[2]);
    w.row(ay + 1, ax - 2, ax + 1, M[1]);
  } else if (P.fx === 'release') {
    for (let y = st; y <= sb; y++) fx.p(sx + (Math.abs(y - cy) < 6 ? 1 : 0), y, STRING);
    const ay = cy - 1;
    for (let x = 1; x <= 18; x++) {
      fx.p(x, ay, x < 12 ? '#ffffff' : glow);
      if (x >= 5 && x % 3) fx.p(x, ay - 2, glow);
    }
  } else {
    for (let y = st; y <= sb; y++) if (y < hy || y > hy + 3) fx.p(sx, y, STRING);
  }
}

// ---------- the hero ----------

interface HeroOpts {
  gear: Record<GearSlot, Gear>;
  classId?: ClassId;
  cape?: boolean;
}

function heroAnim(o: HeroOpts): Spec['anim'] {
  if (o.gear.weapon.tier === 0) return 'swing';
  if (o.classId === 'archer') return 'shoot';
  if (o.classId === 'mage') return 'cast';
  return 'swing';
}

export function heroSpec(o: HeroOpts): Spec {
  const { gear, classId } = o;
  const armorTier = gear.armor.tier;
  const A = armorTier === 0 ? LINEN : rampOf(gear.armor.color);
  const W = rampOf(gear.weapon.tier === 0 ? '#7a4a24' : gear.weapon.color);
  const Sh = rampOf(gear.shield.tier === 0 ? '#6e4424' : gear.shield.color);
  const glow = gear.weapon.glow ?? (gear.weapon.tier >= 3 ? W[2] : '#9fd3ff');
  const off = gear.shield.tier > 0 ? classId ?? 'warrior' : null;

  return {
    id: 'hero',
    anim: heroAnim(o),
    a: A,
    legs: armorTier >= 3 ? [mix(A[0], NIGHT, 0.4), A[0], A[1]] : ['#2e2a24', '#4a4236', '#6a5e4a'],
    glove: off === 'monk' ? Sh : undefined,
    glow,
    layers: {
      back(c) {
        if (o.cape) {
          c.l.poly(
            [
              [20, 30],
              [43, 30],
              [51, 60],
              [12, 60],
            ],
            CAPE[1],
          );
          [24, 31, 38].forEach((x) => c.l.line(x, 34, x + (x - 31) * 0.4, 59, CAPE[0]));
          c.l.row(60, 13, 50, CAPE[0]);
        }
        if (off === 'archer') {
          // quiver over the right shoulder
          c.u.poly(
            [
              [41, 26],
              [47, 24],
              [53, 44],
              [47, 46],
            ],
            R.leather[1],
          );
          c.u.line(42, 26, 48, 45, R.leather[2]);
          [
            [42, 20],
            [45, 19],
            [48, 21],
          ].forEach(([x, y]) => {
            c.u.r(x, y, 3, 5, Sh[1]);
            c.u.p(x + 1, y, Sh[2]);
          });
        }
      },
      outfit(c) {
        const { u, w, P } = c;
        for (let y = 30; y <= 47; y++) {
          const [x0, x1] = y <= 45 ? c.torsoRange(y) : [21, 42];
          u.row(y, x0, x1, A[1]);
          u.p(x0, y, A[2]);
          u.p(x1, y, A[0]);
        }
        u.row(47, 21, 42, A[0]);
        [23, 28, 33, 38].forEach((x) => u.p(x, 47, A[0]));
        u.r(30, 30, 4, 4, c.skin[1]);
        u.p(29, 30, A[0]);
        u.p(34, 30, A[0]);
        const [b0, b1] = c.torsoRange(42);
        u.row(42, b0, b1, R.leather[0]);
        u.row(43, b0, b1, R.leather[1]);
        u.r(30, 42, 4, 2, armorTier >= 4 ? R.gold[2] : R.bronze[2]);
        u.p(31, 43, R.gold[0]);
        if (armorTier >= 3) {
          // chest plate
          u.r(26, 34, 12, 7, A[2]);
          u.r(27, 35, 10, 5, A[1]);
          u.row(35, 27, 36, mix(A[2], '#ffffff', 0.3));
        }
        if (armorTier >= 4) {
          u.row(30, 24, 39, R.gold[2]);
          u.row(46, 21, 42, R.gold[1]);
        }
        if (o.cape) {
          u.r(23, 30, 3, 3, R.gold[2]);
          u.r(38, 30, 3, 3, R.gold[2]);
        }
        (['L', 'R'] as const).forEach((s) => {
          const [x, y, ww, hh] = P.arms[s].rect;
          w.r(x, y, ww, Math.min(4, hh), A[1]);
          w.row(y, x, x + ww - 1, A[2]);
        });
        if (armorTier >= 2) {
          // pauldrons
          const lx = P.fem ? 19 : 17,
            rx = P.fem ? 39 : 41;
          [lx, rx].forEach((x) => {
            u.r(x, 29, 7, 5, A[1]);
            u.row(29, x, x + 6, A[2]);
            u.row(33, x + 1, x + 6, A[0]);
          });
        }
      },
      off(c) {
        if (off === 'warrior') {
          const [hx, hy] = c.P.arms.L.hand,
            cx = hx - 2,
            cy = hy - 1;
          c.w.ellipse(cx, cy, 8, 9, Sh[0]);
          c.w.ellipse(cx, cy, 7, 8, Sh[1]);
          c.w.ellipse(cx - 1, cy - 1, 5, 6, Sh[2]);
          c.w.ellipse(cx, cy, 4.5, 5.5, Sh[1]);
          c.w.ellipse(cx, cy, 2, 2, R.gold[1]);
          c.w.p(cx - 1, cy - 1, R.gold[2]);
        }
        if (off === 'mage') {
          const [hx, hy] = c.P.arms.L.hand,
            cx = hx - 4,
            cy = hy - 6;
          c.w.ellipse(cx, cy, 3.5, 3.5, Sh[1]);
          c.w.r(cx - 2, cy - 2, 2, 2, Sh[2]);
          c.fx.p(cx + 4, cy - 4, '#ffffff');
          c.fx.p(cx - 5, cy + 3, Sh[2]);
        }
      },
      weapon(c) {
        if (gear.weapon.tier === 0) drawStick(c, glow);
        else if (classId === 'archer') drawBow(c, W, glow);
        else if (classId === 'monk') drawStaff(c, W, glow);
        else if (classId === 'mage') drawWand(c, W, glow);
        else drawSword(c, W, glow);
      },
      hands(c) {
        if (off !== 'monk') return;
        (['L', 'R'] as const).forEach((s) => {
          const [x, y] = c.P.arms[s].hand;
          c.w.r(x, y - 3, 4, 3, Sh[1]);
          c.w.row(y - 3, x, x + 3, Sh[2]);
        });
      },
    },
  };
}

function hollowEyes(g: Grid, f: number, mode: Mode): Grid {
  const p = painter(g),
    B = mode === 'idle' ? [0, 0, 2, 2][f] : 0;
  [24, 36].forEach((ex) => {
    p.r(ex, 19 + B, 4, 3, '#dc2626');
    p.r(ex + 1, 20 + B, 2, 1, '#fecaca');
  });
  return g;
}

const cache = new Map<string, string>();
function cached(key: string, build: () => string): string {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const url = build();
  cache.set(key, url);
  return url;
}

export interface HeroSheetOpts {
  gear: Record<GearSlot, Gear>;
  classId?: ClassId;
  variant?: HeroVariant;
  mode?: Mode;
  look?: Look;
}

/** A 4-frame sheet (256x64 PNG data URL) of the hero. Browser only. */
export function heroSheet({ gear, classId, variant = 'normal', mode = 'idle', look = DEFAULT_LOOK }: HeroSheetOpts): string {
  const g = (s: GearSlot) => [gear[s].tier, gear[s].color];
  const key = JSON.stringify(['hero', g('weapon'), g('armor'), g('shield'), classId, variant, mode, look]);
  return cached(key, () => {
    const spec = heroSpec({ gear, classId, cape: variant === 'best' });
    const top = (['weapon', 'armor', 'shield'] as const).reduce((m, s) => (gear[s].tier > gear[m].tier ? s : m), 'weapon' as GearSlot);
    const frames = [0, 1, 2, 3].map((f) => {
      let gr = frame(spec, look, mode, f);
      if (variant === 'echo') return tint(gr, GOLD_GHOST);
      if (variant === 'hollow') return hollowEyes(tint(gr, SHADOW), f, mode);
      if (variant === 'best') return aura(gr, CAPE, '#fde68a', 5, f);
      const t = gear[top].tier;
      if (t >= 5) gr = aura(gr, rampOf(gear[top].color), gear[top].glow ?? '#ffffff', t === 6 ? 8 : 5, f);
      return gr;
    });
    return toSheet(frames);
  });
}

// ---------- the Wanderer ----------

const HOOD: Ramp = ['#211e2c', '#3f3a52', '#5c5672', '#7a7490'];

const WANDERER: Spec = {
  id: 'wanderer',
  anim: 'swing',
  a: HOOD,
  legs: ['#15131c', '#211e2c', '#2f2b3c'],
  glove: ['#2a2638', '#4a4560', '#6a6480'],
  hideHair: true,
  layers: {
    back(c) {
      for (let y = 28; y <= 61; y++) {
        const k = (y - 28) / 33;
        c.l.row(y, Math.round(18 - 7 * k), Math.round(45 + 7 * k), HOOD[0]);
      }
    },
    outfit(c) {
      const { u, l, w, P } = c;
      for (let y = 30; y <= 45; y++) {
        u.row(y, 20, 43, HOOD[1]);
        u.p(20, y, HOOD[2]);
        u.p(43, y, HOOD[0]);
      }
      for (let y = 44; y <= 60; y++) {
        const k = (y - 44) / 16,
          x0 = Math.round(20 - 3 * k),
          x1 = Math.round(43 + 3 * k);
        l.row(y, x0, x1, HOOD[1]);
        l.p(x0, y, HOOD[2]);
      }
      l.col(31, 46, 60, HOOD[0]);
      u.row(41, 21, 42, '#8c7350');
      u.row(42, 21, 42, '#5a4630');
      u.r(33, 42, 2, 5, '#8c7350');
      (['L', 'R'] as const).forEach((s) => {
        const [x, y, ww, hh] = P.arms[s].rect;
        w.r(x - 1, y, ww + 2, hh, HOOD[1]);
        w.col(x - 1, y, y + hh - 1, HOOD[2]);
      });
    },
    head(c) {
      const { u, fxu } = c;
      u.ellipse(31.5, 17, 17, 16, HOOD[1]);
      u.poly(
        [
          [21, 7],
          [31, -1],
          [42, 7],
        ],
        HOOD[1],
      );
      u.poly(
        [
          [13, 25],
          [50, 25],
          [46, 34],
          [17, 34],
        ],
        HOOD[1],
      );
      u.ellipse(24, 10, 6, 5, HOOD[2]);
      u.ellipse(31.5, 22, 12, 10.5, HOOD[2]);
      u.ellipse(31.5, 22.5, 10.5, 9, '#0d0c13');
      fxu.r(25, 21, 3, 2, '#fbbf24');
      fxu.p(26, 21, '#fff3c4');
      fxu.r(36, 21, 3, 2, '#fbbf24');
      fxu.p(37, 21, '#fff3c4');
    },
    off(c) {
      const { w, fx, P } = c,
        [hx, hy] = P.arms.L.hand,
        I = R.iron;
      w.col(hx + 1, hy + 3, hy + 5, I[1]);
      w.r(hx - 2, hy + 5, 8, 2, I[0]);
      w.r(hx - 1, hy + 7, 6, 7, '#fbbf24');
      w.r(hx, hy + 8, 4, 5, '#fde68a');
      w.col(hx - 2, hy + 7, hy + 13, I[1]);
      w.col(hx + 5, hy + 7, hy + 13, I[1]);
      w.r(hx - 2, hy + 14, 8, 2, I[0]);
      const cx = hx + 1.5,
        cy = hy + 10;
      for (let a = 0; a < 360; a += 30) {
        const r = (a * Math.PI) / 180;
        if ((a / 30 + P.f) % 2) fx.p(cx + 9 * Math.cos(r), cy + 9 * Math.sin(r), '#b45309');
      }
      fx.p(cx, cy - 1, '#ffffff');
    },
    weapon(c) {
      const { w, P } = c,
        Wd = R.wood,
        [hx, hy] = P.arms.R.hand,
        wx = hx + 4;
      w.r(hx + 4, hy + 1, 1, 2, Wd[1]);
      w.r(wx, hy - 30, 3, 46, Wd[1]);
      w.col(wx, hy - 30, hy + 15, Wd[2]);
      w.col(wx + 2, hy - 30, hy + 15, Wd[0]);
      w.r(wx - 1, hy - 33, 5, 4, Wd[1]);
      w.row(hy - 33, wx - 1, wx + 3, Wd[2]);
    },
  },
};

export function wandererSheet(): string {
  return cached('wanderer', () => toSheet([0, 1, 2, 3].map((f) => frame(WANDERER, DEFAULT_LOOK, 'idle', f))));
}

// ---------- Ember ----------

const FLAME = { red: ['#7f1d1d', '#dc2626', '#f87171'], orange: ['#9a3412', '#f97316', '#fdba74'], yellow: '#fde047', core: '#fff7ed' };

function emberFrame(f: number): Grid {
  const g = grid(S),
    p = painter(g),
    sway = [0, 2, 0, -2][f],
    cx = 32,
    cy = 42,
    lift = f % 2;
  p.ellipse(cx, cy, 15, 14 - lift, FLAME.red[1]);
  p.poly(
    [
      [cx - 14, cy - 3],
      [cx + 14, cy - 3],
      [cx + 7 + sway, cy - 20],
      [cx + sway, cy - 32 + lift],
      [cx - 6 + sway, cy - 22],
    ],
    FLAME.red[1],
  );
  p.poly(
    [
      [cx - 15, cy - 1],
      [cx - 10, cy - 8],
      [cx - 18 + sway / 2, cy - 17],
    ],
    FLAME.red[1],
  );
  p.poly(
    [
      [cx + 15, cy - 1],
      [cx + 10, cy - 8],
      [cx + 19 + sway / 2, cy - 15],
    ],
    FLAME.red[1],
  );
  p.ellipse(cx, cy + 1, 12, 11.5, FLAME.orange[1]);
  p.poly(
    [
      [cx - 11, cy - 1],
      [cx + 11, cy - 1],
      [cx + 4 + sway, cy - 16],
      [cx + sway, cy - 24 + lift],
      [cx - 4 + sway, cy - 17],
    ],
    FLAME.orange[1],
  );
  p.ellipse(cx, cy + 2, 9, 9, FLAME.yellow);
  p.poly(
    [
      [cx - 8, cy],
      [cx + 8, cy],
      [cx + sway / 2, cy - 14],
    ],
    FLAME.yellow,
  );
  p.ellipse(cx, cy + 3, 7, 6.5, FLAME.core);
  const shaded = outline(autoshade(g)),
    face = painter(shaded),
    eye = '#3b1d0e';
  face.r(cx - 5, cy, 3, 4, eye);
  face.p(cx - 4, cy, '#ffffff');
  face.r(cx + 3, cy, 3, 4, eye);
  face.p(cx + 4, cy, '#ffffff');
  face.p(cx - 2, cy + 5, eye);
  face.row(cy + 6, cx - 1, cx + 1, eye);
  face.p(cx + 2, cy + 5, eye);
  face.r(cx - 8, cy + 4, 2, 1, '#fb7185');
  face.r(cx + 7, cy + 4, 2, 1, '#fb7185');
  [
    [cx - 10, cy - 28 - f * 2],
    [cx + 12, cy - 24 - ((f + 2) % 4) * 2],
    [cx + 3, cy - 36 - ((f + 1) % 4)],
  ].forEach(([x, y]) => {
    face.p(x, y, FLAME.yellow);
    face.p(x, y + 1, FLAME.orange[1]);
  });
  return shaded;
}

export function emberSheet(): string {
  return cached('ember', () => toSheet([0, 1, 2, 3].map(emberFrame)));
}
