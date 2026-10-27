import type { DailyLine } from '../types';

/* What the flame says on Today after a run in the Fog, on the day of the run. Short, and never a
   scolding: a lost run is just a run. */

export type RunKind = 'won' | 'lost' | 'record' | 'mid' | 'due';

export const RUN_LINES: Record<RunKind, DailyLine[]> = {
  won: [
    { text: "We won down there! I'm still glowing." },
    { text: 'That run. My wings are still buzzing.' },
    { text: 'Down, and back up, and we won. Not bad for a little fire.' },
    { text: "The Fog lost one today. It'll get over it." },
  ],
  lost: [
    { text: 'The Fog won that round. It costs nothing. Rest, and we go again.' },
    { text: "Rough run. That's okay. The stairs will still be there." },
    { text: "We fell down there. We'll be stronger next time, and you know how." },
    { text: "That one didn't go our way. Have some water. Then whenever you like." },
    { text: 'You got further than you think. I was counting rooms.' },
  ],
  record: [
    { text: 'Deeper than ever, down there. I marked the spot.' },
    { text: "New record in the Fog! I'm telling Mira." },
    { text: 'Further than last time. Funny how that keeps happening.' },
  ],
  mid: [
    { text: 'We got past the guard on the stairs! Halfway down.' },
    { text: 'The thing on the middle floor? Gone. We walked right past where it stood.' },
  ],
  // Played the Fog today, and a workout is due: a nudge, never a scolding.
  due: [
    { text: "Fun down there. Today's a training day, though. The Fog will keep." },
    { text: 'Play later, if you like. Training first? I grow faster that way.' },
    { text: "The dungeon's not going anywhere. A workout today, then we'll see." },
  ],
};

/** The first time each zone's boss falls, in the spirit of its chapter (by zone id). */
export const FIRST_CLEAR: string[] = [
  'Tomorrow fell today. Seems right, somehow.',
  "The Mirror broke, and you're still here. The real one.",
  "The Knight's down. Not perfectly. Done.",
  'The Plateau broke all at once. It had been breaking for ages.',
  "You took its hand down there. It's a little quieter in here now.",
  'No top, and you climbed anyway. I saw the view. Thank you.',
];
