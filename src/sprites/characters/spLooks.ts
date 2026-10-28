import type { ClassId } from "@/lib/gear";
import type { Ctx } from "../engine/figure";
import type { Ramp } from "../engine/grid";

/* How the hero looks with the SP on: each class's card dresses you its own way, like NosTale's
   specialist cards. A look sets the clothes the hero already knows how to wear (plate, jerkin or
   robe, in the SP's colors) and adds its own pieces: a crest, a feather, a hat, a headband, a cape,
   scarf tails, and the light of its element around you. */

export interface SpLook {
  /** The clothes underneath, worn the way an item of that kind is (see itemOutfit in hero.ts). */
  dress: "heavy" | "light" | "robe";
  /** Cloth or plate, trim, and the accent (tabard, mantle, sash, scarf). */
  a: Ramp;
  trim: Ramp;
  accent: Ramp;
  /** Pointed pauldrons, a heart stone or a scarf, twinkling stars: what a legendary of the dress gives. */
  grand: boolean;
  /** A mantle down the back, in the accent. */
  mantle: boolean;
  legs?: Ramp;
  /** The element's light around you. */
  aura: Ramp;
  glow: string;
  /** The odd bright bit in its storm when it wakes (src/components/SpTransform.tsx). */
  spark: string;
  back?: (c: Ctx) => void;
  outfit?: (c: Ctx) => void;
  head?: (c: Ctx) => void;
}

const EMBER_GOLD: Ramp = ["#8a4b0c", "#e0a526", "#ffe08a"];
const FIRE: Ramp = ["#7a1a0c", "#d4410c", "#fb923c"];

/** Ember Knight: crimson plate, a flame cape, a gold circlet with flame crests. */
const EMBER_KNIGHT: SpLook = {
  dress: "heavy",
  a: ["#5c1a14", "#a3301f", "#d9583a"],
  trim: EMBER_GOLD,
  accent: FIRE,
  grand: true,
  mantle: true,
  legs: ["#2a1210", "#46201a", "#6a3226"],
  aura: ["#9a3412", "#f97316", "#fdba74"],
  glow: "#fde68a",
  spark: "#fde047",
  back(c) {
    // the mantle's hem burns: tongues of fire lick up from it, a new shape each frame
    const f = c.P.f;
    for (let i = 0; i < 6; i++) {
      const x = 18 + i * 5 + (f % 2),
        h = 2 + ((i + f) % 3);
      c.fxu.col(x, 52 - h, 52, (i + f) % 2 ? FIRE[2] : "#fde047");
      c.fxu.p(x, 51 - h, i % 3 === f % 3 ? "#ffffff" : FIRE[2]);
    }
  },
  head(c) {
    const { u } = c;
    // a gold circlet over the brow, a red stone in the middle
    u.row(10, 20, 43, EMBER_GOLD[1]);
    u.row(11, 19, 44, EMBER_GOLD[0]);
    u.row(10, 22, 30, EMBER_GOLD[2]);
    u.r(30, 8, 4, 4, "#b91c1c");
    u.p(30, 8, "#fca5a5");
    u.p(33, 11, "#7f1d1d");
    // flame crests swept back from the temples
    [-1, 1].forEach((s) => {
      const x = s < 0 ? 19 : 44;
      u.poly(
        [
          [x, 11],
          [x + s * 2, 7],
          [x + s * 5, 2],
          [x + s * 6, 6],
          [x + s * 4, 10],
        ],
        EMBER_GOLD[1],
      );
      u.line(x + s * 1, 9, x + s * 5, 3, EMBER_GOLD[2]);
      u.p(x + s * 5, 2, FIRE[2]);
    });
  },
};

const WIND: Ramp = ["#3f8f80", "#9fe0d0", "#effffa"];

/** Wind Ranger: a sage jerkin, a light cloak, a long scarf the wind keeps lifting, a feather. */
const WIND_RANGER: SpLook = {
  dress: "light",
  a: ["#1d4a3a", "#2f7a5c", "#5fb38a"],
  trim: ["#7a8a94", "#c8d4da", "#ffffff"],
  accent: WIND,
  grand: true,
  mantle: true,
  legs: ["#1a2a26", "#2a403a", "#3e5a52"],
  aura: ["#2f8f7a", "#7fe0c8", "#e0fff6"],
  glow: "#e0fff6",
  spark: "#86efac",
  back(c) {
    // the scarf's two tails stream out over the shoulder, rising and falling with the wind
    const { u, P } = c,
      lift = [0, 1, 2, 1][P.f % 4];
    [0, 1].forEach((k) => {
      let px = 40,
        py = 30 + k * 2;
      for (let i = 1; i <= 8; i++) {
        const x = 40 + i * 2 + k,
          y =
            30 +
            k * 2 -
            Math.round(i * 0.8) +
            Math.round(Math.sin((i + P.f + k) * 0.9) * 1.5) -
            Math.round((i * lift) / 4);
        u.thick(px, py, x, y, 2, i > 6 ? WIND[2] : WIND[1]);
        px = x;
        py = y;
      }
    });
    // a few leaves ride the wind past you
    c.fx.p(8 + ((P.f * 5) % 12), 20 + ((P.f * 3) % 6), "#86efac");
    c.fx.p(4 + ((P.f * 7) % 10), 40 - ((P.f * 2) % 5), WIND[2]);
  },
  head(c) {
    const { u } = c;
    // a long feather tucked in over one ear, white with a green vane
    u.thick(44, 15, 50, 2, 2, WIND[2]);
    u.line(45, 14, 51, 2, WIND[0]);
    u.line(46, 9, 49, 4, "#4ade80");
    u.p(51, 1, "#4ade80");
    u.r(43, 14, 3, 3, "#7a4a24");
  },
};

