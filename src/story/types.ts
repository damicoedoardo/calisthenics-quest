import type { TrackId } from '@/lib/music';
import type { PathId } from '@/lib/skills';
import type { SpriteId } from '@/sprites/registry';
import type { EnemyId } from '@/components/Characters';
import type { HeroVariant } from '@/sprites/characters/hero';
import type { FlameFace } from '@/sprites/characters/ember';
import type { CastId } from './cast';
import type { PlaceId } from './places';

/* The shapes every story file is written in. Story files are plain data: who speaks, what they
   say, where, when it plays, and how the camera moves. The engine (engine.ts) reads them. */

/** Everyone who can speak, plus the narrator and you. */
export type Speaker = CastId;

/** Words from the player that a line can quote, written {like_this} in the text. */
export type WordKey =
  | 'why'
  | 'want'
  | 'forWho'
  | 'remind'
  /** The Hollow's line, the one the player picked in the opening. */
  | 'voice'
  /** Workouts done so far, as a number. */
  | 'sessions'
  /** The name the player gave the flame. */
  | 'flame'
  /** Heart-moment answers, one per month. */
  | 'heart1'
  | 'heart2'
  | 'heart3'
  | 'heart4'
  | 'heart5'
  | 'heart6';

export type Words = Record<WordKey, string>;

/** How the flame looks while it says a line. */
export type FlameMood = FlameFace;

export interface Line {
  who: Speaker;
  text: string;
  /** Only shown when this word was given (an empty letter line drops the story line). */
  needs?: WordKey;
  /** Narration only: who stands on screen while it's read. */
  show?: Speaker;
  /** The flame's face for this line. */
  mood?: FlameMood;
  /** A camera move that starts with this line. */
  shot?: Shot;
}

/**
 * A camera beat. Scenes can open with a few of them (`shots`), and any line can carry one.
 * Moves add up over a scene: a pan stays panned until another shot moves the camera back.
 */
export type Shot =
  /** A title card over the picture, e.g. "Chapter 2: Mirror Lake". */
  | { title: string; seconds?: number }
  /** Cut to another place. */
  | { place: PlaceId; seconds?: number }
  /** Slide the camera; 'center' brings it back. */
  | { pan: 'up' | 'down' | 'left' | 'right' | 'center'; seconds?: number }
  | { zoom: 'in' | 'out'; seconds?: number }
  | { fade: 'in' | 'out' | 'white'; seconds?: number }
  | { shake: 'small' | 'big'; seconds?: number }
  /** Someone walks into the picture as they start talking. */
  | { enter: 'left' | 'right' | 'below'; seconds?: number };

/**
 * When a scene plays. Every field given must hold. Moving a scene means changing a number here.
 * "Rest day" means no workout today and the last one was one or two days ago.
 */
export interface When {
  /** At least this many workouts done. */
  workouts?: number;
  /** This chapter has started (or a later one). */
  chapter?: number;
  /** This chapter's enemy is beaten. */
  beaten?: number;
  /** This chapter has all its workouts and only waits for a max test. */
  awaitingTest?: number;
  /** Only while this chapter is the current one. */
  inChapter?: number;
  /** Today is a rest day. */
  restDay?: boolean;
  /** The last workout was a short one (a Rough day or a minimum quest). */
  shortSession?: boolean;
  /** Trained this many days in a row, up to today. */
  daysInRow?: number;
  /** Some week had all three workouts. */
  perfectWeek?: boolean;
  /** Beat a skill: this path's level is past this number (pull past 3 = the first pull-up). */
  skill?: { path: PathId; past: number };
  /** No class picked yet. */
  noClass?: boolean;
  /** The player gave this answer (or any answer when `is` is left out). */
  answer?: { id: AnswerId; is?: string };
  /** Only when the player gave this word (a part of the letter, a heart answer). */
  needs?: WordKey;
  /** Away this many days or more. The scene can play again after every later absence. */
  away?: number;
  /** The whole story is finished. */
  finished?: boolean;
}

