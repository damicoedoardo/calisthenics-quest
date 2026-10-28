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

// ---------- the warrior's other three ----------

const STONE: Ramp = ['#3f3a36', '#6b625a', '#9a8f84'];
const MOSS: Ramp = ['#2f4a22', '#4f7a34', '#86b45a'];

/** Stone Warden: plate like old rock, moss in its seams, a crown of stone; pebbles hang round you. */
const STONE_WARDEN: SpLook = {
  dress: 'heavy',
  a: STONE,
  trim: ['#5a4a1e', '#a08a3a', '#d8c070'],
  accent: MOSS,
  grand: true,
  mantle: false,
  legs: ['#24211e', '#3a3530', '#544c44'],
  aura: ['#6b4f2a', '#c49a5a', '#f0dcb0'],
  glow: '#f0dcb0',
  spark: '#a3e635',
  back(c) {
    // pebbles float round you, rising and settling
    const f = c.P.f;
    [
      [9, 40],
      [54, 36],
      [6, 26],
      [57, 22],
    ].forEach(([x, y], i) => {
      const k = [0, 1, 2, 1][(f + i) % 4];
      c.fx.r(x, y - k, 2, 2, i % 2 ? STONE[2] : STONE[1]);
      c.fx.p(x, y - k, '#d6cfc6');
    });
  },
  head(c) {
    const { u } = c;
    // a crown of stone over the brow, moss on it, a green stone in the middle
    u.row(10, 19, 44, STONE[1]);
    u.row(11, 19, 44, STONE[0]);
    u.row(10, 21, 30, STONE[2]);
    [20, 26, 37, 43].forEach((x, i) => {
      u.r(x - 1, 6 + (i % 2), 3, 4 - (i % 2), STONE[1]);
      u.p(x - 1, 6 + (i % 2), STONE[2]);
    });
    u.r(30, 6, 4, 5, STONE[1]);
    u.r(31, 7, 2, 2, MOSS[2]);
    u.p(31, 7, '#ecfccb');
    u.p(23, 11, MOSS[1]);
    u.p(40, 11, MOSS[1]);
  },
};

const VOLT: Ramp = ['#8a6a0a', '#facc15', '#fef08a'];

/** Storm Blade: dark blue steel, a winged helm, a cape, and lightning crackling round you. */
const STORM_BLADE: SpLook = {
  dress: 'heavy',
  a: ['#1e2a4a', '#34508a', '#5f86c8'],
  trim: ['#7a8a9a', '#c8d4e0', '#ffffff'],
  accent: VOLT,
  grand: true,
  mantle: true,
  legs: ['#141a2a', '#222c44', '#34405e'],
  aura: ['#3b4fb8', '#60a5fa', '#fef08a'],
  glow: '#fef08a',
  spark: '#fde047',
  back(c) {
    // a little bolt flicks on and off beside you, never twice in the same place
    const f = c.P.f,
      x = [8, 54, 10, 52][f % 4],
      y = [24, 30, 40, 18][f % 4];
    if (f % 2 === 0) {
      c.fx.line(x, y, x + 2, y + 3, VOLT[2]);
      c.fx.line(x + 2, y + 3, x, y + 5, VOLT[1]);
      c.fx.line(x, y + 5, x + 2, y + 8, '#ffffff');
    }
  },
  head(c) {
    const { u } = c;
    // a steel band over the brow, and a small wing swept back from each temple
    u.row(10, 19, 44, '#c8d4e0');
    u.row(11, 19, 44, '#7a8a9a');
    u.r(30, 8, 4, 4, VOLT[1]);
    u.p(31, 8, VOLT[2]);
    [-1, 1].forEach((s) => {
      const x = s < 0 ? 19 : 44;
      for (let i = 0; i < 3; i++) u.line(x, 10 - i, x + s * (6 - i), 3 + i * 2, i === 0 ? '#ffffff' : '#c8d4e0');
    });
  },
};

const DAWN_GOLD: Ramp = ['#9a6a12', '#f2c04a', '#fff1b8'];

