// 04 — the rebirth cycle model and the contract seal (secret 2).
// The model only restates the rules written in the room: death returns the
// body to age 25, memory is kept, and she has never lived past 30.
import { $, replay } from '../core/dom.js';
import { play } from '../systems/sound.js';
import { discover } from '../systems/secrets.js';

function initCycle() {
  const live = $('[data-cycle-live]'), die = $('[data-cycle-die]'), reset = $('[data-cycle-reset]');
  if (!live) return;
  const ageEl = $('[data-cycle-age]'), ageSvg = $('[data-cycle-age-svg]'), memEl = $('[data-cycle-memory]');
  const rebEl = $('[data-cycle-rebirths]'), locEl = $('[data-cycle-location]'), log = $('[data-cycle-log]');
  const arc = $('.cycle__arc'), dial = $('[data-cycle-dial]');
  const C = 2 * Math.PI * 86;
  const st = { age: 25, mem: 0, reb: 0 };

  function paint() {
    ageEl.textContent = st.age; ageSvg.textContent = st.age;
    memEl.textContent = st.mem; rebEl.textContent = st.reb;
    arc.style.strokeDashoffset = (C * (1 - (st.age - 25) / 5)).toFixed(1);
    live.setAttribute('aria-disabled', String(st.age >= 30));
  }
  live.addEventListener('click', () => {
    if (st.age >= 30) {
      play('error');
      log.textContent = 'ตลอดชีวิตของเธอ ยังไม่เคยมีช่วงใดที่มีชีวิตอยู่ต่อเนื่องเกินอายุ 30 ปี';
      return;
    }
    st.age++; st.mem++;
    play('ui');
    log.textContent = `อายุร่างกาย ${st.age} ปี — เธอแก่ตัวลงตามปกติเหมือนมนุษย์ทั่วไป และไม่มีการฟื้นฟูร่างกายใด ๆ ขณะยังมีชีวิต`;
    paint();
  });
  die.addEventListener('click', () => {
    st.reb++;
    const kept = st.mem;
    st.age = 25;
    locEl.textContent = 'สุสานนอกเมืองนิวยอร์ก';
    log.textContent = `ความตายคือเงื่อนไขเดียว — เธอฟื้นคืนชีพที่หลุมศพของตนเองในสุสานนอกเมืองนิวยอร์ก ร่างกายกลับสู่สภาพเมื่ออายุ 25 ปี ตอนทำสัญญา แต่ความทรงจำ ${kept} ปียังคงอยู่ครบ`;
    replay(dial, 'is-dead');
    play('toll');
    paint();
  });
  reset.addEventListener('click', () => {
    Object.assign(st, { age: 25, mem: 0, reb: 0 });
    locEl.textContent = '—';
    log.textContent = 'เริ่มต้นที่อายุ 25 ปี — วันที่สัญญาถูกลงนาม';
    play('close');
    paint();
  });
  paint();
}

function initSeal() {
  const seal = $('[data-contract-seal]');
  if (!seal) return;
  seal.addEventListener('click', () => {
    const terms = $('#' + seal.getAttribute('aria-controls'));
    const open = seal.getAttribute('aria-expanded') !== 'true';
    seal.setAttribute('aria-expanded', String(open));
    terms.hidden = !open;
    $('.wax-seal__label', seal).textContent = open ? 'FOLD THE ADDENDUM' : 'BREAK THE CONTRACT SEAL';
    play(open ? 'seal' : 'close');
    if (open) discover('contract');
  });
}

export function initAbilities() { initCycle(); initSeal(); }
