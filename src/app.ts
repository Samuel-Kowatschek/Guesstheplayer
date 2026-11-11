import { CONFIG } from './config';
import { describeGuess } from './game/a11y';
import { compareGuess } from './game/compare';
import { dailyPlayerId, dayNumber, localDateKey, randomPlayerId } from './game/daily';
import { applyGuess, GuessError, newGame, sanitizeState, type GameState } from './game/session';
import { buildShareText } from './game/share';
import { effectiveStreak, emptyStats, recordGame, winRate, type Stats } from './game/stats';
import type { GuessResult, Player } from './game/types';
import type { LoadedData } from './data';
import { detectLang, strings, type Lang, type Strings } from './i18n';
import { isSoundOn, setSound, sfx } from './sound';
import { load, pruneDaily, save } from './storage';
import { Autocomplete } from './ui/autocomplete';
import { DialogueBox } from './ui/dialogue';
import { depixelate } from './ui/depixelate';
import { h, prefersReducedMotion } from './ui/dom';
import { guessRow, headerRow } from './ui/grid';
import { openModal } from './ui/modal';
import { basketballSvg, ICONS, miniBallSvg, silhouetteSvg } from './ui/pixels';
import { openShareMenu } from './ui/shareMenu';

type Theme = 'gb' | 'gbc';
/** Blue colour handheld palette is the default; green is the alternative. */
const DEFAULT_THEME: Theme = 'gbc';

export class App {
  private players: Player[];
  private byId: Map<number, Player>;
  private knownIds: Set<number>;
  private state: GameState | null = null;
  private results: GuessResult[] = [];
  private busy = false;
  private lang: Lang;
  private s: Strings;

  private main: HTMLElement;
  private live: HTMLElement;
  private dialogue = new DialogueBox();
  private ac: Autocomplete;
  private list!: HTMLOListElement;
  private lives!: HTMLElement;
  private inputBox!: HTMLElement;
  private endActions!: HTMLElement;
  private menuBtn!: HTMLButtonElement;

