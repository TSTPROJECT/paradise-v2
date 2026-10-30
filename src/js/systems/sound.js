// SOUND — an original palette synthesized with the Web Audio API.
// Starts OFF. No audio file is fetched and nothing plays until the visitor
// presses SOUND ON; the AudioContext is only created inside that gesture.
// Every cue also has a visual result, so the site works the same muted.
import { $ } from '../core/dom.js';
import { store } from '../core/store.js';
import { announce } from '../core/bus.js';

let ctx = null, out = null, wet = null, noiseBuf = null;
let enabled = store.get('sound') === 'on';
let voices = 0;
const lastPlayed = {};

// Minimum gap per cue (ms) so rapid clicking never stacks into noise.
const MIN_GAP = {
  ui: 70, nav: 90, menu: 300, handle: 380, latch: 250, creak: 600, paper: 220, open: 250, close: 200,
  secret: 1500, error: 260, pluck: 300, whoosh: 600, thud: 300, drip: 600, ding: 300, seal: 300, toll: 900,
};

function impulse(c, seconds, decay) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function ensure() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch (e) { return null; }
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -22; comp.ratio.value = 8; comp.attack.value = .003; comp.release.value = .2;
  out = ctx.createGain(); out.gain.value = .5;
  // A short, dark room tone: the building is large and has no windows.
  const verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 1.6, 3.2);
  const verbTone = ctx.createBiquadFilter(); verbTone.type = 'lowpass'; verbTone.frequency.value = 2600;
  wet = ctx.createGain(); wet.gain.value = .22;
  out.connect(comp);
  out.connect(wet); wet.connect(verb); verb.connect(verbTone); verbTone.connect(comp);
  comp.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

function env(g, t, attack, peak, decay) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}
function tone(type, f0, t, dur, peak, f1, dest) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, Math.min(.01, dur / 4), peak, dur);
  o.connect(g); g.connect(dest || out);
  o.start(t); o.stop(t + dur + .05);
}
function noise(t, dur, peak, filterType, f0, q, f1, attack) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; s.loop = true;
  f.type = filterType; f.frequency.setValueAtTime(f0, t); f.Q.value = q || 1;
  if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, attack || .004, peak, dur);
  s.connect(f); f.connect(g); g.connect(out);
  s.start(t, Math.random()); s.stop(t + dur + (attack || 0) + .05);
}

