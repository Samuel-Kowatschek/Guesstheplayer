import { INSTAGRAM_URL, shareLink, type LinkTarget } from '../game/shareLinks';
import type { Strings } from '../i18n';
import { sfx } from '../sound';
import { h } from './dom';
import { openModal } from './modal';
import { ICONS } from './pixels';

export interface ShareMenuOptions {
  /** Spoiler-free result (emoji grid) without the link. */
  text: string;
  /** Link to the game. */
  url: string;
  s: Strings;
  announce: (msg: string) => void;
}

export async function copyText(text: string): Promise<boolean> {
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

const isTouch = () => window.matchMedia?.('(pointer: coarse)').matches ?? false;

function label(icon: string, text: string): Node[] {
  const i = h('span', { className: 'share__icon', 'aria-hidden': 'true' });
  i.innerHTML = icon;
  return [i, h('span', {}, text)];
}

/** Share dialog: native share sheet, copy actions and direct links to apps. */
export function openShareMenu({ text, url, s, announce }: ShareMenuOptions): void {
  const full = `${text}\n\n${url}`;
  const status = h('p', { className: 'share__status', role: 'status' });

  const copyButton = (icon: string, caption: string, value: string) => {
    const b = h('button', { className: 'btn share__opt', type: 'button' }, ...label(icon, caption));
    b.addEventListener('click', async () => {
      const ok = await copyText(value);
      sfx.submit();
      status.textContent = ok ? s.copied : s.copyFailed;
      announce(ok ? s.copiedAnnounce : s.copyFailedAnnounce);
    });
    return b;
  };

  const linkButton = (icon: string, caption: string, target: LinkTarget) => {
    const href = shareLink(target, text, url);
    const external = href.startsWith('http');
    const a = h(
      'a',
      {
        className: 'btn share__opt',
        href,
        target: external ? '_blank' : undefined,
        rel: external ? 'noopener noreferrer' : undefined,
      },
      ...label(icon, caption),
    );
    a.addEventListener('click', () => sfx.submit());
    return a;
  };

  const instagram = h(
    'a',
    {
      className: 'btn share__opt',
      href: INSTAGRAM_URL,
      target: '_blank',
      rel: 'noopener noreferrer',
    },
    ...label(ICONS.camera(), 'INSTAGRAM'),
  );
  // Instagram cannot be prefilled via a link: copy first, then open the app/inbox.
  instagram.addEventListener('click', () => {
    void copyText(full).then((ok) => {
      status.textContent = ok ? s.instagramHint : s.copyFailed;
      announce(ok ? s.copiedAnnounce : s.copyFailedAnnounce);
    });
  });

  const options: HTMLElement[] = [];
  if (typeof navigator.share === 'function') {
    const native = h(
      'button',
      { className: 'btn btn--primary share__opt share__opt--wide', type: 'button' },
      ...label(ICONS.share(), s.shareNative),
    );
    native.addEventListener('click', () => {
      navigator.share({ title: 'HOOPDLE', text, url }).catch(() => {
        /* user cancelled */
      });
    });
    options.push(native);
  }
  options.push(
    copyButton(ICONS.copy(), s.copyResult, full),
    copyButton(ICONS.link(), s.copyLink, url),
    linkButton(ICONS.chat(), 'WHATSAPP', 'whatsapp'),
    instagram,
    linkButton(ICONS.chat(), 'TELEGRAM', 'telegram'),
    linkButton(ICONS.chat(), 'X', 'x'),
    linkButton(ICONS.chat(), 'FACEBOOK', 'facebook'),
    linkButton(ICONS.mail(), s.email, 'email'),
  );
  if (isTouch()) options.push(linkButton(ICONS.chat(), s.sms, 'sms'));

  const preview = h('pre', { className: 'share__preview', 'aria-label': text }, text);
  openModal(
    s.shareTitle,
    h(
      'div',
      { className: 'share' },
      preview,
      h('div', { className: 'share__grid' }, ...options),
      status,
    ),
    {
      closeLabel: s.close_,
    },
  );
}
