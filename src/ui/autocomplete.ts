import { CONFIG } from '../config';
import { searchPlayers } from '../game/search';
import type { Player } from '../game/types';
import { sfx } from '../sound';
import { h } from './dom';
import { ICONS } from './pixels';

let uid = 0;

/**
 * Accessible combobox (ARIA 1.2 pattern): input + listbox, keyboard
 * navigation with up/down/enter/escape, mouse and touch selection.
 */
export class Autocomplete {
  readonly el: HTMLElement;
  readonly input: HTMLInputElement;
  private list: HTMLUListElement;
  private items: Player[] = [];
  private active = -1;
  private exclude: ReadonlySet<number> = new Set();

  constructor(
    private players: readonly Player[],
    private onPick: (player: Player) => void,
  ) {
    const id = `ac-${++uid}`;
    this.input = h('input', {
      id: `${id}-input`,
      className: 'ac__input',
      type: 'text',
      role: 'combobox',
      autocomplete: 'off',
      autocapitalize: 'words',
      spellcheck: 'false',
      'aria-autocomplete': 'list',
      'aria-expanded': 'false',
      'aria-controls': `${id}-list`,
      placeholder: 'TYPE A NAME...',
      enterkeyhint: 'go',
    });
    this.list = h('ul', {
      id: `${id}-list`,
      className: 'ac__list px-box',
      role: 'listbox',
      'aria-label': 'Matching players',
      hidden: true,
    });
    this.el = h('div', { className: 'ac' }, this.input, this.list);

    this.input.addEventListener('input', () => {
      sfx.key();
      this.update();
    });
    this.input.addEventListener('keydown', (e) => this.onKey(e));
    this.input.addEventListener('blur', () => window.setTimeout(() => this.close(), 150));
    this.input.addEventListener('focus', () => {
      this.update();
      // Touch devices: move the field up so the on-screen keyboard does not
      // cover the suggestion list.
      if (window.matchMedia?.('(pointer: coarse)').matches) {
        window.setTimeout(
          () => this.el.scrollIntoView({ block: 'start', behavior: 'smooth' }),
          300,
        );
      }
    });
  }

  /** Updates translated texts. */
  setTexts(placeholder: string, listLabel: string): void {
    this.input.placeholder = placeholder;
    this.list.setAttribute('aria-label', listLabel);
  }

  setExcluded(ids: ReadonlySet<number>): void {
    this.exclude = ids;
  }

  setDisabled(disabled: boolean): void {
    this.input.disabled = disabled;
    if (disabled) this.close();
  }

  clear(): void {
    this.input.value = '';
    this.close();
  }

  /** Player to submit with the GUESS button: highlighted, exact name or single match. */
  current(): Player | null {
    if (this.active >= 0) return this.items[this.active] ?? null;
    const all = searchPlayers(this.players, this.input.value, {
      exclude: this.exclude,
      limit: CONFIG.autocomplete.maxSuggestions,
    });
    if (all.length === 1) return all[0]!;
    const exact = all.find((p) => p.name.toLowerCase() === this.input.value.trim().toLowerCase());
    return exact ?? null;
  }

  private update(): void {
    this.items = searchPlayers(this.players, this.input.value, { exclude: this.exclude });
    this.active = this.items.length > 0 ? 0 : -1;
    this.render();
  }

  private render(): void {
    this.list.replaceChildren(
      ...this.items.map((p, i) => {
        const opt = h(
          'li',
          {
            id: `${this.list.id}-${i}`,
            className: 'ac__option',
            role: 'option',
            'aria-selected': String(i === this.active),
          },
          h('span', { className: 'ac__cursor', 'aria-hidden': 'true' }),
          h('span', { className: 'ac__name' }, p.name.toUpperCase()),
        );
        opt.querySelector('.ac__cursor')!.innerHTML = ICONS.cursor();
        // pointerdown fires before blur, so the list is still there on touch
        opt.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          this.pick(p);
        });
        opt.addEventListener('pointermove', () => this.setActive(i, false));
        return opt;
      }),
    );
    const open = this.items.length > 0;
    this.list.hidden = !open;
    this.input.setAttribute('aria-expanded', String(open));
    this.syncActive();
  }

  private setActive(i: number, scroll = true): void {
    if (i === this.active) return;
    this.active = i;
    this.syncActive(scroll);
  }

  private syncActive(scroll = true): void {
    [...this.list.children].forEach((li, i) =>
      li.setAttribute('aria-selected', String(i === this.active)),
    );
    const activeEl = this.active >= 0 ? this.list.children[this.active] : null;
    if (activeEl) {
      this.input.setAttribute('aria-activedescendant', activeEl.id);
      if (scroll) activeEl.scrollIntoView({ block: 'nearest' });
    } else {
      this.input.removeAttribute('aria-activedescendant');
    }
  }

  private close(): void {
    this.items = [];
    this.active = -1;
    this.render();
  }

  private pick(p: Player): void {
    this.clear();
    this.onPick(p);
  }

  private onKey(e: KeyboardEvent): void {
    const n = this.items.length;
    switch (e.key) {
      case 'ArrowDown':
        if (!n) return;
        e.preventDefault();
        sfx.move();
        this.setActive((this.active + 1) % n);
        break;
      case 'ArrowUp':
        if (!n) return;
        e.preventDefault();
        sfx.move();
        this.setActive((this.active - 1 + n) % n);
        break;
      case 'Enter': {
        e.preventDefault();
        const p = this.current();
        if (p) this.pick(p);
        else sfx.error();
        break;
      }
      case 'Escape':
        if (n) {
          e.preventDefault();
          e.stopPropagation();
          this.close();
        }
        break;
    }
  }
}
