import type { ClassId } from '@/lib/gear';
import { MAT_DROPS, MAT_IDS, PARTY, RUN_SKILL, TUTORIAL, type MatId } from '@/balance';
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
  starHit,
  blastHit,
  type AttackKind,
} from '../rules';
import {
  ABILITIES,
  SP_MOVES,
  SP_WEAPONS,
  spDef,
  type AbilityId,
  type SpMoveId,
  type SpShape,
  type SpWeapon,
  type SpNo,
  type SpPassiveId,
  type Ally,
  type AllyKind,
  type CellKind,
  BARREL,
  BELLOWS,
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
  wardenFloor,
  LIGHT,
  LULL,
  ALONE,
  BELL,
  DISTANCE,
  LANTERN,
  LONER,
  TOLL,
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
  ROLL,
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
import { ABILITY, BAG, CALM, CRIT_HIT, DROP_LUCK, DROPS, LEECH_CAP, MAX_EVADE, SP_FINAL, SP_PASSIVE, SP_SKILL, SP_WEAPON, SURGE, type SpMoveNumbers } from '@/balance';
import type { Build } from '@/lib/stats';
import { canWear, ITEM_SLOTS, itemScore, itemTotals, otherClass, rollItem, rollRarity, shortOf, starterKit, type Item, type ItemSlot } from './items';

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
  /** Burning from the Blaze Reaver's Embers: its next tick, when it stops, each tick's damage, and who lit it. */
  burn?: { next: number; until: number; dmg: number; by: Hero };
  /** Slowed (Frostbite, Radiance): moves `k` slower until then. */
  slow?: { until: number; k: number };
  /** Held in a bubble (Bubble): can't move, shoot or touch until then, and takes `dmg` from `by` when it pops. */
  held?: { until: number; dmg: number; by: Hero };
  /** Marked (Curse): takes `k` more from every hit until then. */
  mark?: { until: number; k: number };
  /** The Loner: where its shield faces (radians). */
  face?: number;
  /** The Tollkeeper: when each hero (by id) last hit it. */
  hitters?: Record<number, number>;
  alive: boolean;
}

/** A patch an SP leaves on the floor: it hits everything in it every `every` s until `until`, and
    can slow them. One that `follows` moves with whoever made it. With `to` it is a line (a wall of
    fire) from x, y to there, `r` each side of it. */
export interface SpField {
  id: SpMoveId;
  x: number;
  y: number;
  r: number;
  to?: { x: number; y: number };
  until: number;
  next: number;
  every: number;
  dmg: number;
  slow: number;
  by: Hero;
  follows: boolean;
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
  bounce: number;  /** Who fired it, and with which of its patterns, for its look (foeFx.ts). */
  from?: FoeKind;
  pat?: number;
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
  /** Who threw it, for its look (FOE_FX in foeFx.ts). */
  from?: FoeKind;
}

export interface Shot {
  id: number;
  /** Whose it is: they get the kill. */
  by: Hero;
  kind: 'arrow' | 'orb';
  /** The SP weapon that threw it (a cannonball, a boomerang, a ki blast), for its look on screen. */
  look?: SpWeapon;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  pierce: number;
  target: Foe | null;
  hit: Set<Foe>;
  dies: number;
  /** How close it must pass to hit (past the monster's own size); 6 when not set. */
  r?: number;
  /** A burst this wide where it hits (a cannonball, a fireball). */
  blast?: number;
  /** A share of the thrower's HP healed on each hit (the bell staff). */
  heal?: number;
  /** A throw that comes back (a boomerang, Reap): it turns at `turn` (run seconds) or at a wall,
      then flies to the thrower's hand, hitting each monster once each way; `out` is false on the
      way back. */
  back?: { turn: number; out: boolean };
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
  /** A basic attack; `weapon` is the worn SP's weapon (its own hit on screen), `arc` how wide a swing cuts. */
  | { type: 'attack'; kind: AttackKind; x: number; y: number; angle: number; n: number; r?: number; weapon?: SpWeapon; arc?: number }
  | { type: 'hit'; id: number; x: number; y: number; dmg: number; boss: boolean; crit?: boolean }
  | { type: 'kill'; id: number; x: number; y: number; kind: FoeKind; elite: boolean }
  /** A hero took a hit; `hero` is whose (their id), so a phone shakes only for its own. */
  | { type: 'hurt'; x: number; y: number; dmg: number; by: 'shot' | 'touch' | 'image' | 'reflection'; hero?: number }
  /** A monster fired a volley (`id` and `kind`: which, for its look). */
  | { type: 'shoot'; x: number; y: number; boss: boolean; id?: number; kind?: FoeKind }
  | { type: 'burst'; x: number; y: number; r: number; color: 'nova' | 'orb' | 'wave' | 'fire' | 'ability' | 'star' | 'blast' }
  /** Falling star (a run skill): a star on its way down to (x, y); its burst follows. */
  | { type: 'star'; x: number; y: number }
  | { type: 'chain'; points: { x: number; y: number }[] }
  | { type: 'ability'; id: AbilityId; x: number; y: number; toX: number; toY: number }
  /** An SP move: its own move or its final, of size `r` at x, y. `to` is where it ends (a leap's
      landing, a beam's or wall's far end, the monster a hook drags), `angle` the way it goes,
      `points` a chain's path, `width` a beam's or wall's width, `secs` how long it lasts. */
  | { type: 'sp'; id: SpMoveId; x: number; y: number; r: number; final: boolean; angle?: number; points?: { x: number; y: number }[]; secs?: number; to?: { x: number; y: number }; width?: number }
  /** An SP's passive went off: a monster caught fire, a tailwind, a split star, the flow's heal. */
  | { type: 'passive'; id: SpPassiveId; x: number; y: number }
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
  /** The boss is down: the room goes quiet and the stairs up lead home. */
  | { type: 'won' }
  | { type: 'dash'; x: number; y: number; toX: number; toY: number }
  | { type: 'shout'; x: number; y: number }
  | { type: 'boom'; x: number; y: number; r: number }
  | { type: 'blink'; x: number; y: number; toX: number; toY: number }
  | { type: 'wind'; id: number }
  | { type: 'shrine'; x: number; y: number }
  | { type: 'chest'; x: number; y: number }
  | { type: 'relic'; id: RelicId }
  | { type: 'ward'; x: number; y: number }
  /** A hit on you missed: Evade, from what you wear. */
  | { type: 'evade'; x: number; y: number }
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
  /** The Bellows breathes in (it pulls everyone to it), and blows them back out with embers. */
  | { type: 'inhale'; id: number }
  | { type: 'blow'; x: number; y: number }
  /** The Lull's song: a hero fell asleep, or woke (`by` a friend, a hit, or on their own). */
  | { type: 'sleep'; hero: number; x: number; y: number }
  | { type: 'wake'; hero: number; x: number; y: number; by: 'friend' | 'hit' | 'self' }
  /** The Lull sings louder (under half his HP). */
  | { type: 'louder'; x: number; y: number }
  /** A false shape of the Distance shown up by a lantern. */
  | { type: 'shown'; id: number; x: number; y: number }
  /** The Silent Bell tolls, and the toll will come back from toX, toY. */
  | { type: 'toll'; x: number; y: number; toX: number; toY: number }
  /** A hit glanced off a Loner's shield. */
  | { type: 'block'; id: number; x: number; y: number }
  /** The mid-boss speaks (in the speech bubble, over it). */
  | { type: 'midSay'; text: string }
  | { type: 'say'; text: string }
  /** Something to wear: dropped on the floor, or picked up into the bag. */
  | { type: 'drop'; x: number; y: number; item: Item }
  | { type: 'loot'; item: Item }
  /** You found co-op materials for Mira's forge. */
  | { type: 'mat'; mat: MatId; n: number; x: number; y: number };

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
  /** Hero level from training XP, which items ask for too (unset: no level asked, as in old replays). */
  heroLevel?: number;
  /** The chapter's hearts are gone: a weaker boss and free skills at the start (`edgeFor` in src/lib/fog.ts). */
  edge?: Edge;
  /** Wearing one of the class's SPs (which one; `true` is the first): its own move, its final and
      its passive, on top of the class ability (src/lib/sp.ts). */
  sp?: SpNo | boolean;
}

/** A run: where, its seed, and you (the first hero). `friends` walk in with you, in co-op. */
export interface RunSetup extends HeroSetup {
  zone: Zone;
  seed: number;
  /** Skills are taken by the bot's order instead of waiting for a pick (and items the bot likes
      are worn, the stairs always go deeper, and a fallen boss ends the run on the spot). */
  autoPick?: boolean;
  layout?: Layout;
  /** More heroes in the party, after you (co-op). */
  friends?: HeroSetup[];
  /** The opening's first dungeon (TUTORIAL in src/balance/dungeon.ts): a few small floors of
      slimes, no drops, the stairs always go deeper, you can't fall (HP stops at 1), and at the
      bottom the Hollow says your line (`voice`) and strikes you down: a loss the story needs. */
  tutorial?: { voice: string };
}

/** How many items the bag holds, and how often things drop (src/balance/items.ts). */
export { BAG, DROPS };

export interface Input {
  /** Where you push the stick, each in [-1, 1]. */
  x: number;
  y: number;
  /** The ability button went down this step. */
  ability: boolean;
  /** The SP's own move, and its final (only with an SP on). */
  skill?: boolean;
  final?: boolean;
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
  /** Hits you took. */
  hits?: number;
  /** 'left' is walking out by the stairs: not a win, but you keep what you carry. */
  why: 'boss' | 'hp' | 'limit' | 'left';
  /** What you wore and carried at the end (the starter kit left out). A fall loses what you found in the bag. */
  gear: { worn: Partial<Record<ItemSlot, Item>>; bag: Item[] };
  /** How many ledges of the Summit's climb you went up, or null off the Summit. */
  height: number | null;
  /** Co-op materials you found (only in a party; kept however the run ends). */
  mats?: Partial<Record<MatId, number>>;
}

/** One hero in a run: where they stand, their body, their growth and what they carry. Solo play is
    a party of one; all of it is per player so a co-op run can hold several. */
export interface Hero {
  /** Place in the party, from 0 (you). */
  id: number;
  classId: ClassId | undefined;
  /** Stat points spent, which items ask for. */
  build: Build;
  /** Hero level from training XP (not the run's `level`), which items ask for too. */
  heroLevel: number;
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
  gearFx: { move: number; heal: number; cooldown: number; critDmg: number; slayer: number; leech: number; evade: number; power: number };
  /** Life steal healed since `leechAt` (it heals at most LEECH_CAP of max HP a second). */
  leechHp: number;
  leechAt: number;
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
  /** A rush in a straight line: the warrior's charge (it hits what it passes), an SP's dash (`w`:
      how far each side it hits) or leap, or a dodge (it doesn't hit). */
  charge: { until: number; x: number; y: number; hit: Set<Foe>; harm: boolean; dmg?: number; w?: number } | null;
  /** The dodge is ready again then. */
  dodgeAt: number;
  /** The Gale's gust on you (px/s), added to how you walk. */
  wind: { x: number; y: number };
  shove: { until: number; x: number; y: number };
  ability: AbilityId;
  abilityAt: number;
  /** The monk's calm: Stillness is ready when it reaches CALM.full (it fills by fighting). */
  calm: number;
  /** The SP worn into the run (which one, its moves and passive, from SP_CARDS), or null. */
  sp: { n: SpNo; skill: SpMoveId; final: SpMoveId; passive: SpPassiveId; weapon: SpWeapon } | null;
  skillAt: number;
  /** The SP's final is ready when this reaches SURGE.full (it fills by fighting). */
  surge: number;
  /** The Rainstalker's Tailwind runs until then; the Ashcaller's attacks, counted for Split Star. */
  tailwind: number;
  shots: number;
  /** The Dragonheart's Flow heals again from then. */
  flow: number;
  /** How long you've been moving, and standing still (Momentum, Bedrock); hits landed (Static,
      Sunburst); Second Wind used on this floor; a Crystal Shell up until then; a guard (Sun Guard,
      Lotus Bloom) up until then. */
  moveFor: number;
  stillFor: number;
  landed: number;
  windUsed: boolean;
  shellUntil: number;
  guardUntil: number;
  /** Unseen (Vanish) until then: monsters lose you and nothing touches you. `sneak` is how much
      more your next hit does (0: none waiting). */
  hideUntil: number;
  sneak: number;
  /** In a party: how long a friend has stood by while you're down (back up at PARTY.revive.secs),
      and whether you're out at a door or on the stairs, waiting for the rest. */
  reviving: number;
  waiting: boolean;
  /** Told once this run that everyone has to be there to go on. */
  toldWait?: boolean;
  /** The Lull's song (LULL): how drowsy you are (0 to 1), and asleep until then (no moving, no
      attacking). */
  drowse: number;
  sleepUntil: number;
  /** Hits taken this run (what the run's recap shows, to set the bot against people). */
  hits: number;
  cd: { attack: number; spark: number; nova: number; fireball: number; star: number; frost: number };
  /** Momentum (a run skill): kills stacked, and when they run out. */
  rush: number;
  rushUntil: number;
  ups: Partial<Record<UpgradeId, number>>;
  flames: number;
  orbit: number;
  fairyAt: number;
  mirrorHurtAt: number;
  /** The One Who Walks Alone: when this hero can break its next plate (ALONE). */
  plateAt: number;
  free: FreePick[];
  pendingLevels: number;
  /** A pick waiting for the player: the run holds still until it's made. */
  offer: { choices: UpgradeId[]; free: FreePick | null } | null;
  /** Co-op materials found so far (a party only). */
  mats: Partial<Record<MatId, number>>;
}

