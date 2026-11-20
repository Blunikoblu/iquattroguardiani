// Le attività del mondo: abitanti, creature, caccia alle rune, gara al molo (anche in gruppo),
// marea di luce con i cristalli da raccogliere insieme, ponte sospeso, eco della grotta,
// porta invisibile (quattro doni), richiamo dei tursiopi.
// Sincronizzazione: solo messaggi brevi e validati (net.act). Ciò che dipende dall'ora (la marea) è calcolato
// dall'orologio, uguale per tutti senza server. Tutto funziona anche da soli.
import * as THREE from 'three';
import { h } from './util.js?v=202611201600';
import { tideState, zoneOf } from './world.js?v=202611201600';
import { RUNE_CACCIA } from './rune.js?v=202611201600';
import { drawRune } from './secrets.js?v=202611201600';
import { testo } from './testi.js?v=202611201600';
import { AVATARS } from './config.js?v=202611201600';

const NOMEG = Object.fromEntries(AVATARS.map(a => [a.id, a.nome]));

export function createAttivita({ world, scene, ui, audio, diario, powers, net, me, hooks }) {
  const K = world.kit, { mesh, lam, glow, box, canvasTex, sign, halo, add, npc, solidR, animated, gM, gG, gL, LX, GX, CZ, GXL, GZ } = K;
  const areas = world.areas;
  const now = () => performance.now() / 1000;
  const near = (x, z, r) => { const p = me(); return Math.hypot(p.x - x, p.z - z) <= r; };
  let mute = false; // interazioni con gli altri disattivate

  // ---------------------------------------------------------------- abitanti
  const abitanti = [];
  function abitante(kind, x, z, yaw, parent, nome, storia, gioco, extra) {
    const av = npc(kind, x, z, yaw, { parent }); solidR(x, z, 0.45);
    abitanti.push({ x, z });
    add({ id: 'npc-' + nome, name: nome, pos: [x, 1, z], radius: 2.2, markerY: 2.35, desc: 'Un abitante.',
      open: () => { diario.tut('abitante'); av.play('wave'); const t1 = storia.map(id => testo(id)).filter(Boolean), t2 = testo(gioco);
        return [h('h2', {}, nome), ...t1.map(t => h('p', { class: 'quote' }, t)), t2 ? h('p', {}, t2) : null, extra?.() || null]; } });
    return av;
  }
  abitante('pescatore', 10.4, 16.2, -Math.PI * 0.75, gM, 'Il pescatore', ['pescatore-1', 'pescatore-2'], 'pescatore-g');
  abitante('bambina', -9.6, 13.9, Math.PI * 0.6, gM, 'La bambina del gatto', ['bambina-1'], 'bambina-g');
  abitante('fornaia', -10.2, 18.3, Math.PI, gM, 'Donna Rosa', ['fornaia-1'], 'fornaia-g');
  abitante('raccoglitrice', LX + 2.6, -4.6, Math.PI, gL, 'La raccoglitrice del ponte', ['guida-luce-1'], 'guida-luce-g');
  // Tonino, l'anziana e le raccoglitrici (già nel mondo) contano come abitanti per il primo passo del tutorial
  abitanti.push({ x: -2.9, z: 13.4 }, { x: LX + 1, z: 5.6 });

  // ---------------------------------------------------------------- creature
  const catPos = [[-4.1, 13.15], [13.2, 18.8], [-12.4, 15.3]];
  catPos.forEach(([x, z], i) => add({ id: 'gatto-' + i, name: 'Un gatto del porto', pos: [x, 0.3, z], radius: 1.8, markerY: 0.8, desc: 'Dorme al sole.',
    use: () => { diario.creatura('gatto'); hooks.toast(me().av === 'luca' ? testo('gatto-luca', 'gatto-g') : testo('gatto-g')); } }));
  // il granchio della grotta: cammina di lato vicino al lago
  const crab = new THREE.Group(); gG.add(crab);
  { const cm = lam(0xc0503a); const b = mesh(new THREE.SphereGeometry(0.16, 10, 8), cm, 0, 0.1, 0, crab); b.scale.set(1.3, 0.55, 1);
    for (const s of [-1, 1]) { mesh(new THREE.SphereGeometry(0.06, 8, 6), cm, s * 0.2, 0.12, -0.12, crab); for (let k = 0; k < 3; k++) { const l = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 4), cm, s * 0.2, 0.06, 0.04 * k - 0.02, crab); l.rotation.z = s * 1.0; } }
    for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.025, 6, 4), glow(0x111111, { k: 1 }), s * 0.05, 0.18, -0.14, crab); }
  const crabObj = add({ id: 'granchio', name: 'Un granchio', pos: [GX - 8, 0.2, CZ + 5], radius: 1.8, markerY: 0.7, desc: 'Cammina di lato.',
    use: () => { diario.creatura('granchio'); hooks.toast('🦀 Il granchio si ferma, alza le chele e riparte di lato, verso i sassi.'); } });
  animated.push((t) => { if (!gG.visible) return; const a = t * 0.12; const x = GX - 8 + Math.sin(a) * 2.2, z = CZ + 5 + Math.sin(a * 0.7) * 0.8; crab.position.set(x, 0.02, z); crab.rotation.y = 0.3; crabObj.pos.set(x, 0.2, z); });
  add({ id: 'farfalle', name: 'Le farfalle', pos: [GXL - 2, 0.8, GZ - 3], radius: 2.4, markerY: 1.6, desc: 'Volano tra i fiori.',
    use: () => { diario.creatura('farfalla'); hooks.toast(me().av === 'luca' ? testo('farfalle-luca', 'farfalle-g') : testo('farfalle-g')); } });

  // ---------------------------------------------------------------- caccia alle rune
  const runeObjs = [];
  for (const r of RUNE_CACCIA) {
    const tex = canvasTex(128, 128, g => { g.clearRect(0, 0, 128, 128); drawRune(g, r.segno, 20, 20, 88, r.tipo === 'giulia' ? '#8a7a66' : '#ffd88a', r.tipo === 'giulia' ? 7 : 9); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    if (r.tipo !== 'giulia') { m.material.color.setScalar(2.6); m.material.blending = THREE.AdditiveBlending; }
    m.position.set(r.x, r.y, r.z); m.rotation.y = r.ry; scene.add(m);
    const o = { r, m, revealed: 0 };
    o.obj = add({ id: r.id, name: r.tipo === 'giulia' ? 'Segni consumati' : 'Una runa', pos: [r.x, r.y, r.z], radius: 1.6, markerY: r.y + 0.5, hidden: true, desc: 'Una runa nascosta.',
      enabled: () => !diario.hasRuna(r.id) && (r.tipo !== 'sophia' || o.revealed > now()),
      use: () => {
        if (diario.hasRuna(r.id)) return;
        if (r.tipo === 'sophia' && o.revealed <= now()) return;
        if (r.tipo === 'giulia' && me().av !== 'giulia') { hooks.toast('Sono segni graffiati, troppo consumati per capirli. Giulia saprebbe leggerli.'); return; }
        diario.runa(r.id, m.position);
      } });
    if (r.tipo === 'giulia') powers.spot({ id: 'sp-' + r.id, x: r.x, z: r.z, r: 3, who: ['giulia'], act: (g, local) => { if (!local || diario.hasRuna(r.id)) return false; diario.runa(r.id, m.position); return true; } });
    if (r.tipo === 'sophia') powers.spot({ id: 'sp-' + r.id, x: r.x, z: r.z, r: 6, who: ['sophia'], shared: true, act: () => { if (diario.hasRuna(r.id)) return false; o.revealed = now() + 60; if (near(r.x, r.z, 7)) hooks.toast('✨ La luce rivela una runa che prima non c\'era.'); return true; } });
    runeObjs.push(o);
  }
  animated.push((t) => {
    for (const o of runeObjs) {
      const got = diario.hasRuna(o.r.id), vis = o.r.tipo === 'sophia' ? o.revealed > now() : true;
      o.m.visible = !got && vis; if (o.m.visible && o.r.tipo !== 'giulia') o.m.material.opacity = 0.65 + Math.sin(t * 2.5 + o.r.x) * 0.3;
    }
  });

  // ---------------------------------------------------------------- poteri: effetti generali
  // Sophia rivela gli oggetti nascosti vicini (per 30 secondi) e risveglia i cristalli
  const wake = new THREE.PointLight(0xbfe4ff, 0, 18, 1.4); scene.add(wake); let wakeT = 0;
  powers.spot({ id: 'luce-rivela', x: 0, z: 0, r: 1e9, who: ['sophia'], act: (g, local) => {
    if (!local) return false; const p = me(); let n = 0;
    for (const o of world.objects) if (o.hidden && o.secret && !diario.has(o.secret) && Math.hypot(o.pos.x - p.x, o.pos.z - p.z) < 8) { o.revealUntil = now() + 30; n++; }
    const z = zoneOf(p.x, p.z); if (z === 'lago' || z === 'grotta' || z === 'sala') { wake.position.set(p.x, 3, p.z); wakeT = 2.2; n++; }
    if (n) hooks.toast(z === 'lago' ? '✨ I cristalli si risvegliano: per un momento la caverna brilla tutta.' : '✨ La luce mostra qualcosa che prima non vedevi.');
    return n > 0; } });
  animated.push((t, dt) => { if (wakeT > 0) { wakeT -= dt; wake.intensity = 60 * Math.sin(Math.min(1, wakeT / 2.2) * Math.PI); } else wake.intensity = 0; });
  // Giulia sente l'eco delle cose nascoste
  powers.spot({ id: 'memoria-eco', x: 0, z: 0, r: 1e9, who: ['giulia'], act: (g, local) => {
    if (!local) return false; const p = me();
    const o = world.objects.find(o => o.hidden && o.secret && !diario.has(o.secret) && Math.hypot(o.pos.x - p.x, o.pos.z - p.z) < 10);
    if (!o) return false; hooks.toast('🪨 La pietra marrone vibra: qui vicino c\'è qualcosa da scoprire.'); o.revealUntil = now() + 12; return true; } });
  // Luca chiama gli animali vicini
  const gull = new THREE.Group(); gM.add(gull); gull.visible = false;
  { const gm = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }); mesh(new THREE.SphereGeometry(0.14, 8, 6), gm, 0, 0, 0, gull).scale.set(1, 0.8, 2);
    for (const s of [-1, 1]) { const w = mesh(new THREE.PlaneGeometry(0.6, 0.18), gm, s * 0.32, 0.03, 0, gull); w.rotation.x = -Math.PI / 2; w.userData.s = s; } }
  let gullT = 0, gullFrom = new THREE.Vector3(), gullTo = new THREE.Vector3();
  powers.spot({ id: 'natura-richiamo', x: 0, z: 0, r: 1e9, who: ['luca'], act: (g, local) => {
    if (!local) return false; const p = me(), z = zoneOf(p.x, p.z);
    if (z === 'marechiaro' || z === 'scogli') { gullFrom.set(p.x + 14, 12, p.z - 14); gullTo.set(p.x + 0.8, 1.6, p.z + 0.6); gullT = 6; gull.visible = true; diario.creatura('gabbiano'); hooks.toast('🕊️ Un gabbiano scende dal cielo e ti gira intorno.'); return true; }
    if (z === 'giardini') { diario.creatura('farfalla'); lupoT = 90; hooks.toast('🦋 Le farfalle dei Giardini ti vengono incontro. E tra le terrazze compare il lupo di foglie dorate.'); return true; }
    if (z === 'lago' || z === 'grotta') { diario.creatura('granchio'); hooks.toast('🦀 Il granchio della grotta si avvicina di lato.'); return true; }
    return false; } });
  animated.push((t, dt) => { if (gullT <= 0) return; gullT -= dt; const k = Math.min(1, (6 - gullT) / 2), back = gullT < 1.5 ? 1 - gullT / 1.5 : 0;
    const a = t * 3; gull.position.lerpVectors(gullFrom, gullTo, k).add(new THREE.Vector3(Math.cos(a) * 1.2 * k, back * 10, Math.sin(a) * 1.2 * k)); gull.rotation.y = -a;
    gull.children.forEach(c => { if (c.userData.s) c.rotation.z = c.userData.s * Math.sin(t * 14) * 0.5; }); if (gullT <= 0) gull.visible = false; });
  // il lupo di foglie dorate: nei Giardini Sospesi, compare quando Luca chiama la natura
  let lupoT = 0;
  const wolf = new THREE.Group(); wolf.position.set(GXL + 3, 0, GZ - 3); wolf.rotation.y = 2.4; gL.add(wolf); wolf.visible = false;
  { const wm = new THREE.MeshStandardMaterial({ color: 0xd8a83a, emissive: 0x6a4a10, emissiveIntensity: 0.6, roughness: 0.5, flatShading: true });
    const b = mesh(new THREE.IcosahedronGeometry(0.5, 1), wm, 0, 0.75, 0, wolf); b.scale.set(0.8, 0.7, 1.5);
    mesh(new THREE.IcosahedronGeometry(0.3, 1), wm, 0, 1.05, -0.75, wolf); mesh(new THREE.ConeGeometry(0.12, 0.35, 5), wm, 0, 0.98, -1.05, wolf).rotation.x = -Math.PI / 2;
    for (const s of [-1, 1]) { mesh(new THREE.ConeGeometry(0.07, 0.2, 4), wm, s * 0.14, 1.32, -0.72, wolf); for (const z of [-0.45, 0.45]) mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.55, 5), wm, s * 0.2, 0.28, z, wolf); }
    mesh(new THREE.ConeGeometry(0.12, 0.7, 5), wm, 0, 0.85, 0.85, wolf).rotation.x = 1.0; }
  add({ id: 'lupo', name: 'Il lupo di foglie dorate', pos: [GXL + 3, 1, GZ - 3], radius: 2.6, markerY: 2.0, desc: 'Ricoperto di foglie dorate.', enabled: () => lupoT > 0,
    use: () => { diario.creatura('lupo'); hooks.toast(me().av === 'luca' ? testo('lupo-luca', 'lupo-g') : testo('lupo-g')); } });
  animated.push((t, dt) => { if (lupoT > 0) lupoT -= dt; wolf.visible = lupoT > 0; });
  // Marco e l'acqua: lo zampillo della fontana
  const jet = mesh(new THREE.CylinderGeometry(0.05, 0.12, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9fd8ff).multiplyScalar(1.3), transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }), -6, 1.4, 15.6, gM); jet.visible = false; let jetT = 0;
  powers.spot({ id: 'fontana-acqua', x: -6, z: 15.6, r: 3.5, who: ['marco'], shared: true, act: () => { jetT = 4; jet.visible = true; if (near(-6, 15.6, 6)) hooks.toast('💧 L\'acqua della fontana si alza in uno zampillo, alto e dritto, poi ricade.'); return true; } });
  animated.push((t, dt) => { if (jetT <= 0) return; jetT -= dt; const k = Math.min(1, (4 - jetT) * 2) * Math.min(1, jetT); jet.scale.set(1, 0.1 + k * 3.2, 1); jet.position.y = 1.2 + jet.scale.y / 2; if (jetT <= 0) jet.visible = false; });

  // ---------------------------------------------------------------- inviti (senza chat: solo pulsanti)
  const invBox = h('div', { id: 'invito', hidden: true, role: 'dialog', 'aria-live': 'polite' }); document.body.append(invBox);
  let invT = 0;
  function invito(text, yes, no = 'No, grazie', secs = 12) {
    if (mute) return;
    invBox.replaceChildren(h('p', {}, text), h('div', {}, h('button', { type: 'button', class: 'btn', onclick: () => { invBox.hidden = true; yes(); } }, 'Partecipo'), h('button', { type: 'button', class: 'link', onclick: () => { invBox.hidden = true; } }, no)));
    invBox.hidden = false; clearTimeout(invT); invT = setTimeout(() => { invBox.hidden = true; }, secs * 1000);
  }
  const big = h('div', { id: 'bigcount', 'aria-live': 'assertive' }); document.body.append(big);
  function bigText(t, ms = 900) { big.textContent = t; big.classList.remove('on'); void big.offsetWidth; big.classList.add('on'); clearTimeout(big._t); big._t = setTimeout(() => big.classList.remove('on'), ms); }
  const chip = h('div', { id: 'attChip', hidden: true }); document.body.append(chip);

  // ---------------------------------------------------------------- la gara al molo (da soli o insieme)
  const FX = -6, FZ = 15.6, PALO = { x: 1.35, z: 0.35 };
  const arrows = [];
  { const pts = [[FX, FZ], [-3.2, 14.6], [-0.4, 13.2], [0, 10], [0, 6.5], [0.6, 3], [1.1, 1.2]];
    const ag = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.22, -0.1), new THREE.Vector2(0, 0.14), new THREE.Vector2(0.22, -0.1), new THREE.Vector2(0.12, -0.1), new THREE.Vector2(0, 0.02), new THREE.Vector2(-0.12, -0.1)])).rotateX(-Math.PI / 2);
    const am = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf5c56b).multiplyScalar(1.6), transparent: true, opacity: 0, depthWrite: false });
    for (let i = 0; i < pts.length - 1; i++) { const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.2));
      for (let k = 0; k < n; k++) { const u = (k + 0.5) / n, a = mesh(ag, am, x0 + (x1 - x0) * u, 0.04, z0 + (z1 - z0) * u, gM); a.rotation.y = Math.atan2(-(x1 - x0), -(z1 - z0)) + Math.PI; a.scale.setScalar(1.6); arrows.push(a); } }
    arrows.mat = am; }
  let race = null; // { id, at (s), joined, running, t0, results: Map(nome -> t), mine }
  const raceId = () => Math.random().toString(36).slice(2, 10);
  const othersInMarechiaro = () => [...hooks.others().values()].filter(o => (o.has && o.x < 100) || o.meta.zona === 'marechiaro' || o.meta.zona === 'scogli').length;
  function raceUse() {
    ui.closePanel();
    if (race && !race.done) { hooks.toast('C\'è già una gara in corso.'); return; }
    if (net.online && othersInMarechiaro() > 0 && !mute) {
      ui.openPanel([h('h2', {}, 'La gara al molo'), h('p', {}, 'Dalla fontana al palo in fondo al molo. Puoi correre da solo o sfidare i Guardiani che sono a Marechiaro.'),
        h('div', { class: 'menu' },
          h('button', { type: 'button', onclick: () => { ui.closePanel(); startSolo(); } }, '🏃 Corri da solo', h('small', {}, 'parti subito')),
          h('button', { type: 'button', onclick: () => { ui.closePanel(); callRace(); } }, '🏁 Sfida gli altri', h('small', {}, 'partenza insieme tra 10 secondi')))], { label: 'La gara al molo' });
    } else startSolo();
  }
  function startSolo() { race = { id: 'solo', solo: true, running: true, t0: now(), results: new Map() }; bigText('Via!'); audio.coin(); hooks.toast('Corri fino al palo in fondo al molo. (Maiusc per correre più forte)'); }
  function callRace() {
    const id = raceId(); race = { id, at: now() + 10, joined: true, results: new Map(), host: true };
    net.act('gara', { c: 'call', r: id, in: 10 });
    hooks.toast('🏁 Hai proposto una gara: partenza tra 10 secondi. Resta vicino alla fontana!');
  }
  function onRaceMsg(id, d, o) {
    if (d.c === 'call') {
      if (race && !race.done) return;
      race = { id: d.r, at: now() + d.in, joined: false, results: new Map() };
      const z = zoneOf(me().x, me().z);
      if (z === 'marechiaro' || z === 'scogli') invito(`🏁 ${o.meta.nick} propone una gara al molo! Partenza tra ${d.in} secondi dalla fontana.`, () => { race.joined = true; hooks.walkTo(FX + 1.2, FZ - 0.6); }, 'No, grazie', d.in);
    }
    if (d.c === 'fine' && race && race.id === d.r) { race.results.set(id, { n: o.meta.nick, t: d.t }); o.av.play('party'); if (race.mine != null) showResults(); }
  }
  function showResults() {
    const list = [...race.results.entries()].sort((a, b) => a[1].t - b[1].t);
    const first = list[0];
    if (list.length >= 2 && first[0] === 'me') diario.badge('vincitore');
    if (list.length >= 2) diario.badge('insieme');
    ui.openPanel([h('h2', {}, 'La gara al molo'), h('ol', { class: 'podio' }, ...list.map(([k, r], i) => h('li', { class: k === 'me' ? 'me' : '' }, h('span', {}, ['🥇', '🥈', '🥉'][i] || `${i + 1}.`), h('b', {}, k === 'me' ? `${r.n} (tu)` : r.n), h('span', {}, `${r.t.toFixed(1).replace('.', ',')} s`)))),
      h('p', { class: 'quote' }, '«Trentuno a trenta. Per me.»'),
      h('p', { class: 'muted' }, 'Gli altri arrivi compaiono qui man mano.')], { label: 'Risultati della gara' });
  }
  function raceTick(t, dt) {
    const p = me();
    arrows.mat.opacity += (((race && !race.done && (race.running || race.joined)) || near(FX, FZ, 3) ? 0.85 : 0) - arrows.mat.opacity) * Math.min(1, dt * 4);
    arrows.forEach((a, i) => { a.position.y = 0.04 + (Math.sin(t * 6 - i * 0.6) > 0.7 ? 0.02 : 0); });
    if (!race || race.done) return;
    if (!race.running && race.at) {
      const left = race.at - now();
      chip.hidden = !race.joined; if (race.joined) chip.textContent = `🏁 Gara: partenza tra ${Math.max(0, Math.ceil(left))} s · resta vicino alla fontana`;
      if (race.joined && left <= 3 && left > 0) { const n = Math.ceil(left); if (n !== race.last) { race.last = n; bigText(String(n)); audio.pop(); } }
      if (left <= 0) {
        chip.hidden = true;
        if (race.joined && Math.hypot(p.x - FX, p.z - FZ) < 4.5) { race.running = true; race.t0 = now(); bigText('Via!'); audio.coin(); }
        else { if (race.joined) hooks.toast('Eri troppo lontano dalla fontana: la gara è partita senza di te.'); race.done = true; }
      }
      return;
    }
    if (race.running && Math.hypot(p.x - PALO.x, p.z - PALO.z) < 1.0) {
      const s = now() - race.t0; race.running = false; race.mine = s;
      diario.badge('gara'); hooks.discover('gara', { x: PALO.x, y: 1.4, z: PALO.z }); audio.coin(); hooks.party();
      let best = parseFloat(hooks.store.get('gara', '0')) || 0; const record = !best || s < best; if (record) hooks.store.set('gara', String(s));
      if (race.solo) {
        race.done = true;
        ui.openPanel([h('h2', {}, 'La gara al molo'), h('div', { class: 'big' }, `${s.toFixed(1).replace('.', ',')} s`),
          h('p', {}, record ? 'Il tuo record. Sophia direbbe che vale doppio.' : `Il tuo record resta ${best.toFixed(1).replace('.', ',')} secondi.`),
          h('p', { class: 'quote' }, '«Trentuno a trenta. Per me.»'),
          h('p', { class: 'muted' }, 'È una gara che va avanti da quando Sophia e Marco avevano sei anni: chi arriva prima al molo, alla fontana, in cima alla scogliera. Il punteggio lo tiene Sophia, e nessuno ha mai osato controllarlo.')], { label: 'La gara al molo' });
      } else {
        race.results.set('me', { n: me().nick, t: s }); net.act('gara', { c: 'fine', r: race.id, t: +s.toFixed(2) });
        setTimeout(() => { showResults(); race.done = true; }, 4000);
      }
    } else if (race.running && (now() - race.t0 > 90 || zoneOf(p.x, p.z) !== 'marechiaro')) { race.running = false; race.done = true; }
  }

  // ---------------------------------------------------------------- marea di luce: cristalli da raccogliere insieme
  const NC = 10, crysG = new THREE.OctahedronGeometry(0.16, 0), crysM = new THREE.MeshStandardMaterial({ color: 0xfff4d8, emissive: 0xffd88a, emissiveIntensity: 3.4, roughness: 0.2 });
  const crys = []; for (let i = 0; i < NC; i++) { const m = mesh(crysG, crysM, 0, 0, 0, gL); m.visible = false; m.scale.y = 1.6; m.userData.noShadow = true; crys.push(m); }
  const beam = mesh(new THREE.CylinderGeometry(0.6, 1.4, 30, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe8b0).multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), LX, 15, 2, gL);
  let tide = { n: -1, got: new Set(), mine: new Set(), who: new Set(), done: false, beamT: 0 };
  const srand = s => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  function tidePositions(n) { const r = srand(1 + (n % 100000) * 7919), out = []; while (out.length < NC) { const x = LX - 13 + r() * 24, z = -4.5 + r() * 12; if (out.every(([a, b]) => Math.hypot(a - x, b - z) > 2.2) && Math.hypot(x - LX - 1, z - 5.6) > 1.5 && z > -3) out.push([x, z]); } return out; }
  function collectCrystal(c, local, byId) {
    if (tide.got.has(c)) return; tide.got.add(c); crys[c].visible = false;
    if (local) { tide.mine.add(c); audio.sparkle(); diario.sparkle(crys[c].position.clone().setY(0.6)); net.act('mc', { n: tide.n, c }); tide.who.add('me'); }
    else if (byId) tide.who.add(byId);
    if (tide.got.size >= NC && !tide.done) {
      tide.done = true; tide.beamT = 8; audio.light?.();
      const z = zoneOf(me().x, me().z);
      if (z === 'spiaggia' && tide.mine.size) { hooks.toast('🌅 Tutti i cristalli insieme: la spiaggia si accende come a mezzogiorno.'); diario.badge('marea'); if (tide.who.size >= 2) diario.badge('insieme'); }
    }
  }
  // la marea corrente (stesso numero per tutti, dall'orologio): si prepara anche se arriva prima un messaggio
  function ensureTide() { const n = Math.floor(Date.now() / 240000); if (n !== tide.n) tide = { n, got: new Set(), mine: new Set(), who: new Set(), done: false, beamT: 0, pos: tidePositions(n) }; }
  function tideTick(t, dt) {
    const st = tideState(), active = st.t < 69;
    ensureTide();
    const z = zoneOf(me().x, me().z), onBeach = z === 'spiaggia';
    crys.forEach((m, i) => { const vis = active && !tide.got.has(i) && (st.t > (i * 0.7)); m.visible = vis; if (vis) { m.position.set(tide.pos[i][0], 0.45 + Math.sin(t * 2.2 + i) * 0.08, tide.pos[i][1]); m.rotation.y = t + i; } });
    if (active && onBeach) { const p = me(); for (let i = 0; i < NC; i++) if (crys[i].visible && Math.hypot(crys[i].position.x - p.x, crys[i].position.z - p.z) < 0.9) collectCrystal(i, true); }
    const showChip = active && onBeach && !(race && race.joined && !race.done);
    if (showChip) { chip.hidden = false; chip.textContent = tide.done ? '🌅 Cristalli della marea: tutti raccolti!' : `✨ Cristalli della marea: ${tide.got.size}/${NC} · ancora ${Math.max(0, Math.ceil(69 - st.t))} s`; }
    else if (chip.textContent.startsWith('✨') || chip.textContent.startsWith('🌅')) chip.hidden = true;
    if (tide.beamT > 0) { tide.beamT -= dt; beam.material.opacity = Math.min(1, tide.beamT / 2) * 0.55; } else beam.material.opacity = 0;
  }

  // ---------------------------------------------------------------- ponte sospeso: piattaforme, salti, punti di controllo
  const PZ0 = -5.2, plat = [
    { x: 0, z: -7.4, r: 1.7, h: 0 }, { x: 0.4, z: -10.6, r: 1.0, h: 0 }, { x: -0.6, z: -13.4, r: 1.0, h: 0.3 }, { x: 0.8, z: -16.2, r: 1.1, h: 0.6, cp: 1 },
    { x: 2.4, z: -19.0, r: 0.9, h: 0.6, bob: 1 }, { x: 0.6, z: -21.6, r: 0.9, h: 0.9 }, { x: -1.6, z: -23.9, r: 1.0, h: 0.6, bob: 1 }, { x: -0.6, z: -26.9, r: 1.4, h: 0.6, cp: 2, pill: 1 },
    { x: 1.4, z: -29.7, r: 0.9, h: 0.9 }, { x: 0.2, z: -32.3, r: 0.9, h: 1.2, bob: 1 }, { x: 0, z: -36.8, r: 2.6, h: 1.0, fine: 1 },
  ].map(p => ({ ...p, x: LX + p.x }));
  areas.push({ id: 'percorso', x0: LX - 7, x1: LX + 7, z0: -40.5, z1: PZ0 });
  const platG = new THREE.Group(); gL.add(platG);
  const rimM = glow(0xfff0c8, { k: 2.2 });
  plat.forEach((p, i) => {
    const top = mesh(new THREE.CylinderGeometry(p.r, p.r * 0.92, 0.35, 20), K.islandMat, p.x, p.h - 0.175, p.z, platG);
    const und = mesh(new THREE.ConeGeometry(p.r * 0.9, p.r * 2.2, 10), K.islandUnder, p.x, p.h - 0.35 - p.r * 1.1, p.z, platG); und.rotation.x = Math.PI;
    const rim = mesh(new THREE.TorusGeometry(p.r, 0.03, 4, 32), rimM, p.x, p.h + 0.01, p.z, platG); rim.rotation.x = Math.PI / 2;
    p.meshes = [top, und, rim];
    if (p.cp) { const ring = mesh(new THREE.TorusGeometry(0.7, 0.06, 6, 24), glow(0x9fe8ff, { k: 2.4 }), p.x, p.h + 1.2, p.z, platG); p.ring = ring; }
    if (p.pill) { mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.4, 8), K.saltWhite, p.x + 0.5, p.h + 0.7, p.z, platG); p.pillar = { x: p.x + 0.5, z: p.z, r: 0.35 }; }
  });
  const pillarSolids = plat.filter(p => p.pillar).map(p => { const s = { x: p.pillar.x, z: p.pillar.z, r: p.pillar.r }; world.solids.push(s); return s; });
  const signT = canvasTex(400, 200, g => { g.fillStyle = 'rgba(30,24,60,.9)'; g.beginPath(); g.roundRect(0, 0, 400, 200, 18); g.fill(); g.textAlign = 'center'; g.fillStyle = '#f5c56b'; g.font = 'bold 34px Georgia'; g.fillText('Il ponte sospeso', 200, 70); g.fillStyle = '#efeaf8'; g.font = '24px system-ui'; g.fillText('Salta: barra spaziatrice o ⤒', 200, 120); g.fillText('Se cadi, riparti dall\'ultimo anello', 200, 160); });
  sign(1.8, 0.9, signT, LX - 2.6, 1.5, -6.2, 0, gL);
  let checkpoint = { x: LX, z: -5.6 }, cpReached = 0;
  function platH(p, t) { return p.h + (p.bob ? Math.sin(t * 1.1 + p.z) * 0.22 : 0); }
  let tNow = 0;
  function groundAt(x, z) {
    if (x < 386 || x > 413 || z > -6.2) return 0; // fuori dal percorso: terreno piano
    for (const p of plat) if (Math.hypot(x - p.x, z - p.z) <= p.r + 0.05) return platH(p, tNow);
    return null;
  }
  function percorsoTick(t, dt) {
    tNow = t;
    plat.forEach(p => { if (!p.bob) return; const y = platH(p, t); p.meshes[0].position.y = y - 0.175; p.meshes[1].position.y = y - 0.35 - p.r * 1.1; p.meshes[2].position.y = y + 0.01; });
    plat.forEach(p => { if (p.ring) p.ring.rotation.y = t * 1.5; });
    const q = me();
    plat.forEach((p, i) => {
      if (Math.hypot(q.x - p.x, q.z - p.z) > p.r || Math.abs(q.y - platH(p, t)) > 0.3) return;
      if (p.cp && cpReached < p.cp) { cpReached = p.cp; checkpoint = { x: p.x, z: p.z }; hooks.toast('💫 Punto di controllo: se cadi, riparti da qui.'); audio.pop(); }
      if (p.fine && !diario.hasBadge('ponte')) { diario.badge('ponte'); hooks.party(); bigText('Arrivato!', 1400); }
    });
    if (zoneOf(q.x, q.z) !== 'percorso' && q.z > -6) { cpReached = 0; checkpoint = { x: LX, z: -5.6 }; }
  }
  function onFall() { hooks.fadeTo(() => hooks.teleport(checkpoint.x, checkpoint.z, Math.PI), '#fff6e0'); hooks.toast('Il mare di nubi ti riporta all\'ultimo punto di controllo.'); }

  // ---------------------------------------------------------------- l'eco della grotta: quattro pietre, un ordine
  // Le rune del tunnel si leggono da destra a sinistra: le ultime quattro danno l'ordine (acqua, vento, roccia, luce).
  const SOL = ['acqua', 'vento', 'roccia', 'luce'];
  let seq = [];
  const pillars = SOL.slice().sort().map((segno, i) => {
    const a = Math.PI / 4 + i * Math.PI / 2, x = GX + Math.cos(a) * 12.2, z = CZ + Math.sin(a) * 12.2 * 0.95;
    const tex = canvasTex(128, 128, g => { g.clearRect(0, 0, 128, 128); drawRune(g, segno, 18, 18, 92, '#bfe8ff', 8); });
    mesh(new THREE.CylinderGeometry(0.32, 0.4, 1.5, 7), lam(0x4a5260), x, 0.75, z, gG);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    face.position.set(x, 1.62, z); face.rotation.x = -Math.PI / 2; gG.add(face);
    solidR(x, z, 0.5);
    const p = { segno, x, z, face, lit: 0 };
    add({ id: 'pilastro-' + segno, name: 'Una pietra con una runa', pos: [x, 1, z], radius: 1.9, markerY: 2.1, desc: 'Quattro pietre intorno al lago.', use: () => touchPillar(p) });
    return p;
  });
  function touchPillar(p) {
    if (diario.hasBadge('eco')) { hooks.toast('La pietra risponde con un suono basso e lungo. L\'eco l\'hai già sentita.'); return; }
    seq.push(p.segno); p.lit = 1; audio.tone?.(330 + seq.length * 110);
    if (SOL[seq.length - 1] !== p.segno) { seq = []; pillars.forEach(q => { q.lit = 0; }); audio.clunk(); hooks.toast('Le pietre si spengono tutte insieme. L\'ordine non è questo.'); return; }
    if (seq.length === SOL.length) { seq = []; diario.badge('eco'); audio.light?.(); hooks.toast('🔔 Le quattro pietre suonano insieme. Dal lago sale un\'eco lunga, che non torna indietro.'); pillars.forEach(q => { q.lit = 2; }); }
  }
  powers.spot({ id: 'rune-tunnel', x: GX + 0.6, z: 10.2, r: 3.5, who: ['giulia'], act: (g, local) => { if (!local) return false; hooks.toast(testo('tunnel-giulia') ? testo('tunnel-giulia') + ' ' + testo('tunnel-g') : testo('tunnel-g')); return true; } });
  animated.push((t) => { if (!gG.visible) return; pillars.forEach(p => { p.face.material.color.setScalar(p.lit === 2 ? 3 + Math.sin(t * 3) : p.lit ? 2.6 : 0.9); }); });

  // ---------------------------------------------------------------- la porta invisibile: quattro doni insieme
  // Marco riempie la vasca, Luca manda il granchio nella fessura, Giulia legge la runa, e solo alla fine Sophia illumina il simbolo.
  const DA = -0.78, DR = 13.3, DX = GX + Math.cos(DA) * DR, DZ = CZ + Math.sin(DA) * DR * 0.95, DRY = -DA - Math.PI / 2;
  const doorG = new THREE.Group(); doorG.position.set(DX, 0, DZ); doorG.rotation.y = DRY; gG.add(doorG);
  const stoneM = lam(0x5a5f6c);
  mesh(new THREE.BoxGeometry(3.6, 4.2, 0.6), stoneM, 0, 2.1, 0.3, doorG);
  const slab = mesh(new THREE.BoxGeometry(1.8, 2.8, 0.25), lam(0x4a4f5c), 0, 1.4, -0.1, doorG);
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.86, 2.86, 0.3)), new THREE.LineBasicMaterial({ color: new THREE.Color(0xbfe8ff).multiplyScalar(2.6), transparent: true, opacity: 0 })); outline.position.set(0, 1.4, -0.12); doorG.add(outline);
  const mk = (x, y, c) => { const m = mesh(new THREE.CircleGeometry(0.16, 20), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.25 }), x, y, -0.27, doorG); m.rotation.y = Math.PI; return m; };
  const lamps = { m: mk(-1.3, 3.5, 0x3f8cff), l: mk(-0.45, 3.7, 0x5fd06e), g: mk(0.45, 3.7, 0xd89a52), s: mk(1.3, 3.5, 0xffffff) };
  // la vasca (Marco) e la fessura (Luca)
  const toW = (lx, lz) => new THREE.Vector3(lx, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), DRY).add(new THREE.Vector3(DX, 0, DZ));
  const bas = toW(-2.6, -0.9), crk = toW(2.6, -0.9);
  mesh(new THREE.CylinderGeometry(0.7, 0.6, 0.5, 14), stoneM, bas.x, 0.25, bas.z, gG);
  const basW = mesh(new THREE.CircleGeometry(0.58, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5fb8ff).multiplyScalar(1.4), transparent: true, opacity: 0 }), bas.x, 0.4, bas.z, gG); basW.rotation.x = -Math.PI / 2;
  const crack = mesh(new THREE.BoxGeometry(0.25, 1.2, 0.3), lam(0x1a1c22), crk.x, 0.6, crk.z, gG); crack.rotation.y = DRY;
  solid(DX, DZ, 3.2, 1.2); solidR(bas.x, bas.z, 0.75); solidR(crk.x, crk.z, 0.35);
  function solid(x, z, w, d) { world.solids.push({ x, z, w, d }); }
  const runeT = canvasTex(128, 128, g => { g.clearRect(0, 0, 128, 128); drawRune(g, 'roccia', 18, 18, 92, '#e8b878', 8); });
  const doorRune = mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: runeT, transparent: true, depthWrite: false, opacity: 0.35 }), 0, 1.7, -0.24, doorG); doorRune.rotation.y = Math.PI;
  let porta = { m: 0, l: 0, g: 0, s: 0, o: 0, by: new Set() }; // tempi (s) di attivazione
  const PORTA_DUR = 240, APERTA_DUR = 300;
  const attivo = k => porta[k] && now() - porta[k] < (porta.o ? APERTA_DUR + 60 : PORTA_DUR);
  const aperta = () => porta.o && now() - porta.o < APERTA_DUR;
  function portaAct(k, local, by) {
    if (aperta() || attivo(k)) return false;
    if (k === 's' && !(attivo('m') && attivo('l') && attivo('g'))) { if (local) hooks.toast('La luce scivola sul simbolo e si spegne. Prima devono svegliarsi gli altri tre segni.'); return false; }
    porta[k] = now(); if (by) porta.by.add(by); else porta.by.add('me');
    const nome = { m: 'La vasca si riempie d\'acqua che sale dal lago.', l: 'Il granchio si infila nella fessura: si sente uno scatto nella roccia.', g: 'La runa sulla porta si scalda e comincia a brillare.', s: 'Il simbolo in alto si accende di luce bianca.' }[k];
    if (near(DX, DZ, 10)) hooks.toast(nome);
    audio.pop();
    if (k === 's') { porta.o = now(); audio.light?.(); if (near(DX, DZ, 12)) { hooks.toast('🚪 Una porta che prima non c\'era si apre nella roccia.'); diario.badge('porta'); if (porta.by.size >= 2 && porta.by.has('me')) diario.badge('insieme'); } }
    return true;
  }
  const solo = () => !net.online || hooks.others().size === 0;
  const hintPorta = g => `Qui servirebbe ${{ m: 'Marco', l: 'Luca', g: 'Giulia', s: 'Sophia' }[g]}. ${solo() ? 'Da solo puoi cambiare Guardiano dal menu: i segni restano accesi per qualche minuto.' : 'Chiedi aiuto a un altro Guardiano, o cambia Guardiano dal menu.'}`;
  powers.spot({ id: 'porta-m', x: bas.x, z: bas.z, r: 2.6, who: ['marco'], shared: true, act: (g, l, by) => portaAct('m', l, by), hint: () => hintPorta('m') });
  powers.spot({ id: 'porta-l', x: crk.x, z: crk.z, r: 2.6, who: ['luca'], shared: true, act: (g, l, by) => { const ok = portaAct('l', l, by); if (ok) diario.creatura('granchio'); return ok; }, hint: () => hintPorta('l') });
  powers.spot({ id: 'porta-g', x: DX, z: DZ, r: 3.2, who: ['giulia'], shared: true, act: (g, l, by) => portaAct('g', l, by), hint: () => hintPorta('g') });
  powers.spot({ id: 'porta-s', x: DX, z: DZ, r: 3.6, who: ['sophia'], shared: true, act: (g, l, by) => portaAct('s', l, by), hint: () => hintPorta('s') });
  const doorObj = add({ id: 'porta-invisibile', name: 'La parete di roccia', pos: [toW(0, -1.2).x, 1.2, toW(0, -1.2).z], radius: 2.4, markerY: 3.2, desc: 'Una porta che si vede solo con i quattro doni.',
    open: () => aperta()
      ? [h('h2', {}, 'La porta nella roccia'), h('p', {}, 'Dove prima c\'era solo roccia, adesso c\'è un passaggio.'), h('p', {}, h('button', { class: 'btn', type: 'button', onclick: () => { ui.closePanel(); hooks.fadeTo(() => hooks.teleport(245, -8.2, 0), '#0a1020'); } }, 'Entra'))]
      : [h('h2', {}, 'La parete di roccia'), h('p', {}, 'Sulla roccia si intravede il contorno di una porta. Quattro segni, in alto: blu, verde, marrone, bianco.'),
        h('ul', { class: 'list' }, ...[['m', 'Marco', 'riempire la vasca d\'acqua'], ['l', 'Luca', 'mandare una creatura nella fessura'], ['g', 'Giulia', 'leggere la runa sulla porta'], ['s', 'Sophia', 'illuminare il simbolo, per ultima']].map(([k, n, w]) => h('li', {}, h('b', {}, `${attivo(k) ? '✅' : '⬜'} ${n}`), w))),
        h('p', { class: 'muted' }, solo() ? 'Sei da solo: puoi cambiare Guardiano dal menu e usare un dono alla volta. I segni accesi restano accesi per qualche minuto.' : 'Usate le vostre pietre (tasto F o pulsante della pietra) vicino ai segni. Si può fare insieme, o un dono alla volta cambiando Guardiano.')] });
  function portaTick(t, dt) {
    const any = ['m', 'l', 'g', 's'].some(attivo), op = aperta();
    outline.material.opacity += (((any || op) ? 0.9 : near(DX, DZ, 5) ? 0.25 : 0) - outline.material.opacity) * Math.min(1, dt * 3);
    for (const k of ['m', 'l', 'g', 's']) lamps[k].material.opacity = attivo(k) || op ? 0.95 : 0.2;
    basW.material.opacity = attivo('m') || op ? 0.85 : 0; doorRune.material.opacity = attivo('g') || op ? 1 : 0.35;
    slab.position.x += ((op ? 1.9 : 0) - slab.position.x) * Math.min(1, dt * 1.5);
    doorObj.name = op ? 'La porta nella roccia' : 'La parete di roccia';
    if (!op && porta.o) { porta = { m: 0, l: 0, g: 0, s: 0, o: 0, by: new Set() }; }
  }
  // la sala dietro la porta
  areas.push({ id: 'sala', x0: 238, x1: 252, z0: -21, z1: -6.5 });
  { const wallM = lam(0x4a5068);
    box(14.4, 6, 0.5, wallM, 245, 3, -21.2, gG); box(14.4, 6, 0.5, wallM, 245, 3, -6.3, gG); box(0.5, 6, 15, wallM, 237.8, 3, -13.7, gG); box(0.5, 6, 15, wallM, 252.2, 3, -13.7, gG);
    mesh(new THREE.BoxGeometry(14.4, 0.2, 15), lam(0x3a3c4a), 245, -0.1, -13.7, gG); mesh(new THREE.BoxGeometry(14.4, 0.3, 15), lam(0x1e2030), 245, 6.1, -13.7, gG);
    const crM = new THREE.MeshStandardMaterial({ color: 0xeaf4ff, emissive: 0xbfe4ff, emissiveIntensity: 2.2, roughness: 0.2, flatShading: true });
    for (let i = 0; i < 60; i++) { const l = 0.3 + Math.random() * 1.2, m = mesh(new THREE.OctahedronGeometry(1, 0), crM, 239 + Math.random() * 12, 5.9 - l, -20 + Math.random() * 12.5, gG); m.scale.set(0.08, l, 0.08); }
    const sl = new THREE.PointLight(0xcfe8ff, 45, 22, 1.1); sl.position.set(245, 4.5, -14); gG.add(sl); const sl2 = new THREE.PointLight(0x9fd8ff, 20, 12, 1.2); sl2.position.set(245, 2.2, -16); gG.add(sl2);
    mesh(new THREE.CylinderGeometry(0.45, 0.6, 1.0, 10), lam(0x6a7080), 245, 0.5, -16, gG); solidR(245, -16, 0.7);
    const shell = new THREE.Group(); shell.position.set(245, 1.15, -16); gG.add(shell);
    const sm = new THREE.MeshStandardMaterial({ color: 0xf4fbff, emissive: 0x9fd8ff, emissiveIntensity: 1.8, roughness: 0.1, transparent: true, opacity: 0.9 });
    for (let k = 0; k < 7; k++) { const s = mesh(new THREE.SphereGeometry(0.22 - k * 0.025, 12, 8), sm, Math.cos(k * 0.9) * k * 0.035, k * 0.03, Math.sin(k * 0.9) * k * 0.035, shell); s.scale.y = 0.6; }
    animated.push(t => { if (gG.visible) { shell.rotation.y = t * 0.5; shell.visible = !diario.hasOggetto('conchiglia'); } });
    add({ id: 'conchiglia', name: 'La conchiglia di cristallo', pos: [245, 1.2, -16], radius: 2, markerY: 1.9, desc: 'Su un piedistallo, al centro della sala.',
      use: () => { if (diario.oggetto('conchiglia', new THREE.Vector3(245, 1.3, -16))) hooks.toast(testo('conchiglia-1', 'conchiglia-g')); else hooks.toast('La conchiglia è già nel tuo taccuino.'); } });
    add({ id: 'sala-uscita', name: 'Il passaggio', pos: [245, 1, -7.4], radius: 1.8, markerY: 2.6, desc: 'Torna nella caverna.', use: () => hooks.fadeTo(() => { const p = toW(0, -2.4); hooks.teleport(p.x, p.z, DRY + Math.PI); }, '#0a1020') });
  }

  // ---------------------------------------------------------------- il richiamo dei tursiopi e gli scogli di ponente
  areas.push({ id: 'scogli', x0: -19.2, x1: -11.3, z0: 12.4, z1: 15.6 });
  { const rk = [lam(0x6a6258), lam(0x5a534a), lam(0x7a7064)];
    for (let i = 0; i < 26; i++) { const x = -19.5 + Math.random() * 8, z = 11.6 + Math.random() * 4.6; const r = mesh(new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.7, 0), rk[i % 3], x, -0.35 + Math.random() * 0.2, z, gM); r.scale.y = 0.5; }
    box(8.2, 0.5, 3.4, 0x6e665a, -15.3, -0.2, 14, gM);
    for (let i = 0; i < 4; i++) { const p = mesh(new THREE.CircleGeometry(0.3 + Math.random() * 0.3, 14), new THREE.MeshLambertMaterial({ color: 0x3f8ab8, emissive: 0x0a2a40 }), -18 + i * 1.8, 0.06, 12.9 + (i % 2) * 1.6, gM); p.rotation.x = -Math.PI / 2; } }
  const pod2 = [];
  for (let i = 0; i < 3; i++) { const d = new THREE.Group(); gM.add(d); const dm = lam(0x8fa4b8); const b = mesh(new THREE.SphereGeometry(1, 12, 8), dm, 0, 0, 0, d); b.scale.set(0.24, 0.22, 0.75);
    const f = mesh(new THREE.ConeGeometry(0.07, 0.24, 4), lam(0x7a8ea4), 0, 0.22, 0.05, d); f.rotation.x = -0.5; f.scale.z = 0.35; box(0.5, 0.03, 0.14, 0x7a8ea4, 0, 0, 0.8, d); d.visible = false; pod2.push(d); }
  let dolT = 0; // secondi da quando sono stati chiamati (0 = non attivi)
  const DOL_DUR = 180;
  function chiamaDelfini(local, g) {
    if (dolT > 0 && dolT < DOL_DUR) { if (local) hooks.toast('I tursiopi sono già qui: guarda verso gli scogli di ponente.'); return false; }
    dolT = 0.01; diario.creatura('tursiope');
    if (local) { net.act('df', {}); hooks.toast(g === 'luca' ? 'Luca chiude gli occhi e sorride: «Sono felici. Dicono che oggi è un giorno speciale.» I tursiopi nuotano verso ponente: seguili!' : '🐬 Dal largo arrivano i tursiopi. Saltano e nuotano verso ponente: seguili lungo la banchina!'); }
    else if (zoneOf(me().x, me().z) === 'marechiaro') hooks.toast('🐬 Qualcuno ha chiamato i tursiopi: nuotano verso gli scogli di ponente.');
    return true;
  }
  add({ id: 'fondo-molo', name: 'Il fondo del molo', pos: [-0.9, 0.6, 1.0], radius: 1.8, markerY: 1.4, desc: 'Da qui si guarda il mare aperto.',
    open: () => [h('h2', {}, 'Il fondo del molo'), h('p', {}, 'Da qui si vede il mare aperto, fino ai pescherecci lontani.'), h('p', { class: 'muted' }, 'Prova a chiamare i tursiopi. Se sei Luca, puoi anche usare la tua pietra.'),
      h('p', {}, h('button', { class: 'btn', type: 'button', onclick: () => { ui.closePanel(); chiamaDelfini(true, me().av); } }, 'Chiama i tursiopi'))] });
  powers.spot({ id: 'delfini-luca', x: -0.2, z: 1.5, r: 4, who: ['luca'], act: (g, local) => local && chiamaDelfini(true, 'luca') });
  const vetro = mesh(new THREE.OctahedronGeometry(0.12, 1), new THREE.MeshStandardMaterial({ color: 0x9fe0ff, emissive: 0x5fb8ff, emissiveIntensity: 2.4, roughness: 0.1, transparent: true, opacity: 0.85 }), -17.4, 0.25, 13.3, gM); vetro.visible = false;
  const vetroObj = add({ id: 'vetro', name: 'Qualcosa che luccica', pos: [-17.4, 0.25, 13.3], radius: 1.6, markerY: 0.9, hidden: true, desc: 'Tra gli scogli.',
    use: () => { if (dolT <= 0) return; if (diario.oggetto('vetro', vetro.position)) { diario.badge('delfini'); hooks.toast('🔹 Un vetro di mare, liscio e azzurro. I tursiopi saltano ancora una volta, poi tornano al largo.'); } } });
  function delfiniTick(t, dt) {
    if (dolT <= 0) { pod2.forEach(d => { d.visible = false; }); vetro.visible = false; vetroObj.hidden = true; return; }
    dolT += dt; if (dolT > DOL_DUR) { dolT = 0; return; }
    vetro.visible = !diario.hasOggetto('vetro') && dolT > 10; vetroObj.hidden = !vetro.visible;
    if (vetro.visible) vetro.rotation.y = t;
    pod2.forEach((d, i) => {
      const u = Math.min(1, dolT / 14), bx = 8 - u * 26, bz = -2 + u * 9;  // dal molo verso gli scogli
      const ph = ((t * 0.7 + i * 0.33) % 1), j = Math.sin(ph * Math.PI);
      const x = bx + i * 1.4 + (u >= 1 ? Math.cos(t * 0.5 + i * 2) * 2 : 0), z = bz + i * 0.7 + (u >= 1 ? Math.sin(t * 0.5 + i * 2) * 1.2 : 0);
      d.visible = true; d.position.set(x, -0.45 + j * 1.3, z); d.rotation.order = 'YXZ'; d.rotation.set(Math.cos(ph * Math.PI) * 0.9, u < 1 ? Math.PI / 2 - 0.35 : t * 0.5 + i * 2 + Math.PI, 0);
    });
  }

  // ---------------------------------------------------------------- stato condiviso: chi arriva lo chiede, chi c'è risponde
  function shareState() {
    const age = v => v ? Math.min(600, Math.round(now() - v)) : null;
    const pt = { m: age(attivo('m') && porta.m), l: age(attivo('l') && porta.l), g: age(attivo('g') && porta.g), s: age(attivo('s') && porta.s), o: age(aperta() && porta.o) };
    net.act('st', { porta: pt, mc: { n: tide.n, c: [...tide.got] } });
  }
  function onAct(id, k, d, o) {
    if (k === 'gara') { if (!mute || d.c !== 'call') onRaceMsg(id, d, o); return; }
    if (k === 'mc') { ensureTide(); if (d.n === tide.n) collectCrystal(d.c, false, id); return; }
    if (k === 'df') { chiamaDelfini(false); return; }
    if (k === 'st?') { setTimeout(shareState, 300 + Math.random() * 900); return; }
    if (k === 'st') {
      const pt = d.porta || {}, t = now();
      for (const key of ['m', 'l', 'g', 's']) if (pt[key] != null && !porta[key]) porta[key] = t - pt[key];
      if (pt.o != null && !porta.o) porta.o = t - pt.o;
      ensureTide();
      if (d.mc && d.mc.n === tide.n && Array.isArray(d.mc.c)) d.mc.c.slice(0, NC).forEach(c => { if (Number.isInteger(c) && c >= 0 && c < NC) collectCrystal(c, false, id); });
    }
  }

  return {
    groundAt, onFall, raceUse, onAct,
    requestState() { net.act('st?', {}); },
    set mute(v) { mute = v; }, get mute() { return mute; },
    nearAbitante: (x, z) => abitanti.some(a => Math.hypot(a.x - x, a.z - z) < 2.6),
    update(t, dt) { raceTick(t, dt); tideTick(t, dt); percorsoTick(t, dt); portaTick(t, dt); delfiniTick(t, dt); },
  };
}
