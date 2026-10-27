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
      { who: 'flame', mood: 'smoky', text: "*cough* Day after day after day. You're amazing. I'm a little smoky." },
      { who: 'flame', mood: 'smoky', text: 'A fire that never rests just burns out. I need air.' },
      { who: 'flame', mood: 'soft', text: 'Rest with me tomorrow? It counts. I promise it counts.' },
    ],
  },
  {
    // After a run of Rough days: a warm word that this is a game, and that heavy things deserve a person.
    id: 'heavy-days',
    when: { workouts: 6, roughRun: 3 },
    music: 'camp',
    lines: [
      { who: 'narrator', show: 'flame', text: "Another short one. {flame} doesn't say anything about it. It just sits a little closer than usual." },
      { who: 'flame', mood: 'soft', text: "Rough again. That's a few in a row now.", pause: 1 },
      { who: 'flame', mood: 'soft', text: "That's okay. You don't owe me big days. You came. That was always the whole deal." },
      { who: 'flame', mood: 'soft', text: 'Can I say something, though? As your friend, who is also a small fire in a game on your phone?', pause: 0.8 },
      { who: 'flame', mood: 'soft', text: "I can sit with you. I can't hug you.", pace: 'slow' },
      { who: 'flame', mood: 'soft', text: 'If things are heavy right now, heavier than training, tell someone who can. A friend. Someone you trust. Someone whose job it is to help.', pause: 0.8 },
      { who: 'wanderer', text: 'I asked for help once. It was the hardest step on the whole road. It was not the last good one.', pause: 1 },
      { who: 'flame', mood: 'soft', text: "I'll be right here either way. Lit." },
    ],
  },
  {
    id: 'return',
    when: { away: 8 },
    lines: [
      { who: 'narrator', show: 'flame', text: 'The camp is dark. Just one small glow in the ash, where {flame} has been keeping an ember going.', pause: 0.8 },
      { who: 'hollow', text: 'See? I told you. You always...' },
      { who: 'flame', mood: 'soft', text: '...come back. You always come back.', pause: 0.8 },
      { who: 'narrator', text: "{flame} doesn't ask where you've been. It leans against your hand until the ember catches.", pause: 1.2, film: true },
      { who: 'flame', mood: 'soft', text: "I didn't count the days. I was busy keeping warm for you." },
      { who: 'wanderer', text: 'Nothing in the book was torn out. Every page is still there. We start light today.' },
      { who: 'wanderer', text: 'You asked me once to remind you: "{remind}." So. I\'m reminding you.', needs: 'remind' },
      { who: 'flame', mood: 'happy', text: "Hi. Hi. Okay, I'm done. ...Hi." },
    ],
  },

];
