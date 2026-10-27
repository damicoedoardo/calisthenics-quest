import { describe, expect, it } from 'vitest';
import { heroCode, mustInstall, needsCarry, platformOf, readHeroCode } from './install';
import { initialState, migrate } from './game';
import { skipIntro } from './dev';

const UA = {
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.7204.119 Mobile/15E148 Safari/604.1',
  iphoneFirefox: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/140.0 Mobile/15E148 Safari/605.1.15',
  iphoneInstagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 390.0.0.28.85',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
};

describe('install guide', () => {
  it('picks the guide for each browser', () => {
    expect(platformOf(UA.iphoneSafari)).toBe('ios-safari');
    expect(platformOf(UA.iphoneChrome)).toBe('ios-chrome');
    expect(platformOf(UA.iphoneFirefox)).toBe('ios-other');
    expect(platformOf(UA.iphoneInstagram)).toBe('ios-other');
    expect(platformOf(UA.ipad, 5)).toBe('ios-safari');
    expect(platformOf(UA.ipad, 0)).toBe('desktop');
    expect(platformOf(UA.android)).toBe('android');
    expect(platformOf(UA.mac)).toBe('desktop');
  });

  it('phones install, computers play on; only iPhones carry the hero across', () => {
    expect(mustInstall('ios-safari') && mustInstall('android') && mustInstall('ios-other')).toBe(true);
    expect(mustInstall('desktop')).toBe(false);
    expect(needsCarry('ios-safari') && needsCarry('ios-chrome')).toBe(true);
    expect(needsCarry('android')).toBe(false);
  });
});

describe('hero code', () => {
  it('carries the whole save, letters with accents and emoji too', () => {
    const s = migrate(skipIntro(initialState(), new Date('2026-10-27T18:00:00Z')));
    const hero = { ...s, profile: { ...s.profile, letter: { ...s.profile.letter, why: 'Perché sì 💪' } } };
    expect(readHeroCode(heroCode(hero))).toEqual(hero);
  });

  it('survives a paste with spaces, line breaks and words around it', () => {
    const s = migrate(skipIntro(initialState(), new Date('2026-10-27T18:00:00Z')));
    const code = heroCode(s);
    const messy = `my hero: ${code.slice(0, 40)}\n ${code.slice(40)}  `;
    expect(readHeroCode(messy)).toEqual(s);
  });

  it('turns down anything that is not a hero', () => {
    expect(readHeroCode('')).toBeNull();
    expect(readHeroCode('hello')).toBeNull();
    expect(readHeroCode('FORMA-HERO:not base64 !!')).toBeNull();
    expect(readHeroCode('FORMA-HERO:' + btoa('{"version":9}'))).toBeNull();
  });
});
