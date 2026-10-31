import { spWorn } from '@/lib/sp';
import { gearOf, type GameState } from '@/lib/game';
import type { Zone } from '@/lib/fog';
import { worldOf } from './dungeon/content';
import { sheetFor, type Sheet } from '@/sprites/registry';
import { normalizeLook, type HeroOpts } from '@/sprites/characters/hero';
import type { Look } from '@/sprites/engine/figure';
import { makeGear, type ClassId, type Gear, type GearSlot, type Tier } from '@/lib/gear';
import { heroVariant } from '@/story/flame';
import { NATIVE, type BossSheetKey, type DressedKey, type NativeKey, type Sheets } from './rules';

/* Every sprite sheet a Fog run draws with. sheetFor caches what it builds, so drawing them while
   the Play tab sits idle (one at a time, so the page never stalls) makes the tap on Play start the
   run without drawing sprites first. */

type Job = [string, () => Sheet];

/** The dungeon boss sheets for a zone (by id: 0 Tomorrow, 1 the Mirror, 2 the Knight, 3 the Plateau, 4 the
    Hollow, 5 the Summit; an Ember Road boss of its own by its name). Only the run's own boss is
    drawn: they're big and there are many. */
function bossJobs(zone: Zone, hero: Pick<HeroOpts, 'gear' | 'classId' | 'look'>): [BossSheetKey, () => Sheet][] {
  const zoneId = zone.id;
  if (zone.boss === 'lull')
    return [
      ['lullBoss', () => sheetFor('lullBoss', 'idle')],
      ['lullBossAttack', () => sheetFor('lullBoss', 'attack')],
    ];
  if (zone.boss === 'distance')
    return [
      ['distanceBoss', () => sheetFor('distanceBoss', 'idle')],
      ['distanceBossAttack', () => sheetFor('distanceBoss', 'attack')],
    ];
  if (zone.boss === 'alone')
    return ([0, 1, 2] as const).flatMap((stage): [BossSheetKey, () => Sheet][] => [
      [`aloneBoss${stage || ''}` as BossSheetKey, () => sheetFor('aloneBoss', 'idle', { stage })],
      [`aloneBoss${stage || ''}Attack` as BossSheetKey, () => sheetFor('aloneBoss', 'attack', { stage })],
    ]);
  const staged = (id: 'knightBoss' | 'plateauBoss'): [BossSheetKey, () => Sheet][] =>
    ([0, 1, 2] as const).flatMap((stage) => [
      [`${id}${stage || ''}` as BossSheetKey, () => sheetFor(id, 'idle', { stage })],
      [`${id}${stage || ''}Attack` as BossSheetKey, () => sheetFor(id, 'attack', { stage })],
    ]);
  if (zoneId === 0)
    return [
      ['tomorrowBoss', () => sheetFor('tomorrowBoss', 'idle')],
      ['tomorrowBossAttack', () => sheetFor('tomorrowBoss', 'attack')],
    ];
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

/** The zone's floor-5 mid-boss attacking (its idle sheet is a plain one): by world, like MIDS. */
function midJobs(world: number): [BossSheetKey, () => Sheet][] {
  const ids = [['warden'], ['lanternMid'], ['foremanMid'], ['sandGolemMid', 'sandGolemMidStone'], ['whisperMid'], ['galeMid'], ['bellowsMid'], ['bellMid'], ['tollMid']] as const;
  return (ids[Math.min(Math.max(world, 0), ids.length - 1)] ?? []).map((id) => [`${id}Attack` as BossSheetKey, () => sheetFor(id, 'attack')]);
}

function jobs(state: GameState, zone: Zone): Job[] {
  const gear = gearOf(state),
    classId = state.profile.classId,
    look = state.profile.look,
    hero = { gear, classId, look };
  // Once the flame has fused with you, you burn with it down there too; with the SP on, you wear its look.
  const you = { ...hero, variant: heroVariant(state), ...(spWorn(state) ? { sp: spWorn(state) } : {}) };
  const plain = ['ember', 'mirror', 'knight', 'summit', 'jarPop', 'warden', 'lanternMid', 'foremanMid', 'sandGolemMid', 'sandGolemMidStone', 'whisperMid', 'galeMid', 'bellowsMid', 'bellMid', 'tollMid'] as const;
  // The regular monsters dressed for this zone's world (wet glass at the lake, scrap iron at the
  // forges...), standing and firing.
  const dressed: DressedKey[] = ['slime', 'wisp', 'lancer', 'clock', 'smoke', 'seeker', 'jar', 'imp', 'shade', 'ashGolem', 'grinder', 'unsent', 'loner', ...(Object.keys(NATIVE) as NativeKey[])],
    world = worldOf(zone),
    // a world's own monsters as drawn at home, dressed anywhere else
    dressFor = (id: DressedKey) => (NATIVE[id as NativeKey] === world ? 0 : world);
  return [
    ['hero', () => sheetFor('hero', 'idle', you)],
    ['heroAttack', () => sheetFor('hero', 'attack', you)],
    ['heroWalk', () => sheetFor('hero', 'walk', you)],
    ['hollow', () => sheetFor('hero', 'idle', { ...hero, variant: 'hollow' })],
    ['echo', () => sheetFor('hero', 'idle', { ...hero, variant: 'echo' })],
    ...plain.map((id): Job => [id, () => sheetFor(id, 'idle')]),
    ...dressed.map((id): Job => [id, () => sheetFor(id, 'idle', { zone: dressFor(id) })]),
    ...dressed.map((id): Job => [`${id}Attack`, () => sheetFor(id, 'attack', { zone: dressFor(id) })]),
    ...bossJobs(zone, hero),
    ...midJobs(world),
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

/** A friend's hero for a party run: their class, look and worn tiers (from their friend card). */
export function friendSheets(f: { classId: ClassId | undefined; look?: object | null; tiers?: Partial<Record<GearSlot, Tier>> }): { idle: Sheet; walk: Sheet } {
  const gear = Object.fromEntries((['weapon', 'armor', 'shield'] as GearSlot[]).map((s) => [s, makeGear(s, f.tiers?.[s] ?? (s === 'shield' ? 0 : 1), f.classId)])) as Record<GearSlot, Gear>;
  const hero = { gear, classId: f.classId, look: normalizeLook((f.look ?? undefined) as Partial<Look> | undefined) };
  return { idle: sheetFor('hero', 'idle', hero), walk: sheetFor('hero', 'walk', hero) };
}