/** Dawn Paladin: white and gold plate, a rose tabard and cape, a sun crest; morning light behind you. */
const DAWN_PALADIN: SpLook = {
  dress: 'heavy',
  a: ['#8a8070', '#e4dccb', '#ffffff'],
  trim: DAWN_GOLD,
  accent: ['#9a3a5a', '#f07aa8', '#fbd0e2'],
  grand: true,
  mantle: true,
  legs: ['#4a4438', '#7a7262', '#a89e8a'],
  aura: ['#b45309', '#fbbf24', '#fff7d6'],
  glow: '#fff7d6',
  spark: '#ffffff',
  back(c) {
    // rays of the morning stand out behind your head, slowly turning
    const f = c.P.f;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + f * 0.2,
        x = Math.round(32 + Math.cos(a) * 17),
        y = Math.round(12 + Math.sin(a) * 13);
      c.fx.p(x, y, i % 2 ? DAWN_GOLD[2] : '#ffffff');
    }
  },
  head(c) {
    const { u } = c;
    // a gold circlet, and a sun on it
    u.row(10, 20, 43, DAWN_GOLD[1]);
    u.row(11, 20, 43, DAWN_GOLD[0]);
    u.ellipse(31.5, 7, 3, 3, DAWN_GOLD[1]);
    u.r(31, 6, 2, 2, '#ffffff');
    [
      [31, 2],
      [32, 2],
      [26, 5],
      [37, 5],
      [27, 9],
      [36, 9],
    ].forEach(([x, y]) => u.p(x, y, DAWN_GOLD[2]));
    c.fxu.p(32, 6, c.P.f % 2 ? '#ffffff' : DAWN_GOLD[2]);
  },
};

// ---------- the archer's other three ----------

const ICE: Ramp = ['#1e3a5f', '#3b82f6', '#bfdbfe'];
const FUR: Ramp = ['#9aa8b4', '#e2ecf4', '#ffffff'];

/** Frost Hunter: an icy jerkin, a fur-lined hood and cloak, snow drifting round you. */
const FROST_HUNTER: SpLook = {
  dress: 'light',
  a: ['#2a4a6a', '#5b8fbf', '#a8d4f0'],
  trim: FUR,
  accent: ICE,
  grand: true,
  mantle: true,
  legs: ['#1a2634', '#2a3a4e', '#3e5470'],
  aura: ['#1e40af', '#93c5fd', '#f0f9ff'],
  glow: '#f0f9ff',
  spark: '#ffffff',
  back(c) {
    // snow, falling slowly past you
    const f = c.P.f;
    [
      [7, 10],
      [55, 16],
      [12, 34],
      [52, 44],
      [4, 50],
    ].forEach(([x, y], i) => {
      const yy = (y + f * 2 + i * 3) % 60;
      c.fx.p(x, yy, i % 2 ? '#ffffff' : FUR[1]);
    });
  },
  head(c) {
    const { u } = c;
    // a fur trim round the face, from temple to temple over the top
    u.row(4, 24, 39, FUR[1]);
    u.row(5, 21, 42, FUR[2]);
    u.row(6, 20, 43, FUR[1]);
    for (let y = 7; y <= 20; y++) {
      u.r(17, y, 3, 1, y % 3 ? FUR[1] : FUR[0]);
      u.r(44, y, 3, 1, y % 3 ? FUR[1] : FUR[0]);
    }
    u.p(31, 5, ICE[2]);
    u.p(32, 5, '#ffffff');
  },
};

const LEAF: Ramp = ['#2f5a1a', '#4f8a2a', '#8ac04a'];
const BLOOM: Ramp = ['#7a2a4a', '#e05a8a', '#fbb0c8'];

/** Leaf Warden: a green and bark jerkin, a crown of leaves with a flower, leaves riding past. */
const LEAF_WARDEN: SpLook = {
  dress: 'light',
  a: ['#3a4a1a', '#5a7a2a', '#8ab04a'],
  trim: ['#5a3a1a', '#8a5a2a', '#c08a50'],
  accent: BLOOM,
  grand: false,
  mantle: true,
  legs: ['#2a2014', '#3e3020', '#56442e'],
  aura: ['#166534', '#4ade80', '#dcfce7'],
  glow: '#dcfce7',
  spark: '#fbb0c8',
  back(c) {
    // leaves fall past you, turning
    const f = c.P.f;
    [
      [8, 6],
      [54, 14],
      [10, 30],
      [55, 40],
    ].forEach(([x, y], i) => {
      const yy = (y + f * 3 + i * 5) % 58,
        xx = x + ((f + i) % 2);
      c.fx.p(xx, yy, LEAF[2]);
      c.fx.p(xx + 1, yy + 1, LEAF[1]);
    });
  },
  head(c) {
    const { u } = c;
    // a ring of leaves round the head, and a flower over one ear
    for (let x = 19; x <= 44; x += 3) {
      const up = (x / 3) % 2 ? 1 : 0;
      u.r(x, 9 - up, 3, 2, LEAF[1]);
      u.p(x + 1, 9 - up, LEAF[2]);
      u.p(x, 11, LEAF[0]);
    }
    u.ellipse(43, 9, 3, 3, BLOOM[1]);
    u.p(43, 9, '#fde047');
    u.p(42, 7, BLOOM[2]);
  },
};

