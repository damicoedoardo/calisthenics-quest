import type { ClassId } from "@/lib/gear";
import { SP_CARDS, type SpWeapon } from "@/game/dungeon/content";
import { eyeBoxes, type Ctx } from "../engine/figure";
import type { Ramp } from "../engine/grid";
import { R } from "../palette";
import { flames } from "../parts/spWeapons";
import { BONE, BRASS, BRONZE, FIRE, FOAM, GOLD, IRON, LIGHT_ROBE, PEARL, RIVER_BLUE, SEA, STEEL, VIOLET, WHITE_FUR, WHITE_PLATE, WOOD } from "../parts/spColors";

/* How the hero looks with the SP on. An SP doesn't dress you up, it turns you into someone else:
   each one has its own clothes, its own headgear and its own weapon, drawn in place of the class's
   (your weapon item keeps its stats). The look holds the clothes, hair, headgear, aura and motes;
   the weapon, its art and its attack, is found through the SP card (spWeapon below) and drawn
   from parts/spWeapons.ts. A look sets the clothes the hero already knows how to wear
   (plate, jerkin or robe, in the SP's colors) and adds its own pieces. A girl gets her own cut
   where it matters: braids, a ponytail, a circlet instead of a helm. */

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
  /** A girl wears this plate or jerkin with a short flared skirt (spGirlCut). */
  skirt?: boolean;
  /** The element's light around you. */
  aura: Ramp;
  glow: string;
  /** The odd bright bit in its storm when it wakes (src/components/SpTransform.tsx). */
  spark: string;
  back?: (c: Ctx) => void;
  outfit?: (c: Ctx) => void;
  head?: (c: Ctx) => void;
  /** A companion at your side (Wolfcaller's wolf), painted with the weapon. */
  pet?: (c: Ctx) => void;
}

// ---------- shared pieces ----------


/** A hood over the head and down both sides of the face; `peak` raises a point on top. */
function hood(c: Ctx, H: Ramp, o: { low?: number; peak?: boolean; wide?: boolean } = {}) {
  const { u } = c,
    low = o.low ?? 24,
    x0 = o.wide ? 15 : 16,
    x1 = o.wide ? 48 : 47;
  u.ellipse(32, 8, o.wide ? 17 : 16, 7, H[1]);
  u.row(2, 25, 38, H[2]);
  u.row(3, 23, 30, H[2]);
  if (o.peak)
    u.poly(
      [
        [24, 4],
        [41, 4],
        [35, -3],
      ],
      H[1],
    );
  for (let y = 8; y <= low; y++) {
    u.r(x0, y, 4, 1, H[1]);
    u.r(x1 - 3, y, 4, 1, H[1]);
    u.p(x0, y, H[0]);
    u.p(x1, y, H[0]);
    u.p(x0 + 3, y, H[2]);
  }
  u.row(12, 20, 43, H[0]);
}

/** A cloth or bone mask over the mouth, under the eyes. */
function mouthMask(c: Ctx, M: Ramp, teeth = false) {
  const { u } = c;
  for (let y = 23; y <= 29; y++) {
    const w = y > 27 ? y - 27 : 0;
    u.row(y, 21 + w, 42 - w, y === 23 ? M[2] : M[1]);
    u.p(42 - w, y, M[0]);
  }
  if (teeth) for (let x = 25; x <= 38; x += 2) u.col(x, 25, 27, M[0]);
  else u.line(24, 25, 30, 28, M[0]);
}

/** Hair that falls out from under a hood or helm: two braids, a tail, a ponytail. */
function braid(c: Ctx, x: number, y0: number, y1: number, tie: string) {
  const { u, hair: Hr } = c;
  // plaited: each knot leans the other way
  for (let y = y0; y <= y1; y++) {
    const k = (y >> 1) % 2;
    u.r(x - 1, y, 3, 1, Hr[1]);
    u.p(x - 1 + k * 2, y, y % 2 ? Hr[0] : Hr[2]);
  }
  u.r(x - 1, y1 - 3, 3, 2, tie);
  u.p(x, y1 + 1, Hr[0]);
}
function ponytail(c: Ctx, tie: string) {
  const { u, hair: Hr } = c,
    pts: [number, number][] = [
      [40, 3],
      [46, 1],
      [51, 5],
      [53, 12],
      [53, 20],
      [51, 26],
    ];
  for (let i = 1; i < pts.length; i++) {
    u.thick(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 4 - (i > 3 ? 1 : 0), Hr[1]);
    u.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], Hr[2]);
  }
  u.r(40, 2, 3, 3, tie);
}

/** Embers or motes drifting up past you. */
function motes(c: Ctx, cols: string[], spots: [number, number][] = [[9, 44], [54, 40], [6, 28], [57, 24]]) {
  const f = c.P.f;
  spots.forEach(([x, y], i) => {
    const yy = y - ((f * 2 + i * 4) % 14);
    c.fx.p(x, yy, cols[i % cols.length]);
  });
}

// ====================================================================================
// WARRIOR: the axe, the hammer and shield, the lance, the scythe
// ====================================================================================

const LEATHER_RED: Ramp = ["#3a1410", "#6a2418", "#9a3a22"];
const FUR: Ramp = ["#4a3a2e", "#7a6652", "#a8927a"];

