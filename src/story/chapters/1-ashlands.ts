import type { Chapter } from '../types';

/* Month 1. Lesson: today beats tomorrow. The healing step: small proof that you can trust yourself
   again. Every workout is a promise kept, and Tomorrow is the voice that asks you to break it.
   The heart moment asks what you loved about moving when you were small; the flame remembers. */

export const ASHLANDS: Chapter = {
  n: 1,
  name: 'The Ashlands',
  lesson: 'Today beats tomorrow',
  enemy: 'Tomorrow',
  enemySprite: 'slime',
  workouts: 12,
  place: 'ashlands',
  fog: {
    name: 'The Ashen Edge',
    boss: 'tomorrow',
    hint: 'Tomorrow heals while you keep your distance. Get close.',
    after: "It only grows while you wait. You didn't wait.",
    firstTry: 'Tomorrow is stronger than it looks. Try anyway: losing here costs nothing.',
    keepsake: { name: 'The Nightcap', text: "Tomorrow's sleepy hat. It never got to wear it again." },
    hp: 1.2,
    dmg: 1.2,
    ground: '#231d2e',
    fog: '#4a3f63',
    // stages: [Tomorrow splits]
    lines: {
      enter: "Mmh... why now? Tomorrow's better.",
      stages: ['Two of me. Twice the tomorrows.'],
      end: 'Mmh... fine. Today, then.',
      taunts: ['Start fresh on Monday.', "You're tired. Go tomorrow.", "Why rush? There's always later.", "Tomorrow you'll feel ready."],
    },
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
        { who: 'flame', mood: 'soft', text: 'Your hands are shaking.', pause: 1 },
        { who: 'you', text: '...Yeah.' },
        { who: 'flame', mood: 'happy', text: "Mine too. Well. I don't have hands. But I'm shaking." },
        { who: 'wanderer', text: 'Again this week. Not perfect. Present.' },
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
        { who: 'wanderer', text: 'A few pages now. You kept your word.' },
        { who: 'wanderer', text: "I found these in the ash while you trained. They've been waiting longer than you have." },
        { who: 'narrator', show: 'wanderer', text: 'As the Wanderer hands them over, you see a scar on the back of their hand. The same as yours.' },
        { who: 'wanderer', text: "Choose the one that feels like you. You'll still train everything. This is who you fight as." },
      ],
      ask: { kind: 'class' },
    },
    {
      // The first kept promise. The stone {flame} gives here comes back at the end of the month,
      // on the last night of the climb, and in the finale.
      id: 'ch1-kept',
      when: { workouts: 2, chapter: 1 },
      place: 'ashlands-camp',
      music: 'camp',
      shots: [{ fade: 'in', seconds: 1.6 }],
      lines: [
        { who: 'narrator', show: 'flame', text: 'Evening. You sit down by the fire before you have even caught your breath.' },
        { who: 'flame', mood: 'soft', text: 'You came back.' },
        { who: 'you', text: 'I said I would.' },
        { who: 'flame', mood: 'soft', text: 'When was the last time you did a thing you said you would?', pace: 'slow' },
        { who: 'flame', mood: 'soft', text: 'Not for work. Not for anyone. Just for you.', pause: 0.8 },
        { who: 'narrator', text: 'You open your mouth to answer. Nothing comes.', pause: 1.6, film: true, music: 'none' },
        { who: 'narrator', text: 'The fire pops.', pause: 1.2, film: true },
        { who: 'narrator', show: 'flame', text: '{flame} rolls a small stone out of the embers and nudges it over to you. It is still warm.', pause: 0.8, music: 'camp' },
        { who: 'flame', mood: 'soft', text: "That's one." },
        { who: 'wanderer', text: "Keep it. You'll want to count them, later." },
      ],
    },
    {
      id: 'first-rest-day',
      when: { workouts: 1, restDay: true },
      place: 'ashlands-camp',
      music: 'camp',
      lines: [
        { who: 'flame', mood: 'happy', text: "Wait, we're not training today?" },
        { who: 'flame', mood: 'sleepy', text: '...Oh. Oh, this is nice.' },
        { who: 'hollow', text: 'Resting already? That was quick.' },
        { who: 'narrator', text: "There it is, the old itch. A day off feels like a bill you'll have to pay later, with interest.", pause: 1, film: true },
        { who: 'wanderer', text: "Nobody keeps that kind of book here. Sit down.", pause: 0.8 },
        { who: 'narrator', show: 'flame', text: '{flame} gets the fire just right, then flops down beside it as if it did all the training.' },
        { who: 'flame', mood: 'sleepy', text: "Your legs are mending. I can hear them. They're very busy in there." },
        { who: 'flame', mood: 'sleepy', text: 'Wake me if anything exciting happens. Please let nothing exciting happen.' },
      ],
    },

    {
      id: 'ch1-tomorrow-splits',
      when: { workouts: 5 },
      shots: [{ pan: 'down', seconds: 1.6 }],
      lines: [
        { who: 'narrator', show: 'tomorrow', text: 'Something sleepy rolls across the ash. A blob in a nightcap. It yawns, and splits in two.' },
        { who: 'tomorrow', text: 'Mmh... why today? Tomorrow is better. Tomorrow is always better.' },
        { who: 'tomorrow', text: "Tomorrow you'll have more time. More energy. You'll be a whole new person. Why waste today on the old one?" },
        { who: 'flame', mood: 'smoky', text: "It's so soft. Why is it so soft? I want to nap on it. That's the problem, isn't it." },
        { who: 'wanderer', text: "Every time you say 'tomorrow', it makes another one. Every time you show up, there's one less." },
      ],
    },
    {
      id: 'perfect-week',
      when: { perfectWeek: true },
      lines: [
        { who: 'flame', mood: 'happy', text: "A whole week! Every day you said. Look at me, I'm a real flame now." },
        { who: 'flame', mood: 'happy', text: "Quick, tell me something you're going to do. Anything. I'll believe it." },
      ],
    },
    {
      id: 'ch1-candle',
      when: { workouts: 6 },
      lines: [
        { who: 'narrator', show: 'flame', text: '{flame} stretches, and grows. A small flame now, with a face that shows everything it feels.', shot: { zoom: 'in', seconds: 1.4 } },
        { who: 'flame', mood: 'happy', text: 'Okay, a candle. A brave candle.' },
        { who: 'flame', text: 'In the Fog I can circle you twice now. Two flames. Watch.' },
        { who: 'flame', mood: 'soft', text: "I didn't grow because you were amazing, by the way. I grew because you were there. That's all it takes with me." },
      ],
    },
    {
      id: 'ch1-small-day',
      when: { workouts: 4, shortSession: true, inChapter: 1 },
      lines: [
        { who: 'flame', mood: 'soft', text: 'A rough day, and you came anyway.' },
        { who: 'hollow', text: "That barely counts. Who do you think you're fooling?" },
        { who: 'flame', mood: 'smoky', text: "It counted to me. And I'm the one keeping score. Ask anyone." },
        { who: 'narrator', show: 'flame', text: '{flame} adds a stone to your little pile by the fire. A small one. It goes in the line with the others.' },
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
        { who: 'narrator', show: 'flame', text: "You don't answer. {flame} doesn't push. The quiet is the comfortable kind.", pause: 1.4 },
        { who: 'flame', mood: 'soft', text: 'You wrote: "I\'m starting again because {why}." I think about that a lot.', needs: 'why' },
        { who: 'flame', mood: 'soft', text: 'Can I ask you something else? Something from before all of it?', music: 'memory' },
      ],
      ask: {
        kind: 'choice',
        id: 'heart1',
        prompt: 'What did you love about moving, when you were small?',
        choices: [
          { label: 'Running around outside', value: 'running around outside' },
          { label: 'Playing with friends', value: 'playing with friends' },
          { label: 'Feeling strong', value: 'feeling strong' },
          { label: 'Feeling free', value: 'feeling free' },
          {
            label: "I don't remember",
            value: '',
            after: [
              { who: 'flame', mood: 'soft', text: "That's okay. It's been a long time. Maybe I'll remember for both of us." },
              { who: 'flame', mood: 'soft', text: 'I bet it was nothing serious. Just you, moving, because it felt good.' },
            ],
          },
        ],
        after: [
          { who: 'flame', mood: 'soft', text: '{heart1}...', pace: 'slow' },
          { who: 'flame', mood: 'soft', text: "Nobody was counting anything back then, were they? You weren't trying to fix anything." },
          { who: 'flame', mood: 'happy', text: 'Funny. I feel like I remember that.', pause: 1 },
        ],
      },
    },
    {
      id: 'ch1-tomorrow-begs',
      when: { workouts: 10 },
      lines: [
        { who: 'tomorrow', text: "Skip today. You've been so good. You deserve a break. Tomorrow you can do double." },
        { who: 'you', text: "No. Today I'll do enough." },
        { who: 'tomorrow', text: '...Enough? Nobody ever says enough to me.' },
        { who: 'flame', text: "Rest is planned. Skipping is just Tomorrow talking. And you can tell them apart now. Look at you." },
      ],
    },
    {
      id: 'ch1-proof',
      when: { workouts: 11, chapter: 1 },
      place: 'ashlands-camp',
      music: 'camp',
      lines: [
        { who: 'narrator', show: 'flame', text: 'The little stones by the fire have become a line. {flame} keeps straightening it when it thinks you are not looking.' },
        { who: 'hollow', text: "It won't last. It never lasts." },
        { who: 'narrator', text: "You don't answer it. You just put today's stone at the end of the line.", pause: 1.2, film: true },
        { who: 'flame', mood: 'happy', text: '...That one was a good one.', pause: 0.8 },
      ],
    },
    {
      id: 'ch1-victory',
      when: { beaten: 1 },
      lines: [
        { who: 'narrator', show: 'tomorrow', text: 'Tomorrow splits one last time, and fades into the ash.', shot: { shake: 'small' } },
        { who: 'tomorrow', text: "Mmh... I'll be back. Tomorrow." },
        { who: 'flame', mood: 'happy', text: "And we'll be here. Today." },
        { who: 'narrator', text: 'The Wanderer says nothing. Just looks at the line of stones by the fire for a long moment, and nods.', pause: 0.8 },
        { who: 'narrator', text: 'You pick up the first stone and put it in your pocket. You are not sure why. It just seems like something to keep.', pause: 1 },
        { who: 'flame', mood: 'happy', text: "Month one. We're still here." },
      ],
    },

  ],
};
