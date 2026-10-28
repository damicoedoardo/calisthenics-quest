import type { FogZone, Scene } from './types';
import type { PlaceId } from './places';

/* The Ember Road: the story you walk with friends, apart from the six-month story. It is about
   friendship, in Edoardo's words: friends push each other to be the best, friends are there even
   when you don't talk every day, and we rely on each other. Three chapters, each ending in a boss
   your party beats in the Fog (Together), then a finale. Tamsin walks the road ahead of you and
   leaves fires and notes. When each part plays: src/lib/road.ts (ROAD in src/balance/training.ts). */

export interface RoadChapter {
  n: number;
  name: string;
  place: PlaceId;
  /** The story zone whose dungeon, monsters and boss fight the chapter's run borrows (an index
      into ZONES). The boss gets the road's own name, words and rule. */
  base: number;
  fog: Pick<FogZone, 'name' | 'hint' | 'after' | 'keepsake' | 'lines'> & { bossName: string };
}

export const ROAD_CHAPTERS: RoadChapter[] = [
  {
    n: 1,
    name: 'Iron and Ember',
    place: 'whetstone-pass',
    base: 0,
    fog: {
      name: 'The Whetstone Pass',
      bossName: 'The Lull',
      hint: 'The Lull heals while you hang back. Push in together, and keep each other close.',
      after: "A friend who lets you settle isn't being kind. You pushed each other. That's kind.",
      keepsake: { name: "Tamsin's Whetstone", text: 'Two things rubbing together, both getting sharper.' },
      lines: {
        enter: "Shh... you've done enough. Rest here.",
        stages: ['Two of me. Twice as sleepy.'],
        end: "...Your friends wouldn't let you sleep.",
        taunts: ['Good enough is good enough.', 'Why try harder? Stay here.', "They'll go on without you. Let them.", 'Sit down. Just for a while.'],
      },
    },
  },
  {
    n: 2,
    name: 'The Quiet Miles',
    place: 'quiet-miles',
    base: 1,
    fog: {
      name: 'The Quiet Miles',
      bossName: 'The Distance',
      hint: 'The Distance hides among shapes in the fog. Hitting a false one hurts you. Only the real one shoots: find it together.',
      after: 'Time doesn’t wear out a real friend. You called, they came. That’s all it ever takes.',
      keepsake: { name: 'A Lantern Glass', text: "It held a friend's light through the fog." },
      lines: {
        enter: 'It’s been so long. Do they even remember you?',
        stages: ['Which one is your friend? Which one is me?'],
        end: '...You still knew each other.',
        taunts: ['They’ve moved on.', 'Too much time has passed to ask.', 'You’d only be a bother.', 'Why call now?'],
      },
    },
  },
  {
    n: 3,
    name: 'The Long Bridge',
    place: 'long-bridge',
    base: 2,
    fog: {
      name: 'The Long Bridge',
      bossName: 'The One Who Walks Alone',
      hint: 'Every hit breaks one plate, whoever lands it. Alone it takes forever. Together it falls.',
      after: "Asking for help isn't weakness. It's how anyone gets across.",
      keepsake: { name: 'A Knot of Bridge Rope', text: 'Tied by more than one pair of hands. It held.' },
      lines: {
        enter: 'Nobody’s coming. You do it all yourself.',
        stages: ['Help is weakness. Stop that.', '...Why are there more of you?'],
        end: '...I was tired of carrying it alone.',
        taunts: ['Don’t ask. They’ll think less of you.', 'Real ones don’t need anyone.', 'You’ll owe them now.', 'Do it alone, or don’t do it.'],
      },
    },
  },
];

/** What every hero who reaches the end keeps. */
export const ROAD_BANNER = { name: 'The Road Banner', text: 'Every name that walked the road with you is stitched on it.' };

