import type { AbilityId, RelicId, SpMoveId } from '@/game/dungeon/engine';
import type { UpgradeId } from '@/lib/fog';
import type { PixelArt } from './pixel';

/* Small hand-drawn icons for the app around the game: one keepsake per Fog boss (Hero tab), and
   what a day held in the Book of Days. One character per pixel, '.' empty; shown at 2x or more. */

const K = '#0b0d14';

/** Keepsakes, 16x16, in the order of the zones (ZONES[i].keepsake). */
export const KEEPSAKE_ICONS: PixelArt[] = [
  // The Nightcap: Tomorrow's sleepy hat, the tip flopped over to its pompom
  {
    rows: [
      '................',
      '..........kkk...',
      '.........kWWwk..',
      '......kkkkwWwk..',
      '.....kBbbkkwk...',
      '....kBbbbbdk....',
      '....kBbbbbdk....',
      '...kBbbbbbbdk...',
      '...kBbbbbbbdk...',
      '..kBbbbbbbbbdk..',
      '..kBbbbbbbbbdk..',
      '.kswwwwwwwwwwsk.',
      '.kwWwWwWwWwWwwk.',
      '.kssssssssssssk.',
      '..kkkkkkkkkkkk..',
      '................',
    ],
    palette: { k: K, b: '#3b4fa8', B: '#6b84e0', d: '#26337a', w: '#d6dae3', W: '#ffffff', s: '#9ca3af' },
  },
  // A Shard of the Mirror: a sliver of glass, a glint down its edge
  {
    rows: [
      '................',
      '.......k........',
      '......kWk.......',
      '......kwlk......',
      '.....kWwlk......',
      '.....kwllck.....',
      '....kwWllck.....',
      '....kwlllcck....',
      '...kwllWlcck....',
      '...kwlllllcck...',
      '..kwlllllccck...',
      '..kllllllccck...',
      '.kkkllllcccck...',
      '....kkkllccck...',
      '.......kkkkk....',
      '................',
    ],
    palette: { k: '#0b1e33', c: '#3b82c4', l: '#8fd3f5', w: '#e0f7ff', W: '#ffffff' },
  },
  // The Knight's Visor: polished steel, a dark eye slit, a gold crest
  {
    rows: [
      '.......gg.......',
      '......gGgk......',
      '.....kkgkkk.....',
      '...kklWlmmmkk...',
      '..klWllllmmmsk..',
      '..kllllllmmmsk..',
      '.klllllllmmmssk.',
      '.kkkkkkkkkkkkkk.',
      '.kdddddddddddddk',
      '.kllllllmmmmssk.',
      '.klkllklmmkmskk.',
      '.kllllllmmmmssk.',
      '..klkllkmmkmsk..',
      '..kllllllmmssk..',
      '...kkkkkkkkkk...',
      '................',
    ],
    palette: { k: K, d: '#1c1f26', s: '#5f6773', m: '#8a93a1', l: '#c9ced6', W: '#ffffff', g: '#f3d36b', G: '#fff3b0' },
  },
  // A Cracked Stone: sandstone, split down the middle
  {
    rows: [
      '................',
      '................',
      '.....kkkkk......',
      '...kklllWlkk....',
      '..klWllclmmmk...',
      '.klllllcmmmmdk..',
      '.kllllcmmmmmmdk.',
      'kllllllcmmmmmdk.',
      'klmmmmcmmmmmddk.',
      'kmmmmmcmmmmmddk.',
      'kmmmmcmmmdmmddk.',
      '.kmmmcmmmmdddk..',
      '.kddmcmmdddddk..',
      '..kkdcdddddkk...',
      '....kkkkkkk.....',
      '................',
    ],
    palette: { k: '#2a1c0e', c: '#1a1008', d: '#6e4c2a', m: '#a8794a', l: '#d1a868', W: '#f5e2b8' },
  },
  // The Voice Stone: a smooth pebble, your Hollow's line carved small and glowing
  {
    rows: [
      '................',
      '................',
      '................',
      '.....kkkkkk.....',
      '...kkllWWllkk...',
      '..klllWWllllmk..',
      '.klllllllllmmdk.',
      '.klgGgglgGglmdk.',
      '.kllllllllmmmdk.',
      '.klmgGglgGgmmdk.',
      '.kmmmmmmmmmmddk.',
      '..kmmmmmmmdddk..',
      '...kkddddddkk...',
      '.....kkkkkk.....',
      '................',
      '................',
    ],
    palette: { k: K, d: '#3f3a52', m: '#5f5878', l: '#8b84a6', W: '#c4bedb', g: '#f3d36b', G: '#fff3b0' },
  },
  // The Wanderer's Cloak: grey, hooded, a gold clasp
  {
    rows: [
      '......kkkk......',
      '.....kllllk.....',
      '....klWllllk....',
      '....klkkkklk....',
      '....kkdddddk....',
      '...kllkgGkllk...',
      '...klmlkklmlk...',
      '..klmllmlmllmk..',
      '..klmllmlmllmk..',
      '.klmllmllmllmdk.',
      '.klmllmllmllmdk.',
      'klmmllmllmllmddk',
      'klmmllmllmllmddk',
      'kddmddmddmddmddk',
      '.kkkkkkkkkkkkkk.',
      '................',
    ],
    palette: { k: K, d: '#3f4652', m: '#6b7280', l: '#9ca3af', W: '#d1d5db', g: '#f3d36b', G: '#fff3b0' },
  },
];

