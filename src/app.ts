import { CONFIG } from './config';
import { describeGuess } from './game/a11y';
import { compareGuess } from './game/compare';
import { dailyPlayerId, dayNumber, localDateKey, randomPlayerId } from './game/daily';
import { applyGuess, GuessError, newGame, sanitizeState, type GameState } from './game/session';
import { buildShareText } from './game/share';
import { effectiveStreak, emptyStats, recordGame, winRate, type Stats } from './game/stats';
import type { GuessResult, Player } from './game/types';
import type { LoadedData } from './data';
import { isSoundOn, setSound, sfx } from './sound';
import { load, pruneDaily, save } from './storage';
import { Autocomplete } from './ui/autocomplete';
import { DialogueBox } from './ui/dialogue';
import { h } from './ui/dom';
import { guessRow, headerRow } from './ui/grid';
import { openModal } from './ui/modal';
import { basketballSvg, ICONS, miniBallSvg, silhouetteSvg } from './ui/pixels';

type Theme = 'gb' | 'gbc';

const MISS_LINES = [
  'A wild GUESS appeared!',
  "It's not very effective...",
  'The guess missed!',
  'Not quite! Try again.',
];

export class App {
  private players: Player[];
  private byId: Map<number, Player>;
  private knownIds: Set<number>;
  private state: GameState | null = null;
  private results: GuessResult[] = [];
  private busy = false;

  private main: HTMLElement;
  private live: HTMLElement;
  private dialogue = new DialogueBox();
  private ac: Autocomplete;
  private list!: HTMLOListElement;
  private lives!: HTMLElement;
  private inputBox!: HTMLElement;
  private endActions!: HTMLElement;
  private modeLabel!: HTMLElement;
  private menuBtn!: HTMLButtonElement;

  constructor(
    private root: HTMLElement,
    private data: LoadedData,
  ) {
    this.players = data.players;
    this.byId = new Map(this.players.map((p) => [p.id, p]));
    this.knownIds = new Set(this.byId.keys());
    this.ac = new Autocomplete(this.players, (p) => void this.submit(p));
    this.main = h('main', { id: 'main', className: 'main', tabindex: '-1' });
    this.live = h('div', { className: 'sr-only', 'aria-live': 'polite', role: 'status' });
    this.applyTheme(load<Theme>('theme', 'gb'));
    this.buildShell();
    pruneDaily(dayNumber(localDateKey()));
    document.addEventListener('keydown', (e) => this.onGlobalKey(e));
  }

