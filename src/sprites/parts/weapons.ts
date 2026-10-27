import { SIZE as S, type Ctx } from '../engine/figure';
import type { Ramp } from '../engine/grid';
import { R } from '../palette';

/* Weapons, drawn per frame from the hand positions in the pose. Each one reads the arm
   position (P.right / P.left) and the frame's effect (P.fx). */

/** What a worn Fog item adds to its weapon (src/sprites/characters/items.ts colors): the trim for
    the hilt and fittings, the gem, and for a legendary the light that runs along it. Left out, a
    weapon is drawn as the forge's tiers always were. */
export interface WeaponLook {
  trim: Ramp;
  gem: Ramp;
  /** A legendary's glow: the blade's core, the bow's string, the orb's and star's light. */
  shine?: string;
}

/** A sword drawn by sampling a rotated frame: grip in the hand at (gx, gy), blade along (dx, dy). */
function sword(c: Ctx, gx: number, gy: number, dx: number, dy: number, len: number, M: Ramp, look?: WeaponLook) {
  const al = Math.hypot(dx, dy),
    ax = dx / al,
    ay = dy / al,
    nx = ay,
    ny = -ax,
    lit = -nx - ny > 0 ? 1 : -1,
    hilt = look?.trim ?? R.gold;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const ox = x - gx,
        oy = y - gy,
        s = ox * ax + oy * ay,
        t = ox * nx + oy * ny,
        side = t * lit;
      if (s >= -6 && s < -3.5 && Math.abs(t) <= 1.6) c.w.p(x, y, hilt[2]);
      else if (s >= -3.5 && s < 3 && Math.abs(t) <= 1.1) c.w.p(x, y, R.leather[Math.round(s) % 2 ? 1 : 2]);
      else if (s >= 3 && s <= 5 && Math.abs(t) <= 5) c.w.p(x, y, Math.abs(t) < 1.2 ? (look ? look.gem[1] : hilt[2]) : hilt[1]);
      else if (s > 5 && s <= len) {
        const hw = 1.8 * Math.min(1, (len - s) / 4) + 0.3;
        if (Math.abs(t) <= hw) c.w.p(x, y, side > 0.6 ? M[2] : side < -0.6 ? M[0] : M[1]);
        // a legendary's blade burns down its middle, a spark running up it
        if (look?.shine && Math.abs(t) < 0.6 && s > 7 && s < len - 1) c.fx.p(x, y, (Math.round(s) + c.P.f * 3) % 7 === 0 ? '#ffffff' : look.shine);
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

export function drawSword(c: Ctx, M: Ramp, glow: string, x?: WeaponLook) {
  const [hx, hy] = c.P.arms.R.hand,
    gx = hx + 1.5,
    gy = hy + 1.5;
  if (c.P.right === 'up') sword(c, gx, gy, 0.8, -0.6, 20, M, x);
  else if (c.P.right === 'fwd') sword(c, gx, gy, 0.2, 1, 20, M, x);
  else sword(c, gx, gy, 0.25, -1, 26, M, x);
  if (c.P.fx === 'slash') slashArc(c, glow);
}

/** The Adventurer's wooden stick, for a hero with no weapon yet. */
export function drawStick(c: Ctx, glow: string) {
  const { w, P } = c,
    Wd = R.wood,
    [hx, hy] = P.arms.R.hand;
  if (P.right === 'up') {
    w.thick(hx + 3, hy + 2, hx + 18, hy - 13, 3, Wd[1]);
    w.line(hx + 3, hy + 1, hx + 18, hy - 14, Wd[2]);
  } else if (P.right === 'fwd') {
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
export function drawStaff(c: Ctx, M: Ramp, glow: string, x?: WeaponLook) {
  const { w, P } = c,
    Wd = R.wood,
    [hx, hy] = P.arms.R.hand;
  if (P.right === 'up') {
    w.thick(hx - 8, hy + 13, hx + 18, hy - 13, 3, Wd[1]);
    w.line(hx - 8, hy + 12, hx + 18, hy - 14, Wd[2]);
    w.thick(hx + 15, hy - 10, hx + 19, hy - 14, 3, M[1]);
    w.thick(hx - 9, hy + 13, hx - 6, hy + 10, 3, M[1]);
  } else if (P.right === 'fwd') {
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
    if (x) {
      // the item's gem set in the head, prongs of trim around it
      w.ellipse(wx + 1, hy - 34, 2.6, 2.6, x.gem[1]);
      w.r(wx, hy - 35, 1, 1, x.gem[2]);
      w.p(wx - 2, hy - 33, M[1]);
      w.p(wx + 4, hy - 33, M[1]);
      if (x.shine) {
        const on = P.f % 2 ? x.shine : '#ffffff';
        [[wx + 1, hy - 39], [wx - 3, hy - 35], [wx + 5, hy - 35]].forEach(([a, b]) => c.fx.p(a, b, on));
        c.fx.p(wx, hy - 35, '#ffffff');
      }
    }
  }
  if (P.fx === 'slash') slashArc(c, glow);
}

/** A mage's wand with a star tip; the left hand casts. */
export function drawWand(c: Ctx, M: Ramp, glow: string, x?: WeaponLook) {
  const { w, fx, P } = c,
    [hx, hy] = P.arms.R.hand,
    tx = hx + 10,
    ty = hy - 9;
  w.thick(hx + 2, hy + 1, tx, ty, 2, R.wood[1]);
  w.line(hx + 2, hy, tx, ty - 1, R.wood[2]);
  if (x) {
    w.r(tx - 2, ty + 1, 3, 2, x.trim[1]);
    w.p(tx - 2, ty + 1, x.trim[2]);
  }
  w.r(tx - 1, ty - 2, 4, 4, M[1]);
  w.p(tx, ty - 2, M[2]);
  if (x?.shine) {
    // a legendary wand's star
    const k = P.f % 2 ? 3 : 4;
    for (let i = 2; i <= k; i++) [[tx + 1, ty - 2 - i], [tx + 1, ty + 1 + i], [tx - 1 - i, ty], [tx + 2 + i, ty]].forEach(([a, b]) => fx.p(a, b, i === k ? x.shine! : '#ffffff'));
  }
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
export function drawBow(c: Ctx, M: Ramp, glow: string, x?: WeaponLook) {
  const { w, fx, P } = c,
    [hx, hy] = P.arms.L.hand,
    gx = hx - 1,
    cy = hy + 2,
    STRING = x?.shine ?? '#d8dde4';
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
  if (x) {
    // trim on the tips and a gem in the grip
    [-18, -17, 17, 18].forEach((t) => w.row(cy + t, gx + off(t), gx + off(t) + 1, x.trim[Math.abs(t) === 18 ? 2 : 1]));
    w.r(gx, cy - 1, 3, 2, x.gem[1]);
    w.p(gx, cy - 1, x.gem[2]);
  }
  const sx = gx + 7,
    st = cy - 16,
    sb = cy + 16;
  if (P.right === 'pull' && P.drawX != null) {
    const ax = P.drawX,
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
