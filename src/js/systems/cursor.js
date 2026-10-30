// CURSOR — a blood-red gem with a trailing gilt ring that changes shape by
// context. Fine pointers only; the native cursor stays until the first mouse
// move proves the custom one works. Touch devices never see it.
import { $, reduced, finePointer } from '../core/dom.js';

// [selector, state, label] — first match wins.
const STATES = [
  ['[disabled], [aria-disabled="true"], .redacted, .door--locked:not(.is-unlocked)', 'disabled', (t) => (t.closest('.door--locked') ? 'LOCKED' : '')],
  ['[data-lightbox-stage]', 'drag', () => ''],
  ['[data-apple]', 'door', () => 'TAKE'],
  ['[data-door]', 'door', () => 'ENTER'],
  ['[data-lightbox-open]', 'view', () => 'VIEW'],
  ['[data-break-seal], [data-contract-seal], .elevator__btn, [data-inscription], .seat', 'door', () => ''],
  ['input[type="range"]', 'link', () => ''],
  ['a[href], button, [role="tab"], label[for], summary', 'link', () => ''],
  ['input, textarea, [contenteditable]', 'text', () => ''],
];

export function initCursor() {
  const el = $('[data-cursor]');
  if (!el || !finePointer()) return;
  const ring = $('.cursor__ring', el), dot = $('.cursor__dot', el), label = $('[data-cursor-label]', el);
  const root = document.documentElement;
  let x = -100, y = -100, rx = -100, ry = -100, raf = 0, started = false, lastTarget = null;

  function stateFor(t) {
    if (!t || !t.closest) return ['default', ''];
    for (const [sel, state, lab] of STATES) {
      const m = t.closest(sel);
      if (m) return [state, lab(t)];
    }
    return ['default', ''];
  }
  function loop() {
    const k = reduced() ? 1 : .22;
    rx += (x - rx) * k; ry += (y - ry) * k;
    ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    raf = (Math.abs(x - rx) > .1 || Math.abs(y - ry) > .1) ? requestAnimationFrame(loop) : 0;
  }
  function update(t) {
    const [s, lab] = stateFor(t);
    if (el.dataset.state !== s) el.dataset.state = s;
    if (label.textContent !== lab) label.textContent = lab;
  }
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    if (!started) { started = true; rx = x; ry = y; root.classList.add('has-cursor'); }
    el.classList.add('is-visible');
    if (e.target !== lastTarget) { lastTarget = e.target; update(e.target); }
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  // State can change under a still pointer (a door unlocks, a button disables).
  addEventListener('click', () => setTimeout(() => update(lastTarget), 30), true);
  document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) el.classList.remove('is-visible'); });
  addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') el.classList.add('is-down'); }, { passive: true });
  addEventListener('pointerup', () => el.classList.remove('is-down'), { passive: true });
  addEventListener('blur', () => el.classList.remove('is-visible'));
}
