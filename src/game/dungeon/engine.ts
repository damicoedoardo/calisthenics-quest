import type { ClassId } from '@/lib/gear';
import { rollUpgrades, xpToNext, type Edge, type Power, type UpgradeId, type Zone } from '@/lib/fog';
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
import {
  ABILITIES,
  type AbilityId,
  type Ally,
  type AllyKind,
  type CellKind,
  BARREL,
  BLINK,
  BOSSES,
  BOSS_HP,
  CHARGE,
  CLASS_BODY,
  CLIMB,
  CRACK,
  CREW,
  DIALS,
  DIM,
  DODGE,
  ELITE,
  type FoeKind,
  GALE,
  HOMING,
  LAYOUT,
  LIGHT,
  type Layout,
  MEET,
  MINE,
  MONSTERS,
  type MonsterDef,
  type MonsterKind,
  PLATE_EVERY,
  type Pattern,
  RAMP,
  RELICS,
  RELIC_BOT,
  ROOM_KINDS,
  ROOM_ODDS,
  type RelicId,
  type RoomKind,
  SAND,
  SHRINE,
  SPIKES,
  SPLIT,
  SWAP,
  type ShotStyle,
  TOMORROW_REACH,
  WATER,
  CLEAR_RUN,
  abilityOf,
  midBoss,
  zoneDungeon,
} from './content';
import { seeded } from '@/lib/random';
import { BAG, DROP_LUCK, DROPS } from '@/balance';
import type { Build } from '@/lib/stats';
import { ITEM_SLOTS, itemScore, itemTotals, rollItem, rollRarity, shortOf, starterKit, type Item, type ItemSlot } from './items';

export * from './items';

/* The Fog as a dungeon: floor after floor of rooms, monsters that shoot patterns you dodge, and the
   zone's boss at the bottom. Die anywhere and the next run starts again from the first floor.

   This file is the whole game and nothing else: plain data and math, a fixed 60 steps a second,
   every roll from a seeded generator. The Phaser scene (scene.ts) only draws what it finds here and
   turns events into sound and sparks; the simulator plays this same code with the bot (bot.ts), so
   what balance tests measure is exactly the game people play. */

/** The dungeon's data lives in content.ts; everything that reads the engine finds it here too. */
export * from './content';

export const STEP = 1 / 60;
/** How far your flame's fires circle you. */
export const FLAME_RING = FLAME.orbit;
/** A room, in world pixels: the smallest is about a phone screen, deeper ones run taller and the
    camera follows you. Walls are drawn inside it. */
export const ROOM = { w: 420, h: 760, wall: 22, door: 84 };

const WARD_EVERY = 12;
/** How many of a relic a hero has. */
export const relic = (h: Pick<Hero, 'relics'>, id: RelicId) => h.relics[id] ?? 0;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Terrain {
  water: Rect[];
  /** Stone pillars: block you, monsters, and every shot. Cover. */
  pillars: { x: number; y: number; r: number }[];
  spikes: (Rect & { phase: number })[];
  barrels: { id: number; x: number; y: number; alive: boolean }[];
  shrine: { x: number; y: number; used: boolean } | null;
}

export const inRect = (r: Rect, x: number, y: number, pad = 0) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;

/** Where a patch of spikes is in its cycle at run time t. */
export function spikeState(s: { phase: number }, t: number): 'down' | 'warn' | 'up' {
  const c = (t + s.phase) % SPIKES.every;
  return c >= SPIKES.every - SPIKES.up ? 'up' : c >= SPIKES.every - SPIKES.up - SPIKES.warn ? 'warn' : 'down';
}
const HERO_R = 10;
/** After a hit you can't be hit again for this long (s). */
const INVULNERABLE = 0.5;
/** A boss you can't bring down in this long (s): the Fog closes in. */
export const BOSS_LIMIT = 180;
/** A run can't last longer than this (s), so a stuck run still ends. */
const RUN_LIMIT = 2400;

/** The floor (from 0) whose last room holds the Warden, or -1 when the dungeon is too short for one. */
export const wardenFloor = (layout: Layout) => (layout.floors >= 4 ? Math.floor(layout.floors / 2) - 1 : -1);
/** The room of the map you're in. */
export const cellOf = (r: Pick<Run, 'map'>) => r.map.cells[r.map.at];
export const isWardenRoom = (r: Pick<Run, 'map'>) => cellOf(r).kind === 'warden';

/** Floor 1 to 10 of the 10, whatever the layout. */
const floorOf10 = (run: Run) => Math.round(depth(run) * 9);

const bodyOf = (h: Hero) => CLASS_BODY[attackOf(h.classId)];


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
  /** When its next charge or blink starts (run seconds). */
  act: number;
  /** Bigger, tougher, worth more (elite rooms). */
  elite: boolean;
  /** 2 once a two-phase foe (the Warden) is past half its HP. */
  phase: number;
  /** When you last hit it (run seconds). */
  hitAt: number;
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
  style: ShotStyle;
  /** Heading and full speed, for the shots that turn or speed up. */
  ang: number;
  spd: number;
  /** Bounces off walls left. */
  bounce: number;
}

/** A lobbed bomb: lands, then bursts at `at`. */
export interface Mine {
  id: number;
  x: number;
  y: number;
  r: number;
  dmg: number;
  /** When it lands, and when it bursts (run seconds). */
  lands: number;
  at: number;
  /** Shots it throws when it bursts. */
  n: number;
  speed: number;
}

