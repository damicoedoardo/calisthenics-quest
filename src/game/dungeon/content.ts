import type { ClassId } from '@/lib/gear';
import type { Zone } from '@/lib/fog';
import type { FogBoss } from '@/story/types';
import { clamp, type AttackKind } from '../rules';
import { ABILITY, DIALS, ELITE } from '@/balance';

/** The world a zone's dungeon is built from: its own id, unless it names another (an Ember Road
    chapter's own world). It picks the zone's row of ZONE_DUNGEONS, MIDS, THEMES and ZONE_MUSIC. */
export const worldOf = (z: Pick<Zone, 'id' | 'world'>) => z.world ?? z.id;

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

export type MonsterKind = 'slime' | 'wisp' | 'mirror' | 'golem' | 'reflection' | 'ram' | 'book' | 'smoke' | 'seeker' | 'splitter' | 'splitling' | 'shade' | 'grinder' | 'unsent' | 'loner' | 'warden' | 'image' | MidKind;
/** The floor-5 mid-bosses, one per world (MIDS). */
export type MidKind = 'warden' | 'lantern' | 'foreman' | 'sandGolem' | 'whisper' | 'gale' | 'bellows' | 'bell' | 'toll';
export type FoeKind = MonsterKind | 'boss';

/** How a monster moves: walks at you, keeps its distance, circles you at its range, stands still,
    winds up and charges in a line, vanishes and appears somewhere near you, or rolls at you until
    it hits a wall (ROLL). */
