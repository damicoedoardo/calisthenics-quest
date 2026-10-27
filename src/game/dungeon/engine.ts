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
/** A room, in world pixels: the smallest is about a phone screen, deeper ones run taller and the
    camera follows you. Walls are drawn inside it. */
export const ROOM = { w: 420, h: 760, wall: 22, door: 84 };

// ---------- the ground ----------

/** Water slows whoever wades in it. */
export const WATER = { hero: 0.55, foe: 0.6 };
/** Spikes rise every `every` s: a warning, then up for a moment. */
export const SPIKES = { every: 3, warn: 0.7, up: 0.7, dmg: 9 };
/** A barrel blows up when anything hits it: hard on monsters, and on you if you stand too close. */
export const BARREL = { r: 12, blast: 80, dmg: 30, hurt: 10 };
/** The shrine in the middle room of each floor heals you once (DIALS.shrine of your HP). */
export const SHRINE = { r: 18 };

// ---------- paths and loot ----------

/** What waits behind a door. After most rooms two doors open and you pick. */
export type RoomKind = 'fight' | 'elite' | 'treasure' | 'rest';
export const ROOM_KINDS: Record<RoomKind, { name: string; text: string }> = {
  fight: { name: 'Fight', text: 'Monsters.' },
  elite: { name: 'Elite', text: 'Fewer, much tougher monsters, and a chest.' },
  treasure: { name: 'Treasure', text: 'Monsters, and a chest at the end.' },
  rest: { name: 'Rest', text: 'No monsters: a shrine that heals you.' },
};
/** How often each kind is behind a door. */
const DOOR_ODDS: [RoomKind, number][] = [
  ['fight', 3],
  ['treasure', 2],
  ['elite', 2],
  ['rest', 1.3],
];
/** Doors on the left and right of the top wall, as a share of the room's width. */
export const DOOR_AT = [0.27, 0.73];
/** An elite monster: bigger, tougher, worth more. Elite rooms hold fewer of them. */
export const ELITE = { hp: 2.4, dmg: 1.25, r: 1.25, xp: 1.5, crowd: 0.5 };

/** Items found in chests: they last for the run. Each can be found again and stacks. */
export type RelicId = 'whetstone' | 'quick' | 'iron' | 'boots' | 'heart' | 'hourglass' | 'fang' | 'coal' | 'charm';
export const RELICS: Record<RelicId, { name: string; text: string }> = {
  whetstone: { name: 'Whetstone', text: '+12% damage.' },
  quick: { name: 'Quick Hands', text: 'Attack 10% faster.' },
  iron: { name: 'Iron Skin', text: 'Take about 12% less damage.' },
  boots: { name: 'Light Boots', text: 'Move 10% faster, and water slows you less.' },
  heart: { name: 'Heart Stone', text: '+20 max HP, and heal 20.' },
  hourglass: { name: 'Hourglass', text: 'Your ability recharges 20% faster.' },
  fang: { name: 'Fang', text: 'Heal 1 HP for every monster you bring down.' },
  coal: { name: 'Ember Coal', text: 'One more fire circles you.' },
  charm: { name: 'Ward Charm', text: 'A ward blocks one hit, and comes back after 12 s.' },
};
/** The bot's order when it opens a chest. */
const RELIC_BOT: RelicId[] = ['whetstone', 'heart', 'iron', 'quick', 'charm', 'fang', 'hourglass', 'coal', 'boots'];
const WARD_EVERY = 12;
/** How many of a relic you have. */
export const relic = (run: Pick<Run, 'relics'>, id: RelicId) => run.relics[id] ?? 0;

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
/** How deep a dungeon goes: sized so a whole run down to the boss takes about 15 minutes. */
export interface Layout {
  floors: number;
  rooms: number;
}
export const LAYOUT: Layout = { floors: 10, rooms: 5 };

/** The dials balance tests turn (scripts/fog-sim.mjs). */
export const DIALS = {
  /** Monster HP, on top of the zone's. */
  hp: 1.3,
  /** How often monsters shoot (2 = twice as often). */
  fire: 3,
  /** How fast their shots fly. */
  speed: 1.5,
  /** How many monsters a room holds. */
  crowd: 1,
  /** Share of HP back on the stairs to each new floor. */
  stairs: 0.1,
  /** How strong chest items are (1 = as their text says). */
  relic: 1,
  /** How much more HP monsters have on the boss's floor than on the first (2 = three times). */
  deep: 3,
  /** How much harder they hit there (3 = four times): chest items, levels and the dodge make you grow fast. */
  deepDmg: 3.6,
  /** Share of HP the shrine on each floor gives back. */
  shrine: 0.25,
};
const HERO_R = 10;
/** After a hit you can't be hit again for this long (s). */
const INVULNERABLE = 0.5;
/** A boss you can't bring down in this long (s): the Fog closes in. */
export const BOSS_LIMIT = 180;
/** A run can't last longer than this (s), so a stuck run still ends. */
const RUN_LIMIT = 2400;

// ---------- monsters ----------

export type MonsterKind = 'slime' | 'wisp' | 'mirror' | 'golem' | 'reflection' | 'ram' | 'book' | 'smoke' | 'seeker' | 'splitter' | 'splitling' | 'shade' | 'warden' | 'image' | MidKind;
/** The floor-5 mid-bosses, one per zone (MIDS). */
export type MidKind = 'warden' | 'lantern' | 'foreman' | 'sandGolem' | 'whisper' | 'gale';
export type FoeKind = MonsterKind | 'boss';

/** How a monster moves: walks at you, keeps its distance, circles you at its range, stands still,
    winds up and charges in a line, or vanishes and appears somewhere near you. */
type Move = 'chase' | 'keep' | 'orbit' | 'still' | 'charge' | 'blink';

/** What a shot does on its way: curve after you, bounce off walls, start slow and speed up, wiggle. */
export type ShotStyle = 'plain' | 'homing' | 'bounce' | 'ramp' | 'wiggle';

