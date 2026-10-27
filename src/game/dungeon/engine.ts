import type { ClassId } from '@/lib/gear';
import { rollUpgrades, xpToNext, type Power, type UpgradeId, type Zone } from '@/lib/fog';
import type { FogBoss } from '@/story/types';
import {
  ATTACK,
  BOT_PICKS,
  FAIRY,
  FIREBALL,
  FLAME,
  RANGE,
  SLASH_REACH,
  armorOf,
  attackCooldown,
  attackOf,
  clamp,
  gemReach,
  heroDamage,
  heroMaxHp,
  heroSpeed,
  novaHit,
  sparkHit,
  type AttackKind,
} from '../rules';

/* The Fog as a dungeon: floor after floor of rooms, monsters that shoot patterns you dodge, and the
   zone's boss at the bottom. Die anywhere and the next run starts again from the first floor.

   This file is the whole game and nothing else: plain data and math, a fixed 60 steps a second,
   every roll from a seeded generator. The Phaser scene (scene.ts) only draws what it finds here and
   turns events into sound and sparks; the simulator plays this same code with the bot (bot.ts), so
   what balance tests measure is exactly the game people play. */

export const STEP = 1 / 60;
/** How far your flame's fires circle you. */
export const FLAME_RING = FLAME.orbit;
/** A room, in world pixels: about a phone screen. Walls are drawn inside it. */
export const ROOM = { w: 420, h: 760, wall: 22, door: 84 };
/** How deep a dungeon goes: sized so a whole run down to the boss takes about 15 minutes. */
export interface Layout {
  floors: number;
  rooms: number;
}
export const LAYOUT: Layout = { floors: 10, rooms: 5 };

/** The dials balance tests turn (scripts/fog-sim.mjs). */
export const DIALS = {
  /** Monster HP, on top of the zone's. */
  hp: 1.5,
  /** How often monsters shoot (2 = twice as often). */
  fire: 1.7,
  /** How fast their shots fly. */
  speed: 1.4,
  /** How many monsters a room holds. */
  crowd: 1,
  /** Share of HP back on the stairs to each new floor. */
  stairs: 0.15,
};
const HERO_R = 10;
/** After a hit you can't be hit again for this long (s). */
const INVULNERABLE = 0.5;
/** A boss you can't bring down in this long (s): the Fog closes in. */
export const BOSS_LIMIT = 180;
/** A run can't last longer than this (s), so a stuck run still ends. */
const RUN_LIMIT = 2400;

// ---------- monsters ----------

export type MonsterKind = 'slime' | 'wisp' | 'mirror' | 'golem' | 'reflection';
export type FoeKind = MonsterKind | 'boss';

/** How a monster moves: walks at you, keeps its distance, or circles you at its range. */
type Move = 'chase' | 'keep' | 'orbit';

/** One way a monster shoots, every `every` seconds. */
export interface Pattern {
  every: number;
  /** aimed: n bullets at you; spread: n in a fan of `arc` radians; ring: n all around; spiral: n
      around, turning a bit each time. */
  kind: 'aimed' | 'spread' | 'ring' | 'spiral';
  n: number;
  arc?: number;
  speed: number;
  dmg: number;
  /** Seconds before the first volley. */
  first?: number;
  /** Bullet radius. */
  r?: number;
  /** Only below this share of HP (a boss's second phase). */
  below?: number;
}

export interface MonsterDef {
  hp: number;
  speed: number;
  /** Damage on touch. */
  dmg: number;
  r: number;
  xp: number;
  move: Move;
  /** Distance it keeps (keep, orbit). */
  range?: number;
  shoots: Pattern[];
  /** Cost when filling a room. */
  cost: number;
}

export const MONSTERS: Record<MonsterKind, MonsterDef> = {
  slime: { hp: 16, speed: 46, dmg: 8, r: 14, xp: 1, move: 'chase', shoots: [{ every: 2.6, kind: 'aimed', n: 1, speed: 120, dmg: 7, first: 1.2 }], cost: 1 },
  wisp: { hp: 10, speed: 80, dmg: 5, r: 12, xp: 1, move: 'orbit', range: 150, shoots: [{ every: 2.3, kind: 'spread', n: 3, arc: 0.5, speed: 140, dmg: 6, first: 1.5 }], cost: 1.5 },
  mirror: { hp: 36, speed: 50, dmg: 10, r: 15, xp: 3, move: 'keep', range: 210, shoots: [{ every: 3.2, kind: 'ring', n: 10, speed: 105, dmg: 8, first: 1.8 }], cost: 2.5 },
  golem: {
    hp: 220,
    speed: 36,
    dmg: 16,
    r: 18,
    xp: 12,
    move: 'chase',
    shoots: [
      { every: 3.4, kind: 'spread', n: 5, arc: 0.7, speed: 135, dmg: 10, first: 1.5 },
      { every: 5, kind: 'ring', n: 14, speed: 95, dmg: 9, first: 3 },
    ],
    cost: 6,
  },
  // A golden copy of you, sent by the Mirror. Hitting it hurts you.
  reflection: { hp: 30, speed: 72, dmg: 8, r: 12, xp: 0, move: 'chase', shoots: [], cost: 0 },
};

/** Which monsters a room on this floor draws from, by weight. */
const MIX: [MonsterKind, number][][] = [
  [
    ['slime', 3],
    ['wisp', 2],
  ],
  [
    ['slime', 2],
    ['wisp', 3],
    ['mirror', 1],
  ],
  [
    ['slime', 1],
    ['wisp', 3],
    ['mirror', 2],
  ],
];

/**
 * The bosses, each fighting by its chapter's lesson:
 * - Tomorrow heals and splits while you keep away from it: get close.
 * - The Mirror sends reflections of you, and hitting them hurts you: walk past them.
 * - The Perfect Knight wears plates that any hit breaks, and shouts you away: keep hitting.
 * - The Hollow dashes, calls the fog, and spirals when hurt (the Plateau and the Summit fight like it for now).
 */