export type DayKind = 'Workout' | 'Short workout' | 'Sat by the fire' | 'Rest day' | 'A visit';

/** What a day held, 12x12, for the Book of Days. */
export const DAY_ICONS: Record<DayKind, PixelArt> = {
  // a sword
  Workout: {
    rows: [
      '.........kk.',
      '........kWlk',
      '.......kWlk.',
      '......kWlk..',
      '.....kWlk...',
      '.k..kWlk....',
      '.kgkWlk.....',
      '..kgWk......',
      '..kbkgk.....',
      '.kbk..gk....',
      'kbk....k....',
      'kk..........',
    ],
    palette: { k: K, W: '#ffffff', l: '#b8c0cc', g: '#f3d36b', b: '#8a5a2b' },
  },
  // a dagger: a short one still counts
  'Short workout': {
    rows: [
      '............',
      '............',
      '.........kk.',
      '........kWlk',
      '.......kWlk.',
      '......kWlk..',
      '...k.kWlk...',
      '...kgkWk....',
      '....kgk.....',
      '...kbkgk....',
      '..kbk..k....',
      '..kk........',
    ],
    palette: { k: K, W: '#ffffff', l: '#b8c0cc', g: '#f3d36b', b: '#8a5a2b' },
  },
  // a campfire
  'Sat by the fire': {
    rows: [
      '.....k......',
      '....kyk.....',
      '....kyk..k..',
      '...kyoyk.kyk',
      '..kyoWoyk.k.',
      '..koWWWok...',
      '.kroWWWork..',
      '.kroooooork.',
      'kbBkrrrrkBbk',
      'kbbBBkkBBbbk',
      '.kkbbBBbbkk.',
      '...kkkkkk...',
    ],
    palette: { k: K, r: '#dc2626', o: '#f97316', y: '#fde047', W: '#fff7d6', b: '#5c3a1c', B: '#8a5a2b' },
  },
  // a crescent moon
  'Rest day': {
    rows: [
      '....kkkk....',
      '..kkYYyk....',
      '.kYYyyk.....',
      '.kYyyk......',
      'kYyyk.......',
      'kYyyk.......',
      'kYyyk.......',
      'kYyyyk......',
      '.kyyyyk..k..',
      '.kdyyyykkyk.',
      '..kkddddyk..',
      '....kkkkk...',
    ],
    palette: { k: K, y: '#fde68a', Y: '#fff7d6', d: '#d4a72c' },
  },
  // Vela's lamp: you came by
  'A visit': {
    rows: [
      '....kkkk....',
      '....k..k....',
      '...kkkkkk...',
      '..kmmmmmmk..',
      '..kdGGGgdk..',
      '..kdGWGgdk..',
      '..kdGGGgdk..',
      '..kdgggddk..',
      '..kdgggddk..',
      '..kmmmmmmk..',
      '...kkkkkk...',
      '............',
    ],
    palette: { k: K, m: '#6b7280', d: '#8a6a1e', g: '#f3d36b', G: '#fff3b0', W: '#ffffff' },
  },
};

const KIT = {
  k: K,
  W: '#ffffff',
  l: '#c9ced6',
  m: '#7b8492',
  d: '#3a3f48',
  n: '#9ca3af',
  g: '#f3d36b',
  G: '#fff3b0',
  y: '#fde047',
  o: '#f97316',
  r: '#b91c1c',
  R: '#ef4444',
  p: '#fecaca',
  b: '#8a5a2b',
  B: '#5c3a1c',
  c: '#2a2522',
  s: '#38bdf8',
  S: '#bae6fd',
  v: '#a78bfa',
  V: '#ede9fe',
  e: '#10b981',
  E: '#a7f3d0',
};

