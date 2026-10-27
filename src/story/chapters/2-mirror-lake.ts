import type { Chapter } from '../types';

/* Month 2. Lesson: compare yourself to last month, not to who you were. The healing step: grief for
   the lost time and the shame of the gap, met with kindness instead of attack. The Echo is who you
   were; the heart moment asks what you lost when you stopped, and the lake lets you miss it. */

export const MIRROR_LAKE: Chapter = {
  n: 2,
  name: 'Mirror Lake',
  lesson: 'Compare yourself to last month, not to who you were',
  enemy: 'The Mirror',
  enemySprite: 'mirror',
  workouts: 12,
  place: 'mirror-lake',
  fog: {
    name: 'Mirror Lake',
    boss: 'mirror',
    hint: 'Hitting your reflections hurts you. Walk past them. When the lake shows many Mirrors, only the real one shoots.',
    after: "Every time you fight who you were, you're the one who gets hurt. Walk past.",
    keepsake: { name: 'A Shard of the Mirror', text: 'It only shows week one. Look how far that is.' },
    hp: 1.74,
    dmg: 2.53,
    ground: '#101826',
    fog: '#253a5c',
    // stages: [the Mirror splits into images of itself]
    lines: {
      enter: 'Look at you. I never got tired.',
      stages: ['Which one is me? Which one was you?'],
      end: "...You're further than week one.",
      taunts: ['You used to be faster.', 'Remember how easy it was?', 'Look how much you lost.', 'I never needed a warm-up.'],
    },
  },
  scenes: [
    {
      id: 'ch2-intro',
      when: { chapter: 2 },
      shots: [{ title: 'Chapter 2: Mirror Lake', seconds: 2.4 }],
      lines: [
        { who: 'narrator', show: 'echo', text: 'The road reaches a still lake. A golden figure stands on the water. Your face, from the days you never missed.' },
        { who: 'echo', text: 'Look at you. Out of breath already? I never missed a day.', shot: { enter: 'right' } },
        { who: 'narrator', text: 'Something in your chest drops. You know that face. You used to be that face.', pause: 1, film: true },
        { who: 'wanderer', text: "That's not you. That's a photograph. Photographs don't train." },
        { who: 'flame', mood: 'scared', text: "He's very shiny. Are we supposed to fight him? I don't want to fight him. He looks like you." },
      ],
    },
    {
      id: 'ch2-reflection',
      when: { workouts: 14, chapter: 2 },
      music: 'memory',
      shots: [{ pan: 'down', seconds: 1.8 }],
      lines: [
        { who: 'narrator', text: 'You kneel to drink, and stop. In the water, your reflection. The real one. Tired around the eyes.' },
        { who: 'narrator', show: 'echo', text: 'Below it, far down, the Echo. Golden. Easy. As if none of the hard years happened.' },
        { who: 'hollow', text: 'Look at the gap. Look how far you fell.' },
        { who: 'narrator', text: 'You put your hand in the water, and both faces break into ripples.', pause: 1.2, film: true },
        { who: 'flame', mood: 'soft', text: "Hey. Look at me instead. I'm warmer than a lake." },
        { who: 'wanderer', text: "The gap isn't a debt, you know. Nobody is coming to collect it." },
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
        { who: 'echo', text: '...What does that have to do with anything?' },
        { who: 'wanderer', text: 'You had time, and nothing to carry. They have both hands full, and they still came. Which of you is stronger?' },
        { who: 'narrator', show: 'echo', text: 'The Echo opens its mouth, and for once nothing comes out.', pause: 0.8 },
      ],
    },
    {
      id: 'ch2-wanderer-knows',
      when: { workouts: 17, needs: 'want' },
      lines: [
        { who: 'wanderer', text: '"One day I want to be able to {want}."' },
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
        { who: 'lia', text: "I used to be the best in the room. Now I can't even look." },
        { who: 'lia', text: 'Every time I think about going back, I picture everyone remembering how I used to be. So I stay here.' },
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
              { who: 'lia', text: "...Thanks. Nobody sits with me any more. They all ask when I'm coming back." },
              { who: 'you', text: "I'm not asking. I'm just sitting." },
              { who: 'narrator', show: 'lia', text: "For a long time neither of you says anything. The lake doesn't either. It's the kindest thing it's done all month.", pause: 1.2 },
            ],
          },
          { label: 'Walk on', value: 'no', after: [{ who: 'flame', mood: 'soft', text: "That's okay. Not every story is ours to carry. We have our own." }] },
        ],
      },
    },
    {
      id: 'ch2-heart',
      when: { workouts: 19 },
      music: 'memory',
      lines: [
        { who: 'narrator', show: 'echo', text: 'For once, the Echo is quiet. It sits on the water with its knees up.' },
        { who: 'echo', text: "I'm not trying to be cruel, you know. I just don't know how to be anything else. I'm all that's left of how it used to be." },
        { who: 'echo', text: 'Can I ask you something?', pause: 1 },
      ],
      ask: {
        kind: 'choice',
        id: 'heart2',
        prompt: 'What did you lose, when you stopped?',
        choices: [
          { label: 'My confidence', value: 'your confidence' },
          { label: 'Trust in myself', value: 'your trust in yourself' },
          { label: 'The fun of it', value: 'the fun of it' },
          { label: 'People', value: 'the people' },
          { label: "I don't know", value: '' },
        ],
        after: [
          { who: 'echo', text: "...I lost it too. I'm what was left of it.", pace: 'slow' },
          { who: 'echo', text: "Maybe that's why I'm so loud." },
        ],
      },
    },
    {
      id: 'ch2-mira-lia',
      when: { workouts: 20, answer: { id: 'lia', is: 'yes' } },
      lines: [
        { who: 'narrator', show: 'mira', text: "A smith with a hammer on her back passes by. She kneels and fixes Lia's broken shoe without a word." },
        { who: 'mira', text: "Armor doesn't care how it looks on you. It cares that you showed up in it." },
        { who: 'lia', text: "Everyone's going to see how much I lost." },
        { who: 'mira', text: "Some will. Most are too busy worrying about their own. The ones who matter will just be glad you're back." },
        { who: 'lia', text: "...I think I'll dance tomorrow. No. Today." },
        { who: 'flame', mood: 'happy', text: 'Did you hear that? TODAY.' },
      ],
    },
    {
      id: 'ch2-friend',
      when: { workouts: 21, chapter: 2 },
      place: 'lake-camp',
      music: 'camp',
      lines: [
        { who: 'narrator', show: 'wanderer', text: 'At the fire, the Wanderer pokes the coals and asks you something odd.' },
        { who: 'wanderer', text: 'Picture an old friend. Someone you love. They stopped for a long time, and today they came back. Out of breath. Embarrassed.' },
        { who: 'wanderer', text: 'What would you say to them?' },
        { who: 'you', text: "...That I'm glad they're here. That it doesn't matter how long it's been." },
        { who: 'wanderer', text: 'Say it again, then. Slower. And this time, to yourself.', pause: 1 },
        { who: 'narrator', text: "You do. Out loud, it sounds strange. Your voice wobbles on the second half.", pause: 1.4, film: true, music: 'none' },
        { who: 'narrator', text: "The fire doesn't laugh. Neither does anyone else.", pause: 1, film: true },
        { who: 'flame', mood: 'soft', text: "I'm pretending I'm not listening. ...I'm listening a little.", music: 'camp' },
      ],
    },
    {
      id: 'ch2-lake-rest',
      when: { restDay: true, inChapter: 2 },
      music: 'camp',
      lines: [
        { who: 'narrator', show: 'flame', text: 'A rest day. You sit by the lake with {flame}. Slowly, the water goes still.', shot: { pan: 'down', seconds: 2 } },
        { who: 'flame', mood: 'sleepy', text: "The lake only shows you clearly when it's calm. Funny, right?" },
        { who: 'flame', mood: 'sleepy', text: 'Same with people, I think.' },
        { who: 'narrator', show: 'flame', text: '{flame} drifts out onto the water and floats there like a tiny lantern, doing nothing at all, very seriously.' },
      ],
    },
    {
      // Lia's arc, the turn: she dances badly, laughs, and hands you the kindness back.
      id: 'ch2-lia-dance',
      when: { workouts: 22, answer: { id: 'lia', is: 'yes' } },
      lines: [
        { who: 'narrator', show: 'lia-after', text: 'Lia is dancing at the edge of the lake. It is not good. She wobbles on a turn, stops, and starts again from the middle.' },
        { who: 'lia-after', text: "Don't clap. I mean it. I'm terrible." },
        { who: 'you', text: "You're moving." },
        { who: 'lia-after', text: 'I keep looking for her. The girl who was good at this. Every turn, I check if she is watching.', pause: 1 },
        { who: 'lia-after', text: "She isn't. It's only me out here. And I'm... having fun? Badly. But fun." },
        { who: 'narrator', text: "She laughs at herself. Not the mean kind. The kind you'd give a friend who tripped.", pause: 1.2, film: true },
        { who: 'lia-after', text: 'Your turn. Come here.' },
        { who: 'narrator', show: 'lia-after', text: 'She pulls you down to the water. Your reflection looks back: tired, a bit rumpled, still here.', shot: { pan: 'down', seconds: 1.6 } },
        { who: 'lia-after', text: "Say one kind thing to them. I'll go first.", pause: 0.8 },
        { who: 'lia-after', text: 'That one kept showing up. Even on the bad days. I saw.', pace: 'slow' },
        { who: 'you', text: "...They're trying.", pause: 1.2 },
        { who: 'lia-after', text: 'See? Not so hard. Now you have to say it again tomorrow.' },
        { who: 'flame', mood: 'happy', text: "I'll remind you. I'm extremely good at reminding." },
      ],
    },
    {
      // The grief scene: the hardest moment of the month, given room.
      id: 'ch2-grief',
      when: { workouts: 23, chapter: 2 },
      music: 'memory',
      shots: [{ fade: 'in', seconds: 2 }],
      lines: [
        { who: 'narrator', show: 'echo', text: 'Dawn on the lake. The Echo stands on the water, smaller than before. No grin today.' },
        { who: 'echo', text: 'Do you miss me?', pace: 'slow' },
        { who: 'you', text: '...Every day.', pause: 1.6 },
        { who: 'echo', text: 'Then why do you keep walking away from me?' },
        { who: 'you', text: "Because I can't be you again. I can only be me. Now." },
        { who: 'narrator', text: "Saying it out loud costs something. You didn't know it would.", pause: 1.4, film: true, music: 'none' },
        { who: 'echo', text: 'You lost {heart2}. I watched it go.', needs: 'heart2', pause: 1 },
        { who: 'you', text: 'I miss it. I miss you.', pace: 'slow', pause: 1 },
        { who: 'narrator', text: 'You sit down on the shore. Nobody tells you to get up.', pause: 1.8, film: true },
        { who: 'narrator', show: 'flame', text: '{flame} settles against your knee and stays there. It says nothing, which for {flame} is a very big thing to do.', pause: 1.2, music: 'memory' },
        { who: 'echo', text: "...For what it's worth. I was only ever the best photos. You're the whole film.", pause: 1 },
      ],
    },
    {
      id: 'ch2-victory',
      when: { beaten: 2 },
      lines: [
        { who: 'narrator', show: 'mirror', text: 'The Mirror cracks. In one piece you see yourself in week one: red in the face, nearly turning back. In another, today.', shot: { shake: 'big' } },
        { who: 'narrator', text: "You look at week one for a long time. You expected to be embarrassed. You aren't. You just want to tell them it's going to be okay.", pause: 1.2, film: true, music: 'none' },
        { who: 'you', text: 'You did fine. You did so fine.', pace: 'slow', pause: 1 },
        { who: 'echo', text: "...You're further than week one. I hate that I'm glad about it.", music: 'rise' },
        { who: 'flame', mood: 'happy', text: 'Can we keep a piece? The week one piece. For the shelf. We need a shelf.' },
      ],
    },

  ],
};
