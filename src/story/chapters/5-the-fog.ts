import type { Chapter } from '../types';

/* Month 5. Lesson: you don't silence the voice, you walk anyway. The month's new scenes and the
   Hollow's own Fog fight come with the months 4 to 6 build. */

export const THE_FOG: Chapter = {
  n: 5,
  name: 'The Fog',
  lesson: "You don't silence it. You walk anyway",
  enemy: 'The Hollow',
  enemySprite: 'hollow',
  workouts: 14,
  tests: 2,
  place: 'hollow-woods',
  fog: {
    name: 'The Hollow Woods',
    boss: 'hollow',
    hint: 'The Hollow walks out of the fog, speaking your own line.',
    after: 'Nobody destroys it. You walked up to it anyway.',
    keepsake: { name: 'The Voice Stone', text: "Your Hollow's line, carved small enough to carry." },
    hp: 6,
    dmg: 2,
    ground: '#111a17',
    fog: '#1f3b33',
  },
  scenes: [
    {
      id: 'ch5-intro',
      when: { chapter: 5 },
      music: 'hollow',
      shots: [{ title: 'Chapter 5: The Fog', seconds: 2.4 }],
      lines: [
        { who: 'narrator', text: 'The fog rolls in, thick and cold. In the middle of it, a shape you know. Your face, with empty eyes.' },
        { who: 'hollow', text: '{voice}', needs: 'voice' },
        { who: 'hollow', text: "Remember me? You've been busy. {sessions} sessions. Cute." },
        { who: 'hollow', text: 'You\'ve started before. You always stop around here. It gets boring, you get tired, and you get smart about it.' },
        { who: 'hollow', text: 'Save yourself the embarrassment. Come back to the quiet.' },
        { who: 'flame', mood: 'smoky', text: "Don't listen to it. It's loud. That doesn't make it right." },
      ],
    },
    {
      id: 'ch5-victory',
      when: { beaten: 5 },
      lines: [
        { who: 'narrator', text: 'Through the fog, you hear footsteps. Golden ones.' },
        { who: 'echo', text: "I said cruel things. I was scared that if you got strong again, you'd forget me." },
        { who: 'echo', text: 'You told me you lost {heart2}. Here. I kept it for you.', needs: 'heart2' },
        { who: 'echo', text: "I'm not your goal. I'm your proof. You did it once. You can do it again." },
        { who: 'narrator', text: 'The Echo turns into light and settles into your armor.' },
        { who: 'narrator', text: 'The fog thins. The Hollow is still there. Smaller now.' },
        { who: 'hollow', text: "You still hear me, don't you?" },
        { who: 'you', text: 'Every day. I just stopped obeying you.' },
        { who: 'hollow', text: "I'll be back." },
        { who: 'you', text: "I know. I'll be here." },
      ],
    },
  ],
};
