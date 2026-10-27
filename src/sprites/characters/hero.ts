import type { ClassId, Gear, GearSlot } from '@/lib/gear';
import type { ClipFrame, ClipId } from '../clips';
import { HAIRSTYLES, drawFigure, eyeBoxes, type Ctx, type FigureSpec, type Look } from '../engine/figure';
import { NIGHT, aura, grid, mix, painter, rampOf, tint, type Grid, type Ramp } from '../engine/grid';
import { ARM_DOWN, bone, hangs, limbs, paintArm } from '../engine/drawn';
import { drawBow, drawStaff, drawStick, drawSword, drawWand, type WeaponLook } from '../parts/weapons';
import { itemColors, pick, type ItemColors } from './items';
import { CAPE, FLAME, GOLD_GHOST, HAIR, HOLLOW_EYES, LINEN, R, SHADOW, SKIN, TROUSERS } from '../palette';

/* Your hero. One sprite carries the whole story: gear colors and class weapons as you train, and
   the variants the story needs (the gold Echo, the Best Self, the Hollow, and you with the flame
   inside, once it has fused with you in the finale). */

export type HeroVariant = 'normal' | 'echo' | 'best' | 'hollow' | 'kindled';

export interface HeroOpts {
  gear: Record<GearSlot, Gear>;
  classId?: ClassId;
  variant?: HeroVariant;
  look?: Look;
  /** The hand-drawn body (engine/drawn.ts) by default; 'block' is the old body, kept for the Lab. */
  body?: 'block' | 'drawn';
  /** 'nostale': an option tried in the Lab: the soft face, class headgear, brighter colors. */
  style?: 'nostale';
}

export const DEFAULT_LOOK: Look = { sex: 'm', style: 'spiky', hair: 'brown', skin: 'light', head: 'manga' };

/** What picking boy or girl before the opening gives you. The rest is changed after it. */
export const STARTER_LOOKS: Record<Look['sex'], Look> = {
  m: DEFAULT_LOOK,
  f: { sex: 'f', style: 'long', hair: 'brown', skin: 'light', head: 'manga' },
};

/** A saved look made safe to draw: anything missing or unknown falls back to the starter look. */
export function normalizeLook(look?: Partial<Look> | null): Look {
  const base = STARTER_LOOKS[look?.sex === 'f' ? 'f' : 'm'];
  if (!look) return base;
  return {
    sex: base.sex,
    style: look.style && look.style in HAIRSTYLES ? look.style : base.style,
    hair: look.hair && look.hair in HAIR ? look.hair : base.hair,
    skin: look.skin && look.skin in SKIN ? look.skin : base.skin,
    head: look.head === 'classic' ? 'classic' : 'manga',
  };
}

/** The clip each class attacks with. Until you hold a real weapon, everyone swings a stick. */
export function heroAttack(gear: Record<GearSlot, Gear>, classId?: ClassId): ClipId {
  if (gear.weapon.tier === 0) return 'swing';
  if (classId === 'archer') return 'shoot';
  if (classId === 'mage') return 'cast';
  return 'swing';
}

/** What a worn item gives its weapon: trim, gem, and a legendary's light. */
const weaponLook = (c: ItemColors | null, legend: boolean): WeaponLook | undefined => (c ? { trim: c.trim, gem: c.gem, shine: legend && c.glow ? c.glow[1] : undefined } : undefined);
/** Cloth wraps on the wrists, dark to light. */
const WRAP: Ramp = ['#8c7a5e', '#cbbb9a', '#ece2cc'];
/** The starter's cloth sash. */
const SASH: Ramp = ['#7a1f18', '#c0392b', '#e8604c'];
const ramp3 = (r: string[]): Ramp => [r[0], r[1], r[2]];

