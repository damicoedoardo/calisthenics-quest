import type { DailyLine } from '../types';

/* Right after a workout, the flame says one thing on the loot card; and every page of the Book of
   Days gets a note in the margin, in your own handwriting (the Wanderer shows you these margins in
   month six). Kind, short, and about what you did, never about how much. */

/** What kind of workout it was, for the flame's line after it. */
export type AfterKind = 'first' | 'back' | 'best' | 'short' | 'full';

export const AFTER_LINES: Record<AfterKind, DailyLine[]> = {
  first: [{ text: "That's the first page. The hardest one. It's written now, and nothing can unwrite it." }],
  back: [
    { text: 'You came back. That was the bravest workout so far, and it wasn\'t even close.' },
    { text: "Welcome back. The stones are where you left them. Here's a new one.", fromChapter: 2 },
    { text: "No questions. I'm just glad. I'm SO glad." },
    { text: 'The Hollow said you always stop. You just proved it wrong, out loud.' },
    { text: "I kept your spot warm. It's still your shape." },
    { text: 'There you are. I missed you. That is the only thing I am going to say about it.' },
    { text: 'Every page from before is still in the book. This one goes right after them.' },
  ],
  best: [
    { text: 'Did you feel that? Something new. Something you could not do before.' },
    { text: "I'm doing loops. You can't see them but I'm doing loops." },
    { text: 'Remember this one, for the next time the Hollow says nothing changes.' },
    { text: 'That was {heart1} again, a bit. I knew it was still in there.', needs: 'heart1' },
    { text: 'New. Brand new. I want to frame it.' },
    { text: "Not long ago, that wasn't possible. Stop for a second. Let it be big." },
  ],
  short: [
    { text: 'Small still counts. Your week is alive.' },
    { text: 'A short one on a hard day. Those are the ones I keep closest.' },
    { text: 'You came. That was the whole job today, and you did it.' },
    { text: 'The Knight would call that not proper. The Knight is a tin can.', fromChapter: 3 },
    { text: 'A small stone. Small stones hold the line together.', fromChapter: 2 },
    { text: 'On a heavy day, this was the brave version. I mean that.' },
    { text: "You didn't let the day decide. You decided. Even if it was small." },
    { text: "I'm counting it. I'm counting it twice as loud as usual." },
    { text: 'That was enough. Say it with me. Enough.' },
    { text: "Small and done beats big and someday. Ask Tomorrow. Actually, don't." },
  ],
  full: [
    { text: 'Page written. Go drink some water. I mean it.' },
    { text: 'You said you would, and you did. I keep noticing that.' },
    { text: 'Warm all the way through. That one was good.' },
    { text: 'Another stone for the line by the fire.', fromChapter: 2 },
    { text: "You didn't feel like it at the start, did you? Look at you now." },
    { text: "Another promise to yourself, kept. I've stopped being surprised. I haven't stopped being proud." },
    { text: 'You lost {heart2}, once. A little more of it came back today.', needs: 'heart2' },
    { text: 'You wrote: "I\'m doing this for {forWho}." Today you did.', needs: 'forWho' },
    { text: 'You wrote: "One day I want to be able to {want}." Closer. Honestly closer.', needs: 'want' },
    { text: 'Somewhere in the Plateau, a crack just got deeper.', inChapter: 4 },
    { text: 'The fog thinned a little. I watched it.', inChapter: 5 },
    { text: 'A little higher up the mountain. The view is getting good.', inChapter: 6 },
    { text: 'If anyone asks, you trained today. That sentence is true now.' },
  ],
};

/** What a day held, for its margin note. */
export type MarginKind = 'back' | 'best' | 'short' | 'full' | 'fire' | 'rest' | 'visit';

/** Notes in your own hand, in the margins of the Book of Days. Terse, like real margins. */
export const MARGIN_NOTES: Record<MarginKind, string[]> = {
  back: ['Came back.', 'Came back. Glad I did.', 'Back again. Nothing lost.'],
  best: ['Something new today.', 'Did a thing I could not do before.', 'New. Remember this one.'],
  short: ['Short, still counts.', 'Hard day. Came anyway.', 'Small. Still came.', 'Not much. Enough.'],
  full: ['Came anyway.', 'Showed up.', 'Said I would. Did.', 'Good one.', 'Another stone.', 'Tired. Good tired.', 'Kept my word.'],
  fire: ['Sat by the fire.', 'Breathed. Good.', 'A quiet minute. Needed it.'],
  rest: ['Rested. Good.', 'Day off, on purpose.', 'Rest day. No guilt.', 'Did nothing much. Well done, me.'],
  visit: ['Opened the book.', 'Just checking in.', ''],
};
