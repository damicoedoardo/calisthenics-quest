import type { Scene } from './types';

/* Scenes that can happen in any chapter. */

export const ANYTIME: Scene[] = [
  {
    id: 'first-pullup',
    when: { skill: { path: 'pull', past: 3 } },
    lines: [{ who: 'echo', text: '...There it is. I remember that feeling. Now it\'s yours.' }],
  },
  {
    id: 'smoky',
    when: { daysInRow: 4 },
    music: 'camp',
    lines: [
      { who: 'flame', mood: 'smoky', text: '*cough* Four days in a row. You\'re amazing. I\'m a little smoky.' },
      { who: 'flame', mood: 'smoky', text: 'A fire that never rests just burns out. I need air.' },
      { who: 'flame', mood: 'soft', text: 'Rest with me tomorrow? It counts. I promise it counts.' },
    ],
  },
  {
    // Plays again after every long absence (its id gets the workout count added).
    id: 'return',
    when: { away: 8 },
    lines: [
      { who: 'hollow', text: 'See? I told you. You always...' },
      { who: 'flame', mood: 'soft', text: '...come back. You always come back. I kept one ember lit.' },
      { who: 'wanderer', text: "You're here. That's the only part that matters. We start light today." },
      { who: 'wanderer', text: 'You told me once: "{remind}." Do you still mean it?', needs: 'remind' },
    ],
  },
];