const STAR_GOLD: Ramp = ["#8a6a1a", "#e8c45a", "#fff3b0"];

/** Star Sage: a night-blue robe with stars in it, a tall pointed hat, a star that circles you. */
const STAR_SAGE: SpLook = {
  dress: "robe",
  a: ["#1a1446", "#2e2a7a", "#4b46b8"],
  trim: STAR_GOLD,
  accent: ["#3a1f6e", "#6b3fc0", "#a67cff"],
  grand: true,
  mantle: false,
  aura: ["#4338ca", "#818cf8", "#e0e7ff"],
  glow: "#fff3b0",
  spark: "#fff3b0",
  back(c) {
    // a little star going round you
    const f = c.P.f,
      pos: [number, number][] = [
        [10, 26],
        [16, 18],
        [52, 22],
        [56, 34],
      ];
    const [x, y] = pos[f % 4];
    c.fx.p(x, y, "#ffffff");
    c.fx.p(x - 1, y, STAR_GOLD[1]);
    c.fx.p(x + 1, y, STAR_GOLD[1]);
    c.fx.p(x, y - 1, STAR_GOLD[1]);
    c.fx.p(x, y + 1, STAR_GOLD[1]);
  },
  head(c) {
    const { u } = c,
      H: Ramp = ["#14103a", "#2e2a7a", "#4b46b8"];
    // the brim, wide over the hair
    u.ellipse(32, 10, 18, 3, H[0]);
    u.ellipse(32, 9, 17, 2, H[1]);
    u.row(8, 19, 41, H[2]);
    // the cone, its tip bent over to one side
    u.poly(
      [
        [21, 9],
        [43, 9],
        [39, 3],
        [34, 0],
        [27, 1],
      ],
      H[1],
    );
    u.poly(
      [
        [36, 9],
        [43, 9],
        [39, 3],
        [36, 1],
      ],
      H[0],
    );
    u.poly(
      [
        [36, 0],
        [41, 1],
        [47, 4],
        [45, 6],
        [39, 3],
      ],
      H[1],
    );
    u.line(39, 3, 46, 5, H[0]);
    u.line(23, 8, 28, 2, H[2]);
    // a gold band and a star on it
    u.row(7, 21, 43, STAR_GOLD[1]);
    u.row(6, 22, 42, STAR_GOLD[0]);
    u.p(31, 4, STAR_GOLD[2]);
    u.row(4, 30, 32, STAR_GOLD[1]);
    u.col(31, 3, 5, STAR_GOLD[1]);
    c.fxu.p(31, 4, c.P.f % 2 ? "#ffffff" : STAR_GOLD[2]);
    c.fxu.p(46, 5, c.P.f % 2 ? STAR_GOLD[2] : "#ffffff");
  },
};

const RIVER: Ramp = ["#0f3a63", "#1f6fae", "#5aaee6"];
const FOAM: Ramp = ["#8fb6d0", "#dcefff", "#ffffff"];

/** River Monk: a blue gi with a foam sash, a headband whose tails ripple, beads, drops of water. */
const RIVER_MONK: SpLook = {
  dress: "light",
  a: RIVER,
  trim: FOAM,
  accent: FOAM,
  grand: false,
  mantle: false,
  legs: ["#0c1e33", "#16304f", "#24476e"],
  aura: ["#1e5f99", "#60b0f0", "#e0f4ff"],
  glow: "#e0f4ff",
  spark: "#ffffff",
  back(c) {
    // the headband's tails behind the head, rippling
    const { u, P } = c;
    for (let i = 0; i < 8; i++) {
      const y = 12 + i + Math.round(Math.sin((i + P.f) * 1.1) * 1.2);
      u.r(14 - i, y, 3, 2, i % 2 ? RIVER[1] : RIVER[2]);
      u.p(14 - i, y + 1, RIVER[0]);
    }
    // drops of water rise round you and fall again
    [
      [12, 44],
      [52, 40],
      [8, 30],
      [55, 26],
    ].forEach(([x, y], i) => {
      const k = (P.f + i) % 4;
      c.fx.p(x, y - k * 2, k === 3 ? "#ffffff" : FOAM[1]);
    });
  },
  outfit(c) {
    const { u } = c;
    // a sash over the gi, tied at the hip, its ends hanging
    const [b0, b1] = c.torsoRange(42);
    u.row(42, b0, b1, FOAM[1]);
    u.row(43, b0, b1, FOAM[0]);
    u.r(36, 42, 3, 2, FOAM[2]);
    u.line(37, 44, 38, 48, FOAM[1]);
    u.line(38, 44, 40, 47, FOAM[0]);
    // prayer beads round the neck
    [
      [26, 31],
      [27, 33],
      [28, 35],
      [30, 36],
      [33, 36],
      [35, 35],
      [36, 33],
      [37, 31],
    ].forEach(([x, y], i) => u.p(x, y, i % 2 ? "#7a4a24" : "#c08a52"));
    u.r(31, 37, 2, 2, RIVER[2]);
  },
  head(c) {
    const { u } = c;
    // a headband round the brow, knotted at the back
    u.row(11, 18, 45, RIVER[1]);
    u.row(12, 18, 45, RIVER[0]);
    u.row(11, 20, 30, RIVER[2]);
    u.r(30, 10, 4, 3, FOAM[1]);
    u.p(31, 11, RIVER[1]);
  },
};

export const SP_LOOKS: Record<ClassId, SpLook> = {
  warrior: EMBER_KNIGHT,
  archer: WIND_RANGER,
  mage: STAR_SAGE,
  monk: RIVER_MONK,
};
