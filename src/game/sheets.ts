import { gearOf, type GameState } from '@/lib/game';
import type { Zone } from '@/lib/fog';
import { sheetFor, type Sheet } from '@/sprites/registry';
import type { HeroOpts } from '@/sprites/characters/hero';
import type { BossSheetKey, Sheets } from './rules';

/* Every sprite sheet a Fog run draws with. sheetFor caches what it builds, so drawing them while
   the Play tab sits idle (one at a time, so the page never stalls) makes the tap on Play start the
   run without drawing sprites first. */

type Job = [string, () => Sheet];

/** The dungeon boss sheets for a zone (by id: 1 the Mirror, 2 the Knight, 3 the Plateau, 4 the
    Hollow, 5 the Summit). Only the run's own boss is drawn: they're big and there are many. */
function bossJobs(zoneId: number, hero: Pick<HeroOpts, 'gear' | 'classId' | 'look'>): [BossSheetKey, () => Sheet][] {
  const staged = (id: 'knightBoss' | 'plateauBoss'): [BossSheetKey, () => Sheet][] =>
    ([0, 1, 2] as const).flatMap((stage) => [
      [`${id}${stage || ''}` as BossSheetKey, () => sheetFor(id, 'idle', { stage })],
      [`${id}${stage || ''}Attack` as BossSheetKey, () => sheetFor(id, 'attack', { stage })],
    ]);
  if (zoneId === 1)
    return [
      ['mirrorBoss', () => sheetFor('mirrorBoss', 'idle', hero)],
      ['mirrorBossAttack', () => sheetFor('mirrorBoss', 'attack', hero)],
      ['mirrorBossShatter', () => sheetFor('mirrorBossShatter', 'idle', hero)],
    ];
  if (zoneId === 2) return staged('knightBoss');
  if (zoneId === 3) return staged('plateauBoss');
  if (zoneId === 4)
    return [
      ['hollowBoss', () => sheetFor('hollowBoss', 'idle')],
      ['hollowBossAttack', () => sheetFor('hollowBoss', 'attack')],
      ['hollowBossFade', () => sheetFor('hollowBossFade', 'idle')],
    ];
  if (zoneId === 5)
    return [
      ['summitBoss', () => sheetFor('summitBoss', 'idle')],
      ['summitBossAttack', () => sheetFor('summitBoss', 'attack')],
      ['wanderer', () => sheetFor('wanderer', 'idle')],
      ['mira', () => sheetFor('mira', 'idle')],
      ['vela', () => sheetFor('vela', 'idle')],
    ];
  return [];
}

function jobs(state: GameState, zone: Zone): Job[] {
  const gear = gearOf(state),
    classId = state.profile.classId,
    look = state.profile.look,
    hero = { gear, classId, look };
  const plain = ['ember', 'mirror', 'golem', 'knight', 'book', 'summit', 'splitterPop', 'warden'] as const;
  // The regular monsters dressed for this zone (wet glass at the lake, scrap iron at the forges...).
  const dressed = ['slime', 'wisp', 'ram', 'smoke', 'seeker', 'splitter', 'splitling', 'shade'] as const;
  return [
    ['hero', () => sheetFor('hero', 'idle', hero)],
    ['heroAttack', () => sheetFor('hero', 'attack', hero)],
    ['hollow', () => sheetFor('hero', 'idle', { ...hero, variant: 'hollow' })],
    ['echo', () => sheetFor('hero', 'idle', { ...hero, variant: 'echo' })],
    ...plain.map((id): Job => [id, () => sheetFor(id, 'idle')]),
    ...dressed.map((id): Job => [id, () => sheetFor(id, 'idle', { zone: zone.id })]),
    ...bossJobs(zone.id, hero),
  ];
}

/** The sheets for a run in `zone`, with the hero in the player's gear and look. */
export function runSheets(state: GameState, zone: Zone): Sheets {
  return Object.fromEntries(jobs(state, zone).map(([k, f]) => [k, f()])) as unknown as Sheets;
}

/** Draws a run's sheets ahead, one per idle moment. Returns a function that stops it. */
export function warmRunSheets(state: GameState, zone: Zone): () => void {
  const todo = jobs(state, zone);
  const idle = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 50));
  const cancel = window.cancelIdleCallback ?? window.clearTimeout;
  let handle = 0;
  const next = () => {
    const job = todo.shift();
    if (!job) return;
    job[1]();
    handle = idle(next);
  };
  handle = idle(next);
  return () => cancel(handle);
}
