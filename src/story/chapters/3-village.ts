import type { Chapter } from '../types';

/* Month 3. Lesson: done beats perfect. */

export const VILLAGE: Chapter = {
  n: 3,
  name: 'The Village of Almosts',
  lesson: 'Done beats perfect',
  enemy: 'The Perfect Knight',
  enemySprite: 'knight',
  workouts: 13,
  tests: 1,
  place: 'cold-forges',
  fog: {
    name: 'The Cold Forges',
    boss: 'knight',
    hint: 'Every hit breaks one plate, however small. Keep hitting, even when he shouts.',
    after: 'He counted how strong each hit was. The fight only counted how many.',
    keepsake: { name: "The Knight's Visor", text: 'Polished, perfect, and empty. You never needed it.' },
    hp: 3,
    dmg: 1.5,
    ground: '#1c1916',
    fog: '#4b4038',
  },
  scenes: [
    {
      id: 'ch3-intro',
      when: { chapter: 3 },
      shots: [{ title: 'Chapter 3: The Village of Almosts', seconds: 2.4 }, { pan: 'right', seconds: 2 }],
      lines: [
        { who: 'narrator', text: 'A village where the forges went cold. Full of people who stopped, like you did.' },
        { who: 'mira', text: 'Another one. Let me guess: you used to be good.', shot: { pan: 'center' } },
        { who: 'mira', text: "Me too. Bring me effort. I'll make it into steel." },
      ],
    },
    {
      id: 'ch3-knight',
      when: { workouts: 26 },
      lines: [
        { who: 'narrator', show: 'knight', text: 'A knight in flawless armor steps out of the village gate. Not one scratch on it.' },
        { who: 'knight', text: 'Twenty minutes? Half a workout? Don\'t insult the forge.', shot: { enter: 'right' } },
        { who: 'knight', text: "If you can't do it properly, why do it at all?" },
        { who: 'flame', mood: 'smoky', text: "...He's very shiny. I don't like him." },
      ],
    },
    {
      id: 'ch3-song',
      when: { workouts: 27 },
      lines: [
        { who: 'narrator', show: 'wanderer', text: 'While you train, the Wanderer hums. It takes you a moment. It\'s the song you hum when you\'re nervous.' },
        { who: 'flame', mood: 'scared', text: 'How do they know your song?' },
        { who: 'wanderer', text: 'Everybody knows that song.' },
      ],
    },
    {
      id: 'ch3-sol',
      when: { workouts: 28 },
      lines: [
        { who: 'narrator', show: 'sol', text: 'A runner is asleep at her desk, a cold forge behind her. A pair of running shoes hangs on a nail, dusty.' },
        { who: 'sol', text: "...Mm? I'll train when this project ends. Then the next one." },
        { who: 'flame', text: "That's what Tomorrow used to say." },
      ],
      ask: {
        kind: 'choice',
        id: 'sol',
        prompt: 'Sol is falling asleep again.',
        choices: [
          {
            label: 'Wake her gently',
            value: 'yes',
            after: [
              { who: 'sol', text: 'Is it morning? It\'s always almost morning.' },
              { who: 'you', text: 'Want to walk for ten minutes? That\'s all.' },
              { who: 'sol', text: '...Ten minutes. Okay. Ten minutes I have.' },
            ],
          },
          { label: 'Let her sleep', value: 'no', after: [{ who: 'flame', mood: 'soft', text: 'She does look tired. Rest is good too.' }] },
        ],
      },
    },
    {
      id: 'ch3-knight-cracks',
      when: { shortSession: true, inChapter: 3 },
      lines: [
        { who: 'narrator', show: 'knight', text: 'A short session. When you finish, there\'s a crack in the Knight\'s perfect armor.', shot: { shake: 'small' } },
        { who: 'knight', text: "That wasn't proper." },
        { who: 'you', text: 'It was enough.' },
        { who: 'knight', text: "...It shouldn't have worked." },
      ],
    },
    {
      id: 'ch3-bonfire',
      when: { workouts: 30 },
      place: 'lit-forges',
      lines: [
        { who: 'narrator', show: 'flame', text: '{flame} roars up into a bonfire. All over the village, doors open and people come out to look.', shot: { zoom: 'in', seconds: 1.6 } },
        { who: 'flame', mood: 'happy', text: "I'm not a candle any more. Tell everyone." },
        { who: 'flame', text: "In the Fog I can throw fire now. Stand back. Or don't, I'll aim." },
      ],
    },
    {
      id: 'ch3-mira-story',
      when: { workouts: 32 },
      lines: [
        { who: 'mira', text: 'You want to know why my forge went cold? An injury. Then a long, slow way back.' },
        { who: 'mira', text: 'I came back slower than I wanted.' },
        { who: 'mira', text: 'I came back.' },
      ],
    },
    {
      id: 'ch3-sol-rest',
      when: { workouts: 34, answer: { id: 'sol', is: 'yes' } },
      place: 'lit-forges',
      lines: [
        { who: 'narrator', show: 'sol', text: 'Three mornings in a row, Sol runs before she opens her work. On the fourth day she rests, all day. Her forge lights.' },
        { who: 'sol', text: "Rest isn't the prize for the work. It's part of the work." },
        { who: 'flame', mood: 'happy', text: "I've been SAYING that." },
      ],
    },
    {
      id: 'ch3-knight-kneels',
      when: { beaten: 3 },
      music: 'memory',
      lines: [
        { who: 'narrator', show: 'knight', text: 'The Knight drops to one knee. The armor opens with a sigh.', shot: { shake: 'small' } },
        { who: 'narrator', show: 'kid', text: 'Inside there is no knight. Just a tired kid, scared of failing in front of everyone.' },
        { who: 'kid', text: 'If I never tried, I could never be bad at it.', shot: { enter: 'below' } },
        { who: 'you', text: 'I was bad at it for weeks. Look where it got me.' },
        { who: 'kid', text: 'Can I ask you something?' },
      ],
      ask: {
        kind: 'choice',
        id: 'heart3',
        prompt: 'What would you tell yourself, on day one?',
        choices: [
          { label: 'Start small. Small still counts.', value: 'Start small. Small still counts.' },
          { label: "You'll be bad at it. Do it anyway.", value: "You'll be bad at it. Do it anyway." },
          { label: "Don't wait to feel ready.", value: "Don't wait to feel ready." },
        ],
        write: 'Write your own',
        after: [
          { who: 'kid', text: "...I'll remember that." },
          { who: 'narrator', show: 'kid', text: 'The armor stays on the ground, empty. The kid walks into the village, and one by one, the forges light.', shot: { place: 'lit-forges', seconds: 1.2 } },
        ],
      },
    },
  ],
};
