// Scoperte personali: ogni visitatore ha il suo taccuino, salvato solo nel suo browser (localStorage).
// Non passa dalla rete e non interferisce con gli altri.
// Ogni segreto viene da un dettaglio dei primi capitoli del libro.
import * as THREE from 'three';
import { h } from './util.js?v=202611191652';

export const SECRETS = [
  { id: 'gara', dove: 'marechiaro', nome: 'La gara al molo', aiuto: 'Sophia tiene il punteggio da quando aveva sei anni. Parti dalla fontana.' },
  { id: 'conchiglie', dove: 'marechiaro', nome: 'Le conchiglie di Luca', aiuto: 'Qualcuno le ha lasciate sul molo.' },
  { id: 'lampara', dove: 'marechiaro', nome: 'La lampara a prua', aiuto: 'Guarda bene la barca di Marco.' },
  { id: 'delfini', dove: 'marechiaro', nome: 'I tursiopi', aiuto: 'Si vedono solo andando per mare.' },
  { id: 'rune-grotta', dove: 'grotta', nome: 'Le rune azzurre', aiuto: 'Nella grotta, una fila di segni brilla sulla parete.' },
  { id: 'silenzio', dove: 'grotta', nome: 'Il silenzio', aiuto: 'Fermati nel tunnel e ascolta.' },
  { id: 'sale', dove: 'grotta', nome: 'Sale che brilla', aiuto: 'Tocca le pareti della caverna.' },
  { id: 'canzone', dove: 'luminos', nome: 'La canzone delle raccoglitrici', aiuto: "Ascolta l'anziana del sale." },
  { id: 'cerchio-1', dove: 'luminos', nome: 'Un cerchio dei primi Guardiani', aiuto: 'Su una terrazza dei Giardini, quasi cancellato.' },
  { id: 'cerchio-2', dove: 'luminos', nome: 'Un altro cerchio', aiuto: "Vicino all'arena." },
  { id: 'cerchio-3', dove: 'luminos', nome: 'Il terzo cerchio', aiuto: 'Sulla spiaggia, tra le rocce con le rune.' },
  { id: 'albero', dove: 'luminos', nome: "L'albero che respira", aiuto: 'Nei Giardini, un albero cambia colore.' },
  { id: 'aquiloni', dove: 'luminos', nome: 'Gli uccelli dalla coda lunga', aiuto: 'Volano bassi sopra i Giardini.' },
  { id: 'lampare', dove: 'luminos', nome: 'Le lampare', aiuto: "Quando i soli tramontano, guarda l'orizzonte dal belvedere." },
];
const LUOGO = { marechiaro: 'Marechiaro', grotta: 'Grotta dei Sussurri', luminos: 'Luminos' };

// Rune inventate per il mondo (non sono testo del libro): tratti semplici disegnati su canvas.
export const RUNE = {
  vento: [[0.5, 0.12, 0.5, 0.88], [0.5, 0.3, 0.8, 0.12], [0.5, 0.52, 0.8, 0.34]],
  roccia: [[0.32, 0.12, 0.32, 0.88], [0.32, 0.22, 0.72, 0.42], [0.72, 0.42, 0.32, 0.62]],
  acqua: [[0.5, 0.12, 0.5, 0.88], [0.22, 0.38, 0.5, 0.12], [0.78, 0.38, 0.5, 0.12], [0.3, 0.88, 0.7, 0.88]],
  luce: [[0.28, 0.12, 0.28, 0.88], [0.72, 0.12, 0.72, 0.88], [0.28, 0.25, 0.72, 0.75], [0.72, 0.25, 0.28, 0.75]],
};
export function drawRune(g, segno, x, y, size, color = '#f5c56b', lw = 6) {
  g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round';
  for (const [a, b, c, d] of RUNE[segno] || []) { g.beginPath(); g.moveTo(x + a * size, y + b * size); g.lineTo(x + c * size, y + d * size); g.stroke(); }
}
export function runeImg(segno) {
  const c = document.createElement('canvas'); c.width = c.height = 120; const g = c.getContext('2d');
  g.fillStyle = '#26223a'; g.fillRect(0, 0, 120, 120); drawRune(g, segno, 15, 15, 90);
  c.setAttribute('aria-hidden', 'true'); c.style.cssText = 'width:60px;height:60px;border-radius:8px;flex:none';
  return c;
}

export function createSecrets({ scene, ui, audio, onChange }) {
  const KEY = 'lu_scoperte';
  let found = new Set();
  try { found = new Set((localStorage.getItem(KEY) || '').split(',').filter(id => SECRETS.some(s => s.id === id))); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, [...found].join(',')); } catch (e) {} };

  // scintille dorate: un'unica nuvola di punti riutilizzata
  const N = 60, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3);
  const pts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)),
    new THREE.PointsMaterial({ color: 0xffe08a, size: 0.09, transparent: true, depthWrite: false }));
  pts.visible = false; pts.frustumCulled = false; scene.add(pts);
  let life = 0;
  function sparkle(at) {
    for (let i = 0; i < N; i++) {
      pos[i * 3] = at.x; pos[i * 3 + 1] = at.y; pos[i * 3 + 2] = at.z;
      const a = Math.random() * 6.28, e = Math.random() * 1.2, s = 0.8 + Math.random() * 1.4;
      vel[i * 3] = Math.cos(a) * Math.cos(e) * s; vel[i * 3 + 1] = Math.sin(e) * s + 0.8; vel[i * 3 + 2] = Math.sin(a) * Math.cos(e) * s;
    }
    life = 1.4; pts.visible = true;
  }

  return {
    get count() { return found.size; },
    total: SECRETS.length,
    has: id => found.has(id),
    discover(id, at) {
      const s = SECRETS.find(x => x.id === id);
      if (!s || found.has(id)) return false;
      found.add(id); save();
      if (at) sparkle(at);
      audio.sparkle();
      ui.toast(`✨ Scoperta ${found.size}/${SECRETS.length}: ${s.nome}`, 'found');
      onChange?.(found.size, s);
      return true;
    },
    update(dt) {
      if (life <= 0) return;
      life -= dt;
      for (let i = 0; i < N; i++) { vel[i * 3 + 1] -= 3 * dt; pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt; }
      pts.geometry.attributes.position.needsUpdate = true; pts.material.opacity = Math.max(0, life / 1.4);
      if (life <= 0) pts.visible = false;
    },
    panel() {
      const group = (dove) => [h('h3', { style: 'margin-top:16px' }, LUOGO[dove]),
        h('ul', { class: 'list secrets' }, ...SECRETS.filter(s => s.dove === dove).map(s => h('li', { class: found.has(s.id) ? 'ok' : '' },
          h('b', {}, found.has(s.id) ? '✨ ' + s.nome : '❔ ???'), h('span', {}, found.has(s.id) ? 'trovato' : s.aiuto))))];
      return [h('h2', {}, 'Il tuo taccuino'),
        h('div', { class: 'big', style: 'font-size:34px' }, `${found.size}/${SECRETS.length}`),
        h('p', { class: 'muted' }, 'Quello che trovi esplorando. Il taccuino è solo tuo: resta in questo browser e nessun altro lo vede.'),
        ...group('marechiaro'), ...group('grotta'), ...group('luminos'),
        found.size === SECRETS.length ? h('p', { style: 'margin-top:14px' }, 'Hai trovato tutto. Altri segreti arriveranno quando si apriranno i quattro cammini.') : null];
    },
  };
}
