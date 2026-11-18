// Suoni discreti generati al volo (nessun file da scaricare). Disattivabili.
let ctx = null, master = null, hum = null;
let enabled = true;
try { enabled = localStorage.getItem('lu_audio') !== 'off'; } catch (e) {}

function ensure() {
  if (ctx) return true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = enabled ? 0.5 : 0; master.connect(ctx.destination);
    // Rumore di fondo della stanza: brusio bassissimo filtrato.
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    hum = ctx.createGain(); hum.gain.value = 0.05;
    src.connect(lp).connect(hum).connect(master); src.start();
    return true;
  } catch (e) { return false; }
}

function tone(freq, dur, type = 'sine', vol = 0.15, slide = 0) {
  if (!enabled || !ensure()) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
}

// Ambiente: mare e fiume (rumore filtrato), uccelli nella foresta, gocce nelle caverne, campanelli nella piazza.
let water = null, ambT = 0, amb = { area: 'molo', acqua: 0, t: 0 };
function ensureWater() {
  if (water || !ensure()) return;
  const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.6;
  water = ctx.createGain(); water.gain.value = 0;
  src.connect(bp).connect(water).connect(master); src.start();
}

export const audio = {
  // chiamato ~4 volte al secondo: suoni d'ambiente secondo il luogo (molto discreti)
  // state: { area, acqua (0..1 vicinanza all'acqua), t }
  ambient(dt, state) {
    amb = state; if (!enabled || !ctx) return;
    ensureWater();
    const a = state.area, now = ctx.currentTime;
    // mare e fiume: rumore filtrato che "respira" come le onde
    const onda = a === 'molo' || a === 'ponte' ? 0.035 + 0.03 * Math.max(0, Math.sin(state.t * 0.9)) : 0;
    const fiume = a === 'fiume' ? 0.07 * state.acqua : 0;
    water.gain.setTargetAtTime(Math.max(onda, fiume), now, 0.5);
    hum.gain.setTargetAtTime(a === 'caverne' ? 0.08 : a === 'foresta' ? 0.06 : 0.025, now, 0.6);
    ambT -= dt;
    if (ambT > 0) return;
    if (a === 'foresta') { ambT = 1.2 + Math.random() * 3; const f = 2400 + Math.random() * 1400; tone(f, 0.09, 'sine', 0.016, 1.3); setTimeout(() => tone(f * 1.25, 0.08, 'sine', 0.013, 0.9), 130); }
    else if (a === 'caverne') { ambT = 0.8 + Math.random() * 2.5; tone(1600 + Math.random() * 900, 0.07, 'sine', 0.025, 0.45); }
    else if (a === 'molo') { ambT = 4 + Math.random() * 6; tone(1900, 0.18, 'triangle', 0.012, 0.7); setTimeout(() => tone(1700, 0.22, 'triangle', 0.01, 0.6), 260); }
    else if (a === 'piazza') { ambT = 3 + Math.random() * 4; const n = [523, 659, 784, 1047][Math.floor(Math.random() * 4)]; tone(n, 1.4, 'sine', 0.012); }
    else ambT = 1;
  },
  light() { [392, 523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.6, 'sine', 0.05), i * 110)); },
  sparkle() { [1047, 1319, 1568, 2093].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'sine', 0.05), i * 70)); },
  context() { return ensure() ? ctx : null; },
  output() { return master; },
  unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
  get enabled() { return enabled; },
  toggle() {
    enabled = !enabled;
    try { localStorage.setItem('lu_audio', enabled ? 'on' : 'off'); } catch (e) {}
    if (ensure()) master.gain.setTargetAtTime(enabled ? 0.5 : 0, ctx.currentTime, 0.05);
    return enabled;
  },
  step() { tone(90 + Math.random() * 20, 0.06, 'triangle', 0.05); },
  open() { tone(520, 0.12, 'sine', 0.08, 1.5); },
  close() { tone(600, 0.1, 'sine', 0.06, 0.6); },
  join() { tone(660, 0.15, 'sine', 0.07); setTimeout(() => tone(880, 0.2, 'sine', 0.07), 120); },
  leave() { tone(660, 0.15, 'sine', 0.05); setTimeout(() => tone(440, 0.2, 'sine', 0.05), 120); },
  pop() { tone(700, 0.08, 'square', 0.04, 1.8); },
  coin() { tone(988, 0.08, 'square', 0.05); setTimeout(() => tone(1319, 0.25, 'square', 0.05), 80); },
  clunk() { tone(110, 0.25, 'sawtooth', 0.06, 0.5); },
};
