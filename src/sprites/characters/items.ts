import type { ItemArt, ItemLook } from '@/game/dungeon/items';
import { grid, mix, outline, painter, type Grid, type Ramp } from '../engine/grid';
import { paintRows } from './pixel';

/* The Fog's items, hand-drawn as text: 24 rows of 24 characters on a 32x32 frame (room for the
   outline and a legendary's glow). One drawing per kind; the rarity and a seed from the item's name
   pick its colors, and each legendary has a drawing of its own, a glow, a shine and sparkles.
   The hero wears the same colors (`itemColors`, read by characters/hero.ts).

   Letters: D M L W the material, dark to shine (metal, leather or cloth by kind) · h H j the grip
   or bow wood · t T U the trim · g G E the gem · a A B the accent (ribbons, lacing, sash) ·
   f F X the glow (magic and up) · k the dark inside a hood or a band. '.' is empty. */

export type LegendArt = 'sword' | 'bow' | 'staff' | 'wand' | 'heavy' | 'light' | 'robe' | 'charm';

/** Four tones, dark to light: shadow, base, light, shine. */
export type Ramp4 = [string, string, string, string];

export interface ItemColors {
  /** What the item is made of: metal, leather (light armor) or cloth (a robe). */
  body: Ramp4;
  handle: Ramp;
  trim: Ramp;
  gem: Ramp;
  accent: Ramp;
  /** Magic and up: the item's glow (sparkles, a legendary's light). */
  glow: Ramp | null;
}

const METAL: Record<'common' | 'magic' | 'rare', Ramp4> = {
  common: ['#3a3f48', '#6b7380', '#a3acb8', '#d4dae2'],
  magic: ['#243656', '#4f72ad', '#8fb4e8', '#d6e6ff'],
  rare: ['#4a5260', '#9aa4b4', '#d0d8e4', '#ffffff'],
};
const LEATHER: Ramp4[] = [
  ['#3e2614', '#6e4424', '#a06a3a', '#c89060'],
  ['#16304a', '#2a5a80', '#4f8cb8', '#9cc8e8'],
  ['#3a0e14', '#7a1e2a', '#b8404a', '#e88a8a'],
  ['#12301e', '#2a5e3a', '#4f9a5e', '#9ad8a0'],
  ['#141a36', '#2c3670', '#4f62b0', '#9aa8e8'],
];
const CLOTH: Ramp4[] = [
  ['#5a4630', '#8c7350', '#b89c70', '#dcc49a'],
  ['#1a2a6a', '#3656c0', '#6b8fe8', '#b8ccff'],
  ['#2a1238', '#5a2a80', '#8e58c0', '#c8a0f0'],
  ['#40101a', '#8a2234', '#c44a5a', '#f09aa4'],
  ['#0e3328', '#1f6f55', '#3fae86', '#9ae8c8'],
];
const GEMS: Record<'ruby' | 'emerald' | 'sapphire' | 'amethyst' | 'topaz' | 'stone' | 'magenta', Ramp> = {
  ruby: ['#5e1010', '#d02838', '#ff9aa0'],
  emerald: ['#0b4a2a', '#22a35a', '#9af0bc'],
  sapphire: ['#1e3a8a', '#3b82f6', '#bfdbfe'],
  amethyst: ['#4a1470', '#9d4edd', '#e2c2ff'],
  topaz: ['#7a4a08', '#f0a020', '#ffe08a'],
  stone: ['#3a3f48', '#7a828e', '#b4bcc8'],
  magenta: ['#5a0e5e', '#c026d3', '#f5b0ff'],
};
const RARE_GEMS = [GEMS.ruby, GEMS.emerald, GEMS.sapphire, GEMS.amethyst, GEMS.topaz];
const TRIM: Record<ItemLook['rarity'], Ramp> = {
  common: ['#5a3a18', '#8a5a2a', '#b88a4a'],
  magic: ['#4a5260', '#9aa4b4', '#e2e8f0'],
  rare: ['#7a5410', '#c9921c', '#f3d36b'],
  legendary: ['#8a5a10', '#e0aa30', '#ffe590'],
};
const ACCENTS: Ramp[] = [
  ['#5e1010', '#a02030', '#e05a5a'],
  ['#0f3b3d', '#1f7f78', '#4fc0b0'],
  ['#2e1450', '#6030a0', '#9a6ae0'],
  ['#0b3a22', '#1e7a45', '#4fc07a'],
  ['#14204e', '#2a46a8', '#5a7ee8'],
];
const PLAIN_ACCENTS: Ramp[] = [
  ['#4a3a2a', '#7a6248', '#a68c6a'],
  ['#2e3440', '#4e5868', '#7a8496'],
  ['#3a3a1e', '#62623a', '#8e8e5e'],
];

