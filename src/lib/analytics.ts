import type { GameState, Session } from './game';
import { levelInfo, totalXp } from './game';
import type { RunResult } from './fog';
import { NO_FOG } from './fog';
import { NO_GEAR, wornFor } from './fog-gear';
import { spChosen, spOwned } from './sp';
import type { StatId } from './stats';
import { storyState } from '@/story/engine';
import { powerScore } from '@/game/power';
import type { Item, ItemSlot } from '@/game/dungeon/items';

/* What FORMA tells its play stats (PostHog, through analytics-client.ts): for balancing and to see
   who comes back, and when. The rules here are pure: most events are read off the save, by
   comparing it before and after a change (eventsBetween), so no screen has to remember to log.
   Never sent: the letter, the Hollow's voice, names, comments, chat text, story answers' words,
   the email. Only counts, ids and choices from fixed lists. See docs/handbook/app/analytics.md. */

export type Props = Record<string, string | number | boolean | null>;
export interface AnalyticsEvent {
  name: string;
  props: Props;
}

const DAY = 86_400_000;
const days = (a: Date, b: Date) => Math.floor((b.getTime() - a.getTime()) / DAY);

/** Who the player is right now, sent with every event: where they are in the game and how strong. */
export function heroContext(state: GameState, now: Date): Props {
  const story = storyState(state);
  const fog = state.fog ?? NO_FOG;
  const first = state.days?.[0]?.day ?? state.sessions[0]?.date;
  const cls = state.profile.classId;
  const last = state.sessions.at(-1);
  return {
    workouts: state.sessions.length,
    hero_level: levelInfo(totalXp(state)).level,
    chapter: story.finished ? null : story.index + 1,
    story_done: story.finished,
    class: cls ?? null,
    sp: spChosen(state) || null,
    zones_cleared: fog.cleared,
    fog_runs: fog.runs,
    power: cls ? Math.round(powerScore(cls, state.build ?? {}, wornFor(state)).score) : null,
    days_opened: state.days?.length ?? 0,
    days_since_start: first ? days(new Date(first), now) : 0,
    days_since_workout: last ? days(new Date(last.date), now) : null,
    coach_on: !!state.coach?.profile,
  };
}

const worn = (s: GameState) => (s.fogGear ?? NO_GEAR).worn;
const allItems = (s: GameState): Item[] => [...Object.values(worn(s)), ...(s.fogGear ?? NO_GEAR).vault].filter((x): x is Item => !!x);

function itemProps(it: Item | undefined, prefix: string): Props {
  if (!it || it.starter) return { [`${prefix}_rarity`]: 'starter', [`${prefix}_level`]: 0, [`${prefix}_plus`]: 0 };
  return { [`${prefix}_rarity`]: it.rarity, [`${prefix}_level`]: it.level, [`${prefix}_plus`]: it.plus ?? 0 };
}

/** What the hero wears and has put points into: the build a run is fought with. */
export function buildProps(state: GameState): Props {
  const w = wornFor(state);
  const build = state.build ?? {};
  const stats: StatId[] = ['health', 'armor', 'damage', 'speed', 'move', 'crit'];
  return {
    ...itemProps(w.weapon, 'weapon'),
    ...itemProps(w.armor, 'armor'),
    ...itemProps(w.charm, 'charm'),
    ...Object.fromEntries(stats.map((s) => [`pts_${s}`, build[s] ?? 0])),
  };
}

function workoutProps(s: Session, prev: Session | undefined): Props {
  const sets = s.entries.reduce((a, e) => a + e.sets.length, 0);
  return {
    kind: s.kind,
    day: s.day,
    mode: s.mode ?? null,
    planned_by: s.plannedBy ?? 'built-in',
    xp: s.xp,
    exercises: s.entries.length,
    sets,
    skipped: s.skipped?.length ?? 0,
    changed: s.changed?.length ?? 0,
    raised: s.raised?.length ?? 0,
    better: !!s.better,
    gap_days: prev ? days(new Date(prev.date), new Date(s.date)) : null,
  };
}

