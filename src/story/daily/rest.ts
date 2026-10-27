import type { DailyLine } from '../types';

/* Rest days: one short truth about rest on Today, and what the flame says after a minute by the fire.
   General and kind: no body talk, no numbers. */

export const REST_TRUTHS: string[] = [
  'Strength grows while you rest, not while you train. Today is part of training.',
  "Sleep is the best recovery there is, and it's free.",
  "Being sore isn't proof of a good workout. Coming back is.",
  'A walk counts. Stretching counts. Doing nothing counts too.',
  "The people who keep going for years take rest days. That's how they keep going.",
  "Restless? That's energy saving up for tomorrow.",
  "Water, a good meal, bed a little earlier. That's today's quest.",
  'Rest is when the work you did turns into strength.',
  "Resting isn't earning a break. It's looking after the person doing the work.",
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
];