/** The legendaries' looks: each legendary's name picks one. */
const THEMES: { body: Ramp4; glow: Ramp; gem: Ramp; accent: Ramp }[] = [
  // sunfire
  { body: ['#7a4a0c', '#e0a030', '#ffd870', '#fff6d0'], glow: ['#c2410c', '#fb923c', '#fff7ed'], gem: GEMS.ruby, accent: ['#5e1010', '#b01c2c', '#f05a5a'] },
  // frost
  { body: ['#1e4a6e', '#5aa8d8', '#b8e6ff', '#ffffff'], glow: ['#0e7490', '#67e8f9', '#ecfeff'], gem: GEMS.sapphire, accent: ['#141a46', '#2c3a8a', '#5a72d0'] },
  // void
  { body: ['#2a1446', '#6b3fa0', '#b48ae0', '#efe0ff'], glow: ['#7e22ce', '#d8b4fe', '#faf5ff'], gem: GEMS.magenta, accent: ['#2a1238', '#5a2a80', '#8e58c0'] },
  // ember
  { body: ['#3a1010', '#8a2a1a', '#d0603a', '#ffc09a'], glow: ['#b91c1c', '#fb923c', '#fef3c7'], gem: GEMS.topaz, accent: ['#1c1016', '#3a1c24', '#6a3440'] },
  // verdant
  { body: ['#0f3b2a', '#2f8a5a', '#7ee0a8', '#e6fff0'], glow: ['#15803d', '#86efac', '#f0fdf4'], gem: GEMS.emerald, accent: ['#12301e', '#2a5e3a', '#4f9a5e'] },
];
const GLOW: Record<'magic' | 'rare', Ramp> = {
  magic: ['#1e3a8a', '#60a5fa', '#dbeafe'],
  rare: ['#7a5410', '#facc15', '#fff3c4'],
};

/** A small number from the seed, different for each `salt`. */
export const pick = (seed: number, n: number, salt: number) => (((seed >>> salt) ^ (seed >>> (salt + 11))) >>> 0) % n;
const dark = (r: Ramp): Ramp => [mix(r[0], '#0b0d14', 0.35), r[0], r[1]];

/** An item's colors, from its kind, rarity and seed. */
export function itemColors({ art, rarity, seed }: ItemLook): ItemColors {
  const made = art === 'light' ? 'leather' : art === 'robe' ? 'cloth' : 'metal';
  if (rarity === 'legendary') {
    const t = THEMES[pick(seed, THEMES.length, 9)];
    return { body: t.body, handle: dark([t.body[0], t.body[1], t.body[2]]), trim: TRIM.legendary, gem: t.gem, accent: t.accent, glow: t.glow };
  }
  const dyes = made === 'leather' ? LEATHER : CLOTH,
    // common: the plain one; magic: blue; rare: one of the rich dyes, by seed
    body = made === 'metal' ? METAL[rarity] : rarity === 'common' ? dyes[0] : rarity === 'magic' ? dyes[1] : dyes[2 + pick(seed, 3, 6)],
    accent = rarity === 'common' ? PLAIN_ACCENTS[pick(seed, 3, 3)] : rarity === 'magic' ? ACCENTS[4] : ACCENTS[pick(seed, ACCENTS.length, 3)],
    gem = rarity === 'common' ? GEMS.stone : rarity === 'magic' ? GEMS.sapphire : RARE_GEMS[pick(seed, RARE_GEMS.length, 0)];
  return {
    body,
    handle: rarity === 'common' ? ['#3e2614', '#6e4424', '#a06a3a'] : rarity === 'magic' ? ['#1e2440', '#38406e', '#5e6aa0'] : dark(accent),
    trim: TRIM[rarity],
    gem,
    accent,
    glow: rarity === 'common' ? null : GLOW[rarity],
  };
}