export interface Shot {
  id: number;
  /** Whose it is: they get the kill. */
  by: Hero;
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
  | { type: 'kill'; id: number; x: number; y: number; kind: FoeKind; elite: boolean }
  | { type: 'hurt'; x: number; y: number; dmg: number; by: 'shot' | 'touch' | 'image' | 'reflection' }
  | { type: 'shoot'; x: number; y: number; boss: boolean }
  | { type: 'burst'; x: number; y: number; r: number; color: 'nova' | 'orb' | 'wave' | 'fire' | 'ability' }
  | { type: 'chain'; points: { x: number; y: number }[] }
  | { type: 'ability'; id: AbilityId; x: number; y: number; toX: number; toY: number }
  | { type: 'dodge'; x: number; y: number; toX: number; toY: number }
  | { type: 'warden' }
  | { type: 'phase'; x: number; y: number }
  | { type: 'heal'; x: number; y: number; n: number }
  | { type: 'gem' }
  | { type: 'spawn'; x: number; y: number; kind: FoeKind }
  | { type: 'room' }
  | { type: 'clear' }
  | { type: 'floor'; floor: number }
  | { type: 'boss' }
  | { type: 'dash'; x: number; y: number; toX: number; toY: number }
  | { type: 'shout'; x: number; y: number }
  | { type: 'boom'; x: number; y: number; r: number }
  | { type: 'blink'; x: number; y: number; toX: number; toY: number }
  | { type: 'wind'; id: number }
  | { type: 'shrine'; x: number; y: number }
  | { type: 'chest'; x: number; y: number }
  | { type: 'relic'; id: RelicId }
  | { type: 'ward'; x: number; y: number }
  | { type: 'crack'; x: number; y: number; n: number }
  /** Tomorrow splits, or the Mirror splits into its images. */
  | { type: 'split' }
  | { type: 'shatter'; x: number; y: number }
  | { type: 'hand'; x: number; y: number }
  | { type: 'light'; on: boolean; x: number; y: number }
  | { type: 'ledge'; height: number }
  | { type: 'help'; kind: AllyKind; x: number; y: number; toX: number; toY: number }
  /** The Foreman mends its crew; the Whisper trades places with a wisp; the Gale gusts. */
  | { type: 'repair'; x: number; y: number }
  | { type: 'swap'; x: number; y: number; toX: number; toY: number }
  | { type: 'gust'; x: number; y: number }
  /** The mid-boss speaks (in the speech bubble, over it). */
  | { type: 'midSay'; text: string }
  | { type: 'say'; text: string }
  /** Something to wear: dropped on the floor, or picked up into the bag. */
  | { type: 'drop'; x: number; y: number; item: Item }
  | { type: 'loot'; item: Item };

/** Why a run starts with a free skill: trained lately, rested, or a workout since the boss lost its hearts. */
export type FreePick = 'fresh' | 'rested' | 'past';

/** Who walks into a run: their power from training, their class, what they wear, their stat points. */
export interface HeroSetup {
  power: Power;
  classId: ClassId | undefined;
  /** What you walk in wearing (an empty weapon or armor slot gets the free starter kit). */
  worn?: Partial<Record<ItemSlot, Item>>;
  /** Stat points spent, which items ask for. */
  build?: Build;
  /** The chapter's hearts are gone: a weaker boss and free skills at the start (`edgeFor` in src/lib/fog.ts). */
  edge?: Edge;
}

/** A run: where, its seed, and you (the first hero). `friends` walk in with you, in co-op. */
export interface RunSetup extends HeroSetup {
  zone: Zone;
  seed: number;
  /** Skills are taken by the bot's order instead of waiting for a pick (and items the bot likes
      are worn, and the stairs always go deeper). */
  autoPick?: boolean;
  layout?: Layout;
  /** More heroes in the party, after you (co-op). */
  friends?: HeroSetup[];
}

/** How many items the bag holds, and how often things drop (src/balance/items.ts). */
export { BAG, DROPS };

export interface Input {
  /** Where you push the stick, each in [-1, 1]. */
  x: number;
  y: number;
  /** The ability button went down this step. */
  ability: boolean;
  /** The dodge button went down this step. */
  dodge?: boolean;
  /** A monster tapped this step: your attacks go to it while it's in reach (null lets go). */
  lock?: number | null;
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
  /** 'left' is walking out by the stairs: not a win, but you keep what you carry. */
  why: 'boss' | 'hp' | 'limit' | 'left';
  /** What you wore and carried at the end (the starter kit left out). Lost unless you won or left. */
  gear: { worn: Partial<Record<ItemSlot, Item>>; bag: Item[] };
  /** How many ledges of the Summit's climb you went up, or null off the Summit. */
  height: number | null;
}

/** One hero in a run: where they stand, their body, their growth and what they carry. Solo play is
    a party of one; all of it is per player so a co-op run can hold several. */
export interface Hero {
  /** Place in the party, from 0 (you). */
  id: number;
  classId: ClassId | undefined;
  /** Stat points spent, which items ask for. */
  build: Build;
  /** Power from training with what you wear on top (see applyGear). */
  power: Power;
  /** Where you stand (px), how you're moving, and which way you face. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  /** The monster you tapped, which your attacks go to first while it's in reach. */
  lock: number | null;
  relics: Partial<Record<RelicId, number>>;
  /** Your power before what you wear, then what you wear and carry. */
  base: Power;
  gear: { worn: Partial<Record<ItemSlot, Item>>; bag: Item[] };
  /** What worn items add that Power has no field for. */
  gearFx: { move: number; heal: number; cooldown: number };
  /** Max HP that comes from your power and gear (the rest is relics and skills). */
  gearMax: number;
  /** Three items to pick from, from an opened chest: the run holds still until one is taken. */
  relicOffer: RelicId[] | null;
  /** The Ward Charm's ward is up from then. */
  wardAt: number;
  hp: number;
  maxHp: number;
  xp: number;
  level: number;
  kills: number;
  hurtUntil: number;
  /** Untouchable until then (dodge, charge, blink). */
  ghostUntil: number;
  /** A rush in a straight line: the warrior's charge (it hits what it passes) or a dodge (it doesn't). */
  charge: { until: number; x: number; y: number; hit: Set<Foe>; harm: boolean } | null;
  /** The dodge is ready again then. */
  dodgeAt: number;
  /** The Gale's gust on you (px/s), added to how you walk. */
  wind: { x: number; y: number };
  shove: { until: number; x: number; y: number };
  ability: AbilityId;
  abilityAt: number;
  cd: { attack: number; spark: number; nova: number; fireball: number };
  ups: Partial<Record<UpgradeId, number>>;
  flames: number;
  orbit: number;
  fairyAt: number;
  mirrorHurtAt: number;
  free: FreePick[];
  pendingLevels: number;
  /** A pick waiting for the player: the run holds still until it's made. */
  offer: { choices: UpgradeId[]; free: FreePick | null } | null;
}

export interface Run {
  setup: RunSetup;
  layout: Layout;
  rnd: () => number;
  t: number;
  ids: number;
  /** From 0. The last room of the last floor is the boss's. */
  floor: number;
  /** Rooms you've walked into on this floor, less one. */
  room: number;
  /** This floor's rooms and how they join. */
  map: FloorMap;
  /** This room's size, and what's on its floor. */
  area: { w: number; h: number };
  terrain: Terrain;
  /** Waves still to come in this room. */
  waves: MonsterKind[][];
  mines: Mine[];
  /** This room's kind (the floor's last room fights as a plain one), its doors (open once it's
      clear), and the stairs down, once the floor's last room is clear. */
  kind: RoomKind;
  doors: Door[];
  chest: { x: number; y: number; opened: boolean } | null;
  stairs: { x: number; y: number } | null;
  /** Items on the floor here. */
  /** Items on the floor. In a party each one is for one hero (`for`, their id): only they see and take it. */
  loot: { id: number; x: number; y: number; item: Item; full?: boolean; for?: number }[];
  /** Standing on the stairs: deeper, or out with what you carry? The run holds still. */
  stairsAsk: boolean;
  /** Monsters already met this run (their first time gets a line). */
  met: Set<MonsterKind>;
  cleared: boolean;
  doorOpen: boolean;
  /** Everyone in the run, you first. A hero at 0 HP is down; the run ends when all are. */
  party: Hero[];
  /** You: the party's first hero, the one this phone plays and the camera follows. The rules
      treat every hero the same; only the Summit's friends walk beside this one. */
  hero: Hero;
  /** The floor-5 mid-boss (the Warden of the Ashes, the Drowned Lantern...) while it stands. */
  warden: Foe | null;
  /** How far you see while the Drowned Lantern burns (px), or null. */
  dim: number | null;
  foes: Foe[];
  bullets: Bullet[];
  shots: Shot[];
  gems: Gem[];
  timers: { at: number; run: () => void }[];
  boss: Foe | null;
  bossAt: number | null;
  bossClock: number;
  bossSummon: number;
  /** The Hollow: how long you've stood in its light, this time it's open (s). */
  hold: number;
  /** The Summit: ledges climbed so far, or null before the climb. */
  climb: number | null;
  /** Friends who climb with you on the Summit. */
  allies: Ally[];
  events: GameEvent[];
  over: RunEnd | null;
  paused: boolean;
}


/** On the Summit, the boss's room is the first ledge of the climb, and every ledge after it. */
const climbing = (run: Run) => run.setup.zone.boss === 'summit' && isBossRoom(run);
export const isBossRoom = (r: Pick<Run, 'map'>) => cellOf(r).kind === 'boss';
/** How far down this floor is, from 0 (the first) to 1 (the boss's). */
const depth = (run: Run) => (run.layout.floors > 1 ? run.floor / (run.layout.floors - 1) : 0);

export function createRun(setup: RunSetup): Run {
  const party = [setup, ...(setup.friends ?? [])].map((hs, id) => newHero(hs, id));
  const layout = setup.layout ?? LAYOUT;
  const run: Run = {
    setup,
    layout,
    rnd: seeded(setup.seed),
    t: 0,
    ids: 0,
    floor: 0,
    room: -1,
    map: makeFloor(layout, 0, floorSeed(setup.seed, 0)),
    area: { w: ROOM.w, h: ROOM.h },
    terrain: { water: [], pillars: [], spikes: [], barrels: [], shrine: null },
    waves: [],
    mines: [],
    met: new Set(['slime', 'wisp', 'golem', 'reflection', 'splitling']),
    kind: 'fight',
    doors: [],
    chest: null,
    stairs: null,
    loot: [],
    stairsAsk: false,
    cleared: false,
    doorOpen: false,
    party,
    hero: party[0],
    warden: null,
    dim: null,
    foes: [],
    bullets: [],
    shots: [],
    gems: [],
    timers: [],
    boss: null,
    bossAt: null,
    bossClock: 0,
    bossSummon: 0,
    hold: 0,
    climb: null,
    allies: [],
    events: [],
    over: null,
    paused: false,
  };
  for (const h of party) applyGear(run, h);
  enterRoom(run, null);
  for (const h of party) if (h.free.length) later(run, 0.7, () => offer(run, h, h.free.shift()!));
  return run;
}

function newHero(hs: HeroSetup, id: number): Hero {
  const base = hs.power,
    power = base,
    kit = starterKit(hs.classId),
    hp = 0;
  return {
    id,
    classId: hs.classId,
    build: hs.build ?? {},
    power: base,
    x: ROOM.w / 2, y: ROOM.h - 70, vx: 0, vy: 0, facing: -Math.PI / 2,
    lock: null,
    relics: {},
    base,
    gear: { worn: { weapon: hs.worn?.weapon ?? kit.weapon, armor: hs.worn?.armor ?? kit.armor, ...(hs.worn?.charm ? { charm: hs.worn.charm } : {}) }, bag: [] },
    gearFx: { move: 0, heal: 0, cooldown: 0 },
    gearMax: 0,
    relicOffer: null,
    wardAt: 0,
    hp,
    maxHp: hp,
    xp: 0,
    level: 1,
    kills: 0,
    hurtUntil: 0,
    ghostUntil: 0,
    charge: null,
    dodgeAt: 0,
    wind: { x: 0, y: 0 },
    shove: { until: 0, x: 0, y: 0 },
    ability: abilityOf(hs.classId),
    abilityAt: 0,
    cd: { attack: 0.5, spark: 2, nova: 3, fireball: 2.5 },
    ups: {},
    flames: power.flames,
    orbit: 0,
    fairyAt: 0,
    mirrorHurtAt: 0,
    free: [...(power.fresh ? (['fresh'] as const) : []), ...(power.rested ? (['rested'] as const) : []), ...Array<FreePick>(hs.edge?.picks ?? 0).fill('past')],
    pendingLevels: 0,
    offer: null,
  };
}

/** The heroes still standing. */
const standing = (run: Run) => run.party.filter((h) => h.hp > 0);
/** The hero a monster at x, y goes for: the nearest one still standing. */
function prey(run: Run, x: number, y: number): Hero {
  let best = run.party[0],
    bd = Infinity;
  for (const h of run.party) {
    if (h.hp <= 0 && run.party.length > 1) continue;
    const d = (h.x - x) ** 2 + (h.y - y) ** 2;
    if (d < bd) {
      bd = d;
      best = h;
    }
  }
  return best;
}
/** A hero is choosing (a skill, a chest item): the run holds still. */
const choosing = (run: Run) => run.party.some((h) => h.offer || h.relicOffer);

const later = (run: Run, s: number, fn: () => void) => run.timers.push({ at: run.t + s, run: fn });
const emit = (run: Run, e: GameEvent) => run.events.push(e);
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
// The same as Math.hypot(dx, dy) < r and > r, but most pairs are far apart, and a box test says so
// without the square root. Same answers to the last bit, so replays don't move.
const closer = (dx: number, dy: number, r: number) => dx < r && dx > -r && dy < r && dy > -r && Math.hypot(dx, dy) < r;
const farther = (dx: number, dy: number, r: number) => dx > r || dx < -r || dy > r || dy < -r || Math.hypot(dx, dy) > r;

// ---------- the floor's map ----------

/** A wall of a room, by the way it faces on the map. The scene draws each room turned a quarter
    (see scene.ts), so a room's top wall is east, the way on, and its left wall is north. */
export type Side = 'e' | 'w' | 'n' | 's';
const STEPS: Record<Side, [number, number]> = { e: [1, 0], w: [-1, 0], n: [0, -1], s: [0, 1] };
export const ACROSS: Record<Side, Side> = { e: 'w', w: 'e', n: 's', s: 'n' };

/** A room on the floor's map. */
export interface Cell {
  id: number;
  /** Where it is on the map: east is +gx, south is +gy. */
  gx: number;
  gy: number;
  kind: CellKind;
  /** The room through each of its doors. */
  links: Partial<Record<Side, number>>;
  /** Doors from the floor's first room: rooms further in hold more monsters. */
  dist: number;
  /** Seen through a door, walked into, cleared. */
  seen: boolean;
  visited: boolean;
  cleared: boolean;
  /** The room as you left it, so it's the same when you walk back in. */
  kept: { area: { w: number; h: number }; terrain: Terrain; chest: Run['chest']; loot: Run['loot'] } | null;
}
export interface FloorMap {
  cells: Cell[];
  /** The room you're in. */
  at: number;
}
/** A door of the room you're in: its middle, in the wall, and the room behind it. */
export interface Door {
  side: Side;
  x: number;
  y: number;
  to: number;
  kind: CellKind;
  /** You've been in the room behind it. */
  been: boolean;
}

/** Each floor's map has its own seed, so the fights in it don't change its shape. */
const floorSeed = (seed: number, floor: number) => (seed * 31 + floor * 7919 + 17) >>> 0;

/** A floor's map: a winding way east from the first room to the last (the stairs, the mid-boss or
    the boss), and rooms off to the side of it, where a dead end most often holds a chest or a
    shrine. Now and then two rooms side by side share a door too, so there's more than one way
    round. The last room has one door, the way in. */
export function makeFloor(layout: Layout, floor: number, seed: number): FloorMap {
  const rnd = seeded(seed),
    cells: Cell[] = [],
    grid = new Map<string, Cell>(),
    key = (x: number, y: number) => `${x},${y}`;
  const add = (gx: number, gy: number, kind: CellKind) => {
    const c: Cell = { id: cells.length, gx, gy, kind, links: {}, dist: 0, seen: false, visited: false, cleared: false, kept: null };
    cells.push(c);
    grid.set(key(gx, gy), c);
    return c;
  };
  const near = (c: Cell, s: Side) => grid.get(key(c.gx + STEPS[s][0], c.gy + STEPS[s][1]));
  const link = (a: Cell, s: Side, b: Cell) => {
    a.links[s] = b.id;
    b.links[ACROSS[s]] = a.id;
  };
  const grow = (c: Cell, s: Side, kind: CellKind) => {
    const n = add(c.gx + STEPS[s][0], c.gy + STEPS[s][1], kind);
    link(c, s, n);
    return n;
  };
  let rested = false;
  const draw = (odds: [RoomKind, number][]): RoomKind => {
    const opts = odds.filter(([k]) => !(k === 'elite' && floor === 0) && !(k === 'rest' && rested)),
      total = opts.reduce((n, [, o]) => n + o, 0);
    let r = rnd() * total;
    for (const [k, o] of opts) if ((r -= o) < 0) return k;
    return opts[0][0];
  };
  // The way: mostly east, sometimes up or down the map, never back on itself. Its last step is
  // always east, so the last room is entered from the west.
  const n = Math.max(2, layout.rooms);
  let c = add(0, 0, 'fight');
  for (let i = 1; i < n - 1; i++) {
    const turn: Side = rnd() < 0.5 ? 'n' : 's',
      s: Side = rnd() < 0.45 && !near(c, turn) ? turn : 'e';
    c = grow(c, s, 'fight');
  }
  const last = grow(c, 'e', floor === layout.floors - 1 ? 'boss' : floor === wardenFloor(layout) ? 'warden' : 'stairs');
  // Rooms off to the side: off the way, or off another side room.
  const sides = layout.side ? layout.side - 1 + Math.floor(rnd() * 3) : 0;
  const way = cells.length;
  for (let left = sides, tries = 0; left > 0 && tries < 60; tries++) {
    const from = cells[Math.floor(rnd() * cells.length)],
      open = (['n', 's', 'e', 'w'] as Side[]).filter((s) => !near(from, s));
    if (from === last || !open.length) continue;
    grow(from, open[Math.floor(rnd() * open.length)], 'fight');
    left--;
  }
  // A few shortcuts between rooms side by side (never into the last room).
  for (const a of cells)
    for (const s of ['e', 's'] as Side[]) {
      const b = near(a, s);
      if (b && a.links[s] === undefined && a !== last && b !== last && rnd() < 0.25) link(a, s, b);
    }
  // What each room holds: the way's rooms are mostly fights; a dead end most often a chest.
  for (const x of cells) {
    if (x.id === 0 || x === last) continue;
    x.kind = draw(x.id < way ? ROOM_ODDS.way : Object.keys(x.links).length === 1 ? ROOM_ODDS.end : ROOM_ODDS.side);
    if (x.kind === 'rest') rested = true;
  }
  // How far in each room is.
  const todo = [cells[0]],
    done = new Set([0]);
  while (todo.length) {
    const a = todo.shift()!;
    for (const id of Object.values(a.links))
      if (id !== undefined && !done.has(id)) {
        done.add(id);
        cells[id].dist = a.dist + 1;
        todo.push(cells[id]);
      }
  }
  return { cells, at: 0 };
}

// ---------- rooms and floors ----------

/** What a room holds: a budget of monsters that grows with depth (and the room's size), in three
    waves; each floor ends with a golem. New kinds join deeper down, and show up more on the floor
    they first appear. */
function fillRoom(run: Run): MonsterKind[][] {
  const room = cellOf(run).dist,
    deep = depth(run),
    fl = floorOf10(run),
    size = Math.sqrt((run.area.w * run.area.h) / (ROOM.w * ROOM.h));
  const budget = (6 + 10 * deep + room + (run.climb ?? 0) * 1.5) * DIALS.crowd * size * (run.kind === 'elite' ? ELITE.crowd : 1);
  const mix = zoneDungeon(run.setup.zone).unlock.filter(([, from]) => fl >= from).map(([k, from, w]): [MonsterKind, number] => [k, from === fl && fl > 0 ? w * 2.5 : k === 'slime' ? Math.max(1, w - fl * 0.25) : w]);
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
  if (run.climb !== null ? run.climb % 2 === 1 : cellOf(run).kind === 'stairs') waves[2].push('golem');
  return waves;
}

/** How big a room is: never smaller than a phone screen, taller deeper down. The boss's is fixed. */
function roomSize(run: Run) {
  if (climbing(run)) return { w: 460, h: 860 + Math.round(run.rnd() * 4) * 40 };
  if (isBossRoom(run)) return { w: 480, h: 900 };
  if (isWardenRoom(run)) return { w: 460, h: 860 };
  return { w: ROOM.w + Math.round(run.rnd() * 5) * 20, h: ROOM.h + Math.round(run.rnd() * (3 + 5 * depth(run))) * 30 };
}

/** The room's floor: pillars in mirrored pairs, pools of water, spikes and barrels deeper down, and
    a shrine in a rest room. Kept off the lanes in from each wall's door, where you walk in. */
function buildTerrain(run: Run): Terrain {
  const { w, h } = run.area,
    rnd = run.rnd,
    fl = floorOf10(run),
    boss = (isBossRoom(run) && !climbing(run)) || isWardenRoom(run),
    m = ROOM.wall,
    more = zoneDungeon(run.setup.zone).ground;
  const t: Terrain = { water: [], pillars: [], spikes: [], barrels: [], shrine: null };
  // The zone's share of each thing on the ground (the first zone's, exactly, at 1).
  const amt = (n: number, k: number) => (k === 1 ? n : Math.floor(n * k) + (rnd() < (n * k) % 1 ? 1 : 0));
  const rects = () => [...t.water, ...t.spikes];
  const clear = (x: number, y: number, r: number) => {
    if (x < m + r + 24 || x > w - m - r - 24 || y < m + r + 24 || y > h - m - r - 24) return false;
    const lane = ROOM.door / 2 + 26 + r;
    if (Math.abs(x - w / 2) < lane && (y < 170 + r || y > h - 170 - r)) return false;
    if (Math.abs(y - h / 2) < lane && (x < 120 + r || x > w - 120 - r)) return false;
    for (const p of t.pillars) if (Math.hypot(p.x - x, p.y - y) < p.r + r + 56) return false;
    for (const b of t.barrels) if (Math.hypot(b.x - x, b.y - y) < BARREL.r + r + 30) return false;
    for (const q of rects()) if (inRect(q, x, y, r + 14)) return false;
    if (t.shrine && Math.hypot(t.shrine.x - x, t.shrine.y - y) < SHRINE.r + r + 40) return false;
    return true;
  };
  const rectClear = (q: Rect) => {
    for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) if (!clear(q.x + (q.w * i) / 2, q.y + (q.h * j) / 2, 6)) return false;
    return clear(q.x + q.w / 2, q.y + q.h / 2, Math.min(q.w, q.h) / 2);
  };
  const tries = (n: number, place: () => boolean) => {
    for (let i = 0; i < 30 && n > 0; i++) if (place()) n--;
  };
  // A rest room's shrine, in the middle of the room.
  if (run.kind === 'rest') t.shrine = { x: w / 2, y: h * 0.5, used: false };
  // Pillars, in pairs mirrored across the room.
  tries(boss ? 2 : amt(1 + Math.floor(rnd() * 2.5), more.pillars), () => {
    const r = 16 + Math.round(rnd() * 8),
      x = m + 50 + rnd() * (w / 2 - m - 110),
      y = 190 + rnd() * (h - 420);
    if (!clear(x, y, r) || !clear(w - x, y, r)) return false;
    t.pillars.push({ x, y, r }, { x: w - x, y, r });
    return true;
  });
  if (boss) return t;
  const rect = (rw: number, rh: number): Rect => ({ x: m + 20 + rnd() * (w - 2 * m - 40 - rw), y: 160 + rnd() * (h - 330 - rh), w: rw, h: rh });
  tries(amt((rnd() < 0.45 + 0.05 * fl ? 1 : 0) + (fl >= 3 && rnd() < 0.5 ? 1 : 0), more.water) + (more.water >= 2 ? 1 : 0), () => {
    const q = rect(110 + Math.round(rnd() * 90), 90 + Math.round(rnd() * 80));
    if (!rectClear(q)) return false;
    t.water.push(q);
    return true;
  });
  if (fl >= 2)
    tries(amt(1 + (fl >= 6 && rnd() < 0.6 ? 1 : 0), more.spikes), () => {
      const q = { ...rect(96 + Math.round(rnd() * 4) * 24, 48 + Math.round(rnd()) * 24), phase: rnd() * SPIKES.every };
      if (!rectClear(q)) return false;
      t.spikes.push(q);
      return true;
    });
  if (fl >= 1)
    tries(amt(Math.floor(rnd() * 3) + (fl >= 5 ? 1 : 0), more.barrels), () => {
      const x = m + 40 + rnd() * (w - 2 * m - 80),
        y = 180 + rnd() * (h - 380);
      if (!clear(x, y, BARREL.r + 6)) return false;
      t.barrels.push({ id: ++run.ids, x, y, alive: true });
      return true;
    });
  return t;
}