/** Saved answers: heart moments, and whether you joined a villager's story. */
export type AnswerId = 'heart1' | 'heart2' | 'heart3' | 'heart4' | 'heart5' | 'heart6' | 'lia' | 'sol' | 'vela';

export interface Choice {
  label: string;
  /** Saved, and what {heartN} reads in later lines. Empty means "no answer" (lines that need it drop). */
  value: string;
  /** Lines played after picking this one (instead of the ask's own `after`). */
  after?: Line[];
}

/** Something the scene asks the player at its end. */
export type Ask =
  /** Name the flame. */
  | { kind: 'name'; prompt: string; placeholder: string; after: Line[] }
  /** Pick an answer, or write your own when `write` is given (its text is the placeholder). */
  | { kind: 'choice'; id: AnswerId; prompt: string; choices: Choice[]; write?: string; after?: Line[] }
  /** Pick a class. */
  | { kind: 'class' };

export interface Scene {
  /** Saved once played, so it never plays twice. Never rename a live scene's id. */
  id: string;
  when: When;
  /** The background. Defaults to the chapter's place. */
  place?: PlaceId;
  music?: TrackId;
  /** Camera beats before the first line. */
  shots?: Shot[];
  lines: Line[];
  ask?: Ask;
}

/** A Fog zone: the chapter's place in the game between workouts. */
export interface FogZone {
  name: string;
  /** Who waits at the end of the run. Each one fights in a way only the chapter's lesson beats. */
  boss: FogBoss;
  /** What the boss screen says, so the rule is clear before the fight. */
  hint: string;
  /** Said after you win. */
  after: string;
  /** What you keep for winning. */
  keepsake: { name: string; text: string };
  /** Enemy toughness. */
  hp: number;
  dmg: number;
  /** Ground color and the tint over the fog. */
  ground: string;
  fog: string;
}

export type FogBoss = 'tomorrow' | 'mirror' | 'knight' | 'plateau' | 'hollow' | 'summit';

export interface Chapter {
  n: number;
  name: string;
  /** What this chapter is about, in one line. */
  lesson: string;
  /** The enemy on Today; every workout takes one heart off it. */
  enemy: string;
  enemySprite: EnemyId;
  /** Workouts in this chapter. */
  workouts: number;
  /** Max tests needed in total before the chapter can end. */
  tests: number;
  place: PlaceId;
  fog: FogZone;
  scenes: Scene[];
}

/** Who appears above a line. */
export type Portrait =
  | { kind: 'sprite'; sprite: SpriteId; size: number }
  /** The player's own shape, in their gear: you, the Echo, your Best Self. */
  | { kind: 'hero'; variant: HeroVariant; size: number }
  /** The Hollow: your shape with its own plain gear. */
  | { kind: 'hollow'; size: number }
  /** The flame, at its current stage. */
  | { kind: 'flame'; size: number }
  | { kind: 'none' };

export interface CastMember {
  /** Name over their lines; {flame} is the name the player chose. */
  name: string;
  portrait: Portrait;
  /** Name tag color. */
  tag?: 'gold' | 'red' | 'sky' | 'amber' | 'slate';
  /** The Hollow speaks from a darker box. */
  dark?: boolean;
}

/**
 * What kind of day it is for the flame's daily line, worked out from your workouts and the clock.
 * See src/story/daily/index.ts for the order they're checked in.
 */
export type Moment =
  | 'first'
  | 'training'
  | 'trained'
  | 'rest'
  | 'rested'
  | 'missed'
  | 'rough'
  | 'best'
  | 'late'
  | 'weekend'
  | 'smoky'
  | 'back';

export interface DailyLine {
  text: string;
  /** Only used when the player gave this word. */
  needs?: WordKey;
}

/** Words for the road: one a day under the flame's line. */
export interface Quote {
  text: string;
  /** Who said it: an old writer whose words are free to use, or someone from the story. */
  by: string;
  /** The chapter whose lesson it fits, 'rest' for rest days, or 'any'. */
  fits: number | 'rest' | 'any';
}
