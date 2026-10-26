import type { Part } from './types';

/* The body under everything, in skin: a big manga head, a short sturdy body, round hands. Every
   other part is drawn to fit it, so change its shape only together with the clothes. The head is
   the original manga head; arms, hands and legs sit where the hero's gear expects them. */

export const BODY: Part = {
  label: 'Body',
  layers: {
    head: { y: 6, rows: [
      '........................eeeeeeeeeeeeeeee........................',
      '......................eeeeeeeeeeeeeeeeeeee......................',
      '....................eeeeeeeeeeeeeeeeeeeeeeee....................',
      '...................eeeeeeeeeeeeeeeeeeeeeeeeee...................',
      '..................eeeeeeeeeeeeeeeeeeeeeeeeeedd..................',
      '..................eeeeeeeeeeeeeeeeeeeeeeeeeedd..................',
      '..................eeeeeeeeeeeeeeeeeeeeeeeeeedd..................',
      '..................eeeeeeeeeeeeeeeeeeeeeeeeeedd..................',
      '..................eeeeeeeeeeeeeeeeeeeeeeeeeedd..................',
      '..................eeeeeeeeeeeeeeeeeeeeeeeeeedd..................',
      '..................eeeeeeeeeeeeeeeeeeeeeeeeeedd..................',
      '..................eeeeeeeeeeeeeeeeeeeeeeeeeedd..................',
      '..................eeeeeeeeeeeeeeeeeeeeeeeeeedd..................',
      '..................eeeeeeeeeeeeeeeeeeeeeeeeeedd..................',
      '..................eeeeeeeeeeeeeeeeeeeeeeeeeedd..................',
      '..................eeeeeeeeeeeeeeeeeeeeeeeeeedd..................',
      '..................eeeeeeeeeeeeeeeeeeeeeeeeeedd..................',
      '...................eeeeeeeeeeeeeeeeeeeeeeeeed...................',
      '...................eeeeeeeeeeeeedeeeeeeeeeeed...................',
      '....................eeeeeeeeeeeeeeeeeeeeeeedd...................',
      '.....................eeeeeeeeeeeeeeeeeeeeed.d...................',
      '.......................eeeeeeeeeeeeeeeeed.......................',
      '.........................eeeeeeeeeeeeed.........................',
      '............................eeeeeeed............................',
    ] },
    neck: { y: 29, rows: [
      '..............................dddd..............................',
      '..............................dddd..............................',
      '..............................eeee..............................',
      '..............................eeee..............................',
      '..............................eeee..............................',
    ] },
    torso: { y: 30, rows: [
      '......................feeeeeeeeeeeeeeeeeed......................',
      '......................feeeeeeeeeeeeeeeeeed......................',
      '......................feeeeeeeeeeeeeeeeeed......................',
      '......................feeeeeeeeeeeeeeeeeed......................',
      '......................feeeeeeeeeeeeeeeeeed......................',
      '......................feeeeeeeeeeeeeeeeeed......................',
      '......................feeeeeeeeeeeeeeeeeed......................',
      '......................feeeeeeeeeeeeeeeeeed......................',
      '......................feeeeeeeeeeeeeeeeeed......................',
      '......................feeeeeeeeeeeeeeeeeed......................',
      '.......................feeeeeeeeeeeeeeeed.......................',
      '.......................feeeeeeeeeeeeeeeed.......................',
      '.......................feeeeeeeeeeeeeeeed.......................',
      '.......................feeeeeeeeeeeeeeeed.......................',
      '.......................feeeeeeeeeeeeeeeed.......................',
      '.......................feeeeeeeeeeeeeeeed.......................',
      '.......................feeeeeeeeeeeeeeeed.......................',
      '.......................feeeeeeeeeeeeeeeed.......................',
    ] },
    arms: { y: 30, rows: [
      '..................eeee....................eeee..................',
      '..................feed....................feed..................',
      '..................feed....................feed..................',
      '..................feed....................feed..................',
      '..................feed....................feed..................',
      '..................feed....................feed..................',
      '..................feed....................feed..................',
      '..................feed....................feed..................',
      '..................feed....................feed..................',
      '..................feed....................feed..................',
      '..................feed....................feed..................',
      '..................feed....................feed..................',
      '..................efee....................efee..................',
      '.................eeeee....................eeeee.................',
      '.................eeeee....................eeeee.................',
      '..................dddd....................dddd..................',
    ] },
    legs: { y: 46, rows: [
      '........................feeeed....feeeed........................',
      '........................feeeed....feeeed........................',
      '........................feeeed....feeeed........................',
      '........................feeeed....feeeed........................',
      '........................feeeed....feeeed........................',
      '........................feeeed....feeeed........................',
      '........................feeeed....feeeed........................',
      '........................feeeed....feeeed........................',
      '........................feeeed....feeeed........................',
      '........................feeeed....feeeed........................',
      '........................feeeed....feeeed........................',
      '........................feeeed....feeeed........................',
    ] },
    feet: { y: 58, rows: [
      '.......................eeeeeee....eeeeeee.......................',
      '.......................eeeeeee....eeeeeee.......................',
      '.......................ddddddd....ddddddd.......................',
    ] },
  },
};

/** Where things sit on the body, for parts and effects that need to line up with it. */
export const ANCHORS = {
  /** The eyes as boxes [x, y, w, h]. */
  eyes: [
    [21, 15, 7, 9],
    [36, 15, 7, 9],
  ] as [number, number, number, number][],
  mouth: { x: 31, y: 26 },
  /** The first planted row: the legs start here and stay put when the upper body breathes. */
  waist: 46,
};