export interface Run {
  setup: RunSetup;
  layout: Layout;
  rnd: () => number;
  /** Rolls for crits, apart from `rnd` so they don't shift the floor's other rolls. */
  critRnd: () => number;
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
  /** In a party each hero opens the chest once for their own pick (`took`: who has). */
  chest: { x: number; y: number; opened: boolean; took?: number[] } | null;
  stairs: { x: number; y: number } | null;
  /** Items on the floor here. */
  /** Items on the floor. In a party each one is for one hero (`for`, their id): only they see and take it. */
  loot: { id: number; x: number; y: number; item: Item; full?: boolean; for?: number }[];
  /** Standing on the stairs: deeper, or out with what you carry? The run holds still. */
  stairsAsk: boolean;
  /** The boss is down: what's on the floor is yours to pick up, and the stairs lead home (a win). */
  home: boolean;
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
  /** Patches on the floor from an SP (Thorn Trap, Hourglass, Blizzard, Rift) that keep hitting. */
  fields: SpField[];
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
  const layout = setup.layout ?? (setup.tutorial ? TUTORIAL.layout : LAYOUT);
  const run: Run = {
    setup,
    layout,
    rnd: seeded(setup.seed),
    critRnd: seeded(setup.seed ^ 0x5bd1e995),
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
    home: false,
    cleared: false,
    doorOpen: false,
    party,
    hero: party[0],
    warden: null,
    dim: null,
    foes: [],
    bullets: [],
    fields: [],
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

/** The SP a hero walks in wearing, if any. */
function spOn(hs: HeroSetup): Hero['sp'] {
  if (!hs.sp) return null;
  const n: SpNo = hs.sp === true ? 1 : hs.sp,
    d = spDef(hs.classId, n);
  return { n, skill: d.skill, final: d.final, passive: d.passive, weapon: d.weapon };
}

/** The passive of the SP a hero wears, if it is this one. */
const has = (h: Hero, id: SpPassiveId) => h.sp?.passive === id;

function newHero(hs: HeroSetup, id: number): Hero {
  const base = hs.power,
    power = base,
    kit = starterKit(hs.classId),
    hp = 0;
  return {
    id,
    classId: hs.classId,
    build: hs.build ?? {},
    heroLevel: hs.heroLevel ?? Infinity,
    power: base,
    x: ROOM.w / 2, y: ROOM.h - 70, vx: 0, vy: 0, facing: -Math.PI / 2,
    lock: null,
    relics: {},
    base,
    gear: { worn: { weapon: hs.worn?.weapon && !otherClass(hs.worn.weapon, hs.classId) ? hs.worn.weapon : kit.weapon, ...(hs.worn?.armor ? { armor: hs.worn.armor } : {}), ...(hs.worn?.charm ? { charm: hs.worn.charm } : {}) }, bag: [] },
    gearFx: { move: 0, heal: 0, cooldown: 0, critDmg: 0, slayer: 0, leech: 0, evade: 0, power: 0 },
    leechHp: 0,
    leechAt: 0,
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
    calm: 0,
    sp: spOn(hs),
    skillAt: 0,
    surge: 0,
    tailwind: -99,
    flow: 0,
    moveFor: 0,
    stillFor: 0,
    landed: 0,
    windUsed: false,
    shellUntil: 0,
    guardUntil: 0,
    hideUntil: 0,
    sneak: 0,
    reviving: 0,
    waiting: false,
    drowse: 0,
    sleepUntil: 0,
    shots: 0,
    hits: 0,
    cd: { attack: 0.5, spark: RUN_SKILL.spark.every, nova: RUN_SKILL.nova.every, fireball: 2.5, star: RUN_SKILL.star.every, frost: 0 },
    rush: 0,
    rushUntil: 0,
    ups: {},
    flames: power.flames,
    orbit: 0,
    fairyAt: 0,
    mirrorHurtAt: 0,
    plateAt: 0,
    free: [...(power.fresh ? (['fresh'] as const) : []), ...(power.rested ? (['rested'] as const) : []), ...Array<FreePick>(hs.edge?.picks ?? 0).fill('past')],
    pendingLevels: 0,
    offer: null,
    mats: {},
  };
}

const NOBODY: Hero[] = [];
/** The heroes still standing (read-only: solo, it's the party itself, so no new list every call). */
const standing = (run: Run): Hero[] => (run.party.length === 1 ? (run.party[0].hp > 0 ? run.party : NOBODY) : run.party.filter((h) => h.hp > 0));
/** Unseen (Vanish): monsters lose this hero. */
const hidden = (run: Run, h: Hero) => run.t < h.hideUntil;
/** The hero a monster at x, y goes for: the nearest one still standing (one in sight first). */
function prey(run: Run, x: number, y: number): Hero {
  let best = run.party[0],
    bd = Infinity;
  for (const h of run.party) {
    if (h.hp <= 0 && run.party.length > 1) continue;
    const d = (h.x - x) ** 2 + (h.y - y) ** 2 + (hidden(run, h) ? 1e12 : 0);
    if (d < bd) {
      bd = d;
      best = h;
    }
  }
  return best;
}
/** The side a hero has walked out of the room by (into an open door's gap), or null. */
export function outSide(run: Pick<Run, 'area'>, h: Pick<Hero, 'x' | 'y'>): Side | null {
  const { w, h: H } = run.area;
  return h.y < 4 ? 'e' : h.y > H - 4 ? 'w' : h.x < 4 ? 'n' : h.x > w - 4 ? 's' : null;
}

/** Standing on the stairs down. */
export const onStairs = (run: Pick<Run, 'stairs'>, h: Pick<Hero, 'x' | 'y'>) => !!run.stairs && Math.hypot(run.stairs.x - h.x, run.stairs.y - h.y) < 18 + HERO_R;

/** Whether this hero can open the room's chest: once, or in a party once each. */
export function canOpen(run: Pick<Run, 'chest' | 'party'>, h: Pick<Hero, 'id'>): boolean {
  const c = run.chest;
  return !!c && (run.party.length < 2 ? !c.opened : !c.took?.includes(h.id));
}

/** The friends of `h` still standing within `r` of x, y. */
const friendsNear = (run: Run, h: Hero, x: number, y: number, r: number) => run.party.filter((o) => o !== h && o.hp > 0 && Math.hypot(o.x - x, o.y - y) <= r);

/** A hero is choosing (a skill, a chest item): the run holds still. */
const choosing = (run: Run) => run.party.some((h) => h.offer || h.relicOffer);

const later = (run: Run, s: number, fn: () => void) => run.timers.push({ at: run.t + s, run: fn });
/** The hero whose own turn this step is (moving, their buttons, their attacks), or null. Set only
    inside stepRun, so a live run can tell your own moves from the rest (src/game/net/follow.ts). */
let acting: number | null = null;
const OWN: ReadonlySet<GameEvent['type']> = new Set(['attack', 'ability', 'sp', 'dodge', 'dash', 'passive']);
const emit = (run: Run, e: GameEvent) => {
  if (acting !== null && OWN.has(e.type)) (e as GameEvent & { by?: number }).by = acting;
  run.events.push(e);
};
/** Whose own move an event shows (an attack, an ability, an SP move, a dodge), if it is one. */
export const byOf = (e: GameEvent): number | undefined => (e as GameEvent & { by?: number }).by;
/** News for one hero only (an item into their bag, their chest, their relic, their material):
    in a party the others don't hear it. */
const emitTo = (run: Run, h: Hero, e: GameEvent) => {
  (e as GameEvent & { only?: number }).only = h.id;
  emit(run, e);
};
/** Whether the hero `id` hears an event: everyone does, unless it's another hero's own news. */
export const heard = (e: GameEvent, id: number) => {
  const only = (e as GameEvent & { only?: number }).only;
  return only === undefined || only === id;
};
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
  if (run.setup.tutorial) return tutorialWaves(run);
  const room = cellOf(run).dist,
    deep = depth(run),
    fl = floorOf10(run),
    size = Math.sqrt((run.area.w * run.area.h) / (ROOM.w * ROOM.h));
  const budget = (6 + 10 * deep + room + (run.climb ?? 0) * 1.5) * DIALS.crowd * size * (run.kind === 'elite' ? ELITE.crowd : 1) * partyMore(run, 'crowd');
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

/** The first dungeon's rooms: a few slimes in each wave, and a wisp from TUTORIAL.wispFrom on. */
function tutorialWaves(run: Run): MonsterKind[][] {
  const waves = TUTORIAL.waves[Math.min(run.floor, TUTORIAL.waves.length - 1)];
  return waves.map((n) => [...Array<MonsterKind>(n).fill('slime'), ...(run.floor >= TUTORIAL.wispFrom ? (['wisp'] as MonsterKind[]) : [])]);
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
  run.fields = [];
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
  const ps = run.terrain.pillars;
  for (let i = 0; i < ps.length; i++) if (closer(ps[i].x - x, ps[i].y - y, ps[i].r + r)) return true;
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

/** How much tougher a party makes the dungeon (PARTY.more): 1 alone, more for each friend. */
const partyMore = (run: Run, k: keyof typeof PARTY.more) => 1 + PARTY.more[k] * (run.setup.friends?.length ?? 0);

export function addFoe(run: Run, kind: MonsterKind, x: number, y: number): Foe {
  const def = MONSTERS[kind],
    { zone } = run.setup;
  // Deeper is tougher: three times the HP on the boss's floor.
  const elite = run.kind === 'elite' && def.xp > 0;
  // On the Summit, each ledge climbed is tougher.
  const up = 1 + CLIMB.tougher * (run.climb ?? 0),
    hp = Math.round(def.hp * zone.hp * DIALS.hp * (1 + DIALS.deep * depth(run)) * (elite ? ELITE.hp : 1) * up * partyMore(run, 'hp')),
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
  // A party makes the boss tougher, but not the Knight: his plates fall one at a time however
  // many hit him (PLATE_EVERY), so more plates would only make the fight longer. The One Who Walks
  // Alone loses one a hero at a time, so each friend brings it more (ALONE.more).
  const more = partyMore(run, 'boss'),
    friends = run.setup.friends?.length ?? 0,
    plates = def.plates ? def.plates * (which === 'alone' ? 1 + ALONE.more * friends : 1) : 0,
    hp = run.setup.tutorial ? TUTORIAL.bossHp : plates ? Math.round(plates * weak) : Math.round(def.hp * zone.hp * BOSS_HP * weak * more);
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
  run.bossSummon = which === 'mirror' ? 2 : which === 'distance' ? DISTANCE.call : 6;
  run.bossClock = which === 'knight' ? 6 : which === 'mirror' ? SPLIT.first : which === 'distance' ? DISTANCE.first : which === 'alone' ? ALONE.apart : 0;
  // The Hollow's light first opens a few seconds in.
  if (which === 'hollow' && !run.setup.tutorial) b.act = run.t + LIGHT.first;
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
  for (const h of up) {
    h.hp = Math.min(h.maxHp, h.hp + Math.round(h.maxHp * DIALS.stairs));
    h.windUsed = false;
  }
  emit(run, { type: 'floor', floor: run.floor + 1 });
  for (const h of up) emit(run, { type: 'heal', x: h.x, y: h.y, n: Math.round(h.maxHp * DIALS.stairs) });
  // Anyone still down gets back up on the way down.
  for (const h of run.party) if (h.hp <= 0) upAgain(run, h);
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
  if (run.home) {
    if (now >= RUN_LIMIT) return end(run, true, 'boss');
  } else if (run.bossAt !== null && now - run.bossAt >= (run.climb !== null ? CLIMB.limit : BOSS_LIMIT)) {
    emit(run, { type: 'say', text: run.climb !== null ? 'The light fades on the mountain. You climbed, and that counts.' : 'The Fog closes in. Train, and come back.' });
    return end(run, false, 'limit');
  }
  else if (now >= RUN_LIMIT) return end(run, false, 'limit');
  const inputs = Array.isArray(input) ? input : [input],
    up = standing(run);
  for (const h of up) {
    const i = asleep(run, h) ? IDLE : (inputs[h.id] ?? IDLE);
    acting = h.id;
    if (i.lock !== undefined) h.lock = i.lock;
    if (i.dodge) dodge(run, h, i);
    moveHero(run, h, i);
    if (i.ability) useAbility(run, h, i);
    if (h.sp && i.skill) useSkill(run, h, i);
    if (h.sp && i.final) useFinal(run, h, i);
    acting = null;
  }
  if (run.party.length > 1) revive(run);
  stepFields(run);
  moveFoes(run);
  moveBullets(run);
  if (run.over) return;
  for (const h of standing(run)) {
    if (asleep(run, h)) continue;
    acting = h.id;
    attack(run, h);
    skills(run, h);
    acting = null;
  }
  moveShots(run);
  if (run.over) return;
  helpers(run);
  if (run.over) return;
  pullGems(run);
  checkRoom(run);
  if (run.foes.length > 40) run.foes = run.foes.filter((f) => f.alive);
}

/** Asleep in the Lull's song: the hero stands where they are and doesn't fight. */
export const asleep = (run: Pick<Run, 't'>, h: Hero) => run.t < h.sleepUntil;

/** Out at a door or on the stairs before the rest of the party: told once a run, to that hero only. */
function wait(run: Run, h: Hero) {
  if (h.waiting) return;
  h.waiting = true;
  if (h.toldWait) return;
  h.toldWait = true;
  emitTo(run, h, { type: 'say', text: 'Waiting for your party. Everyone has to be here to go on.' });
}

/** In a party: a friend standing next to one who is down brings them back up, given a moment. */
function revive(run: Run) {
  const k = PARTY.revive;
  for (const d of run.party) {
    if (d.hp > 0) continue;
    const by = run.party.find((o) => o.hp > 0 && Math.hypot(o.x - d.x, o.y - d.y) < k.r);
    d.reviving = by ? d.reviving + STEP : 0;
    if (!by || d.reviving < k.secs) continue;
    d.reviving = 0;
    upAgain(run, d, k.hp);
    if (d === run.hero) emit(run, { type: 'say', text: 'A friend got you back up.' });
    else if (by === run.hero) emit(run, { type: 'say', text: 'You got your friend back up.' });
  }
}

/** A hero who was down stands up with `share` of their HP. */
function upAgain(run: Run, h: Hero, share = PARTY.stairsUp) {
  h.hp = Math.max(1, Math.round(h.maxHp * share));
  h.hurtUntil = run.t + INVULNERABLE;
  emit(run, { type: 'heal', x: h.x, y: h.y, n: h.hp });
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
  // For Momentum and Bedrock: how long you've been on the move, or standing.
  if (len > 0.05) {
    h.moveFor += STEP;
    h.stillFor = 0;
  } else {
    h.moveFor = 0;
    h.stillFor += STEP;
  }
  // A cleared room is safe: cross it at a run, so the walk to the next fight is short.
  const speed = heroSpeed(h.ups) * (1 + 0.1 * relic(h, 'boots') + h.gearFx.move + h.power.move) * bodyOf(h).move * (run.cleared ? CLEAR_RUN : 1) * (now < h.tailwind ? 1 + SP_PASSIVE.tailwind.move : 1);
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
  const out = outSide(run, h),
    door = out && run.doors.find((d) => d.side === out);
  // In a party, a door or the stairs take you on only when everyone standing is there: until then
  // you wait in the doorway (or on the stairs).
  if (door) {
    if (standing(run).every((o) => outSide(run, o) === out)) return throughDoor(run, door);
    return wait(run, h);
  }
  if (onStairs(run, h)) {
    if (!standing(run).every((o) => onStairs(run, o))) return wait(run, h);
    if (run.home) return end(run, true, 'boss');
    if (run.setup.autoPick || run.setup.tutorial) return downStairs(run);
    run.stairsAsk = true;
    return;
  }
  h.waiting = false;
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
    emitTo(run, h, { type: 'loot', item: l.item });
    if (run.setup.autoPick) botWear(run, h, l.item);
    break;
  }
  // A chest: open it and pick what's inside.
  const c = run.chest;
  if (c && canOpen(run, h) && Math.hypot(c.x - h.x, c.y - h.y) < 22 + HERO_R) openChest(run, h);
  // The ground under you.
  for (const q of run.terrain.spikes) if (inRect(q, h.x, h.y, HERO_R - 4) && spikeState(q, now) === 'up') hurt(run, h, SPIKES.dmg * run.setup.zone.dmg, 'touch');
  const sh = run.terrain.shrine;
  if (sh && !sh.used && Math.hypot(sh.x - h.x, sh.y - h.y) < SHRINE.r + HERO_R) {
    sh.used = true;
    emit(run, { type: 'shrine', x: sh.x, y: sh.y });
    // The shrine heals the whole party, wherever they stand.
    for (const o of standing(run)) {
      const heal = Math.round(o.maxHp * DIALS.shrine);
      o.hp = Math.min(o.maxHp, o.hp + heal);
      emit(run, { type: 'heal', x: o.x, y: o.y, n: heal });
    }
  }
  if (h.charge?.harm) {
    clearBullets(run, h.x, h.y, HERO_R + 24);
    for (const f of run.foes) {
      if (!f.alive || h.charge.hit.has(f) || dist(f, h) > f.def.r + (h.charge.w ?? HERO_R + 12)) continue;
      h.charge.hit.add(f);
      damage(run, h, f, h.charge.dmg ?? pow(h, ATTACK.slash.dmg * 2), 220);
    }
  }
}

/** A short dash, untouchable for a moment: shots pass through you. It goes where you push the
    stick, or the way you face. */
function dodge(run: Run, h: Hero, input: Input) {
  const now = run.t;
  if (now < h.dodgeAt || (h.charge && now < h.charge.until)) return;
  h.dodgeAt = now + DODGE.cd * (has(h, 'quickstep') ? SP_PASSIVE.quickstep.cd : 1);
  let dx = input.x,
    dy = input.y;
  if (Math.hypot(dx, dy) < 0.1) [dx, dy] = [Math.cos(h.facing), Math.sin(h.facing)];
  const d = Math.hypot(dx, dy) || 1;
  dx /= d;
  dy /= d;
  h.charge = { until: now + DODGE.secs, x: dx * DODGE.speed, y: dy * DODGE.speed, hit: new Set(), harm: false };
  h.ghostUntil = Math.max(h.ghostUntil, now + DODGE.ghost);
  // Tailwind (the Rainstalker's passive): the wind carries you on after a dodge. Crystal Shell:
  // a shell forms round you.
  if (has(h, 'tailwind')) {
    h.tailwind = now + DODGE.secs + SP_PASSIVE.tailwind.secs;
    emit(run, { type: 'passive', id: 'tailwind', x: h.x, y: h.y });
  }
  if (has(h, 'shell')) {
    h.shellUntil = now + SP_PASSIVE.shell.secs;
    emit(run, { type: 'passive', id: 'shell', x: h.x, y: h.y });
  }
  emit(run, { type: 'dodge', x: h.x, y: h.y, toX: h.x + dx * DODGE.speed * DODGE.secs, toY: h.y + dy * DODGE.speed * DODGE.secs });
}

/** How ready the hero's ability is, 0 to 1 (1 = ready). Stillness fills by fighting, the rest by time. */
export function abilityReady(run: Run, h: Hero): number {
  if (h.ability === 'still') return Math.min(1, h.calm / CALM.full);
  return Math.min(1, 1 - (h.abilityAt - run.t) / ABILITIES[h.ability].cd);
}

/** The monk grows calm in a fight: hits landed and hits taken, quicker with the hourglass and cooldown gear.
    The SP's final fills the same way (`surge`), faster with Swift Sands. */
function calmer(run: Run, h: Hero, n: number, taken = false) {
  const quick = 1 + 0.25 * relic(h, 'hourglass') + h.gearFx.cooldown;
  if (h.ability === 'still') h.calm = Math.min(CALM.full, h.calm + n * quick);
  if (!h.sp) return;
  h.surge = Math.min(SURGE.full, h.surge + (taken ? SURGE.taken : SURGE.hit) * quick * (has(h, 'swiftsurge') ? SP_PASSIVE.swiftsurge.fill : 1));
}

// ---------- the SP's passives ----------

/** After a hit you landed: the passives that answer a hit. `dmg` is what it did. */
function onLanded(run: Run, by: Hero, f: Foe, knight: boolean) {
  if (!by.sp) return;
  by.landed++;
  const p = by.sp.passive;
  if (p === 'embers' && !knight) kindle(run, by, f);
  else if (p === 'flow') flow(run, by);
  else if (p === 'frostbite' && f.alive && !knight && run.critRnd() < SP_PASSIVE.frostbite.chance) {
    f.slow = { until: run.t + SP_PASSIVE.frostbite.secs, k: SP_PASSIVE.frostbite.slow };
    emit(run, { type: 'passive', id: 'frostbite', x: f.x, y: f.y });
  } else if (p === 'static' && by.landed % SP_PASSIVE.static.every === 0) {
    // a spark jumps to another monster close by
    const other = nearest(run, f.x, f.y, new Set([f]), SP_PASSIVE.static.reach);
    if (other) {
      emit(run, { type: 'passive', id: 'static', x: other.x, y: other.y });
      echo(run, by, () => damage(run, by, other, pow(by, ATTACK[attackOf(by.classId)].dmg * SP_PASSIVE.static.dmg), 40));
    }
  } else if (p === 'sunburst' && by.landed % SP_PASSIVE.sunburst.every === 0) {
    const k = SP_PASSIVE.sunburst;
    emit(run, { type: 'passive', id: 'sunburst', x: by.x, y: by.y });
    echo(run, by, () => burst(run, by, by.x, by.y, k.r, pow(by, ATTACK[attackOf(by.classId)].dmg * k.dmg), 'fire', undefined, 120));
  }
}

/** A passive's own hit doesn't set off another one. */
function echo(run: Run, h: Hero, f: () => void) {
  if (!h.sp) return;
  const sp = h.sp;
  h.sp = null;
  try {
    f();
  } finally {
    h.sp = sp;
  }
}

/** How much more your hits do: Momentum (moving builds it up). */
function spMore(h: Hero): number {
  if (!has(h, 'momentum')) return 1;
  const k = SP_PASSIVE.momentum;
  return 1 + k.dmg * Math.min(1, h.moveFor / k.secs);
}

/** How much more a hit does on a marked monster (Curse), and on the first hit after a Vanish. */
function spMark(run: Run, by: Hero, f: Foe): number {
  let k = 1;
  if (f.mark && run.t < f.mark.until) k *= 1 + f.mark.k;
  if (by.sneak) {
    k *= 1 + by.sneak;
    by.sneak = 0;
  }
  return k;
}

/** More crits: Focus, while you're barely scratched. */
const spCrit = (h: Hero) => (has(h, 'focus') && h.hp >= h.maxHp * SP_PASSIVE.focus.above ? SP_PASSIVE.focus.crit : 0);

/** Flow (the Dragonheart's passive): a hit you land heals you a little, at most once every `every` s. */
function flow(run: Run, by: Hero) {
  const k = SP_PASSIVE.flow;
  if (!k.heal || by.hp <= 0 || by.hp >= by.maxHp || run.t < by.flow) return;
  by.flow = run.t + k.every;
  by.hp = Math.min(by.maxHp, by.hp + Math.max(1, Math.round(by.maxHp * k.heal)));
  emit(run, { type: 'passive', id: 'flow', x: by.x, y: by.y });
}

/** Embers (the Blaze Reaver's passive): a hit can set a monster burning, if it isn't already. */
function kindle(run: Run, by: Hero, f: Foe) {
  if (!f.alive || (f.burn && run.t < f.burn.until)) return;
  const k = SP_PASSIVE.embers;
  if (run.critRnd() >= k.chance) return;
  f.burn = { next: run.t + k.every, until: run.t + k.secs, dmg: Math.max(1, Math.round(pow(by, ATTACK.slash.dmg * k.dmg))), by };
  emit(run, { type: 'passive', id: 'embers', x: f.x, y: f.y });
}

/** A burning monster takes its fire's damage each tick, until the fire goes out. */
function burnTick(run: Run, f: Foe) {
  const b = f.burn;
  if (!b || run.t < b.next) return;
  if (run.t > b.until || untouchable(run, f)) {
    f.burn = undefined;
    return;
  }
  b.next += SP_PASSIVE.embers.every;
  f.hp -= b.dmg;
  f.hitAt = run.t;
  emit(run, { type: 'hit', id: f.id, x: f.x, y: f.y, dmg: b.dmg, boss: f === run.boss });
  if (f.hp <= 0) kill(run, f, b.by);
}

/** Before a hit lands on you: Crystal Shell takes it; Bedrock makes it smaller. Returns what is left (0: none). */
function spGuard(run: Run, h: Hero, dmg: number): number {
  if (!h.sp) return dmg;
  if (has(h, 'shell') && run.t < h.shellUntil) {
    h.shellUntil = 0;
    emit(run, { type: 'passive', id: 'shell', x: h.x, y: h.y });
    return 0;
  }
  if (has(h, 'bedrock') && h.stillFor >= SP_PASSIVE.bedrock.after) {
    emit(run, { type: 'passive', id: 'bedrock', x: h.x, y: h.y });
    return dmg * (1 - SP_PASSIVE.bedrock.cut);
  }
  return dmg;
}

/** After a hit on you: Rebound hits back; Second Wind lifts you once a floor. */
function spHurt(run: Run, h: Hero) {
  if (!h.sp || h.hp <= 0) return;
  if (has(h, 'rebound')) {
    const k = SP_PASSIVE.rebound;
    emit(run, { type: 'passive', id: 'rebound', x: h.x, y: h.y });
    echo(run, h, () => burst(run, h, h.x, h.y, k.r, pow(h, ATTACK[attackOf(h.classId)].dmg * k.dmg), 'orb', undefined, 200));
  }
  if (has(h, 'secondwind') && !h.windUsed && h.hp < h.maxHp * SP_PASSIVE.secondwind.below) {
    h.windUsed = true;
    const heal = Math.round(h.maxHp * SP_PASSIVE.secondwind.heal);
    h.hp = Math.min(h.maxHp, h.hp + heal);
    emit(run, { type: 'passive', id: 'secondwind', x: h.x, y: h.y });
    emit(run, { type: 'heal', x: h.x, y: h.y, n: heal });
  }
}

/** A patch on the floor keeps hitting what stands in it, and slows it. */
function stepFields(run: Run) {
  if (!run.fields.length) return;
  run.fields = run.fields.filter((fd) => run.t < fd.until && fd.by.hp > 0);
  for (const fd of run.fields) {
    if (fd.follows) [fd.x, fd.y] = [fd.by.x, fd.by.y];
    if (run.t < fd.next) continue;
    fd.next += fd.every;
    for (const f of run.foes) {
      if (!f.alive || (fd.to ? !inLine(f.x, f.y, fd.x, fd.y, Math.atan2(fd.to.y - fd.y, fd.to.x - fd.x), dist(fd, fd.to), fd.r, f.def.r) : Math.hypot(f.x - fd.x, f.y - fd.y) > fd.r + f.def.r)) continue;
      if (fd.slow) f.slow = { until: run.t + fd.every + 0.1, k: fd.slow };
      damage(run, fd.by, f, fd.dmg, 0);
    }
  }
}

// ---------- the SP's moves ----------

/** The SP's own move: 1 when ready (0 without an SP). */
export function skillReady(run: Run, h: Hero): number {
  if (!h.sp) return 0;
  return Math.min(1, 1 - (h.skillAt - run.t) / (SP_SKILL[h.sp.skill].cd ?? 8));
}

/** The SP's final: 1 when ready (0 without an SP). */
export const finalReady = (h: Hero) => (h.sp ? Math.min(1, h.surge / SURGE.full) : 0);

/** The SP's own move. */
function useSkill(run: Run, h: Hero, input: Input) {
  if (!h.sp || skillReady(run, h) < 1) return;
  h.skillAt = run.t + (SP_SKILL[h.sp.skill].cd ?? 8) / (1 + 0.25 * relic(h, 'hourglass') + h.gearFx.cooldown);
  spMove(run, h, h.sp.skill, SP_SKILL[h.sp.skill], false, input);
}

/** The SP's final. */
function useFinal(run: Run, h: Hero, input: Input) {
  if (!h.sp || finalReady(h) < 1) return;
  h.surge = 0;
  h.ghostUntil = Math.max(h.ghostUntil, run.t + 0.6);
  spMove(run, h, h.sp.final, SP_FINAL[h.sp.final], true, input);
}

/** Which way a move goes: at the monster nearest you, or where you push the stick, or the way you face. */
function aimOf(run: Run, h: Hero, input: Input, reach: number): number {
  const f = nearest(run, h.x, h.y, undefined, reach);
  return f ? Math.atan2(f.y - h.y, f.x - h.x) : Math.hypot(input.x, input.y) > 0.1 ? Math.atan2(input.y, input.x) : h.facing;
}

type BurstColor = Extract<GameEvent, { type: 'burst' }>['color'];

/** What every move gets: who, which move, its numbers, and its damage (times the class's attack). */
interface MoveCtx {
  run: Run;
  h: Hero;
  id: SpMoveId;
  k: SpMoveNumbers;
  final: boolean;
  input: Input;
  dmg: number;
  r: number;
  color: BurstColor;
}

/** An SP move, played by its shape (SpShape in content.ts) with its numbers. */
function spMove(run: Run, h: Hero, id: SpMoveId, k: SpMoveNumbers, final: boolean, input: Input) {
  const kind = attackOf(h.classId),
    color: BurstColor = final && kind === 'slash' ? 'fire' : kind === 'orb' ? 'orb' : kind === 'wave' ? 'wave' : 'ability';
  SHAPES[SP_MOVES[id].shape]({ run, h, id, k, final, input, dmg: abilityPow(h, ATTACK[kind].dmg * k.dmg), r: k.r ?? 100, color });
}

/** The `sp` event for the scene: the move, where, and how big. */
function spEvent(m: MoveCtx, x: number, y: number, more: Partial<Extract<GameEvent, { type: 'sp' }>> = {}) {
  emit(m.run, { type: 'sp', id: m.id, x, y, r: m.r, final: m.final, ...more });
}

/** The move's heal, a share of your HP (Blessing; Soul Harvest, for each monster hit). */
function spHeal(m: MoveCtx, times = 1) {
  const { run, h, k } = m;
  if (!k.heal || times <= 0) return;
  const n = Math.round(h.maxHp * k.heal * times);
  h.hp = Math.min(h.maxHp, h.hp + n);
  emit(run, { type: 'heal', x: h.x, y: h.y, n });
  healFriends(run, h, k.heal * times);
}

/** In a party: friends close to you get a heal of `share` of their own HP too (PARTY). */
function healFriends(run: Run, h: Hero, share: number) {
  for (const o of friendsNear(run, h, h.x, h.y, PARTY.near)) {
    const n = Math.round(o.maxHp * share * PARTY.share);
    if (n <= 0) continue;
    o.hp = Math.min(o.maxHp, o.hp + n);
    emit(run, { type: 'heal', x: o.x, y: o.y, n });
  }
}

/** A point `d` ahead of the hero, the way it faces (or at angle `a`). */
const ahead = (h: Hero, d: number, a = h.facing) => ({ x: h.x + Math.cos(a) * d, y: h.y + Math.sin(a) * d });

/** A boss can't be pulled or held: the mid-boss and the zone's boss. */
const big = (run: Run, f: Foe) => f === run.boss || f === run.warden;

/** The monster with the most HP left in the room (a boss first). */
function strongest(run: Run): Foe | null {
  let best: Foe | null = null;
  for (const f of run.foes) {
    if (!f.alive || run.t < f.bornUntil || untouchable(run, f) || f.kind === 'reflection' || f.kind === 'image') continue;
    const rank = (o: Foe) => (big(run, o) ? 1e9 : 0) + o.hp;
    if (!best || rank(f) > rank(best)) best = f;
  }
  return best;
}

/** The monster a move picks: the nearest within its reach, or the strongest in the room (`aim`). */
const targetOf = (m: MoveCtx): Foe | null => (SP_MOVES[m.id].aim === 'strongest' ? strongest(m.run) : nearest(m.run, m.h.x, m.h.y, undefined, m.k.reach ?? 260));

/** Is a point in the line from x, y at angle `a`, `len` long, `half` each side (plus `pad`)? */
function inLine(px: number, py: number, x: number, y: number, a: number, len: number, half: number, pad: number) {
  const dx = px - x,
    dy = py - y,
    along = dx * Math.cos(a) + dy * Math.sin(a);
  return along >= -pad && along <= len + pad && Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)) <= half + pad;
}

