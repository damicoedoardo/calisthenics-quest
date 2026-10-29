import type { Track } from './music';

/*
 * The Fog's music, zone by zone: a theme for the run and one for the boss, each written for its
 * place and its lesson, plus the Warden's theme and two stings for the moments a zone ends on.
 * Same pattern syntax as music.ts: one token per step, "A4" a note, "-" hold, "." silence,
 * "x" a drum hit. Bars are 8 steps (stepsPerBeat 2), and every voice of a track has the same length.
 *
 *   zone 1 Ashlands        fog / fogBoss (in music.ts)
 *   zone 2 Mirror Lake     lake / lakeBoss: glassy bells, and a melody answered by its own reflection
 *   zone 3 the Village     forge / forgeBoss: an anvil keeps the beat, a stiff, proud march
 *   zone 4 the Plateau     plateau / plateauBoss: one figure over and over, layers creeping in;
 *                          the shatter sting breaks it open
 *   zone 5 the Fog         woods / woodsBoss: sparse and lonely; the warmth sting brings the lonely
 *                          tune back in major when you take the Hollow's hand
 *   zone 6 the Summit      summit / summitBoss: wide and rising, allies joining as layers
 *   the Warden of the Ashes (halfway down every dungeon)    warden
 *   the Ember Road's worlds:
 *   the Whetstone Pass     pass / passBoss: a walking tune up a mountain road, two voices that
 *                          answer each other; the Lull's boss theme is a lullaby that tries to rock
 *                          you to sleep while the drums keep you awake
 *   the Quiet Miles        miles / milesBoss: a lonely call into the dark, and after a long
 *                          quiet, an answer from far off; the Distance's theme is two voices
 *                          drifting apart that keep finding each other again
 *   the Long Bridge        bridge / bridgeBoss: a rope-hauling song, everyone pulling on the beat;
 *                          the boss's march starts alone and gains a voice every few bars
 */

export type ZoneTrackId = 'lake' | 'lakeBoss' | 'forge' | 'forgeBoss' | 'plateau' | 'plateauBoss' | 'woods' | 'woodsBoss' | 'summit' | 'summitBoss' | 'warden' | 'pass' | 'passBoss' | 'miles' | 'milesBoss' | 'bridge' | 'bridgeBoss';
export type ZoneStingId = 'shatter' | 'warmth';

// ---------- helpers ----------

const bars = (...b: string[]) => b.join(' ');
const loop = (n: number, bar: string) => bars(...Array.from({ length: n }, () => bar));
const rest = (n: number) => loop(n, '. . . . . . . .');
const twice = (...b: string[]) => bars(...b, ...b);

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Moves every note of a pattern up (or down) by semitones. */
export function transpose(pattern: string, semis: number): string {
  return pattern
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => {
      const m = /^([A-G]#?)(\d)$/.exec(t);
      if (!m) return t;
      const n = NOTES.indexOf(m[1]) + Number(m[2]) * 12 + semis;
      return `${NOTES[((n % 12) + 12) % 12]}${Math.floor(n / 12)}`;
    })
    .join(' ');
}

/** The same pattern, starting `n` steps later (the end that falls off is dropped): a canon, an echo. */
export function later(pattern: string, n: number): string {
  const t = pattern.split(/\s+/).filter(Boolean);
  return [...Array<string>(n).fill('.'), ...t.slice(0, t.length - n)].join(' ');
}

// ---------- zone 2: Mirror Lake ----------

// E minor, a lake that holds the sky. Bells ripple, and the tune comes back to you from the water.
const LAKE_ARP = bars(
  'E5 G5 B5 E6 B5 G5 E5 G5',
  'C5 E5 G5 B5 G5 E5 C5 E5',
  'G4 B4 D5 G5 D5 B4 G4 B4',
  'D5 F#5 A5 D6 A5 F#5 D5 F#5',
  'E5 G5 B5 E6 B5 G5 E5 G5',
  'C5 E5 G5 C6 G5 E5 C5 E5',
  'A4 C5 E5 A5 E5 C5 A4 C5',
  'B4 D#5 F#5 B5 F#5 D#5 B4 D#5',
);
const LAKE_BASS = bars('E2 . E3 . E2 . B2 .', 'C2 . C3 . C2 . G2 .', 'G2 . G3 . G2 . D3 .', 'D2 . D3 . D2 . A2 .', 'E2 . E3 . E2 . B2 .', 'C2 . C3 . C2 . G2 .', 'A2 . A3 . A2 . E3 .', 'B1 . B2 . B1 . F#2 .');
const LAKE_TUNE = bars(
  'B5 - - - A5 - G5 -',
  'E5 - - - G5 - B5 -',
  'D5 - - - B4 - D5 -',
  'F#5 - - - - - A5 -',
  'G5 - - - F#5 - E5 -',
  'E5 - G5 - C6 - B5 -',
  'A5 - - - C6 - E6 -',
  'D#6 - - - B5 - - -',
);

