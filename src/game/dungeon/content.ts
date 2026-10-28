import type { ClassId } from '@/lib/gear';
import type { Zone } from '@/lib/fog';
import type { FogBoss } from '@/story/types';
import { clamp } from '../rules';
import { ABILITY, DIALS, ELITE } from '@/balance';

/* What the dungeon is made of, as plain data: the ground, the doors and chest items, every monster
   and how it shoots, each zone's dungeon and mid-boss, the bosses, and the classes' abilities.
   Adding a monster, a zone or a relic starts here; engine.ts plays it. */

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

/** What a room of the floor holds. Its door says so before you walk in. */
export type RoomKind = 'fight' | 'elite' | 'treasure' | 'rest';
export const ROOM_KINDS: Record<RoomKind, { name: string; text: string }> = {
  fight: { name: 'Fight', text: 'Monsters.' },
  elite: { name: 'Elite', text: 'Fewer, much tougher monsters, and a chest.' },
  treasure: { name: 'Treasure', text: 'Monsters, and a chest at the end.' },
  rest: { name: 'Rest', text: 'No monsters: a shrine that heals you.' },
};
/** A room on the floor's map: one of the kinds above, or the floor's last room (the stairs down,
    the mid-boss, or the boss). */
export type CellKind = RoomKind | 'stairs' | 'warden' | 'boss';
/** How often each kind is drawn: rooms on the way to the stairs, and rooms off to the side (a dead
    end is most often a chest). */
export const ROOM_ODDS: Record<'way' | 'side' | 'end', [RoomKind, number][]> = {
  way: [
    ['fight', 3],
    ['elite', 1.5],
    ['treasure', 1],
  ],
  side: [
    ['fight', 2],
    ['elite', 1.5],
    ['treasure', 1],
    ['rest', 1],
  ],
  end: [
    ['treasure', 3],
    ['rest', 1.6],
    ['elite', 1],
  ],
};
/** An elite monster: bigger, tougher, worth more. Elite rooms hold fewer of them (src/balance/dungeon.ts). */
export { ELITE };

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
export const RELIC_BOT: RelicId[] = ['whetstone', 'heart', 'iron', 'quick', 'charm', 'fang', 'hourglass', 'coal', 'boots'];

/** How deep a dungeon goes: sized so a whole run down to the boss takes about 15 minutes. Each
    floor is a map of rooms: `rooms` on the way from the first to the last (both counted), and
    `side` more off to the side, for whoever explores. */
export interface Layout {
  floors: number;
  rooms: number;
  side?: number;
}
export const LAYOUT: Layout = { floors: 10, rooms: 3, side: 2 };
/** The floor (from 0) whose last room holds the Warden, or -1 when the dungeon is too short for one. */
export const wardenFloor = (layout: Layout) => (layout.floors >= 4 ? Math.floor(layout.floors / 2) - 1 : -1);

/** How much faster you move once a room is cleared: nothing left to fight, so cross it quickly. */
export const CLEAR_RUN = 2.5;

/** The dials balance tests turn (scripts/fog-sim.mjs): numbers in src/balance/dungeon.ts. */
export { DIALS };

// ---------- monsters ----------

export type MonsterKind = 'slime' | 'wisp' | 'mirror' | 'golem' | 'reflection' | 'ram' | 'book' | 'smoke' | 'seeker' | 'splitter' | 'splitling' | 'shade' | 'warden' | 'image' | MidKind;
/** The floor-5 mid-bosses, one per zone (MIDS). */
export type MidKind = 'warden' | 'lantern' | 'foreman' | 'sandGolem' | 'whisper' | 'gale';
export type FoeKind = MonsterKind | 'boss';

/** How a monster moves: walks at you, keeps its distance, circles you at its range, stands still,
    winds up and charges in a line, or vanishes and appears somewhere near you. */
