// LOBBY — the gilded skull under the artwork hides an inscription (secret 1).
import { $ } from '../core/dom.js';
import { play } from '../systems/sound.js';
import { discover } from '../systems/secrets.js';

export function initLobby() {
  const insc = $('[data-inscription]');
  if (!insc) return;
  insc.setAttribute('aria-expanded', 'false');
  const reveal = () => discover('inscription');
  insc.addEventListener('pointerenter', reveal);
  insc.addEventListener('focus', reveal);
  insc.addEventListener('click', () => {
    const open = insc.getAttribute('aria-expanded') !== 'true';
    insc.setAttribute('aria-expanded', String(open));
    play(open ? 'open' : 'close');
    reveal();
  });
}
