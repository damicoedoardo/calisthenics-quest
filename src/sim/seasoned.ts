import { EMBERS, SEASONED, STEPS } from '@/balance';
import type { ClassId } from '@/lib/gear';
import type { Build } from '@/lib/stats';
import type { Zone } from '@/lib/fog';
import { ITEM_SLOTS, canWear, itemScore, levelAfter, rollItem, rollRarity, type Item, type ItemSlot } from '@/game/dungeon/items';

/* The gear a real player walks in with (SEASONED in src/balance/dungeon.ts): the best they can wear
   of what earlier runs dropped, forged as far as their embers go. The Fog bot plays with it, so the
   zones are tuned for people who keep and forge their finds. Pure: the same seed, the same kit. */

/** What a player keeps from earlier runs, worn: the best item they can wear for each slot. */
export function seasonedKit(rnd: () => number, zones: Zone[], zone: number, workouts: number, cls: ClassId | undefined, build: Build, level = levelAfter(workouts)): Partial<Record<ItemSlot, Item>> {
  const finds: Item[] = [];
  for (let i = 0; i < SEASONED.finds; i++) {
    // Half from this zone, half from the one before (all from this one in the first).
    const z = zone > 0 && i % 2 ? zone - 1 : zone,
      floor = Math.floor(rnd() * 10),
      at = { zone: z, workouts: zones[z].workouts, floor, cls };
    finds.push(rollItem(rnd, at, rollRarity(rnd, floor, SEASONED.luck)));
  }
  const worn: Partial<Record<ItemSlot, Item>> = {};
  for (const slot of ITEM_SLOTS) {
    const best = finds.filter((it) => it.slot === slot && canWear(it, build, cls, level)).sort((a, b) => itemScore(b) - itemScore(a))[0];
    if (best) worn[slot] = best;
  }
  // The forge: embers from workouts and melted loot, spent a step at a time on the cheapest upgrade
  // (no co-op materials: those steps are out of reach alone).
  let embers = workouts * EMBERS.full + (finds.length - Object.keys(worn).length) * SEASONED.meltEach;
  for (;;) {
    const next = Object.values(worn)
      .filter((it): it is Item => !!it && STEPS[it.plus ?? 0] !== undefined && !Object.keys(STEPS[it.plus ?? 0].mats).length)
      .sort((a, b) => STEPS[a.plus ?? 0].embers - STEPS[b.plus ?? 0].embers)[0];
    if (!next || STEPS[next.plus ?? 0].embers > embers) break;
    embers -= STEPS[next.plus ?? 0].embers;
    worn[next.slot] = { ...next, plus: (next.plus ?? 0) + 1 };
  }
  return worn;
}
