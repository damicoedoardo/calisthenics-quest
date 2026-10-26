import type { Part } from './types';

/* Faces: eyes, brows and mouths. Both eyes are written out as mirror images of each other, so
   one can be made different by hand. The eyes sit at x 7..12 and 16..21, rows 10..15; the
   mouth around x 14, rows 16..19. Drawn without outlines. */

export const EYES = {
  sharp: {
    label: 'Sharp',
    layers: {
      eyes: { y: 12, rows: [
        '........KKKK.....KKKK...........',
        '.........ygK.....Kgy............',
        '..........dd.....dd.............',
      ] },
    },
  },
  round: {
    label: 'Round',
    layers: {
      eyes: { y: 11, rows: [
        '.........KKK.....KKK............',
        '........KWggK...KggWK...........',
        '........Kyii.....iiyK...........',
        '.........KKK.....KKK............',
      ] },
    },
  },
  tired: {
    label: 'Tired',
    layers: {
      eyes: { y: 12, rows: [
        '.........KKK.....KKK............',
        '........KyggK...KggyK...........',
        '........KyggK...KggyK...........',
        '.........ooo.....ooo............',
      ] },
    },
  },
  lashes: {
    label: 'Lashes',
    layers: {
      eyes: { y: 11, rows: [
        '........KKKK.....KKKK...........',
        '.......K.Wgg.....ggW.K..........',
        '.........yii.....iiy............',
      ] },
    },
  },
  narrow: {
    label: 'Narrow',
    layers: {
      eyes: { y: 13, rows: [
        '........KKKKK...KKKKK...........',
        '..........gK.....Kg.............',
      ] },
    },
  },
  glare: {
    label: 'Glare',
    layers: {
      eyes: { y: 12, rows: [
        '.......KK...........KK..........',
        '........KKKK.....KKKK...........',
        '.........yiK.....Kiy............',
        '..........KK.....KK.............',
      ] },
    },
  },
} satisfies Record<string, Part>;

export const BROWS = {
  none: { label: 'None', layers: {} },
  straight: {
    label: 'Straight',
    layers: {
      brows: { y: 11, rows: [
        '.........aaa.....aaa............',
      ] },
    },
  },
  angled: {
    label: 'Angled',
    layers: {
      brows: { y: 10, rows: [
        '........a...........a...........',
        '.........aaa.....aaa............',
      ] },
    },
  },
  soft: {
    label: 'Soft',
    layers: {
      brows: { y: 11, rows: [
        '.........aa.......aa............',
      ] },
    },
  },
  thick: {
    label: 'Thick',
    layers: {
      brows: { y: 10, rows: [
        '........aaaa.....aaaa...........',
        '..........aa.....aa.............',
      ] },
    },
  },
  worried: {
    label: 'Worried',
    layers: {
      brows: { y: 10, rows: [
        '...........a.....a..............',
        '........aaa.......aaa...........',
      ] },
    },
  },
} satisfies Record<string, Part>;

export const MOUTHS = {
  flat: {
    label: 'Flat',
    layers: {
      mouth: { y: 17, rows: [
        '.............uuu................',
      ] },
    },
  },
  smile: {
    label: 'Smile',
    layers: {
      mouth: { y: 16, rows: [
        '............u...u...............',
        '.............uuu................',
      ] },
    },
  },
  smirk: {
    label: 'Smirk',
    layers: {
      mouth: { y: 16, rows: [
        '................u...............',
        '.............uuu................',
      ] },
    },
  },
  grin: {
    label: 'Grin',
    layers: {
      mouth: { y: 17, rows: [
        '............KKKKK...............',
        '.............www................',
      ] },
    },
  },
  frown: {
    label: 'Frown',
    layers: {
      mouth: { y: 17, rows: [
        '.............uuu................',
        '............u...u...............',
      ] },
    },
  },
  open: {
    label: 'Shout',
    layers: {
      mouth: { y: 17, rows: [
        '.............KKK................',
        '.............KuK................',
        '..............K.................',
      ] },
    },
  },
} satisfies Record<string, Part>;