/** Everything in a line is hit (copies of you are pushed aside), and barrels in it go up. */
function lineHit(run: Run, by: Hero, x: number, y: number, a: number, len: number, half: number, dmg: number, knock: number) {
  for (const f of run.foes) {
    if (!f.alive || !inLine(f.x, f.y, x, y, a, len, half, f.def.r)) continue;
    if (f.kind === 'reflection' || f.kind === 'image') nudge(run, f, knock, x, y);
    else damage(run, by, f, dmg, knock, x, y);
  }
  for (const br of run.terrain.barrels) if (br.alive && inLine(br.x, br.y, x, y, a, len, half, BARREL.r)) blowUp(run, br, by);
}

/** ring: a blast all around you. */
function ringMove(m: MoveCtx) {
  const { run, h, k, r } = m;
  if (k.clear) clearBullets(run, h.x, h.y, r * k.clear);
  burst(run, h, h.x, h.y, r, m.dmg, m.color, undefined, k.knock ?? 160);
  spHeal(m);
  spEvent(m, h.x, h.y);
}

/** drop: a blow from above on one monster (`aim`), or `n` of them in a quick storm, `every` s apart. */
function dropMove(m: MoveCtx) {
  const { run, h, k, r } = m,
    f = targetOf(m),
    at = f ? { x: f.x, y: f.y } : ahead(h, 120),
    n = k.n ?? 1,
    every = k.every ?? 0.08;
  if (m.final) clearBullets(run, at.x, at.y, r);
  const blow = () => {
    // Each blow lands where the monster is now (or where it fell).
    if (f?.alive) [at.x, at.y] = [f.x, f.y];
    burst(run, h, at.x, at.y, r, m.dmg, m.color, undefined, k.knock ?? 160);
  };
  spEvent(m, at.x, at.y, n > 1 ? { secs: n * every } : {});
  blow();
  for (let i = 1; i < n; i++) later(run, i * every, blow);
}

