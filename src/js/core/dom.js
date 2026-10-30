// Small DOM and math helpers shared by every module.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/** Restart a CSS animation class on an element. */
export function replay(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
let reducedNow = reduceMQ.matches;
if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', (e) => { reducedNow = e.matches; });
/** True while the visitor prefers reduced motion (live). */
export const reduced = () => reducedNow;

export const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
