import { describe, expect, it } from 'vitest';
import { ago, codeInUrl, friendTrainedToday, inviteLink, myCard, showCode, statusOf, type FriendCard } from './friends';
import { initialState } from './game';

const card = (p: Partial<FriendCard> = {}): FriendCard => ({
  id: 'x',
  name: 'Ana',
  class_id: 'warrior',
  level: 3,
  look: null,
  trained_at: null,
  online: false,
  playing: null,
  seen_at: '2026-10-27T10:00:00Z',
  ...p,
});

describe('friends', () => {
  const now = new Date('2026-10-27T12:00:00Z');

  it('says where a friend is', () => {
    expect(statusOf(card({ online: true, playing: 'The Ember Road' }), now)).toBe('In the Fog: The Ember Road');
    expect(statusOf(card({ online: true }), now)).toBe('Online');
    expect(statusOf(card(), now)).toBe('Seen 2 h ago');
  });

  it('counts time kindly', () => {
    expect(ago(new Date(now.getTime() - 30_000), now)).toBe('just now');
    expect(ago(new Date(now.getTime() - 5 * 60_000), now)).toBe('5 min ago');
    expect(ago(new Date(now.getTime() - 26 * 3600_000), now)).toBe('1 day ago');
  });

  it('knows who trained today', () => {
    expect(friendTrainedToday(card({ trained_at: now.toISOString() }), now)).toBe(true);
    expect(friendTrainedToday(card({ trained_at: new Date(now.getTime() - 3 * 86400_000).toISOString() }), now)).toBe(false);
    expect(friendTrainedToday(card(), now)).toBe(false);
  });

  it('reads and writes invite links and codes', () => {
    expect(codeInUrl(inviteLink('https://formaquest.app', 'K7QF2M'))).toBe('K7QF2M');
    expect(codeInUrl('https://formaquest.app/?friend=k7q-f2m')).toBe('K7QF2M');
    expect(codeInUrl('https://formaquest.app/')).toBeNull();
    expect(showCode('K7QF2M')).toBe('K7Q-F2M');
  });

  it('builds your card from the save', () => {
    const c = myCard(initialState(), 'The Ember Road');
    expect(c.level).toBe(1);
    expect(c.trained_at).toBeNull();
    expect(c.playing).toBe('The Ember Road');
    expect(c.look.gear?.weapon).toBeDefined();
  });
});
