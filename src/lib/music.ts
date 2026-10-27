'use client';

/**
 * Tiny chiptune engine on Web Audio. Every track is written as note patterns, so the
 * music costs no downloads and works offline.
 *
 * Pattern syntax: one token per step. "A4" plays a note, "-" holds the previous note,
 * "." is silence, "x" is a heartbeat thump.
 */

import { ZONE_TRACKS, type ZoneStingId, type ZoneTrackId } from './music-zones';

export type TrackId = 'memory' | 'hollow' | 'heartbeat' | 'rise' | 'camp' | 'fog' | 'fogBoss' | ZoneTrackId;
export type StingId = 'victory' | 'levelup' | 'defeat' | ZoneStingId;

/** "thump" is a kick drum; "hat" and "snare" are noise drums. Drum tokens are just "x".
    "anvil" and "glass" are struck, pitched sounds that ring out (see PINGS). */
type Wave = 'square' | 'triangle' | 'sine' | 'sawtooth' | 'thump' | 'hat' | 'snare' | 'anvil' | 'glass';

/** Struck sounds: sine partials [ratio to the note, volume] that die away over `decay` seconds.
    The anvil's partials don't line up (that's what makes metal sound like metal); glass's do. */
const PINGS: Record<'anvil' | 'glass', { partials: [number, number][]; decay: number }> = {
  anvil: { partials: [[1, 1], [2.76, 0.55], [5.4, 0.3], [8.9, 0.12]], decay: 0.45 },
  glass: { partials: [[1, 1], [2, 0.25], [3, 0.08]], decay: 1.3 },
};

export interface Voice {
  wave: Wave;
  gain: number;
  /** Low-pass cutoff in Hz, to soften square waves. */
  cutoff?: number;
  pattern: string;
}

export interface Track {
  bpm: number;
  stepsPerBeat: number;
  voices: Voice[];
  /** Volume of a soft rain bed under the music. */
  rain?: number;
  /** Skip the echo: fast music with drums turns to mush in it. */
  dry?: boolean;
  /** Overall volume (default 1), so every theme plays as loud as the others. Measured, not guessed:
      see "Levels" in music-zones.ts. */
  level?: number;
}

const bars = (...b: string[]) => b.join(' ');
const rest = (n: number) => Array.from({ length: n }, () => '. . . . . . . .');
const twice = (...b: string[]) => bars(...b, ...b);