export const BOSSES: Record<FogBoss, MonsterDef & { plates?: number }> = {
  tomorrow: {
    hp: 900,
    speed: 40,
    dmg: 16,
    r: 22,
    xp: 0,
    move: 'chase',
    shoots: [
      { every: 3, kind: 'ring', n: 12, speed: 90, dmg: 10, first: 2 },
      { every: 2.2, kind: 'aimed', n: 1, speed: 150, dmg: 9, r: 8, first: 1 },
    ],
    cost: 0,
  },
  mirror: {
    hp: 520,
    speed: 36,
    dmg: 16,
    r: 16,
    xp: 0,
    move: 'keep',
    range: 190,
    shoots: [{ every: 0.2, kind: 'spiral', n: 2, speed: 115, dmg: 8, first: 2 }],
    cost: 0,
  },
  knight: {
    hp: 40,
    plates: 40,
    speed: 60,
    dmg: 18,
    r: 15,
    xp: 0,
    move: 'chase',
    shoots: [{ every: 2.6, kind: 'spread', n: 5, arc: 0.6, speed: 165, dmg: 11, first: 1.5 }],
    cost: 0,
  },
  ...Object.fromEntries(
    (['plateau', 'hollow', 'summit'] as const).map((b) => [
      b,
      {
        hp: 800,
        speed: 70,
        dmg: 20,
        r: 14,
        xp: 0,
        move: 'chase' as const,
        shoots: [
          { every: 3, kind: 'ring' as const, n: 16, speed: 115, dmg: 10, first: 2 },
          { every: 0.16, kind: 'spiral' as const, n: 3, speed: 120, dmg: 8, below: 0.5 },
        ],
        cost: 0,
      },
    ]),
  ),
} as Record<FogBoss, MonsterDef & { plates?: number }>;

/** Tomorrow heals while you're further than this. */
export const TOMORROW_REACH = 200;
const DASH = { every: 4.5, wind: 0.7, dash: 0.55, speed: 380, first: 3 };

// ---------- class abilities ----------

export type AbilityId = 'charge' | 'volley' | 'blink' | 'still' | 'dash';

export const ABILITIES: Record<AbilityId, { name: string; text: string; cd: number }> = {
  charge: { name: 'Charge', text: 'Rush ahead, untouchable, hitting everything you pass.', cd: 6 },
  volley: { name: 'Volley', text: 'Loose arrows all around you that pierce through.', cd: 7 },
  blink: { name: 'Blink', text: 'Vanish and appear ahead, bursting where you land and wiping shots nearby.', cd: 8 },
  still: { name: 'Stillness', text: 'Breathe: heal a fifth of your HP and push everything away.', cd: 12 },
  dash: { name: 'Dash', text: 'A quick dodge: untouchable for a moment.', cd: 5 },
};

/** Up close you take more hits, so the sword's class is built to: more HP and armor. */
/** Each class in the dungeon, against the others: HP, armor, and damage (orbs and waves hit crowds, so less each). */
export const CLASS_BODY: Record<'slash' | 'arrow' | 'orb' | 'wave', { hp: number; armor: number; dmg: number }> = {
  slash: { hp: 1.5, armor: 0.35, dmg: 1 },
  wave: { hp: 1.15, armor: 0.05, dmg: 0.75 },
  arrow: { hp: 1, armor: 0, dmg: 1.1 },
  orb: { hp: 0.85, armor: 0, dmg: 0.75 },
};

export function abilityOf(cls: ClassId | undefined): AbilityId {
  return cls === 'warrior' ? 'charge' : cls === 'archer' ? 'volley' : cls === 'mage' ? 'blink' : cls === 'monk' ? 'still' : 'dash';
}

// ---------- the world ----------

export interface Foe {
  id: number;
  kind: FoeKind;
  def: MonsterDef;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  speed: number;
  /** Next volley per pattern (run seconds). */
  next: number[];
  spin: number;
  knockUntil: number;
  flameAt: number;
  /** Rising out of the fog until then: can't hurt or be hurt. */
  bornUntil: number;
  windUntil: number;
  dashUntil: number;
  dashX: number;
  dashY: number;
  alive: boolean;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  /** When it was fired (run seconds). */
  born: number;
  /** Fired by a boss (drawn bigger and redder). */
  boss: boolean;
}

export interface Shot {
  id: number;
  kind: 'arrow' | 'orb';
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  pierce: number;
  target: Foe | null;
  hit: Set<Foe>;
  dies: number;
}

export interface Gem {
  id: number;
  x: number;
  y: number;
  value: number;
  pulled: boolean;
}

/** What happened this step, for the screen and the speakers. */
export type GameEvent =
  | { type: 'attack'; kind: AttackKind; x: number; y: number; angle: number; n: number; r?: number }
  | { type: 'hit'; id: number; x: number; y: number; dmg: number; boss: boolean }
  | { type: 'kill'; x: number; y: number; kind: FoeKind }
  | { type: 'hurt'; x: number; y: number; dmg: number; by: 'shot' | 'touch' }
  | { type: 'shoot'; x: number; y: number; boss: boolean }
  | { type: 'burst'; x: number; y: number; r: number; color: 'nova' | 'orb' | 'wave' | 'fire' | 'ability' }
  | { type: 'chain'; points: { x: number; y: number }[] }
  | { type: 'ability'; id: AbilityId; x: number; y: number; toX: number; toY: number }
  | { type: 'heal'; x: number; y: number; n: number }
  | { type: 'gem' }
  | { type: 'spawn'; x: number; y: number; kind: FoeKind }
  | { type: 'room' }
  | { type: 'clear' }
  | { type: 'floor'; floor: number }
  | { type: 'boss' }
  | { type: 'dash'; x: number; y: number; toX: number; toY: number }
  | { type: 'shout'; x: number; y: number }
  | { type: 'say'; text: string };

export type FreePick = 'fresh' | 'rested';

export interface RunSetup {
  zone: Zone;
  power: Power;
  classId: ClassId | undefined;
  seed: number;
  /** Skills are taken by the bot's order instead of waiting for a pick. */
  autoPick?: boolean;
  layout?: Layout;
}

export interface Input {
  /** Where you push the stick, each in [-1, 1]. */
  x: number;
  y: number;
  /** The ability button went down this step. */
  ability: boolean;
}

export interface RunEnd {
  won: boolean;
  seconds: number;
  kills: number;
  level: number;
  hp: number;
  maxHp: number;
  /** Deepest floor and room reached, from 1. */
  floor: number;
  room: number;
  bossAt: number | null;
  why: 'boss' | 'hp' | 'limit';
}

