// 06 — Rubicon — Seed: break the seal, denied redactions, the 72-hour slider.
// Fiction inside the character's world only: no formulas, sources or doses.
import { $, $$, reduced, replay } from '../core/dom.js';
import { announce } from '../core/bus.js';
import { play } from '../systems/sound.js';

export function initRubicon() {
  const cover = $('[data-break-seal]');
  if (!cover) return;
  const sealed = $('[data-sealed]'), file = $('#rubicon-file');

  cover.addEventListener('click', () => {
    if (sealed.classList.contains('is-open')) return;
    sealed.classList.add('is-open');
    cover.setAttribute('aria-expanded', 'true');
    file.hidden = false;
    play('seal');
    setTimeout(() => play('paper'), 120);
    file.setAttribute('tabindex', '-1');
    file.focus({ preventScroll: true });
    const first = $('.rubifile__facts', file);
    if (first) first.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
  });

  $$('[data-redacted]').forEach((r) => r.addEventListener('click', () => {
    play('error');
    replay(r, 'is-denied');
    announce('Access denied');
  }));

  const range = $('[data-hours]'), out = $('[data-hours-out]'), state = $('[data-hours-state]'), text = $('[data-hours-text]');
  let returned = false;
  const update = () => {
    const v = +range.value;
    out.textContent = v;
    range.style.setProperty('--p', (v / 96 * 100).toFixed(1) + '%');
    const now = v >= 72;
    state.classList.toggle('is-returned', now);
    state.style.setProperty('--fade', Math.min(1, v / 72).toFixed(2));
    text.textContent = now
      ? 'ฤทธิ์หมดลงแล้ว ความทรงจำที่เจ็บปวดย้อนกลับมาพร้อมกันทั้งหมด และอาจยากเกินกว่าจะรับมือได้'
      : v >= 60
        ? 'ใกล้ครบ 72 ชั่วโมง สิ่งที่ถูกกดทับไว้ยังเงียบอยู่ — แต่อีกไม่นาน'
        : 'ความทรงจำที่เจ็บปวดถูกกดทับไว้ ทุกอย่างดูเบาลง — แม้แต่ชื่อของตัวเอง';
    if (now && !returned) play('toll');
    returned = now;
  };
  range.addEventListener('input', update);
  update();
}