/** Into the map's room `map.at`, through its door on side `from` (null: the floor's first room).
    A room you cleared before is as you left it, its doors open. */
function enterRoom(run: Run, from: Side | null) {
  const c = cellOf(run),
    back = c.kept;
  run.foes = [];
  run.bullets = [];
  run.shots = [];
  run.gems = [];
  run.mines = [];
  run.cleared = false;
  run.doorOpen = false;
  run.doors = [];
  run.chest = back?.chest ?? null;
  run.loot = back?.loot ?? [];
  run.stairs = null;
  if (!c.visited) run.room++;
  c.seen = c.visited = true;
  for (const id of Object.values(c.links)) if (id !== undefined) run.map.cells[id].seen = true;
  run.kind = c.kind === 'stairs' || c.kind === 'warden' || c.kind === 'boss' ? 'fight' : c.kind;
  run.area = back?.area ?? roomSize(run);
  run.terrain = back?.terrain ?? buildTerrain(run);
  const { w, h } = run.area,
    [x, y] = from === 'e' ? [w / 2, 70] : from === 'n' ? [70, h / 2] : from === 's' ? [w - 70, h / 2] : [w / 2, h - 70];
  // The party walks in side by side along the wall, you in the middle.
  run.party.forEach((p, i) => {
    const off = i === 0 ? 0 : (i % 2 ? 1 : -1) * 30 * Math.ceil(i / 2);
    [p.x, p.y] = from === 'n' || from === 's' ? [x, y + off] : [x + off, y];
    p.lock = null;
    p.charge = null;
    p.wind = { x: 0, y: 0 };
  });
  run.warden = null;
  run.dim = null;
  run.waves = [];
  if (c.cleared) {
    run.cleared = run.doorOpen = true;
    openDoors(run);
    emit(run, { type: 'room' });
    return;
  }
  emit(run, { type: 'room' });
  if (climbing(run)) {
    startLedge(run);
    return;
  }
  if (isBossRoom(run)) {
    later(run, 1.2, () => summonBoss(run));
    return;
  }
  if (isWardenRoom(run)) {
    // The Warden alone: it rises at the top of the room while you walk in.
    const mid = midBoss(run.setup.zone),
      f = addFoe(run, mid.kind, run.area.w / 2, 170);
    f.bornUntil = run.t + 1.4;
    f.next = f.def.shoots.map((p) => run.t + 1.4 + (p.first ?? p.every));
    run.warden = f;
    startMid(run, f);
    emit(run, { type: 'warden' });
    emit(run, { type: 'midSay', text: mid.enter });
    emit(run, { type: 'say', text: `${mid.tip}.` });
    return;
  }
  if (run.kind !== 'fight') emit(run, { type: 'say', text: `${ROOM_KINDS[run.kind].name} room. ${ROOM_KINDS[run.kind].text}` });
  run.waves = run.kind === 'rest' ? [] : fillRoom(run);
  if (run.waves.length) later(run, 0.6, () => nextWave(run));
}

/** Whether a body of radius r at x, y would sit inside a pillar. */
function inPillar(run: Run, x: number, y: number, r: number) {
  for (const p of run.terrain.pillars) if (closer(p.x - x, p.y - y, p.r + r)) return true;
  return false;
}

/** A point in the room for a monster: away from you and out of the pillars. */
function spawnPoint(run: Run): [number, number] {
  const m = ROOM.wall + 30,
    { w, h } = run.area;
  for (let i = 0; i < 20; i++) {
    const x = m + run.rnd() * (w - 2 * m),
      y = m + run.rnd() * (h - 2 * m);
    if (run.party.every((p) => Math.hypot(x - p.x, y - p.y) > 220) && !inPillar(run, x, y, 24)) return [x, y];
  }
  return [w / 2, run.hero.y > h / 2 ? m + 20 : h - m - 20];
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
  const elite = run.kind === 'elite' && def.xp > 0;
  // On the Summit, each ledge climbed is tougher.
  const up = 1 + CLIMB.tougher * (run.climb ?? 0),
    hp = Math.round(def.hp * zone.hp * DIALS.hp * (1 + DIALS.deep * depth(run)) * (elite ? ELITE.hp : 1) * up),
    hard = zone.dmg * (1 + DIALS.deepDmg * depth(run)) * up;
  const f: Foe = {
    id: ++run.ids,
    kind,
    def: elite ? { ...def, dmg: def.dmg * hard * ELITE.dmg, r: def.r * ELITE.r, xp: def.xp * ELITE.xp } : { ...def, dmg: def.dmg * hard },
    x: clamp(x, ROOM.wall + def.r, run.area.w - ROOM.wall - def.r),
    y: clamp(y, ROOM.wall + def.r, run.area.h - ROOM.wall - def.r),
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
    act: run.t + 1.2 + run.rnd() * 1.5,
    elite,
    phase: 1,
    hitAt: -99,
    alive: true,
  };
  run.foes.push(f);
  emit(run, { type: 'spawn', x: f.x, y: f.y, kind });
  if (!run.met.has(kind)) {
    run.met.add(kind);
    const line = MEET[kind];
    if (line) emit(run, { type: 'say', text: line });
  }
  return f;
}

function summonBoss(run: Run) {
  const which = run.setup.zone.boss,
    def = BOSSES[which],
    { zone } = run.setup;
  const weak = run.setup.edge?.bossHp ?? 1;
  const hp = def.plates ? Math.round(def.plates * weak) : Math.round(def.hp * zone.hp * BOSS_HP * weak);
  const b: Foe = {
    id: ++run.ids,
    kind: 'boss',
    def: { ...def, dmg: def.dmg * zone.dmg },
    x: run.area.w / 2,
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
    act: 0,
    elite: false,
    phase: 1,
    hitAt: -99,
    alive: true,
  };
  run.foes.push(b);
  run.boss = b;
  run.bossAt = run.t;
  run.bossSummon = which === 'mirror' ? 2 : 6;
  run.bossClock = which === 'knight' ? 6 : which === 'mirror' ? SPLIT.first : 0;
  // The Hollow's light first opens a few seconds in.
  if (which === 'hollow') b.act = run.t + LIGHT.first;
  emit(run, { type: 'boss' });
}

/** A ledge of the Summit's climb. The first one starts the climb, and your friends join you. */
function startLedge(run: Run) {
  const h = run.hero;
  if (run.climb === null) {
    run.climb = 0;
    run.bossAt = run.t;
    run.allies = (['wanderer', 'mira', 'vela'] as const).map((kind, i) => ({ kind, x: h.x + (i - 1) * 46, y: h.y + 40, at: run.t + 1.5 }));
    emit(run, { type: 'boss' });
    emit(run, { type: 'say', text: 'No top, only a direction. Your friends climb with you.' });
  }
  run.allies.forEach((a, i) => {
    a.x = h.x + (i - 1) * 46;
    a.y = h.y + 40;
  });
  run.waves = fillRoom(run);
  later(run, 0.6, () => nextWave(run));
}

/** Walk through an open door: into the room behind it, or on the Summit up to the next ledge. */
function throughDoor(run: Run, d: Door) {
  if (climbing(run)) {
    // Up to the next ledge: the same room of the map, one ledge higher.
    run.climb = (run.climb ?? 0) + 1;
    emit(run, { type: 'ledge', height: run.climb });
    for (const h of standing(run)) {
      const heal = Math.round(h.maxHp * CLIMB.heal);
      h.hp = Math.min(h.maxHp, h.hp + heal);
      emit(run, { type: 'heal', x: h.x, y: h.y, n: heal });
    }
    enterRoom(run, 'w');
    return;
  }
  cellOf(run).kept = { area: run.area, terrain: run.terrain, chest: run.chest, loot: run.loot };
  run.map.at = d.to;
  enterRoom(run, ACROSS[d.side]);
}

/** A new floor's map, and you in its first room (or, for developer mode, its last). */
function newFloor(run: Run, floor: number, toEnd = false) {
  run.floor = floor;
  run.room = -1;
  run.map = makeFloor(run.layout, floor, floorSeed(run.setup.seed, floor));
  if (toEnd) run.map.at = run.map.cells.findIndex((c) => c.kind === 'stairs' || c.kind === 'warden' || c.kind === 'boss');
  enterRoom(run, toEnd ? 'w' : null);
}

/** Down the stairs, with a breath on the way. */
function downStairs(run: Run) {
  const up = standing(run);
  for (const h of up) h.hp = Math.min(h.maxHp, h.hp + Math.round(h.maxHp * DIALS.stairs));
  emit(run, { type: 'floor', floor: run.floor + 1 });
  for (const h of up) emit(run, { type: 'heal', x: h.x, y: h.y, n: Math.round(h.maxHp * DIALS.stairs) });
  newFloor(run, run.floor + 1);
}