export interface Run {
  setup: RunSetup;
  layout: Layout;
  rnd: () => number;
  t: number;
  ids: number;
  /** From 0. The last room of the last floor is the boss's. */
  floor: number;
  room: number;
  /** Waves still to come in this room. */
  waves: MonsterKind[][];
  cleared: boolean;
  doorOpen: boolean;
  hero: { x: number; y: number; vx: number; vy: number; facing: number };
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
  kills: number;
  hurtUntil: number;
  /** Untouchable until then (dash, charge, blink). */
  ghostUntil: number;
  charge: { until: number; x: number; y: number; hit: Set<Foe> } | null;
  shove: { until: number; x: number; y: number };
  ability: AbilityId;
  abilityAt: number;
  cd: { attack: number; spark: number; nova: number; fireball: number };
  ups: Partial<Record<UpgradeId, number>>;
  flames: number;
  orbit: number;
  fairyAt: number;
  mirrorHurtAt: number;
  foes: Foe[];
  bullets: Bullet[];
  shots: Shot[];
  gems: Gem[];
  timers: { at: number; run: () => void }[];
  boss: Foe | null;
  bossAt: number | null;
  bossClock: number;
  bossDash: number;
  bossSummon: number;
  free: FreePick[];
  pendingLevels: number;
  /** A pick waiting for the player: the run holds still until it's made. */
  offer: { choices: UpgradeId[]; free: FreePick | null } | null;
  events: GameEvent[];
  over: RunEnd | null;
  paused: boolean;
}

/** A small seeded random generator (mulberry32). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const isBossRoom = (r: Pick<Run, 'floor' | 'room' | 'layout'>) => r.floor === r.layout.floors - 1 && r.room === r.layout.rooms - 1;
/** How far down this floor is, from 0 (the first) to 1 (the boss's). */
const depth = (run: Run) => (run.layout.floors > 1 ? run.floor / (run.layout.floors - 1) : 0);

export function createRun(setup: RunSetup): Run {
  const body = CLASS_BODY[attackOf(setup.classId)],
    hp = Math.round(heroMaxHp(setup.power) * body.hp),
    power = { ...setup.power, armor: setup.power.armor + body.armor, strike: (1 + setup.power.strike) * body.dmg - 1 };
  setup = { ...setup, power };
  const run: Run = {
    setup,
    layout: setup.layout ?? LAYOUT,
    rnd: seeded(setup.seed),
    t: 0,
    ids: 0,
    floor: 0,
    room: 0,
    waves: [],
    cleared: false,
    doorOpen: false,
    hero: { x: ROOM.w / 2, y: ROOM.h - 70, vx: 0, vy: 0, facing: -Math.PI / 2 },
    hp,
    maxHp: hp,
    xp: 0,
    level: 1,
    kills: 0,
    hurtUntil: 0,
    ghostUntil: 0,
    charge: null,
    shove: { until: 0, x: 0, y: 0 },
    ability: abilityOf(setup.classId),
    abilityAt: 0,
    cd: { attack: 0.5, spark: 2, nova: 3, fireball: 2.5 },
    ups: {},
    flames: power.flames,
    orbit: 0,
    fairyAt: 0,
    mirrorHurtAt: 0,
    foes: [],
    bullets: [],
    shots: [],
    gems: [],
    timers: [],
    boss: null,
    bossAt: null,
    bossClock: 0,
    bossDash: 0,
    bossSummon: 0,
    free: [...(power.fresh ? (['fresh'] as const) : []), ...(power.rested ? (['rested'] as const) : [])],
    pendingLevels: 0,
    offer: null,
    events: [],
    over: null,
    paused: false,
  };
  enterRoom(run);
  if (run.free.length) later(run, 0.7, () => offer(run, run.free.shift()!));
  return run;
}

const later = (run: Run, s: number, fn: () => void) => run.timers.push({ at: run.t + s, run: fn });
const emit = (run: Run, e: GameEvent) => run.events.push(e);
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

// ---------- rooms and floors ----------

/** What a room holds: a budget of monsters that grows with depth, in two waves; each floor ends with a golem. */
function fillRoom(run: Run): MonsterKind[][] {
  const { room } = run,
    deep = depth(run);
  const budget = (6 + 10 * deep + room) * DIALS.crowd;
  const mix = MIX[Math.min(MIX.length - 1, Math.floor(deep * MIX.length))];
  const total = mix.reduce((n, [, w]) => n + w, 0);
  const pickKind = (): MonsterKind => {
    let r = run.rnd() * total;
    for (const [k, w] of mix) if ((r -= w) < 0) return k;
    return mix[0][0];
  };
  const wave = (b: number) => {
    const out: MonsterKind[] = [];
    while (b > 0) {
      const k = pickKind();
      out.push(k);
      b -= MONSTERS[k].cost;
    }
    return out;
  };
  const waves = [wave(budget * 0.4), wave(budget * 0.3), wave(budget * 0.3)];
  if (room === run.layout.rooms - 1) waves[2].push('golem');
  return waves;
}

function enterRoom(run: Run) {
  run.foes = [];
  run.bullets = [];
  run.shots = [];
  run.gems = [];
  run.cleared = false;
  run.doorOpen = false;
  run.hero.x = ROOM.w / 2;
  run.hero.y = ROOM.h - 70;
  run.charge = null;
  emit(run, { type: 'room' });
  if (isBossRoom(run)) {
    run.waves = [];
    later(run, 1.2, () => summonBoss(run));
    return;
  }
  run.waves = fillRoom(run);
  later(run, 0.6, () => nextWave(run));
}

/** A point in the room for a monster: in the upper part, away from you. */
function spawnPoint(run: Run): [number, number] {
  const m = ROOM.wall + 30;
  for (let i = 0; i < 20; i++) {
    const x = m + run.rnd() * (ROOM.w - 2 * m),
      y = m + run.rnd() * (ROOM.h * 0.6);
    if (Math.hypot(x - run.hero.x, y - run.hero.y) > 200) return [x, y];
  }
  return [ROOM.w / 2, m + 20];
}

