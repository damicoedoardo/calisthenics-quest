import { describe, expect, it } from 'vitest';
import { EMBERS, FORGE, MELT, STARTING_POINTS, WEEKLY_GOAL, XP } from '@/balance';
import { levelInfo, totalXp } from '@/lib/game';
import { embersEarned, upgradeCost } from '@/lib/forge';
import { salvageValue, vaultSize } from '@/lib/fog-gear';
import { pointsEarned, statPower, STATS } from '@/lib/stats';
import { MAX_PLUS, rollItem, rollRarity, RARITY, starterKit, type Item, type Rarity } from '@/game/dungeon/items';
import { DROP_LUCK, DROPS, NEED } from '@/balance';
import { ZONES, xpToNext } from '@/lib/fog';
import { seeded } from '@/lib/random';
import { powerScore } from '@/game/power';
import { CLASSES, type ClassId } from '@/lib/gear';
import { POINTS } from '@/balance';
import type { Build } from '@/lib/stats';
import { playSeason } from '@/sim/season';
import { PLAYERS } from '@/sim/players';

/* The balance sheet: what the numbers in src/balance/ add up to, played through the real rules.
   `pnpm balance` rewrites src/balance/sheet.md; `pnpm test` fails while the sheet is out of date,
   so every balance change shows its before and after in the pull request. */

const pct = (v: number) => `${Math.round(v * 100)}%`;
/** A share with one decimal, for small chances. */
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;
const row = (cells: (string | number)[]) => `| ${cells.join(' | ')} |`;
const table = (head: string[], rows: (string | number)[][]) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');

/** Weeks of training at `perWeek` full workouts to earn `embers`. */
const weeksFor = (embers: number, perWeek: number) => embers / (EMBERS.full * perWeek);

function training(): string {
  const at = [7, 30, 91, 182];
  const kinds = ['steady', 'twice-a-week', 'eager'].map((id) => PLAYERS.find((p) => p.id === id)!);
  const rows = kinds.flatMap((k) =>
    at.map((days) => {
      const s = playSeason(k, days).state;
      const p = statPower(s.build ?? {}, s.profile.classId);
      return [k.id, days, s.sessions.length, levelInfo(totalXp(s)).level, pointsEarned(s).total, `+${pct(p.damage)} / +${Math.round(p.health)} HP`, embersEarned(s), vaultSize(s.sessions.length)];
    }),
  );
  return [
    '## Training over time',
    '',
    'Played by the season simulator (`src/sim/players.ts`): `steady` trains 3 times a week and spreads points, `twice-a-week` trains twice, `eager` trains every weekday and puts every point in Damage.',
    '',
    table(['Player', 'Day', 'Workouts', 'Level', 'Stat points', 'Damage / HP from points', 'Embers earned', 'Vault slots'], rows),
  ].join('\n');
}

function points(): string {
  const at = [0, 10, 25, 50, 100, 150];
  const rows = STATS.map((st) => [
    st.name,
    ...at.map((n) => {
      const v = statPower({ [st.id]: n }, undefined)[st.id];
      return st.id === 'health' ? `+${Math.round(v)}` : `+${pct(v)}`;
    }),
  ]);
  const armor = at.map((n) => pct(statPower({ health: n }, undefined).armor));
  return [
    '## What stat points give',
    '',
    `Every hero starts with ${STARTING_POINTS} points. A stat with this many points (no class lean):`,
    '',
    table(['Stat', ...at.map((n) => `${n} pts`)], [...rows, ['Armor (from Health)', ...armor]]),
  ].join('\n');
}

function forge(): string {
  const item = (rarity: Rarity, plus = 0) => ({ rarity, plus }) as Item;
  let total = 0;
  const steps = Array.from({ length: MAX_PLUS }, (_, i) => {
    total += upgradeCost(item('rare', i));
    return [`+${i} → +${i + 1}`, upgradeCost(item('rare', i)), total, weeksFor(total, WEEKLY_GOAL).toFixed(1)];
  });
  const melt = (['common', 'magic', 'rare', 'legendary'] as Rarity[]).map((r) => [r, salvageValue(item(r)), salvageValue(item(r, MAX_PLUS))]);
  return [
    '## Forge and embers',
    '',
    `A full workout earns ${EMBERS.full} embers, a short one ${EMBERS.mini}; a reroll costs ${FORGE.reroll}. Weeks below are at ${WEEKLY_GOAL} full workouts a week, no melting.`,
    '',
    table(['Upgrade', 'Cost', 'Total so far', 'Weeks of training'], steps),
    '',
    table(['Melt down', 'At +0', `At +${MAX_PLUS}`], melt),
  ].join('\n');
}

const RARITIES: Rarity[] = ['common', 'magic', 'rare', 'legendary'];

