// SECRETS — four hidden things, counted for this browser session.
import { $$ } from '../core/dom.js';
import { store } from '../core/store.js';
import { announce } from '../core/bus.js';
import { play } from './sound.js';

const IDS = ['inscription', 'contract', 'key', 'office'];
const found = new Set((store.get('secrets') || '').split(',').filter((s) => IDS.includes(s)));

function render() {
  $$('[data-secret-count]').forEach((el) => { el.textContent = `SECRETS FOUND ${found.size} / ${IDS.length}`; });
}

export function discover(id) {
  if (found.has(id)) return false;
  found.add(id);
  store.set('secrets', Array.from(found).join(','));
  render();
  play('secret');
  announce(`Secret found. ${found.size} of ${IDS.length}.`);
  return true;
}

export function initSecrets() { render(); }
