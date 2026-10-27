import { migrate, type GameState } from './game';

/* Installing FORMA to the home screen. After the prologue the app asks to be installed before the
   game goes on (InstallGate), so it runs full screen, offline, and the save isn't cleared by the
   browser. Pure rules: which guide a browser gets, and the hero code that carries a save across.

   Why a hero code: on iPhones a home-screen app has its own storage, apart from Safari's. A save
   made in Safari is not there when the installed app opens, so Safari copies it as a code and the
   installed app pastes it back. Android browsers share storage with what they install. */

/** Which install guide to show. */
export type Platform =
  /** iPhone or iPad Safari: Share, then Add to Home Screen. */
  | 'ios-safari'
  /** Chrome or Edge on iPhone: the same, from the share button in the address bar. */
  | 'ios-chrome'
  /** Any other iPhone browser (Firefox, an app's own browser): open FORMA in Safari first. */
  | 'ios-other'
  /** Android: the browser's Install button, or its menu. */
  | 'android'
  /** A computer: not asked to install. */
  | 'desktop';

export const PLATFORMS: Platform[] = ['ios-safari', 'ios-chrome', 'ios-other', 'android', 'desktop'];

/** The guide for a browser, from its user agent. `touchPoints` tells an iPad (which says it's a Mac) from a Mac. */
export function platformOf(ua: string, touchPoints = 0): Platform {
  const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && touchPoints > 1);
  if (ios) {
    // Apps that open links in their own browser can't add to the home screen.
    if (/FBAN|FBAV|Instagram|Line\/|Twitter|LinkedInApp|Snapchat|TikTok|musical_ly|GSA\//i.test(ua)) return 'ios-other';
    if (/CriOS|EdgiOS/i.test(ua)) return 'ios-chrome';
    if (/FxiOS|OPiOS|OPT\/|DuckDuckGo|YaBrowser|Brave/i.test(ua)) return 'ios-other';
    return 'ios-safari';
  }
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

/** Whether this platform has to install before playing. A computer's browser keeps its save, so it plays on. */
export const mustInstall = (p: Platform) => p !== 'desktop';

/** Whether a save made here has to be carried into the installed app by a hero code. */
export const needsCarry = (p: Platform) => p.startsWith('ios');

const PREFIX = 'FORMA-HERO:';

/** The whole save as one line of text, to paste into the installed app. */
export function heroCode(state: GameState): string {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return PREFIX + btoa(bin);
}

/** The save in a hero code, or null when the text isn't one (or holds a broken save). Spaces and
    line breaks a paste may add are ignored, and so is anything before the code. */
export function readHeroCode(text: string): GameState | null {
  const at = text.indexOf(PREFIX);
  if (at < 0) return null;
  try {
    const bin = atob(text.slice(at + PREFIX.length).replace(/\s+/g, ''));
    const raw = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))) as { version?: number; sessions?: unknown };
    if (![1, 2, 3].includes(raw?.version ?? 0) || !Array.isArray(raw.sessions)) return null;
    return migrate(raw);
  } catch {
    return null;
  }
}