// The Mirror: the same lake gone sharp, E phrygian. Its tune is chased by its own reflection.
const MIRROR_TUNE = bars(
  'E5 - G5 - B5 - A5 G5',
  'F#5 - E5 - - - B4 -',
  'F5 - A5 - C6 - B5 A5',
  'G#5 - - - E5 - - -',
  'C6 - B5 - A5 - G5 -',
  'E5 - G5 - E5 - C5 -',
  'B4 - D#5 - F#5 - B5 -',
  'A5 - G5 - F#5 - D#5 -',
);

// ---------- zone 3: the Village of Almosts ----------

// C minor, a march: the anvil rings on the beat and never misses one. Stiff, proud, a little too perfect.
const FORGE_ANVIL = loop(8, 'C6 . . . C6 . G5 .');
const FORGE_BASS = bars('C2 - - C2 G1 - - G1', 'C2 - - C2 G1 - - G1', 'G#1 - - G#1 D#2 - - D#2', 'G1 - - G1 D2 - - D2', 'C2 - - C2 G1 - - G1', 'F1 - - F1 C2 - - C2', 'G1 - - G1 D2 - - D2', 'G1 - - G1 B1 - D2 -');
const FORGE_TUNE = bars(
  'C5 - - G4 C5 - D#5 -',
  'G5 - - - - - D#5 -',
  'G#5 - - G5 F5 - D#5 -',
  'D5 - - - G4 - - -',
  'C5 - - G4 C5 - D#5 -',
  'F5 - - D#5 F5 - G#5 -',
  'G5 - - F5 D#5 - D5 -',
  'B4 - - - G4 - - -',
);
const FORGE_PAD = bars('D#4 - - - - - - -', 'D#4 - - - G4 - - -', 'C4 - - - - - - -', 'B3 - - - D4 - - -', 'D#4 - - - - - - -', 'C4 - - - G#3 - - -', 'B3 - - - D4 - - -', 'D4 - - - F4 - - -');

// The Perfect Knight: everything hits together, on a 3-3-2 that never bends.
const KNIGHT_HITS = (root: string) => `${root} . . ${root} . . ${root} .`;
const KNIGHT_BASS = bars(KNIGHT_HITS('C2'), KNIGHT_HITS('C2'), KNIGHT_HITS('G#1'), KNIGHT_HITS('G1'), KNIGHT_HITS('C2'), KNIGHT_HITS('F1'), KNIGHT_HITS('G1'), 'G1 . . G1 . . B1 D2');
const KNIGHT_TUNE = bars(
  'C5 - - D#5 - - G5 -',
  'C6 - - - B5 - G5 -',
  'G#5 - - G5 - - F5 -',
  'G5 - - - - - - -',
  'C5 - - D#5 - - G5 -',
  'G#5 - - G5 - - F5 -',
  'D#5 - - D5 - - B4 -',
  'D5 - - - F5 - G5 -',
);

// ---------- the Ember Road: the Whetstone Pass ----------

// G major, walking pace up the pass. One voice calls, a second answers a bar later: friends on the
// road, pushing each other on. A whetstone's ring now and then.
const PASS_BASS = bars('G2 . D3 . G2 . D3 .', 'C3 . G2 . C3 . G2 .', 'E2 . B2 . E2 . B2 .', 'D2 . A2 . D2 . F#2 .', 'G2 . D3 . G2 . D3 .', 'C3 . G2 . C3 . E3 .', 'A2 . E3 . D2 . A2 .', 'D2 . F#2 . A2 . D3 .');
const PASS_CALL = bars(
  'D5 - G5 - B5 - - -',
  '. . . . . . . .',
  'B5 - A5 - G5 - E5 -',
  '. . . . . . . .',
  'D5 - G5 - B5 - D6 -',
  '. . . . . . . .',
  'C6 - B5 - A5 - - -',
  '. . . . . . . .',
);
const PASS_ANSWER = bars(
  '. . . . . . . .',
  'E5 - G5 - C6 - - -',
  '. . . . . . . .',
  'F#5 - A5 - D6 - - -',
  '. . . . . . . .',
  'E5 - G5 - C6 - E6 -',
  '. . . . . . . .',
  'D6 - C6 - A5 - F#5 -',
);
const PASS_RING = loop(8, 'G6 . . . . . . .');