function paletteOf(c: ItemColors): Record<string, string> {
  const pal: Record<string, string> = {
    D: c.body[0], M: c.body[1], L: c.body[2], W: c.body[3],
    h: c.handle[0], H: c.handle[1], j: c.handle[2],
    t: c.trim[0], T: c.trim[1], U: c.trim[2],
    g: c.gem[0], G: c.gem[1], E: c.gem[2],
    a: c.accent[0], A: c.accent[1], B: c.accent[2],
    k: '#141018',
  };
  if (c.glow) Object.assign(pal, { f: c.glow[0], F: c.glow[1], X: c.glow[2] });
  return pal;
}

/** A plate's chest emblem, by seed (none, a diamond, a cross, a sun), in the trim's colors. */
const EMBLEMS: (string[] | null)[] = [
  null,
  ['..UT..', '.UGGt.', 'UGEGGt', '.tGgt.', '..tt..'],
  ['..UT..', 'UUTTtt', '..Tt..', '..Tt..'],
  ['.U..T.', '..UT..', 'UTGGTt', '..Tt..', '.t..t.'],
];

const rgba = (hex: string, a: number) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;

/** Empty pixels next to a painted one. */
function ring(g: Grid): [number, number][] {
  const out: [number, number][] = [],
    n = g.length;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (!g[y][x] && ((y > 0 && g[y - 1][x]) || (y < n - 1 && g[y + 1][x]) || (x > 0 && g[y][x - 1]) || (x < n - 1 && g[y][x + 1]))) out.push([x, y]);
  return out;
}

/** Where a legendary's sparkles can twinkle, around the art. */
const SPARKS: [number, number][] = [
  [6, 5],
  [27, 8],
  [5, 25],
  [26, 26],
  [16, 2],
  [2, 15],
  [29, 17],
];

/** One frame of an item: `f` moves a rare's shine and a legendary's glow and sparkles (the `hover`
    clip, 8 frames); frame 0 is a good still for reduced motion. */
export function drawItem(o: ItemLook, f = 0): Grid {
  const legend = o.rarity === 'legendary',
    rows = legend ? LEGEND_ROWS[o.art === 'ring' || o.art === 'amulet' || o.art === 'token' || o.art === 'band' ? 'charm' : o.art] : ITEM_ROWS[o.art === 'charm' ? 'amulet' : o.art],
    c = itemColors(o),
    g = grid(32),
    p = painter(g);
  paintRows(p, rows, paletteOf(c), 4, 4);
  const emblem = o.art === 'heavy' && !legend ? EMBLEMS[pick(o.seed, EMBLEMS.length, 12)] : null;
  if (emblem) paintRows(p, emblem, paletteOf(c), 13, 11);
  // A band of light sweeps across rare and legendary things.
  if (o.rarity === 'rare' || legend) {
    const at = f * 10 - 8;
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const v = g[y][x];
        if (v && Math.abs(x + y - at) <= 1.5) g[y][x] = mix(v, '#ffffff', 0.45);
      }
  }
  let out = outline(g);
  if (!legend || !c.glow) return out;
  // A soft glow that breathes, then sparkles that twinkle in turn.
  const [, mid, hot] = c.glow,
    strong = f % 4 < 2 ? 0.6 : 0.42;
  const first = ring(out);
  first.forEach(([x, y]) => (out[y][x] = rgba(mid, strong)));
  ring(out).forEach(([x, y]) => (out[y][x] = rgba(mid, strong / 2.4)));
  out = out.map((r) => r.slice());
  const q = painter(out);
  for (let i = 0; i < 3; i++) {
    const [x, y] = SPARKS[(o.seed + i * 3) % SPARKS.length],
      size = [2, 1, 0, 0, 1, 2, 1, 0][(f + i * 3) % 8];
    if (!size) continue;
    q.p(x, y, '#ffffff');
    for (let k = 1; k <= size; k++) [[x - k, y], [x + k, y], [x, y - k], [x, y + k]].forEach(([a, b]) => q.p(a, b, k === size ? mid : hot));
  }
  return out;
}

