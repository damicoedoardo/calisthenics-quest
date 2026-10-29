import type { Ramp } from './engine/grid';

/* Every color the sprites use. Ramps go dark to light. Change a hex here and every sprite that
   uses it follows. */

/** Materials and elements. */
export const R = {
  water: ['#143a66', '#2a6fc0', '#69b0f0'],
  shadow: ['#1d1430', '#3d2a63', '#7a5cb0'],
  fire: ['#6e1a10', '#c23b1a', '#f08a3a'],
  light: ['#8a6512', '#d9ad3a', '#f7e08a'],
  bronze: ['#6b4318', '#b07a2e', '#e0b060'],
  silver: ['#4a5260', '#9aa4b4', '#e2e8f0'],
  iron: ['#33383f', '#5f6773', '#9aa3af'],
  leather: ['#3e2614', '#6e4424', '#a06a3a'],
  white: ['#8e98ac', '#d6dde8', '#ffffff'],
  bone: ['#8a8270', '#d8d0b8', '#f4f0e0'],
  fur: ['#3a2c22', '#6e5644', '#a68c72'],
  furgrey: ['#3a3d48', '#6c7180', '#a9aebb'],
  dark: ['#121018', '#252233', '#3c3850'],
  red: ['#5e1010', '#b02828', '#e86048'],
  wood: ['#4a2c14', '#7a4a24', '#a8703c'],
  gold: ['#7a5410', '#c9921c', '#f3d36b'],
  cloth: ['#4a5266', '#7e889c', '#b8c0ce'],
  orange: ['#7a3a0c', '#d07018', '#f6b04a'],
  teal: ['#0f3b3d', '#1f6f6a', '#4fb0a0'],
  navy: ['#141a2e', '#232c4a', '#3a4670'],
  plum: ['#2a1238', '#4e2268', '#8a4ab0'],
} satisfies Record<string, Ramp>;

/** Hair, in the order the look editor shows them. */
export const HAIR = {
  black: ['#14141c', '#2c2c3a', '#4a4a5e'],
  brown: ['#3b2516', '#6b4226', '#9a6a3c'],
  chestnut: ['#4a1e12', '#7e3a20', '#b0603a'],
  auburn: ['#4e1418', '#8a2a26', '#c0503e'],
  red: ['#6e1a12', '#b23a22', '#e2703e'],
  ginger: ['#7a3410', '#d0682a', '#f4a060'],
  blonde: ['#8a6a1e', '#d9b54a', '#f6e08a'],
  platinum: ['#9a8e6e', '#e4dcc0', '#fffbec'],
  silver: ['#6a7080', '#b4bccb', '#eef2f8'],
  pink: ['#8a2c5c', '#e06aa0', '#fbb4d4'],
  purple: ['#3a1a5e', '#7040b0', '#b090e8'],
  blue: ['#1a2a6a', '#3656c0', '#7aa0f0'],
  teal: ['#0e4848', '#22908a', '#6ad8c8'],
  green: ['#1c4a20', '#3a8a3a', '#86d070'],
} satisfies Record<string, Ramp>;

/** Skin, light to deep. */
export const SKIN = {
  porcelain: ['#d0a090', '#fcdccc', '#fff0e6'],
  light: ['#c98b62', '#f2c19a', '#ffdcbc'],
  olive: ['#a07448', '#d8aa78', '#eccaa0'],
  tan: ['#9a6038', '#d49464', '#eab288'],
  brown: ['#6e3e22', '#a8683e', '#c88a5c'],
  deep: ['#4e2c1a', '#7e4a2c', '#a46a44'],
  ebony: ['#2a160e', '#55301e', '#7a4a32'],
} satisfies Record<string, Ramp>;

/** Eye colors: iris dark / mid / light. Brown is each head's own brown (see irisOf). */
export const EYE_COLORS = {
  brown: ['#3a2416', '#7a4a2a', '#c08a52'],
  hazel: ['#3e3016', '#7a6a2a', '#b8a050'],
  amber: ['#5a3008', '#b8701a', '#f0b040'],
  green: ['#143a20', '#2e7a44', '#6cc07a'],
  blue: ['#142c5e', '#2e62b0', '#78b0f0'],
  grey: ['#2e343e', '#68727e', '#b4bcc6'],
  violet: ['#2e1450', '#6a3aa8', '#b088e8'],
  red: ['#4e0c10', '#a8202a', '#f06a6a'],
  gold: ['#5e4006', '#c89a1a', '#fbe070'],
} satisfies Record<string, Ramp>;

export type HairColor = keyof typeof HAIR;
export type SkinTone = keyof typeof SKIN;
export type EyeColor = keyof typeof EYE_COLORS;

/** Eyes: outline, then iris dark / mid / light. */
export const EYES = {
  line: '#1a1420',
  iris: ['#2a1a10', '#6a4428', '#9a6a3c'],
  shine: '#ffffff',
};

// ---------- story looks ----------

/** The Adventurer's plain tunic, before any armor. */
export const LINEN: Ramp = ['#5a4630', '#8c7350', '#b89c70'];
/** Pants under a tunic. */
export const TROUSERS: Ramp = ['#2e2a24', '#4a4236', '#6a5e4a'];
/** Best Self's cape. */
export const CAPE: Ramp = R.red;
/** The Echo: you, as a gold memory. */
export const GOLD_GHOST: Ramp = ['#5c3d0a', '#9a6a12', '#d9a52a', '#f3d36b', '#fff3c4'];
/** The Hollow: you, emptied out. */
export const SHADOW: Ramp = ['#06050b', '#0f0c1c', '#1a1530', '#2a2248', '#3d3266'];
export const HOLLOW_EYES = { glow: '#dc2626', core: '#fecaca' };
/** The Wanderer's hood and cloak. */
export const HOOD: Ramp = ['#211e2c', '#3f3a52', '#5c5672', '#7a7490'];
export const LANTERN = {
  light: '#fbbf24',
  bright: '#fde68a',
  hot: '#fff3c4',
  ember: '#b45309',
};
/** Ember's flame, outside in. */
export const FLAME = {
  red: ['#7f1d1d', '#dc2626', '#f87171'],
  orange: ['#9a3412', '#f97316', '#fdba74'],
  yellow: '#fde047',
  core: '#fff7ed',
  face: '#3b1d0e',
  blush: '#fb7185',
};