/** One way a monster shoots, every `every` seconds. */
export interface Pattern {
  every: number;
  /** aimed: n bullets at you; spread: n in a fan of `arc` radians; ring: n all around; spiral: n
      around, turning a bit each time; mine: lobbed where you stand, it blows up a moment later. */
  kind: 'aimed' | 'spread' | 'ring' | 'spiral' | 'mine';
  n: number;
  arc?: number;
  speed: number;
  dmg: number;
  style?: ShotStyle;
  /** Seconds before the first volley. */
  first?: number;
  /** Bullet radius (a mine's blast). */
  r?: number;
  /** Only below this share of HP (a boss's second phase). */
  below?: number;
  /** Only above this share of HP (a first phase that stops when the second starts). */
  above?: number;
  /** How far a spiral turns between volleys (radians). */
  turn?: number;
  /** Fired only when a charge ends or a blink lands, not on a clock. */
  on?: 'move';
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
  // Winds up (it glows red), then charges in a straight line and throws a ring where it stops.
  ram: { hp: 30, speed: 34, dmg: 13, r: 15, xp: 2, move: 'charge', shoots: [{ every: 0, on: 'move', kind: 'ring', n: 6, speed: 95, dmg: 7 }], cost: 2 },
  // A floating book that never moves and turns a slow spiral of pages.
  book: { hp: 34, speed: 0, dmg: 8, r: 14, xp: 2, move: 'still', shoots: [{ every: 0.55, kind: 'spiral', n: 3, speed: 80, dmg: 7, style: 'wiggle', first: 1.4 }], cost: 2.5 },
  // Lobs smoke bombs where you stand: step off the circle before it bursts.
  smoke: { hp: 18, speed: 70, dmg: 6, r: 12, xp: 2, move: 'orbit', range: 200, shoots: [{ every: 2.8, kind: 'mine', n: 6, speed: 90, dmg: 11, r: 46, first: 1.5 }], cost: 2 },
  // Keeps away and sends shots that curve after you for a moment.
  seeker: { hp: 26, speed: 46, dmg: 8, r: 14, xp: 2, move: 'keep', range: 230, shoots: [{ every: 3, kind: 'aimed', n: 2, speed: 115, dmg: 8, style: 'homing', first: 1.6 }], cost: 2.5 },
  // A big slime that bounces shots off the walls and falls apart into three small ones.
  splitter: { hp: 48, speed: 36, dmg: 11, r: 18, xp: 3, move: 'chase', shoots: [{ every: 3.2, kind: 'ring', n: 8, speed: 90, dmg: 7, style: 'bounce', first: 1.6 }], cost: 3 },
  splitling: { hp: 9, speed: 74, dmg: 5, r: 10, xp: 0, move: 'chase', shoots: [], cost: 0 },
  // A shade of you: vanishes, lands near you (watch for the mark) and fires a ring that starts slow.
  shade: { hp: 30, speed: 60, dmg: 9, r: 13, xp: 3, move: 'blink', range: 190, shoots: [{ every: 0, on: 'move', kind: 'ring', n: 10, speed: 140, dmg: 8, style: 'ramp' }], cost: 3 },
  // The Warden of the Ashes, halfway down: a great golem that guards the stairs. First it turns a
  // slow cross of shots (walk around it with the arms); hurt past half, it stops turning and fires
  // aimed bursts at you, with a ring now and then. It never joins an ordinary room.
  warden: {
    hp: 850,
    speed: 32,
    dmg: 18,
    r: 26,
    xp: 30,
    move: 'chase',
    shoots: [
      { every: 0.16, kind: 'spiral', n: 4, speed: 75, dmg: 8, turn: 0.12, above: 0.5, first: 1.2 },
      { every: 2.4, kind: 'spread', n: 7, arc: 1, speed: 115, dmg: 10, above: 0.5, first: 2.5 },
      { every: 1.3, kind: 'aimed', n: 3, speed: 125, dmg: 9, below: 0.5 },
      { every: 2.6, kind: 'ring', n: 20, speed: 82, dmg: 9, below: 0.5 },
    ],
    cost: 0,
  },
  // The Mirror's images of itself: they look just like it, but only the real one shoots. A hit
  // shatters an image, and hurts you.
  image: { hp: 1, speed: 36, dmg: 12, r: 16, xp: 0, move: 'keep', range: 190, shoots: [], cost: 0 },
  // The other zones' mid-bosses (MIDS): each a small echo of its zone's lesson.
  // The Drowned Lantern (Mirror Lake): the room dims while it burns; each hit brings light back.
  lantern: {
    hp: 820,
    speed: 40,
    dmg: 14,
    r: 22,
    xp: 30,
    move: 'keep',
    range: 200,
    shoots: [
      { every: 2.6, kind: 'ring', n: 14, speed: 85, dmg: 8, style: 'wiggle', first: 1.5 },
      { every: 1.9, kind: 'aimed', n: 2, speed: 110, dmg: 8, style: 'homing', above: 0.5, first: 2.2 },
      { every: 0.2, kind: 'spiral', n: 3, speed: 80, dmg: 7, turn: 0.2, below: 0.5 },
    ],
    cost: 0,
  },
  // The Foreman (the Village): mends and rebuilds its crew, unless it's been hit just before.
  foreman: {
    hp: 700,
    speed: 44,
    dmg: 16,
    r: 20,
    xp: 30,
    move: 'keep',
    range: 170,
    shoots: [
      { every: 2.2, kind: 'spread', n: 5, arc: 0.8, speed: 120, dmg: 9, first: 1.8 },
      { every: 1.4, kind: 'aimed', n: 2, speed: 130, dmg: 9, first: 2.4 },
      { every: 3.2, kind: 'ring', n: 16, speed: 90, dmg: 8, below: 0.5 },
    ],
    cost: 0,
  },
  // The Sand Golem (the Plateau): walks, then stands and hardens. It only takes hits while it walks.
  sandGolem: {
    hp: 620,
    speed: 46,
    dmg: 18,
    r: 24,
    xp: 30,
    move: 'chase',
    shoots: [
      { every: 1.6, kind: 'aimed', n: 3, speed: 120, dmg: 9, first: 1.5 },
      { every: 2.4, kind: 'spread', n: 9, arc: 1.4, speed: 105, dmg: 9, below: 0.5 },
    ],
    cost: 0,
  },
  // The Whisper (the Fog): a wisp among wisps, that trades places with one of them.
  whisper: {
    hp: 480,
    speed: 70,
    dmg: 12,
    r: 15,
    xp: 30,
    move: 'orbit',
    range: 170,
    shoots: [
      { every: 1.8, kind: 'spread', n: 5, arc: 0.7, speed: 135, dmg: 9, first: 1.6 },
      { every: 2.8, kind: 'ring', n: 12, speed: 95, dmg: 8, style: 'ramp', below: 0.5 },
    ],
    cost: 0,
  },
  // The Gale (the Summit): gusts that blow you toward the edge of the room, where the drop bites.
  gale: {
    hp: 640,
    speed: 26,
    dmg: 14,
    r: 22,
    xp: 30,
    move: 'keep',
    range: 120,
    shoots: [
      { every: 0.3, kind: 'spiral', n: 2, speed: 85, dmg: 7, turn: 0.3, first: 1.5 },
      { every: 2.5, kind: 'aimed', n: 3, speed: 130, dmg: 9, below: 0.5 },
    ],
    cost: 0,
  },
};
/** How the Mirror splits: how often (s), when first, how long the images stay, and how long your
    reflections stay; how much of your HP it costs to hit an image, or a reflection of you; and how
    close to a sword's aim (radians) a reflection must be for the swing to break it. */
export const SPLIT = { every: 11, first: 6, last: 7, stay: 8, image: 0.08, reflection: 0.025, aim: 0.35 };
/** A floor-5 mid-boss: its monster, its name, and what is said as it rises, past half, and as it
    falls. Each is a smaller echo of its zone's lesson. */
