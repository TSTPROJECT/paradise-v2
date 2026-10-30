// 07 — the seven seats. Only Lust's seat is identified; the other six stay
// sealed, exactly as in the original file. Nothing about them is invented.
import { $, $$, replay } from '../core/dom.js';
import { play } from '../systems/sound.js';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export function initSins() {
  const seats = $$('[data-seat]');
  if (!seats.length) return;
  const known = $('[data-seat-file="known"]'), unknown = $('[data-seat-file="unknown"]'), tag = $('[data-seat-tag]');
  const fileBox = $('.seat-file');
  seats.forEach((s) => s.addEventListener('click', () => {
    const i = +s.dataset.seat;
    seats.forEach((x) => x.setAttribute('aria-pressed', String(x === s)));
    known.hidden = i !== 0;
    unknown.hidden = i === 0;
    replay(fileBox, 'is-shown');
    if (i !== 0) { tag.textContent = `SEAT ${ROMAN[i]} · SEALED`; play('error'); }
    else play('paper');
  }));
}