export function heroSpec({ gear, classId, variant, body, style }: HeroOpts): FigureSpec {
  const drawn = body !== 'block';
  const cape = variant === 'best';
  const armorTier = gear.armor.tier;
  // A Fog item worn in a slot dresses the hero in that very item (its kind, rarity and colors);
  // without one, the slot shows the forge's old tier look.
  const ia = gear.armor.item,
    iw = gear.weapon.item,
    ic = gear.shield.item,
    ac = ia ? itemColors(ia) : null,
    wc = iw ? itemColors(iw) : null,
    cc = ic ? itemColors(ic) : null,
    dress = ia && (ia.art === 'heavy' || ia.art === 'light' || ia.art === 'robe') ? ia.art : null,
    trimmed = !!ia && (ia.rarity === 'rare' || ia.rarity === 'legendary'),
    armorLegend = ia?.rarity === 'legendary',
    weaponLegend = iw?.rarity === 'legendary';
  const A = ac ? ramp3(ac.body) : armorTier === 0 ? LINEN : rampOf(gear.armor.color);
  const W = wc ? (classId === 'archer' ? wc.handle : classId === 'monk' ? wc.trim : classId === 'mage' ? wc.gem : ramp3(wc.body)) : rampOf(gear.weapon.tier === 0 ? R.wood[1] : gear.weapon.color);
  const Sh = rampOf(gear.shield.tier === 0 ? R.leather[1] : gear.shield.color);
  const glow = wc?.glow ? wc.glow[1] : gear.weapon.glow ?? (gear.weapon.tier >= 3 ? W[2] : '#9fd3ff');
  const off = gear.shield.tier > 0 ? classId ?? 'warrior' : null;
  const attack = heroAttack(gear, classId);
  const wl = weaponLook(wc, weaponLegend);
  const legs = dress === 'heavy' ? [mix(A[0], NIGHT, 0.4), A[0], A[1]] : dress ? TROUSERS : armorTier >= 3 ? [mix(A[0], NIGHT, 0.4), A[0], A[1]] : TROUSERS;
  const T = ac?.trim ?? R.gold,
    acc = ac?.accent ?? R.red;

  return {
    id: 'hero',
    attack,
    stance: attack === 'shoot' ? { left: 'out' } : undefined,
    a: A,
    legs,
    glove: off === 'monk' ? Sh : undefined,
    glow,
    drawn,
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
        if (armorLegend && dress !== 'robe' && !cape) {
          // a legendary armor's mantle, in its accent, lifting a little with each frame
          const sw = c.P.f % 2;
          c.u.poly(
            [
              [21, 30],
              [42, 30],
              [47 + sw, 52],
              [16 - sw, 52],
            ],
            acc[1],
          );
          [24, 31, 38].forEach((x) => c.u.line(x, 33, x + (x - 31) * 0.3, 51, acc[0]));
          c.u.row(52, 17 - sw, 46 + sw, T[1]);
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
        tailor(c, A, dress, drawn);
        if (dress !== 'robe' && !drawn) trousers(c, legs);
        u.r(30, 30, 4, 4, c.skin[1]);
        u.row(30, 30, 33, c.skin[0]); // the chin's shadow on the neck
        u.p(29, 30, A[0]);
        u.p(34, 30, A[0]);
        const [b0, b1] = c.torsoRange(42);
        if (dress) itemOutfit(c, dress, A, T, acc, trimmed, armorLegend, ac, ia?.seed ?? 0);
        else if (armorTier === 0) {
          // the starter's training top: one side wrapped over the other, tied with a cloth sash
          u.line(26, 31, 33, 41, A[0]);
          u.line(27, 31, 34, 41, A[2]);
          u.row(42, b0, b1, SASH[1]);
          u.row(43, b0, b1, SASH[0]);
          u.r(27, 42, 3, 2, SASH[2]);
          u.line(27, 44, 26, 47, SASH[1]);
          u.line(29, 44, 29, 47, SASH[0]);
        } else {
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
        }
        if (!dress) {
          // a pouch on the belt, over the far hip
          u.r(37, 43, 4, 4, R.leather[1]);
          u.row(43, 37, 40, R.leather[2]);
          u.p(38, 44, R.gold[1]);
        }
        if (cape) {
          u.r(23, 30, 3, 3, R.gold[2]);
          u.r(38, 30, 3, 3, R.gold[2]);
        }
        if (drawn)
          // sleeves follow the bent arms: the upper arm, or the whole arm in a robe
          (['L', 'R'] as const).forEach((s) => {
            const edge = mix(A[0], NIGHT, 0.45);
            if (hangs(P, s)) {
              // the hand-drawn arm: its sleeve in the armor's colors, wraps at the wrist
              const robe = dress === 'robe',
                wrap = dress !== 'heavy' && !robe;
              const sleeve: Record<string, string> = { U: A[2], S: A[1], s: A[0], o: edge, K: A[1], k: A[0], x: edge };
              return paintArm(c.u, P, s, (ch, j) => {
                if ('USso'.includes(ch)) return sleeve[ch];
                if (robe) return j === ARM_DOWN.length - 2 && trimmed ? T[1] : sleeve[ch];
                if (wrap && (j === 9 || j === 10) && ch !== 'x') return j === 9 ? WRAP[2] : WRAP[1];
                return null;
              });
            }
            const { s: a, e, h } = limbs(P)[s],
              g = c.w;
            const sleeve = grid(64);
            // a dark edge first, so the sleeve reads apart from the shirt behind it
            bone(sleeve, a, e, 6, edge);
            if (dress === 'robe') bone(sleeve, e, h, 6, edge);
            bone(sleeve, a, e, 4, A[1]);
            if (dress === 'robe') bone(sleeve, e, h, 4, A[1]);
            // a fighter's cloth wraps round the wrists, just above the hand
            else if (dress !== 'heavy') {
              const k = (t: number): [number, number] => [Math.round(e[0] + (h[0] - e[0]) * t), Math.round(e[1] + (h[1] - e[1]) * t)];
              bone(sleeve, k(0.55), k(0.8), 3, WRAP[2]);
            }
            sleeve.forEach((row, y) => row.forEach((col, x) => col && g.p(x, y, col)));
            const [cx, cy] = dress === 'robe' ? h : e;
            g.p(cx, cy, dress === 'robe' && trimmed ? T[1] : A[0]);
          });
        else (['L', 'R'] as const).forEach((s) => {
          const [x, y, ww, hh] = P.arms[s].rect,
            tall = hh > ww,
            // a robe's sleeves reach the wrists; other sleeves stop above the elbow
            sh = dress === 'robe' ? Math.max(4, hh - 2) : tall ? Math.min(6, hh) : Math.min(4, hh);
          w.r(x, y, ww, sh, A[1]);
          w.row(y, x, x + ww - 1, A[2]);
          if (tall) {
            // the sleeve's far side in shadow, a cuff, and the forearm shaded the same way
            w.col(x + ww - 1, y + 1, y + sh - 1, A[0]);
            w.row(y + sh - 1, x, x + ww - 1, dress === 'robe' && trimmed ? T[1] : A[0]);
            if (sh < hh) {
              w.r(x, y + sh, ww, hh - sh, c.skin[1]);
              w.col(x + ww - 1, y + sh, y + hh - 1, c.skin[0]);
              // a fighter's cloth wraps round the wrists
              if (dress !== 'heavy')
                for (let j = y + sh + 2; j < y + hh; j++) {
                  w.row(j, x, x + ww - 1, j % 2 ? WRAP[1] : WRAP[2]);
                  w.p(x + ww - 1, j, WRAP[0]);
                }
            }
          } else w.row(y + sh - 1, x, x + ww - 1, dress === 'robe' && trimmed ? T[1] : A[0]);
        });
        if (dress === 'heavy' || (!dress && armorTier >= 2)) {
          // pauldrons
          const lx = P.fem ? 19 : 17,
            rx = P.fem ? 39 : 41;
          [lx, rx].forEach((x) => {
            u.r(x, 29, 7, 5, A[1]);
            u.row(29, x, x + 6, A[2]);
            u.row(33, x + 1, x + 6, dress && trimmed ? T[1] : A[0]);
            // rivets
            u.p(x + 1, 31, mix(A[2], '#ffffff', 0.5));
            u.p(x + 5, 31, A[0]);
            if (dress && armorLegend) {
              // a legendary plate's pauldrons rise to points
              u.r(x + (x < 30 ? 0 : 5), 26, 2, 3, T[1]);
              u.p(x + (x < 30 ? 0 : 6), 25, T[2]);
            }
          });
        }
        if (cc) {
          // the charm, worn on a cord at the chest
          u.line(28, 31, 31, 35, cc.trim[1]);
          u.line(35, 31, 32, 35, cc.trim[0]);
          u.r(31, 35, 2, 2, cc.gem[1]);
          u.p(31, 35, cc.gem[2]);
          if (ic?.rarity === 'legendary' && cc.glow) c.fxu.p(P.f % 2 ? 30 : 33, 34, P.f % 4 < 2 ? '#ffffff' : cc.glow[1]);
        }
      },
      head(c) {
        if (style === 'nostale' && variant !== 'hollow') headgear(c, classId, gear.weapon.tier === 0 ? undefined : T);
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
          c.w.ellipse(cx, cy, 2, 2, cc ? cc.gem[1] : R.gold[1]);
          c.w.p(cx - 1, cy - 1, cc ? cc.gem[2] : R.gold[2]);
        }
        if (off === 'mage') {
          const [hx, hy] = c.P.arms.L.hand,
            cx = hx - 4,
            cy = hy - 6;
          c.w.ellipse(cx, cy, 3.5, 3.5, cc ? cc.gem[1] : Sh[1]);
          c.w.r(cx - 2, cy - 2, 2, 2, cc ? cc.gem[2] : Sh[2]);
          c.fx.p(cx + 4, cy - 4, '#ffffff');
          c.fx.p(cx - 5, cy + 3, cc ? cc.gem[2] : Sh[2]);
        }
      },
      weapon(c) {
        if (gear.weapon.tier === 0) drawStick(c, glow);
        else if (classId === 'archer') drawBow(c, W, glow, wl);
        else if (classId === 'monk') drawStaff(c, W, glow, wl);
        else if (classId === 'mage') drawWand(c, W, glow, wl);
        else drawSword(c, W, glow, wl);
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

/** Folds and light on the shirt under any armor: sloped shoulders, a collar, shadow down the far
    side and under the chest, and the cloth pulled in where the belt holds it. */
function tailor(c: Ctx, A: Ramp, dress: 'heavy' | 'light' | 'robe' | null, drawn = false) {
  const { u, P } = c,
    soft = mix(A[1], A[0], 0.45),
    lit = mix(A[1], A[2], 0.5),
    [x0, x1] = c.torsoRange(31);
  u.erase(x0, 30);
  u.erase(x1, 30);
  for (let y = 31; y <= 41; y++) {
    const [a0, b0] = c.torsoRange(y),
      // the chest is broad and the waist narrows above the belt
      pinch = P.fem || drawn ? 0 : y >= 38 ? 2 : y === 37 ? 1 : 0,
      a = a0 + pinch,
      b = b0 - pinch;
    for (let k = 0; k < pinch; k++) {
      u.erase(a0 + k, y);
      u.erase(b0 - k, y);
    }
    // cel shading: a band of shadow down the far side that widens toward the waist
    const band = 2 + Math.floor((y - 31) / 4);
    u.row(y, b - band, b - 1, soft);
    u.p(b, y, A[0]);
    u.p(b - band - 1, y, y % 2 ? soft : A[1]);
    if (y <= 37) u.p(a + 1, y, lit);
    u.p(a, y, A[2]);
  }
  u.row(41, x0 + 4, x1 - 6, soft);
  [
    [27, 40],
    [28, 41],
    [35, 40],
    [34, 41],
  ].forEach(([x, y]) => u.p(x, y, A[0]));
  if (dress === 'heavy' || dress === 'robe') return;
  // a V collar: two lit flaps, and the neck showing down to the chest
  u.p(28, 30, A[2]);
  u.p(29, 31, A[2]);
  u.p(35, 30, A[2]);
  u.p(34, 31, A[2]);
  u.row(34, 31, 32, c.skin[0]);
  u.p(30, 34, A[0]);
  u.p(33, 34, A[0]);
}

/** Trousers and boots with their folds: a lit knee, a crease, a cuff over the boot, and boots with a
    turned-down top, a shine on the toe and a dark sole. The lifted foot rides up mid-step. */
function trousers(c: Ctx, L: Ramp) {
  const { l, P } = c,
    lit = mix(L[1], L[2], 0.5),
    Bt = R.leather,
    sole = mix(Bt[0], NIGHT, 0.4);
  [24, 34].forEach((x, i) => {
    const up = P.step === (i === 0 ? -1 : 1) ? 4 : 0,
      end = 57 - up;
    l.r(x, 48, 6, end - 47, L[1]);
    l.col(x + 5, 48, end, L[0]);
    l.col(x, 48, end, i === 0 ? L[2] : L[1]);
    l.r(x + 1, 51 - up / 2, 2, 2, lit);
    l.p(x + 3, 54 - up / 2, L[0]);
    l.row(end, x, x + 5, L[0]);
    const bx = x - 2 + i * 2,
      by = 58 - up;
    l.r(bx, by, 8, 4, Bt[1]);
    l.row(by, bx, bx + 7, Bt[2]);
    l.row(by + 1, bx, bx + 7, Bt[0]);
    l.p(i === 0 ? bx + 1 : bx + 6, by + 2, Bt[2]);
    l.row(by + 3, bx, bx + 7, sole);
  });
}

/** The torso of a worn Fog armor: plate, a laced jerkin, or a robe with its skirt over the legs. */
function itemOutfit(c: Ctx, dress: 'heavy' | 'light' | 'robe', A: Ramp, T: Ramp, acc: Ramp, trimmed: boolean, legend: boolean, ac: ItemColors | null, seed: number) {
  const { u, l, P } = c,
    [b0, b1] = c.torsoRange(42),
    gem = ac?.gem ?? R.red,
    shine = ac?.glow?.[1] ?? '#ffffff';
  if (dress === 'heavy') {
    // breastplate with a ridge, a belt, and tassets over the hips
    u.r(25, 33, 14, 9, A[2]);
    u.r(26, 34, 12, 7, A[1]);
    u.col(31, 33, 41, mix(A[2], '#ffffff', 0.35));
    u.col(32, 33, 41, A[2]);
    u.row(34, 26, 30, mix(A[2], '#ffffff', 0.3));
    u.row(42, b0, b1, R.leather[0]);
    u.row(43, b0, b1, R.leather[1]);
    u.r(30, 42, 4, 2, T[2]);
    for (let y = 44; y <= 47; y++) u.row(y, 22, 41, y % 2 ? A[0] : A[1]);
    // a cloth tabard in the accent color hangs from the belt over the legs
    u.r(29, 44, 6, 4, acc[1]);
    l.r(29, 48, 6, 5, acc[1]);
    l.col(34, 44, 52, acc[0]);
    l.row(52, 29, 34, trimmed ? T[1] : acc[0]);
    l.p(31, 53, acc[0]);
    l.p(32, 53, acc[0]);
    if (trimmed) {
      u.row(30, 24, 39, T[2]);
      u.row(47, 21, 42, T[1]);
      u.col(25, 33, 41, T[1]);
      u.col(38, 33, 41, T[0]);
    }
    if (legend) {
      // a glowing heart stone in the chest
      u.r(30, 36, 4, 3, gem[1]);
      u.row(36, 30, 31, gem[2]);
      c.fxu.p(30 + (P.f % 2) * 3, 35, P.f % 4 < 2 ? '#ffffff' : shine);
    } else {
      // the emblem on the plate, the same one the item's art shows
      const e = pick(seed, 4, 12);
      if (e === 1) {
        u.p(31, 36, T[2]);
        u.row(37, 30, 33, T[1]);
        u.p(32, 38, T[0]);
      } else if (e === 2) {
        u.col(31, 35, 39, T[1]);
        u.row(36, 29, 33, T[1]);
      } else if (e === 3) {
        u.r(30, 36, 4, 2, T[1]);
        [[29, 35], [34, 35], [29, 38], [34, 38]].forEach(([x, y]) => u.p(x, y, T[2]));
      }
    }
    return;
  }
  if (dress === 'light') {
    // a jerkin: lacing down the front, a strap across, a belt with a buckle
    for (let y = 32; y <= 41; y++) {
      u.p(31, y, y % 2 ? acc[1] : A[0]);
      u.p(32, y, y % 2 ? A[0] : acc[1]);
    }
    u.line(24, 31, 39, 41, R.leather[0]);
    u.line(25, 31, 40, 41, R.leather[1]);
    // studs down the strap
    [27, 30, 33, 36].forEach((x) => u.p(x, 31 + Math.round(((x - 24) * 10) / 15), T[1]));
    u.row(42, b0, b1, R.leather[0]);
    u.row(43, b0, b1, R.leather[1]);
    u.r(30, 42, 4, 2, T[2]);
    u.p(31, 43, T[0]);
    u.r(24, 44, 3, 3, R.leather[1]);
    if (trimmed) {
      u.row(30, 24, 39, T[1]);
      u.row(47, 21, 42, T[1]);
    }
    if (legend) {
      // a scarf at the neck
      u.row(30, 25, 38, acc[1]);
      u.row(31, 26, 37, acc[0]);
      u.r(36, 31, 3, 6, acc[1]);
      u.col(38, 31, 36, acc[0]);
    }
    return;
  }
  // robe: a cowl at the shoulders, a sash, and the skirt to the ankles
  u.row(30, 24, 39, A[2]);
  u.row(31, 23, 40, A[1]);
  u.row(42, b0, b1, acc[0]);
  u.row(43, b0, b1, acc[1]);
  u.r(29, 42, 2, 5, acc[1]);
  u.col(30, 44, 47, acc[0]);
  for (let y = 46; y <= 57; y++) {
    const k = Math.floor((y - 46) / 4),
      x0 = 21 - k,
      x1 = 42 + k;
    l.row(y, x0, x1, A[1]);
    l.p(x0, y, A[2]);
    l.p(x1, y, A[0]);
    l.p(32, y, A[0]);
  }
  l.row(57, 18, 45, trimmed ? T[1] : A[0]);
  // the skirt falls in folds
  l.line(27, 47, 24, 56, A[0]);
  l.line(37, 47, 40, 56, A[0]);
  l.line(26, 48, 23, 55, A[2]);
  if (trimmed) {
    u.col(32, 32, 41, T[1]);
    l.col(32, 46, 56, T[1]);
  }
  if (legend) {
    // stars woven in the cloth, twinkling in turn
    const stars: [number, number][] = [[25, 36], [37, 34], [27, 50], [38, 53], [23, 55], [35, 48]];
    stars.forEach(([x, y], i) => c.fx.p(x, y + (y < 46 ? P.bob : 0), (i + P.f) % 3 === 0 ? '#ffffff' : shine));
  }
}

/** Each class's headgear, for the NosTale-like style: the warrior's winged brow guard, the
    archer's cap with a feather, the monk's headband with tails, the mage's tall pointed hat. */
function headgear(c: Ctx, classId: ClassId | undefined, trim: Ramp | undefined) {
  const { u, P } = c,
    T = trim ?? R.gold,
    sw = P.f % 2;
  if (classId === 'warrior') {
    const M = R.silver;
    u.r(18, 9, 29, 3, M[1]);
    u.row(9, 18, 46, M[2]);
    u.row(11, 18, 46, M[0]);
    u.r(31, 8, 3, 4, T[1]);
    u.p(32, 9, '#e8604c');
    // little wings at the temples
    u.poly([[18, 9], [12, 3], [14, 8], [10, 6], [16, 11]], M[2]);
    u.poly([[46, 9], [52, 3], [50, 8], [54, 6], [48, 11]], M[2]);
    return;
  }
  if (classId === 'archer') {
    const G = ['#1f5130', '#2f7d4a', '#5fb877'];
    u.ellipse(31, 7, 14, 6, G[1]);
    u.poly([[18, 7], [44, 7], [47, 10], [16, 10]], G[0]);
    u.row(10, 16, 47, G[0]);
    u.ellipse(27, 4, 6, 2, G[2]);
    // a feather that sways a little
    u.line(42, 6, 50 + sw, -1, '#e8604c');
    u.line(43, 6, 51 + sw, 0, '#f6b26b');
    return;
  }
  if (classId === 'monk') {
    const B = ['#7a1f18', '#c0392b', '#e8604c'];
    u.r(17, 9, 31, 3, B[1]);
    u.row(9, 17, 47, B[2]);
    u.row(11, 17, 47, B[0]);
    u.poly([[46, 10], [51, 10], [56 + sw, 19], [53 + sw, 20]], B[1]);
    u.poly([[46, 11], [49, 12], [51, 22 - sw], [48, 22 - sw]], B[0]);
    return;
  }
  if (classId === 'mage') {
    const H = ['#2a1a55', '#4b2f8f', '#7b5cc9'];
    // a tall hat, its tip bent over, on a wide brim
    u.poly([[20, 9], [44, 9], [39, 1], [32, 0], [26, 2]], H[1]);
    u.poly([[37, 1], [40, 0], [51, 3], [49, 5], [40, 4]], H[1]);
    u.poly([[38, 2], [44, 9], [40, 9]], H[0]);
    u.line(27, 3, 23, 8, H[2]);
    u.p(50, 4, '#fde68a');
    u.ellipse(32, 9, 18, 2.5, H[0]);
    u.row(9, 16, 48, H[1]);
    u.row(7, 23, 41, T[1]);
    u.p(32, 4, '#fde68a');
    return;
  }
  // no class yet: a plain cloth band
  u.r(18, 9, 29, 2, '#c9b48a');
  u.row(9, 18, 46, '#e6d6b0');
}

/** Brighter, more saturated colors, the way NosTale paints: every color pushed a quarter of the
    way from its grey toward full color, and lifted a touch. */
function vivid(g: Grid): Grid {
  return g.map((row) =>
    row.map((c) => {
      if (!c || !c.startsWith('#') || c.length !== 7) return c;
      const n = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)),
        grey = (n[0] + n[1] + n[2]) / 3,
        out = n.map((v) => Math.max(0, Math.min(255, Math.round(grey + (v - grey) * 1.35 + 6))));
      return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    }),
  );
}

