import type { Letter } from '@/lib/game';
import type { Line } from './types';

// The opening, scene by scene. It's written for anyone who once loved training and lost it,
// so it never names a sport, an age or a number.

export const COLD_OPEN: Line[] = [
  { who: 'narrator', text: 'Do you remember the last time you felt strong?' },
  { who: 'narrator', text: 'Not how you looked. How it felt.' },
  { who: 'narrator', text: 'Lungs on fire. Hands shaking. And somehow, smiling.' },
  { who: 'narrator', text: "Back then you thought it would always be there. That's the thing about strength. It never tells you it's leaving." },
];

export const FADING: Line[] = [
  { who: 'narrator', text: "It didn't leave all at once." },
  { who: 'narrator', text: 'A busy week. Then a tired month. Then a year when everything else came first.' },
  { who: 'narrator', text: '“Next Monday,” you said. You said it so many times it stopped meaning anything.' },
  { who: 'narrator', text: "Nobody took it from you. That's the part that hurts. You put it down, one day at a time, and forgot where." },
  { who: 'narrator', text: 'Now the stairs feel longer. Your reflection looks like someone you used to know.' },
  { who: 'narrator', text: 'And somewhere along the way, a voice moved in.' },
];

/** Lines the player can pick as the Hollow's voice. */
export const VOICES = ["You're not enough.", 'You always quit.', "It's too late for you.", 'You used to be someone.', "Everyone can see you've given up."];

export const HOLLOW_MEET: Line[] = [
  { who: 'narrator', text: "You wake up in a gray land. Ash falls like snow. There's a cracked sword in your hand." },
  { who: 'narrator', text: 'Someone stands a few steps away, with their back to you.' },
  { who: 'narrator', text: 'They turn around. They have your face. But the eyes are empty.' },
  { who: 'hollow', text: '{voice}', needs: 'voice' },
  { who: 'hollow', text: "Don't look so surprised. You've heard me every day for years." },
  { who: 'hollow', text: "I'm not your enemy. I'm the only one who's honest with you." },
  { who: 'hollow', text: "Remember the last time you tried? I was there. I'm always there." },
  { who: 'hollow', text: "If you don't try, you can't fail. Put the sword down. Stay here with me. It's quiet here." },
  { who: 'you', text: '...No.' },
  { who: 'hollow', text: 'No? Alright. Show me.' },
];

/** The first fight can't be won. Each strike, the Hollow answers. */
export const FIGHT_TURNS: { strike: string; answer: string }[] = [
  { strike: 'Your arms shake. The sword is heavier than you remember.', answer: '{voice}' },
  { strike: 'You swing again. Slower.', answer: 'Everyone can see it. You know that, right?' },
  { strike: 'You can barely lift it.', answer: "Stay down. It's easier." },
];

export const FALLEN: Line[] = [
  { who: 'narrator', text: 'You fall into the ash.' },
  { who: 'narrator', text: "It's soft down here. Quiet. It would be so easy to stay." },
  { who: 'hollow', text: 'See? I told you. Stay down.' },
  { who: 'narrator', text: 'And maybe you would have. Like last time.' },
  { who: 'narrator', text: "But there's one thing it doesn't know about you." },
];

/** Shown while the player holds to stand up, at these points of the hold. */
export const RISE_WORDS: { at: number; text: string }[] = [
  { at: 0.15, text: "Not because you're strong." },
  { at: 0.5, text: "Not because you're sure." },
  { at: 0.85, text: "Because you're not done." },
];

export const MEET: Line[] = [
  { who: 'narrator', text: 'A hand reaches down. A stranger in a gray hood, with a lantern that burns gold.' },
  { who: 'wanderer', text: "You got up. Most people don't, the first time." },
  { who: 'you', text: 'I lost.' },
  { who: 'wanderer', text: "You did. Good. Now you know what you're fighting." },
  { who: 'wanderer', text: "It isn't a weight, or a number, or your age. It's a voice. And it wears your face." },
  { who: 'you', text: 'How do I beat it?' },
  { who: 'wanderer', text: 'Not in one swing. Nobody beats it in one swing.' },
  { who: 'wanderer', text: 'You beat it the way water beats stone. One drop. Then another. Then another.' },
  { who: 'wanderer', text: 'Every time you show up on a day it tells you not to, it gets a little quieter.' },
  { who: 'you', text: 'And when I fail?' },
  { who: 'wanderer', text: "You will. Many times. Failing isn't the end of the road. Stopping is." },
  { who: 'wanderer', text: 'Your strength is still here, under the ash. Buried, not gone.' },
  { who: 'wanderer', text: "Before we walk, write to the person you want to become. Not who you were. Who you're going to be." },
];

export const LETTER_PROMPTS: { key: keyof Letter; label: string; placeholder: string }[] = [
  { key: 'why', label: "Dear future me, I'm starting again because...", placeholder: 'I miss feeling strong in my own body' },
  { key: 'want', label: 'One day I want to be able to...', placeholder: 'do 15 pull-ups again, and hold an L-sit' },
  { key: 'forWho', label: "I'm doing this for...", placeholder: 'me, and the people who need me at my best' },
  { key: 'remind', label: 'When I want to quit, remind me that...', placeholder: 'every rep counts, even on bad days' },
];

export const SEALED: Line[] = [
  { who: 'narrator', text: 'The Wanderer folds your letter without reading it, and keeps it close.' },
  { who: 'wanderer', text: "I'll carry this. One day I'll read it back to you. I promise." },
  { who: 'narrator', text: 'Then the Wanderer hands you a book. Old leather. Every page is blank.' },
  { who: 'wanderer', text: 'Your past is already written. Nobody can change it. Not even you.' },
  { who: 'wanderer', text: "But this one is empty. Every time you train, a page gets written. You're the author now." },
  { who: 'narrator', text: 'Something flickers in the ash at your feet. A spark, no bigger than a fingernail.' },
  { who: 'flame', text: "...hi. Sorry. I'm small right now. I used to be bigger." },
  { who: 'flame', text: "I think I'm the part of you that never stopped wanting this." },
  { who: 'flame', text: "I waited a long time. I'm really glad you got up." },
];

export const FIRST_QUEST: Line[] = [
  { who: 'wanderer', text: 'Your first quest is simple. Show up three times this week.' },
  { who: 'wanderer', text: 'Not perfect. Present.' },
  { who: 'flame', text: 'Every session you do, I grow. Just so you know. No pressure. (Some pressure.)' },
  { who: 'narrator', text: 'Chapter 1: The Ashlands.' },
];
