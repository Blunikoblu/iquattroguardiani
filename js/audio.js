// Suoni discreti generati al volo (nessun file da scaricare). Disattivabili.
let ctx = null, master = null, hum = null;
let enabled = true, musicOn = true;
try { enabled = localStorage.getItem('lu_audio') !== 'off'; musicOn = localStorage.getItem('lu_musica') !== 'off'; } catch (e) {}

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


// Musica generata al momento, piano e senza ritornelli: una per luogo.
// Marechiaro: re maggiore pentatonico, come una chitarra sul molo. Grotta: poche note lunghe, quasi silenzio.
// Luminos: modo lidio, campane di cristallo; di notte più rade.
const SCALES = {
  marechiaro: { root: 62, steps: [0, 2, 4, 7, 9], chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [-3, 0, 4]], wave: 'triangle', every: 0.55, density: 0.55, vol: 0.05, oct: 12 },
  grotta: { root: 57, steps: [0, 3, 7, 10], chords: [[0, 7, 12], [-2, 5, 10]], wave: 'sine', every: 1.6, density: 0.35, vol: 0.035, oct: 12 },
  luminos: { root: 65, steps: [0, 2, 4, 6, 7, 9, 11], chords: [[0, 4, 7, 11], [2, 6, 9, 14], [-5, 2, 7, 11], [7, 11, 14, 18]], wave: 'sine', every: 0.42, density: 0.5, vol: 0.045, oct: 24 },
};
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
let mus = null, musRegion = null, nextNote = 0, nextChord = 0, chordI = 0, musGain = null, lastStep = 0;
function pad(freqs, t, dur, vol) {
  for (const f of freqs) for (const det of [-4, 4]) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; o.detune.value = det;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(musGain); o.start(t); o.stop(t + dur + 0.05);
  }
}
function bell(f, t, wave, vol, dur = 1.6) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = wave; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(musGain); o.start(t); o.stop(t + dur + 0.05);
}
function musicTick(region, night) {
  if (!ctx || !enabled) return;
  if (!musGain) { musGain = ctx.createGain(); musGain.gain.value = 0; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; musGain.connect(lp).connect(master); }
  const now = ctx.currentTime, S = SCALES[region];
  musGain.gain.setTargetAtTime(musicOn && S ? 1 : 0, now, region !== musRegion ? 1.2 : 0.4);
  if (region !== musRegion) { musRegion = region; nextNote = now + 1.5; nextChord = now + 0.5; chordI = 0; }
  if (!S || !musicOn) return;
  const quiet = region === 'luminos' && night > 0.5 ? 0.55 : 1;
  while (nextChord < now + 1) { const c = S.chords[chordI++ % S.chords.length]; pad(c.map(n => mtof(S.root - 12 + n)), nextChord, 9, 0.012 * quiet); nextChord += 8; }
  while (nextNote < now + 1) {
    if (Math.random() < S.density * quiet) { lastStep = Math.max(0, Math.min(S.steps.length * 2 - 1, lastStep + Math.floor(Math.random() * 5) - 2));
      const n = S.root + S.steps[lastStep % S.steps.length] + Math.floor(lastStep / S.steps.length) * 12;
      bell(mtof(n), nextNote, S.wave, S.vol * quiet, region === 'grotta' ? 3.5 : 1.8); if (region === 'luminos' && Math.random() < 0.3) bell(mtof(n + S.oct), nextNote + 0.02, 'sine', S.vol * 0.35 * quiet, 2.4); }
    nextNote += S.every * (Math.random() < 0.2 ? 2 : 1);
  }
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
    // nella grotta: «non si sentiva cadere nemmeno una goccia»
    else if (a === 'caverne') { ambT = 1; }
    else if (a === 'molo') { ambT = 4 + Math.random() * 6; tone(1900, 0.18, 'triangle', 0.012, 0.7); setTimeout(() => tone(1700, 0.22, 'triangle', 0.01, 0.6), 260); }
    else if (a === 'piazza') { ambT = 3 + Math.random() * 4; const n = [523, 659, 784, 1047][Math.floor(Math.random() * 4)]; tone(n, 1.4, 'sine', 0.012); }
    else ambT = 1;
  },
  music(region, night = 0) { musicTick(region, night); },
  get musicOn() { return musicOn; },
  toggleMusic() { musicOn = !musicOn; try { localStorage.setItem('lu_musica', musicOn ? 'on' : 'off'); } catch (e) {} return musicOn; },
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
