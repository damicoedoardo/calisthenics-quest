import type { Scene } from './types';

/* Scenes that can happen in any chapter. */

export const ANYTIME: Scene[] = [
  {
    // The first strict pull-up: the negatives are behind you and the bar is yours.
    id: 'first-pullup',
    when: { unlocked: 'negatives', chapter: 2 },
    music: 'memory',
    lines: [
      { who: 'narrator', text: "The bar. You've hung from it, jumped up to it, lowered yourself from it more slow times than you can remember.", film: true },
      { who: 'narrator', text: 'Today you hang still. And pull.', pause: 1.2, film: true, music: 'none' },
      { who: 'narrator', text: 'Your chin goes over the bar.', pace: 'slow', pause: 1.6, film: true },
      { who: 'narrator', show: 'flame', text: "Then you're back on the ground, hands shaking, laughing at nothing." },
      { who: 'flame', mood: 'happy', text: 'WHAT. What was THAT. Do it again. No, rest. No, do it again.', music: 'rise' },
      { who: 'echo', text: '...There it is. I remember that feeling.', pause: 1, shot: { enter: 'right' } },
      { who: 'echo', text: "Now it's yours. It was never really mine to keep." },
    ],
  },
  {
    // Floor push-ups, set after set, and they've stopped being hard.
    id: 'skill-floor',
    when: { unlocked: 'pushup' },
    lines: [
      { who: 'narrator', text: "Push-ups, set after set, and your arms don't shake any more." },
      { who: 'narrator', text: "When did that happen? You couldn't say. It just did.", pause: 1, film: true },
      { who: 'you', text: '...I used to do these without thinking.', pause: 0.6 },
      { who: 'flame', mood: 'soft', text: 'Now you do them without thinking again. But this time you know what it took.' },
    ],
  },

  {
    // The first full L-sit: both legs straight, off the ground.
    id: 'skill-lsit',
    when: { unlocked: 'one-leg-lsit' },
    lines: [
      { who: 'narrator', text: 'You press down, lift, and for a moment both legs float out straight in front of you.' },
      { who: 'narrator', text: "You're holding yourself up. Off the ground. On purpose.", pace: 'slow', pause: 1, film: true },
      { who: 'flame', mood: 'happy', text: "You're hovering! Like me! Welcome to hovering." },
      { who: 'you', text: 'My stomach is on fire.' },
      { who: 'flame', mood: 'happy', text: "That's me. Hi." },
    ],
  },
  {
    // The end of the push path.
    id: 'skill-top-push',
    when: { unlocked: 'archer-pushup', beaten: 3 },
    place: 'lit-forges',
    lines: [
      { who: 'narrator', show: 'mira', text: 'Word travels. Mira finds you at the forge, wiping her hands on her apron.' },
      { who: 'mira', text: 'Come here. Show me your hands.', pause: 0.8 },
      { who: 'narrator', text: 'She turns them over, the way she checks a blade. Calluses. A scrape. The crooked ring.', pause: 1.2, film: true },
      { who: 'mira', text: 'Good steel.', pace: 'slow' },
      { who: 'flame', mood: 'soft', text: "She never says that. I've been listening. She never says that." },
    ],
  },
  {
    // The end of the pull path.
    id: 'skill-top-pull',
    when: { unlocked: 'lsit-pullup', chapter: 3 },
    lines: [
      { who: 'narrator', text: 'The pull path ends here. Out of habit you look for the next step, and there is not one.', pause: 0.8, film: true },
      { who: 'flame', mood: 'soft', text: "So we just... get to enjoy it now? Is that allowed?" },
      { who: 'wanderer', text: 'It was always allowed.', pause: 1 },
      { who: 'flame', mood: 'happy', text: "Then I'm going to hang off the bar next to you and do nothing useful. Very strongly." },
    ],
  },
  {
    // The end of the core path.
    id: 'skill-top-core',
    when: { unlocked: 'toes-to-bar', beaten: 3 },
    lines: [
      { who: 'narrator', show: 'kid', text: 'Toes to the bar, slow on the way down. The kid from the armor has been watching the whole time, mouth open.' },
      { who: 'kid', text: 'Can you teach me that?', shot: { enter: 'below' } },
      { who: 'you', text: "Sure. First you're bad at it for a while.", pause: 0.8 },
      { who: 'kid', text: "...Yeah. I know that part. I'm good at that part now." },
    ],
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