/** all: every monster in the room is hit. With `knock` they are thrown away from you (Tsunami),
    with `slow` they all but stop and every shot goes out (Radiance), with `heal` you heal for each
    one hit (Soul Harvest). Any other final wipes the shots near you. */
function allMove(m: MoveCtx) {
  const { run, h, k } = m;
  let hit = 0;
  for (const f of run.foes.filter((o) => o.alive)) {
    if (k.slow) f.slow = { until: run.t + (k.secs ?? 2), k: k.slow };
    if (f.kind === 'reflection' || f.kind === 'image') nudge(run, f, k.knock ?? 120, h.x, h.y);
    else if (run.t >= f.bornUntil && !untouchable(run, f)) {
      damage(run, h, f, m.dmg, k.knock ?? 0, h.x, h.y);
      hit++;
    }
    emit(run, { type: 'burst', x: f.x, y: f.y, r: f.def.r + 4, color: 'ability' });
  }
  spHeal(m, hit);
  if (k.slow) run.bullets = [];
  else if (m.final) clearBullets(run, h.x, h.y, 220);
  spEvent(m, h.x, h.y, { r: Math.max(run.area.w, run.area.h), secs: k.secs });
}

/** dash: you rush through them, untouchable, hitting all you pass (`width` wide). */
function dashMove(m: MoveCtx) {
  const { run, h, k, input } = m,
    a = aimOf(run, h, input, RANGE * 1.2),
    speed = k.speed ?? 700,
    secs = k.secs ?? 0.2;
  h.charge = { until: run.t + secs, x: Math.cos(a) * speed, y: Math.sin(a) * speed, hit: new Set(), harm: true, dmg: m.dmg, ...(k.width ? { w: k.width / 2 } : {}) };
  h.ghostUntil = Math.max(h.ghostUntil, run.t + secs + 0.1);
  spEvent(m, h.x, h.y, { r: speed * secs, angle: a, to: ahead(h, speed * secs, a), width: k.width });
}

/** chain: from you to the nearest monster, then on to the next nearest, and on (`n` of them). */
function chainMove(m: MoveCtx) {
  const { run, h, k } = m,
    hit = new Set<Foe>(),
    points = [{ x: h.x, y: h.y }];
  let at = { x: h.x, y: h.y };
  for (let i = 0; i < (k.n ?? 6); i++) {
    const f = nearest(run, at.x, at.y, hit, k.reach ?? 300);
    if (!f) break;
    hit.add(f);
    points.push({ x: f.x, y: f.y });
    at = f;
    damage(run, h, f, m.dmg, 80);
  }
  if (m.final) clearBullets(run, h.x, h.y, 160);
  spEvent(m, h.x, h.y, { r: k.reach ?? 300, points });
}

/** guard: nothing touches you for `secs`; what is close is pushed back, and you may heal. */
function guardMove(m: MoveCtx) {
  const { run, h, k, r } = m;
  h.ghostUntil = Math.max(h.ghostUntil, run.t + (k.secs ?? 1));
  h.guardUntil = run.t + (k.secs ?? 1);
  // Friends close by are covered too: nothing touches them either, and the shots round them go.
  for (const o of friendsNear(run, h, h.x, h.y, PARTY.near)) {
    o.ghostUntil = Math.max(o.ghostUntil, run.t + (k.secs ?? 1));
    if (k.clear) clearBullets(run, o.x, o.y, r * k.clear);
  }
  if (k.clear) clearBullets(run, h.x, h.y, r * k.clear);
  burst(run, h, h.x, h.y, r, m.dmg, m.color, undefined, k.knock ?? 200);
  spHeal(m);
  spEvent(m, h.x, h.y, { secs: k.secs });
}

/** field: a patch that keeps hitting every `every` s for `secs`: round you and going with you when
    it has no `reach` (Inferno), else on the monster nearest you (Bomb, Rain of Arrows). */
function fieldMove(m: MoveCtx) {
  const { run, h, k, r } = m,
    f = k.reach ? nearest(run, h.x, h.y, undefined, k.reach) : null,
    at = k.reach ? (f ? { x: f.x, y: f.y } : ahead(h, 120)) : { x: h.x, y: h.y };
  if (m.final) clearBullets(run, at.x, at.y, r);
  run.fields.push({ id: m.id, x: at.x, y: at.y, r, until: run.t + (k.secs ?? 3), next: run.t, every: k.every ?? 0.5, dmg: m.dmg, slow: k.slow ?? 0, by: h, follows: !k.reach });
  spEvent(m, at.x, at.y, { secs: k.secs });
}

/** wall: a line of fire on the floor from in front of you out to `reach`, `width` wide, burning
    every `every` s for `secs`. */
function wallMove(m: MoveCtx) {
  const { run, h, k, input } = m,
    len = k.reach ?? 160,
    a = aimOf(run, h, input, len + 60),
    from = ahead(h, HERO_R + 6, a),
    to = ahead(h, HERO_R + 6 + len, a);
  run.fields.push({ id: m.id, x: from.x, y: from.y, to, r: (k.width ?? 22) / 2, until: run.t + (k.secs ?? 3), next: run.t, every: k.every ?? 0.5, dmg: m.dmg, slow: k.slow ?? 0, by: h, follows: false });
  spEvent(m, from.x, from.y, { r: len, to, angle: a, width: k.width, secs: k.secs });
}

/** leap: jump onto a monster within `reach`, untouchable for the `secs` in the air, and crash down
    in a blast of `r`. */
function leapMove(m: MoveCtx) {
  const { run, h, k, r } = m,
    f = targetOf(m),
    a = f ? Math.atan2(f.y - h.y, f.x - h.x) : h.facing,
    // Land beside it, not in it.
    far = f ? Math.max(0, dist(f, h) - f.def.r - HERO_R) : Math.min(120, k.reach ?? 120),
    secs = k.secs ?? 0.3,
    to = ahead(h, far, a);
  h.charge = { until: run.t + secs, x: (Math.cos(a) * far) / secs, y: (Math.sin(a) * far) / secs, hit: new Set(), harm: false };
  h.ghostUntil = Math.max(h.ghostUntil, run.t + secs + 0.1);
  spEvent(m, h.x, h.y, { to, angle: a, secs });
  later(run, secs, () => {
    if (h.hp <= 0) return;
    if (m.final) clearBullets(run, h.x, h.y, r);
    burst(run, h, h.x, h.y, r, m.dmg, m.color, undefined, k.knock ?? 160);
  });
}

/** hook: hit the monster in front of you (the nearest within `reach`) and drag it `pull` px from
    you, dazed for `secs`. A boss is only hit. */
function hookMove(m: MoveCtx) {
  const { run, h, k } = m,
    reach = k.reach ?? 260,
    f = targetOf(m);
  if (!f) return spEvent(m, h.x, h.y, { r: reach, to: ahead(h, reach) });
  const from = { x: f.x, y: f.y };
  spEvent(m, h.x, h.y, { r: reach, to: from, angle: Math.atan2(from.y - h.y, from.x - h.x) });
  damage(run, h, f, m.dmg, 0);
  if (!f.alive || big(run, f)) return;
  const a = Math.atan2(f.y - h.y, f.x - h.x),
    d = Math.max(HERO_R + f.def.r + 4, k.pull ?? 0);
  f.x = clamp(h.x + Math.cos(a) * d, ROOM.wall + f.def.r, run.area.w - ROOM.wall - f.def.r);
  f.y = clamp(h.y + Math.sin(a) * d, ROOM.wall + f.def.r, run.area.h - ROOM.wall - f.def.r);
  outOfPillars(run, f, f.def.r);
  f.vx = f.vy = 0;
  // A moment to find its feet before it acts again.
  f.knockUntil = run.t + (k.secs ?? 0.25);
}

/** boomerang: a throw (`width` wide) that flies out `reach` at `speed` and comes back to your
    hand, hitting each monster once each way. */
function boomerangMove(m: MoveCtx) {
  const { run, h, k, input } = m,
    reach = k.reach ?? 240,
    a = aimOf(run, h, input, reach + 60);
  throwBack(run, h, a, reach, k.speed ?? 520, m.dmg, { r: (k.width ?? 12) / 2, ...(h.sp ? { look: h.sp.weapon } : {}) });
  spEvent(m, h.x, h.y, { r: reach, angle: a, width: k.width, to: ahead(h, reach, a) });
}