// Each recipe schedules its voices at time t and returns its length in seconds.
const recipes = {
  // button click — a quiet, refined tick
  ui(t) { noise(t, .03, .2, 'highpass', 3200, .7); tone('sine', 1900, t, .05, .045, 1400); return .08; },
  // menu navigation — a soft metallic tap
  nav(t) { tone('sine', 1320, t, .2, .055); tone('sine', 3640, t, .1, .018); tone('triangle', 660, t, .08, .028); return .22; },
  // the directory opening — a velvet curtain drawn aside
  menu(t) { noise(t, .42, .09, 'bandpass', 600, .9, 1800, .12); tone('sine', 196, t + .05, .5, .04, 174.6); return .5; },
  // door interaction — a hand resting on the brass handle
  handle(t) { tone('sine', 2480, t, .06, .022, 2100); noise(t, .02, .05, 'bandpass', 4200, 4); return .08; },
  // door opening, part 1 — heavy latch
  latch(t) { tone('sine', 130, t, .18, .3, 58); noise(t, .05, .26, 'bandpass', 900, 2); noise(t + .075, .035, .17, 'bandpass', 2400, 3); return .25; },
  // door opening, part 2 — slow hinge creak
  creak(t) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), am = ctx.createOscillator(), amg = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(64, t); o.frequency.linearRampToValueAtTime(96, t + .35); o.frequency.linearRampToValueAtTime(78, t + .75);
    f.type = 'bandpass'; f.frequency.setValueAtTime(620, t); f.frequency.linearRampToValueAtTime(900, t + .75); f.Q.value = 7;
    am.frequency.value = 27; amg.gain.value = .03; am.connect(amg); amg.connect(g.gain);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.055, t + .12); g.gain.linearRampToValueAtTime(.04, t + .55); g.gain.exponentialRampToValueAtTime(0.0001, t + .85);
    o.connect(f); f.connect(g); g.connect(out);
    o.start(t); am.start(t); o.stop(t + .9); am.stop(t + .9);
    tone('sine', 52, t + .7, .3, .11, 40);
    return .95;
  },
  // paper / a file opening
  paper(t) { for (let i = 0; i < 4; i++) noise(t + i * .055 + Math.random() * .02, .06, .09 - i * .014, 'bandpass', 3400 + i * 300, .8); return .3; },
  // popup opening — a low swell with a glint
  open(t) { noise(t, .2, .07, 'bandpass', 900, 1.2, 2400, .06); tone('sine', 880, t + .06, .35, .03); tone('sine', 1318.5, t + .1, .3, .018); return .4; },
  // popup closing — restrained reverse mechanism
  close(t) { noise(t, .03, .17, 'bandpass', 1900, 3); noise(t + .08, .03, .15, 'bandpass', 1150, 3); tone('sine', 320, t + .02, .12, .055, 170); return .2; },
  // secret discovery — a rare four-note shimmer
  secret(t) { [440, 523.25, 659.25, 987.77].forEach((f, i) => tone('sine', f, t + i * .07, 2.2 - i * .3, .04)); noise(t, 1.2, .02, 'bandpass', 5200, 6, 7200, .4); return 2.3; },
  // unavailable / locked
  error(t) {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520; f.connect(out);
    tone('square', 98, t, .08, .065, null, f); tone('square', 92, t + .12, .1, .055, null, f); return .25;
  },
  // the apple stem snapping
  pluck(t) { noise(t, .025, .28, 'highpass', 2200, .8); tone('triangle', 880, t, .07, .075, 300); return .1; },
  // falling air (duration follows the animation)
  whoosh(t, opts) { const d = (opts && opts.dur) || 1.2; noise(t, d, .15, 'bandpass', 300, 1.4, 1500, d * .8); return d; },
  // the impact as the apple leaves the scene
  thud(t) { tone('sine', 90, t, .4, .42, 42); noise(t, .14, .2, 'lowpass', 420, .7); return .45; },
  // the corner of the invitation stains
  drip(t) { tone('sine', 1180, t, .12, .04, 620); tone('sine', 740, t + .14, .2, .025, 520); return .35; },
  ding(t) { tone('sine', 1046.5, t, 1.1, .045); tone('sine', 1318.5, t + .09, 1.1, .04); return 1.2; },
  seal(t) { noise(t, .025, .28, 'bandpass', 1400, 3); noise(t + .04, .02, .2, 'bandpass', 900, 3); noise(t + .09, .05, .13, 'bandpass', 600, 2); return .15; },
  toll(t) { tone('sine', 110, t, 2.4, .18); tone('sine', 220.8, t, 1.6, .055); tone('sine', 331, t, 1.1, .032); return 2.4; },
};

export function play(name, opts) {
  if (!enabled || !ctx || ctx.state !== 'running' || !recipes[name]) return;
  const now = performance.now();
  if (now - (lastPlayed[name] || 0) < (MIN_GAP[name] || 80)) return;
  if (voices >= 5 && name !== 'thud') return; // global polyphony cap
  lastPlayed[name] = now;
  try {
    const dur = recipes[name](ctx.currentTime + .005, opts) || .3;
    voices++;
    setTimeout(() => { voices = Math.max(0, voices - 1); }, Math.min(dur, 1.2) * 1000);
  } catch (e) { /* audio must never break interaction */ }
}

export function initSound() {
  const btn = $('[data-sound-toggle]');
  const label = $('[data-sound-label]');
  const render = () => {
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(enabled));
    btn.classList.toggle('is-on', enabled);
    label.textContent = enabled ? 'SOUND ON' : 'SOUND OFF';
  };
  if (btn) {
    btn.addEventListener('click', () => {
      enabled = !enabled;
      store.set('sound', enabled ? 'on' : 'off');
      if (enabled) {
        if (!ensure()) { enabled = false; announce('Sound is not supported in this browser'); }
        else setTimeout(() => play('ui'), 30);
      } else if (ctx) { ctx.suspend().catch(() => {}); }
      render();
      announce(enabled ? 'Sound on' : 'Sound off');
    });
    render();
  }
  // A preference remembered from earlier in this session still waits for a real gesture.
  if (enabled) {
    const resume = () => {
      ensure();
      removeEventListener('pointerdown', resume, true);
      removeEventListener('keydown', resume, true);
    };
    addEventListener('pointerdown', resume, true);
    addEventListener('keydown', resume, true);
  }
}