function nextWave(run: Run) {
  const wave = run.waves.shift();
  if (!wave) return;
  for (const k of wave) addFoe(run, k, ...spawnPoint(run));
}

function addFoe(run: Run, kind: MonsterKind, x: number, y: number): Foe {
  const def = MONSTERS[kind],
    { zone } = run.setup;
  // Deeper is tougher: three times the HP on the boss's floor.
  const hp = Math.round(def.hp * zone.hp * DIALS.hp * (1 + 2 * depth(run)));
  const f: Foe = {
    id: ++run.ids,
    kind,
    def: { ...def, dmg: def.dmg * zone.dmg },
    x: clamp(x, ROOM.wall + def.r, ROOM.w - ROOM.wall - def.r),
    y: clamp(y, ROOM.wall + def.r, ROOM.h - ROOM.wall - def.r),
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    speed: def.speed * (0.9 + run.rnd() * 0.2),
    next: def.shoots.map((p) => run.t + 0.4 + (p.first ?? p.every) * (0.8 + run.rnd() * 0.4)),
    spin: run.rnd() * Math.PI * 2,
    knockUntil: 0,
    flameAt: 0,
    bornUntil: run.t + 0.4,
    windUntil: 0,
    dashUntil: 0,
    dashX: 0,
    dashY: 0,
    alive: true,
  };
  run.foes.push(f);
  emit(run, { type: 'spawn', x: f.x, y: f.y, kind });
  return f;
}

function summonBoss(run: Run) {
  const which = run.setup.zone.boss,
    def = BOSSES[which],
    { zone } = run.setup;
  const hp = def.plates ?? Math.round(def.hp * zone.hp);
  const b: Foe = {
    id: ++run.ids,
    kind: 'boss',
    def: { ...def, dmg: def.dmg * zone.dmg },
    x: ROOM.w / 2,
    y: 140,
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    speed: def.speed,
    next: def.shoots.map((p) => run.t + (p.first ?? p.every)),
    spin: 0,
    knockUntil: 0,
    flameAt: 0,
    bornUntil: run.t + 0.8,
    windUntil: 0,
    dashUntil: 0,
    dashX: 0,
    dashY: 0,
    alive: true,
  };
  run.foes.push(b);
  run.boss = b;
  run.bossAt = run.t;
  run.bossDash = DASH.first;
  run.bossSummon = which === 'mirror' ? 2 : 6;
  run.bossClock = which === 'knight' ? 6 : 0;
  emit(run, { type: 'boss' });
}

/** Walk through the open door: the next room, the next floor, or (past the last) nothing. */
function throughDoor(run: Run) {
  run.room++;
  if (run.room >= run.layout.rooms) {
    run.room = 0;
    run.floor++;
    // A breath on the stairs.
    const heal = Math.round(run.maxHp * DIALS.stairs);
    run.hp = Math.min(run.maxHp, run.hp + heal);
    emit(run, { type: 'floor', floor: run.floor });
    emit(run, { type: 'heal', x: run.hero.x, y: run.hero.y, n: heal });
  }
  enterRoom(run);
}

// ---------- the step ----------

export function stepRun(run: Run, input: Input) {
  if (run.over || run.paused || run.offer) return;
  run.t += STEP;
  const now = run.t;
  for (let i = 0; i < run.timers.length; i++) {
    if (run.timers[i].at <= now) {
      const fn = run.timers[i].run;
      run.timers.splice(i--, 1);
      fn();
      if (run.over || run.offer) return;
    }
  }
  if (run.bossAt !== null && now - run.bossAt >= BOSS_LIMIT) {
    emit(run, { type: 'say', text: 'The Fog closes in. Train, and come back.' });
    return end(run, false, 'limit');
  }
  if (now >= RUN_LIMIT) return end(run, false, 'limit');
  moveHero(run, input);
  if (input.ability) useAbility(run, input);
  moveFoes(run);
  moveBullets(run);
  if (run.over) return;
  attack(run);
  skills(run);
  moveShots(run);
  if (run.over) return;
  pullGems(run);
  checkRoom(run);
  if (run.foes.length > 40) run.foes = run.foes.filter((f) => f.alive);
}

function moveHero(run: Run, input: Input) {
  const h = run.hero,
    now = run.t;
  let x = input.x,
    y = input.y;
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  if (len > 0.05) h.facing = Math.atan2(y, x);
  const speed = heroSpeed(run.ups);
  if (run.charge && now < run.charge.until) {
    h.vx = run.charge.x;
    h.vy = run.charge.y;
  } else if (now < run.shove.until) {
    h.vx = run.shove.x;
    h.vy = run.shove.y;
  } else {
    run.charge = null;
    h.vx = x * speed;
    h.vy = y * speed;
  }
  h.x += h.vx * STEP;
  h.y += h.vy * STEP;
  // The open door is a gap in the top wall.
  const inDoor = run.doorOpen && Math.abs(h.x - ROOM.w / 2) < ROOM.door / 2 - HERO_R;
  h.x = clamp(h.x, ROOM.wall + HERO_R, ROOM.w - ROOM.wall - HERO_R);
  h.y = clamp(h.y, inDoor ? -40 : ROOM.wall + HERO_R, ROOM.h - ROOM.wall - HERO_R);
  if (inDoor && h.y < 4) throughDoor(run);
  if (run.charge) {
    for (const f of run.foes) {
      if (!f.alive || run.charge.hit.has(f) || dist(f, h) > f.def.r + HERO_R + 12) continue;
      run.charge.hit.add(f);
      damage(run, f, pow(run, ATTACK.slash.dmg * 2), 220);
    }
  }
}