  constructor(
    private root: HTMLElement,
    private data: LoadedData,
  ) {
    this.players = data.players;
    this.byId = new Map(this.players.map((p) => [p.id, p]));
    this.knownIds = new Set(this.byId.keys());
    this.lang = detectLang(
      load<unknown>('lang', null),
      navigator.languages ?? [navigator.language],
    );
    this.s = strings(this.lang);
    document.documentElement.lang = this.lang;
    this.ac = new Autocomplete(this.players, (p) => void this.submit(p));
    this.main = h('main', { id: 'main', className: 'main', tabindex: '-1' });
    this.live = h('div', { className: 'sr-only', 'aria-live': 'polite', role: 'status' });
    const theme = load<Theme>('theme', DEFAULT_THEME);
    this.applyTheme(theme === 'gb' ? 'gb' : 'gbc');
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
    const s = this.s;
    this.ac.setTexts(s.placeholder, s.matchingPlayers);
    this.menuBtn = this.iconButton(ICONS.cursor(), s.backToTitle, () => this.showTitle());
    this.menuBtn.classList.add('btn--back');
    this.menuBtn.hidden = this.state === null;

    const soundBtn = this.iconButton('', '', () => {
      setSound(!isSoundOn());
      syncSound();
      sfx.submit();
    });
    const syncSound = () => {
      soundBtn.innerHTML = isSoundOn() ? ICONS.speakerOn() : ICONS.speakerOff();
      soundBtn.setAttribute('aria-label', isSoundOn() ? s.soundOnLabel : s.soundOffLabel);
      soundBtn.setAttribute('aria-pressed', String(isSoundOn()));
      soundBtn.title = isSoundOn() ? s.soundOnTitle : s.soundOffTitle;
    };
    syncSound();

    const langBtn = h(
      'button',
      {
        className: 'btn btn--icon btn--lang',
        type: 'button',
        'aria-label': s.switchLang,
        title: s.switchLang,
        lang: this.lang === 'de' ? 'en' : 'de',
      },
      s.langButton,
    );
    langBtn.addEventListener('click', () => this.toggleLang());

    const header = h(
      'header',
      { className: 'topbar' },
      this.menuBtn,
      h('span', { className: 'topbar__title' }, 'HOOPDLE'),
      h(
        'div',
        { className: 'topbar__actions' },
        langBtn,
        this.iconButton(ICONS.help(), s.howToPlay, () => this.showHelp()),
        this.iconButton(ICONS.chart(), s.statistics, () => this.showStats()),
        this.iconButton(ICONS.palette(), s.switchTheme, () => this.toggleTheme()),
        soundBtn,
      ),
    );

    const footer = h(
      'footer',
      { className: 'footer' },
      h('span', {}, s.dataSeason(this.data.season, this.data.isSample)),
      h('span', {}, s.disclaimer),
    );

    this.root.replaceChildren(
      h('a', { className: 'skip-link', href: '#main' }, s.skipLink),
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

  /** Switches DE/EN and re-renders the current screen (no state is lost). */
  private toggleLang(): void {
    if (this.busy) return;
    this.lang = this.lang === 'de' ? 'en' : 'de';
    this.s = strings(this.lang);
    document.documentElement.lang = this.lang;
    save('lang', this.lang);
    sfx.move();
    this.buildShell();
    if (this.state) this.startGame(this.state);
    else this.showTitle();
    (this.root.querySelector('.btn--lang') as HTMLElement | null)?.focus();
  }

  // ------------------------------------------------------------------ title

  showTitle(): void {
    const s = this.s;
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

    const start = h('button', { className: 'press-start', type: 'button' }, s.pressStart);
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
      h('p', { className: 'title__tag' }, s.tagline(CONFIG.maxGuesses)),
      h(
        'nav',
        { className: 'menu px-box', 'aria-label': s.mainMenu },
        menuItem(s.daily(day), () => this.startDaily()),
        menuItem(s.freePlay, () => this.startFree()),
        menuItem(s.howToPlayMenu, () => this.showHelp()),
        menuItem(s.statsMenu, () => this.showStats()),
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
    const s = this.s;
    this.state = state;
    this.persist();
    this.menuBtn.hidden = false;
    const secret = this.secret();
    this.results = state.guessIds.map((id) => compareGuess(this.byId.get(id)!, secret));

    const modeLabel = h('span', {}, state.mode === 'daily' ? s.daily(state.day ?? 0) : s.freePlay);
    this.lives = h('div', { className: 'lives', role: 'img' });
    this.list = h('ol', { className: 'guesses', 'aria-label': s.guessesList });

    const label = h('label', { className: 'inputbox__label', for: this.ac.input.id }, s.guessLabel);
    const guessBtn = h('button', { className: 'btn', type: 'button' }, s.guessButton);
    guessBtn.addEventListener('click', () => {
      const p = this.ac.current();
      if (p) {
        this.ac.clear();
        void this.submit(p);
      } else {
        sfx.error();
        this.dialogue.say(s.pickFirst);
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
        { className: 'game', 'aria-label': s.gameBoard },
        h('div', { className: 'statusline' }, modeLabel, this.lives),
        this.dialogue.el,
        this.inputBox,
        this.endActions,
        h('div', { className: 'board' }, headerRow(s), this.list),
      ),
    );

    for (let i = this.results.length - 1; i >= 0; i--) {
      this.list.append(guessRow(this.byId.get(state.guessIds[i]!)!, this.results[i]!, false, s).el);
    }
    this.ac.setExcluded(new Set(state.guessIds));
    this.renderLives();

    if (state.status === 'playing') {
      this.ac.setDisabled(false);
      this.dialogue.say(state.guessIds.length === 0 ? s.intro : s.welcomeBack(this.left()));
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
      this.s.livesLabel(Math.min(used + 1, CONFIG.maxGuesses), CONFIG.maxGuesses),
    );
    this.lives.replaceChildren(
      h('span', { className: 'lives__count' }, `${used}/${CONFIG.maxGuesses}`),
      ...Array.from({ length: CONFIG.maxGuesses }, (_, i) => {
        const el = h('span', { className: `lives__ball${i < used ? ' is-used' : ''}` });
        el.innerHTML = miniBallSvg();
        return el;
      }),
    );
  }

  // ------------------------------------------------------------------ guessing

  private async submit(player: Player): Promise<void> {
    if (!this.state || this.busy) return;
    const s = this.s;
    let next: GameState;
    try {
      next = applyGuess(this.state, player.id, CONFIG.maxGuesses);
    } catch (e) {
      if (e instanceof GuessError) {
        sfx.error();
        this.dialogue.say(
          e.message === 'Already guessed' ? s.alreadyGuessed(player.name) : s.gameOverError,
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

    const row = guessRow(player, result, true, s);
    this.list.prepend(row.el);
    this.dialogue.say(s.shotTaken(player.name));
    await row.done;
    this.announce(describeGuess(player.name, result, player.heightInches, s.a11y));
    this.busy = false;

    if (next.status === 'playing') {
      this.ac.setDisabled(false);
      const hits = result.attributes.filter((a) => a.feedback !== 'gray').length;
      const line =
        hits >= 4 ? s.closeLine : s.missLines[next.guessIds.length % s.missLines.length]!;
      this.dialogue.say(`${line} ${s.left(this.left())}`);
      this.ac.input.focus({ preventScroll: true });
    } else {
      this.finishGame();
    }
  }

  private finishGame(): void {
    const st = this.state!;
    if (st.mode === 'daily' && st.day !== undefined) {
      const stats = recordGame(this.loadStats(), {
        day: st.day,
        won: st.status === 'won',
        guesses: st.guessIds.length,
      });
      save('stats', stats);
    }
    if (st.status === 'won') sfx.win();
    else sfx.lose();
    this.showEndState(true);
  }

  private showEndState(openDialog: boolean): void {
    const s = this.s;
    const st = this.state!;
    const secret = this.secret();
    this.ac.setDisabled(true);
    this.inputBox.hidden = true;
    const msg = st.status === 'won' ? s.win(secret.name) : s.loss(secret.name);
    this.dialogue.say(msg);
    this.announce(msg);

    const results = h('button', { className: 'btn', type: 'button' }, s.results);
    results.addEventListener('click', () => this.showEnd());
    const again = h(
      'button',
      { className: 'btn btn--primary', type: 'button' },
      st.mode === 'free' ? s.newGame : s.freePlay,
    );
    again.addEventListener('click', () => this.startFree(true));
    this.endActions.replaceChildren(results, this.shareButton(), again);
    this.endActions.hidden = false;

    if (openDialog) window.setTimeout(() => this.showEnd(), 600);
    else results.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------------ dialogs

  private shareButton(): HTMLButtonElement {
    const b = h(
      'button',
      { className: 'btn', type: 'button', 'aria-haspopup': 'dialog' },
      this.s.share,
    );
    b.addEventListener('click', () => {
      const st = this.state!;
      sfx.submit();
      openShareMenu({
        text: buildShareText({
          mode: st.mode,
          dayNumber: st.day,
          results: this.results,
          won: st.status === 'won',
          maxGuesses: CONFIG.maxGuesses,
        }),
        url: `${location.origin}${import.meta.env.BASE_URL}`,
        s: this.s,
        announce: (m) => this.announce(m),
      });
    });
    return b;
  }

  private showEnd(): void {
    const s = this.s;
    const st = this.state;
    if (!st || st.status === 'playing') return;
    const p = this.secret();
    const won = st.status === 'won';

    const body = h(
      'div',
      { className: 'end' },
      headshot(p, s),
      h('p', { className: 'end__name' }, p.name.toUpperCase()),
      h('p', { className: 'end__team' }, `${p.teamName.toUpperCase()} #${p.jersey}`),
      h(
        'p',
        { className: 'end__score' },
        won ? s.solvedIn(st.guessIds.length, CONFIG.maxGuesses) : s.noLuck(CONFIG.maxGuesses),
      ),
    );
    const actions = h('div', { className: 'end__actions' }, this.shareButton());
    const again = h(
      'button',
      { className: 'btn btn--primary', type: 'button' },
      st.mode === 'free' ? s.newGame : s.freePlay,
    );
    again.addEventListener('click', () => {
      close();
      this.startFree(true);
    });
    if (st.mode === 'daily') body.append(this.statsBlock(), countdown(s));
    actions.append(again);
    body.append(actions);
    const close = openModal(won ? s.youWin : s.gameOver, body, { closeLabel: s.close_ });
  }

  private loadStats(): Stats {
    const st = load<Stats | null>('stats', null);
    return st && Array.isArray(st.distribution) ? st : emptyStats(CONFIG.maxGuesses);
  }

  private statsBlock(): HTMLElement {
    const s = this.s;
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
        tile(stats.played, s.played),
        tile(`${winRate(stats)}%`, s.winPct),
        tile(effectiveStreak(stats, today), s.streak),
        tile(stats.maxStreak, s.maxStreak),
      ),
      h('h3', { className: 'stats__title' }, s.distribution),
      h(
        'ol',
        { className: 'dist', 'aria-label': s.distributionLabel },
        ...stats.distribution.map((n, i) =>
          h(
            'li',
            { className: 'dist__row', 'aria-label': s.distRow(i + 1, n) },
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
      h('p', { className: 'stats__note' }, s.statsNote),
    );
  }

  showStats(): void {
    openModal(this.s.statsTitle, this.statsBlock(), { closeLabel: this.s.close_ });
  }

  showHelp(): void {
    const s = this.s;
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
      h('p', {}, s.helpGoal(CONFIG.maxGuesses)),
      h('p', {}, s.helpHow),
      h(
        'ul',
        { className: 'legend' },
        legend('green', s.green, s.exact),
        legend('yellow', s.yellow, s.close),
        legend('gray', s.dark, s.noMatch),
      ),
      h('ul', { className: 'rules' }, ...s.rules(CONFIG.thresholds).map((r) => h('li', {}, r))),
      example ? h('h3', { className: 'help__example-title' }, s.example) : null,
      example,
      h('p', {}, s.helpModes),
    );
    openModal(s.helpTitle, body, { closeLabel: s.close_ });
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
    const row = guessRow(guess, result, false, this.s).el;
    return h(
      'div',
      { className: 'board board--example' },
      headerRow(this.s),
      h('ol', { className: 'guesses' }, row),
    );
  }
}

// ------------------------------------------------------------------ helpers

/**
 * Headshot: drawn at full display resolution, starting blocky and
 * sharpening in a quick stepped animation (see ui/depixelate.ts).
 */
function headshot(p: Player, s: Strings): HTMLElement {
  const frame = h('div', { className: 'headshot px-box' });
  const fallback = () => {
    frame.innerHTML = silhouetteSvg(s.noPhoto);
    frame.classList.add('headshot--missing');
  };
  // Source images are 1040x760. Render at the CSS size times device pixel ratio.
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const width = Math.round(240 * dpr);
  const canvas = h('canvas', {
    width,
    height: Math.round((width * 760) / 1040),
    className: 'headshot__canvas',
    role: 'img',
    'aria-label': s.photoOf(p.name),
  });
  frame.append(canvas);
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    void depixelate(canvas, img, {
      durationMs: CONFIG.animation.depixelateMs,
      steps: CONFIG.animation.depixelateSteps,
      reduced: prefersReducedMotion(),
    });
  };
  img.onerror = fallback;
  img.src = CONFIG.headshotUrl(p.id);
  return frame;
}

function countdown(s: Strings): HTMLElement {
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
    el.textContent = s.nextIn(`${hh}:${mm}:${ss}`);
  };
  const timer = window.setInterval(tick, 1000);
  tick();
  return el;
}