// ---------- the step ----------

const IDLE: Input = { x: 0, y: 0, ability: false };

/** One step (1/60 s). `input` is yours, or one per hero of the party, in order (a missing one
    stands still). */
export function stepRun(run: Run, input: Input | Input[]) {
  if (run.over || run.paused || choosing(run) || run.stairsAsk) return;
  run.t += STEP;
  const now = run.t;
  for (let i = 0; i < run.timers.length; i++) {
    if (run.timers[i].at <= now) {
      const fn = run.timers[i].run;
      run.timers.splice(i--, 1);
      fn();
      if (run.over || choosing(run) || run.stairsAsk) return;
    }
  }
  if (run.bossAt !== null && now - run.bossAt >= (run.climb !== null ? CLIMB.limit : BOSS_LIMIT)) {
    emit(run, { type: 'say', text: run.climb !== null ? 'The light fades on the mountain. You climbed, and that counts.' : 'The Fog closes in. Train, and come back.' });
    return end(run, false, 'limit');
  }
  if (now >= RUN_LIMIT) return end(run, false, 'limit');
  const inputs = Array.isArray(input) ? input : [input],
    up = standing(run);
  for (const h of up) {
    const i = inputs[h.id] ?? IDLE;
    if (i.lock !== undefined) h.lock = i.lock;
    if (i.dodge) dodge(run, h, i);
    moveHero(run, h, i);
    if (i.ability) useAbility(run, h, i);
  }
  moveFoes(run);
  moveBullets(run);
  if (run.over) return;
  for (const h of standing(run)) {
    attack(run, h);
    skills(run, h);
  }
  moveShots(run);
  if (run.over) return;
  helpers(run);
  if (run.over) return;
  pullGems(run);
  checkRoom(run);
  if (run.foes.length > 40) run.foes = run.foes.filter((f) => f.alive);
}

function moveHero(run: Run, h: Hero, input: Input) {
  const now = run.t;
  let x = input.x,
    y = input.y;
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  if (len > 0.05) h.facing = Math.atan2(y, x);
  // A cleared room is safe: cross it at a run, so the walk to the next fight is short.
  const speed = heroSpeed(h.ups) * (1 + 0.1 * relic(h, 'boots') + h.gearFx.move) * bodyOf(h).move * (run.cleared ? CLEAR_RUN : 1);
  if (h.charge && now < h.charge.until) {
    h.vx = h.charge.x;
    h.vy = h.charge.y;
  } else if (now < h.shove.until) {
    h.vx = h.shove.x;
    h.vy = h.shove.y;
  } else {
    h.charge = null;
    const wade = run.terrain.water.some((q) => inRect(q, h.x, h.y)) ? Math.min(1, WATER.hero + 0.15 * relic(h, 'boots')) : 1;
    h.vx = x * speed * wade + h.wind.x;
    h.vy = y * speed * wade + h.wind.y;
  }
  h.x += h.vx * STEP;
  h.y += h.vy * STEP;
  outOfPillars(run, h, HERO_R);
  // An open door is a gap in its wall: in line with it, you can walk on out.
  const { w, h: H } = run.area,
    lane = (s: Side) => run.doorOpen && run.doors.some((d) => d.side === s && Math.abs(s === 'e' || s === 'w' ? h.x - d.x : h.y - d.y) < ROOM.door / 2 - HERO_R);
  h.x = clamp(h.x, lane('n') ? -40 : ROOM.wall + HERO_R, lane('s') ? w + 40 : w - ROOM.wall - HERO_R);
  h.y = clamp(h.y, lane('e') ? -40 : ROOM.wall + HERO_R, lane('w') ? H + 40 : H - ROOM.wall - HERO_R);
  const out: Side | null = h.y < 4 ? 'e' : h.y > H - 4 ? 'w' : h.x < 4 ? 'n' : h.x > w - 4 ? 's' : null,
    door = out && run.doors.find((d) => d.side === out);
  if (door) return throughDoor(run, door);
  if (run.stairs && Math.hypot(run.stairs.x - h.x, run.stairs.y - h.y) < 18 + HERO_R) {
    if (run.setup.autoPick) return downStairs(run);
    run.stairsAsk = true;
    return;
  }
  // Loot: into the bag, while there's room.
  for (const l of run.loot) {
    if (!mine(l, h) || Math.hypot(l.x - h.x, l.y - h.y) > 20 + HERO_R) continue;
    if (h.gear.bag.length >= BAG) {
      if (!l.full) emit(run, { type: 'say', text: 'Your bag is full. Wear or drop something to make room.' });
      l.full = true;
      continue;
    }
    run.loot = run.loot.filter((o) => o !== l);
    h.gear.bag.push(l.item);
    emit(run, { type: 'loot', item: l.item });
    if (run.setup.autoPick) botWear(run, h, l.item);
    break;
  }
  // A chest: open it and pick what's inside.
  const c = run.chest;
  if (c && !c.opened && Math.hypot(c.x - h.x, c.y - h.y) < 22 + HERO_R) openChest(run, h);
  // The ground under you.
  for (const q of run.terrain.spikes) if (inRect(q, h.x, h.y, HERO_R - 4) && spikeState(q, now) === 'up') hurt(run, h, SPIKES.dmg * run.setup.zone.dmg, 'touch');
  const sh = run.terrain.shrine;
  if (sh && !sh.used && Math.hypot(sh.x - h.x, sh.y - h.y) < SHRINE.r + HERO_R) {
    sh.used = true;
    const heal = Math.round(h.maxHp * DIALS.shrine);
    h.hp = Math.min(h.maxHp, h.hp + heal);
    emit(run, { type: 'shrine', x: sh.x, y: sh.y });
    emit(run, { type: 'heal', x: h.x, y: h.y, n: heal });
  }
  if (h.charge?.harm) {
    clearBullets(run, h.x, h.y, HERO_R + 24);
    for (const f of run.foes) {
      if (!f.alive || h.charge.hit.has(f) || dist(f, h) > f.def.r + HERO_R + 12) continue;
      h.charge.hit.add(f);
      damage(run, h, f, pow(h, ATTACK.slash.dmg * 2), 220);
    }
  }
}

/** A short dash, untouchable for a moment: shots pass through you. It goes where you push the
    stick, or the way you face. */
function dodge(run: Run, h: Hero, input: Input) {
  const now = run.t;
  if (now < h.dodgeAt || (h.charge && now < h.charge.until)) return;
  h.dodgeAt = now + DODGE.cd;
  let dx = input.x,
    dy = input.y;
  if (Math.hypot(dx, dy) < 0.1) [dx, dy] = [Math.cos(h.facing), Math.sin(h.facing)];
  const d = Math.hypot(dx, dy) || 1;
  dx /= d;
  dy /= d;
  h.charge = { until: now + DODGE.secs, x: dx * DODGE.speed, y: dy * DODGE.speed, hit: new Set(), harm: false };
  h.ghostUntil = Math.max(h.ghostUntil, now + DODGE.ghost);
  emit(run, { type: 'dodge', x: h.x, y: h.y, toX: h.x + dx * DODGE.speed * DODGE.secs, toY: h.y + dy * DODGE.speed * DODGE.secs });
}

function useAbility(run: Run, h: Hero, input: Input) {
  const now = run.t;
  if (now < h.abilityAt) return;
  const a = h.ability;
  h.abilityAt = now + ABILITIES[a].cd / (1 + 0.25 * relic(h, 'hourglass') + h.gearFx.cooldown);
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
  if (a === 'charge') {
    const speed = 620,
      secs = 0.28;
    h.charge = { until: now + secs, x: dx * speed, y: dy * speed, hit: new Set(), harm: true };
    h.ghostUntil = now + secs + 0.1;
    emit(run, { type: 'ability', id: a, x: from.x, y: from.y, toX: from.x + dx * speed * secs, toY: from.y + dy * speed * secs });
  } else if (a === 'volley') {
    const dmg = pow(h, ATTACK.arrow.dmg * 1.5);
    for (let i = 0; i < 16; i++) fire(run, h, 'arrow', Math.atan2(dy, dx) + (i / 16) * Math.PI * 2, 430, dmg, 2, null);
    emit(run, { type: 'ability', id: a, x: h.x, y: h.y, toX: h.x, toY: h.y });
  } else if (a === 'blink') {
    h.x = clamp(h.x + dx * 150, ROOM.wall + HERO_R, run.area.w - ROOM.wall - HERO_R);
    h.y = clamp(h.y + dy * 150, ROOM.wall + HERO_R, run.area.h - ROOM.wall - HERO_R);
    outOfPillars(run, h, HERO_R);
    h.ghostUntil = now + 0.3;
    clearBullets(run, h.x, h.y, 90);
    burst(run, h, h.x, h.y, 80, pow(h, ATTACK.orb.dmg * 1.5), 'ability');
    emit(run, { type: 'ability', id: a, x: from.x, y: from.y, toX: h.x, toY: h.y });
  } else if (a === 'shock') {
    clearBullets(run, h.x, h.y, 110);
    burst(run, h, h.x, h.y, 110, pow(h, ATTACK.slash.dmg * 1.6), 'ability', undefined, 300);
    emit(run, { type: 'ability', id: a, x: h.x, y: h.y, toX: h.x, toY: h.y });
  } else {
    const heal = Math.round(h.maxHp * 0.15);
    h.hp = Math.min(h.maxHp, h.hp + heal);
    clearBullets(run, h.x, h.y, 140);
    burst(run, h, h.x, h.y, 140, pow(h, ATTACK.wave.dmg), 'ability', undefined, 260);
    emit(run, { type: 'ability', id: a, x: h.x, y: h.y, toX: h.x, toY: h.y });
    emit(run, { type: 'heal', x: h.x, y: h.y, n: heal });
  }
}

/** Pushes a body out of any pillar it walked into, so it slides around it. */
function outOfPillars(run: Run, o: { x: number; y: number }, r: number) {
  for (const p of run.terrain.pillars) {
    const dx = o.x - p.x,
      dy = o.y - p.y,
      min = p.r + r;
    if (!closer(dx, dy, min)) continue;
    const d = Math.hypot(dx, dy) || 1;
    if (d >= min) continue;
    o.x = p.x + (dx / d) * min;
    o.y = p.y + (dy / d) * min;
  }
}

function clearBullets(run: Run, x: number, y: number, r: number) {
  // Only build a new list when a shot goes.
  if (run.bullets.every((b) => farther(b.x - x, b.y - y, r))) return;
  run.bullets = run.bullets.filter((b) => farther(b.x - x, b.y - y, r));
}

// ---------- monsters ----------