/** The everyday art of each kind (common, magic and rare share it; their colors differ). */
export const ITEM_ROWS: Record<Exclude<ItemArt, 'charm'>, string[]> = {
  sword: [
    '.....................WD.',
    '....................WLMD',
    '..................WLMMD.',
    '.................WLMMD..',
    '................WLMMD...',
    '...............WLMMD....',
    '..............WLMMD.....',
    '.............WLMMD......',
    '............WLMMD.......',
    '...........WLMMD........',
    '....UTt...WLMMD.........',
    '.....UTt.WLMMD..........',
    '......UTEGMMD...........',
    '.......TGEGt............',
    '........gGgTt...........',
    '.......jHtUTt...........',
    '......jHh..UTt..........',
    '.....jHh....tt..........',
    '....jHh.................',
    '...jHh..................',
    '.UTt....................',
    'UEGTt...................',
    'TGgt....................',
    '.tt.....................',
  ],
  bow: [
    '...............UT.......',
    '.............jHhTW......',
    '...........jHh...W......',
    '..........jHh....W......',
    '.........jHh.....W......',
    '........jHh......W......',
    '.......jHh.......W......',
    '.......jHh.......W......',
    '......jHh........W......',
    '......jHh........W......',
    '..L..UGTt......BAW......',
    '.LWM.UETt.......BAa.....',
    'WLMMjjjjjjjjjjjjjjjjh...',
    '.MMD.UTgt.......AAa.....',
    '..D..UTTt......AaW......',
    '......jHh........W......',
    '.......jHh.......W......',
    '.......jHh.......W......',
    '........jHh......W......',
    '.........jHh.....W......',
    '..........jHh....W......',
    '...........jHh...W......',
    '.............jHhTW......',
    '...............UT.......',
  ],
  staff: [
    '..............U.......U.',
    '.............UT.......T.',
    '.............T...EE.....',
    '............UT.EEEGGG...',
    '............T..EEGGGG...',
    '............T.EEGGGGGg..',
    '............TtEGGGGGggT.',
    '.............TtGGGGggTt.',
    '..............TUTtggTt..',
    '.............jHTTtg.....',
    '............jHhA........',
    '...........jHh.aA.......',
    '..........UTt...a.......',
    '.........UTt....A.......',
    '........jHh.....a.......',
    '.......jHh..............',
    '......jHh...............',
    '.....jHh................',
    '....jHh.................',
    '...UTt..................',
    '..UTt...................',
    '.jHh....................',
    'jHh.....................',
    'Hh......................',
  ],
  wand: [
    '....................X...',
    '...................XFX..',
    '..........F.........X...',
    '...................E....',
    '..................EGg...',
    '.................EEGg...',
    '................EEGGg.F.',
    '...............EGGGg....',
    '..............EGGGg.....',
    '.............EGGgg......',
    '............UTGgt.......',
    '...........UTTTt........',
    '..........UTTt..........',
    '.........jHh............',
    '........jHh.............',
    '.......jHh..............',
    '......UTt...............',
    '.....jHh................',
    '....jHh.................',
    '...jHh..................',
    '..UTt...................',
    '.UGTt...................',
    '.Ttt....................',
    '........................',
  ],
  heavy: [
    '..WLLM............MMML..',
    '.WLLLLM..UTTttT..MMMMML.',
    'WLWLLLMMUTLWLMtTMMMMMLML',
    'WLLLLMMDTLLWLMMtDMMMMMML',
    'LLLLMMDDTLLWLMMtDDMMMMMM',
    'tTTTTTDLTLLWLMMtMDtttttt',
    '.ttttDLLLLLWLMMMMMDtttt.',
    '...TLLWLLLMWLMMMMLMMt...',
    '...TLWLLLMMWLMMMMMLMt...',
    '...TLLLLMMMWLMMMMMMMt...',
    '...TLLLMMMDWLDMMMMMMt...',
    '....TLLMMMDWLDMMMMMt....',
    '....TLMMMDDWLDDMMMMt....',
    '.....TMMMDDWLDDMMMt.....',
    '.....TTTTTTTttttttt.....',
    '.....hHHHHTUTthhhhh.....',
    '.....hhhhhtTtthhhhh.....',
    '.....LLMMDULMTDMMMM.....',
    '.....LMMDTLLMMtDMMM.....',
    '.....DDDTLLMMMMtDDD.....',
    '......TTTMMMMMMttt......',
    '.........DDDDDD.........',
    '........................',
    '........................',
  ],
  light: [
    '........................',
    '....WLM..........MML....',
    '...WLLMD..DLMD..DMMML...',
    '...WLLMMD.DLMD.DMMMML...',
    '..WLLLLMMDTAatDMMMMMML..',
    '..WLLLLLMMLhhMMMMMMMML..',
    '.WLLLLLLMMTAatMMMMMMMML.',
    '.WLLLLLLMMLhhMMMMMMMMML.',
    'WLLLLLLLMMTAatMMMMMMMMML',
    'WLLLLLLMMMLhhMMMMMMMMMML',
    'DLLLLLLMMMTAatMMMMMMMMMD',
    'DLLLLLMMMMLhhMMMMMMMMMMD',
    'DhhhhhhhhhhhhhhhhhhhhhhD',
    'DhHHHHHHHHTUTthhhhhhhhhD',
    'DLjHHLMMMMDAaDMMMMMhhHMD',
    'DLHHhLMMMMDhhDMMMMMhhhMD',
    'DLLhhMMMMMDDDDMMMMMhhMMD',
    'DLLLMMMMMMMDDMMMMMMMMMMD',
    'DLLLMMMMMMMDDMMMMMMMMMMD',
    '.DDDDDDDDDDDDDDDDDDDDDD.',
    '........................',
    '........................',
    '........................',
    '........................',
  ],
  robe: [
    '.......WLLL..MMML.......',
    '.....WLLLLLMMMMMMML.....',
    '....WLLLMMDkkDMMMMML....',
    '....WLLMDkkkkkkDMMML....',
    '....LLLMDkkkkkkDMMMM....',
    '....LLLMDkkkkkkDMMMM....',
    '...WLLLMMDkkkkDMMMMML...',
    '..WLLLLLMMDTtDMMMMMMML..',
    '.WLLLLLLMMMTtMMMMMMMMML.',
    'WLLLLDLLLMMTtMMMMMDMMMML',
    'WLLLDLLLLMMTtMMMMMMDMMML',
    'LLLLDLLLLMMTtMMMMMMDMMMM',
    'LLLDLLLLLMMTtMMMMMMMDMMM',
    'TTTDAAAAAAAAaaaaaaaaDttt',
    'tttDBAAAAAaUTaaaaaaADttt',
    '..DLLLLLMMMTtMMMMMMMMD..',
    '..DLLLLLMMMTtMMMMMMMMD..',
    '.DLLLLLMMMMTtMMMMMMMMMD.',
    '.DLLLLLMMMMTtMMMMMMMMMD.',
    'DLLLLLMMMMMTtMMMMMMMMMMD',
    'DLLLLLMMMMMTtMMMMMMMMMMD',
    'DDDDDDDDDDDTtDDDDDDDDDDD',
    '........................',
    '........................',
  ],
  ring: [
    '........................',
    '.........EEEGGG.........',
    '........EEEGGGGG........',
    '.......EEEXGGGGGG.......',
    '.......EEGGGGGGGG.......',
    '.......EGGGGGGGGg.......',
    '.......GGGGGGGGgg.......',
    '.......GGGGGGGggg.......',
    '.......GGGGGGgggg.......',
    '......UTGGGGggggT.......',
    '......UTTtGgggUTtT......',
    '....UUUUU......TTTTT....',
    '....UUU..........TTT....',
    '...TTTT..........TTTT...',
    '...TTT............TTT...',
    '...TTT............TTT...',
    '...TTTT..........TTTT...',
    '....TTT..........TTT....',
    '....ttttt......ttttt....',
    '......tttttttttttt......',
    '.......tttttttttt.......',
    '........................',
    '........................',
    '........................',
  ],
  amulet: [
    '..U..................T..',
    '...T................t...',
    '....U..............T....',
    '.....T............t.....',
    '......U..........T......',
    '.......T........t.......',
    '........U..UT..T........',
    '.........T.Tt.t.........',
    '........UUUUTTTT........',
    '.......UUUUTTTTTT.......',
    '......UUUEUEEGGTTT......',
    '......UUEXEEGGGGTT......',
    '.....UUTEEEGGGGGTTT.....',
    '.....UUEEEGGGGGGgTT.....',
    '.....UTEEGGGGGGggTT.....',
    '.....TTEGGGGGGGggTt.....',
    '.....TTGGGGGGGgggtt.....',
    '.....TTTGGGGGgggTtt.....',
    '......TTGGGGggggtt......',
    '......TTTGGggggttt......',
    '.......TTTTTTtttt.......',
    '........TTTTtttt........',
    '...........tt...........',
    '........................',
  ],
  token: [
    '...........UT...........',
    '...........T............',
    '..........UTt...........',
    '.........UUUUTt.........',
    '.......UUUUUTTTTt.......',
    '.....UUUMMMMMMMTTtt.....',
    '....UUMMMMMMMMMMMTtt....',
    '....UMMMMMMWMMMMMMtt....',
    '...UUMMMMMMWLMMMMMMtt...',
    '...UMMMMMMWLLDMMMMMMt...',
    '..UUMMMMMMWLLDMMMMMMtt..',
    '..UMMWWWWWLLLLLLLDMMMt..',
    '..UMMMWLLLLLLLLLDDMMMt..',
    '..UMMMMWLLLLLLLDDMMMMt..',
    '..UMMMMMWLLLLLDDMMMMMt..',
    '..TMMMMMWLLDLLLDMMMMMt..',
    '..TTMMMMWLDMMDLLDMMMtt..',
    '...TMMMMWDMMMMMDLDMMt...',
    '...TTMMMDMMMMMMMMDMtt...',
    '....TTMMMMMMMMMMMMtt....',
    '.....TTTMMMMMMMMttt.....',
    '.......TTtttttttt.......',
    '.........tttttt.........',
    '........................',
  ],
  band: [
    '........................',
    '........................',
    '........................',
    '........................',
    '.....UUUUUUUUUUUUUU.....',
    '...UUUUkkkkkkkkkkUUUU...',
    '..UUUkkkkkkkkkkkkkkUUU..',
    '.UUUkkkkkkkkkkkkkkkkUUU.',
    '.TTTkkkkkkkkkkkkkkkkTTT.',
    '.UTTTkkkkkkkkkkkkkkTTTt.',
    '.UUttttkkkkkkkkkktttttt.',
    '.tttttttttttttttttttttt.',
    '.UUULTETTTTTETTTTTETttt.',
    '.UUULEGGTTTEGGTTTEGGttt.',
    '.UUULGGgTTTGGgTTTGGgttt.',
    '.UUULTgTTTTTgTTTTTgTttt.',
    '.tttttttttttttttttttttt.',
    '.UUULTTTTTTTTTTTTTTTttt.',
    '..tttttttttttttttttttt..',
    '...tttttttttttttttttt...',
    '.....tttttttttttttt.....',
    '........................',
    '........................',
    '........................',
  ],
};

