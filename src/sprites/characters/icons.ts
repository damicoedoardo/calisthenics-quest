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