function moveFoes(run: Run) {
  const now = run.t,
    up = standing(run);
  for (const f of run.foes) {
    if (!f.alive) continue;
    if (now >= f.knockUntil) {
      if (f === run.boss) steerBoss(run, f);
      else steer(run, f);
    }
    if (f === run.warden) stepMid(run, f);
    const wade = f !== run.boss && run.terrain.water.some((q) => inRect(q, f.x, f.y)) ? WATER.foe : 1;
    f.x = clamp(f.x + f.vx * STEP * wade, ROOM.wall + f.def.r, run.area.w - ROOM.wall - f.def.r);
    f.y = clamp(f.y + f.vy * STEP * wade, ROOM.wall + f.def.r, run.area.h - ROOM.wall - f.def.r);
    outOfPillars(run, f, f.def.r);
    if (now < f.bornUntil) continue;
    // Volleys.
    f.def.shoots.forEach((p, i) => {
      if (p.on || now < f.next[i]) return;
      f.next[i] = now + p.every / (f === run.boss || f === run.warden ? 1 : DIALS.fire);
      if (p.below && f.hp > f.maxHp * p.below) return;
      if (p.above && f.hp <= f.maxHp * p.above) return;
      // The Hollow's light open: it turns its spiral instead (steerBoss).
      if (f === run.boss && run.setup.zone.boss === 'hollow' && f.phase === 2) return;
      shoot(run, f, p);
    });
    // A mid-boss's second phase: a roar, and new volleys (the Warden's cross stops turning).
    if (f === run.warden && f.phase === 1 && f.hp <= f.maxHp * 0.5) {
      f.phase = 2;
      emit(run, { type: 'phase', x: f.x, y: f.y });
      emit(run, { type: 'midSay', text: midBoss(run.setup.zone).hot });
    }
    // Touch (a charging ram hits harder).
    if (f.def.dmg > 0) for (const h of up) if (dist(f, h) < f.def.r + HERO_R) hurt(run, h, f.def.dmg * (f !== run.warden && now < f.dashUntil ? 1.5 : 1), 'touch');
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

/** A monster's walk, by how it moves. */
function steer(run: Run, f: Foe) {
  const h = prey(run, f.x, f.y),
    now = run.t,
    dx = h.x - f.x,
    dy = h.y - f.y,
    d = Math.hypot(dx, dy) || 1,
    range = f.def.range ?? 0;
  if (f.kind === 'reflection' && run.boss?.alive) {
    // Your reflections don't hunt you: they drift into the way, between you and the Mirror, and
    // after a while sink back into the lake.
    if (now >= f.act + SPLIT.stay) return fade(run, f);
    const b = run.boss,
      tx = (h.x + b.x) / 2 + Math.cos(f.spin) * 50,
      ty = (h.y + b.y) / 2 + Math.sin(f.spin) * 50,
      ex = tx - f.x,
      ey = ty - f.y,
      e = Math.hypot(ex, ey) || 1,
      v = Math.min(f.speed, e * 2);
    f.vx = (ex / e) * v;
    f.vy = (ey / e) * v;
    return;
  }
  // An image of the Mirror fades back into the lake.
  if (f.kind === 'image' && now >= f.act) return fade(run, f);
  switch (f.def.move) {
    case 'still':
      f.vx = f.vy = 0;
      return;
    case 'orbit': {
      const pull = clamp((d - range) / 60, -1, 1);
      f.vx = ((dx / d) * pull - (dy / d) * 0.8) * f.speed;
      f.vy = ((dy / d) * pull + (dx / d) * 0.8) * f.speed;
      return;
    }
    case 'keep': {
      const v = d > range + 30 ? f.speed : d < range - 30 ? -f.speed : 0;
      f.vx = (dx / d) * v;
      f.vy = (dy / d) * v;
      return;
    }
    case 'charge':
      // Walk in; when close enough, stop and glow (windUntil), then rush along the line it locked.
      if (now < f.windUntil) {
        f.vx = f.vy = 0;
        return;
      }
      if (now < f.dashUntil) {
        f.vx = f.dashX * CHARGE.speed;
        f.vy = f.dashY * CHARGE.speed;
        return;
      }
      if (f.dashUntil) {
        f.dashUntil = f.windUntil = 0;
        f.act = now + CHARGE.every * (0.8 + run.rnd() * 0.4);
        moved(run, f);
      }
      if (now >= f.act && d < 330) {
        f.windUntil = now + CHARGE.wind;
        f.dashUntil = f.windUntil + CHARGE.dash;
        f.dashX = dx / d;
        f.dashY = dy / d;
        emit(run, { type: 'wind', id: f.id });
        f.vx = f.vy = 0;
        return;
      }
      f.vx = (dx / d) * f.speed;
      f.vy = (dy / d) * f.speed;
      return;
    case 'blink':
      // Drift at its range; every few seconds, mark a spot near you, vanish, land there and fire.
      if (now < f.windUntil) {
        f.vx = f.vy = 0;
        return;
      }
      if (f.windUntil) {
        const from = { x: f.x, y: f.y };
        f.x = f.dashX;
        f.y = f.dashY;
        f.windUntil = 0;
        f.act = now + BLINK.every * (0.8 + run.rnd() * 0.4);
        emit(run, { type: 'blink', x: from.x, y: from.y, toX: f.x, toY: f.y });
        moved(run, f);
      }
      if (now >= f.act) {
        for (let i = 0; i < 12; i++) {
          const a = run.rnd() * Math.PI * 2,
            r = BLINK.near + run.rnd() * 50,
            x = clamp(h.x + Math.cos(a) * r, ROOM.wall + 30, run.area.w - ROOM.wall - 30),
            y = clamp(h.y + Math.sin(a) * r, ROOM.wall + 30, run.area.h - ROOM.wall - 30);
          if (Math.hypot(x - h.x, y - h.y) < BLINK.near - 20 || inPillar(run, x, y, f.def.r + 4)) continue;
          f.dashX = x;
          f.dashY = y;
          f.windUntil = now + BLINK.mark;
          break;
        }
        if (!f.windUntil) f.act = now + 1;
        f.vx = f.vy = 0;
        return;
      }
      {
        const pull = clamp((d - range) / 60, -1, 1);
        f.vx = ((dx / d) * pull - (dy / d) * 0.6) * f.speed;
        f.vy = ((dy / d) * pull + (dx / d) * 0.6) * f.speed;
      }
      return;
    default:
      f.vx = (dx / d) * f.speed;
      f.vy = (dy / d) * f.speed;
  }
}

/** A copy that sinks back into the lake: gone, with nothing to pick up. */
function fade(run: Run, f: Foe) {
  f.alive = false;
  emit(run, { type: 'blink', x: f.x, y: f.y, toX: f.x, toY: f.y });
}

/** The volleys a monster fires when its charge ends or its blink lands. */
function moved(run: Run, f: Foe) {
  for (const p of f.def.shoots) if (p.on === 'move') shoot(run, f, p);
}

function shoot(run: Run, f: Foe, p: Pattern) {
  const h = prey(run, f.x, f.y),
    at = Math.atan2(h.y - f.y, h.x - f.x),
    boss = f === run.boss || f === run.warden,
    r = p.r ?? (boss ? 7 : 5),
    dmg = p.dmg * run.setup.zone.dmg * (f === run.boss ? 1 : (1 + DIALS.deepDmg * depth(run)) * (f.elite ? ELITE.dmg : 1) * (1 + CLIMB.tougher * (run.climb ?? 0))),
    speed = p.speed * DIALS.speed,
    style = p.style ?? 'plain';
  if (p.kind === 'mine') {
    // Lobbed at where you stand, a little off; it lands, then bursts.
    const x = clamp(h.x + (run.rnd() - 0.5) * 40, ROOM.wall + 10, run.area.w - ROOM.wall - 10),
      y = clamp(h.y + (run.rnd() - 0.5) * 40, ROOM.wall + 10, run.area.h - ROOM.wall - 10);
    run.mines.push({ id: ++run.ids, x, y, r: p.r ?? 46, dmg, lands: run.t + MINE.flight, at: run.t + MINE.flight + MINE.fuse, n: p.n, speed });
    emit(run, { type: 'shoot', x: f.x, y: f.y, boss });
    return;
  }
  const add = (a: number) =>
    run.bullets.push({
      id: ++run.ids,
      x: f.x,
      y: f.y,
      vx: Math.cos(a) * speed * (style === 'ramp' ? RAMP.from : 1),
      vy: Math.sin(a) * speed * (style === 'ramp' ? RAMP.from : 1),
      r,
      dmg,
      born: run.t,
      boss,
      style,
      ang: a,
      spd: speed,
      bounce: style === 'bounce' ? 1 : 0,
    });
  if (p.kind === 'aimed') for (let i = 0; i < p.n; i++) add(at + (i - (p.n - 1) / 2) * 0.12);
  else if (p.kind === 'spread') for (let i = 0; i < p.n; i++) add(at + (p.n === 1 ? 0 : (i / (p.n - 1) - 0.5) * (p.arc ?? 0.5)));
  else if (p.kind === 'ring') {
    const off = run.rnd() * Math.PI * 2;
    for (let i = 0; i < p.n; i++) add(off + (i / p.n) * Math.PI * 2);
  } else {
    f.spin += p.turn ?? 0.32;
    for (let i = 0; i < p.n; i++) add(f.spin + (i / p.n) * Math.PI * 2);
  }
  emit(run, { type: 'shoot', x: f.x, y: f.y, boss });
}

function moveBullets(run: Run) {
  const now = run.t,
    up = standing(run),
    { w, h: H } = run.area,
    m = ROOM.wall;
  run.bullets = run.bullets.filter((b) => {
    const age = now - b.born;
    if (b.style === 'homing' && age < HOMING.for) {
      // Turns toward you, but only so fast: a sidestep still beats it.
      const h = prey(run, b.x, b.y);
      let diff = Math.atan2(h.y - b.y, h.x - b.x) - b.ang;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      b.ang += clamp(diff, -HOMING.turn * STEP, HOMING.turn * STEP);
      b.vx = Math.cos(b.ang) * b.spd;
      b.vy = Math.sin(b.ang) * b.spd;
    } else if (b.style === 'ramp') {
      const k = Math.min(1, RAMP.from + ((1 - RAMP.from) * age) / RAMP.over);
      b.vx = Math.cos(b.ang) * b.spd * k;
      b.vy = Math.sin(b.ang) * b.spd * k;
    } else if (b.style === 'wiggle') {
      const a = b.ang + Math.sin(age * 7) * 0.45;
      b.vx = Math.cos(a) * b.spd;
      b.vy = Math.sin(a) * b.spd;
    }
    b.x += b.vx * STEP;
    b.y += b.vy * STEP;
    if (b.x < m || b.x > w - m || b.y < m || b.y > H - m) {
      if (b.bounce <= 0) return false;
      b.bounce--;
      if (b.x < m || b.x > w - m) b.vx = -b.vx;
      else b.vy = -b.vy;
      b.ang = Math.atan2(b.vy, b.vx);
      b.x = clamp(b.x, m, w - m);
      b.y = clamp(b.y, m, H - m);
    }
    if (inPillar(run, b.x, b.y, b.r - 2)) return false;
    for (const br of run.terrain.barrels)
      if (br.alive && closer(br.x - b.x, br.y - b.y, BARREL.r + b.r)) {
        blowUp(run, br, run.hero);
        return false;
      }
    for (const h of up) {
      if (!closer(b.x - h.x, b.y - h.y, b.r + HERO_R - 2) || run.t < h.ghostUntil) continue;
      hurt(run, h, b.dmg, 'shot');
      return false;
    }
    return true;
  });
  // Bombs that land and burst.
  run.mines = run.mines.filter((mn) => {
    if (now < mn.at) return true;
    for (const h of up) if (Math.hypot(mn.x - h.x, mn.y - h.y) < mn.r + HERO_R - 4) hurt(run, h, mn.dmg, 'shot');
    emit(run, { type: 'boom', x: mn.x, y: mn.y, r: mn.r });
    for (let i = 0; i < mn.n; i++) {
      const a = (i / mn.n) * Math.PI * 2 + 0.3;
      run.bullets.push({ id: ++run.ids, x: mn.x, y: mn.y, vx: Math.cos(a) * mn.speed, vy: Math.sin(a) * mn.speed, r: 5, dmg: mn.dmg * 0.6, born: now, boss: false, style: 'plain', ang: a, spd: mn.speed, bounce: 0 });
    }
    return false;
  });
}

/** A barrel goes up: everything near takes the blast, you too, and nearby barrels follow. */
/** `by`: the hero who set it off (credited with what it kills). */
function blowUp(run: Run, br: Terrain['barrels'][number], by: Hero) {
  if (!br.alive) return;
  br.alive = false;
  const dmg = BARREL.dmg * run.setup.zone.hp * DIALS.hp * (1 + DIALS.deep * depth(run));
  for (const h of standing(run)) if (Math.hypot(h.x - br.x, h.y - br.y) < BARREL.blast * 0.8) hurt(run, h, BARREL.hurt * run.setup.zone.dmg, 'touch');
  emit(run, { type: 'boom', x: br.x, y: br.y, r: BARREL.blast });
  for (const f of run.foes) if (f.alive && f !== run.boss && Math.hypot(f.x - br.x, f.y - br.y) <= BARREL.blast + f.def.r) damage(run, by, f, dmg, 260, br.x, br.y);
  if (run.boss?.alive && Math.hypot(run.boss.x - br.x, run.boss.y - br.y) <= BARREL.blast + run.boss.def.r) damage(run, by, run.boss, dmg * 0.5, 0, br.x, br.y);
  for (const o of run.terrain.barrels) if (o.alive && Math.hypot(o.x - br.x, o.y - br.y) < BARREL.blast) later(run, 0.12, () => blowUp(run, o, by));
}

/** The Mirror splits into `n` images and itself, spread across the room; it takes one of the
    places at random. The images fade after a while. */
function splitMirror(run: Run, b: Foe, n: number) {
  const { w } = run.area,
    y = clamp(b.y, 120, run.area.h * 0.45),
    real = Math.floor(run.rnd() * (n + 1)),
    from = { x: b.x, y: b.y };
  for (let i = 0; i <= n; i++) {
    const x = w * (0.18 + (0.64 * i) / n),
      at = y + (i % 2 ? 40 : 0);
    if (i === real) {
      b.x = x;
      b.y = at;
      continue;
    }
    const f = addFoe(run, 'image', x, at);
    f.hp = f.maxHp = 1;
    f.bornUntil = run.t + 0.3;
    f.act = run.t + SPLIT.last;
  }
  emit(run, { type: 'blink', x: from.x, y: from.y, toX: b.x, toY: b.y });
  emit(run, { type: 'split' });
  if (!run.met.has('image')) {
    run.met.add('image');
    emit(run, { type: 'say', text: 'The lake shows many Mirrors. Only the real one shoots: go to it.' });
  }
}

function steerBoss(run: Run, b: Foe) {
  const h = prey(run, b.x, b.y),
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
      emit(run, { type: 'split' });
    }
    return;
  }
  if (which === 'mirror') {
    const v = d > 220 ? b.speed : d < 160 ? -b.speed : 0;
    b.vx = (dx / d) * v;
    b.vy = (dy / d) * v;
    // The lake splits it: images of the Mirror stand across the room, and it slips into one of
    // the places. Only the real one shoots; that is how you tell.
    run.bossClock -= STEP;
    if (run.bossClock <= 0) {
      const hurt = b.hp < b.maxHp * 0.5;
      run.bossClock = SPLIT.every * (hurt ? 0.75 : 1);
      splitMirror(run, b, hurt ? 3 : 2);
    }
    run.bossSummon -= STEP;
    if (run.bossSummon > 0) return;
    run.bossSummon = 6;
    const alive = run.foes.filter((f) => f.alive && f.kind === 'reflection').length;
    for (let i = 0; i < Math.min(2, 3 - alive); i++) {
      const side = (i === 0 ? 1 : -1) * 40;
      addFoe(run, 'reflection', b.x + dx * 0.45 - (dy / d) * side, b.y + dy * 0.45 + (dx / d) * side);
    }
    return;
  }
  if (which === 'knight') {
    run.bossClock -= STEP;
    if (run.bossClock <= 0) {
      // Down to half his plates, he shouts more often.
      run.bossClock = b.hp <= b.maxHp * 0.5 ? 5.5 : 8;
      emit(run, { type: 'shout', x: b.x, y: b.y });
      emit(run, { type: 'say', text: '"Not good enough!" Keep hitting.' });
      for (const p of standing(run)) {
        const px = p.x - b.x,
          py = p.y - b.y,
          pd = Math.hypot(px, py) || 1;
        if (pd < 260) p.shove = { until: now + 0.45, x: (px / pd) * 320, y: (py / pd) * 320 };
      }
    }
    b.vx = (dx / d) * b.speed;
    b.vy = (dy / d) * b.speed;
    return;
  }
  if (which === 'plateau') {
    // It plods after you and sends rams down the slope. It never changes, whatever you do to it.
    b.vx = (dx / d) * b.speed;
    b.vy = (dy / d) * b.speed;
    run.bossSummon -= STEP;
    if (run.bossSummon <= 0) {
      run.bossSummon = 12;
      for (const side of [-1, 1]) addFoe(run, 'ram', b.x + side * 70, b.y + 20);
    }
    return;
  }
  if (which === 'hollow') {
    // It drifts about the room on a long loop, aiming at you and calling wisps out of the fog.
    // Now and then it stops and its light opens around it: stand in it, through the spiral it
    // turns, and take its hand. Step out, or let the light close, and you start again.
    const lit = b.phase === 2;
    if (now >= b.act) {
      b.phase = lit ? 1 : 2;
      b.act = now + (lit ? LIGHT.dark : LIGHT.lit);
      run.hold = 0;
      emit(run, { type: 'light', on: !lit, x: b.x, y: b.y });
      if (!lit && now - (run.bossAt ?? 0) < LIGHT.first + 2) emit(run, { type: 'say', text: 'Its light opens. Stand in it.' });
    }
    if (b.phase === 2) {
      // Lit, it still drifts a little, away from you: you follow it in.
      b.vx = (-dx / d) * LIGHT.drift;
      b.vy = (-dy / d) * LIGHT.drift;
      run.bossClock -= STEP;
      if (run.bossClock <= 0) {
        run.bossClock = LIGHT.spiral.every;
        shoot(run, b, LIGHT.spiral);
      }
      run.hold = d < LIGHT.r ? run.hold + STEP : 0;
      if (run.hold >= LIGHT.hold) {
        emit(run, { type: 'hand', x: b.x, y: b.y });
        emit(run, { type: 'say', text: 'You take its hand. The fog goes quiet.' });
        end(run, true, 'boss');
      }
      return;
    }
    const { w, h: H } = run.area,
      t = now - (run.bossAt ?? 0),
      tx = w / 2 + Math.sin(t * 0.35) * w * 0.28,
      ty = H * 0.38 + Math.sin(t * 0.23 + 1) * H * 0.16,
      ex = tx - b.x,
      ey = ty - b.y,
      e = Math.hypot(ex, ey) || 1,
      v = Math.min(b.speed, e * 3);
    b.vx = (ex / e) * v;
    b.vy = (ey / e) * v;
    run.bossSummon -= STEP;
    if (run.bossSummon <= 0) {
      run.bossSummon = 9;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        addFoe(run, 'wisp', b.x + Math.cos(a) * 90, b.y + Math.sin(a) * 90);
      }
    }
  }
}