export type Move = 'chase' | 'keep' | 'orbit' | 'still' | 'charge' | 'blink' | 'roll';

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
  // The Ash Golem, at the end of each floor: throws a boulder where you stand (step out before it
  // lands and bursts), and stomps a ring of cinders that starts slow and speeds up.
  golem: {
    hp: 220,
    speed: 36,
    dmg: 16,
    r: 18,
    xp: 12,
    move: 'chase',
    shoots: [
      { every: 3.4, kind: 'mine', n: 6, speed: 100, dmg: 12, r: 50, first: 1.5 },
      { every: 5, kind: 'ring', n: 14, speed: 100, dmg: 9, style: 'ramp', first: 3 },
    ],
    cost: 6,
  },
  // A golden copy of you, sent by the Mirror. Hitting it hurts you.
  reflection: { hp: 30, speed: 72, dmg: 8, r: 12, xp: 0, move: 'chase', shoots: [], cost: 0 },
  // The Lancer Husk, an empty suit of armor: winds up (it glows red), then charges in a straight
  // line and throws a ring where it stops.
  ram: { hp: 30, speed: 34, dmg: 13, r: 15, xp: 2, move: 'charge', shoots: [{ every: 0, on: 'move', kind: 'ring', n: 6, speed: 95, dmg: 7 }], cost: 2 },
  // The Snooze Clock, one of Tomorrow's: never moves and ticks out a slow spiral of clock hands.
  book: { hp: 34, speed: 0, dmg: 8, r: 14, xp: 2, move: 'still', shoots: [{ every: 0.55, kind: 'spiral', n: 3, speed: 80, dmg: 7, style: 'wiggle', first: 1.4 }], cost: 2.5 },
  // Lobs smoke bombs where you stand: step off the circle before it bursts.
  smoke: { hp: 18, speed: 70, dmg: 6, r: 12, xp: 2, move: 'orbit', range: 200, shoots: [{ every: 2.8, kind: 'mine', n: 6, speed: 90, dmg: 11, r: 46, first: 1.5 }], cost: 2 },
  // Keeps away and sends shots that curve after you for a moment.
  seeker: { hp: 26, speed: 46, dmg: 8, r: 14, xp: 2, move: 'keep', range: 230, shoots: [{ every: 3, kind: 'aimed', n: 2, speed: 115, dmg: 8, style: 'homing', first: 1.6 }], cost: 2.5 },
  // The Excuse Jar: bounces shards off the walls and breaks into three Jar Imps (splitlings).
  splitter: { hp: 48, speed: 36, dmg: 11, r: 18, xp: 3, move: 'chase', shoots: [{ every: 3.2, kind: 'ring', n: 8, speed: 90, dmg: 7, style: 'bounce', first: 1.6 }], cost: 3 },
  splitling: { hp: 9, speed: 74, dmg: 5, r: 10, xp: 0, move: 'chase', shoots: [], cost: 0 },
  // A shade of you: vanishes, lands near you (watch for the mark) and fires a ring that starts slow.
  shade: { hp: 30, speed: 60, dmg: 9, r: 13, xp: 3, move: 'blink', range: 190, shoots: [{ every: 0, on: 'move', kind: 'ring', n: 10, speed: 140, dmg: 8, style: 'ramp' }], cost: 3 },
  // The Grinder (the Whetstone Pass): a runaway whetstone. It turns to face you, rolls at you until
  // it hits a wall, and throws a fan of sparks at you off the stone.
  grinder: { hp: 32, speed: 0, dmg: 12, r: 14, xp: 2, move: 'roll', shoots: [{ every: 0, on: 'move', kind: 'spread', n: 5, arc: 1.1, speed: 105, dmg: 7 }], cost: 2.5 },
  // The Unsent (the Quiet Miles): a letter never sent, drifting after you. Out of every lantern's
  // light it is only a shape in the fog: it can't be hit, and it neither hurts nor shoots (LANTERN).
  unsent: { hp: 26, speed: 58, dmg: 12, r: 12, xp: 2, move: 'chase', shoots: [{ every: 2.4, kind: 'spread', n: 3, arc: 0.5, speed: 125, dmg: 7, first: 0.8 }], cost: 2 },
  // The Loner (the Long Bridge): a traveller behind a great shield it turns toward you. A hit on the
  // shield does nothing; from the side or behind it lands (LONER).
  loner: { hp: 30, speed: 40, dmg: 12, r: 15, xp: 3, move: 'chase', shoots: [{ every: 2.6, kind: 'spread', n: 3, arc: 0.4, speed: 130, dmg: 8, first: 1.6 }], cost: 2.5 },
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
  // The Bellows (the Whetstone Pass): a forge's great bellows that breathes in, pulling everyone
  // toward it, then blows them back out with a burst of embers (BELLOWS).
  bellows: {
    hp: 850,
    speed: 30,
    dmg: 10,
    r: 24,
    xp: 30,
    move: 'keep',
    range: 170,
    shoots: [
      { every: 1.8, kind: 'aimed', n: 2, speed: 120, dmg: 9, first: 1.8 },
      { every: 2.4, kind: 'spread', n: 7, arc: 1, speed: 110, dmg: 9, first: 2.6 },
      { every: 0.2, kind: 'spiral', n: 2, speed: 80, dmg: 8, turn: 0.26, below: 0.5 },
    ],
    cost: 0,
  },
  // The Silent Bell (the Quiet Miles): it tolls a ring, and the toll comes back across the room a
  // moment later, from the far side (BELL).
  bell: {
    hp: 1000,
    speed: 26,
    dmg: 10,
    r: 22,
    xp: 30,
    move: 'keep',
    range: 180,
    shoots: [
      { every: 2, kind: 'aimed', n: 3, speed: 125, dmg: 9, first: 1.6 },
      { every: 0.25, kind: 'spiral', n: 2, speed: 85, dmg: 7, turn: 0.28, below: 0.5 },
    ],
    cost: 0,
  },
  // The Tollkeeper (the Long Bridge): braced against anyone who comes at it alone (TOLL). It stamps
  // a ring and throws stones where you stand.
  toll: {
    hp: 760,
    speed: 34,
    dmg: 14,
    r: 22,
    xp: 30,
    move: 'chase',
    shoots: [
      { every: 3, kind: 'ring', n: 16, speed: 95, dmg: 9, first: 2 },
      { every: 3.6, kind: 'mine', n: 6, speed: 100, dmg: 11, r: 46, first: 3 },
      { every: 1.6, kind: 'aimed', n: 2, speed: 135, dmg: 9, below: 0.5 },
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
  // The Ember Road's worlds (6 the Whetstone Pass, 7 the Quiet Miles, 8 the Long Bridge)
  { kind: 'bellows', name: 'the Bellows', tip: 'Walk away as it breathes in, and hit it then: it is open', enter: "Let the fire go out. It's warm enough.", hot: 'Why keep stoking it? Sit down.', fall: 'Hear that? The forge is roaring again.' },
  { kind: 'bell', name: 'the Silent Bell', tip: 'Every toll comes back from across the room: watch both sides', enter: "Nobody's rung in years. Nobody will.", hot: 'Hear that? Nothing. Nobody answers.', fall: 'It rang. Somebody heard.' },
  { kind: 'toll', name: 'the Tollkeeper', tip: 'It braces against one at a time: hit it together', enter: 'One at a time. Pay your own way.', hot: "Two of you? That's not allowed.", fall: 'Fine. Cross together, then.' },
];
export const midBoss = (zone: Pick<Zone, 'id' | 'world'>) => MIDS[clamp(worldOf(zone), 0, MIDS.length - 1)];
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
/** The Bellows: how often it breathes (s), how long it breathes in, how hard that pulls you to it
    (px/s), how hard and long its blow shoves you away, the embers it blows out, and how much more a
    hit lands while it breathes in (it is open); the embers come `after` s, once you're thrown clear.
    The pull fades out from 150 px further than `close` down to nothing at `close` (a fighter up
    close isn't dragged onto it). */
/** The Silent Bell: how often it tolls (s), the ring it tolls, and how long until the toll comes
    back from the point across the middle of the room. */
export const BELL = { every: 3, toll: { every: 0, kind: 'ring', n: 16, speed: 95, dmg: 8 } as Pattern, echo: 1.1 };
/** The Tollkeeper: a hit lands `alone` as hard unless another hero hit it in the last `pair` s.
    Goal: a party that hits it together beats it as fast as any mid-boss; one at a time, it lasts. */
export const TOLL = { pair: 1.5, alone: 0.5 };
/** The Quiet Miles' lanterns: each hero's light (px). Inside it an Unsent is real (it can be hit,
    it hurts, it shoots), and a false shape of the Distance shows that it is false. */
export const LANTERN = { r: 110 };
/** The Loner's shield: hits from within `arc` radians either side of where it faces glance off, and
    it turns toward you at `turn` rad/s, so you can walk around it, or a friend comes from behind. */
export const LONER = { arc: 0.9, turn: 0.9 };
export const BELLOWS = { every: 5, draw: 2, pull: 85, close: 90, push: 300, shove: 0.4, after: 0.3, embers: { every: 0, kind: 'ring', n: 14, speed: 120, dmg: 8 } as Pattern, open: 1.5 };

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

/** How each world's dungeon differs from the first: who lives there and when they join (by the
    floor of 10 they first show on, and how common they are), what lies on the ground (each a
    multiplier on the first zone's amounts), and how far you see. Worlds 0-5 are the story's
    chapters, so each dungeon looks and fights like its chapter: a lake, a village, a plateau, the
    fog, the climb. Worlds from 6 are the Ember Road's (a road chapter's `world`, src/story/road.ts).
    A world is also a row of MIDS, THEMES (themes.ts), ZONE_MUSIC and ZONE_RAMPS. */
export interface ZoneDungeon {
  unlock: [MonsterKind, number, number][];
  ground: { water: number; spikes: number; barrels: number; pillars: number };
  /** How far you see, in world pixels (the fog); the bot doesn't see shots past it either. */
  sight?: number;
  /** Each hero carries a lantern (LANTERN): drawn round them, it is what makes the world's Unsent
      real and shows the Distance's false shapes up. The rule itself holds anywhere. */
  lanterns?: boolean;
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
  // The Whetstone Pass (the Ember Road, chapter 1): a mountain road of cold forges. Runaway
  // whetstones roll down it from the first floor, the Lull's snooze clocks tick in the doorways,
  // lancer husks stand guard, mirrors of polished steel; coal barrels, rock to walk around, quench
  // troughs.
  {
    unlock: [
      ['slime', 0, 2],
      ['wisp', 0, 2.2],
      ['grinder', 0, 1.4],
      ['book', 1, 1.6],
      ['ram', 2, 1.8],
      ['mirror', 2, 1.4],
      ['smoke', 3, 1.6],
      ['seeker', 4, 1.5],
      ['splitter', 5, 1.5],
      ['shade', 6, 1.6],
    ],
    ground: { water: 0.4, spikes: 1.2, barrels: 1.6, pillars: 1.3 },
  },
  // The Quiet Miles (the Ember Road, chapter 2): a long valley at night, walls of fog standing
  // across it, so you see only a little way. Unsent letters drift in it from the first floor,
  // wisps and shades live in it, seekers further on; standing stones, still pools.
  {
    unlock: [
      ['wisp', 0, 2.2],
      ['unsent', 0, 2.4],
      ['slime', 0, 1.5],
      ['seeker', 1, 1.6],
      ['shade', 1, 1.5],
      ['mirror', 2, 1.4],
      ['smoke', 4, 1.6],
      ['splitter', 5, 1.5],
      ['ram', 6, 1.5],
    ],
    ground: { water: 1.3, spikes: 0.6, barrels: 0.5, pillars: 1.5 },
    sight: 230,
    lanterns: true,
  },
  // The Long Bridge (the Ember Road, chapter 3): rope bridges and ledges over a gorge. Loners hold
  // the planks from the start, lancer husks charge down them, the wind brings smoke; few posts to
  // hide behind, gaps of dark water.
  {
    unlock: [
      ['slime', 0, 2],
      ['loner', 0, 1.2],
      ['ram', 0, 1.6],
      ['wisp', 1, 1.6],
      ['smoke', 2, 1.6],
      ['book', 3, 1.4],
      ['seeker', 4, 1.5],
      ['splitter', 5, 1.5],
      ['shade', 6, 1.6],
    ],
    ground: { water: 1.4, spikes: 1, barrels: 1, pillars: 0.5 },
  },
];
/** The dungeon of a run's zone (by its world). */
export const zoneDungeon = (zone: Pick<Zone, 'id' | 'world'>) => ZONE_DUNGEONS[clamp(worldOf(zone), 0, ZONE_DUNGEONS.length - 1)];

/** A line about each monster the first time it shows up in a run. */
export const MEET: Partial<Record<MonsterKind, string>> = {
  unsent: 'Unsent letters drift in the fog. Only a lantern makes them real: bring yours close.',
  loner: 'Loners hide behind their shields. Hit them from the side or from behind.',
  ram: 'Lancer Husks glow red, then charge in a line: step aside.',
  mirror: 'Mirrors keep their distance and fire rings.',
  book: 'Snooze Clocks never move. They tick out a spiral of clock hands.',
  smoke: 'Smoke wisps lob bombs where you stand. Leave the circle.',
  seeker: 'Seekers fire shots that curve after you.',
  splitter: 'Excuse Jars bounce shards off the walls, and break into imps when hit hard enough.',
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
 * The Ember Road's, each about a friendship:
 * - The Lull sings to sleep whoever is left on their own, and heals while you all hang back: stay
 *   together and push in.
 * - The Distance hides among false shapes of itself; only the real one shoots, and a lantern held
 *   near a false one shows it up: spread out and find it together.
 * - The One Who Walks Alone wears plates like the Knight, but each of you breaks one at a time:
 *   the more of you hit it, the faster it falls. It pushes you apart: come back together.
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
      // a ring of Zs that drift as they go, and an alarm clock thrown at you
      { every: 3, kind: 'ring', n: 12, speed: 90, dmg: 10, style: 'wiggle', first: 2 },
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
  // A sleepy giant at the top of the Whetstone Pass, who sings (LULL).
  lull: {
    hp: 1100,
    speed: 34,
    dmg: 16,
    r: 24,
    xp: 0,
    move: 'chase',
    shoots: [
      // his song: a slow ring of notes that sway as they go, and a big yawn thrown at you
      { every: 2.8, kind: 'ring', n: 12, speed: 80, dmg: 10, style: 'wiggle', first: 2 },
      { every: 2, kind: 'aimed', n: 1, speed: 105, dmg: 11, r: 10, first: 1.2 },
      // louder (under half): a ring that starts soft and swells
      { every: 4, kind: 'ring', n: 16, speed: 95, dmg: 9, style: 'ramp', below: 0.5 },
    ],
    cost: 0,
  },
  // The Distance (the Quiet Miles): a tall shape of fog with a lantern-glass face, at arm's length.
  distance: {
    hp: 850,
    speed: 38,
    dmg: 16,
    r: 18,
    xp: 0,
    move: 'keep',
    range: 190,
    shoots: [
      // only the real one: a turning spiral of fog, and a slow pair aimed at you
      { every: 0.22, kind: 'spiral', n: 2, speed: 110, dmg: 9, first: 2 },
      { every: 2, kind: 'aimed', n: 3, speed: 125, dmg: 10, first: 1.4 },
    ],
    cost: 0,
  },
  // The One Who Walks Alone (the Long Bridge): a traveller grown into its armor, arms folded.
  alone: {
    hp: 40,
    plates: 40,
    speed: 56,
    dmg: 18,
    r: 16,
    xp: 0,
    move: 'chase',
    shoots: [
      { every: 2.6, kind: 'spread', n: 5, arc: 0.6, speed: 160, dmg: 11, first: 1.5 },
      { every: 1.4, kind: 'aimed', n: 2, speed: 145, dmg: 9, below: 2 / 3 },
      { every: 3.2, kind: 'ring', n: 16, speed: 95, dmg: 9, below: 1 / 3 },
    ],
    cost: 0,
  },
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
/** The Lull's song. Each hero has a drowse (0 to 1) that fills while they are on their own: no
    friend within `near` and further than `reach` from him; at 1 they fall asleep for `sleep` s (no
    moving, no attacking) unless a friend comes within `wake` of them or a hit wakes them. Out of the
    song it drains at `clear`. Under half his HP he sings `louder` (it fills that much faster). He
    heals `heal` of his HP a second while every hero is past `reach`, like Tomorrow. Goal: a party
    that sticks together never sleeps; one that scatters loses a hero for a few seconds at a time. */
export const LULL = { reach: 200, near: 160, fill: 0.24, clear: 0.6, sleep: 2.2, wake: 46, louder: 1.6, heal: 0.03 };
/** A Grinder's roll: how long it turns to face you first (it glows), how fast it rolls, the longest
    roll (s), and the pause after it hits a wall. */
/** The Distance: how often it splits among false shapes (s; faster under half), how many (and
    under half; one more for each friend, as each brings a lantern), and how often it sends Unsent
    letters (s). */
export const DISTANCE = { every: 9, first: 4, shapes: 3, more: 4, call: 7 };
/** The One Who Walks Alone: a hero breaks one plate each PLATE_EVERY however many hit, so a party
    breaks them faster; each friend adds `more` of its plates. Past a third of its plates it pushes
    you apart (`push`, px/s, every `apart` s). Goal: the fight lasts about as long for 2 as for 4. */
export const ALONE = { more: 0.6, push: 300, apart: 6.5 };
export const ROLL = { wind: 0.6, speed: 200, most: 2.6, rest: 0.5 };
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
  still: { name: 'Stillness', text: 'Breathe: heal some HP (friends beside you too) and push everything away. It fills as you fight: hits you land and hits you take.', cd: ABILITY.still.cd },
  shock: { name: 'Shockwave', text: 'Knock back everything near you and wipe the shots around you.', cd: ABILITY.shock.cd },
};
/** Which of a class's four SPs, in the order the story gives them. */
export type SpNo = 1 | 2 | 3 | 4;
export const SP_NOS: SpNo[] = [1, 2, 3, 4];

/** The SP's two moves past the class ability: its own move (a second button) and its final. */
export type SpMoveId =
  | 'leap' | 'inferno' | 'shieldwall' | 'judgment' | 'harpoon' | 'tidalcharge' | 'reap' | 'soulharvest'
  | 'piercing' | 'arrowrain' | 'bomb' | 'barrage' | 'call' | 'pack' | 'vanish' | 'thousandcuts'
  | 'firewall' | 'meteor' | 'bubble' | 'tsunami' | 'blessing' | 'radiance' | 'curse' | 'voidedge'
  | 'risingdragon' | 'dragonroar' | 'pounce' | 'hundredclaws' | 'tidespin' | 'riverdance' | 'kiwave' | 'spiritbomb';

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

/** The SP's own weapon. It sets the basic attack (SP_WEAPONS below, numbers: SP_WEAPON in
    src/balance/classes.ts), the hero's attack animation and the weapon's art
    (src/sprites/parts/spWeapons.ts), and the hit on screen (src/game/dungeon/spFx.ts). */
export type SpWeapon =
  | 'greataxe' | 'hammer' | 'lance' | 'scythe'
  | 'longbow' | 'cannon' | 'boomerang' | 'daggers'
  | 'flamestaff' | 'waterorb' | 'bellstaff' | 'hexblade'
  | 'gauntlets' | 'claws' | 'bo' | 'kipalms';

export interface SpCardDef {
  name: string;
  /** Who this SP is, in one line (the SP card and the gallery in /lab/sp). */
  about: string;
  element: SpElement;
  theme: SpTheme;
  weapon: SpWeapon;
  skill: SpMoveId;
  final: SpMoveId;
  passive: SpPassiveId;
}

/** Each class's four SPs, like NosTale's specialist cards: the first after a few workouts, the
    others as the story goes on. None is stronger than the others; each fights its own way. */
export const SP_CARDS: Record<ClassId, readonly [SpCardDef, SpCardDef, SpCardDef, SpCardDef]> = {
  warrior: [
    { name: 'Blaze Reaver', about: 'A berserker with a burning axe bigger than you, who never backs down.', element: 'fire', theme: 'fire', weapon: 'greataxe', skill: 'leap', final: 'inferno', passive: 'embers' },
    { name: 'Sun Bastion', about: 'A wall of white and gold: a war hammer, a tower shield, nothing gets past.', element: 'light', theme: 'dawn', weapon: 'hammer', skill: 'shieldwall', final: 'judgment', passive: 'bedrock' },
    { name: 'Riptide Lancer', about: 'A knight of the sea with a long lance, there and gone like a wave.', element: 'water', theme: 'storm', weapon: 'lance', skill: 'harpoon', final: 'tidalcharge', passive: 'static' },
    { name: 'Nightscythe', about: 'A reaper in a torn black cloak whose scythe cuts the dark.', element: 'shadow', theme: 'void', weapon: 'scythe', skill: 'reap', final: 'soulharvest', passive: 'secondwind' },
  ],
  archer: [
    { name: 'Rainstalker', about: 'A silent hunter in a rain hood whose arrows go through everything.', element: 'water', theme: 'frost', weapon: 'longbow', skill: 'piercing', final: 'arrowrain', passive: 'tailwind' },
    { name: 'Flintfire', about: 'An explosives expert with a hand cannon and a bomb always lit.', element: 'fire', theme: 'fire', weapon: 'cannon', skill: 'bomb', final: 'barrage', passive: 'frostbite' },
    { name: 'Wolfcaller', about: 'A keeper of the wild with a boomerang and a wolf of light at your side.', element: 'light', theme: 'dawn', weapon: 'boomerang', skill: 'call', final: 'pack', passive: 'harvest' },
    { name: 'Silent Fang', about: 'An assassin with two daggers who strikes from the dark and is gone.', element: 'shadow', theme: 'moon', weapon: 'daggers', skill: 'vanish', final: 'thousandcuts', passive: 'focus' },
  ],
  mage: [
    { name: 'Ashcaller', about: 'A fire caster in a horned hood whose staff holds a ball of flame.', element: 'fire', theme: 'fire', weapon: 'flamestaff', skill: 'firewall', final: 'meteor', passive: 'splitstar' },
    { name: 'Tidesinger', about: 'A caster of the deep sea with an orb of water over the hand.', element: 'water', theme: 'water', weapon: 'waterorb', skill: 'bubble', final: 'tsunami', passive: 'shell' },
    { name: 'Dawnbell', about: 'A healer in white with a halo and a bell that rings the dark away.', element: 'light', theme: 'star', weapon: 'bellstaff', skill: 'blessing', final: 'radiance', passive: 'swiftsurge' },
    { name: 'Hexedge', about: 'A mage who fights up close with a sword made of shadow.', element: 'shadow', theme: 'void', weapon: 'hexblade', skill: 'curse', final: 'voidedge', passive: 'rebound' },
  ],
  monk: [
    { name: 'Dragonheart', about: 'A brawler in red gauntlets whose fists burn like a dragon.', element: 'fire', theme: 'sun', weapon: 'gauntlets', skill: 'risingdragon', final: 'dragonroar', passive: 'flow' },
    { name: 'White Claw', about: 'A fighter like a white tiger, all leaps and claws.', element: 'light', theme: 'tiger', weapon: 'claws', skill: 'pounce', final: 'hundredclaws', passive: 'momentum' },
    { name: 'Stillwater', about: 'A calm fighter with a long staff who flows like a river.', element: 'water', theme: 'water', weapon: 'bo', skill: 'tidespin', final: 'riverdance', passive: 'quickstep' },
    { name: 'Voidpalm', about: 'A fighter who throws their own energy from the palms, from far away.', element: 'shadow', theme: 'void', weapon: 'kipalms', skill: 'kiwave', final: 'spiritbomb', passive: 'sunburst' },
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
    SP_FINAL in src/balance/classes.ts; the look on screen: src/game/dungeon/spFx.ts).
    ring: all around you. drop: a blow from above on one monster (`aim`). all: every monster in the
    room. dash: you rush through them. chain: you or your light jump from monster to monster. guard:
    nothing touches you for a moment. field: a patch on the floor that keeps hitting (round you, or
    on a monster). wall: a line of fire on the floor in front of you. leap: you jump onto a monster
    and crash down. hook: a throw that drags a monster to you. boomerang: a throw that flies out and
    comes back, hitting both ways. vanish: unseen for a moment, and your next hit lands harder.
    trap: one monster held still, then hit. mark: one monster takes more from every hit for a
    while. beam: everything in a line in front of you is hit. */
export type SpShape = 'ring' | 'drop' | 'all' | 'dash' | 'chain' | 'guard' | 'field' | 'wall' | 'leap' | 'hook' | 'boomerang' | 'vanish' | 'trap' | 'mark' | 'beam';

/** Which monster a move picks: the nearest (the default) or the one with the most HP left. */
export type SpAim = 'nearest' | 'strongest';

export const SP_MOVES: Record<SpMoveId, { name: string; text: string; shape: SpShape; aim?: SpAim }> = {
  // warrior
  leap: { name: 'Leap', shape: 'leap', text: 'Jump onto the monster nearest you and crash down in fire, hitting all around where you land.' },
  inferno: { name: 'Inferno', shape: 'field', text: 'Your final. Spin with the axe in a ring of fire that goes with you and keeps burning all it touches.' },
  shieldwall: { name: 'Shield Wall', shape: 'guard', text: 'Raise the shield: for a moment nothing gets through to you or friends beside you, and what is close is pushed back.' },
  judgment: { name: 'Judgment', shape: 'drop', aim: 'strongest', text: 'Your final. A hammer of light falls from the sky on the strongest monster in the room.' },
  harpoon: { name: 'Harpoon', shape: 'hook', text: 'Throw the lance: it hits the monster in front of you and drags it to you.' },
  tidalcharge: { name: 'Tidal Charge', shape: 'dash', text: 'Your final. Ride a wave right across the room, untouchable, hitting all you pass.' },
  reap: { name: 'Reap', shape: 'boomerang', text: 'Throw the scythe: it spins out, cutting all it passes, and comes back to your hand.' },
  soulharvest: { name: 'Soul Harvest', shape: 'all', text: 'Your final. Every monster in the room takes a cut, and you heal a little for each.' },
  // archer
  piercing: { name: 'Piercing Shot', shape: 'beam', text: 'One heavy arrow that goes through a whole line of monsters.' },
  arrowrain: { name: 'Rain of Arrows', shape: 'field', text: 'Your final. Arrows keep falling on a wide circle round the monster nearest you.' },
  bomb: { name: 'Bomb', shape: 'field', text: 'Throw a bomb at the monster nearest you: it bursts and leaves the floor burning.' },
  barrage: { name: 'Barrage', shape: 'all', text: 'Your final. Cannon fire rains on every monster in the room.' },
  call: { name: 'Call', shape: 'drop', aim: 'strongest', text: 'Your wolf of light leaps on the strongest monster in the room.' },
  pack: { name: 'Pack', shape: 'chain', text: 'Your final. Spirit wolves run through the room, biting monster after monster.' },
  vanish: { name: 'Vanish', shape: 'vanish', text: 'Melt into the dark: for a moment nothing sees you, and your next hit lands far harder.' },
  thousandcuts: { name: 'Thousand Cuts', shape: 'chain', text: 'Your final. Flash from monster to monster, cutting each one.' },
  // mage
  firewall: { name: 'Fire Wall', shape: 'wall', text: 'A line of fire on the floor in front of you that burns all who cross it.' },
  meteor: { name: 'Meteor', shape: 'drop', text: 'Your final. A huge rock of fire falls on the monster nearest you and everything round it.' },
  bubble: { name: 'Bubble', shape: 'trap', text: 'Trap the monster nearest you in a bubble: it can\'t move or shoot until it pops.' },
  tsunami: { name: 'Tsunami', shape: 'all', text: 'Your final. A wave crosses the room, hits every monster and pushes them all back.' },
  blessing: { name: 'Blessing', shape: 'guard', text: 'Light wraps round you and friends beside you: you all heal, and for a moment nothing can touch you.' },
  radiance: { name: 'Radiance', shape: 'all', text: 'Your final. A blinding light: every monster in the room is hit and all but stops.' },
  curse: { name: 'Curse', shape: 'mark', text: 'Curse the monster nearest you: for a while it takes more from every hit.' },
  voidedge: { name: 'Void Edge', shape: 'beam', text: 'Your final. A giant blade of shadow cuts through the room in front of you.' },
  // monk
  risingdragon: { name: 'Rising Dragon', shape: 'ring', text: 'An uppercut that lifts you in a column of fire, burning all around you.' },
  dragonroar: { name: 'Dragon Roar', shape: 'beam', text: 'Your final. A dragon of fire flies out from you through everything in its way.' },
  pounce: { name: 'Pounce', shape: 'leap', text: 'Leap on a monster far away and rake it as you land.' },
  hundredclaws: { name: 'Hundred Claws', shape: 'drop', aim: 'strongest', text: 'Your final. A storm of claws on the strongest monster in the room.' },
  tidespin: { name: 'Tide Spin', shape: 'guard', text: 'Spin the staff like a wheel: it stops every shot for a moment, for you and friends beside you, and pushes back what is close.' },
  riverdance: { name: 'River Dance', shape: 'chain', text: 'Your final. Flow from monster to monster like water, striking each.' },
  kiwave: { name: 'Ki Wave', shape: 'beam', text: 'Push your ki out of both palms in a beam that goes through a whole line.' },
  spiritbomb: { name: 'Spirit Bomb', shape: 'drop', text: 'Your final. Lift a huge ball of ki and throw it on the monster nearest you.' },
};

/** What each SP weapon's basic attack is: a swing (slash: a cut in front of you), a shot (arrow:
    flies straight), an orb (flies after a monster) or a wave (bursts all around you). How hard,
    fast, far and wide it hits is SP_WEAPON in src/balance/classes.ts. */
export const SP_WEAPONS: Record<SpWeapon, { name: string; attack: AttackKind }> = {
  greataxe: { name: 'Great axe', attack: 'slash' },
  hammer: { name: 'Hammer and shield', attack: 'slash' },
  lance: { name: 'Lance', attack: 'slash' },
  scythe: { name: 'Scythe', attack: 'slash' },
  longbow: { name: 'Long bow', attack: 'arrow' },
  cannon: { name: 'Hand cannon', attack: 'arrow' },
  boomerang: { name: 'Boomerang', attack: 'arrow' },
  daggers: { name: 'Twin daggers', attack: 'slash' },
  flamestaff: { name: 'Flame staff', attack: 'orb' },
  waterorb: { name: 'Water orb', attack: 'orb' },
  bellstaff: { name: 'Bell staff', attack: 'orb' },
  hexblade: { name: 'Shadow sword', attack: 'slash' },
  gauntlets: { name: 'Gauntlets', attack: 'slash' },
  claws: { name: 'Claws', attack: 'slash' },
  bo: { name: 'Bo staff', attack: 'wave' },
  kipalms: { name: 'Ki palms', attack: 'orb' },
};

/** Every class can dodge: a short dash, untouchable for a moment, on its own short clock. */
export const DODGE = { cd: 2.5, speed: 480, secs: 0.17, ghost: 0.27 };

/** Each class in the dungeon, against the others: HP, armor, damage, move and attack speed (src/balance/classes.ts). */
export { CLASS_BODY } from '@/balance';

export function abilityOf(cls: ClassId | undefined): AbilityId {
  return cls === 'warrior' ? 'charge' : cls === 'archer' ? 'volley' : cls === 'mage' ? 'blink' : cls === 'monk' ? 'still' : 'shock';
}
