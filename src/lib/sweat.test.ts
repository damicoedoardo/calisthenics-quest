import { describe, expect, it } from 'vitest';
import { initialState, migrate, type GameState, type Session } from './game';
import { starterKit, type Item } from '@/game/dungeon/items';
import { changeClass, classCost, coins, putPoint, respec, respecCost, takeBack } from './sweat';
import { SWEAT } from '@/balance';

const workouts = (n: number): Session[] =>
  Array.from({ length: n }, (_, i) => ({ id: String(i), date: new Date(2026, 9, 1 + i).toISOString(), kind: 'full', day: 'A', xp: 100, breakdown: [], entries: [] }));
const after = (s: GameState, n: number): GameState => ({ ...s, sessions: [...s.sessions, ...workouts(n)] });

describe('sweat coins', () => {
  it('every workout earns one', () => {
    expect(coins(initialState())).toBe(0);
    expect(coins(after(initialState(), 4))).toBe(4 * SWEAT.perWorkout);
  });

  it('a point spent since your last workout comes back free; older ones take a respec', () => {
    let s = after(initialState(), 2);
    s = putPoint(s, 'damage');
    s = takeBack(s, 'damage');
    expect(s.build?.damage).toBe(0);
    s = putPoint(s, 'damage');
    s = after(s, 1);
    // Spent before this workout: the minus does nothing, and starting over costs a coin.
    expect(takeBack(s, 'damage').build?.damage).toBe(1);
    expect(respecCost(s)).toBe(SWEAT.respec);
    const r = respec(s);
    expect(r.build).toEqual({});
    expect(coins(r)).toBe(coins(s) - SWEAT.respec);
  });

  it('the first class is free, so is the first change; after that it costs coins', () => {
    let s = after(initialState(), 2);
    s = changeClass(s, 'archer');
    expect(s.profile.classId).toBe('archer');
    expect(coins(s)).toBe(2);
    s = changeClass(s, 'mage');
    expect(s.profile.classId).toBe('mage');
    expect(coins(s)).toBe(2);
    expect(classCost(s)).toBe(SWEAT.classChange);
    // Two coins aren't enough.
    expect(changeClass(s, 'monk')).toBe(s);
    s = changeClass(after(s, 1), 'monk');
    expect(s.profile.classId).toBe('monk');
    expect(coins(s)).toBe(0);
  });

  it("a class change puts the old class's weapon in the vault, and keeps the armor on", () => {
    const sword: Item = { ...starterKit('warrior').weapon, id: 'sword', name: 'Sword', starter: undefined, rarity: 'rare' },
      armor: Item = { ...sword, id: 'mail', slot: 'armor', cls: null };
    let s: GameState = { ...after(initialState(), 3), profile: { ...initialState().profile, classId: 'warrior' }, fogGear: { worn: { weapon: sword, armor }, vault: [] } };
    s = changeClass(s, 'archer');
    expect(s.fogGear?.worn.weapon).toBeUndefined();
    expect(s.fogGear?.worn.armor?.id).toBe('mail');
    expect(s.fogGear?.vault.map((x) => x.id)).toEqual(['sword']);
    // A save that already wears another class's weapon gets it put away on load.
    const old = { ...s, version: 3, fogGear: { worn: { weapon: sword }, vault: [] } };
    expect(migrate(old).fogGear?.worn.weapon).toBeUndefined();
    expect(migrate(old).fogGear?.vault.map((x) => x.id)).toEqual(['sword']);
  });
});
