// REVEAL — elements marked data-reveal fade up the first time they scroll into view.
import { $$ } from '../core/dom.js';

export function initReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-revealed');
      io.unobserve(en.target);
    });
  }, { threshold: .12 });
  $$('[data-reveal]').forEach((el) => io.observe(el));
}