/** Each kind's legendary: art of its own. */
export const LEGEND_ROWS: Record<LegendArt, string[]> = {
  sword: [
    '......................WD',
    '....................WLD.',
    '..................WLFMD.',
    '...............FWLFFMD..',
    '..............FWLFXMD...',
    '.............FWLFFMD....',
    '.U..........FWLFFMD.....',
    '.TU........FWLFXMD......',
    '..TU......FWLFFMD.......',
    '..UTU....FWLFFMD........',
    '...UTTU..WLFXMD.........',
    '....tTTUUEGFMD..........',
    '.....tTUEXGgD...........',
    '.......TGGgt............',
    '........Ggt.............',
    '.....jHh..UTt...........',
    '....Hhh....UTTt.........',
    '...jHh......tTTt........',
    '..Hhh........TtTt.......',
    '.UTt..........tTt.......',
    'UEGTt...........Tt......',
    'TGgt.............t......',
    '.tt.....................',
    'X.......................',
  ],
  bow: [
    '..............UUT.......',
    '............UTt.TF......',
    '........WLUTt....F......',
    '......L.LUTt.....F......',
    '......WLUTt......F......',
    '....L.LUTt.......F......',
    '....WLUTt........F......',
    '...L.LUTt........F......',
    '...WLUTt.........F......',
    '.....UGt.........F......',
    '.F..UEXGt......F.F......',
    'FXF.TGGgt.......FFF.....',
    'XXXXXXXXXXXXXXFFFFF.....',
    'FXF..UTt.......FFF......',
    '.F...UTt.......F.F......',
    '....LUTt.........F......',
    '...LWLUTt........F......',
    '.....LUTt........F......',
    '....LWLUTt.......F......',
    '.......LUTt......F......',
    '......LWLUTt.....F......',
    '.........LUTt....F......',
    '............UTt.TF......',
    '..............UUT.......',
  ],
  staff: [
    '..........UUFU.......X..',
    '.........UUUU...........',
    '........UUUU....XXX.....',
    '........UUUU...XXXFF....',
    '.......UUUUU..XXXFFFf...',
    '.......UUUUU..XXFFFFf...',
    '.......UUUUT..XFFFFFf...',
    '.......UUUTTT..FFFFf....',
    '.......UUTTTT...fff...t.',
    '.......UTTTTTT.......tt.',
    '........TTTTTTTTt.ttttF.',
    '........TTTTTTTttttttt..',
    '.........TTTTTttttttt...',
    '.........jTTTttttttt....',
    '........jHh.tttttt......',
    '.......jHh..............',
    '......UTt...............',
    '.....jHh................',
    '....jHh.................',
    '...jHh..................',
    '..UTt...................',
    '.jHh....................',
    'jHh.....................',
    'Hh......................',
  ],
  wand: [
    '.................X......',
    '.................F......',
    '................FXF.....',
    '................FXF.....',
    '....F......XFFFFXXXFFFFX',
    '.............FFXXXXXFF..',
    '..............FXXXXXF...',
    '...............FXXXF....',
    '..............FXF.FXF...',
    '.............UTt...FXF..',
    '............XTGg.....FX.',
    '...........jHh..........',
    '..........UTt...........',
    '.........jHh............',
    '........jHh...........F.',
    '.......UTt..............',
    '......jHh...............',
    '.....jHh................',
    '....UTt.................',
    '...jHh..................',
    '..UTh...................',
    '.UGt....................',
    'UTt.....................',
    'Tt......................',
  ],
  heavy: [
    'U.WLLM............MMML.T',
    'TUWLLLM..UTTttT..MMMMLTt',
    'TTWLLLMMUTLWLMtTMMMMMLtt',
    '.TWLLMMDTLLWLMMtDMMMMLt.',
    '.UTLMMDDTLLWLMMtDDMMMtT.',
    'UTTTTTDLTLLWLMMtMDtttttT',
    '.tttTDLLULLWLMMTMMDtttt.',
    '...TLLWLTUGGGGTtMLMMt...',
    '...TLWLTUEXGGXETtMLMt...',
    '...TLLLTGGGGGGGGtMMMt...',
    '...TLLLLTGGGGGGtMMMMt...',
    '....TLLMMTggggtMMMMt....',
    '....TLMMMDTTttDMMMMt....',
    '.....TMMMDDWLDDMMMt.....',
    '.....TTTTTTTttttttt.....',
    '.....hHHHHTUTthhhhh.....',
    '.....hhhhhtTtthhhhh.....',
    '.....LLMMDULMTDMMMM.....',
    '.....LMMDTLLMMtDMMM.....',
    '.....DDDTLLMMMMtDDD.....',
    '......TTTUUTtTTttt......',
    '.........TTTttt.........',
    '........................',
    '........................',
  ],
  light: [
    '..A..................a..',
    '.AA.WLM..........MML.aa.',
    '.AaWLLMD..DLMD..DMMMLaa.',
    'AAaWLLMMD.DLMD.DMMMMLaaa',
    'Aa.WLLLMMDTFFtDMMMMML.aa',
    'Aa..WLLLMMLXXMMMMMML..aa',
    'Aa..WLLLMMTFFtMMMMML..aa',
    'Aa..WLLLMMLXXMMMMMML..aa',
    'Aa.WLLLLMMTFFtMMMMMML.aa',
    'Aa.WLLLLMMLXXMMMMMMML.aa',
    'AaDLLLLLMMTFFtMMMMMMMDaa',
    'aaDLLLLMMMLXXMMMMMMMMDaa',
    '.aDhhhhhhhhhhhhhhhhhhDa.',
    '.aDhHHHHHHTUTthhhhhhhDa.',
    '.aDLjHHLMMDFFDMMMhhHMDa.',
    '..DLHHhLMMDXXDMMMhhhMD..',
    '..DLLhhMMMDDDDMMMhhMMD..',
    '..DLLLMMMMMDDMMMMMMMMD..',
    '..DLLLMMMMMDDMMMMMMMMD..',
    '...TTTTTTTTTttttttttt...',
    '........................',
    '........................',
    '........................',
    '........................',
  ],
  robe: [
    '.......WLLL..MMML.......',
    '.....WLLLLLMMMMMMML.....',
    '....WLLLMMDkkDMMMMML....',
    '....WLLMDkkkkkkDMMML....',
    '....LLLMDkkkkkkDMMMM....',
    '....LLLMDkkkkkkDMMMM....',
    '...TTLLMMDkkkkDMMMMtt...',
    '..TUTLLLMMDTtDMMMMMtTt..',
    '.TULLLXLLMMUTMMMMXMMMTt.',
    'TULLLDLLLMMTtMMMMMDMMMTt',
    'TLLXDLLLLMMUTMMMMMMDXMMt',
    'LLLLDLLLXMMTtMMXMMMDMMMM',
    'LLLDLLLLLMMUTMMMMMMMDMMM',
    'TTTDAAAAAAAAaaaaaaaaDttt',
    'tttDBAAAAAaUTaaaaaaADttt',
    '..DLLXLLMMMTtMMMMMXMMD..',
    '..DLLLLLMMXUTXMMMMMMMD..',
    '.DLLLLLMMMMTtMMMMMMMMMD.',
    '.DLXLLLMMMMUTMMMMMMMXMD.',
    'DLLLLLMMMXMTtMXMMMMMMMMD',
    'TTTTTTTTTTTUTttttttttttt',
    'tUtUtUtUtUtTttTtTtTtTtTt',
    '........................',
    '........................',
  ],
  charm: [
    '............F...........',
    '............U...........',
    '...........TT...........',
    '...F.....UUUUUU.....F...',
    '....U..UUUUUUUUUT..U....',
    '......UUUU....UTTT......',
    '.....UUU..XXEE..TTT.....',
    '....UUU.XXXEEEEG.TTT....',
    '....UU.XXXEEEEGGG.TT....',
    '...UUU.XXEXEEGGGG.Ttt...',
    '...UU.XXEEEEGGGGGG.tt...',
    '..TUU.XEEEEGGGGGGg.ttT..',
    'FUTUU.EEEEGGGGGGgg.ttTFU',
    '...UU.EEEGGGGGGggg.tt...',
    '...UUU.EGGGGGGggg.ttt...',
    '....UT.GGGGGGgggg.tt....',
    '....TTT.GGGGgggg.ttt....',
    '.....TTT..Gggg..ttt.....',
    '......TTTT....tttt......',
    '....U..TTtttttttt..U....',
    '...F.....tttttt.....F...',
    '...........TT...........',
    '............F...........',
    '............U...........',
  ],
};
