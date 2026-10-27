import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHAPTERS } from '@/story/chapters';
import { ANYTIME } from '@/story/anytime';
import { formatSeason, playSeason } from './season';
import { PLAYERS } from './players';

/* Plays every kind of player through 200 days. `pnpm sim` also writes each timeline to sim-out/. */

const seasons = PLAYERS.map((p) => playSeason(p));
const out = process.env.SIM_OUT;
if (out) {
  mkdirSync(out, { recursive: true });
  mkdirSync(`${out}/states`, { recursive: true });
  for (const s of seasons) {
    writeFileSync(`${out}/${s.player.id}.md`, formatSeason(s));
    for (const snap of s.snapshots) writeFileSync(`${out}/states/${s.player.id}-${snap.label}.json`, JSON.stringify(snap.state));
  }
  // For scripts/fog-balance.cjs, which marks every scene as seen so runs start straight away.
  const ids = [...CHAPTERS.flatMap((c) => c.scenes), ...ANYTIME].map((sc) => sc.id);
  writeFileSync(`${out}/scene-ids.json`, JSON.stringify(ids));
  writeFileSync(
    `${out}/summary.md`,
    seasons.map((s) => `${s.player.id}: ${s.state.sessions.length} workouts, ${s.played.length} scenes, ${s.problems.length} problems`).join('\n'),
  );
}

describe('season simulator', () => {
  it.each(seasons.map((s) => [s.player.id, s] as const))('%s: nothing looks broken', (_, s) => {
    expect(s.problems).toEqual([]);
  });

  it('every scene plays for some kind of player', () => {
    const played = new Set(seasons.flatMap((s) => s.played.map((id) => id.replace(/-\d+$/, ''))));
    const never = [...CHAPTERS.flatMap((c) => c.scenes), ...ANYTIME].filter((sc) => !played.has(sc.id)).map((sc) => sc.id);
    expect(never).toEqual([]);
  });

  it('a finished story ends with the finale', () => {
    for (const s of seasons.filter((x) => x.played.includes('ch6-intro'))) expect(s.played, s.player.id).toContain('finale');
  });

  it('a story that waits for a max test moves on after a few workouts', () => {
    const never = seasons.find((s) => s.player.id === 'never-tests')!;
    expect(never.state.tests).toHaveLength(0);
    expect(never.played).toContain('ch3-intro');
  });
});