function useAbility(run: Run, input: Input) {
  const now = run.t,
    h = run.hero;
  if (now < run.abilityAt) return;
  const a = run.ability;
  run.abilityAt = now + ABILITIES[a].cd;
  let dx = input.x,
    dy = input.y;
  if (Math.hypot(dx, dy) < 0.1) {
    const f = nearest(run, h.x, h.y);
    if (f && (a === 'charge' || a === 'volley')) [dx, dy] = [f.x - h.x, f.y - h.y];
    else [dx, dy] = [Math.cos(h.facing), Math.sin(h.facing)];
  }
  const d = Math.hypot(dx, dy) || 1;
  dx /= d;
  dy /= d;
  const from = { x: h.x, y: h.y };
  if (a === 'charge' || a === 'dash') {
    const speed = a === 'charge' ? 620 : 520,
      secs = a === 'charge' ? 0.28 : 0.22;
    run.charge = { until: now + secs, x: dx * speed, y: dy * speed, hit: a === 'charge' ? new Set() : new Set(run.foes) };
    run.ghostUntil = now + secs + 0.1;
    emit(run, { type: 'ability', id: a, x: from.x, y: from.y, toX: from.x + dx * speed * secs, toY: from.y + dy * speed * secs });
  } else if (a === 'volley') {
    const dmg = pow(run, ATTACK.arrow.dmg * 1.5);
    for (let i = 0; i < 16; i++) fire(run, 'arrow', Math.atan2(dy, dx) + (i / 16) * Math.PI * 2, 430, dmg, 2, null);
    emit(run, { type: 'ability', id: a, x: h.x, y: h.y, toX: h.x, toY: h.y });
  } else if (a === 'blink') {
    h.x = clamp(h.x + dx * 150, ROOM.wall + HERO_R, ROOM.w - ROOM.wall - HERO_R);
    h.y = clamp(h.y + dy * 150, ROOM.wall + HERO_R, ROOM.h - ROOM.wall - HERO_R);
    run.ghostUntil = now + 0.3;
    clearBullets(run, h.x, h.y, 90);
    burst(run, h.x, h.y, 80, pow(run, ATTACK.orb.dmg * 1.5), 'ability');
    emit(run, { type: 'ability', id: a, x: from.x, y: from.y, toX: h.x, toY: h.y });
  } else {
    const heal = Math.round(run.maxHp * 0.2);
    run.hp = Math.min(run.maxHp, run.hp + heal);
    clearBullets(run, h.x, h.y, 140);
    burst(run, h.x, h.y, 140, pow(run, ATTACK.wave.dmg), 'ability', undefined, 260);
    emit(run, { type: 'ability', id: a, x: h.x, y: h.y, toX: h.x, toY: h.y });
    emit(run, { type: 'heal', x: h.x, y: h.y, n: heal });
  }
}

function clearBullets(run: Run, x: number, y: number, r: number) {
  run.bullets = run.bullets.filter((b) => Math.hypot(b.x - x, b.y - y) > r);
}

// ---------- monsters ----------

function moveFoes(run: Run) {
  const h = run.hero,
    now = run.t;
  for (const f of run.foes) {
    if (!f.alive) continue;
    if (now >= f.knockUntil) {
      if (f === run.boss) steerBoss(run, f);
      else {
        const dx = h.x - f.x,
          dy = h.y - f.y,
          d = Math.hypot(dx, dy) || 1;
        let v = f.speed;
        const range = f.def.range ?? 0;
        if (f.def.move === 'keep') v = d > range + 30 ? f.speed : d < range - 30 ? -f.speed : 0;
        if (f.def.move === 'orbit') {
          const pull = clamp((d - range) / 60, -1, 1);
          f.vx = ((dx / d) * pull - (dy / d) * 0.8) * f.speed;
          f.vy = ((dy / d) * pull + (dx / d) * 0.8) * f.speed;
        } else {
          f.vx = (dx / d) * v;
          f.vy = (dy / d) * v;
        }
      }
    }
    f.x = clamp(f.x + f.vx * STEP, ROOM.wall + f.def.r, ROOM.w - ROOM.wall - f.def.r);
    f.y = clamp(f.y + f.vy * STEP, ROOM.wall + f.def.r, ROOM.h - ROOM.wall - f.def.r);
    if (now < f.bornUntil) continue;
    // Volleys.
    f.def.shoots.forEach((p, i) => {
      if (now < f.next[i]) return;
      f.next[i] = now + p.every / (f === run.boss ? 1 : DIALS.fire);
      if (p.below && f.hp > f.maxHp * p.below) return;
      shoot(run, f, p);
    });
    // Touch.
    if (dist(f, h) < f.def.r + HERO_R) hurt(run, f.def.dmg, 'touch');
    if (run.over) return;
  }
  // Monsters push each other apart.
  const live = run.foes.filter((f) => f.alive);
  for (let i = 0; i < live.length; i++)
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i],
        b = live[j],
        dx = b.x - a.x,
        dy = b.y - a.y,
        rr = a.def.r + b.def.r;
      if (dx * dx + dy * dy >= rr * rr) continue;
      const d = Math.hypot(dx, dy) || 1,
        push = (rr - d) / 2;
      const am = a === run.boss ? 0 : 1,
        bm = b === run.boss ? 0 : 1;
      a.x -= (dx / d) * push * am * (bm ? 1 : 2);
      a.y -= (dy / d) * push * am * (bm ? 1 : 2);
      b.x += (dx / d) * push * bm * (am ? 1 : 2);
      b.y += (dy / d) * push * bm * (am ? 1 : 2);
    }
}

function shoot(run: Run, f: Foe, p: Pattern) {
  const h = run.hero,
    at = Math.atan2(h.y - f.y, h.x - f.x),
    boss = f === run.boss,
    r = p.r ?? (boss ? 7 : 5),
    dmg = p.dmg * run.setup.zone.dmg,
    speed = p.speed * DIALS.speed;
  const add = (a: number) => run.bullets.push({ id: ++run.ids, x: f.x, y: f.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, dmg, born: run.t, boss });
  if (p.kind === 'aimed') for (let i = 0; i < p.n; i++) add(at + (i - (p.n - 1) / 2) * 0.12);
  else if (p.kind === 'spread') for (let i = 0; i < p.n; i++) add(at + (p.n === 1 ? 0 : (i / (p.n - 1) - 0.5) * (p.arc ?? 0.5)));
  else if (p.kind === 'ring') {
    const off = run.rnd() * Math.PI * 2;
    for (let i = 0; i < p.n; i++) add(off + (i / p.n) * Math.PI * 2);
  } else {
    f.spin += 0.32;
    for (let i = 0; i < p.n; i++) add(f.spin + (i / p.n) * Math.PI * 2);
  }
  emit(run, { type: 'shoot', x: f.x, y: f.y, boss });
}

