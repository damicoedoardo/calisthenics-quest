import type { HeroVariant } from '@/sprites/characters/hero';
import type { PlaceId } from './places';

/* The story as a manga: pages of panels, as data. MangaPage (src/components/MangaPage.tsx) only
   draws them. A page is rows top to bottom; a row is panels left to right (read that way: left to
   right, then down). The words are the opening's own lines (opening.ts), set out as captions and
   bubbles, never rewritten. Open /lab/manga to read a page. */

/** A panel's background: flat tones, screen-tone dots, or a story place. */
export type Tone = 'golden' | 'warm' | 'dusk' | 'gray' | 'dark' | 'black';

export interface Figure {
  /** You, or the Hollow (your shape, emptied out and facing you). */
  who: 'hero' | 'hollow';
  variant?: HeroVariant;
  /** Width as a share of the page's width (1 is as wide as the page; bigger is a close-up). */
  size: number;
  /** The point of the panel (in percent of its box) where the figure's anchor goes. */
  at: [number, number];
  /** The point of the figure that sits there, as shares of its box. [0.5, 1] its feet (the
      default); about [0.5, 0.3] its face. */
  anchor?: [number, number];
  /** 0 full color, 1 all gray. */
  gray?: number;
  /** How much darker, 0 to 1. */
  dim?: number;
  opacity?: number;
  flip?: boolean;
  /** Breathing loop on (the Hollow, so it feels alive). Off holds a still frame, like ink. */
  breathe?: boolean;
}

export type Words =
  /** Narration in a box (or plain on the picture). `at` is its middle, in percent of the panel. */
  | { kind: 'caption'; text: string; at: [number, number]; w: number; plain?: boolean }
  /** Someone talking. `voice` is the Hollow's spiky dark bubble; `faint` trails off. */
  | { kind: 'bubble'; text: string; at: [number, number]; w: number; tail?: 'left' | 'right' | 'down'; look?: 'speech' | 'voice' | 'faint' }
  /** A sound drawn into the picture. */
  | { kind: 'sfx'; text: string; at: [number, number]; size?: number; rotate?: number };

export interface Panel {
  tone: Tone;
  /** A place's painted backdrop instead of a tone. */
  place?: PlaceId;
  /** Speed lines from this point (percent of the panel): the memory's rush. */
  lines?: [number, number];
  /** Screen-tone dots over the tone. */
  dots?: boolean;
  figures?: Figure[];
  words?: Words[];
  /** Read out for screen readers: what the picture shows. */
  alt: string;
}

export interface Row {
  /** Height as a share of the page's width. */
  h: number;
  panels: Panel[];
  /** Where each cut between two panels falls (share of the width) and how far it leans at the top
      (share of the width, + to the right). Left out: equal widths, straight cuts. */
  cuts?: { at: number; lean?: number }[];
}

export interface MangaPage {
  id: string;
  /** Shown over the page: the part of the story and the page number. */
  part: string;
  page: number;
  rows: Row[];
}

/** Page 1 of the prologue: the cold open and the fading (COLD_OPEN and FADING in opening.ts),
    ending on the voice moving in, the page-turn. `{voice}` is the Hollow's line the player picks. */
