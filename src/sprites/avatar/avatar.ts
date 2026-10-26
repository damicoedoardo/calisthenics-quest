import type { ClipFrame } from '../clips';
import { grid, mix, outline, stamp, type Grid } from '../engine/grid';
import { BODY } from './body';
import { CLOTH, EYE_COLORS, HAIR_COLORS, SKINS, clothRamp, type ClothColor, type EyeColor, type HairColor, type SkinId } from './colors';
import { BOTTOMS, EXTRAS, SHOES, TOPS } from './clothes';
import { BROWS, EYES, MOUTHS } from './face';
import { HAIRSTYLES } from './hair';
import { LAYERS, LAYER_STYLE, type Part } from './types';

/* The avatar: which part fills each slot, and its colors. drawAvatar paints it. To add an option,
   add a Part to its table (hair.ts, face.ts, clothes.ts); it shows up in the Lab on its own. */

/** Every slot the player fills, with its options and (when it has one) the color it is drawn in. */
export const SLOTS = {
  hair: { label: 'Hair', parts: HAIRSTYLES },
  eyes: { label: 'Eyes', parts: EYES },
  brows: { label: 'Brows', parts: BROWS },
  mouth: { label: 'Mouth', parts: MOUTHS },
  top: { label: 'Top', parts: TOPS },
  bottom: { label: 'Bottom', parts: BOTTOMS },
  shoes: { label: 'Shoes', parts: SHOES },
  extra: { label: 'Extra', parts: EXTRAS },
} as const;

export type Slot = keyof typeof SLOTS;
type PartOf<S extends Slot> = keyof (typeof SLOTS)[S]['parts'];

/** The color pickers: which palette each one uses. Cloth slots share the cloth colors. */
export const COLORS = {
  skin: SKINS,
  hairColor: HAIR_COLORS,
  eyeColor: EYE_COLORS,
  topColor: CLOTH,
  bottomColor: CLOTH,
  shoesColor: CLOTH,
  extraColor: CLOTH,
} as const;

export interface Avatar {
  hair: PartOf<'hair'>;
  eyes: PartOf<'eyes'>;
  brows: PartOf<'brows'>;
  mouth: PartOf<'mouth'>;
  top: PartOf<'top'>;
  bottom: PartOf<'bottom'>;
  shoes: PartOf<'shoes'>;
  extra: PartOf<'extra'>;
  skin: SkinId;
  hairColor: HairColor;
  eyeColor: EyeColor;
  topColor: ClothColor;
  bottomColor: ClothColor;
  shoesColor: ClothColor;
  extraColor: ClothColor;
}

/** The color each slot's 1/2/3 letters are drawn in. */
const SLOT_COLOR: Partial<Record<Slot, keyof Avatar>> = { top: 'topColor', bottom: 'bottomColor', shoes: 'shoesColor', extra: 'extraColor' };

const INK_LINE = '#16111e';

/** One frame of an avatar. The idle clip's `bob` moves everything but the planted layers down. */
export function drawAvatar(av: Avatar, frame: ClipFrame = {}): Grid {
  const S = SKINS[av.skin],
    Hc = HAIR_COLORS[av.hairColor],
    E = EYE_COLORS[av.eyeColor],
    bob = frame.bob ?? 0,
    base: Record<string, string> = {
      a: Hc[0], b: Hc[1], c: Hc[2],
      d: S[0], e: S[1], f: S[2],
      g: E[0], i: E[1],
      y: '#f6f2ee', W: '#ffffff', K: INK_LINE,
      w: '#eceef4', v: '#b4b8c8',
      o: mix(S[0], '#3a2440', 0.45),
      u: mix(S[0], '#4a1a24', 0.45),
    };
  const parts: [Part, Record<string, string>][] = [[BODY, base]];
  (Object.keys(SLOTS) as Slot[]).forEach((slot) => {
    const part = (SLOTS[slot].parts as Record<string, Part>)[av[slot] as string];
    if (!part) return;
    const colorKey = SLOT_COLOR[slot],
      R = colorKey ? clothRamp(av[colorKey] as ClothColor) : null;
    parts.push([part, { ...base, ...(R && { 1: R[0], 2: R[1], 3: R[2] }), ...part.inks }]);
  });

  const out = grid(64);
  for (const layer of LAYERS) {
    const style = LAYER_STYLE[layer],
      g = grid(64),
      dy = style.planted ? 0 : bob;
    let any = false;
    for (const [part, ink] of parts) {
      const art = part.layers[layer];
      if (!art) continue;
      any = true;
      art.rows.forEach((row, j) =>
        [...row].forEach((ch, i) => {
          const y = art.y + j + dy;
          if (ink[ch] && y >= 0 && y < 64) g[y][i + 16] = ink[ch];
        }),
      );
    }
    if (any) stamp(out, style.noOutline ? g : outline(g));
  }
  return out;
}

