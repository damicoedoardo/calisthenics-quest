import type { AbilityId, RelicId, SpMoveId } from '@/game/dungeon/engine';
import { SP_CARDS, SP_MOVES, type SpElement, type SpShape } from '@/game/dungeon/content';
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

/** The colors of an SP's moves, dark to light, by the SP's element (as its look in characters/spLooks.ts). */
const ELEMENT: Record<SpElement, [string, string, string]> = {
  fire: ['#9a3412', '#f97316', '#fde047'],
  water: ['#1e40af', '#60a5fa', '#e0f2fe'],
  light: ['#b45309', '#fcd34d', '#fffbeb'],
  shadow: ['#3b0764', '#a855f7', '#f3e8ff'],
};

/** The element of the SP that has each move. */
const MOVE_ELEMENT = Object.fromEntries(
  Object.values(SP_CARDS).flatMap((cards) => cards.flatMap((c) => [[c.skill, c.element], [c.final, c.element]])),
) as Record<SpMoveId, SpElement>;

/* The SP move icons, 12x12. 1, 2, 3 are the element's dark, middle and light; W white, k the
   outline; m steel, d iron, b wood. */

/** One drawing for each kind of SP move (SpShape in src/game/dungeon/content.ts), for a move
    that has no drawing of its own in SP_ROWS. */
const SHAPED: Record<SpShape, string[]> = {
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
  // a patch on the ground that keeps hitting
  field: ['..3.....3...', '.3W3...3W3..', '..3..3..3...', '.....W3.....', '..3..3...3..', '.3W3....3W3.', '..3.......3.', '............', '..11111111..', '.1222222221.', '122333333221', '.1111111111.'],
  // the whole room struck at once
  all: ['3.3.3.3.3.3.', '2.2.2.2.2.2.', '.2.2.2.2.2.2', 'k.k.k.k.k.k.', '............', '..3......3..', '.3W3....3W3.', '..3..3...3..', '....3W3.....', '.....3......', '1.1.1.1.1.1.', '111111111111'],
  // a line on the floor that burns
  wall: ['............', '............', '............', '............', '.3..3..3..3.', '323323323323', '3W33W33W33W3', '222222222222', '111111111111', 'kkkkkkkkkkkk', '............', '............'],
  // a jump and a crash
  leap: ['..kkkk......', '.k2222k.....', 'k2k..k2k....', 'kk....k2k...', '.......k2k..', '........k2k.', '.........kk.', '............', '..3..3..3...', '.3W3.33.3W3.', '123321123321', '111111111111'],
  // a throw on a line that drags back
  hook: ['.....kk.....', '....k22k....', '....k2k.....', '....k2k.....', '....k2k.....', '....k2k.....', '.k..k2k.....', 'k3k.k2k.....', 'k3k.k2k.....', '.k3kk2k.....', '..k333k.....', '...kkk......'],
  // a throw that comes back
  boomerang: ['.kk.........', 'k33k........', 'k3W3k.......', '.k333k......', '..k333k.....', '...k333kkkk.', '...k3333333k', '....kkkkkkk.', '.........2..', '.......2....', '....22......', '............'],
  // gone in a puff
  vanish: ['...2..2.....', '..2.22.2.2..', '.2.kkkk.2...', '..k1111k..2.', '.k111111k...', 'k11W11W11k.2', 'k11111111k..', '.k111111k.2.', '..k1111k....', '.2.kkkk.2...', '...2.2..2...', '..2...2.....'],
  // one held in a bubble
  trap: ['....kkkk....', '..kk3333kk..', '.k3WW....3k.', '.k3W.....3k.', 'k3...11...3k', 'k3..1221..3k', 'k3..1221..3k', 'k3...11...3k', '.k3......3k.', '.k3......3k.', '..kk3333kk..', '....kkkk....'],
  // a mark on one
  mark: ['....kkkk....', '..kk2222kk..', '.k2..33..2k.', '.k2.3..3.2k.', 'k2.3.WW.3.2k', 'k23.W11W.32k', 'k23.W11W.32k', 'k2.3.WW.3.2k', '.k2.3..3.2k.', '.k2..33..2k.', '..kk2222kk..', '....kkkk....'],
  // a beam straight ahead
  beam: ['............', '............', '............', '..kkk.......', '.k222k3333..', 'k23W32WWWW33', 'k2WWW2WWWWW3', 'k23W32WWWW33', '.k222k3333..', '..kkk.......', '............', '............'],
};

