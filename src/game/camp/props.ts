import type { Prop } from '../dungeon/props';

/* The camp's furniture as text rows, like the dungeon's (src/game/dungeon/props.ts): one character
   is a 2x2 block, '.' is empty. The camp scene turns each into a texture. */

const IRON = { k: '#0b0d14', d: '#2a2f3a', m: '#4b5563', l: '#9ca3af', W: '#e5e7eb', o: '#f97316', y: '#fde68a', b: '#5c3a1c', B: '#8a5a2b' };

/** Mira's anvil on its stump, a hammer leaning on it, embers in the dish. */
export const ANVIL: Prop = {
  rows: [
    '......................',
    '..kkkkkkkkkkkkkkkkk...',
    '.kWllllllllllllllmmk..',
    'kWlllllllllllllllmmdk.',
    '.kkkmmmmmmmmmmmmdkkk..',
    '....kkmmmmmmmmdkk.....',
    '......kmmmmmmdk.......',
    '.....kmmmmmmmmdk......',
    '....kkkkkkkkkkkkk.....',
    '....kBBbBBBbBBBbk.....',
    '....kBbbBBbbBBbbk.....',
    '....kBBbBBBbBBBbk.....',
    '....kbbbbbbbbbbbk.....',
    '.....kkkkkkkkkkk......',
  ],
  palette: IRON,
};

/** A gate out of the camp: a stone arch with dark between its stones (the Fog lights it when open). */
export const GATE: Prop = {
  rows: [
    '.......5555555.......',
    '.....55666666655.....',
    '...556677777766655...',
    '..5667........76665..',
    '..566..........6665..',
    '.5667...........665..',
    '.566............665..',
    '.566............665..',
    '.466............664..',
    '.466............664..',
    '.456............654..',
    '.456............654..',
    '.456............654..',
    '.456............654..',
    '.456............654..',
    '3455............5543.',
    '33333..........33333.',
  ],
  palette: { '3': '#2a2433', '4': '#3d3549', '5': '#4a4158', '6': '#5b5570', '7': '#8a83a0' },
};

/** Logs for the fire. */
export const LOGS: Prop = {
  rows: [
    '....kkkk....kkkk....',
    '..kkBBbbk..kbbBBkk..',
    '.kBBbbbbBkkBbbbbBBk.',
    'kBbbkkbbbBBbbbkkbbBk',
    '.kkk..kkkkkkkk..kkk.',
  ],
  palette: IRON,
};
