import type { DailyLine, FlameMood, Moment } from '../types';

/* What your flame says on Today, by kind of day. One line a day, and none repeats within three
   weeks, so each list needs a few. {words} work like in scenes: {want}, {sessions}... A line that
   needs a word the player left empty is skipped. */

export const FLAME_LINES: Record<Moment, DailyLine[]> = {
  first: [
    { text: "Hi. I'm still small. One workout and I'll grow a little." },
    { text: "The first page is the hardest one to write. Let's write it together." },
    { text: "I don't need a big workout. I need a first one." },
    { text: "Whenever you're ready. I'll be right here, glowing." },
  ],
  training: [
    { text: "Morning. I saved you some warmth. Let's spend it." },
    { text: "Today's page is blank. Want to write on it?" },
    { text: "I've been thinking about you. Well, I'm a flame. I mostly think about you." },
    { text: 'One workout today. That\'s all today asks.' },
    { text: "You don't have to feel ready. You just have to start." },
    { text: 'Every page you write, I get a little brighter.' },
    { text: 'Every workout is a step toward {want}.', needs: 'want' },
    { text: "Let's go see what today's version of you can do." },
  ],
  trained: [
    { text: "Page written. Look at me, I'm practically glowing." },
    { text: "You did it. Now eat something good and rest. That's part of it too." },
    { text: "That's {sessions} pages now. I remember every one." },
    { text: 'Done for today. The rest of the day is yours.' },
    { text: 'I felt that one. Warm all the way through.' },
    { text: 'Today counts. It always will.' },
  ],
  rest: [
    { text: "No training today. I'll keep the fire going, you keep the promise." },
    { text: 'Rest day. Strength gets built today, not yesterday.' },
    { text: 'Fuel yesterday, air today. A fire needs both.' },
    { text: "Take it easy today. I'm not going anywhere." },
    { text: "Rest isn't skipping. It's the other half of training." },
    { text: 'Today the work is to do nothing much. You can do that, right?' },
    { text: "I like rest days. You're calmer. I'm calmer." },
    { text: 'A walk, a stretch, a nap. Any of those counts today.' },
  ],
  rested: [
    { text: "You rested. I can feel it. I'm burning bright today." },
    { text: "Two days of air. I'm ready if you are." },
    { text: 'Rested and warm. Today would be a good day for a page.' },
    { text: "I'm full of air and itching to burn. Shall we?" },
    { text: "Rest done right. Now let's use it." },
  ],
  missed: [
    { text: "Yesterday's gone. Today's still here." },
    { text: 'No speeches. Just one small workout, when you can.' },
    { text: "I'm still lit. A little lower, but still lit." },
    { text: 'Missing days is part of it. Coming back is the part that matters.' },
    { text: "Let's not make up for lost time. Let's just do today." },
    { text: 'Start small today. Small still counts.' },
  ],
  rough: [
    { text: "Small counts. Show up small and I'll do the rest." },
    { text: "A rough day, and you still came. That's the whole secret." },
    { text: "Short workouts are still workouts. I don't count minutes, I count pages." },
    { text: 'Go easy on yourself today. I am.' },
  ],
  best: [
    { text: 'Did you feel that? I grew a little.' },
    { text: 'New best. I knew it before you did.' },
    { text: "Something you couldn't do before, you did. Remember that." },
    { text: "You keep surprising me. Please don't stop." },
  ],
  late: [
    { text: 'Go to sleep. Strong gets built in bed.' },
    { text: "It's late. Whatever's left can wait for tomorrow." },
    { text: "I'm dimming down for the night. You should too." },
    { text: 'Sleep is training too. The easiest kind.' },
    { text: 'Night. You did enough today, just by being here.' },
  ],
  weekend: [
    { text: 'No rush today. Want to walk somewhere nice?' },
    { text: 'Weekend. If you train, great. If you rest, also great.' },
    { text: "Slow morning? Me too. Let's keep it gentle." },
    { text: 'Weekends are for moving just because it feels good.' },
  ],
  smoky: [
    { text: 'I need air. Rest with me tomorrow?' },
    { text: "Four days in a row. I'm proud, and a little smoky. Rest tomorrow?" },
    { text: "Too much fuel, not enough air. Let's take a day off soon." },
    { text: "You've been amazing. Now be amazing at resting." },
  ],
  back: [
    { text: 'You came back. I kept one ember lit, just in case.' },
    { text: 'I kept myself warm. Welcome back.' },
    { text: "No questions. I'm just glad you're here." },
    { text: "Let's start small again. I'll grow back fast, you'll see." },
  ],
};

/** The flame's face on each kind of day. */
export const MOMENT_MOOD: Record<Moment, FlameMood> = {
  first: 'happy',
  training: 'happy',
  trained: 'happy',
  rest: 'soft',
  rested: 'bright',
  missed: 'soft',
  rough: 'soft',
  best: 'bright',
  late: 'sleepy',
  weekend: 'happy',
  smoky: 'smoky',
  back: 'dim',
};
