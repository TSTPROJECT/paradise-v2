// LIGHTBOX — full artwork at its natural proportions; keyboard, buttons and swipe.
import { $, $$ } from '../core/dom.js';
import { ui, syncLayers } from '../core/layers.js';
import { ART } from '../data/art.js';
import { play } from './sound.js';

const box = $('[data-lightbox]');
const img = $('[data-lightbox-img]');
const cap = $('[data-lightbox-caption]');
const count = $('[data-lightbox-count]');
const missing = $('[data-lightbox-missing]');
const stage = $('[data-lightbox-stage]');
let index = 0, returnTo = null;

export const isOpen = () => ui.lightbox;

function show(i) {
  index = (i + ART.length) % ART.length;
  const a = ART[index];
  missing.hidden = true;
  img.hidden = false;
  img.classList.remove('is-loaded');
  img.removeAttribute('src');
  img.width = a.w; img.height = a.h;
  img.alt = a.alt;
  img.src = a.src;
  cap.textContent = a.cap;
  count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(ART.length).padStart(2, '0')}`;
}

export function open(i, opener) {
  returnTo = opener || document.activeElement;
  show(i);
  box.hidden = false;
  ui.lightbox = true;
  syncLayers();
  play('open');
  $('[data-lightbox-close]').focus({ preventScroll: true });
}

export function close() {
  if (!ui.lightbox) return;
  box.hidden = true;
  ui.lightbox = false;
  syncLayers();
  play('close');
  if (returnTo && document.contains(returnTo)) returnTo.focus({ preventScroll: true });
}

const step = (d) => { show(index + d); play('nav'); };

export function initLightbox() {
  img.addEventListener('load', () => img.classList.add('is-loaded'));
  img.addEventListener('error', () => { img.hidden = true; missing.hidden = false; });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lightbox-open]');
    if (b) open(+b.dataset.lightboxOpen, b);
  });
  $('[data-lightbox-close]').addEventListener('click', close);
  $('[data-lightbox-prev]').addEventListener('click', () => step(-1));
  $('[data-lightbox-next]').addEventListener('click', () => step(1));
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  // Tap on the empty stage closes; a horizontal swipe changes the work.
  let sx = null, sy = null;
  stage.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
  stage.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { step(dx < 0 ? 1 : -1); return; }
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6 && e.target === stage) close();
  });

  // Any in-page image that fails to load gets a labelled placeholder.
  $$('img').forEach((im) => {
    if (im === img) return;
    const host = im.closest('figure') || im.parentElement;
    if (!host) return;
    im.addEventListener('error', () => host.classList.add('is-missing'));
    // A lazy image that has not started yet also reports complete with no size,
    // so a later successful load always clears the placeholder.
    im.addEventListener('load', () => host.classList.remove('is-missing'));
    if (im.complete && im.naturalWidth === 0 && im.currentSrc) host.classList.add('is-missing');
  });
}
