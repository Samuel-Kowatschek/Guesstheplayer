import { h } from './dom';
import { ICONS } from './pixels';

/**
 * Pixel modal built on <dialog>: native focus trapping, Escape to close,
 * focus returns to the opener.
 */
export function openModal(
  title: string,
  body: Node,
  opts: { onClose?: () => void; closeLabel?: string } = {},
): () => void {
  const closeBtn = h('button', {
    className: 'btn btn--icon',
    type: 'button',
    'aria-label': opts.closeLabel ?? 'Close',
  });
  closeBtn.innerHTML = ICONS.close();
  const heading = h('h2', { className: 'modal__title', id: `modal-${Date.now()}` }, title);
  const dialog = h(
    'dialog',
    { className: 'modal px-box', 'aria-labelledby': heading.id },
    h('div', { className: 'modal__head' }, heading, closeBtn),
    h('div', { className: 'modal__body' }, body),
  );
  const opener = document.activeElement as HTMLElement | null;
  const close = () => dialog.close();
  closeBtn.addEventListener('click', close);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close(); // backdrop click
  });
  dialog.addEventListener('close', () => {
    dialog.remove();
    opts.onClose?.();
    opener?.focus?.();
  });
  document.body.append(dialog);
  dialog.showModal();
  return close;
}