export const ROAD_SCENES: Scene[] = [
  {
    id: 'road-1-open',
    when: { road: { open: 1 } },
    place: 'whetstone-pass',
    music: 'camp',
    shots: [{ title: 'The Ember Road', seconds: 2.4 }, { pan: 'up', seconds: 2 }],
    lines: [
      { who: 'narrator', text: 'A road you have never seen. Small fires burn along it, one every mile, as if someone left them for you.', shot: { pan: 'center' } },
      { who: 'flame', mood: 'bright', text: 'Other fires! Little ones! Who lights fires for strangers?' },
      { who: 'tamsin', text: 'Someone who was a stranger here once. Hello. And more than one of you. Good.', shot: { enter: 'right' } },
      { who: 'tamsin', text: "I'm Tamsin. I walk this road ahead of people, and I leave a fire at every stop." },
      { who: 'you', text: 'Why more than one of us?' },
      { who: 'tamsin', text: "Because this road doesn't go anywhere alone. Three stretches, and something waits at the end of each that you can only beat together." },
      { who: 'tamsin', text: 'The first is up the Whetstone Pass. There is a giant up there who sings. Lovely voice. Don’t let him sing you small.' },
      { who: 'flame', mood: 'soft', text: 'We’ll keep each other awake. That’s what friends are for. I think. I’ve never had friends besides you.' },
      { who: 'tamsin', text: "Then you're about to. Bring your party into the Fog, to the Whetstone Pass. I'll be ahead." },
    ],
  },
  {
    id: 'road-1-note',
    when: { road: { note: 1 } },
    place: 'whetstone-pass',
    music: 'camp',
    lines: [
      { who: 'narrator', text: 'By a cold forge on the pass, one of her fires is still warm. A note is tucked under a stone.' },
      { who: 'tamsin', show: 'tamsin', text: '"A blade gets sharp against something harder than itself. So do people. Find the ones who make you better, and stay near them. T."' },
      { who: 'flame', mood: 'soft', text: 'She writes like she’s talking to someone she misses.' },
    ],
  },
  {
    id: 'road-1-won',
    when: { road: { won: 1 } },
    place: 'whetstone-pass',
    music: 'rise',
    lines: [
      { who: 'narrator', text: 'The Lull is quiet. At the top of the pass, a fire, and Tamsin warming her hands at it.' },
      { who: 'tamsin', text: "He almost had me, my first time. I sat down for a minute and stayed a year. Then a friend came back up the pass and pulled me to my feet. Didn't ask. Just pulled." },
      { who: 'tamsin', text: "A good friend won't let you settle for less than you can be. Even when settling feels nice." },
      { who: 'flame', mood: 'happy', text: 'You kept pulling each other up. I saw it!' },
    ],
    ask: {
      kind: 'choice',
      id: 'road1',
      prompt: 'Who is a friend who pushed you to be better?',
      choices: [
        { label: 'Someone I train with', value: 'someone I train with' },
        { label: 'An old friend', value: 'an old friend' },
        { label: 'Someone in my family', value: 'someone in my family' },
      ],
      write: 'Their name, or what they did',
      after: [{ who: 'tamsin', text: 'Keep them close. And be that for someone too. The next stretch is quieter. Too quiet, some say.' }],
    },
  },
  {
    id: 'road-2-open',
    when: { road: { open: 2 } },
    place: 'quiet-miles',
    music: 'memory',
    shots: [{ title: 'Chapter 2: The Quiet Miles', seconds: 2.4 }],
    lines: [
      { who: 'narrator', text: 'Down the other side, a long valley. Walls of fog stand across the road, so each of you walks your own lane and can only see the others’ light.' },
      { who: 'tamsin', text: "The Quiet Miles. I have friends I haven't heard from in a year. I used to think that meant they were gone." },
      { who: 'you', text: "Weren't they?" },
      { who: 'tamsin', text: 'One night I called one of them. They picked up on the second ring and said my name like we spoke yesterday.' },
      { who: 'tamsin', text: 'Something lives down here that wants you to believe the quiet is the end. It wears a lot of faces. Don’t hit the wrong ones.' },
      { who: 'flame', mood: 'scared', text: "I don't like lanes. I like being next to you." },
      { who: 'tamsin', text: "You still are. You just can't see it for a while. Go on, your party knows the way." },
    ],
  },
  {
    id: 'road-2-note',
    when: { road: { note: 2 } },
    place: 'quiet-miles',
    music: 'camp',
    lines: [
      { who: 'narrator', text: 'Halfway down the valley, a fire with a lantern hung over it, and a note.' },
      { who: 'tamsin', show: 'tamsin', text: '"Some friends you don’t hear from for weeks. Then you need them, and they’re there, as if no time passed. Don’t wait for a reason to say hello. T."' },
      { who: 'flame', mood: 'soft', text: 'Maybe send someone a hello today. Just a small one.' },
    ],
  },
  {
    id: 'road-2-won',
    when: { road: { won: 2 } },
    place: 'quiet-miles',
    music: 'rise',
    lines: [
      { who: 'narrator', text: 'The fog walls fall. Your lanes were never far apart. Just out of sight.' },
      { who: 'tamsin', text: 'There you are. All of you. See? No time passed at all.' },
      { who: 'tamsin', text: "The Distance only works if nobody calls. You called each other. That's all it ever takes." },
    ],
    ask: {
      kind: 'choice',
      id: 'road2',
      prompt: 'Who would be there if you called tonight?',
      choices: [
        { label: 'A friend I talk to every day', value: 'a friend I talk to every day' },
        { label: "A friend I haven't called in a while", value: "a friend I haven't called in a while" },
        { label: 'Someone in my family', value: 'someone in my family' },
      ],
      write: 'Their name',
      after: [{ who: 'tamsin', text: "Good. Now the hard part. There's a bridge ahead that nobody crosses alone. Not even me." }],
    },
  },
  {
    id: 'road-3-open',
    when: { road: { open: 3 } },
    place: 'long-bridge',
    music: 'heartbeat',
    shots: [{ title: 'Chapter 3: The Long Bridge', seconds: 2.4 }, { pan: 'down', seconds: 2 }],
    lines: [
      { who: 'narrator', text: 'A gorge, and over it a rope bridge that sways in the wind. On the far side, a figure in armor stands with its arms folded.', shot: { pan: 'center' } },
      { who: 'tamsin', text: 'The One Who Walks Alone. It used to be a traveller, like us. It decided needing anyone was weakness.' },
      { who: 'you', text: 'What happened to it?' },
      { who: 'tamsin', text: "It got very strong. And very tired. And it stopped every bridge so nobody else could lean on anyone either." },
      { who: 'flame', mood: 'soft', text: 'That sounds lonely.' },
      { who: 'tamsin', text: 'It is. Every hit counts against it, whoever lands it. Remember that when it tells you to do it all yourself.' },
    ],
  },
  {
    id: 'road-3-note',
    when: { road: { note: 3 } },
    place: 'long-bridge',
    music: 'camp',
    lines: [
      { who: 'narrator', text: 'Tied to the first post of the bridge, a note, and a coil of good rope.' },
      { who: 'tamsin', show: 'tamsin', text: '"Asking for help isn’t weakness. It’s how anyone gets across. I asked. Somebody held the rope. T."' },
      { who: 'flame', mood: 'happy', text: 'I can hold a rope! Well. I can glow at a rope encouragingly.' },
    ],
  },
  {
    id: 'road-3-won',
    when: { road: { won: 3 } },
    place: 'long-bridge',
    music: 'rise',
    lines: [
      { who: 'narrator', text: 'The armor falls open. Inside, just a tired traveller, sitting down on the bridge for the first time in years.' },
      { who: 'tamsin', text: "Here. Take my hand. There. That wasn't so bad, was it?" },
      { who: 'tamsin', text: 'We rely on each other. That was never the weak part of us. It was the whole point.' },
    ],
    ask: {
      kind: 'choice',
      id: 'road3',
      prompt: 'What could you ask a friend to help you with?',
      choices: [
        { label: 'To train with me', value: 'to train with me' },
        { label: 'To check on me', value: 'to check on me' },
        { label: 'Something I keep putting off', value: 'something I keep putting off' },
      ],
      write: 'In your own words',
      after: [{ who: 'tamsin', text: "Then ask. Soon. The road's end isn't far now. Keep training, and I'll see you at the hearth." }],
    },
  },
  {
    id: 'road-end',
    when: { road: { end: true } },
    place: 'road-hearth',
    music: 'memory',
    shots: [{ title: 'The Hearth at the Road’s End', seconds: 2.6 }, { fade: 'in', seconds: 1.4 }],
    lines: [
      { who: 'narrator', text: 'At the end of the road, a great stone hearth, cold, wide enough for a whole village to sit around.', film: true, pause: 0.6 },
      { who: 'tamsin', text: 'Every traveller tries to light it alone the first time. Nobody ever has.' },
      { who: 'flame', mood: 'soft', text: 'Then we don’t try alone.' },
      { who: 'narrator', text: 'Each of you holds out a hand. Each flame gives one spark. For a moment, nothing.', pause: 1 },
      { who: 'narrator', text: 'Then it catches. All at once, the whole hearth roars up gold, and the road behind you lights up fire by fire, all the way back.', shot: { shake: 'small' }, music: 'rise', film: true },
      { who: 'tamsin', text: 'I never walked this road alone either. The notes were for my friends. Now they’re for yours.' },
      { who: 'tamsin', text: '"Every fire is lit from another fire. Thank you for lighting mine."', pace: 'slow', pause: 0.8 },
      { who: 'narrator', text: 'She hands you a banner. Your party’s names are already stitched on it. You keep the Road Banner.' },
    ],
  },
];