export interface MidBoss {
  kind: MidKind;
  name: string;
  enter: string;
  hot: string;
  fall: string;
}
/** The mid-boss guarding the last room of the middle floor (floor 5 of 10), by zone. */
export const MIDS: MidBoss[] = [
  { kind: 'warden', name: 'the Warden of the Ashes', enter: 'The Warden of the Ashes guards the stairs. Walk with its turning arms.', hot: 'The Warden burns hotter. It aims at you now: keep moving.', fall: 'The Warden falls. It leaves a chest.' },
  { kind: 'lantern', name: 'the Drowned Lantern', enter: 'The Drowned Lantern dims the room. Every hit on it brings the light back.', hot: 'The Lantern flickers. What you see is less than what is there.', fall: 'The Lantern goes out, and the room is clear to see. It leaves a chest.' },
  { kind: 'foreman', name: 'the Foreman', enter: 'The Foreman mends its crew. Keep hitting it, and it has no time to.', hot: 'The Foreman works faster. So can you.', fall: 'The Foreman stops, and its crew falls apart. It leaves a chest.' },
  { kind: 'sandGolem', name: 'the Sand Golem', enter: 'The Sand Golem turns to stone when it stands still. Hit it while it walks.', hot: 'Cracks run through the sand. Keep going.', fall: 'The Sand Golem pours away. It leaves a chest.' },
  { kind: 'whisper', name: 'the Whisper', enter: 'The Whisper hides among the wisps. Watch for the one that glows before it moves.', hot: 'The Whisper grows louder. It is still only a whisper.', fall: 'The Whisper goes quiet, and the wisps with it. It leaves a chest.' },
  { kind: 'gale', name: 'the Gale', enter: 'The Gale blows you toward the edge. Lean into it, and step back in.', hot: 'The Gale blows harder. Stay near the middle.', fall: 'The Gale drops to a breeze. It leaves a chest.' },
];
export const midBoss = (zone: Pick<Zone, 'id'>) => MIDS[clamp(zone.id, 0, MIDS.length - 1)];
/** The Warden of the Ashes, the first zone's mid-boss. */
export const WARDEN = MIDS[0];
/** The Drowned Lantern's dark: how far you see when it rises, at its darkest, how fast it dims
    (px/s), and how much light each hit brings back. */
export const DIM = { full: 300, low: 120, fade: 9, back: 5 };
/** The Foreman's crew: how many, who, how often it mends them (s), and how long a hit on it keeps
    it from mending. */
export const CREW = { size: 3, kinds: ['ram', 'slime', 'ram'] as MonsterKind[], every: 3.2, guard: 1.6 };
/** The Sand Golem: seconds walking (hits land) and standing (hard as stone). */
export const SAND = { walk: 2.8, rest: 2.2 };
/** The Whisper: wisps around it, how often it trades places with one (s), and the glow before. */
export const SWAP = { crowd: 5, every: 4.2, wind: 0.8 };
/** The Gale: how often it gusts (s), the warning, how long a gust blows, how hard (px/s), how
    close to the wall the drop bites, and what it costs. */
export const GALE = { every: 5.5, wind: 1, blow: 2, push: 105, edge: 60, bite: 10 };
/** The floor (from 0) whose last room holds the Warden, or -1 when the dungeon is too short for one. */
export const wardenFloor = (layout: Layout) => (layout.floors >= 4 ? Math.floor(layout.floors / 2) - 1 : -1);
export const isWardenRoom = (r: Pick<Run, 'floor' | 'room' | 'layout'>) => r.floor === wardenFloor(r.layout) && r.room === r.layout.rooms - 1;

/** Monsters that join deeper down, by the floor (of 10) they first show on and how common they are. */
const UNLOCK: [MonsterKind, number, number][] = [
  ['slime', 0, 3],
  ['wisp', 0, 2.5],
  ['ram', 1, 2],
  ['mirror', 2, 1.5],
  ['book', 3, 1.5],
  ['smoke', 4, 1.6],
  ['seeker', 5, 1.6],
  ['splitter', 6, 1.6],
  ['shade', 7, 1.6],
];

/** How each zone's dungeon differs from the first: who lives there and when they join (by the
    floor of 10 they first show on, and how common they are), what lies on the ground (each a
    multiplier on the first zone's amounts), and how far you see. Zones are the story's chapters,
    so each dungeon looks and fights like its chapter: a lake, a village, a plateau, the fog, the
    climb. */
export interface ZoneDungeon {
  unlock: [MonsterKind, number, number][];
  ground: { water: number; spikes: number; barrels: number; pillars: number };
  /** How far you see, in world pixels (the fog); the bot doesn't see shots past it either. */
  sight?: number;
}
export const ZONE_DUNGEONS: ZoneDungeon[] = [
  // The Ashlands: the first dungeon, everything met one floor at a time.
  { unlock: UNLOCK, ground: { water: 1, spikes: 1, barrels: 1, pillars: 1 } },
  // Mirror Lake: mirrors early and seekers soon after, shades (shadows of you) sooner; a pool in most rooms.
  {
    unlock: [
      ['slime', 0, 2.5],
      ['wisp', 0, 2.5],
      ['mirror', 0, 1.1],
      ['seeker', 2, 1.6],
      ['ram', 2, 1.6],
      ['shade', 3, 1.8],
      ['book', 4, 1.4],
      ['splitter', 5, 1.6],
      ['smoke', 6, 1.6],
    ],
    ground: { water: 1.7, spikes: 0.6, barrels: 0.5, pillars: 1 },
  },
  // The Village of Almosts, its forges gone cold: rams and smoke from the chimneys, the Book of
  // Days in every doorway, barrels everywhere, houses (pillars) to walk around.
  {
    unlock: [
      ['slime', 0, 2],
      ['ram', 0, 2.2],
      ['wisp', 0, 1.5],
      ['smoke', 1, 1.8],
      ['book', 2, 1.6],
      ['mirror', 3, 1.4],
      ['splitter', 4, 1.6],
      ['seeker', 5, 1.6],
      ['shade', 6, 1.6],
    ],
    ground: { water: 0.5, spikes: 1, barrels: 2.5, pillars: 1.8 },
  },
  // The Plateau: open flat ground with little to hide behind; stone things, rams and seekers.
  {
    unlock: [
      ['slime', 0, 2],
      ['ram', 0, 2],
      ['seeker', 0, 1.4],
      ['splitter', 1, 1.8],
      ['mirror', 2, 1.5],
      ['wisp', 3, 1.5],
      ['smoke', 4, 1.6],
      ['book', 5, 1.5],
      ['shade', 6, 1.7],
    ],
    ground: { water: 0.3, spikes: 1.3, barrels: 0.6, pillars: 0.3 },
  },
  // The Fog: you see only a little way; wisps, shades and smoke live in it.
  {
    unlock: [
      ['wisp', 0, 3],
      ['slime', 0, 1.5],
      ['shade', 0, 1.2],
      ['smoke', 1, 1.8],
      ['seeker', 2, 1.6],
      ['splitter', 3, 1.6],
      ['ram', 4, 1.6],
      ['mirror', 5, 1.4],
      ['book', 6, 1.4],
    ],
    ground: { water: 1, spikes: 1, barrels: 0.8, pillars: 1.2 },
    sight: 190,
  },
  // The Summit: everything the road has met, from the start; ledges of rock and ice water.
  {
    unlock: [
      ['slime', 0, 1.5],
      ['wisp', 0, 2],
      ['ram', 0, 1.6],
      ['mirror', 1, 1.5],
      ['seeker', 1, 1.6],
      ['smoke', 2, 1.6],
      ['book', 3, 1.5],
      ['splitter', 3, 1.6],
      ['shade', 4, 1.7],
    ],
    ground: { water: 1.2, spikes: 1.3, barrels: 1, pillars: 1.3 },
  },
];
/** The dungeon of a run's zone. */
export const zoneDungeon = (zone: Pick<Zone, 'id'>) => ZONE_DUNGEONS[clamp(zone.id, 0, ZONE_DUNGEONS.length - 1)];