/** The dungeon's relics, 12x12 (chest choices and the run's relic row). */
export const RELIC_ICONS: Record<RelicId, PixelArt> = {
  // a blade on a whetstone, sparks off the edge
  whetstone: {
    rows: [
      '.........k..',
      '........kWk.',
      '.......kWlk.',
      '......kWlk..',
      '.....kWlk.G.',
      '....kWlk..y.',
      '.kkkkkkkkkk.',
      'knnlnnnnlnnk',
      'knnnnnnnnndk',
      'kdnndnndnddk',
      '.kkkkkkkkkk.',
      '............',
    ],
    palette: KIT,
  },
  // a lightning bolt
  quick: {
    rows: [
      '......kkkk..',
      '.....kGyk...',
      '....kGyk....',
      '...kGyk.....',
      '..kGykkkk...',
      '.kGyyyyGk...',
      '.kkkkGyk....',
      '....kGyk....',
      '...kGyk.....',
      '..kGyk......',
      '.kyk........',
      '.kk.........',
    ],
    palette: KIT,
  },
  // a riveted steel shield
  iron: {
    rows: [
      '.kkkkkkkkkk.',
      'kWllllllmmdk',
      'klWllllmmmdk',
      'kllllllmmmdk',
      'klllllmmmmdk',
      'kllllmmmmmdk',
      '.klllmmmmdk.',
      '.kllmmmmmdk.',
      '..klmmmmdk..',
      '...kmmmdk...',
      '....kmdk....',
      '.....kk.....',
    ],
    palette: KIT,
  },
  // a boot with a little wing
  boots: {
    rows: [
      '............',
      '...kkkk.....',
      '...kbbk.kk..',
      '...kbbkkWSk.',
      '...kbbkSSk..',
      '...kbbbkk...',
      '...kbbbbk...',
      '..kbbbbbbkk.',
      '..kbbbbbbbbk',
      '..kBBBBBBBBk',
      '..kkkkkkkkk.',
      '............',
    ],
    palette: KIT,
  },
  // a heart-shaped red stone
  heart: {
    rows: [
      '............',
      '..kkk..kkk..',
      '.kpRRkkRRrk.',
      'kpWRRRRRRrrk',
      'kpRRRRRRRrrk',
      'kRRRRRRRRrrk',
      '.kRRRRRRrrk.',
      '..kRRRRrrk..',
      '...kRRrrk...',
      '....kRrk....',
      '.....kk.....',
      '............',
    ],
    palette: KIT,
  },
  // an hourglass, sand running
  hourglass: {
    rows: [
      '.kkkkkkkkkk.',
      '.kbbbbbbbbk.',
      '..kSggggSk..',
      '..kSGggGSk..',
      '...kSggSk...',
      '....kSgk....',
      '....kgSk....',
      '...kSgSSk...',
      '..kSSgSSSk..',
      '..kSggggSk..',
      '.kbbbbbbbbk.',
      '.kkkkkkkkkk.',
    ],
    palette: KIT,
  },
  // a fang, a drop of red
  fang: {
    rows: [
      '.kkkkkkk....',
      'kWWWWllmk...',
      'kWWWllmmk...',
      '.kWWllmk....',
      '.kWWlmk.....',
      '..kWlmk.....',
      '..kWlk...k..',
      '...kWk..kRk.',
      '...kWk.kRRrk',
      '....k..kpRrk',
      '........kkk.',
      '............',
    ],
    palette: KIT,
  },
  // a coal glowing through its cracks, a flame on top
  coal: {
    rows: [
      '.....k......',
      '....kyk.....',
      '...kyok.....',
      '...koyok....',
      '..kkkokkk...',
      '.kddcocddk..',
      'kdccoocccdk.',
      'kcdccoccdck.',
      'kccoccccocck',
      '.kccooocck..',
      '..kkkkkkk...',
      '............',
    ],
    palette: KIT,
  },
  // a gold amulet with a sky-blue ward stone
  charm: {
    rows: [
      '..k......k..',
      '...k....k...',
      '....kkkk....',
      '...kgGGgk...',
      '..kgsSSsgk..',
      '.kgsSWSssgk.',
      '.kGsSSsssgk.',
      '.kgssssssbk.',
      '..kgssssbk..',
      '...kgbbgk...',
      '....kkkk....',
      '............',
    ],
    palette: KIT,
  },
};

/** The class abilities and the dodge, 12x12, for the round buttons in a run. */
export const ABILITY_ICONS: Record<AbilityId | 'dodge', PixelArt> = {
  // a rush forward
  charge: {
    rows: [
      '............',
      'kkk...kkk...',
      'kWlk..kWlk..',
      '.kWlk..kWlk.',
      '..kWlk..kWlk',
      '...kWlk.kWlk',
      '...kWlk.kWlk',
      '..kWlk..kWlk',
      '.kWlk..kWlk.',
      'kWlk..kWlk..',
      'kkk...kkk...',
      '............',
    ],
    palette: KIT,
  },
  // three arrows loosed at once
  volley: {
    rows: [
      '.k...k...k..',
      'kWk.kWk.kWk.',
      'klk.klk.klk.',
      '.b...b...b..',
      '.b...b...b..',
      '.b...b...b..',
      '.b...b...b..',
      '.b...b...b..',
      'kSk.kSk.kSk.',
      'S.S.S.S.S.S.',
      '............',
      '............',
    ],
    palette: KIT,
  },
  // a burst of violet light
  blink: {
    rows: [
      '.....k......',
      '....kvk.....',
      '....kvk.....',
      '...kvVvk....',
      'kkkvVWVvkkk.',
      'kvvVWWWVvvk.',
      'kkkvVWVvkkk.',
      '...kvVvk....',
      '....kvk.....',
      '....kvk..k..',
      '.....k..kvk.',
      '.........k..',
    ],
    palette: KIT,
  },
  // a leaf, breathing
  still: {
    rows: [
      '.....k......',
      '....kek.....',
      '...keEek....',
      '...keEek....',
      '.k.keEek.k..',
      'kekkeEekkek.',
      'keEkeEekEek.',
      '.keEeEeEek..',
      '..keeEeek...',
      '...kkekk....',
      '....kek.....',
      '.....k......',
    ],
    palette: KIT,
  },
  // rings rolling out
  shock: {
    rows: [
      '....kkkk....',
      '..kksssskk..',
      '.kss....ssk.',
      '.ks..kk..sk.',
      'ks..kSSk..sk',
      'ks.kSWWSk.sk',
      'ks.kSWWSk.sk',
      'ks..kSSk..sk',
      '.ks..kk..sk.',
      '.kss....ssk.',
      '..kksssskk..',
      '....kkkk....',
    ],
    palette: KIT,
  },
  // a gust: slip through
  dodge: {
    rows: [
      '............',
      '....kkkkkkk.',
      '...kSSSSSSSk',
      '....kkkkkkk.',
      '............',
      '.kkkkkkkkk..',
      'kWWWWWWWWSk.',
      '.kkkkkkkkk..',
      '............',
      '...kkkkkk...',
      '..kSSSSSSk..',
      '...kkkkkk...',
    ],
    palette: KIT,
  },
};