const MOON: Ramp = ['#5a5a8a', '#c7d2fe', '#f5f5ff'];

/** Moon Stalker: a night-violet jerkin and hood, a crescent moon pinned at the brow, stars round you. */
const MOON_STALKER: SpLook = {
  dress: 'light',
  a: ['#1a1630', '#2e2850', '#4a4278'],
  trim: ['#7a8a94', '#c8d4da', '#ffffff'],
  accent: MOON,
  grand: true,
  mantle: true,
  legs: ['#100e1e', '#1c1a30', '#2c2848'],
  aura: ['#312e81', '#a5b4fc', '#eef2ff'],
  glow: '#eef2ff',
  spark: '#c7d2fe',
  back(c) {
    // a few stars blink round you
    const f = c.P.f;
    [
      [8, 14],
      [56, 20],
      [6, 38],
      [57, 46],
    ].forEach(([x, y], i) => (f + i) % 3 !== 0 && c.fx.p(x, y, i % 2 ? '#ffffff' : MOON[1]));
  },
  head(c) {
    const { u } = c;
    const H: Ramp = ['#100e1e', '#1e1a36', '#2e2850'];
    // the hood: over the top and down both sides of the face
    u.ellipse(32, 8, 15, 6, H[1]);
    u.row(3, 25, 38, H[2]);
    for (let y = 8; y <= 22; y++) {
      u.r(16, y, 4, 1, H[1]);
      u.r(44, y, 4, 1, H[1]);
      u.p(16, y, H[0]);
      u.p(47, y, H[0]);
    }
    u.row(12, 20, 43, H[0]);
    // a crescent moon at the brow
    u.ellipse(31.5, 8, 3, 3, MOON[2]);
    u.ellipse(33, 7, 2, 2, H[1]);
    c.fxu.p(30, 9, c.P.f % 2 ? '#ffffff' : MOON[1]);
  },
};

// ---------- the mage's other three ----------

const CRYSTAL: Ramp = ['#8a2a6a', '#e879f9', '#fae8ff'];

/** Crystal Mage: a teal robe with pink crystal trim, a tiara of crystals, shards floating round you. */
const CRYSTAL_MAGE: SpLook = {
  dress: 'robe',
  a: ['#0f4a4a', '#1a8a8a', '#5ad0c8'],
  trim: CRYSTAL,
  accent: ['#0e7490', '#22d3ee', '#cffafe'],
  grand: true,
  mantle: false,
  aura: ['#0e7490', '#67e8f9', '#ecfeff'],
  glow: '#fae8ff',
  spark: '#f0abfc',
  back(c) {
    // three shards circle you
    const f = c.P.f;
    [0, 1, 2].forEach((i) => {
      const a = ((f + i * 4) / 12) * Math.PI * 2,
        x = Math.round(32 + Math.cos(a) * 26),
        y = Math.round(32 + Math.sin(a) * 10);
      c.fx.col(x, y - 2, y + 1, i % 2 ? CRYSTAL[1] : '#67e8f9');
      c.fx.p(x, y - 2, '#ffffff');
    });
  },
  head(c) {
    const { u } = c;
    // a thin silver band, and crystals standing up from it, the tallest in the middle
    u.row(10, 20, 43, '#c8d4e0');
    [
      [24, 3],
      [28, 5],
      [32, 7],
      [36, 5],
      [40, 3],
    ].forEach(([x, h], i) => {
      u.poly(
        [
          [x - 1, 10],
          [x, 10 - h],
          [x + 1, 10],
        ],
        i === 2 ? CRYSTAL[1] : '#22d3ee',
      );
      u.p(x, 10 - h + 1, '#ffffff');
    });
    c.fxu.p(32, 3, c.P.f % 2 ? '#ffffff' : CRYSTAL[2]);
  },
};

const SAND: Ramp = ['#7a5a2a', '#c0944a', '#e8c88a'];
const TURQ: Ramp = ['#0f5a5a', '#14b8a6', '#99f6e4'];

