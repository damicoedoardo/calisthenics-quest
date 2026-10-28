import type { LibraryExercise } from '@/exercises/library';
import { COACHING } from '@/exercises/coaching';
import { todaysQuest, type GameState } from '../game';
import { HOLDS, easierChoices, plainness, swapChoices } from './options';
import type { Choice, CoachPlan, Gear, PlanItem } from './types';

/* Changing the next workout: swap an exercise for an easier one or another, move it, skip it. Each
   change is kept on the item (`changed`, `skipped`) so the session log shows what you did and the
   coach learns from it. Sets already logged move with a swapped exercise. */

const isEnd = (it: PlanItem) => it.role === 'warmup' || it.role === 'stretch';

/** The gear the choices may use: the coach's profile, else the built-in plan's gym or home. */
export function trainingGear(state: GameState): Gear[] {
  return state.coach?.profile?.gear ?? (state.profile.kit === 'home' ? ['none'] : ['gym']);
}

export function setPlan(state: GameState, plan: CoachPlan | null): GameState {
  return { ...state, coach: { notes: [], ...state.coach, plan } };
}

/** Today's built-in workout as a plan, so it can be changed too. */
export function planFromQuest(state: GameState, all: LibraryExercise[], now: Date): CoachPlan {
  const gear = trainingGear(state);
  const items = todaysQuest(state, 'normal').map((q): PlanItem => {
    const base = [...all.filter((x) => x.demo === q.demo)].sort((a, b) => plainness(a) - plainness(b))[0];
    const family = base?.family ?? COACHING[q.demo]?.family ?? 'core';
    return {
      id: q.id,
      name: q.name,
      demo: q.demo,
      cue: q.cue,
      family,
      role: q.role,
      unit: q.unit,
      sets: q.slot.sets,
      low: q.slot.low,
      high: q.slot.high,
      ...(q.slot.weighted ? { weighted: true } : {}),
      easier: base && !isEnd({ role: q.role } as PlanItem) ? easierChoices(all, { ...base, id: q.id }, gear) : [],
      swaps: base && !isEnd({ role: q.role } as PlanItem) ? swapChoices(all, { ...base, id: q.id }, gear) : [],
    };
  });
  return { mode: state.profile.kit === 'home' ? 'calisthenics' : 'gym', items, by: 'built-in', at: now.toISOString(), title: 'The built-in plan' };
}

/** Put `to` in the place of item `id`. */
export function changeItem(state: GameState, id: string, to: Choice, how: 'easier' | 'swap'): GameState {
  const plan = state.coach?.plan;
  const at = plan?.items.findIndex((i) => i.id === id) ?? -1;
  if (!plan || at === -1 || plan.items.some((i) => i.id === to.id)) return state;
  const old = plan.items[at];
  const back: Choice = { id: old.id, name: old.name, demo: old.demo, cue: old.cue, family: old.family, equipment: '', ...(old.weighted ? { weighted: true } : {}) };
  const unit = HOLDS.includes(to.demo) ? 'sec' : 'reps';
  const range = unit === old.unit ? { low: old.low, high: old.high } : unit === 'sec' ? { low: 20, high: 45 } : { low: 8, high: 12 };
  const item: PlanItem = {
    ...old,
    id: to.id,
    name: to.name,
    demo: to.demo,
    cue: to.cue,
    family: to.family,
    unit,
    ...range,
    weighted: to.weighted,
    // Easier: the next steps down stay on offer. Swap: the old one can come back.
    easier: how === 'easier' ? old.easier.slice(old.easier.findIndex((c) => c.id === to.id) + 1) : old.easier.filter((c) => c.id !== to.id),
    swaps: how === 'swap' ? [back, ...old.swaps.filter((c) => c.id !== to.id)] : old.swaps,
    changed: old.changed ?? { from: old.id, fromName: old.name, how },
  };
  if (!item.weighted) delete item.weighted;
  // Back to where it started: no change left to note.
  if (item.changed?.from === to.id) delete item.changed;
  const items = plan.items.map((it, i) => (i === at ? item : it));
  const draft = state.draft && state.draft.sets[id] ? { ...state.draft, sets: Object.fromEntries(Object.entries(state.draft.sets).map(([k, v]) => [k === id ? to.id : k, v])) } : state.draft;
  return { ...setPlan(state, { ...plan, items }), draft };
}

/** Move an exercise one place up (-1) or down (+1); the warm-up stays first and the stretch last. */
export function moveItem(state: GameState, id: string, dir: -1 | 1): GameState {
  const plan = state.coach?.plan;
  const at = plan?.items.findIndex((i) => i.id === id) ?? -1;
  const to = at + dir;
  if (!plan || at === -1 || to < 0 || to >= plan.items.length || isEnd(plan.items[at]) || isEnd(plan.items[to])) return state;
  const items = [...plan.items];
  [items[at], items[to]] = [items[to], items[at]];
  return setPlan(state, { ...plan, items });
}

export function skipItem(state: GameState, id: string, skipped: boolean): GameState {
  const plan = state.coach?.plan;
  if (!plan) return state;
  return setPlan(state, { ...plan, items: plan.items.map((it) => (it.id === id ? { ...it, skipped } : it)) });
}

/** Can this item move that way? */
export function canMove(plan: CoachPlan, id: string, dir: -1 | 1): boolean {
  const at = plan.items.findIndex((i) => i.id === id),
    to = at + dir;
  return at !== -1 && to >= 0 && to < plan.items.length && !isEnd(plan.items[at]) && !isEnd(plan.items[to]);
}