/** The colors of each later SP's light, dark to light (as in characters/spLooks.ts). */
const ELEMENT: Record<string, [string, string, string]> = {
  stone: ['#6b4f2a', '#c49a5a', '#f0dcb0'],
  storm: ['#3b4fb8', '#facc15', '#fef08a'],
  dawn: ['#b45309', '#fbbf24', '#fff7d6'],
  frost: ['#1e40af', '#93c5fd', '#f0f9ff'],
  leaf: ['#166534', '#4ade80', '#d9f99d'],
  moon: ['#312e81', '#a5b4fc', '#eef2ff'],
  crystal: ['#0e7490', '#67e8f9', '#f0abfc'],
  sand: ['#92400e', '#f59e0b', '#fef3c7'],
  void: ['#3b0764', '#a855f7', '#f3e8ff'],
  tiger: ['#9a3412', '#fb923c', '#ffedd5'],
  lotus: ['#065f46', '#34d399', '#fde68a'],
  sun: ['#b45309', '#fbbf24', '#fffbeb'],
};

/** One drawing for each kind of SP move (SpShape in src/game/dungeon/content.ts): 1, 2, 3 are the
    element's dark, middle and light. */
const SHAPED: Record<string, string[]> = {
  // a ring breaking out all round
  ring: ['....1111....', '..11222211..', '.12......21.', '.2..3..3..2.', '12...33...21', '12..3WW3..21', '12..3WW3..21', '12...33...21', '.2..3..3..2.', '.12......21.', '..11222211..', '....1111....'],
  // something heavy falling on a mark
  drop: ['.....kk.....', '....k33k....', '...k3WW3k...', '...k2332k...', '....k22k....', '.....kk.....', '.....2......', '.....2......', '...1....1...', '..1.2..2.1..', '.1..2332..1.', '111111111111'],
  // you as a streak, rushing
  dash: ['............', '.......kkk..', '1.....k33Wk.', '.2...k333Wk.', '1.22.k3333k.', '.2222k333k..', '1.22.k333k..', '.2...k3k3k..', '1.....k.k...', '............', '..111111111.', '............'],
  // a bolt jumping between three
  chain: ['k..........k', '3k........k3', '.3k......k3.', '..2W....W2..', '..k2k..k2k..', '.....2W.....', '....k2Wk....', '.....W2.....', '..k2k..k2k..', '.32......23.', '3k........k3', 'k..........k'],
  // a shield of light round you
  guard: ['....2222....', '..22333322..', '.23......32.', '.3...kk...3.', '23..kWWk..32', '3..kWWWWk..3', '3..kWWWWk..3', '23..kWWk..32', '.3...kk...3.', '.23......32.', '..22333322..', '....2222....'],
  // a great flash
  nova: ['3....33....3', '.3...22...3.', '..3..11..3..', '...3kWWk3...', '33.kWWWWk.33', '221WWWWWW122', '221WWWWWW122', '33.kWWWWk.33', '...3kWWk3...', '..3..11..3..', '.3...22...3.', '3....33....3'],
  // a patch on the ground that keeps hitting
  field: ['..3.....3...', '.3W3...3W3..', '..3..3..3...', '.....W3.....', '..3..3...3..', '.3W3....3W3.', '..3.......3.', '............', '..11111111..', '.1222222221.', '1223333332 1', '.1111111111.'],
  // a few shots spread ahead
  fan: ['..........3.', '.........32.', '......3.2...', '.....32.....', '..........3.', 'kk...3222W2.', 'kWk.........', 'kk...3222W2.', '..........3.', '.....32.....', '......3.2...', '.........32.'],
  // shots flying out every way
  volley: ['.....3......', '..3..2..3...', '...2.2.2....', '....222.....', '3221kWk1223.', '....222.....', '...2.2.2....', '..3..2..3...', '.....3......', '............', '............', '............'],
  // the whole room struck at once
  all: ['3.3.3.3.3.3.', '2.2.2.2.2.2.', '.2.2.2.2.2.2', 'k.k.k.k.k.k.', '............', '..3......3..', '.3W3....3W3.', '..3..3...3..', '....3W3.....', '.....3......', '1.1.1.1.1.1.', '111111111111'],
};

/** An SP move's icon from its kind and its element. */
function shaped(shape: string, element: string): PixelArt {
  const [a, b, c] = ELEMENT[element];
  return { rows: SHAPED[shape].map((r) => r.replace(/ /g, '.')), palette: { k: K, W: '#ffffff', '1': a, '2': b, '3': c } };
}

