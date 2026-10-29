import type { TrackId } from '@/lib/music';
import type { SpriteId } from '@/sprites/registry';
import type { EnemyId } from '@/components/Characters';
import type { HeroVariant } from '@/sprites/characters/hero';
import type { FlameFace } from '@/sprites/characters/ember';
import type { CastId } from './cast';
import type { PlaceId } from './places';
import type { SpNo } from '@/game/dungeon/content';

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
  /** Only shown when this word was left empty: the line that stands in for a `needs` line. */
  missing?: WordKey;
  /** Only shown when the player gave this answer (or any answer when `is` is left out). */
  answer?: { id: AnswerId; is?: string };
  /** Who stands on screen while it's read, when that isn't the speaker (narration, or a speaker shown
      another way, like the true form waving). */
  show?: Speaker;
  /** The flame's face for this line. */
  mood?: FlameMood;
  /** A camera move that starts with this line. */
  shot?: Shot;
  /** Seconds of quiet before the line starts: the box waits empty, like a held breath. */
  pause?: number;
  /** 'slow' types the line out slowly, for the words that need to land. */
  pace?: 'slow';
  /** Narration only: big words on the picture with no text box, like a film. */
  film?: boolean;
  /** From this line on, play this song instead; 'none' lets the music drop out. */
  music?: TrackId | 'none';
  /** Something shown instead of a speaker: the SP card, sealed or awake, or the SP waking (the
      whole screen plays your class's transformation, then the scene goes on). */
  art?: 'sp-sealed' | 'sp-awake' | 'sp-transform';
  /** Which of the class's SPs the art shows (1 to 4; left out: the first). */
  spn?: SpNo;
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
  /** A set beat the same exercise's best set last time, in at least this many workouts. */
  better?: number;
  /** No class picked yet. */
  noClass?: boolean;
  /** The first SP's trial is done (src/lib/sp.ts). */
  spReady?: boolean;
  /** The player gave this answer (or any answer when `is` is left out). */
  answer?: { id: AnswerId; is?: string };
  /** Only when the player gave this word (a part of the letter, a heart answer). */
  needs?: WordKey;
  /** Helped at least one villager (true), or none of them (false). See VILLAGERS in engine.ts. */
  helped?: boolean;
  /** The last this-many workouts were all short ones (Rough days or minimum quests). */
  roughRun?: number;
  /** Away this many days or more. The scene can play again after every later absence. */
  away?: number;
  /** The whole story is finished. */
  finished?: boolean;
  /** The Ember Road, the story walked with friends (src/lib/road.ts): its chapter `open`, past the
      middle of chapter `note`, chapter `won` (its boss fell to your party), or the finale due. */
  road?: { open: number } | { note: number } | { won: number } | { end: true };
}

/** Saved answers: heart moments, and whether you joined a villager's story. */
export type AnswerId = 'heart1' | 'heart2' | 'heart3' | 'heart4' | 'heart5' | 'heart6' | 'lia' | 'sol' | 'vela' | 'call' | 'road1' | 'road2' | 'road3';

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
  | { kind: 'class' }
  /** The Wanderer hands over the first SP (src/lib/sp.ts): its trial starts. */
  | { kind: 'sp'; n?: SpNo };

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

/**
 * What the zone's boss says during the dungeon fight, shown over gameplay, so every line is short.
 * Lines may hold {words} like scenes (the Hollow uses {voice}): fill them with `fill(text,
 * storyWords(state))`, and skip a line whose word the player left empty.
 */
export interface FogLines {
  /** When the boss appears. */
  enter: string;
  /** One line at each change of phase or stage, in order (see each zone for what they mean). */
  stages: string[];
  /** When the fight ends: beaten, or at peace. */
  end: string;
  /** The inner critic, said now and then during the fight. Three or four. */
  taunts: string[];
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
  /** On the Play tab before your very first run here, when the zone is still out of reach. */
  firstTry?: string;
  /** What you keep for winning. */
  keepsake: { name: string; text: string };
  /** Enemy toughness. */
  hp: number;
  dmg: number;
  /** Ground color and the tint over the fog. */
  ground: string;
  fog: string;
  /** The boss's voice in the dungeon. */
  lines: FogLines;
}

/** The six story bosses, then the Ember Road's own (src/story/road.ts). */
export type FogBoss = 'tomorrow' | 'mirror' | 'knight' | 'plateau' | 'hollow' | 'summit' | 'lull';

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
  /** The flame's true form (the finale), with the player's hair. */
  | { kind: 'kindled'; size: number; wave?: boolean }
  /** A villager as they look once you've helped them (dancing, running, the letter sealed). */
  | { kind: 'villager'; sprite: 'lia' | 'sol' | 'vela'; size: number }
  /** A chapter's enemy as the Fog draws it, so the story and the dungeon show the same boss.
      `stage` is how broken it is (0 whole, 2 nearly gone); the Mirror wears the player's look. */
  | { kind: 'boss'; boss: 'mirror' | 'knight' | 'plateau' | 'summit'; stage?: 0 | 1 | 2; size: number }
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
  /** Only said while this chapter is the current one (a line about the Fog belongs to the Fog). */
  inChapter?: number;
  /** Only said from this chapter on (a line that names the Knight waits until you've met him). */
  fromChapter?: number;
}

/** A one-off Today line that follows up on a scene: said once, on a day soon after it. */
export interface Callback {
  text: string;
  /** The scene it follows up on. Said on a later day than the workout that scene came after. */
  after: string;
  /** Only within this many workouts of that scene's moment, so it never arrives stale. */
  within: number;
  /** Only on a day off (the day after a workout, or later). */
  restDay?: boolean;
}

/** Words for the road: one a day under the flame's line. */
export interface Quote {
  text: string;
  /** Who said it: an old writer whose words are free to use, or someone from the story. */
  by: string;
  /** The chapter whose lesson it fits, 'rest' for rest days, or 'any'. */
  fits: number | 'rest' | 'any';
}