/** Sand Oracle: a sand-colored robe, a veil held by a gold band with a turquoise eye, sand falling round you. */
const SAND_ORACLE: SpLook = {
  dress: 'robe',
  a: SAND,
  trim: ['#8a6a1a', '#e8c45a', '#fff3b0'],
  accent: TURQ,
  grand: true,
  mantle: true,
  aura: ['#92400e', '#f59e0b', '#fef3c7'],
  glow: '#fef3c7',
  spark: '#fde68a',
  back(c) {
    // sand runs down beside you, like an hourglass
    const f = c.P.f;
    [10, 53].forEach((x, i) => {
      for (let k = 0; k < 4; k++) c.fx.p(x + (k % 2), 18 + ((f * 3 + k * 9 + i * 5) % 36), k % 2 ? SAND[2] : '#fde68a');
    });
  },
  head(c) {
    const { u } = c;
    // a veil from the crown down behind the ears, a gold band, an eye stone
    u.ellipse(32, 6, 13, 4, SAND[1]);
    for (let y = 6; y <= 24; y++) {
      u.r(16, y, 4, 1, y % 4 ? SAND[1] : SAND[0]);
      u.r(44, y, 4, 1, y % 4 ? SAND[1] : SAND[0]);
    }
    u.row(9, 19, 44, '#e8c45a');
    u.row(10, 19, 44, '#8a6a1a');
    u.r(30, 7, 4, 3, TURQ[1]);
    u.p(31, 8, '#0b0d14');
    u.p(32, 8, TURQ[2]);
  },
};

const VOID: Ramp = ['#5b21b6', '#a855f7', '#e9d5ff'];

/** Void Seer: a robe dark as a night with no stars, a deep hood with a violet gem, little dark suns round you. */
const VOID_SEER: SpLook = {
  dress: 'robe',
  a: ['#140a1e', '#2a1440', '#4a2470'],
  trim: VOID,
  accent: ['#701a75', '#d946ef', '#f5d0fe'],
  grand: true,
  mantle: true,
  aura: ['#3b0764', '#a855f7', '#f3e8ff'],
  glow: '#f3e8ff',
  spark: '#d946ef',
  back(c) {
    // two small dark suns, ringed in violet, drift round you
    const f = c.P.f;
    [0, 1].forEach((i) => {
      const a = ((f + i * 6) / 12) * Math.PI * 2,
        x = Math.round(32 + Math.cos(a) * 25),
        y = Math.round(28 + Math.sin(a) * 12);
      c.fx.r(x - 1, y - 1, 3, 3, VOID[1]);
      c.fx.p(x, y, '#0b0d14');
    });
  },
  head(c) {
    const { u } = c;
    const H: Ramp = ['#0e0616', '#1e0e30', '#2a1440'];
    // a deep hood over the head and down the sides
    u.ellipse(32, 7, 16, 7, H[1]);
    u.row(1, 26, 37, H[2]);
    for (let y = 7; y <= 24; y++) {
      u.r(15, y, 5, 1, H[1]);
      u.r(44, y, 5, 1, H[1]);
      u.p(15, y, H[0]);
      u.p(48, y, H[0]);
    }
    u.row(12, 20, 43, VOID[0]);
    // a violet gem at the brow
    u.r(31, 9, 2, 3, VOID[1]);
    c.fxu.p(31, 9, c.P.f % 2 ? '#ffffff' : VOID[2]);
  },
};

// ---------- the monk's other three ----------

const TIGER: Ramp = ['#7a3a0a', '#d9771a', '#f5a54a'];

/** Tiger Fist: an orange gi striped black, a headband with tiger ears, a tail of cloth. */
const TIGER_FIST: SpLook = {
  dress: 'light',
  a: TIGER,
  trim: ['#1a1410', '#3a2a20', '#5a4a3a'],
  accent: ['#9a9a9a', '#e5e5e5', '#ffffff'],
  grand: false,
  mantle: false,
  legs: ['#1a1410', '#2e241c', '#463a2e'],
  aura: ['#9a3412', '#fb923c', '#ffedd5'],
  glow: '#ffedd5',
  spark: '#fdba74',
  back(c) {
    // a striped tail of cloth behind you, swishing
    const { u, P } = c;
    for (let i = 0; i < 9; i++) {
      const x = 22 - i,
        y = 44 + Math.round(Math.sin((i + P.f) * 0.8) * 1.5) - Math.round(i * 0.6);
      u.r(x, y, 2, 2, i % 3 === 2 ? '#1a1410' : TIGER[1]);
    }
  },
  outfit(c) {
    const { u } = c;
    // the stripes across the gi
    [30, 34, 38].forEach((y, i) => {
      const [b0, b1] = c.torsoRange(y);
      u.line(b0 + 1, y, b0 + 4, y + 1, '#1a1410');
      u.line(b1 - 1, y + (i % 2), b1 - 4, y + 1, '#1a1410');
    });
  },
  head(c) {
    const { u } = c;
    // a dark headband and two tiger ears on top
    u.row(10, 18, 45, '#1a1410');
    u.row(11, 18, 45, '#3a2a20');
    [-1, 1].forEach((s) => {
      const x = s < 0 ? 23 : 40;
      u.poly(
        [
          [x - 3, 6],
          [x, 1],
          [x + 3, 6],
        ],
        TIGER[1],
      );
      u.p(x, 3, '#ffffff');
      u.p(x, 4, '#ffffff');
      u.line(x - 3, 6, x, 1, '#1a1410');
    });
  },
};

