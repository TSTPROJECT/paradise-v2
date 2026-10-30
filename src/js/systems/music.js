// MUSIC — "The Paradise Waltz", an original score performed live with the
// Web Audio API: a slow waltz in D harmonic minor for an organ drone, a dark
// string pad, a distant ballroom accompaniment, a slightly out-of-tune music
// box, a cello and a low bell. No audio file is fetched.
// Starts OFF. Nothing plays until the visitor presses MUSIC ON; the context is
// created inside that gesture. The piece fades out while the tab is hidden.
import { $ } from '../core/dom.js';
import { store } from '../core/store.js';
import { announce } from '../core/bus.js';
import { audio, holdAudio } from './sound.js';

const BPM = 69;
const EIGHTH = 60 / BPM / 2;
const BAR = EIGHTH * 6; // 3/4: six eighths
const VOLUME = .65;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// One chord per bar (MIDI notes). Dm Dm Gm A | Dm B♭ Gm A | B♭ F Gm A | Dm B♭ A7 Dm
const CHORDS = [
  [50, 53, 57], [50, 53, 57], [55, 58, 62], [57, 61, 64],
  [50, 53, 57], [46, 50, 53], [55, 58, 62], [57, 61, 64],
  [46, 50, 53], [53, 57, 60], [55, 58, 62], [57, 61, 64],
  [50, 53, 57], [46, 50, 53], [57, 61, 64, 67], [50, 53, 57],
];
// The melody, per bar: [start in eighths, MIDI note, length in eighths].
const MELODY = [
  [[0, 69, 2], [2, 74, 2], [4, 77, 2]],
  [[0, 76, 4], [4, 74, 2]],
  [[0, 70, 2], [2, 74, 2], [4, 79, 2]],
  [[0, 77, 3], [3, 76, 1], [4, 73, 2]],
  [[0, 69, 2], [2, 74, 2], [4, 77, 2]],
  [[0, 81, 4], [4, 79, 2]],
  [[0, 77, 2], [2, 76, 2], [4, 74, 2]],
  [[0, 73, 6]],
  [[0, 74, 2], [2, 77, 2], [4, 82, 2]],
  [[0, 81, 4], [4, 79, 2]],
  [[0, 82, 3], [3, 81, 1], [4, 79, 2]],
  [[0, 76, 2], [2, 79, 2], [4, 73, 2]],
  [[0, 74, 2], [2, 77, 2], [4, 81, 2]],
  [[0, 79, 4], [4, 77, 2]],
  [[0, 76, 2], [2, 73, 2], [4, 69, 2]],
  [[0, 74, 6]],
];
// Each 16-bar pass has its own arrangement; after the opening it cycles 1→2→3.
const ARRANGEMENT = [
  { box: false, cello: false, waltz: false, low: false }, // the room before anyone dances
  { box: true, cello: false, waltz: true, low: false },
  { box: true, cello: true, waltz: true, low: false },
  { box: false, cello: false, waltz: true, low: true },   // the melody sinks an octave, a bell tolls
];

let enabled = store.get('music') === 'on';
let A = null;            // { ctx, master, noiseBuf }
let bus = null, dry = null, send = null, verb = null;
let session = null;      // gain node for the current performance; dropped on stop
let drones = [];
let timer = 0, nextBarTime = 0, bar = 0, playing = false;

function impulse(c, seconds, decay) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function setup() {
  if (bus) return true;
  A = audio();
  if (!A) return false;
  const { ctx, master } = A;
  bus = ctx.createGain(); bus.gain.value = 0;
  // A long hall: the ballroom on the casino floor, heard through a wall.
  verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 4.6, 2.6);
  const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2800;
  dry = ctx.createGain(); dry.gain.value = .75;
  send = ctx.createGain(); send.gain.value = .55;
  dry.connect(bus); send.connect(verb); verb.connect(tone); tone.connect(bus);
  bus.connect(master);
  return true;
}