/** Each SP move's own drawing. Leap, Vanish, Bubble, Curse and Ki Wave use their shape's. */
const SP_ROWS: Partial<Record<SpMoveId, string[]>> = {
  // warrior
  // a ring of flames round you
  inferno: ['....3..3....', '..3.2..2.3..', '.32.1kk1.23.', '..1k....k1..', '3.k......k.3', '21k......k12', '21k......k12', '3.k......k.3', '..1k....k1..', '.32.1kk1.23.', '..3.2..2.3..', '....3..3....'],
  // a tower shield of gold
  shieldwall: ['.kkkkkkkkkk.', 'k2222222222k', 'k2333WW3332k', 'k23333W3332k', 'k2WWWWWWWW2k', 'k23333W3332k', 'k23333W3332k', '.k2333W332k.', '.k2333W332k.', '..k23W332k..', '...k2W22k...', '....kkkk....'],
  // a hammer of light coming down
  judgment: ['.....kk.....', '....k33k....', '....kbbk....', '....kbbk....', '....kbbk....', '.kkkkkkkkkk.', 'k3333WW3333k', 'k2222222222k', 'k1111111111k', '.kkkkkkkkkk.', '3..3.33.3..3', '.3.3.33.3.3.'],
  // the lance thrown, its rope behind
  harpoon: ['.........kkk', '........k3Wk', '.......k33k.', '......kmkk..', '.....kmk....', '....kmk.....', '...kmk......', '..kbk.......', '.k2.........', '.2..22......', '2..2..2..2..', '...2...22...'],
  // a wave curling over
  tidalcharge: ['....kkkk....', '..kk3333k...', '.k33WWW33k..', 'k32kkkk3W3k.', 'k2k....k33k.', 'k2k.....k3k.', 'k22k...k32k.', '.k222kk322k.', '..k2222222k3', '.k122222221W', 'k1111111111k', '.kkkkkkkkkk.'],
  // a scythe spinning
  reap: ['....kkkkkk..', '..kk3333Wbk.', '.k33kkkkbk..', 'k3k....kbk..', 'kk....kbk...', '.....kbk....', '....kbk.....', '...kbk...2..', '..kbk...2...', '.kbk...2....', '.kk..22.....', '....2.......'],
  // wisps flying in to you
  soulharvest: ['.3........3.', '3W2......2W3', '.32......23.', '...2....2...', '....kkkk....', '...k3WW3k...', '...k3333k...', '....kkkk....', '...2....2...', '.32......23.', '3W2......2W3', '.3........3.'],
  // archer
  // one long arrow
  piercing: ['.........kkk', '........kWWk', '.......k3Wk.', '......k33k..', '.....kmk....', '....kmk.....', '...kmk......', '..kmk.......', '.k2k........', 'k22k........', 'k2k.........', 'kk..........'],
  // arrows falling in a circle
  arrowrain: ['.k...k...k..', '.3...3...3..', '.3...3...3..', 'k2k.k2k.k2k.', '.k...k...k..', '...k...k....', '...3...3....', '..k2k.k2k...', '...k...k....', '.1111111111.', '1..........1', '.1111111111.'],
  // a lit bomb
  bomb: ['........3.3.', '.........W3.', '........k...', '.......k....', '...kkkk.....', '..kddddk....', '.kdmmdddk...', '.kdmddddk...', '.kddddddk...', '.kddddddk...', '..kddddk....', '...kkkk.....'],
  // shells falling, a blast below
  barrage: ['..2....2....', '...2....2...', '....kk...kk.', '...kddk.kddk', '...kddk.kddk', '....kk...kk.', '.2..........', '..2.........', '...kk..3.3..', '..kddk.323..', '..kddk3W2W3.', '...kk1222221'],
  // a wolf of light, howling
  call: ['.k........k.', 'k3k......k3k', 'k33k....k33k', 'k333kkkk333k', 'k3333333333k', 'k3kk3333kk3k', 'k3Wk3333kW3k', '.k33333333k.', '..k33kk33k..', '...k3kk3k...', '....k22k....', '.....kk.....'],
  // the pack's tracks, one after another
  pack: ['.........3.3', '........3.3.', '.........33.', '.....3.3.33.', '....3.3.....', '.....33.....', '.3.3.33.....', '3.3.........', '.33.........', '.33.........', '............', '............'],
  // two daggers crossed
  thousandcuts: ['kk........kk', 'kWk......kWk', '.k3k....k3k.', '..k3k..k3k..', '...k3kk3k...', '....k33k....', '....k33k....', '...kbkkbk...', '..kbk..kbk..', '.k2k....k2k.', 'k2k......k2k', 'kk........kk'],
  // mage
  // a line of flames
  firewall: ['............', '............', '..3...3...3.', '..3...3...3.', '.323.323.323', '.3W3.3W3.3W3', '23W3223W3223', '2WW322WW322W', '2WW322WW3223', '122211222112', '111111111111', 'kkkkkkkkkkkk'],
  // a rock of fire falling
  meteor: ['3...........', '.3..........', '..2.3.......', '...22.......', '..3.22......', '....222kkk..', '.....2kdd1k.', '.....kd3d11k', '.....kdd111k', '.....k1111k.', '......kkkk..', '............'],
  // a wave over the room
  tsunami: ['.....kkk....', '...kk333kk..', '..k3WWW3k3k.', '.k3k...k.k3k', '.k3k......k.', 'k33k...kkk..', 'k332kkk333k.', 'k3222223W33k', 'k2222222kk3k', 'k1222222k.k.', 'k1111111111k', '.kkkkkkkkkk.'],
  // a halo over a light
  blessing: ['..kkkkkkkk..', '.k33333333k.', '..kkkkkkkk..', '.....kk.....', '....k33k....', '..kk3WW3kk..', '.k33WWWW33k.', '..kk3WW3kk..', '....k33k....', '....k33k....', '....k33k....', '.....kk.....'],
  // a white flash
  radiance: ['3....33....3', '.3...22...3.', '..3..33..3..', '...3kWWk3...', '33.kWWWWk.33', '23WWWWWWWW32', '23WWWWWWWW32', '33.kWWWWk.33', '...3kWWk3...', '..3..33..3..', '.3...22...3.', '3....33....3'],
  // a giant blade of shadow
  voidedge: ['..........kk', '.........k3k', '........k3Wk', '.......k32k.', '......k32k..', '.....k32k...', '....k32k....', '.k.k32k.....', '.kk22k......', '..kkk.......', '.kd.kk......', 'kd...k......'],
  // monk
  // a fist rising in fire
  risingdragon: ['.....33.....', '....3WW3....', '...32WW23...', '..3.kkkk.3..', '...k2222k...', '..k222222k..', '..k2kk2k2k..', '..k222222k..', '...k2222k...', '..3.k22k.3..', '.32.k22k.23.', '1221k11k1221'],
  // a dragon breathing fire
  dragonroar: ['..kk........', '.k22k.......', 'k2W22k......', 'k22222kk.33.', '.k22222k3W3.', '..k2kkk22333', '..k2k.k2333W', '.k22kkk2333.', 'k2222222k.3.', '.kk22222k...', '...kkkkk....', '............'],
  // a leap, and claws where it lands
  pounce: ['..kkk.......', '.k222k......', 'k2...k2.....', 'k.....k2....', '.......k2...', '........k...', '...W..W..W..', '..W3.W3.W3..', '.W3.W3.W3...', 'W3.W3.W3....', '3..3..3.....', '............'],
  // claws everywhere
  hundredclaws: ['W...W...W..W', '3W..3W..3W3.', '.3W..3W.W3..', '..3W.W3W3...', 'W..3W3W3..W.', '3W.W3W3W.W3.', '.3W3W3W3W3..', '..3W3..3W...', '.W3.3W..3W..', 'W3...3W..3W.', '3.....3...3W', '...........3'],
  // a staff spinning in a ring of water
  tidespin: ['....2222....', '..22....22..', '.2.......kk.', '.2......kbk.', '2......kbk.2', '2.....kbk..2', '2....kbk...2', '2...kbk....2', '.2.kbk....2.', '.2kbk.....2.', '..kk....22..', '....2222....'],
  // water flowing on
  riverdance: ['............', '.33.....33..', '3WW3...3WW3.', '2..23.32..23', '....222.....', '............', '.22.....22..', '2112...2112.', '1..12.21..12', '....111.....', '............', '............'],
  // a huge ball of ki
  spiritbomb: ['...kkkkkk...', '..k333222k..', '.k3WW33222k.', '.k3W333222k.', '.k33332222k.', '.k33222221k.', '..k322211k..', '...kkkkkk...', '.3...kk...3.', '..3.k22k.3..', '...k2222k...', '..kkkkkkkk..'],
};

