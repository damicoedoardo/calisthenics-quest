import type { PixelArt } from './pixel';

/* Art for the Play tab's world picker: the big padlock on a world that is still shut, and the
   bank of fog that drifts over it. Text rows, one character per pixel (see pixel.ts). */

const K = '#0b0d14';

/** The big padlock: an iron shackle and a gold body with four rivets and a keyhole. */
export const WORLD_LOCK: PixelArt = {
  rows: [
    '.....kkkkkkkk.....',
    '...kkSSSSSSSSkk...',
    '..kSSskkkkkksSSk..',
    '..kSsk......kSsk..',
    '..kSsk......kSsk..',
    '..kSsk......kSsk..',
    '..kSsk......kSsk..',
    'kkkkkkkkkkkkkkkkkk',
    'kWWYYYYYYYYYYYYYyk',
    'kWRYYYYYYYYYYYYRyk',
    'kYYYYYYYYYYYYYYyyk',
    'kYYYYYYYkkYYYYYyyk',
    'kYYYYYYkddkYYYYyyk',
    'kYYYYYYkddkYYYYyyk',
    'kYYYYYYYkdkYYYYyyk',
    'kYYYYYYYkdkYYYYyyk',
    'kYYYYYYYkkkYYYYyyk',
    'kYRYYYYYYYYYYYYRyk',
    'kyyyyyyyyyyyyyyyyk',
    'kkkkkkkkkkkkkkkkkk',
  ],
  palette: { k: K, S: '#cbd5e1', s: '#64748b', W: '#fef3c7', Y: '#fbbf24', y: '#b45309', R: '#fde68a', d: '#1c1917' },
};

/** A low bank of fog, lighter on top. Its bottom rows are full, so copies can sit side by side
    along the foot of a picture. */
export const FOG_BANK: PixelArt = {
  rows: [
    '...........cccc.............ccc...',
    '.........ccbbbbcc.........ccbbbc..',
    '....ccc.cbbbbbbbbc...cccccbbbbbbc.',
    '...cbbbccbbbbbbbbbcccbbbbbbbbbbbbc',
    '..cbbbbbbbbbaabbbbbbbbbbbaaabbbbbb',
    '.cbbbbbbbbbaaaabbbbbbbbbaaaaabbbbb',
    'cbbbbbaabbbbaaaaabbbbbaaaaaaaabbbb',
    'bbbbbaaaabbaaaaaaaabbaaaaaaaaaaabb',
    'bbbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  ],
  palette: { c: '#c3c7e2', b: '#9398bd', a: '#6c7199' },
};
