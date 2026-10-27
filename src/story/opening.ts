import type { Letter } from '@/lib/game';
import type { Line } from './types';

// The opening, scene by scene. It's written for anyone who once loved training and lost it,
// so it never names a sport, an age or a number.

export const COLD_OPEN: Line[] = [
  { who: 'narrator', text: 'Do you remember the last time you felt strong?', pace: 'slow' },
  { who: 'narrator', text: 'Not how you looked. How it felt.', pause: 1.2 },
  { who: 'narrator', text: 'Lungs on fire. Hands shaking. And somehow, smiling.' },
  { who: 'narrator', text: 'The good ache the next morning, on the stairs. Laughing about it.', pause: 0.8 },
  { who: 'narrator', text: "Back then you thought it would always be there. That's the thing about strength.", pause: 1.4 },
  { who: 'narrator', text: "It never tells you it's leaving.", pace: 'slow', pause: 1.2 },
];

/** The montage: who you were turns gray. The first two lines show you in your golden days, the last one the Hollow behind you. */
export const FADING: Line[] = [
  { who: 'narrator', text: "It didn't leave all at once." },
  { who: 'narrator', text: 'A busy week. Then a tired month. Then a whole stretch of life when everything else came first.' },
  { who: 'narrator', text: '“Next Monday,” you said. You said it so many times it stopped meaning anything.' },
  { who: 'narrator', text: 'You still have the shoes. They are at the back of a cupboard. You know exactly which one.', pause: 0.8 },
  { who: 'narrator', text: 'Now the stairs feel longer. You walk past old photos a little faster than you used to.' },
  { who: 'narrator', text: 'Some mornings you almost start. Then you work out how far back you would be starting from, and you put that down too.' },
  { who: 'narrator', text: "Nobody took it from you. That's the part that hurts. You put it down, one day at a time, and forgot where.", pause: 1.2, pace: 'slow' },
  { who: 'narrator', text: 'And somewhere along the way, a voice moved in.', pause: 1.6, music: 'none' },
];

/** Lines the player can pick as the Hollow's voice. */
export const VOICES = ["You're not enough.", 'You always quit.', "It's too late for you.", 'You used to be someone.', "Everyone can see you've given up."];

/** Meeting the Hollow. The first line shows you, the second the Hollow far off, then the Hollow up close. */
export const HOLLOW_MEET: Line[] = [
  { who: 'narrator', text: "You wake up in a gray land. Ash falls like snow. There's a cracked sword in your hand." },
  { who: 'narrator', text: 'Someone stands a few steps away, with their back to you.' },
  { who: 'narrator', text: 'They turn around. They have your face. But the eyes are empty.' },
  { who: 'hollow', text: '{voice}', needs: 'voice' },
  { who: 'hollow', text: "Don't look so surprised. You've heard me every day for years." },
  { who: 'hollow', text: "I'm not your enemy. I'm the only one who's honest with you." },
  { who: 'hollow', text: 'I was there every time you looked in the mirror and looked away. Every time you said "next Monday" and we both knew.' },
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
  { who: 'narrator', text: "But you've had a lot of quiet. You're tired of it." },
  { who: 'narrator', text: "And there's one thing the voice doesn't know about you." },
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
  { who: 'you', text: "It's right, though. I used to be... more." },
  { who: 'wanderer', text: 'You used to be carrying less. That is not the same thing.', pause: 1 },
  { who: 'you', text: "Then why do I feel so ashamed?" },
  { who: 'wanderer', text: "...Because you still care. You wouldn't feel a thing if you didn't.", pause: 1.4, pace: 'slow' },
  { who: 'you', text: 'How do I beat it?' },
  { who: 'wanderer', text: 'Not in one swing. Nobody beats it in one swing.' },
  { who: 'wanderer', text: 'You beat it the way water beats stone. One drop. Then another. Then another.' },
  { who: 'you', text: 'And when I fail?' },
  { who: 'wanderer', text: "You will. Many times. Failing isn't the end of the road. Stopping is. And even stopping wasn't the end. Look where you're standing." },
  { who: 'wanderer', text: 'One rule, before we walk. That voice talks to you like an enemy. I never will. Try not to, either.' },
  { who: 'wanderer', text: "Now write to the person you want to become. Not who you were. Who you're going to be." },
];

export const LETTER_PROMPTS: { key: keyof Letter; label: string; placeholder: string }[] = [
  { key: 'why', label: "Dear future me, I'm starting again because...", placeholder: 'I miss feeling strong in my own body' },
  { key: 'want', label: 'One day I want to be able to...', placeholder: 'do 15 pull-ups again, and hold an L-sit' },
  { key: 'forWho', label: "I'm doing this for...", placeholder: 'me, and the people who need me at my best' },
  { key: 'remind', label: 'When I want to quit, remind me that...', placeholder: 'every rep counts, even on bad days' },
];

/** After the letter. Narration over the Wanderer (lines 1-2), the book (3-5), then the spark. */
export const SEALED: Line[] = [
  { who: 'narrator', text: 'The Wanderer folds your letter without reading it, and keeps it close.' },
  { who: 'wanderer', text: "I'll carry this. One day I'll read it back to you. I promise." },
  { who: 'narrator', text: 'Then the Wanderer hands you a book. Old leather. Every page is blank.' },
  { who: 'wanderer', text: 'Your past is already written. Nobody can change it. You can stop rereading it, though.' },
  { who: 'wanderer', text: "This one is empty. Every time you train, a page gets written. Rest days get a page too. Nothing in here is ever torn out." },
  { who: 'narrator', text: 'Something flickers in the ash at your feet. A spark, no bigger than a fingernail.', pause: 1.2 },
  { who: 'flame', text: "...hi. Sorry. I'm small right now. I used to be bigger." },
  { who: 'flame', text: "I think I'm the part of you that never stopped wanting this." },
  { who: 'flame', mood: 'soft', text: "I waited a long time. I'm not upset. I'm just really, really glad you got up.", pace: 'slow' },
];

export const FIRST_QUEST: Line[] = [
  { who: 'wanderer', text: 'Your first quest is simple. Show up three times this week.' },
  { who: 'wanderer', text: 'Not perfect. Present.' },
  { who: 'wanderer', text: "Keep it small. You're not getting it all back this week. You're finding out if you can keep a promise to yourself." },
  { who: 'flame', text: 'Every session you do, I grow. Just so you know. No pressure. (Some pressure.)' },
  { who: 'narrator', text: 'Chapter 1: The Ashlands.' },
];
