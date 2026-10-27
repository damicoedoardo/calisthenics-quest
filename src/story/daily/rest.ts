import type { DailyLine } from '../types';

/* Rest days: one short truth about rest on Today, and what the flame says after a minute by the fire.
   General and kind: no body talk, no numbers. */

export const REST_TRUTHS: string[] = [
  'Strength grows while you rest, not while you train. Today is part of training.',
  "Sleep is the best recovery there is, and it's free.",
  "Being sore isn't proof of a good workout. Coming back is.",
  'A walk counts. Stretching counts. Doing nothing counts too.',
  "Restless? That's energy saving up for tomorrow.",
  "Water, a good meal, bed a little earlier. That's today's quest.",
  'Rest is when the work you did turns into strength.',
  'Today, notice one thing you did for yourself this week. Just notice it.',
  'Go outside for a few minutes, if you can. No goal. Just air.',
  'The fire curls up low and happy in the ash. "Stay a while. I\'m keeping it warm for tomorrow."',
  'Rest days are not a pause in the story. They are pages too.',
  'Do one kind thing for the person who trained this week. It was you.',
  'A rest day you planned is part of the plan. Nothing to make up for.',
  'Stretch for as long as it feels good, and stop when it stops feeling good.',
  'Let today be ordinary. Ordinary days are where the strength settles in.',
];

/** What the flame says after the minute by the fire. */
export const FIRE_LINES: DailyLine[] = [
  { text: 'Mm. That was nice. Thanks for resting with me.' },
  { text: 'I feel lighter. Do you?' },
  { text: 'Air. That was exactly what I needed.' },
  { text: "Let's do that again sometime. I like breathing with you." },
  { text: "I almost fell asleep. That's a compliment." },
  { text: 'That was you being kind to you. I saw it.' },
  { text: 'Quiet, but not the Hollow kind of quiet. The good kind.' },
  { text: "Your shoulders came down a little. I noticed. I notice everything, it's my job." },
  { text: "That's the most still you've been all week. It suits you." },
  { text: 'I made the fire a bit bigger while you breathed. You didn\'t notice. That\'s fine.' },
  { text: 'Breathing is the first thing you ever got good at. Still got it.' },
  { text: 'A minute of quiet, and {heart1} feels a bit closer somehow. Is that silly?', needs: 'heart1' },
  { text: '"{heart6}." That counts as keeping it, you know. This minute.', needs: 'heart6' },
];
