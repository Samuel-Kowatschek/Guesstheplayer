import { CONFIG } from '../config';
import { countryCode } from '../game/countries';
import type { AttributeKey, AttributeResult, GuessResult, Player } from '../game/types';
import { divisionShort, type Strings } from '../i18n';
import { sfx } from '../sound';
import { h, prefersReducedMotion, wait } from './dom';
import { ICONS } from './pixels';

const KEYS: AttributeKey[] = ['team', 'position', 'height', 'age', 'jersey', 'country'];

export function headerRow(s: Strings): HTMLElement {
  return h(
    'div',
    { className: 'grid-row grid-row--header', 'aria-hidden': 'true' },
    ...KEYS.map((k) =>
      h('div', { className: 'grid-head', title: s.headers[k][1] }, s.headers[k][0]),
    ),
  );
}

function conferenceText(a: AttributeResult, s: Strings): string {
  return a.sub === 'East' ? s.east : s.west;
}

function tileContent(a: AttributeResult, player: Player, s: Strings): HTMLElement {
  const inner = h('div', { className: 'tile__inner' });
  if (a.key === 'country') {
    inner.append(
      h('span', { className: 'tile__value tile__value--long' }, player.country),
      h('span', { className: 'tile__value tile__value--short' }, countryCode(player.country)),
    );
  } else {
    inner.append(h('span', { className: 'tile__value' }, a.display));
  }
  if (a.key === 'team') {
    // Conference + division of the guessed player, so a yellow team tile
    // ("same division") can be read directly from the board.
    inner.append(h('span', { className: 'tile__sub' }, conferenceText(a, s)));
    if (a.detail) {
      inner.append(
        h('span', { className: 'tile__div tile__div--short' }, divisionShort(a.detail)),
        h('span', { className: 'tile__div tile__div--long' }, a.detail.toUpperCase()),
      );
    }
  } else if (a.sub) {
    inner.append(h('span', { className: 'tile__sub' }, a.sub));
  }
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

function tileTitle(a: AttributeResult, player: Player, s: Strings): string {
  const head = s.headers[a.key][1];
  let value = a.display;
  if (a.key === 'team')
    value = `${player.teamName} (${conferenceText(a, s)}, ${s.division(player.division)})`;
  if (a.key === 'country') value = player.country;
  const dir = a.direction ? ` (${a.direction === 'up' ? s.secretHigher : s.secretLower})` : '';
  return `${head}: ${value} - ${s.verdict[a.feedback]}${dir}`;
}

/**
 * Builds one guess row. With `animate`, tiles flip one by one and the
 * returned promise resolves after the last tile is revealed.
 */
export function guessRow(
  player: Player,
  result: GuessResult,
  animate: boolean,
  s: Strings,
): { el: HTMLElement; done: Promise<void> } {
  const tiles = result.attributes.map((a) =>
    h(
      'div',
      {
        className: 'tile tile--hidden',
        'data-feedback': a.feedback,
        'data-key': a.key,
        title: tileTitle(a, player, s),
      },
      tileContent(a, player, s),
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