/** vanish: unseen and untouchable for `secs` (monsters lose you and hold their fire), and your next
    hit lands `1 + boost` times. */
function vanishMove(m: MoveCtx) {
  const { run, h, k } = m,
    secs = k.secs ?? 2;
  h.hideUntil = run.t + secs;
  h.ghostUntil = Math.max(h.ghostUntil, run.t + secs);
  h.sneak = k.boost ?? 1;
  spEvent(m, h.x, h.y, { r: 30, secs });
}

/** trap: hold the nearest monster still for `secs` (it can't move, shoot or touch), then it takes
    the move's damage when it pops. A boss is only hit. */
function trapMove(m: MoveCtx) {
  const { run, h, k } = m,
    secs = k.secs ?? 2,
    f = targetOf(m);
  if (!f) {
    const at = ahead(h, 120);
    return spEvent(m, at.x, at.y, { r: 20 });
  }
  const hold = !big(run, f);
  spEvent(m, f.x, f.y, { r: f.def.r + 10, secs });
  if (hold) f.held = { until: run.t + secs, dmg: m.dmg, by: h };
  else damage(run, h, f, m.dmg, 0);
}

/** The bubble pops: the monster is free, and takes the trap's damage. */
function pop(run: Run, f: Foe) {
  const hd = f.held;
  if (!hd) return;
  f.held = undefined;
  damage(run, hd.by, f, hd.dmg, 0);
}

/** mark: the nearest monster takes `1 + boost` times from every hit for `secs` (and a small hit now). */
function markMove(m: MoveCtx) {
  const { run, h, k } = m,
    secs = k.secs ?? 5,
    f = targetOf(m);
  if (!f) {
    const at = ahead(h, 120);
    return spEvent(m, at.x, at.y, { r: 20 });
  }
  spEvent(m, f.x, f.y, { r: f.def.r + 8, secs });
  f.mark = { until: run.t + secs, k: k.boost ?? 0.5 };
  if (m.dmg > 0) damage(run, h, f, m.dmg, 0);
}

/** beam: everything in a line `reach` long and `width` wide, from you toward your aim. A final also
    wipes the shots in it. */
function beamMove(m: MoveCtx) {
  const { run, h, k, input } = m,
    len = k.reach ?? 360,
    half = (k.width ?? 20) / 2,
    a = aimOf(run, h, input, len),
    to = ahead(h, len, a);
  spEvent(m, h.x, h.y, { r: len, to, angle: a, width: k.width });
  lineHit(run, h, h.x, h.y, a, len, half, m.dmg, k.knock ?? 120);
  if (m.final) run.bullets = run.bullets.filter((b) => !inLine(b.x, b.y, h.x, h.y, a, len, half, b.r + 10));
}

/** How each shape plays (SpShape in content.ts). */
const SHAPES: Record<SpShape, (m: MoveCtx) => void> = {
  ring: ringMove,
  drop: dropMove,
  all: allMove,
  dash: dashMove,
  chain: chainMove,
  guard: guardMove,
  field: fieldMove,
  wall: wallMove,
  leap: leapMove,
  hook: hookMove,
  boomerang: boomerangMove,
  vanish: vanishMove,
  trap: trapMove,
  mark: markMove,
  beam: beamMove,
};

/** A move's hit, with Ability power from what you wear on top (the class ability and the SP's moves). */
const abilityPow = (h: Hero, dmg: number) => pow(h, dmg) * (1 + h.gearFx.power);

function useAbility(run: Run, h: Hero, input: Input) {
  const now = run.t;
  if (abilityReady(run, h) < 1) return;
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
    const { speed, secs } = ABILITY.charge;
    h.charge = { until: now + secs, x: dx * speed, y: dy * speed, hit: new Set(), harm: true };
    h.ghostUntil = now + secs + 0.1;
    emit(run, { type: 'ability', id: a, x: from.x, y: from.y, toX: from.x + dx * speed * secs, toY: from.y + dy * speed * secs });
  } else if (a === 'volley') {
    const v = ABILITY.volley,
      dmg = abilityPow(h, ATTACK.arrow.dmg * v.dmg);
    for (let i = 0; i < v.arrows; i++) fire(run, h, 'arrow', Math.atan2(dy, dx) + (i / v.arrows) * Math.PI * 2, 430, dmg, v.pierce, null);
    emit(run, { type: 'ability', id: a, x: h.x, y: h.y, toX: h.x, toY: h.y });
  } else if (a === 'blink') {
    h.x = clamp(h.x + dx * ABILITY.blink.reach, ROOM.wall + HERO_R, run.area.w - ROOM.wall - HERO_R);
    h.y = clamp(h.y + dy * ABILITY.blink.reach, ROOM.wall + HERO_R, run.area.h - ROOM.wall - HERO_R);
    outOfPillars(run, h, HERO_R);
    h.ghostUntil = now + 0.3;
    clearBullets(run, h.x, h.y, 90);
    burst(run, h, h.x, h.y, ABILITY.blink.r, abilityPow(h, ATTACK.orb.dmg * ABILITY.blink.dmg), 'ability');
    emit(run, { type: 'ability', id: a, x: from.x, y: from.y, toX: h.x, toY: h.y });
  } else if (a === 'shock') {
    clearBullets(run, h.x, h.y, ABILITY.shock.r);
    burst(run, h, h.x, h.y, ABILITY.shock.r, abilityPow(h, ATTACK.slash.dmg * ABILITY.shock.dmg), 'ability', undefined, 300);
    emit(run, { type: 'ability', id: a, x: h.x, y: h.y, toX: h.x, toY: h.y });
  } else {
    const heal = Math.round(h.maxHp * ABILITY.still.heal);
    h.hp = Math.min(h.maxHp, h.hp + heal);
    healFriends(run, h, ABILITY.still.heal);
    clearBullets(run, h.x, h.y, ABILITY.still.r);
    burst(run, h, h.x, h.y, ABILITY.still.r, abilityPow(h, ATTACK.wave.dmg * ABILITY.still.dmg), 'ability', undefined, 260);
    // Its own blast doesn't count toward the next one.
    h.calm = 0;
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
  // Only build a new list when a shot goes (plain loops: this runs for every flame every step).
  const list = run.bullets;
  let i = 0;
  while (i < list.length && farther(list[i].x - x, list[i].y - y, r)) i++;
  if (i === list.length) return;
  const out = list.slice(0, i);
  for (; i < list.length; i++) if (farther(list[i].x - x, list[i].y - y, r)) out.push(list[i]);
  run.bullets = out;
}

// ---------- monsters ----------

