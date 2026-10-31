import { MAX_SETS, MAX_SETS_PER_FAMILY, TIME_SLACK } from '@/balance';
import type { LibraryExercise } from '@/exercises/library';
import { spares, usable } from './options';
import { BLOCKS, inOrder } from './craft';
import { minutesOf } from './time';
import type { CoachPlan, CoachProfile, PlanItem } from './types';

/* The guardrails every workout passes, whoever built it (the built-in coach or an LLM): the blocks
   in order (warm-up, main, accessory, core, cool-down; craft.ts), a warm-up first and a stretch last, only real exercises you have the gear for, nothing on a sore spot's
   list, no family hammered, and about the minutes you said. What it can fix it fixes, and says so;
   `problems` tells an LLM what to do better. */

export interface Checked {
  plan: CoachPlan;
  problems: string[];
}

/** Warm-ups and stretches that need no library entry. */
const BUILT_IN = new Set(['circles', 'toe-touch', 'quad-stretch', 'child-pose']);

export { minutesOf };

export function validate(plan: CoachPlan, ctx: { all: LibraryExercise[]; profile: CoachProfile }): Checked {
  const problems: string[] = [];
  const byId = new Map(ctx.all.map((x) => [x.id, x]));
  const spare = spares(ctx.profile);
  let items = plan.items.filter((it) => {
    const x = byId.get(it.id);
    if (!x && !BUILT_IN.has(it.id)) return problems.push(`${it.name}: not in the library`), false;
    if (x && !usable(x, ctx.profile.gear)) return problems.push(`${it.name}: needs ${x.equipment}, which you don't have`), false;
    if (x && spare.some((f) => f(x))) return problems.push(`${it.name}: hard on a sore spot`), false;
    return true;
  });
  items = items.map((it) => ({ ...it, sets: Math.max(1, Math.round(it.sets)), low: Math.max(1, Math.round(it.low)), high: Math.max(Math.round(it.low), Math.round(it.high)) }));

  const ordered = inOrder(items);
  if (ordered.some((it, k) => it !== items[k])) problems.push(`put in order: ${BLOCKS.join(', ')}`);
  items = ordered;

  const warm = items.filter((i) => i.role === 'warmup'),
    stretch = items.filter((i) => i.role === 'stretch'),
    work = items.filter((i) => i.role !== 'warmup' && i.role !== 'stretch');
  if (!warm.length) problems.push('no warm-up: added one');
  if (!stretch.length) problems.push('no stretch: added one');
  if (!work.length) problems.push('no real work in the workout');
  const first = warm.length ? warm : [{ id: 'circles', name: 'Joint circles', demo: 'circles', cue: 'Start with small circles, get bigger.', family: 'mobility', role: 'warmup', unit: 'sec', sets: 1, low: 90, high: 90, easier: [], swaps: [] } satisfies PlanItem];
  const last = stretch.length ? stretch : [{ id: 'toe-touch', name: 'Toe touch stretch', demo: 'toe-touch', cue: 'Soft knees, let the head hang.', family: 'stretch', role: 'stretch', unit: 'sec', sets: 1, low: 60, high: 60, easier: [], swaps: [] } satisfies PlanItem];

  // No family past its cap; no workout past the total.
  const perFamily = new Map<string, number>();
  const capped = work.map((it) => {
    if (it.run) return it;
    const had = perFamily.get(it.family) ?? 0;
    const sets = Math.min(it.sets, MAX_SETS_PER_FAMILY - had);
    if (sets < it.sets) problems.push(`${it.name}: too many ${it.family} sets, cut to ${Math.max(sets, 0)}`);
    perFamily.set(it.family, had + Math.max(sets, 0));
    return { ...it, sets };
  }).filter((it) => it.sets > 0);
  let hard = capped.reduce((a, i) => a + (i.run ? 0 : i.sets), 0);
  for (let k = capped.length - 1; hard > MAX_SETS && k >= 0; k--) {
    while (hard > MAX_SETS && capped[k].sets > 1 && !capped[k].run) (capped[k] = { ...capped[k], sets: capped[k].sets - 1 }), hard--;
  }

  // About the minutes you said: a little over at most. Like a trainer short on time: accessories
  // and core down to two sets, then the accessories go, then core, then a set of the main moves
  // from the last. The warm-up and the cool-down stay.
  let all = [...first, ...capped, ...last];
  const limit = ctx.profile.minutes * (1 + TIME_SLACK);
  if (minutesOf(all) > limit) {
    problems.push(`about ${minutesOf(all)} min, more than your ${ctx.profile.minutes}: trimmed`);
    const steps = [(i: PlanItem) => i.role === 'accessory' && i.sets > 2, (i: PlanItem) => i.role === 'core' && i.sets > 2, 'accessory', 'core', (i: PlanItem) => i.role === 'main' && !i.run && i.sets > 2] as const;
    for (let guard = 0; minutesOf(all) > limit && guard < 60; guard++) {
      let changed = false;
      for (const step of steps) {
        const drop = typeof step === 'string';
        const k = drop ? all.findLastIndex((i) => i.role === step) : all.findLastIndex(step);
        if (k === -1) continue;
        all = drop ? all.filter((_, j) => j !== k) : all.map((it, j) => (j === k ? { ...it, sets: it.sets - 1 } : it));
        changed = true;
        break;
      }
      if (!changed) break;
    }
  }
  return { plan: { ...plan, items: all }, problems };
}
