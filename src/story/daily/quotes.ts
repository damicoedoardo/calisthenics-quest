import type { Quote } from '../types';

/* Words for the road. Old writers (public domain, translations kept short) and the story's own
   cast. Each fits a chapter's lesson, rest days, or any day. Keep attributions real: when unsure
   who said something, leave it out. */

export const QUOTES: Quote[] = [
  // 1 · Today beats tomorrow
  { text: 'Begin at once to live.', by: 'Seneca', fits: 1 },
  { text: 'While we are postponing, life speeds by.', by: 'Seneca', fits: 1 },
  { text: 'A journey of a thousand miles begins with a single step.', by: 'Lao Tzu', fits: 1 },
  { text: 'He who has begun is half done. Dare to be wise: begin!', by: 'Horace', fits: 1 },
  { text: 'Confine yourself to the present.', by: 'Marcus Aurelius', fits: 1 },
  { text: 'How long will you wait before you demand the best of yourself?', by: 'Epictetus', fits: 1 },

  // 2 · Compare to last month, not to who you were
  { text: 'Do not spoil what you have by desiring what you have not.', by: 'Epicurus', fits: 2 },
  { text: 'No one steps in the same river twice.', by: 'Heraclitus', fits: 2 },
  { text: 'First say to yourself what you would be, and then do what you have to do.', by: 'Epictetus', fits: 2 },
  { text: "That's not you. That's a photograph. Photographs don't train.", by: 'The Wanderer', fits: 2 },
  { text: "Armor doesn't care how it looks on you. It cares that you showed up in it.", by: 'Mira', fits: 2 },

  // 3 · Done beats perfect
  { text: 'The best is the enemy of the good.', by: 'Voltaire', fits: 3 },
  { text: 'Waste no more time arguing what a good man should be. Be one.', by: 'Marcus Aurelius', fits: 3 },
  { text: 'It is not because things are difficult that we do not dare. It is because we do not dare that they are difficult.', by: 'Seneca', fits: 3 },
  { text: 'Fall seven times, stand up eight.', by: 'Japanese proverb', fits: 3 },
  { text: "Bring me effort. I'll make it into steel.", by: 'Mira', fits: 3 },
  { text: 'I came back slower than I wanted. I came back.', by: 'Mira', fits: 3 },

  // 4 · Progress hides before it shows
  { text: 'No great thing is created suddenly.', by: 'Epictetus', fits: 4 },
  { text: 'Dripping water hollows a stone.', by: 'Ovid', fits: 4 },
  { text: 'Nobody remembers which hit broke the stone. The stone remembers every one.', by: 'Mira', fits: 4 },
  { text: 'Little by little, one travels far.', by: 'Spanish proverb', fits: 4 },

  // 5 · You walk anyway
  { text: 'What stands in the way becomes the way.', by: 'Marcus Aurelius', fits: 5 },
  { text: 'Difficulties are what show us who we are.', by: 'Epictetus', fits: 5 },

  // 6 · No top, only a direction
  { text: 'Whatever you would make a habit, practice it.', by: 'Epictetus', fits: 6 },
  { text: 'Very little is needed to make a happy life.', by: 'Marcus Aurelius', fits: 6 },

  // Rest days
  { text: 'Take rest. A field that has rested gives a beautiful crop.', by: 'Ovid', fits: 'rest' },
  { text: 'Rest is not idleness.', by: 'John Lubbock', fits: 'rest' },
  { text: "Rest isn't the prize for the work. It's part of the work.", by: 'Sol', fits: 'rest' },
  { text: 'Fuel and air. A fire needs both.', by: '{flame}', fits: 'rest' },

  // Any day
  { text: 'It is not that we have a short time to live, but that we waste a lot of it.', by: 'Seneca', fits: 'any' },
];
