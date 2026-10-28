/* Mira's forge from +1 to +15: what each step costs, how often it holds, what a miss does, and the
   four materials that only drop when you play with friends. Plain data, no imports: the rules are in
   src/lib/forge.ts (the forge) and src/game/dungeon/engine.ts (the drops).
   The goal: +1..+5 is training alone (embers from workouts). +6 and up also need co-op materials,
   so friends open the top, and every step still costs embers, so training pays for all of it. */

/** The materials, rarest last. Each band of steps needs the next one. */
export type MatId = 'thread' | 'shard' | 'coal' | 'heart';
export const MAT_IDS: MatId[] = ['thread', 'shard', 'coal', 'heart'];

/** Names and colors. Story words: the Ember Road is walked together, so its finds are about that. */
export const MATS: Record<MatId, { name: string; color: string; from: string }> = {
  thread: { name: 'Ember thread', color: '#fdba74', from: 'any monster on a co-op run' },
  shard: { name: 'Bond shard', color: '#60a5fa', from: 'elites and chests on a co-op run' },
  coal: { name: 'Warden coal', color: '#f87171', from: 'mid-bosses and bosses on a co-op run' },
  heart: { name: 'Heartstone', color: '#c084fc', from: 'a co-op run won with the whole party standing' },
};

/** The forge's top. */
export const MAX_PLUS = 15;

/** Each step, from +1 (index 0) to +15: embers, materials, the chance it holds (0-1), and how much
    stronger the item gets. Harder: more embers or materials, lower `odds`. Goal: +5 in about 2 weeks
    of training, +10 in a few months with friends, +15 a long road (about a year, many co-op runs). */
export const STEPS: { embers: number; mats: Partial<Record<MatId, number>>; odds: number; boost: number }[] = [
  { embers: 10, mats: {}, odds: 1, boost: 0.1 },
  { embers: 20, mats: {}, odds: 1, boost: 0.1 },
  { embers: 30, mats: {}, odds: 1, boost: 0.1 },
  { embers: 40, mats: {}, odds: 1, boost: 0.1 },
  { embers: 50, mats: {}, odds: 1, boost: 0.1 },
  { embers: 55, mats: { thread: 2 }, odds: 1, boost: 0.08 },
  { embers: 60, mats: { thread: 3 }, odds: 0.9, boost: 0.08 },
  { embers: 65, mats: { thread: 5 }, odds: 0.8, boost: 0.08 },
  { embers: 70, mats: { thread: 8 }, odds: 0.7, boost: 0.08 },
  { embers: 80, mats: { thread: 10, shard: 1 }, odds: 0.6, boost: 0.1 },
  { embers: 90, mats: { thread: 12, shard: 2 }, odds: 0.5, boost: 0.07 },
  { embers: 100, mats: { thread: 15, shard: 3 }, odds: 0.45, boost: 0.07 },
  { embers: 110, mats: { thread: 15, shard: 4, coal: 1 }, odds: 0.4, boost: 0.1 },
  { embers: 125, mats: { thread: 20, shard: 5, coal: 2 }, odds: 0.35, boost: 0.08 },
  { embers: 140, mats: { thread: 25, shard: 6, coal: 3, heart: 1 }, odds: 0.3, boost: 0.15 },
];

/** A miss at the forge. The materials and embers are always spent. Then, `drop` is the chance the
    item slips one plus, but never below a safe point it has reached; it never breaks. Each miss on
    the same step adds `pity` to the next try there. Trained in the last `restedDays` days adds
    `rested`. Harsher: higher `drop`, lower `pity`/`rested`. Goal: risky at the top, never a loss
    that undoes weeks. */
export const FORGE_RISK = { drop: 0.5, pity: 0.05, rested: 0.1, restedDays: 2 } as const;

/** Plus levels an item never slips below once reached, by a miss at the forge. */
export const SAFE_POINTS = [6, 10, 13] as const;

/** How often a co-op run's kills drop materials, per hero (each hero rolls their own). Solo runs
    drop none. Harder: lower. Goal: a co-op run of a whole zone finds 2-3 threads and now and
    then a shard, so one evening (2-3 runs) is about one step in +6..+9. Chests and the two bosses
    give most of it, so it rewards playing a run through together, not farming kills. */
export const MAT_DROPS = {
  /** Any monster that gives XP: a chance of one thread. */
  plain: { thread: 0.0003 },
  /** An elite or golem. */
  elite: { thread: 0.006, shard: 0.0015 },
  /** An opened chest. */
  chest: { thread: 0.05, shard: 0.008 },
  /** The floor-5 mid-boss. */
  warden: { thread: 0.5, shard: 0.1, coal: 0.08 },
  /** The zone's boss. */
  boss: { thread: 0.5, shard: 0.1, coal: 0.08 },
  /** A won run with every hero standing. */
  clear: { heart: 0.033 },
} as const satisfies Record<string, Partial<Record<MatId, number>>>;

/** Materials a friend can be given in one day (gifts go through the server). Goal: friends help
    each other up, but nobody's whole forge is fed by one other player. */
export const GIFTS = { perDay: 10 } as const;

/** How an item looks for its plus, like NosTale's SP: a new look every few steps, growing into
    the full shine at +15 (Edoardo's call: the shine comes from forging, legendaries burn instead).
    `from` is the first plus of the band. `glow` lights the tile ('rarity': in its rarity's color),
    `sparks` rise from it, `rays` turn behind it on its card, and `aura` is how far the light runs
    around the hero wearing it (the sprite's `aura` level: under 5 none, 5 two rings, 8 three
    that flicker, 10 four). */
export const BANDS: { from: number; name: string; glow: string | null; sparks: boolean; rays: boolean; aura: number }[] = [
  { from: 0, name: 'Plain', glow: null, sparks: false, rays: false, aura: 0 },
  { from: 4, name: 'Warm', glow: '#fde68a', sparks: false, rays: false, aura: 5 },
  { from: 7, name: 'Lit', glow: 'rarity', sparks: false, rays: false, aura: 6 },
  { from: 10, name: 'Sparking', glow: 'rarity', sparks: true, rays: false, aura: 8 },
  { from: 13, name: 'Shining', glow: '#fde68a', sparks: true, rays: true, aura: 9 },
  { from: 15, name: 'Radiant', glow: '#fff7d6', sparks: true, rays: true, aura: 10 },
];
