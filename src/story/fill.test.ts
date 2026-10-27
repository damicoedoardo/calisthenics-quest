import { describe, expect, it } from 'vitest';
import { fill, sayBack } from './engine';
import type { Words } from './types';

/* The letter is written in the first person; told back to the player it has to say "you". */

const words = { why: 'I miss feeling strong in my own body.', want: 'do ten pull-ups', forWho: 'my kids', remind: "I've done hard things", heart1: 'running around outside' } as Words;

describe('the letter, said back', () => {
  it('turns "I" and "my" into "you" and "your" outside quotes', () => {
    expect(fill('You said you were doing this for {forWho}.', words)).toBe('You said you were doing this for your kids.');
    expect(fill('You wrote that you started again because {why}.', words)).toBe('You wrote that you started again because you miss feeling strong in your own body.');
  });

  it('keeps the words as written inside quotes', () => {
    expect(fill('On the first day you wrote: "I\'m starting again because {why}."', words)).toBe('On the first day you wrote: "I\'m starting again because I miss feeling strong in my own body."');
    expect(fill('You told me once: "{remind}." Do you still mean it?', words)).toBe('You told me once: "I\'ve done hard things." Do you still mean it?');
  });

  it('leaves words that are not the letter alone', () => {
    expect(fill('You loved {heart1}.', words)).toBe('You loved running around outside.');
    expect(sayBack('me, and the people who need me at my best')).toBe('you, and the people who need you at your best');
    expect(sayBack('Mimi and Timothy')).toBe('Mimi and Timothy');
  });
});
