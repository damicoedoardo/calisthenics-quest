import type { Ask, Chapter, Line } from '../types';

/* Month 5. Lesson: you don't silence the voice, you walk anyway. The healing step: the inner critic
   never fully leaves, so you learn to walk beside it, let yourself be looked after, and find out
   you were never as alone as it said. The heart moment is the Hollow's own question: what do you
   hold on to? Near the end, the villagers you helped walk out of the fog (Mira and the Echo come
   when you helped none). Before they come, you choose whether to call out for help: asking is the
   hardest step, and if you can't, the flame asks for you. */

/** Call out into the fog, or stay quiet; either way, footsteps. `arrive` is who comes. */
function callOut(arrive: Line[]): Ask {
  return {
    kind: 'choice',
    id: 'call',
    prompt: 'The fog is silent.',
    choices: [
      {
        label: 'Call for help',
        value: 'yes',
        after: [
          { who: 'you', text: '...Is anyone there? I could use some help.', pace: 'slow' },
          { who: 'narrator', text: "Your voice is very small in the fog. It's the hardest thing you've said all year.", pause: 1.2, film: true },
          ...arrive,
        ],
      },
      {
        label: 'Stay quiet',
        value: 'no',
        after: [
          { who: 'narrator', show: 'flame', text: "{flame} looks at you, then out at the fog. It knows you can't. So it does it for you." },
          { who: 'flame', mood: 'scared', text: 'HELLO? We could use a hand over here! Anyone!' },
          ...arrive,
        ],
      },
    ],
  };
}

/** Who walks out of the fog at the gathering: the villagers you helped. */
const HELPED_ARRIVE: Line[] = [
  { who: 'narrator', text: 'Then, footsteps.', film: true, pause: 2, pace: 'slow' },
  { who: 'narrator', text: 'Not golden ones. Ordinary ones. More than one pair.', shot: { shake: 'small' }, music: 'rise' },
  { who: 'lia-after', text: "You sat with me when nobody did. You didn't ask me when I was coming back. So I came.", shot: { enter: 'left' }, answer: { id: 'lia', is: 'yes' } },
  { who: 'sol-after', text: 'You woke me up on a day you had every excuse not to. I owed you a morning. I brought a few.', shot: { enter: 'right' }, answer: { id: 'sol', is: 'yes' } },
  { who: 'narrator', show: 'vela-after', text: "A light swings out of the fog: Vela's lamp, carried all the way from the flat road.", answer: { id: 'vela', is: 'yes' } },
  { who: 'vela-after', text: "The light doesn't argue with the fog. It just stays on. I thought you could use one.", answer: { id: 'vela', is: 'yes' } },
  { who: 'vela-after', text: "And I've a letter in my coat. An answer, from home. I haven't opened it. One brave thing at a time. I'll open it when you're through.", answer: { id: 'vela', is: 'yes' } },
  { who: 'hollow', text: '...You were supposed to be alone.', pause: 0.8 },
  { who: 'you', text: 'So was I.', pause: 0.6 },
  { who: 'narrator', text: 'Nobody makes a speech. They just start walking, and somehow you end up in the middle.', film: true, pause: 1 },
  { who: 'flame', mood: 'soft', text: '...Oh.', pause: 1 },
];

/** Who walks out of the fog when you helped nobody: Mira and the Echo. */
const ALONE_ARRIVE: Line[] = [
  { who: 'narrator', text: 'Then, footsteps.', film: true, pause: 2, pace: 'slow' },
  { who: 'narrator', text: 'Heavy boots, and the clank of a hammer.', shot: { shake: 'small' }, music: 'rise' },
  { who: 'mira', text: "Heard there was fog. I brought a hammer. Don't know what I'll hit with it, but I brought it.", shot: { enter: 'left' } },
  { who: 'mira', text: "Asked or not, we'd have come. That's what a village is for." },
  { who: 'narrator', show: 'echo', text: 'Behind her, faint and golden, the Echo. Keeping its distance, but there.' },
  { who: 'echo', text: "Don't make it weird. I'm only here because you're the only one who remembers me." },
  { who: 'hollow', text: '...You were supposed to be alone.', pause: 0.8 },
  { who: 'flame', mood: 'soft', text: "Nobody's ever as alone as the Hollow says. It just counts very badly." },
  { who: 'narrator', text: 'Nobody makes a speech. They just start walking, and somehow you end up in the middle.', film: true, pause: 1 },
];