/** The Hollow's red eyes, painted over the tinted face. */
function hollowEyes(g: Grid, frame: ClipFrame, look: Look): Grid {
  const p = painter(g),
    bob = (frame.bob ?? 0) * 2;
  // A glowing slit across the middle of each eye.
  eyeBoxes(look).forEach(([x, y, w, h]) => {
    const gy = y + Math.round(h / 2) - 2 + bob;
    p.r(x, gy, w, 3, HOLLOW_EYES.glow);
    p.r(x + 1, gy + 1, w - 2, 1, HOLLOW_EYES.core);
  });
  return g;
}

/** One frame of the hero, variant effects included. */
export function drawHero(o: HeroOpts, frame: ClipFrame, f: number): Grid {
  const { gear, variant = 'normal' } = o,
    look = o.style === 'nostale' ? { ...(o.look ?? DEFAULT_LOOK), face: 'soft' as const } : (o.look ?? DEFAULT_LOOK);
  const drawnGrid = drawFigure(heroSpec(o), look, frame, f),
    gr = o.style === 'nostale' ? vivid(drawnGrid) : drawnGrid;
  if (variant === 'echo') return tint(gr, GOLD_GHOST);
  if (variant === 'hollow') return hollowEyes(tint(gr, SHADOW), frame, look);
  if (variant === 'best') return aura(gr, CAPE, '#fde68a', 5, f);
  // The flame lives in you now: red fire runs around you, and flickers.
  if (variant === 'kindled') return aura(gr, [FLAME.red[0], FLAME.red[1], FLAME.orange[1]], FLAME.yellow, 10, f);
  // A legendary item glows in its own light.
  const legend = (['weapon', 'armor', 'shield'] as const).find((s) => gear[s].item?.rarity === 'legendary'),
    lit = legend && gear[legend].item ? itemColors(gear[legend].item).glow : null;
  if (lit) return aura(gr, lit, lit[2], gear[legend!].tier === 6 ? 8 : 5, f);
  // Top-tier gear glows: the highest slot sets the aura.
  const top = (['weapon', 'armor', 'shield'] as const).reduce((m, s) => (gear[s].tier > gear[m].tier ? s : m), 'weapon' as GearSlot);
  const t = gear[top].tier;
  return t >= 5 ? aura(gr, rampOf(gear[top].color), gear[top].glow ?? '#ffffff', t === 6 ? 8 : 5, f) : gr;
}

export function heroLabel({ gear, variant }: HeroOpts): string {
  if (variant === 'echo') return 'The Echo, the ghost of who you were';
  if (variant === 'hollow') return 'The Hollow, your shadow';
  if (variant === 'kindled') return `Hero burning with your flame, with ${gear.weapon.name}, ${gear.armor.name} and ${gear.shield.name}`;
  return `Hero with ${gear.weapon.name}, ${gear.armor.name} and ${gear.shield.name}`;
}
