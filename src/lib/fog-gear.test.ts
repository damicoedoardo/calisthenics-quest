import { describe, expect, it } from 'vitest';
import { seeded } from './random';
import { initialState, type GameState } from './game';
import { discardItem, settleGear, takeOffToVault, vaultSize, wearFromVault, wornFor } from './fog-gear';
import { rollItem, type Item } from '@/game/dungeon/items';

const rnd = seeded(21);
const item = (slot: Item['slot']): Item => {
  for (;;) {
    const it = rollItem(rnd, { zone: 1, workouts: 10, floor: 4, cls: 'warrior' }, 'magic');
    if (it.slot === slot) return it;
  }
};
const strong = (s: GameState): GameState => ({ ...s, build: { damage: 99, health: 99 } });

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