/** Each SP's own move and final, 12x12 (the run's SP buttons and the Hero tab's SP card). */
export const SP_ICONS: Record<SpMoveId, PixelArt> = {
  // a blade spun in a ring
  whirl: {
    rows: [
      '....kkkk....',
      '..kkGGGGkk..',
      '.kGg....gGk.',
      '.kg..kk..gk.',
      'kG..kWlk..Gk',
      'kg.kWlk...gk',
      'kg.klk....gk',
      'kG.kk.....Gk',
      '.kg......gk.',
      '.kGg....gGk.',
      '..kkGGGGkk..',
      '....kkkk....',
    ],
    palette: KIT,
  },
  // arrows in a tight line
  pin: {
    rows: [
      '..........k.',
      '.........kWk',
      '........kWk.',
      '...k...klk..',
      '..kWk.kbk...',
      '.kWk.kbk....',
      '..klkbk.....',
      '...kbk......',
      '..kbk.......',
      '.kSk........',
      'kSSk........',
      '.kk.........',
    ],
    palette: KIT,
  },
  // a star falling
  starfall: {
    rows: [
      'k...........',
      '.kv.........',
      '..kv........',
      '...kv..k....',
      '....kvkVk...',
      '...kkVWVkk..',
      '..kVWWWWWVk.',
      '...kkVWVkk..',
      '....kVkVk...',
      '....kk.kk...',
      '............',
      '............',
    ],
    palette: KIT,
  },
  // an open hand pushing air
  palm: {
    rows: [
      '...k.k.k....',
      '..kSkSkSk...',
      '..kSkSkSk.k.',
      '..kSkSkSkkSk',
      '..kSSSSSkSk.',
      '..kSSSSSSSk.',
      '..kSSSSSSk..',
      '...kSSSSk...',
      '...kSSSSk...',
      's..kkkkkk..s',
      '.s.......s..',
      '..ssssssss..',
    ],
    palette: KIT,
  },
  // a blade in a ring of fire
  phoenix: {
    rows: [
      '..k..kk..k..',
      '.kok.kok.kok',
      '.kook..kook.',
      'koyok.kWkyok',
      'kok..kWlk.ok',
      'ko..kWlk..ok',
      'ko.kWlk...ok',
      'kokbkk...yok',
      '.kBk.....ok.',
      'kBk.ookooko.',
      'kk..kkoyok..',
      '.....kkkk...',
    ],
    palette: KIT,
  },
  // arrows falling from the sky
  rain: {
    rows: [
      '.k...k...k..',
      '.b...b...b..',
      '.b...b...b..',
      'kWk.kWk.kWk.',
      '.k...k...k..',
      '...k...k...k',
      '...b...b...b',
      '...b...b...b',
      '..kWk.kWk.kW',
      '...k...k...k',
      'e.e.e.e.e.e.',
      'eeeeeeeeeeee',
    ],
    palette: KIT,
  },
  // the sky cracking open
  sky: {
    rows: [
      'vvvvvvvvvvvv',
      'VVkVVVVVkVVV',
      '..kv....kv..',
      '...kv..kv...',
      '....kWWk....',
      '...kWWWWk...',
      '..kWWWWWWk..',
      '...kWWWWk...',
      '....kWWk....',
      '..kv....vk..',
      '.kv......vk.',
      'kv........vk',
    ],
    palette: KIT,
  },
  // many hands at once
  palms: {
    rows: [
      '.k.k...k.k..',
      'kSkSk.kSkSk.',
      'kSSSk.kSSSk.',
      '.kSk...kSk..',
      '.....k.k....',
      '....kSkSk...',
      '....kSSSk...',
      '.k.k.kSk.k.k',
      'kSkSk...kSkS',
      'kSSSk...kSSS',
      '.kSk.....kSk',
      'sssssssssss.',
    ],
    palette: KIT,
  },
  // The later SPs' moves: one drawing for each kind of move, in the SP's own colors (ELEMENT).
  quake: shaped('ring', 'stone'),
  mountain: shaped('drop', 'stone'),
  thunderdash: shaped('dash', 'storm'),
  thunderclap: shaped('chain', 'storm'),
  sunguard: shaped('guard', 'dawn'),
  dawnbreak: shaped('nova', 'dawn'),
  frostarrow: shaped('fan', 'frost'),
  blizzard: shaped('field', 'frost'),
  thorntrap: shaped('field', 'leaf'),
  wildvolley: shaped('volley', 'leaf'),
  shadowstep: shaped('dash', 'moon'),
  moonfall: shaped('chain', 'moon'),
  shards: shaped('volley', 'crystal'),
  prism: shaped('chain', 'crystal'),
  hourglass: shaped('field', 'sand'),
  stopsands: shaped('all', 'sand'),
  voidstep: shaped('dash', 'void'),
  rift: shaped('field', 'void'),
  pounce: shaped('dash', 'tiger'),
  hundredclaws: shaped('chain', 'tiger'),
  lotus: shaped('guard', 'lotus'),
  nirvana: shaped('nova', 'lotus'),
  risingsun: shaped('drop', 'sun'),
  solarflare: shaped('all', 'sun'),
};

