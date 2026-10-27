import type { CastMember } from './types';

/* Everyone who can speak in the story. To add a character: draw them in src/sprites (see its
   README), then add them here. Their id is what story lines use in `who`. */

export const CAST = {
  narrator: { name: '', portrait: { kind: 'none' } },
  you: { name: 'You', portrait: { kind: 'hero', variant: 'normal', size: 170 } },
  flame: { name: '{flame}', portrait: { kind: 'flame', size: 110 }, tag: 'amber' },
  // The flame's true form, from the finale: a kid made of fire, with your hair.
  kindled: { name: '{flame}', portrait: { kind: 'kindled', size: 150 }, tag: 'amber' },
  // The same, waving: put on screen with `show` (it never speaks as itself).
  'kindled-wave': { name: '{flame}', portrait: { kind: 'kindled', size: 150, wave: true }, tag: 'amber' },
  wanderer: { name: 'The Wanderer', portrait: { kind: 'sprite', sprite: 'wanderer', size: 140 } },
  hollow: { name: 'The Hollow', portrait: { kind: 'hollow', size: 170 }, tag: 'red', dark: true },
  echo: { name: 'The Echo', portrait: { kind: 'hero', variant: 'echo', size: 170 } },
  bestself: { name: 'Your Best Self', portrait: { kind: 'hero', variant: 'best', size: 170 } },
  mira: { name: 'Mira', portrait: { kind: 'sprite', sprite: 'mira', size: 140 } },
  tomorrow: { name: 'Tomorrow', portrait: { kind: 'sprite', sprite: 'slime', size: 130 }, tag: 'slate' },
  knight: { name: 'The Perfect Knight', portrait: { kind: 'sprite', sprite: 'knight', size: 160 }, tag: 'slate' },
  kid: { name: 'The kid', portrait: { kind: 'sprite', sprite: 'kid', size: 120 } },
  lia: { name: 'Lia', portrait: { kind: 'sprite', sprite: 'lia', size: 140 }, tag: 'sky' },
  sol: { name: 'Sol', portrait: { kind: 'sprite', sprite: 'sol', size: 140 }, tag: 'sky' },
  // Old Vela keeps the lamp on the Plateau.
  vela: { name: 'Vela', portrait: { kind: 'sprite', sprite: 'vela', size: 140 }, tag: 'sky' },
  // The villagers once you've helped them: Lia dancing again, Sol in new running shoes, Vela with
  // her letter sealed and stamped. Same names; use them as `who` or `show` in their later scenes.
  'lia-after': { name: 'Lia', portrait: { kind: 'villager', sprite: 'lia', size: 140 }, tag: 'sky' },
  'sol-after': { name: 'Sol', portrait: { kind: 'villager', sprite: 'sol', size: 140 }, tag: 'sky' },
  'vela-after': { name: 'Vela', portrait: { kind: 'villager', sprite: 'vela', size: 140 }, tag: 'sky' },
  plateau: { name: 'The Plateau', portrait: { kind: 'sprite', sprite: 'golem', size: 160 }, tag: 'slate' },
  summit: { name: 'The Summit', portrait: { kind: 'sprite', sprite: 'summit', size: 160 }, tag: 'slate' },
} satisfies Record<string, CastMember>;

export type CastId = keyof typeof CAST;

export const castMember = (id: CastId): CastMember => CAST[id];