export const INTRO_PAGE_1: MangaPage = {
  id: 'intro-1',
  part: 'Prologue',
  page: 1,
  rows: [
    {
      h: 0.7,
      panels: [
        {
          tone: 'golden',
          lines: [50, 70],
          alt: 'You, in golden light, the way you were.',
          figures: [{ who: 'hero', size: 0.66, at: [50, 104] }],
          words: [
            { kind: 'caption', text: 'Do you remember the last time you felt strong?', at: [29, 13], w: 50 },
            { kind: 'caption', text: 'Not how you looked. How it felt.', at: [77, 86], w: 40 },
          ],
        },
      ],
    },
    {
      h: 0.5,
      cuts: [{ at: 0.5, lean: 0.07 }],
      panels: [
        {
          tone: 'warm',
          lines: [60, 55],
          alt: 'Close on your hand, gripping the sword.',
          figures: [{ who: 'hero', size: 1.25, at: [52, 62], anchor: [0.7, 0.6] }],
          words: [
            { kind: 'caption', text: 'Lungs on fire. Hands shaking.', at: [42, 13], w: 76 },
            { kind: 'sfx', text: 'HAH... HAH...', at: [40, 86], size: 1, rotate: -8 },
          ],
        },
        {
          tone: 'golden',
          lines: [45, 40],
          alt: 'Close on your face. You are smiling.',
          figures: [{ who: 'hero', size: 1.0, at: [54, 40], anchor: [0.5, 0.3] }],
          words: [{ kind: 'caption', text: 'And somehow, smiling.', at: [62, 87], w: 66 }],
        },
      ],
    },
    {
      h: 0.2,
      panels: [
        {
          tone: 'black',
          alt: 'Black.',
          words: [{ kind: 'caption', text: "It never tells you it's leaving.", at: [50, 50], w: 90, plain: true }],
        },
      ],
    },
    {
      h: 0.62,
      panels: [
        {
          tone: 'warm',
          alt: 'You, a little grayer.',
          figures: [{ who: 'hero', size: 0.42, at: [50, 102], gray: 0.3 }],
          words: [
            { kind: 'caption', text: 'A busy week.', at: [50, 11], w: 84 },
            { kind: 'bubble', text: 'Next Monday.', at: [52, 33], w: 80, tail: 'down' },
          ],
        },
        {
          tone: 'dusk',
          dots: true,
          alt: 'You, grayer still.',
          figures: [{ who: 'hero', size: 0.36, at: [50, 102], gray: 0.7, dim: 0.15 }],
          words: [
            { kind: 'caption', text: 'Then a tired month.', at: [50, 11], w: 84 },
            { kind: 'bubble', text: 'Next Monday.', at: [50, 39], w: 78, tail: 'down' },
          ],
        },
        {
          tone: 'gray',
          dots: true,
          alt: 'You, all gray and small.',
          figures: [{ who: 'hero', size: 0.26, at: [50, 102], gray: 1, dim: 0.3 }],
          words: [
            { kind: 'caption', text: 'Then a whole stretch of life when everything else came first.', at: [50, 19], w: 92 },
            { kind: 'bubble', text: 'Next Monday...', at: [50, 56], w: 80, tail: 'down', look: 'faint' },
          ],
        },
      ],
    },
    {
      h: 0.42,
      panels: [
        {
          tone: 'gray',
          dots: true,
          alt: 'You, far off and small, alone in a lot of gray.',
          figures: [{ who: 'hero', size: 0.17, at: [68, 92], gray: 1, dim: 0.35, opacity: 0.85 }],
          words: [
            { kind: 'caption', text: '“Next Monday,” you said. You said it so many times it stopped meaning anything.', at: [32, 24], w: 54 },
            { kind: 'caption', text: 'Nobody took it from you. You put it down, one day at a time, and forgot where.', at: [34, 74], w: 56 },
          ],
        },
      ],
    },
    {
      h: 0.95,
      panels: [
        {
          tone: 'dark',
          dots: true,
          alt: 'Behind you, huge, your own shape with empty eyes leans down to your ear.',
          figures: [
            { who: 'hollow', size: 1.05, at: [64, 36], anchor: [0.5, 0.3], breathe: true },
            { who: 'hero', size: 0.36, at: [20, 104], gray: 1, dim: 0.35, flip: true },
          ],
          words: [
            { kind: 'caption', text: 'And somewhere along the way, a voice moved in.', at: [27, 9], w: 48 },
            { kind: 'bubble', text: '{voice}', at: [56, 74], w: 50, look: 'voice' },
          ],
        },
      ],
    },
  ],
};

export const MANGA_PAGES: MangaPage[] = [INTRO_PAGE_1];