function moveBullets(run: Run) {
  const h = run.hero;
  run.bullets = run.bullets.filter((b) => {
    b.x += b.vx * STEP;
    b.y += b.vy * STEP;
    if (b.x < ROOM.wall || b.x > ROOM.w - ROOM.wall || b.y < ROOM.wall || b.y > ROOM.h - ROOM.wall) return false;
    if (Math.hypot(b.x - h.x, b.y - h.y) < b.r + HERO_R - 2) {
      if (run.t < run.ghostUntil) return true;
      hurt(run, b.dmg, 'shot');
      return false;
    }
    return true;
  });
}

function steerBoss(run: Run, b: Foe) {
  const h = run.hero,
    now = run.t,
    which = run.setup.zone.boss,
    dx = h.x - b.x,
    dy = h.y - b.y,
    d = Math.hypot(dx, dy) || 1;
  if (which === 'tomorrow') {
    b.vx = (dx / d) * b.speed;
    b.vy = (dy / d) * b.speed;
    if (d <= TOMORROW_REACH) return;
    b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.03 * STEP);
    run.bossClock += STEP;
    if (run.bossClock >= 8) {
      run.bossClock = 0;
      for (let i = 0; i < 3; i++) {
        const a = run.rnd() * Math.PI * 2;
        addFoe(run, 'slime', b.x + Math.cos(a) * 50, b.y + Math.sin(a) * 50);
      }
      emit(run, { type: 'say', text: 'Tomorrow splits while you wait' });
    }
    return;
  }
  if (which === 'mirror') {
    const v = d > 220 ? b.speed : d < 160 ? -b.speed : 0;
    b.vx = (dx / d) * v;
    b.vy = (dy / d) * v;
    run.bossSummon -= STEP;
    if (run.bossSummon > 0) return;
    run.bossSummon = 5;
    const alive = run.foes.filter((f) => f.alive && f.kind === 'reflection').length;
    for (let i = 0; i < Math.min(2, 6 - alive); i++) {
      const side = (i === 0 ? 1 : -1) * 40;
      addFoe(run, 'reflection', b.x + dx * 0.45 - (dy / d) * side, b.y + dy * 0.45 + (dx / d) * side);
    }
    return;
  }
  if (which === 'knight') {
    run.bossClock -= STEP;
    if (run.bossClock <= 0) {
      run.bossClock = 8;
      emit(run, { type: 'shout', x: b.x, y: b.y });
      emit(run, { type: 'say', text: '"Not good enough!" Keep hitting.' });
      if (d < 260) run.shove = { until: now + 0.45, x: (dx / d) * 320, y: (dy / d) * 320 };
    }
    b.vx = (dx / d) * b.speed;
    b.vy = (dy / d) * b.speed;
    return;
  }
  // The Hollow (and for now the Plateau and the Summit): wind up, dash, call the fog.
  if (now < b.windUntil) {
    b.vx = b.vy = 0;
    return;
  }
  if (b.windUntil && now < b.dashUntil) {
    b.vx = b.dashX * DASH.speed;
    b.vy = b.dashY * DASH.speed;
    return;
  }
  if (b.dashUntil && now >= b.dashUntil) b.windUntil = b.dashUntil = 0;
  b.vx = (dx / d) * b.speed;
  b.vy = (dy / d) * b.speed;
  run.bossDash -= STEP;
  run.bossSummon -= STEP;
  if (run.bossDash <= 0) {
    run.bossDash = DASH.every;
    b.windUntil = now + DASH.wind;
    b.dashUntil = now + DASH.wind + DASH.dash;
    b.dashX = dx / d;
    b.dashY = dy / d;
    emit(run, { type: 'dash', x: b.x, y: b.y, toX: b.x + b.dashX * 210, toY: b.y + b.dashY * 210 });
  }
  if (run.bossSummon <= 0) {
    run.bossSummon = 10;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      addFoe(run, 'wisp', b.x + Math.cos(a) * 60, b.y + Math.sin(a) * 60);
    }
  }
}

// ---------- hitting ----------

const pow = (run: Run, base: number) => heroDamage(base, run.setup.power, run.ups);

function nearest(run: Run, x: number, y: number, skip?: Set<Foe>, within = Infinity): Foe | null {
  let best: Foe | null = null,
    bd = within * within;
  for (const f of run.foes) {
    if (!f.alive || skip?.has(f) || run.t < f.bornUntil) continue;
    const d = (f.x - x) ** 2 + (f.y - y) ** 2;
    if (d < bd) {
      bd = d;
      best = f;
    }
  }
  return best;
}

function damage(run: Run, f: Foe, amount: number, knock = 0, fromX = run.hero.x, fromY = run.hero.y) {
  if (!f.alive || run.t < f.bornUntil) return;
  const boss = f === run.boss;
  const dmg = boss && run.setup.zone.boss === 'knight' ? 1 : Math.max(1, Math.round(amount));
  if (f.kind === 'reflection') hitYourself(run);
  f.hp -= dmg;
  emit(run, { type: 'hit', id: f.id, x: f.x, y: f.y, dmg, boss });
  if (knock > 0 && !boss) {
    const dx = f.x - fromX,
      dy = f.y - fromY,
      d = Math.hypot(dx, dy) || 1;
    f.vx = (dx / d) * knock;
    f.vy = (dy / d) * knock;
    f.knockUntil = run.t + 0.14;
  }
  if (f.hp <= 0) kill(run, f);
}

function kill(run: Run, f: Foe) {
  f.alive = false;
  run.kills++;
  emit(run, { type: 'kill', x: f.x, y: f.y, kind: f.kind });
  if (f.def.xp > 0) run.gems.push({ id: ++run.ids, x: f.x, y: f.y, value: f.def.xp, pulled: false });
  if (f === run.boss) end(run, true, 'boss');
}

function hitYourself(run: Run) {
  if (run.over || run.t < run.mirrorHurtAt) return;
  if (!run.mirrorHurtAt) emit(run, { type: 'say', text: 'That was you. Walk past your reflections.' });
  run.mirrorHurtAt = run.t + 0.3;
  run.hp -= 2;
  if (run.hp <= 0) end(run, false, 'hp');
}

