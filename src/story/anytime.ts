import { SP_TRIAL } from '@/balance';
import type { Scene } from './types';

/* Scenes that can happen in any chapter. */

export const ANYTIME: Scene[] = [
  {
    // The first SP (src/lib/sp.ts): sealed until you train a little more and walk to the
    // middle of the Fog. Waits for a class, so a hero who picked late still gets it, and any
    // chapter can be the one it comes in.
    id: 'sp-gift',
    when: { workouts: SP_TRIAL.at, noClass: false },
    music: 'camp',
    lines: [
      { who: 'narrator', show: 'wanderer', text: 'The Wanderer is waiting by the fire, turning something over in their fingers. A card, dark as ash, warm at the edges.' },
      { who: 'wanderer', text: "This was in the ash where you trained. It's been waiting for someone who keeps coming back." },
      { who: 'flame', mood: 'happy', text: "Ooh. What is it? Can I touch it? I'm touching it." },
      { who: 'wanderer', text: 'A spirit card. It holds a way of fighting you haven\'t found yet. It takes the shape of whoever holds it.' },
      { who: 'you', text: "It's cold in the middle." },
      { who: 'wanderer', text: "It's sealed. It wakes when it believes you. Not before.", pause: 0.8 },
      { who: 'wanderer', text: 'Train twice more. Then go down into the Fog, as deep as the floor where its guardian waits.' },
      { who: 'flame', mood: 'soft', text: "Twice more, and one walk in the dark. We can do that. We've done harder." },
      { who: 'wanderer', text: 'When it wakes, it gives you two things: a move of your own, and a last one, for when the fight is long.' },
      { who: 'narrator', text: 'You put the card away. It sits there, quiet, like a promise you made to someone you haven\'t met yet.', film: true },
    ],
    ask: { kind: 'sp' },
  },
  {
    id: 'sp-awake',
    when: { spReady: true },
    music: 'camp',
    lines: [
      { who: 'narrator', text: 'The card is warm. Then it is hot. Then it is light.', pause: 0.6, film: true },
      { who: 'flame', mood: 'happy', text: "It's awake! And it looks like... you? A braver you." },
      { who: 'wanderer', text: "It always looked like you. You just hadn't met that one yet." },
      { who: 'narrator', show: 'flame', text: 'Two new things sit in your hands now: a move of your own, and a final that fills as you fight.' },
      { who: 'wanderer', text: "Wear it into the Fog, or don't. It's yours either way." },
      { who: 'flame', mood: 'happy', text: 'Wear it. Obviously. Wear it.' },
    ],
  },
  {
    // The first time a set beats the same set last time: one more rep, a few more seconds.
    id: 'first-better',
    when: { better: 1 },
    lines: [
      { who: 'narrator', text: 'One more than last time. Just one.' },
      { who: 'narrator', text: "When did that happen? You couldn't say. It just did.", pause: 1, film: true },
      { who: 'echo', text: '...There it is. I remember that feeling.', pause: 1, shot: { enter: 'right' } },
      { who: 'echo', text: "Now it's yours. It was never really mine to keep." },
      { who: 'flame', mood: 'soft', text: 'Last time was the hardest it has ever been. This time was easier. That is the whole secret.' },
    ],
  },
  {
    // Beating last time, again and again, and the village notices.
    id: 'good-steel',
    when: { better: 8, beaten: 3 },
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
    // Someone small has been watching you train.
    id: 'teach-me',
    when: { better: 4, beaten: 3 },
    lines: [
      { who: 'narrator', show: 'kid', text: 'Your last set, slow and clean. The kid from the armor has been watching the whole time, mouth open.' },
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