// ---------- hitting ----------

const pow = (h: Hero, base: number) => heroDamage(base, h.power, h.ups) * (1 + DIALS.relic * 0.12 * relic(h, 'whetstone'));

/** The Hollow: nothing you throw at it lands. */
const untouchable = (run: Run, f: Foe) => f === run.boss && run.setup.zone.boss === 'hollow';

// ---------- the mid-bosses ----------

/** The Sand Golem stands as stone between its walks. */
export const hardened = (run: Pick<Run, 't'>, f: Foe) => f.kind === 'sandGolem' && run.t >= f.dashUntil;

/** What a mid-boss brings with it as it rises. */
function startMid(run: Run, f: Foe) {
  const t0 = f.bornUntil;
  if (f.kind === 'lantern') run.dim = DIM.full;
  if (f.kind === 'foreman') {
    CREW.kinds.forEach((k, i) => (addFoe(run, k, run.area.w * (0.25 + 0.25 * i), 280).bornUntil = t0));
    f.act = t0 + CREW.every;
  }
  if (f.kind === 'sandGolem') f.dashUntil = t0 + SAND.walk;
  if (f.kind === 'whisper') {
    for (let i = 0; i < SWAP.crowd; i++) addFoe(run, 'wisp', run.area.w * (0.15 + 0.175 * i), 230 + (i % 2) * 70).bornUntil = t0;
    f.act = t0 + SWAP.every;
  }
  if (f.kind === 'gale') f.act = t0 + 2;
}

/** A mid-boss's own rule, every step (after it has chosen where to walk). */
function stepMid(run: Run, f: Foe) {
  const now = run.t,
    hot = f.phase === 2;
  if (now < f.bornUntil) return;
  const crew = run.foes.filter((o) => o.alive && o !== f);
  switch (f.kind) {
    case 'lantern':
      if (run.dim !== null) run.dim = Math.max(DIM.low, run.dim - DIM.fade * (hot ? 1.5 : 1) * STEP);
      return;
    case 'foreman':
      if (now < f.act) return;
      f.act = now + CREW.every * (hot ? 0.75 : 1);
      // Hit just now: it blocks instead of mending.
      if (now - f.hitAt < CREW.guard) return;
      for (const o of crew) o.hp = o.maxHp;
      if (crew.length < CREW.size) addFoe(run, CREW.kinds[crew.length % CREW.kinds.length], f.x + 40, f.y + 30).bornUntil = now + 0.6;
      emit(run, { type: 'repair', x: f.x, y: f.y });
      return;
    case 'sandGolem':
      // Walking, then standing as stone (it doesn't move), then walking again.
      if (now >= f.dashUntil + SAND.rest * (hot ? 0.8 : 1)) f.dashUntil = now + SAND.walk;
      if (hardened(run, f)) f.vx = f.vy = 0;
      return;
    case 'whisper': {
      const wisps = crew.filter((o) => o.kind === 'wisp');
      if (now < f.act) return;
      if (!f.windUntil) {
        // It glows, and so does the wisp it will trade with.
        const w = wisps[Math.floor(run.rnd() * wisps.length)];
        if (!w) {
          f.act = now + SWAP.every;
          addFoe(run, 'wisp', f.x + 60, f.y);
          return;
        }
        f.windUntil = now + SWAP.wind;
        f.dashX = w.id;
        emit(run, { type: 'wind', id: f.id });
        emit(run, { type: 'wind', id: w.id });
        return;
      }
      if (now < f.windUntil) return;
      const w = wisps.find((o) => o.id === f.dashX);
      f.windUntil = 0;
      f.act = now + SWAP.every * (hot ? 0.7 : 1);
      if (w) {
        const [x, y] = [f.x, f.y];
        f.x = w.x;
        f.y = w.y;
        w.x = x;
        w.y = y;
        emit(run, { type: 'swap', x, y, toX: f.x, toY: f.y });
      }
      if (wisps.length < SWAP.crowd) addFoe(run, 'wisp', run.area.w * (0.2 + 0.6 * run.rnd()), 200 + run.rnd() * 200).bornUntil = now + 0.5;
      return;
    }
    case 'gale': {
      for (const h of run.party) h.wind = { x: 0, y: 0 };
      if (now >= f.act && !f.windUntil) {
        f.windUntil = now + GALE.wind;
        emit(run, { type: 'wind', id: f.id });
      }
      if (!f.windUntil || now < f.windUntil) return;
      if (!f.dashUntil || f.dashUntil < f.windUntil) {
        f.dashUntil = now + GALE.blow;
        emit(run, { type: 'gust', x: f.x, y: f.y });
      }
      if (now >= f.dashUntil) {
        f.windUntil = 0;
        f.act = now + GALE.every * (hot ? 0.7 : 1);
        return;
      }
      // Blowing: away from the Gale, toward the walls; and the edge bites.
      for (const h of standing(run)) {
        const dx = h.x - f.x,
          dy = h.y - f.y,
          d = Math.hypot(dx, dy) || 1;
        h.wind = { x: (dx / d) * GALE.push * (hot ? 1.2 : 1), y: (dy / d) * GALE.push * (hot ? 1.2 : 1) };
        const { w, h: hh } = run.area,
          edge = Math.min(h.x, w - h.x, h.y, hh - h.y) - ROOM.wall;
        if (edge < GALE.edge) hurt(run, h, GALE.bite * run.setup.zone.dmg, 'touch');
      }
      return;
    }
  }
}

/** A mid-boss falls: what it brought falls with it. */
function midFalls(run: Run) {
  const f = run.warden!;
  emit(run, { type: 'midSay', text: midBoss(run.setup.zone).fall });
  run.dim = null;
  for (const h of run.party) h.wind = { x: 0, y: 0 };
  if (f.kind === 'foreman' || f.kind === 'whisper') for (const o of run.foes) if (o.alive && o !== f) fade(run, o);
}

/** The monster you tapped, while it stands, can be hit and is in reach. */
function locked(run: Run, h: Hero, reach: number): Foe | null {
  const f = h.lock === null ? undefined : run.foes.find((o) => o.id === h.lock);
  if (!f?.alive || run.t < f.bornUntil || untouchable(run, f) || dist(f, h) > reach) return null;
  return f;
}

function nearest(run: Run, x: number, y: number, skip?: Set<Foe>, within = Infinity): Foe | null {
  let best: Foe | null = null,
    bd = within * within;
  for (const f of run.foes) {
    // Nothing aims at a reflection of you on purpose (a blast or a piercing arrow still finds it).
    if (!f.alive || skip?.has(f) || run.t < f.bornUntil || untouchable(run, f) || f.kind === 'reflection') continue;
    const d = (f.x - x) ** 2 + (f.y - y) ** 2;
    if (d < bd) {
      bd = d;
      best = f;
    }
  }
  return best;
}

/** `by` hit `f` (from fromX, fromY when it's a blast or a shot, not their hand). */
function damage(run: Run, by: Hero, f: Foe, amount: number, knock = 0, fromX = by.x, fromY = by.y) {
  if (!f.alive || run.t < f.bornUntil || untouchable(run, f)) return;
  const boss = f === run.boss;
  const knight = boss && run.setup.zone.boss === 'knight';
  // A plate falls to any hit, however small, but only one at a time.
  if (knight && run.t < f.act) return;
  if (knight) f.act = run.t + PLATE_EVERY;
  // The Sand Golem, standing still, is stone: the hit glances off.
  if (f === run.warden && f.kind === 'sandGolem' && hardened(run, f)) {
    emit(run, { type: 'hit', id: f.id, x: f.x, y: f.y, dmg: 0, boss: false });
    return;
  }
  f.hitAt = run.t;
  if (f === run.warden && run.dim !== null) run.dim = Math.min(DIM.full, run.dim + DIM.back);
  const dmg = knight ? 1 : Math.max(1, Math.round(amount));
  if (f.kind === 'reflection' || f.kind === 'image') {
    // A copy of you, or of the Mirror: it shatters, and you feel it.
    hitYourself(run, by, f.kind);
    emit(run, { type: 'hit', id: f.id, x: f.x, y: f.y, dmg: 0, boss: false });
    return kill(run, f, by);
  }
  f.hp -= dmg;
  emit(run, { type: 'hit', id: f.id, x: f.x, y: f.y, dmg, boss });
  // The Plateau cracks, a little at a time, and shows nothing else.
  if (boss && run.setup.zone.boss === 'plateau') {
    const cracks = Math.floor((1 - Math.max(0, f.hp) / f.maxHp) / CRACK);
    if (cracks > f.phase - 1 && f.hp > 0) {
      f.phase = cracks + 1;
      emit(run, { type: 'crack', x: f.x, y: f.y, n: cracks });
    }
  }
  if (knock > 0 && !boss) {
    const dx = f.x - fromX,
      dy = f.y - fromY,
      d = Math.hypot(dx, dy) || 1;
    f.vx = (dx / d) * knock;
    f.vy = (dy / d) * knock;
    f.knockUntil = run.t + 0.14;
  }
  if (f.hp <= 0) kill(run, f, by);
}

