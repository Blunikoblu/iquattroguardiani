// Il taccuino come diario di viaggio: segreti, luoghi, rune, creature, oggetti, distintivi e indizi.
// Tutto resta solo in questo browser (localStorage): nessun account, nessun invio in rete.
// Mantiene la chiave storica 'lu_scoperte' per chi aveva già trovato dei segreti.
import * as THREE from 'three';
import { h } from './util.js?v=202611192230';
import { SECRETS, drawRune } from './secrets.js?v=202611192230';

const LUOGO = { marechiaro: 'Marechiaro', grotta: 'Grotta dei Sussurri', luminos: 'Luminos', cammini: 'I quattro cammini' };

// luoghi esplorabili (id di zona del mondo) e posizione sulla mappa del taccuino (0..1)
export const LUOGHI = [
  { id: 'marechiaro', nome: 'Marechiaro', mx: 0.12, my: 0.62, ico: '⚓' },
  { id: 'scogli', nome: 'Gli scogli di ponente', mx: 0.05, my: 0.8, ico: '🪨' },
  { id: 'grotta', nome: 'La Grotta dei Sussurri', mx: 0.3, my: 0.72, ico: '🕯️' },
  { id: 'lago', nome: 'Il lago di cristallo', mx: 0.36, my: 0.86, ico: '💎' },
  { id: 'spiaggia', nome: 'La spiaggia di sale', mx: 0.52, my: 0.6, ico: '✨' },
  { id: 'percorso', nome: 'Il ponte sospeso', mx: 0.5, my: 0.85, ico: '🌉' },
  { id: 'ponte', nome: 'Il ponte di luce', mx: 0.62, my: 0.55, ico: '🌈' },
  { id: 'giardini', nome: 'I Giardini Sospesi', mx: 0.7, my: 0.55, ico: '🌸' },
  { id: 'arena', nome: "Il Giardino dell'Equilibrio", mx: 0.7, my: 0.78, ico: '⚖️' },
  { id: 'belvedere', nome: 'Il belvedere', mx: 0.7, my: 0.33, ico: '🔭' },
  { id: 'selva', nome: 'La Selva di Maestrale', mx: 0.58, my: 0.12, ico: '🌳' },
  { id: 'monte', nome: 'Il Monte Zavorra', mx: 0.74, my: 0.08, ico: '⛰️' },
  { id: 'risacca', nome: 'La Risacca', mx: 0.88, my: 0.16, ico: '🌊' },
  { id: 'solaria', nome: 'Solaria', mx: 0.9, my: 0.36, ico: '🏛️' },
];
// creature che si possono incontrare
export const CREATURE = [
  { id: 'gatto', nome: 'I gatti del porto', ico: '🐈', dove: 'Marechiaro', aiuto: 'Dormono al sole sulla banchina.' },
  { id: 'gabbiano', nome: 'I gabbiani', ico: '🕊️', dove: 'Marechiaro', aiuto: 'Luca li sente anche da lontano.' },
  { id: 'tursiope', nome: 'I tursiopi', ico: '🐬', dove: 'Marechiaro', aiuto: 'Vanno chiamati dal fondo del molo.' },
  { id: 'granchio', nome: 'Il granchio della grotta', ico: '🦀', dove: 'Grotta', aiuto: 'Vive tra i sassi vicino al lago.' },
  { id: 'farfalla', nome: 'Le farfalle', ico: '🦋', dove: 'Luminos', aiuto: 'Tra i fiori dei Giardini.' },
  { id: 'coda-lunga', nome: 'Gli uccelli dalla coda lunga', ico: '🪁', dove: 'Luminos', aiuto: 'Volano bassi sopra i Giardini.' },
  { id: 'lupo', nome: 'Il lupo di foglie dorate', ico: '🐺', dove: 'Giardini Sospesi', aiuto: 'Nei Giardini Sospesi si mostra solo a chi sa chiamare la natura.' },
  { id: 'pesci', nome: 'I pesci d\'aria', ico: '🐟', dove: 'Selva di Maestrale', aiuto: 'Passano in banco, bassi, sopra il sentiero.' },
  { id: 'colombe', nome: 'Le colombe di sale', ico: '🕊', dove: 'Solaria', aiuto: 'Si posano sulle cupole.' },
];
export const OGGETTI = [
  { id: 'vetro', nome: 'Un vetro di mare', ico: '🔹', desc: 'Liscio, azzurro, levigato dalle onde. Era tra gli scogli dove i tursiopi ti hanno portato.' },
  { id: 'conchiglia', nome: 'La conchiglia di cristallo', ico: '🐚', desc: 'Era nella sala dietro la porta invisibile della grotta.' },
  { id: 'piuma', nome: 'Una piuma di vento', ico: '🪶', desc: 'Il vento della Selva non smette di muoverla, nemmeno nel taccuino.' },
  { id: 'scaglia', nome: 'Una scaglia d\'oro', ico: '🟡', desc: 'Una scheggia di roccia del Monte Zavorra, con una venatura dorata.' },
  { id: 'goccia', nome: 'Una goccia di Risacca', ico: '💧', desc: 'Non evapora e non cade: resta ferma, e brilla.' },
  { id: 'tessera', nome: 'Una tessera di luce', ico: '🔆', desc: 'Una piccola tessera dorata, caduta da una cupola di Solaria.' },
];
export const DISTINTIVI = [
  { id: 'primo', nome: 'Primo segreto', ico: '🔎', desc: 'Hai trovato il tuo primo segreto.' },
  { id: 'pietra', nome: 'La pietra ti ha scelto', ico: '💠', desc: 'Hai preso una pietra sull\'isola del lago.' },
  { id: 'poteri', nome: 'Quattro doni', ico: '🌟', desc: 'Hai usato il potere di tutti e quattro i Guardiani.' },
  { id: 'gara', nome: 'Gara al molo', ico: '🏃', desc: 'Hai corso dalla fontana al palo del molo.' },
  { id: 'vincitore', nome: 'Primo al palo', ico: '🥇', desc: 'Hai vinto una gara contro altri Guardiani.' },
  { id: 'marea', nome: 'Marea di luce', ico: '🌅', desc: 'Hai raccolto i cristalli della marea insieme agli altri.' },
  { id: 'ponte', nome: 'Il ponte sospeso', ico: '🌉', desc: 'Sei arrivato alla piattaforma finale.' },
  { id: 'eco', nome: 'L\'eco della grotta', ico: '🔔', desc: 'Hai ricomposto la sequenza delle rune.' },
  { id: 'porta', nome: 'La porta invisibile', ico: '🚪', desc: 'Quattro doni hanno aperto la porta nella roccia.' },
  { id: 'delfini', nome: 'Amico dei tursiopi', ico: '🐬', desc: 'Hai seguito i tursiopi fino agli scogli.' },
  { id: 'rune', nome: 'Cercatore di rune', ico: '🪬', desc: 'Hai raccolto tutte le rune.' },
  { id: 'esploratore', nome: 'Esploratore', ico: '🧭', desc: 'Hai visitato tutti i luoghi.' },
  { id: 'insieme', nome: 'Insieme', ico: '🤝', desc: 'Hai aiutato un altro Guardiano in un\'impresa comune.' },
  { id: 'lettore', nome: 'Dal libro', ico: '📖', desc: 'Sei arrivato dal libro o hai trovato una parola nascosta tra le pagine.' },
];