function burst(run: Run, x: number, y: number, R: number, dmg: number, color: Extract<GameEvent, { type: 'burst' }>['color'], skip?: Foe, knock = 160) {
  for (const f of run.foes) if (f.alive && f !== skip && Math.hypot(f.x - x, f.y - y) <= R) damage(run, f, dmg, knock, x, y);
  emit(run, { type: 'burst', x, y, r: R, color });
}

function fire(run: Run, kind: 'arrow' | 'orb', angle: number, speed: number, dmg: number, pierce: number, target: Foe | null) {
  const h = run.hero;
  run.shots.push({ id: ++run.ids, kind, x: h.x, y: h.y - 6, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, dmg, pierce, target, hit: new Set(), dies: run.t + 1.6 });
}

function attack(run: Run) {
  const h = run.hero;
  run.cd.attack -= STEP;
  if (run.cd.attack > 0) return;
  const kind = attackOf(run.setup.classId),
    reach = kind === 'slash' ? SLASH_REACH : RANGE,
    b = run.boss?.alive && run.setup.zone.boss !== 'mirror' && run.t >= run.boss.bornUntil && dist(run.boss, h) <= reach ? run.boss : null,
    target = b ?? nearest(run, h.x, h.y, undefined, reach);
  if (!target && kind !== 'wave') return;
  if (kind === 'wave' && !nearest(run, h.x, h.y, undefined, 150)) return;
  run.cd.attack = attackCooldown(kind, run.setup.power, run.ups);
  const n = 1 + (run.ups.multi ?? 0),
    dmg = pow(run, ATTACK[kind].dmg),
    angle = target ? Math.atan2(target.y - h.y, target.x - h.x) : h.facing;
  emit(run, { type: 'attack', kind, x: h.x, y: h.y, angle, n, r: kind === 'slash' ? SLASH_REACH - 10 : undefined });
  if (kind === 'arrow') {
    for (let i = 0; i < n; i++) fire(run, 'arrow', angle + (i - (n - 1) / 2) * 0.16, 430, dmg, 1, null);
  } else if (kind === 'orb' && target) {
    const hit = new Set<Foe>();
    for (let i = 0; i < n; i++) {
      const t = nearest(run, h.x, h.y, hit, RANGE) ?? target;
      hit.add(t);
      fire(run, 'orb', Math.atan2(t.y - h.y, t.x - h.x) + (i - (n - 1) / 2) * 0.4, 250, dmg, 0, t);
    }
  } else if (kind === 'wave') {
    for (let i = 0; i < n; i++) later(run, i * 0.18, () => burst(run, run.hero.x, run.hero.y, 110 + i * 20, dmg, 'wave'));
  } else {
    for (let i = 0; i < n; i++) slash(run, angle + (i * Math.PI * 2) / n, dmg);
  }
}

function slash(run: Run, angle: number, dmg: number) {
  const R = SLASH_REACH - 10,
    h = run.hero;
  for (const f of run.foes) {
    if (!f.alive) continue;
    const d = dist(f, h);
    if (d > R + f.def.r) continue;
    let diff = Math.atan2(f.y - h.y, f.x - h.x) - angle;
    diff = Math.abs(Math.atan2(Math.sin(diff), Math.cos(diff)));
    if (diff < 1.3 || d < 22) damage(run, f, dmg, 140);
  }
  // A sword swing also knocks shots out of the air.
  run.bullets = run.bullets.filter((b) => {
    const d = Math.hypot(b.x - h.x, b.y - h.y);
    if (d > R + 10) return true;
    const diff = Math.atan2(b.y - h.y, b.x - h.x) - angle;
    return Math.abs(Math.atan2(Math.sin(diff), Math.cos(diff))) >= 1.3;
  });
}

function moveShots(run: Run) {
  run.shots = run.shots.filter((s) => {
    if (run.t > s.dies) return false;
    if (s.kind === 'orb') {
      if (!s.target?.alive) s.target = nearest(run, s.x, s.y, undefined, 300);
      if (s.target) {
        const a = Math.atan2(s.target.y - s.y, s.target.x - s.x);
        s.vx = Math.cos(a) * 250;
        s.vy = Math.sin(a) * 250;
      }
    }
    s.x += s.vx * STEP;
    s.y += s.vy * STEP;
    if (s.x < ROOM.wall || s.x > ROOM.w - ROOM.wall || s.y < ROOM.wall || s.y > ROOM.h - ROOM.wall) return false;
    let f: Foe | null = null;
    for (const o of run.foes) if (o.alive && !s.hit.has(o) && run.t >= o.bornUntil && Math.hypot(o.x - s.x, o.y - s.y) < o.def.r + 6) f = o;
    if (!f) return true;
    s.hit.add(f);
    if (s.kind === 'orb') {
      damage(run, f, s.dmg, 60, s.x, s.y);
      burst(run, s.x, s.y, 56, s.dmg * 0.5, 'orb', f);
      return false;
    }
    damage(run, f, s.dmg, 90, s.x, s.y);
    return s.pierce-- > 0;
  });
}

function chain(run: Run, jumps: number, dmg: number) {
  const hit = new Set<Foe>(),
    points = [{ x: run.hero.x, y: run.hero.y - 10 }];
  let from = { x: run.hero.x, y: run.hero.y };
  for (let i = 0; i < jumps; i++) {
    const f = nearest(run, from.x, from.y, hit, i === 0 ? 300 : 160);
    if (!f) break;
    hit.add(f);
    points.push({ x: f.x, y: f.y });
    from = { x: f.x, y: f.y };
  }
  if (points.length < 2) return;
  emit(run, { type: 'chain', points });
  hit.forEach((f) => damage(run, f, dmg, 30));
}