/** Blaze Reaver (fire): a berserker in red leather and fur with a horned helm and a huge double axe. */
const BLAZE_REAVER: SpLook = {
  dress: "light",
  a: LEATHER_RED,
  trim: BRONZE,
  accent: ["#7a1a0c", "#d4410c", "#fb923c"],
  grand: false,
  mantle: false,
  legs: ["#24120c", "#3a2014", "#54321e"],
  aura: ["#9a3412", "#f97316", "#fdba74"],
  glow: "#fde68a",
  spark: "#fde047",
  back(c) {
    motes(c, ["#fb923c", "#fde047", "#f97316"]);
  },
  outfit(c) {
    const { u } = c;
    // a fur mantle over the shoulders, and straps crossed over the chest
    u.ellipse(31.5, 30, 12, 3, FUR[1]);
    u.row(28, 22, 41, FUR[2]);
    for (let x = 21; x <= 42; x += 3) u.p(x, 32, FUR[0]);
    u.line(24, 32, 38, 42, BRONZE[0]);
    u.line(39, 32, 25, 42, BRONZE[0]);
    u.r(30, 36, 4, 3, BRONZE[2]);
    u.p(31, 37, FIRE[0]);
  },
  head(c) {
    const { u } = c;
    // an iron cap with a nose guard, and two horns curling out from the temples
    u.ellipse(32, 8, 14, 6, IRON[1]);
    u.row(3, 26, 37, IRON[2]);
    u.row(11, 18, 45, IRON[0]);
    u.row(10, 18, 45, IRON[1]);
    [20, 26, 37, 43].forEach((x) => u.p(x, 10, BRONZE[2]));
    u.r(31, 11, 2, 5, IRON[1]);
    u.p(31, 11, IRON[2]);
    [-1, 1].forEach((s) => {
      const x = s < 0 ? 19 : 44;
      u.thick(x, 9, x + s * 6, 6, 3, BONE[1]);
      u.thick(x + s * 6, 6, x + s * 9, 1, 2, BONE[2]);
      u.p(x + s * 9, 0, BONE[0]);
      u.line(x, 10, x + s * 6, 7, BONE[0]);
    });
    if (c.P.fem) {
      braid(c, 17, 13, 38, BRONZE[1]);
      braid(c, 46, 13, 38, BRONZE[1]);
    }
  },
};


/** Sun Bastion (light): a holy wall in white and gold plate, a plumed helm, a war hammer and a tower shield. */
const SUN_BASTION: SpLook = {
  dress: "heavy",
  a: WHITE_PLATE,
  trim: GOLD,
  accent: ["#92400e", "#d97706", "#fcd34d"],
  grand: true,
  mantle: true,
  skirt: true,
  legs: ["#4a4438", "#7a7262", "#a89e8a"],
  aura: ["#b45309", "#fbbf24", "#fff7d6"],
  glow: "#fff7d6",
  spark: "#ffffff",
  head(c) {
    const { u } = c;
    if (c.P.fem) {
      // a gold circlet with white wings at the temples
      u.row(10, 19, 44, GOLD[1]);
      u.row(11, 19, 44, GOLD[0]);
      u.r(30, 8, 4, 3, GOLD[1]);
      u.p(31, 8, "#ffffff");
      [-1, 1].forEach((s) => {
        const x = s < 0 ? 18 : 45;
        for (let i = 0; i < 3; i++) u.thick(x, 10 - i, x + s * (6 - i), 3 + i * 2, 2, i === 0 ? "#ffffff" : WHITE_PLATE[1]);
      });
      return;
    }
    // an open helm over the head and cheeks, gold rimmed, a white plume swept back
    u.ellipse(32, 8, 15, 7, WHITE_PLATE[1]);
    u.row(3, 25, 38, "#ffffff");
    for (let y = 8; y <= 25; y++) {
      u.r(16, y, 4, 1, WHITE_PLATE[1]);
      u.r(44, y, 4, 1, WHITE_PLATE[0]);
      u.p(19, y, GOLD[1]);
      u.p(44, y, GOLD[1]);
    }
    u.row(12, 18, 45, GOLD[1]);
    u.row(11, 18, 45, GOLD[0]);
    u.ellipse(31.5, 7, 2.5, 2.5, GOLD[1]);
    u.p(31, 6, "#ffffff");
    const plume: [number, number][] = [
      [32, 2],
      [37, -1],
      [44, 0],
      [49, 4],
      [52, 10],
    ];
    for (let i = 1; i < plume.length; i++) u.thick(plume[i - 1][0], plume[i - 1][1], plume[i][0], plume[i][1], 4 - (i >> 1), i > 3 ? GOLD[2] : "#ffffff");
  },
  outfit(c) {
    const { u } = c;
    // a gold sun on the breastplate
    u.ellipse(31.5, 37, 2.5, 2.5, GOLD[1]);
    u.p(31, 36, "#ffffff");
    [[31, 33], [32, 33], [27, 37], [36, 37], [31, 41], [32, 41]].forEach(([x, y]) => u.p(x, y, GOLD[2]));
  },
};


