// DIRECTORY — the building's floor list, opened from the header.
import { $ } from '../core/dom.js';
import { ui, syncLayers } from '../core/layers.js';
import { play } from '../systems/sound.js';

const btn = $('[data-menu-toggle]');
const panel = $('[data-directory]');

export const isOpen = () => ui.directory;

export function open() {
  if (ui.directory || !panel) return;
  ui.directory = true;
  panel.hidden = false;
  requestAnimationFrame(() => panel.classList.add('is-open'));
  btn.setAttribute('aria-expanded', 'true');
  syncLayers();
  play('menu');
  const current = $('a[aria-current]', panel) || $('a', panel);
  if (current) current.focus({ preventScroll: true });
}

export function close(silent) {
  if (!ui.directory || !panel) return;
  ui.directory = false;
  panel.classList.remove('is-open');
  btn.setAttribute('aria-expanded', 'false');
  syncLayers();
  if (!silent) { play('close'); btn.focus({ preventScroll: true }); }
  setTimeout(() => { if (!ui.directory) panel.hidden = true; }, 420);
}

export function initDirectory() {
  if (!btn) return;
  btn.addEventListener('click', () => (ui.directory ? close() : open()));
  // A click on the backdrop (outside the list) closes it.
  panel.addEventListener('click', (e) => { if (e.target === panel) close(); });
}
