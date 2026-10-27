import type { Chapter } from '../types';

/* Month 4. Lesson: progress hides before it shows. The road goes flat, the Plateau sits across it,
   and nothing seems to change. Old Vela keeps a lamp here (her story is opt-in). The heart moment
   asks what changed that nobody can see; the Hollow hears the answer in month five. */

export const PLATEAU: Chapter = {
  n: 4,
  name: 'The Plateau',
  lesson: 'Progress hides before it shows',
  enemy: 'The Plateau',
  enemySprite: 'golem',
  workouts: 13,
  tests: 2,
  place: 'flat-road',
  fog: {
    name: 'The Flat Road',
    boss: 'plateau',
    hint: 'It never shows how hurt it is. Keep hitting: it is breaking, even when it looks the same.',
    after: 'It looked like nothing was happening. Everything was happening.',
    keepsake: { name: 'A Cracked Stone', text: 'It broke all at once. It had been breaking for weeks.' },
    hp: 2.1,
    dmg: 1.85,
    ground: '#1c1712',
    fog: '#4a3a26',
  },
  scenes: [
    {
      id: 'ch4-intro',
      when: { chapter: 4 },
      shots: [{ title: 'Chapter 4: The Plateau', seconds: 2.4 }, { pan: 'right', seconds: 2.2 }],
      lines: [
        { who: 'narrator', show: 'plateau', text: 'The road stops climbing. Same rocks, same sky, for days. A stone giant sits across the road, so still it looks like part of the land.' },
        { who: 'hollow', text: "See? Nothing's changing.", shot: { pan: 'center' } },
        { who: 'flame', mood: 'soft', text: "Something is. I can feel it, I just can't see it yet." },
        { who: 'wanderer', text: 'Hills are easy. You can see yourself getting higher. This is the hard part of the map.' },
      ],
    },
    {
      id: 'ch4-wake',
      when: { workouts: 39, chapter: 4 },
      lines: [
        { who: 'narrator', show: 'plateau', text: 'The Plateau wakes, slowly. It looks at you as if you were weather.', shot: { shake: 'small' } },
        { who: 'plateau', text: '...Same.' },
        { who: 'plateau', text: '...As. ...Yesterday.' },
        { who: 'flame', mood: 'smoky', text: "Rude. Also, wrong. Probably. I'm pretty sure it's wrong." },
        { who: 'wanderer', text: "Don't look for change every day. Look every month." },
      ],
    },
    {
      id: 'ch4-vela',
      when: { workouts: 41, chapter: 4 },
      place: 'lamp-road',
      shots: [{ pan: 'up', seconds: 1.8 }],
      lines: [
        { who: 'narrator', show: 'vela', text: 'At the edge of the flat road stands a thin stone tower with a lamp at the top. An old woman sits under it, writing a letter.' },
        { who: 'vela', text: 'Another walker. You have the look. The one that says "am I even moving?"', shot: { pan: 'center' } },
        { who: 'vela', text: 'On a flat road there are no hills to steer by. People walk for days and swear they went nowhere. So somebody keeps a light.' },
        { who: 'flame', mood: 'soft', text: 'She seems lonely up there. Should we stay a while?' },
      ],
      ask: {
        kind: 'choice',
        id: 'vela',
        prompt: 'Vela folds her letter and looks at you.',
        choices: [
          {
            label: 'Climb up to the lamp',
            value: 'yes',
            after: [
              { who: 'narrator', show: 'vela', text: 'From the top of the tower, the road behind you is a long thin line. It goes back much further than you thought.' },
              { who: 'vela', text: "Flat roads hide distance. Lights don't." },
              { who: 'you', text: 'I walked all that?' },
              { who: 'vela', text: 'Every step of it. Come back up whenever you forget.' },
            ],
          },
          {
            label: 'Wave and keep walking',
            value: 'no',
            after: [
              { who: 'vela', text: "Go on, then. I'll keep it lit behind you either way." },
              { who: 'flame', mood: 'soft', text: "A light that stays on whether you look at it or not. I like her." },
            ],
          },
        ],
      },
    },
    {
      // The Plateau doubt: the month's hardest moment. The stones from month one come back.
      id: 'ch4-heart',
      when: { workouts: 43, chapter: 4 },
      music: 'memory',
      shots: [{ fade: 'in', seconds: 1.6 }],
      lines: [
        { who: 'narrator', show: 'wanderer', text: 'Night on the flat road. Same rocks as yesterday. Same rocks as last week. The Wanderer sets the lantern down between you, and for once, sits.' },
        { who: 'you', text: 'What if this is it?', pause: 1.2, pace: 'slow' },
        { who: 'you', text: "What if this is as far as I get, and I'm just... walking in place, for the rest of it?" },
        { who: 'narrator', text: 'The Wanderer does not answer that. Nobody does. The wind moves the dust around and puts it back.', pause: 1.6, film: true, music: 'none' },
        { who: 'flame', mood: 'soft', text: 'Can I borrow your pocket?', pause: 1 },
        { who: 'narrator', show: 'flame', text: '{flame} pulls out the first stone from the ash, the one you kept. Then it starts laying the others out on the ground beside it. It takes a long time.', pause: 0.8 },
        { who: 'narrator', text: 'The line of stones runs further than the lantern light reaches.', pace: 'slow', film: true, pause: 1.2 },
        { who: 'wanderer', text: "The road doesn't show it. Let me ask you instead.", pause: 1, music: 'memory' },
      ],
      ask: {
        kind: 'choice',
        id: 'heart4',
        prompt: 'What has changed in you that nobody can see yet?',
        choices: [
          { label: 'I keep promises to myself', value: 'I keep promises to myself.' },
          { label: 'I stopped waiting to feel ready', value: 'I stopped waiting to feel ready.' },
          { label: "I'm kinder to myself", value: "I'm kinder to myself." },
          {
            label: 'Nothing yet',
            value: '',
            after: [
              { who: 'wanderer', text: "Then it's hiding well. That's what it does out here." },
              { who: 'flame', mood: 'soft', text: "I'll leave the stones out. In case you want to count them later." },
            ],
          },
        ],
        write: 'Write your own',
        after: [
          { who: 'wanderer', text: 'Nobody can see that from the outside.', pause: 0.6 },
          { who: 'flame', mood: 'soft', text: "I'm keeping that one. I keep all the good ones." },
        ],
      },
    },
    {
      id: 'ch4-vela-letter',
      when: { workouts: 44, chapter: 4, answer: { id: 'vela', is: 'yes' } },
      place: 'lamp-road',
      lines: [
        { who: 'narrator', show: 'vela', text: 'Vela is writing again. A whole box of letters sits beside her. None of them has a stamp.' },
        { who: 'vela', text: 'Letters home. I never send them.' },
        { who: 'vela', text: 'Where I grew up there was a sentence for everything. "People like us don\'t." Don\'t what? Didn\'t matter. Don\'t.' },
        { who: 'vela', text: "I've heard it in my head my whole life. I used to argue with it. Never won once." },
        { who: 'you', text: 'I have a voice like that too.' },
        { who: 'vela', text: "Then you know. You can't argue it out of the house. You just keep a light on, and let it watch you walk past." },
        { who: 'narrator', show: 'vela', text: 'She crosses out a line, and writes a new one: "People like us do. Slowly."' },
        { who: 'vela', text: "Not sending it. Not yet. But it's written." },
      ],
    },
    {
      id: 'ch4-boring',
      when: { workouts: 45, chapter: 4 },
      lines: [
        { who: 'flame', mood: 'soft', text: 'Is it weird that training feels boring now?' },
        { who: 'flame', mood: 'happy', text: 'Boring in a good way. Like brushing your teeth, but with fire.' },
        { who: 'flame', mood: 'soft', text: "Before, every workout was a big decision. Now it's just... what we do on those days." },
        { who: 'wanderer', text: 'Have you noticed how you talk about it now?' },
        { who: 'wanderer', text: 'At the start you said "I\'m trying to get back into it." Lately you just say "I train."', pause: 0.8 },
        { who: 'you', text: '...Huh. I do.', pause: 1 },
      ],
    },
    {
      id: 'ch4-stone',
      when: { workouts: 47, chapter: 4 },
      place: 'lit-forges',
      lines: [
        { who: 'narrator', show: 'mira', text: 'Far behind you, back in the village, Mira is hammering a stone. Nothing seems to happen. She keeps going.' },
        { who: 'mira', text: 'Nobody remembers which hit broke the stone. The stone remembers every one.' },
        { who: 'narrator', show: 'kid', text: 'The kid from the armor is watching, chin in hands.' },
        { who: 'kid', text: "It hasn't cracked. Why don't you stop?" },
        { who: 'mira', text: "Because it has. Inside. You'll see." },
      ],
    },
    {
      id: 'ch4-tracks',
      when: { workouts: 48, chapter: 4 },
      lines: [
        { who: 'narrator', show: 'wanderer', text: 'Morning dust on the flat road. Two lines of footprints run side by side: yours, and the Wanderer\'s.' },
        { who: 'flame', mood: 'scared', text: 'Um. Are those the same size? Those are the same size.' },
        { who: 'wanderer', text: 'Lots of people have feet.' },
        { who: 'vela', text: "Funny. I've watched that hooded one cross this flat for years. Always coming down from the mountain. Never going up. Until you.", answer: { id: 'vela', is: 'yes' } },
        { who: 'wanderer', text: "Walk. The dust doesn't keep secrets long, and neither do I." },
      ],
    },
    {
      id: 'ch4-small-step',
      when: { workouts: 38, shortSession: true, inChapter: 4 },
      lines: [
        { who: 'plateau', text: '...Small.' },
        { who: 'you', text: 'Still a step.' },
        { who: 'narrator', show: 'plateau', text: 'Somewhere deep in the stone, too quiet for anyone but {flame} to hear, something goes tik.', shot: { zoom: 'in', seconds: 1.2 } },
        { who: 'flame', mood: 'happy', text: 'I heard that. Did you hear that? I HEARD that.' },
      ],
    },
    {
      id: 'ch4-rest',
      when: { restDay: true, inChapter: 4 },
      music: 'camp',
      lines: [
        { who: 'narrator', show: 'flame', text: 'A rest day on the flat road. {flame} lies in the dust and watches the clouds go nowhere.', shot: { pan: 'up', seconds: 2 } },
        { who: 'flame', mood: 'sleepy', text: 'People think nothing happens on rest days. Everything happens. Just quietly.' },
        { who: 'flame', mood: 'soft', text: 'Can I tell you something odd? Sometimes I remember things I shouldn\'t.' },
        { who: 'flame', mood: 'soft', text: 'Grass stains. Being called in when it got dark, and pretending not to hear.' },
        { who: 'flame', mood: 'sleepy', text: "I've never had knees. Why do I remember scraped knees?" },
      ],
    },
    {
      id: 'ch4-await-test',
      when: { awaitingTest: 4 },
      lines: [
        { who: 'narrator', show: 'plateau', text: 'The Plateau has no hearts left, and still it sits there, looking the same as ever.' },
        { who: 'wanderer', text: "The stone hides its cracks. Let's look anyway." },
        { who: 'wanderer', text: 'Take your max test on the Hero tab, fresh, after a warm-up. Not against anyone. Against the day you started this month.' },
      ],
    },
    {
      id: 'ch4-victory',
      when: { beaten: 4 },
      lines: [
        { who: 'plateau', text: '...Same. ...As...' },
        { who: 'narrator', text: 'The Plateau shatters, all at once. It had been breaking for weeks.', shot: { shake: 'big' } },
        { who: 'wanderer', text: 'It looked like nothing was happening. Everything was happening.' },
        { who: 'narrator', text: 'Behind you, the lamp on Vela\'s tower flashes twice. She saw.', answer: { id: 'vela', is: 'yes' } },
        { who: 'flame', mood: 'happy', text: 'Do you know who gets this far? Everyone who doesn\'t stop. That\'s the whole list.' },
        { who: 'narrator', text: 'Past the broken stone the road starts climbing again, into the trees. Into the fog.', shot: { pan: 'right', seconds: 2 } },
      ],
    },
  ],
};