function skills(run: Run) {
  const { power } = run.setup,
    h = run.hero,
    now = run.t;
  if (power.fireballs) {
    run.cd.fireball -= STEP;
    if (run.cd.fireball <= 0) {
      const target = nearest(run, h.x, h.y, undefined, RANGE);
      run.cd.fireball = target ? FIREBALL.every : 0.3;
      if (target) {
        const tx = target.x,
          ty = target.y;
        later(run, FIREBALL.flightMs / 1000, () => burst(run, tx, ty, FIREBALL.r, pow(run, FIREBALL.dmg), 'fire'));
      }
    }
  }
  if (power.fairy && run.hp < run.maxHp * FAIRY.below && now >= run.fairyAt) {
    run.fairyAt = now + FAIRY.restMs / 1000;
    const heal = Math.round(run.maxHp * FAIRY.heal);
    run.hp = Math.min(run.maxHp, run.hp + heal);
    emit(run, { type: 'heal', x: h.x, y: h.y, n: heal });
    emit(run, { type: 'say', text: `${power.flameName || 'Your flame'} heals you` });
  }
  if (run.flames > 0) {
    run.orbit += STEP * FLAME.spin;
    for (let i = 0; i < run.flames; i++) {
      const a = run.orbit + (i / run.flames) * Math.PI * 2,
        fx = h.x + Math.cos(a) * FLAME.orbit,
        fy = h.y + Math.sin(a) * FLAME.orbit;
      for (const f of run.foes) {
        if (!f.alive || now < f.flameAt || Math.hypot(f.x - fx, f.y - fy) >= FLAME.touch + f.def.r - 10) continue;
        f.flameAt = now + FLAME.every / 1000;
        damage(run, f, pow(run, FLAME.dmg), 60, fx, fy);
      }
      // A flame also eats the shots it touches.
      run.bullets = run.bullets.filter((b) => Math.hypot(b.x - fx, b.y - fy) > 12);
    }
  }
  const spark = run.ups.spark ?? 0;
  if (spark > 0) {
    run.cd.spark -= STEP;
    if (run.cd.spark <= 0) {
      run.cd.spark = 2;
      const hit = sparkHit(spark);
      chain(run, hit.jumps, pow(run, hit.dmg));
    }
  }
  const nova = run.ups.nova ?? 0;
  if (nova > 0) {
    run.cd.nova -= STEP;
    if (run.cd.nova <= 0) {
      run.cd.nova = 3;
      const hit = novaHit(nova);
      // The burst of light also wipes the shots inside it.
      clearBullets(run, h.x, h.y, hit.r);
      burst(run, h.x, h.y, hit.r, pow(run, hit.dmg), 'nova');
    }
  }
}

// ---------- light, levels, rooms ----------

function pullGems(run: Run) {
  const h = run.hero,
    reach = gemReach(run.setup.power, run.ups);
  run.gems = run.gems.filter((g) => {
    const dx = h.x - g.x,
      dy = h.y - g.y,
      d = Math.hypot(dx, dy);
    if (d < 16) {
      emit(run, { type: 'gem' });
      gain(run, g.value);
      return false;
    }
    // Once a room is clear, all its light comes to you.
    if (g.pulled || d < reach || run.cleared) {
      g.pulled = true;
      const step = Math.min(d, run.cleared ? 12 : 7);
      g.x += (dx / d) * step;
      g.y += (dy / d) * step;
    }
    return true;
  });
}

function checkRoom(run: Run) {
  if (run.cleared || isBossRoom(run)) return;
  const alive = run.foes.filter((f) => f.alive).length;
  if (run.waves.length && alive <= 2 && !run.timers.length) later(run, 0.8, () => nextWave(run));
  if (!run.waves.length && alive === 0) {
    run.cleared = true;
    run.doorOpen = true;
    run.bullets = [];
    emit(run, { type: 'clear' });
  }
}

function gain(run: Run, n: number) {
  run.xp += n;
  while (run.xp >= xpToNext(run.level)) {
    run.xp -= xpToNext(run.level);
    run.level++;
    run.pendingLevels++;
  }
  if (run.pendingLevels > 0 && !run.offer) offer(run, null);
}

function offer(run: Run, free: FreePick | null) {
  const choices = rollUpgrades(run.ups, run.rnd);
  if (choices.length === 0) {
    run.pendingLevels = 0;
    run.free = [];
    run.hp = Math.min(run.maxHp, run.hp + 20);
    return;
  }
  if (!free) run.pendingLevels--;
  run.offer = { choices, free };
  if (run.setup.autoPick) pick(run, BOT_PICKS.find((id) => choices.includes(id)) ?? choices[0]);
}

export function pick(run: Run, id: UpgradeId) {
  if (!run.offer) return;
  run.offer = null;
  run.ups[id] = (run.ups[id] ?? 0) + 1;
  if (id === 'vital') {
    run.maxHp += 25;
    run.hp = run.maxHp;
  }
  if (id === 'flame') run.flames = run.setup.power.flames + (run.ups.flame ?? 0);
  if (run.free.length) offer(run, run.free.shift()!);
  else if (run.pendingLevels > 0) offer(run, null);
}

// ---------- getting hit, ending ----------

function hurt(run: Run, dmg: number, by: 'shot' | 'touch') {
  const now = run.t;
  if (run.over || now < run.hurtUntil || now < run.ghostUntil) return;
  const taken = dmg * (1 - armorOf(run.setup.power, run.ups));
  run.hp -= taken;
  run.hurtUntil = now + INVULNERABLE;
  emit(run, { type: 'hurt', x: run.hero.x, y: run.hero.y, dmg: Math.round(taken), by });
  if (run.hp <= 0) end(run, false, 'hp');
}

function end(run: Run, won: boolean, why: RunEnd['why']) {
  if (run.over) return;
  run.over = {
    won,
    seconds: Math.floor(run.t),
    kills: run.kills,
    level: run.level,
    hp: won ? Math.max(0, Math.ceil(run.hp)) : 0,
    maxHp: run.maxHp,
    floor: run.floor + 1,
    room: run.room + 1,
    bossAt: run.bossAt === null ? null : Math.floor(run.bossAt),
    why,
  };
  if (!won) run.hp = 0;
}

/** Developer mode: end the run as if the boss fell. */
export function winNow(run: Run) {
  end(run, true, 'boss');
}

/** Developer mode: straight to the boss's room. */
export function skipToBoss(run: Run) {
  if (run.boss) return;
  run.floor = run.layout.floors - 1;
  run.room = run.layout.rooms - 1;
  run.timers = [];
  enterRoom(run);
}

/** Drains what happened since the last call. */
export function takeEvents(run: Run): GameEvent[] {
  const e = run.events;
  run.events = [];
  return e;
}
