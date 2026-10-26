/* The avatar is a paper doll: one shared body, and every option the player picks (a hairstyle, a
   pair of eyes, a jacket) is a Part that paints one or more layers on top of it. Parts are drawn
   by hand as text rows, one character per pixel, so adding an option is adding a table. */

/** Pixel art for one layer: rows of 32 characters, starting at row `y` of the 64-pixel frame.
    The 32 columns are centered in the frame (x 16..47). '.' is empty. */
export interface Art {
  y: number;
  rows: string[];
}

/**
 * Where a part paints, back to front. Every layer gets a 1-pixel outline in a darker shade of
 * whatever it touches, except the face layers. The legs, bottoms and shoes stay planted when the
 * idle breath moves the rest down a pixel.
 */
export const LAYERS = ['back', 'legs', 'feet', 'bottom', 'shoes', 'neck', 'torso', 'arms', 'top', 'head', 'eyes', 'brows', 'mouth', 'hair', 'extra'] as const;
export type Layer = (typeof LAYERS)[number];

export const LAYER_STYLE: Record<Layer, { planted?: boolean; noOutline?: boolean }> = {
  back: {},
  legs: { planted: true },
  feet: { planted: true },
  bottom: { planted: true },
  shoes: { planted: true },
  torso: {},
  arms: {},
  top: {},
  neck: {},
  head: {},
  eyes: { noOutline: true },
  brows: { noOutline: true },
  mouth: { noOutline: true },
  hair: {},
  extra: {},
};

/**
 * One option in a slot. Letters every part can use:
 *   a b c  hair dark / base / light          d e f  skin shadow / base / light
 *   1 2 3  this slot's color dark / base / light
 *   g i    iris dark / light (eye color)     y eye white, W shine, K ink line
 *   w v    white / white shadow              o tired ring under the eyes, u mouth line
 * A part can add its own fixed colors in `inks`.
 */
export interface Part {
  label: string;
  layers: Partial<Record<Layer, Art>>;
  inks?: Record<string, string>;
}
