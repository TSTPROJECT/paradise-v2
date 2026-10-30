// THE CORRIDOR — doors lean toward the pointer, the light under them warms,
// and on click the leaf swings inward before darkness spreads into the room.
import { $, $$, clamp, reduced, replay } from '../core/dom.js';
import { on, announce } from '../core/bus.js';
import { play } from '../systems/sound.js';
import { navigate, throughVeil, keyFound } from '../systems/router.js';

function renderLock() {
  const door = $('[data-locked]');
  const note = $('[data-locked-note]');
  if (!door) return;
  const open = keyFound();
  door.classList.toggle('is-unlocked', open);
  if (open && note) {
    note.textContent = 'UNLOCKED · ROOM 000 IS OPEN';
    note.classList.add('is-unlocked');
  }
}

export function initDoors() {
  renderLock();
  on('key-found', renderLock);

  $$('[data-door]').forEach((door) => {
    const casing = $('.door__casing', door);
    const id = door.getAttribute('href').slice(1);

    door.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') play('handle'); });
    door.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || reduced()) return;
      const r = casing.getBoundingClientRect();
      const px = clamp((e.clientX - r.left) / r.width), py = clamp((e.clientY - r.top) / r.height);
      casing.style.setProperty('--ry', ((px - .5) * 14).toFixed(2) + 'deg');
      casing.style.setProperty('--rx', ((.5 - py) * 8).toFixed(2) + 'deg');
      door.style.setProperty('--lx', (px * 100).toFixed(0) + '%');
    });
    door.addEventListener('pointerleave', () => {
      casing.style.setProperty('--ry', '0deg');
      casing.style.setProperty('--rx', '0deg');
    });

    door.addEventListener('click', (e) => {
      e.preventDefault();
      if (door.hasAttribute('data-locked') && !keyFound()) {
        play('error');
        replay(door, 'is-rattling');
        announce('Locked. The key is somewhere inside the club.');
        return;
      }
      if (door.classList.contains('is-opening')) return;
      play('latch');
      play('creak'); // the creak's slow attack lands as the leaf swings
      door.classList.add('is-opening');
      const tone = door.classList.contains('door--crimson') || door.hasAttribute('data-locked') ? 'blood' : '';
      setTimeout(() => {
        throughVeil(door, () => { navigate(id); door.classList.remove('is-opening'); }, tone);
      }, reduced() ? 0 : 420);
    });
  });
}