/** Riptide Lancer (water): a sea knight in scale armor, a helm with a fin crest, a long lance. */
const RIPTIDE_LANCER: SpLook = {
  dress: "heavy",
  a: SEA,
  trim: FOAM,
  accent: ["#0e4a6a", "#1a7aa0", "#5ab8d8"],
  grand: false,
  mantle: true,
  skirt: true,
  legs: ["#0a1a2c", "#142c46", "#20446a"],
  aura: ["#1e40af", "#60a5fa", "#e0f2fe"],
  glow: "#e0f2fe",
  spark: "#bae6fd",
  back(c) {
    motes(c, ["#bae6fd", "#ffffff"], [[8, 46], [55, 42], [6, 30], [58, 26]]);
  },
  outfit(c) {
    const { u } = c;
    // scales down the breastplate
    for (let y = 34; y <= 40; y += 2) for (let x = 27 + (y % 4 ? 1 : 0); x <= 36; x += 3) u.p(x, y, SEA[0]);
  },
  head(c) {
    const { u } = c;
    // a steel cap, and a sea-blue fin rising over it, ribbed like a fish's
    u.ellipse(32, 8, 14, 5, STEEL[1]);
    u.row(4, 25, 38, STEEL[2]);
    u.row(11, 18, 45, STEEL[0]);
    u.row(10, 18, 45, FOAM[1]);
    const big = !c.P.fem;
    u.poly(
      [
        [24, 5],
        [28, big ? -2 : 1],
        [38, big ? -3 : 0],
        [45, big ? 2 : 4],
        [42, 6],
      ],
      SEA[1],
    );
    [29, 33, 37, 41].forEach((x) => u.line(x - 2, 5, x, big ? -1 : 1, SEA[2]));
    if (c.P.fem) ponytail(c, FOAM[1]);
  },
};

const NIGHT_CLOTH: Ramp = ["#0e0c14", "#1e1a28", "#2e2a3c"];

/** Nightscythe (shadow): a reaper in a black hooded cloak with a torn hem, a bone mask, a scythe. */
const NIGHTSCYTHE: SpLook = {
  dress: "robe",
  a: NIGHT_CLOTH,
  trim: BONE,
  accent: VIOLET,
  grand: false,
  mantle: false,
  aura: ["#3b0764", "#8b5cf6", "#ede9fe"],
  glow: "#ede9fe",
  spark: "#c4b5fd",
  back(c) {
    // a torn cloak behind you, its rags lifting
    const { u, P } = c;
    u.poly(
      [
        [20, 29],
        [43, 29],
        [48, 56],
        [15, 56],
      ],
      NIGHT_CLOTH[0],
    );
    for (let x = 15; x <= 48; x += 3) u.col(x, 56, 58 + ((x + P.f) % 3), NIGHT_CLOTH[0]);
    motes(c, [VIOLET[1], VIOLET[2]]);
  },
  outfit(c) {
    const { u } = c;
    // a bone clasp at the throat
    u.r(30, 30, 4, 3, BONE[1]);
    u.p(30, 30, BONE[2]);
    u.p(33, 32, BONE[0]);
  },
  head(c) {
    hood(c, NIGHT_CLOTH, { low: c.P.fem ? 30 : 26, peak: true });
    if (c.P.fem) {
      // the mask worn up on the side of the hood
      const { u } = c;
      u.ellipse(44, 13, 3, 4, BONE[1]);
      u.p(43, 12, NIGHT_CLOTH[0]);
      u.p(45, 12, NIGHT_CLOTH[0]);
      u.row(15, 43, 45, BONE[0]);
    } else mouthMask(c, BONE, true);
  },
};

// ====================================================================================
// ARCHER: the long bow, the hand cannon, the boomerang and wolf, the twin daggers
// ====================================================================================

const MIST: Ramp = ["#2a3a4a", "#4a6a80", "#7a9ab0"];

/** Rainstalker (water): a silent hunter in a rain-grey hood and cloak, a mask, a long bow of blue arrows. */
const RAINSTALKER: SpLook = {
  dress: "light",
  a: MIST,
  trim: STEEL,
  accent: ["#1e3a8a", "#2563eb", "#93c5fd"],
  grand: false,
  mantle: true,
  legs: ["#141e28", "#202e3c", "#304456"],
  aura: ["#1e40af", "#60a5fa", "#e0f2fe"],
  glow: "#e0f2fe",
  spark: "#93c5fd",
  back(c) {
    // a quiver of blue-feathered arrows over the right shoulder
    const { u } = c;
    u.poly(
      [
        [41, 26],
        [47, 24],
        [53, 44],
        [47, 46],
      ],
      R.leather[1],
    );
    u.line(42, 26, 48, 45, R.leather[2]);
    [
      [42, 20],
      [45, 19],
      [48, 21],
    ].forEach(([x, y]) => {
      u.r(x, y, 3, 5, "#2563eb");
      u.p(x + 1, y, "#93c5fd");
    });
    // rain falling past you
    const f = c.P.f;
    [8, 14, 52, 58].forEach((x, i) => c.fx.col(x, (f * 6 + i * 13) % 50, ((f * 6 + i * 13) % 50) + 2, "#93c5fd"));
  },
  head(c) {
    hood(c, ["#1a2632", "#34485a", "#56708a"], { low: 26 });
    if (c.P.fem) braid(c, 23, 26, 44, STEEL[1]);
    else mouthMask(c, ["#1a2632", "#34485a", "#56708a"]);
  },
};

