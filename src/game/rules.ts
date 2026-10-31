import type { ClassId } from '@/lib/gear';
import type { Power, UpgradeId } from '@/lib/fog';
import type { Sheet } from '@/sprites/registry';
import { ATTACK, RUN_SKILL } from '@/balance';

/* The Fog's shared numbers and sprite sheet names, as plain data and math with no Phaser: the dungeon engine
   (dungeon/engine.ts) and its scene read them. */

export type SheetKey = 'hero' | 'heroAttack' | 'heroWalk' | 'ember' | 'hollow' | 'slime' | 'wisp' | 'mirror' | 'knight' | 'echo' | 'summit'
  // the dungeon's own monsters
  | 'lancer' | 'clock' | 'smoke' | 'seeker' | 'jar' | 'imp' | 'shade' | 'ashGolem' | 'grinder' | 'unsent' | 'loner'
  // the story worlds' own monsters (zones 2-6)
  | NativeKey
  // the regular monsters firing (played once as they shoot)
  | `${DressedKey}Attack`
  // the Excuse Jar shattering (played once), and the mid-boss
  | 'jarPop' | 'warden'
  // the other zones' mid-bosses (the Sand Golem also set to stone)
  | 'lanternMid' | 'foremanMid' | 'sandGolemMid' | 'sandGolemMidStone' | 'whisperMid' | 'galeMid' | 'bellowsMid' | 'bellMid' | 'tollMid'
  | BossSheetKey;
/** The regular monsters, drawn in each zone's dress (zoned.ts). */
export type DressedKey = 'slime' | 'wisp' | 'lancer' | 'clock' | 'smoke' | 'seeker' | 'jar' | 'imp' | 'shade' | 'ashGolem' | 'grinder' | 'unsent' | 'loner' | NativeKey;
/** The story worlds' own monsters, by the world they belong to: drawn as they are there, and dressed
    (zoned.ts) for any other world they turn up in. */
export const NATIVE = {
  ...{ lakeEcho: 1, swan: 1, frog: 1, eel: 1, lily: 1 },
  ...{ measure: 2, squire: 2, rat: 2, bat: 2, kiln: 2 },
  ...{ mole: 3, devil: 3, scarab: 3, cactus: 3, lizard: 3 },
  ...{ maybe: 4, undertow: 4, moth: 4, hound: 4, shroom: 4 },
  ...{ hawk: 5, cairn: 5, yeti: 5, frost: 5, boulder: 5 },
} as const;
export type NativeKey = keyof typeof NATIVE;
/** The dungeon bosses: idle, attack (played once), stages for the Knight and the Plateau, and the
    Mirror's and the Hollow's ends (played once). A run only builds its own zone's (FogRun.tsx). */
export type BossSheetKey =
  | 'tomorrowBoss' | 'tomorrowBossAttack'
  | 'mirrorBoss' | 'mirrorBossAttack' | 'mirrorBossShatter'
  | 'knightBoss' | 'knightBossAttack' | 'knightBoss1' | 'knightBoss1Attack' | 'knightBoss2' | 'knightBoss2Attack'
  | 'plateauBoss' | 'plateauBossAttack' | 'plateauBoss1' | 'plateauBoss1Attack' | 'plateauBoss2' | 'plateauBoss2Attack'
  | 'hollowBoss' | 'hollowBossAttack' | 'hollowBossFade'
  | 'summitBoss' | 'summitBossAttack'
  // the Ember Road's
  | 'lullBoss' | 'lullBossAttack' | 'distanceBoss' | 'distanceBossAttack'
  | 'aloneBoss' | 'aloneBossAttack' | 'aloneBoss1' | 'aloneBoss1Attack' | 'aloneBoss2' | 'aloneBoss2Attack'
  // the friends who climb the Summit with you
  | 'wanderer' | 'mira' | 'vela'
  // the run's own mid-boss attacking (played once)
  | 'wardenAttack' | 'lanternMidAttack' | 'foremanMidAttack' | 'sandGolemMidAttack' | 'sandGolemMidStoneAttack' | 'whisperMidAttack' | 'galeMidAttack' | 'bellowsMidAttack' | 'bellMidAttack' | 'tollMidAttack';
/** Every sheet a run gets: all of the regular ones, and only its own zone's boss sheets. */
export type Sheets = Record<Exclude<SheetKey, BossSheetKey>, Sheet> & Partial<Record<BossSheetKey, Sheet>>;

/** Skills the bot takes first. */
export const BOT_PICKS: UpgradeId[] = ['multi', 'power', 'haste', 'vital', 'wide', 'spark', 'keen', 'rush', 'flame', 'nova', 'star', 'giant', 'blast', 'guard', 'stand', 'frost', 'swift'];

export const HERO_SPEED = 150;
export const HERO_HP = 100;
/** How far ranged attacks look for a target: about the width of a phone screen. */
export const RANGE = 240;
/** A sword swings only at what it can reach, so it never whiffs on a foe still walking in. */
export const SLASH_REACH = 90;

export type AttackKind = 'slash' | 'arrow' | 'orb' | 'wave';

/** Base attack per class: how often it fires (s) and how hard it hits (src/balance/classes.ts). */
export { ATTACK };

export function attackOf(cls: ClassId | undefined): AttackKind {
  return cls === 'archer' ? 'arrow' : cls === 'mage' ? 'orb' : cls === 'monk' ? 'wave' : 'slash';
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Ups = Partial<Record<UpgradeId, number>>;

// ---------- the hero ----------

export const heroMaxHp = (power: Power) => HERO_HP + power.health;
const K = RUN_SKILL;
export const heroSpeed = (ups: Ups) => HERO_SPEED * (1 + K.swift.move * (ups.swift ?? 0));
export const heroDamage = (base: number, power: Power, ups: Ups) => base * (1 + power.damage) * (1 + K.power.dmg * (ups.power ?? 0));
export const attackCooldown = (kind: AttackKind, power: Power, ups: Ups) => ATTACK[kind].cd / ((1 + power.speed) * (1 + K.haste.rate * (ups.haste ?? 0)));
/** All armor, `more` included (Stand your ground), stops at 60%. */
export const armorOf = (power: Power, ups: Ups, more = 0) => Math.min(0.6, power.armor + K.guard.armor * (ups.guard ?? 0) + more);
export const gemReach = (power: Power) => 60 * (1 + power.reach);

/** Skills on a timer, per level. */
export const sparkHit = (lv: number) => ({ jumps: K.spark.jumps + lv, dmg: K.spark.dmg + K.spark.dmgPer * (lv - 1) });
export const novaHit = (lv: number) => ({ r: K.nova.r + K.nova.rPer * (lv - 1), dmg: K.nova.dmg + K.nova.dmgPer * (lv - 1) });
export const blastHit = (lv: number) => ({ r: K.blast.r, dmg: K.blast.dmg + K.blast.dmgPer * (lv - 1) });
export const starHit = (lv: number) => ({ r: K.star.r, dmg: K.star.dmg + K.star.dmgPer * (lv - 1) });

export const FLAME = { orbit: 68, spin: 2.6, touch: 22, every: 500, dmg: 7 };
export const FIREBALL = { every: 2.5, r: 52, dmg: 16, flightMs: 320 };
export const FAIRY = { below: 0.35, heal: 0.25, restMs: 25000 };
