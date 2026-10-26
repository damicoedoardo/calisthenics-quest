import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { powerOf, ZONES } from '@/lib/fog';
import { initialState, type GameState } from '@/lib/game';
import type { ClassId } from '@/lib/gear';
import { simulateRun, type SimEnd } from './sim';

/* The fast Fog simulator. `pnpm fog:sim` plays many runs per snapshot of a simulated player
   (sim-out/states, written by `pnpm sim`) and prints win rates; see scripts/fog-sim.md. */

const DAY = 86_400_000;

/** The save moved to today, last workout yesterday, as scripts/fog-balance.cjs does. */
function shift(state: GameState, now: number): GameState {
  const last = state.sessions.length ? new Date(state.sessions[state.sessions.length - 1].date).getTime() : now - DAY;
  const delta = now - DAY - last;
  const move = (d: string) => new Date(new Date(d).getTime() + delta).toISOString();
  return { ...state, sessions: state.sessions.map((s) => ({ ...s, date: move(s.date) })), tests: state.tests.map((t) => ({ ...t, date: move(t.date) })), days: [], draft: null };
}

export function playSnapshot(state: GameState, zone: number, classId: ClassId | undefined, runs: number, seed = 1): SimEnd[] {
  const now = Date.now();
  const power = powerOf(shift(state, now), new Date(now));
  return Array.from({ length: runs }, (_, i) => simulateRun({ zone: ZONES[zone], power, classId, seed: seed + i * 7919 }));
}

describe('fog simulator', () => {
  it('plays a run to the end, the same way for the same seed', () => {
    const a = playSnapshot(initialState(), 0, undefined, 1, 5)[0];
    const b = playSnapshot(initialState(), 0, undefined, 1, 5)[0];
    expect(a).toEqual(b);
    expect(a.seconds).toBeGreaterThan(30);
  });
});

const snapDir = 'sim-out/states';
if (process.env.FOG_SIM && existsSync(snapDir)) {
  const player = process.env.PLAYER ?? 'steady';
  const runs = Number(process.env.RUNS ?? 100);
  const only = (process.env.ONLY ?? '').split(',').filter(Boolean);
  const classes = (process.env.CLASSES ?? 'saved').split(',') as (ClassId | 'saved')[];
  describe('fog balance', () => {
    it('prints win rates', () => {
      const t0 = performance.now();
      const lines: string[] = [];
      for (const f of readdirSync(snapDir).filter((f) => f.startsWith(`${player}-zone`)).sort()) {
        const label = f.slice(player.length + 1, -5);
        if (only.length && !only.includes(label)) continue;
        const saved = JSON.parse(readFileSync(`${snapDir}/${f}`, 'utf8')) as GameState;
        const zone = Number(label.match(/zone(\d)/)![1]);
        for (const c of classes) {
          const cls = c === 'saved' ? saved.profile.classId : c;
          const res = playSnapshot(saved, zone, cls, runs);
          const won = res.filter((r) => r.won);
          const reached = res.filter((r) => r.bossAt !== null).length;
          const fight = won.length ? Math.round(won.reduce((n, r) => n + r.seconds - r.bossAt!, 0) / won.length) : 0;
          const why = ['hp', 'limit'].map((w) => `${w} ${res.filter((r) => r.why === w).length}`).join(', ');
          lines.push(`${label.padEnd(12)} ${(cls ?? '-').padEnd(8)} won ${String(won.length).padStart(3)}/${runs}  boss reached ${String(reached).padStart(3)}  fight ${fight}s  lost by ${why}`);
        }
      }
      console.log(`${lines.join('\n')}\n${((performance.now() - t0) / 1000).toFixed(1)} s`);
    }, 600_000);
  });
}