function moveFoes(run: Run) {
  const now = run.t,
    up = standing(run),
    // Someone is unseen (Vanish): the monsters going for them lose them.
    lose = run.party.some((h) => hidden(run, h));
  for (const f of run.foes) {
    if (!f.alive) continue;
    burnTick(run, f);
    if (f.held && now >= f.held.until) pop(run, f);
    if (!f.alive) continue;
    // Held in a bubble, it can't move, shoot or touch; a monster that lost you stands and holds its fire.
    const held = !!f.held,
      lost = lose && hidden(run, prey(run, f.x, f.y));
    if (held) f.vx = f.vy = 0;
    else if (now >= f.knockUntil) {
      if (f === run.boss) steerBoss(run, f);
      else if (lost) f.vx = f.vy = 0;
      else steer(run, f);
    }
    if (f === run.warden) stepMid(run, f);
    const wade = (f !== run.boss && run.terrain.water.some((q) => inRect(q, f.x, f.y)) ? WATER.foe : 1) * (f.slow && now < f.slow.until ? 1 - f.slow.k : 1);
    f.x = clamp(f.x + f.vx * STEP * wade, ROOM.wall + f.def.r, run.area.w - ROOM.wall - f.def.r);
    f.y = clamp(f.y + f.vy * STEP * wade, ROOM.wall + f.def.r, run.area.h - ROOM.wall - f.def.r);
    outOfPillars(run, f, f.def.r);
    if (now < f.bornUntil) continue;
    // Volleys.
    f.def.shoots.forEach((p, i) => {
      if (p.on || now < f.next[i]) return;
      f.next[i] = now + p.every / (f === run.boss || f === run.warden ? 1 : DIALS.fire);
      if (held || lost) return;
      if (p.below && f.hp > f.maxHp * p.below) return;
      if (p.above && f.hp <= f.maxHp * p.above) return;
      // The Hollow's light open: it turns its spiral instead (steerBoss).
      if (f === run.boss && run.setup.zone.boss === 'hollow' && f.phase === 2) return;
      // An Unsent out of every lantern's light is only a shape.
      if (f.kind === 'unsent' && !lit(run, f)) return;
      shoot(run, f, p);
    });
    // A mid-boss's second phase: a roar, and new volleys (the Warden's cross stops turning).
    if (f === run.warden && f.phase === 1 && f.hp <= f.maxHp * 0.5) {
      f.phase = 2;
      emit(run, { type: 'phase', x: f.x, y: f.y });
      emit(run, { type: 'midSay', text: midBoss(run.setup.zone).hot });
    }
    // Touch (a charging ram hits harder).
    if (f.def.dmg > 0 && !held && !(f.kind === 'unsent' && !lit(run, f))) for (const h of up) if (dist(f, h) < f.def.r + HERO_R) hurt(run, h, f.def.dmg * (f !== run.warden && now < f.dashUntil ? 1.5 : 1), 'touch');
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
  // The Loner turns its shield toward you, slowly.
  if (f.kind === 'loner') {
    const want = Math.atan2(dy, dx),
      cur = f.face ?? want,
      turn = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
    f.face = cur + clamp(turn, -LONER.turn * STEP, LONER.turn * STEP);
  }
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
    case 'roll': {
      // Turn to face you (it glows), then roll at you in a straight line until a wall stops it,
      // throw its sparks at you off the stone, and rest a moment.
      if (now < f.windUntil) {
        f.vx = f.vy = 0;
        f.dashX = dx / d;
        f.dashY = dy / d;
        return;
      }
      if (f.windUntil && now < f.dashUntil) {
        const { w, h: H } = run.area,
          r = f.def.r + 2,
          nx = f.x + f.dashX * ROLL.speed * STEP,
          ny = f.y + f.dashY * ROLL.speed * STEP;
        if (nx > ROOM.wall + r && nx < w - ROOM.wall - r && ny > ROOM.wall + r && ny < H - ROOM.wall - r) {
          f.vx = f.dashX * ROLL.speed;
          f.vy = f.dashY * ROLL.speed;
          return;
        }
      }
      if (f.windUntil) {
        // It hit a wall (or rolled as far as it goes).
        f.windUntil = f.dashUntil = 0;
        f.act = now + ROLL.rest;
        f.vx = f.vy = 0;
        moved(run, f);
        return;
      }
      f.vx = f.vy = 0;
      if (now < f.act) return;
      f.windUntil = now + ROLL.wind;
      f.dashUntil = f.windUntil + ROLL.most;
      f.dashX = dx / d;
      f.dashY = dy / d;
      emit(run, { type: 'wind', id: f.id });
      return;
    }
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
    dmg = p.dmg * DIALS.shot * run.setup.zone.dmg * (f === run.boss ? 1 : (1 + DIALS.deepDmg * depth(run)) * (f.elite ? ELITE.dmg : 1) * (1 + CLIMB.tougher * (run.climb ?? 0))),
    speed = p.speed * DIALS.speed,
    style = p.style ?? 'plain';
  if (p.kind === 'mine') {
    // Lobbed at where you stand, a little off; it lands, then bursts.
    const x = clamp(h.x + (run.rnd() - 0.5) * 40, ROOM.wall + 10, run.area.w - ROOM.wall - 10),
      y = clamp(h.y + (run.rnd() - 0.5) * 40, ROOM.wall + 10, run.area.h - ROOM.wall - 10);
    run.mines.push({ id: ++run.ids, x, y, r: p.r ?? 46, dmg, lands: run.t + MINE.flight, at: run.t + MINE.flight + MINE.fuse, n: p.n, speed, from: f.kind });
    emit(run, { type: 'shoot', x: f.x, y: f.y, boss, id: f.id, kind: f.kind });
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
      from: f.kind,
      pat: f.def.shoots.indexOf(p),
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
  emit(run, { type: 'shoot', x: f.x, y: f.y, boss, id: f.id, kind: f.kind });
}

function moveBullets(run: Run) {
  const now = run.t,
    up = standing(run),
    { w, h: H } = run.area,
    m = ROOM.wall;
  // Kept in place, not a new list each step (this runs every step for every shot). As before, a
  // shot added or a list swapped while the shots move (a barrel's blast) doesn't last the step.
  const list = run.bullets,
    n = list.length;
  let keep = 0;
  for (let i = 0; i < n; i++) {
    const b = list[i];
    if (moveBullet(run, b, now, up, w, H, m)) list[keep++] = b;
  }
  list.length = keep;
  run.bullets = list;
  moveMines(run, now, up);
}

/** One shot's step: false when it's gone (out of the room, into a pillar, a barrel, or you). */
function moveBullet(run: Run, b: Bullet, now: number, up: Hero[], w: number, H: number, m: number): boolean {
  {
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
  }
}

/** Bombs that land and burst. */
function moveMines(run: Run, now: number, up: Hero[]) {
  run.mines = run.mines.filter((mn) => {
    if (now < mn.at) return true;
    for (const h of up) if (Math.hypot(mn.x - h.x, mn.y - h.y) < mn.r + HERO_R - 4) hurt(run, h, mn.dmg, 'shot');
    emit(run, { type: 'boom', x: mn.x, y: mn.y, r: mn.r });
    for (let i = 0; i < mn.n; i++) {
      const a = (i / mn.n) * Math.PI * 2 + 0.3;
      run.bullets.push({ id: ++run.ids, x: mn.x, y: mn.y, vx: Math.cos(a) * mn.speed, vy: Math.sin(a) * mn.speed, r: 5, dmg: mn.dmg * 0.6, born: now, boss: false, style: 'plain', ang: a, spd: mn.speed, bounce: 0, from: mn.from });
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
    emit(run, { type: 'say', text: run.setup.zone.boss === 'distance' ? 'Shapes in the fog, all alike. Only the real one shoots. A lantern close to a false one shows it.' : 'The lake shows many Mirrors. Only the real one shoots: go to it.' });
  }
}

function steerBoss(run: Run, b: Foe) {
  const h = prey(run, b.x, b.y),
    now = run.t,
    which = run.setup.zone.boss,
    dx = h.x - b.x,
    dy = h.y - b.y,
    d = Math.hypot(dx, dy) || 1;
  if (run.setup.tutorial) return scripted(run, b, dx / d, dy / d);
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
  if (which === 'lull') {
    // He plods after you, singing, and heals while you all hang back, like Tomorrow. Under half
    // his HP he sings louder.
    b.vx = (dx / d) * b.speed;
    b.vy = (dy / d) * b.speed;
    if (b.phase === 1 && b.hp <= b.maxHp * 0.5) {
      b.phase = 2;
      emit(run, { type: 'louder', x: b.x, y: b.y });
      emit(run, { type: 'say', text: 'The Lull sings louder. Keep together.' });
    }
    if (d > LULL.reach) b.hp = Math.min(b.maxHp, b.hp + b.maxHp * LULL.heal * STEP);
    sing(run, b);
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
  if (which === 'distance') {
    // It keeps at arm's length and splits among false shapes of itself; a lantern near a false
    // one shows it up for everyone. Now and then it sends Unsent letters out of the fog.
    const v = d > 230 ? b.speed : d < 150 ? -b.speed : 0;
    b.vx = (dx / d) * v;
    b.vy = (dy / d) * v;
    for (const f of run.foes)
      if (f.alive && f.kind === 'image' && f.phase === 1 && run.t >= f.bornUntil && lit(run, f)) {
        f.phase = 2;
        emit(run, { type: 'shown', id: f.id, x: f.x, y: f.y });
      }
    run.bossClock -= STEP;
    if (run.bossClock <= 0) {
      const hurt = b.hp < b.maxHp * 0.5;
      run.bossClock = DISTANCE.every * (hurt ? 0.8 : 1);
      // More lanterns, more shapes to show up: one more for each friend.
      splitMirror(run, b, (hurt ? DISTANCE.more : DISTANCE.shapes) + (run.setup.friends?.length ?? 0));
    }
    run.bossSummon -= STEP;
    if (run.bossSummon > 0) return;
    run.bossSummon = DISTANCE.call;
    if (run.foes.filter((f) => f.alive && f.kind === 'unsent').length < 3)
      for (const side of [-1, 1]) addFoe(run, 'unsent', clamp(b.x + side * 90, ROOM.wall + 20, run.area.w - ROOM.wall - 20), b.y + 30);
    return;
  }
  if (which === 'alone') {
    // It walks at you. Past a third of its plates it pushes you all apart now and then ("Help is
    // weakness"); past two thirds it is too tired to, and only fights.
    b.vx = (dx / d) * b.speed;
    b.vy = (dy / d) * b.speed;
    const left = b.hp / b.maxHp;
    if (b.phase === 1 && left <= 2 / 3) b.phase = 2;
    if (b.phase === 2 && left <= 1 / 3) {
      b.phase = 3;
      b.speed = b.def.speed * 0.75;
    }
    if (b.phase !== 2) return;
    run.bossClock -= STEP;
    if (run.bossClock > 0) return;
    run.bossClock = ALONE.apart;
    const up = standing(run);
    if (up.length < 2) return;
    // Each hero is thrown away from the middle of the party.
    const mx = up.reduce((a, p) => a + p.x, 0) / up.length,
      my = up.reduce((a, p) => a + p.y, 0) / up.length;
    emit(run, { type: 'shout', x: b.x, y: b.y });
    emit(run, { type: 'say', text: 'It pushes you apart. Come back together.' });
    for (const p of up) {
      const px = p.x - mx,
        py = p.y - my,
        pd = Math.hypot(px, py) || 1;
      p.shove = { until: now + 0.45, x: (px / pd) * ALONE.push, y: (py / pd) * ALONE.push };
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
        bossDown(run);
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

/** The Lull's song on each hero: drowsy while on their own (no friend near, and far from him),
    asleep once it's full, awake again when a friend comes close, a hit lands, or it wears off. */
function sing(run: Run, b: Foe) {
  const now = run.t,
    louder = b.phase === 2 ? LULL.louder : 1;
  for (const h of standing(run)) {
    if (h.sleepUntil) {
      if (now >= h.sleepUntil) wake(run, h, 'self');
      else if (run.party.some((o) => o !== h && o.hp > 0 && !asleep(run, o) && Math.hypot(o.x - h.x, o.y - h.y) < LULL.wake)) wake(run, h, 'friend');
      continue;
    }
    const alone = dist(h, b) > LULL.reach && friendsNear(run, h, h.x, h.y, LULL.near).length === 0;
    h.drowse = clamp(h.drowse + (alone ? LULL.fill * louder : -LULL.clear) * STEP, 0, 1);
    if (h.drowse < 1) continue;
    h.drowse = 0;
    h.sleepUntil = now + LULL.sleep;
    emit(run, { type: 'sleep', hero: h.id, x: h.x, y: h.y });
    if (h === run.hero) emit(run, { type: 'say', text: run.party.length > 1 ? 'You fall asleep. A friend next to you wakes you.' : 'You fall asleep. Stay close to him.' });
  }
}

function wake(run: Run, h: Hero, by: 'friend' | 'hit' | 'self') {
  h.sleepUntil = 0;
  emit(run, { type: 'wake', hero: h.id, x: h.x, y: h.y, by });
}

/** The first dungeon's Hollow: it walks at you, says your line, and then strikes you down, however
    well you fight. `bossClock` counts what it has done: 1 once it has spoken. */
function scripted(run: Run, b: Foe, ux: number, uy: number) {
  b.vx = ux * b.speed;
  b.vy = uy * b.speed;
  const t = run.t - (run.bossAt ?? run.t);
  if (run.bossClock < 1 && t >= TUTORIAL.voiceAt) {
    run.bossClock = 1;
    emit(run, { type: 'say', text: `"${run.setup.tutorial?.voice}"` });
  }
  if (t < TUTORIAL.lose) return;
  run.bullets = [];
  emit(run, { type: 'shout', x: b.x, y: b.y });
  emit(run, { type: 'say', text: 'It doesn\'t even raise its sword.' });
  for (const h of run.party) {
    emit(run, { type: 'hurt', x: h.x, y: h.y, dmg: Math.ceil(h.hp), by: 'shot', hero: h.id });
    h.hp = 0;
  }
  end(run, false, 'hp');
}

// ---------- hitting ----------

const pow = (h: Hero, base: number) => heroDamage(base, h.power, h.ups) * (1 + DIALS.relic * 0.12 * relic(h, 'whetstone'));

/** The Hollow: nothing you throw at it lands. */
const untouchable = (run: Run, f: Foe) => (f === run.boss && run.setup.zone.boss === 'hollow' && !run.setup.tutorial) || (f.kind === 'unsent' && !lit(run, f));

/** In a lantern's light (the Quiet Miles): some hero who is up stands within LANTERN.r of it. */
export function lit(run: Pick<Run, 'party'>, f: Pick<Foe, 'x' | 'y' | 'def'>) {
  for (const h of run.party) if (h.hp > 0 && Math.hypot(h.x - f.x, h.y - f.y) <= LANTERN.r + f.def.r) return true;
  return false;
}

/** A false shape of the Distance a lantern has shown up: it stays see-through, and nothing aims at it. */
export const shownFalse = (f: Pick<Foe, 'kind' | 'phase'>) => f.kind === 'image' && f.phase === 2;

/** The boss splits into shapes of itself, and only the real one shoots: the Mirror, the Distance. */
const splits = (run: Run) => run.setup.zone.boss === 'mirror' || run.setup.zone.boss === 'distance';

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
  if (f.kind === 'gale' || f.kind === 'bellows' || f.kind === 'bell') f.act = t0 + 2;
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
    case 'bellows': {
      // It breathes in (everyone is pulled toward it, and it is open to hits), then blows them
      // back out with a ring of embers.
      for (const h of run.party) h.wind = { x: 0, y: 0 };
      if (!f.windUntil) {
        if (now < f.act) return;
        f.windUntil = now + BELLOWS.draw;
        emit(run, { type: 'inhale', id: f.id });
        return;
      }
      if (now < f.windUntil) {
        for (const h of standing(run)) {
          const dx = f.x - h.x,
            dy = f.y - h.y,
            d = Math.hypot(dx, dy) || 1,
            // it draws you in from afar; already close, you stand in its breath
            pull = BELLOWS.pull * (hot ? 1.2 : 1) * clamp((d - BELLOWS.close) / 150, 0, 1);
          h.wind = { x: (dx / d) * pull, y: (dy / d) * pull };
        }
        return;
      }
      f.windUntil = 0;
      f.act = now + BELLOWS.every * (hot ? 0.8 : 1);
      emit(run, { type: 'blow', x: f.x, y: f.y });
      // The embers follow the blast a moment later, once it has thrown you clear.
      later(run, BELLOWS.after, () => f.alive && shoot(run, f, BELLOWS.embers));
      for (const h of standing(run)) {
        const dx = h.x - f.x,
          dy = h.y - f.y,
          d = Math.hypot(dx, dy) || 1;
        h.shove = { until: now + BELLOWS.shove, x: (dx / d) * BELLOWS.push, y: (dy / d) * BELLOWS.push };
      }
      return;
    }
    case 'bell': {
      // It tolls a ring, and the toll comes back a moment later from across the middle of the room.
      if (now < f.act) return;
      f.act = now + BELL.every * (hot ? 0.8 : 1);
      shoot(run, f, BELL.toll);
      const { w, h: H } = run.area,
        ex = w - f.x,
        ey = H - f.y;
      emit(run, { type: 'toll', x: f.x, y: f.y, toX: ex, toY: ey });
      later(run, BELL.echo, () => {
        if (!f.alive) return;
        const [x, y] = [f.x, f.y];
        f.x = ex;
        f.y = ey;
        shoot(run, f, BELL.toll);
        f.x = x;
        f.y = y;
      });
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
    bd = Infinity;
  for (const f of run.foes) {
    // Nothing aims at a reflection of you on purpose (a blast or a piercing arrow still finds it).
    if (!f.alive || skip?.has(f) || run.t < f.bornUntil || untouchable(run, f) || f.kind === 'reflection' || shownFalse(f)) continue;
    const r = (f.x - x) ** 2 + (f.y - y) ** 2;
    if (r >= within * within) continue;
    // A Loner showing you its shield is a poor mark: another as close, or a little further, first.
    const d = r * (shielded(f, x, y) ? 4 : 1);
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
  const knight = boss && (run.setup.zone.boss === 'knight' || run.setup.zone.boss === 'alone');
  // The first dungeon's Hollow: every hit takes 1, and it never falls.
  const scriptedBoss = boss && !!run.setup.tutorial;
  // A plate falls to any hit, however small, but only one at a time: the Knight's one at a time
  // whoever hits, the One Who Walks Alone's one at a time for each of you.
  if (knight && run.setup.zone.boss === 'alone') {
    if (run.t < by.plateAt) return;
    by.plateAt = run.t + PLATE_EVERY;
  } else if (knight) {
    if (run.t < f.act) return;
    f.act = run.t + PLATE_EVERY;
  }
  // The Loner's shield: a hit from in front glances off.
  if (shielded(f, fromX, fromY)) {
    emit(run, { type: 'block', id: f.id, x: f.x, y: f.y });
    return;
  }
  // The Sand Golem, standing still, is stone: the hit glances off.
  if (f === run.warden && f.kind === 'sandGolem' && hardened(run, f)) {
    emit(run, { type: 'hit', id: f.id, x: f.x, y: f.y, dmg: 0, boss: false });
    return;
  }
  f.hitAt = run.t;
  if (f === run.warden && run.dim !== null) run.dim = Math.min(DIM.full, run.dim + DIM.back);
  // A crit: the hit does CRIT_HIT times, plus crit damage from what you wear (CRIT in src/balance/stats.ts).
  // Keen eye and Giant slayer (run skills) add to what you wear.
  const critShare = by.power.crit + spCrit(by) + RUN_SKILL.keen.crit * (by.ups.keen ?? 0),
    crit = !knight && !scriptedBoss && critShare > 0 && run.critRnd() < critShare,
    slay = f.elite || f.kind === 'golem' || boss || f === run.warden ? 1 + by.gearFx.slayer + RUN_SKILL.giant.dmg * (by.ups.giant ?? 0) : 1,
    // The Bellows breathing in is open: hits land harder.
    open = f === run.warden && f.kind === 'bellows' && run.t < f.windUntil ? BELLOWS.open : 1,
    // The Tollkeeper, braced against one at a time.
    braced = f.kind === 'toll' ? tollBrace(run, by, f) : 1,
    dmg = knight || scriptedBoss ? 1 : Math.max(1, Math.round(amount * slay * open * braced * spMore(by) * spMark(run, by, f) * (crit ? CRIT_HIT + by.gearFx.critDmg : 1)));
  if (f.kind === 'reflection' || f.kind === 'image') {
    // A copy of you, or of the Mirror: it shatters, and you feel it.
    hitYourself(run, by, f.kind);
    emit(run, { type: 'hit', id: f.id, x: f.x, y: f.y, dmg: 0, boss: false });
    return kill(run, f, by);
  }
  f.hp -= dmg;
  if (scriptedBoss) f.hp = Math.max(1, f.hp);
  leech(run, by, dmg);
  calmer(run, by, CALM.hit);
  onLanded(run, by, f, knight);
  emit(run, { type: 'hit', id: f.id, x: f.x, y: f.y, dmg, boss, crit });
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

/** A Loner's shield faces x, y: a hit from there glances off. */
function shielded(f: Foe, x: number, y: number) {
  if (f.kind !== 'loner' || f.face === undefined) return false;
  const a = Math.atan2(y - f.y, x - f.x) - f.face;
  return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < LONER.arc;
}

/** The Tollkeeper takes a hit in full only if another hero hit it a moment ago (TOLL). */
function tollBrace(run: Run, by: Hero, f: Foe) {
  const hits = (f.hitters ??= {}),
    pair = Object.entries(hits).some(([id, at]) => Number(id) !== by.id && run.t - at <= TOLL.pair);
  hits[by.id] = run.t;
  return pair ? 1 : TOLL.alone;
}

/** Life steal: a share of the damage dealt comes back, at most LEECH_CAP of max HP a second. */
function leech(run: Run, h: Hero, dmg: number) {
  if (!h.gearFx.leech || h.hp <= 0 || h.hp >= h.maxHp) return;
  if (run.t - h.leechAt >= 1) {
    h.leechAt = run.t;
    h.leechHp = 0;
  }
  const n = Math.min(dmg * h.gearFx.leech, h.maxHp * LEECH_CAP - h.leechHp);
  if (n <= 0) return;
  h.leechHp += n;
  h.hp = Math.min(h.maxHp, h.hp + n);
}

function kill(run: Run, f: Foe, by: Hero) {
  f.alive = false;
  by.kills++;
  emit(run, { type: 'kill', id: f.id, x: f.x, y: f.y, kind: f.kind, elite: f.elite });
  if (f.def.xp > 0) run.gems.push({ id: ++run.ids, x: f.x, y: f.y, value: f.def.xp, pulled: false });
  // Momentum: one more stack, and they all last a while longer.
  if (by.ups.rush) {
    by.rush = run.t < by.rushUntil ? Math.min(RUN_SKILL.rush.stacks, by.rush + 1) : 1;
    by.rushUntil = run.t + RUN_SKILL.rush.secs;
  }
  // Last breath: it bursts (a copy of you or of the Mirror only shatters).
  if (by.ups.blast && f.kind !== 'reflection' && f.kind !== 'image') {
    const hit = blastHit(by.ups.blast);
    burst(run, by, f.x, f.y, hit.r, pow(by, hit.dmg), 'blast', f, 90);
  }
  const fang = relic(by, 'fang') + by.gearFx.heal;
  if (fang && f !== run.boss) by.hp = Math.min(by.maxHp, by.hp + fang);
  // Harvest (the Wolfcaller's passive): each one you bring down gives back a little.
  if (has(by, 'harvest') && by.hp > 0 && f.def.xp > 0) {
    by.hp = Math.min(by.maxHp, by.hp + Math.max(1, Math.round(by.maxHp * SP_PASSIVE.harvest.heal)));
    emit(run, { type: 'passive', id: 'harvest', x: by.x, y: by.y });
  }
  // Now and then a monster drops something to wear: elites and golems far more often.
  if (f !== run.boss && f !== run.warden && f.def.xp > 0 && !run.setup.tutorial && run.rnd() < (f.elite ? DROPS.elite : f.kind === 'golem' ? DROPS.golem : DROPS.plain)) dropEach(run, f.x, f.y, f.elite || f.kind === 'golem' ? DROP_LUCK.elite : 0);
  if (f === run.warden) dropEach(run, f.x, f.y + 30, DROP_LUCK.midBoss);
  if (f.def.xp > 0 || f === run.boss || f === run.warden) findMats(run, f === run.boss ? 'boss' : f === run.warden ? 'warden' : f.elite || f.kind === 'golem' ? 'elite' : 'plain', f.x, f.y);
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
    // The boss's own drop goes straight into each hero's bag: you take it home. A full bag gets
    // it on the floor instead, to swap for something (the bag never holds more than BAG).
    run.party.forEach((h, i) => {
      if (h.gear.bag.length >= BAG) return dropItem(run, f.x + i * 26, f.y + 30, DROP_LUCK.boss, h);
      const it = newItem(run, DROP_LUCK.boss, h.classId);
      h.gear.bag.push(it);
      emitTo(run, h, { type: 'loot', item: it });
    });
    bossDown(run);
  }
}

/** The boss is down. The bot (and the simulators) win on the spot. A player gets a quiet room:
    what's left fades, and the stairs up lead home, so the drops on the floor can be picked up
    first. Walking onto them is the win. */
function bossDown(run: Run) {
  if (run.setup.autoPick) return end(run, true, 'boss');
  run.home = run.cleared = run.doorOpen = true;
  cellOf(run).cleared = true;
  if (run.boss) run.boss.alive = false;
  for (const f of run.foes)
    if (f.alive) {
      f.alive = false;
      emit(run, { type: 'kill', id: f.id, x: f.x, y: f.y, kind: f.kind, elite: f.elite });
    }
  run.waves = [];
  run.bullets = [];
  run.mines = [];
  run.timers = [];
  // The song stops: everyone wakes.
  for (const h of run.party) {
    h.drowse = 0;
    if (asleep(run, h)) wake(run, h, 'self');
  }
  // The stairs go at the far end of the room from you, so you don't walk out by accident.
  const { w, h: H } = run.area,
    y = run.hero.y > H / 2 ? 110 : H - 110;
  run.stairs = { x: w / 2, y };
  emit(run, { type: 'won' });
  emit(run, { type: 'clear' });
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
  if (!h.mirrorHurtAt) emit(run, { type: 'say', text: kind === 'image' ? (run.setup.zone.boss === 'distance' ? 'A false shape, and it cut you. Only the real one shoots: bring a lantern close.' : 'Only an image, and it cut you. The real Mirror is the one that shoots.') : 'That was you. Walk past your reflections.' });
  h.mirrorHurtAt = run.t;
  const n = Math.max(2, Math.round(h.maxHp * SPLIT[kind]));
  h.hp -= n;
  emit(run, { type: 'hurt', x: h.x, y: h.y, dmg: n, by: kind, hero: h.id });
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

/** A shot of `by`'s, from them (or from `at`: a friend on the Summit). `more`: what an SP weapon adds. */
function fire(run: Run, by: Hero, kind: 'arrow' | 'orb', angle: number, speed: number, dmg: number, pierce: number, target: Foe | null, at: { x: number; y: number } = by, more?: Partial<Shot>) {
  run.shots.push({ id: ++run.ids, kind, by, x: at.x, y: at.y - 6, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, dmg, pierce, target, hit: new Set(), dies: run.t + 1.6, ...more });
}

/** A throw that flies `reach` out and comes back to the thrower's hand (a boomerang, Reap). */
function throwBack(run: Run, by: Hero, angle: number, reach: number, speed: number, dmg: number, more: Partial<Shot>) {
  const turn = run.t + reach / speed;
  fire(run, by, 'arrow', angle, speed, dmg, 0, null, by, { ...more, back: { turn, out: true }, dies: turn + reach / speed + 1 });
}

/** The attack a hero makes: its SP weapon's when one is worn (SP_WEAPONS), else its class's. */
export const attackKind = (h: Pick<Hero, 'classId' | 'sp'>): AttackKind => (h.sp ? SP_WEAPONS[h.sp.weapon].attack : attackOf(h.classId));

/** How wide a swing cuts when the weapon doesn't say (radians each side). */
const SWING_ARC = 1.3;
/** An arrow's and an orb's speed (px/s). */
const SHOT_SPEED = { arrow: 430, orb: 250 };
/** A wave's first ring (px). */
const WAVE_R = 110;

/** The basic attack, on its own clock. With an SP on, its weapon sets the kind (SP_WEAPONS) and
    the numbers (SP_WEAPON: clock and damage times the class's, reach, arc, pierce, blast, a throw
    that comes back, a heal on each hit). */
function attack(run: Run, h: Hero) {
  h.cd.attack -= STEP;
  if (h.cd.attack > 0) return;
  const cls = attackOf(h.classId),
    kind = attackKind(h),
    w = h.sp ? SP_WEAPON[h.sp.weapon] : null,
    reach = w?.reach ?? (kind === 'slash' ? SLASH_REACH : RANGE),
    b = run.boss?.alive && !splits(run) && !untouchable(run, run.boss) && run.t >= run.boss.bornUntil && dist(run.boss, h) <= reach ? run.boss : null,
    target = locked(run, h, reach) ?? b ?? nearest(run, h.x, h.y, undefined, reach);
  if (!target && kind !== 'wave') return;
  if (kind === 'wave' && !nearest(run, h.x, h.y, undefined, 150)) return;
  const rush = h.ups.rush && run.t < h.rushUntil ? 1 + RUN_SKILL.rush.rate * h.ups.rush * h.rush : 1;
  h.cd.attack = (attackCooldown(cls, h.power, h.ups) * (w?.cd ?? 1)) / (1 + DIALS.relic * 0.1 * relic(h, 'quick')) / bodyOf(h).haste / rush;
  const n = 1 + (h.ups.multi ?? 0),
    dmg = pow(h, ATTACK[cls].dmg * (w?.dmg ?? 1)),
    angle = target ? Math.atan2(target.y - h.y, target.x - h.x) : h.facing,
    swing = reach - 10,
    arc = w?.arc ?? SWING_ARC;
  if (!h.sp || !w) emit(run, { type: 'attack', kind, x: h.x, y: h.y, angle, n, r: kind === 'slash' ? swing : undefined });
  else emit(run, { type: 'attack', kind, x: h.x, y: h.y, angle, n, r: kind === 'slash' ? swing : kind === 'wave' ? WAVE_R : reach, weapon: h.sp.weapon, ...(kind === 'slash' ? { arc } : {}) });
  // What an SP weapon's shots carry: their look, a blast where they hit, a heal on each hit.
  const more: Partial<Shot> | undefined = h.sp && w ? { look: h.sp.weapon, ...(w.blast ? { blast: w.blast } : {}), ...(w.heal ? { heal: w.heal } : {}) } : undefined;
  if (kind === 'arrow') {
    for (let i = 0; i < n; i++) {
      const a = angle + (i - (n - 1) / 2) * 0.16;
      if (w?.back) throwBack(run, h, a, reach, SHOT_SPEED.arrow, dmg, more ?? {});
      else fire(run, h, 'arrow', a, SHOT_SPEED.arrow, dmg, w?.pierce ?? (w?.blast ? 0 : 1), null, h, more);
    }
  } else if (kind === 'orb' && target) {
    const hit = new Set<Foe>();
    for (let i = 0; i < n; i++) {
      const t = nearest(run, h.x, h.y, hit, RANGE) ?? target;
      hit.add(t);
      fire(run, h, 'orb', Math.atan2(t.y - h.y, t.x - h.x) + (i - (n - 1) / 2) * 0.4, SHOT_SPEED.orb, dmg, 0, t, h, more);
    }
    // Split Star (the Ashcaller's passive): every few attacks, one more orb at another monster.
    if (has(h, 'splitstar') && ++h.shots % SP_PASSIVE.splitstar.every === 0) {
      const t = nearest(run, h.x, h.y, hit, RANGE) ?? target;
      fire(run, h, 'orb', Math.atan2(t.y - h.y, t.x - h.x) + 0.5, SHOT_SPEED.orb, dmg, 0, t, h, more);
      emit(run, { type: 'passive', id: 'splitstar', x: h.x, y: h.y });
    }
  } else if (kind === 'wave') {
    for (let i = 0; i < n; i++) later(run, i * 0.18, () => burst(run, h, h.x, h.y, WAVE_R + i * 20, dmg, 'wave'));
  } else {
    for (let i = 0; i < n; i++) slash(run, h, angle + (i * Math.PI * 2) / n, dmg, swing, arc, w?.heal ?? 0, w ? (w.cut ?? 0) : arc);
  }
}

/** A swing: everything within `R` and `arc` radians either side of `angle` is hit, and the shots
    within `cut` radians either side are knocked out of the air. `heal`: a share of your HP back
    for each monster hit. */
function slash(run: Run, h: Hero, angle: number, dmg: number, R: number, arc: number, heal: number, cut: number) {
  for (const f of run.foes) {
    if (!f.alive) continue;
    const d = dist(f, h);
    if (d > R + f.def.r) continue;
    let diff = Math.atan2(f.y - h.y, f.x - h.x) - angle;
    diff = Math.abs(Math.atan2(Math.sin(diff), Math.cos(diff)));
    if ((f.kind === 'reflection' || f.kind === 'image') && diff >= SPLIT.aim) {
      // Only a swing aimed at a copy (of you, or of the Mirror) shatters it: the edge of the arc
      // pushes it aside.
      if (diff < arc || d < 22) nudge(run, f, 140, h.x, h.y);
      continue;
    }
    if (diff < arc || d < 22) {
      damage(run, h, f, dmg, 140);
      if (heal) mend(h, heal);
    }
  }
  for (const br of run.terrain.barrels) {
    if (!br.alive || Math.hypot(br.x - h.x, br.y - h.y) > R + BARREL.r) continue;
    const diff = Math.atan2(br.y - h.y, br.x - h.x) - angle;
    if (Math.abs(Math.atan2(Math.sin(diff), Math.cos(diff))) < arc) blowUp(run, br, h);
  }
  // A swing also knocks shots out of the air.
  if (cut <= 0) return;
  run.bullets = run.bullets.filter((b) => {
    const d = Math.hypot(b.x - h.x, b.y - h.y);
    if (d > R + 10) return true;
    const diff = Math.atan2(b.y - h.y, b.x - h.x) - angle;
    return Math.abs(Math.atan2(Math.sin(diff), Math.cos(diff))) >= cut;
  });
}

/** A weapon's heal on a hit: a share of max HP, at least 1. */
function mend(h: Hero, share: number) {
  if (h.hp <= 0 || h.hp >= h.maxHp) return;
  h.hp = Math.min(h.maxHp, h.hp + Math.max(1, Math.round(h.maxHp * share)));
}

/** A throw that comes back turns round: it can hit each monster again on the way home. */
function turnBack(s: Shot) {
  if (!s.back?.out) return;
  s.back.out = false;
  s.hit.clear();
}

function moveShots(run: Run) {
  run.shots = run.shots.filter((s) => {
    if (run.t > s.dies) return false;
    if (s.back) {
      if (run.t >= s.back.turn) turnBack(s);
      if (!s.back.out) {
        // Home to the thrower's hand.
        const dx = s.by.x - s.x,
          dy = s.by.y - s.y,
          d = Math.hypot(dx, dy) || 1,
          v = Math.hypot(s.vx, s.vy);
        if (d < HERO_R + 8) return false;
        s.vx = (dx / d) * v;
        s.vy = (dy / d) * v;
      }
    } else if (s.kind === 'orb') {
      if (!s.target?.alive) s.target = nearest(run, s.x, s.y, undefined, 300);
      if (s.target) {
        const a = Math.atan2(s.target.y - s.y, s.target.x - s.x);
        s.vx = Math.cos(a) * SHOT_SPEED.orb;
        s.vy = Math.sin(a) * SHOT_SPEED.orb;
      }
    }
    s.x += s.vx * STEP;
    s.y += s.vy * STEP;
    if (s.x < ROOM.wall || s.x > run.area.w - ROOM.wall || s.y < ROOM.wall || s.y > run.area.h - ROOM.wall || inPillar(run, s.x, s.y, 2)) {
      // A throw that comes back turns at a wall; on its way home it flies over everything.
      if (!s.back) return false;
      turnBack(s);
    }
    for (const br of run.terrain.barrels)
      if (br.alive && closer(br.x - s.x, br.y - s.y, BARREL.r + 4)) {
        blowUp(run, br, s.by);
        if (!s.back) return false;
        turnBack(s);
      }
    let f: Foe | null = null;
    const near = s.r ?? 6;
    for (const o of run.foes) if (o.alive && !s.hit.has(o) && run.t >= o.bornUntil && !untouchable(run, o) && closer(o.x - s.x, o.y - s.y, o.def.r + near)) f = o;
    if (!f) return true;
    s.hit.add(f);
    if (s.heal) mend(s.by, s.heal);
    if (s.kind === 'orb') {
      damage(run, s.by, f, s.dmg, 60, s.x, s.y);
      burst(run, s.by, s.x, s.y, s.blast ?? 56, s.dmg * 0.5, 'orb', f);
      return false;
    }
    damage(run, s.by, f, s.dmg, 90, s.x, s.y);
    if (s.blast) burst(run, s.by, s.x, s.y, s.blast, s.dmg * 0.5, 'fire', f);
    // A throw that comes back hits everything it passes.
    if (s.back) return true;
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
      h.cd.spark = RUN_SKILL.spark.every;
      const hit = sparkHit(spark);
      chain(run, h, hit.jumps, pow(h, hit.dmg));
    }
  }
  const nova = h.ups.nova ?? 0;
  if (nova > 0) {
    h.cd.nova -= STEP;
    if (h.cd.nova <= 0) {
      h.cd.nova = RUN_SKILL.nova.every;
      const hit = novaHit(nova);
      // The burst of light also wipes the shots inside it.
      clearBullets(run, h.x, h.y, hit.r);
      burst(run, h, h.x, h.y, hit.r, pow(h, hit.dmg), 'nova');
    }
  }
  const star = h.ups.star ?? 0;
  if (star > 0) {
    h.cd.star -= STEP;
    if (h.cd.star <= 0) {
      // Falling star: on the foe nearest you; with none in range it tries again soon.
      const target = nearest(run, h.x, h.y, undefined, RANGE);
      h.cd.star = target ? RUN_SKILL.star.every : 0.3;
      if (target) {
        const hit = starHit(star),
          tx = target.x,
          ty = target.y;
        emit(run, { type: 'star', x: tx, y: ty });
        later(run, 0.35, () => burst(run, h, tx, ty, hit.r, pow(h, hit.dmg), 'star'));
      }
    }
  }
  // Cold air: the monsters near you walk slower (a stronger slow already on them stays).
  const frost = h.ups.frost ?? 0;
  if (frost > 0) {
    h.cd.frost -= STEP;
    if (h.cd.frost <= 0) {
      h.cd.frost = 0.25;
      const k = RUN_SKILL.frost.slow * frost;
      for (const f of run.foes) {
        if (!f.alive || f === run.boss || f === run.warden || !closer(f.x - h.x, f.y - h.y, RUN_SKILL.frost.r + f.def.r)) continue;
        if (f.slow && run.t < f.slow.until && f.slow.k > k) continue;
        f.slow = { until: run.t + 0.35, k };
      }
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
      reach = gemReach(h.power),
      dx = h.x - g.x,
      dy = h.y - g.y,
      d = Math.hypot(dx, dy);
    if (d < 16) {
      emit(run, { type: 'gem' });
      // A party levels as one: everyone gets it, down or not, so the level-up cards come to all at once.
      for (const o of run.party) gain(run, o, g.value);
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

/** Open the chest: three chest items to pick from, maybe an item. In a party, the first hero to
    open it opens it for everyone at once: each gets their own pick and their own item. */
function openChest(run: Run, h: Hero) {
  const c = run.chest;
  if (!c || !canOpen(run, h)) return;
  if (run.party.length < 2) return openFor(run, h, c, true);
  for (const o of run.party) if (canOpen(run, o)) openFor(run, o, c, false);
}

function openFor(run: Run, h: Hero, c: NonNullable<Run['chest']>, solo: boolean) {
  c.opened = true;
  if (!solo) (c.took ??= []).push(h.id);
  const ids = Object.keys(RELICS) as RelicId[];
  const choices: RelicId[] = [];
  while (choices.length < 3) {
    const id = ids[Math.floor(run.rnd() * ids.length)];
    if (!choices.includes(id)) choices.push(id);
  }
  emitTo(run, h, { type: 'chest', x: c.x, y: c.y });
  if (run.rnd() < DROPS.chest) {
    if (solo) dropEach(run, c.x, c.y + 34, DROP_LUCK.chest);
    else dropItem(run, c.x, c.y + 34, DROP_LUCK.chest, h);
  }
  findMats(run, 'chest', c.x, c.y, solo ? undefined : [h]);
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
  emitTo(run, h, { type: 'relic', id });
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
  if (run.setup.autoPick || run.setup.tutorial) pick(run, BOT_PICKS.find((id) => choices.includes(id)) ?? choices[0], h);
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
  emitTo(run, to, { type: 'drop', x: l.x, y: l.y, item });
}

/** A drop is personal: each standing hero gets their own item, for their class, a little apart. */
function dropEach(run: Run, x: number, y: number, luck: number) {
  standing(run).forEach((h, i) => dropItem(run, x + i * 26, y, luck, h));
}

/** Co-op materials: in a party, each standing hero rolls their own from `from`'s odds. A solo run
    rolls nothing (so solo runs play exactly as before). */
function findMats(run: Run, from: keyof typeof MAT_DROPS, x: number, y: number, who = standing(run)) {
  if (run.party.length < 2) return;
  const odds: Partial<Record<MatId, number>> = MAT_DROPS[from];
  for (const h of who)
    for (const mat of MAT_IDS) {
      const p = odds[mat];
      if (!p || run.rnd() >= p) continue;
      h.mats[mat] = (h.mats[mat] ?? 0) + 1;
      emitTo(run, h, { type: 'mat', mat, n: 1, x, y });
    }
}

/** Loot a hero can see and take: theirs, or anyone's when there's no `for`. */
export const mine = (l: { for?: number }, h: Pick<Hero, 'id'>) => l.for === undefined || l.for === h.id;

/** Your power with what you wear: weapon damage, armor HP, charms, and your class's build. */
function applyGear(run: Run, h: Hero) {
  const t = itemTotals(ITEM_SLOTS.map((s) => h.gear.worn[s])),
    b = h.base,
    body = bodyOf(h);
  h.power = { ...b, health: b.health + (t.health ?? 0), armor: b.armor + body.armor + (t.armor ?? 0), damage: (1 + b.damage + (t.damage ?? 0)) * body.dmg - 1, speed: b.speed + (t.speed ?? 0), crit: b.crit + (t.crit ?? 0) };
  h.gearFx = { move: t.move ?? 0, heal: t.heal ?? 0, cooldown: t.cooldown ?? 0, critDmg: t.critDmg ?? 0, slayer: t.slayer ?? 0, leech: t.leech ?? 0, evade: Math.min(MAX_EVADE, t.evade ?? 0), power: t.power ?? 0 };
  const max = Math.round(heroMaxHp(h.power) * body.hp),
    d = max - h.gearMax;
  h.gearMax = max;
  h.maxHp += d;
  h.hp = Math.max(1, Math.min(h.maxHp, h.hp + Math.max(0, d)));
}

/** Points short of what an item asks (0: you can wear it). */
export const shortFor = (h: Pick<Hero, 'build'>, it: Item) => shortOf(it, h.build);
/** Whether this hero can wear it: their class's (for a weapon), the level and the points it asks. */
export const wearsIt = (h: Pick<Hero, 'build' | 'classId' | 'heroLevel'>, it: Item) => canWear(it, h.build, h.classId, h.heroLevel);

/** Wear an item from the bag; what you wore goes into the bag (the starter kit just goes). */
export function wear(run: Run, id: string, h: Hero = run.hero) {
  const it = h.gear.bag.find((o) => o.id === id);
  if (!it || !wearsIt(h, it)) return;
  const old = h.gear.worn[it.slot];
  h.gear.bag = h.gear.bag.filter((o) => o !== it);
  if (old && !old.starter) h.gear.bag.push(old);
  h.gear.worn[it.slot] = it;
  applyGear(run, h);
}

/** Take a worn item off into the bag (the weapon slot gets the plain weapon back). */
export function takeOff(run: Run, slot: ItemSlot, h: Hero = run.hero) {
  const it = h.gear.worn[slot];
  if (!it || it.starter || h.gear.bag.length >= BAG) return;
  h.gear.bag.push(it);
  if (slot === 'weapon') h.gear.worn.weapon = starterKit(h.classId).weapon;
  else delete h.gear.worn[slot];
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
  emitTo(run, h, { type: 'drop', x: l.x, y: l.y, item: it });
}

/** The bot wears what it picks up when it can and it's better than what it has. */
function botWear(run: Run, h: Hero, it: Item) {
  if (wearsIt(h, it) && itemScore(it) > itemScore(h.gear.worn[it.slot])) wear(run, it.id, h);
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

/** A live party run: someone left, so it ends here for everyone, and each keeps what they carry. */
export function leaveRun(run: Run, text: string) {
  if (run.over) return;
  emit(run, { type: 'say', text });
  end(run, false, 'left');
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
  // Evade (from what you wear): the hit misses you entirely.
  if (h.gearFx.evade && run.critRnd() < h.gearFx.evade) {
    h.hurtUntil = now + INVULNERABLE;
    emit(run, { type: 'evade', x: h.x, y: h.y });
    return;
  }
  // Stand your ground (a run skill): standing still a moment, you take less. It counts as armor, so
  // it stops at the same cap: standing still with full armor is never a way to take almost nothing.
  const planted = h.ups.stand && h.stillFor >= RUN_SKILL.stand.after ? RUN_SKILL.stand.less * h.ups.stand : 0;
  const hit = spGuard(run, h, (dmg * partyMore(run, 'dmg') * (1 - armorOf(h.power, h.ups, planted))) / (1 + DIALS.relic * 0.14 * relic(h, 'iron')));
  // In the first dungeon you can't fall: HP stops at 1.
  const taken = run.setup.tutorial ? Math.min(hit, h.hp - 1) : hit;
  if (taken <= 0) {
    h.hurtUntil = now + INVULNERABLE;
    return;
  }
  h.hp -= taken;
  h.hits++;
  h.hurtUntil = now + INVULNERABLE;
  // A hit wakes you from the Lull's song.
  if (asleep(run, h)) wake(run, h, 'hit');
  calmer(run, h, CALM.taken, true);
  emit(run, { type: 'hurt', x: h.x, y: h.y, dmg: Math.round(taken), by, hero: h.id });
  if (h.hp <= 0) fall(run, h);
  else spHurt(run, h);
}

/** A hero at 0 HP is down. The run ends when the whole party is. */
function fall(run: Run, h: Hero) {
  h.hp = 0;
  if (standing(run).length === 0) end(run, false, 'hp');
}

/** How the run ended for one hero: their kills, level, items and materials. The run keeps the
    first hero's (`run.over`); in a live party each phone builds its own from it (`overFor(run, run.hero)`
    there is you), so nobody takes home a friend's items. */
export function overFor(run: Run, h: Hero, won = run.over?.won ?? false, why: RunEnd['why'] = run.over?.why ?? 'hp'): RunEnd {
  return {
    won,
    seconds: Math.floor(run.t),
    kills: h.kills,
    hits: h.hits,
    level: h.level,
    hp: won ? Math.max(0, Math.ceil(h.hp)) : 0,
    maxHp: h.maxHp,
    floor: run.floor + 1,
    room: run.room + 1,
    bossAt: run.bossAt === null ? null : Math.floor(run.bossAt),
    why,
    height: run.climb,
    gear: { worn: Object.fromEntries(Object.entries(h.gear.worn).filter(([, it]) => it && !it.starter)) as Partial<Record<ItemSlot, Item>>, bag: [...h.gear.bag] },
    ...(Object.keys(h.mats).length ? { mats: { ...h.mats } } : {}),
  };
}

function end(run: Run, won: boolean, why: RunEnd['why']) {
  if (run.over) return;
  // On the Summit there's no top: however the climb ends, a ledge climbed is a win.
  if (run.climb !== null) won = run.climb >= 1;
  // A co-op win with nobody down: a chance of the rarest material.
  if (won && run.party.length > 1 && standing(run).length === run.party.length) findMats(run, 'clear', run.hero.x, run.hero.y);
  run.over = overFor(run, run.hero, won, why);
  if (!won) run.hero.hp = 0;
}

/** Developer mode: end the run as if the boss fell. */
export function winNow(run: Run) {
  end(run, true, 'boss');
}

/** Developer mode: a level up now (and `skills` levels' picks taken first, by the bot's order, to
    see the card with a few skills already in hand). */
export function levelNow(run: Run, skills = 0) {
  const h = run.hero;
  for (let i = 0; i < skills; i++) {
    if (!h.offer) gain(run, h, xpToNext(h.level) - h.xp);
    if (h.offer) pick(run, BOT_PICKS.find((id) => h.offer!.choices.includes(id)) ?? h.offer.choices[0], h);
  }
  if (!h.offer) gain(run, h, xpToNext(h.level) - h.xp);
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
  return e.filter((x) => heard(x, run.hero.id));
}
