import type { Chapter } from '../types';

/* Month 4. Lesson: progress hides before it shows. The Plateau's own Fog fight, Old Vela and the
   month's heart moment come with the months 4 to 6 build; until then the Hollow guards this zone. */

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
    boss: 'hollow',
    hint: 'The Hollow walks out of the fog, speaking your own line.',
    after: 'It looked like nothing was happening. Everything was happening.',
    keepsake: { name: 'A Cracked Stone', text: 'It broke all at once. It had been breaking for weeks.' },
    hp: 4.5,
    dmg: 1.8,
    ground: '#1c1712',
    fog: '#4a3a26',
  },
  scenes: [
    {
      id: 'ch4-intro',
      when: { chapter: 4 },
      shots: [{ title: 'Chapter 4: The Plateau', seconds: 2.4 }],
      lines: [
        { who: 'narrator', text: 'The road stops climbing. Same rocks, same sky, for days. A stone giant sits across the road, so still it looks like part of the land.' },
        { who: 'hollow', text: "See? Nothing's changing." },
        { who: 'flame', mood: 'soft', text: "Something is. I can feel it, I just can't see it yet." },
      ],
    },
    {
      id: 'ch4-wake',
      when: { workouts: 40 },
      lines: [
        { who: 'narrator', text: 'The Plateau wakes, slowly. It looks at you as if you were weather.', shot: { shake: 'small' } },
        { who: 'wanderer', text: "Don't look for change every day. Look every month." },
      ],
    },
    {
      id: 'ch4-boring',
      when: { workouts: 45 },
      lines: [
        { who: 'flame', mood: 'soft', text: 'Is it weird that training feels boring now?' },
        { who: 'flame', mood: 'happy', text: 'Boring in a good way. Like brushing your teeth, but with fire.' },
      ],
    },
    {
      id: 'ch4-stone',
      when: { workouts: 47 },
      place: 'lit-forges',
      lines: [
        { who: 'narrator', text: 'Mira is hammering a stone at the forge. Nothing seems to happen. She keeps going.' },
        { who: 'mira', text: 'Nobody remembers which hit broke the stone. The stone remembers every one.' },
      ],
    },
    {
      id: 'ch4-await-test',
      when: { awaitingTest: 4 },
      lines: [
        { who: 'wanderer', text: "The stone hides its cracks. Let's look anyway." },
        { who: 'wanderer', text: 'Take your max test on the Hero tab, fresh, after a warm-up.' },
      ],
    },
    {
      id: 'ch4-victory',
      when: { beaten: 4 },
      lines: [
        { who: 'narrator', text: 'The Plateau shatters, all at once.', shot: { shake: 'big' } },
        { who: 'flame', mood: 'happy', text: 'Fifty. Do you know how many people get to fifty? Everyone who doesn\'t stop.' },
        { who: 'flame', mood: 'scared', text: '...Wait. Are those wings?' },
        { who: 'narrator', text: '{flame} grows wings of flame, and flies a slow circle around your head.', shot: { zoom: 'in', seconds: 1.4 } },
      ],
    },
  ],
};
