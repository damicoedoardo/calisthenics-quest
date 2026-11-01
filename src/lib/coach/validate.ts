import { LAWS, MAX_SETS, MAX_SETS_PER_FAMILY, TIME_SLACK } from '@/balance';
import type { Session } from '../game';
import { comingBack, longestRun } from './laws';
import type { LibraryExercise } from '@/exercises/library';
import { spares, usable } from './options';
import { BLOCKS, inOrder } from './craft';
import { minutesOf } from './time';
import type { CoachPlan, CoachProfile, PlanItem } from './types';

/* The guardrails every workout passes, whoever built it (the built-in coach or an LLM): the
   workout laws (laws.ts: a warm-up first, nothing on a sore spot, no family hammered, a gentle
   comeback, no sudden long run, about your minutes) and only real exercises you have the gear for.
   What it can fix it fixes, and says so. The craft's defaults (block order, a cool-down; craft.ts)
   are only noted: the player may want it otherwise. `problems` tells an LLM what to do better. */

export interface Checked {
  plan: CoachPlan;
  problems: string[];
}

/** Warm-ups and stretches that need no library entry. */
const BUILT_IN = new Set(['circles', 'toe-touch', 'quad-stretch', 'child-pose']);

export { minutesOf };

export function validate(plan: CoachPlan, ctx: { all: LibraryExercise[]; profile: CoachProfile; sessions?: Session[]; now?: Date }): Checked {
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

  const warm = items.filter((i) => i.role === 'warmup'),
    stretch = items.filter((i) => i.role === 'stretch'),
    work = items.filter((i) => i.role !== 'warmup' && i.role !== 'stretch');
  // Defaults, only noted: the craft's order, and a cool-down.
  if (inOrder(work).some((it, k) => it !== work[k])) problems.push(`note: the usual order is ${BLOCKS.slice(1, 4).join(', ')} (a default; fine if they asked)`);
  if (!stretch.length) problems.push('note: no cool-down (a default; fine if they asked)');
  if (!work.length) problems.push('no real work in the workout');
  // Law 1: a warm-up first, long enough.
  let first: PlanItem[] = warm.length ? warm : [{ id: 'circles', name: 'Joint circles', demo: 'circles', cue: 'Start with small circles, get bigger.', family: 'mobility', role: 'warmup', unit: 'sec', sets: 1, low: LAWS.warmupSec, high: LAWS.warmupSec, easier: [], swaps: [] } satisfies PlanItem];
  if (!warm.length) problems.push('no warm-up: added one (law 1)');
  const warmSec = first.reduce((a, i) => a + i.low * i.sets, 0);
  if (warmSec < LAWS.warmupSec) {
    problems.push(`warm-up ${warmSec}s, at least ${LAWS.warmupSec}s: made longer (law 1)`);
    first = first.map((it, k) => (k === first.length - 1 ? { ...it, low: it.low + LAWS.warmupSec - warmSec, high: it.low + LAWS.warmupSec - warmSec } : it));
  }
  const last = stretch;

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

  // Law 7: back from a break, a third of the sets go. Law 8: no run much longer than lately.
  const now = ctx.now ?? new Date(plan.at);
  if (ctx.sessions && comingBack(ctx.sessions, now)) {
    let cut = false;
    for (let k = 0; k < capped.length; k++) {
      const it = capped[k];
      const sets = Math.max(1, Math.round(it.sets * (1 - LAWS.comebackCut)));
      if (!it.run && sets < it.sets) (capped[k] = { ...it, sets }), (cut = true);
    }
    if (cut) problems.push('coming back after a break: a third of the sets dropped (law 7)');
  }
  const longest = ctx.sessions ? longestRun(ctx.sessions, now) : 0;
  for (let k = 0; k < capped.length; k++) {
    const it = capped[k];
    const max = Math.round(longest * (1 + LAWS.runSpike));
    if (!it.run || !longest || it.low <= max) continue;
    const f = max / it.low;
    const run = it.run.map((st) => ({ ...st, sec: Math.max(30, Math.round((st.sec * f) / 10) * 10) }));
    const sec = run.reduce((a, st) => a + st.sec, 0);
    capped[k] = { ...it, run, low: sec, high: sec };
    problems.push(`${it.name}: ${Math.round(it.low / 60)} min is far past the longest run lately (${Math.round(longest / 60)} min): cut to ${Math.round(sec / 60)} (law 8)`);
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