const COAT: Ramp = ["#3a2418", "#6a4028", "#9a6038"];

/** Flintfire (fire): an explosives expert in a long coat, goggles up, an ammo belt, a hand cannon and a bomb. */
const FLINTFIRE: SpLook = {
  dress: "light",
  a: COAT,
  trim: BRASS,
  accent: ["#7f1d1d", "#dc2626", "#fca5a5"],
  grand: false,
  mantle: false,
  legs: ["#1e1a18", "#302a26", "#463e38"],
  aura: ["#9a3412", "#f97316", "#fed7aa"],
  glow: "#fed7aa",
  spark: "#fde047",
  outfit(c) {
    const { u, l } = c;
    // the coat's long tails over the legs
    [
      [19, 23],
      [40, 44],
    ].forEach(([a, b]) => {
      for (let y = 46; y <= 56; y++) l.row(y, a - (y > 52 ? 1 : 0), b, y === 56 ? COAT[0] : COAT[1]);
      l.col(a, 46, 56, COAT[2]);
    });
    // an ammo belt across the chest, red shells in it
    u.thick(24, 31, 39, 41, 2, R.leather[0]);
    [26, 29, 32, 35, 38].forEach((x) => u.r(x, 31 + Math.round(((x - 24) * 10) / 15) - 1, 1, 2, "#dc2626"));
    if (c.P.fem) {
      // a big red scarf at the neck, its end over the shoulder
      u.row(29, 24, 39, "#dc2626");
      u.row(30, 25, 38, "#7f1d1d");
      u.r(36, 31, 3, 7, "#dc2626");
      u.col(38, 31, 37, "#7f1d1d");
    }
  },
  head(c) {
    const { u } = c;
    // goggles pushed up over the hair: a strap, two brass lenses with amber glass
    u.row(10, 18, 45, R.leather[0]);
    u.row(11, 18, 45, R.leather[1]);
    [26, 37].forEach((x) => {
      u.ellipse(x, 9, 3.5, 3.5, BRASS[1]);
      u.ellipse(x, 9, 2, 2, "#f59e0b");
      u.p(x - 1, 8, "#fef3c7");
    });
    u.row(9, 30, 33, BRASS[0]);
  },
};

const PELT: Ramp = ["#8a7a5a", "#d8c8a0", "#f6eed8"];
const SPIRIT: Ramp = ["#c8b47a", "#f4ecd6", "#ffffff"];

/** The spirit wolf of light that walks at the Wolfcaller's side. */
const WOLF = [
  "..........w..w..",
  ".........wW.wW..",
  ".........WWWWW..",
  "........WWWeWWWn",
  "........WWWWWWW.",
  ".........WWWWw..",
  "........WWWWW...",
  ".......wWWWWW...",
  "......wWWWWWW...",
  "w....wWWWWWWW...",
  "Ww..wWWWWwWWW...",
  ".Ww.wWWWWwWWw...",
  "..WwWWWWWwWWw...",
  "...wWWWWWWWWw...",
  "...wWWWWgWWWg...",
  "....wWWg.WWg....",
  "....ggg..ggg....",
];

/** Wolfcaller (light): a keeper in a white wolf-pelt hood, gold and bone charms, a boomerang, and a wolf of light. */
const WOLFCALLER: SpLook = {
  dress: "light",
  a: PELT,
  trim: GOLD,
  accent: GOLD,
  grand: false,
  mantle: false,
  skirt: true,
  legs: ["#3a3428", "#5a5240", "#7a705a"],
  aura: ["#b45309", "#fcd34d", "#fffbeb"],
  glow: "#fffbeb",
  spark: "#ffffff",
  outfit(c) {
    const { u } = c;
    // a fur collar and a cord of bone and gold charms
    u.row(29, 22, 41, SPIRIT[1]);
    u.row(30, 23, 40, SPIRIT[0]);
    [25, 28, 31, 34, 37].forEach((x, i) => u.r(x, 32 + (i === 2 ? 1 : 0), 2, 2, i % 2 ? GOLD[1] : BONE[2]));
  },
  head(c) {
    const { u } = c;
    if (c.P.fem) {
      // a band of beads, white feathers hanging in loose hair
      u.row(11, 19, 44, R.leather[1]);
      [21, 25, 29, 34, 38, 42].forEach((x, i) => u.p(x, 11, i % 2 ? GOLD[2] : "#38bdf8"));
      u.thick(44, 11, 47, 23, 2, "#ffffff");
      u.p(47, 23, GOLD[1]);
      u.thick(46, 10, 51, 19, 2, SPIRIT[1]);
      u.p(51, 19, GOLD[1]);
      return;
    }
    // the wolf's pelt as a hood: its ears up, its muzzle over the brow
    hood(c, PELT, { low: 22 });
    [23, 40].forEach((x) => {
      u.poly(
        [
          [x - 3, 4],
          [x, -2],
          [x + 3, 4],
        ],
        PELT[1],
      );
      u.p(x, 1, "#fda4af");
      u.p(x, 2, "#fda4af");
    });
    u.ellipse(31.5, 10, 6, 3, PELT[2]);
    u.r(31, 12, 2, 1, "#1c1917");
    u.p(27, 9, GOLD[1]);
    u.p(36, 9, GOLD[1]);
  },
  pet(c) {
    const { w, P } = c;
    // the wolf sits at your side, glowing
    WOLF.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        const col = ch === "W" ? SPIRIT[1] : ch === "w" ? SPIRIT[2] : ch === "g" ? SPIRIT[0] : ch === "e" ? GOLD[1] : ch === "n" ? "#1c1917" : null;
        if (col) w.p(1 + x, 46 + y, col);
      }),
    );
    if (P.f % 2) c.fx.p(4, 44, "#fde68a");
    else c.fx.p(16, 48, "#fde68a");
  },
};

