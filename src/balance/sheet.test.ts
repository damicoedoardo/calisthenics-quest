import { describe, expect, it } from 'vitest';
import { EMBERS, FORGE, FORGE_RISK, MAT_DROPS, MAT_IDS, MATS, MELT, SAFE_POINTS, STARTING_POINTS, STEPS, WEEKLY_GOAL, XP, type MatId } from '@/balance';
import { initialState, levelInfo, totalXp } from '@/lib/game';
import { embersEarned, upgradeCost } from '@/lib/forge';
import { salvageValue, vaultSize } from '@/lib/fog-gear';
import { pointsEarned, statPower, STATS } from '@/lib/stats';
import { MAX_PLUS, rollItem, rollRarity, RARITY, starterKit, type Item, type Rarity } from '@/game/dungeon/items';
import { DROP_LUCK, DROPS, NEED } from '@/balance';
import { powerOf, ZONES, xpToNext } from '@/lib/fog';
import { seeded } from '@/lib/random';
import { createRun, stepRun } from '@/game/dungeon/engine';
import { botInput } from '@/game/dungeon/bot';
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

/** Tries until an upgrade at `odds` holds, on average, with each miss adding FORGE_RISK.pity
    (no training bonus, slips left out). */
function triesFor(odds: number): number {
  let left = 1,
    sum = 0;
  for (let k = 0; k < 100 && left > 1e-9; k++) {
    const p = Math.min(1, odds + k * FORGE_RISK.pity);
    sum += (k + 1) * left * p;
    left *= 1 - p;
  }
  return sum;
}

const matsText = (m: Partial<Record<MatId, number>>) => (MAT_IDS.filter((id) => m[id]).map((id) => `${m[id]} ${MATS[id].name.toLowerCase()}`).join(', ') || '-');

/** Co-op materials one hero finds in a run of the first zone, two bots playing it together, on average. */
function coopRun(): Partial<Record<MatId, number>> {
  const power = { ...powerOf(initialState(), new Date(2026, 0, 1)), damage: 1.2, speed: 0.4, reach: 0.15, armor: 0.25, health: 180 },
    seeds = [21, 22, 23],
    sum: Partial<Record<MatId, number>> = {};
  for (const seed of seeds) {
    const run = createRun({ zone: ZONES[0], power, classId: 'warrior', seed, autoPick: true, friends: [{ power, classId: 'archer' }] });
    for (let i = 0; i < 60 * 60 * 30 && !run.over; i++) {
      stepRun(run, run.party.map((h) => botInput(run, h)));
      run.events.length = 0;
    }
    for (const id of MAT_IDS) sum[id] = (sum[id] ?? 0) + (run.hero.mats[id] ?? 0) / seeds.length;
  }
  return sum;
}

function forge(): string {
  const item = (rarity: Rarity, plus = 0) => ({ rarity, plus }) as Item;
  let total = 0,
    boost = 1;
  const steps = Array.from({ length: MAX_PLUS }, (_, i) => {
    const s = STEPS[i],
      tries = triesFor(s.odds),
      cost = upgradeCost(item('rare', i));
    total += cost * tries;
    boost += s.boost;
    return [`+${i} → +${i + 1}`, cost, matsText(s.mats), pct(s.odds), tries.toFixed(2), Math.round(total), weeksFor(total, WEEKLY_GOAL).toFixed(1), `x${boost.toFixed(2)}`];
  });
  const melt = (['common', 'magic', 'rare', 'legendary'] as Rarity[]).map((r) => [r, salvageValue(item(r)), salvageValue(item(r, MAX_PLUS))]);
  const found = coopRun();
  const drops = (Object.entries(MAT_DROPS) as [string, Partial<Record<MatId, number>>][]).map(([from, odds]) => [from, ...MAT_IDS.map((id) => (odds[id] ? pct1(odds[id]!) : '-'))]);
  return [
    '## Forge and embers',
    '',
    `A full workout earns ${EMBERS.full} embers, a short one ${EMBERS.mini}; a reroll costs ${FORGE.reroll}. From +6 a step also asks for co-op materials; from +7 it can miss (each miss +${pct(FORGE_RISK.pity)} on the next try, +${pct(FORGE_RISK.rested)} after training in the last ${FORGE_RISK.restedDays} days, a miss slips one plus ${pct(FORGE_RISK.drop)} of the time but never under +${SAFE_POINTS.join(', +')}). Embers below count the tries on average, at ${WEEKLY_GOAL} full workouts a week, no melting.`,
    '',
    table(['Upgrade', 'Embers a try', 'Materials a try', 'Holds', 'Tries', 'Embers so far', 'Weeks of training', 'Item strength'], steps),
    '',
    table(['Melt down', 'At +0', `At +${MAX_PLUS}`], melt),
    '',
    'Co-op materials: the chance each source drops one, for each hero in a party (solo runs drop none):',
    '',
    table(['Source', ...MAT_IDS.map((id) => MATS[id].name)], drops),
    '',
    `Found by one hero in a co-op run of zone 1 (two bots, 3 runs, on average): ${matsText(Object.fromEntries(Object.entries(found).map(([k, v]) => [k, Number(v.toFixed(1))])))}.`,
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

function goals(): string {
  const steady = playSeason(PLAYERS.find((p) => p.id === 'steady')!, 182).state;
  const perLevel = steady.sessions.length / (levelInfo(totalXp(steady)).level - 1);
  const toFive = Array.from({ length: 5 }, (_, i) => upgradeCost({ plus: i } as Item)).reduce((a, b) => a + b, 0),
    toTop = STEPS.reduce((n, st) => n + st.embers * triesFor(st.odds), 0);
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
        ['One item +0 to +15 in about a year of training (embers; materials from co-op)', `${weeksFor(toTop, WEEKLY_GOAL).toFixed(0)} weeks`, check(weeksFor(toTop, WEEKLY_GOAL) >= 40 && weeksFor(toTop, WEEKLY_GOAL) <= 70)],
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
