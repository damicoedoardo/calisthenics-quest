import { SP_GIFTS, SP_TRIAL } from '@/balance';
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
      { who: 'narrator', show: 'wanderer', text: "The Wanderer is by the fire when you get back. They don't look up." },
      { who: 'wanderer', text: 'Three times now. You keep coming back.' },
      { who: 'wanderer', text: "Most people don't. That's why this found you.", pause: 0.6 },
      { who: 'narrator', art: 'sp-sealed', text: 'A card, grey as old ash. Behind a crack in it, a light, waiting.' },
      { who: 'flame', mood: 'happy', text: 'Ooh. Is that... is someone in there?' },
      { who: 'you', text: "It's me. Sort of. I can't see the face." },
      { who: 'wanderer', text: "Not yet. It shows the one you're becoming. It wakes when it believes you." },
      { who: 'wanderer', text: 'Everyone who keeps training carries more than one of those. Other ways of being them. Forms, the old ones called them.' },
      { who: 'wanderer', text: 'Most never meet theirs. You keep showing up, so yours are starting to show up for you.' },
      { who: 'flame', mood: 'happy', text: 'More than one? So this is the first.' },
      { who: 'wanderer', text: 'The first. The others come when they come. You never know which.' },
      { who: 'flame', mood: 'soft', text: 'How do you make a card believe you?' },
      { who: 'wanderer', text: 'Show up twice more. Then go down into the Fog, to where its guardian waits.', pause: 0.6 },
      { who: 'wanderer', text: "Don't look for it. Just keep going. It will know." },
      { who: 'narrator', text: 'You put the card away. All night it stays warm, like a second fire.', film: true },
    ],
    ask: { kind: 'sp' },
  },
  {
    id: 'sp-awake',
    when: { spReady: true },
    music: 'camp',
    lines: [
      { who: 'narrator', text: 'Something you carry is getting warm.', pause: 0.6, film: true },
      { who: 'flame', mood: 'happy', text: "It's humming! The card! Take it out, take it out!" },
      { who: 'narrator', art: 'sp-sealed', text: 'The crack runs wider. Light spills out of it.', shot: { shake: 'small' } },
      { who: 'narrator', art: 'sp-transform', text: 'The light takes you.' },
      { who: 'you', text: '...Is this me?', pause: 0.8 },
      { who: 'wanderer', text: "It always was. You just hadn't met this one yet." },
      { who: 'flame', mood: 'happy', text: "I knew it. I've known the whole time. I just didn't want to spoil it." },
      { who: 'narrator', art: 'sp-awake', text: 'The card has its colors now. It belongs to you.' },
      { who: 'wanderer', text: 'Take it into the Fog. See what it wants to show you.' },
    ],
  },
  {
    // The second SP: the story's gift after the second chapter (SP_GIFTS), awake from the start.
    // Like each later one, it is a surprise: nothing shows it before this.
    id: 'sp-second',
    when: { beaten: SP_GIFTS[2], noClass: false },
    music: 'camp',
    lines: [
      { who: 'narrator', text: "There's a second warmth in your pack. You didn't put anything there.", pause: 0.8, film: true },
      { who: 'flame', mood: 'happy', text: "Another one? Is that allowed? I'm asking for us." },
      { who: 'narrator', spn: 2, art: 'sp-awake', text: 'A new card. This one is already awake, its colors bright, like it got tired of waiting.' },
      { who: 'wanderer', show: 'wanderer', text: 'I told you. They come when they come. That one has been watching you since the lake.' },
      { who: 'narrator', spn: 2, art: 'sp-transform', text: 'The light takes you again. It feels different this time.' },
      { who: 'you', text: "It's still me. Just... a different way of standing.", pause: 0.8 },
      { who: 'wanderer', text: 'Wear the one the day asks for. None of them is more you than the others.' },
    ],
    ask: { kind: 'sp', n: 2 },
  },
  {
    // The third SP, after the fourth chapter.
    id: 'sp-third',
    when: { beaten: SP_GIFTS[3], noClass: false },
    music: 'camp',
    lines: [
      { who: 'narrator', text: 'You wake before the sun. Something on your chest is humming, softly, like it was waiting for you to notice.', film: true },
      { who: 'flame', mood: 'soft', text: "It's been doing that all night. I didn't want to wake you. You looked like you'd earned it." },
      { who: 'narrator', spn: 3, art: 'sp-awake', text: 'A third card, warm in your hand.' },
      { who: 'wanderer', show: 'wanderer', text: "The plateau taught you to keep going when nothing seemed to change. That was this one's lesson too." },
      { who: 'narrator', spn: 3, art: 'sp-transform', text: 'The light takes you.' },
      { who: 'flame', mood: 'happy', text: "You keep surprising me. I keep pretending I'm not surprised." },
    ],
    ask: { kind: 'sp', n: 3 },
  },
  {
    // The fourth and last SP, before the final chapter.
    id: 'sp-fourth',
    when: { beaten: SP_GIFTS[4], noClass: false },
    music: 'camp',
    lines: [
      { who: 'narrator', show: 'wanderer', text: "The Wanderer is waiting at the edge of the camp. For once, they're the one holding something out.", pause: 0.6 },
      { who: 'wanderer', text: "This one I've carried for a long time. It was never mine. I was keeping it until you got here." },
      { who: 'narrator', spn: 4, art: 'sp-awake', text: 'The last card. It glows like it already knows you.' },
      { who: 'you', text: 'Here? Where is here?', pause: 0.6 },
      { who: 'wanderer', text: 'Here is the person who never stopped coming back.' },
      { who: 'narrator', spn: 4, art: 'sp-transform', text: 'The light takes you, and this time you go to meet it.' },
      { who: 'flame', mood: 'happy', text: "All of them. You found all of them. I'm going to need a bigger shelf." },
    ],
    ask: { kind: 'sp', n: 4 },
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