const SHADE: Ramp = ["#0e0c16", "#1c1828", "#2c2840"];

/** Silent Fang (shadow): an assassin in a tight dark hood and mask, a long violet scarf, twin daggers. */
const SILENT_FANG: SpLook = {
  dress: "light",
  a: SHADE,
  trim: IRON,
  accent: VIOLET,
  grand: false,
  mantle: false,
  legs: ["#0a0810", "#16121e", "#24202e"],
  aura: ["#312e81", "#8b5cf6", "#ede9fe"],
  glow: "#ede9fe",
  spark: "#c4b5fd",
  back(c) {
    // the scarf's two tails stream out behind, rising and falling
    const { u, P } = c,
      lift = [0, 1, 2, 1][P.f % 4];
    [0, 1].forEach((k) => {
      let px = 40,
        py = 30 + k * 2;
      for (let i = 1; i <= 9; i++) {
        const x = 40 + i * 2 + k,
          y = 30 + k * 2 - Math.round(i * 0.6) + Math.round(Math.sin((i + P.f + k) * 0.9) * 1.5) - Math.round((i * lift) / 4);
        u.thick(px, py, x, y, 2, i > 7 ? VIOLET[2] : VIOLET[1]);
        px = x;
        py = y;
      }
    });
  },
  outfit(c) {
    const { u } = c;
    // belts crossed over the chest, small knives in them
    u.line(24, 31, 39, 41, R.leather[0]);
    u.line(39, 31, 24, 41, R.leather[0]);
    [27, 36].forEach((x) => {
      u.col(x, 33, 36, STEEL[2]);
      u.p(x, 37, R.leather[1]);
    });
  },
  head(c) {
    hood(c, ["#08060e", "#16121e", "#2a2438"], { low: 22 });
    mouthMask(c, ["#08060e", "#16121e", "#2a2438"]);
    if (c.P.fem) ponytail(c, VIOLET[1]);
  },
};

// ====================================================================================
// MAGE: the flame staff, the water orb, the bell staff, the shadow blade
// ====================================================================================

const ASH_ROBE: Ramp = ["#2a0a0a", "#5a1410", "#8a2418"];
const EMBER: Ramp = ["#9a3412", "#f59e0b", "#fde68a"];

/** Ashcaller (fire): a fire caster in a red and black robe and a horned hood, a staff with a burning orb. */
const ASHCALLER: SpLook = {
  dress: "robe",
  a: ASH_ROBE,
  trim: EMBER,
  accent: ["#1c0a08", "#3a1410", "#5a2016"],
  grand: true,
  mantle: false,
  aura: ["#9a3412", "#f97316", "#fed7aa"],
  glow: "#fed7aa",
  spark: "#fde047",
  back(c) {
    // smoke rising from the hem
    const f = c.P.f;
    [18, 46].forEach((x, i) => {
      c.fx.p(x + (f % 2), 54 - ((f * 3 + i * 5) % 14), "#57534e");
      c.fx.p(x - 1, 50 - ((f * 3 + i * 7) % 12), "#78716c");
    });
  },
  head(c) {
    const { u } = c;
    if (c.P.fem) {
      // a black circlet with two small horns, embers in the hair
      u.row(10, 19, 44, "#1c0a08");
      u.row(11, 19, 44, ASH_ROBE[1]);
      u.r(31, 9, 2, 2, EMBER[1]);
      [24, 39].forEach((x) => u.thick(x, 9, x + (x < 32 ? -2 : 2), 4, 2, "#3a1410"));
      flames(c, 32, 2, c.P.f, FIRE);
      return;
    }
    // a tall pointed hood with two horns
    const H: Ramp = ["#1c0a08", "#3a1410", "#5a2016"];
    hood(c, H, { low: 25, peak: true });
    [-1, 1].forEach((s) => {
      const x = s < 0 ? 22 : 42;
      u.thick(x, 4, x + s * 3, 0, 2, BONE[1]);
      u.p(x + s * 4, -1, BONE[2]);
    });
    u.row(12, 20, 43, EMBER[0]);
  },
};

const DEEP: Ramp = ["#0a3040", "#14607a", "#3aa0b8"];

