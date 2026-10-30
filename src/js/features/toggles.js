// Mask toggles: the character file (01) and the secret office (000) each show
// a second version of their artwork wearing the skull mask.
import { $ } from '../core/dom.js';
import { play } from '../systems/sound.js';

function maskToggle(btnSel, figSel, labels) {
  const btn = $(btnSel), fig = $(figSel);
  if (!btn || !fig) return;
  btn.addEventListener('click', () => {
    const on = !fig.classList.contains('is-masked');
    fig.classList.toggle('is-masked', on);
    btn.setAttribute('aria-pressed', String(on));
    if (labels) btn.textContent = on ? labels[1] : labels[0];
    play('ui');
  });
}

export function initToggles() {
  maskToggle('[data-mask-toggle]', '[data-mask-figure]', ['SHOW THE MASK', 'REMOVE THE MASK']);
  maskToggle('[data-office-toggle]', '[data-office-figure]');
}
