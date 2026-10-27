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
  tests: 0,
  place: 'ashlands',
  fog: {
    name: 'The Ashen Edge',
    boss: 'tomorrow',
    hint: 'Tomorrow heals while you keep your distance. Get close.',
    after: "It only grows while you wait. You didn't wait.",
    firstTry: 'Tomorrow is stronger than it looks. Try anyway: losing here costs nothing.',
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
        { who: 'wanderer', text: 'Notice how you feel right now. Not proud, maybe. Not yet. Just a little lighter.' },
        { who: 'wanderer', text: 'Remember it. Some day soon Tomorrow will try to talk you out of this feeling.' },
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
      id: 'ch1-kept',
      when: { workouts: 2, chapter: 1 },
      place: 'ashlands-camp',
      music: 'camp',
      lines: [
        { who: 'narrator', show: 'flame', text: 'Evening. {flame} flickers next to you, thinking very hard, which for a flame mostly looks like hissing.' },
        { who: 'flame', mood: 'soft', text: 'Can I tell you what I noticed? You said you would come back. And you came back.' },
        { who: 'flame', mood: 'soft', text: 'When was the last time you kept a promise that was only for you? Not for work. Not for anyone else. Just you.' },
        { who: 'you', text: "...I don't remember." },
        { who: 'wanderer', text: "That's why it feels strange. You've kept everyone's promises but your own for a long time." },
        { who: 'wanderer', text: 'Trust works the same with yourself as with anyone. Small promises. Kept. Again. Then one day you just believe yourself.' },
        { who: 'flame', mood: 'happy', text: 'I believe you already. But I am VERY easy to convince.' },
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
        { who: 'wanderer', text: "Ignore it. It calls rest lazy because it wants you tired. Tired people quit." },
        { who: 'wanderer', text: "Your strength doesn't grow while you train. It grows now, while you rest." },
        { who: 'wanderer', text: 'Workouts are fuel. Rest is air. A fire needs both. Resting is how you take care of the thing you are building.' },
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
        { who: 'tomorrow', text: "Tomorrow you'll have more time. More energy. You'll be a whole new person. Why waste today on the old one?" },
        { who: 'flame', mood: 'smoky', text: "It's so soft. Why is it so soft? I want to nap on it. That's the problem, isn't it." },
        { who: 'wanderer', text: "Every time you say 'tomorrow', it makes another one. Every time you show up, there's one less." },
        { who: 'wanderer', text: "And the person you're waiting to become? They're built out of todays. There's nothing else to build them from." },
      ],
    },
    {
      id: 'perfect-week',
      when: { perfectWeek: true },
      lines: [
        { who: 'flame', mood: 'happy', text: "Three for three! Look at me, I'm a real flame now." },
        { who: 'flame', mood: 'soft', text: "You said you'd show up all week, and you did. Do you get it? You can believe what you say again." },
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
        { who: 'flame', mood: 'soft', text: 'A rough day, and you came anyway. Small, but you came.' },
        { who: 'hollow', text: "That barely counts. Who do you think you're fooling?" },
        { who: 'wanderer', text: "It counts. On the hard days, showing up small is the whole skill. Anyone can show up when it's easy." },
        { who: 'flame', mood: 'soft', text: "If a friend told you they did a little on a bad day, you'd be proud of them. Try being that friend. Just for today." },
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
        { who: 'narrator', show: 'flame', text: "You don't answer. {flame} doesn't push. The fire pops, and the quiet is the comfortable kind." },
        { who: 'flame', mood: 'soft', text: 'You wrote that you started again because {why}. I think about that a lot.', needs: 'why' },
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
          { who: 'flame', mood: 'soft', text: '{heart1}...' },
          { who: 'flame', mood: 'soft', text: "Nobody was counting anything back then, were they? You weren't trying to fix anything. You just loved it." },
          { who: 'flame', mood: 'happy', text: 'Funny. I feel like I remember that.' },
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
        { who: 'flame', text: 'Rest is planned. Skipping is just Tomorrow talking. You can tell them apart now. That is a superpower.' },
      ],
    },
    {
      id: 'ch1-proof',
      when: { workouts: 11, chapter: 1 },
      place: 'ashlands-camp',
      music: 'camp',
      lines: [
        { who: 'narrator', show: 'flame', text: '{flame} has been arranging little stones by the fire. One for every workout. It is very proud of the line.' },
        { who: 'flame', mood: 'happy', text: "These are yours. Every one of them is a day you said you'd show up, and did." },
        { who: 'hollow', text: "It won't last. It never lasts." },
        { who: 'wanderer', text: "It doesn't have to last forever. It has to happen today. Then today again." },
        { who: 'wanderer', text: "Look at the stones. That's what trusting yourself looks like. Not a feeling. A line of small, kept promises." },
      ],
    },
    {
      id: 'ch1-victory',
      when: { beaten: 1 },
      lines: [
        { who: 'narrator', show: 'tomorrow', text: 'Tomorrow splits one last time, and fades into the ash.', shot: { shake: 'small' } },
        { who: 'tomorrow', text: "Mmh... I'll be back. Tomorrow." },
        { who: 'flame', mood: 'happy', text: "And we'll be here. Today." },
        { who: 'wanderer', text: 'You know what Tomorrow hates? Today.' },
        { who: 'wanderer', text: "A month ago you didn't believe a word you told yourself. Now you have a whole month of proof." },
        { who: 'flame', mood: 'happy', text: "Month one. We're still here." },
      ],
    },
  ],
};
