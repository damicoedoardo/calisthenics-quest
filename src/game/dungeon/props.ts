import { R } from '@/sprites/palette';

/* The dungeon's furniture as text rows, the same way the monsters are drawn: one character is one
   2x2 block of the texture, mapped to a color by the prop's palette; '.' is empty. The scene turns
   each one into a texture (scene.ts, makeTextures). */

export interface Prop {
  rows: string[];
  palette: Record<string, string>;
}

/** The dungeon's stone, dark to light: the walls, the pillars, the shrine. */
export const STONE = ['#15111c', '#2a2433', '#3d3549', '#4a4158', '#5b5570', '#6b6478', '#8a83a0'];
const stone = { '1': STONE[0], '2': STONE[1], '3': STONE[2], '4': STONE[3], '5': STONE[4], '6': STONE[5], '7': STONE[6] };
const MOSS = '#4d7c0f';

/** A brick column seen from the front and a little above: a flat top, a capital, a plinth. */
export const PILLAR: Prop = {
  rows: [
    '......................',
    '....55555555555555....',
    '..556666666666666655..',
    '..567777777777766665..',
    '..566666666666666665..',
    '...5555555555555555...',
    '.44444444444444444443.',
    '.33333333333333333332.',
    '..222222222222222222..',
    '...4554444444424332...',
    '...4554444444124332...',
    '...4554444444414332...',
    '...2222222222212222...',
    '...4m54444244144332...',
    '...4554444244444332...',
    '...4554444244444332...',
    '...2222222222222222...',
    '...4554444444424332...',
    '...4554444444424332...',
    '...m554444444424332...',
    '...2222222222222222...',
    '...4554444244444332...',
    '...m554444244444332...',
    '...mm54444244444332...',
    '...mmm2222222222222...',
    '.44444444444444444443.',
    '.45555555555555555543.',
    '.43333333333333333332.',
    '.22222222222222222221.',
    '......................',
    '......................',
    '......................',
  ],
  palette: { ...stone, m: MOSS },
};

/** A red powder keg with a flame painted on it: it blows up when hit. */
export const BARREL: Prop = {
  rows: [
    '............',
    '...hhhhhh...',
    '..hTTtTTTh..',
    '.hTtTTTtTTh.',
    '.iiiiiiiiii.',
    '.lwvwwFwvwd.',
    '.lwvwFFwvwd.',
    '.lwvFyFFvwd.',
    '.lwvFyyFvwd.',
    '.iiiiiiiiii.',
    '.lwvwwwwvwd.',
    '..lvwwwwvd..',
    '..dddddddd..',
    '............',
  ],
  palette: { h: R.iron[0], i: R.iron[1], T: R.wood[2], t: R.wood[1], l: R.red[2], w: R.red[1], v: R.red[0], d: R.red[0], F: R.fire[2], y: R.light[2] },
};

const CHEST_PAL = { d: R.wood[0], L: R.wood[2], l: R.wood[1], w: R.wood[1], W: R.wood[0], g: R.gold[1], G: R.gold[1], Y: R.gold[2], k: R.dark[0], n: R.dark[1] };

/** Wood bound in gold, with a lock. */
export const CHEST: Prop = {
  rows: [
    '...............',
    '..ddddddddddd..',
    '.dLLgLLLLLgLLd.',
    '.dllglllllglld.',
    '.dllglllllglld.',
    '.GGGGGYYYGGGGG.',
    '.dwwgwYkYwgwwd.',
    '.dwwgwYYYwgwwd.',
    '.dWWgWWWWWgWWd.',
    '.dwwgwwwwwgwwd.',
    '.dwwgwwwwwgwwd.',
    '.ddddddddddddd.',
    '...............',
  ],
  palette: CHEST_PAL,
};

/** The lid thrown back, gold glinting inside. */
export const CHEST_OPEN: Prop = {
  rows: [
    '..ddddddddddd..',
    '.dLLgLLLLLgLLd.',
    '.dllglllllglld.',
    '.ddddddddddddd.',
    '.dnYnnYnnnYnnd.',
    '.GGGGGGGGGGGGG.',
    '.dwwgwwwwwgwwd.',
    '.dwwgwwwwwgwwd.',
    '.dWWgWWWWWgWWd.',
    '.dwwgwwwwwgwwd.',
    '.dwwgwwwwwgwwd.',
    '.ddddddddddddd.',
    '...............',
  ],
  palette: CHEST_PAL,
};

/** A green crystal floating over a stone pedestal with a glowing rune. */
export const SHRINE: Prop = {
  rows: [
    '..................',
    '........cc........',
    '.......cCCc.......',
    '......cCCwCc......',
    '......cCCCCc......',
    '.....cCCCCCCc.....',
    '......cCCCCc......',
    '.......cCCc.......',
    '........cc........',
    '..................',
    '.....56666665.....',
    '......444443......',
    '......45m443......',
    '......45r443......',
    '......454443......',
    '......454443......',
    '....5666666665....',
    '...444444444443...',
    '...333333333332...',
    '...222222222222...',
  ],
  palette: { ...stone, m: MOSS, r: '#86efac', c: '#15803d', C: '#86efac', w: '#f0fdf4' },
};

/** Stairs down: steps into the dark, lit gold from below. Lies flat on the floor. */
export const STAIRS: Prop = {
  rows: [
    '..66666666666666..',
    '.6777777777777776.',
    '675555555555555576',
    '674444444444444476',
    '671444444444444176',
    '671333333333333176',
    '671133333333331176',
    '671122222222221176',
    '671112222222211176',
    '671111111111111176',
    '671111yyyyyy111176',
    '.6777777777777776.',
    '..66666666666666..',
  ],
  palette: { ...stone, y: R.gold[2] },
};

/** A torch in an iron bracket, for the side walls (its flame is drawn live, so it flickers). */
export const SCONCE: Prop = {
  rows: [
    '......',
    '..ww..',
    '.wWWw.',
    '..ii..',
    '.iiii.',
    '..ii..',
    '..i...',
  ],
  palette: { w: R.wood[1], W: R.wood[2], i: R.iron[1] },
};

/** The spark where a blow lands: a little four-point star, white-hot in the middle. */
export const HIT_SPARK: Prop = {
  rows: [
    '....o....',
    '....y....',
    '...oyo...',
    '..oyWyo..',
    'oyyWWWyyo',
    '..oyWyo..',
    '...oyo...',
    '....y....',
    '....o....',
  ],
  palette: { W: '#ffffff', y: '#fef3c7', o: '#fbbf24' },
};

/** A stone statue on a plinth with eyes that glow before it fires (the statue turret, STATUES). */
export const STATUE: Prop = {
  rows: [
    '........5555........',
    '.......566665.......',
    '......56777665......',
    '.....5677776665.....',
    '.....567rr6rr65.....',
    '.....566yr6ry65.....',
    '.....5566666655.....',
    '......55666655......',
    '...4455566665554....',
    '..456665555556654...',
    '..4566666666666543..',
    '..4566656666566543..',
    '..4466656666566443..',
    '...446656666566443..',
    '...44665666656644...',
    '....4566666666543...',
    '....4566666666543...',
    '....4456666665443...',
    '.....44555555443....',
    '...33333333333333...',
    '..4666666666666664..',
    '..4577777777777754..',
    '..4555555555555554..',
    '..3444444444444443..',
    '..3333333333333333..',
    '...22222222222222...',
  ],
  palette: { ...stone, r: '#ef4444', y: '#fecaca', m: MOSS },
};