  /** Desktop convenience: start typing anywhere to jump into the guess field. */
  private onGlobalKey(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1 || !/\p{L}/u.test(e.key)) return;
    if (!this.state || this.state.status !== 'playing' || this.ac.input.disabled) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, dialog')) return;
    this.ac.input.focus();
  }

  // ------------------------------------------------------------------ shell

  private buildShell(): void {
    this.menuBtn = this.iconButton(ICONS.cursor(), 'Back to title', () => this.showTitle());
    this.menuBtn.classList.add('btn--back');
    const soundBtn = this.iconButton('', '', () => {
      setSound(!isSoundOn());
      syncSound();
      sfx.submit();
    });
    const syncSound = () => {
      soundBtn.innerHTML = isSoundOn() ? ICONS.speakerOn() : ICONS.speakerOff();
      soundBtn.setAttribute(
        'aria-label',
        isSoundOn() ? 'Sound on (click to mute)' : 'Sound off (click to unmute)',
      );
      soundBtn.setAttribute('aria-pressed', String(isSoundOn()));
      soundBtn.title = isSoundOn() ? 'Sound: on' : 'Sound: off';
    };
    syncSound();

    const header = h(
      'header',
      { className: 'topbar' },
      this.menuBtn,
      h('span', { className: 'topbar__title' }, 'HOOPDLE'),
      h(
        'div',
        { className: 'topbar__actions' },
        this.iconButton(ICONS.help(), 'How to play', () => this.showHelp()),
        this.iconButton(ICONS.chart(), 'Statistics', () => this.showStats()),
        this.iconButton(ICONS.palette(), 'Switch colour theme', () => this.toggleTheme()),
        soundBtn,
      ),
    );

    const footer = h(
      'footer',
      { className: 'footer' },
      h('span', {}, `DATA: SEASON ${this.data.season}${this.data.isSample ? ' (SAMPLE)' : ''}`),
      h('span', {}, 'FAN PROJECT. NOT AFFILIATED WITH THE NBA.'),
    );

    this.root.replaceChildren(
      h('a', { className: 'skip-link', href: '#main' }, 'Skip to game'),
      header,
      this.main,
      footer,
      this.live,
    );
  }

  private iconButton(icon: string, label: string, onClick: () => void): HTMLButtonElement {
    const b = h('button', {
      className: 'btn btn--icon',
      type: 'button',
      'aria-label': label,
      title: label,
    });
    b.innerHTML = icon;
    b.addEventListener('click', onClick);
    return b;
  }

  private announce(text: string): void {
    this.live.textContent = '';
    window.setTimeout(() => (this.live.textContent = text), 50);
  }

  private applyTheme(theme: Theme): void {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', theme === 'gb' ? '#0f380f' : '#283078');
  }

  private toggleTheme(): void {
    const next: Theme = document.documentElement.dataset.theme === 'gb' ? 'gbc' : 'gb';
    this.applyTheme(next);
    save('theme', next);
    sfx.move();
  }

  // ------------------------------------------------------------------ title

  showTitle(): void {
    this.state = null;
    this.menuBtn.hidden = true;
    const ball = h('div', { className: 'title__ball' });
    ball.innerHTML = basketballSvg(16);

    const menuItem = (label: string, onClick: () => void) => {
      const b = h('button', { className: 'menu__item', type: 'button' });
      const cursor = h('span', { className: 'menu__cursor', 'aria-hidden': 'true' });
      cursor.innerHTML = ICONS.cursor();
      b.append(cursor, label);
      b.addEventListener('click', () => {
        sfx.submit();
        onClick();
      });
      return b;
    };

    const start = h('button', { className: 'press-start', type: 'button' }, 'PRESS START');
    const startCursor = h('span', {
      className: 'press-start__cursor blink',
      'aria-hidden': 'true',
    });
    startCursor.innerHTML = ICONS.cursor();
    start.prepend(startCursor);
    start.addEventListener('click', () => {
      sfx.submit();
      this.startDaily();
    });

    const day = dayNumber(localDateKey());
    const screen = h(
      'section',
      { className: 'title', 'aria-labelledby': 'title-logo' },
      h(
        'div',
        { className: 'title__stage' },
        h(
          'h1',
          { className: 'logo', id: 'title-logo' },
          h('span', {}, 'HOOP'),
          h('span', {}, 'DLE'),
        ),
        ball,
        h('div', { className: 'title__shadow', 'aria-hidden': 'true' }),
      ),
      h('p', { className: 'title__tag' }, 'GUESS THE NBA PLAYER IN 8 TRIES'),
      h(
        'nav',
        { className: 'menu px-box', 'aria-label': 'Main menu' },
        menuItem(`DAILY #${day}`, () => this.startDaily()),
        menuItem('FREE PLAY', () => this.startFree()),
        menuItem('HOW TO PLAY', () => this.showHelp()),
        menuItem('STATS', () => this.showStats()),
      ),
      start,
    );
    this.main.replaceChildren(screen);
    (screen.querySelector('.menu__item') as HTMLElement).focus({ preventScroll: true });
  }

  // ------------------------------------------------------------------ game setup

  startDaily(): void {
    const dateKey = localDateKey();
    const day = dayNumber(dateKey);
    const stored = sanitizeState(
      load<unknown>(`daily:${day}`, null),
      this.knownIds,
      CONFIG.maxGuesses,
    );
    const state =
      stored && stored.mode === 'daily'
        ? stored
        : newGame('daily', dailyPlayerId([...this.knownIds], dateKey), { dateKey, day });
    this.startGame(state);
  }

  startFree(fresh = false): void {
    const stored = fresh
      ? null
      : sanitizeState(load<unknown>('free', null), this.knownIds, CONFIG.maxGuesses);
    const state =
      stored && stored.mode === 'free' && stored.status === 'playing'
        ? stored
        : newGame('free', randomPlayerId([...this.knownIds], this.state?.secretId));
    this.startGame(state);
  }

  private persist(): void {
    if (!this.state) return;
    if (this.state.mode === 'daily') save(`daily:${this.state.day}`, this.state);
    else save('free', this.state);
  }

  private startGame(state: GameState): void {
    this.state = state;
    this.persist();
    this.menuBtn.hidden = false;
    const secret = this.secret();
    this.results = state.guessIds.map((id) => compareGuess(this.byId.get(id)!, secret));

    this.modeLabel = h('span', {}, state.mode === 'daily' ? `DAILY #${state.day}` : 'FREE PLAY');
    this.lives = h('div', { className: 'lives', role: 'img' });
    this.list = h('ol', { className: 'guesses', 'aria-label': 'Your guesses, newest first' });

    const label = h(
      'label',
      { className: 'inputbox__label', for: this.ac.input.id },
      'GUESS A PLAYER:',
    );
    const guessBtn = h('button', { className: 'btn', type: 'button' }, 'GUESS');
    guessBtn.addEventListener('click', () => {
      const p = this.ac.current();
      if (p) {
        this.ac.clear();
        void this.submit(p);
      } else {
        sfx.error();
        this.dialogue.say('Pick a player from the list first!');
        this.ac.input.focus();
      }
    });
    this.inputBox = h(
      'div',
      { className: 'inputbox px-box' },
      label,
      h('div', { className: 'inputbox__row' }, this.ac.el, guessBtn),
    );
    this.endActions = h('div', { className: 'end-actions' });

    this.main.replaceChildren(
      h(
        'section',
        { className: 'game', 'aria-label': 'Game board' },
        h('div', { className: 'statusline' }, this.modeLabel, this.lives),
        this.dialogue.el,
        this.inputBox,
        this.endActions,
        h('div', { className: 'board' }, headerRow(), this.list),
      ),
    );

    for (let i = this.results.length - 1; i >= 0; i--) {
      this.list.append(guessRow(this.byId.get(state.guessIds[i]!)!, this.results[i]!, false).el);
    }
    this.ac.setExcluded(new Set(state.guessIds));
    this.renderLives();

    if (state.status === 'playing') {
      this.ac.setDisabled(false);
      this.dialogue.say(
        state.guessIds.length === 0
          ? 'A wild PLAYER appeared! Who is it?'
          : `Welcome back! ${this.left()} guesses left.`,
      );
      this.ac.input.focus({ preventScroll: true });
    } else {
      this.showEndState(false);
    }
  }

  private secret(): Player {
    return this.byId.get(this.state!.secretId)!;
  }

  private left(): number {
    return CONFIG.maxGuesses - (this.state?.guessIds.length ?? 0);
  }

  private renderLives(): void {
    const used = this.state?.guessIds.length ?? 0;
    this.lives.setAttribute(
      'aria-label',
      `Guess ${Math.min(used + 1, CONFIG.maxGuesses)} of ${CONFIG.maxGuesses}`,
    );
    this.lives.replaceChildren(
      h('span', { className: 'lives__count' }, `${used}/${CONFIG.maxGuesses}`),
      ...Array.from({ length: CONFIG.maxGuesses }, (_, i) => {
        const s = h('span', { className: `lives__ball${i < used ? ' is-used' : ''}` });
        s.innerHTML = miniBallSvg();
        return s;
      }),
    );
  }

  // ------------------------------------------------------------------ guessing

  private async submit(player: Player): Promise<void> {
    if (!this.state || this.busy) return;
    let next: GameState;
    try {
      next = applyGuess(this.state, player.id, CONFIG.maxGuesses);
    } catch (e) {
      if (e instanceof GuessError) {
        sfx.error();
        this.dialogue.say(
          e.message === 'Already guessed' ? `${player.name} was already guessed!` : e.message,
        );
        return;
      }
      throw e;
    }
    sfx.submit();
    this.busy = true;
    this.ac.setDisabled(true);
    this.state = next;
    this.persist();

    const result = compareGuess(player, this.secret());
    this.results.push(result);
    this.ac.setExcluded(new Set(next.guessIds));
    this.renderLives();

    const row = guessRow(player, result, true);
    this.list.prepend(row.el);
    this.dialogue.say(`You guessed ${player.name}...`);
    await row.done;
    this.announce(describeGuess(player.name, result, player.heightInches));
    this.busy = false;

    if (next.status === 'playing') {
      this.ac.setDisabled(false);
      const hits = result.attributes.filter((a) => a.feedback !== 'gray').length;
      const line =
        hits >= 4
          ? "It's effective! Getting close."
          : MISS_LINES[next.guessIds.length % MISS_LINES.length]!;
      this.dialogue.say(`${line} ${this.left()} ${this.left() === 1 ? 'guess' : 'guesses'} left.`);
      this.ac.input.focus({ preventScroll: true });
    } else {
      this.finishGame();
    }
  }

  private finishGame(): void {
    const s = this.state!;
    if (s.mode === 'daily' && s.day !== undefined) {
      const stats = recordGame(this.loadStats(), {
        day: s.day,
        won: s.status === 'won',
        guesses: s.guessIds.length,
      });
      save('stats', stats);
    }
    if (s.status === 'won') sfx.win();
    else sfx.lose();
    this.showEndState(true);
  }

  private showEndState(openDialog: boolean): void {
    const s = this.state!;
    const secret = this.secret();
    this.ac.setDisabled(true);
    this.inputBox.hidden = true;
    const msg =
      s.status === 'won'
        ? `It's super effective! It was ${secret.name}!`
        : `Game over... It was ${secret.name}.`;
    this.dialogue.say(msg);
    this.announce(msg);

    const results = h('button', { className: 'btn', type: 'button' }, 'RESULTS');
    results.addEventListener('click', () => this.showEnd());
    const share = this.shareButton();
    const again = h(
      'button',
      { className: 'btn btn--primary', type: 'button' },
      s.mode === 'free' ? 'NEW GAME' : 'FREE PLAY',
    );
    again.addEventListener('click', () => this.startFree(true));
    this.endActions.replaceChildren(results, share, again);
    this.endActions.hidden = false;

    if (openDialog) window.setTimeout(() => this.showEnd(), 600);
    else results.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------------ dialogs

  private shareText(): string {
    const s = this.state!;
    return buildShareText({
      mode: s.mode,
      dayNumber: s.day,
      results: this.results,
      won: s.status === 'won',
      maxGuesses: CONFIG.maxGuesses,
      url: `${location.origin}${import.meta.env.BASE_URL}`,
    });
  }

  private shareButton(): HTMLButtonElement {
    const b = h('button', { className: 'btn', type: 'button' }, 'SHARE');
    b.addEventListener('click', async () => {
      const ok = await copyText(this.shareText());
      b.textContent = ok ? 'COPIED!' : 'COPY FAILED';
      this.announce(ok ? 'Result copied to clipboard' : 'Could not copy to clipboard');
      sfx.submit();
      window.setTimeout(() => (b.textContent = 'SHARE'), 1800);
    });
    return b;
  }

  private showEnd(): void {
    const s = this.state;
    if (!s || s.status === 'playing') return;
    const p = this.secret();
    const won = s.status === 'won';

    const body = h(
      'div',
      { className: 'end' },
      headshot(p),
      h('p', { className: 'end__name' }, p.name.toUpperCase()),
      h('p', { className: 'end__team' }, `${p.teamName.toUpperCase()} #${p.jersey}`),
      h(
        'p',
        { className: 'end__score' },
        won
          ? `SOLVED IN ${s.guessIds.length}/${CONFIG.maxGuesses}`
          : `NO LUCK THIS TIME (X/${CONFIG.maxGuesses})`,
      ),
    );
    const actions = h('div', { className: 'end__actions' }, this.shareButton());
    if (s.mode === 'free') {
      const again = h('button', { className: 'btn btn--primary', type: 'button' }, 'NEW GAME');
      again.addEventListener('click', () => {
        close();
        this.startFree(true);
      });
      actions.append(again);
    } else {
      body.append(this.statsBlock(), countdown());
      const free = h('button', { className: 'btn btn--primary', type: 'button' }, 'FREE PLAY');
      free.addEventListener('click', () => {
        close();
        this.startFree(true);
      });
      actions.append(free);
    }
    body.append(actions);
    const close = openModal(won ? 'YOU WIN!' : 'GAME OVER', body);
  }

  private loadStats(): Stats {
    const s = load<Stats | null>('stats', null);
    return s && Array.isArray(s.distribution) ? s : emptyStats(CONFIG.maxGuesses);
  }

  private statsBlock(): HTMLElement {
    const stats = this.loadStats();
    const today = dayNumber(localDateKey());
    const tile = (value: string | number, label: string) =>
      h(
        'div',
        { className: 'stat' },
        h('span', { className: 'stat__value' }, String(value)),
        h('span', { className: 'stat__label' }, label),
      );
    const max = Math.max(1, ...stats.distribution);
    const lastWinGuesses =
      this.state?.mode === 'daily' && this.state.status === 'won' ? this.state.guessIds.length : -1;
    return h(
      'div',
      { className: 'stats' },
      h(
        'div',
        { className: 'stats__row' },
        tile(stats.played, 'PLAYED'),
        tile(`${winRate(stats)}%`, 'WIN %'),
        tile(effectiveStreak(stats, today), 'STREAK'),
        tile(stats.maxStreak, 'MAX'),
      ),
      h('h3', { className: 'stats__title' }, 'GUESS DISTRIBUTION'),
      h(
        'ol',
        { className: 'dist', 'aria-label': 'Wins by number of guesses' },
        ...stats.distribution.map((n, i) =>
          h(
            'li',
            { className: 'dist__row', 'aria-label': `${i + 1} guesses: ${n} wins` },
            h('span', { className: 'dist__n', 'aria-hidden': 'true' }, String(i + 1)),
            h(
              'span',
              {
                className: `dist__bar${i + 1 === lastWinGuesses ? ' is-current' : ''}`,
                style: `--w:${Math.max(8, Math.round((n / max) * 100))}%`,
                'aria-hidden': 'true',
              },
              String(n),
            ),
          ),
        ),
      ),
      h('p', { className: 'stats__note' }, 'STATS COUNT DAILY GAMES ONLY.'),
    );
  }

  showStats(): void {
    openModal('STATISTICS', this.statsBlock());
  }

  showHelp(): void {
    const legend = (fb: string, title: string, text: string) => {
      const sw = h('span', {
        className: `legend__swatch tile tile--revealed`,
        'data-feedback': fb,
        'aria-hidden': 'true',
      });
      const mark = h('span', { className: 'tile__mark' });
      mark.innerHTML = fb === 'green' ? ICONS.check() : fb === 'yellow' ? ICONS.tilde() : '';
      sw.append(mark);
      return h(
        'li',
        { className: 'legend__item' },
        sw,
        h('span', {}, h('strong', {}, title), ` ${text}`),
      );
    };

    const example = this.exampleRow();
    const body = h(
      'div',
      { className: 'help' },
      h('p', {}, `FIND THE SECRET NBA PLAYER IN ${CONFIG.maxGuesses} GUESSES.`),
      h('p', {}, 'TYPE A NAME, PICK A PLAYER FROM THE LIST. EACH GUESS SHOWS HOW CLOSE YOU ARE:'),
      h(
        'ul',
        { className: 'legend' },
        legend('green', 'GREEN', '= EXACT MATCH'),
        legend('yellow', 'YELLOW', '= CLOSE'),
        legend('gray', 'DARK', '= NO MATCH'),
      ),
      h(
        'ul',
        { className: 'rules' },
        h('li', {}, 'TEAM: YELLOW = SAME DIVISION. SMALL TEXT SHOWS THE CONFERENCE.'),
        h('li', {}, 'POS: YELLOW = SHARES A POSITION (G VS G-F).'),
        h('li', {}, `HT: YELLOW = WITHIN ${CONFIG.thresholds.heightInches} INCHES.`),
        h('li', {}, `AGE: YELLOW = WITHIN ${CONFIG.thresholds.ageYears} YEARS.`),
        h('li', {}, `NO.: YELLOW = JERSEY WITHIN ${CONFIG.thresholds.jersey}.`),
        h('li', {}, 'NAT: YELLOW = SAME CONTINENT.'),
        h('li', {}, 'ARROWS SHOW IF THE SECRET VALUE IS HIGHER OR LOWER.'),
      ),
      example ? h('h3', { className: 'help__example-title' }, 'EXAMPLE') : null,
      example,
      h(
        'p',
        {},
        'DAILY: SAME PLAYER FOR EVERYONE, NEW ONE AT MIDNIGHT (LOCAL TIME). FREE PLAY: UNLIMITED RANDOM ROUNDS.',
      ),
    );
    openModal('HOW TO PLAY', body);
  }

  /** Example: two fixed players from the data, compared statically. */
  private exampleRow(): HTMLElement | null {
    if (this.players.length < 2) return null;
    const sorted = [...this.players].sort((a, b) => a.id - b.id);
    const guess = sorted[0]!;
    const secret =
      sorted.find((p) => p.id !== guess.id && p.division === guess.division) ??
      sorted.find((p) => p.id !== guess.id)!;
    const result = compareGuess(guess, secret);
    const row = guessRow(guess, result, false).el;
    return h(
      'div',
      { className: 'board board--example' },
      headerRow(),
      h('ol', { className: 'guesses' }, row),
    );
  }
}

