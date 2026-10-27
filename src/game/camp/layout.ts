/* The camp as data: one strip of ground, held sideways, walked from the fire on the left to the
   gates on the right. The scene (scene.ts) draws it; the page opens a panel when you reach a spot. */

export type StationId = 'fire' | 'vault' | 'forge' | `gate${number}`;

export interface Station {
  id: StationId;
  /** Where it stands (its feet), in camp points. */
  x: number;
  y: number;
  label: string;
}

/** The camp's size in camp points: the screen shows its whole height. */
export const CAMP = { w: 1760, h: 360, ground: 150 } as const;

/** How close you walk to a spot before its panel opens. */
export const REACH = 46;

/** The fire, the vault and Mira's forge, then a gate for each zone. */
export function stations(zones: { id: number; name: string }[]): Station[] {
  return [
    { id: 'fire', x: 220, y: 250, label: 'The fire' },
    { id: 'vault', x: 430, y: 236, label: 'Vault' },
    { id: 'forge', x: 640, y: 246, label: "Mira's forge" },
    ...zones.map((z, i): Station => ({ id: `gate${z.id}`, x: 880 + i * 150, y: 232, label: z.name })),
  ];
}

/** The zone a gate leads to, or null for the other spots. */
export const gateZone = (id: StationId): number | null => (id.startsWith('gate') ? Number(id.slice(4)) : null);