export const TRACKS: Record<TrackId | StingId, Track> = {
  // The opening: what you lost. A minor, slow, with rain.
  memory: {
    bpm: 66,
    stepsPerBeat: 2,
    rain: 0.05,
    voices: [
      {
        wave: 'triangle',
        gain: 0.12,
        pattern: bars(
          'A3 E4 A4 C5 E5 C5 A4 E4',
          'F3 C4 F4 A4 C5 A4 F4 C4',
          'C3 G3 C4 E4 G4 E4 C4 G3',
          'G3 D4 G4 B4 D5 B4 G4 D4',
          'A3 E4 A4 C5 E5 C5 A4 E4',
          'F3 C4 F4 A4 C5 A4 F4 C4',
          'D3 A3 D4 F4 A4 F4 D4 A3',
          'E3 B3 E4 G#4 B4 G#4 E4 B3',
        ),
      },
      {
        wave: 'square',
        gain: 0.035,
        cutoff: 1800,
        pattern: bars(
          '. . . . . . . .',
          '. . . . . . . .',
          '. . . . . . . .',
          '. . . . . . . .',
          'E5 - - - D5 - C5 -',
          'A4 - - - C5 - A4 -',
          'F4 - - - A4 - D5 -',
          'B4 - - - - - G#4 -',
        ),
      },
    ],
  },
  // The Hollow: a low pulse, a heartbeat and a melody that can't resolve.
  hollow: {
    bpm: 88,
    stepsPerBeat: 2,
    voices: [
      {
        wave: 'square',
        gain: 0.05,
        cutoff: 700,
        pattern: bars('D2 D2 D2 D2 D2 D2 D2 D2', 'D2 D2 D2 D2 D2 D2 D2 D2', 'A#1 A#1 A#1 A#1 A#1 A#1 A#1 A#1', 'A1 A1 A1 A1 A1 A1 A1 A1'),
      },
      { wave: 'thump', gain: 0.5, pattern: bars('x . x . . . . .', 'x . x . . . . .', 'x . x . . . . .', 'x . x . . . . .') },
      {
        wave: 'triangle',
        gain: 0.1,
        pattern: bars('D4 - - - D#4 - - -', 'D4 - - - - - - -', 'F4 - - - E4 - - -', 'D#4 - - - D4 - C#4 -'),
      },
    ],
  },
  // On the ground: nothing but your heart.
  heartbeat: {
    bpm: 60,
    stepsPerBeat: 2,
    voices: [{ wave: 'thump', gain: 0.55, pattern: 'x . x . . . . .' }],
  },
  // Getting up, and everything after: C major, hopeful, building.
  rise: {
    bpm: 80,
    stepsPerBeat: 2,
    voices: [
      {
        wave: 'triangle',
        gain: 0.11,
        pattern: bars(
          'C4 G4 C5 E5 G5 E5 C5 G4',
          'B3 G4 B4 D5 G5 D5 B4 G4',
          'A3 E4 A4 C5 E5 C5 A4 E4',
          'F3 C4 F4 A4 C5 A4 F4 C4',
          'C4 G4 C5 E5 G5 E5 C5 G4',
          'B3 G4 B4 D5 G5 D5 B4 G4',
          'F3 C4 F4 A4 C5 A4 F4 C4',
          'G3 D4 G4 B4 D5 B4 G4 D4',
        ),
      },
      {
        wave: 'square',
        gain: 0.035,
        cutoff: 2200,
        pattern: bars(
          'E5 - - - G5 - - -',
          'D5 - - - - - B4 -',
          'C5 - - - E5 - - -',
          'A4 - - - - - - -',
          'E5 - - - G5 - C6 -',
          'B5 - - - G5 - D5 -',
          'C5 - - - A4 - C5 -',
          'D5 - - - - - - -',
        ),
      },
      {
        wave: 'triangle',
        gain: 0.12,
        pattern: bars('C3 - - - - - - -', 'G2 - - - - - - -', 'A2 - - - - - - -', 'F2 - - - - - - -', 'C3 - - - - - - -', 'G2 - - - - - - -', 'F2 - - - - - - -', 'G2 - - - - - - -'),
      },
    ],
  },
  // Night camp and rest days: a slow F major lullaby by the fire.
  camp: {
    bpm: 58,
    stepsPerBeat: 2,
    voices: [
      {
        wave: 'triangle',
        gain: 0.1,
        pattern: bars(
          'F3 C4 F4 A4 C5 A4 F4 C4',
          'D3 A3 D4 F4 A4 F4 D4 A3',
          'A#2 F3 A#3 D4 F4 D4 A#3 F3',
          'C3 G3 C4 E4 G4 E4 C4 G3',
          'F3 C4 F4 A4 C5 A4 F4 C4',
          'D3 A3 D4 F4 A4 F4 D4 A3',
          'A#2 F3 A#3 D4 F4 D4 A#3 F3',
          'C3 G3 C4 E4 F4 - - -',
        ),
      },
      {
        wave: 'sine',
        gain: 0.06,
        pattern: bars(
          '. . . . . . . .',
          '. . . . . . . .',
          '. . . . . . . .',
          '. . . . . . . .',
          'A5 - - - G5 - F5 -',
          'F5 - - - E5 - D5 -',
          'D5 - - - F5 - - -',
          'E5 - - - - - - -',
        ),
      },
    ],
  },
  // A run in the Fog: A minor, driving, the lead joins on the second time round.
  fog: {
    bpm: 132,
    stepsPerBeat: 2,
    dry: true,
    voices: [
      {
        wave: 'triangle',
        gain: 0.15,
        pattern: twice(
          'A2 A2 A3 A2 A2 A2 A3 A2',
          'F2 F2 F3 F2 F2 F2 F3 F2',
          'C3 C3 C4 C3 C3 C3 C4 C3',
          'G2 G2 G3 G2 G2 G2 G3 G2',
          'A2 A2 A3 A2 A2 A2 A3 A2',
          'F2 F2 F3 F2 F2 F2 F3 F2',
          'G2 G2 G3 G2 G2 G2 G3 G2',
          'E2 E2 E3 E2 E2 E2 E3 E2',
        ),
      },
      {
        wave: 'square',
        gain: 0.026,
        cutoff: 2400,
        pattern: twice(
          'A4 C5 E5 A5 E5 C5 A4 C5',
          'F4 A4 C5 F5 C5 A4 F4 A4',
          'C5 E5 G5 C6 G5 E5 C5 E5',
          'G4 B4 D5 G5 D5 B4 G4 B4',
          'A4 C5 E5 A5 E5 C5 A4 C5',
          'F4 A4 C5 F5 C5 A4 F4 A4',
          'G4 B4 D5 G5 D5 B4 G4 B4',
          'E4 G#4 B4 E5 B4 G#4 E4 G#4',
        ),
      },
      {
        wave: 'triangle',
        gain: 0.11,
        pattern: bars(
          ...rest(8),
          'A5 - - - E5 - A5 -',
          'C6 - - B5 A5 - G5 -',
          'G5 - - - E5 - G5 -',
          'B5 - - A5 G5 - D5 -',
          'E5 - A5 - C6 - B5 A5',
          'F5 - - - A5 - C6 -',
          'B5 - - - D6 - B5 -',
          'G#5 - - - - - E5 -',
        ),
      },
      { wave: 'thump', gain: 0.4, pattern: bars(...Array.from({ length: 15 }, () => 'x . . . x . . .'), 'x . . . x . x x') },
      { wave: 'snare', gain: 0.09, pattern: bars(...Array.from({ length: 15 }, () => '. . x . . . x .'), '. . x . . x x x') },
      { wave: 'hat', gain: 0.025, pattern: bars(...Array.from({ length: 16 }, () => 'x x x x x x x x')) },
    ],
  },
  // The Hollow walks out: faster, D minor, the heartbeat turned into a kick drum.
  fogBoss: {
    bpm: 150,
    stepsPerBeat: 2,
    dry: true,
    voices: [
      {
        wave: 'square',
        gain: 0.06,
        cutoff: 900,
        pattern: twice(
          'D2 D2 D3 D2 D2 D3 D2 D3',
          'D2 D2 D3 D2 D2 D3 D2 D3',
          'A#1 A#1 A#2 A#1 A#1 A#2 A#1 A#2',
          'A1 A1 A2 A1 A1 A2 C#2 E2',
        ),
      },
      {
        wave: 'square',
        gain: 0.022,
        cutoff: 2000,
        pattern: twice(
          'D5 F5 A5 F5 D5 F5 A5 F5',
          'D5 F5 A5 F5 D5 F5 A5 F5',
          'A#4 D5 F5 D5 A#4 D5 F5 D5',
          'A4 C#5 E5 C#5 A4 C#5 E5 C#5',
        ),
      },
      {
        wave: 'triangle',
        gain: 0.12,
        pattern: bars(
          'D5 - - - D#5 - - -',
          'D5 - - - - - - -',
          'F5 - - - E5 - - -',
          'D#5 - - - D5 - C#5 -',
          'A5 - - - A#5 - - -',
          'A5 - G5 - F5 - E5 -',
          'F5 - - - G5 - A#5 -',
          'A5 - - - C#6 - - -',
        ),
      },
      { wave: 'thump', gain: 0.45, pattern: bars(...Array.from({ length: 8 }, () => 'x . x . x . x .')) },
      { wave: 'snare', gain: 0.1, pattern: bars(...Array.from({ length: 7 }, () => '. . x . . . x .'), '. . x . x x x x') },
      { wave: 'hat', gain: 0.028, pattern: bars(...Array.from({ length: 8 }, () => 'x x x x x x x x')) },
    ],
  },
  // A level in a run.
  levelup: {
    bpm: 180,
    stepsPerBeat: 4,
    voices: [
      { wave: 'square', gain: 0.05, cutoff: 3200, pattern: 'C5 E5 G5 C6 - - - .' },
      { wave: 'triangle', gain: 0.1, pattern: 'C4 - G4 - C5 - - .' },
    ],
  },
  // The Fog took you.
  defeat: {
    bpm: 84,
    stepsPerBeat: 2,
    voices: [
      { wave: 'triangle', gain: 0.12, pattern: 'E4 - D#4 - D4 - - - C#4 - - - - - . .' },
      { wave: 'square', gain: 0.03, cutoff: 900, pattern: 'A2 - - - G#2 - - - G2 - - - - - . .' },
    ],
  },
  ...ZONE_TRACKS,
  // A short fanfare for a hit that lands.
  victory: {
    bpm: 150,
    stepsPerBeat: 4,
    voices: [
      { wave: 'square', gain: 0.06, cutoff: 3000, pattern: 'C5 E5 G5 C6 - - G5 C6 - - - - . . . .' },
      { wave: 'triangle', gain: 0.12, pattern: 'C3 - - - - - G3 C4 - - - - . . . .' },
    ],
  },
};

