import { CONFIG } from '../config';
import { h, prefersReducedMotion } from './dom';
import { ICONS } from './pixels';

/**
 * Retro text box with a typewriter effect. Text is aria-hidden while typing;
 * screen readers get the full message through the separate live region.
 */
export class DialogueBox {
  readonly el: HTMLElement;
  private text: HTMLElement;
  private timer: number | undefined;
  private full = '';

  constructor() {
    this.text = h('p', { className: 'dialogue__text', 'aria-hidden': 'true' });
    const more = h('span', { className: 'dialogue__more blink', 'aria-hidden': 'true' });
    more.innerHTML = ICONS.cursorDown();
    this.el = h(
      'div',
      { className: 'dialogue px-box', onclick: () => this.finish() },
      this.text,
      more,
    );
  }

  say(message: string): void {
    window.clearInterval(this.timer);
    this.full = message.toUpperCase();
    this.el.classList.remove('is-done');
    if (prefersReducedMotion()) return this.finish();
    let i = 0;
    this.text.textContent = '';
    this.timer = window.setInterval(() => {
      i++;
      this.text.textContent = this.full.slice(0, i);
      if (i >= this.full.length) this.finish();
    }, CONFIG.animation.typewriterMs);
  }

  finish(): void {
    window.clearInterval(this.timer);
    this.text.textContent = this.full;
    this.el.classList.add('is-done');
  }
}