// The Lull: a lullaby in D, rocking low and slow under a music-box tune. The drums keep coming in
// under it, louder each time, the party keeping each other awake.
const LULL_ROCK = bars('D2 - A2 - D3 - A2 -', 'D2 - A2 - D3 - A2 -', 'G2 - D3 - G3 - D3 -', 'A2 - E3 - A3 - E3 -', 'D2 - A2 - D3 - A2 -', 'B1 - F#2 - B2 - F#2 -', 'G2 - D3 - A2 - E3 -', 'A2 - C#3 - E3 - A2 -');
const LULL_TUNE = bars(
  'A5 - - F#5 - - D5 -',
  'E5 - F#5 - G5 - - -',
  'B5 - - G5 - - E5 -',
  'C#6 - - - A5 - - -',
  'A5 - - F#5 - - D5 -',
  'D5 - F#5 - B5 - - -',
  'G5 - F#5 - E5 - D5 -',
  'E5 - - - A4 - - -',
);

// ---------- the Ember Road: the Quiet Miles ----------

// E minor, slow, a lot of quiet. One voice calls into the valley; two bars of nothing; then the
// answer, softer, from far away. It always comes.
const MILES_DRONE = bars('E2 - - - - - - -', 'E2 - - - - - - -', 'C2 - - - - - - -', 'C2 - - - - - - -', 'A1 - - - - - - -', 'A1 - - - - - - -', 'B1 - - - - - - -', 'B1 - - - D#2 - - -');
const MILES_CALL = bars('B4 - - E5 - - G5 -', 'F#5 - - - - - - -', '. . . . . . . .', '. . . . . . . .', 'A4 - - C5 - - E5 -', 'D#5 - - - B4 - - -', '. . . . . . . .', '. . . . . . . .');
const MILES_ANSWER = bars('. . . . . . . .', '. . . . . . . .', 'G5 - - E5 - - B4 -', 'C5 - - - - - - -', '. . . . . . . .', '. . . . . . . .', 'F#5 - - D#5 - - B4 -', 'E5 - - - - - - -');
const MILES_LAMP = loop(8, 'E6 . . . . . . .');

// The Distance: two voices playing the same tune, one a little behind the other; they drift apart
// by a step every few bars, then fall back together. Under them, a quick glassy tick.
const DIST_BASS = bars('E2 . E3 . E2 . E3 .', 'C2 . C3 . C2 . C3 .', 'A1 . A2 . A1 . A2 .', 'B1 . B2 . B1 . D#3 .', 'E2 . E3 . E2 . E3 .', 'G2 . G3 . G2 . G3 .', 'A1 . A2 . C2 . C3 .', 'B1 . B2 . D#2 . F#2 .');
const DIST_TUNE = bars(
  'E5 - G5 - B5 - A5 -',
  'G5 - - - E5 - - -',
  'C5 - E5 - A5 - G5 -',
  'F#5 - - - D#5 - - -',
  'E5 - G5 - B5 - E6 -',
  'D6 - - - B5 - - -',
  'C6 - B5 - A5 - G5 -',
  'F#5 - - - - - - -',
);
const DIST_TICK = loop(8, 'B5 . E6 . B5 . G5 .');

// ---------- the Ember Road: the Long Bridge ----------

// D major, a rope-hauling song: everyone pulls on the one (the thump and the low "heave").
const BRIDGE_BASS = bars('D2 . . A2 D2 . . A2', 'G2 . . D3 G2 . . D3', 'D2 . . A2 D2 . . A2', 'A2 . . E3 A2 . C#3 .', 'D2 . . A2 D2 . . A2', 'G2 . . D3 B2 . . G2', 'A2 . . E3 A2 . . E3', 'D2 . A2 . D2 . . .');
const BRIDGE_TUNE = bars(
  'A4 - D5 - F#5 - E5 D5',
  'B4 - D5 - G5 - - -',
  'A4 - D5 - F#5 - A5 -',
  'G5 - F#5 - E5 - - -',
  'A4 - D5 - F#5 - E5 D5',
  'B4 - D5 - G5 - B5 -',
  'A5 - G5 - F#5 - E5 -',
  'D5 - - - . . . .',
);
const BRIDGE_HEAVE = loop(8, 'D3 - - - . . . .');

// The One Who Walks Alone: an A minor march, one voice at first. Every four bars another joins it,
// until the whole party is marching.
const ALONE_MARCH = bars('A2 . A2 . E2 . A2 .', 'F2 . F2 . C2 . F2 .', 'G2 . G2 . D2 . G2 .', 'E2 . E2 . B1 . E2 .', 'A2 . A2 . E2 . A2 .', 'F2 . F2 . C2 . F2 .', 'D2 . D2 . A1 . D2 .', 'E2 . E2 . G#2 . B2 .');
const ALONE_TUNE = bars(
  'A4 - - B4 C5 - E5 -',
  'F5 - E5 - C5 - - -',
  'D5 - - E5 F5 - G5 -',
  'E5 - - - B4 - - -',
  'A4 - - B4 C5 - E5 -',
  'F5 - A5 - G5 - F5 -',
  'E5 - D5 - C5 - B4 -',
  'A4 - - - G#4 - - -',
);

