// A tiny event bus so features can talk without importing each other.
// Events: 'show-invitation', 'key-found', 'room-open', 'room-close'.
const target = new EventTarget();

export const emit = (type, detail) => target.dispatchEvent(new CustomEvent(type, { detail }));
export const on = (type, fn) => target.addEventListener(type, (e) => fn(e.detail));

const announcer = document.querySelector('[data-announcer]');
/** Polite screen-reader announcement. */
export function announce(msg) {
  if (!announcer) return;
  announcer.textContent = '';
  setTimeout(() => { announcer.textContent = msg; }, 40);
}