const NAMES: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };

/** Frequency of a note name like "A4" or "G#3" (A4 = 440 Hz). */
export function noteFreq(note: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(note);
  if (!m) throw new Error(`Bad note ${note}`);
  const semis = NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * 2 ** (semis / 12);
}

export interface NoteEvent {
  step: number;
  steps: number;
  note: string;
}

/** Turns a pattern into notes with their lengths in steps. */
export function parsePattern(pattern: string): { events: NoteEvent[]; length: number } {
  const tokens = pattern.split(/\s+/).filter(Boolean);
  const events: NoteEvent[] = [];
  tokens.forEach((t, i) => {
    if (t === '-' || t === '.') {
      if (t === '-' && events.length && events[events.length - 1].step + events[events.length - 1].steps === i) events[events.length - 1].steps++;
      return;
    }
    events.push({ step: i, steps: 1, note: t });
  });
  return { events, length: tokens.length };
}

const MUTE_KEY = 'forma-muted';
/** Cancels the limiter's built-in make-up gain (measured: see music-zones.ts, "Levels"). */
const LIMIT_TRIM = 0.78;

export type SfxId =
  | 'slash'
  | 'arrow'
  | 'orb'
  | 'wave'
  | 'hit'
  | 'bossHit'
  | 'kill'
  | 'gem'
  | 'hurt'
  | 'spark'
  | 'nova'
  | 'flame'
  | 'roar'
  | 'dash'
  | 'stomp'
  // The bosses' and mid-bosses' own sounds.
  | 'clink'
  | 'crash'
  | 'crack'
  | 'shatter'
  | 'glass'
  | 'hum'
  | 'chime'
  | 'dim'
  | 'brighten'
  | 'clank'
  | 'thud'
  | 'whoosh'
  | 'gust';