// ---------- zone 4: the Plateau ----------

// D dorian. One figure, over and over, like a flat road. Something joins every four bars, so you
// only notice the change when you look back.
const PLATEAU_FIGURE = loop(16, 'D3 A3 D4 A3 D3 A3 D4 A3');
const PLATEAU_DRONE = bars(rest(4), loop(8, 'D2 - - - - - - -'), 'A#1 - - - - - - -', 'A#1 - - - - - - -', 'C2 - - - - - - -', 'C2 - - - - - - -');
const PLATEAU_BELL = bars(rest(8), 'F5 - - - E5 - - -', 'D5 - - - - - - -', 'C5 - - - D5 - - -', 'A4 - - - - - - -', 'F5 - - - G5 - - -', 'A5 - - - - - - -', 'G5 - - - E5 - - -', 'D5 - - - - - - -');
const PLATEAU_STEPS = bars(rest(4), loop(12, 'x . . . . . . .'));

// The Plateau, awake: the same figure, heavier, and it keeps getting louder without going anywhere.
const PLATEAU_BOSS_FIGURE = loop(16, 'D3 A3 D4 A3 D3 A3 D4 A3');
const PLATEAU_BOSS_LOW = bars(loop(12, 'D2 D2 D2 D2 D2 D2 D2 D2'), 'A#1 A#1 A#1 A#1 A#1 A#1 A#1 A#1', 'A#1 A#1 A#1 A#1 A#1 A#1 A#1 A#1', 'C2 C2 C2 C2 C2 C2 C2 C2', 'C2 C2 C2 C2 C2 C2 E2 E2');
const PLATEAU_BOSS_TUNE = bars(
  rest(4),
  'D5 - - - - - - -',
  'E5 - - - - - - -',
  'F5 - - - - - - -',
  'E5 - - - - - - -',
  'D5 - - - F5 - - -',
  'G5 - - - F5 - - -',
  'A5 - - - G5 - - -',
  'F5 - - - E5 - - -',
  'D6 - - - C6 - - -',
  'A#5 - - - - - - -',
  'C6 - - - - - - -',
  'E6 - - - - - - -',
);

// ---------- zone 5: the Fog ----------

// A minor, with room around every note: a lonely tune, a far heartbeat, drips in the dark.
const FOG_TUNE = bars(
  'E5 - - - - - . .',
  '. . . . D5 - C5 -',
  'A4 - - - - - . .',
  '. . . . . . . .',
  'C5 - - - D5 - E5 -',
  'G5 - - - E5 - . .',
  'D5 - - - - - . .',
  '. . . . . . . .',
);

// The Hollow: the old voice (its notes from the opening), closer now, over a pulse that won't let up.
const HOLLOW_TUNE = bars(
  'D5 - - - D#5 - - -',
  'D5 - - - - - . .',
  'F5 - - - E5 - - -',
  'D#5 - - - D5 - C#5 -',
  'A5 - - - A#5 - - -',
  'A5 - - - - - . .',
  'F5 - - - E5 - D5 -',
  'C#5 - - - - - . .',
);

// ---------- zone 6: the Summit ----------

// D major, wide and rising. Every four bars someone else falls in beside you: first you, then a
// friend's counter-melody, then another's harmony and the drums.
const SUMMIT_BASS = bars('D2 . D3 . D2 . D3 .', 'B1 . B2 . B1 . B2 .', 'G1 . G2 . G1 . G2 .', 'A1 . A2 . A1 . C#3 .');
const SUMMIT_ARP = bars('D4 A4 D5 F#5 A5 F#5 D5 A4', 'B3 F#4 B4 D5 F#5 D5 B4 F#4', 'G3 D4 G4 B4 D5 B4 G4 D4', 'A3 E4 A4 C#5 E5 C#5 A4 E4');
const SUMMIT_TUNE = bars('D5 - - - E5 - F#5 -', 'F#5 - - - E5 - D5 -', 'B4 - - - D5 - G5 -', 'A5 - - - - - - -');
const SUMMIT_FRIEND = bars('A5 - F#5 - A5 - B5 -', 'D6 - - - B5 - A5 -', 'G5 - B5 - D6 - B5 -', 'C#6 - - - E6 - - -');
const SUMMIT_HARMONY = transpose(SUMMIT_TUNE, 4);

// ---------- the Warden of the Ashes ----------

// A phrygian, hot and short: a grinding low riff and an ember-bright lead.
const WARDEN_BASS = loop(4, bars('A1 A1 A2 A1 A#1 A1 A2 A1', 'A1 A1 A2 A1 G1 A1 A#1 A1'));
const WARDEN_TUNE = bars('A4 - A#4 A4 - - E5 -', 'D5 - C5 - A#4 - A4 -', 'A4 - A#4 A4 - - G5 -', 'F5 - E5 - D5 - E5 -', 'A5 - - - G5 - F5 -', 'E5 - F5 - E5 - D5 -', 'C5 - A#4 - A4 - G4 -', 'A4 - - - E4 - A#4 -');

