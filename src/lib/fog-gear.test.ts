import { describe, expect, it } from 'vitest';
import { seeded } from './random';
import { initialState, migrate, type GameState } from './game';
import { atRisk, discardItem, settleGear, takeOffToVault, vaultSize, wearFromVault, wornFor } from './fog-gear';
import { rollItem, type Item } from '@/game/dungeon/items';

const rnd = seeded(21);
const item = (slot: Item['slot']): Item => {
  for (;;) {
    const it = rollItem(rnd, { zone: 1, workouts: 10, floor: 4, cls: 'warrior' }, 'magic');
    // No level asked here: the level gate has its own test below.
    if (it.slot === slot) return { ...it, needLevel: undefined };
  }
};
const strong = (s: GameState): GameState => ({ ...s, build: { damage: 99, health: 99, armor: 99 } });

/** A vault with room for 4 more. */
const nearlyFull = (): GameState => ({ ...initialState(), fogGear: { worn: {}, vault: Array.from({ length: vaultSize() - 4 }, (_, i) => ({ ...item('charm'), id: `old${i}` })) } });

describe('Fog gear between runs', () => {
  it('the vault holds 200 items', () => {
    expect(vaultSize()).toBe(200);
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
    const { state, out } = settleGear(nearlyFull(), { won: true, why: 'boss', gear: { worn: {}, bag } });
    expect(state.fogGear?.vault).toHaveLength(vaultSize());
    expect(out.left).toHaveLength(2);
  });

  it('a fall keeps what you wear and the vault, and loses what you found in the bag', () => {
    const safe = item('charm'),
      sword = item('weapon'),
      found = item('armor');
    const before: GameState = { ...strong(initialState()), fogGear: { worn: {}, vault: [safe] } };
    const { state, out } = settleGear(before, { won: false, why: 'hp', gear: { worn: { weapon: sword }, bag: [found] } });
    expect(out.kept).toBe(false);
    expect(out.lost).toEqual([found]);
    expect(state.fogGear?.worn).toEqual({ weapon: sword });
    expect(state.fogGear?.vault).toEqual([safe]);
    expect(state.fogGear?.deaths).toBe(1);
  });

  it('a fall keeps an item found in the run and worn when you fell', () => {
    const found = item('armor');
    const { state, out } = settleGear(strong(initialState()), { won: false, why: 'hp', gear: { worn: { armor: found }, bag: [] } });
    expect(out.lost).toEqual([]);
    expect(state.fogGear?.worn.armor).toBe(found);
    expect(state.fogGear?.deaths ?? 0).toBe(0);
  });

  it('what you brought from home comes back from a fall, even taken off into the bag', () => {
    const sword = { ...item('weapon'), plus: 9 },
      better = item('weapon');
    const before: GameState = { ...strong(initialState()), fogGear: { worn: { weapon: sword }, vault: [] } };
    // Mid-run you wore a sword you found, so yours went into the bag.
    const run = { worn: { weapon: better }, bag: [sword] };
    expect(atRisk(before, run.bag)).toEqual([]);
    const { state, out } = settleGear(before, { won: false, why: 'hp', gear: run });
    expect(out.lost).toEqual([]);
    expect(state.fogGear?.worn.weapon).toBe(better);
    expect(state.fogGear?.vault).toEqual([sword]);
  });

  it('an old save drops the slot the flame used to keep', () => {
    const sword = item('weapon');
    const old = { ...initialState(), fogGear: { worn: { weapon: sword }, vault: [], guard: 'weapon', kit: initialState().fogGear?.kit } };
    expect(migrate(JSON.parse(JSON.stringify(old))).fogGear).not.toHaveProperty('guard');
  });

  it('mid-run, shows what a fall would cost: what you found in the bag, never what you wear', () => {
    const sword = item('weapon'),
      found = item('charm'),
      kit: Item = { ...item('armor'), starter: true },
      s: GameState = { ...strong(initialState()), fogGear: { worn: { weapon: sword }, vault: [] } };
    expect(atRisk(s, [found, kit])).toEqual([found]);
    // The same fall, settled, loses the same things.
    expect(settleGear(s, { won: false, why: 'hp', gear: { worn: { weapon: sword }, bag: [found] } }).out.lost).toEqual([found]);
    expect(atRisk(initialState(), [])).toEqual([]);
  });

  it('what the full vault leaves behind, Mira melts into embers', () => {
    const bag = Array.from({ length: 6 }, () => item('charm'));
    const { state, out } = settleGear(nearlyFull(), { won: true, why: 'boss', gear: { worn: {}, bag } });
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

  it('an item that asks for a higher hero level waits in the vault until training gets you there', () => {
    const sword = { ...item('weapon'), needLevel: 3 };
    const at = (xp: number): GameState => ({ ...strong(initialState()), sessions: [{ id: 'a', date: new Date().toISOString(), kind: 'full', day: 'A', xp, breakdown: [], entries: [] }], fogGear: { worn: { weapon: sword }, vault: [sword] } });
    // Level 2 (500 XP): not yet, so it isn't worn into a run either.
    expect(wearFromVault({ ...at(500), fogGear: { worn: {}, vault: [sword] } }, sword.id).fogGear?.worn).toEqual({});
    expect(wornFor(at(500))).toEqual({});
    // Level 3 (1000 XP): it fits.
    expect(wornFor(at(1000))).toEqual({ weapon: sword });
  });
});