/** Tidesinger (water): a sea caster in a wave robe and a shell crown, an orb of water floating over the hand. */
const TIDESINGER: SpLook = {
  dress: "robe",
  a: DEEP,
  trim: PEARL,
  accent: ["#0e7490", "#22d3ee", "#cffafe"],
  grand: false,
  mantle: false,
  aura: ["#0e7490", "#67e8f9", "#ecfeff"],
  glow: "#ecfeff",
  spark: "#a5f3fc",
  outfit(c) {
    const { l } = c;
    // waves along the hem of the robe
    for (let x = 19; x <= 44; x++) l.p(x, 54 + (Math.floor(x / 3) % 2), PEARL[1]);
  },
  head(c) {
    const { u } = c;
    // pearls round the brow and a shell rising over it
    for (let x = 19; x <= 44; x += 2) u.p(x, 11, PEARL[2]);
    u.row(12, 19, 44, DEEP[0]);
    u.ellipse(32, 7, 6, 4, PEARL[1]);
    u.row(11, 26, 38, PEARL[0]);
    [27, 30, 33, 36].forEach((x) => u.line(32, 10, x, 4, PEARL[0]));
    u.p(32, 3, "#ffffff");
    if (c.P.fem)
      [18, 45].forEach((x) => {
        for (let y = 13; y <= 25; y += 2) u.p(x, y, PEARL[2]);
      });
  },
};


/** Dawnbell (light): a healer in a white robe with a golden halo, an eye on the chest, a staff with a bell. */
const DAWNBELL: SpLook = {
  dress: "robe",
  a: LIGHT_ROBE,
  trim: GOLD,
  accent: GOLD,
  grand: false,
  mantle: false,
  aura: ["#b45309", "#fcd34d", "#fffbeb"],
  glow: "#fffbeb",
  spark: "#ffffff",
  back(c) {
    // a halo floating behind the head
    for (let a = 0; a < 360; a += 3) {
      const r = (a * Math.PI) / 180;
      c.u.p(32 + 21 * Math.cos(r), 9 + 6 * Math.sin(r), GOLD[1]);
      c.u.p(32 + 20 * Math.cos(r), 9 + 5.5 * Math.sin(r), GOLD[2]);
    }
    // and its light shows over the top of the head too
    for (let x = 24; x <= 40; x += 2) c.fxu.p(x, 0, (x + c.P.f * 2) % 6 ? GOLD[2] : "#ffffff");
  },
  outfit(c) {
    const { u } = c;
    // a gold eye on the chest
    u.ellipse(31.5, 36, 3.5, 2, GOLD[1]);
    u.ellipse(31.5, 36, 1.5, 1.5, "#0ea5e9");
    u.p(31, 35, "#ffffff");
  },
  head(c) {
    const { u } = c;
    if (c.P.fem) {
      // a white veil over the hair, its rim in gold
      hood(c, ["#c8c0b0", "#f4f0e6", "#ffffff"], { low: 30, wide: true });
      u.row(11, 19, 44, GOLD[1]);
      u.row(12, 19, 44, GOLD[0]);
      return;
    }
    u.row(10, 19, 44, GOLD[1]);
    u.row(11, 19, 44, GOLD[0]);
    u.r(31, 8, 2, 3, GOLD[2]);
  },
};

const HEX_COAT: Ramp = ["#140e1e", "#2a1e3e", "#3e2e5a"];

/** Hexedge (shadow): a mage who fights up close, in a dark rune coat, an eye patch, a sword made of shadow. */
const HEXEDGE: SpLook = {
  dress: "light",
  a: HEX_COAT,
  trim: VIOLET,
  accent: VIOLET,
  grand: false,
  mantle: true,
  legs: ["#0c0814", "#18122a", "#28203e"],
  aura: ["#3b0764", "#a855f7", "#f3e8ff"],
  glow: "#f3e8ff",
  spark: "#d946ef",
  outfit(c) {
    const { l } = c;
    // the coat's tails, and runes glowing in turn down its front
    [
      [20, 24],
      [39, 43],
    ].forEach(([a, b]) => {
      for (let y = 46; y <= 55; y++) l.row(y, a, b, y === 55 ? VIOLET[0] : HEX_COAT[1]);
    });
    [34, 37, 40].forEach((y, i) => c.fxu.p(27 + i * 4, y, (i + c.P.f) % 3 ? VIOLET[1] : VIOLET[2]));
  },
  head(c) {
    const { u } = c,
      eyes = eyeBoxes(c.look),
      [ex, ey, ew, eh] = eyes[eyes.length - 1];
    if (c.P.fem) {
      // a rune glowing on the cheek under the eye
      const [x0, y0, , h0] = eyes[0];
      c.fxu.p(x0 + 1, y0 + h0 + 1, VIOLET[2]);
      c.fxu.row(y0 + h0 + 2, x0, x0 + 2, VIOLET[1]);
      return;
    }
    // a black patch over one eye, a rune on it, its strap round the head
    u.line(20, 10, ex, ey + 1, "#0b0d14");
    u.line(ex + ew - 1, ey + 1, 45, 13, "#0b0d14");
    u.r(ex, ey, ew, eh, "#16121e");
    u.r(ex + 1, ey + 1, ew - 2, eh - 2, "#0b0d14");
    c.fxu.p(ex + Math.floor(ew / 2), ey + Math.floor(eh / 2), c.P.f % 2 ? VIOLET[2] : VIOLET[1]);
  },
};

// ====================================================================================
// MONK: the gauntlets, the claws, the long staff, the bare hands of ki
// ====================================================================================

