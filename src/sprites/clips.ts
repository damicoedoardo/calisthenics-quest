/* Animations as data. A clip is a list of frames plus timing; each frame says where the body is.
   To change an animation, edit its frames here: add or remove frames, move an arm, change the
   speed. Every sprite that plays the clip picks it up, and the sheet and CSS timing follow. */

/** Weapon-arm positions: hanging, raised over the head, held out to the side, drawn across the
    chest (a bow string, or a thrust pulled back; `draw` sets how far), or tucked at the ribs. */
export type ArmRight = 'down' | 'up' | 'fwd' | 'pull' | 'tuck';
/** Off-hand positions: hanging, held out, raised, or reaching across the chest (a two-handed push). */
export type ArmLeft = 'down' | 'out' | 'up' | 'fwd';
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
  /** A foot off the ground mid-step: -1 the left, 1 the right. */
  step?: -1 | 1;
  fx?: Fx;
  /** Where a weapon held in the right hand points, as [x, y] (x right, y down). Left out, each
      arm pose has its own (aim in parts/spWeapons.ts). */
  aim?: [number, number];
  /** The same for a weapon in the left hand. */
  aimL?: [number, number];
  /** How far up a held weapon the right hand slides, in sprite pixels (a lance pushed through
      the hand, a staff held in the middle to spin it). */
  grip?: number;
  /** A thrown weapon out of the hand: how far it has flown, in sprite pixels (0: in the hand). */
  fly?: number;
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
  /** Walking: a foot lifts, it lands (the body sinks onto it), the other foot lifts, it lands. */
  walk: { ms: 120, loop: true, frames: [{ step: 1 }, { bob: 1 }, { step: -1 }, { bob: 1 }] },
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
  /** Creatures: a slow float or breath over eight frames (room for a blink or a flicker). */
  hover: { ms: 150, loop: true, frames: [{}, {}, { bob: 1 }, { bob: 1 }, { bob: 1 }, { bob: 1 }, {}, {}] },
  /** Creatures: wind up (right: 'up'), then lunge at the hero with an impact. */
  lunge: { ms: 110, loop: false, frames: [{}, { right: 'up' }, { fx: 'impact' }, {}] },
  /** Creatures: a one-shot death, swell, crack, burst, splash (the Splitter splitting). */
  pop: { ms: 70, loop: false, frames: [{ bob: 1 }, { right: 'up' }, { fx: 'burst' }, { fx: 'impact' }] },
  /** Lift the off hand high, hold it while a light flares, and lower it (Vela raising her lamp). */
  raise: {
    ms: 150,
    loop: false,
    frames: [{}, { left: 'up' }, { left: 'up', fx: 'charge' }, { left: 'up', fx: 'burst' }, { left: 'up', fx: 'burst' }, { left: 'up', fx: 'charge' }, { left: 'up' }, {}],
  },
  /** A wave that keeps going while it's on screen: the hand swings out and back (the true form's "see you Monday"). */
  wave: { ms: 160, loop: true, frames: [{ right: 'up' }, { right: 'up', fx: 'charge' }, { right: 'up' }, { right: 'up', fx: 'charge' }, { right: 'up' }, { right: 'up', fx: 'charge' }, { right: 'up' }, { right: 'up', fx: 'charge' }] },
  /** One exercise rep (or a breathing hold), for the workout demos: 16 even frames. */
  rep: { ms: 110, loop: true, frames: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}] },
  /** A single still frame, for sprites that don't move. */
  still: { ms: 1000, loop: false, frames: [{}] },

  // ---------- the SP weapons' attacks (each weapon picks its clip in parts/spWeapons.ts) ----------

  /** Great axe: lift it high over the head, hold, bring it down hard into the ground. */
  chop: {
    ms: 110,
    loop: false,
    frames: [
      { right: 'tuck', aim: [0.3, -1] },
      { right: 'tuck', aim: [-0.15, -1] },
      { right: 'tuck', aim: [-0.15, -1] },
      { right: 'tuck', aim: [1, -0.3], fx: 'slash' },
      { right: 'fwd', aim: [0.45, 1], fx: 'slash' },
      { right: 'fwd', aim: [0.15, 1], grip: 6, bob: 1, fx: 'impact' },
      { right: 'fwd', aim: [0.15, 1], grip: 6, bob: 1 },
      {},
    ],
  },
  /** Hammer and shield: the shield stays up, the hammer goes up and back, and smashes down. */
  smash: {
    ms: 110,
    loop: false,
    frames: [
      { right: 'tuck', aim: [0.4, -1] },
      { right: 'up', aim: [1, -0.15] },
      { right: 'fwd', aim: [1, 0.2], fx: 'slash' },
      { right: 'fwd', aim: [0.2, 1], bob: 1, fx: 'impact' },
      { right: 'fwd', aim: [0.2, 1], bob: 1 },
      {},
    ],
  },
  /** Lance: pull it back across the chest, then a long straight thrust that slides it through the hand. */
  thrust: {
    ms: 100,
    loop: false,
    frames: [
      { right: 'pull', draw: 10, aim: [1, 0.08] },
      { right: 'pull', draw: 8, aim: [1, 0.08] },
      { right: 'pull', draw: 8, aim: [1, 0.08] },
      { right: 'tuck', aim: [1, 0.08], grip: 10, fx: 'slash' },
      { right: 'fwd', aim: [1, 0.08], grip: 14, fx: 'impact' },
      { right: 'tuck', aim: [1, -0.2], grip: 6 },
      {},
    ],
  },
  /** Scythe: raise it behind you, then one wide sweep low across the front and up the other side. */
  reap: {
    ms: 100,
    loop: false,
    frames: [
      { right: 'tuck', aim: [0.35, -1] },
      { right: 'tuck', aim: [0.35, -1] },
      { right: 'fwd', aim: [1, 0.5], fx: 'slash' },
      { right: 'tuck', aim: [0.2, 1], fx: 'slash' },
      { right: 'pull', draw: 8, aim: [-0.8, 0.6], fx: 'slash' },
      { right: 'pull', draw: 8, aim: [-0.8, -0.6] },
      {},
    ],
  },
  /** Long bow: a slow full draw, hold it at the ear, release. */
  longdraw: {
    ms: 100,
    loop: false,
    frames: [
      { right: 'pull', draw: 4 },
      { right: 'pull', draw: 7 },
      { right: 'pull', draw: 10 },
      { right: 'pull', draw: 12 },
      { right: 'pull', draw: 12 },
      { fx: 'release' },
      {},
    ],
  },
  /** Hand cannon: level it across the chest, aim, fire (a flash, the barrel kicks up), smoke. */
  blast: {
    ms: 100,
    loop: false,
    frames: [
      { right: 'pull', draw: 12, aim: [1, 0], left: 'down' },
      { right: 'pull', draw: 12, aim: [1, 0], left: 'down', fx: 'charge' },
      { right: 'pull', draw: 9, aim: [1, -0.45], left: 'down', bob: 1, fx: 'burst' },
      { right: 'pull', draw: 10, aim: [1, -0.25], left: 'down', fx: 'release' },
      { right: 'pull', draw: 12, aim: [1, 0], left: 'down', fx: 'release' },
      {},
    ],
  },
  /** Boomerang: wind the arm back, throw (it leaves the hand), it flies out and comes back. */
  throw: {
    ms: 90,
    loop: false,
    frames: [
      { left: 'out' },
      { left: 'up' },
      { left: 'fwd', fly: 10, fx: 'release' },
      { left: 'fwd', fly: 22 },
      { left: 'down', fly: 34 },
      { left: 'down', fly: 42 },
      { left: 'down', fly: 30 },
      { left: 'out', fly: 16 },
      { left: 'out' },
    ],
  },
  /** Twin daggers: two quick stabs, in, back, in. */
  stab: {
    ms: 80,
    loop: false,
    frames: [{ right: 'tuck' }, { right: 'fwd', aim: [1, 0.05], fx: 'slash' }, { right: 'tuck', aim: [1, 0] }, { right: 'fwd', aim: [1, 0.3], fx: 'slash' }, { right: 'tuck', aim: [1, 0] }, {}],
  },
  /** Flame staff: raise it, the flame grows, thrust it forward and the fire bursts. */
  flare: {
    ms: 110,
    loop: false,
    frames: [
      { right: 'tuck', aim: [0.35, -1], grip: 8 },
      { right: 'tuck', aim: [0.35, -1], grip: 8, fx: 'charge' },
      { right: 'tuck', aim: [0.35, -1], grip: 8, fx: 'charge' },
      { right: 'pull', draw: 12, aim: [0.8, -1], fx: 'burst' },
      { right: 'pull', draw: 12, aim: [0.8, -1], fx: 'release' },
      {},
    ],
  },
  /** Water orb: the hand goes forward, the orb swells and pulses, and lets go a wave. */
  pulse: {
    ms: 110,
    loop: false,
    frames: [{ right: 'tuck' }, { right: 'fwd', fx: 'charge' }, { right: 'fwd', fx: 'burst' }, { right: 'fwd', fx: 'charge' }, { right: 'fwd', fx: 'burst' }, { right: 'fwd', fx: 'release' }, {}],
  },
  /** Bell staff: raise it and ring the bell, side to side, the light going out in rings. */
  ring: {
    ms: 110,
    loop: false,
    frames: [
      { right: 'tuck', aim: [0, -1], grip: 5 },
      { right: 'tuck', aim: [-0.3, -1], grip: 5, fx: 'charge' },
      { right: 'tuck', aim: [0.3, -1], grip: 5, fx: 'burst' },
      { right: 'tuck', aim: [-0.3, -1], grip: 5, fx: 'charge' },
      { right: 'tuck', aim: [0.3, -1], grip: 5, fx: 'burst' },
      { right: 'tuck', aim: [0, -1], grip: 5 },
      {},
    ],
  },
  /** Shadow sword: one fast slash, over the shoulder and down. */
  hexslash: {
    ms: 75,
    loop: false,
    frames: [{ right: 'up', aim: [-0.5, -1] }, { right: 'up', aim: [1, -0.4], fx: 'slash' }, { right: 'fwd', aim: [0.6, 1], fx: 'slash' }, { right: 'fwd', aim: [0.1, 1] }, {}],
  },
  /** Gauntlets: jab, jab, then a big punch with the weight behind it. */
  combo: {
    ms: 80,
    loop: false,
    frames: [{ right: 'tuck' }, { right: 'fwd', fx: 'impact' }, { right: 'tuck' }, { right: 'fwd', fx: 'impact' }, { right: 'tuck', bob: 1 }, { right: 'tuck', bob: 1 }, { right: 'fwd', bob: 1, fx: 'burst' }, { right: 'fwd' }, {}],
  },
  /** Claws: a quick swipe down, and one back up. */
  swipe: {
    ms: 80,
    loop: false,
    frames: [{ right: 'up' }, { right: 'fwd', fx: 'slash' }, { right: 'down', bob: 1 }, { right: 'fwd', bob: 1 }, { right: 'up', fx: 'slash' }, {}],
  },
  /** Bo staff: held in the middle and spun in front of you, the air ringing round. */
  spin: {
    ms: 70,
    loop: false,
    frames: [
      { right: 'pull', draw: 10, grip: 7, aim: [0.15, -1] },
      { right: 'pull', draw: 10, grip: 7, aim: [0.7, -0.7], fx: 'slash' },
      { right: 'pull', draw: 10, grip: 7, aim: [1, 0], fx: 'slash' },
      { right: 'pull', draw: 10, grip: 7, aim: [0.7, 0.7], fx: 'slash' },
      { right: 'pull', draw: 10, grip: 7, aim: [0, 1], fx: 'slash' },
      { right: 'pull', draw: 10, grip: 7, aim: [-0.7, 0.7], fx: 'slash' },
      { right: 'pull', draw: 10, grip: 7, aim: [-1, 0] },
      {},
    ],
  },
  /** Ki palms: draw the ki in at the hip, then push both palms forward and it flares out. */
  palms: {
    ms: 100,
    loop: false,
    frames: [
      { right: 'tuck', fx: 'charge' },
      { right: 'tuck', bob: 1, fx: 'charge' },
      { right: 'fwd', left: 'fwd', fx: 'burst' },
      { right: 'fwd', left: 'fwd', fx: 'release' },
      { right: 'fwd', left: 'fwd' },
      {},
    ],
  },
} satisfies Record<string, Clip>;

export type ClipId = keyof typeof CLIPS;

/** What a sprite is doing. Each sprite maps these to its own clips (a warrior's attack is a swing). */
export type SpriteAction = 'idle' | 'attack' | 'walk';

export const clip = (id: ClipId): Clip => CLIPS[id];
