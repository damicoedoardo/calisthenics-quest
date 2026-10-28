import { describe, expect, it } from 'vitest';
import { initialState } from './game';
import { pendingScenes } from '@/story/engine';
import { storyState } from '@/story/engine';
import { CHAPTERS } from '@/story/chapters';
import { embersOf, matsOf } from './forge';
import { coins } from './sweat';
import { pointsFree } from './stats';
import { spOwned, spWorn } from './sp';
import {
  addFakeWorkouts,
  clearNextZone,
  emptyWallet,
  giveAllSp,
  giveCoins,
  giveEmbers,
  giveMaterials,
  giveSpAwake,
  giveStatPoints,
  isDeveloper,
  jumpToChapter,
  makeItem,
  resetFog,
  setBossesBeaten,
  setWornPlus,
  skipIntro,
  takeSp,
  toVault,
  wearNew,
} from './dev';

const now = new Date(2026, 9, 26, 18);

describe('developer mode', () => {
  it('skips the opening straight to a ready hero', () => {
    const s = skipIntro(initialState(), now);
    expect(s.profile.onboarded).toBe(true);
    expect(s.profile.voice).toBe('You always quit.');
    expect(s.sessions).toHaveLength(0);
    expect(pendingScenes(s, now)).toEqual([]);
  });

  it('adds fake workouts after the real ones, ending today, and can skip their story scenes', () => {
    let s = addFakeWorkouts(skipIntro(initialState(), now), 5, now, true);
    expect(s.sessions).toHaveLength(5);
    expect(s.sessions[4].date).toBe(now.toISOString());
    expect(new Date(s.sessions[0].date).getTime()).toBe(now.getTime() - 8 * 86_400_000);
    expect(pendingScenes(s, now)).toEqual([]);
    expect(s.seenScenes).toContain('class-choice');

    const later = new Date(now.getTime() + 3_600_000);
    s = addFakeWorkouts(s, 2, later, false);
    expect(s.sessions).toHaveLength(7);
    // Squeezed between the last workout and now, still in order.
    const times = s.sessions.map((x) => new Date(x.date).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(times[6]).toBe(later.getTime());
  });

  it('beats Fog bosses and resets them', () => {
    let s = initialState();
    for (let i = 0; i < 7; i++) s = clearNextZone(s);
    expect(s.fog?.cleared).toBe(6);
    expect(resetFog(s).fog).toEqual({ cleared: 0, runs: 0, best: {} });
  });

  it('jumps to a story chapter, forward and back', () => {
    let s = jumpToChapter(skipIntro(initialState(), now), 3, now, true);
    expect(storyState(s).index).toBe(2);
    expect(pendingScenes(s, now)).toEqual([]);
    s = jumpToChapter(s, 2, now, true);
    expect(storyState(s).index).toBe(1);
    expect(storyState(jumpToChapter(s, CHAPTERS.length + 1, now, true)).finished).toBe(true);
  });

  it('sets how many Fog bosses are beaten', () => {
    expect(setBossesBeaten(initialState(), 4).fog?.cleared).toBe(4);
    expect(setBossesBeaten(initialState(), 9).fog?.cleared).toBe(6);
  });

  it('fills and empties the wallet', () => {
    let s = addFakeWorkouts(skipIntro(initialState(), now), 3, now, true);
    s = giveMaterials(giveCoins(giveEmbers(s, 500), 7), { heart: 2 });
    expect(embersOf(s)).toBeGreaterThanOrEqual(500);
    expect(coins(s)).toBe(10);
    expect(matsOf(s).heart).toBe(2);
    s = emptyWallet(giveStatPoints(s, 5));
    expect([embersOf(s), coins(s), matsOf(s).heart ?? 0, s.devPoints ?? 0]).toEqual([0, 0, 0, 0]);
  });

  it('gives stat points on top of the earned ones', () => {
    const s = skipIntro(initialState(), now);
    expect(pointsFree(giveStatPoints(s, 10)) - pointsFree(s)).toBe(10);
  });

  it('makes items to order, worn or in the vault', () => {
    const s = { ...skipIntro(initialState(), now), profile: { ...skipIntro(initialState(), now).profile, classId: 'mage' as const } };
    const it = makeItem(s, { slot: 'armor', rarity: 'legendary', plus: 12, zone: 3 }, 5);
    expect([it.slot, it.rarity, it.plus, it.cls, it.need]).toEqual(['armor', 'legendary', 12, 'mage', null]);
    const worn = wearNew(s, it);
    expect(worn.fogGear?.worn.armor?.id).toBe(it.id);
    const other = makeItem(s, { slot: 'armor', rarity: 'common', plus: 0, zone: 0 }, 6);
    const swapped = wearNew(worn, other);
    expect(swapped.fogGear?.vault.map((x) => x.id)).toEqual([it.id]);
    expect(setWornPlus(swapped, 15).fogGear?.worn.armor?.plus).toBe(15);
    expect(toVault(s, it).fogGear?.vault).toHaveLength(1);
  });

  it('gives SPs awake, all four, or none', () => {
    const s = addFakeWorkouts(skipIntro(initialState(), now), 1, now, true);
    expect(spOwned(giveSpAwake(s, 1))).toEqual([1]);
    expect(spWorn(giveSpAwake(s, 3))).toBe(3);
    const all = giveAllSp(s, 2);
    expect(spOwned(all)).toEqual([1, 2, 3, 4]);
    expect(spWorn(all)).toBe(2);
    expect(takeSp(all).sp).toBeUndefined();
  });

  it('knows the developer only by an email fingerprint', async () => {
    expect(await isDeveloper('someone@example.com')).toBe(false);
    expect(await isDeveloper(null)).toBe(false);
    expect(await isDeveloper('')).toBe(false);
  });
});
