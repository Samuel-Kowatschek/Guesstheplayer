import { CONFIG } from '../config';
import { countryCode } from '../game/countries';
import type { AttributeKey, AttributeResult, GuessResult, Player } from '../game/types';
import { sfx } from '../sound';
import { h, prefersReducedMotion, wait } from './dom';
import { ICONS } from './pixels';

export const HEADERS: { key: AttributeKey; label: string; title: string }[] = [
  { key: 'team', label: 'TEAM', title: 'Team' },
  { key: 'position', label: 'POS', title: 'Position' },
  { key: 'height', label: 'HT', title: 'Height' },
  { key: 'age', label: 'AGE', title: 'Age' },
  { key: 'jersey', label: 'NO.', title: 'Jersey number' },
  { key: 'country', label: 'NAT', title: 'Country' },
];

const VERDICT = { green: 'match', yellow: 'close', gray: 'miss' } as const;

export function headerRow(): HTMLElement {
  return h(
    'div',
    { className: 'grid-row grid-row--header', 'aria-hidden': 'true' },
    ...HEADERS.map((c) => h('div', { className: 'grid-head', title: c.title }, c.label)),
  );
}

function tileContent(a: AttributeResult, player: Player): HTMLElement {
  const inner = h('div', { className: 'tile__inner' });
  if (a.key === 'country') {
    inner.append(
      h('span', { className: 'tile__value tile__value--long' }, player.country),
      h('span', { className: 'tile__value tile__value--short' }, countryCode(player.country)),
    );
  } else {
    inner.append(h('span', { className: 'tile__value' }, a.display));
  }
  if (a.sub) inner.append(h('span', { className: 'tile__sub' }, a.sub));
  if (a.direction) {
    const arrow = h('span', { className: `tile__arrow tile__arrow--${a.direction}` });
    arrow.innerHTML = a.direction === 'up' ? ICONS.arrowUp() : ICONS.arrowDown();
    inner.append(arrow);
  }
  if (a.feedback !== 'gray') {
    const mark = h('span', { className: 'tile__mark' });
    mark.innerHTML = a.feedback === 'green' ? ICONS.check() : ICONS.tilde();
    inner.append(mark);
  }
  return inner;
}

function tileTitle(a: AttributeResult, player: Player): string {
  const head = HEADERS.find((x) => x.key === a.key)!.title;
  const value =
    a.key === 'team' ? player.teamName : a.key === 'country' ? player.country : a.display;
  const dir = a.direction ? ` (secret is ${a.direction === 'up' ? 'higher' : 'lower'})` : '';
  return `${head}: ${value} - ${VERDICT[a.feedback]}${dir}`;
}

/**
 * Builds one guess row. With `animate`, tiles flip one by one and the
 * returned promise resolves after the last tile is revealed.
 */
export function guessRow(
  player: Player,
  result: GuessResult,
  animate: boolean,
): { el: HTMLElement; done: Promise<void> } {
  const tiles = result.attributes.map((a) =>
    h(
      'div',
      {
        className: 'tile tile--hidden',
        'data-feedback': a.feedback,
        'data-key': a.key,
        title: tileTitle(a, player),
      },
      tileContent(a, player),
    ),
  );
  const el = h(
    'li',
    { className: `guess${result.correct ? ' guess--correct' : ''}` },
    h('div', { className: 'guess__name' }, player.name.toUpperCase()),
    h('div', { className: 'grid-row' }, ...tiles),
  );

  const reveal = (tile: HTMLElement) => {
    tile.classList.remove('tile--hidden');
    tile.classList.add('tile--revealed');
  };

  if (!animate || prefersReducedMotion()) {
    tiles.forEach(reveal);
    return { el, done: Promise.resolve() };
  }

  const { revealDelayMs, flipMs } = CONFIG.animation;
  const done = (async () => {
    for (const [i, tile] of tiles.entries()) {
      tile.classList.add('tile--flip');
      await wait(flipMs / 2);
      reveal(tile);
      sfx.reveal(result.attributes[i]!.feedback);
      await wait(Math.max(revealDelayMs, flipMs / 2));
      tile.classList.remove('tile--flip');
    }
  })();
  return { el, done };
}
