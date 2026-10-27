import type { ClassId } from '@/lib/gear';
import type { Power, UpgradeId } from '@/lib/fog';
import type { FogBoss } from '@/story/types';
import type { Sheet } from '@/sprites/registry';

/* The Fog's shared numbers and looks, as plain data and math with no Phaser: the dungeon engine
   (dungeon/engine.ts) and its scene read them. */

export type SheetKey = 'hero' | 'heroAttack' | 'ember' | 'hollow' | 'slime' | 'wisp' | 'mirror' | 'golem' | 'knight' | 'echo' | 'book' | 'summit'
  // the dungeon's own monsters
  | 'ram' | 'smoke' | 'seeker' | 'splitter' | 'splitling' | 'shade'
  // the Splitter splitting (played once), and the mid-boss
  | 'splitterPop' | 'warden'
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
  | 'wanderer' | 'mira' | 'vela';
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

export type FoeKind = 'slime' | 'wisp' | 'mirror' | 'golem' | 'reflection' | 'boss';

export interface Stats {
  hp: number;
  speed: number;
  dmg: number;
  xp: number;
  scale: number;
  r: number;
  bits: number[];
  /** Its sprite sheet. */
  tex: SheetKey;
}

export const FOES: Record<Exclude<FoeKind, 'boss'>, Stats> = {
  slime: { hp: 12, speed: 52, dmg: 7, xp: 1, scale: 0.55, r: 14, bits: [0x94a3b8, 0x5b74c4, 0xe2e8f0], tex: 'slime' },
  wisp: { hp: 8, speed: 88, dmg: 5, xp: 1, scale: 0.5, r: 13, bits: [0xf97316, 0xfde68a, 0x6b7280], tex: 'wisp' },
  mirror: { hp: 34, speed: 66, dmg: 11, xp: 3, scale: 0.65, r: 15, bits: [0xe2e8f0, 0xcbd5e1, 0xffffff], tex: 'mirror' },
  golem: { hp: 160, speed: 42, dmg: 18, xp: 10, scale: 0.95, r: 18, bits: [0xa8a29e, 0x78716c, 0x84cc16], tex: 'golem' },
  // A golden copy of you, sent by the Mirror. Hitting it hurts you.
  reflection: { hp: 30, speed: 78, dmg: 8, xp: 0, scale: 0.75, r: 12, bits: [0xfde68a, 0xfbbf24, 0xffffff], tex: 'echo' },
};

/** The Perfect Knight's armor: every hit breaks one plate, however weak. */
export const KNIGHT_PLATES = 40;

/**
 * The bosses. Each one's rule is its chapter's lesson:
 * - Tomorrow heals while you keep your distance and splits off small Tomorrows: get close.
 * - The Mirror sends reflections of you, and hitting them hurts you: walk past them.
 * - The Perfect Knight wears plates that any hit breaks, and shouts to push you away: keep hitting.
 * - The Hollow dashes and calls the fog (the Plateau and the Summit fight like it for now).
 */
export const BOSSES: Record<FogBoss, Stats> = {
  tomorrow: { hp: 2000, speed: 46, dmg: 16, xp: 0, scale: 1.5, r: 20, bits: [0x94a3b8, 0x5b74c4, 0xe2e8f0], tex: 'slime' },
  mirror: { hp: 480, speed: 36, dmg: 16, xp: 0, scale: 1.35, r: 16, bits: [0xe2e8f0, 0xcbd5e1, 0xffffff], tex: 'mirror' },
  knight: { hp: KNIGHT_PLATES, speed: 62, dmg: 18, xp: 0, scale: 1.15, r: 14, bits: [0xe2e8f0, 0x94a3b8, 0xdc2626], tex: 'knight' },
  plateau: { hp: 650, speed: 70, dmg: 20, xp: 0, scale: 1.5, r: 13, bits: [0xa78bfa, 0x6b21a8, 0xffffff], tex: 'hollow' },
  hollow: { hp: 650, speed: 70, dmg: 20, xp: 0, scale: 1.5, r: 13, bits: [0xa78bfa, 0x6b21a8, 0xffffff], tex: 'hollow' },
  summit: { hp: 650, speed: 70, dmg: 20, xp: 0, scale: 1.5, r: 13, bits: [0xa78bfa, 0x6b21a8, 0xffffff], tex: 'hollow' },
};

/** A boss you can't bring down in this long (s) means you need more training: the Fog closes in. */
export const BOSS_LIMIT = 180;

/** Tomorrow heals while you're further than this. */
export const TOMORROW_REACH = 200;

export type AttackKind = 'slash' | 'arrow' | 'orb' | 'wave';

/** Base attack per class: how often it fires (s) and how hard it hits. */
export const ATTACK: Record<AttackKind, { cd: number; dmg: number }> = {
  slash: { cd: 0.9, dmg: 14 },
  arrow: { cd: 0.6, dmg: 10 },
  orb: { cd: 0.8, dmg: 15 },
  wave: { cd: 1.3, dmg: 11 },
};

export function attackOf(cls: ClassId | undefined): AttackKind {
  return cls === 'archer' ? 'arrow' : cls === 'mage' ? 'orb' : cls === 'monk' ? 'wave' : 'slash';
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Ups = Partial<Record<UpgradeId, number>>;

// ---------- the hero ----------

export const heroMaxHp = (power: Power) => HERO_HP + power.hold;
export const heroSpeed = (ups: Ups) => HERO_SPEED * (1 + 0.12 * (ups.swift ?? 0));
export const heroDamage = (base: number, power: Power, ups: Ups) => base * (1 + power.strike) * (1 + 0.25 * (ups.power ?? 0));
export const attackCooldown = (kind: AttackKind, power: Power, ups: Ups) => ATTACK[kind].cd / ((1 + power.reach) * (1 + 0.18 * (ups.haste ?? 0)));
export const armorOf = (power: Power, ups: Ups) => Math.min(0.6, power.armor + 0.1 * (ups.guard ?? 0));
export const gemReach = (power: Power, ups: Ups) => 60 * (1 + 0.15 * power.levels.pull + 0.5 * (ups.magnet ?? 0));

/** Skills on a timer, per level. */
export const sparkHit = (lv: number) => ({ jumps: 2 + lv, dmg: 14 + 6 * (lv - 1) });
export const novaHit = (lv: number) => ({ r: 90 + 20 * (lv - 1), dmg: 10 + 5 * (lv - 1) });
export const FLAME = { orbit: 68, spin: 2.6, touch: 22, every: 500, dmg: 7 };
export const FIREBALL = { every: 2.5, r: 52, dmg: 16, flightMs: 320 };
export const FAIRY = { below: 0.35, heal: 0.25, restMs: 25000 };