/* Levels: every theme is set (with `level`) to play as loud as the zone-1 themes it replaces, measured
   by rendering 30 s of each offline and taking its loudness (LUFS, as streaming services do): runs at
   about -25.5 like `fog`, bosses about -24.5 like `fogBoss`, peaks kept under -3 dBFS. After changing
   a theme, measure it again rather than trusting your ears on a laptop. */

export const ZONE_TRACKS: Record<ZoneTrackId | ZoneStingId, Track> = {
  pass: {
    level: 1.45,
    bpm: 108,
    stepsPerBeat: 2,
    dry: true,
    voices: [
      { wave: 'triangle', gain: 0.13, pattern: twice(PASS_BASS) },
      { wave: 'square', gain: 0.03, cutoff: 2400, pattern: bars(rest(8), PASS_CALL) },
      { wave: 'triangle', gain: 0.09, pattern: bars(rest(8), PASS_ANSWER) },
      { wave: 'anvil', gain: 0.04, pattern: twice(PASS_RING) },
      { wave: 'thump', gain: 0.32, pattern: loop(16, 'x . . . x . . .') },
      { wave: 'hat', gain: 0.016, pattern: loop(16, '. . x . . . x x') },
    ],
  },
  passBoss: {
    level: 1.5,
    bpm: 120,
    stepsPerBeat: 2,
    dry: true,
    voices: [
      { wave: 'triangle', gain: 0.14, pattern: twice(LULL_ROCK) },
      { wave: 'glass', gain: 0.06, pattern: twice(LULL_TUNE) },
      { wave: 'sine', gain: 0.07, pattern: bars(rest(8), transpose(LULL_TUNE, -12)) },
      // the drums that keep you awake: soft at first, then all in
      { wave: 'thump', gain: 0.4, pattern: bars(loop(8, 'x . . . . . x .'), loop(8, 'x . . x . . x .')) },
      { wave: 'snare', gain: 0.08, pattern: bars(rest(4), loop(3, '. . . . x . . .'), '. . x . x x x x', loop(7, '. . x . . . x .'), 'x x x x x x x x') },
      { wave: 'hat', gain: 0.018, pattern: bars(rest(8), loop(8, 'x x x x x x x x')) },
    ],
  },
  miles: {
    level: 1.5,
    bpm: 84,
    stepsPerBeat: 2,
    dry: true,
    voices: [
      { wave: 'sine', gain: 0.12, pattern: twice(MILES_DRONE) },
      { wave: 'triangle', gain: 0.1, pattern: twice(MILES_CALL) },
      // the answer, from far away: softer, an octave down
      { wave: 'glass', gain: 0.045, pattern: bars(rest(8), transpose(MILES_ANSWER, -12)) },
      { wave: 'glass', gain: 0.03, pattern: twice(MILES_LAMP) },
      { wave: 'thump', gain: 0.2, pattern: loop(16, 'x . . . . . . .') },
    ],
  },
  milesBoss: {
    level: 1.5,
    bpm: 112,
    stepsPerBeat: 2,
    dry: true,
    voices: [
      { wave: 'triangle', gain: 0.14, pattern: twice(DIST_BASS) },
      { wave: 'square', gain: 0.03, cutoff: 2200, pattern: twice(DIST_TUNE) },
      // the second voice: a step behind, then two, then back with the first
      { wave: 'triangle', gain: 0.08, pattern: bars(later(DIST_TUNE, 1), later(DIST_TUNE, 2)) },
      { wave: 'glass', gain: 0.035, pattern: twice(DIST_TICK) },
      { wave: 'thump', gain: 0.36, pattern: loop(16, 'x . . . x . . .') },
      { wave: 'hat', gain: 0.016, pattern: loop(16, '. x . x . x . x') },
    ],
  },
  bridge: {
    level: 1.45,
    bpm: 100,
    stepsPerBeat: 2,
    dry: true,
    voices: [
      { wave: 'triangle', gain: 0.13, pattern: twice(BRIDGE_BASS) },
      { wave: 'square', gain: 0.03, cutoff: 2400, pattern: bars(rest(8), BRIDGE_TUNE) },
      { wave: 'triangle', gain: 0.08, pattern: bars(BRIDGE_TUNE, transpose(BRIDGE_TUNE, -12)) },
      { wave: 'sine', gain: 0.08, pattern: twice(BRIDGE_HEAVE) },
      { wave: 'thump', gain: 0.34, pattern: loop(16, 'x . . . . . x .') },
      { wave: 'hat', gain: 0.014, pattern: loop(16, '. . x . . . x .') },
    ],
  },
  bridgeBoss: {
    level: 1.5,
    bpm: 116,
    stepsPerBeat: 2,
    dry: true,
    voices: [
      { wave: 'triangle', gain: 0.14, pattern: twice(ALONE_MARCH) },
      // alone at first; a voice joins every four bars
      { wave: 'square', gain: 0.03, cutoff: 2200, pattern: twice(ALONE_TUNE) },
      { wave: 'triangle', gain: 0.07, pattern: bars(rest(4), ALONE_TUNE.split(' ').slice(32).join(' '), transpose(ALONE_TUNE, -12)) },
      { wave: 'glass', gain: 0.04, pattern: bars(rest(8), transpose(ALONE_TUNE, 12)) },
      { wave: 'thump', gain: 0.38, pattern: bars(loop(8, 'x . . . x . . .'), loop(8, 'x . x . x . x .')) },
      { wave: 'snare', gain: 0.08, pattern: bars(rest(12), loop(4, '. . x . . . x .')) },
    ],
  },
  lake: {
    level: 1.36,
    bpm: 104,
    stepsPerBeat: 2,
    dry: true,
    voices: [
      { wave: 'triangle', gain: 0.13, pattern: twice(LAKE_BASS) },
      { wave: 'glass', gain: 0.05, pattern: twice(LAKE_ARP) },
      { wave: 'triangle', gain: 0.1, pattern: bars(rest(8), LAKE_TUNE) },
      // the reflection: the tune again from under the water, an octave down and a beat behind
      { wave: 'sine', gain: 0.06, pattern: bars(rest(8), later(transpose(LAKE_TUNE, -12), 2)) },
      { wave: 'thump', gain: 0.28, pattern: loop(16, 'x . . . . . x .') },
      { wave: 'hat', gain: 0.014, pattern: loop(16, '. . x . . . x .') },
    ],
  },
  lakeBoss: {
    level: 1.75,
    bpm: 132,
    stepsPerBeat: 2,
    dry: true,
    voices: [
      {
        wave: 'square',
        gain: 0.05,
        cutoff: 800,
        pattern: twice('E2 E3 E2 E3 E2 E3 E2 E3', 'E2 E3 E2 E3 E2 E3 E2 E3', 'F2 F3 F2 F3 F2 F3 F2 F3', 'E2 E3 E2 E3 E2 E3 E2 E3', 'C2 C3 C2 C3 C2 C3 C2 C3', 'C2 C3 C2 C3 C2 C3 C2 C3', 'B1 B2 B1 B2 B1 B2 B1 B2', 'B1 B2 B1 B2 D#2 D#3 F#2 F#3'),
      },
      { wave: 'square', gain: 0.026, cutoff: 2600, pattern: twice(MIRROR_TUNE) },
      // the Mirror copies you: the same tune in glass, three steps behind
      { wave: 'glass', gain: 0.055, pattern: twice(later(MIRROR_TUNE, 3)) },
      { wave: 'thump', gain: 0.3, pattern: loop(16, 'x . . . x . . .') },
      { wave: 'snare', gain: 0.08, pattern: bars(loop(15, '. . x . . . x .'), '. . x . x x x x') },
      { wave: 'hat', gain: 0.022, pattern: loop(16, 'x x x x x x x x') },
    ],
  },
  forge: {
    level: 1.50,
    bpm: 112,
    stepsPerBeat: 2,
    dry: true,
    voices: [
      { wave: 'square', gain: 0.055, cutoff: 650, pattern: twice(FORGE_BASS) },
      { wave: 'anvil', gain: 0.07, pattern: twice(FORGE_ANVIL) },
      { wave: 'triangle', gain: 0.07, pattern: twice(FORGE_PAD) },
      { wave: 'square', gain: 0.03, cutoff: 2600, pattern: bars(rest(8), FORGE_TUNE) },
      { wave: 'thump', gain: 0.38, pattern: loop(16, 'x . . . x . . .') },
      { wave: 'snare', gain: 0.08, pattern: bars(loop(7, '. . x . . . x x'), '. . x . x x x x', loop(7, '. . x . . . x x'), 'x x x x x x x x') },
    ],
  },
  forgeBoss: {
    level: 1.30,
    bpm: 138,
    stepsPerBeat: 2,
    dry: true,
    voices: [
      { wave: 'square', gain: 0.06, cutoff: 900, pattern: twice(KNIGHT_BASS) },
      { wave: 'anvil', gain: 0.075, pattern: twice(loop(7, 'C6 . . C6 . . G5 .'), 'C6 . . C6 . . C6 C6') },
      { wave: 'square', gain: 0.03, cutoff: 3000, pattern: twice(KNIGHT_TUNE) },
      { wave: 'triangle', gain: 0.08, pattern: bars(rest(8), transpose(KNIGHT_TUNE, -12)) },
      { wave: 'thump', gain: 0.45, pattern: loop(16, 'x . . x . . x .') },
      { wave: 'snare', gain: 0.1, pattern: bars(loop(7, '. . x . . . x .'), 'x . x . x x x x', loop(7, '. . x . . . x .'), 'x x x x x x x x') },
    ],
  },
  plateau: {
    level: 1.40,
    bpm: 96,
    stepsPerBeat: 2,
    voices: [
      { wave: 'triangle', gain: 0.11, pattern: PLATEAU_FIGURE },
      { wave: 'triangle', gain: 0.1, pattern: PLATEAU_DRONE },
      { wave: 'glass', gain: 0.05, pattern: PLATEAU_BELL },
      { wave: 'thump', gain: 0.25, pattern: PLATEAU_STEPS },
      { wave: 'hat', gain: 0.012, pattern: bars(rest(12), loop(4, '. . x . . . x .')) },
    ],
  },
  plateauBoss: {
    level: 1.27,
    bpm: 112,
    stepsPerBeat: 2,
    dry: true,
    voices: [
      { wave: 'triangle', gain: 0.12, pattern: PLATEAU_BOSS_FIGURE },
      { wave: 'square', gain: 0.05, cutoff: 600, pattern: PLATEAU_BOSS_LOW },
      { wave: 'square', gain: 0.028, cutoff: 2200, pattern: PLATEAU_BOSS_TUNE },
      // the drums creep in: steps, then a snare, then everything
      { wave: 'thump', gain: 0.4, pattern: bars(loop(4, 'x . . . . . . .'), loop(8, 'x . . . x . . .'), loop(4, 'x . x . x . x .')) },
      { wave: 'snare', gain: 0.08, pattern: bars(rest(8), loop(7, '. . . . x . . .'), '. . x . x x x x') },
      { wave: 'hat', gain: 0.02, pattern: bars(rest(12), loop(4, 'x x x x x x x x')) },
    ],
  },
  woods: {
    level: 1.50,
    bpm: 84,
    stepsPerBeat: 2,
    voices: [
      { wave: 'sine', gain: 0.09, pattern: twice(FOG_TUNE) },
      { wave: 'triangle', gain: 0.1, pattern: loop(4, bars('A2 - - - - - - -', '. . . . . . . .', 'F2 - - - - - - -', '. . . . E2 - - -')) },
      { wave: 'glass', gain: 0.03, pattern: loop(4, bars('. . . . . . . .', '. . . . . . B5 .', '. . . . . . . .', '. . E6 . . . . .')) },
      // a far heartbeat, every other bar
      { wave: 'thump', gain: 0.3, pattern: loop(8, bars('x . x . . . . .', '. . . . . . . .')) },
    ],
  },
  woodsBoss: {
    level: 1.33,
    bpm: 112,
    stepsPerBeat: 2,
    dry: true,
    voices: [
      { wave: 'square', gain: 0.05, cutoff: 520, pattern: twice(loop(2, 'D2 D2 D2 D2 D2 D2 D2 D2'), loop(2, 'A#1 A#1 A#1 A#1 A#1 A#1 A#1 A#1'), loop(2, 'D2 D2 D2 D2 D2 D2 D2 D2'), loop(2, 'A1 A1 A1 A1 A1 A1 A1 A1')) },
      { wave: 'triangle', gain: 0.11, pattern: twice(HOLLOW_TUNE) },
      // the lonely tune is still in there, high and thin, the second time round
      { wave: 'sine', gain: 0.05, pattern: bars(rest(8), transpose(FOG_TUNE, 5)) },
      { wave: 'thump', gain: 0.5, pattern: loop(16, 'x . x . . . . .') },
      { wave: 'hat', gain: 0.016, pattern: loop(16, '. x . x . x . x') },
    ],
  },
  summit: {
    level: 1.27,
    bpm: 120,
    stepsPerBeat: 2,
    voices: [
      { wave: 'triangle', gain: 0.13, pattern: loop(4, SUMMIT_BASS) },
      { wave: 'glass', gain: 0.045, pattern: loop(4, SUMMIT_ARP) },
      { wave: 'triangle', gain: 0.1, pattern: bars(rest(4), loop(3, SUMMIT_TUNE)) },
      { wave: 'square', gain: 0.022, cutoff: 2400, pattern: bars(rest(8), loop(2, SUMMIT_FRIEND)) },
      { wave: 'square', gain: 0.018, cutoff: 2000, pattern: bars(rest(12), SUMMIT_HARMONY) },
      { wave: 'thump', gain: 0.3, pattern: bars(rest(8), loop(8, 'x . . . x . . .')) },
      { wave: 'snare', gain: 0.06, pattern: bars(rest(12), loop(3, '. . x . . . x .'), '. . x . x x x x') },
    ],
  },
  summitBoss: {
    level: 1.06,
    bpm: 140,
    stepsPerBeat: 2,
    dry: true,
    voices: [
      // everyone at once, and halfway through the whole song climbs a step
      { wave: 'triangle', gain: 0.14, pattern: bars(loop(2, SUMMIT_BASS), transpose(loop(2, SUMMIT_BASS), 2)) },
      { wave: 'square', gain: 0.022, cutoff: 2600, pattern: bars(loop(2, SUMMIT_ARP), transpose(loop(2, SUMMIT_ARP), 2)) },
      { wave: 'triangle', gain: 0.11, pattern: bars(loop(2, SUMMIT_TUNE), transpose(loop(2, SUMMIT_TUNE), 2)) },
      { wave: 'square', gain: 0.024, cutoff: 2600, pattern: bars(loop(2, SUMMIT_FRIEND), transpose(loop(2, SUMMIT_FRIEND), 2)) },
      { wave: 'glass', gain: 0.04, pattern: bars(loop(2, SUMMIT_HARMONY), transpose(loop(2, SUMMIT_HARMONY), 2)) },
      { wave: 'thump', gain: 0.45, pattern: loop(16, 'x . . . x . x .') },
      { wave: 'snare', gain: 0.09, pattern: bars(loop(7, '. . x . . . x .'), '. . x . x x x x', loop(7, '. . x . . . x .'), 'x x x x x x x x') },
      { wave: 'hat', gain: 0.022, pattern: loop(16, 'x x x x x x x x') },
    ],
  },
  warden: {
    level: 1.38,
    bpm: 144,
    stepsPerBeat: 2,
    dry: true,
    voices: [
      { wave: 'square', gain: 0.06, cutoff: 750, pattern: WARDEN_BASS },
      { wave: 'sawtooth', gain: 0.022, cutoff: 1500, pattern: WARDEN_TUNE },
      { wave: 'anvil', gain: 0.04, pattern: loop(8, 'A5 . . . . . . .') },
      { wave: 'thump', gain: 0.34, pattern: loop(8, 'x . x . x . . x') },
      { wave: 'snare', gain: 0.1, pattern: bars(loop(7, '. . x . . . x .'), 'x x . x x x x x') },
      { wave: 'hat', gain: 0.024, pattern: loop(8, 'x x x x x x x x') },
    ],
  },
  // The Plateau breaks: the figure that went nowhere for weeks rushes up into D major and rings out.
  shatter: {
    bpm: 132,
    stepsPerBeat: 4,
    voices: [
      { wave: 'triangle', gain: 0.13, pattern: 'D3 A3 D4 F#4 A4 D5 F#5 A5 D6 - - - - - - - - - - - - - - . . . . . . . . .' },
      { wave: 'glass', gain: 0.07, pattern: '. . . . . . . . D6 . . . F#6 . . . A6 - - - - - - - - - - . . . . .' },
      { wave: 'square', gain: 0.03, cutoff: 2600, pattern: '. . . . . . . . A4 - - - - - - - - - - - - - - - - - - . . . . .' },
      { wave: 'thump', gain: 0.5, pattern: '. . . . . . . . x . . . . . . . . . . . . . . . . . . . . . . .' },
    ],
  },
  // You take the Hollow's hand: the lonely tune from the Fog comes back in A major, held and warm.
  warmth: {
    bpm: 84,
    stepsPerBeat: 2,
    voices: [
      { wave: 'triangle', gain: 0.11, pattern: 'E5 - - - D5 - C#5 - A4 - - - C#5 - E5 - A5 - - - - - - .' },
      { wave: 'sine', gain: 0.07, pattern: 'C#5 - - - B4 - A4 - E4 - - - A4 - C#5 - E5 - - - - - - .' },
      { wave: 'triangle', gain: 0.1, pattern: 'A2 - - - - - - - D3 - - - - - - - A2 - - - - - - .' },
    ],
  },
};

/** Which music each Fog world plays (a zone's id, 0 = the Ashlands; from 6 the Ember Road's). */
export const ZONE_MUSIC: { run: ZoneTrackId | 'fog'; boss: ZoneTrackId | 'fogBoss'; win?: ZoneStingId }[] = [
  { run: 'fog', boss: 'fogBoss' },
  { run: 'lake', boss: 'lakeBoss' },
  { run: 'forge', boss: 'forgeBoss' },
  { run: 'plateau', boss: 'plateauBoss', win: 'shatter' },
  { run: 'woods', boss: 'woodsBoss', win: 'warmth' },
  { run: 'summit', boss: 'summitBoss' },
  // the Ember Road's worlds
  { run: 'pass', boss: 'passBoss' },
  { run: 'miles', boss: 'milesBoss' },
  { run: 'bridge', boss: 'bridgeBoss' },
];

export const zoneMusic = (zone: number) => ZONE_MUSIC[Math.max(0, Math.min(ZONE_MUSIC.length - 1, zone))];