const DRAGON_RED: Ramp = ["#5a0e0a", "#9a1c12", "#d03a20"];

/** Dragonheart (fire): a brawler in a red vest with a gold dragon, red gauntlets, fists that burn. */
const DRAGONHEART: SpLook = {
  dress: "light",
  a: DRAGON_RED,
  trim: GOLD,
  accent: GOLD,
  grand: false,
  mantle: false,
  legs: ["#1c0c08", "#2e1610", "#44221a"],
  aura: ["#b45309", "#f97316", "#fef3c7"],
  glow: "#fef3c7",
  spark: "#fde047",
  back(c) {
    motes(c, ["#fb923c", "#fde047"]);
  },
  outfit(c) {
    const { u } = c;
    // a gold dragon winding up the vest
    u.line(27, 41, 30, 38, GOLD[1]);
    u.line(30, 38, 34, 37, GOLD[1]);
    u.line(34, 37, 36, 34, GOLD[1]);
    u.line(36, 34, 33, 32, GOLD[1]);
    u.p(33, 32, GOLD[2]);
    u.p(32, 32, "#dc2626");
  },
  head(c) {
    const { u, hair: Hr } = c;
    if (c.P.fem) {
      // two buns on top, tied with red ribbons
      [23, 41].forEach((x) => {
        u.ellipse(x, 3, 4, 4, Hr[1]);
        u.p(x - 1, 1, Hr[2]);
        u.row(6, x - 3, x + 3, "#dc2626");
      });
      return;
    }
    // a red headband, its tails flying like flames
    u.row(10, 18, 45, "#dc2626");
    u.row(11, 18, 45, "#7f1d1d");
    u.thick(45, 11, 50, 14, 2, "#dc2626");
    u.thick(45, 11, 51, 9, 2, "#f97316");
  },
};

const STRIPE = "#1a1410";

/** White Claw (light): a fighter like a white tiger, a striped hood with ears, a tail of cloth, claws. */
const WHITE_CLAW: SpLook = {
  dress: "light",
  a: WHITE_FUR,
  trim: ["#1a1410", "#3a2a20", "#5a4a3a"],
  accent: GOLD,
  grand: false,
  mantle: false,
  legs: ["#1a1410", "#2e241c", "#463a2e"],
  aura: ["#b45309", "#fcd34d", "#fffbeb"],
  glow: "#fffbeb",
  spark: "#ffffff",
  back(c) {
    // a striped tail of cloth behind you, swishing
    const { u, P } = c;
    for (let i = 0; i < 9; i++) {
      const x = 22 - i,
        y = 44 + Math.round(Math.sin((i + P.f) * 0.8) * 1.5) - Math.round(i * 0.6);
      u.r(x, y, 2, 2, i % 3 === 2 ? STRIPE : WHITE_FUR[1]);
    }
  },
  outfit(c) {
    const { u } = c;
    // the stripes across the gi
    [31, 35, 39].forEach((y, i) => {
      const [b0, b1] = c.torsoRange(y);
      u.line(b0 + 1, y, b0 + 4, y + 1, STRIPE);
      u.line(b1 - 1, y + (i % 2), b1 - 4, y + 1, STRIPE);
    });
  },
  head(c) {
    const { u } = c;
    // a white tiger's fur cap: black stripes, round ears with pink inside
    [20, 43].forEach((x) => {
      u.ellipse(x, 3, 4, 4, WHITE_FUR[1]);
      u.ellipse(x, 3, 2, 2, "#f9a8d4");
    });
    u.ellipse(32, 7, 14, 6, WHITE_FUR[1]);
    u.row(2, 27, 36, WHITE_FUR[2]);
    u.row(3, 24, 31, WHITE_FUR[2]);
    u.row(11, 19, 44, WHITE_FUR[0]);
    // the stripes: a mark on the brow, wedges from each side
    [4, 6, 8].forEach((y, i) => u.row(y, 30 - i, 33 + i, i === 1 ? WHITE_FUR[1] : STRIPE));
    u.col(31, 4, 8, STRIPE);
    [
      [19, 7],
      [19, 9],
      [44, 7],
      [44, 9],
    ].forEach(([x, y]) => u.line(x, y, x + (x < 32 ? 3 : -3), y - 1, STRIPE));
    if (c.P.fem) {
      braid(c, 17, 23, 44, GOLD[1]);
      braid(c, 46, 23, 44, GOLD[1]);
    }
  },
};

const STRAW: Ramp = ["#8a6a2a", "#c8a050", "#ecd48a"];