// ------------------------------------------------------------------ helpers

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = h('textarea', { 'aria-hidden': 'true', className: 'sr-only' });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    let ok: boolean;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

/** Headshot drawn into a tiny canvas and upscaled for a pixel look. */
function headshot(p: Player): HTMLElement {
  const frame = h('div', { className: 'headshot px-box' });
  const fallback = () => {
    frame.innerHTML = silhouetteSvg();
    frame.classList.add('headshot--missing');
  };
  const canvas = h('canvas', {
    width: 52,
    height: 38,
    className: 'headshot__canvas',
    role: 'img',
    'aria-label': `Photo of ${p.name}`,
  });
  frame.append(canvas);
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return fallback();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.onerror = fallback;
  img.src = CONFIG.headshotUrl(p.id);
  return frame;
}

function countdown(): HTMLElement {
  const el = h('p', { className: 'countdown' });
  const tick = () => {
    if (!el.isConnected && el.dataset.started) return window.clearInterval(timer);
    el.dataset.started = '1';
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const ms = next.getTime() - now.getTime();
    const hh = String(Math.floor(ms / 3_600_000)).padStart(2, '0');
    const mm = String(Math.floor((ms / 60_000) % 60)).padStart(2, '0');
    const ss = String(Math.floor((ms / 1000) % 60)).padStart(2, '0');
    el.textContent = `NEXT PLAYER IN ${hh}:${mm}:${ss}`;
  };
  const timer = window.setInterval(tick, 1000);
  tick();
  return el;
}
