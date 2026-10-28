import { describe, expect, it } from 'vitest';
import { seeded } from './random';
import { initialState, type GameState } from './game';
import { atRisk, discardItem, settleGear, takeOffToVault, vaultSize, wearFromVault, wornFor } from './fog-gear';
import { rollItem, type Item } from '@/game/dungeon/items';

const rnd = seeded(21);
const item = (slot: Item['slot']): Item => {
  for (;;) {
    const it = rollItem(rnd, { zone: 1, workouts: 10, floor: 4, cls: 'warrior' }, 'magic');
    if (it.slot === slot) return it;
  }
};
const strong = (s: GameState): GameState => ({ ...s, build: { damage: 99, health: 99, armor: 99 } });

describe('Fog gear between runs', () => {
  it('the vault starts at 4 and grows one every 5 workouts, up to 20', () => {
    expect(vaultSize(0)).toBe(4);
    expect(vaultSize(9)).toBe(5);
    expect(vaultSize(500)).toBe(20);
  });

  it('a win or a walk out keeps what you wore, and the bag goes into the vault', () => {
    const sword = item('weapon'),
      found = [item('armor'), item('charm')];
    for (const why of ['boss', 'left']) {
      const { state, out } = settleGear(strong(initialState()), { won: why === 'boss', why, gear: { worn: { weapon: sword }, bag: found } });
      expect(out.kept).toBe(true);
      expect(state.fogGear?.worn.weapon).toBe(sword);
      expect(state.fogGear?.vault).toHaveLength(2);
    }
  });

  it("after a class change, the old class's weapon waits at home, safe, and can't be worn", () => {
    const sword = item('weapon'),
      base = strong(initialState());
    const archer: GameState = { ...base, profile: { ...base.profile, classId: 'archer' }, fogGear: { worn: { weapon: sword }, vault: [] } };
    expect(wornFor(archer).weapon).toBeUndefined();
    // A fall in the run doesn't take it: it never went in.
    const { state } = settleGear(archer, { won: false, why: 'hp', gear: { worn: {}, bag: [] } });
    expect(state.fogGear?.worn.weapon).toBe(sword);
    const inVault: GameState = { ...archer, fogGear: { worn: {}, vault: [sword] } };
    expect(wearFromVault(inVault, sword.id)).toBe(inVault);
    const warrior: GameState = { ...inVault, profile: { ...inVault.profile, classId: 'warrior' } };
    expect(wearFromVault(warrior, sword.id).fogGear?.worn.weapon).toBe(sword);
  });

  it("a full vault leaves the rest behind, keeping the best", () => {
    const bag = Array.from({ length: 6 }, () => item('charm'));
    const { state, out } = settleGear(initialState(), { won: true, why: 'boss', gear: { worn: {}, bag } });
    expect(state.fogGear?.vault).toHaveLength(4);
    expect(out.left).toHaveLength(2);
  });

  it('dying loses what you wore and carried, but the vault is safe', () => {
    const kept = item('charm');
    const before: GameState = { ...strong(initialState()), fogGear: { worn: {}, vault: [kept] } };
    const sword = item('weapon');
    const { state, out } = settleGear(before, { won: false, why: 'hp', gear: { worn: { weapon: sword }, bag: [item('armor')] } });
    expect(out.lost).toHaveLength(2);
    expect(state.fogGear?.worn).toEqual({});
    expect(state.fogGear?.vault).toEqual([kept]);
  });

  it('the flame holds one worn item through a fall, if you trained in the last 2 days', () => {
    const sword = item('weapon'),
      plate = item('armor'),
      now = new Date(2026, 9, 27, 12),
      trained = (daysAgo: number): GameState => ({
        ...strong(initialState()),
        sessions: [{ id: 'a', date: new Date(now.getTime() - daysAgo * 864e5).toISOString(), kind: 'full', day: 'A', xp: 100, breakdown: [], entries: [] }],
        fogGear: { worn: { weapon: sword, armor: plate }, vault: [], guard: 'weapon' },
      });
    const fall = { won: false, why: 'hp', gear: { worn: { weapon: sword, armor: plate }, bag: [] } };
    const fresh = settleGear(trained(1), fall, now);
    expect(fresh.out.held).toBe(sword);
    expect(fresh.out.lost).toEqual([plate]);
    expect(fresh.state.fogGear?.worn).toEqual({ weapon: sword });
    expect(fresh.state.fogGear?.deaths).toBe(1);
    const stale = settleGear(trained(4), fall, now);
    expect(stale.out.held).toBeUndefined();
    expect(stale.state.fogGear?.worn).toEqual({});
  });

  it('mid-run, shows what a fall would cost: the flame holds the guarded item, the starter kit is safe', () => {
    const sword = item('weapon'),
      plate = item('armor'),
      found = item('charm'),
      kit: Item = { ...item('armor'), starter: true },
      now = new Date(2026, 9, 27, 12),
      trained = (daysAgo: number): GameState => ({
        ...strong(initialState()),
        sessions: [{ id: 'a', date: new Date(now.getTime() - daysAgo * 864e5).toISOString(), kind: 'full', day: 'A', xp: 100, breakdown: [], entries: [] }],
        fogGear: { worn: { weapon: sword }, vault: [], guard: 'weapon' },
      });
    const fresh = atRisk(trained(1), { worn: { weapon: sword, armor: plate }, bag: [found] }, now);
    expect(fresh.held).toBe(sword);
    expect(fresh.cold).toBeUndefined();
    expect(fresh.lost).toEqual([plate, found]);
    // The same fall, settled, loses the same things.
    expect(settleGear(trained(1), { won: false, why: 'hp', gear: { worn: { weapon: sword, armor: plate }, bag: [found] } }, now).out.lost).toEqual(fresh.lost);
    const stale = atRisk(trained(4), { worn: { weapon: sword, armor: kit }, bag: [] }, now);
    expect(stale.held).toBeUndefined();
    expect(stale.cold).toBe(sword);
    expect(stale.lost).toEqual([sword]);
    expect(atRisk(initialState(), { worn: { armor: kit }, bag: [] }, now)).toEqual({ held: undefined, cold: undefined, lost: [], slip: [] });
  });

  it('what the full vault leaves behind, Mira melts into embers', () => {
    const bag = Array.from({ length: 6 }, () => item('charm'));
    const { state, out } = settleGear(initialState(), { won: true, why: 'boss', gear: { worn: {}, bag } });
    expect(out.embers).toBe(2 * 6);
    expect(state.fogGear?.embers?.found).toBe(12);
  });

  it("what your points can't wear yet stays home, safe from the Fog", () => {
    const sword = item('weapon');
    const s: GameState = { ...initialState(), fogGear: { worn: { weapon: sword }, vault: [] } };
    expect(wornFor(s)).toEqual({});
    const { state } = settleGear(s, { won: false, why: 'hp', gear: { worn: {}, bag: [] } });
    expect(state.fogGear?.worn.weapon).toBe(sword);
  });

  it('wears from the vault, takes off into it, and throws away', () => {
    const sword = item('weapon');
    let s: GameState = { ...strong(initialState()), fogGear: { worn: {}, vault: [sword] } };
    expect(wearFromVault({ ...s, build: {} }, sword.id)).toEqual({ ...s, build: {} });
    s = wearFromVault(s, sword.id);
    expect(s.fogGear).toEqual({ worn: { weapon: sword }, vault: [] });
    s = takeOffToVault(s, 'weapon');
    expect(s.fogGear).toEqual({ worn: {}, vault: [sword] });
    s = discardItem(s, sword.id);
    expect(s.fogGear).toEqual({ worn: {}, vault: [] });
  });
});