// ---------- instruments ----------
function voice(dest, t, peak, attack, hold, release) {
  const g = A.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  if (hold) g.gain.setValueAtTime(peak, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  g.connect(dest);
  return { g, end: t + attack + hold + release + .05 };
}
function osc(type, f, t, end, dest, detune = 0) {
  const o = A.ctx.createOscillator();
  o.type = type; o.frequency.value = f; o.detune.value = detune;
  o.connect(dest); o.start(t); o.stop(end);
  return o;
}
function lowpass(f, q = .7) {
  const b = A.ctx.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = f; b.Q.value = q; return b;
}

/** Sustained strings: detuned saws under a dark filter. */
function pad(chord, t) {
  const f = lowpass(820); f.connect(session);
  const { g, end } = voice(f, t, .016, 1.3, BAR - 1.3, 1.9);
  chord.forEach((m) => { osc('sawtooth', hz(m), t, end, g, -7); osc('sawtooth', hz(m), t, end, g, 7); });
}
/** The far-off ballroom: oom on the downbeat, pah-pah on two and three. */
function waltz(chord, t) {
  const f = lowpass(950); f.connect(session);
  const root = voice(f, t, .07, .01, .05, .7);
  osc('triangle', hz(chord[0] - 12), t, root.end, root.g);
  for (const beat of [2, 4]) {
    const tb = t + beat * EIGHTH;
    const v = voice(f, tb, .022, .01, .02, .32);
    chord.slice(1).forEach((m) => osc('triangle', hz(m + 12), tb, v.end, v.g));
  }
}
/** An old music box: bright tines, a quick decay and a little out of tune. */
function musicBox(m, t, len) {
  const detune = (Math.random() * 2 - 1) * 9;
  const g = voice(session, t, .055, .004, 0, 1.4 + len * EIGHTH * .6);
  osc('sine', hz(m), t, g.end, g.g, detune);
  const p = voice(session, t, .016, .002, 0, .35);
  osc('sine', hz(m) * 3.01, t, p.end, p.g, detune);
  const q = voice(session, t, .007, .002, 0, .18);
  osc('sine', hz(m) * 5.43, t, q.end, q.g, detune);
}
/** A cello under the melody, bowed with a slow vibrato. */
function cello(m, t, len) {
  const f = lowpass(640, 1.2); f.connect(session);
  const dur = len * EIGHTH;
  const v = voice(f, t, .03, .22, Math.max(.05, dur - .3), .6);
  const o = osc('sawtooth', hz(m), t, v.end, v.g);
  const lfo = A.ctx.createOscillator(), depth = A.ctx.createGain();
  lfo.frequency.value = 5.2; depth.gain.value = 7;
  lfo.connect(depth); depth.connect(o.detune); lfo.start(t); lfo.stop(v.end);
}
/** A low bell with inharmonic partials. */
function bell(m, t) {
  [[1, .05, 5.5], [2.76, .022, 3.2], [5.4, .012, 1.8], [8.93, .006, 1.1]].forEach(([r, a, d]) => {
    const v = voice(session, t, a, .004, 0, d);
    osc('sine', hz(m) * r, t, v.end, v.g);
  });
}
/** Air moving through a building with no windows. */
function breath(t) {
  const s = A.ctx.createBufferSource(), f = A.ctx.createBiquadFilter();
  s.buffer = A.noiseBuf; s.loop = true;
  f.type = 'bandpass'; f.frequency.setValueAtTime(380, t); f.frequency.linearRampToValueAtTime(900, t + 2.5); f.Q.value = 1.1;
  const v = voice(f, t, .018, 2.2, .4, 2.4);
  s.connect(f); v.g.connect(session);
  s.start(t, Math.random()); s.stop(v.end);
}

function drone(t) {
  const f = lowpass(240, 1.4); f.connect(session);
  const g = A.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.05, t + 4);
  g.connect(f);
  const lfo = A.ctx.createOscillator(), depth = A.ctx.createGain();
  lfo.frequency.value = .07; depth.gain.value = 110;
  lfo.connect(depth); depth.connect(f.frequency); lfo.start(t);
  drones = [lfo, osc('sawtooth', hz(38), t, t + 36000, g, -4), osc('sawtooth', hz(38), t, t + 36000, g, 5),
    osc('sine', hz(45), t, t + 36000, g)];
}

