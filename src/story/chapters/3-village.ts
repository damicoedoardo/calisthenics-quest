import type { Chapter } from '../types';

/* Month 3. Lesson: done beats perfect. The healing step: from self-attack to self-compassion. The
   Perfect Knight talks the way you talk to yourself on bad days; inside the armor is a scared kid.
   The heart moment asks what you'd tell yourself on day one: the kid carries it to the summit. */

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
    hp: 1.9,
    dmg: 1.4,
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
        { who: 'narrator', text: 'Every doorway has someone in it, coat half on, never quite going out.' },
        { who: 'mira', text: 'Another one. Let me guess: you used to be good.', shot: { pan: 'center' } },
        { who: 'mira', text: "Me too. Everyone here used to be good. That's what's wrong with the place." },
        { who: 'mira', text: "Bring me effort. I'll make it into steel. Not perfect effort. Any effort." },
      ],
    },
    {
      id: 'ch3-knight',
      when: { workouts: 26, chapter: 3 },
      lines: [
        { who: 'narrator', show: 'knight', text: 'A knight in flawless armor steps out of the village gate. Not one scratch on it.' },
        { who: 'knight', text: "Twenty minutes? Half a workout? Don't insult the forge.", shot: { enter: 'right' } },
        { who: 'knight', text: "If you can't do it properly, why do it at all?" },
        { who: 'flame', mood: 'smoky', text: "...He's very shiny. I don't like him." },
        { who: 'mira', text: "That one's kept more forges cold than any injury. Nobody ever lights a fire to his standard. So nobody lights one." },
      ],
    },
    {
      id: 'ch3-sol',
      when: { workouts: 28, chapter: 3 },
      lines: [
        { who: 'narrator', show: 'sol', text: 'A runner is asleep at her desk, a cold forge behind her. A pair of running shoes hangs on a nail, dusty.' },
        { who: 'sol', text: "...Mm? I'll train when this project ends. Then the next one." },
        { who: 'sol', text: "Everyone needs me. If I take an hour for myself, something falls over. So I don't." },
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
              { who: 'sol', text: "Is it morning? It's always almost morning." },
              { who: 'you', text: "Want to walk for ten minutes? That's all." },
              { who: 'sol', text: '...Ten minutes. Okay. Ten minutes I have.' },
              { who: 'narrator', show: 'sol', text: 'She takes the shoes off the nail and blows the dust off them. Her hands are not quite steady.', pause: 0.8 },
            ],
          },
          { label: 'Let her sleep', value: 'no', after: [{ who: 'flame', mood: 'soft', text: 'She does look tired. Rest is good too.' }] },
        ],
      },
    },
    {
      // The Knight is a mask of the Hollow: he speaks its line, the one the player picked.
      id: 'ch3-knight-voice',
      when: { workouts: 29, chapter: 3 },
      lines: [
        { who: 'knight', text: 'Sloppy. Slow. You call that a workout? Look how far you let yourself go.' },
        { who: 'knight', text: '{voice}', needs: 'voice', pace: 'slow' },
        { who: 'narrator', show: 'knight', text: "You flinch. It's the Hollow's line. In the Knight's polished voice it sounds almost reasonable.", pause: 1, music: 'none' },
        { who: 'narrator', text: "You know every word he says. You've said them all to yourself, in the bathroom mirror, before anyone was awake.", pause: 1.4, film: true },
        { who: 'mira', text: 'Tell me something. If my apprentice came in late and tired, and I talked to them like that. What would they do?', pause: 0.8, music: 'rise' },
        { who: 'you', text: '...Quit. They would quit.' },
        { who: 'mira', text: "So would anyone. So stop hiring him to coach you." },
      ],
    },
    {
      id: 'ch3-knight-cracks',
      when: { shortSession: true, inChapter: 3 },
      lines: [
        { who: 'narrator', show: 'knight', text: "A short session. When you finish, there's a crack in the Knight's perfect armor.", shot: { shake: 'small' } },
        { who: 'knight', text: "That wasn't proper." },
        { who: 'you', text: 'It was enough.' },
        { who: 'knight', text: "...It shouldn't have worked." },
        { who: 'flame', mood: 'happy', text: 'Enough is a real word. Put it on a shirt.' },
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
        { who: 'narrator', text: 'Someone in a doorway takes their coat off the hook. Just to hold it, for now.', pause: 0.8 },
      ],
    },
    {
      id: 'ch3-song',
      when: { workouts: 31, chapter: 3 },
      lines: [
        { who: 'narrator', show: 'wanderer', text: "While you train, the Wanderer hums. It takes you a moment. It's the song you hum when you're nervous." },
        { who: 'flame', mood: 'scared', text: 'How do they know your song?' },
        { who: 'wanderer', text: 'Everybody knows that song.' },
        { who: 'flame', mood: 'scared', text: "Nobody knows that song. It doesn't even have words. You made it up." },
        { who: 'wanderer', text: '...Keep training. You are doing well.' },
      ],
    },
    {
      id: 'ch3-mira-story',
      when: { workouts: 32 },
      music: 'memory',
      lines: [
        { who: 'mira', text: 'You want to know why my forge went cold? An injury. Then a long, slow way back.' },
        { who: 'mira', text: 'Every morning I stood at the cold forge and called myself names. Out loud. The apprentices heard all of it.' },
        { who: 'mira', text: 'Then one morning I was too tired to shout. So I just lit a fire. A small one.', pause: 1 },
        { who: 'mira', text: 'That was the first good day.', pace: 'slow', pause: 0.8 },
        { who: 'mira', text: 'I came back slower than I wanted.' },
        { who: 'mira', text: 'I came back.', pause: 1 },
      ],
    },
    {
      id: 'ch3-first-steel',
      when: { workouts: 33, chapter: 3 },
      place: 'lit-forges',
      lines: [
        { who: 'narrator', show: 'mira', text: 'Mira calls you to the forge. On the anvil lies a plain iron ring, a little lopsided.' },
        { who: 'mira', text: 'Made it from your effort. All of it. The good days and the short ones and the ones you nearly skipped.' },
        { who: 'you', text: "It's crooked." },
        { who: 'mira', text: "It's real. Crooked and real beats perfect and imaginary. Every time." },
        { who: 'narrator', show: 'mira', text: 'She pushes it onto your finger without asking. It fits.', pause: 0.8 },
        { who: 'flame', mood: 'soft', text: "...It's the nicest thing anyone's ever made out of us." },
      ],
    },
    {
      id: 'ch3-sol-rest',
      when: { workouts: 34, answer: { id: 'sol', is: 'yes' } },
      place: 'lit-forges',
      lines: [
        { who: 'narrator', show: 'sol', text: 'For a week, Sol runs before she opens her work. Then she rests, one whole day, on purpose. Her forge lights.' },
        { who: 'sol', text: 'Nothing fell over. Can you believe it? I took the time, and the world held on without me.' },
        { who: 'sol', text: "Rest isn't the prize for the work. It's part of the work." },
        { who: 'flame', mood: 'happy', text: "I've been SAYING that." },
      ],
    },
    {
      id: 'ch3-rest',
      when: { restDay: true, inChapter: 3 },
      place: 'cold-forges',
      music: 'camp',
      lines: [
        { who: 'narrator', show: 'flame', text: 'A rest day in the village. {flame} sits in a cold forge, warming it up for whoever comes next.' },
        { who: 'knight', text: 'Resting? Real warriors never rest.' },
        { who: 'flame', mood: 'sleepy', text: 'Real warriors are asleep right now. That is how they stay real warriors.' },
      ],
    },
    {
      id: 'ch3-last-stand',
      when: { workouts: 36, chapter: 3 },
      lines: [
        { who: 'narrator', show: 'knight', text: 'The Knight blocks the road out of the village. His armor is covered in hairline cracks now, one for every imperfect day you came anyway.' },
        { who: 'knight', text: "Look at your record. Missed days. Short days. Bad days. It's a mess. It's not good enough." },
        { who: 'you', text: "It's not perfect. It's mine. And it's more than I had when I got here." },
        { who: 'knight', text: 'That is not a standard.' },
        { who: 'you', text: "It's the only one that ever got me out of bed." },
        { who: 'flame', mood: 'happy', text: "Ooh. He's creaking. Keep going. One more page." },
      ],
    },
    {
      id: 'ch3-knight-kneels',
      when: { beaten: 3 },
      music: 'memory',
      lines: [
        { who: 'narrator', show: 'knight', text: 'The Knight drops to one knee. The armor opens with a sigh.', shot: { shake: 'small' } },
        { who: 'narrator', show: 'kid', text: 'Inside there is no knight. Just a tired kid, scared of failing in front of everyone.', pause: 1.2 },
        { who: 'kid', text: 'If I never tried, I could never be bad at it.', shot: { enter: 'below' }, pace: 'slow' },
        { who: 'kid', text: 'I just wanted to keep you safe. If you were perfect, nobody could laugh.' },
        { who: 'narrator', show: 'kid', text: "You kneel down so you're the same height. Up close, the kid is chewing a thumbnail. You used to do that.", pause: 1 },
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
          { label: "Be kind to yourself. You're coming back.", value: "Be kind to yourself. You're coming back." },
        ],
        write: 'Write your own',
        after: [
          { who: 'kid', text: "...I'll remember that.", pace: 'slow' },
          { who: 'kid', text: "Can I tell other people too? There are a lot of people here who need to hear it." },
          { who: 'narrator', show: 'kid', text: 'The armor stays on the ground, empty. The kid walks into the village, and one by one, the forges light.', shot: { place: 'lit-forges', seconds: 1.2 } },
        ],
      },
    },
  ],
};