/** A weapon from this spot with every roll at its middle (rnd 0 picks the weapon slot, then 0.5). */
function middleWeapon(zone: number, floor: number, rarity: Rarity): Item {
  let first = true;
  const rnd = () => (first ? ((first = false), 0) : 0.5);
  return rollItem(rnd, { zone, workouts: ZONES[zone].workouts, floor, cls: 'warrior' }, rarity);
}

/** Workouts until an even build has `n` points in each stat (the model requirements follow). */
const workoutsFor = (n: number) => Math.max(0, Math.ceil((n * NEED.stats - NEED.start) / NEED.perWorkout));

function items(): string {
  const starter = starterKit('warrior').weapon.base[0].v;
  const rows = ZONES.flatMap((z) =>
    [0, 9].flatMap((floor) =>
      (['magic', 'rare', 'legendary'] as Rarity[]).map((r) => {
        const it = middleWeapon(z.id, floor, r);
        const need = it.need?.n ?? 0;
        return [`${z.id + 1} (${z.workouts} workouts in)`, floor + 1, RARITY[r].name, `+${pct(it.base[0].v)}`, it.bonuses.length, need, workoutsFor(need)];
      }),
    ),
  );
  return [
    '## Weapons',
    '',
    `The starter weapon gives +${pct(starter)} damage. A weapon with middle rolls, by zone, floor and rarity, the points in the class's stat it asks for, and the workouts until an even build has them:`,
    '',
    table(['Zone', 'Floor', 'Rarity', 'Damage', 'Bonuses', 'Needs points', 'Even build after'], rows),
  ].join('\n');
}

function drops(): string {
  const N = 20000;
  const share = (floor: number, luck: number) => {
    const rnd = seeded(1),
      n: Record<Rarity, number> = { common: 0, magic: 0, rare: 0, legendary: 0 };
    for (let i = 0; i < N; i++) n[rollRarity(rnd, floor, luck)]++;
    return RARITIES.map((r) => pct(n[r] / N));
  };
  const sources: [string, number, string][] = [
    ['Monster', 0, pct1(DROPS.plain)],
    ['Elite or golem', DROP_LUCK.elite, `${pct(DROPS.elite)} / ${pct(DROPS.golem)}`],
    ['Chest', DROP_LUCK.chest, pct(DROPS.chest)],
    ['Mid-boss, boss', DROP_LUCK.boss, '100%'],
  ];
  const rows = sources.flatMap(([name, luck, chance]) => [0, 9].map((floor) => [name, floor + 1, chance, ...share(floor, luck)]));
  return [
    '## Drops and rarity',
    '',
    `How often each source drops an item, and the rarity it rolls (${N} rolls each):`,
    '',
    table(['Source', 'Floor', 'Drop chance', ...RARITIES.map((r) => RARITY[r].name)], rows),
  ].join('\n');
}

function runLevels(): string {
  let total = 0;
  const at = new Map<number, number>();
  for (let l = 1; l <= 20; l++) {
    total += xpToNext(l);
    at.set(l + 1, total);
  }
  return ['## Run levels', '', 'Light to reach a level inside a run:', '', table(['Level', '2', '5', '10', '15', '20'], [['Light', ...[2, 5, 10, 15, 20].map((l) => at.get(l) ?? 0)]])].join('\n');
}

/* The model player for the power curve: 3 full workouts a week, every week at the goal, points
   spread evenly, embers all spent on upgrades (weapon first, then armor, then charm). Gear: middle
   rolls, rare, from the deepest floor of the newest open zone whose weapon the build can wear. */
type Worn = Partial<Record<'weapon' | 'armor' | 'charm', Item>>;
const modelPoints = (w: number) => STARTING_POINTS + w * POINTS.full + Math.floor(w / WEEKLY_GOAL) * POINTS.week;
const evenBuild = (w: number): Build => {
  const n = Math.floor(modelPoints(w) / 4);
  return { health: n, damage: n, reach: n, speed: n };
};
function middleItem(zone: number, floor: number, slot: 'weapon' | 'armor' | 'charm', cls: ClassId): Item {
  const first = { weapon: 0, armor: 0.5, charm: 0.9 }[slot];
  let start = true;
  const rnd = () => (start ? ((start = false), first) : 0.5);
  return rollItem(rnd, { zone, workouts: ZONES[zone].workouts, floor, cls }, 'rare');
}
function modelGear(w: number, cls: ClassId, build: Build): { gear: Worn; where: string } {
  const zone = ZONES.filter((z) => z.workouts <= w).length - 1,
    stat = middleItem(zone, 0, 'weapon', cls).need?.stat ?? 'damage';
  let floor = 9;
  while (floor > 0 && (middleItem(zone, floor, 'weapon', cls).need?.n ?? 0) > (build[stat] ?? 0)) floor--;
  return { gear: { weapon: middleItem(zone, floor, 'weapon', cls), armor: middleItem(zone, floor, 'armor', cls), charm: middleItem(zone, floor, 'charm', cls) }, where: `zone ${zone + 1}, floor ${floor + 1}` };
}
function upgraded(gear: Worn, embers: number): Worn {
  const out = { ...gear };
  for (const slot of ['weapon', 'armor', 'charm'] as const) {
    let it = out[slot];
    while (it && (it.plus ?? 0) < MAX_PLUS && upgradeCost(it) <= embers) {
      embers -= upgradeCost(it);
      it = { ...it, plus: (it.plus ?? 0) + 1 };
    }
    out[slot] = it;
  }
  return out;
}