/** An SP move's icon: its own drawing (or its shape's) in its SP's element. */
function spIconOf(id: SpMoveId): PixelArt {
  const [a, b, c] = ELEMENT[MOVE_ELEMENT[id] ?? 'light'];
  return {
    rows: SP_ROWS[id] ?? SHAPED[SP_MOVES[id].shape],
    palette: { k: K, W: '#ffffff', '1': a, '2': b, '3': c, m: '#9ca3af', d: '#374151', b: '#92400e' },
  };
}

/** Each SP's own move and final, 12x12 (the run's SP buttons and the Hero tab's SP card). */
export const SP_ICONS = Object.fromEntries((Object.keys(SP_MOVES) as SpMoveId[]).map((id) => [id, spIconOf(id)])) as Record<SpMoveId, PixelArt>;

/** The four elements' marks, 10x10 (the SP card and the gallery in /lab/sp). */
export const ELEMENT_ICONS: Record<SpElement, PixelArt> = {
  // a flame
  fire: {
    rows: ['....k.....', '...k1k....', '...k21k.k.', '..k221kk1k', '.k22321k1k', '.k23332k1k', 'k2333W32k.', 'k233WW32k.', '.k23332k..', '..kkkkk...'],
    palette: { k: K, W: '#ffffff', '1': '#b91c1c', '2': '#f97316', '3': '#fde047' },
  },
  // a drop of water
  water: {
    rows: ['....kk....', '...k22k...', '...k22k...', '..k2332k..', '.k223332k.', '.k2W3332k.', 'k22W33322k', 'k2223322k.', '.k122221k.', '..kkkkkk..'],
    palette: { k: K, W: '#ffffff', '1': '#1e3a8a', '2': '#3b82f6', '3': '#93c5fd' },
  },
  // a sun of light
  light: {
    rows: ['....22....', '.2..33..2.', '..2kkkk2..', '..k3WW3k..', '23k3WW33k2', '23k33333k2', '..k3333k..', '..2kkkk2..', '.2..33..2.', '....22....'],
    palette: { k: K, W: '#ffffff', '2': '#f59e0b', '3': '#fde68a' },
  },
  // a crescent in the dark
  shadow: {
    rows: ['...kkkk...', '..k221k...', '.k2331k...', 'k2331k....', 'k231k.....', 'k231k.....', 'k2331k....', '.k2331kkk.', '..k223321k', '...kkkkkk.'],
    palette: { k: K, '1': '#2e1065', '2': '#7c3aed', '3': '#d8b4fe' },
  },
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
    play, and close; the tab bar's five (crossed swords, a skill tree, a game pad, two friends, a shield) and the
    developer's wrench. */
export const UI_ICONS: Record<'heart' | 'heartEmpty' | 'check' | 'lock' | 'bookmark' | 'bookmarkKept' | 'book' | 'chevron' | 'flame' | 'play' | 'close' | 'tabToday' | 'tabTrain' | 'tabPlay' | 'tabHero' | 'tabFriends' | 'wrench', PixelArt> = {
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
  // Two friends side by side.
  tabFriends: {
    rows: ['.hh...gg.', 'hssh.gssg', 'hssh.gssg', '.ss...ss.', '.........', 'bbbb.eeee', 'bbbb.eeee', 'bbbb.eeee'],
    palette: { h: '#92400e', g: '#334155', s: '#fcd9b6', b: '#4a5fc0', e: '#10b981' },
  },
  wrench: {
    rows: ['.....xx..', '....x..x.', '....x...x', '.....x.x.', '....xxx..', '...xxx...', '..xxx....', '.xxx.....', '.xx......'],
    palette: { x: '#7dd3fc' },
  },
};
