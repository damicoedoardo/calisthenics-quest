import { describe, expect, it } from 'vitest';
import { seeded } from './random';
import { initialState, type GameState, type Session } from './game';
import { EMBERS, embersOf, REROLL_COST, reroll, salvage, upgrade, upgradeCost } from './forge';
import { salvageValue, setGuard } from './fog-gear';
import { boostOf, itemScore, MAX_PLUS, nameOf, rollItem, starterKit, type Item } from '@/game/dungeon/items';

const rnd = seeded(5);
const sword = (): Item => {
  for (;;) {
    const it = rollItem(rnd, { zone: 2, workouts: 10, floor: 4, cls: 'warrior' }, 'rare');
    if (it.slot === 'weapon') return it;
  }
};
const workouts = (n: number): Session[] =>
  Array.from({ length: n }, (_, i) => ({ id: String(i), date: new Date(2026, 9, 1 + i).toISOString(), kind: 'full', day: 'A', xp: 100, breakdown: [], entries: [] }));
const withSword = (n: number, it: Item): GameState => ({ ...initialState(), sessions: workouts(n), fogGear: { worn: { weapon: it }, vault: [] } });

describe("Mira's forge", () => {
  it('each workout earns embers', () => {
    expect(embersOf(initialState())).toBe(0);
    expect(embersOf({ ...initialState(), sessions: [...workouts(2), { ...workouts(1)[0], kind: 'mini' }] })).toBe(2 * EMBERS.full + EMBERS.mini);
  });

  it('upgrades an item up to +5, each step costing more and making it stronger', () => {
    const it = sword();
    let s = withSword(30, it);
    for (let i = 0; i < MAX_PLUS; i++) s = upgrade(s, it.id);
    const up = s.fogGear!.worn.weapon!;
    expect(up.plus).toBe(MAX_PLUS);
    expect(nameOf(up)).toBe(`${it.name} +5`);
    expect(boostOf(up)).toBeCloseTo(1.5);
    expect(itemScore(up)).toBeGreaterThan(itemScore(it));
    expect(embersOf(s)).toBe(300 - (10 + 20 + 30 + 40 + 50));
    expect(upgrade(s, it.id)).toBe(s);
  });

  it("won't upgrade without the embers, or the starter kit", () => {
    const it = sword(),
      s = withSword(0, it);
    expect(upgradeCost(it)).toBe(10);
    expect(upgrade(s, it.id)).toBe(s);
    const kit = starterKit('warrior').weapon,
      k: GameState = { ...initialState(), sessions: workouts(5), fogGear: { worn: { [kit.slot]: kit }, vault: [] } };
    expect(upgrade(k, kit.id)).toBe(k);
  });

  it('rerolls a bonus into another one, the same way every time', () => {
    const it = sword(),
      s = withSword(5, it);
    const a = reroll(s, it.id, 0),
      b = reroll(s, it.id, 0);
    expect(a).toEqual(b);
    const next = a.fogGear!.worn.weapon!;
    expect(next.bonuses[0].id).not.toBe(it.bonuses[0].id);
    expect(next.rerolls).toBe(1);
    expect(embersOf(a)).toBe(50 - REROLL_COST);
  });

  it('melts an item down into embers, and the flame lets go of it', () => {
    const it = sword();
    const s = setGuard(withSword(0, it), 'weapon');
    const out = salvage(s, it.id);
    expect(out.fogGear!.worn).toEqual({});
    expect(out.fogGear!.guard).toBeUndefined();
    expect(embersOf(out)).toBe(salvageValue(it));
    expect(salvageValue({ ...it, plus: 2 })).toBe(salvageValue(it) * 2);
  });
});
