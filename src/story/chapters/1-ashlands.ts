import type { Chapter } from '../types';

/* Month 1. Lesson: today beats tomorrow. */

export const ASHLANDS: Chapter = {
  n: 1,
  name: 'The Ashlands',
  lesson: 'Today beats tomorrow',
  enemy: 'Tomorrow',
  enemySprite: 'slime',
  workouts: 12,
  tests: 0,
  place: 'ashlands',
  fog: {
    name: 'The Ashen Edge',
    boss: 'tomorrow',
    hint: 'Tomorrow heals while you keep your distance. Get close.',
    after: "It only grows while you wait. You didn't wait.",
    keepsake: { name: 'The Nightcap', text: "Tomorrow's sleepy hat. It never got to wear it again." },
    hp: 1,
    dmg: 1,
    ground: '#231d2e',
    fog: '#4a3f63',
  },
  scenes: [
    {
      id: 'first-quest',
      when: { workouts: 1 },
      lines: [
        { who: 'flame', text: 'You did it. One page written.' },
        { who: 'flame', text: "I feel... warmer? Is that weird? That's weird." },
        { who: 'hollow', text: "One session. I've watched you do one session before." },
        { who: 'flame', text: "Not with me, you haven't. Shush." },
        { who: 'wanderer', text: 'Two more this week. Not perfect. Present.' },
      ],
    },
    {
      id: 'flame-name',
      when: { workouts: 1 },
      lines: [
        { who: 'flame', mood: 'soft', text: 'Hey. Can I ask you something?' },
        { who: 'flame', mood: 'soft', text: "Nobody ever gave me a name. I've been a spark in the ash for so long." },
        { who: 'flame', mood: 'soft', text: 'Would you give me one?' },
      ],
      ask: {
        kind: 'name',
        prompt: 'Name your flame',
        placeholder: 'Ember',
        after: [
          { who: 'flame', mood: 'happy', text: "{flame}. ...{flame}. I like it. I'll try to deserve it." },
          { who: 'flame', text: "From now on, when I talk, that's my name up there. Look!" },
        ],
      },
    },
    {
      id: 'class-choice',
      when: { workouts: 3, noClass: true },
      lines: [
        { who: 'wanderer', text: 'Three pages. You kept your word.' },
        { who: 'wanderer', text: "I found these in the ash while you trained. They've been waiting longer than you have." },
        { who: 'narrator', show: 'wanderer', text: 'As the Wanderer hands them over, you see a scar on the back of their hand. The same as yours.' },
        { who: 'wanderer', text: "Choose the one that feels like you. You'll still train everything. This is who you fight as." },
      ],
      ask: { kind: 'class' },
    },
    {
      id: 'first-rest-day',
      when: { workouts: 1, restDay: true },
      place: 'ashlands-camp',
      music: 'camp',
      lines: [
        { who: 'flame', mood: 'happy', text: "Wait, we're not training today?" },
        { who: 'flame', mood: 'sleepy', text: '...Oh. Oh, this is nice.' },
        { who: 'wanderer', text: "Your strength doesn't grow while you train. It grows now, while you rest." },
        { who: 'wanderer', text: 'Workouts are fuel. Rest is air. A fire needs both.' },
        { who: 'flame', mood: 'sleepy', text: 'Mm. Air. Wake me if anything exciting happens.' },
      ],
    },
    {
      id: 'ch1-tomorrow-splits',
      when: { workouts: 5 },
      shots: [{ pan: 'down', seconds: 1.6 }],
      lines: [
        { who: 'narrator', show: 'tomorrow', text: 'Something sleepy rolls across the ash. A blob in a nightcap. It yawns, and splits in two.' },
        { who: 'tomorrow', text: 'Mmh... why today? Tomorrow is better. Tomorrow is always better.' },
        { who: 'wanderer', text: "Every time you say 'tomorrow', it makes another one. Every time you show up, there's one less." },
      ],
    },
    {
      id: 'perfect-week',
      when: { perfectWeek: true },
      lines: [{ who: 'flame', mood: 'happy', text: "Three for three! Look at me, I'm a real flame now." }],
    },
    {
      id: 'ch1-candle',
      when: { workouts: 6 },
      lines: [
        { who: 'narrator', show: 'flame', text: '{flame} stretches, and grows. A small flame now, with a face that shows everything it feels.', shot: { zoom: 'in', seconds: 1.4 } },
        { who: 'flame', mood: 'happy', text: 'Okay, a candle. A brave candle.' },
        { who: 'flame', text: 'In the Fog I can circle you twice now. Two flames. Watch.' },
      ],
    },
    {
      id: 'ch1-night-camp',
      when: { workouts: 8 },
      place: 'ashlands-camp',
      music: 'camp',
      shots: [{ pan: 'up' }, { pan: 'center', seconds: 2.2 }],
      lines: [
        { who: 'narrator', show: 'flame', text: 'Night. You sit by the fire. {flame} crackles beside you, quieter than usual.' },
        { who: 'flame', mood: 'soft', text: 'Can I ask why you stopped, last time?' },
        { who: 'flame', mood: 'soft', text: "You don't have to tell me. I just want to know what to watch out for." },
        { who: 'flame', mood: 'soft', text: 'You wrote that you started again because {why}.', needs: 'why' },
        { who: 'flame', mood: 'soft', text: 'Can I ask you something else? Something from before all of it?' },
      ],
      ask: {
        kind: 'choice',
        id: 'heart1',
        prompt: 'What did you love about moving, when you were small?',
        choices: [
          { label: 'Running around outside', value: 'running around outside' },
          { label: 'Playing with friends', value: 'playing with friends' },
          { label: 'Feeling strong', value: 'feeling strong' },
          {
            label: "I don't remember",
            value: '',
            after: [{ who: 'flame', mood: 'soft', text: "That's okay. Maybe I'll remember for both of us." }],
          },
        ],
        after: [
          { who: 'flame', mood: 'soft', text: '{heart1}...' },
          { who: 'flame', mood: 'happy', text: 'Funny. I feel like I remember that.' },
        ],
      },
    },
    {
      id: 'ch1-tomorrow-begs',
      when: { workouts: 10 },
      lines: [
        { who: 'tomorrow', text: 'Skip today. Tomorrow you can do double.' },
        { who: 'you', text: "No. Today I'll do enough." },
        { who: 'flame', text: 'Rest is planned. Skipping is just Tomorrow talking.' },
      ],
    },
    {
      id: 'ch1-victory',
      when: { beaten: 1 },
      lines: [
        { who: 'narrator', show: 'tomorrow', text: 'Tomorrow splits one last time, and fades into the ash.', shot: { shake: 'small' } },
        { who: 'wanderer', text: 'You know what Tomorrow hates? Today.' },
        { who: 'flame', mood: 'happy', text: "Month one. We're still here." },
      ],
    },
  ],
};
