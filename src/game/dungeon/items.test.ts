import { describe, expect, it } from 'vitest';
import { powerOf, ZONES } from '@/lib/fog';
import { initialState } from '@/lib/game';
import { seeded } from '@/lib/random';
import { playRun } from './bot';
import { BAG, createRun, dropFromBag, rollItem, rollRarity, starterKit, stepRun, takeEvents, takeOff, takeStairs, wear, type Item, type Run } from './engine';
import { itemScore, shortOf } from './items';

const at = { zone: 2, workouts: 20, floor: 5, cls: 'warrior' as const };
const many = (n: number, rarity: Item['rarity'] = 'magic') => {
  const rnd = seeded(7);
  return Array.from({ length: n }, () => rollItem(rnd, at, rarity));
};

describe('items', () => {
  it('weapons and armor are made for your class; weapons ask for its stat, armor for Health, charms for nothing', () => {
    for (const it of many(60)) {
      if (it.slot === 'charm') {
        expect(it.cls).toBeNull();
        expect(it.need).toBeNull();
      } else {
        expect(it.cls).toBe('warrior');
        expect(it.need?.stat).toBe(it.slot === 'weapon' ? 'damage' : 'health');
      }
    }
  });

  it('rarer items carry more bonuses and ask for more', () => {
    const avg = (xs: Item[], f: (i: Item) => number) => xs.reduce((n, i) => n + f(i), 0) / xs.length;
    const common = many(80, 'common').filter((i) => i.slot !== 'charm'),
      legend = many(80, 'legendary').filter((i) => i.slot !== 'charm');
    expect(avg(common, (i) => i.bonuses.length)).toBe(0);
    expect(avg(legend, (i) => i.bonuses.length)).toBe(4);
    expect(avg(legend, (i) => i.need!.n)).toBeGreaterThan(avg(common, (i) => i.need!.n));
    expect(avg(legend, itemScore)).toBeGreaterThan(avg(common, itemScore));
  });

  it('bosses and deep floors drop rarer things', () => {
    const rnd = seeded(3),
      share = (floor: number, luck: number) => Array.from({ length: 4000 }, () => rollRarity(rnd, floor, luck)).filter((r) => r !== 'common').length / 4000;
    expect(share(9, 2)).toBeGreaterThan(share(0, 0) + 0.2);
  });

  it('a requirement says how many points short you are', () => {
    const sword = many(40).find((i) => i.slot === 'weapon')!;
    expect(shortOf(sword, {})).toBe(sword.need!.n);
    expect(shortOf(sword, { damage: sword.need!.n })).toBe(0);
    expect(shortOf(starterKit('warrior').weapon, {})).toBe(0);
  });
});

describe('items in a run', () => {
  const power = powerOf(initialState(), new Date());
  const fresh = (build = {}) => createRun({ zone: ZONES[2], power, classId: 'warrior', seed: 4, build });
  const give = (run: Run, it: Item) => run.hero.gear.bag.push(it);

  it('starts in the starter kit, or in what you wore in', () => {
    expect(fresh().hero.gear.worn.weapon?.starter).toBe(true);
    const sword = many(40).find((i) => i.slot === 'weapon')!;
    const run = createRun({ zone: ZONES[2], power, classId: 'warrior', seed: 4, worn: { weapon: sword }, build: { damage: 99 } });
    expect(run.hero.gear.worn.weapon).toBe(sword);
    expect(run.hero.gear.worn.armor?.starter).toBe(true);
  });

  it('wears what your points allow, and it makes you stronger', () => {
    const sword = many(40).find((i) => i.slot === 'weapon')!,
      armor = many(40).find((i) => i.slot === 'armor')!;
    const weak = fresh();
    give(weak, sword);
    wear(weak, sword.id);
    expect(weak.hero.gear.worn.weapon?.starter).toBe(true);
    const run = fresh({ damage: 99, health: 99 }),
      { damage } = run.hero.power,
      hp = run.hero.maxHp;
    give(run, sword);
    give(run, armor);
    wear(run, sword.id);
    wear(run, armor.id);
    expect(run.hero.power.damage).toBeGreaterThan(damage);
    expect(run.hero.maxHp).toBeGreaterThan(hp);
    // The starter kit just goes; taking off brings it back.
    expect(run.hero.gear.bag).toHaveLength(0);
    takeOff(run, 'weapon');
    expect(run.hero.gear.worn.weapon?.starter).toBe(true);
    expect(run.hero.gear.bag).toEqual([sword]);
    expect(run.hero.power.damage).toBeCloseTo(damage);
  });

  it('a dropped item lies on the floor until you walk over it again', () => {
    const run = fresh(),
      ring = many(40).find((i) => i.slot === 'charm')!;
    give(run, ring);
    dropFromBag(run, ring.id);
    expect(run.hero.gear.bag).toHaveLength(0);
    expect(run.loot.map((l) => l.item)).toEqual([ring]);
    const l = run.loot[0];
    run.hero.x = l.x;
    run.hero.y = l.y;
    stepRun(run, { x: 0, y: 0, ability: false });
    expect(run.hero.gear.bag).toEqual([ring]);
    expect(takeEvents(run).some((e) => e.type === 'loot')).toBe(true);
  });

  it('a full bag leaves what you walk over on the floor', () => {
    const run = fresh();
    for (const it of many(BAG)) give(run, it);
    const extra = many(BAG + 1).at(-1)!;
    run.loot.push({ id: 999, x: run.hero.x, y: run.hero.y, item: extra });
    stepRun(run, { x: 0, y: 0, ability: false });
    expect(run.hero.gear.bag).toHaveLength(BAG);
    expect(run.loot).toHaveLength(1);
  });

  it('on the stairs it asks: deeper, leave with what you carry, or not yet', () => {
    const still = { x: 0, y: 0, ability: false };
    const onStairs = () => {
      const run = fresh();
      run.stairs = { x: run.hero.x, y: run.hero.y };
      stepRun(run, still);
      return run;
    };
    const a = onStairs();
    expect(a.stairsAsk).toBe(true);
    const t = a.t;
    stepRun(a, still);
    expect(a.t).toBe(t);
    takeStairs(a, 'deeper');
    expect(a.floor).toBe(1);
    const b = onStairs();
    give(b, many(1)[0]);
    takeStairs(b, 'leave');
    expect(b.over?.why).toBe('left');
    expect(b.over?.won).toBe(false);
    expect(b.over?.gear.bag).toHaveLength(1);
    const c = onStairs();
    takeStairs(c, 'stay');
    expect(c.stairsAsk).toBe(false);
    expect(c.floor).toBe(0);
  });

  it('a run drops items, and the end says what you wore and carried (never the starter kit)', () => {
    const end = playRun({ zone: ZONES[0], power: { ...power, damage: 4, armor: 0.9, health: 600 }, classId: 'archer', seed: 11, build: { reach: 40, health: 40 } });
    const carried = [...Object.values(end.gear.worn), ...end.gear.bag];
    expect(carried.length).toBeGreaterThan(0);
    expect(carried.some((i) => i?.starter)).toBe(false);
  });
});