/** Ready-made looks: the starting points the Lab (and later the creator) offers. */
export const PRESETS = {
  lean: { hair: 'neat', eyes: 'sharp', brows: 'angled', mouth: 'smirk', top: 'suit', bottom: 'slacks', shoes: 'dress', extra: 'none', skin: 'light', hairColor: 'chestnut', eyeColor: 'brown', topColor: 'charcoal', bottomColor: 'charcoal', shoesColor: 'black', extraColor: 'red' },
  street: { hair: 'messy', eyes: 'tired', brows: 'none', mouth: 'flat', top: 'longsleeve', bottom: 'jeans', shoes: 'sneakers', extra: 'none', skin: 'pale', hairColor: 'black', eyeColor: 'dark', topColor: 'white', bottomColor: 'denim', shoesColor: 'white', extraColor: 'red' },
  hunter: { hair: 'swept', eyes: 'sharp', brows: 'angled', mouth: 'flat', top: 'longcoat', bottom: 'slacks', shoes: 'boots', extra: 'scarf', skin: 'light', hairColor: 'silver', eyeColor: 'red', topColor: 'plum', bottomColor: 'black', shoesColor: 'brown', extraColor: 'red' },
  athlete: { hair: 'spiky', eyes: 'round', brows: 'straight', mouth: 'grin', top: 'tank', bottom: 'shorts', shoes: 'sneakers', extra: 'headband', skin: 'tan', hairColor: 'brown', eyeColor: 'amber', topColor: 'orange', bottomColor: 'black', shoesColor: 'red', extraColor: 'red' },
  heroine: { hair: 'long', eyes: 'lashes', brows: 'soft', mouth: 'smile', top: 'hoodie', bottom: 'skirt', shoes: 'boots', extra: 'none', skin: 'light', hairColor: 'black', eyeColor: 'blue', topColor: 'navy', bottomColor: 'black', shoesColor: 'black', extraColor: 'red' },
  gothic: { hair: 'pony', eyes: 'lashes', brows: 'angled', mouth: 'flat', top: 'longcoat', bottom: 'skirt', shoes: 'boots', extra: 'choker', skin: 'pale', hairColor: 'blonde', eyeColor: 'red', topColor: 'black', bottomColor: 'black', shoesColor: 'black', extraColor: 'black' },
} satisfies Record<string, Avatar>;

export type PresetId = keyof typeof PRESETS;
export const DEFAULT_AVATAR: Avatar = PRESETS.street;

/** A saved avatar made safe to draw: unknown or missing choices fall back to the default. */
export function normalizeAvatar(a?: Partial<Record<keyof Avatar, unknown>> | null): Avatar {
  const out = { ...DEFAULT_AVATAR } as Record<keyof Avatar, unknown>;
  if (!a) return out as Avatar;
  for (const slot of Object.keys(SLOTS) as Slot[]) if (typeof a[slot] === 'string' && (a[slot] as string) in SLOTS[slot].parts) out[slot] = a[slot];
  for (const key of Object.keys(COLORS) as (keyof typeof COLORS)[]) if (typeof a[key] === 'string' && (a[key] as string) in COLORS[key]) out[key] = a[key];
  return out as Avatar;
}
