import { heroLevel, levelInfo, previewXp, sessionsThisWeek, totalXp, WEEKLY_GOAL, type Checkin, type GameState } from './game';
import { pointsFree } from './stats';
import { coins } from './sweat';
import { canUpgrade, embersOf, matsOf } from './forge';
import { NO_GEAR } from './fog-gear';
import { EMBERS, POINTS, SWEAT } from '@/balance';

/* What a workout gives, in one place, so the screens can show it the same way everywhere: XP (your
   level, which lets you wear better items), stat points (Hero > Stats), embers (Mira's forge),
   sweat coins (start your points over, change class), and co-op materials (forge past +5, only
   with friends). The numbers all come from src/balance; this only reads them. */

export type LootId = 'xp' | 'points' | 'embers' | 'coins' | 'mats';

/** The order they show in. */
export const LOOT_IDS: LootId[] = ['xp', 'points', 'embers', 'coins', 'mats'];

/** What you have of each now. `xp` is the level. */
export function purseOf(state: GameState): Record<LootId, number> {
  const mats = Object.values(matsOf(state)).reduce((a, n) => a + (n ?? 0), 0);
  return { xp: heroLevel(state), points: pointsFree(state), embers: embersOf(state), coins: coins(state), mats };
}

/** What the next workout gives, done as `checkin` today (Rough is the minimum quest). Materials
    never come from a workout. */
export function nextLoot(state: GameState, checkin: Checkin, now: Date): Omit<Record<LootId, number>, 'mats'> {
  const kind = checkin === 'rough' ? 'mini' : 'full';
  const goal = sessionsThisWeek(state, now) === WEEKLY_GOAL - 1 ? POINTS.week : 0;
  return { xp: previewXp(state, checkin, now), points: POINTS[kind] + goal, embers: EMBERS[kind], coins: SWEAT.perWorkout };
}

/** Workouts until the next level, counting full ones without a streak (the slow way). */
export function workoutsToLevel(state: GameState, now: Date): number {
  const lvl = levelInfo(totalXp(state));
  return Math.max(1, Math.ceil((lvl.needed - lvl.into) / Math.max(1, previewXp(state, 'normal', now))));
}

/** What is waiting to be spent: points not put anywhere, an item the forge can take up a step. */
export function spendable(state: GameState): Partial<Record<LootId, boolean>> {
  const g = state.fogGear ?? NO_GEAR;
  const items = [...Object.values(g.worn), ...g.vault].filter((x) => !!x);
  return { points: pointsFree(state) > 0, embers: items.some((it) => canUpgrade(state, it)) };
}

