import { NIGHT, mix, type Ramp } from '../engine/grid';

/* Every color the player can pick. Ramps go dark to light. Add a color by adding a line. */

export const SKINS = {
  pale: ['#c9a08e', '#f4d8cc', '#fff0ea'],
  light: ['#c98b62', '#f2c19a', '#ffdcbc'],
  olive: ['#a87a4e', '#d8aa78', '#f0c896'],
  tan: ['#9a6038', '#d49464', '#eab288'],
  brown: ['#6e4024', '#a8693e', '#c8885a'],
  deep: ['#3e2214', '#6e4026', '#94603c'],
} satisfies Record<string, Ramp>;

export const HAIR_COLORS = {
  black: ['#0e0e16', '#22222e', '#3e3e52'],
  brown: ['#3b2516', '#6b4226', '#9a6a3c'],
  chestnut: ['#4a1e10', '#8a3a1e', '#bc6236'],
  blonde: ['#8a6a1e', '#d9b54a', '#f6e08a'],
  red: ['#6e1a12', '#b23a22', '#e2703e'],
  silver: ['#6a7080', '#b4bccb', '#eef2f8'],
  white: ['#a4a8b8', '#e4e6ee', '#ffffff'],
  blue: ['#1a2a6a', '#3656c0', '#7aa0f0'],
  pink: ['#8a2a5a', '#d8609a', '#f4a6c8'],
} satisfies Record<string, Ramp>;

export const EYE_COLORS = {
  brown: ['#3a2416', '#7a4a2a', '#c08a52'],
  dark: ['#0c0a10', '#2a2430', '#4a4252'],
  amber: ['#5a300a', '#b0701c', '#f0b040'],
  blue: ['#14306a', '#2a62b8', '#6aa8f0'],
  green: ['#143a24', '#2a7a46', '#6ac084'],
  grey: ['#3a4250', '#6a7686', '#a8b4c4'],
  red: ['#5a0c14', '#b0202e', '#f05a5a'],
  violet: ['#2a1450', '#5a34a0', '#a07ae0'],
} satisfies Record<string, Ramp>;

/** Cloth colors as a single base hex; the ramp around it is made by `clothRamp`. */
export const CLOTH = {
  linen: '#8c7350',
  black: '#24222e',
  charcoal: '#3a3a4a',
  grey: '#7a8090',
  white: '#e4e6ee',
  navy: '#26325a',
  denim: '#3a5a8a',
  sky: '#5aa0d8',
  red: '#b02838',
  crimson: '#6e1424',
  orange: '#d0702a',
  gold: '#c9921c',
  forest: '#2a5a3a',
  olive: '#5a6036',
  plum: '#4e2a68',
  tan: '#a88a62',
  brown: '#5e3c24',
} satisfies Record<string, string>;

export type SkinId = keyof typeof SKINS;
export type HairColor = keyof typeof HAIR_COLORS;
export type EyeColor = keyof typeof EYE_COLORS;
export type ClothColor = keyof typeof CLOTH;

/** Dark, base and light around a cloth color. */
export const clothRamp = (c: ClothColor): Ramp => {
  const base = CLOTH[c];
  return [mix(base, NIGHT, 0.42), base, mix(base, '#ffffff', 0.3)];
};