/** The run's level-up skills, 12x12; a few share a relic's drawing because they do the same thing. */
export const SKILL_ICONS: Record<UpgradeId, PixelArt> = {
  // a heavy hammer
  power: {
    rows: [
      '.kkkkkkkk...',
      'kWllllllmk..',
      'kllllllmmdk.',
      'kmmmmmmmmdk.',
      '.kkkkbkkkk..',
      '.....kbk....',
      '.....kbk....',
      '.....kbk....',
      '.....kbk....',
      '.....kBk....',
      '.....kBk....',
      '......k.....',
    ],
    palette: KIT,
  },
  haste: RELIC_ICONS.quick,
  // two shots where there was one
  multi: {
    rows: [
      '............',
      '..kkk.......',
      '.kSWSk......',
      'kSWWWsk.....',
      'kSWWWsk.....',
      '.ksssk.kkk..',
      'S.kkk.kSWSk.',
      '.....kSWWWsk',
      '..S.SkSWWWsk',
      '......ksssk.',
      '.......kkk..',
      '............',
    ],
    palette: KIT,
  },
  // a flame
  flame: {
    rows: [
      '.....k......',
      '....kyk.....',
      '....kyk..k..',
      '...kyoyk.kk.',
      '..kyoWoykyk.',
      '..koWWWoyk..',
      '.kroWWWWok..',
      '.kroWWWWork.',
      '.kroyWWyork.',
      '..kroyyork..',
      '...krrrrk...',
      '....kkkk....',
    ],
    palette: KIT,
  },
  // lightning jumping between three
  spark: {
    rows: [
      '.......kkk..',
      '......kSSk..',
      '.....kSWk...',
      '....kSWk.k..',
      '...kSWWkkSk.',
      '..kSWWSSWk..',
      '.kkkkSWkk...',
      '....kSk.....',
      '...kSk..k...',
      '..kSk..kSk..',
      '..kk..kSWk..',
      '.......kk...',
    ],
    palette: KIT,
  },
  // a burst of ash light
  nova: {
    rows: [
      '.....kk.....',
      '..k..kgk..k.',
      '.kgk.kgk.kgk',
      '..kgkkgkkgk.',
      '...kgGGGgk..',
      'kkkgGWWWGgkk',
      'kggGWWWWGggk',
      '.kkgGWWGgkk.',
      '...kgGGgk...',
      '..kgk.kkgk..',
      '.kgk...kkgk.',
      '..k......k..',
    ],
    palette: KIT,
  },
  swift: RELIC_ICONS.boots,
  // a heart, a white plus
  vital: {
    rows: [
      '............',
      '..kkk..kkk..',
      '.kpRRkkRRrk.',
      'kpRRRWWRRrrk',
      'kpRRRWWRRrrk',
      'kRRWWWWWWrrk',
      '.kRWWWWWWrk.',
      '..kRRWWrrk..',
      '...kRWWrk...',
      '....kRrk....',
      '.....kk.....',
      '............',
    ],
    palette: KIT,
  },
  // a horseshoe magnet
  magnet: {
    rows: [
      '...kkkkkk...',
      '..kRRRRRRk..',
      '.kRpRRRRRrk.',
      'kRpRkkkkRRrk',
      'kRRk....kRrk',
      'kRRk....kRrk',
      'kRRk....kRrk',
      'kkkk....kkkk',
      'kWlk....kWlk',
      'klmk....klmk',
      'kkkk....kkkk',
      '............',
    ],
    palette: KIT,
  },
  guard: RELIC_ICONS.iron,
};

/** Marks on the run's floor track and recap: the Warden of the Ashes, and the zone's boss. */
export const MARK_ICONS: Record<'warden' | 'boss', PixelArt> = {
  // a burning brazier: the Warden's ashes
  warden: {
    rows: [
      '...k..k.....',
      '..kyk.kk....',
      '..koykyk.k..',
      '.kyoWoyokyk.',
      '.koWWWoyok..',
      '.kroWWoork..',
      'kkkkkkkkkkk.',
      'kmmlmmmlmmk.',
      '.kmmmmmmmk..',
      '..kdmmmdk...',
      '..kkdddkk...',
      '.kdk...kdk..',
    ],
    palette: KIT,
  },
  // a skull
  boss: {
    rows: [
      '...kkkkkk...',
      '..kWWWWWlk..',
      '.kWWWWWWWlk.',
      '.kWWWWWWWlk.',
      '.kWkkWWkklk.',
      '.kWkrWWkrlk.',
      '.kWWWkkWWlk.',
      '..kWWkkWlk..',
      '...kWlWlk...',
      '...kWkWkk...',
      '....kkkk....',
      '............',
    ],
    palette: KIT,
  },
};

