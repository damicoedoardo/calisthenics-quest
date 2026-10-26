import type { Chapter } from '../types';

/* Month 6. Lesson: there is no top, only a direction. The month's new scenes and the endless
   climb in the Fog come with the months 4 to 6 build. */

export const FORMA: Chapter = {
  n: 6,
  name: 'Forma',
  lesson: 'There is no top, only a direction',
  enemy: 'The Summit',
  enemySprite: 'summit',
  workouts: 14,
  tests: 3,
  place: 'summit',
  fog: {
    name: 'The Summit',
    boss: 'hollow',
    hint: 'The Hollow walks out of the fog, speaking your own line.',
    after: "There's no top. Just higher than yesterday.",
    keepsake: { name: "The Wanderer's Cloak", text: 'Grey, warm, and exactly your size.' },
    hp: 7,
    dmg: 2.2,
    ground: '#1a1a22',
    fog: '#e2e8f0',
  },
  scenes: [
    {
      id: 'ch6-intro',
      when: { chapter: 6 },
      shots: [{ title: 'Chapter 6: Forma', seconds: 2.4 }, { pan: 'up', seconds: 2.4 }],
      lines: [
        { who: 'wanderer', text: 'The Summit. The last stretch.', shot: { pan: 'center' } },
        { who: 'wanderer', text: "I'm getting lighter, you know. With every rep you do." },
      ],
    },
    {
      id: 'ch6-await-test',
      when: { awaitingTest: 6 },
      lines: [{ who: 'wanderer', text: 'One last test. Not to prove anything. Just to see how far you\'ve come.' }],
    },
    {
      id: 'finale',
      when: { finished: true },
      lines: [
        { who: 'narrator', text: "Near the top, a small shadow sits alone on a rock. The Hollow. It's the size of a child now." },
        { who: 'hollow', text: '{voice}', needs: 'voice' },
        { who: 'you', text: 'Maybe. I came anyway.' },
        { who: 'narrator', text: 'You hold out your hand. After a long moment, the shadow takes it.' },
        { who: 'wanderer', text: "You didn't destroy it. Nobody does. You just stopped letting it walk in front of you." },
        { who: 'narrator', text: 'At the top, the Wanderer lowers the hood.', shot: { zoom: 'in', seconds: 2 } },
        { who: 'narrator', text: 'Under it is your face. Older. Stronger. The same scar on the same hand.' },
        { who: 'bestself', text: "Hi. I've been waiting a long time to meet you." },
        { who: 'bestself', text: "I didn't come back to save you. I couldn't. I could only walk next to you." },
        { who: 'bestself', text: 'Every rep you did, I became a little more real.' },
        { who: 'bestself', text: 'On the first day you wrote: "I\'m starting again because {why}."', needs: 'why' },
        { who: 'bestself', text: 'You wanted to be able to {want}. Look at your hands.', needs: 'want' },
        { who: 'bestself', text: 'You said you were doing this for {forWho}. They got the best of you. So did you.', needs: 'forWho' },
        { who: 'bestself', text: 'And you asked me: "When I want to quit, remind me that {remind}."', needs: 'remind' },
        { who: 'bestself', text: 'You never needed me to remind you. You remembered on your own.' },
        { who: 'flame', mood: 'soft', text: "I remember now. I'm the part of you that loved {heart1}.", needs: 'heart1' },
        { who: 'flame', mood: 'happy', text: 'You never lost me. You just stopped playing.' },
        { who: 'bestself', text: "This isn't an ending. Your best self isn't a place you arrive. It's a direction you keep facing." },
        { who: 'flame', mood: 'happy', text: '...So. Same time Monday?' },
      ],
    },
  ],
};
