import type { ClassId, Gear, GearSlot } from '@/lib/gear';
import type { ClipFrame, ClipId } from '../clips';
import { drawFigure, type FigureSpec, type Look } from '../engine/figure';
import { NIGHT, aura, mix, painter, rampOf, tint, type Grid } from '../engine/grid';
import { drawBow, drawStaff, drawStick, drawSword, drawWand } from '../parts/weapons';
import { CAPE, GOLD_GHOST, HOLLOW_EYES, LINEN, R, SHADOW, TROUSERS } from '../palette';

/* Your hero. One sprite carries the whole story: gear colors and class weapons as you train, and
   the variants the story needs (the gold Echo, the Best Self, the Hollow). */

export type HeroVariant = 'normal' | 'echo' | 'best' | 'hollow';

export interface HeroOpts {
  gear: Record<GearSlot, Gear>;
  classId?: ClassId;
  variant?: HeroVariant;
  look?: Look;
}

export const DEFAULT_LOOK: Look = { sex: 'm', style: 'spiky', hair: 'brown', skin: 'light' };

/** The clip each class attacks with. Until you hold a real weapon, everyone swings a stick. */
export function heroAttack(gear: Record<GearSlot, Gear>, classId?: ClassId): ClipId {
  if (gear.weapon.tier === 0) return 'swing';
  if (classId === 'archer') return 'shoot';
  if (classId === 'mage') return 'cast';
  return 'swing';
}

export function heroSpec({ gear, classId, variant }: HeroOpts): FigureSpec {
  const cape = variant === 'best';
  const armorTier = gear.armor.tier;
  const A = armorTier === 0 ? LINEN : rampOf(gear.armor.color);
  const W = rampOf(gear.weapon.tier === 0 ? R.wood[1] : gear.weapon.color);
  const Sh = rampOf(gear.shield.tier === 0 ? R.leather[1] : gear.shield.color);
  const glow = gear.weapon.glow ?? (gear.weapon.tier >= 3 ? W[2] : '#9fd3ff');
  const off = gear.shield.tier > 0 ? classId ?? 'warrior' : null;
  const attack = heroAttack(gear, classId);

  return {
    id: 'hero',
    attack,
    stance: attack === 'shoot' ? { left: 'out' } : undefined,
    a: A,
    legs: armorTier >= 3 ? [mix(A[0], NIGHT, 0.4), A[0], A[1]] : TROUSERS,
    glove: off === 'monk' ? Sh : undefined,
    glow,
    layers: {
      back(c) {
        if (cape) {
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
        if (cape) {
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

/** The Hollow's red eyes, painted over the tinted face. */
function hollowEyes(g: Grid, frame: ClipFrame): Grid {
  const p = painter(g),
    bob = (frame.bob ?? 0) * 2;
  [24, 36].forEach((ex) => {
    p.r(ex, 19 + bob, 4, 3, HOLLOW_EYES.glow);
    p.r(ex + 1, 20 + bob, 2, 1, HOLLOW_EYES.core);
  });
  return g;
}

/** One frame of the hero, variant effects included. */
export function drawHero(o: HeroOpts, frame: ClipFrame, f: number): Grid {
  const { gear, variant = 'normal', look = DEFAULT_LOOK } = o;
  const gr = drawFigure(heroSpec(o), look, frame, f);
  if (variant === 'echo') return tint(gr, GOLD_GHOST);
  if (variant === 'hollow') return hollowEyes(tint(gr, SHADOW), frame);
  if (variant === 'best') return aura(gr, CAPE, '#fde68a', 5, f);
  // Top-tier gear glows: the highest slot sets the aura.
  const top = (['weapon', 'armor', 'shield'] as const).reduce((m, s) => (gear[s].tier > gear[m].tier ? s : m), 'weapon' as GearSlot);
  const t = gear[top].tier;
  return t >= 5 ? aura(gr, rampOf(gear[top].color), gear[top].glow ?? '#ffffff', t === 6 ? 8 : 5, f) : gr;
}

export function heroLabel({ gear, variant }: HeroOpts): string {
  if (variant === 'echo') return 'The Echo, the ghost of who you were';
  if (variant === 'hollow') return 'The Hollow, your shadow';
  return `Hero with ${gear.weapon.name}, ${gear.armor.name} and ${gear.shield.name}`;
}