function kill(run: Run, f: Foe, by: Hero) {
  f.alive = false;
  by.kills++;
  emit(run, { type: 'kill', id: f.id, x: f.x, y: f.y, kind: f.kind, elite: f.elite });
  if (f.def.xp > 0) run.gems.push({ id: ++run.ids, x: f.x, y: f.y, value: f.def.xp, pulled: false });
  const fang = relic(by, 'fang') + by.gearFx.heal;
  if (fang && f !== run.boss) by.hp = Math.min(by.maxHp, by.hp + fang);
  // Now and then a monster drops something to wear: elites and golems far more often.
  if (f !== run.boss && f !== run.warden && f.def.xp > 0 && run.rnd() < (f.elite ? DROPS.elite : f.kind === 'golem' ? DROPS.golem : DROPS.plain)) dropEach(run, f.x, f.y, f.elite || f.kind === 'golem' ? DROP_LUCK.elite : 0);
  if (f === run.warden) dropEach(run, f.x, f.y + 30, DROP_LUCK.midBoss);
  if (f.kind === 'splitter')
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + run.rnd();
      addFoe(run, 'splitling', f.x + Math.cos(a) * 18, f.y + Math.sin(a) * 18).bornUntil = run.t + 0.25;
    }
  if (f === run.warden) midFalls(run);
  if (f === run.boss && run.setup.zone.boss === 'plateau') {
    run.bullets = [];
    emit(run, { type: 'shatter', x: f.x, y: f.y });
    emit(run, { type: 'say', text: 'It all breaks at once. It had been breaking the whole time.' });
  }
  if (f === run.boss) {
    // The boss's own drop goes straight into each hero's bag: you take it home.
    for (const h of run.party) {
      const it = newItem(run, DROP_LUCK.boss, h.classId);
      h.gear.bag.push(it);
      if (h === run.hero) emit(run, { type: 'loot', item: it });
    }
    end(run, true, 'boss');
  }
}

/** Pushes a foe away from a point without hurting it. */
function nudge(run: Run, f: Foe, knock: number, fromX: number, fromY: number) {
  const dx = f.x - fromX,
    dy = f.y - fromY,
    d = Math.hypot(dx, dy) || 1;
  f.vx = (dx / d) * Math.max(knock, 120);
  f.vy = (dy / d) * Math.max(knock, 120);
  f.knockUntil = run.t + 0.18;
}

function hitYourself(run: Run, h: Hero, kind: 'image' | 'reflection') {
  if (run.over) return;
  if (!h.mirrorHurtAt) emit(run, { type: 'say', text: kind === 'image' ? 'Only an image, and it cut you. The real Mirror is the one that shoots.' : 'That was you. Walk past your reflections.' });
  h.mirrorHurtAt = run.t;
  const n = Math.max(2, Math.round(h.maxHp * SPLIT[kind]));
  h.hp -= n;
  emit(run, { type: 'hurt', x: h.x, y: h.y, dmg: n, by: kind });
  if (h.hp <= 0) fall(run, h);
}

function burst(run: Run, by: Hero, x: number, y: number, R: number, dmg: number, color: Extract<GameEvent, { type: 'burst' }>['color'], skip?: Foe, knock = 160) {
  for (const f of run.foes) {
    if (!f.alive || f === skip || Math.hypot(f.x - x, f.y - y) > R) continue;
    // A blast all around isn't aimed: it pushes copies (yours, the Mirror's) away instead of breaking them.
    if (f.kind === 'reflection' || f.kind === 'image') nudge(run, f, knock, x, y);
    else damage(run, by, f, dmg, knock, x, y);
  }
  for (const br of run.terrain.barrels) if (br.alive && Math.hypot(br.x - x, br.y - y) <= R) blowUp(run, br, by);
  emit(run, { type: 'burst', x, y, r: R, color });
}

/** A shot of `by`'s, from them (or from `at`: a friend on the Summit). */
function fire(run: Run, by: Hero, kind: 'arrow' | 'orb', angle: number, speed: number, dmg: number, pierce: number, target: Foe | null, at: { x: number; y: number } = by) {
  run.shots.push({ id: ++run.ids, kind, by, x: at.x, y: at.y - 6, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, dmg, pierce, target, hit: new Set(), dies: run.t + 1.6 });
}

function attack(run: Run, h: Hero) {
  h.cd.attack -= STEP;
  if (h.cd.attack > 0) return;
  const kind = attackOf(h.classId),
    reach = kind === 'slash' ? SLASH_REACH : RANGE,
    b = run.boss?.alive && run.setup.zone.boss !== 'mirror' && !untouchable(run, run.boss) && run.t >= run.boss.bornUntil && dist(run.boss, h) <= reach ? run.boss : null,
    target = locked(run, h, reach) ?? b ?? nearest(run, h.x, h.y, undefined, reach);
  if (!target && kind !== 'wave') return;
  if (kind === 'wave' && !nearest(run, h.x, h.y, undefined, 150)) return;
  h.cd.attack = attackCooldown(kind, h.power, h.ups) / (1 + DIALS.relic * 0.1 * relic(h, 'quick')) / bodyOf(h).haste;
  const n = 1 + (h.ups.multi ?? 0),
    dmg = pow(h, ATTACK[kind].dmg),
    angle = target ? Math.atan2(target.y - h.y, target.x - h.x) : h.facing;
  emit(run, { type: 'attack', kind, x: h.x, y: h.y, angle, n, r: kind === 'slash' ? SLASH_REACH - 10 : undefined });
  if (kind === 'arrow') {
    for (let i = 0; i < n; i++) fire(run, h, 'arrow', angle + (i - (n - 1) / 2) * 0.16, 430, dmg, 1, null);
  } else if (kind === 'orb' && target) {
    const hit = new Set<Foe>();
    for (let i = 0; i < n; i++) {
      const t = nearest(run, h.x, h.y, hit, RANGE) ?? target;
      hit.add(t);
      fire(run, h, 'orb', Math.atan2(t.y - h.y, t.x - h.x) + (i - (n - 1) / 2) * 0.4, 250, dmg, 0, t);
    }
  } else if (kind === 'wave') {
    for (let i = 0; i < n; i++) later(run, i * 0.18, () => burst(run, h, h.x, h.y, 110 + i * 20, dmg, 'wave'));
  } else {
    for (let i = 0; i < n; i++) slash(run, h, angle + (i * Math.PI * 2) / n, dmg);
  }
}

function slash(run: Run, h: Hero, angle: number, dmg: number) {
  const R = SLASH_REACH - 10;
  for (const f of run.foes) {
    if (!f.alive) continue;
    const d = dist(f, h);
    if (d > R + f.def.r) continue;
    let diff = Math.atan2(f.y - h.y, f.x - h.x) - angle;
    diff = Math.abs(Math.atan2(Math.sin(diff), Math.cos(diff)));
    if ((f.kind === 'reflection' || f.kind === 'image') && diff >= SPLIT.aim) {
      // Only a swing aimed at a copy (of you, or of the Mirror) shatters it: the edge of the arc
      // pushes it aside.
      if (diff < 1.3 || d < 22) nudge(run, f, 140, h.x, h.y);
      continue;
    }
    if (diff < 1.3 || d < 22) damage(run, h, f, dmg, 140);
  }
  for (const br of run.terrain.barrels) {
    if (!br.alive || Math.hypot(br.x - h.x, br.y - h.y) > R + BARREL.r) continue;
    const diff = Math.atan2(br.y - h.y, br.x - h.x) - angle;
    if (Math.abs(Math.atan2(Math.sin(diff), Math.cos(diff))) < 1.3) blowUp(run, br, h);
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
    if (s.x < ROOM.wall || s.x > run.area.w - ROOM.wall || s.y < ROOM.wall || s.y > run.area.h - ROOM.wall || inPillar(run, s.x, s.y, 2)) return false;
    for (const br of run.terrain.barrels)
      if (br.alive && closer(br.x - s.x, br.y - s.y, BARREL.r + 4)) {
        blowUp(run, br, s.by);
        return false;
      }
    let f: Foe | null = null;
    for (const o of run.foes) if (o.alive && !s.hit.has(o) && run.t >= o.bornUntil && !untouchable(run, o) && closer(o.x - s.x, o.y - s.y, o.def.r + 6)) f = o;
    if (!f) return true;
    s.hit.add(f);
    if (s.kind === 'orb') {
      damage(run, s.by, f, s.dmg, 60, s.x, s.y);
      burst(run, s.by, s.x, s.y, 56, s.dmg * 0.5, 'orb', f);
      return false;
    }
    damage(run, s.by, f, s.dmg, 90, s.x, s.y);
    return s.pierce-- > 0;
  });
}

function chain(run: Run, h: Hero, jumps: number, dmg: number) {
  const hit = new Set<Foe>(),
    points = [{ x: h.x, y: h.y - 10 }];
  let from = { x: h.x, y: h.y };
  for (let i = 0; i < jumps; i++) {
    const f = nearest(run, from.x, from.y, hit, i === 0 ? 300 : 160);
    if (!f) break;
    hit.add(f);
    points.push({ x: f.x, y: f.y });
    from = { x: f.x, y: f.y };
  }
  if (points.length < 2) return;
  emit(run, { type: 'chain', points });
  hit.forEach((f) => damage(run, h, f, dmg, 30));
}

function skills(run: Run, h: Hero) {
  const { power } = h,
    now = run.t;
  if (power.fireballs) {
    h.cd.fireball -= STEP;
    if (h.cd.fireball <= 0) {
      const target = nearest(run, h.x, h.y, undefined, RANGE);
      h.cd.fireball = target ? FIREBALL.every : 0.3;
      if (target) {
        const tx = target.x,
          ty = target.y;
        later(run, FIREBALL.flightMs / 1000, () => burst(run, h, tx, ty, FIREBALL.r, pow(h, FIREBALL.dmg), 'fire'));
      }
    }
  }
  if (power.fairy && h.hp < h.maxHp * FAIRY.below && now >= h.fairyAt) {
    h.fairyAt = now + FAIRY.restMs / 1000;
    const heal = Math.round(h.maxHp * FAIRY.heal);
    h.hp = Math.min(h.maxHp, h.hp + heal);
    emit(run, { type: 'heal', x: h.x, y: h.y, n: heal });
    emit(run, { type: 'say', text: `${power.flameName || 'Your flame'} heals you` });
  }
  if (h.flames > 0) {
    h.orbit += STEP * FLAME.spin;
    for (let i = 0; i < h.flames; i++) {
      const a = h.orbit + (i / h.flames) * Math.PI * 2,
        fx = h.x + Math.cos(a) * FLAME.orbit,
        fy = h.y + Math.sin(a) * FLAME.orbit;
      for (const f of run.foes) {
        if (!f.alive || now < f.flameAt || !closer(f.x - fx, f.y - fy, FLAME.touch + f.def.r - 10)) continue;
        f.flameAt = now + FLAME.every / 1000;
        damage(run, h, f, pow(h, FLAME.dmg), 60, fx, fy);
      }
      // A flame also eats the shots it touches.
      clearBullets(run, fx, fy, 12);
    }
  }
  const spark = h.ups.spark ?? 0;
  if (spark > 0) {
    h.cd.spark -= STEP;
    if (h.cd.spark <= 0) {
      h.cd.spark = 2;
      const hit = sparkHit(spark);
      chain(run, h, hit.jumps, pow(h, hit.dmg));
    }
  }
  const nova = h.ups.nova ?? 0;
  if (nova > 0) {
    h.cd.nova -= STEP;
    if (h.cd.nova <= 0) {
      h.cd.nova = 3;
      const hit = novaHit(nova);
      // The burst of light also wipes the shots inside it.
      clearBullets(run, h.x, h.y, hit.r);
      burst(run, h, h.x, h.y, hit.r, pow(h, hit.dmg), 'nova');
    }
  }
}

/** Your friends on the Summit: they keep beside you and help. The Wanderer shoots, Mira swings
    her hammer at what comes close, and Vela's lamp clears the shots around you. */
function helpers(run: Run) {
  // They walk beside you, and fight as yours.
  const h = run.hero,
    now = run.t;
  run.allies.forEach((a, i) => {
    const k = Math.min(1, 5 * STEP);
    a.x += (h.x + (i - 1) * 46 - a.x) * k;
    a.y += (h.y + 40 - a.y) * k;
    if (now < a.at || run.cleared) return;
    if (a.kind === 'wanderer') {
      const f = nearest(run, a.x, a.y, undefined, RANGE);
      if (!f) return;
      a.at = now + CLIMB.every.arrow;
      fire(run, h, 'arrow', Math.atan2(f.y - a.y, f.x - a.x), 430, pow(h, ATTACK.arrow.dmg * 0.9), 1, null, a);
      emit(run, { type: 'help', kind: a.kind, x: a.x, y: a.y, toX: f.x, toY: f.y });
    } else if (a.kind === 'mira') {
      const f = nearest(run, a.x, a.y, undefined, 170);
      if (!f) return;
      a.at = now + CLIMB.every.hammer;
      burst(run, h, f.x, f.y, 64, pow(h, ATTACK.slash.dmg * 1.4), 'fire', undefined, 220);
      emit(run, { type: 'help', kind: a.kind, x: a.x, y: a.y, toX: f.x, toY: f.y });
    } else {
      if (!run.bullets.some((b) => Math.hypot(b.x - h.x, b.y - h.y) < 110)) return;
      a.at = now + CLIMB.every.lamp;
      clearBullets(run, h.x, h.y, 110);
      emit(run, { type: 'help', kind: a.kind, x: a.x, y: a.y, toX: h.x, toY: h.y });
    }
  });
}