/** The zones of the Fog, 16x16 framed views, in the order of ZONES (the Play tab's road). */
export const ZONE_ICONS: PixelArt[] = [
  // The Ashen Edge: an ember sun going down over a cliff of ash
  {
    rows: [
      'kkkkkkkkkkkkkkkk',
      'kppppppppppppppk',
      'kppppppppppppppk',
      'kpppppqqqqpppppk',
      'kpppqqqooqqqpppk',
      'kppqqqoyyoqqqppk',
      'kpqqqqoyyoqqqqqk',
      'kqqqqqqooqqqqqqk',
      'kqqqqqqqqqqqAAAk',
      'kqqqqqqqqqqAaaak',
      'kqqqqqqqqqAaaaak',
      'kAAqqqqqqAaaeaak',
      'kaaAAqqqAaaaaaak',
      'kaaaaAAAaaeaaaak',
      'kaeaaaaaaaaaaaak',
      'kkkkkkkkkkkkkkkk',
    ],
    palette: { k: '#0b0d14', p: '#2a1a24', q: '#5c2a24', o: '#f97316', y: '#fde68a', a: '#3f3f46', A: '#6b6b75', e: '#fb923c' },
  },
  // Mirror Lake: the moon, and the moon again in the water
  {
    rows: [
      'kkkkkkkkkkkkkkkk',
      'knnnnnnnnnnnnnnk',
      'knnnnnnnnnmmnnnk',
      'knnMnnnnnmmmmnnk',
      'knnnnnnnnmmmmnnk',
      'kNNNNNNNNNmmNNNk',
      'kNNNNNMNNNNNNNNk',
      'ksssNNNNNNNNsssk',
      'kwwwwwwwwwwwwwwk',
      'kwWwwwwwwwMMwwwk',
      'kwwwwwwwwMmmMwwk',
      'kwwwWwwwwwMMwwwk',
      'kwwwwwwwwwwwwWwk',
      'kwWwwwwwwwMwwwwk',
      'kwwwwwwwwwwwwwwk',
      'kkkkkkkkkkkkkkkk',
    ],
    palette: { k: '#0b0d14', n: '#0f1a33', N: '#1e2f57', m: '#f2fdff', M: '#8fc4e8', w: '#16405e', W: '#2b78ad', s: '#14241c' },
  },
  // The Cold Forges: an anvil over the forge's glow
  {
    rows: [
      'kkkkkkkkkkkkkkkk',
      'kddddddddddddddk',
      'kddyddddddddoddk',
      'kdddddoddddddddk',
      'kddddddddydddddk',
      'kddddddddddddddk',
      'kdIIIIIIIIIIdddk',
      'kdiIIIIIIIIIIIdk',
      'kddiiiiiiiiiiddk',
      'kdddddiiiiddDddk',
      'kddDddiiiiddddDk',
      'kdddddiiiiddDddk',
      'kddddiiiiiiddddk',
      'koooooooooooooDk',
      'kOOOOOOOOOOOOOOk',
      'kkkkkkkkkkkkkkkk',
    ],
    palette: { k: '#0b0d14', d: '#1e1b1c', D: '#3a3433', i: '#46403c', I: '#8a8078', o: '#c2410c', O: '#f97316', y: '#fde68a' },
  },
  // The Flat Road: a mesa under a pale sun, the road running to it
  {
    rows: [
      'kkkkkkkkkkkkkkkk',
      'kssssssssssssssk',
      'ksssssssssyysssk',
      'kssssssssyYYyssk',
      'ksssssssssyysssk',
      'kSSSSSSSSSSSSSSk',
      'kSSggggggSSSSSSk',
      'kSSMMMMMMSSSSSSk',
      'kSMMMMMMMmSSSSSk',
      'kSMMMmMMMmmSSSSk',
      'kMMMMMMMmmmmSSSk',
      'kttttttrrttttttk',
      'ktttttrrrrtttttk',
      'kttttrrrrrrttttk',
      'ktttrrrrrrrrtttk',
      'kkkkkkkkkkkkkkkk',
    ],
    palette: { k: '#0b0d14', s: '#f2d6a2', S: '#e3b77e', y: '#fde68a', Y: '#ffffff', g: '#4d7c0f', M: '#c08a52', m: '#8f6338', t: '#a8834f', r: '#78716c' },
  },
  // The Hollow Woods: bare trees in the mist, and eyes between them
  {
    rows: [
      'kkkkkkkkkkkkkkkk',
      'kbbbbbbbbbbbbbbk',
      'kbtbbbbbbbbbtbbk',
      'kbtbbbtbbbbbtbbk',
      'kbttbtbbbbbbttbk',
      'kbbtttbbbtbtbbbk',
      'kbbbtbbbbbttbbbk',
      'kbbbtbbbbbbtbbbk',
      'kGbbtbbbbbbtbbGk',
      'kGGbtbbebebtbGGk',
      'klGGtGbbbbGtGGlk',
      'kllGtGGGGGGtGllk',
      'kGllllGGGGlllGGk',
      'kGGGllllllllGGGk',
      'kgGgGGgGGgGGgGgk',
      'kkkkkkkkkkkkkkkk',
    ],
    palette: { k: '#0b0d14', b: '#10201c', t: '#050b09', G: '#2f5f52', l: '#79bea6', g: '#1d4038', e: '#c084fc' },
  },
  // The Summit: a peak in the snow
  {
    rows: [
      'kkkkkkkkkkkkkkkk',
      'kbbbbbbbbbbbbbbk',
      'kbbbbbbwbbbbbbbk',
      'kbbbbbbwwbbbbbbk',
      'kbbbbbwwWwbbbbbk',
      'kbbbbwwWRRwbbbbk',
      'kbbbbwWRRRrbbbbk',
      'kbbbwWRRRrrrbbbk',
      'kbbwWRRRRrrrrbbk',
      'kbwWRRRrRRrrrrbk',
      'kwWRRRRRRRRrrrrk',
      'kRRRRRrRRRRRrrrk',
      'kRRRRRRRRRRrrrrk',
      'kwWwwWwwwWwwwWwk',
      'kWwwwwwwwwwwwwwk',
      'kkkkkkkkkkkkkkkk',
    ],
    palette: { k: '#0b0d14', b: '#a9c6e8', w: '#ffffff', W: '#d5e3f2', R: '#7c8aa0', r: '#526075' },
  },
];

/** Small marks for the screens around the game: a heart (full or spent), a check, a padlock, a
    bookmark (kept or not), the Book of Days, an arrow on, a little flame (no face: that's Ember's),
    play, and close; the tab bar's four (crossed swords, a skill tree, a game pad, a shield) and the
    developer's wrench. */
