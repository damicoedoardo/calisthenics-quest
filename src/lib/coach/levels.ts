import { LEVEL_SHIFT } from '@/balance';
import type { Family } from '@/exercises/coaching';
import type { Session } from '../game';
import { patternOf } from './options';
import { PATTERNS, type CoachProfile, type Level } from './types';

/* Your level per movement, kept honest by your own workouts: when most sets of a movement felt easy
   (4+ reps left) in most of its last few workouts, it goes up one; when they felt very hard (0-1
   left), down one. Only workouts since the level last moved count, so it moves at most once per
   window. */

export function shiftLevels(profile: CoachProfile, sessions: Session[], now: Date): CoachProfile {
  let next = profile;
  for (const pattern of PATTERNS) {
    const cur = next.levels[pattern];
    const since = sessions.filter((s) => s.date > cur.at);
    const felt = since
      .map((s) => s.entries.filter((e) => e.family && patternOf(e.family as Family) === pattern).flatMap((e) => e.sets))
      .filter((sets) => sets.length > 0)
      .slice(-LEVEL_SHIFT.window);
    if (felt.length < LEVEL_SHIFT.window) continue;
    const most = (rir: string) => felt.filter((sets) => sets.filter((x) => x.rir === rir).length * 2 > sets.length).length;
    const step = most('4+') >= LEVEL_SHIFT.need ? 1 : most('0-1') >= LEVEL_SHIFT.need ? -1 : 0;
    const level = Math.max(1, Math.min(5, cur.level + step)) as Level;
    if (level === cur.level) continue;
    const at = now.toISOString();
    next = {
      ...next,
      levels: { ...next.levels, [pattern]: { level, source: 'log', at } },
      history: [...next.history, { field: `levels.${pattern}`, from: cur.level, to: level, why: step > 0 ? 'felt easy lately' : 'felt very hard lately', at }],
    };
  }
  return next;
}
