import type { Chapter } from '../types';

/* Month 2. Lesson: compare yourself to last month, not to who you were. */

export const MIRROR_LAKE: Chapter = {
  n: 2,
  name: 'Mirror Lake',
  lesson: 'Compare yourself to last month, not to who you were',
  enemy: 'The Mirror',
  enemySprite: 'mirror',
  workouts: 12,
  tests: 1,
  place: 'mirror-lake',
  fog: {
    name: 'Mirror Lake',
    boss: 'mirror',
    hint: 'Hitting your reflections hurts you. Walk past them to the Mirror.',
    after: "Every time you fight who you were, you're the one who gets hurt. Walk past.",
    keepsake: { name: 'A Shard of the Mirror', text: 'It only shows week one. Look how far that is.' },
    hp: 1.8,
    dmg: 1.25,
    ground: '#101826',
    fog: '#253a5c',
  },
  scenes: [
    {
      id: 'ch2-intro',
      when: { chapter: 2 },
      shots: [{ title: 'Chapter 2: Mirror Lake', seconds: 2.4 }],
      lines: [
        { who: 'narrator', show: 'echo', text: 'The road reaches a still lake. A golden figure stands on the water. Your face, from the days you never missed.' },
        { who: 'echo', text: 'Look at you. Out of breath already? I never missed a day.', shot: { enter: 'right' } },
        { who: 'wanderer', text: "That's not you. That's a photograph. Photographs don't train." },
      ],
    },
    {
      id: 'ch2-torch',
      when: { workouts: 15 },
      lines: [
        { who: 'narrator', show: 'flame', text: '{flame} rises up tall, and two tiny arms pop out of the fire.', shot: { zoom: 'in', seconds: 1.4 } },
        { who: 'flame', mood: 'happy', text: 'I can light the whole path now. Look how far back it goes.' },
        { who: 'flame', text: "And I've got arms! Tiny ones. I'll hold your rest timer from now on." },
      ],
    },
    {
      id: 'ch2-echo-counts',
      when: { workouts: 16 },
      lines: [
        { who: 'echo', text: 'I never needed a warm-up. I never got tired. I never had to start over.' },
        { who: 'wanderer', text: 'You also never had the life you have now.' },
      ],
    },
    {
      id: 'ch2-wanderer-knows',
      when: { workouts: 17, needs: 'want' },
      lines: [
        { who: 'wanderer', text: 'You want to {want}.' },
        { who: 'you', text: '...I never told you that.' },
        { who: 'wanderer', text: "Didn't you? ...Don't ask how I know." },
        { who: 'flame', mood: 'scared', text: "Okay, that's a little spooky." },
      ],
    },
    {
      id: 'ch2-lia',
      when: { workouts: 18 },
      lines: [
        { who: 'narrator', show: 'lia', text: 'A dancer sits at the edge of the lake, staring at her reflection. She has been there a long time.' },
        { who: 'lia', text: 'I used to be the best in the room. Now I can\'t even look.' },
        { who: 'flame', mood: 'soft', text: 'Should we sit with her for a bit?' },
      ],
      ask: {
        kind: 'choice',
        id: 'lia',
        prompt: 'Lia is staring at the water.',
        choices: [
          {
            label: 'Sit with her',
            value: 'yes',
            after: [
              { who: 'lia', text: '...Thanks. Nobody sits with me any more. They all ask when I\'m coming back.' },
              { who: 'you', text: "I'm not asking. I'm just sitting." },
            ],
          },
          { label: 'Walk on', value: 'no', after: [{ who: 'flame', mood: 'soft', text: "That's okay. Not every story is ours to carry." }] },
        ],
      },
    },
    {
      id: 'ch2-heart',
      when: { workouts: 19 },
      music: 'memory',
      lines: [
        { who: 'narrator', show: 'echo', text: 'For once, the Echo is quiet. It sits on the water with its knees up.' },
        { who: 'echo', text: 'Can I ask you something?' },
      ],
      ask: {
        kind: 'choice',
        id: 'heart2',
        prompt: 'What did you lose, when you stopped?',
        choices: [
          { label: 'My confidence', value: 'your confidence' },
          { label: 'My routine', value: 'your routine' },
          { label: 'People', value: 'the people' },
          { label: "I don't know", value: '' },
        ],
        after: [
          { who: 'echo', text: "...I lost it too. I'm what was left of it." },
          { who: 'echo', text: "Maybe that's why I'm so loud." },
        ],
      },
    },
    {
      id: 'ch2-mira-lia',
      when: { workouts: 20, answer: { id: 'lia', is: 'yes' } },
      lines: [
        { who: 'narrator', show: 'mira', text: 'A smith with a hammer on her back passes by. She kneels and fixes Lia\'s broken shoe without a word.' },
        { who: 'mira', text: 'Armor doesn\'t care how it looks on you. It cares that you showed up in it.' },
        { who: 'lia', text: "...I think I'll dance tomorrow. No. Today." },
        { who: 'flame', mood: 'happy', text: 'Did you hear that? TODAY.' },
      ],
    },
    {
      id: 'ch2-lake-rest',
      when: { restDay: true, inChapter: 2 },
      music: 'camp',
      lines: [
        { who: 'narrator', show: 'flame', text: 'A rest day. You sit by the lake with {flame}. Slowly, the water goes still.', shot: { pan: 'down', seconds: 2 } },
        { who: 'flame', mood: 'sleepy', text: 'The lake only shows you clearly when it\'s calm. Funny, right?' },
        { who: 'flame', mood: 'sleepy', text: 'Same with people, I think.' },
      ],
    },
    {
      id: 'ch2-await-test',
      when: { awaitingTest: 2 },
      lines: [
        { who: 'wanderer', text: 'The Mirror only shows what you lost. Let\'s show it what you have.' },
        { who: 'wanderer', text: 'Take your max test on the Hero tab. Fresh, after a warm-up. We compare you to week one. Not to the Echo.' },
      ],
    },
    {
      id: 'ch2-victory',
      when: { beaten: 2 },
      lines: [
        { who: 'narrator', text: 'The Mirror cracks. In the pieces you see your week one, and today.', shot: { shake: 'big' } },
        { who: 'wanderer', text: "That's the only comparison that counts. You, last month. Not the Echo." },
      ],
    },
  ],
};