export const UI_ICONS: Record<'heart' | 'heartEmpty' | 'check' | 'lock' | 'bookmark' | 'bookmarkKept' | 'book' | 'chevron' | 'flame' | 'play' | 'close' | 'tabToday' | 'tabTrain' | 'tabPlay' | 'tabHero' | 'wrench', PixelArt> = {
  heart: {
    rows: [
      '.rr.rr.',
      'rWrrrrr',
      'rrrrrrd',
      'rrrrrrd',
      '.rrrrd.',
      '..rrd..',
      '...d...',
    ],
    palette: { r: '#ef4444', d: '#b91c1c', W: '#fecaca' },
  },
  heartEmpty: {
    rows: [
      '.ee.ee.',
      'eFFeFFe',
      'eFFFFFe',
      'eFFFFFe',
      '.eFFFe.',
      '..eFe..',
      '...e...',
    ],
    palette: { e: '#3a4060', F: '#1c2033' },
  },
  check: {
    rows: [
      'kkkkkkkkkk',
      'kGGGGGGGgk',
      'kGGGGGGWgk',
      'kGGGGGWWgk',
      'kGWGGWWGgk',
      'kGWWWWGGgk',
      'kGGWWGGGgk',
      'kGGGGGGGgk',
      'kggggggggk',
      'kkkkkkkkkk',
    ],
    palette: { k: K, G: '#10b981', g: '#047857', W: '#ecfdf5' },
  },
  lock: {
    rows: [
      '..kkkkk..',
      '.ksSSSsk.',
      '.ks...sk.',
      '.ks...sk.',
      'kkkkkkkkk',
      'kYYYYYYyk',
      'kYyykyyyk',
      'kYyykyyyk',
      'kyyyyyyyk',
      'kkkkkkkkk',
    ],
    palette: { k: K, s: '#64748b', S: '#cbd5e1', Y: '#fde68a', y: '#d4a017' },
  },
  bookmark: {
    rows: ['sssss', 's...s', 's...s', 's...s', 's...s', 'ss.ss', 's...s'],
    palette: { s: '#94a3b8' },
  },
  bookmarkKept: {
    rows: ['YYYYY', 'YyyyY', 'YyWyY', 'YyyyY', 'YyyyY', 'YY.YY', 'Y...Y'],
    palette: { Y: '#d4a017', y: '#fbbf24', W: '#fde68a' },
  },
  book: {
    rows: ['kkkkkkkk.', 'kbbbbbbwk', 'kbYYYYbwk', 'kbbbbbbwk', 'kbbYYbbwk', 'kbbbbbbwk', 'kBBBBBBwk', 'kkkkkkkk.'],
    palette: { k: '#1c1917', b: '#9a3412', B: '#7c2d12', Y: '#fbbf24', w: '#e7e5e4' },
  },
  chevron: {
    rows: ['s...', 'ss..', '.ss.', '..ss', '.ss.', 'ss..', 's...'],
    palette: { s: '#94a3b8' },
  },
  flame: {
    rows: ['...o...', '...oo..', '..ooo..', '.ooyoo.', '.oyyyo.', 'ooyWyoo', 'ooyWyoo', '.ooyoo.', '..ooo..'],
    palette: { o: '#f97316', y: '#fde68a', W: '#ffffff' },
  },
  play: {
    rows: ['k....', 'kk...', 'kkk..', 'kkkk.', 'kkkkk', 'kkkk.', 'kkk..', 'kk...', 'k....'],
    palette: { k: K },
  },
  close: {
    rows: ['x.....x', 'xx...xx', '.xx.xx.', '..xxx..', '.xx.xx.', 'xx...xx', 'x.....x'],
    palette: { x: '#7dd3fc' },
  },
  tabToday: {
    rows: ['W.......W', 'sW.....Ws', '.sW...Ws.', '..sW.Ws..', '...sWs...', '..hs.sh..', '.bh...hb.', 'bb.....bb', 'b.......b'],
    palette: { W: '#f1f5f9', s: '#94a3b8', h: '#fbbf24', b: '#92400e' },
  },
  // A dumbbell: training of any kind.
  tabTrain: {
    rows: ['.gg...gg.', 'gWg...gWg', 'gWgsssgWg', 'gggsssggg', 'dgd...dgd', '.dd...dd.'],
    palette: { g: '#f97316', W: '#fed7aa', d: '#c2410c', s: '#cbd5e1' },
  },
  tabPlay: {
    rows: ['.kkkkkkk.', 'kgggggggk', 'kgWgggrgk', 'kWWWgrgrk', 'kgWgggrgk', 'kggkkkggk', '.kk...kk.'],
    palette: { k: '#94a3b8', g: '#475569', W: '#f1f5f9', r: '#ef4444' },
  },
  tabHero: {
    rows: ['kkkkkkkkk', 'kBbbbYbbk', 'kBbbbYbbk', 'kYYYYYYYk', 'kbbbbYbbk', '.kbbbYbk.', '.kbbbYbk.', '..kbbYk..', '...kkk...'],
    palette: { k: '#cbd5e1', B: '#8ea2ef', b: '#4a5fc0', Y: '#fbbf24' },
  },
  wrench: {
    rows: ['.....xx..', '....x..x.', '....x...x', '.....x.x.', '....xxx..', '...xxx...', '..xxx....', '.xxx.....', '.xx......'],
    palette: { x: '#7dd3fc' },
  },
};
