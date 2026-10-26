/* Animations as data. A clip is a list of frames plus timing; each frame says where the body is.
   To change an animation, edit its frames here: add or remove frames, move an arm, change the
   speed. Every sprite that plays the clip picks it up, and the sheet and CSS timing follow. */

/** Weapon-arm positions. */
export type ArmRight = 'down' | 'up' | 'fwd' | 'pull';
/** Off-hand positions. */
export type ArmLeft = 'down' | 'out' | 'up';
/** One-frame effects drawn over the sprite. */
export type Fx = 'slash' | 'release' | 'impact' | 'charge' | 'burst';

/** What one frame does to the body. Leave a field out for the resting value. */
export interface ClipFrame {
  /** Upper body drops by this many body pixels (1 = 2 sprite pixels). */
  bob?: number;
  right?: ArmRight;
  left?: ArmLeft;
  /** How far a bow string is drawn back, in body pixels. */
  draw?: number;
  fx?: Fx;
}

export interface Clip {
  frames: ClipFrame[];
  /** Time each frame stays on screen. */
  ms: number;
  /** Loop forever, or play once and stop. */
  loop: boolean;
}

export const CLIPS = {
  /** Breathing: the upper body dips for two frames. */
  idle: { ms: 200, loop: true, frames: [{}, {}, { bob: 1 }, { bob: 1 }] },
  /** Raise, cut forward with a slash arc, recover. */
  swing: { ms: 120, loop: false, frames: [{}, { right: 'up' }, { right: 'fwd', fx: 'slash' }, {}] },
  /** Draw the bow string back in three steps, release. */
  shoot: {
    ms: 120,
    loop: false,
    frames: [
      { right: 'pull', draw: 5 },
      { right: 'pull', draw: 8 },
      { right: 'pull', draw: 11 },
      { fx: 'release' },
    ],
  },
  /** Raise the off hand, charge, burst. */
  cast: {
    ms: 120,
    loop: false,
    frames: [{ left: 'down' }, { left: 'up', fx: 'charge' }, { left: 'up', fx: 'burst' }, { left: 'down', fx: 'charge' }],
  },
  /** Crouch, punch, impact. */
  punch: { ms: 120, loop: false, frames: [{}, { bob: 1 }, { right: 'fwd', fx: 'impact' }, {}] },
  /** A single still frame, for sprites that don't move. */
  still: { ms: 1000, loop: false, frames: [{}] },
} satisfies Record<string, Clip>;

export type ClipId = keyof typeof CLIPS;

/** What a sprite is doing. Each sprite maps these to its own clips (a warrior's attack is a swing). */
export type SpriteAction = 'idle' | 'attack';

export const clip = (id: ClipId): Clip => CLIPS[id];
