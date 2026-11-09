/** Share targets that work via plain links (no SDKs, no tracking scripts). */
export type LinkTarget = 'whatsapp' | 'telegram' | 'x' | 'facebook' | 'email' | 'sms';

const enc = encodeURIComponent;

/**
 * Builds a share URL. `text` is the result without the link, `url` the game link.
 * Targets that only accept one field get text and link combined.
 */
export function shareLink(target: LinkTarget, text: string, url: string): string {
  const full = `${text}\n${url}`;
  switch (target) {
    case 'whatsapp':
      return `https://wa.me/?text=${enc(full)}`;
    case 'telegram':
      return `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`;
    case 'x':
      return `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`;
    case 'facebook':
      // Facebook only accepts a URL; the text cannot be prefilled.
      return `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`;
    case 'email':
      return `mailto:?subject=${enc('HOOPDLE')}&body=${enc(full)}`;
    case 'sms':
      // "sms:?&body=" works on both iOS and Android.
      return `sms:?&body=${enc(full)}`;
  }
}

/** Instagram has no web share link: the text is copied and the inbox opened. */
export const INSTAGRAM_URL = 'https://www.instagram.com/direct/inbox/';
