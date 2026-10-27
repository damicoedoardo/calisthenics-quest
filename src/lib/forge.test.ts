import { describe, expect, it } from 'vitest';
import { seeded } from './random';
import { initialState, type GameState, type Session } from './game';
import { canUpgrade, EMBERS, embersOf, giveMats, matsShort, takeGifts, REROLL_COST, reroll, salvage, tryUpgrade, upgrade, upgradeCost, upgradeOdds } from './forge';
import { salvageValue, setGuard, settleGear } from './fog-gear';
import { bandOf, boostOf, itemScore, MAX_PLUS, nameOf, rollItem, safeFloor, starterKit, type Item } from '@/game/dungeon/items';
import { FORGE_RISK, STEPS } from '@/balance';

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

  it('upgrades an item up to +5 with embers alone, each step costing more and making it stronger', () => {
    const it = sword();
    let s = withSword(30, it);
    for (let i = 0; i < 5; i++) s = upgrade(s, it.id);
    const up = s.fogGear!.worn.weapon!;
    expect(up.plus).toBe(5);
    expect(nameOf(up)).toBe(`${it.name} +5`);
    expect(boostOf(up)).toBeCloseTo(1.5);
    expect(itemScore(up)).toBeGreaterThan(itemScore(it));
    expect(embersOf(s)).toBe(300 - (10 + 20 + 30 + 40 + 50));
    // +6 asks for co-op materials too.
    expect(matsShort(s, up)).toEqual({ thread: 2 });
    expect(upgrade(s, it.id)).toBe(s);
  });

  const rich = (it: Item, plus: number): GameState => ({
    ...withSword(2000, { ...it, plus }),
    fogGear: { worn: { weapon: { ...it, plus } }, vault: [], mats: { thread: 999, shard: 99, coal: 99, heart: 9 } },
  });

  it('takes materials from +6, and holds every time up to +6', () => {
    const it = sword();
    const { state, forged } = tryUpgrade(rich(it, 5), it.id, new Date(2040, 0, 1));
    expect(forged).toBe('held');
    expect(state.fogGear!.worn.weapon!.plus).toBe(6);
    expect(state.fogGear!.mats!.thread).toBe(999 - 2);
    expect(embersOf(state)).toBe(embersOf(rich(it, 5)) - STEPS[5].embers);
  });

  it('can miss from +7, the same way every time, and never slips under a safe point', () => {
    const it = sword(),
      far = new Date(2040, 0, 1);
    let s = rich(it, 6);
    const seen = new Set<string>();
    for (let i = 0; i < 200 && canUpgrade(s, s.fogGear!.worn.weapon!); i++) {
      const before = s.fogGear!.worn.weapon!,
        again = tryUpgrade(s, it.id, far),
        r = tryUpgrade(s, it.id, far);
      expect(r).toEqual(again);
      const after = r.state.fogGear!.worn.weapon!;
      seen.add(r.forged!);
      expect(after.plus!).toBeGreaterThanOrEqual(safeFloor(before.plus!));
      if (r.forged === 'held') expect(after.plus).toBe(before.plus! + 1);
      if (r.forged === 'missed') expect(after.plus).toBe(before.plus);
      if (r.forged === 'slipped') expect(after.plus).toBe(before.plus! - 1);
      s = r.state;
    }
    expect(seen.has('missed') || seen.has('slipped')).toBe(true);
  });

  it('each miss and training lately make the next try likelier', () => {
    const it = { ...sword(), plus: 9 },
      s = rich(it, 9),
      far = new Date(2040, 0, 1);
    expect(upgradeOdds(s, it, far)).toBeCloseTo(STEPS[9].odds);
    expect(upgradeOdds(s, { ...it, misses: 2 }, far)).toBeCloseTo(STEPS[9].odds + 2 * FORGE_RISK.pity);
    const day = new Date(s.sessions.at(-1)!.date);
    expect(upgradeOdds(s, it, day)).toBeCloseTo(STEPS[9].odds + FORGE_RISK.rested);
  });

  it('a +10 or higher item comes home from a fall, slipped to the safe point below', () => {
    const it = sword(),
      s = rich(it, 12),
      out = settleGear(s, { won: false, why: 'hp', gear: { worn: { weapon: { ...it, plus: 12 } }, bag: [{ ...it, id: 'b', plus: 10 }] } }, new Date(2040, 0, 1));
    expect(out.out.lost).toEqual([]);
    expect(out.state.fogGear!.worn.weapon!.plus).toBe(10);
    expect(out.state.fogGear!.vault.map((x) => x.plus)).toEqual([6]);
  });

  it('keeps co-op materials found in a run, however it ends', () => {
    const it = sword(),
      s = withSword(0, it),
      out = settleGear(s, { won: false, why: 'hp', gear: { worn: { weapon: it }, bag: [] }, mats: { thread: 3, shard: 1 } });
    expect(out.state.fogGear!.mats).toEqual({ thread: 3, shard: 1 });
    expect(out.out.mats).toEqual({ thread: 3, shard: 1 });
  });

  it('goes up to +15 with a new look every few steps', () => {
    expect(MAX_PLUS).toBe(15);
    expect(STEPS).toHaveLength(MAX_PLUS);
    expect([0, 3, 4, 7, 10, 13, 15].map(bandOf)).toEqual([0, 0, 1, 2, 3, 4, 5]);
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

describe('gifts of forge materials', () => {
  it('giving takes them out of your save, a gift adds them to theirs', () => {
    const s: GameState = { ...initialState(), fogGear: { worn: {}, vault: [], mats: { shard: 3 } } };
    expect(giveMats(s, 'shard', 2).fogGear!.mats).toEqual({ shard: 1 });
    expect(giveMats(s, 'shard', 3).fogGear!.mats).toEqual({});
    expect(takeGifts(s, [{ mat: 'shard', n: 1 }, { mat: 'thread', n: 4 }, { mat: 'gold', n: 9 }]).fogGear!.mats).toEqual({ thread: 4, shard: 4 });
  });
});