/** The events a change to the save stands for, read off the save before and after it. */
export function eventsBetween(a: GameState, b: GameState): AnalyticsEvent[] {
  if (a === b) return [];
  const out: AnalyticsEvent[] = [];
  const add = (name: string, props: Props = {}) => out.push({ name, props });

  if (!a.profile.onboarded && b.profile.onboarded) add('onboarded', { kit: b.profile.kit ?? 'gym', look: b.profile.look?.sex ?? null });
  if (b.profile.classId && a.profile.classId !== b.profile.classId)
    add('class_picked', { class: b.profile.classId, from: a.profile.classId ?? null });

  // Workouts: only new ones at the end (a restore or a dev jump replaces the list, and counts once).
  if (b.sessions.length === a.sessions.length + 1 && b.sessions.at(-2)?.id === a.sessions.at(-1)?.id) {
    const s = b.sessions.at(-1)!;
    add('workout_done', { n: b.sessions.length, ...workoutProps(s, a.sessions.at(-1)) });
  } else if (b.sessions.length !== a.sessions.length) {
    add('save_jumped', { from: a.sessions.length, to: b.sessions.length });
  }
  const lastA = a.sessions.at(-1), lastB = b.sessions.at(-1);
  if (lastB?.felt && lastA?.id === lastB.id && !lastA.felt) add('workout_felt', { felt: lastB.felt, planned_by: lastB.plannedBy ?? 'built-in' });

  const seen = new Set(a.seenScenes);
  for (const id of b.seenScenes) if (!seen.has(id)) add('scene_seen', { scene: id });
  const sa = storyState(a), sb = storyState(b);
  if (sb.index > sa.index) add(sb.finished ? 'story_finished' : 'chapter_started', { chapter: sb.finished ? null : sb.index + 1 });

  const fa = a.fog ?? NO_FOG, fb = b.fog ?? NO_FOG;
  if (fb.cleared > fa.cleared) add('zone_cleared', { zone: fb.cleared, runs: fb.runs });

  const spA = new Set(spOwned(a));
  for (const n of spOwned(b)) if (!spA.has(n)) add('sp_given', { sp: n });
  if (spChosen(b) && spChosen(a) !== spChosen(b) && spA.size > 0) add('sp_worn', { sp: spChosen(b) });

  const ba = a.build ?? {}, bb = b.build ?? {};
  for (const stat of new Set([...Object.keys(ba), ...Object.keys(bb)]) as Set<StatId>) {
    const d = (bb[stat] ?? 0) - (ba[stat] ?? 0);
    if (d) add('stat_points', { stat, change: d, now: bb[stat] ?? 0 });
  }

  const wa = worn(a), wb = worn(b);
  for (const slot of ['weapon', 'armor', 'charm'] as ItemSlot[]) {
    const it = wb[slot];
    if (it && !it.starter && it.id !== wa[slot]?.id) add('item_worn', { slot, rarity: it.rarity, level: it.level, plus: it.plus ?? 0 });
  }
  const before = new Map(allItems(a).map((it) => [it.id, it]));
  for (const it of allItems(b)) {
    const was = before.get(it.id);
    if (was && (it.plus ?? 0) > (was.plus ?? 0)) add('item_forged', { slot: it.slot, rarity: it.rarity, level: it.level, plus: it.plus ?? 0 });
    else if (was && (it.tries ?? 0) > (was.tries ?? 0)) add('forge_missed', { slot: it.slot, rarity: it.rarity, plus: it.plus ?? 0 });
    if (was && (it.rerolls ?? 0) > (was.rerolls ?? 0)) add('item_rerolled', { slot: it.slot, rarity: it.rarity });
  }

  if (!a.coach?.profile && b.coach?.profile) add('coach_setup');
  const chatA = new Set(a.coach?.chat ?? []);
  const said = (b.coach?.chat ?? []).filter((m) => m.role === 'user' && !chatA.has(m)).length;
  if (said) add('coach_message', { count: said });
  // A new week planned (not a day ticked off in the same week).
  const weekA = a.coach?.week, wk = b.coach?.week;
  if (wk && (wk.start !== weekA?.start || wk.by !== weekA?.by || wk.days.length !== weekA?.days.length)) add('coach_week', { by: wk.by, days: wk.days.length });

  const daysA = new Map((a.days ?? []).map((d) => [d.day, d]));
  for (const d of b.days ?? []) {
    const was = daysA.get(d.day);
    if (d.kept && !was?.kept) add('quote_kept');
    if (d.fire && !was?.fire) add('sat_by_fire');
  }
  return out;
}

/** The app opened: the event retention is measured on. */
export function openEvent(state: GameState, now: Date): AnalyticsEvent {
  const today = now.toISOString().slice(0, 10);
  const earlier = (state.days ?? []).filter((d) => d.day < today);
  const last = earlier.at(-1)?.day;
  return {
    name: 'app_opened',
    props: {
      onboarded: state.profile.onboarded,
      days_since_open: last ? days(new Date(last), new Date(today)) : null,
      mid_workout: !!state.draft,
    },
  };
}

/** How a run is played: with friends, by the bot (developer mode), from a jump ahead (developer mode). */
export interface RunHow extends Props {
  party: boolean;
  bot: boolean;
  start_at: string | null;
}

/** A run starts: what it is fought with. */
export function runStartEvent(state: GameState, zone: number, how: RunHow): AnalyticsEvent {
  return { name: 'fog_run_start', props: { zone: zone + 1, ...how, ...buildProps(state) } };
}

/** A run ends: how far it got and how it ended. Read with the save from before the run. */
export function runEndEvent(state: GameState, r: RunResult, how: RunHow): AnalyticsEvent {
  const party = how.party;
  const fog = state.fog ?? NO_FOG;
  return {
    name: 'fog_run_end',
    props: {
      zone: r.zone + 1,
      ...how,
      won: r.won,
      why: r.why ?? (r.won ? 'won' : 'fell'),
      floor: r.floor ?? null,
      room: r.room ?? null,
      kills: r.kills,
      run_level: r.level,
      seconds: Math.round(r.seconds),
      first_clear: r.won && r.zone === fog.cleared && !party,
      bag: r.gear?.bag.length ?? 0,
      ...buildProps(state),
    },
  };
}
