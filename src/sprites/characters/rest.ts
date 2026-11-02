import { HAIR, SKIN } from '../palette';
import type { Look } from '../engine/figure';
import { DEFAULT_LOOK } from './hero';
import type { PixelArt } from './pixel';

/* A rest day: you, asleep under the blanket, a moon and a Z or two above. Drawn as text rows
   (32x25), one character per pixel; hair and skin come from your look. */

const ROWS = [
  '.........................kkkk...',
  '.......................kkMMmk...',
  '....W........kkkkkk....kMMmk....',
  '.............kzzzzk....kMmk.....',
  '.............kkkzkk....kMmk.....',
  '..............kzk......kMmmk....',
  '.............kzkkkk.....kmmmkkk.',
  '........zzzz.kzzzzkW.....kmdddk.',
  '..........z..kkkkkk.......kkkk..',
  '.........z......................',
  '........zzzz....................',
  '.......kkkkkkk...............W..',
  '..W...kHHIIIHHk.................',
  '.....kHIIHHHHHHk................',
  '..kkkHHHhHHHhHHHkkk.............',
  '.kwpkHhsShHSShHhkppk............',
  '.kwpkhsSSSSSSSShkppk............',
  '.kwpkhskkSSSkkShkppk............',
  '.kPwkhrSSSSSSSrhkwkkkkkkkk......',
  '..kkkkkkkkkkkkkkkkBBBBBBBBkk....',
  '..kBBBBBBBBBBBBBBBBbbbbbbbBBk...',
  '..kBbbbbbbbbbbbbbbbbbbbbbbbbbk..',
  '..kbbbbbbbbbbbbbbbbbbbbbbbbbnk..',
  '..knnnnnnnnnnnnnnnnnnnnnnnnnnk..',
  '...kkkkkkkkkkkkkkkkkkkkkkkkkk...',
];

/** A girl's long hair falls over the pillow on both sides of her head. */
const GIRL_ROWS: Record<number, string> = {
  15: '.kwHkHhsShHSShHhkHpk............',
  16: '.kwhkhsSSSSSSSShkhpk............',
  17: '.kwHkhskkSSSkkShkHpk............',
  18: '.kPhkhrSSSSSSSrhkhkkkkkkkk......',
};

export function restArt(look: Look = DEFAULT_LOOK): PixelArt {
  const [hd, hm, hl] = HAIR[look.hair] ?? HAIR.brown,
    [sd, sm, sl] = SKIN[look.skin] ?? SKIN.light;
  return {
    rows: look.sex === 'f' ? ROWS.map((r, i) => GIRL_ROWS[i] ?? r) : ROWS,
    palette: {
      k: '#0b0d14',
      // the moon, the stars and the Zs
      M: '#fff7d6', m: '#fde68a', d: '#d4a72c', W: '#fff3b0', z: '#c7d2fe',
      // you: hair, skin, a blush
      h: hd, H: hm, I: hl, t: sd, s: sm, S: sl, r: '#f0a0a0',
      // the pillow and the blanket (the Nightcap's blue)
      w: '#ffffff', p: '#e5e7eb', P: '#9ca3af', B: '#6b84e0', b: '#3b4fa8', n: '#26337a',
    },
  };
}
