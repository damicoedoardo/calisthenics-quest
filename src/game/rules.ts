import type { ClassId } from '@/lib/gear';
import type { Power, UpgradeId } from '@/lib/fog';
import type { Sheet } from '@/sprites/registry';
import { ATTACK, RUN_SKILL } from '@/balance';

/* The Fog's shared numbers and sprite sheet names, as plain data and math with no Phaser: the dungeon engine
   (dungeon/engine.ts) and its scene read them. */

export type SheetKey = 'hero' | 'heroAttack' | 'heroWalk' | 'ember' | 'hollow' | 'slime' | 'wisp' | 'mirror' | 'golem' | 'knight' | 'echo' | 'book' | 'summit'
  // the dungeon's own monsters
  | 'ram' | 'smoke' | 'seeker' | 'splitter' | 'splitling' | 'shade'
  // the Splitter splitting (played once), and the mid-boss
  | 'splitterPop' | 'warden'
  // the other zones' mid-bosses (the Sand Golem also set to stone)
  | 'lanternMid' | 'foremanMid' | 'sandGolemMid' | 'sandGolemMidStone' | 'whisperMid' | 'galeMid'
  | BossSheetKey;
/** The dungeon bosses: idle, attack (played once), stages for the Knight and the Plateau, and the
    Mirror's and the Hollow's ends (played once). A run only builds its own zone's (FogRun.tsx). */
export type BossSheetKey =
  | 'mirrorBoss' | 'mirrorBossAttack' | 'mirrorBossShatter'
  | 'knightBoss' | 'knightBossAttack' | 'knightBoss1' | 'knightBoss1Attack' | 'knightBoss2' | 'knightBoss2Attack'
  | 'plateauBoss' | 'plateauBossAttack' | 'plateauBoss1' | 'plateauBoss1Attack' | 'plateauBoss2' | 'plateauBoss2Attack'
  | 'hollowBoss' | 'hollowBossAttack' | 'hollowBossFade'
  | 'summitBoss' | 'summitBossAttack'
  // the friends who climb the Summit with you
  | 'wanderer' | 'mira' | 'vela'
  // the run's own mid-boss attacking (played once)
  | 'wardenAttack' | 'lanternMidAttack' | 'foremanMidAttack' | 'sandGolemMidAttack' | 'sandGolemMidStoneAttack' | 'whisperMidAttack' | 'galeMidAttack';
/** Every sheet a run gets: all of the regular ones, and only its own zone's boss sheets. */
export type Sheets = Record<Exclude<SheetKey, BossSheetKey>, Sheet> & Partial<Record<BossSheetKey, Sheet>>;

/** Skills the bot takes first. */
export const BOT_PICKS: UpgradeId[] = ['multi', 'power', 'haste', 'vital', 'spark', 'flame', 'nova', 'guard', 'swift', 'magnet'];

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
export const armorOf = (power: Power, ups: Ups) => Math.min(0.6, power.armor + K.guard.armor * (ups.guard ?? 0));
export const gemReach = (power: Power, ups: Ups) => 60 * (1 + power.reach + K.magnet.reach * (ups.magnet ?? 0));

/** Skills on a timer, per level. */
export const sparkHit = (lv: number) => ({ jumps: K.spark.jumps + lv, dmg: K.spark.dmg + K.spark.dmgPer * (lv - 1) });
export const novaHit = (lv: number) => ({ r: K.nova.r + K.nova.rPer * (lv - 1), dmg: K.nova.dmg + K.nova.dmgPer * (lv - 1) });

export const FLAME = { orbit: 68, spin: 2.6, touch: 22, every: 500, dmg: 7 };
export const FIREBALL = { every: 2.5, r: 52, dmg: 16, flightMs: 320 };
export const FAIRY = { below: 0.35, heal: 0.25, restMs: 25000 };