/** A line about each monster the first time it shows up in a run. */
export const MEET: Partial<Record<MonsterKind, string>> = {
  ram: 'Rams glow red, then charge in a line: step aside.',
  mirror: 'Mirrors keep their distance and fire rings.',
  book: 'The Book of Days never moves. It turns a spiral of pages.',
  smoke: 'Smoke wisps lob bombs where you stand. Leave the circle.',
  seeker: 'Seekers fire shots that curve after you.',
  splitter: 'Splitters bounce shots off the walls, and fall apart when hit hard enough.',
  shade: 'Shades vanish and land next to you. Watch for the mark.',
};

/** Floor 1 to 10 of the 10, whatever the layout. */
const floorOf10 = (run: Run) => Math.round(depth(run) * 9);

/**
 * The bosses, each fighting by its chapter's lesson:
 * - Tomorrow heals and splits while you keep away from it: get close.
 * - The Mirror sends reflections of you into your way, and hitting them hurts you; it splits into
 *   images of itself, and only the real one shoots: aim at the real one.
 * - The Perfect Knight wears plates that any hit breaks, and shouts you away: keep hitting.
 * - The Plateau never shows its HP: it cracks, and nothing seems to change, until it shatters.
 * - The Hollow can't be brought down: stand in its light long enough, and take its hand.
 * - The Summit is a climb with no top: ledge after ledge with your friends, as high as you go.
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
    hp: 600,
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
    shoots: [
      { every: 2.6, kind: 'spread', n: 5, arc: 0.6, speed: 165, dmg: 11, first: 1.5 },
      // Down to half his plates he stops posing: quick pairs of thrown blades, and a ring.
      { every: 1.2, kind: 'aimed', n: 2, speed: 150, dmg: 9, below: 0.5 },
      { every: 3.4, kind: 'ring', n: 14, speed: 95, dmg: 9, below: 0.5 },
    ],
    cost: 0,
  },
  // A stone giant so still it looks like part of the land. It never shows how hurt it is.
  plateau: {
    hp: 1000,
    speed: 24,
    dmg: 22,
    r: 24,
    xp: 0,
    move: 'chase',
    shoots: [
      { every: 2.8, kind: 'ring', n: 18, speed: 85, dmg: 10, style: 'ramp', first: 2 },
      { every: 1.7, kind: 'aimed', n: 1, speed: 115, dmg: 14, r: 12, first: 1 },
      { every: 0.18, kind: 'spiral', n: 2, speed: 80, dmg: 8, turn: 0.23, first: 4 },
    ],
    cost: 0,
  },
  // The Hollow can't be brought down: its light is where you go.
  hollow: {
    hp: 1,
    speed: 30,
    dmg: 0,
    r: 16,
    xp: 0,
    move: 'still',
    shoots: [
      { every: 1.5, kind: 'aimed', n: 3, speed: 125, dmg: 10, first: 1.5 },
      { every: 3, kind: 'ring', n: 16, speed: 95, dmg: 10, first: 2.5 },
    ],
    cost: 0,
  },
  // The Summit is never fought: it is the climb itself (see CLIMB).
  summit: { hp: 1, speed: 0, dmg: 0, r: 20, xp: 0, move: 'still', shoots: [], cost: 0 },
} as Record<FogBoss, MonsterDef & { plates?: number }>;

/** Bosses are as tough as the floor they guard (like its monsters), so the fight lasts long
    enough for its rule to matter. */
export const BOSS_HP = 5;
/** The Knight's armor clanks: after a plate falls, the next can't fall for this long (s). */
export const PLATE_EVERY = 0.35;
/** The Plateau shows a new crack each time this share of its HP is gone. */
export const CRACK = 0.1;
/** The Hollow's light: its reach, how long you stand in it without stepping out to take its
    hand (s), and how long it stays dark, then lit. While lit, it tests you with a turning spiral. */
export const LIGHT = { r: 78, hold: 3, dark: 7, lit: 4.5, first: 6, drift: 16, spiral: { every: 0.11, kind: 'spiral', n: 3, speed: 72, dmg: 9, turn: 0.19 } as Pattern };
/** The Summit's climb: how long the light lasts on the mountain (s), how much tougher each ledge
    makes the monsters, the HP back on each ledge, and how often your friends help (s). */
export const CLIMB = { limit: 120, tougher: 0.14, heal: 0.08, every: { arrow: 0.8, hammer: 3.2, lamp: 5 } };
export type AllyKind = 'wanderer' | 'mira' | 'vela';
export interface Ally {
  kind: AllyKind;
  x: number;
  y: number;
  /** Its next turn to help (run seconds). */
  at: number;
}

/** Tomorrow heals while you're further than this. */
export const TOMORROW_REACH = 200;
/** A ram's charge: how often, how long it glows first, how long and fast it rushes. */
export const CHARGE = { every: 3.6, wind: 0.75, dash: 0.6, speed: 330 };
/** A shade's blink: how often, how long its landing spot is marked, how close to you it lands. */
export const BLINK = { every: 3.8, mark: 0.8, near: 110 };
/** A smoke bomb's flight and fuse (s). */
export const MINE = { flight: 0.55, fuse: 1.1 };
/** Homing shots turn this fast (rad/s), for this long (s). */
const HOMING = { turn: 1.9, for: 1.3 };
/** Slow-then-fast shots start at this share of their speed and reach it over `over` s. */
const RAMP = { from: 0.25, over: 1.1 };

// ---------- class abilities ----------

export type AbilityId = 'charge' | 'volley' | 'blink' | 'still' | 'shock';

export const ABILITIES: Record<AbilityId, { name: string; text: string; cd: number }> = {
  charge: { name: 'Charge', text: 'Rush ahead, untouchable, hitting everything you pass and cutting the shots in your way.', cd: 6 },
  volley: { name: 'Volley', text: 'Loose arrows all around you that pierce through.', cd: 7 },
  blink: { name: 'Blink', text: 'Vanish and appear ahead, bursting where you land and wiping shots nearby.', cd: 8 },
  still: { name: 'Stillness', text: 'Breathe: heal some HP and push everything away.', cd: 14 },
  shock: { name: 'Shockwave', text: 'Knock back everything near you and wipe the shots around you.', cd: 7 },
};
/** Every class can dodge: a short dash, untouchable for a moment, on its own short clock. */
export const DODGE = { cd: 2.5, speed: 480, secs: 0.17, ghost: 0.27 };

/** Up close you take more hits, so the sword's class is built to: more HP and armor. */
/**
 * Each class in the dungeon, against the others: HP, armor, damage (orbs and waves hit crowds, so
 * less each), move speed and attack speed. Up close you have to walk in and back out, so the sword
 * and open hands are quicker on their feet and swing faster.
 */
export const CLASS_BODY: Record<'slash' | 'arrow' | 'orb' | 'wave', { hp: number; armor: number; dmg: number; move: number; haste: number }> = {
  slash: { hp: 1.22, armor: 0.18, dmg: 1.08, move: 1.2, haste: 1.1 },
  wave: { hp: 1.25, armor: 0.12, dmg: 1.03, move: 1.15, haste: 1.1 },
  arrow: { hp: 1.05, armor: 0, dmg: 1.13, move: 1, haste: 1 },
  orb: { hp: 0.9, armor: 0, dmg: 0.67, move: 1, haste: 1 },
};
const bodyOf = (run: Run) => CLASS_BODY[attackOf(run.setup.classId)];