export const SFX_IDS: SfxId[] = ['slash', 'arrow', 'orb', 'wave', 'hit', 'bossHit', 'kill', 'gem', 'hurt', 'spark', 'nova', 'flame', 'roar', 'dash', 'stomp', 'clink', 'crash', 'crack', 'shatter', 'glass', 'hum', 'chime', 'dim', 'brighten', 'clank', 'thud', 'whoosh', 'gust'];

/** Shortest gap between two of the same sound (s), so a crowd doesn't turn into noise. */
const SFX_GAP: Partial<Record<SfxId, number>> = { hit: 0.045, bossHit: 0.08, kill: 0.05, gem: 0.03, flame: 0.08, hurt: 0.15, glass: 0.06, hum: 0.2, brighten: 0.3, dim: 0.5, thud: 0.12, crash: 0.5, shatter: 1 };
/** Light pickups climb this scale while you collect them in a row. */
const GEM_STEPS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

interface Playing {
  id: TrackId;
  out: GainNode;
  timer: ReturnType<typeof setInterval>;
  stopRain?: () => void;
}

class Engine {
  /** A live AudioContext in the app; an OfflineAudioContext when rendering a track to measure it. */
  private ctx: BaseAudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private sfxOut: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private lastSfx: Partial<Record<SfxId, number>> = {};
  private voices = 0;
  private gemRun = { at: -1, step: 0 };
  private playing: Playing | null = null;
  private wanted: TrackId | null = null;
  private releaseTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  muted = false;
  /** Rendering offline to measure a sound: the context isn't running yet, and that's fine. */
  private offline = false;

