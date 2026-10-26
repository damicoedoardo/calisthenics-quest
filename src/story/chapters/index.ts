import type { Chapter } from '../types';
import { ASHLANDS } from './1-ashlands';
import { MIRROR_LAKE } from './2-mirror-lake';
import { VILLAGE } from './3-village';
import { PLATEAU } from './4-plateau';
import { THE_FOG } from './5-the-fog';
import { FORMA } from './6-forma';

/** The story, one chapter a month. Order matters: chapters play in this order. */
export const CHAPTERS: Chapter[] = [ASHLANDS, MIRROR_LAKE, VILLAGE, PLATEAU, THE_FOG, FORMA];
