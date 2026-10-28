import * as Phaser from 'phaser';
import type { ClassId } from '@/lib/gear';
import type { Sheet } from '@/sprites/registry';
import { xpToNext, type Edge, type Power, type UpgradeId, type Zone } from '@/lib/fog';
import { music, type SfxId } from '@/lib/music';
import { paintFrames } from '@/sprites/engine/grid';
import { BOT_PICKS, type BossSheetKey, type SheetKey, type Sheets } from '../rules';
import type { FogBoss, FogLines } from '@/story/types';
import { R } from '@/sprites/palette';
import { botInput } from './bot';
import { drawItem } from '@/sprites/characters/items';
import type { Build } from '@/lib/stats';
import { BARREL, CHEST, CHEST_OPEN, HIT_SPARK, PILLAR, SCONCE, SHRINE as SHRINE_PROP, STAIRS, type Prop } from './props';
import { THEMES, themeFor, type Theme } from './themes';
import { bandOf, glowOf } from './items';
import { BANDS, MATS, PARTY, SURGE } from '@/balance';
import { spLook } from '@/sprites/characters/spLooks';
import { WEAPON_FX, attackFx, drawFields, shotTexture, spFx, star, type Aura, type FxKit, type SpEvent } from './spFx';
import {
  ABILITIES,
  DODGE,
  FLAME_RING,
  ROOM,
  SHRINE,
  STEP,
  ELITE,
  DIM,
  LIGHT,
  MIDS,
  CREW,
  GALE,
  cellOf,
  hardened,
  isWardenRoom,
  midBoss,
  RELICS,
  zoneDungeon,
  createRun,
  dropFromBag,
  looksOf,
  nameOf,
  RARITY,
  takeOff,
  takeStairs,
  wear,
  type Item,
  type ItemSlot,
  pickRelic,
  relic,
  spikeState,
  mine,
  canOpen,
  pick,
  skipFloor,
  skipToBoss,
  skipToWarden,
  stepRun,
  takeEvents,
  abilityReady,
  finalReady,
  skillReady,
  wardenFloor,
  overFor,
  winNow,
  type AbilityId,
  type SpMoveId,
  type SpNo,
  type SpPassiveId,
  type CellKind,
  type Door,
  type Foe,
  type FreePick,
  type GameEvent,
  type Input,
  type MonsterKind,
  type RelicId,
  type Run,
  type Side,
  type RunEnd as EngineEnd,
  type ShotStyle,
  byOf,
} from './engine';
import { runFromStart, type Up } from '../net/wire';
import { Follower } from '../net/follow';
import type { PlayLink } from '@/lib/play-client';

/* Draws a dungeon run. The engine (engine.ts) plays the game; this scene only reads it each frame,
   keeps a sprite for everything in it, and turns what happened (its events) into flashes, sparks,
   numbers and sound. Loaded only when a run starts, like everything that touches Phaser.

   The phone is held sideways. The engine plays its rooms standing up (the door in the top wall);
   the screen shows them on their side, so you walk to the right. `P` turns an engine point into a
   screen point. The room's floor, walls, water and effects are drawn in engine points on layers
   turned a quarter (`turn`); people, monsters, props and words stand upright at `P`. */

export type { SheetKey, FreePick };

/** How a run ended, for the recap: the engine's result, the items picked up, and whether the
    Warden fell (null when this dungeon has none). */
export interface RunEnd extends EngineEnd {
  relics: Partial<Record<RelicId, number>>;
  warden: boolean | null;
}

function recap(run: Run): RunEnd {
  // Your own end (in a live run the run's own is the leader's).
  const over = overFor(run, run.hero),
    wf = wardenFloor(run.layout);
  const warden = wf < 0 ? null : over.won || run.floor > wf || (run.floor === wf && !!run.warden && !run.warden.alive);
  return { ...over, relics: { ...run.hero.relics }, warden };
}


/** Most particles and drawn effects alive at once. Measured fights peak far below this (bits 38,
    sparks 16, puffs 72, effects 3); the caps only stop a freak pile-up from stalling a slow phone. */
const FX_CAP = { bits: 300, sparks: 200, puffs: 160, fading: 80 };

/** How the camera fills the screen (`fitScreen`): `edge` world points of floor past each wall,
    `hud` screen pixels kept above the top wall for the HUD's bars, and at least `see` world points
    of the room's height on screen, so a shot from the far wall is seen coming. */
const FIT = { edge: 12, hud: 30, see: 300 };

/** The system asks for less motion: no hit-stop and no buzz. Asked once and then kept up to date,
    since it's asked on every hit. */
let lessMotion: MediaQueryList | null | undefined;
function reducedMotion(): boolean {
  try {
    if (lessMotion === undefined) lessMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
    return !!lessMotion?.matches;
  } catch {
    return false;
  }
}

/** A share (0 to 1) cut down to whole hundredths: finer than any ring shows, and 1 only when full. */
const hundredths = (x: number) => Math.floor(x * 100) / 100;

/** A light buzz on phones, for the moments you should feel: never with reduced motion or the sound off. */
function buzz(pattern: number | number[]) {
  try {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator) || music.muted) return;
    if (reducedMotion()) return;
    navigator.vibrate(pattern);
  } catch {
    // Some browsers refuse vibrate outside a tap: it's only a nicety.
  }
}

export interface RunSetup {
  zone: Zone;
  /** What the boss says (its chapter's lines, the player's words already filled in). */
  lines?: FogLines;
  power: Power;
  classId: ClassId | undefined;
  sheets: Sheets;
  /** The bot plays (developer mode, balance tests). */
  autopilot?: boolean;
  /** Play the whole run at once without drawing it (balance tests). */
  fast?: boolean;
  /** What you wear into the Fog (from the save), and your points and hero level, which items ask for. */
  worn?: Partial<Record<ItemSlot, Item>>;
  build?: Build;
  heroLevel?: number;
  /** The chapter's hearts are gone: a weaker boss and free skills at the start. */
  edge?: Edge;
  /** Wearing the class's SP: its own move and its final (src/lib/sp.ts). */
  sp?: SpNo | boolean;
  /** A party's run: the seed every phone shares. */
  seed?: number;
  /** Friends in the run (a practice run: bots play them), each with their own sheets
      (`friend<i>`, `friend<i>Walk`) and their name over their head. */
  friends?: { name: string; classId: ClassId | undefined; idle: Sheet; walk: Sheet }[];
  /** A live party run: the game server plays the one real run (src/game/net), this phone shows it
      and looks a few steps ahead with what you press. `friends` are the others, in the run's order. */
  net?: PlayLink;
  /** The opening's first dungeon, and the line the Hollow says at its bottom. */
  tutorial?: { voice: string };
}

/** A room on the minimap: where it is on the floor (east is +x, south is +y), what it holds,
    whether you've been in, and its doors to rooms you've seen. */
export interface MiniCell {
  id: number;
  x: number;
  y: number;
  kind: CellKind;
  been: boolean;
  links: Side[];
}
export interface MiniMap {
  /** The room you're in. */
  at: number;
  cells: MiniCell[];
}

export interface Hud {
  /** A live run: from pressing to the server playing it (ms), for developer mode. */
  ping?: number | null;
  hp: number;
  maxHp: number;
  xp: number;
  xpNext: number;
  level: number;
  seconds: number;
  kills: number;
  /** The boss's bar, and what it says in place of HP when its fight isn't about HP. */
  boss: { hp: number; max: number; label?: string } | null;
  /** The floor's map as far as you know it. */
  map: MiniMap;
  /** The Warden of the Ashes, the mid-boss, while it stands. */
  warden: { hp: number; max: number; phase: number } | null;
  /** The floor (from 1) whose last room holds the Warden, or null. */
  wardenFloor: number | null;
  floor: number;
  floors: number;
  /** The class ability: 1 when ready. */
  ability: { id: AbilityId; ready: number };
  /** With an SP on: its own move and its final, each 1 when ready. */
  sp: { skill: SpMoveId; skillReady: number; final: SpMoveId; finalReady: number; finals: number } | null;
  /** The dodge: 1 when ready. */
  dodge: number;
  cleared: boolean;
  relics: Partial<Record<RelicId, number>>;
  /** Ledges climbed on the Summit, or null. */
  climb: number | null;
  /** What you wear and carry. */
  gear: { worn: Partial<Record<ItemSlot, Item>>; bag: Item[] };
}

export interface RunEvents {
  hud: (h: Hud) => void;
  levelUp: (choices: UpgradeId[], levels: Partial<Record<UpgradeId, number>>, free: FreePick | null) => void;
  boss: () => void;
  say: (text: string) => void;
  /** A chest opened: three items to pick from. */
  relic: (choices: RelicId[], have: Partial<Record<RelicId, number>>) => void;
  /** A new floor: its number from 1. */
  floor: (n: number) => void;
  /** An item picked up into the bag. */
  loot: (item: Item) => void;
  /** On the stairs: go deeper, leave with what you carry, or not yet (answer with `stairs`). */
  stairs: () => void;
  /** A live run: someone else answered the stairs, or the server picked for you after a long wait;
      close the card that asked. */
  dismiss?: () => void;
  end: (r: RunEnd) => void;
}

export interface RunHandle {
  pick: (id: UpgradeId) => void;
  ability: () => void;
  /** The SP's own move, and its final. */
  skill: () => void;
  final: () => void;
  dodge: () => void;
  pause: () => void;
  resume: () => void;
  skipToBoss: () => void;
  skipFloor: () => void;
  /** Developer mode: show the stairs card now. */
  askStairs: () => void;
  skipToWarden: () => void;
  /** Developer mode: the SP's final ready now. */
  fillFinal: () => void;
  /** Developer mode: show the next zone's dungeon theme; returns its name. */
  cycleTheme: () => string;
  pickRelic: (id: RelicId) => void;
  /** Your gear, from the bag panel. */
  wear: (id: string) => void;
  takeOff: (slot: ItemSlot) => void;
  dropItem: (id: string) => void;
  stairs: (choice: 'deeper' | 'leave' | 'stay') => void;
  winNow: () => void;
  autopilot: (on: boolean) => void;
  destroy: () => void;
}

/** A live run: after you pick or answer the stairs, the server's next few runs may still ask the
    same (they left before your answer got there). That same card isn't shown again for this long
    (ms); a new one is. */
const ANSWER_MS = 800;
const askKey = (kind: string, choices: readonly string[] | null | undefined) => `${kind}:${choices?.join() ?? ''}`;

const SFX: Record<'slash' | 'arrow' | 'orb' | 'wave', SfxId> = { slash: 'slash', arrow: 'arrow', orb: 'orb', wave: 'wave' };
const HEAL = '#86efac';
const RISE_MS = 280;
/** The sounds that come in crowds (blows, hits, kills, light); others always play. */
const CROWD: ReadonlySet<SfxId> = new Set(['slash', 'arrow', 'orb', 'wave', 'hit', 'bossHit', 'kill', 'gem', 'dash']);
const SFX_PER_FRAME = 2;
/** At most this much hit-stop (ms) in any one second. */
const STOP_BUDGET = 140;

/** How a monster is drawn: its sprite sheet, its size (1 = a 64px sheet at full size), and the
    colors of the bits it bursts into. */
type Look = { tex: SheetKey; scale: number; bits: number[]; tint?: number };
/** Each boss's stand-in until its zone's own art (BOSS_ART) is loaded, and its size for the label. */
const BOSS_LOOKS: Record<FogBoss, Look> = {
  tomorrow: { tex: 'slime', scale: 1.5, bits: [0x94a3b8, 0x5b74c4, 0xe2e8f0] },
  mirror: { tex: 'mirror', scale: 1.35, bits: [0xe2e8f0, 0xcbd5e1, 0xffffff] },
  knight: { tex: 'knight', scale: 1.15, bits: [0xe2e8f0, 0x94a3b8, 0xdc2626] },
  plateau: { tex: 'hollow', scale: 1.5, bits: [0xa78bfa, 0x6b21a8, 0xffffff] },
  hollow: { tex: 'hollow', scale: 1.5, bits: [0xa78bfa, 0x6b21a8, 0xffffff] },
  summit: { tex: 'hollow', scale: 1.5, bits: [0xa78bfa, 0x6b21a8, 0xffffff] },
};
/** Every monster's look, each with its own sprite (src/sprites/characters). */
const DUNGEON_LOOKS: Record<MonsterKind, Look> = {
  slime: { tex: 'slime', scale: 0.55, bits: [0x94a3b8, 0x5b74c4, 0xe2e8f0] },
  wisp: { tex: 'wisp', scale: 0.5, bits: [0xf97316, 0xfde68a, 0x6b7280] },
  mirror: { tex: 'mirror', scale: 0.65, bits: [0xe2e8f0, 0xcbd5e1, 0xffffff] },
  golem: { tex: 'golem', scale: 0.95, bits: [0xa8a29e, 0x78716c, 0x84cc16] },
  // A golden copy of you, sent by the Mirror. Hitting it hurts you.
  reflection: { tex: 'echo', scale: 0.75, bits: [0xfde68a, 0xfbbf24, 0xffffff] },
  ram: { tex: 'ram', scale: 0.62, bits: [0xe89a48, 0xb8651e, 0xe8dcc0] },
  book: { tex: 'book', scale: 0.62, bits: [0xfef3c7, 0xd6d3d1, 0x92400e] },
  smoke: { tex: 'smoke', scale: 0.55, bits: [0xa78bfa, 0x6b21a8, 0xe9d5ff] },
  seeker: { tex: 'seeker', scale: 0.55, bits: [0x67e8f9, 0x0e7490, 0xffffff] },
  splitter: { tex: 'splitter', scale: 0.78, bits: [0x86efac, 0x15803d, 0xdcfce7] },
  splitling: { tex: 'splitling', scale: 0.5, bits: [0x86efac, 0x15803d] },
  shade: { tex: 'shade', scale: 0.65, bits: [0xa78bfa, 0x6b21a8, 0x1e1b4b] },
  // The Warden of the Ashes: the golem, much bigger, the grey of cold ash, embers glowing under it.
  warden: { tex: 'warden', scale: 1.3, bits: [0x78716c, 0xf97316, 0xfde68a] },
  // The Mirror's images look exactly like it (the scene swaps in the Mirror's own art, BOSS_ART).
  image: { tex: BOSS_LOOKS.mirror.tex, scale: BOSS_LOOKS.mirror.scale, bits: BOSS_LOOKS.mirror.bits },
  // The other zones' mid-bosses: the Drowned Lantern, the Foreman, the Sand Golem (which swaps to
  // its stone sheet while it stands), the Whisper and the Gale.
  lantern: { tex: 'lanternMid', scale: 1.15, bits: [0x7dd3fc, 0x0e7490, 0xe0f2fe] },
  foreman: { tex: 'foremanMid', scale: 1.2, bits: [0xd6a36b, 0x92400e, 0x86efac] },
  sandGolem: { tex: 'sandGolemMid', scale: 1.25, bits: [0xe8c48a, 0xb08850, 0x8f6b3d] },
  whisper: { tex: 'whisperMid', scale: 0.85, bits: [0xc4b5fd, 0x7c3aed, 0xffffff] },
  gale: { tex: 'galeMid', scale: 1.15, bits: [0xe2e8f0, 0x94a3b8, 0xffffff] },
};
/** The mid-bosses' kinds, for the big pops and stomps. */
const MID_KINDS = new Set<Foe['kind']>(MIDS.map((m) => m.kind));
/** How far you see right now: the Fog's sight, or the Drowned Lantern's dark (null: all of it). */
const sightNow = (r: Run) => zoneDungeon(r.setup.zone).sight ?? r.dim;
/** The dark's texture is drawn for this sight, and stretched for any other. */
const DARK_REF = 190;
const looks = (kind: Foe['kind'], zone: Zone): Look => (kind === 'boss' ? BOSS_LOOKS[zone.boss] : DUNGEON_LOOKS[kind]);
/** Each zone boss's own art, in the stages of its fight (the Knight's plates falling, the
    Plateau's cracks), and its height on screen (1 = the hero's). Until a zone's sheets are loaded
    the boss wears its stand-in from BOSS_LOOKS. Swapping a boss's art is a change here. */
const BOSS_ART: Partial<Record<FogBoss, { stages: BossSheetKey[]; size: number; bits: number[] }>> = {
  mirror: { stages: ['mirrorBoss'], size: 1.05, bits: [0xe0f2fe, 0x7dd3fc, 0xffffff] },
  knight: { stages: ['knightBoss', 'knightBoss1', 'knightBoss2'], size: 1.15, bits: [0xe2e8f0, 0x94a3b8, 0xdc2626] },
  plateau: { stages: ['plateauBoss', 'plateauBoss1', 'plateauBoss2'], size: 1.7, bits: [0xd9b47a, 0x8f6b3d, 0x5a4124] },
  hollow: { stages: ['hollowBoss'], size: 1.3, bits: [0xa78bfa, 0x6b21a8, 0xffffff] },
  summit: { stages: ['summitBoss'], size: 1.9, bits: [0xe2e8f0, 0xfde68a, 0xffffff] },
};
/** Which stage of its art a boss is in: the Knight by plates left, the Plateau by its cracks. */
function bossStage(which: FogBoss, f: Foe): number {
  if (which === 'knight') return f.hp > f.maxHp * (2 / 3) ? 0 : f.hp > f.maxHp / 3 ? 1 : 2;
  if (which === 'plateau') return f.phase <= 3 ? 0 : f.phase <= 6 ? 1 : 2;
  return 0;
}
/** A crit's number: gold, and on its own, not added to the hits around it. */
const CRIT_COLOR = '#fde047';
/** A door to a room you haven't been in: it doesn't say what waits there. */
const UNKNOWN = { label: '?', color: 0xcbd5e1 };
/** A door back to a room you've been in. */
const BEEN = 0x94a3b8;
/** Into the room from each wall (engine space). */
const INWARD: Record<Side, [number, number]> = { e: [0, 1], w: [0, -1], n: [1, 0], s: [-1, 0] };
/** Each kind of monster shot has its own color, so you learn what it will do. */
const SHOT_TEX: Record<ShotStyle, string> = { plain: 'bullet', homing: 'bullet-homing', bounce: 'bullet-bounce', ramp: 'bullet-ramp', wiggle: 'bullet-page' };
/** A color as a number. Remembered, since the ground asks for the theme's colors every frame. */
const hexes = new Map<string, number>();
const hex = (c: string) => {
  let n = hexes.get(c);
  if (n === undefined) hexes.set(c, (n = Phaser.Display.Color.HexStringToColor(c).color));
  return n;
};
/** A bubble's middle, kept far enough in from the walls that it fits. */
const clampX = (x: number, w: number) => Math.min(w - 105, Math.max(105, x));


/** How long before a monster's volley it swells, so you see the shots coming (s). */
const TELL = 0.35;
/** Whether a monster is about to fire a volley (not a stream of quick shots, which would just throb). */
const aboutToFire = (f: Run['foes'][number], t: number) => f.def.shoots.some((p, i) => !p.on && p.every >= 1 && f.next[i] > t && f.next[i] - t < TELL);