export function abilityOf(cls: ClassId | undefined): AbilityId {
  return cls === 'warrior' ? 'charge' : cls === 'archer' ? 'volley' : cls === 'mage' ? 'blink' : cls === 'monk' ? 'still' : 'shock';
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
  /** The dodge button went down this step. */
  dodge?: boolean;
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
  /** How many ledges of the Summit's climb you went up, or null off the Summit. */
  height: number | null;
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
  /** This room's size, and what's on its floor. */
  area: { w: number; h: number };
  terrain: Terrain;
  /** Waves still to come in this room. */
  waves: MonsterKind[][];
  mines: Mine[];
  /** This room's kind, the one behind the door you're walking to, and the doors once open. */
  kind: RoomKind;
  nextKind: RoomKind;
  doors: { x: number; kind: RoomKind }[];
  chest: { x: number; y: number; opened: boolean } | null;
  relics: Partial<Record<RelicId, number>>;
  /** Three items to pick from, from an opened chest: the run holds still until one is taken. */
  relicOffer: RelicId[] | null;
  /** The Ward Charm's ward is up from then. */
  wardAt: number;
  /** Monsters already met this run (their first time gets a line). */
  met: Set<MonsterKind>;
  cleared: boolean;
  doorOpen: boolean;
  hero: { x: number; y: number; vx: number; vy: number; facing: number };
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
  /** The floor-5 mid-boss (the Warden of the Ashes, the Drowned Lantern...) while it stands. */
  warden: Foe | null;
  /** How far you see while the Drowned Lantern burns (px), or null. */
  dim: number | null;
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

/** On the Summit, the boss's room is the first ledge of the climb, and every ledge after it. */
const climbing = (run: Run) => run.setup.zone.boss === 'summit' && isBossRoom(run);
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
    area: { w: ROOM.w, h: ROOM.h },
    terrain: { water: [], pillars: [], spikes: [], barrels: [], shrine: null },
    waves: [],
    mines: [],
    met: new Set(['slime', 'wisp', 'golem', 'reflection', 'splitling']),
    kind: 'fight',
    nextKind: 'fight',
    doors: [],
    chest: null,
    relics: {},
    relicOffer: null,
    wardAt: 0,
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
    dodgeAt: 0,
    warden: null,
    dim: null,
    wind: { x: 0, y: 0 },
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
    bossSummon: 0,
    hold: 0,
    climb: null,
    allies: [],
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

/** What a room holds: a budget of monsters that grows with depth (and the room's size), in three
    waves; each floor ends with a golem. New kinds join deeper down, and show up more on the floor
    they first appear. */
function fillRoom(run: Run): MonsterKind[][] {
  const { room } = run,
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
  if (run.climb !== null ? run.climb % 2 === 1 : room === run.layout.rooms - 1) waves[2].push('golem');
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
    a shrine in the middle room of every floor. Kept off the door's lane and where you walk in. */
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
    for (const at of [0.5, ...DOOR_AT]) if (Math.abs(x - w * at) < ROOM.door / 2 + 26 + r && y < 170 + r) return false;
    if (Math.hypot(x - w / 2, y - (h - 70)) < 110 + r) return false;
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

function enterRoom(run: Run) {
  run.foes = [];
  run.bullets = [];
  run.shots = [];
  run.gems = [];
  run.mines = [];
  run.cleared = false;
  run.doorOpen = false;
  run.doors = [];
  run.chest = null;
  run.kind = isBossRoom(run) || isWardenRoom(run) ? 'fight' : run.nextKind;
  run.nextKind = 'fight';
  run.area = roomSize(run);
  run.terrain = buildTerrain(run);
  run.hero.x = run.area.w / 2;
  run.hero.y = run.area.h - 70;
  run.charge = null;
  run.warden = null;
  run.dim = null;
  run.wind = { x: 0, y: 0 };
  emit(run, { type: 'room' });
  if (climbing(run)) {
    startLedge(run);
    return;
  }
  if (isBossRoom(run)) {
    run.waves = [];
    later(run, 1.2, () => summonBoss(run));
    return;
  }
  if (isWardenRoom(run)) {
    // The Warden alone: it rises at the top of the room while you walk in.
    run.waves = [];
    const mid = midBoss(run.setup.zone),
      f = addFoe(run, mid.kind, run.area.w / 2, 170);
    f.bornUntil = run.t + 1.4;
    f.next = f.def.shoots.map((p) => run.t + 1.4 + (p.first ?? p.every));
    run.warden = f;
    startMid(run, f);
    emit(run, { type: 'warden' });
    emit(run, { type: 'say', text: mid.enter });
    return;
  }
  if (run.kind !== 'fight') emit(run, { type: 'say', text: `${ROOM_KINDS[run.kind].name} room. ${ROOM_KINDS[run.kind].text}` });
  run.waves = run.kind === 'rest' ? [] : fillRoom(run);
  if (run.waves.length) later(run, 0.6, () => nextWave(run));
}

/** Whether a body of radius r at x, y would sit inside a pillar. */
const inPillar = (run: Run, x: number, y: number, r: number) => run.terrain.pillars.some((p) => Math.hypot(p.x - x, p.y - y) < p.r + r);

/** A point in the room for a monster: in the upper part, away from you and out of the pillars. */
function spawnPoint(run: Run): [number, number] {
  const m = ROOM.wall + 30,
    { w, h } = run.area;
  for (let i = 0; i < 20; i++) {
    const x = m + run.rnd() * (w - 2 * m),
      y = m + run.rnd() * (h * 0.6);
    if (Math.hypot(x - run.hero.x, y - run.hero.y) > 220 && !inPillar(run, x, y, 24)) return [x, y];
  }
  return [w / 2, m + 20];
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
  const hp = def.plates ?? Math.round(def.hp * zone.hp * BOSS_HP);
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

/** Walk through the open door: the next room, the next floor, or (past the last) nothing. */
function throughDoor(run: Run, kind: RoomKind) {
  run.nextKind = kind;
  if (climbing(run)) {
    // Up to the next ledge: the same room of the map, one ledge higher.
    run.climb = (run.climb ?? 0) + 1;
    const heal = Math.round(run.maxHp * CLIMB.heal);
    run.hp = Math.min(run.maxHp, run.hp + heal);
    emit(run, { type: 'ledge', height: run.climb });
    emit(run, { type: 'heal', x: run.hero.x, y: run.hero.y, n: heal });
    enterRoom(run);
    return;
  }
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
  if (run.over || run.paused || run.offer || run.relicOffer) return;
  run.t += STEP;
  const now = run.t;
  for (let i = 0; i < run.timers.length; i++) {
    if (run.timers[i].at <= now) {
      const fn = run.timers[i].run;
      run.timers.splice(i--, 1);
      fn();
      if (run.over || run.offer || run.relicOffer) return;
    }
  }
  if (run.bossAt !== null && now - run.bossAt >= (run.climb !== null ? CLIMB.limit : BOSS_LIMIT)) {
    emit(run, { type: 'say', text: run.climb !== null ? 'The light fades on the mountain. You climbed, and that counts.' : 'The Fog closes in. Train, and come back.' });
    return end(run, false, 'limit');
  }
  if (now >= RUN_LIMIT) return end(run, false, 'limit');
  if (input.dodge) dodge(run, input);
  moveHero(run, input);
  if (input.ability) useAbility(run, input);
  moveFoes(run);
  moveBullets(run);
  if (run.over) return;
  attack(run);
  skills(run);
  moveShots(run);
  if (run.over) return;
  helpers(run);
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
  const speed = heroSpeed(run.ups) * (1 + 0.1 * relic(run, 'boots')) * bodyOf(run).move;
  if (run.charge && now < run.charge.until) {
    h.vx = run.charge.x;
    h.vy = run.charge.y;
  } else if (now < run.shove.until) {
    h.vx = run.shove.x;
    h.vy = run.shove.y;
  } else {
    run.charge = null;
    const wade = run.terrain.water.some((q) => inRect(q, h.x, h.y)) ? Math.min(1, WATER.hero + 0.15 * relic(run, 'boots')) : 1;
    h.vx = x * speed * wade + run.wind.x;
    h.vy = y * speed * wade + run.wind.y;
  }
  h.x += h.vx * STEP;
  h.y += h.vy * STEP;
  outOfPillars(run, h, HERO_R);
  // The open door is a gap in the top wall.
  const { w, h: H } = run.area,
    door = run.doorOpen ? run.doors.find((d) => Math.abs(h.x - d.x) < ROOM.door / 2 - HERO_R) : undefined,
    inDoor = !!door;
  h.x = clamp(h.x, ROOM.wall + HERO_R, w - ROOM.wall - HERO_R);
  h.y = clamp(h.y, inDoor ? -40 : ROOM.wall + HERO_R, H - ROOM.wall - HERO_R);
  if (door && h.y < 4) return throughDoor(run, door.kind);
  // A chest: open it and pick what's inside.
  const c = run.chest;
  if (c && !c.opened && Math.hypot(c.x - h.x, c.y - h.y) < 22 + HERO_R) openChest(run);
  // The ground under you.
  for (const q of run.terrain.spikes) if (inRect(q, h.x, h.y, HERO_R - 4) && spikeState(q, now) === 'up') hurt(run, SPIKES.dmg * run.setup.zone.dmg, 'touch');
  const sh = run.terrain.shrine;
  if (sh && !sh.used && Math.hypot(sh.x - h.x, sh.y - h.y) < SHRINE.r + HERO_R) {
    sh.used = true;
    const heal = Math.round(run.maxHp * DIALS.shrine);
    run.hp = Math.min(run.maxHp, run.hp + heal);
    emit(run, { type: 'shrine', x: sh.x, y: sh.y });
    emit(run, { type: 'heal', x: h.x, y: h.y, n: heal });
  }
  if (run.charge?.harm) {
    clearBullets(run, h.x, h.y, HERO_R + 24);
    for (const f of run.foes) {
      if (!f.alive || run.charge.hit.has(f) || dist(f, h) > f.def.r + HERO_R + 12) continue;
      run.charge.hit.add(f);
      damage(run, f, pow(run, ATTACK.slash.dmg * 2), 220);
    }
  }
}

/** A short dash, untouchable for a moment: shots pass through you. It goes where you push the
    stick, or the way you face. */
function dodge(run: Run, input: Input) {
  const now = run.t,
    h = run.hero;
  if (now < run.dodgeAt || (run.charge && now < run.charge.until)) return;
  run.dodgeAt = now + DODGE.cd;
  let dx = input.x,
    dy = input.y;
  if (Math.hypot(dx, dy) < 0.1) [dx, dy] = [Math.cos(h.facing), Math.sin(h.facing)];
  const d = Math.hypot(dx, dy) || 1;
  dx /= d;
  dy /= d;
  run.charge = { until: now + DODGE.secs, x: dx * DODGE.speed, y: dy * DODGE.speed, hit: new Set(), harm: false };
  run.ghostUntil = Math.max(run.ghostUntil, now + DODGE.ghost);
  emit(run, { type: 'dodge', x: h.x, y: h.y, toX: h.x + dx * DODGE.speed * DODGE.secs, toY: h.y + dy * DODGE.speed * DODGE.secs });
}

function useAbility(run: Run, input: Input) {
  const now = run.t,
    h = run.hero;
  if (now < run.abilityAt) return;
  const a = run.ability;
  run.abilityAt = now + ABILITIES[a].cd / (1 + 0.25 * relic(run, 'hourglass'));
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
    run.charge = { until: now + secs, x: dx * speed, y: dy * speed, hit: new Set(), harm: true };
    run.ghostUntil = now + secs + 0.1;
    emit(run, { type: 'ability', id: a, x: from.x, y: from.y, toX: from.x + dx * speed * secs, toY: from.y + dy * speed * secs });
  } else if (a === 'volley') {
    const dmg = pow(run, ATTACK.arrow.dmg * 1.5);
    for (let i = 0; i < 16; i++) fire(run, 'arrow', Math.atan2(dy, dx) + (i / 16) * Math.PI * 2, 430, dmg, 2, null);
    emit(run, { type: 'ability', id: a, x: h.x, y: h.y, toX: h.x, toY: h.y });
  } else if (a === 'blink') {
    h.x = clamp(h.x + dx * 150, ROOM.wall + HERO_R, run.area.w - ROOM.wall - HERO_R);
    h.y = clamp(h.y + dy * 150, ROOM.wall + HERO_R, run.area.h - ROOM.wall - HERO_R);
    outOfPillars(run, h, HERO_R);
    run.ghostUntil = now + 0.3;
    clearBullets(run, h.x, h.y, 90);
    burst(run, h.x, h.y, 80, pow(run, ATTACK.orb.dmg * 1.5), 'ability');
    emit(run, { type: 'ability', id: a, x: from.x, y: from.y, toX: h.x, toY: h.y });
  } else if (a === 'shock') {
    clearBullets(run, h.x, h.y, 110);
    burst(run, h.x, h.y, 110, pow(run, ATTACK.slash.dmg * 1.6), 'ability', undefined, 300);
    emit(run, { type: 'ability', id: a, x: h.x, y: h.y, toX: h.x, toY: h.y });
  } else {
    const heal = Math.round(run.maxHp * 0.15);
    run.hp = Math.min(run.maxHp, run.hp + heal);
    clearBullets(run, h.x, h.y, 140);
    burst(run, h.x, h.y, 140, pow(run, ATTACK.wave.dmg), 'ability', undefined, 260);
    emit(run, { type: 'ability', id: a, x: h.x, y: h.y, toX: h.x, toY: h.y });
    emit(run, { type: 'heal', x: h.x, y: h.y, n: heal });
  }
}

/** Pushes a body out of any pillar it walked into, so it slides around it. */
function outOfPillars(run: Run, o: { x: number; y: number }, r: number) {
  for (const p of run.terrain.pillars) {
    const dx = o.x - p.x,
      dy = o.y - p.y,
      d = Math.hypot(dx, dy) || 1,
      min = p.r + r;
    if (d >= min) continue;
    o.x = p.x + (dx / d) * min;
    o.y = p.y + (dy / d) * min;
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
      emit(run, { type: 'say', text: midBoss(run.setup.zone).hot });
    }
    // Touch (a charging ram hits harder).
    if (f.def.dmg > 0 && dist(f, h) < f.def.r + HERO_R) hurt(run, f.def.dmg * (f !== run.warden && now < f.dashUntil ? 1.5 : 1), 'touch');
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
  const h = run.hero,
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
  const h = run.hero,
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
  const h = run.hero,
    now = run.t,
    { w, h: H } = run.area,
    m = ROOM.wall;
  run.bullets = run.bullets.filter((b) => {
    const age = now - b.born;
    if (b.style === 'homing' && age < HOMING.for) {
      // Turns toward you, but only so fast: a sidestep still beats it.
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
      if (br.alive && Math.hypot(br.x - b.x, br.y - b.y) < BARREL.r + b.r) {
        blowUp(run, br);
        return false;
      }
    if (Math.hypot(b.x - h.x, b.y - h.y) < b.r + HERO_R - 2) {
      if (run.t < run.ghostUntil) return true;
      hurt(run, b.dmg, 'shot');
      return false;
    }
    return true;
  });
  // Bombs that land and burst.
  run.mines = run.mines.filter((mn) => {
    if (now < mn.at) return true;
    if (Math.hypot(mn.x - h.x, mn.y - h.y) < mn.r + HERO_R - 4) hurt(run, mn.dmg, 'shot');
    emit(run, { type: 'boom', x: mn.x, y: mn.y, r: mn.r });
    for (let i = 0; i < mn.n; i++) {
      const a = (i / mn.n) * Math.PI * 2 + 0.3;
      run.bullets.push({ id: ++run.ids, x: mn.x, y: mn.y, vx: Math.cos(a) * mn.speed, vy: Math.sin(a) * mn.speed, r: 5, dmg: mn.dmg * 0.6, born: now, boss: false, style: 'plain', ang: a, spd: mn.speed, bounce: 0 });
    }
    return false;
  });
}

/** A barrel goes up: everything near takes the blast, you too, and nearby barrels follow. */
function blowUp(run: Run, br: Terrain['barrels'][number]) {
  if (!br.alive) return;
  br.alive = false;
  const dmg = BARREL.dmg * run.setup.zone.hp * DIALS.hp * (1 + DIALS.deep * depth(run));
  if (Math.hypot(run.hero.x - br.x, run.hero.y - br.y) < BARREL.blast * 0.8) hurt(run, BARREL.hurt * run.setup.zone.dmg, 'touch');
  emit(run, { type: 'boom', x: br.x, y: br.y, r: BARREL.blast });
  for (const f of run.foes) if (f.alive && f !== run.boss && Math.hypot(f.x - br.x, f.y - br.y) <= BARREL.blast + f.def.r) damage(run, f, dmg, 260, br.x, br.y);
  if (run.boss?.alive && Math.hypot(run.boss.x - br.x, run.boss.y - br.y) <= BARREL.blast + run.boss.def.r) damage(run, run.boss, dmg * 0.5, 0, br.x, br.y);
  for (const o of run.terrain.barrels) if (o.alive && Math.hypot(o.x - br.x, o.y - br.y) < BARREL.blast) later(run, 0.12, () => blowUp(run, o));
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
      if (d < 260) run.shove = { until: now + 0.45, x: (dx / d) * 320, y: (dy / d) * 320 };
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

const pow = (run: Run, base: number) => heroDamage(base, run.setup.power, run.ups) * (1 + DIALS.relic * 0.12 * relic(run, 'whetstone'));

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
      run.wind = { x: 0, y: 0 };
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
      const h = run.hero,
        dx = h.x - f.x,
        dy = h.y - f.y,
        d = Math.hypot(dx, dy) || 1;
      run.wind = { x: (dx / d) * GALE.push * (hot ? 1.2 : 1), y: (dy / d) * GALE.push * (hot ? 1.2 : 1) };
      const { w, h: hh } = run.area,
        edge = Math.min(h.x, w - h.x, h.y, hh - h.y) - ROOM.wall;
      if (edge < GALE.edge) hurt(run, GALE.bite * run.setup.zone.dmg, 'touch');
      return;
    }
  }
}

/** A mid-boss falls: what it brought falls with it. */
function midFalls(run: Run) {
  const f = run.warden!;
  emit(run, { type: 'say', text: midBoss(run.setup.zone).fall });
  run.dim = null;
  run.wind = { x: 0, y: 0 };
  if (f.kind === 'foreman' || f.kind === 'whisper') for (const o of run.foes) if (o.alive && o !== f) fade(run, o);
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

function damage(run: Run, f: Foe, amount: number, knock = 0, fromX = run.hero.x, fromY = run.hero.y) {
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
    hitYourself(run, f.kind);
    emit(run, { type: 'hit', id: f.id, x: f.x, y: f.y, dmg: 0, boss: false });
    return kill(run, f);
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
  if (f.hp <= 0) kill(run, f);
}

function kill(run: Run, f: Foe) {
  f.alive = false;
  run.kills++;
  emit(run, { type: 'kill', id: f.id, x: f.x, y: f.y, kind: f.kind, elite: f.elite });
  if (f.def.xp > 0) run.gems.push({ id: ++run.ids, x: f.x, y: f.y, value: f.def.xp, pulled: false });
  const fang = relic(run, 'fang');
  if (fang && f !== run.boss) run.hp = Math.min(run.maxHp, run.hp + fang);
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
  if (f === run.boss) end(run, true, 'boss');
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

function hitYourself(run: Run, kind: 'image' | 'reflection') {
  if (run.over) return;
  if (!run.mirrorHurtAt) emit(run, { type: 'say', text: kind === 'image' ? 'Only an image, and it cut you. The real Mirror is the one that shoots.' : 'That was you. Walk past your reflections.' });
  run.mirrorHurtAt = run.t;
  const n = Math.max(2, Math.round(run.maxHp * SPLIT[kind]));
  run.hp -= n;
  emit(run, { type: 'hurt', x: run.hero.x, y: run.hero.y, dmg: n, by: kind });
  if (run.hp <= 0) end(run, false, 'hp');
}

function burst(run: Run, x: number, y: number, R: number, dmg: number, color: Extract<GameEvent, { type: 'burst' }>['color'], skip?: Foe, knock = 160) {
  for (const f of run.foes) {
    if (!f.alive || f === skip || Math.hypot(f.x - x, f.y - y) > R) continue;
    // A blast all around isn't aimed: it pushes copies (yours, the Mirror's) away instead of breaking them.
    if (f.kind === 'reflection' || f.kind === 'image') nudge(run, f, knock, x, y);
    else damage(run, f, dmg, knock, x, y);
  }
  for (const br of run.terrain.barrels) if (br.alive && Math.hypot(br.x - x, br.y - y) <= R) blowUp(run, br);
  emit(run, { type: 'burst', x, y, r: R, color });
}

function fire(run: Run, kind: 'arrow' | 'orb', angle: number, speed: number, dmg: number, pierce: number, target: Foe | null, h: { x: number; y: number } = run.hero) {
  run.shots.push({ id: ++run.ids, kind, x: h.x, y: h.y - 6, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, dmg, pierce, target, hit: new Set(), dies: run.t + 1.6 });
}

function attack(run: Run) {
  const h = run.hero;
  run.cd.attack -= STEP;
  if (run.cd.attack > 0) return;
  const kind = attackOf(run.setup.classId),
    reach = kind === 'slash' ? SLASH_REACH : RANGE,
    b = run.boss?.alive && run.setup.zone.boss !== 'mirror' && !untouchable(run, run.boss) && run.t >= run.boss.bornUntil && dist(run.boss, h) <= reach ? run.boss : null,
    target = b ?? nearest(run, h.x, h.y, undefined, reach);
  if (!target && kind !== 'wave') return;
  if (kind === 'wave' && !nearest(run, h.x, h.y, undefined, 150)) return;
  run.cd.attack = attackCooldown(kind, run.setup.power, run.ups) / (1 + DIALS.relic * 0.1 * relic(run, 'quick')) / bodyOf(run).haste;
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
    if ((f.kind === 'reflection' || f.kind === 'image') && diff >= SPLIT.aim) {
      // Only a swing aimed at a copy (of you, or of the Mirror) shatters it: the edge of the arc
      // pushes it aside.
      if (diff < 1.3 || d < 22) nudge(run, f, 140, h.x, h.y);
      continue;
    }
    if (diff < 1.3 || d < 22) damage(run, f, dmg, 140);
  }
  for (const br of run.terrain.barrels) {
    if (!br.alive || Math.hypot(br.x - h.x, br.y - h.y) > R + BARREL.r) continue;
    const diff = Math.atan2(br.y - h.y, br.x - h.x) - angle;
    if (Math.abs(Math.atan2(Math.sin(diff), Math.cos(diff))) < 1.3) blowUp(run, br);
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
      if (br.alive && Math.hypot(br.x - s.x, br.y - s.y) < BARREL.r + 4) {
        blowUp(run, br);
        return false;
      }
    let f: Foe | null = null;
    for (const o of run.foes) if (o.alive && !s.hit.has(o) && run.t >= o.bornUntil && !untouchable(run, o) && Math.hypot(o.x - s.x, o.y - s.y) < o.def.r + 6) f = o;
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

/** Your friends on the Summit: they keep beside you and help. The Wanderer shoots, Mira swings
    her hammer at what comes close, and Vela's lamp clears the shots around you. */
function helpers(run: Run) {
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
      fire(run, 'arrow', Math.atan2(f.y - a.y, f.x - a.x), 430, pow(run, ATTACK.arrow.dmg * 0.9), 1, null, a);
      emit(run, { type: 'help', kind: a.kind, x: a.x, y: a.y, toX: f.x, toY: f.y });
    } else if (a.kind === 'mira') {
      const f = nearest(run, a.x, a.y, undefined, 170);
      if (!f) return;
      a.at = now + CLIMB.every.hammer;
      burst(run, f.x, f.y, 64, pow(run, ATTACK.slash.dmg * 1.4), 'fire', undefined, 220);
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
  if (run.cleared || (isBossRoom(run) && !climbing(run))) return;
  const alive = run.foes.filter((f) => f.alive).length;
  if (run.waves.length && alive <= 2 && !run.timers.length) later(run, 0.8, () => nextWave(run));
  if (!run.waves.length && alive === 0) {
    run.cleared = true;
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

/** The way on: one door to the stairs or the boss, otherwise two doors that each say what's behind. */
function openDoors(run: Run) {
  const { w } = run.area,
    { floors, rooms } = run.layout;
  const single = climbing(run) || run.room === rooms - 1 || ((run.floor === floors - 1 || run.floor === wardenFloor(run.layout)) && run.room === rooms - 2) || rooms < 3;
  if (single) {
    run.doors = [{ x: w / 2, kind: 'fight' }];
    return;
  }
  // Two different kinds; never two rests in a row, and no elites on the first floor.
  const odds = DOOR_ODDS.filter(([k]) => !(k === 'rest' && run.kind === 'rest') && !(k === 'elite' && run.floor === 0));
  const draw = (skip?: RoomKind): RoomKind => {
    const opts = odds.filter(([k]) => k !== skip),
      total = opts.reduce((n, [, o]) => n + o, 0);
    let r = run.rnd() * total;
    for (const [k, o] of opts) if ((r -= o) < 0) return k;
    return opts[0][0];
  };
  const a = draw(),
    b = draw(a);
  run.doors = [
    { x: Math.round(w * DOOR_AT[0]), kind: a },
    { x: Math.round(w * DOOR_AT[1]), kind: b },
  ];
}

function openChest(run: Run) {
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
  run.relicOffer = choices;
  if (run.setup.autoPick) pickRelic(run, RELIC_BOT.find((id) => choices.includes(id)) ?? choices[0]);
}

export function pickRelic(run: Run, id: RelicId) {
  if (!run.relicOffer) return;
  run.relicOffer = null;
  run.relics[id] = relic(run, id) + 1;
  if (id === 'heart') {
    run.maxHp += 20;
    run.hp = Math.min(run.maxHp, run.hp + 20);
  }
  if (id === 'coal') run.flames++;
  emit(run, { type: 'relic', id });
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
  if (id === 'flame') run.flames = run.setup.power.flames + (run.ups.flame ?? 0) + relic(run, 'coal');
  if (run.free.length) offer(run, run.free.shift()!);
  else if (run.pendingLevels > 0) offer(run, null);
}

// ---------- getting hit, ending ----------

function hurt(run: Run, dmg: number, by: 'shot' | 'touch') {
  const now = run.t;
  if (run.over || now < run.hurtUntil || now < run.ghostUntil) return;
  if (relic(run, 'charm') && now >= run.wardAt) {
    // The ward takes it.
    run.wardAt = now + WARD_EVERY;
    run.hurtUntil = now + INVULNERABLE;
    emit(run, { type: 'ward', x: run.hero.x, y: run.hero.y });
    return;
  }
  const taken = dmg * (1 - armorOf(run.setup.power, run.ups)) / (1 + DIALS.relic * 0.14 * relic(run, 'iron'));
  run.hp -= taken;
  run.hurtUntil = now + INVULNERABLE;
  emit(run, { type: 'hurt', x: run.hero.x, y: run.hero.y, dmg: Math.round(taken), by });
  if (run.hp <= 0) end(run, false, 'hp');
}

function end(run: Run, won: boolean, why: RunEnd['why']) {
  if (run.over) return;
  // On the Summit there's no top: however the climb ends, a ledge climbed is a win.
  if (run.climb !== null) won = run.climb >= 1;
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
    height: run.climb,
  };
  if (!won) run.hp = 0;
}

/** Developer mode: end the run as if the boss fell. */
export function winNow(run: Run) {
  end(run, true, 'boss');
}

/** Developer mode: down to the next floor's first room. */
export function skipFloor(run: Run) {
  if (run.boss || run.floor >= run.layout.floors - 1) return;
  run.floor++;
  run.room = 0;
  run.timers = [];
  emit(run, { type: 'floor', floor: run.floor });
  enterRoom(run);
}

/** Developer mode: straight to the Warden's room on the middle floor. */
export function skipToWarden(run: Run) {
  const f = wardenFloor(run.layout);
  if (run.boss || f < 0) return;
  run.floor = f;
  run.room = run.layout.rooms - 1;
  run.timers = [];
  enterRoom(run);
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