export const THE_FOG: Chapter = {
  n: 5,
  name: 'The Fog',
  lesson: "You don't silence it. You walk anyway",
  enemy: 'The Hollow',
  enemySprite: 'hollow',
  workouts: 14,
  place: 'hollow-woods',
  fog: {
    name: 'The Hollow Woods',
    boss: 'hollow',
    hint: "It can't be beaten. When its light opens, stand in it, and take its hand.",
    after: 'Nobody destroys it. You walked up to it anyway.',
    keepsake: { name: 'The Voice Stone', text: "Your Hollow's line, carved small enough to carry." },
    hp: 3.45,
    dmg: 6.85,
    ground: '#111a17',
    fog: '#1f3b33',
    // stages: [its light opens, its light goes dark]
    lines: {
      enter: 'Back again? You always stop around here.',
      stages: ['Come into the light, then. I dare you.', 'See? Dark again. It always gets dark.'],
      end: '...I only wanted you safe.',
      taunts: ['{voice}', "Nobody's coming.", "You'll quit. You always do.", 'Go back to the quiet.'],
    },
  },
  scenes: [
    {
      // The flame grows wings at the end of the Plateau, whatever the chapter is waiting for.
      id: 'ch5-wings',
      when: { workouts: 50 },
      // Still on the Plateau: the fog only comes after this.
      place: 'flat-road',
      lines: [
        { who: 'narrator', show: 'flame', text: 'The Plateau has no hearts left. In the quiet after the last workout, {flame} goes very still.' },
        { who: 'flame', mood: 'scared', text: "...Something's happening. Is something happening? Something is DEFINITELY happening." },
        { who: 'narrator', show: 'flame', text: 'Two wings of flame unfold from its back, and {flame} lifts off the ground, wobbling.', shot: { zoom: 'in', seconds: 1.6 } },
        { who: 'flame', mood: 'happy', text: "Wings. I have wings. I've been growing these the whole time, and I didn't even know." },
        { who: 'wanderer', text: "Neither did the Plateau. That's how it works. It hides, and hides, and then it shows all at once." },
        { who: 'flame', mood: 'soft', text: "You walked a whole flat month with no proof it was working. That's what grew these. I believe you're someone who keeps going without proof." },
        { who: 'flame', mood: 'happy', text: "In the Fog I'll fly next to you now. And when you're hurt, I can patch you up a little. I'm a fire fairy. Is that a real thing? It's a real thing now." },
      ],
    },
    {
      id: 'ch5-intro',
      when: { chapter: 5 },
      music: 'hollow',
      shots: [{ title: 'Chapter 5: The Fog', seconds: 2.4 }],
      lines: [
        { who: 'narrator', show: 'hollow', text: 'The fog rolls in, thick and cold. In the middle of it, a shape you know. Your face, with empty eyes.' },
        { who: 'hollow', text: '{voice}', needs: 'voice' },
        { who: 'hollow', text: "Remember me? You've been busy. {sessions} sessions. Cute." },
        { who: 'hollow', text: "You've started before. You always stop around here. It gets boring, you get tired, and you get smart about it." },
        { who: 'hollow', text: 'Save yourself the embarrassment. Come back to the quiet.' },
        { who: 'you', text: "...It's right. I always stopped around here.", pause: 0.8 },
        { who: 'flame', text: "Stopped. Past tense. That is a whole different word.", mood: "soft" },
        { who: 'flame', mood: 'smoky', text: "Don't listen to it. It's loud. That doesn't make it right." },
        { who: 'wanderer', text: "It's louder because you're getting close." },
        { who: 'flame', mood: 'soft', text: "My wings light up about this much fog. It'll have to do. Stay close?" },
      ],
    },
    {
      id: 'ch5-fairy-heals',
      when: { workouts: 53, chapter: 5 },
      lines: [
        { who: 'narrator', text: 'A root you never saw. You go down hard in the wet leaves, and for a moment you just lie there.' },
        { who: 'hollow', text: "There it is. Stay down. You know how. You're good at it." },
        { who: 'narrator', show: 'flame', text: '{flame} lands on your chest, wings folded, glowing warm.', shot: { zoom: 'in', seconds: 1.2 } },
        { who: 'flame', mood: 'soft', text: 'Hold still. ...There. Fairy business. Very official.' },
        { who: 'flame', mood: 'soft', text: "I've been doing this for years, you know. Every time you fell, I was the small voice saying 'you're okay, you're okay'. You just couldn't hear me over the Hollow.", pause: 0.8 },
        { who: 'you', text: '...I can hear you now.' },
        { who: 'flame', mood: 'happy', text: 'You can. Up we get.' },
      ],
    },
    {
      id: 'ch5-next-step',
      when: { workouts: 55, chapter: 5 },
      music: 'hollow',
      shots: [{ pan: 'left', seconds: 1.6 }, { pan: 'right', seconds: 1.6 }, { pan: 'center' }],
      lines: [
        { who: 'narrator', text: 'The path is gone. Fog on every side. You turn around, and the way back is gone too.' },
        { who: 'hollow', text: "You don't even know where this goes. You never did." },
        { who: 'you', text: "...It's right. I can't see anything." },
        { who: 'wanderer', text: "I've never seen the whole path. Nobody has. You see one step. You take it. Then there's another one." },
        { who: 'you', text: 'And if I go the wrong way?' },
        { who: 'wanderer', text: 'Then you turn around. You can steer someone who is walking.' },
        { who: 'flame', mood: 'soft', text: "I can see one step. Right there. That's all I can see. Want it?" },
      ],
    },
    {
      id: 'ch5-hollow-knows',
      when: { workouts: 57, chapter: 5 },
      music: 'hollow',
      lines: [
        { who: 'narrator', show: 'hollow', text: 'The Hollow steps out of the fog right in front of the Wanderer. It tilts its head.' },
        { who: 'hollow', text: 'You. I know you. You smell like... the one who stopped listening to me.' },
        { who: 'wanderer', text: 'I listened to you for years. Then one ordinary day I walked anyway. You remember that day. You hated it.' },
        { who: 'hollow', text: '...You never came back to the quiet.' },
        { who: 'wanderer', text: 'No. And I was never sorry.' },
        { who: 'flame', mood: 'scared', text: "Why does the Hollow know the Wanderer? Why does everyone know everyone? I'm a flame, I can't keep up." },
      ],
    },
    {
      id: 'ch5-heart',
      when: { workouts: 59, chapter: 5 },
      music: 'memory',
      lines: [
        { who: 'narrator', show: 'hollow', text: 'The Hollow sits down in the path, the way the Echo sat on the lake. It looks tired. You never thought of it as tired.' },
        { who: 'hollow', text: "I don't get it. I'm right a lot. You know I'm right a lot." },
        { who: 'hollow', text: 'So when I get loud, what do you even hold on to?' },
      ],
      ask: {
        kind: 'choice',
        id: 'heart5',
        prompt: 'When the voice gets loud, what do you hold on to?',
        choices: [
          { label: 'The next step', value: 'The next step.' },
          { label: 'The people walking with me', value: 'The people walking with me.' },
          { label: 'Every promise I kept', value: 'Every promise I kept.' },
          { label: "I got up before. I'll get up again.", value: "I got up before. I'll get up again." },
        ],
        write: 'Write your own',
        after: [
          { who: 'hollow', text: "...That's it? That's so small." },
          { who: 'you', text: "Small is what I've got. It's been enough every time so far." },
          { who: 'narrator', show: 'hollow', text: "The Hollow doesn't answer. For the first time since the ash, it looks unsure." },
        ],
      },
    },
    {
      id: 'ch5-nothing-changed',
      when: { workouts: 61, chapter: 5 },
      music: 'hollow',
      lines: [
        { who: 'hollow', text: '{voice}', needs: 'voice' },
        { who: 'hollow', text: 'And look at you. All this walking. Same face. Nothing has changed.' },
        { who: 'flame', mood: 'smoky', text: 'Nothing? On the Plateau you told the Wanderer: "{heart4}." That\'s not nothing. That\'s the part it can\'t see.', needs: 'heart4' },
        { who: 'flame', mood: 'smoky', text: 'Nothing? You keep your promises now. You rest without apologizing. You talk to yourself like a friend, most days. It just can\'t see any of that.', missing: 'heart4' },
        { who: 'narrator', show: 'kid', text: 'You remember a kid in a village, and what you told them about day one: "{heart3}" You say it again, quietly. This time to yourself.', needs: 'heart3' },
        { who: 'narrator', show: 'hollow', text: "The Hollow flickers, like a picture on a bad screen. It doesn't go away. But it steps aside." },
        { who: 'narrator', text: 'You walk past it. It keeps talking. You keep walking.', film: true, pause: 1 },
      ],
    },
    {
      id: 'ch5-gathering',
      when: { workouts: 63, chapter: 5, helped: true },
      music: 'hollow',
      lines: [
        { who: 'narrator', text: "The fog closes in so thick you can't see {flame}'s wings. The Hollow's voice comes from everywhere at once." },
        { who: 'hollow', text: 'Look around. Nobody.', music: 'none', pace: 'slow' },
        { who: 'hollow', text: 'You were always going to end up alone out here. Everyone does.', pause: 1 },
        { who: 'hollow', text: '{voice}', needs: 'voice', pause: 1 },
        { who: 'narrator', text: 'You stand very still. You notice you are holding the first stone, in your pocket, hard enough to hurt.', film: true, pause: 1.6 },
      ],
      ask: callOut(HELPED_ARRIVE),
    },
    {
      id: 'ch5-gathering-alone',
      when: { workouts: 63, chapter: 5, helped: false },
      music: 'hollow',
      lines: [
        { who: 'narrator', text: "The fog closes in so thick you can't see {flame}'s wings. The Hollow's voice comes from everywhere at once." },
        { who: 'hollow', text: 'Look around. Nobody.', music: 'none', pace: 'slow' },
        { who: 'hollow', text: 'You were always going to end up alone out here. Everyone does.', pause: 1 },
        { who: 'hollow', text: '{voice}', needs: 'voice', pause: 1 },
        { who: 'narrator', text: 'You stand very still. You notice you are holding the first stone, in your pocket, hard enough to hurt.', film: true, pause: 1.6 },
      ],
      ask: callOut(ALONE_ARRIVE),
    },
    {
      id: 'ch5-short',
      when: { workouts: 51, shortSession: true, inChapter: 5 },
      lines: [
        { who: 'hollow', text: "That's all you've got today?" },
        { who: 'you', text: 'Today, yes. And I brought it.' },
        { who: 'flame', mood: 'soft', text: 'Walking slowly through fog is still walking through fog. Ask anyone who stood still in it.' },
      ],
    },
    {
      id: 'ch5-rest',
      when: { restDay: true, inChapter: 5 },
      music: 'camp',
      lines: [
        { who: 'narrator', show: 'flame', text: 'A rest day, in the middle of the fog. {flame} folds its wings and settles into your lap like a cat.' },
        { who: 'flame', mood: 'sleepy', text: "Resting in here feels wrong. Like we should keep moving or it'll swallow us." },
        { who: 'wanderer', text: 'Lost people rush. People who know where they are going can afford to sit down.' },
        { who: 'hollow', text: 'Giving up already?' },
        { who: 'flame', mood: 'sleepy', text: "Nope. Resting. You'd know the difference if you ever tried it." },
      ],
    },
    {
      id: 'ch5-victory',
      when: { beaten: 5 },
      music: 'memory',
      lines: [
        { who: 'narrator', show: 'echo', text: 'The fog begins to thin. Golden footsteps come close, and stop beside you.' },
        { who: 'echo', text: "I said cruel things. I was scared that if you got strong again, you'd forget me.", pause: 0.8 },
        { who: 'you', text: "I won't forget you. You're how I knew it was possible." },
        { who: 'echo', text: 'You told me you lost {heart2}. I kept some of it for you. Here.', needs: 'heart2', pause: 0.8 },
        { who: 'narrator', text: 'The Echo puts something in your hands. It weighs nothing at all. You hold on to it anyway.', pause: 1.4, film: true, music: 'none' },
        { who: 'echo', text: 'I was never the one you had to get back to.', pace: 'slow', pause: 1 },
        { who: 'echo', text: "I was just one day you were brave. You've had a lot of those since. I counted.", music: 'memory' },
        { who: 'narrator', text: 'The Echo turns into light and drifts up the road ahead of you, toward the mountain. The air is warm where it passed.', pause: 1.2, film: true },
        { who: 'narrator', show: 'hollow', text: 'The fog thins. The Hollow is still there. Smaller now.' },
        { who: 'hollow', text: "You still hear me, don't you?" },
        { who: 'you', text: 'Every day. I just stopped obeying you.' },
        { who: 'hollow', text: "I'll be back." },
        { who: 'you', text: "I know. I'll be here." },
        { who: 'you', text: "...And thank you. For trying to keep me safe. You were very bad at it.", pause: 1 },
        { who: 'flame', mood: 'soft', text: "...It looked scared just then. Did you see? I didn't know it could be scared." },
      ],
    },

  ],
};