export type Move = 'chase' | 'keep' | 'orbit' | 'still' | 'charge' | 'blink';

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
  /** How to beat it, in a few words: on the floor's banner and as it rises. */
  tip: string;
  enter: string;
  hot: string;
  fall: string;
}
/** The mid-boss guarding the last room of the middle floor (floor 5 of 10), by zone. */
export const MIDS: MidBoss[] = [
  { kind: 'warden', name: 'the Warden of the Ashes', tip: 'Walk around it with its turning arms', enter: 'Guarding the stairs. Come back tomorrow.', hot: 'Still here? Tomorrow would be easier.', fall: 'The stairs are open. Today.' },
  { kind: 'lantern', name: 'the Drowned Lantern', tip: 'Hit it to bring the light back', enter: 'Better not to look too closely.', hot: "Back then you didn't need a light.", fall: "The light's back. It's only you. Good." },
  { kind: 'foreman', name: 'the Foreman', tip: 'Keep hitting the Foreman, or it mends its crew', enter: 'Redo it. All of it. Properly this time.', hot: "Faster won't fix sloppy.", fall: 'Sloppy, and it still worked.' },
  { kind: 'sandGolem', name: 'the Sand Golem', tip: 'It only takes hits while it walks', enter: "Stand still. Nothing's moving anyway.", hot: 'Cracks? Probably nothing.', fall: 'Sand, all along. It was moving.' },
  { kind: 'whisper', name: 'the Whisper', tip: 'Find the one that glows, and stay on it', enter: 'Shh. Nobody will notice if you stop.', hot: 'Louder now. Still only a whisper.', fall: 'Quiet. You kept walking anyway.' },
  { kind: 'gale', name: 'the Gale', tip: 'Lean into a gust, and stay off the edges', enter: 'Turn back. The top is too far.', hot: 'Harder. Everyone else turns back here.', fall: 'Just a breeze now. Keep climbing.' },
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

/** Monsters that join deeper down, by the floor (of 10) they first show on and how common they are. */
export const UNLOCK: [MonsterKind, number, number][] = [
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
export const HOMING = { turn: 1.9, for: 1.3 };
/** Slow-then-fast shots start at this share of their speed and reach it over `over` s. */
export const RAMP = { from: 0.25, over: 1.1 };

// ---------- class abilities ----------

export type AbilityId = 'charge' | 'volley' | 'blink' | 'still' | 'shock';

export const ABILITIES: Record<AbilityId, { name: string; text: string; cd: number }> = {
  charge: { name: 'Charge', text: 'Rush ahead, untouchable, hitting everything you pass and cutting the shots in your way.', cd: ABILITY.charge.cd },
  volley: { name: 'Volley', text: 'Loose arrows all around you that pierce through.', cd: ABILITY.volley.cd },
  blink: { name: 'Blink', text: 'Vanish and appear ahead, bursting where you land and wiping shots nearby.', cd: ABILITY.blink.cd },
  still: { name: 'Stillness', text: 'Breathe: heal some HP and push everything away. It fills as you fight: hits you land and hits you take.', cd: ABILITY.still.cd },
  shock: { name: 'Shockwave', text: 'Knock back everything near you and wipe the shots around you.', cd: ABILITY.shock.cd },
};
/** Which of a class's four SPs, in the order the story gives them. */
export type SpNo = 1 | 2 | 3 | 4;
export const SP_NOS: SpNo[] = [1, 2, 3, 4];

/** The SP's two moves past the class ability: its own move (a second button) and its final. */
export type SpMoveId =
  | 'whirl' | 'phoenix' | 'quake' | 'mountain' | 'thunderdash' | 'thunderclap' | 'sunguard' | 'dawnbreak'
  | 'pin' | 'rain' | 'frostarrow' | 'blizzard' | 'thorntrap' | 'wildvolley' | 'shadowstep' | 'moonfall'
  | 'starfall' | 'sky' | 'shards' | 'prism' | 'hourglass' | 'stopsands' | 'voidstep' | 'rift'
  | 'palm' | 'palms' | 'pounce' | 'hundredclaws' | 'lotus' | 'nirvana' | 'risingsun' | 'solarflare';

/** Each SP's passive, always on while it's worn (numbers: SP_PASSIVE in src/balance/classes.ts). */
export type SpPassiveId =
  | 'embers' | 'bedrock' | 'static' | 'secondwind'
  | 'tailwind' | 'frostbite' | 'harvest' | 'focus'
  | 'splitstar' | 'shell' | 'swiftsurge' | 'rebound'
  | 'flow' | 'momentum' | 'quickstep' | 'sunburst';

/** What an SP's light looks like: its colors on screen, its card and its waking (src/sprites/characters/spLooks.ts). */
export type SpTheme = 'fire' | 'stone' | 'storm' | 'dawn' | 'wind' | 'frost' | 'leaf' | 'moon' | 'star' | 'crystal' | 'sand' | 'void' | 'water' | 'tiger' | 'lotus' | 'sun';

/** The four elements. Each class has one SP of each; monsters get them later. */
export type SpElement = 'fire' | 'water' | 'light' | 'shadow';
export const SP_ELEMENTS: readonly SpElement[] = ['fire', 'water', 'light', 'shadow'];
export const ELEMENT_NAMES: Record<SpElement, string> = { fire: 'Fire', water: 'Water', light: 'Light', shadow: 'Shadow' };

export interface SpCardDef {
  name: string;
  /** Who this SP is, in one line (the SP card and the gallery in /lab/sp). */
  about: string;
  element: SpElement;
  theme: SpTheme;
  skill: SpMoveId;
  final: SpMoveId;
  passive: SpPassiveId;
}

/** Each class's four SPs, like NosTale's specialist cards: the first after a few workouts, the
    others as the story goes on. None is stronger than the others; each fights its own way. */
export const SP_CARDS: Record<ClassId, readonly [SpCardDef, SpCardDef, SpCardDef, SpCardDef]> = {
  warrior: [
    { name: 'Blaze Reaver', about: 'A berserker with a burning axe bigger than you, who never backs down.', element: 'fire', theme: 'fire', skill: 'whirl', final: 'phoenix', passive: 'embers' },
    { name: 'Sun Bastion', about: 'A wall of white and gold: a war hammer, a tower shield, nothing gets past.', element: 'light', theme: 'dawn', skill: 'quake', final: 'mountain', passive: 'bedrock' },
    { name: 'Riptide Lancer', about: 'A knight of the sea with a long lance, there and gone like a wave.', element: 'water', theme: 'storm', skill: 'thunderdash', final: 'thunderclap', passive: 'static' },
    { name: 'Nightscythe', about: 'A reaper in a torn black cloak whose scythe cuts the dark.', element: 'shadow', theme: 'void', skill: 'sunguard', final: 'dawnbreak', passive: 'secondwind' },
  ],
  archer: [
    { name: 'Rainstalker', about: 'A silent hunter in a rain hood whose arrows go through everything.', element: 'water', theme: 'frost', skill: 'pin', final: 'rain', passive: 'tailwind' },
    { name: 'Flintfire', about: 'An explosives expert with a hand cannon and a bomb always lit.', element: 'fire', theme: 'fire', skill: 'frostarrow', final: 'blizzard', passive: 'frostbite' },
    { name: 'Wolfcaller', about: 'A keeper of the wild with a boomerang and a wolf of light at your side.', element: 'light', theme: 'dawn', skill: 'thorntrap', final: 'wildvolley', passive: 'harvest' },
    { name: 'Silent Fang', about: 'An assassin with two daggers who strikes from the dark and is gone.', element: 'shadow', theme: 'moon', skill: 'shadowstep', final: 'moonfall', passive: 'focus' },
  ],
  mage: [
    { name: 'Ashcaller', about: 'A fire caster in a horned hood whose staff holds a ball of flame.', element: 'fire', theme: 'fire', skill: 'starfall', final: 'sky', passive: 'splitstar' },
    { name: 'Tidesinger', about: 'A caster of the deep sea with an orb of water over the hand.', element: 'water', theme: 'water', skill: 'shards', final: 'prism', passive: 'shell' },
    { name: 'Dawnbell', about: 'A healer in white with a halo and a bell that rings the dark away.', element: 'light', theme: 'star', skill: 'hourglass', final: 'stopsands', passive: 'swiftsurge' },
    { name: 'Hexedge', about: 'A mage who fights up close with a sword made of shadow.', element: 'shadow', theme: 'void', skill: 'voidstep', final: 'rift', passive: 'rebound' },
  ],
  monk: [
    { name: 'Dragonheart', about: 'A brawler in red gauntlets whose fists burn like a dragon.', element: 'fire', theme: 'sun', skill: 'palm', final: 'palms', passive: 'flow' },
    { name: 'White Claw', about: 'A fighter like a white tiger, all leaps and claws.', element: 'light', theme: 'tiger', skill: 'pounce', final: 'hundredclaws', passive: 'momentum' },
    { name: 'Stillwater', about: 'A calm fighter with a long staff who flows like a river.', element: 'water', theme: 'water', skill: 'lotus', final: 'nirvana', passive: 'quickstep' },
    { name: 'Voidpalm', about: 'A fighter who throws their own energy from the palms, from far away.', element: 'shadow', theme: 'void', skill: 'risingsun', final: 'solarflare', passive: 'sunburst' },
  ],
};

/** One of your class's SPs. */
export const spDef = (cls: ClassId | undefined, n: SpNo) => SP_CARDS[cls ?? 'warrior'][n - 1];

export const SP_PASSIVES: Record<SpPassiveId, { name: string; text: string }> = {
  embers: { name: 'Embers', text: 'Always on. Your hits can set a monster burning for a moment.' },
  bedrock: { name: 'Bedrock', text: 'Always on. Plant your feet: standing still, you take less from every hit.' },
  static: { name: 'Static', text: 'Always on. Every few hits, a spark jumps to another monster close by.' },
  secondwind: { name: 'Second Wind', text: 'Always on. Once a floor, when you fall low, the dawn lifts you back up.' },
  tailwind: { name: 'Tailwind', text: 'Always on. After a dodge, the wind carries you: you run faster for a moment.' },
  frostbite: { name: 'Frostbite', text: 'Always on. Your arrows can chill a monster: it moves slower for a moment.' },
  harvest: { name: 'Harvest', text: 'Always on. Each monster you bring down gives you back a little.' },
  focus: { name: 'Focus', text: 'Always on. While you are barely scratched, your shots strike true more often.' },
  splitstar: { name: 'Split Star', text: 'Always on. Every fourth attack throws one more star at another monster.' },
  shell: { name: 'Crystal Shell', text: 'Always on. After a dodge, a shell of crystal takes the next hit for you.' },
  swiftsurge: { name: 'Swift Sands', text: 'Always on. Your final fills faster.' },
  rebound: { name: 'Rebound', text: 'Always on. When something hits you, the void hits back at everything near.' },
  flow: { name: 'Flow', text: 'Always on. Every hit you land heals you a little.' },
  momentum: { name: 'Momentum', text: 'Always on. Keep moving and your strikes grow heavier.' },
  quickstep: { name: 'Quickstep', text: 'Always on. Your dodge comes back sooner.' },
  sunburst: { name: 'Sunburst', text: 'Always on. Every few hits, the sun bursts out around you.' },
};

/** How each move plays: the engine picks what to do from its `shape` (numbers: SP_SKILL and
    SP_FINAL in src/balance/classes.ts). ring: all around you. fan: shots at your target. drop: on
    the monster nearest you. all: every monster in the room. nova: a great blast that puts out every
    shot. dash: you rush through them. chain: a bolt jumping between monsters. guard: nothing
    touches you for a moment. field: a patch that keeps hitting. volley: shots all around you. */
export type SpShape = 'ring' | 'fan' | 'drop' | 'all' | 'nova' | 'dash' | 'chain' | 'guard' | 'field' | 'volley';

export const SP_MOVES: Record<SpMoveId, { name: string; text: string; shape: SpShape }> = {
  whirl: { name: 'Whirl', shape: 'ring', text: 'Spin with your blade out: everything close is hit and thrown back, and the shots by you are cut.' },
  phoenix: { name: 'Phoenix Blade', shape: 'ring', text: 'Your final. Fire all around you hits everything in a wide ring and wipes the shots in it.' },
  quake: { name: 'Quake', shape: 'ring', text: 'Stamp the ground: everything near is hit and thrown far back.' },
  mountain: { name: 'Mountain Fall', shape: 'drop', text: 'Your final. A mountain of stone drops on the monster nearest you and everything round it.' },
  thunderdash: { name: 'Thunder Dash', shape: 'dash', text: 'Rush ahead as lightning: untouchable, hitting everything you pass.' },
  thunderclap: { name: 'Thunderclap', shape: 'chain', text: 'Your final. A bolt jumps from monster to monster across the room.' },
  sunguard: { name: 'Sun Guard', shape: 'guard', text: 'Raise the light: for a moment nothing can touch you, and it pushes away what is close.' },
  dawnbreak: { name: 'Dawnbreak', shape: 'nova', text: 'Your final. The dawn breaks around you: it hits everything near, heals you, and puts out every shot.' },
  pin: { name: 'Pin Shot', shape: 'fan', text: 'A tight fan of arrows at your target that go through a whole line of monsters.' },
  rain: { name: 'Arrow Rain', shape: 'all', text: 'Your final. Arrows fall on every monster in the room.' },
  frostarrow: { name: 'Frost Arrow', shape: 'fan', text: 'Three heavy arrows of ice at your target.' },
  blizzard: { name: 'Blizzard', shape: 'field', text: 'Your final. A storm of snow around you hits again and again and slows everything in it.' },
  thorntrap: { name: 'Thorn Trap', shape: 'field', text: 'Thorns burst up under the monster nearest you and keep biting.' },
  wildvolley: { name: 'Wild Volley', shape: 'volley', text: 'Your final. Arrows fly out from you in every direction, through everything.' },
  shadowstep: { name: 'Shadow Step', shape: 'dash', text: 'Slip through them like a shadow, cutting everything you pass.' },
  moonfall: { name: 'Moonfall', shape: 'chain', text: 'Your final. Moonlight leaps from monster to monster, all over the room.' },
  starfall: { name: 'Starfall', shape: 'drop', text: 'A star drops on the monster nearest you and bursts.' },
  sky: { name: 'Falling Sky', shape: 'nova', text: 'Your final. A great blast around you, and every shot in the room goes out.' },
  shards: { name: 'Crystal Shards', shape: 'volley', text: 'Crystals burst out from you in every direction.' },
  prism: { name: 'Prism', shape: 'chain', text: 'Your final. A beam of light splits from monster to monster.' },
  hourglass: { name: 'Hourglass', shape: 'field', text: 'Sand pours down on the monster nearest you: it slows everything there and keeps hitting.' },
  stopsands: { name: 'Stop the Sands', shape: 'all', text: 'Your final. Time all but stops: every monster in the room is hit and slowed, and the shots go out.' },
  voidstep: { name: 'Void Step', shape: 'dash', text: 'Step through the dark: untouchable, hitting everything on the way.' },
  rift: { name: 'Rift', shape: 'field', text: 'Your final. The ground opens around you and keeps hitting all that stands in it.' },
  palm: { name: 'Palm Wave', shape: 'ring', text: 'Push the air: everything near is hit and shoved away, and the shots near you go.' },
  palms: { name: 'Thousand Palms', shape: 'ring', text: 'Your final. Heal, wipe the shots near you, and hit and shove everything around you.' },
  pounce: { name: 'Tiger Pounce', shape: 'dash', text: 'Leap at them like a tiger, hitting everything you pass.' },
  hundredclaws: { name: 'Hundred Claws', shape: 'chain', text: 'Your final. You strike from monster to monster faster than the eye.' },
  lotus: { name: 'Lotus Bloom', shape: 'guard', text: 'A lotus opens round you: for a moment nothing touches you, it heals you a little and pushes them back.' },
  nirvana: { name: 'Stillwater', shape: 'nova', text: 'Your final. Peace spreads out from you: it heals you a lot, hits everything near and puts out every shot.' },
  risingsun: { name: 'Rising Sun', shape: 'drop', text: 'A sun bursts on the monster nearest you and throws them back.' },
  solarflare: { name: 'Solar Flare', shape: 'all', text: 'Your final. The sun flares: every monster in the room is hit, and the shots near you go.' },
};

/** Every class can dodge: a short dash, untouchable for a moment, on its own short clock. */
export const DODGE = { cd: 2.5, speed: 480, secs: 0.17, ghost: 0.27 };

/** Each class in the dungeon, against the others: HP, armor, damage, move and attack speed (src/balance/classes.ts). */
export { CLASS_BODY } from '@/balance';

export function abilityOf(cls: ClassId | undefined): AbilityId {
  return cls === 'warrior' ? 'charge' : cls === 'archer' ? 'volley' : cls === 'mage' ? 'blink' : cls === 'monk' ? 'still' : 'shock';
}
