import { R } from '@/sprites/palette';
import { STONE } from './props';

/* Each zone's dungeon has its own mood: the floor, the stone of its walls and pillars, the color
   its torches burn and the water in its pools. Anchored on the zone's own `ground` and `fog`
   colors (src/story/chapters), so the dungeon matches the map. Zone 1 (the Ashlands) is the
   original look. */

export interface Theme {
  name: string;
  /** The floor slabs (the zone's ground color). */
  ground: string;
  /** The mist drifting over the room (the zone's fog color). */
  fog: string;
  /** Walls, pillars and the shrine's pedestal, darkest to lightest: seven tones. */
  stone: string[];
  /** What grows on the pillars. */
  moss: string;
  /** Torch flames: dark, base, light, then the hot core. */
  fire: string[];
  /** The warm (or cold) pool each torch throws on the wall. */
  glow: string;
  /** Pools: the shade under the near rim, deep, base, then the light on the ripples. */
  water: string[];
  /** Pebbles (dark, light), tufts (dark, light) and bones on the floor; drawn from `stone` if left out. */
  litter?: string[];
}

export const THEMES: Theme[] = [
  {
    name: 'Ashlands',
    ground: '#231d2e',
    fog: '#4a3f63',
    stone: STONE,
    moss: '#4d7c0f',
    fire: [R.fire[0], R.fire[1], R.fire[2], R.light[2]],
    glow: '#f08a3a',
    water: ['#0b2547', ...R.water],
    litter: ['#3f3a4d', '#5b5570', '#3a3346', '#4c4459', '#6b6478'],
  },
  {
    // Cold blue stone, moonlit torches, a still silver lake in every room.
    name: 'Mirror Lake',
    ground: '#101826',
    fog: '#253a5c',
    stone: ['#0a0f1a', '#18233a', '#24324e', '#2e3f60', '#3d5278', '#4f6690', '#7d93b8'],
    moss: '#3a6f8f',
    fire: ['#1e3a8a', '#60a5fa', '#bfdbfe', '#ffffff'],
    glow: '#7dd3fc',
    water: ['#0a1830', '#1c3e6e', '#4a7fc0', '#e2e8f0'],
  },
  {
    // The Cold Forges: soot-black iron-grey brick, deep red forge fire, black quench water.
    name: 'Village of Almosts',
    ground: '#1c1916',
    fog: '#4b4038',
    stone: ['#0e0e10', '#1e1d1d', '#2e2c2b', '#3c3936', '#4e4945', '#625b55', '#8c847b'],
    moss: '#5c6b2a',
    fire: ['#7f1d1d', '#dc2626', '#fb923c', '#fde68a'],
    glow: '#ea580c',
    water: ['#0c1214', '#1a2428', '#34474e', '#8fa3ab'],
  },
  {
    // Sandstone, a dry gold flame, muddy shallow water.
    name: 'Plateau',
    ground: '#1c1712',
    fog: '#4a3a26',
    stone: ['#21170c', '#3f2d19', '#5a4124', '#71532f', '#8f6b3d', '#ad8650', '#d9b47a'],
    moss: '#6b7a26',
    fire: ['#8a6512', '#d9ad3a', '#f7e08a', '#fff7d6'],
    glow: '#fbbf24',
    water: ['#1a1a0e', '#33361c', '#5c6132', '#b5b98a'],
  },
  {
    // The Hollow Woods: mossy green stone, ghost-green torches, black swamp water.
    name: 'The Fog',
    ground: '#111a17',
    fog: '#1f3b33',
    stone: ['#08100d', '#14211c', '#1e3029', '#273d35', '#335046', '#41655a', '#6a9486'],
    moss: '#4ade80',
    fire: ['#14532d', '#22c55e', '#86efac', '#f0fdf4'],
    glow: '#4ade80',
    water: ['#050d0b', '#0f2420', '#1f4a40', '#5eead4'],
  },
  {
    // The Summit: pale marble under a white light, clear bright water.
    name: 'Forma',
    ground: '#1a1a22',
    fog: '#e2e8f0',
    stone: ['#1e1e28', '#3a3a48', '#55556a', '#6e6e86', '#8c8ca4', '#aeb0c4', '#e2e4ef'],
    moss: '#d9ad3a',
    fire: ['#c9921c', '#f3d36b', '#fff3c4', '#ffffff'],
    glow: '#fde68a',
    water: ['#102a4a', '#1f5590', '#4f9be0', '#ffffff'],
  },
];

/** The theme for a zone (by its id, from 0); zones past the table reuse the last one. */
export const themeFor = (zoneId: number): Theme => THEMES[Math.min(Math.max(0, zoneId), THEMES.length - 1)];
