import { describe, expect, it } from 'vitest';
import { powerOf, ZONES } from '@/lib/fog';
import { initialState } from '@/lib/game';
import { simulateRun } from './sim';

/* The fast Fog simulator. For win rates over many runs: `pnpm fog:sim` (scripts/fog-sim.mjs). */

describe('fog simulator', () => {
  const power = powerOf(initialState(), new Date());

  it('plays a run to the end, the same way for the same seed', () => {
    const a = simulateRun({ zone: ZONES[0], power, classId: 'archer', seed: 5 });
    expect(simulateRun({ zone: ZONES[0], power, classId: 'archer', seed: 5 })).toEqual(a);
    expect(a.seconds).toBeGreaterThan(30);
  });

  it('a much stronger fog wins before the boss shows up', () => {
    const zone = { ...ZONES[0], hp: 20, dmg: 20 };
    const r = simulateRun({ zone, power, classId: 'warrior', seed: 1 });
    expect(r).toMatchObject({ won: false, bossAt: null, why: 'hp' });
  });
});