// ---------- the score ----------
function playBar(n, t) {
  const pass = Math.floor(n / 16), i = n % 16;
  const arr = ARRANGEMENT[pass === 0 ? 0 : 1 + ((pass - 1) % 3)];
  const chord = CHORDS[i];
  pad(chord, t);
  if (arr.waltz) waltz(chord, t);
  else { const f = lowpass(500); f.connect(session); const r = voice(f, t, .05, .02, .1, 1.2); osc('triangle', hz(chord[0] - 12), t, r.end, r.g); }
  for (const [step, m, len] of MELODY[i]) {
    const tn = t + step * EIGHTH;
    if (arr.box) musicBox(m, tn, len);
    if (arr.low) cello(m - 12, tn, len);
  }
  if (arr.cello && i % 2 === 0) cello(chord[0] - 12, t, 6);
  if (arr.low && (i === 0 || i === 8)) bell(38, t);
  if (i % 8 === 4 && Math.random() < .5) breath(t);
}

function schedule() {
  const now = A.ctx.currentTime;
  if (nextBarTime < now) nextBarTime = now + .1; // after a stall, never pile up late bars
  while (nextBarTime < now + .7) {
    try { playBar(bar, nextBarTime); } catch (e) { /* music must never break the page */ }
    nextBarTime += BAR;
    bar++;
  }
}

function start() {
  if (playing || !setup()) return false;
  const { ctx } = A;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  holdAudio(true);
  session = ctx.createGain(); session.gain.value = 1;
  session.connect(dry); session.connect(send);
  const t = ctx.currentTime + .05;
  bus.gain.cancelScheduledValues(t);
  bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), t);
  bus.gain.linearRampToValueAtTime(VOLUME, t + 3);
  drone(t);
  nextBarTime = t + .2;
  schedule();
  timer = setInterval(schedule, 120);
  playing = true;
  return true;
}

function stop(fade = 1.6) {
  if (!playing) return;
  playing = false;
  clearInterval(timer);
  const { ctx } = A, t = ctx.currentTime;
  bus.gain.cancelScheduledValues(t);
  bus.gain.setValueAtTime(bus.gain.value, t);
  bus.gain.linearRampToValueAtTime(0, t + fade);
  const old = session, oldDrones = drones;
  drones = [];
  setTimeout(() => {
    oldDrones.forEach((o) => { try { o.stop(); } catch (e) { /* already stopped */ } });
    old.disconnect();
    if (!playing) holdAudio(false);
  }, fade * 1000 + 120);
}

export function initMusic() {
  const btn = $('[data-music-toggle]');
  const label = $('[data-music-label]');
  if (!btn) return;
  const render = () => {
    btn.setAttribute('aria-pressed', String(enabled));
    btn.classList.toggle('is-on', enabled);
    label.textContent = enabled ? 'MUSIC ON' : 'MUSIC OFF';
  };
  btn.addEventListener('click', () => {
    enabled = !enabled;
    store.set('music', enabled ? 'on' : 'off');
    if (enabled) {
      if (!start()) { enabled = false; announce('Music is not supported in this browser'); }
    } else stop();
    render();
    announce(enabled ? 'Music on' : 'Music off');
  });
  render();

  // Hidden tabs throttle timers, so the piece rests until the visitor returns.
  document.addEventListener('visibilitychange', () => {
    if (!enabled) return;
    if (document.hidden) stop(.4); else start();
  });

  // A preference remembered from earlier in this session still waits for a real gesture.
  if (enabled) {
    const resume = () => {
      start();
      removeEventListener('pointerdown', resume, true);
      removeEventListener('keydown', resume, true);
    };
    addEventListener('pointerdown', resume, true);
    addEventListener('keydown', resume, true);
  }
}