class DungeonScene extends Phaser.Scene {
  run: Run;
  bot = false;
  private hero!: Phaser.GameObjects.Sprite;
  /** The hero's light: the best-forged item's glow and sparks (BANDS), a legendary's flames. `band` is a key: band * 2, +1 with a legendary. */
  private plusLook: { band: number; aura: Phaser.GameObjects.Image | null; fire: Phaser.GameObjects.Image | null; fx: Phaser.GameObjects.Particles.ParticleEmitter[] } = { band: 0, aura: null, fire: null, fx: [] };
  private foes = new Map<number, { s: Phaser.GameObjects.Sprite; base: number; born: number; squash: number; flash: number; tex: string; attackAt: number }>();
  /** Friends on the Summit's climb. */
  private allies: Phaser.GameObjects.Sprite[] = [];
  /** The Summit itself, looming over each ledge of the climb. */
  private summit: Phaser.GameObjects.Sprite | null = null;
  /** The fog's dark, past what you can see (the Fog zone). */
  private dark: Phaser.GameObjects.Image | null = null;
  private bullets = new Map<number, Phaser.GameObjects.Image>();
  private shots = new Map<number, Phaser.GameObjects.Image>();
  private gems = new Map<number, Phaser.GameObjects.Image>();
  private flames: Phaser.GameObjects.Sprite[] = [];
  /** The walls and doors, drawn off screen as some 17,000 small rects; `walls` holds them as one
      picture, made again only when the room changes, so a frame never redraws them. */
  private room!: Phaser.GameObjects.Graphics;
  private walls!: Phaser.GameObjects.RenderTexture | Phaser.GameObjects.Graphics;
  private floorTiles!: Phaser.GameObjects.TileSprite;
  /** Water and spikes, redrawn each frame (they ripple and rise). */
  private ground!: Phaser.GameObjects.Graphics;
  /** What belongs to this room only: pebbles, pillars, the shrine. */
  private roomBits: Phaser.GameObjects.GameObject[] = [];
  private barrels = new Map<number, Phaser.GameObjects.Image>();
  private shrine: Phaser.GameObjects.Image | null = null;
  /** Torches on the side walls; their flames are drawn each frame on `torchFire`. */
  private torches: { x: number; y: number }[] = [];
  private torchFire!: Phaser.GameObjects.Graphics;
  /** The look of this zone's dungeon (themes.ts). Developer mode can cycle it. */
  private theme: Theme;
  private mists: Phaser.GameObjects.Image[] = [];
  private chest: Phaser.GameObjects.Image | null = null;
  private stairs: Phaser.GameObjects.Image | null = null;
  /** Items on the floor: the icon, its name, and a beam of light over rare ones. */
  private loot = new Map<number, { icon: Phaser.GameObjects.Image; name: Phaser.GameObjects.Text; beam: Phaser.GameObjects.Rectangle | null }>();
  /** The stairs question is up. */
  private asked = false;
  private fx!: Phaser.GameObjects.Graphics;
  private shadows!: Phaser.GameObjects.Graphics;
  /** Upright marks over the room (eyes in the fog, a bomb in the air, the ring on the monster you tapped). */
  private marks!: Phaser.GameObjects.Graphics;
  /** Glows on the floor under a mid-boss, redrawn each frame. */
  private under!: Phaser.GameObjects.Graphics;
  /** Spike tips, standing up out of their plates. */
  private tips!: Phaser.GameObjects.Graphics;
  private pad!: Phaser.GameObjects.Graphics;
  private bits!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private puffs!: Phaser.GameObjects.Particles.ParticleEmitter;
  private numbers: Phaser.GameObjects.BitmapText[] = [];
  private bossLabel: Phaser.GameObjects.Text | null = null;
  /** The boss's speech bubble, until `speechUntil`; the next taunt comes at `tauntAt`. */
  private speech!: Phaser.GameObjects.Text;
  private speechUntil = 0;
  /** Who the bubble hangs over when it isn't the boss: the mid-boss, or where it fell. */
  private speaker: { foe: Foe; x: number; y: number } | null = null;
  /** The chest the mid-boss left, called out until it's opened. */
  private chestCall: Phaser.GameObjects.Text | null = null;
  private tauntAt = 0;
  private taunt = 0;
  /** The boss's stage of its art, for its stage lines. */
  private stage = 0;
  private keys: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key> | null = null;
  private stick: { id: number; x: number; y: number; dx: number; dy: number } | null = null;
  private fading: { draw: (g: Phaser.GameObjects.Graphics, p: number) => void; start: number; ms: number; up: boolean }[] = [];
  private acc = 0;
  private wantAbility = false;
  private wantSkill = false;
  private wantFinal = false;
  private wantDodge = false;
  /** A monster tapped since the last step (null: tapped again, let go). */
  private wantLock: number | null | undefined = undefined;
  /** Hit-stop: the world holds still until then (the engine's steps wait, none are lost). */
  private stopUntil = 0;
  /** Small hit-stops don't come back before then, so a flurry of hits doesn't stutter. */
  private stopCool = 0;
  /** When each frequent passive last showed (they come with almost every hit). */
  private passiveAt: Partial<Record<SpPassiveId, number>> = {};
  /** The last time each SP move went off: a wall or patch on the floor is drawn from it. */
  private spLast: Partial<Record<SpMoveId, SpEvent>> = {};
  /** The hero is drawn faint until then (Vanish). */
  private hiddenUntil = 0;
  /** You were down (a party run) last frame. */
  private heroDown = false;
  /** What the SP effects (spFx.ts) draw with. */
  private readonly kit: FxKit = {
    fade: (ms, draw, up) => this.fade(ms, draw, up),
    P: (x, y) => this.P(x, y),
    burst: (kind, n, x, y, dy, tint) => {
      const em = this[kind];
      if (tint !== undefined && kind === 'bits') em.particleTint = tint;
      this.burst(em, n, x, y, dy);
    },
    later: (ms, f) => void this.time.delayedCall(ms, f),
    shake: (ms, k) => this.shake(ms, k),
    sfx: (id, pitch) => this.sfx(id, pitch),
    ghosts: (x, y, toX, toY, color, n) => this.ghosts(x, y, toX, toY, color, n, this.actor),
    spots: (x, y, r, n) => this.spots(x, y, r, n),
    hero: () => this.run.hero,
    follow: (x, y) => {
      let best: Foe | null = null;
      for (const f of this.run.foes) if (f.alive && (!best || Math.hypot(f.x - x, f.y - y) < Math.hypot(best.x - x, best.y - y))) best = f;
      const last = { x: best?.x ?? x, y: best?.y ?? y };
      return () => {
        if (best?.alive) [last.x, last.y] = [best.x, best.y];
        return last;
      };
    },
    hide: (ms) => {
      this.hiddenUntil = Math.max(this.hiddenUntil, this.time.now + ms);
    },
    room: () => this.run.area,
  };
  /** Finals used this run: the HUD shows a small badge with the final's name when it goes up. */
  private finals = 0;
  /** Hit-stop spent in the current second: capped at STOP_BUDGET, so a burst of hits never stacks
      into stutter. */
  private stopSpent = { from: 0, ms: 0 };
  /** A red edge on the screen that beats when you're low. */
  private vignette!: Phaser.GameObjects.Image;
  /** When you were last hurt: the red edge pulses for a moment. */
  private hurtAt = -1e9;
  /** The mid-boss's state last frame, to hear it change: the Lantern's light, the Sand Golem as stone. */
  private midWas: { dim: number | null; stone: boolean } = { dim: null, stone: false };
  /** Damage numbers by the monster they belong to, so quick hits add up in one number. */
  private numberOf = new Map<Phaser.GameObjects.BitmapText, { key: number; n: number; at: number; y: number }>();
  private offered = false;
  private ended = false;
  private hudAt = 0;
  private trailAt = 0;
  private paused = false;
  /** Friends' heroes on screen, in party order after you. */
  private friends: { sprite: Phaser.GameObjects.Sprite; name: Phaser.GameObjects.Text; key: string }[] = [];
  /** A live run: the line to the server, your steps numbered, the ones it hasn't played yet, the
      ones not sent yet, and when you last answered a card. */
  private net: PlayLink | null = null;
  private follow: Follower | null = null;
  private answeredAt = -1e9;
  /** The card you last answered in a live run (`askKey`). */
  private answered = '';

  constructor(
    private setup: RunSetup,
    private bus: RunEvents,
  ) {
    super('dungeon');
    this.theme = themeFor(setup.zone.id);
    this.net = setup.net ?? null;
    if (this.net) {
      this.run = runFromStart(this.net.start, this.net.me);
      this.follow = new Follower(this.run, this.net.me);
      return;
    }
    this.run = createRun({
      zone: setup.zone,
      power: setup.power,
      classId: setup.classId,
      seed: setup.seed ?? Math.floor(Math.random() * 2 ** 31),
      autoPick: setup.fast,
      worn: setup.worn,
      build: setup.build,
      heroLevel: setup.heroLevel,
      edge: setup.edge,
      sp: setup.sp,
      // A practice run: friends come with your strength in their own class and starter kit.
      friends: setup.friends?.map((f) => ({ power: setup.power, classId: f.classId })),
      tutorial: setup.tutorial,
    });
  }

  /** An engine point on the screen: the room on its side, its door on the right. */
  private P(x: number, y: number): [number, number] {
    return [this.run.area.h - y, x];
  }

  /** The layers drawn in engine points, turned a quarter so they lie like the room on screen. */
  private turn() {
    const h = this.run.area.h;
    for (const o of [this.floorTiles, this.ground, this.walls, this.fx]) o.setRotation(Math.PI / 2).setPosition(h, 0);
  }

  /** Particles from an engine point, `dy` screen pixels below it (up when negative). */
  private burst(em: Phaser.GameObjects.Particles.ParticleEmitter, n: number, x: number, y: number, dy = 0) {
    const [X, Y] = this.P(x, y);
    em.explode(n, X, Y + dy);
  }

  /** The monster under a tap, if any (never a reflection of you: hitting those hurts). */
  private foeAt(x: number, y: number): Foe | null {
    let best: Foe | null = null,
      bd = Infinity;
    for (const f of this.run.foes) {
      const e = this.foes.get(f.id);
      if (!f.alive || !e || f.kind === 'reflection') continue;
      const d = Math.hypot(e.s.x - x, e.s.y - y),
        r = 28 * e.base + 18;
      if (d < r && d < bd) {
        bd = d;
        best = f;
      }
    }
    return best;
  }

  /** Every sheet the run loads: the run's own and each friend's. */
  private allSheets(): [string, Sheet][] {
    return [...Object.entries(this.setup.sheets), ...(this.setup.friends ?? []).flatMap((f, i): [string, Sheet][] => [[`friend${i}`, f.idle], [`friend${i}Walk`, f.walk]])];
  }

  preload() {
    for (const [key, s] of this.allSheets()) this.load.spritesheet(key, s.src, { frameWidth: s.w, frameHeight: s.h });
  }

