'use client';

/**
 * Tiny chiptune engine on Web Audio. Every track is written as note patterns, so the
 * music costs no downloads and works offline.
 *
 * Pattern syntax: one token per step. "A4" plays a note, "-" holds the previous note,
 * "." is silence, "x" is a heartbeat thump.
 */

export type TrackId = 'memory' | 'hollow' | 'heartbeat' | 'rise';
export type StingId = 'victory';

type Wave = 'square' | 'triangle' | 'sine' | 'sawtooth' | 'thump';

interface Voice {
  wave: Wave;
  gain: number;
  /** Low-pass cutoff in Hz, to soften square waves. */
  cutoff?: number;
  pattern: string;
}

interface Track {
  bpm: number;
  stepsPerBeat: number;
  voices: Voice[];
  /** Volume of a soft rain bed under the music. */
  rain?: number;
}

const bars = (...b: string[]) => b.join(' ');

const TRACKS: Record<TrackId | StingId, Track> = {
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

interface Playing {
  id: TrackId;
  out: GainNode;
  timer: ReturnType<typeof setInterval>;
  stopRain?: () => void;
}

class Engine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private playing: Playing | null = null;
  private wanted: TrackId | null = null;
  private releaseTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  muted = false;

  constructor() {
    if (typeof window === 'undefined') return;
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      // Storage can be blocked; music just starts unmuted.
    }
    // Browsers only allow sound after a tap, so every tap tries to wake the audio.
    window.addEventListener('pointerdown', () => this.unlock(), { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  /** Create or resume the audio context. Call from a tap. */
  unlock() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.7;
      this.master.connect(this.ctx.destination);
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
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.wanted && this.playing?.id !== this.wanted) this.start(this.wanted);
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
    out.connect(this.bus);
    const stepDur = 60 / track.bpm / track.stepsPerBeat;
    const t0 = ctx.currentTime + 0.05;
    for (const v of track.voices) for (const e of parsePattern(v.pattern).events) this.note(out, v, e, t0 + e.step * stepDur, stepDur * e.steps);
    setTimeout(() => out.disconnect(), 4000);
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
    out.gain.setTargetAtTime(1, ctx.currentTime, 0.3);
    out.connect(this.bus);

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
