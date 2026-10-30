// 03 — relationship map: ARIA tabs with arrow keys, Home and End.
import { $, $$ } from '../core/dom.js';
import { play } from '../systems/sound.js';

export function initRelationships() {
  const tabs = $$('[data-rel-tab]');
  const map = $('[data-relmap]');
  if (!tabs.length) return;

  function select(tab, focus) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = $('#' + t.getAttribute('aria-controls'));
      panel.hidden = !on;
      if (on) { panel.classList.remove('is-shown'); void panel.offsetWidth; panel.classList.add('is-shown'); }
    });
    if (map) map.dataset.active = tab.id.replace('tab-', '');
    if (focus) tab.focus();
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { if (t.getAttribute('aria-selected') !== 'true') { select(t); play('paper'); } });
    t.addEventListener('keydown', (e) => {
      const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (dir) { e.preventDefault(); select(tabs[(i + dir + tabs.length) % tabs.length], true); play('nav'); }
      if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
      if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
    });
  });
  select(tabs[0]);
}