const fmtData = ts => { try { return new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }); } catch (e) { return ''; } };

export function createDiario({ scene, ui, audio, onChange, rune }) {
  const OLD = 'lu_scoperte', KEY = 'lu_diario';
  let d = { segreti: {}, luoghi: {}, rune: {}, creature: {}, oggetti: {}, distintivi: {}, tut: {}, poteri: {} };
  try { const j = JSON.parse(localStorage.getItem(KEY) || '{}'); for (const k in d) if (j[k] && typeof j[k] === 'object') d[k] = j[k]; } catch (e) {}
  try { for (const id of (localStorage.getItem(OLD) || '').split(',')) if (SECRETS.some(s => s.id === id) && !d.segreti[id]) d.segreti[id] = { t: Date.now(), dove: '' }; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(d)); localStorage.setItem(OLD, Object.keys(d.segreti).join(',')); } catch (e) {} };

  // scintille dorate quando trovi qualcosa
  const N = 60, pos = new Float32Array(N * 3), vel = new Float32Array(N * 3);
  const pts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)),
    new THREE.PointsMaterial({ color: new THREE.Color(0xffe08a).multiplyScalar(3.4), size: 0.09, transparent: true, depthWrite: false }));
  pts.visible = false; pts.frustumCulled = false; scene.add(pts);
  let life = 0;
  function sparkle(at) {
    if (!at) return;
    for (let i = 0; i < N; i++) {
      pos[i * 3] = at.x; pos[i * 3 + 1] = at.y; pos[i * 3 + 2] = at.z;
      const a = Math.random() * 6.28, e = Math.random() * 1.2, s = 0.8 + Math.random() * 1.4;
      vel[i * 3] = Math.cos(a) * Math.cos(e) * s; vel[i * 3 + 1] = Math.sin(e) * s + 0.8; vel[i * 3 + 2] = Math.sin(a) * Math.cos(e) * s;
    }
    life = 1.4; pts.visible = true;
  }
  let dove = '';
  const changed = () => { save(); onChange?.(api); };

  function badge(id, quiet) {
    const b = DISTINTIVI.find(x => x.id === id); if (!b || d.distintivi[id]) return false;
    d.distintivi[id] = { t: Date.now(), dove }; changed();
    if (!quiet) { ui.toast(`${b.ico} Distintivo: ${b.nome}`, 'found'); audio.light?.(); }
    return true;
  }
  function checkAll() {
    if (rune && Object.keys(d.rune).length >= rune.length) badge('rune');
    if (LUOGHI.every(l => d.luoghi[l.id])) badge('esploratore');
    if (['marco', 'sophia', 'giulia', 'luca'].every(g => d.poteri[g])) badge('poteri');
  }

  const api = {
    get count() { return Object.keys(d.segreti).length; },
    total: SECRETS.length,
    data: d,
    has: id => !!d.segreti[id],
    setDove(z) { dove = z; },
    sparkle,
    discover(id, at) {
      const s = SECRETS.find(x => x.id === id);
      if (!s || d.segreti[id]) return false;
      d.segreti[id] = { t: Date.now(), dove }; changed();
      sparkle(at); audio.sparkle();
      ui.toast(`✨ Scoperta ${api.count}/${SECRETS.length}: ${s.nome}`, 'found');
      if (api.count === 1) setTimeout(() => badge('primo'), 900);
      return true;
    },
    luogo(id) { if (!LUOGHI.some(l => l.id === id) || d.luoghi[id]) return false; d.luoghi[id] = { t: Date.now() }; changed(); checkAll(); return true; },
    runa(id, at) {
      const r = rune?.find(x => x.id === id); if (!r || d.rune[id]) return false;
      d.rune[id] = { t: Date.now(), dove }; changed(); sparkle(at); audio.sparkle();
      ui.toast(`🪬 Runa raccolta (${Object.keys(d.rune).length}/${rune.length}): ${r.nome}`, 'found'); checkAll(); return true;
    },
    creatura(id) { const c = CREATURE.find(x => x.id === id); if (!c || d.creature[id]) return false; d.creature[id] = { t: Date.now(), dove }; changed(); ui.toast(`${c.ico} Nel taccuino: ${c.nome}`, 'found'); return true; },
    oggetto(id, at) { const o = OGGETTI.find(x => x.id === id); if (!o || d.oggetti[id]) return false; d.oggetti[id] = { t: Date.now(), dove }; changed(); sparkle(at); audio.sparkle(); ui.toast(`${o.ico} Oggetto speciale: ${o.nome}`, 'found'); return true; },
    hasOggetto: id => !!d.oggetti[id],
    hasRuna: id => !!d.rune[id],
    hasBadge: id => !!d.distintivi[id],
    badge,
    potere(g) { if (!d.poteri[g]) { d.poteri[g] = Date.now(); changed(); checkAll(); } },
    tut(step) { if (d.tut[step]) return false; d.tut[step] = Date.now(); changed(); return true; },
    hasTut: s => !!d.tut[s],
    update(dt) {
      if (life <= 0) return;
      life -= dt;
      for (let i = 0; i < N; i++) { vel[i * 3 + 1] -= 3 * dt; pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt; }
      pts.geometry.attributes.position.needsUpdate = true; pts.material.opacity = Math.max(0, life / 1.4);
      if (life <= 0) pts.visible = false;
    },
    // il prossimo indizio: il primo passo non ancora fatto, nell'ordine in cui si incontrano
    prossimo() {
      const ordine = ['conchiglie', 'lampara', 'gara', 'delfini', 'rune-grotta', 'silenzio', 'sale', 'canzone', 'albero', 'aquiloni', 'cerchio-3', 'cerchio-1', 'cerchio-2', 'lampare'];
      for (const id of ordine) if (!d.segreti[id]) return SECRETS.find(s => s.id === id).aiuto;
      if (!d.distintivi.eco) return 'Nella caverna di sale, quattro pietre con le rune aspettano l\'ordine giusto. L\'ordine è scritto nel tunnel.';
      if (!d.distintivi.porta) return 'Nella caverna c\'è una porta che si vede solo con i quattro doni. Chiedi aiuto a un altro Guardiano, o cambia Guardiano dal menu.';
      if (!d.distintivi.ponte) return 'A sud della spiaggia di sale, il ponte sospeso aspetta chi sa saltare.';
      if (rune && Object.keys(d.rune).length < rune.length) { const r = rune.find(x => !d.rune[x.id]); return r.indizio; }
      const l = LUOGHI.find(x => !d.luoghi[x.id]); if (l) return `Non sei ancora stato qui: ${l.nome}.`;
      return 'Hai visto tutto quello che c\'è, per ora. Torna quando si accende la prossima marea di luce.';
    },
    panel(tab = 'viaggio') { return panelNodes(tab); },
    // parola segreta stampata nel libro: si confronta con impronte SHA-256, niente viene inviato
    async parola(txt, hashes) {
      const norm = String(txt || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
      if (!norm || !hashes?.length || !crypto?.subtle) return false;
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('luminos:' + norm));
      const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
      return hashes.includes(hex);
    },
  };

  // --- il pannello del taccuino ---
  const ico = (glyph, on) => h('span', { class: 'jico' + (on ? '' : ' off'), 'aria-hidden': 'true' }, on ? glyph : '?');
  const voce = (on, glyph, titolo, testo, quando) => h('li', { class: 'jitem' + (on ? ' ok' : '') }, ico(glyph, on),
    h('div', {}, h('b', {}, on ? titolo : '???'), h('span', {}, testo), on && quando ? h('small', {}, quando) : null));
  const quando = o => o ? `${fmtData(o.t)}${o.dove ? ' · ' + o.dove : ''}` : '';
  function mappa() {
    const c = document.createElement('canvas'); c.width = 640; c.height = 360; c.className = 'jmap'; c.setAttribute('role', 'img');
    c.setAttribute('aria-label', `Mappa: hai esplorato ${Object.keys(d.luoghi).length} luoghi su ${LUOGHI.length}.`);
    const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 640, 360); bg.addColorStop(0, '#f3e9d2'); bg.addColorStop(1, '#e6d6b4'); g.fillStyle = bg; g.fillRect(0, 0, 640, 360);
    g.fillStyle = 'rgba(60,110,160,.22)'; g.beginPath(); g.ellipse(90, 320, 160, 80, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(90,70,40,.35)'; g.setLineDash([6, 6]); g.lineWidth = 2;
    const P = id => { const l = LUOGHI.find(x => x.id === id); return [l.mx * 640, l.my * 360]; };
    for (const [a, b] of [['marechiaro', 'grotta'], ['marechiaro', 'scogli'], ['grotta', 'lago'], ['lago', 'spiaggia'], ['spiaggia', 'percorso'], ['spiaggia', 'ponte'], ['ponte', 'giardini'], ['giardini', 'arena'], ['giardini', 'belvedere'], ['belvedere', 'selva'], ['belvedere', 'monte'], ['belvedere', 'risacca'], ['belvedere', 'solaria']]) {
      g.beginPath(); g.moveTo(...P(a)); g.lineTo(...P(b)); g.stroke();
    }
    g.setLineDash([]); g.textAlign = 'center';
    for (const l of LUOGHI) {
      const [x, y] = P(l.id), on = !!d.luoghi[l.id];
      g.fillStyle = on ? '#2f4f9a' : 'rgba(90,70,40,.25)'; g.beginPath(); g.arc(x, y, 15, 0, 7); g.fill();
      g.font = '16px system-ui'; g.fillStyle = '#fff'; g.fillText(on ? l.ico : '?', x, y + 6);
      g.font = '600 12px Georgia, serif'; g.fillStyle = on ? '#2a2216' : 'rgba(60,45,25,.45)'; g.fillText(on ? l.nome : '…', x, y + 30);
    }
    g.font = 'italic 13px Georgia, serif'; g.fillStyle = '#6a5636'; g.textAlign = 'left'; g.fillText('Il mio viaggio a Luminos', 14, 22);
    return c;
  }
  function runeIcon(r, on) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.fillStyle = on ? '#26223a' : '#d9cdb3'; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill();
    if (on) drawRune(g, r.segno, 14, 14, 36, '#f5c56b', 4);
    else { g.fillStyle = '#8a7a5a'; g.font = 'bold 26px Georgia'; g.textAlign = 'center'; g.fillText('?', 32, 41); }
    c.className = 'jico rune'; c.setAttribute('aria-hidden', 'true'); return c;
  }
  function panelNodes(tab) {
    const nS = Object.keys(d.segreti).length, nL = Object.keys(d.luoghi).length, nR = Object.keys(d.rune).length, nC = Object.keys(d.creature).length, nB = Object.keys(d.distintivi).length;
    const tabs = [['viaggio', 'Viaggio'], ['segreti', 'Segreti'], ['rune', 'Rune'], ['creature', 'Creature'], ['oggetti', 'Oggetti'], ['distintivi', 'Distintivi']];
    const bar = h('div', { class: 'jtabs', role: 'tablist' }, ...tabs.map(([id, n]) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(id === tab), onclick: () => ui.openPanel(panelNodes(id), { label: 'Taccuino' }) }, n)));
    let body;
    if (tab === 'viaggio') body = [
      h('div', { class: 'jsum' },
        h('div', {}, h('b', {}, `${nS}/${SECRETS.length}`), h('span', {}, 'segreti')),
        h('div', {}, h('b', {}, `${nL}/${LUOGHI.length}`), h('span', {}, 'luoghi')),
        h('div', {}, h('b', {}, `${nR}/${rune?.length || 0}`), h('span', {}, 'rune')),
        h('div', {}, h('b', {}, `${nC}/${CREATURE.length}`), h('span', {}, 'creature')),
        h('div', {}, h('b', {}, String(nB)), h('span', {}, 'distintivi'))),
      h('div', { class: 'jnext' }, h('small', {}, 'PROSSIMA SCOPERTA'), h('p', {}, api.prossimo())),
      mappa(),
      h('p', { class: 'muted', style: 'font-size:13px' }, 'Il taccuino è solo tuo: resta in questo browser e nessun altro lo vede.')];
    if (tab === 'segreti') body = ['marechiaro', 'grotta', 'luminos'].flatMap(w => [h('h3', {}, LUOGO[w]),
      h('ul', { class: 'jlist' }, ...SECRETS.filter(s => s.dove === w).map(s => voce(!!d.segreti[s.id], '✨', s.nome, d.segreti[s.id] ? (s.racconto || s.aiuto) : s.aiuto, quando(d.segreti[s.id]))))]);
    if (tab === 'rune') body = [h('p', { class: 'muted' }, 'Rune nascoste nei luoghi. Alcune le legge solo Giulia, altre compaiono solo con la luce di Sophia.'),
      h('ul', { class: 'jlist' }, ...(rune || []).map(r => h('li', { class: 'jitem' + (d.rune[r.id] ? ' ok' : '') }, runeIcon(r, !!d.rune[r.id]),
        h('div', {}, h('b', {}, d.rune[r.id] ? r.nome : '???'), h('span', {}, d.rune[r.id] ? r.luogo : r.indizio), d.rune[r.id] ? h('small', {}, quando(d.rune[r.id])) : null))))];
    if (tab === 'creature') body = [h('ul', { class: 'jlist' }, ...CREATURE.map(c => voce(!!d.creature[c.id], c.ico, c.nome, d.creature[c.id] ? c.dove : c.aiuto, quando(d.creature[c.id]))))];
    if (tab === 'oggetti') body = [h('ul', { class: 'jlist' }, ...OGGETTI.map(o => voce(!!d.oggetti[o.id], o.ico, o.nome, d.oggetti[o.id] ? o.desc : 'Ancora da trovare.', quando(d.oggetti[o.id]))))];
    if (tab === 'distintivi') body = [h('div', { class: 'jbadges' }, ...DISTINTIVI.map(b => h('div', { class: 'jbadge' + (d.distintivi[b.id] ? ' ok' : ''), title: b.desc },
      h('span', { 'aria-hidden': 'true' }, d.distintivi[b.id] ? b.ico : '🔒'), h('b', {}, b.nome), h('small', {}, d.distintivi[b.id] ? fmtData(d.distintivi[b.id].t) : b.desc))))];
    return [h('h2', {}, 'Il tuo viaggio a Luminos'), bar, ...body];
  }
  checkAll();
  return api;
}