/** Stillwater (water): a calm fighter in a blue robe with wide sleeves, a straw hat, beads, a long bo staff. */
const STILLWATER: SpLook = {
  dress: "robe",
  a: RIVER_BLUE,
  trim: PEARL,
  accent: ["#d6dde4", "#f1f5f9", "#ffffff"],
  grand: false,
  mantle: false,
  aura: ["#1e40af", "#60a5fa", "#e0f2fe"],
  glow: "#e0f2fe",
  spark: "#bae6fd",
  back(c) {
    // a girl wears her straw hat hanging on her back
    if (!c.P.fem) return;
    c.u.ellipse(42, 24, 11, 9, STRAW[1]);
    c.u.ellipse(42, 24, 7, 5, STRAW[0]);
  },
  outfit(c) {
    const { u } = c;
    // a string of wooden beads round the neck
    for (let i = 0; i <= 8; i++) {
      const x = 24 + i * 2,
        y = 31 + Math.round(Math.sin((i / 8) * Math.PI) * 5);
      u.r(x, y, 2, 2, i === 4 ? "#7f1d1d" : WOOD[2]);
    }
  },
  head(c) {
    const { u } = c;
    if (c.P.fem) {
      braid(c, 46, 14, 42, PEARL[1]);
      return;
    }
    // a wide straw hat, woven
    u.poly(
      [
        [10, 11],
        [54, 11],
        [33, -1],
        [31, -1],
      ],
      STRAW[1],
    );
    u.row(11, 9, 55, STRAW[0]);
    u.row(12, 12, 52, STRAW[0]);
    for (let x = 14; x <= 50; x += 4) u.line(32, 0, x, 10, STRAW[2]);
  },
};

const VOID_GI: Ramp = ["#100c16", "#1e1828", "#302840"];

/** Voidpalm (shadow): a fighter who throws their own energy: a black gi, a violet aura burning up, ki in both palms. */
const VOIDPALM: SpLook = {
  dress: "light",
  a: VOID_GI,
  trim: VIOLET,
  accent: VIOLET,
  grand: false,
  mantle: false,
  legs: ["#0a0810", "#16121e", "#24202e"],
  aura: ["#3b0764", "#a855f7", "#f3e8ff"],
  glow: "#f3e8ff",
  spark: "#d946ef",
  back(c) {
    // the aura burns up round you, a new shape each frame
    const f = c.P.f;
    [
      [14, 46],
      [16, 34],
      [13, 24],
      [50, 46],
      [48, 34],
      [51, 24],
      [20, 16],
      [44, 16],
    ].forEach(([x, y], i) => {
      const h = 3 + ((i + f) % 3) * 2;
      c.fx.col(x, y - h, y, (i + f) % 2 ? "#6d28d9" : "#8b5cf6");
      c.fx.p(x, y - h - 1, "#e9d5ff");
    });
  },
  outfit(c) {
    const { u } = c;
    // a violet belt, tied at the side
    const [b0, b1] = c.torsoRange(42);
    u.row(42, b0, b1, VIOLET[1]);
    u.row(43, b0, b1, VIOLET[0]);
    u.r(24, 42, 3, 4, VIOLET[1]);
  },
  head(c) {
    const { u } = c;
    // a dark headband; a girl's hair rises in the aura
    u.row(10, 18, 45, "#0b0d14");
    u.row(11, 18, 45, "#1c1828");
    u.thick(45, 11, 50, 15, 2, "#1c1828");
    if (c.P.fem) flames(c, 32, 1, c.P.f, ["#6d28d9", "#a855f7", "#e9d5ff"], 7);
  },
};

/** The girl's cut of an SP's plate or jerkin, where the look asks for it (`skirt`): a short flared
    skirt over the legs, its hem in the trim (plate keeps its tabard showing). */
export function spGirlCut(c: Ctx, sp: SpLook) {
  if (!c.P.fem || !sp.skirt || sp.dress === "robe") return;
  const { u } = c,
    A = sp.a;
  for (let y = 44; y <= 49; y++) {
    const flare = (y - 44) >> 1,
      x0 = 22 - flare,
      x1 = 41 + flare;
    const col = y === 49 ? sp.trim[1] : (y + 1) % 3 ? A[1] : A[0];
    // plate keeps its tabard down the middle
    if (sp.dress === "heavy") {
      u.row(y, x0, 28, col);
      u.row(y, 35, x1, col);
    } else u.row(y, x0, x1, col);
    u.p(x0, y, A[0]);
    u.p(x1, y, A[0]);
    if (y < 49) u.p(x0 + 1, y, A[2]);
  }
  // the folds
  (sp.dress === "heavy" ? [25, 38] : [27, 32, 37]).forEach((x) => u.col(x, 46, 48, A[0]));
}

/** Each class's four SPs' looks, in the order of SP_CARDS (src/game/dungeon/content.ts). */
export const SP_LOOKS: Record<ClassId, readonly [SpLook, SpLook, SpLook, SpLook]> = {
  warrior: [BLAZE_REAVER, SUN_BASTION, RIPTIDE_LANCER, NIGHTSCYTHE],
  archer: [RAINSTALKER, FLINTFIRE, WOLFCALLER, SILENT_FANG],
  mage: [ASHCALLER, TIDESINGER, DAWNBELL, HEXEDGE],
  monk: [DRAGONHEART, WHITE_CLAW, STILLWATER, VOIDPALM],
};

const spIndex = (n: number) => Math.min(4, Math.max(1, n)) - 1;

/** The look of one of a class's SPs (1 to 4). */
export const spLook = (cls: ClassId, n: number) => SP_LOOKS[cls][spIndex(n)];

/** The weapon one of a class's SPs fights with (its card's `weapon`); its art and attack are its
    entry in SP_WEAPON_ART (parts/spWeapons.ts). */
export const spWeapon = (cls: ClassId, n: number): SpWeapon => SP_CARDS[cls][spIndex(n)].weapon;