const LOTUS: Ramp = ['#8a3a5a', '#e07aa0', '#fbc8dc'];

/** Lotus Sage: a pink and white gi, a green sash, a lotus in the hair, petals drifting round you. */
const LOTUS_SAGE: SpLook = {
  dress: 'light',
  a: LOTUS,
  trim: ['#9aa0a8', '#eef0f4', '#ffffff'],
  accent: ['#166534', '#22c55e', '#bbf7d0'],
  grand: false,
  mantle: false,
  legs: ['#3a2430', '#56364a', '#744a64'],
  aura: ['#9d174d', '#f472b6', '#fdf2f8'],
  glow: '#fdf2f8',
  spark: '#fbcfe8',
  back(c) {
    // petals drift up round you
    const f = c.P.f;
    [
      [9, 44],
      [54, 40],
      [6, 28],
      [57, 24],
    ].forEach(([x, y], i) => {
      const yy = y - ((f * 2 + i * 4) % 14);
      c.fx.p(x, yy, LOTUS[2]);
      c.fx.p(x + 1, yy, LOTUS[1]);
    });
  },
  outfit(c) {
    const { u } = c;
    // a green sash, tied at the side
    const [b0, b1] = c.torsoRange(42);
    u.row(42, b0, b1, '#22c55e');
    u.row(43, b0, b1, '#166534');
    u.r(24, 42, 3, 2, '#bbf7d0');
  },
  head(c) {
    const { u } = c;
    // a lotus flower over one ear: petals round a gold heart
    const x = 42,
      y = 8;
    u.ellipse(x, y, 4, 2, LOTUS[1]);
    u.poly(
      [
        [x - 2, y],
        [x, y - 4],
        [x + 2, y],
      ],
      LOTUS[2],
    );
    u.p(x - 4, y - 1, LOTUS[2]);
    u.p(x + 4, y - 1, LOTUS[2]);
    u.p(x, y - 1, '#fde047');
    u.row(y + 2, x - 2, x + 2, '#22c55e');
  },
};

const SUN: Ramp = ['#a16207', '#facc15', '#fef9c3'];

/** Sun Fist: a red and gold gi, a headband with a sun disk, a sun burning behind your head. */
const SUN_FIST: SpLook = {
  dress: 'light',
  a: ['#7a1a0a', '#c2410c', '#f97316'],
  trim: SUN,
  accent: SUN,
  grand: true,
  mantle: false,
  legs: ['#2a1008', '#44200e', '#663018'],
  aura: ['#b45309', '#fbbf24', '#fffbeb'],
  glow: '#fffbeb',
  spark: '#fde047',
  back(c) {
    // a sun disk behind your head, its rim flickering
    const f = c.P.f;
    c.u.ellipse(32, 11, 16, 13, '#f59e0b');
    c.u.ellipse(32, 11, 14, 11, '#fbbf24');
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2,
        x = Math.round(32 + Math.cos(a) * 17),
        y = Math.round(11 + Math.sin(a) * 14);
      if ((i + f) % 3) c.fxu.p(x, y, i % 2 ? '#fef9c3' : '#fde047');
    }
  },
  head(c) {
    const { u } = c;
    // a red headband with a gold sun on it
    u.row(10, 18, 45, '#b91c1c');
    u.row(11, 18, 45, '#7f1d1d');
    u.ellipse(31.5, 9, 3, 3, SUN[1]);
    u.r(31, 8, 2, 2, SUN[2]);
  },
};

/** Each class's four SPs' looks, in the order of SP_CARDS (src/game/dungeon/content.ts). */
export const SP_LOOKS: Record<ClassId, readonly [SpLook, SpLook, SpLook, SpLook]> = {
  warrior: [EMBER_KNIGHT, STONE_WARDEN, STORM_BLADE, DAWN_PALADIN],
  archer: [WIND_RANGER, FROST_HUNTER, LEAF_WARDEN, MOON_STALKER],
  mage: [STAR_SAGE, CRYSTAL_MAGE, SAND_ORACLE, VOID_SEER],
  monk: [RIVER_MONK, TIGER_FIST, LOTUS_SAGE, SUN_FIST],
};

/** The look of one of a class's SPs (1 to 4). */
export const spLook = (cls: ClassId, n: number) => SP_LOOKS[cls][Math.min(4, Math.max(1, n)) - 1];