  constructor(live = true) {
    if (!live || typeof window === 'undefined') return;
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      // Storage can be blocked; music just starts unmuted.
    }
    // Browsers only allow sound after a tap, so every tap tries to wake the audio.
    window.addEventListener('pointerdown', () => this.unlock(), { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      const live = this.ctx as AudioContext;
      if (document.hidden) void live.suspend();
      else void live.resume();
    });
  }

  /** Create or resume the audio context. Call from a tap. */
  unlock() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.wire(new Ctx());
    }
    const ctx = this.ctx as AudioContext | null;
    if (ctx?.state === 'suspended') void ctx.resume();
    if (this.wanted && this.playing?.id !== this.wanted) this.start(this.wanted);
  }

  /** Builds the mix on a context: the master volume, the echo bus, the effects compressor, noise. */
  private wire(ctx: BaseAudioContext) {
    this.ctx = ctx;
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.7;
    // A limiter last in line: where drums and notes happen to land together, it catches the peak
    // instead of letting it clip.
    const limit = this.ctx.createDynamicsCompressor();
    limit.threshold.value = -4.5;
    limit.knee.value = 2;
    limit.ratio.value = 20;
    limit.attack.value = 0.002;
    limit.release.value = 0.12;
    // The compressor adds its own make-up gain (about 2.2 dB at these settings); trim takes it back
    // out, so the music plays as loud as before and only the peaks change.
    const trim = this.ctx.createGain();
    trim.gain.value = LIMIT_TRIM;
    this.master.connect(limit);
    limit.connect(trim);
    trim.connect(this.ctx.destination);
    // A soft echo makes the chiptune feel like it's in a big, empty space.
    this.bus = this.ctx.createGain();
    const delay = this.ctx.createDelay(1);
    delay.delayTime.value = 0.34;
    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.32;
    const wet = this.ctx.createGain();
    wet.gain.value = 0.3;
    this.bus.connect(this.master);
    this.bus.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(this.master);
    // Effects go through a compressor, so a screen full of hits can't clip.
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 6;
    comp.connect(this.master);
    this.sfxOut = this.ctx.createGain();
    this.sfxOut.gain.value = 0.6;
    this.sfxOut.connect(comp);
    this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  /** Plays a track or a sting into an offline context, through the same mix as the app. */
  renderInto(ctx: OfflineAudioContext, id: TrackId | StingId, seconds: number) {
    this.wire(ctx);
    const track = TRACKS[id],
      out = ctx.createGain();
    out.gain.value = track.level ?? 1;
    out.connect(track.dry && this.master ? this.master : this.bus!);
    const stepDur = 60 / track.bpm / track.stepsPerBeat,
      voices = track.voices.map((v) => ({ v, ...parsePattern(v.pattern) })),
      length = Math.max(...voices.map((v) => v.length)),
      // A sting plays once; a track loops for as long as asked.
      loops = (id as StingId) in STING_IDS ? 1 : Math.ceil(seconds / (length * stepDur));
    for (let k = 0; k < loops; k++)
      for (const { v, events } of voices) for (const e of events) this.note(out, v, e, 0.05 + (k * length + e.step) * stepDur, stepDur * e.steps);
    if (track.rain) this.rain(out, track.rain);
  }

  play(id: TrackId) {
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }
    this.wanted = id;
    if (this.playing?.id === id) return;
    if (this.ctx) this.start(id);
  }

  /** A one-shot jingle on top of whatever is playing. */
  sting(id: StingId) {
    const ctx = this.ctx;
    if (!ctx || !this.bus) return;
    const track = TRACKS[id];
    const out = ctx.createGain();
    out.gain.value = track.level ?? 1;
    out.connect(this.bus);
    const stepDur = 60 / track.bpm / track.stepsPerBeat;
    const t0 = ctx.currentTime + 0.05;
    let steps = 0;
    for (const v of track.voices) {
      const { events, length } = parsePattern(v.pattern);
      steps = Math.max(steps, length);
      for (const e of events) this.note(out, v, e, t0 + e.step * stepDur, stepDur * e.steps);
    }
    // Let the last notes ring before letting go.
    setTimeout(() => out.disconnect(), (steps * stepDur + 2) * 1000);
  }

  /** Fade out `id` unless another screen asks for it right away. */
  release(id: TrackId) {
    if (this.wanted !== id) return;
    if (this.releaseTimer) clearTimeout(this.releaseTimer);
    this.releaseTimer = setTimeout(() => {
      this.releaseTimer = null;
      if (this.wanted !== id) return;
      this.wanted = null;
      this.fadeOut();
    }, 80);
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      localStorage.setItem(MUTE_KEY, m ? '1' : '0');
    } catch {
      // Not saved; it still applies for this visit.
    }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.1);
    this.listeners.forEach((l) => l());
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private fadeOut() {
    const p = this.playing;
    if (!p || !this.ctx) return;
    this.playing = null;
    p.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
    setTimeout(() => {
      clearInterval(p.timer);
      p.stopRain?.();
      p.out.disconnect();
    }, 2500);
  }

  private start(id: TrackId) {
    const ctx = this.ctx;
    if (!ctx || !this.bus) return;
    this.fadeOut();
    const track = TRACKS[id];
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, ctx.currentTime);
    out.gain.setTargetAtTime(track.level ?? 1, ctx.currentTime, 0.3);
    out.connect(track.dry && this.master ? this.master : this.bus);

    const voices = track.voices.map((v) => ({ v, ...parsePattern(v.pattern) }));
    const length = Math.max(...voices.map((v) => v.length));
    const stepDur = 60 / track.bpm / track.stepsPerBeat;
    let step = 0;
    let next = ctx.currentTime + 0.08;

    const tick = () => {
      while (next < ctx.currentTime + 0.15) {
        const s = step % length;
        for (const { v, events } of voices) {
          for (const e of events) if (e.step === s) this.note(out, v, e, next, stepDur * e.steps);
        }
        step++;
        next += stepDur;
      }
    };
    const timer = setInterval(tick, 25);
    tick();

    const playing: Playing = { id, out, timer };
    if (track.rain) playing.stopRain = this.rain(out, track.rain);
    this.playing = playing;
  }

  private note(out: GainNode, v: Voice, e: NoteEvent, t: number, dur: number) {
    const ctx = this.ctx!;
    if (v.wave === 'hat' || v.wave === 'snare') {
      const snare = v.wave === 'snare';
      this.hiss(out, snare ? 0.14 : 0.05, v.gain, snare ? 'bandpass' : 'highpass', snare ? 1800 : 7000, snare ? 1400 : 7000, snare ? 0.8 : 1, t);
      if (snare) this.tone(out, 'triangle', 190, 140, 0.08, v.gain * 0.8, t);
      return;
    }
    if (v.wave === 'anvil' || v.wave === 'glass') {
      const { partials, decay } = PINGS[v.wave],
        f = noteFreq(e.note);
      // Not through tone(): music shouldn't count against the cap on overlapping sound effects.
      partials.forEach(([r, k]) => {
        // Partials high up turn shrill on phone speakers: soften them past 4 kHz, drop them past 8.
        const hz = f * r,
          soft = hz > 8000 ? 0 : hz > 4000 ? (4000 / hz) ** 2 : 1;
        if (!soft) return;
        const o = ctx.createOscillator(),
          g = ctx.createGain(),
          d = decay / Math.sqrt(r);
        o.type = 'sine';
        o.frequency.value = f * r;
        g.gain.setValueAtTime(v.gain * k * soft, t);
        g.gain.exponentialRampToValueAtTime(0.0008, t + d);
        o.connect(g);
        g.connect(out);
        o.start(t);
        o.stop(t + d + 0.02);
      });
      return;
    }
    const g = ctx.createGain();
    g.connect(out);
    const o = ctx.createOscillator();
    if (v.wave === 'thump') {
      o.type = 'sine';
      o.frequency.setValueAtTime(95, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.18);
      g.gain.setValueAtTime(v.gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.35);
      return;
    }
    o.type = v.wave;
    o.frequency.value = noteFreq(e.note);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v.gain, t + 0.015);
    g.gain.setTargetAtTime(v.gain * 0.55, t + 0.03, dur * 0.4);
    g.gain.setTargetAtTime(0, t + dur * 0.92, 0.06);
    if (v.cutoff) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = v.cutoff;
      o.connect(f);
      f.connect(g);
    } else {
      o.connect(g);
    }
    o.start(t);
    o.stop(t + dur + 0.6);
  }

  // ---------- sound effects ----------

  /** A one-shot game sound. `pitch` scales its frequencies. */
  sfx(id: SfxId, pitch = 1) {
    const ctx = this.ctx,
      out = this.sfxOut;
    if (!ctx || !out || this.muted || (ctx.state !== 'running' && !this.offline) || this.voices > 40) return;
    const t = ctx.currentTime;
    if (t - (this.lastSfx[id] ?? -1) < (SFX_GAP[id] ?? 0.02)) return;
    this.lastSfx[id] = t;
    const p = pitch * (0.94 + Math.random() * 0.12);
    switch (id) {
      case 'slash':
        this.hiss(out, 0.14, 0.32, 'bandpass', 3200 * p, 700 * p, 1.2, t);
        this.tone(out, 'square', 240 * p, 110 * p, 0.06, 0.04, t, 1600);
        break;
      case 'arrow':
        this.tone(out, 'square', 1300 * p, 480 * p, 0.07, 0.05, t, 3000);
        this.hiss(out, 0.05, 0.08, 'highpass', 4000, 4000, 1, t);
        break;
      case 'orb':
        this.tone(out, 'sine', 520 * p, 1150 * p, 0.16, 0.14, t);
        this.tone(out, 'triangle', 1040 * p, 2100 * p, 0.1, 0.04, t + 0.02);
        break;
      case 'wave':
        this.tone(out, 'sine', 170 * p, 55, 0.28, 0.4, t);
        this.hiss(out, 0.26, 0.16, 'lowpass', 1000, 180, 1, t);
        break;
      case 'hit':
        this.hiss(out, 0.035, 0.16, 'bandpass', 2300 * p, 1600 * p, 1, t);
        this.tone(out, 'square', 340 * p, 200 * p, 0.035, 0.035, t, 2200);
        break;
      case 'bossHit':
        this.hiss(out, 0.07, 0.22, 'bandpass', 1200 * p, 600 * p, 1, t);
        this.tone(out, 'square', 160 * p, 70 * p, 0.09, 0.07, t, 1200);
        break;
      case 'kill':
        this.tone(out, 'square', 420 * p, 70 * p, 0.12, 0.06, t, 1800);
        this.hiss(out, 0.14, 0.18, 'lowpass', 1800, 250, 1, t);
        break;
      case 'gem': {
        this.gemRun.step = t - this.gemRun.at < 0.45 ? Math.min(GEM_STEPS.length - 1, this.gemRun.step + 1) : 0;
        this.gemRun.at = t;
        const f = 988 * 2 ** (GEM_STEPS[this.gemRun.step] / 12);
        this.tone(out, 'triangle', f, f, 0.07, 0.09, t);
        this.tone(out, 'square', f * 2, f * 2, 0.03, 0.012, t, 5000);
        break;
      }
      case 'hurt':
        this.tone(out, 'sawtooth', 220, 60, 0.22, 0.14, t, 1300);
        this.hiss(out, 0.1, 0.14, 'lowpass', 1400, 400, 1, t);
        break;
      case 'spark':
        this.tone(out, 'sawtooth', 2600 * p, 700 * p, 0.1, 0.05, t, 6000);
        this.tone(out, 'square', 1800 * p, 2400 * p, 0.05, 0.025, t + 0.04, 6000);
        this.hiss(out, 0.12, 0.09, 'highpass', 3000, 3000, 1, t);
        break;
      case 'nova':
        this.tone(out, 'sine', 130, 40, 0.42, 0.45, t);
        this.hiss(out, 0.4, 0.22, 'lowpass', 2400, 120, 1, t);
        break;
      case 'flame':
        this.hiss(out, 0.09, 0.1, 'lowpass', 1300 * p, 500, 1, t);
        break;
      case 'roar':
        this.tone(out, 'sawtooth', 95, 52, 1.1, 0.16, t, 700);
        this.tone(out, 'square', 97, 50, 1.1, 0.05, t, 500);
        this.hiss(out, 0.9, 0.12, 'lowpass', 600, 200, 1, t);
        break;
      case 'dash':
        this.tone(out, 'square', 180, 820, 0.7, 0.04, t, 2000);
        break;
      case 'stomp':
        this.tone(out, 'sine', 110, 35, 0.3, 0.45, t);
        this.hiss(out, 0.2, 0.16, 'lowpass', 700, 120, 1, t);
        break;
      // A plate of armor falls: a small bright metal tick with a ring after it.
      case 'clink':
        this.tone(out, 'square', 1900 * p, 1750 * p, 0.05, 0.05, t, 7000);
        this.tone(out, 'triangle', 2850 * p, 2800 * p, 0.22, 0.09, t);
        this.tone(out, 'triangle', 4300 * p, 4250 * p, 0.12, 0.035, t + 0.005);
        this.hiss(out, 0.04, 0.1, 'highpass', 5000, 5000, 1, t);
        break;
      // Half the armor goes at once: a metal crash, and plates still falling after it.
      case 'crash':
        this.hiss(out, 0.55, 0.22, 'bandpass', 3200 * p, 700 * p, 0.8, t);
        this.tone(out, 'square', 210 * p, 80 * p, 0.3, 0.09, t, 1500);
        this.tone(out, 'sine', 120, 40, 0.35, 0.3, t);
        [0.06, 0.13, 0.21, 0.32].forEach((d, i) => this.tone(out, 'triangle', 2600 * p * (1 + 0.13 * i), 2550 * p * (1 + 0.13 * i), 0.18, 0.04, t + d));
        break;
      // Stone cracks: a dry snap with a dull knock under it.
      case 'crack':
        this.hiss(out, 0.09, 0.32, 'bandpass', 1500 * p, 500 * p, 1.4, t);
        this.tone(out, 'square', 150 * p, 60 * p, 0.1, 0.08, t, 900);
        this.tone(out, 'sine', 95 * p, 40, 0.22, 0.3, t + 0.01);
        break;
      // All of it breaks at once: a deep boom, a long rubble rush, cracks running through it.
      case 'shatter':
        this.tone(out, 'sine', 85, 28, 1.1, 0.24, t);
        this.hiss(out, 1.3, 0.13, 'lowpass', 3200, 90, 0.7, t);
        [0, 0.09, 0.2, 0.34, 0.5].forEach((d, i) => this.hiss(out, 0.1, 0.16 - i * 0.02, 'bandpass', 1700 - i * 180, 500, 1.4, t + d));
        break;
      // A mirror image breaks: little bright shards of glass falling over each other.
      case 'glass':
        this.hiss(out, 0.16, 0.14, 'highpass', 4500 * p, 6500, 1, t);
        [0, 0.03, 0.07, 0.12].forEach((d, i) => {
          const f = [2400, 3500, 2900, 4300][i] * p;
          this.tone(out, 'triangle', f, f * 0.98, 0.16, 0.055, t + d);
        });
        break;
      // The Hollow's light around you: a soft held note, played again and again as you stand in it.
      case 'hum':
        this.swell(out, 'sine', 196 * p, 0.32, 0.05, t);
        this.swell(out, 'triangle', 392 * p, 0.32, 0.018, t);
        this.swell(out, 'sine', 588 * p, 0.32, 0.009, t);
        break;
      // A ledge climbed: a rising chime.
      case 'chime':
        [784, 988, 1175, 1568].forEach((f, i) => {
          this.tone(out, 'triangle', f * p, f * p, 0.4, 0.045, t + i * 0.07);
          this.tone(out, 'sine', f * 2 * p, f * 2 * p, 0.25, 0.012, t + i * 0.07);
        });
        break;
      // The Lantern's light sinks, or a hit brings some back.
      case 'dim':
        this.tone(out, 'sine', 620 * p, 180 * p, 0.6, 0.1, t);
        this.hiss(out, 0.5, 0.07, 'lowpass', 1400, 200, 1, t);
        break;
      case 'brighten':
        this.tone(out, 'sine', 330 * p, 990 * p, 0.22, 0.08, t);
        this.tone(out, 'triangle', 1320 * p, 1320 * p, 0.16, 0.03, t + 0.12);
        break;
      // The Foreman mends its crew: hammer on metal, twice.
      case 'clank':
        [0, 0.14].forEach((d, i) => {
          this.tone(out, 'square', (320 - i * 30) * p, (290 - i * 30) * p, 0.09, 0.04, t + d, 2400);
          this.tone(out, 'triangle', (1150 + i * 120) * p, (1130 + i * 120) * p, 0.2, 0.035, t + d);
          this.hiss(out, 0.05, 0.08, 'bandpass', 2200, 1800, 1, t + d);
        });
        break;
      // A blow on stone: a heavy, dead thud.
      case 'thud':
        this.tone(out, 'sine', 95 * p, 38, 0.2, 0.42, t);
        this.hiss(out, 0.1, 0.18, 'lowpass', 600, 150, 1, t);
        break;
      // Something swaps places fast: air rushing by.
      case 'whoosh':
        this.hiss(out, 0.28, 0.36, 'bandpass', 500 * p, 2600 * p, 2, t);
        this.hiss(out, 0.2, 0.16, 'bandpass', 2600 * p, 700 * p, 2, t + 0.12);
        break;
      // A gust: a long, low rush of wind that swells and falls away.
      case 'gust':
        this.swellHiss(out, 0.9, 0.18, 'bandpass', 300 * p, 1100 * p, 0.9, t);
        this.swellHiss(out, 0.7, 0.07, 'bandpass', 1400 * p, 2600 * p, 1.5, t + 0.1);
        break;
    }
  }

  /** A note that fades in, holds, and fades out (unlike `tone`, which starts at full and decays). */
  private swell(out: AudioNode, type: OscillatorType, f: number, dur: number, gain: number, t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0008, t);
    g.gain.linearRampToValueAtTime(gain, t + dur * 0.3);
    g.gain.linearRampToValueAtTime(gain * 0.7, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g);
    g.connect(out);
    this.track(o);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** Noise that swells in and falls away, its filter sweeping from f0 to f1. */
  private swellHiss(out: AudioNode, dur: number, gain: number, type: BiquadFilterType, f0: number, f1: number, q: number, t: number) {
    const ctx = this.ctx!;
    if (!this.noiseBuf) return;
    const src = ctx.createBufferSource(),
      f = ctx.createBiquadFilter(),
      g = ctx.createGain();
    src.buffer = this.noiseBuf;
    src.loop = true;
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.4);
    f.frequency.exponentialRampToValueAtTime(f0, t + dur);
    g.gain.setValueAtTime(0.0008, t);
    g.gain.linearRampToValueAtTime(gain, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(out);
    this.track(src);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  /** Plays one sound effect into an offline context, through the same mix as the app. */
  renderSfxInto(ctx: OfflineAudioContext, id: SfxId, pitch = 1) {
    this.wire(ctx);
    this.offline = true;
    this.sfx(id, pitch);
  }

  private tone(out: AudioNode, type: OscillatorType, f0: number, f1: number, dur: number, gain: number, t: number, cutoff?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    if (cutoff) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = cutoff;
      o.connect(f);
      f.connect(g);
    } else o.connect(g);
    g.connect(out);
    this.track(o);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private hiss(out: AudioNode, dur: number, gain: number, type: BiquadFilterType, f0: number, f1: number, q: number, t: number) {
    const ctx = this.ctx!;
    if (!this.noiseBuf) return;
    const src = ctx.createBufferSource(),
      f = ctx.createBiquadFilter(),
      g = ctx.createGain();
    src.buffer = this.noiseBuf;
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(out);
    this.track(src);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  /** Count sounds still playing, to cap how many overlap. */
  private track(node: AudioScheduledSourceNode) {
    this.voices++;
    node.onended = () => {
      this.voices--;
      node.disconnect();
    };
  }

  private rain(out: GainNode, volume: number) {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 5000;
    const g = ctx.createGain();
    g.gain.value = volume;
    src.connect(hp);
    hp.connect(lp);
    lp.connect(g);
    g.connect(out);
    src.start();
    return () => src.stop();
  }
}

export const music = new Engine();

/** Renders several sound effects starting together, to check that a pile-up doesn't clip. */
export async function renderSfxMix(ids: SfxId[], seconds = 1.6, sampleRate = 44100): Promise<Float32Array> {
  const ctx = new OfflineAudioContext(1, Math.round(seconds * sampleRate), sampleRate);
  const e = new Engine(false);
  e.renderSfxInto(ctx, ids[0]);
  for (const id of ids.slice(1)) e.sfx(id);
  return (await ctx.startRendering()).getChannelData(0);
}

/** Renders one sound effect to samples, mono, exactly as the app mixes it. Browser only: used to
    keep every effect about as loud as the others. */
export async function renderSfx(id: SfxId, pitch = 1, seconds = 1.6, sampleRate = 44100): Promise<Float32Array> {
  const ctx = new OfflineAudioContext(1, Math.round(seconds * sampleRate), sampleRate);
  new Engine(false).renderSfxInto(ctx, id, pitch);
  return (await ctx.startRendering()).getChannelData(0);
}

const STING_IDS: Record<StingId, true> = { victory: true, levelup: true, defeat: true, shatter: true, warmth: true };

/** Renders `seconds` of a track (or a whole sting) to samples, mono, exactly as the app mixes it.
    Browser only. Used to measure loudness and to save tracks as audio files. */
export async function renderTrack(id: TrackId | StingId, seconds: number, sampleRate = 44100): Promise<Float32Array> {
  const ctx = new OfflineAudioContext(1, Math.round(seconds * sampleRate), sampleRate);
  new Engine(false).renderInto(ctx, id, seconds);
  return (await ctx.startRendering()).getChannelData(0);
}
