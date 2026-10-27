import type { ClassId } from '@/lib/gear';
import type { Power, UpgradeId, Zone } from '@/lib/fog';
import type { FogBoss } from '@/story/types';
import type { Sheet } from '@/sprites/registry';

/* The Fog's rules as plain data and math, with no Phaser: the game (run.ts) and the fast
   simulator (sim.ts) both read them, so a number changed here changes both. */

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

export const WORLD = 2400;
export const HERO_SPEED = 150;
export const HERO_HP = 100;
export const MAX_FOES = 120;
export const INVULNERABLE_MS = 600;
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

// ---------- the waves ----------

/** Seconds when a ring of wisps closes in from every side. */
export const RINGS = [60, 150];
export const RING_SIZE = 24;
export const RING_RADIUS = 340;

/** How many golems should have come by `t`: one every 45 s from 90 s. */
export const elitesDue = (t: number) => (t >= 90 ? Math.floor((t - 90) / 45) + 1 : 0);
export const elitePack = (t: number) => (t > 180 ? 2 : 1);

/** Seconds to the next pack; slower while the boss is out. */
export const spawnCooldown = (t: number, bossOut: boolean) => Math.max(0.3, 0.8 - t / 400) * (bossOut ? 3 : 1);
export const packSize = (t: number) => 1 + Math.floor(t / 60);

/** What walks out of the fog at `t`, for a roll `r` in [0, 1). */
export function foeKindAt(t: number, r: number): FoeKind {
  if (t < 45) return r < 0.7 ? 'slime' : 'wisp';
  if (t < 120) return r < 0.45 ? 'slime' : r < 0.85 ? 'wisp' : 'mirror';
  return r < 0.3 ? 'slime' : r < 0.7 ? 'wisp' : 'mirror';
}

/** A creature's HP: the zone's multiplier, growing over the run. The Knight's plates never grow. */
export function foeHp(s: Stats, zone: Zone, t: number, boss?: FogBoss): number {
  if (boss === 'knight') return KNIGHT_PLATES;
  return Math.round(s.hp * zone.hp * (boss ? 1 : 1 + t / 180));
}

/** Where the boss dashes and summons: Hollow, Plateau, Summit. */
export const DASH = { every: 4.5, windMs: 700, dashMs: 550, speed: 380, first: 3 };
export const SUMMON = { every: 9, count: 8 };

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

// ---------- the bot ----------

export interface BotFoe {
  x: number;
  y: number;
  kind: FoeKind;
  dmg: number;
}

/**
 * The bot: steps away from what's close (reflections most of all), picks up light, and circles
 * the boss at the distance its rule asks for. A steady, careful player, not a great one. With a
 * sword it lets the crowd come into reach instead, since a slash only hits what's close.
 */
export function botSteer(
  hero: { x: number; y: number },
  foes: Iterable<BotFoe>,
  boss: { x: number; y: number } | null,
  gems: Iterable<{ x: number; y: number }>,
  rule: FogBoss,
  melee: boolean,
): [number, number] {
  const h = hero;
  let x = 0,
    y = 0;
  for (const f of foes) {
    const dx = h.x - f.x,
      dy = h.y - f.y,
      d = Math.hypot(dx, dy) || 1;
    if (d > (melee && f.kind !== 'reflection' ? 70 : 170)) continue;
    const w = ((f.kind === 'reflection' ? 3 : melee ? 0.4 : 1) * (f.dmg / 8) * 2500) / (d * d);
    x += (dx / d) * w;
    y += (dy / d) * w;
  }
  if (boss) {
    const dx = boss.x - h.x,
      dy = boss.y - h.y,
      d = Math.hypot(dx, dy) || 1,
      // Tomorrow heals when you're far, the Knight needs hits: stay close. The rest dash: keep room.
      want = melee ? 60 : rule === 'tomorrow' || rule === 'knight' ? 80 : rule === 'mirror' ? 110 : 150,
      pull = clamp((d - want) / 80, -1.5, 1.5);
    x += (dx / d) * pull - (dy / d) * 0.7;
    y += (dy / d) * pull + (dx / d) * 0.7;
  } else {
    let gem: { x: number; y: number } | null = null,
      best = 260;
    for (const g of gems) {
      const d = Math.hypot(g.x - h.x, g.y - h.y);
      if (d < best) {
        best = d;
        gem = g;
      }
    }
    if (gem) {
      const dx = gem.x - h.x,
        dy = gem.y - h.y,
        d = Math.hypot(dx, dy) || 1;
      x += (dx / d) * 0.8;
      y += (dy / d) * 0.8;
    }
  }
  // Keep off the walls, where a crowd can pin you.
  const m = 200;
  if (h.x < m) x += (m - h.x) / m;
  if (h.x > WORLD - m) x -= (h.x - (WORLD - m)) / m;
  if (h.y < m) y += (m - h.y) / m;
  if (h.y > WORLD - m) y -= (h.y - (WORLD - m)) / m;
  const len = Math.hypot(x, y);
  return len < 0.05 ? [0, 0] : [x / len, y / len];
}