  create() {
    this.bot = !!this.setup.autopilot;
    if (this.setup.fast) {
      // Balance tests: the whole run in one go, then only the result.
      while (!this.run.over) {
        stepRun(this.run, botInput(this.run));
        this.run.events.length = 0;
      }
      this.ended = true;
      this.sendHud();
      this.bus.end(recap(this.run));
      return;
    }
    this.makeTextures();
    for (const [key, s] of this.allSheets()) {
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, { start: 0, end: s.frames - 1 }), frameRate: 1000 / s.ms, repeat: s.loop ? -1 : 0 });
    }
    this.cameras.main.setBackgroundColor('#07080d').setRoundPixels(true);
    this.floorTiles = this.add.tileSprite(0, 0, ROOM.w, ROOM.h, 'ground').setOrigin(0).setDepth(-3);
    this.ground = this.add.graphics().setDepth(-1.5);
    // Without a renderer (a fast bot run) there's nothing to draw into: the walls stay a Graphics.
    if (this.game.renderer) {
      this.room = this.make.graphics(undefined, false);
      this.walls = this.add.renderTexture(0, 0, ROOM.w, ROOM.h).setOrigin(0).setDepth(-1);
    } else this.walls = this.room = this.add.graphics().setDepth(-1);
    this.torchFire = this.add.graphics().setDepth(-0.5);
    this.shadows = this.add.graphics().setDepth(0.5);
    this.tips = this.add.graphics().setDepth(-1.4);
    this.under = this.add.graphics().setDepth(0.6);
    this.fx = this.add.graphics().setDepth(90000);
    this.marks = this.add.graphics().setDepth(90000.5);
    // In the fog, shots, telegraphs and eyes in the dark stay drawn over it: a hit must never come
    // from nothing.
    if (zoneDungeon(this.setup.zone).sight || midBoss(this.setup.zone).kind === 'lantern') {
      this.fx.setDepth(145000);
      this.marks.setDepth(145000.5);
    }
    const fogTint = hex(this.theme.fog);
    for (let i = 0; i < 14; i++) {
      const m = this.add
        .image(Phaser.Math.Between(0, ROOM.h + 400), Phaser.Math.Between(0, ROOM.w + 100), 'mist')
        .setTint(fogTint)
        .setAlpha(0.12)
        .setScale(Phaser.Math.FloatBetween(2.5, 4.5))
        .setDepth(150000);
      this.mists.push(m);
      this.tweens.add({ targets: m, x: m.x + Phaser.Math.Between(-80, 80), duration: Phaser.Math.Between(9000, 16000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // The Fog zone: you see only a little way around you.
    // So does the Drowned Lantern's room at the lake.
    if (zoneDungeon(this.setup.zone).sight || midBoss(this.setup.zone).kind === 'lantern') this.dark = this.add.image(0, 0, 'dark').setDisplaySize(3000, 3000).setDepth(140000).setAlpha(0.94).setVisible(false);
    this.hero = this.add.sprite(...this.P(this.run.hero.x, this.run.hero.y), 'hero').play('hero').setScale(0.8);
    this.hero.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.hero.play('hero'));
    // Friends: their hero and their name over it.
    this.friends = (this.setup.friends ?? []).map((f, i) => {
      const h = this.run.party[i + 1];
      const sprite = this.add.sprite(...this.P(h.x, h.y), `friend${i}`).play(`friend${i}`).setScale(0.8);
      const name = this.add
        .text(0, 0, f.name || 'Friend', { fontFamily: 'monospace', fontSize: '11px', color: '#fde68a', stroke: '#07080d', strokeThickness: 3 })
        .setOrigin(0.5, 1);
      return { sprite, name, key: `friend${i}` };
    });
    this.puffs = this.add.particles(0, 0, 'mist', {
      emitting: false,
      speed: { min: 6, max: 26 },
      gravityY: -18,
      lifespan: { min: 380, max: 560 },
      alpha: { start: 0.45, end: 0 },
      scale: { start: 0.1, end: 0.26 },
      tint: Phaser.Display.Color.HexStringToColor(this.theme.fog).lighten(25).color,
      maxAliveParticles: FX_CAP.puffs,
    });
    this.puffs.setDepth(2);
    this.bits = this.add.particles(0, 0, 'dot', { emitting: false, speed: { min: 50, max: 170 }, gravityY: 220, lifespan: { min: 280, max: 520 }, alpha: { start: 1, end: 0 }, scale: { start: 1.3, end: 0.4 }, maxAliveParticles: FX_CAP.bits });
    this.bits.setDepth(90001);
    this.sparks = this.add.particles(0, 0, 'dot', { emitting: false, speed: { min: 60, max: 200 }, lifespan: 300, alpha: { start: 1, end: 0 }, tint: [0xfde68a, 0xfbbf24, 0xffffff], maxAliveParticles: FX_CAP.sparks });
    this.sparks.setDepth(90002);
    this.numberFonts();
    for (let i = 0; i < 40; i++) this.numbers.push(this.add.bitmapText(0, 0, 'num9', '', this.numberCell[9]).setLetterSpacing(this.numberGap[9]).setOrigin(0.5).setDepth(95000).setVisible(false));
    this.speech = this.add
      .text(0, 0, '', { fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: '#fef2f2', backgroundColor: '#0b0d14d9', padding: { x: 6, y: 5 }, align: 'center', wordWrap: { width: 190 }, lineSpacing: 4 })
      .setOrigin(0.5, 1)
      .setDepth(160000)
      .setVisible(false);
    this.pad = this.add.graphics().setScrollFactor(0).setDepth(300000);
    this.vignette = this.add.image(0, 0, 'vignette').setScrollFactor(0).setDepth(250000).setVisible(false);
    this.cameras.main.startFollow(this.hero, true, 0.14, 0.14);
    this.wearLook();
    this.newRoom();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.fitScreen());

    const kb = this.input.keyboard;
    if (kb) {
      const k = Phaser.Input.Keyboard.KeyCodes;
      // On a computer: WASD or the arrows move, Q is the class ability, Space (or E, or Shift) dodges,
      // R and F are the SP's move and final.
      this.keys = kb.addKeys({ up: k.UP, down: k.DOWN, left: k.LEFT, right: k.RIGHT, w: k.W, a: k.A, s: k.S, d: k.D }) as DungeonScene['keys'];
      // Ignored while the run holds still (a card or the bag is open), so nothing fires on the way back.
      const on = (codes: number[], act: () => void) => {
        for (const c of codes) kb.addKey(c).on('down', () => !this.paused && !this.run.hero.offer && !this.run.hero.relicOffer && !this.run.stairsAsk && act());
      };
      on([k.Q], () => (this.wantAbility = true));
      on([k.R], () => (this.wantSkill = true));
      on([k.F], () => (this.wantFinal = true));
      on([k.SPACE, k.E, k.SHIFT], () => (this.wantDodge = true));
    }
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      // A tap on a monster aims at it (again lets go); anywhere else, the move stick.
      const f = this.foeAt(p.worldX, p.worldY);
      if (f) {
        this.wantLock = this.run.hero.lock === f.id ? null : f.id;
        return;
      }
      if (!this.stick) this.stick = { id: p.id, x: p.x, y: p.y, dx: 0, dy: 0 };
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (!this.stick || p.id !== this.stick.id) return;
      const dx = p.x - this.stick.x,
        dy = p.y - this.stick.y,
        len = Math.hypot(dx, dy),
        max = 46;
      this.stick.dx = len > max ? (dx / len) * max : dx;
      this.stick.dy = len > max ? (dy / len) * max : dy;
    });
    const release = (p: Phaser.Input.Pointer) => {
      if (this.stick && p.id === this.stick.id) this.stick = null;
    };
    this.input.on(Phaser.Input.Events.POINTER_UP, release);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);
    // Anything asked of the scene before it was built (a dev skip on a slow phone) runs now.
    this.built = true;
    for (const f of this.waiting.splice(0)) f();
  }

  /** The scene is created by Phaser a moment after startRun returns (later on a busy phone).
      Calls from outside that touch rooms or sprites wait until then, so nothing is used before it exists. */
  private built = false;
  private waiting: (() => void)[] = [];
  private whenBuilt(f: () => void) {
    if (this.built) f();
    else this.waiting.push(f);
  }

  /** The screen filled, edge to edge: the room covers the whole screen both ways (no black bands),
      and the camera follows you inside it, up and down as well as along to the door on the right.
      `FIT` keeps it readable: never zoomed in so far that less than `FIT.see` of the room's height
      shows. The HUD floats over the room. */
  private fitScreen() {
    const { width, height } = this.scale.gameSize,
      cam = this.cameras.main,
      // On screen the room is as wide as the engine's is tall, and as tall as it is wide.
      { w: rh, h: rw } = this.run.area,
      { edge, hud, see } = FIT;
    // As big as it takes to cover the screen both ways, but always showing `see` of the height.
    const cover = Math.max(width / (rw + 2 * edge), (height - hud) / (rh + 2 * edge)),
      zoom = Math.min(cover, height / see);
    cam.setZoom(zoom);
    const vw = width / zoom,
      vh = height / zoom,
      // A strip above the top wall for the HUD's bars, in world points.
      top = edge + hud / zoom,
      bw = Math.max(rw + 2 * edge, vw),
      bh = Math.max(rh + top + edge, vh);
    cam.setBounds(rw / 2 - bw / 2, rh / 2 - bh / 2 - (top - edge) / 2, bw, bh);
    // You sit a little left on the screen: what's coming is ahead, to the right.
    cam.setFollowOffset(-Math.min(90, vw * 0.1), 0);
  }

  /** A new room: its size, its floor, its walls and what stands on it. */
  private newRoom() {
    const r = this.run,
      { w, h } = r.area,
      T = r.terrain;
    for (const o of this.roomBits) o.destroy();
    this.roomBits = [];
    for (const b of this.barrels.values()) b.destroy();
    this.barrels.clear();
    this.shrine = null;
    this.chest = null;
    this.stairs = null;
    this.chestCall = null;
    for (const l of this.loot.values()) [l.icon, l.name, l.beam].forEach((o) => o?.destroy());
    this.loot.clear();
    this.turn();
    this.floorTiles.setSize(w, h).setTilePosition(r.map.at * 23 + r.floor * 41, r.floor * 17);
    const n = Math.round((w * h) / 8000);
    for (let i = 0; i < n; i++) {
      const key = ['stone', 'tuft', 'bone', 'crack'][i % 4];
      this.roomBits.push(
        this.add
          .image(...this.P(Phaser.Math.Between(ROOM.wall + 10, w - ROOM.wall - 10), Phaser.Math.Between(ROOM.wall + 10, h - ROOM.wall - 10)), key)
          .setDepth(-2)
          .setScale(key === 'crack' ? 2 : 1 + (i % 3) * 0.5),
      );
    }
    for (const p of T.pillars) {
      const [X, Y] = this.P(p.x, p.y);
      this.roomBits.push(this.add.image(X, Y + p.r * 0.35, 'pillar').setOrigin(0.5, 1).setScale(p.r / 20).setDepth(Y + p.r));
    }
    for (const b of T.barrels) {
      const [X, Y] = this.P(b.x, b.y);
      this.barrels.set(b.id, this.add.image(X, Y + 6, 'barrel').setOrigin(0.5, 1).setDepth(Y));
    }
    // Torches along the long walls (on screen, the top and the bottom), each throwing a warm pool
    // of light: in pairs either side of the middle, where those walls have their doors.
    this.torches = [];
    const along: number[] = [];
    for (let d = 120; d < h / 2 - 90; d += 240) along.push(h / 2 - d, h / 2 + d);
    for (const y of along)
      for (const x of [ROOM.wall / 2, w - ROOM.wall / 2]) {
        const [X, Y] = this.P(x, y);
        this.torches.push({ x: X, y: Y });
        this.roomBits.push(this.add.image(X, Y, 'sconce').setDepth(-0.6));
        const glow = this.add.image(X, Y - 8, 'mist').setTint(hex(this.theme.glow)).setAlpha(0.22).setScale(2.6).setDepth(-0.7);
        this.tweens.add({ targets: glow, alpha: 0.32, scale: 2.8, duration: 180 + (y % 7) * 30, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.roomBits.push(glow);
      }
    if (T.shrine) {
      const [X, Y] = this.P(T.shrine.x, T.shrine.y);
      this.shrine = this.add.image(X, Y + 8, 'shrine').setOrigin(0.5, 1).setDepth(Y);
      this.roomBits.push(this.shrine);
    }
    this.summit?.destroy();
    this.summit = null;
    if (r.climb !== null) {
      const tex = this.setup.sheets.summitBoss ? 'summitBoss' : 'summit',
        sheet = this.setup.sheets[tex];
      this.summit = this.add
        .sprite(...this.P(w / 2, ROOM.wall + 64), tex)
        .play(tex)
        .setScale(sheet ? (1.9 * 64 * 0.8) / sheet.h : 1.4)
        .setAlpha(0.85)
        .setDepth(1);
      this.summit.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.summit?.play(tex));
    }
    // Back in a room you cleared: as you left it.
    if (r.doorOpen) this.cleared(false);
    this.drawRoom();
    this.fitScreen();
    const [hx, hy] = this.P(r.hero.x, r.hero.y),
      cam = this.cameras.main;
    cam.centerOn(hx + Math.min(120, (cam.width / cam.zoom) * 0.12), hy);
  }

  // ---------- textures drawn in code ----------

  private makeTextures() {
    const { zone } = this.setup;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const tex = (key: string, w: number, h: number, draw: () => void) => {
      if (this.textures.exists(key)) this.textures.remove(key);
      g.clear();
      draw();
      g.generateTexture(key, w, h);
    };
    tex('dot', 3, 3, () => g.fillStyle(0xffffff).fillRect(0, 0, 3, 3));
    tex('shadow', 64, 20, () => g.fillStyle(0x000000).fillEllipse(32, 10, 64, 20));
    if (this.textures.exists('mist')) this.textures.remove('mist');
    const mist = this.textures.createCanvas('mist', 64, 64);
    if (mist) {
      const ctx = mist.getContext(),
        grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,0.9)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      mist.refresh();
    }
    // The low-HP edge: clear in the middle, red toward the corners. Smooth, unlike the pixel art.
    if (this.textures.exists('vignette')) this.textures.remove('vignette');
    const vig = this.textures.createCanvas('vignette', 128, 128);
    if (vig) {
      const ctx = vig.getContext(),
        grad = ctx.createRadialGradient(64, 64, 34, 64, 64, 92);
      grad.addColorStop(0, 'rgba(220,38,38,0)');
      grad.addColorStop(0.55, 'rgba(220,38,38,0.35)');
      grad.addColorStop(1, 'rgba(127,29,29,0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
      vig.refresh();
      vig.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    // The fog's dark: clear around you, black past how far you see (drawn 3000 px wide).
    if (zoneDungeon(zone).sight || midBoss(zone).kind === 'lantern') {
      const sight = DARK_REF;
      if (this.textures.exists('dark')) this.textures.remove('dark');
      const dark = this.textures.createCanvas('dark', 512, 512);
      if (dark) {
        const ctx = dark.getContext(),
          k = 256 / 1500,
          grad = ctx.createRadialGradient(256, 256, sight * 0.55 * k, 256, 256, sight * k);
        grad.addColorStop(0, 'rgba(4,8,7,0)');
        grad.addColorStop(1, 'rgba(4,8,7,1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);
        dark.refresh();
        dark.setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    }
    const diamond = (w: number, h: number) => [new Phaser.Math.Vector2(w / 2, 0), new Phaser.Math.Vector2(w, h / 2), new Phaser.Math.Vector2(w / 2, h), new Phaser.Math.Vector2(0, h / 2)];
    tex('gem', 8, 10, () => {
      g.fillStyle(0x7dd3fc).fillPoints(diamond(8, 10), true);
      g.fillStyle(0xe0f2fe).fillRect(3, 2, 2, 3);
    });
    tex('gem-big', 10, 12, () => {
      g.fillStyle(0xfbbf24).fillPoints(diamond(10, 12), true);
      g.fillStyle(0xfef3c7).fillRect(4, 2, 2, 4);
    });
    tex('arrow', 16, 4, () => {
      g.fillStyle(0xd6d3d1).fillRect(0, 1, 12, 2);
      g.fillStyle(0xf8fafc).fillRect(12, 0, 2, 4).fillRect(14, 1, 2, 2);
      g.fillStyle(0xf97316).fillRect(0, 0, 3, 1).fillRect(0, 3, 3, 1);
    });
    // The SP weapons' own shots (spFx.ts): a cannonball, a fireball, a boomerang...
    for (const [w, fx] of Object.entries(WEAPON_FX)) if (fx.shot) tex(`shot-${w}`, fx.shot.w, fx.shot.h, () => fx.shot?.paint(g));
    tex('orb', 14, 14, () => {
      g.fillStyle(0xa78bfa, 0.35).fillCircle(7, 7, 7);
      g.fillStyle(0xc4b5fd).fillCircle(7, 7, 4);
      g.fillStyle(0xffffff).fillCircle(6, 6, 2);
    });
    // Monster shots: hot, round and easy to read against any ground.
    tex('bullet', 14, 14, () => {
      g.fillStyle(0xf43f5e, 0.35).fillCircle(7, 7, 7);
      if (zone.boss === 'plateau') g.fillStyle(0x1c1712).fillCircle(7, 7, 6);
      g.fillStyle(0xfb7185).fillCircle(7, 7, 5);
      g.fillStyle(0xffe4e6).fillCircle(6, 6, 2);
    });
    tex('bullet-boss', 18, 18, () => {
      g.fillStyle(0xa855f7, 0.35).fillCircle(9, 9, 9);
      g.fillStyle(0xc084fc).fillCircle(9, 9, 6);
      g.fillStyle(0xf5d0fe).fillCircle(8, 8, 3);
    });
    // On the Plateau's sandstone, warm shots get a dark rim and a bigger light core so they read.
    const rim = zone.boss === 'plateau';
    const shot = (key: string, glow: number, body: number, core: number) =>
      tex(key, 14, 14, () => {
        g.fillStyle(glow, 0.35).fillCircle(7, 7, 7);
        if (rim) g.fillStyle(0x1c1712).fillCircle(7, 7, 6);
        g.fillStyle(body).fillCircle(7, 7, 5);
        g.fillStyle(core).fillCircle(6, 6, rim ? 3 : 2);
      });
    shot('bullet-homing', 0x22d3ee, 0x67e8f9, 0xecfeff);
    shot('bullet-bounce', 0x84cc16, 0xbef264, 0xf7fee7);
    shot('bullet-ramp', 0xf97316, 0xfdba74, 0xfff7ed);
    // The Book's pages.
    tex('bullet-page', 12, 12, () => {
      g.fillStyle(0xfbbf24, 0.35).fillRect(0, 0, 12, 12);
      g.fillStyle(0xfef3c7).fillRect(2, 1, 8, 10);
      g.fillStyle(0xa16207).fillRect(3, 3, 6, 1).fillRect(3, 5, 6, 1).fillRect(3, 7, 4, 1);
    });
    // The furniture, drawn as text rows (props.ts), two texture pixels per character.
    const prop = (key: string, { rows, palette }: Prop, under?: () => void) =>
      tex(key, rows[0].length * 2, rows.length * 2, () => {
        under?.();
        rows.forEach((row, y) =>
          [...row].forEach((ch, x) => {
            const c = palette[ch];
            if (c) g.fillStyle(hex(c)).fillRect(x * 2, y * 2, 2, 2);
          }),
        );
      });
    prop('barrel', BARREL, () => g.fillStyle(0x000000, 0.3).fillEllipse(12, 25, 24, 6));
    prop('chest', CHEST, () => g.fillStyle(0x000000, 0.3).fillEllipse(15, 24, 30, 6));
    prop('chest-open', CHEST_OPEN, () => {
      g.fillStyle(0x000000, 0.3).fillEllipse(15, 24, 30, 6);
      g.fillStyle(hex(R.gold[2]), 0.25).fillEllipse(15, 8, 30, 14);
    });
    prop('sconce', SCONCE);
    prop('stairs', STAIRS);
    prop('hitspark', HIT_SPARK);
    g.destroy();
    this.themeTextures();
  }

  /** The textures that follow the zone's theme: the floor, its litter, the pillars, the shrine. */
  private themeTextures() {
    const t = this.theme,
      g = this.make.graphics({ x: 0, y: 0 }, false),
      // pebbles (dark, light), grass tufts (dark, light) and bones on the floor
      litter = t.litter ?? [t.stone[2], t.stone[4], t.stone[2], t.stone[3], t.stone[5]];
    const tex = (key: string, w: number, h: number, draw: () => void) => {
      if (this.textures.exists(key)) this.textures.remove(key);
      g.clear();
      draw();
      g.generateTexture(key, w, h);
    };
    // The stone in the props' rows ('1' darkest to '7' lightest) and their moss, in this theme.
    const prop = (key: string, { rows, palette }: Prop, under?: () => void) => {
      const pal: Record<string, string> = { ...palette, m: t.moss };
      t.stone.forEach((c, i) => (pal[String(i + 1)] = c));
      tex(key, rows[0].length * 2, rows.length * 2, () => {
        under?.();
        rows.forEach((row, y) =>
          [...row].forEach((ch, x) => {
            const c = pal[ch];
            if (c) g.fillStyle(hex(c)).fillRect(x * 2, y * 2, 2, 2);
          }),
        );
      });
    };
    const base = Phaser.Display.Color.HexStringToColor(t.ground);
    const lighter = base.clone().lighten(8).color,
      darker = base.clone().darken(5).color;
    // Flagstones: two courses of big slabs, laid so the tile repeats seamlessly. Soft edges (light
    // top-left, shade bottom-right) and thin mortar, so the floor stays quiet under the fight.
    const COURSES: [number, number, number[]][] = [
      [0, 30, [30, 30]],
      [32, 30, [14, 30, 14]],
    ];
    tex('ground', 64, 64, () => {
      const mortar = base.clone().darken(4).color,
        lit = base.clone().lighten(3).color,
        shade = base.clone().darken(2).color;
      if (t.floor === 'sandstone') {
        // Sandstone: long smooth slabs worn round at the edges, sand-layer lines running across
        // them, a few grains of sand; no chips, so it reads softer than the forges' flagstones.
        g.fillStyle(mortar).fillRect(0, 0, 64, 64);
        [
          [0, 0, 40, 20],
          [42, 0, 20, 20],
          [0, 22, 18, 20],
          [20, 22, 42, 20],
          [0, 44, 30, 18],
          [32, 44, 30, 18],
        ].forEach(([x, y, w, h], i) => {
          g.fillStyle(i % 3 ? base.color : shade).fillRect(x + 1, y, w - 2, h).fillRect(x, y + 1, w, h - 2);
          g.fillStyle(lit).fillRect(x + 1, y, w - 2, 1);
          g.fillStyle(shade).fillRect(x + 1, y + h - 1, w - 2, 1);
          g.fillStyle(i % 3 ? shade : base.color).fillRect(x + 3, y + 6 + (i % 3) * 2, w - 8, 1).fillRect(x + 6, y + 13 - (i % 2) * 2, w - 14, 1);
        });
        const rnd = new Phaser.Math.RandomDataGenerator(['sand']);
        for (let k = 0; k < 10; k++) g.fillStyle(lighter).fillRect(rnd.between(1, 62), rnd.between(1, 62), 1, 1);
        return;
      }
      g.fillStyle(mortar).fillRect(0, 0, 64, 64);
      const rnd = new Phaser.Math.RandomDataGenerator(['forma']);
      COURSES.forEach(([y, h, widths], row) => {
        let x = 0;
        widths.forEach((w, i) => {
          g.fillStyle((row + i) % 2 ? shade : base.color).fillRect(x, y, w, h);
          g.fillStyle(lit).fillRect(x, y, w - 1, 1).fillRect(x, y, 1, h - 1);
          g.fillStyle(mortar).fillRect(x + 1, y + h - 1, w - 1, 1).fillRect(x + w - 1, y + 1, 1, h - 1);
          // wear: a few chips and specks
          for (let k = 0; k < 3; k++) g.fillStyle(k % 2 ? lighter : darker).fillRect(x + rnd.between(3, w - 5), y + rnd.between(3, h - 4), rnd.between(1, 2), 1);
          x += w + 2;
        });
      });
      // one slab cracked across
      g.fillStyle(mortar).fillRect(36, 8, 5, 1).fillRect(40, 9, 4, 1).fillRect(43, 10, 4, 1).fillRect(46, 9, 3, 1);
    });
    tex('stone', 10, 7, () => {
      g.fillStyle(hex(litter[0])).fillRect(1, 2, 8, 5).fillRect(2, 1, 6, 1);
      g.fillStyle(hex(litter[1])).fillRect(2, 2, 4, 2);
    });
    tex('tuft', 9, 7, () => {
      g.fillStyle(hex(litter[2])).fillRect(1, 3, 1, 4).fillRect(4, 1, 1, 6).fillRect(7, 2, 1, 5);
      g.fillStyle(hex(litter[3])).fillRect(3, 4, 1, 3).fillRect(5, 3, 1, 4);
    });
    tex('bone', 10, 4, () => g.fillStyle(hex(litter[4])).fillRect(1, 1, 8, 2).fillRect(0, 0, 2, 4).fillRect(8, 0, 2, 4));
    tex('crack', 14, 6, () => g.fillStyle(darker).fillRect(0, 2, 5, 1).fillRect(4, 3, 4, 1).fillRect(7, 1, 4, 1).fillRect(10, 4, 4, 1));
    prop('pillar', PILLAR, () => g.fillStyle(0x000000, 0.3).fillEllipse(22, 58, 44, 12));
    prop('shrine', SHRINE_PROP, () => g.fillStyle(0x86efac, 0.18).fillCircle(18, 24, 18));
    g.destroy();
  }

  /** A hit spark from a small pool, so a storm of hits makes no garbage. */
  private sparkPool: Phaser.GameObjects.Image[] = [];
  private hitSpark(x: number, y: number, size: number) {
    let im = this.sparkPool.find((s) => !s.visible);
    if (!im) {
      if (this.sparkPool.length >= 16) return;
      im = this.add.image(0, 0, 'hitspark').setDepth(90003);
      this.sparkPool.push(im);
    }
    im.setPosition(x, y).setVisible(true).setAlpha(1).setScale(size).setAngle(Math.random() < 0.5 ? 0 : 45);
    this.tweens.add({ targets: im, scale: size * 0.3, alpha: 0, duration: 140, ease: 'Quad.easeIn', onComplete: () => im.setVisible(false) });
  }

  /** Developer mode: show the next zone's theme in this run, to preview every dungeon's look. */
  cycleTheme(): string {
    if (!this.built) return this.theme.name;
    this.theme = THEMES[(THEMES.indexOf(this.theme) + 1) % THEMES.length];
    this.themeTextures();
    this.floorTiles.setTexture('ground');
    for (const m of this.mists) m.setTint(hex(this.theme.fog));
    this.newRoom();
    return this.theme.name;
  }

  /** Walls, and the door at the top: barred until the room is clear, then open and glowing. */
  private drawRoom() {
    const g = this.room.clear(),
      W = this.run.area.w,
      H = this.run.area.h,
      w = ROOM.wall,
      door = ROOM.door,
      S = this.theme.stone.map(hex);
    // The wall's mass, then brick courses: 7px tall, staggered, a lit top edge on each brick.
    g.fillStyle(S[1]).fillRect(0, 0, W, w).fillRect(0, H - w, W, w).fillRect(0, 0, w, H).fillRect(W - w, 0, w, H);
    // A brick, cut to the wall it sits in (x0..x1) so none hangs over the edge.
    const brick = (x: number, y: number, bw: number, bh: number, x0 = 0, x1 = W) => {
      const a = Math.max(x, x0),
        b = Math.min(x + bw, x1);
      if (b - a < 2) return;
      g.fillStyle(S[2]).fillRect(a, y, b - a, bh);
      g.fillStyle(S[3]).fillRect(a, y, b - a - 1, 1);
      g.fillStyle(S[1]).fillRect(b - 1, y, 1, bh);
    };
    for (let row = 0; row < 2; row++)
      for (let x = row * -8; x < W; x += 16) {
        brick(x, row * 7, 15, 6);
        brick(x, H - w + 6 + row * 7, 15, 6);
      }
    for (let y = w, n = 0; y < H - w; y += 7, n++)
      for (const x0 of [0, W - w]) for (let x = x0 - (n % 2 ? 8 : 0); x < x0 + w; x += 12) brick(x, y, 11, 6, x0, x0 + w);
    // The top wall's face, in shadow under a lit ledge; the bottom wall's top, catching the light.
    g.fillStyle(S[4]).fillRect(w, 14, W - 2 * w, 2);
    g.fillStyle(S[0]).fillRect(w, 16, W - 2 * w, w - 16);
    g.fillStyle(S[4]).fillRect(0, H - w, W, 2);
    // Inner edges of the side walls, then the shadow the walls throw on the floor.
    g.fillStyle(S[3]).fillRect(w - 2, w, 2, H - 2 * w).fillRect(W - w, w, 2, H - 2 * w);
    g.fillStyle(0x000000, 0.28).fillRect(w, w, W - 2 * w, 10).fillRect(w, w, 6, H - 2 * w).fillRect(W - w - 6, w, 6, H - 2 * w);
    g.fillStyle(0x000000, 0.14).fillRect(w, w + 10, W - 2 * w, 8);
    // The doorways, one in each wall with a room behind it: drawn as if in the top wall, then
    // turned to their own wall. A stone frame either side; open, steps down lit by what waits
    // there; shut while monsters stand, a portcullis.
    const r = this.run,
      iron = R.iron.map(hex),
      turnTo: Record<Side, [number, number, number]> = { e: [W / 2, 0, 0], w: [W / 2, H, Math.PI], n: [0, H / 2, -Math.PI / 2], s: [W, H / 2, Math.PI / 2] },
      l = -door / 2;
    const sides = r.doorOpen ? r.doors.map((d) => d.side) : r.climb !== null ? (['e'] as Side[]) : (Object.keys(cellOf(r).links) as Side[]);
    for (const side of sides) {
      const [tx, ty, a] = turnTo[side],
        d = r.doors.find((o) => o.side === side);
      g.save();
      g.translateCanvas(tx, ty);
      g.rotateCanvas(a);
      if (r.doorOpen && d) {
        g.fillStyle(0x07080d).fillRect(l, 0, door, w);
        for (let k = 0; k < 3; k++) g.fillStyle(S[1 + k]).fillRect(l + 4 + (2 - k) * 4, 6 + k * 5, door - 8 - (2 - k) * 8, 2);
        g.fillStyle(this.doorColor(d), 0.35).fillRect(l + 6, w - 4, door - 12, 4);
      } else {
        g.fillStyle(0x0b0d14).fillRect(l, 0, door, w);
        for (let x = l + 5; x < l + door - 4; x += 10) {
          g.fillStyle(iron[1]).fillRect(x, 0, 3, w - 3);
          g.fillStyle(iron[2]).fillRect(x, 0, 1, w - 3);
          g.fillStyle(iron[1]).fillRect(x + 1, w - 3, 1, 2);
        }
        g.fillStyle(iron[0]).fillRect(l, 5, door, 2).fillRect(l, 13, door, 2);
      }
      g.fillStyle(S[4]).fillRect(l - 6, 0, 6, w).fillRect(l + door, 0, 6, w);
      g.fillStyle(S[5]).fillRect(l - 6, 0, 2, w).fillRect(l + door, 0, 2, w);
      for (let y = 5; y < w; y += 6) g.fillStyle(S[2]).fillRect(l - 6, y, 6, 1).fillRect(l + door, y, 6, 1);
      g.restore();
    }
    const rt = this.walls;
    if (rt instanceof Phaser.GameObjects.RenderTexture) {
      if (rt.width !== W || rt.height !== H) rt.resize(W, H, false);
      rt.clear().draw(g, 0, 0);
    }
  }

  /** What a door says, and its color: a door you haven't been through doesn't say what waits
      behind it; once you have, it's dim. */
  private doorLook(d: Door) {
    if (this.run.climb !== null) return { label: 'UP', color: 0xfbbf24 };
    return d.been ? { label: '', color: BEEN } : UNKNOWN;
  }
  private doorColor(d: Door) {
    return this.doorLook(d).color;
  }

  /** Items on the floor: each one's icon with its name in its rarity's color over it, and a
      beam of light over rare and legendary ones, so they're seen from across the room. */
  /** The texture of an item on the floor: its own art (src/sprites/characters/items.ts), drawn once. */
  private itemTexture(item: Item): string {
    const look = looksOf(item),
      key = `item-${look.art}-${look.rarity}-${look.seed}`;
    if (this.textures.exists(key)) return key;
    const g = drawItem(look),
      cv = this.textures.createCanvas(key, g[0].length, g.length);
    const ctx = cv?.getContext();
    if (!cv || !ctx) return key;
    paintFrames(ctx, [g]);
    cv.refresh();
    return key;
  }

  private syncLoot() {
    const r = this.run,
      now = this.time.now,
      seen = r.loot.filter((l) => mine(l, r.hero)),
      here = new Set(seen.map((l) => l.id));
    for (const [id, l] of this.loot)
      if (!here.has(id)) {
        [l.icon, l.name, l.beam].forEach((o) => o?.destroy());
        this.loot.delete(id);
      }
    for (const l of seen) {
      let v = this.loot.get(l.id);
      const [X, Y] = this.P(l.x, l.y),
        color = RARITY[l.item.rarity].color,
        c = parseInt(color.slice(1), 16);
      if (!v) {
        const big = l.item.rarity === 'rare' || l.item.rarity === 'legendary';
        v = {
          beam: big ? this.add.rectangle(X, Y - 60, 10, 120, c, 0.18).setDepth(-1.1) : null,
          icon: this.add.image(X, Y, this.itemTexture(l.item)).setDepth(-1).setScale(0.9),
          name: this.add
            .text(X, Y - 18, nameOf(l.item), { fontFamily: '"Press Start 2P", monospace', fontSize: '7px', color, stroke: '#0b0d14', strokeThickness: 3 })
            .setOrigin(0.5, 1)
            .setDepth(95000),
        };
        this.loot.set(l.id, v);
      }
      // A slow bob, and the beam breathing.
      v.icon.setY(Y - 2 + Math.round(Math.sin(now / 300 + l.id) * 2));
      v.beam?.setAlpha(0.12 + 0.1 * ((Math.sin(now / 260 + l.id) + 1) / 2));
    }
  }

  /** A room clear (or cleared before): the word over each door, the chest, the stairs down. */
  private cleared(fresh: boolean) {
    const r = this.run,
      { w: W, h: H } = r.area,
      m = ROOM.wall + 30;
    // On screen the east door is in the right wall, so its word sits just left of it, and so on.
    const at: Record<Side, [number, number, number, number]> = { e: [W / 2, m, 1, 0.5], w: [W / 2, H - m, 0, 0.5], n: [m, H / 2, 0.5, 0], s: [W - m, H / 2, 0.5, 1] };
    for (const d of r.doors) {
      const look = this.doorLook(d);
      if (!look.label) continue;
      const [x, y, ox, oy] = at[d.side];
      this.roomBits.push(
        // From the damage numbers' sheet (its 9 px size has '?' and 'UP'): a new Text here was
        // painted and uploaded right as the room cleared.
        this.add
          .bitmapText(...this.P(x, y), 'num9', look.label, this.numberCell[9])
          .setLetterSpacing(this.numberGap[9])
          .setTint(look.color)
          .setOrigin(ox, oy)
          .setDepth(96000),
      );
    }
    if (r.stairs && !this.stairs) {
      const [sx, sy] = this.P(r.stairs.x, r.stairs.y);
      this.stairs = this.add.image(sx, sy, 'stairs').setDepth(-1.5).setAngle(90).setScale(1.5);
      this.roomBits.push(this.stairs);
      if (fresh) this.puffs.explode(10, sx, sy);
      // After the boss, the stairs lead home.
      if (r.home) {
        const home = this.add
          .text(sx, sy - 40, 'HOME', { fontFamily: '"Press Start 2P", monospace', fontSize: '9px', color: '#fde68a', backgroundColor: '#0b0d14cc', padding: { x: 5, y: 4 } })
          .setOrigin(0.5, 1)
          .setDepth(150500);
        this.roomBits.push(home);
        this.tweens.add({ targets: home, y: sy - 48, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
    if (r.chest && !this.chest) {
      const [cx, cy] = this.P(r.chest.x, r.chest.y);
      this.chest = this.add.image(cx, cy + 10, !canOpen(r, r.hero) ? 'chest-open' : 'chest').setOrigin(0.5, 1).setDepth(cy);
      this.roomBits.push(this.chest);
      if (fresh) this.puffs.explode(10, cx, cy);
      // The mid-boss's chest, called out over it until it's opened.
      if (isWardenRoom(r) && canOpen(r, r.hero)) {
        this.chestCall = this.add
          .text(cx, cy - 34, 'CHEST', { fontFamily: '"Press Start 2P", monospace', fontSize: '9px', color: '#fde68a', backgroundColor: '#0b0d14cc', padding: { x: 5, y: 4 } })
          .setOrigin(0.5, 1)
          .setDepth(150500);
        this.roomBits.push(this.chestCall);
        this.tweens.add({ targets: this.chestCall, y: cy - 42, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
  }

  // ---------- the loop ----------

  update(_time: number, deltaMs: number) {
    // A live run goes on for the others while you look at the bag or the menu.
    if (this.ended || (this.paused && !this.net)) return;
    const run = this.run;
    // Hit-stop: for a few frames nothing moves, so a big hit lands. The engine's steps just wait.
    // (Not in a live run: the server's run doesn't wait.)
    if (!this.net && this.time.now < this.stopUntil) {
      this.drawFx();
      this.drawPad();
      this.drawVignette();
      return;
    }
    this.acc += Math.min(deltaMs, 100);
    let steps = 0;
    if (this.net) this.live();
    while (!this.net && this.acc >= STEP * 1000 && steps < 6) {
      this.acc -= STEP * 1000;
      steps++;
      const mine = this.myInput();
      // Friends in a practice run are played by the bot.
      const input = run.party.length > 1 ? [mine, ...run.party.slice(1).map((h) => botInput(run, h))] : mine;
      stepRun(run, input);
      for (const e of takeEvents(run)) this.react(e);
      // Friends' picks are the bot's, so the run never waits on them.
      for (const h of run.party.slice(1)) {
        if (h.offer) pick(run, this.botPick(h.offer.choices), h);
        if (h.relicOffer) pickRelic(run, h.relicOffer[0], h);
      }
      if (run.hero.offer || run.over || run.stairsAsk || this.time.now < this.stopUntil) break;
    }
    // A live run: a card the server no longer asks (someone else answered, or it picked for you).
    if (this.net && ((this.asked && !run.stairsAsk) || (this.offered && !run.hero.offer && !run.hero.relicOffer))) {
      this.asked = false;
      this.offered = false;
      this.bus.dismiss?.();
    }
    if (run.stairsAsk && !this.asked) {
      this.asked = true;
      if (this.bot) this.stairsChoice('deeper');
      else this.bus.stairs();
    }
    if (run.hero.relicOffer && !this.offered) {
      this.offered = true;
      if (this.bot) {
        this.offered = false;
        this.pickRelic(run.hero.relicOffer[0]);
      } else this.bus.relic(run.hero.relicOffer, { ...run.hero.relics });
    }
    if (run.hero.offer && !this.offered) {
      this.offered = true;
      this.sparks.explode(30, this.hero.x, this.hero.y);
      if (this.bot) {
        this.offered = false;
        return this.pick(this.botPick(run.hero.offer.choices));
      }
      music.sting('levelup');
      this.bus.levelUp(run.hero.offer.choices, { ...run.hero.ups }, run.hero.offer.free);
    }
    this.sync();
    this.syncLoot();
    this.drawFx();
    this.drawPad();
    this.drawVignette();
    if (this.time.now >= this.hudAt) {
      this.hudAt = this.time.now + 100;
      this.sendHud();
    }
    if (run.over && !this.ended) {
      this.ended = true;
      this.net?.close();
      // The boss's last words: beaten, at peace, or the mountain still above you.
      if ((run.over.won && !run.home) || run.climb !== null) {
        this.speak(this.setup.lines?.end, 3000);
        this.syncSpeech();
      }
      this.sendHud();
      if (run.over.won && !run.home) this.cameras.main.flash(600, 255, 240, 200);
      else this.hero.setTint(0x6b7280);
      this.time.delayedCall(run.home ? 300 : run.over.won ? 1200 : 900, () => this.bus.end(recap(run)));
    }
  }

  /** What you press this step (the bot's, on autopilot). Buttons count once. */
  private myInput(): Input {
    const input: Input = this.bot ? botInput(this.run) : { ...this.stickInput(), ability: this.wantAbility, skill: this.wantSkill, final: this.wantFinal, dodge: this.wantDodge, lock: this.wantLock };
    this.wantAbility = false;
    this.wantSkill = false;
    this.wantFinal = false;
    this.wantDodge = false;
    this.wantLock = undefined;
    // A live run doesn't stop for your bag or menu: you just stand still.
    return this.paused ? { x: 0, y: 0, ability: false } : input;
  }

  /** A live run, each frame: put in what the server sent, play your steps it hasn't yet on top
      of it, then what you press now, and send that (src/game/net/follow.ts). Only the server's
      events are played (sounds, hits, new rooms), so nothing happens twice. */
  private live() {
    const net = this.net!,
      f = this.follow!,
      run = this.run,
      now = this.time.now;
    const events = f.take(net.take(), now);
    if (events.length || now - this.answeredAt < ANSWER_MS) {
      if (now - this.answeredAt < ANSWER_MS) {
        const h = run.hero;
        if (h.offer && askKey('pick', h.offer.choices) === this.answered) h.offer = null;
        if (h.relicOffer && askKey('relic', h.relicOffer) === this.answered) h.relicOffer = null;
        if (this.answered === 'stairs') run.stairsAsk = false;
      }
      for (const e of events) this.react(e);
    }
    let steps = 0;
    while (this.acc >= STEP * 1000 && steps < 6) {
      this.acc -= STEP * 1000;
      steps++;
      for (const e of f.press(this.myInput(), now)) this.react(e);
    }
    const out = f.outgoing(now);
    if (out) net.send({ t: 'in', steps: out });
    f.place(now);
  }

  /** A live run: tell the server, and hold off its next few asks of the same card. */
  private answer(m: Up, asked: string) {
    this.net!.send(m);
    this.answeredAt = this.time.now;
    this.answered = asked;
  }

  private botPick(choices: UpgradeId[]): UpgradeId {
    return BOT_PICKS.find((id) => choices.includes(id)) ?? choices[0];
  }

  /** The floor's map as far as you know it, for the minimap: the rooms you've been in, and the
      ones you've seen through a door. Turned like the screen: east is to the right. */
  private miniMap(): MiniMap {
    const { cells, at } = this.run.map;
    return {
      at,
      cells: cells
        .filter((c) => c.seen)
        .map((c) => ({ id: c.id, x: c.gx, y: c.gy, kind: c.kind, been: c.visited, links: (Object.entries(c.links) as [Side, number][]).filter(([, to]) => cells[to].seen).map(([s]) => s) })),
    };
  }

  private stickInput() {
    let x = 0,
      y = 0;
    if (this.stick) {
      x = this.stick.dx / 46;
      y = this.stick.dy / 46;
      if (Math.hypot(x, y) < 0.15) x = y = 0;
    } else if (this.keys) {
      const k = this.keys;
      x = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
      y = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    }
    // The stick pushes on the screen; the engine's room stands up: screen right is its up.
    return { x: y, y: -x };
  }

  /** The boss says something: a bubble over it for a few seconds. Empty lines are skipped. */
  private speak(text: string | undefined, ms = 2800, from: Foe | null = null) {
    if (!text?.trim()) return;
    this.speaker = from ? { foe: from, x: from.x, y: from.y } : null;
    this.speech.setText(from ? `${midBoss(this.setup.zone).name.replace(/^the/, 'The')}\n${text}` : text).setVisible(true);
    this.speechUntil = this.time.now + ms;
    this.tauntAt = Math.max(this.tauntAt, this.time.now + ms + 9000);
  }

  /** Keeps the bubble over whoever speaks, and lets the boss taunt now and then mid-fight. */
  private syncSpeech() {
    const r = this.run,
      now = this.time.now,
      who = r.boss?.alive ? r.boss : r.climb !== null && this.summit ? this.summit : null;
    // A mid-boss's line: over it while it stands, where it fell after.
    if (this.speaker && now < this.speechUntil && !r.boss?.alive) {
      const sp = this.speaker;
      if (sp.foe.alive) [sp.x, sp.y] = [sp.foe.x, sp.foe.y];
      const [X, Y] = this.P(sp.x, sp.y),
        size = 32 * (this.foes.get(sp.foe.id)?.base ?? 1),
        cam = this.cameras.main,
        // Near the top of the screen the HUD covers what's above it: hang the bubble below instead.
        below = Y - size - 6 - this.speech.height < cam.worldView.y + 70 / cam.zoom;
      this.speech.setOrigin(0.5, below ? 0 : 1).setPosition(clampX(X, r.area.h), below ? Y + size + 8 : Y - size - 6);
      return;
    }
    if (who && now >= this.tauntAt && !r.over && this.setup.lines?.taunts.length) {
      const t = this.setup.lines.taunts;
      this.speak(t[this.taunt++ % t.length]);
      this.tauntAt = now + 13000;
    }
    if (now >= this.speechUntil || !who) {
      if (now >= this.speechUntil) this.speech.setVisible(false);
      if (!who) return;
    }
    this.speech.setOrigin(0.5, 1);
    const [X, Y] = who === this.summit ? [this.summit.x, this.summit.y] : this.P(who.x, who.y),
      top = who === this.summit ? Y - 70 : Y - 32 * (this.foes.get(r.boss?.id ?? -1)?.base ?? 1) - 6;
    this.speech.setPosition(clampX(X, this.run.area.h), Math.max(ROOM.wall + 24, top));
  }

  /** A boss's look right now (or a Mirror image's, which looks just like it): its zone's art in the
      stage its fight is in, or its stand-in until that art is loaded. */
  private bossLook(f: Foe): Look {
    const which = this.setup.zone.boss,
      art = BOSS_ART[which],
      key = art?.stages[bossStage(which, f)],
      sheet = key ? this.setup.sheets[key] : undefined;
    if (!art || !key || !sheet) return looks(f.kind === 'image' ? 'boss' : f.kind, this.setup.zone);
    return { tex: key, scale: (art.size * 64 * 0.8) / sheet.h, bits: art.bits };
  }

  /** The boss (or the mid-boss) plays its attack once, when it has one. */
  private bossAttack(b: Foe | null = this.run.boss) {
    const e = b && this.foes.get(b.id),
      now = this.time.now;
    if (!e || now < e.attackAt) return;
    const key = `${e.tex}Attack`;
    if (!this.anims.exists(key)) return;
    e.attackAt = now + 1400;
    e.s.play(key);
    e.s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => e.s.active && e.s.play(e.tex));
  }

  /** A camera shake, unless the system asks for less motion. */
  private shake(ms: number, intensity: number) {
    if (!reducedMotion()) this.cameras.main.shake(ms, intensity);
  }

  /** The Knight's plates flying off where he's hit. */
  private plates(x: number, y: number, n: number) {
    this.bits.particleTint = 0xe2e8f0;
    this.burst(this.bits, n, x, y, -6);
    this.bits.particleTint = 0x94a3b8;
    this.burst(this.bits, Math.ceil(n / 2), x, y, -6);
  }

  /** The mid-boss's sounds that come from its state, not from an event: the Lantern's light
      sinking a step, the Sand Golem setting to stone. */
  private hearMid(wd: Foe | null) {
    const r = this.run,
      dim = wd?.alive && wd.kind === 'lantern' ? r.dim : null,
      stone = !!wd?.alive && hardened(r, wd);
    const was = this.midWas;
    if (dim !== null && was.dim !== null && Math.floor(dim / 60) < Math.floor(was.dim / 60)) this.sfx('dim', 0.8 + dim / DIM.full);
    if (wd && stone && !was.stone) {
      this.sfx('thud', 0.8);
      this.burst(this.puffs, 6, wd.x, wd.y, wd.def.r);
    }
    this.midWas = { dim, stone };
  }

  /** A one-shot sprite where a boss ends (the Mirror shattering, the Hollow letting go). */
  private bossGone(key: BossSheetKey, x: number, y: number) {
    const art = BOSS_ART[this.setup.zone.boss],
      sheet = this.setup.sheets[key];
    if (!sheet || !art) return;
    const b = this.run.boss,
      e = b && this.foes.get(b.id);
    e?.s.setVisible(false);
    const [X, Y] = this.P(x, y),
      s = this.add.sprite(X, Y, key).setScale((art.size * 64 * 0.8) / sheet.h).setDepth(Y + 1).play(key);
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.tweens.add({ targets: s, alpha: 0, duration: 500, onComplete: () => s.destroy() }));
  }

  /** The boss's bar. The Plateau's never moves; the Hollow's fills while you stand in its light. */
  private bossBar(): Hud['boss'] {
    const b = this.run.boss;
    if (!b || this.run.home) return null;
    const which = this.setup.zone.boss;
    if (this.setup.tutorial) return { hp: Math.max(0, b.hp), max: b.maxHp };
    if (which === 'plateau') return { hp: b.hp > 0 ? b.maxHp : 0, max: b.maxHp, label: 'It looks the same' };
    if (which === 'hollow') return { hp: this.run.hold, max: LIGHT.hold, label: b.phase === 2 ? 'Stand in its light' : 'Wait for its light' };
    return { hp: Math.max(0, b.hp), max: b.maxHp };
  }

  /** Hands the page the HUD only when something on it changed, and keeps the parts that didn't
      the same objects, so the page redraws only what moved. */
  private sendHud() {
    const next = this.hud(),
      last = this.lastHud;
    if (last) {
      let same = true;
      for (const k of Object.keys(next) as (keyof Hud)[]) {
        const a = last[k],
          b = next[k];
        if (a === b) continue;
        if (a && b && typeof a === 'object' && JSON.stringify(a) === JSON.stringify(b)) (next as unknown as Record<string, unknown>)[k] = a;
        else same = false;
      }
      if (same) return;
    }
    this.lastHud = next;
    this.bus.hud(next);
  }
  private lastHud: Hud | null = null;

  private hud(): Hud {
    const r = this.run;
    return {
      ping: this.follow?.ping ?? null,
      hp: Math.max(0, Math.ceil(r.hero.hp)),
      maxHp: r.hero.maxHp,
      xp: r.hero.xp,
      xpNext: xpToNext(r.hero.level),
      level: r.hero.level,
      seconds: Math.floor(r.t),
      kills: r.hero.kills,
      boss: this.bossBar(),
      climb: r.climb,
      warden: r.warden?.alive ? { hp: Math.max(0, r.warden.hp), max: r.warden.maxHp, phase: r.warden.phase } : null,
      wardenFloor: wardenFloor(r.layout) >= 0 ? wardenFloor(r.layout) + 1 : null,
      floor: r.floor + 1,
      floors: r.layout.floors,
      ability: { id: r.hero.ability, ready: hundredths(abilityReady(r, r.hero)) },
      sp: r.hero.sp ? { skill: r.hero.sp.skill, skillReady: hundredths(skillReady(r, r.hero)), final: r.hero.sp.final, finalReady: hundredths(finalReady(r.hero)), finals: this.finals } : null,
      dodge: hundredths(Math.min(1, 1 - (r.hero.dodgeAt - r.t) / DODGE.cd)),
      cleared: r.cleared,
      relics: { ...r.hero.relics },
      map: this.miniMap(),
      gear: { worn: { ...r.hero.gear.worn }, bag: [...r.hero.gear.bag] },
    };
  }

  /** The hero's light: the best-forged thing they wear shines (a glow from +4, sparks from +10; the
      sprite's own aura grows with it, see drawHero), and a worn legendary burns with red flames.
      Still with reduced motion. */
  private wearLook() {
    const worn = Object.values(this.run.hero.gear.worn).filter((x): x is Item => !!x),
      top = worn.reduce<Item | null>((b, x) => ((x.plus ?? 0) > (b?.plus ?? 0) ? x : b), null),
      band = top ? bandOf(top.plus ?? 0) : 0,
      legend = worn.some((x) => x.rarity === 'legendary'),
      key = band * 2 + (legend ? 1 : 0);
    if (key === this.plusLook.band && (key === 0 || this.plusLook.aura || this.plusLook.fire)) return;
    this.plusLook.aura?.destroy();
    this.plusLook.fire?.destroy();
    for (const e of this.plusLook.fx) e.destroy();
    this.plusLook = { band: key, aura: null, fire: null, fx: [] };
    const color = top && glowOf(top),
      still = reducedMotion();
    if (top && color && band) {
      const tint = hex(color);
      const aura = this.add.image(this.hero.x, this.hero.y, 'mist').setTint(tint).setAlpha(0.18 + 0.06 * band).setScale(1.4 + 0.25 * band).setBlendMode(Phaser.BlendModes.ADD);
      if (!still) this.tweens.add({ targets: aura, alpha: aura.alpha * 0.55, scale: aura.scale * 1.08, duration: 1100 - 120 * band, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.plusLook.aura = aura;
      if (!still && BANDS[band].sparks) {
        const e = this.add.particles(0, 0, 'dot', { speed: { min: 10, max: 40 }, lifespan: 600, frequency: band >= 4 ? 70 : 140, alpha: { start: 0.9, end: 0 }, scale: { start: 0.9, end: 0.2 }, tint: [tint, 0xffffff], emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 16) } as Phaser.Types.GameObjects.Particles.EmitZoneData, maxAliveParticles: 24 });
        e.startFollow(this.hero).setDepth(90000);
        this.plusLook.fx.push(e);
      }
    }
    if (legend) {
      // A red glow under the hero, like the plus's, that breathes fast.
      const fire = this.add.image(this.hero.x, this.hero.y, 'mist').setTint(0xef4444).setAlpha(0.5).setScale(2.4).setBlendMode(Phaser.BlendModes.ADD);
      if (!still) this.tweens.add({ targets: fire, alpha: 0.28, scale: 2.6, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.plusLook.fire = fire;
    }
    if (legend && !still) {
      const sparks = this.add.particles(0, 0, 'dot', { speed: { min: 10, max: 40 }, lifespan: 600, frequency: 70, alpha: { start: 0.9, end: 0 }, scale: { start: 0.9, end: 0.2 }, tint: [0xef4444, 0xffffff], emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 16) } as Phaser.Types.GameObjects.Particles.EmitZoneData, maxAliveParticles: 24 });
      const flames = this.add.particles(0, 0, 'mist', { speedY: { min: -60, max: -30 }, speedX: { min: -8, max: 8 }, lifespan: 520, frequency: 35, alpha: { start: 0.7, end: 0 }, scale: { start: 0.3, end: 0.05 }, tint: [0xef4444, 0xfbbf24], blendMode: Phaser.BlendModes.ADD, emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-10, -6, 20, 16) } as Phaser.Types.GameObjects.Particles.EmitZoneData, maxAliveParticles: 30 });
      for (const e of [sparks, flames]) {
        e.startFollow(this.hero).setDepth(90000);
        this.plusLook.fx.push(e);
      }
    }
  }

  /** Every sprite to where the engine says its thing is. */
  private sync() {
    const r = this.run,
      now = this.time.now,
      h = this.hero;
    // The hero: steps while moving (the walk clip lifts each foot in turn), a slight lean into the
    // way it goes, blinking while untouchable after a hit. An attack plays over either.
    const moving = Math.hypot(r.hero.vx, r.hero.vy) > 5,
      // A live run: a small correction from the server glides away instead of a jump.
      off = this.follow?.off ?? { x: 0, y: 0 },
      [hx, hy] = this.P(r.hero.x + off.x, r.hero.y + off.y),
      // How fast you go across the screen: the engine's up is the screen's right.
      across = -r.hero.vy,
      playing = h.anims.currentAnim?.key;
    h.setPosition(hx, hy).setDepth(hy);
    this.plusLook.aura?.setPosition(hx, hy + 4).setDepth(hy - 1);
    this.plusLook.fire?.setPosition(hx, hy + 4).setDepth(hy - 1);
    if (moving) {
      if (Math.abs(across) > 5) h.setFlipX(across < 0);
      h.setAngle(Math.sign(across) * 3);
      if (playing === 'hero' && this.anims.exists('heroWalk')) h.play('heroWalk');
      // Running through a cleared room: quicker steps and a thicker trail of dust.
      h.anims.timeScale = r.cleared ? 1.8 : 1;
      if (now >= this.trailAt) {
        this.trailAt = now + (r.cleared ? 90 : 240);
        this.puffs.explode(1, hx, hy + 24);
      }
    } else {
      h.setAngle(0);
      if (playing === 'heroWalk') h.play('hero');
      h.anims.timeScale = 1;
    }
    const blink = r.t < r.hero.hurtUntil || r.t < r.hero.ghostUntil;
    // Unseen (Vanish): faint and still, over any blink.
    h.setAlpha(now < this.hiddenUntil ? 0.22 + 0.06 * Math.sin(now / 90) : blink ? (Math.floor(now / 80) % 2 ? 0.35 : 1) : 1);
    // You, down in a party: grey on the ground until a friend gets you up.
    const down = r.hero.hp <= 0 && r.party.length > 1;
    if (down) h.setTint(0x6b7280).setAlpha(0.5).setAngle(90);
    else if (this.heroDown) h.clearTint().setAngle(0);
    this.heroDown = down;
    // Friends: where they are, walking or still; grey and faded while down.
    this.friends.forEach((f, i) => {
      const o = r.party[i + 1],
        [fx, fy] = this.P(o.x, o.y),
        walking = Math.hypot(o.vx, o.vy) > 5,
        want = walking && this.anims.exists(`${f.key}Walk`) ? `${f.key}Walk` : f.key;
      f.sprite.setPosition(fx, fy).setDepth(fy);
      if (Math.abs(o.vy) > 5) f.sprite.setFlipX(-o.vy < 0);
      if (f.sprite.anims.currentAnim?.key !== want) f.sprite.play(want);
      if (o.hp <= 0) f.sprite.setTint(0x6b7280).setAlpha(0.5).setAngle(90);
      else f.sprite.clearTint().setAlpha(r.t < o.hurtUntil ? (Math.floor(now / 80) % 2 ? 0.35 : 1) : 1).setAngle(0);
      f.name.setPosition(fx, fy - 46).setDepth(fy + 1);
    });

    // Monsters.
    const seen = new Set<number>();
    for (const f of r.foes) {
      if (!f.alive) continue;
      seen.add(f.id);
      let e = this.foes.get(f.id);
      if (!e) {
        const look = f.kind === 'boss' || f.kind === 'image' ? this.bossLook(f) : looks(f.kind, this.setup.zone);
        const s = this.add.sprite(...this.P(f.x, f.y), look.tex).play(look.tex).setScale(look.scale);
        if (f.kind === 'reflection') s.setTint(0xfde68a);
        else if (look.tint) s.setTint(look.tint);
        e = { s, base: look.scale * (f.elite ? ELITE.r : 1), born: now, squash: 0, flash: 0, tex: look.tex, attackAt: 0 };
        this.foes.set(f.id, e);
      }
      // A boss changes as its fight goes: the Knight's plates fall, the Plateau cracks.
      if (f === r.boss) {
        const look = this.bossLook(f);
        const stage = bossStage(this.setup.zone.boss, f);
        if (stage > this.stage) {
          this.stage = stage;
          this.speak(this.setup.lines?.stages[stage - 1]);
        }
        if (look.tex !== e.tex) {
          e.tex = look.tex;
          e.base = look.scale;
          e.s.play(look.tex);
          for (const c of look.bits) {
            this.bits.particleTint = c;
            this.burst(this.bits, 14, f.x, f.y);
          }
          this.shake(200, 0.006);
          // Half the Knight's armor goes at once; the Plateau splits further.
          if (this.setup.zone.boss === 'knight') {
            this.sfx('crash');
            this.shake(320, 0.01);
            this.hitStop(60);
            buzz([20, 30, 20]);
            this.plates(f.x, f.y, 18);
          } else if (this.setup.zone.boss === 'plateau') this.sfx('crack', 0.75);
        }
      }
      const { s, base } = e,
        [fx, fy] = this.P(f.x, f.y);
      // The Drowned Lantern burns over its own dark.
      s.setPosition(fx, fy).setDepth(f.kind === 'lantern' ? 141000 : fy);
      // Monsters face left; across the screen is the engine's up.
      if (Math.abs(f.vy) > 2) s.setFlipX(f.vy < 0);
      const born = (now - e.born) / RISE_MS;
      if (born < 1) s.setAlpha(born).setScale(base * (1.25 - 0.25 * born), base * (0.25 + 0.75 * born));
      else if (now < e.squash) s.setAlpha(1).setScale(base * 1.22, base * 0.8);
      else s.setAlpha(1).setScale(base * (aboutToFire(f, r.t) ? 1.14 : 1));
      if (e.flash && now >= e.flash) {
        e.flash = 0;
        const tint = f.kind === 'reflection' ? 0xfde68a : f.kind === 'boss' || f.kind === 'image' ? undefined : looks(f.kind, this.setup.zone).tint;
        if (tint) s.setTint(tint);
        else if (f === r.boss && r.t < f.windUntil) s.setTint(0xff6b6b);
        else s.clearTint();
      }
      // A ram glowing before its charge; a shade fading out before it lands.
      if (f.kind === 'ram' && !e.flash) s.setTint(r.t < f.windUntil && Math.floor(now / 90) % 2 ? 0xff4d4d : (looks('ram', this.setup.zone).tint ?? 0xffffff));
      if (f.kind === 'shade') s.setAlpha(r.t < f.windUntil ? 0.25 : 1);
      // The Sand Golem set to stone while it stands; the Whisper flickering white before it trades places.
      if (f === r.warden && f.kind === 'sandGolem') {
        const tex = hardened(r, f) ? 'sandGolemMidStone' : 'sandGolemMid';
        if (e.tex !== tex) s.play((e.tex = tex));
      }
      if (f === r.warden && !e.flash && f.kind === 'whisper') {
        if (r.t < f.windUntil && Math.floor(now / 90) % 2) s.setTint(0xffffff);
        else s.clearTint();
      }
      if (f === r.boss && r.t < f.windUntil && !e.flash) s.setTint(0xff6b6b);
      else if (f === r.boss && !e.flash && f.kind === 'boss' && s.isTinted && r.t >= f.dashUntil) s.clearTint();
    }
    for (const [id, e] of this.foes)
      if (!seen.has(id)) {
        e.s.destroy();
        this.foes.delete(id);
      }
    this.syncSpeech();
    if (this.bossLabel && r.boss?.alive) {
      const [bx, by] = this.P(r.boss.x, r.boss.y);
      this.bossLabel.setPosition(bx, by - 34 * BOSS_LOOKS[this.setup.zone.boss].scale);
      if (this.setup.zone.boss === 'tomorrow') {
        const far = Math.hypot(r.boss.x - r.hero.x, r.boss.y - r.hero.y) > 200;
        this.bossLabel.setText(far ? 'Zzz... later...' : '');
      }
    }

    this.syncMap(this.bullets, r.bullets, (b) => this.add.image(...this.P(b.x, b.y), b.boss && b.style === 'plain' ? 'bullet-boss' : SHOT_TEX[b.style]).setDepth(this.dark ? 145000 : 80000), (img, b) => {
      if (b.style === 'wiggle') img.setRotation(r.t * 6 + b.id);
    });
    for (const b of r.terrain.barrels)
      if (!b.alive && this.barrels.has(b.id)) {
        this.barrels.get(b.id)!.destroy();
        this.barrels.delete(b.id);
      }
    if (this.shrine && r.terrain.shrine?.used) this.shrine.setTint(0x57534e);
    this.syncMap(this.shots, r.shots, (s) => this.add.image(...this.P(s.x, s.y), shotTexture(s)).setDepth(80001), (img, s) => {
      // An SP weapon's shot may spin (a boomerang, Reap's scythe); the rest point the way they fly.
      const spin = s.look && WEAPON_FX[s.look].shot?.spin;
      img.setRotation(spin ? (now / 1000) * spin : Math.atan2(s.vy, s.vx) + Math.PI / 2);
    });
    this.syncMap(this.gems, r.gems, (g) => this.add.image(...this.P(g.x, g.y), g.value >= 3 ? 'gem-big' : 'gem').setDepth(1));

    // Friends on the climb, and the Summit looming over it.
    while (this.allies.length < r.allies.length) {
      const a = r.allies[this.allies.length],
        tex = this.setup.sheets[a.kind] ? a.kind : 'echo';
      this.allies.push(this.add.sprite(...this.P(a.x, a.y), tex).play(tex).setScale(0.72).setData('kind', a.kind));
    }
    this.allies.forEach((s, i) => {
      const a = r.allies[i],
        [ax, ay] = this.P(a.x, a.y);
      s.setPosition(ax, ay).setDepth(ay).setFlipX(hx < ax);
    });
    if (this.dark) {
      const sight = sightNow(r);
      this.dark.setVisible(sight !== null);
      if (sight !== null) this.dark.setPosition(hx, hy).setDisplaySize((3000 * sight) / DARK_REF, (3000 * sight) / DARK_REF);
    }
    // Your flame's fires, circling you.
    while (this.flames.length < r.hero.flames) this.flames.push(this.add.sprite(hx, hy, 'ember').play('ember').setScale(0.42));
    this.flames.forEach((fl, i) => {
      const a = r.hero.orbit + (i / Math.max(1, r.hero.flames)) * Math.PI * 2;
      fl.setPosition(...this.P(r.hero.x + Math.cos(a) * FLAME_RING, r.hero.y + Math.sin(a) * FLAME_RING));
      fl.setDepth(fl.y + 1);
    });

    // Shadows are pictures from a pool, not shapes: a Graphics ellipse is cut into triangles anew
    // each frame, for every monster.
    let n = 0;
    const shadow = (x: number, y: number, w: number, h: number) => {
      const im = (this.shadowPool[n++] ??= this.add.image(0, 0, 'shadow').setAlpha(0.3).setDepth(0.5));
      im.setPosition(x, y).setDisplaySize(w, h).setVisible(true);
    };
    shadow(hx, hy + 22, 30, 9);
    for (const f of r.foes)
      if (f.alive) {
        const [X, Y] = this.P(f.x, f.y);
        shadow(X, Y + f.def.r + 6, f.def.r * 2.6, f.def.r * 0.8);
      }
    for (let i = n; i < this.shadowPool.length && this.shadowPool[i].visible; i++) this.shadowPool[i].setVisible(false);
    // Elites stand on a gold ring.
    const g = this.shadows.clear().lineStyle(2, 0xfbbf24, 0.8);
    for (const f of r.foes)
      if (f.alive && f.elite) {
        const [X, Y] = this.P(f.x, f.y);
        g.strokeEllipse(X, Y + f.def.r + 4, f.def.r * 3, f.def.r);
      }
  }

  private shadowPool: Phaser.GameObjects.Image[] = [];

  private syncMap<T extends { id: number; x: number; y: number }>(
    map: Map<number, Phaser.GameObjects.Image>,
    list: T[],
    make: (t: T) => Phaser.GameObjects.Image,
    each?: (img: Phaser.GameObjects.Image, t: T) => void,
  ) {
    const seen = new Set<number>();
    for (const t of list) {
      seen.add(t.id);
      let img = map.get(t.id);
      if (!img) {
        img = make(t);
        map.set(t.id, img);
      }
      img.setPosition(...this.P(t.x, t.y));
      each?.(img, t);
    }
    for (const [id, img] of map)
      if (!seen.has(id)) {
        img.destroy();
        map.delete(id);
      }
  }

  // ---------- what happened: light, sparks, sound ----------

  /** The hero whose move is being drawn (the SP looks' afterimages are theirs). */
  private actor!: Phaser.GameObjects.Sprite;

  private react(e: GameEvent) {
    const now = this.time.now;
    this.actor = this.spriteOf(byOf(e));
    switch (e.type) {
      case 'attack': {
        // Facing the blow across the screen (the engine's up is the screen's right). A friend's
        // blow turns their hero, never yours.
        if (this.mine(byOf(e))) this.hero.play('heroAttack');
        this.spriteOf(byOf(e)).setFlipX(Math.sin(e.angle) > 0);
        this.sfx(SFX[e.kind]);
        // the swing or shot of the weapon in hand (spFx.ts)
        attackFx(this.kit, e, this.spAura());
        break;
      }
      case 'hit': {
        const ent = this.foes.get(e.id);
        if (ent) {
          ent.s.setTintFill(0xffffff);
          ent.flash = now + 50;
          ent.squash = now + 90;
        }
        this.burst(this.sparks, e.dmg >= 30 ? 6 : 2, e.x, e.y, -6);
        // a pixel star where the blow lands: pops big, shrinks away
        const [sx, sy] = this.P(e.x, e.y);
        this.hitSpark(sx, sy - 6, e.crit ? 2 : e.dmg >= 30 ? 1.6 : 1.1);
        const knight = e.boss && this.setup.zone.boss === 'knight',
          mid = this.run.warden?.id === e.id ? this.run.warden : null;
        if (knight) {
          // Each hit takes one plate: a clink, higher as fewer are left, and the plate flies off.
          const b = this.run.boss;
          this.sfx('clink', b ? 0.9 + 0.35 * (1 - b.hp / b.maxHp) : 1);
          this.plates(e.x, e.y, 3);
        } else if (e.dmg === 0 && mid?.kind === 'sandGolem') {
          this.sfx('thud');
          this.shake(90, 0.004);
          this.burst(this.puffs, 3, e.x, e.y, 10);
        } else this.sfx(e.boss ? 'bossHit' : 'hit');
        if (mid?.kind === 'lantern') {
          // Every hit on the Lantern brings some light back.
          this.sfx('brighten');
          const { x, y } = e;
          this.fade(260, (g, p) => g.lineStyle(3 * (1 - p) + 1, 0xe0f2fe, 0.8 * (1 - p)).strokeCircle(x, y, 24 + 40 * p));
        }
        // The Plateau never shows what a hit did.
        if (e.dmg === 0) {
          // It glanced off (the Sand Golem as stone): a grey ring, no number.
          const { x, y } = e;
          this.fade(220, (g, p) => g.lineStyle(3 * (1 - p) + 1, 0xd6d3d1, 0.9 * (1 - p)).strokeCircle(x, y - 6, 10 + 16 * p));
        } else if (!(e.boss && this.setup.zone.boss === 'plateau')) this.number(e.x, e.y, 18, e.dmg, e.crit ? CRIT_COLOR : undefined, e.crit ? undefined : e.id);
        if (e.dmg >= 30) this.hitStop(40, true);
        break;
      }
      case 'kill': {
        const look = looks(e.kind, this.setup.zone);
        const boss = e.kind === 'boss',
          huge = boss || MID_KINDS.has(e.kind),
          big = huge || e.kind === 'golem' || e.elite,
          R = 30 * look.scale * (e.elite ? ELITE.r : 1),
          x = e.x,
          y = e.y;
        // The body pops: a white flash of its own shape that bursts wide and flat, then is gone.
        const ent = this.foes.get(e.id);
        if (ent) {
          this.foes.delete(e.id);
          const s = ent.s.setTintFill(0xffffff).setAlpha(1);
          this.tweens.add({ targets: s, scaleX: s.scaleX * 1.7, scaleY: s.scaleY * 0.35, alpha: 0, duration: huge ? 380 : 190, ease: 'Quad.easeOut', onComplete: () => s.destroy() });
        }
        for (const c of look.bits) {
          this.bits.particleTint = c;
          this.burst(this.bits, huge ? 36 : big ? 16 : 8, x, y);
        }
        this.burst(this.sparks, huge ? 30 : big ? 12 : 4, x, y);
        this.fade(huge ? 700 : big ? 380 : 260, (g, p) => {
          g.fillStyle(0xffffff, 0.6 * (1 - p)).fillCircle(x, y, R * (0.5 + 0.5 * p));
          g.lineStyle(4 * (1 - p) + 1, 0xffffff, 0.9 * (1 - p)).strokeCircle(x, y, R * (0.6 + 1.4 * p));
          if (big) g.lineStyle(2, look.bits[0], 0.7 * (1 - p)).strokeCircle(x, y, R * (0.8 + 2.4 * p));
        });
        // the Splitter bursts into its three Splitlings
        if (e.kind === 'splitter') {
          const [X, Y] = this.P(x, y),
            pop = this.add.sprite(X, Y, 'splitterPop').setScale(look.scale).setDepth(Y).play('splitterPop');
          pop.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => pop.destroy());
        }
        if (big) {
          buzz(huge ? [30, 40, 50] : 25);
          this.cameras.main.shake(huge ? 320 : 160, huge ? 0.01 : 0.006);
          this.hitStop(huge ? 70 : 60);
        }
        if (e.kind === 'image' || e.kind === 'reflection' || (boss && this.setup.zone.boss === 'mirror')) {
          // A copy (or the Mirror itself) breaks like glass.
          this.sfx('glass', boss ? 0.7 : e.kind === 'image' ? 1 : 1.2);
          this.bits.particleTint = 0xe0f2fe;
          this.burst(this.bits, boss ? 30 : 12, x, y);
          this.fade(boss ? 500 : 240, (g, p) => {
            for (let i = 0; i < 6; i++) {
              const a = (i / 6) * Math.PI * 2 + 0.4,
                r0 = R * (0.3 + 1.2 * p);
              g.lineStyle(2, 0xffffff, 0.9 * (1 - p)).lineBetween(x + Math.cos(a) * r0 * 0.5, y + Math.sin(a) * r0 * 0.5, x + Math.cos(a) * r0, y + Math.sin(a) * r0);
            }
          });
        }
        this.sfx('kill', big ? 0.6 : e.kind === 'wisp' ? 1.3 : 1);
        if (boss) {
          // Gone for good: the room stays up after the boss (the stairs home), and sync must not
          // write to a destroyed label (that froze the game after Tomorrow fell).
          this.bossLabel?.destroy();
          this.bossLabel = null;
        }
        if (boss && this.setup.zone.boss === 'mirror') this.bossGone('mirrorBossShatter', x, y);
        if (MID_KINDS.has(e.kind)) this.cameras.main.flash(300, 255, 180, 90);
        break;
      }
      case 'hurt': {
        // A friend hit: their hero flashes and their number shows; the stop, the shake, the buzz
        // and the red edge are only for you.
        const who = this.spriteOf(e.hero);
        who.setTintFill(0xff6b6b);
        this.time.delayedCall(90, () => !this.run.over && who.clearTint());
        if (this.mine(e.hero)) {
          buzz(40);
          this.hitStop(70);
          this.cameras.main.shake(120, 0.006);
          // A red pulse at the screen's edge, not a full-screen flash: easy on small screens.
          this.hurtAt = this.time.now;
          this.sfx('hurt');
        }
        this.bits.particleTint = 0xef4444;
        this.burst(this.bits, 6, e.x, e.y);
        this.number(e.x, e.y, 26, e.dmg, '#fca5a5');
        break;
      }
      case 'shoot':
        this.burst(this.sparks, e.boss ? 3 : 1, e.x, e.y);
        if (e.boss && this.run.boss && e.x === this.run.boss.x && e.y === this.run.boss.y) {
          this.bossAttack();
          // On the lake, the one that shoots is the real Mirror: a ripple marks it as it fires.
          if (this.setup.zone.boss === 'mirror') {
            const [bx, by] = this.P(this.run.boss.x, this.run.boss.y);
            this.fade(260, (g, p) => g.lineStyle(2, 0x7dd3fc, 0.8 * (1 - p)).strokeEllipse(bx, by + 18, 34 + 16 * p, 10 + 5 * p), true);
          }
        }
        // The mid-boss winds up its own attack as it fires.
        const mid = this.run.warden;
        if (mid?.alive && e.x === mid.x && e.y === mid.y) this.bossAttack(mid);
        break;
      case 'split':
        this.speak(this.setup.lines?.stages[0]);
        break;
      case 'crack': {
        // The Plateau cracks: stone chips and a dull knock, and nothing else changes.
        const { x, y } = e;
        this.sfx('crack', 1 + 0.08 * e.n);
        this.shake(140, 0.005);
        this.hitStop(40);
        this.bits.particleTint = 0xd9b47a;
        this.burst(this.bits, 10, x, y);
        this.burst(this.puffs, 3, x, y, 10);
        this.fade(300, (g, p) => g.lineStyle(2, 0xfef3c7, 0.8 * (1 - p)).lineBetween(x - 10 + 4 * e.n, y - 20, x + 6 - 3 * e.n, y + 10));
        break;
      }
      case 'shatter': {
        const { x, y } = e;
        this.sfx('shatter');
        buzz([40, 30, 60, 30, 80]);
        this.hitStop(90);
        this.shake(900, 0.02);
        if (!reducedMotion()) this.cameras.main.flash(500, 255, 240, 200);
        this.burst(this.puffs, 20, x, y, 10);
        for (const c of [0xd9b47a, 0x8f6b3d, 0xfef3c7]) {
          this.bits.particleTint = c;
          this.burst(this.bits, 60, x, y);
        }
        this.fade(1000, (g, p) => g.lineStyle(10 * (1 - p) + 1, 0xfef3c7, 1 - p).strokeCircle(x, y, 30 + 300 * p));
        break;
      }
      case 'light': {
        const { x, y } = e;
        this.speak(this.setup.lines?.stages[e.on ? 0 : 1]);
        if (e.on) {
          this.sfx('nova', 0.8);
          this.bossAttack();
          this.fade(500, (g, p) => g.lineStyle(4 * (1 - p) + 1, 0xfef3c7, 1 - p).strokeCircle(x, y, LIGHT.r * (0.4 + 0.6 * p)));
        }
        break;
      }
      case 'hand': {
        const { x, y } = e;
        this.bossGone('hollowBossFade', x, y);
        this.sfx('nova', 1.2);
        this.fade(1400, (g, p) => {
          g.fillStyle(0xfef3c7, 0.4 * (1 - p)).fillCircle(x, y, LIGHT.r * (1 + 2 * p));
          g.lineStyle(3, 0xffffff, 1 - p).strokeCircle(x, y, LIGHT.r * (1 + 3 * p));
        });
        break;
      }
      case 'ledge': {
        const st = this.setup.lines?.stages ?? [];
        this.speak(st[Math.min(e.height - 1, st.length - 1)]);
        this.bus.say(e.height === 1 ? 'Higher. That counts already: any height is a win.' : 'Higher.');
        this.summit?.play(this.anims.exists('summitBossAttack') ? 'summitBossAttack' : 'summitBoss');
        // A ledge climbed: a rising chime, and light rising off you.
        this.sfx('chime', 1 + 0.06 * Math.min(4, e.height - 1));
        buzz(20);
        const [hx, hy] = this.P(this.run.hero.x, this.run.hero.y);
        this.sparks.explode(14, hx, hy - 10);
        this.fade(
          600,
          (g, p) => {
            g.lineStyle(3 * (1 - p) + 1, 0xfde68a, 0.9 * (1 - p)).strokeCircle(hx, hy - 40 * p, 16 + 30 * p);
            g.fillStyle(0xfef3c7, 0.5 * (1 - p)).fillRect(hx - 1, hy - 20 - 60 * p, 2, 14);
          },
          true,
        );
        break;
      }
      case 'help': {
        const { x, y, toX, toY } = e;
        if (e.kind === 'vela') {
          // Vela's lamp: a warm ring that clears the shots around you.
          this.sfx('nova', 1.3);
          this.fade(450, (g, p) => {
            g.fillStyle(0xfde68a, 0.18 * (1 - p)).fillCircle(toX, toY, 110 * p);
            g.lineStyle(3 * (1 - p) + 1, 0xfde68a, 0.9 * (1 - p)).strokeCircle(toX, toY, 110 * p);
          });
          this.fade(300, (g, p) => g.lineStyle(2, 0xfde68a, 0.6 * (1 - p)).lineBetween(x, y - 16, toX, toY));
        }
        if (e.kind === 'mira') this.sfx('stomp', 1.1);
        const a = this.allies.find((o) => o.getData('kind') === e.kind);
        if (a) this.tweens.add({ targets: a, y: a.y - 6, duration: 90, yoyo: true });
        break;
      }
      case 'burst': {
        const color = { nova: 0xf8fafc, orb: 0xa78bfa, wave: 0xfbbf24, fire: 0xf97316, ability: 0x7dd3fc }[e.color],
          { x, y, r: R } = e;
        if (e.color === 'nova') this.sfx('nova');
        if (e.color === 'wave') this.sfx('wave');
        this.fade(260, (g, p) => {
          g.lineStyle(5 * (1 - p) + 1, color, 0.8 * (1 - p)).strokeCircle(x, y, R * (0.3 + 0.7 * p));
          g.fillStyle(color, 0.12 * (1 - p)).fillCircle(x, y, R * (0.3 + 0.7 * p));
        });
        if (e.color === 'wave') {
          // the monk's wave hits the floor: a second, white shock ring and dust kicked out
          this.fade(320, (g, p) => {
            const q = Math.max(0, p * 1.3 - 0.3);
            g.lineStyle(3 * (1 - p) + 1, 0xfffbeb, 0.9 * (1 - p)).strokeCircle(x, y, R * (0.15 + 0.85 * q));
          });
          this.burst(this.puffs, 8, x, y, 8);
        }
        break;
      }
      case 'chain': {
        const zig = e.points.map((p, i) => (i === 0 ? p : { x: p.x + Phaser.Math.Between(-6, 6), y: p.y + Phaser.Math.Between(-6, 6) }));
        this.sfx('spark');
        this.fade(140, (g, p) => {
          g.lineStyle(3, 0x67e8f9, 1 - p);
          for (let i = 1; i < zig.length; i++) g.lineBetween(zig[i - 1].x, zig[i - 1].y, zig[i].x, zig[i].y);
        });
        break;
      }
      case 'ability': {
        const { x, y, toX, toY } = e;
        this.sfx(e.id === 'volley' ? 'arrow' : e.id === 'still' || e.id === 'shock' ? 'nova' : 'dash');
        if (this.mine(byOf(e))) this.cameras.main.shake(100, 0.004);
        if (e.id === 'charge' || e.id === 'blink') {
          // the charge leaves a trail of you in steel blue; the blink, a violet you and a puff of stars where you land
          const blink = e.id === 'blink';
          this.ghosts(x, y, toX, toY, blink ? 0xc4b5fd : 0x7dd3fc, blink ? 2 : 4, this.spriteOf(byOf(e)));
          this.fade(300, (g, p) => g.lineStyle(10 * (1 - p) + 2, blink ? 0xc4b5fd : 0x7dd3fc, 0.6 * (1 - p)).lineBetween(x, y, toX, toY));
          this.burst(this.puffs, 10, x, y, 10);
          if (blink) {
            this.burst(this.sparks, 10, toX, toY, -6);
            this.fade(320, (g, p) => star(g, ...this.P(toX, toY - 0), 6 + 14 * p, 0xe9d5ff, 1 - p), true);
          }
        }
        if (e.id === 'volley') {
          // the arrows leave a fan of streaks
          this.fade(240, (g, p) => {
            g.lineStyle(2, 0xe0f2fe, 0.7 * (1 - p));
            for (let i = 0; i < 12; i++) {
              const a = (i / 12) * Math.PI * 2,
                r0 = 18 + 60 * p;
              g.lineBetween(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * (r0 + 22), y + Math.sin(a) * (r0 + 22));
            }
          });
        }
        if (e.id === 'still') {
          // a lotus of light opens under you, then the ring goes out
          this.fade(700, (g, p) => {
            const open = Math.min(1, p * 2.5),
              a = 0.8 * (1 - p);
            for (let i = 0; i < 8; i++) {
              const t = (i / 8) * Math.PI * 2 + p * 0.6,
                px = x + Math.cos(t) * 16 * open,
                py = y + Math.sin(t) * 16 * open;
              g.fillStyle(i % 2 ? 0xbbf7d0 : 0x86efac, a).fillEllipse(px, py, 22 * open + 2, 9 * open + 2);
            }
            g.fillStyle(0xfef9c3, a).fillCircle(x, y, 6 * open);
          });
          this.fade(500, (g, p) => g.lineStyle(4, 0x86efac, 0.8 * (1 - p)).strokeCircle(x, y, 30 + 120 * p));
        }
        if (e.id === 'shock') {
          this.burst(this.puffs, 14, x, y, 10);
          this.fade(380, (g, p) => {
            g.lineStyle(6 * (1 - p) + 1, 0x7dd3fc, 0.9 * (1 - p)).strokeCircle(x, y, 20 + 90 * p);
            g.fillStyle(0x7dd3fc, 0.15 * (1 - p)).fillCircle(x, y, 20 + 90 * p);
          });
        }
        break;
      }
      case 'sp': {
        // An SP move: its sound and look are in spFx.ts. A final shakes the room; its name shows
        // as a small badge in the HUD (finals), so nothing covers the fight.
        const { final } = e;
        // A friend's move shows, but only your own shakes the screen and fills your badge.
        const own = this.mine(byOf(e));
        if (own) this.shake(final ? 260 : 120, final ? 0.01 : 0.005);
        if (final && own) {
          buzz(30);
          this.finals++;
          this.hitStop(120);
          if (!reducedMotion()) this.cameras.main.flash(250, 255, 236, 200);
        }
        this.spLast[e.id] = e;
        spFx(this.kit, e, this.spAura());
        break;
      }
      case 'passive':
        this.passive(e.id, e.x, e.y);
        break;
      case 'dodge': {
        if (this.mine(byOf(e))) buzz(12);
        const { x, y, toX, toY } = e;
        this.sfx('dash', 1.3);
        this.burst(this.puffs, 6, x, y, 18);
        // Afterimages along the way: you were there, and now you're not.
        this.ghosts(x, y, toX, toY, 0x7dd3fc, 3, this.spriteOf(byOf(e)));
        this.fade(220, (g, p) => g.lineStyle(6 * (1 - p) + 1, 0xe0f2fe, 0.5 * (1 - p)).lineBetween(x, y, toX, toY));
        break;
      }
      case 'warden':
        this.cameras.main.flash(400, 120, 60, 20);
        this.cameras.main.shake(600, 0.007);
        this.sfx('roar', 1.15);
        break;
      case 'phase': {
        const { x, y } = e;
        this.bossAttack(this.run.warden);
        this.hitStop(70);
        this.sfx('roar', 0.9);
        this.cameras.main.shake(400, 0.01);
        this.cameras.main.flash(250, 160, 50, 10);
        this.bits.particleTint = 0xf97316;
        this.burst(this.bits, 30, x, y);
        this.fade(600, (g, p) => g.lineStyle(8 * (1 - p) + 1, 0xf97316, 0.9 * (1 - p)).strokeCircle(x, y, 40 + 200 * p));
        break;
      }
      case 'heal':
        this.number(e.x, e.y, 30, e.n, HEAL);
        this.bits.particleTint = 0x86efac;
        this.burst(this.bits, 16, e.x, e.y);
        break;
      case 'gem':
        this.sfx('gem');
        break;
      case 'spawn':
        this.burst(this.puffs, 5, e.x, e.y, 20);
        if (e.kind === 'golem' || MID_KINDS.has(e.kind)) {
          this.sfx('stomp');
          this.cameras.main.shake(180, 0.004);
        }
        break;
      case 'room':
        this.chestCall = null;
        this.cameras.main.fadeIn(250, 7, 8, 13);
        this.newRoom();
        break;
      case 'boom': {
        const { x, y, r: R } = e;
        this.sfx('stomp', 1.2);
        this.cameras.main.shake(140, 0.006);
        this.bits.particleTint = 0xf97316;
        this.burst(this.bits, 14, x, y);
        this.burst(this.puffs, 8, x, y);
        this.fade(380, (g, p) => {
          g.fillStyle(0xfde68a, 0.5 * (1 - p)).fillCircle(x, y, R * (0.3 + 0.5 * p));
          g.lineStyle(4 * (1 - p) + 1, 0xf97316, 0.9 * (1 - p)).strokeCircle(x, y, R * (0.4 + 0.6 * p));
        });
        break;
      }
      case 'blink': {
        this.burst(this.puffs, 8, e.x, e.y, 10);
        this.burst(this.puffs, 8, e.toX, e.toY, 10);
        this.sfx('dash', 0.8);
        break;
      }
      case 'wind':
        this.sfx('stomp', 1.6);
        break;
      case 'repair': {
        const { x, y } = e;
        this.sfx('clank');
        this.shake(100, 0.003);
        this.bossAttack(this.run.warden);
        for (const f of this.run.foes)
          if (f.alive && f !== this.run.warden) {
            this.bits.particleTint = 0x86efac;
            this.burst(this.bits, 6, f.x, f.y);
            this.burst(this.sparks, 2, f.x, f.y, -6);
          }
        this.fade(400, (g, p) => g.lineStyle(3, 0x86efac, 0.8 * (1 - p)).strokeCircle(x, y, 20 + 60 * p));
        break;
      }
      case 'swap': {
        const { x, y, toX, toY } = e;
        this.sfx('whoosh');
        this.bossAttack(this.run.warden);
        this.burst(this.puffs, 4, x, y);
        this.burst(this.puffs, 4, toX, toY);
        this.fade(300, (g, p) => g.lineStyle(3 * (1 - p) + 1, 0xc4b5fd, 0.7 * (1 - p)).lineBetween(x, y, toX, toY));
        break;
      }
      case 'gust': {
        const { x, y } = e;
        this.sfx('gust');
        this.bossAttack(this.run.warden);
        this.shake(300, 0.004);
        this.burst(this.puffs, 10, x, y, 10);
        this.fade(700, (g, p) => g.lineStyle(6 * (1 - p) + 1, 0xe2e8f0, 0.6 * (1 - p)).strokeCircle(x, y, 40 + 420 * p));
        break;
      }
      case 'shrine': {
        const { x, y } = e;
        this.sfx('nova', 1.4);
        this.fade(700, (g, p) => g.lineStyle(3, 0x86efac, 0.9 * (1 - p)).strokeCircle(x, y - 10, 14 + 60 * p));
        this.bus.say('The shrine restores you.');
        break;
      }
      case 'won': {
        // The boss's last words and a flash of light; the run ends on the stairs home.
        this.speak(this.setup.lines?.end, 3000);
        this.syncSpeech();
        this.cameras.main.flash(600, 255, 240, 200);
        this.sfx('chime', 1);
        break;
      }
      case 'clear': {
        const r = this.run;
        this.drawRoom();
        this.sfx('nova', 0.7);
        this.cleared(true);
        // The first dungeon shows its own tip for the door and the stairs.
        if (this.setup.tutorial) break;
        if (r.home) this.bus.say('The boss is down. Pick up what it left, then take the stairs home.');
        else if (r.chest && isWardenRoom(r)) this.bus.say(`${midBoss(this.setup.zone).name.replace(/^the/, 'The')} left a chest. Open it, then take the stairs.`);
        else if (r.stairs) this.bus.say('Room clear. The stairs go down, or look round the floor first.');
        else this.bus.say(r.chest ? 'Room clear. Open the chest.' : 'Room clear. Pick a door: you only know what waits behind it once you go in.');
        break;
      }
      case 'drop': {
        const big = e.item.rarity === 'rare' || e.item.rarity === 'legendary';
        this.burst(this.sparks, big ? 24 : 8, e.x, e.y, -6);
        if (big) this.sfx('gem', e.item.rarity === 'legendary' ? 0.5 : 0.8);
        break;
      }
      case 'mat':
        this.burst(this.sparks, e.mat === 'thread' ? 6 : 18, e.x, e.y, -6);
        this.sfx('gem', e.mat === 'thread' ? 1.5 : 0.7);
        if (e.mat !== 'thread') this.bus.say(`${MATS[e.mat].name}! Mira can use this.`);
        break;
      case 'loot':
        this.sfx('gem', 1.3);
        this.bus.loot(e.item);
        break;
      case 'chest':
        this.chestCall?.destroy();
        this.chestCall = null;
        this.chest?.setTexture('chest-open');
        this.burst(this.sparks, 30, e.x, e.y, -10);
        this.sfx('gem', 0.6);
        break;
      case 'relic':
        this.bus.say(`${RELICS[e.id].name}: ${RELICS[e.id].text}`);
        break;
      case 'ward': {
        const { x, y } = e;
        this.sfx('bossHit', 1.6);
        this.fade(400, (g, p) => g.lineStyle(4 * (1 - p) + 1, 0x7dd3fc, 1 - p).strokeCircle(x, y, 22 + 30 * p));
        break;
      }
      case 'evade': {
        // A hit that missed: a quick pale blur where you stood.
        const { x, y } = e;
        this.fade(260, (g, p) => g.lineStyle(2, 0xe2e8f0, 0.8 * (1 - p)).strokeCircle(x, y, 14 + 12 * p));
        break;
      }
      case 'floor':
        this.bus.floor(e.floor + 1);
        break;
      case 'boss': {
        const b = this.run.boss;
        // No taunts before its first words.
        this.tauntAt = this.time.now + 12000;
        // The Summit's climb has no boss to fight: just the call, and your friends beside you.
        if (!b) {
          this.cameras.main.flash(400, 200, 210, 230);
          this.sfx('roar', 0.8);
          this.bus.boss();
          this.time.delayedCall(4600, () => this.speak(this.setup.lines?.enter, 3200));
          break;
        }
        // Its first words once the boss card has gone.
        this.time.delayedCall(4600, () => this.speak(this.setup.lines?.enter, 3200));
        this.bossLabel = this.add
          .text(...this.P(b.x, b.y), '', { fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: '#fecaca', stroke: '#0b0d14', strokeThickness: 3, align: 'center' })
          .setOrigin(0.5, 1)
          .setDepth(96000);
        this.cameras.main.flash(400, 60, 20, 90);
        this.cameras.main.shake(700, 0.008);
        this.sfx('roar');
        this.bus.boss();
        break;
      }
      case 'dash': {
        const { x, y, toX, toY } = e;
        this.sfx('dash');
        this.fade(700, (g, p) => g.lineStyle(10, 0xef4444, 0.15 + 0.3 * p).lineBetween(x, y, toX, toY));
        break;
      }
      case 'shout': {
        const { x, y } = e;
        this.sfx('roar', 1.3);
        this.cameras.main.shake(300, 0.006);
        this.bossLabel?.setText('NOT GOOD ENOUGH!');
        this.time.delayedCall(1800, () => this.bossLabel?.setText(''));
        this.fade(500, (g, p) => g.lineStyle(6 * (1 - p) + 1, 0xfecaca, 0.8 * (1 - p)).strokeCircle(x, y, 40 + 220 * p));
        break;
      }
      case 'say':
        this.bus.say(e.text);
        break;
      case 'midSay':
        if (this.run.warden) this.speak(e.text, 3400, this.run.warden);
        break;
    }
  }

  /** A floating number. Quick hits on the same monster (`key`) add up in one number instead of
      piling up, and a new number steps above the ones already floating there. */
  /** A mid-boss's tell, drawn over the room each frame. */
  private drawMid(f: Foe, now: number) {
    const r = this.run,
      g = this.fx,
      p = (Math.sin(now / 150) + 1) / 2;
    switch (f.kind) {
      case 'lantern':
        // Its own light reaches through its dark: you always see where it is.
        g.fillStyle(0x7dd3fc, 0.1 + 0.08 * p).fillCircle(f.x, f.y, 46);
        g.lineStyle(2, 0xe0f2fe, 0.35 + 0.25 * p).strokeCircle(f.x, f.y, 30);
        break;
      case 'foreman': {
        // Threads to its crew, brighter as it gets ready to mend; grey while a hit holds it off.
        const guarded = r.t - f.hitAt < CREW.guard,
          ready = Math.min(1, Math.max(0, 1 - (f.act - r.t) / CREW.every));
        for (const o of r.foes) if (o.alive && o !== f) g.lineStyle(2, guarded ? 0x94a3b8 : 0x86efac, guarded ? 0.15 : 0.1 + 0.5 * ready).lineBetween(f.x, f.y, o.x, o.y);
        if (guarded) g.lineStyle(3, 0xe2e8f0, 0.6).strokeCircle(f.x, f.y, f.def.r + 8);
        break;
      }
      case 'sandGolem':
        if (hardened(r, f)) g.lineStyle(3, 0xa8a29e, 0.5 + 0.3 * p).strokeCircle(f.x, f.y, f.def.r + 10);
        else {
          const [X, Y] = this.P(f.x, f.y);
          this.under.fillStyle(0xe8c48a, 0.14).fillEllipse(X, Y + f.def.r, f.def.r * 2.6, f.def.r);
        }
        break;
      case 'whisper':
        if (r.t < f.windUntil) {
          const w = r.foes.find((o) => o.id === f.dashX && o.alive);
          for (const o of w ? [f, w] : [f]) g.lineStyle(2, 0xc4b5fd, 0.5 + 0.4 * p).strokeCircle(o.x, o.y, 22 - 6 * p);
        }
        break;
      case 'gale': {
        const winding = f.windUntil > 0 && r.t < f.windUntil,
          blowing = f.windUntil > 0 && r.t >= f.windUntil && r.t < f.dashUntil;
        if (!winding && !blowing) break;
        // The drop at the room's edge, where the gust bites, and the wind streaming off the Gale.
        const { w, h } = r.area,
          e = ROOM.wall + GALE.edge;
        g.lineStyle(3, 0xf87171, blowing ? 0.5 + 0.3 * p : 0.25).strokeRect(e, e, w - 2 * e, h - 2 * e);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + now / 900,
            d0 = 40 + ((now / (blowing ? 3 : 8) + i * 37) % 160);
          g.lineStyle(2, 0xe2e8f0, blowing ? 0.5 : 0.2).lineBetween(f.x + Math.cos(a) * d0, f.y + Math.sin(a) * d0, f.x + Math.cos(a) * (d0 + 26), f.y + Math.sin(a) * (d0 + 26));
        }
        break;
      }
    }
  }

  /** The damage numbers' digits, white on a dark edge, drawn once in the pixel font at both sizes
      (9 and 11 px) and tinted per number: a text object would paint and upload a new picture on
      every hit. If the font isn't in yet, they're drawn again once it is. */
  private numberGap: Record<number, number> = { 9: 0, 11: 0 };
  /** Each size's cell width: the font's own size, so its digits are drawn one to one. */
  private numberCell: Record<number, number> = { 9: 9, 11: 11 };
  private numberFonts() {
    const chars = '0123456789+?UP',
      font = (size: number) => `${size}px "Press Start 2P", monospace`,
      bake = () => {
        for (const size of [9, 11]) {
          const key = `num${size}`,
            probe = document.createElement('canvas').getContext('2d');
          if (!probe) return;
          probe.font = font(size);
          const step = Math.ceil(probe.measureText('0').width),
            cw = step + 4,
            ch = size + 6;
          if (this.textures.exists(key)) this.textures.remove(key);
          const tex = this.textures.createCanvas(key, cw * chars.length, ch);
          if (!tex) return;
          const ctx = tex.getContext();
          ctx.font = font(size);
          ctx.textBaseline = 'alphabetic';
          ctx.lineWidth = 3;
          ctx.lineJoin = 'round';
          ctx.strokeStyle = '#0b0d14';
          ctx.fillStyle = '#ffffff';
          [...chars].forEach((c, i) => {
            ctx.strokeText(c, i * cw + 2, size + 2);
            ctx.fillText(c, i * cw + 2, size + 2);
          });
          tex.refresh();
          this.cache.bitmapFont.remove(key);
          this.cache.bitmapFont.add(key, Phaser.GameObjects.RetroFont.Parse(this, { image: key, width: cw, height: ch, chars, charsPerRow: chars.length, 'spacing.x': 0, 'spacing.y': 0, 'offset.x': 0, 'offset.y': 0, lineSpacing: 0 }));
          this.numberGap[size] = step - cw;
          this.numberCell[size] = cw;
        }
        for (const t of this.numbers) {
          const size = t.font === 'num11' ? 11 : 9;
          t.setFont(t.font, this.numberCell[size]).setLetterSpacing(this.numberGap[size]);
        }
      };
    bake();
    try {
      if (!document.fonts.check(font(9))) void document.fonts.load(font(9)).then(() => this.sys.isActive() && bake());
    } catch {
      // No font loading API: the numbers stay as drawn.
    }
  }

  /** A number floating `lift` pixels above an engine point. */
  private number(ex: number, ey: number, lift: number, n: number, color?: string, key?: number) {
    const now = this.time.now,
      [x, Y] = this.P(ex, ey),
      y = Y - lift;
    if (key !== undefined)
      for (const [t, o] of this.numberOf)
        if (o.key === key && t.visible && now - o.at < 220) {
          o.n += n;
          o.at = now;
          this.showNumber(t, t.x, o.y, o.n, color, true);
          return;
        }
    const t = this.numbers.find((x) => !x.visible);
    if (!t) return;
    let at = y;
    for (let i = 0; i < 4 && this.numbers.some((o) => o !== t && o.visible && Math.abs(o.x - x) < 24 && Math.abs(o.y - at) < 11); i++) at -= 12;
    const px = x + (at === y ? Phaser.Math.Between(-5, 5) : Phaser.Math.Between(6, 12) * (Math.round((y - at) / 12) % 2 ? 1 : -1));
    if (key !== undefined) this.numberOf.set(t, { key, n, at: now, y: at });
    else this.numberOf.delete(t);
    this.showNumber(t, px, at, n, color, false);
  }

  private showNumber(t: Phaser.GameObjects.BitmapText, x: number, y: number, n: number, color: string | undefined, again: boolean) {
    const big = n >= 30,
      size = big ? 11 : 9;
    this.tweens.killTweensOf(t);
    if (t.font !== `num${size}`) t.setFont(`num${size}`, this.numberCell[size]).setLetterSpacing(this.numberGap[size]);
    t.setText(color === HEAL ? `+${n}` : String(n))
      .setTint(hex(color ?? (big ? '#fbbf24' : '#ffffff')))
      .setPosition(x, y)
      .setVisible(true)
      .setAlpha(1)
      .setScale(big || again ? 1.35 : 1);
    this.tweens.add({ targets: t, y: y - (big ? 24 : 16), scale: 1, duration: 140, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: big ? 380 : 260, duration: 260, onComplete: () => t.setVisible(false) });
  }

  /** Afterimages of you from one point to another, filled with one color. */
  /** An event is about your own hero (or no hero in particular). */
  private mine(id: number | undefined): boolean {
    return id === undefined || id === this.run.hero.id;
  }

  /** The sprite of the hero with this id on this screen: yours, or a friend's. */
  private spriteOf(id: number | undefined): Phaser.GameObjects.Sprite {
    if (this.mine(id)) return this.hero;
    const i = this.run.party.findIndex((h) => h.id === id);
    return this.friends[i - 1]?.sprite ?? this.hero;
  }

  private ghosts(x: number, y: number, toX: number, toY: number, color: number, n = 3, who = this.hero) {
    for (let i = 0; i < n; i++) {
      const k = i / n,
        [gx, gy] = this.P(x + (toX - x) * k, y + (toY - y) * k),
        ghost = this.add
          .image(gx, gy, who.texture.key, who.frame.name)
          .setScale(who.scaleX, who.scaleY)
          .setFlipX(who.flipX)
          .setTintFill(color)
          .setAlpha(0.55 - (i * 0.4) / n)
          .setDepth(gy - 1);
      this.tweens.add({ targets: ghost, alpha: 0, duration: 260 + i * 60, onComplete: () => ghost.destroy() });
    }
  }

  /** Where each final's flurry lands, round (x, y): the monsters in reach first, then spots near you. */
  private spots(x: number, y: number, r: number, n: number): [number, number][] {
    const out: [number, number][] = this.run.foes
      .filter((f) => f.alive && Math.hypot(f.x - x, f.y - y) < r)
      .slice(0, n)
      .map((f) => [f.x, f.y]);
    while (out.length < n) {
      const a = Math.random() * Math.PI * 2,
        d = 30 + Math.random() * (Math.min(r, 260) - 30);
      out.push([x + Math.cos(a) * d, y + Math.sin(a) * d]);
    }
    return out;
  }

  /** The colors of the SP you wear (dark, middle, light), for its moves on screen. */
  private spAura(): Aura {
    const [a, b, c] = spLook(this.setup.classId ?? 'warrior', this.run.hero.sp?.n ?? 1).aura.map(hex);
    return [a, b, c];
  }

  /** An SP's passive going off: a monster catching fire, a tailwind, a split star, the flow, and the rest. */
  private passive(id: SpPassiveId, x: number, y: number) {
    const [c0, c1, c2] = this.spAura(),
      [X, Y] = this.P(x, y),
      ring = (ms: number, color: number, from: number, to: number) => this.fade(ms, (g, p) => g.lineStyle(3 * (1 - p) + 1, color, 0.9 * (1 - p)).strokeCircle(x, y, from + (to - from) * p));
    // Some come with almost every hit: show those at most a few times a second.
    const often = id === 'flow' || id === 'bedrock' || id === 'static' || id === 'frostbite' || id === 'harvest';
    if (often) {
      if (this.time.now < (this.passiveAt[id] ?? 0)) return;
      this.passiveAt[id] = this.time.now + (id === 'static' || id === 'frostbite' ? 150 : 450);
    }
    switch (id) {
      case 'embers':
        this.bits.particleTint = 0xf97316;
        this.burst(this.bits, 6, x, y, -4);
        ring(260, 0xfb923c, 10, 26);
        break;
      case 'tailwind':
        ring(320, 0x9fe0d0, 14, 54);
        break;
      case 'splitstar':
        this.fade(260, (g, p) => star(g, X, Y, 5 + 8 * p, 0xfff3b0, 1 - p), true);
        break;
      case 'flow':
        this.fade(500, (g, p) => {
          g.fillStyle(0x7dd3fc, 0.9 * (1 - p)).fillCircle(X + 8, Y - 18 - 22 * p, 3);
          g.fillTriangle(X + 5, Y - 18 - 22 * p, X + 11, Y - 18 - 22 * p, X + 8, Y - 25 - 22 * p);
          g.lineStyle(2, 0x60b0f0, 0.6 * (1 - p)).strokeEllipse(X, Y + 18, 26 + 16 * p, 8 + 4 * p);
        }, true);
        break;
      case 'harvest':
        // a leaf drifts up off you
        this.fade(600, (g, p) => {
          g.fillStyle(0x4ade80, 1 - p).fillEllipse(X - 8 + 6 * Math.sin(p * 6), Y - 20 - 26 * p, 7, 4);
        }, true);
        break;
      case 'frostbite':
        ring(300, 0xbfdbfe, 8, 24);
        this.bits.particleTint = 0xe0f2fe;
        this.burst(this.bits, 4, x, y, -4);
        break;
      case 'static':
        this.fade(200, (g, p) => {
          g.lineStyle(2, c2, 1 - p).lineBetween(X - 8, Y - 14, X, Y - 4).lineBetween(X, Y - 4, X - 4, Y + 2).lineBetween(X - 4, Y + 2, X + 6, Y + 12);
        }, true);
        break;
      case 'sunburst':
        ring(360, c1, 20, 90);
        this.fade(360, (g, p) => g.fillStyle(c2, 0.2 * (1 - p)).fillCircle(x, y, 90 * p));
        break;
      case 'rebound':
        ring(320, c1, 20, 120);
        this.burst(this.sparks, 6, x, y, -6);
        break;
      case 'secondwind':
        // the dawn lifts you: a column of gold light and a ring
        this.fade(900, (g, p) => {
          g.fillStyle(c2, 0.35 * (1 - p)).fillRect(X - 18, Y - 140, 36, 150);
          g.lineStyle(4 * (1 - p) + 1, c1, 1 - p).strokeEllipse(X, Y + 16, 50 + 40 * p, 14 + 10 * p);
        }, true);
        this.burst(this.sparks, 20, x, y, -10);
        break;
      case 'shell':
        ring(260, 0x67e8f9, 30, 18);
        break;
      case 'bedrock':
        ring(240, c0, 18, 26);
        break;
      default:
        break;
    }
  }

  /** Hold the world still for a moment. the world still for a moment. `minor` stops don't come back-to-back. */
  private hitStop(ms: number, minor = false) {
    const now = this.time.now;
    if (reducedMotion() || (minor && now < this.stopCool)) return;
    if (now - this.stopSpent.from >= 1000) this.stopSpent = { from: now, ms: 0 };
    // Only the part that reaches past a stop already running costs anything.
    const add = Math.min(Math.max(0, now + ms - Math.max(now, this.stopUntil)), STOP_BUDGET - this.stopSpent.ms);
    if (add < 15) return;
    this.stopSpent.ms += add;
    this.stopUntil = Math.max(now, this.stopUntil) + add;
    this.stopCool = now + ms + 200;
  }

  /** The red screen edge: a short pulse when you are hurt, and below 30% HP a beat that grows
      faster and stronger the lower you are. */
  private drawVignette() {
    const r = this.run,
      cam = this.cameras.main,
      share = r.hero.hp / r.hero.maxHp,
      hit = Math.max(0, 1 - (this.time.now - this.hurtAt) / 240),
      low = !r.over && share < 0.3;
    if (!low && hit <= 0) {
      this.vignette.setVisible(false);
      return;
    }
    const beat = (Math.sin(this.time.now / (110 + 300 * share)) + 1) / 2,
      lowAlpha = low ? 0.35 + 0.15 * beat + 0.35 * beat * (1 - share / 0.3) : 0;
    this.vignette
      .setVisible(true)
      .setPosition(cam.width / 2, cam.height / 2)
      .setDisplaySize(cam.width / cam.zoom + 4, cam.height / cam.zoom + 4)
      .setAlpha(Math.min(1, Math.max(lowAlpha, 0.6 * hit)));
  }


  /** An effect drawn for `ms`, in engine points (on the turned layer), or in screen points when `up`. */
  private fade(ms: number, draw: (g: Phaser.GameObjects.Graphics, p: number) => void, up = false) {
    // A ceiling on what's redrawn each frame, so a pile-up of effects can't stall a slow phone.
    if (this.fading.length >= FX_CAP.fading) this.fading.shift();
    this.fading.push({ draw, start: this.time.now, ms, up });
  }

  private drawFx() {
    const now = this.time.now,
      r = this.run;
    this.fx.clear();
    const mk = this.marks.clear();
    this.under.clear();
    this.fading = this.fading.filter((f) => {
      const p = (now - f.start) / f.ms;
      if (p >= 1) return false;
      f.draw(f.up ? mk : this.fx, p);
      return true;
    });
    // A friend down: a ring that fills while someone stands by them (PARTY.revive in the balance).
    for (const o of r.party) {
      if (o.hp > 0 || r.party.length < 2) continue;
      this.fx.lineStyle(2, 0xffffff, 0.25).strokeCircle(o.x, o.y, PARTY.revive.r);
      if (o.reviving > 0) {
        this.fx.lineStyle(5, 0x34d399, 0.95).beginPath();
        this.fx.arc(o.x, o.y, PARTY.revive.r, -Math.PI / 2, -Math.PI / 2 + Math.min(1, o.reviving / PARTY.revive.secs) * Math.PI * 2);
        this.fx.strokePath();
      }
    }
    // The monster you tapped: a ring under it, and corner ticks round it.
    const lk = r.hero.lock === null ? undefined : r.foes.find((f) => f.id === r.hero.lock && f.alive);
    if (lk) {
      const [X, Y] = this.P(lk.x, lk.y),
        q = lk.def.r + 10 + 2 * Math.sin(now / 120);
      mk.lineStyle(2, 0xfde68a, 0.9).strokeEllipse(X, Y + lk.def.r + 4, lk.def.r * 3, lk.def.r);
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mk.lineBetween(X + sx * q, Y + sy * q, X + sx * (q - 6), Y + sy * q).lineBetween(X + sx * q, Y + sy * q, X + sx * q, Y + sy * (q - 6));
    }
    // Monsters on fire from Embers: little flames dance on them till it goes out.
    for (const f of r.foes) {
      if (!f.alive || !f.burn || r.t >= f.burn.until) continue;
      const [X, Y] = this.P(f.x, f.y);
      for (let i = 0; i < 3; i++) {
        const fx = X - 8 + i * 8,
          h = 7 + 4 * Math.sin(now / 70 + i * 2),
          fy = Y - f.def.r * 0.4 + (i % 2) * 4;
        mk.fillStyle(0xf97316, 0.85).fillTriangle(fx - 4, fy, fx + 4, fy, fx, fy - h);
        mk.fillStyle(0xfde047, 0.9).fillTriangle(fx - 2, fy, fx + 2, fy, fx, fy - h * 0.55);
      }
    }
    // The Rainstalker's Tailwind: wind streaks past you while it lasts.
    if (r.hero.tailwind > r.t && r.hero.hp > 0) {
      const [X, Y] = this.P(r.hero.x, r.hero.y);
      mk.lineStyle(2, 0xe0fff6, 0.6);
      for (let i = 0; i < 4; i++) {
        const o = (now / 3 + i * 23) % 60;
        mk.lineBetween(X - 26 - o, Y - 16 + i * 10, X - 12 - o, Y - 16 + i * 10);
      }
    }
    // The SP's patches on the floor while they last (each one's look: FIELD_FX in spFx.ts).
    if (r.fields.length) drawFields(this.kit, this.fx, mk, r.fields, this.spLast, r.t, now, this.spAura());
    // Slowed monsters: a ring of frost at their feet.
    for (const f of r.foes) {
      if (!f.alive || !f.slow || r.t >= f.slow.until) continue;
      const [X, Y] = this.P(f.x, f.y);
      mk.lineStyle(2, 0xbfdbfe, 0.8).strokeEllipse(X, Y + f.def.r * 0.8, f.def.r * 2.4, f.def.r * 0.8);
    }
    // A guard of light (Shield Wall, Blessing, Tide Spin) or a Crystal Shell round you.
    {
      const h = r.hero;
      if (h.hp > 0 && (h.guardUntil > r.t || h.shellUntil > r.t)) {
        const [X, Y] = this.P(h.x, h.y),
          guard = h.guardUntil > r.t,
          [, c1, c2] = this.spAura(),
          wob = Math.sin(now / 80) * 2;
        mk.fillStyle(guard ? c2 : 0x67e8f9, 0.15).fillCircle(X, Y - 4, 30 + wob);
        mk.lineStyle(2, guard ? c1 : 0xa5f3fc, 0.85).strokeCircle(X, Y - 4, 30 + wob);
      }
    }
    // Tomorrow's reach, so it's clear where waiting starts.
    if (r.boss?.alive && this.setup.zone.boss === 'tomorrow') {
      const far = Math.hypot(r.boss.x - r.hero.x, r.boss.y - r.hero.y) > 200;
      this.fx.lineStyle(2, far ? 0x86efac : 0x94a3b8, far ? 0.5 : 0.18).strokeCircle(r.boss.x, r.boss.y, 200);
    }
    // Embers under the Warden: amber while it turns its cross, red once it's past half.
    const wd = r.warden;
    if (wd?.alive) {
      const hot = wd.phase === 2,
        p = (Math.sin(now / (hot ? 90 : 160)) + 1) / 2;
      const [X, Y] = this.P(wd.x, wd.y);
      this.under.fillStyle(hot ? 0xef4444 : 0xf97316, 0.12 + 0.12 * p).fillEllipse(X, Y + wd.def.r, wd.def.r * 3.4, wd.def.r * 1.3);
      this.under.lineStyle(2, hot ? 0xef4444 : 0xfbbf24, 0.4 + 0.3 * p).strokeEllipse(X, Y + wd.def.r, wd.def.r * 3.4, wd.def.r * 1.3);
    }
    // The other mid-bosses' tells.
    if (wd?.alive && wd.kind !== 'warden') this.drawMid(wd, now);
    this.hearMid(wd);
    // The Hollow's light: faint while it's dark, open and warm when it's lit, with how long you've
    // stood in it running round its edge.
    const hb = r.boss;
    if (hb?.alive && this.setup.zone.boss === 'hollow' && !this.setup.tutorial && !r.over) {
      const p = (Math.sin(now / 160) + 1) / 2;
      if (hb.phase === 2) {
        this.fx.fillStyle(0xfef3c7, 0.16 + 0.08 * p).fillCircle(hb.x, hb.y, LIGHT.r);
        this.fx.lineStyle(3, 0xfde68a, 0.75).strokeCircle(hb.x, hb.y, LIGHT.r);
        if (r.hold > 0) {
          // The light hums while you stand in it, rising as it fills, and gathers round you.
          const fill = r.hold / LIGHT.hold;
          this.sfx('hum', 1 + 0.6 * fill);
          this.fx.fillStyle(0xfffbeb, 0.1 + 0.25 * fill).fillCircle(r.hero.x, r.hero.y, 14 + 22 * fill);
          this.fx.lineStyle(5, 0xffffff, 0.95).beginPath();
          this.fx.arc(hb.x, hb.y, LIGHT.r + 5, -Math.PI / 2, -Math.PI / 2 + (r.hold / LIGHT.hold) * Math.PI * 2);
          this.fx.strokePath();
        }
      } else this.fx.lineStyle(1, 0xfde68a, 0.12 + 0.1 * p).strokeCircle(hb.x, hb.y, LIGHT.r);
    }
    // The mid-boss's chest: a gold ring pulsing round it until it's opened.
    if (this.chestCall && r.chest && canOpen(r, r.hero)) this.fx.lineStyle(3, 0xfbbf24, 0.35 + 0.35 * ((Math.sin(now / 180) + 1) / 2)).strokeCircle(r.chest.x, r.chest.y - 4, 26);
    // The way out, once open.
    if (r.doorOpen) {
      const p = (Math.sin(now / 200) + 1) / 2;
      for (const d of r.doors) {
        const [nx, ny] = INWARD[d.side],
          [tx, ty] = [d.x + nx * (ROOM.wall + 12), d.y + ny * (ROOM.wall + 12)],
          [bx, by] = [d.x + nx * (ROOM.wall + 26), d.y + ny * (ROOM.wall + 26)];
        this.fx.fillStyle(this.doorColor(d), (d.been ? 0.08 : 0.15) + 0.2 * p).fillTriangle(bx - ny * 10, by + nx * 10, bx + ny * 10, by - nx * 10, tx, ty);
      }
    }
    // The stairs down: a gold ring pulsing round them.
    if (r.stairs) this.fx.lineStyle(2, 0xfbbf24, 0.25 + 0.3 * ((Math.sin(now / 220) + 1) / 2)).strokeCircle(r.stairs.x, r.stairs.y, 32);
    // The ward, while it's up.
    if (relic(r.hero, 'charm') && r.t >= r.hero.wardAt) this.fx.lineStyle(2, 0x7dd3fc, 0.35 + 0.15 * Math.sin(now / 180)).strokeCircle(r.hero.x, r.hero.y, 24);
    // A ram's line before it charges.
    for (const f of r.foes) {
      if (!f.alive) continue;
      if (f.kind === 'ram' && r.t < f.windUntil) {
        const p = 1 - (f.windUntil - r.t) / 0.75,
          len = 330 * 0.6;
        this.fx.lineStyle(f.def.r * 2, 0xef4444, 0.1 + 0.25 * p).lineBetween(f.x, f.y, f.x + f.dashX * len, f.y + f.dashY * len);
      }
      // Where a shade will land.
      if (f.kind === 'shade' && r.t < f.windUntil) {
        const p = 1 - (f.windUntil - r.t) / 0.8;
        this.fx.lineStyle(2, 0xa78bfa, 0.9).strokeCircle(f.dashX, f.dashY, 26 - 10 * p);
        this.fx.fillStyle(0x6b21a8, 0.2 + 0.3 * p).fillCircle(f.dashX, f.dashY, 16);
      }
    }
    // In the fog: the eyes of what waits just past what you can see.
    const sight = sightNow(r);
    if (sight !== null)
      for (const f of r.foes) {
        const d = Math.hypot(f.x - r.hero.x, f.y - r.hero.y);
        if (!f.alive || d < sight * 0.75 || d > sight + 260) continue;
        const a = 0.75 * Math.min(1, (sight + 260 - d) / 160),
          blink = Math.floor((now + f.id * 397) / 140) % 23 === 0;
        const [X, Y] = this.P(f.x, f.y);
        if (!blink) mk.fillStyle(f === r.boss || f === r.warden ? 0xc084fc : 0xfca5a5, a).fillRect(X - 4, Y - 6, 2, 2).fillRect(X + 2, Y - 6, 2, 2);
      }
    // Your shots: arrows leave a short streak, orbs glow and pulse.
    for (const sh of r.shots) {
      const sp = Math.hypot(sh.vx, sh.vy) || 1,
        trail = sh.look && WEAPON_FX[sh.look].shot?.trail;
      if (trail) trail(this.fx, sh, now);
      else if (sh.kind === 'arrow') {
        const tx = sh.x - (sh.vx / sp) * 28,
          ty = sh.y - (sh.vy / sp) * 28;
        this.fx.lineStyle(3, 0xfde68a, 0.4).lineBetween(tx, ty, sh.x, sh.y);
        this.fx.lineStyle(1, 0xffffff, 0.6).lineBetween((tx + sh.x) / 2, (ty + sh.y) / 2, sh.x, sh.y);
      } else if (sh.kind === 'orb') {
        const pulse = 1 + 0.2 * Math.sin(now / 60 + sh.id);
        this.fx.fillStyle(0xa78bfa, 0.18).fillCircle(sh.x, sh.y, 12 * pulse);
        this.fx.fillStyle(0xc4b5fd, 0.25).fillCircle(sh.x - (sh.vx / sp) * 8, sh.y - (sh.vy / sp) * 8, 5);
      }
    }
    // Smoke bombs: in the air, then a circle filling up until it bursts.
    for (const m of r.mines) {
      if (r.t < m.lands) {
        const p = 1 - (m.lands - r.t) / 0.55;
        this.fx.fillStyle(0x000000, 0.25).fillCircle(m.x, m.y, 4 + 6 * p);
        const [X, Y] = this.P(m.x, m.y);
        mk.fillStyle(0xc4b5fd).fillCircle(X, Y - 40 * Math.sin(Math.PI * p), 5);
      } else {
        const p = 1 - (m.at - r.t) / 1.1;
        this.fx.lineStyle(2, 0xc084fc, 0.9).strokeCircle(m.x, m.y, m.r);
        this.fx.fillStyle(0xa855f7, 0.1 + 0.3 * p).fillCircle(m.x, m.y, m.r * p);
        this.fx.fillStyle(0xe9d5ff).fillCircle(m.x, m.y, 4);
      }
    }
    this.drawGround();
  }

  /** Water that ripples, and spikes: flat, then a red warning, then up. */
  private drawGround() {
    const r = this.run,
      g = this.ground.clear(),
      now = this.time.now;
    this.tips.clear();
    // Pools: a stone rim, deep water darkest under the near edge, light dancing on the surface.
    const T = this.theme,
      water = T.water.map(hex),
      S = T.stone.map(hex);
    for (const q of r.terrain.water) {
      g.fillStyle(S[3]).fillRect(q.x - 3, q.y - 3, q.w + 6, q.h + 6);
      g.fillStyle(S[5]).fillRect(q.x - 3, q.y + q.h, q.w + 6, 2);
      g.fillStyle(water[1]).fillRect(q.x, q.y, q.w, q.h);
      g.fillStyle(water[0]).fillRect(q.x, q.y, q.w, 6);
      g.fillStyle(water[2], 0.45).fillRect(q.x, q.y + q.h - 6, q.w, 6);
      for (let i = 0; i < 6; i++) {
        const y = q.y + 10 + ((i + 0.5) * (q.h - 16)) / 6,
          x = q.x + 6 + ((now / 30 + i * 37) % (q.w - 28)),
          len = 8 + (i % 3) * 4;
        g.fillStyle(water[3], 0.55).fillRect(x, y, len, 2);
        g.fillStyle(water[2], 0.6).fillRect(x + 3, y + 2, len - 4, 1);
      }
      // a glint that comes and goes
      const k = Math.floor(now / 220) % 9;
      if (k < 3) g.fillStyle(0xffffff, 0.8 - k * 0.25).fillRect(q.x + ((q.w * 0.3 + q.x) % (q.w - 10)) + 4, q.y + q.h * 0.4, 2, 2);
    }
    // Spike plates, set into the floor. Down: dark sockets, the tips just showing. Warning: the
    // sockets glow red, the plate's edge pulses and the tips start to rise. Up: tall steel spikes.
    const steel = R.silver.map(hex),
      iron = R.iron.map(hex),
      pulse = 0.5 + 0.5 * Math.sin(now / 55);
    for (const q of r.terrain.spikes) {
      const st = spikeState(q, r.t);
      g.fillStyle(S[0]).fillRect(q.x, q.y, q.w, q.h);
      g.fillStyle(S[2]).fillRect(q.x + 2, q.y + 2, q.w - 4, q.h - 4);
      g.fillStyle(S[3]).fillRect(q.x + 2, q.y + 2, q.w - 4, 1).fillRect(q.x + 2, q.y + 2, 1, q.h - 4);
      if (st === 'warn') {
        g.fillStyle(0x7f1d1d, 0.25 + 0.2 * pulse).fillRect(q.x + 2, q.y + 2, q.w - 4, q.h - 4);
        g.lineStyle(2, 0xef4444, 0.45 + 0.45 * pulse).strokeRect(q.x + 1, q.y + 1, q.w - 2, q.h - 2);
      }
      // The spikes stand up on the screen, so they're drawn upright, each at its socket's screen point.
      const t = this.tips;
      for (let x = q.x + 12; x < q.x + q.w; x += 24)
        for (let y = q.y + 12; y < q.y + q.h; y += 24)
          for (const dx of [-6, 0, 6]) {
            const [cx, cy] = this.P(x, y),
              sx = cx + dx,
              base = cy + 6 - (dx === 0 ? 3 : 0);
            // the socket
            t.fillStyle(st === 'warn' ? 0xef4444 : S[0], st === 'warn' ? 0.6 + 0.4 * pulse : 1).fillRect(sx - 2, base - 1, 5, 3);
            if (st === 'up') {
              // a spike: stacked 2px rows widening to the base, lit on the left, shade on the right
              t.fillStyle(0x000000, 0.3).fillRect(sx + 1, base, 5, 2);
              [1, 1, 2, 2, 2, 3, 3].forEach((half, k) => {
                const yy = base - 14 + k * 2;
                t.fillStyle(steel[1]).fillRect(sx - half + 1, yy, half * 2 - 1, 2);
                t.fillStyle(steel[2]).fillRect(sx - half + 1, yy, 1, 2);
                t.fillStyle(steel[0]).fillRect(sx + half - 1, yy, 1, 2);
              });
            } else if (st === 'warn') t.fillStyle(iron[2]).fillRect(sx, base - 4, 1, 3).fillRect(sx - 1, base - 2, 3, 1);
            else t.fillStyle(iron[1]).fillRect(sx, base - 1, 1, 1);
          }
    }
    // Torch flames: a tongue of fire that never sits still, in the theme's color.
    const l = this.torchFire.clear(),
      fire = T.fire.map(hex);
    this.torches.forEach((t, i) => {
      const k = Math.floor(now / 110 + i * 3) % 4,
        sway = k === 1 ? -1 : k === 3 ? 1 : 0,
        lick = k % 2;
      l.fillStyle(fire[0]).fillRect(t.x - 5, t.y - 12, 10, 6);
      l.fillStyle(fire[1]).fillRect(t.x - 4, t.y - 17, 8, 10);
      l.fillStyle(fire[1]).fillRect(t.x - 3 + sway, t.y - 22 - lick, 6, 6);
      l.fillStyle(fire[1]).fillRect(t.x - 1 + sway * 2, t.y - 26 - lick, 2, 4);
      l.fillStyle(fire[2]).fillRect(t.x - 3, t.y - 15, 6, 7);
      l.fillStyle(fire[2]).fillRect(t.x - 2 + sway, t.y - 19 - lick, 4, 4);
      l.fillStyle(fire[3]).fillRect(t.x - 2, t.y - 13, 4, 4);
      // an ember drifting up now and then
      if ((Math.floor(now / 160) + i) % 5 === 0) l.fillStyle(fire[2]).fillRect(t.x + sway * 3, t.y - 30 - ((now / 20) % 6), 1, 1);
    });
    if (r.terrain.shrine && !r.terrain.shrine.used) {
      const { x, y } = r.terrain.shrine;
      g.fillStyle(0x86efac, 0.12 + 0.08 * Math.sin(now / 250)).fillCircle(x, y, SHRINE.r + 14);
    }
  }

  /** A screen point, for drawing on the pad (which the camera's zoom would otherwise scale). */
  private onPad(x: number, y: number): [number, number] {
    const cam = this.cameras.main,
      cx = cam.width / 2,
      cy = cam.height / 2;
    return [(x - cx) / cam.zoom + cx, (y - cy) / cam.zoom + cy];
  }

  private drawPad() {
    this.pad.clear();
    // What's off the screen: marks on the edge (red monsters, violet boss, the open door in gold).
    const cam = this.cameras.main,
      v = cam.worldView,
      r = this.run,
      edge = (x: number, y: number, color: number, size: number) => {
        if (v.contains(x, y)) return;
        const sx = Phaser.Math.Clamp((x - v.x) * cam.zoom, 14, cam.width - 14),
          sy = Phaser.Math.Clamp((y - v.y) * cam.zoom, 50, cam.height - 14),
          a = Math.atan2((y - v.y) * cam.zoom - sy, (x - v.x) * cam.zoom - sx),
          [px, py] = this.onPad(sx, sy),
          k = size / cam.zoom;
        this.pad.fillStyle(color, 0.85).fillTriangle(px + Math.cos(a) * k, py + Math.sin(a) * k, px + Math.cos(a + 2.4) * k * 0.7, py + Math.sin(a + 2.4) * k * 0.7, px + Math.cos(a - 2.4) * k * 0.7, py + Math.sin(a - 2.4) * k * 0.7);
      };
    for (const f of r.foes) if (f.alive) edge(...this.P(f.x, f.y), f === r.boss ? 0xa855f7 : 0xef4444, f === r.boss ? 14 : 8);
    if (r.doorOpen) for (const d of r.doors) if (!d.been) edge(...this.P(d.x + INWARD[d.side][0] * ROOM.wall, d.y + INWARD[d.side][1] * ROOM.wall), this.doorColor(d), 14);
    if (r.stairs) edge(...this.P(r.stairs.x, r.stairs.y), 0xfbbf24, 12);
    if (r.chest && canOpen(r, r.hero)) edge(...this.P(r.chest.x, r.chest.y), 0xfbbf24, 10);
    if (r.terrain.shrine && !r.terrain.shrine.used && r.hero.hp < r.hero.maxHp * 0.6) edge(...this.P(r.terrain.shrine.x, r.terrain.shrine.y), 0x86efac, 10);
    if (!this.stick) return;
    const [sx, sy] = this.onPad(this.stick.x, this.stick.y),
      k = 1 / cam.zoom;
    this.pad.fillStyle(0xffffff, 0.12).fillCircle(sx, sy, 46 * k);
    this.pad.lineStyle(2 * k, 0xffffff, 0.25).strokeCircle(sx, sy, 46 * k);
    this.pad.fillStyle(0xfbbf24, 0.6).fillCircle(sx + this.stick.dx * k, sy + this.stick.dy * k, 18 * k);
  }

  /** At most `SFX_PER_FRAME` of the crowd's sounds start in one frame: each is a few new audio nodes, and a
      party's blows landing together made a burst of them. More at once can't be told apart. */
  private sfxFrame = { at: -1, n: 0 };
  private sfx(id: SfxId, pitch?: number) {
    if (CROWD.has(id)) {
      const f = this.game.getFrame();
      if (f !== this.sfxFrame.at) this.sfxFrame = { at: f, n: 0 };
      if (this.sfxFrame.n >= SFX_PER_FRAME) return;
      this.sfxFrame.n++;
    }
    music.sfx(id, pitch);
  }

  // ---------- from the page ----------

  pick(id: UpgradeId) {
    this.offered = false;
    if (this.net) this.answer({ t: 'pick', id }, askKey('pick', this.run.hero.offer?.choices));
    if (!this.run.hero.offer?.choices.includes(id)) return;
    pick(this.run, id);
    // A live run: the next card (another level) comes from the server, not rolled here.
    if (this.net) this.run.hero.offer = null;
    const h = this.hero;
    this.fade(450, (g, p) => g.lineStyle(4 * (1 - p) + 1, 0xfbbf24, 0.9 * (1 - p)).strokeCircle(h.x, h.y, 24 + 80 * p));
  }

  ability() {
    this.wantAbility = true;
  }

  skill() {
    this.wantSkill = true;
  }

  final() {
    this.wantFinal = true;
  }

  dodge() {
    this.wantDodge = true;
  }

  setPaused(on: boolean) {
    this.paused = on;
    if (!this.net) this.run.paused = on;
    // A key held down when the run stopped doesn't keep walking you once it goes on.
    this.input?.keyboard?.resetKeys();
  }

  skipToBoss() {
    this.whenBuilt(() => {
      skipToBoss(this.run);
      for (const e of takeEvents(this.run)) this.react(e);
    });
  }

  winNow() {
    winNow(this.run);
  }

  pickRelic(id: RelicId) {
    this.offered = false;
    if (this.net) this.answer({ t: 'relic', id }, askKey('relic', this.run.hero.relicOffer));
    if (!this.run.hero.relicOffer?.includes(id)) return;
    pickRelic(this.run, id);
    // A live run: the server's own word of it is the one played, so it shows once.
    if (this.net) this.run.events.length = 0;
    for (const e of takeEvents(this.run)) this.react(e);
    const h = this.hero;
    this.fade(450, (g, p) => g.lineStyle(4 * (1 - p) + 1, 0xfbbf24, 0.9 * (1 - p)).strokeCircle(h.x, h.y, 24 + 80 * p));
  }

  /** The bag panel's buttons: the page pauses the run while it's open. */
  gear(fn: () => void, m: Up) {
    fn();
    this.wearLook();
    // A live run: the server does it too, and its events are the ones played.
    if (this.net) {
      this.net.send(m);
      this.run.events.length = 0;
    }
    for (const e of takeEvents(this.run)) this.react(e);
    this.syncLoot();
    this.sendHud();
  }

  stairsChoice(choice: 'deeper' | 'leave' | 'stay') {
    this.asked = false;
    // A live run: the server takes everyone down (or not); its next run shows the new floor.
    if (this.net) {
      this.answer({ t: 'stairs', choice }, 'stairs');
      this.run.stairsAsk = false;
      return;
    }
    takeStairs(this.run, choice);
    for (const e of takeEvents(this.run)) this.react(e);
  }

  /** Developer mode: the stairs card, here and now (to look at it without clearing a floor). */
  askStairs() {
    this.whenBuilt(() => {
      if (!this.run.over && !this.run.boss) this.run.stairsAsk = true;
    });
  }

  skipFloor() {
    this.whenBuilt(() => {
      skipFloor(this.run);
      for (const e of takeEvents(this.run)) this.react(e);
    });
  }

  fillFinal() {
    this.whenBuilt(() => (this.run.hero.surge = SURGE.full));
  }

  skipToWarden() {
    this.whenBuilt(() => {
      skipToWarden(this.run);
      for (const e of takeEvents(this.run)) this.react(e);
    });
  }
}

export function startRun(parent: HTMLElement, setup: RunSetup, events: RunEvents): RunHandle {
  const scene = new DungeonScene(setup, events);
  const game = new Phaser.Game({
    type: setup.fast ? Phaser.HEADLESS : Phaser.AUTO,
    parent,
    backgroundColor: '#07080d',
    pixelArt: true,
    banner: false,
    audio: { noAudio: true },
    // The ResizeObserver below catches every change of size, so Phaser's own check (which measures
    // the page, and makes the browser lay it out, every half second) can wait much longer.
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight, resizeInterval: 5000 },
    input: { activePointers: 2 },
    scene: [scene],
  });
  // Phaser misses some screen changes: a run started with the phone upright (behind the "turn your
  // phone" card) kept its upright size once turned, and showed a corner of it, zoomed in. Whenever
  // the box the run sits in changes size, the game takes the new size.
  const sized = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
    const w = parent.clientWidth,
      h = parent.clientHeight;
    if (w && h && (w !== game.scale.width || h !== game.scale.height)) game.scale.resize(w, h);
  });
  sized?.observe(parent);
  return {
    pick: (id) => scene.pick(id),
    ability: () => scene.ability(),
    skill: () => scene.skill(),
    final: () => scene.final(),
    dodge: () => scene.dodge(),
    pause: () => scene.setPaused(true),
    resume: () => scene.setPaused(false),
    skipToBoss: () => scene.skipToBoss(),
    skipFloor: () => scene.skipFloor(),
    askStairs: () => scene.askStairs(),
    skipToWarden: () => scene.skipToWarden(),
    fillFinal: () => scene.fillFinal(),
    cycleTheme: () => scene.cycleTheme(),
    pickRelic: (id) => scene.pickRelic(id),
    wear: (id) => scene.gear(() => wear(scene.run, id), { t: 'wear', id }),
    takeOff: (slot) => scene.gear(() => takeOff(scene.run, slot), { t: 'takeOff', slot }),
    dropItem: (id) => scene.gear(() => dropFromBag(scene.run, id), { t: 'drop', id }),
    stairs: (choice) => scene.stairsChoice(choice),
    winNow: () => scene.winNow(),
    autopilot: (on) => (scene.bot = on),
    destroy: () => {
      setup.net?.close();
      sized?.disconnect();
      game.destroy(true);
    },
  };
}