function power(): string {
  const at = [...new Set([0, 6, ...ZONES.map((z) => z.workouts), ...ZONES.map((z) => z.workouts + 6), 100])].sort((a, b) => a - b);
  const cls: ClassId = 'warrior';
  const rows = at.map((w) => {
    const build = evenBuild(w),
      { gear, where } = modelGear(w, cls, build),
      base = powerScore(cls, {}).score,
      trained = powerScore(cls, build).score,
      geared = powerScore(cls, build, gear).score,
      full = powerScore(cls, build, upgraded(gear, w * EMBERS.full)).score,
      gain = full - base,
      share = (v: number) => (gain > 0 ? pct(v / gain) : '-');
    return [w, Math.round(full), share(trained - base), share(geared - trained), share(full - geared), where];
  });
  const classes = [0, 24, 64].map((w) => {
    const scores = CLASSES.map((c) => {
      const b = evenBuild(w);
      return powerScore(c.id, b, upgraded(modelGear(w, c.id, b).gear, w * EMBERS.full)).score;
    });
    const mid = scores.reduce((a, b) => a + b, 0) / scores.length;
    return [w, ...scores.map((v) => `${Math.round(v)} (${v >= mid ? '+' : ''}${Math.round((v / mid - 1) * 100)}%)`)];
  });
  return [
    '## Power by workouts',
    '',
    'One number for how strong a hero is (`powerScore` in `src/game/power.ts`): damage a second times what you can take, square-rooted, with a warrior with no points in the starter kit at 100. It leaves out run skills, chest items, the flame, abilities and hits on many foes.',
    '',
    `Model player: ${WEEKLY_GOAL} full workouts a week, every week at the goal, points spread evenly, embers all spent on upgrades, wearing middle-roll rares from the deepest floor it can wear in the newest open zone. A warrior, with the share of the gain since 0 workouts that comes from each source:`,
    '',
    table(['Workouts', 'Power', 'From training', 'From gear', 'From upgrades', 'Gear from'], rows),
    '',
    "Each class with the same model (and how far above or below the four's average). The simulator's win rates are the real check; this shows the gap before abilities:",
    '',
    table(['Workouts', ...CLASSES.map((c) => c.name)], classes),
  ].join('\n');
}

function goals(): string {
  const steady = playSeason(PLAYERS.find((p) => p.id === 'steady')!, 182).state;
  const perLevel = steady.sessions.length / (levelInfo(totalXp(steady)).level - 1);
  const toFive = Array.from({ length: MAX_PLUS }, (_, i) => upgradeCost({ plus: i } as Item)).reduce((a, b) => a + b, 0);
  const weeks = weeksFor(toFive, WEEKLY_GOAL);
  const spread = statPower({ health: 100, damage: 100, reach: 100, speed: 100 }, undefined);
  const check = (ok: boolean) => (ok ? 'on target' : '**off target**');
  const open = 'no goal set yet';
  return [
    '## Goals',
    '',
    'Each goal is written next to its numbers in `src/balance/`. The sheet measures it.',
    '',
    table(
      ['Goal', 'Measured', ''],
      [
        ['How often a steady player levels up (6 months)', `${perLevel.toFixed(1)} workouts a level`, open],
        ['One item +0 to +5 in about 5 weeks of training', `${weeks.toFixed(1)} weeks`, check(weeks >= 4 && weeks <= 6)],
        ['100 points a stat gives about +60% damage, +48% attack speed, +75 HP', `+${pct(spread.damage)}, +${pct(spread.speed)}, +${Math.round(spread.health)} HP`, check(Math.abs(spread.damage - 0.6) < 0.08 && Math.abs(spread.speed - 0.48) < 0.08 && Math.abs(spread.health - 75) < 10)],
        [`A comeback after ${XP.comebackDays} days away earns a bonus`, `+${XP.comeback} XP`, check(XP.comeback > 0)],
      ],
    ),
  ].join('\n');
}

describe('balance sheet', () => {
  it('is up to date (pnpm balance rewrites it)', async () => {
    const sheet = [
      '# Balance sheet',
      '',
      'Written by `pnpm balance` from `src/balance/` and the real rules. Do not edit by hand. The rule and the changelog: `docs/handbook/game/balance.md`.',
      '',
      goals(),
      '',
      power(),
      '',
      training(),
      '',
      points(),
      '',
      forge(),
      '',
      items(),
      '',
      drops(),
      '',
      runLevels(),
      '',
    ].join('\n');
    await expect(sheet).toMatchFileSnapshot('./sheet.md');
  }, 120_000);
});
