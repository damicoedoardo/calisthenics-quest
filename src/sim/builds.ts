import { BUILD_PROFILES } from '@/balance';
import type { GameState } from '@/lib/game';
import { pointsEarned, STATS, type Build, type StatId } from '@/lib/stats';

/* Ways a player spends their stat points, for the Fog simulator (`BUILDS=even,glass pnpm fog:sim`):
   every point the save has earned, spread by the profile's shares. Pure. */

export type BuildProfile = keyof typeof BUILD_PROFILES;
export const BUILD_IDS = Object.keys(BUILD_PROFILES) as BuildProfile[];

/** The save's points spent the profile's way (largest share first gets what rounding leaves). */
export function buildFor(state: GameState, profile: BuildProfile): Build {
  const total = pointsEarned(state).total,
    shares: Partial<Record<StatId, number>> = BUILD_PROFILES[profile],
    sum = STATS.reduce((n, s) => n + (shares[s.id] ?? 0), 0),
    build: Build = {};
  let left = total;
  for (const s of STATS) {
    const n = Math.floor((total * (shares[s.id] ?? 0)) / sum);
    if (n > 0) build[s.id] = n;
    left -= n;
  }
  const top = STATS.reduce((a, s) => ((shares[s.id] ?? 0) > (shares[a.id] ?? 0) ? s : a)).id;
  if (left > 0) build[top] = (build[top] ?? 0) + left;
  return build;
}
