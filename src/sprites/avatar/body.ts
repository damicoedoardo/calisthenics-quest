import type { Part } from './types';

/* The body under everything: head, neck, torso, arms with hands, legs and feet, in skin. Every
   other part is drawn to fit it, so change its shape only together with the clothes. Lean, about
   four heads tall, facing the viewer. */

export const BODY: Part = {
  label: 'Body',
  layers: {
    head: { y: 6, rows: [
      '..........eeeeeeeee.............',
      '........eeeeeeeeeeeee...........',
      '.......eeeeeeeeeeeeeee..........',
      '.......eeeeeeeeeeeeedd..........',
      '.......eeeeeeeeeeeeedd..........',
      '.......eeeeeeeeeeeeedd..........',
      '......deeeeeeeeeeeeeddd.........',
      '......deeeeeeeeeeeeeddd.........',
      '......deeeeeeeeeeeeeddd.........',
      '.......eeeeeeedeeeeedd..........',
      '........eeeeeeeeeeedd...........',
      '........eeeeeeeeeeedd...........',
      '.........eeeeeeeeddd............',
      '...........eeeeedd..............',
    ]},
    neck: { y: 20, rows: [
      '............ddddd...............',
      '............eeeed...............',
      '............eeeed...............',
      '............eeeed...............',
    ]},
    torso: { y: 22, rows: [
      '........eeeeeeeeeeeed...........',
      '........eeeeeeeeeeeed...........',
      '........eeeeeeeeeeeed...........',
      '.........eeeeeeeeeed............',
      '.........eeeeeeeeeed............',
      '.........eeeeeeeeeed............',
      '.........eeeeeeeeeed............',
      '.........eeeeeeeeeed............',
      '.........eeeeeeeeeed............',
      '.........eeeeeeeeeed............',
      '.........eeeeeeeeeed............',
      '.........eeeeeeeeeed............',
      '.........eeeeeeeeeed............',
      '.........eeeeeeeeeed............',
      '.........eeeeeeeeeed............',
      '.........eeeeeeeeeed............',
      '.........eeeeeeeeeed............',
    ]},
    arms: { y: 23, rows: [
      '.....eee.............eed........',
      '.....eee.............eed........',
      '.....eee.............eed........',
      '.....eee.............eed........',
      '.....eee.............eed........',
      '.....eee.............eed........',
      '.....eee.............eed........',
      '.....eee.............eed........',
      '.....eed.............eed........',
      '.....eed.............eed........',
      '.....eed.............eed........',
      '.....eed.............eed........',
      '.....eed.............eed........',
      '.....eed.............eed........',
      '.....eeee...........eeee........',
      '.....eeee...........eeee........',
      '.....dddd...........dddd........',
      '................................',
    ]},
    legs: { y: 38, rows: [
      '.........eeeeeeeeeee............',
      '.........eeeed.eeeed............',
      '.........eeeed.eeeed............',
      '.........eeeed.eeeed............',
      '.........eeeed.eeeed............',
      '.........eeeed.eeeed............',
      '.........eeeed.eeeed............',
      '.........eeeed.eeeed............',
      '.........eeeed.eeeed............',
      '.........eeeed.eeeed............',
      '.........eeeed.eeeed............',
      '.........eeeed.eeeed............',
      '.........eeeed.eeeed............',
      '.........eeeed.eeeed............',
      '.........eeeed.eeeed............',
      '.........eeeed.eeeed............',
      '.........eeeed.eeeed............',
      '.........eeeed.eeeed............',
      '.........eeeed.eeeed............',
      '.........eeeed.eeeed............',
      '.........eeeed.eeeed............',
      '.........eeeed.eeeed............',
    ]},
    feet: { y: 59, rows: [
      '........eeeeee.eeeeee...........',
      '........dddddd.dddddd...........',
    ]},
  },
};

/** Where things sit on the body (sprite-local x, before the 16-pixel centering), for parts and
    effects that need to line up with it. */
export const ANCHORS = {
  /** The eyes as boxes [x, y, w, h]. */
  eyes: [
    [8, 12, 4, 3],
    [17, 12, 4, 3],
  ] as [number, number, number, number][],
  mouth: { x: 14, y: 17 },
  /** The first planted row: the legs start here and stay put when the upper body breathes. */
  waist: 38,
};