// ---------- light, levels, rooms ----------

function pullGems(run: Run) {
  // Each bit of light flies to the hero nearest it, and every standing hero gets its XP.
  run.gems = run.gems.filter((g) => {
    const h = prey(run, g.x, g.y),
      reach = gemReach(h.power, h.ups),
      dx = h.x - g.x,
      dy = h.y - g.y,
      d = Math.hypot(dx, dy);
    if (d < 16) {
      emit(run, { type: 'gem' });
      for (const o of standing(run)) gain(run, o, g.value);
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
  if (run.cleared || (isBossRoom(run) && !climbing(run))) return;
  const alive = run.foes.filter((f) => f.alive).length;
  if (run.waves.length && alive <= 2 && !run.timers.length) later(run, 0.8, () => nextWave(run));
  if (!run.waves.length && alive === 0) {
    run.cleared = true;
    if (!climbing(run)) cellOf(run).cleared = true;
    run.doorOpen = true;
    run.bullets = [];
    run.mines = [];
    openDoors(run);
    // Treasure and elite rooms leave a chest, and the Warden always does.
    if (run.kind === 'treasure' || run.kind === 'elite' || isWardenRoom(run)) {
      let x = run.area.w / 2,
        y = run.area.h * 0.45;
      for (let i = 0; i < 8 && inPillar(run, x, y, 30); i++) y += 40;
      run.chest = { x, y, opened: false };
      x = 0;
    }
    emit(run, { type: 'clear' });
  }
}

/** The room's doors, each to the room behind it on the map, and in the floor's last room the
    stairs down. On the Summit, one door: up to the next ledge. */
function openDoors(run: Run) {
  const { w, h } = run.area,
    c = cellOf(run),
    spot: Record<Side, [number, number]> = { e: [w / 2, 0], w: [w / 2, h], n: [0, h / 2], s: [w, h / 2] };
  if (climbing(run)) {
    run.doors = [{ side: 'e', x: w / 2, y: 0, to: c.id, kind: 'boss', been: false }];
    return;
  }
  run.doors = (Object.entries(c.links) as [Side, number][]).map(([side, to]) => ({ side, x: spot[side][0], y: spot[side][1], to, kind: run.map.cells[to].kind, been: run.map.cells[to].visited }));
  if (c.kind === 'stairs' || c.kind === 'warden') run.stairs = { x: w / 2, y: 110 };
}

function openChest(run: Run, h: Hero) {
  const c = run.chest;
  if (!c || c.opened) return;
  c.opened = true;
  const ids = Object.keys(RELICS) as RelicId[];
  const choices: RelicId[] = [];
  while (choices.length < 3) {
    const id = ids[Math.floor(run.rnd() * ids.length)];
    if (!choices.includes(id)) choices.push(id);
  }
  emit(run, { type: 'chest', x: c.x, y: c.y });
  if (run.rnd() < DROPS.chest) dropEach(run, c.x, c.y + 34, DROP_LUCK.chest);
  h.relicOffer = choices;
  if (run.setup.autoPick) pickRelic(run, RELIC_BOT.find((id) => choices.includes(id)) ?? choices[0], h);
}

export function pickRelic(run: Run, id: RelicId, h: Hero = run.hero) {
  if (!h.relicOffer) return;
  h.relicOffer = null;
  h.relics[id] = relic(h, id) + 1;
  if (id === 'heart') {
    h.maxHp += 20;
    h.hp = Math.min(h.maxHp, h.hp + 20);
  }
  if (id === 'coal') h.flames++;
  emit(run, { type: 'relic', id });
}

function gain(run: Run, h: Hero, n: number) {
  h.xp += n;
  while (h.xp >= xpToNext(h.level)) {
    h.xp -= xpToNext(h.level);
    h.level++;
    h.pendingLevels++;
  }
  if (h.pendingLevels > 0 && !h.offer) offer(run, h, null);
}

function offer(run: Run, h: Hero, free: FreePick | null) {
  const choices = rollUpgrades(h.ups, run.rnd);
  if (choices.length === 0) {
    h.pendingLevels = 0;
    h.free = [];
    h.hp = Math.min(h.maxHp, h.hp + 20);
    return;
  }
  if (!free) h.pendingLevels--;
  h.offer = { choices, free };
  if (run.setup.autoPick) pick(run, BOT_PICKS.find((id) => choices.includes(id)) ?? choices[0], h);
}

export function pick(run: Run, id: UpgradeId, h: Hero = run.hero) {
  if (!h.offer) return;
  h.offer = null;
  h.ups[id] = (h.ups[id] ?? 0) + 1;
  if (id === 'vital') {
    h.maxHp += 25;
    h.hp = h.maxHp;
  }
  if (id === 'flame') h.flames = h.base.flames + (h.ups.flame ?? 0) + relic(h, 'coal');
  if (h.free.length) offer(run, h, h.free.shift()!);
  else if (h.pendingLevels > 0) offer(run, h, null);
}

// ---------- things to wear ----------

/** A new item for where you are: its zone and floor, a class, a rarity leaning rarer with `luck`. */
function newItem(run: Run, luck: number, cls: ClassId | undefined): Item {
  const z = run.setup.zone;
  return rollItem(run.rnd, { zone: z.id, workouts: z.workouts, floor: floorOf10(run), cls }, rollRarity(run.rnd, floorOf10(run), luck));
}

function dropItem(run: Run, x: number, y: number, luck: number, to: Hero) {
  const { w, h } = run.area,
    m = ROOM.wall + 16,
    item = newItem(run, luck, to.classId);
  const l: Run['loot'][number] = { id: ++run.ids, x: clamp(x, m, w - m), y: clamp(y, m, h - m), item };
  if (run.party.length > 1) l.for = to.id;
  run.loot.push(l);
  if (to === run.hero) emit(run, { type: 'drop', x: l.x, y: l.y, item });
}

/** A drop is personal: each standing hero gets their own item, for their class, a little apart. */
function dropEach(run: Run, x: number, y: number, luck: number) {
  standing(run).forEach((h, i) => dropItem(run, x + i * 26, y, luck, h));
}

/** Loot a hero can see and take: theirs, or anyone's when there's no `for`. */
export const mine = (l: { for?: number }, h: Pick<Hero, 'id'>) => l.for === undefined || l.for === h.id;

/** Your power with what you wear: weapon damage, armor HP, charms, and your class's build. */
function applyGear(run: Run, h: Hero) {
  const t = itemTotals(ITEM_SLOTS.map((s) => h.gear.worn[s])),
    b = h.base,
    body = bodyOf(h);
  h.power = { ...b, health: b.health + (t.health ?? 0), armor: b.armor + body.armor + (t.armor ?? 0), damage: (1 + b.damage + (t.damage ?? 0)) * body.dmg - 1, speed: b.speed + (t.speed ?? 0), reach: b.reach + (t.pickup ?? 0) };
  h.gearFx = { move: t.move ?? 0, heal: t.heal ?? 0, cooldown: t.cooldown ?? 0 };
  const max = Math.round(heroMaxHp(h.power) * body.hp),
    d = max - h.gearMax;
  h.gearMax = max;
  h.maxHp += d;
  h.hp = Math.max(1, Math.min(h.maxHp, h.hp + Math.max(0, d)));
}

/** Points short of what an item asks (0: you can wear it). */
export const shortFor = (h: Pick<Hero, 'build'>, it: Item) => shortOf(it, h.build);

/** Wear an item from the bag; what you wore goes into the bag (the starter kit just goes). */
export function wear(run: Run, id: string, h: Hero = run.hero) {
  const it = h.gear.bag.find((o) => o.id === id);
  if (!it || shortFor(h, it) > 0) return;
  const old = h.gear.worn[it.slot];
  h.gear.bag = h.gear.bag.filter((o) => o !== it);
  if (old && !old.starter) h.gear.bag.push(old);
  h.gear.worn[it.slot] = it;
  applyGear(run, h);
}

/** Take a worn item off into the bag (a weapon or armor slot gets the starter kit back). */
export function takeOff(run: Run, slot: ItemSlot, h: Hero = run.hero) {
  const it = h.gear.worn[slot];
  if (!it || it.starter || h.gear.bag.length >= BAG) return;
  h.gear.bag.push(it);
  if (slot === 'charm') delete h.gear.worn.charm;
  else h.gear.worn[slot] = starterKit(h.classId)[slot];
  applyGear(run, h);
}

/** Leave an item from the bag on the floor. */
export function dropFromBag(run: Run, id: string, h: Hero = run.hero) {
  const it = h.gear.bag.find((o) => o.id === id);
  if (!it) return;
  h.gear.bag = h.gear.bag.filter((o) => o !== it);
  const l: Run['loot'][number] = { id: ++run.ids, x: h.x, y: h.y + 36, item: it, full: true };
  if (run.party.length > 1) l.for = h.id;
  run.loot.push(l);
  emit(run, { type: 'drop', x: l.x, y: l.y, item: it });
}

/** The bot wears what it picks up when it can and it's better than what it has. */
function botWear(run: Run, h: Hero, it: Item) {
  if (shortFor(h, it) === 0 && itemScore(it) > itemScore(h.gear.worn[it.slot])) wear(run, it.id, h);
  // It keeps room in the bag by leaving what it won't wear.
  if (h.gear.bag.length >= BAG) h.gear.bag.shift();
}

/** On the stairs: down to the next floor, out of the Fog with what you carry, or not yet. */
export function takeStairs(run: Run, choice: 'deeper' | 'leave' | 'stay') {
  if (!run.stairsAsk) return;
  run.stairsAsk = false;
  if (choice === 'deeper') downStairs(run);
  else if (choice === 'leave') {
    emit(run, { type: 'say', text: 'You walk back up into the light, with everything you carry.' });
    end(run, false, 'left');
  } else if (run.stairs) for (const h of run.party) h.y = run.stairs.y + 50;
}

// ---------- getting hit, ending ----------

function hurt(run: Run, h: Hero, dmg: number, by: 'shot' | 'touch') {
  const now = run.t;
  if (run.over || now < h.hurtUntil || now < h.ghostUntil) return;
  if (relic(h, 'charm') && now >= h.wardAt) {
    // The ward takes it.
    h.wardAt = now + WARD_EVERY;
    h.hurtUntil = now + INVULNERABLE;
    emit(run, { type: 'ward', x: h.x, y: h.y });
    return;
  }
  const taken = dmg * (1 - armorOf(h.power, h.ups)) / (1 + DIALS.relic * 0.14 * relic(h, 'iron'));
  h.hp -= taken;
  h.hurtUntil = now + INVULNERABLE;
  emit(run, { type: 'hurt', x: h.x, y: h.y, dmg: Math.round(taken), by });
  if (h.hp <= 0) fall(run, h);
}

/** A hero at 0 HP is down. The run ends when the whole party is. */
function fall(run: Run, h: Hero) {
  h.hp = 0;
  if (standing(run).length === 0) end(run, false, 'hp');
}

function end(run: Run, won: boolean, why: RunEnd['why']) {
  if (run.over) return;
  // On the Summit there's no top: however the climb ends, a ledge climbed is a win.
  if (run.climb !== null) won = run.climb >= 1;
  run.over = {
    won,
    seconds: Math.floor(run.t),
    kills: run.hero.kills,
    level: run.hero.level,
    hp: won ? Math.max(0, Math.ceil(run.hero.hp)) : 0,
    maxHp: run.hero.maxHp,
    floor: run.floor + 1,
    room: run.room + 1,
    bossAt: run.bossAt === null ? null : Math.floor(run.bossAt),
    why,
    height: run.climb,
    gear: { worn: Object.fromEntries(Object.entries(run.hero.gear.worn).filter(([, it]) => it && !it.starter)) as Partial<Record<ItemSlot, Item>>, bag: [...run.hero.gear.bag] },
  };
  if (!won) run.hero.hp = 0;
}

/** Developer mode: end the run as if the boss fell. */
export function winNow(run: Run) {
  end(run, true, 'boss');
}

/** Developer mode: down to the next floor's first room. */
export function skipFloor(run: Run) {
  if (run.boss || run.floor >= run.layout.floors - 1) return;
  run.timers = [];
  emit(run, { type: 'floor', floor: run.floor + 1 });
  newFloor(run, run.floor + 1);
}

/** Developer mode: straight to the Warden's room on the middle floor. */
export function skipToWarden(run: Run) {
  const f = wardenFloor(run.layout);
  if (run.boss || f < 0) return;
  run.timers = [];
  newFloor(run, f, true);
}

/** Developer mode: straight to the boss's room. */
export function skipToBoss(run: Run) {
  if (run.boss) return;
  run.timers = [];
  newFloor(run, run.layout.floors - 1, true);
}

/** Drains what happened since the last call. */
export function takeEvents(run: Run): GameEvent[] {
  const e = run.events;
  run.events = [];
  return e;
}
