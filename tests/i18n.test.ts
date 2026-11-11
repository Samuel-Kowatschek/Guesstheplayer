import { describe, expect, it } from 'vitest';
import { detectLang, divisionShort, strings } from '../src/i18n';
import { INSTAGRAM_URL, shareLink } from '../src/game/shareLinks';

describe('i18n', () => {
  it('detects the language', () => {
    expect(detectLang('en', ['de-DE'])).toBe('en');
    expect(detectLang(null, ['de-AT', 'en'])).toBe('de');
    expect(detectLang(undefined, ['fr-FR'])).toBe('en');
  });
  it('has the same keys in both languages', () => {
    const keys = (o: object) => Object.keys(o).sort();
    expect(keys(strings('de'))).toEqual(keys(strings('en')));
    expect(keys(strings('de').a11y)).toEqual(keys(strings('en').a11y));
    expect(strings('de').missLines.length).toBe(strings('en').missLines.length);
  });
  it('contains no borrowed catch phrases', () => {
    const all = JSON.stringify([strings('en'), strings('de')]).toLowerCase();
    for (const phrase of ['wild', 'appeared', 'effective', 'trainer']) {
      expect(all).not.toContain(phrase);
    }
  });
  it('abbreviates divisions', () => {
    expect(divisionShort('Pacific')).toBe('PAC');
    expect(divisionShort('Southwest')).toBe('S-WEST');
  });
});

describe('shareLink', () => {
  const text = 'HOOPDLE #9 3/8\n\n🟩🟩🟩🟩🟩🟩';
  const url = 'https://example.github.io/guesstheplayer/';
  it('builds working share URLs', () => {
    expect(shareLink('whatsapp', text, url)).toBe(
      `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
    );
    const tg = new URL(shareLink('telegram', text, url));
    expect(tg.host).toBe('t.me');
    expect(tg.searchParams.get('url')).toBe(url);
    expect(tg.searchParams.get('text')).toBe(text);
    const x = new URL(shareLink('x', text, url));
    expect(x.searchParams.get('text')).toBe(text);
    expect(new URL(shareLink('facebook', text, url)).searchParams.get('u')).toBe(url);
    expect(shareLink('email', text, url).startsWith('mailto:?subject=HOOPDLE&body=')).toBe(true);
    expect(shareLink('sms', text, url).startsWith('sms:?&body=')).toBe(true);
    expect(INSTAGRAM_URL).toMatch(/^https:\/\/www\.instagram\.com\//);
  });
});
