// I quattro cammini del belvedere: Selva di Maestrale, Monte Zavorra, Risacca, Solaria.
// Sono luoghi da esplorare SENZA la trama del libro (scelta di Nicola): paesaggi, creature, un enigma
// per il dono di un Guardiano, un oggetto speciale, una runa. Niente personaggi né eventi oltre il capitolo 5.
// Ogni luogo è un'isola sopra il mare di nubi, lontana dalle altre (si vede solo quella in cui ti trovi).
import * as THREE from 'three';
import { h } from './util.js?v=202611191219';
import { testo } from './testi.js?v=202611191219';

export const LUOGHI_X = { selva: 600, monte: 700, risacca: 800, solaria: 900 };
const REG = { V: 'selva', Z: 'monte', R: 'risacca', S: 'solaria' };

export function createLuoghi({ world, scene, ui, audio, diario, powers, me, hooks }) {
  const K = world.kit, { mesh, lam, glow, canvasTex, sign, halo, add, animated } = K;
  const groups = {}, info = {};
  const solid = (s) => { world.solids.push(s); return s; };
  const near = (x, z, r) => { const p = me(); return Math.hypot(p.x - x, p.z - z) <= r; };
  const serve = (g, n) => `Qui servirebbe il dono di ${n}. Puoi cambiare Guardiano dal menu, o aspettare un amico che lo sia.`;

  function base(id, opt) {
    const CX = LUOGHI_X[id], g = new THREE.Group(); g.visible = false; scene.add(g); groups[id] = g;
    // cielo
    const sky = new THREE.SphereGeometry(280, 24, 12), col = new Float32Array(sky.attributes.position.count * 3), top = new THREE.Color(opt.skyTop), hor = new THREE.Color(opt.skyHor), c = new THREE.Color();
    for (let i = 0; i < sky.attributes.position.count; i++) { c.copy(hor).lerp(top, Math.min(1, Math.max(0, sky.attributes.position.getY(i) / 280) * 2)); c.toArray(col, i * 3); }
    sky.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const sk = mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }), CX, 0, 0, g); sk.renderOrder = -1;
    // i due soli di Luminos, come nel libro
    mesh(new THREE.CircleGeometry(8, 24), glow(0xf2f6ff, { fog: false }), CX - 60, 40, -240, g).lookAt(CX, 0, 0);
    mesh(new THREE.CircleGeometry(10, 24), glow(0xffcc66, { fog: false }), CX - 20, 30, -250, g).lookAt(CX, 0, 0);
    // isola e mare di nubi
    mesh(new THREE.CylinderGeometry(16, 15, 1.2, 28), lam(opt.ground), CX, -0.6, 0, g);
    mesh(new THREE.ConeGeometry(15, 26, 14), lam(opt.under), CX, -14, 0, g).rotation.x = Math.PI;
    mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: opt.clouds, fog: true }), CX, -40, 0, g);
    for (let i = 0; i < 16; i++) { const cl = mesh(new THREE.IcosahedronGeometry(6 + Math.random() * 8, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), CX - 150 + Math.random() * 300, -34 + Math.random() * 4, -150 + Math.random() * 300, g); cl.scale.y = 0.4; }
    g.add(new THREE.HemisphereLight(opt.hemiSky, opt.hemiGround, 1.4));
    const sun = new THREE.DirectionalLight(0xfff0d8, 1.5); sun.position.set(CX - 30, 40, -50); sun.target.position.set(CX, 0, 0); g.add(sun, sun.target);
    // area percorribile e bordo
    world.areas.push({ id, x0: CX - 15, x1: CX + 15, z0: -15, z1: 15 });
    for (let a = 0; a < Math.PI * 2; a += 0.06) solid({ x: CX + Math.cos(a) * 15.3, z: Math.sin(a) * 15.3, r: 0.6 });
    // il cancello di ritorno
    const gate = mesh(new THREE.TorusGeometry(1.4, 0.08, 6, 28, Math.PI), glow(0xfff4d8, { k: 1.6 }), CX, 0, 13.6, g);
    const veil = mesh(new THREE.CircleGeometry(1.35, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.4, side: THREE.DoubleSide }), CX, 0, 13.6, g);
    solid({ x: CX, z: 13.9, r: 1.0 });
    add({ id: 'ritorno-' + id, name: 'Il ponte di luce', pos: [CX, 1, 12.8], radius: 2, markerY: 2.8, desc: 'Torna al belvedere.', use: () => hooks.travel('belvedere') });
    info[id] = { CX, fog: opt.fog };
    return { CX, g };
  }
  // un oggetto speciale che compare quando l'enigma è risolto
  function premio(id, oggId, x, y, z, g, col) {
    const m = mesh(new THREE.OctahedronGeometry(0.16, 1), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2.6, roughness: 0.2 }), x, y, z, g); m.visible = false;
    const o = add({ id: 'premio-' + id, name: 'Qualcosa che brilla', pos: [x, y, z], radius: 1.8, markerY: y + 0.6, hidden: true, desc: 'Un oggetto speciale.',
      enabled: () => m.visible, use: () => { if (diario.oggetto(oggId, m.position)) m.visible = false; } });
    animated.push(t => { if (m.visible) { m.rotation.y = t; m.position.y = y + Math.sin(t * 2) * 0.08; } });
    return { show() { if (!diario.hasOggetto(oggId)) m.visible = true; }, m, o };
  }

  // ---------------------------------------------------------------- Selva di Maestrale
  {
    const { CX, g } = base('selva', { skyTop: 0x5a9a8a, skyHor: 0xd8f0d8, ground: 0x4a6a3a, under: 0x6a5a48, clouds: 0xd8ecd8, hemiSky: 0xe0ffe8, hemiGround: 0x3a4a2a, fog: { c: 0xc8e4cc, near: 30, far: 160 } });
    const bark = lam(0x5a4632), leaf = [lam(0x3f7a4a), lam(0x5a9a52), lam(0x2f6a42)], glowPl = glow(0x9fffc8, { k: 2.2 });
    const trees = [];
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * Math.PI * 2 + Math.random() * 0.2, r = 9 + Math.random() * 5, x = CX + Math.cos(a) * r, z = Math.sin(a) * r;
      if (z > 10 && Math.abs(x - CX) < 4) continue;
      const tg = new THREE.Group(); tg.position.set(x, 0, z); g.add(tg); const hh = 5 + Math.random() * 4;
      mesh(new THREE.CylinderGeometry(0.25, 0.45, hh, 7), bark, 0, hh / 2, 0, tg);
      const crown = new THREE.Group(); crown.position.y = hh; tg.add(crown);
      for (let k = 0; k < 4; k++) { const c = mesh(new THREE.IcosahedronGeometry(1.3 + Math.random(), 0), leaf[k % 3], (Math.random() - 0.5) * 2, Math.random() * 1.2, (Math.random() - 0.5) * 2, crown); c.scale.y = 0.7; }
      tg.rotation.z = -0.08; trees.push({ tg, crown, s: Math.random() * 6 }); solid({ x, z, r: 0.6 });
    }
    // piante luminose e radici intrecciate
    for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, r = 2 + Math.random() * 11, x = CX + Math.cos(a) * r, z = Math.sin(a) * r; mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4), lam(0x3a6a3a), x, 0.2, z, g); mesh(new THREE.SphereGeometry(0.08, 8, 6), glowPl, x, 0.42, z, g); }
    // l'albero più vecchio, e la barriera di radici che chiude la radura a nord
    const oldX = CX - 4, oldZ = -2.5;
    mesh(new THREE.CylinderGeometry(0.9, 1.5, 9, 9), lam(0x4a3a2a), oldX, 4.5, oldZ, g); solid({ x: oldX, z: oldZ, r: 1.5 });
    for (let k = 0; k < 6; k++) { const c = mesh(new THREE.IcosahedronGeometry(2.4, 0), leaf[k % 3], oldX + Math.cos(k) * 2, 9 + Math.sin(k * 2), oldZ + Math.sin(k) * 2, g); c.scale.y = 0.7; }
    const roots = new THREE.Group(); g.add(roots); const rootSolids = [];
    for (let x = CX - 14; x <= CX + 14; x += 1.1) { const r = mesh(new THREE.TorusGeometry(0.6 + Math.random() * 0.4, 0.14, 5, 10, Math.PI), lam(0x5a4228), x, 0, -5.2 + Math.random() * 0.4, roots); r.rotation.y = Math.random(); rootSolids.push(solid({ x, z: -5.2, r: 0.75 })); }
    let open = false;
    const apri = (local) => { if (open) return false; open = true; rootSolids.forEach(s => { s.off = true; }); if (local || near(CX, -4, 12)) hooks.toast('🌿 Le radici si ritirano piano, come se respirassero. A nord si apre una radura.'); premioS.show(); return true; };
    powers.spot({ id: 'selva-albero', x: oldX, z: oldZ, r: 3.6, who: ['luca'], shared: true, act: (gg, l) => apri(l), hint: () => serve('luca', 'Luca') });
    add({ id: 'selva-vecchio', name: 'L\'albero più vecchio', pos: [oldX + 1.2, 1, oldZ + 1.4], radius: 2.4, markerY: 2.4, desc: 'Le sue radici chiudono la radura.',
      open: () => [h('h2', {}, 'L\'albero più vecchio'), h('p', {}, open ? 'Le radici si sono ritirate. La radura a nord è aperta.' : 'Le sue radici si intrecciano fino a chiudere il passaggio verso nord. Sembrano vive.'), h('p', { class: 'muted' }, open ? '' : 'Forse il dono della Natura saprebbe parlarci. (Luca: tasto F o pulsante della pietra)')] });
    // il lupo di foglie dorate, nella radura
    const wolf = new THREE.Group(); wolf.position.set(CX + 5, 0, -10); wolf.rotation.y = -0.6; g.add(wolf);
    { const wm = new THREE.MeshStandardMaterial({ color: 0xd8a83a, emissive: 0x6a4a10, emissiveIntensity: 0.6, roughness: 0.5, flatShading: true });
      const b = mesh(new THREE.IcosahedronGeometry(0.5, 1), wm, 0, 0.75, 0, wolf); b.scale.set(0.8, 0.7, 1.5);
      const hd = mesh(new THREE.IcosahedronGeometry(0.3, 1), wm, 0, 1.05, -0.75, wolf); mesh(new THREE.ConeGeometry(0.12, 0.35, 5), wm, 0, 0.98, -1.05, wolf).rotation.x = -Math.PI / 2;
      for (const s of [-1, 1]) { mesh(new THREE.ConeGeometry(0.07, 0.2, 4), wm, s * 0.14, 1.32, -0.72, wolf); for (const z of [-0.45, 0.45]) mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.55, 5), wm, s * 0.2, 0.28, z, wolf); }
      const tl = mesh(new THREE.ConeGeometry(0.12, 0.7, 5), wm, 0, 0.85, 0.85, wolf); tl.rotation.x = 1.0; }
    solid({ x: CX + 5, z: -10, r: 0.8 });
    add({ id: 'selva-lupo', name: 'Il lupo di foglie dorate', pos: [CX + 5, 1, -10], radius: 2.6, markerY: 2.0, desc: 'Ricoperto di foglie dorate.',
      use: () => { diario.creatura('lupo'); hooks.toast(me().av === 'luca' ? testo('lupo-luca', 'lupo-g') : testo('lupo-g')); } });
    const premioS = premio('selva', 'piuma', CX - 6, 0.8, -11, g, 0xd8ffe8);
    // foglie trasportate dal vento
    const NL = 120, lp = new Float32Array(NL * 3); for (let i = 0; i < NL; i++) { lp[i * 3] = CX - 15 + Math.random() * 30; lp[i * 3 + 1] = Math.random() * 8; lp[i * 3 + 2] = -15 + Math.random() * 30; }
    const leaves = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(lp, 3)), new THREE.PointsMaterial({ color: 0x9ad87a, size: 0.12 })); g.add(leaves);
    animated.push((t, dt) => { if (!g.visible) return;
      for (let i = 0; i < NL; i++) { lp[i * 3] += dt * (2.2 + (i % 5) * 0.4); lp[i * 3 + 1] += Math.sin(t * 2 + i) * dt * 0.4; if (lp[i * 3] > CX + 15) lp[i * 3] = CX - 15; }
      leaves.geometry.attributes.position.needsUpdate = true;
      for (const tr of trees) { tr.tg.rotation.z = -0.08 + Math.sin(t * 1.3 + tr.s) * 0.03; tr.crown.rotation.x = Math.sin(t * 1.7 + tr.s) * 0.06; }
      roots.children.forEach((r, i) => { r.scale.setScalar(Math.max(0.01, r.scale.x + ((open ? 0.01 : 1) - r.scale.x) * dt * 1.5)); });
      wolf.visible = open; });
  }

  // ---------------------------------------------------------------- Monte Zavorra
  {
    const { CX, g } = base('monte', { skyTop: 0x3a3a5a, skyHor: 0xd8c8b0, ground: 0x2e2a30, under: 0x3a343a, clouds: 0xd8ccc0, hemiSky: 0xe8dcc8, hemiGround: 0x2a2228, fog: { c: 0xc8bca8, near: 35, far: 170 } });
    const rock = lam(0x34303a), rock2 = lam(0x2a2630), gold = glow(0xe8b84a, { k: 1.8 });
    mesh(new THREE.ConeGeometry(14, 34, 8), rock, CX + 2, 16, -24, g);
    for (let i = 0; i < 14; i++) { const v = mesh(new THREE.BoxGeometry(0.18, 10 + Math.random() * 10, 0.18), gold, CX - 8 + i * 1.3, 8, -18 + Math.sin(i) * 2, g); v.rotation.z = Math.sin(i * 1.7) * 0.5; }
    for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, r = 7 + Math.random() * 6, x = CX + Math.cos(a) * r, z = Math.sin(a) * r * 0.9; if (z > 9 && Math.abs(x - CX) < 4) continue; const m = mesh(new THREE.DodecahedronGeometry(0.8 + Math.random() * 1.2, 0), i % 2 ? rock : rock2, x, 0.4, z, g); m.scale.y = 0.8 + Math.random(); solid({ x, z, r: 1.1 }); }
    // la parete con la nicchia chiusa
    mesh(new THREE.BoxGeometry(10, 6, 2), rock, CX, 3, -13.2, g); solid({ x: CX, z: -13.2, w: 10, d: 2.4 });
    const slab = mesh(new THREE.BoxGeometry(1.8, 2.4, 0.4), rock2, CX, 1.2, -12.1, g);
    for (let i = 0; i < 5; i++) { const v = mesh(new THREE.BoxGeometry(0.08, 4, 0.08), gold, CX - 4 + i * 2, 3, -12.15, g); v.rotation.z = (i - 2) * 0.3; }
    // tre pietre incise con i segni spezzati: Giulia li ricompone
    const pietre = [[-6, -4], [0, -7], [6, -4]].map(([dx, dz], i) => {
      const x = CX + dx, z = dz; mesh(new THREE.BoxGeometry(1.4, 1.6, 0.5), rock2, x, 0.8, z, g); solid({ x, z, r: 0.9 });
      const half = canvasTex(128, 128, c => { c.strokeStyle = '#8a7a5a'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(30, 20 + i * 8); c.lineTo(64, 64); c.lineTo(40, 108); c.stroke(); });
      const full = canvasTex(128, 128, c => { c.strokeStyle = '#ffd88a'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(30, 20 + i * 8); c.lineTo(64, 64); c.lineTo(40, 108); c.moveTo(64, 64); c.lineTo(98, 30 - i * 4); c.moveTo(64, 64); c.lineTo(96, 104); c.stroke(); });
      const face = sign(0.9, 0.9, half, x, 0.95, z + 0.26, 0, g);
      return { x, z, face, full, done: false };
    });
    let aperta = false;
    const fatto = (p, local) => { if (p.done) return false; p.done = true; p.face.material.map = p.full; p.face.material.color.setScalar(2.2); p.face.material.needsUpdate = true; if (local || near(p.x, p.z, 8)) hooks.toast(testo('monte-giulia', 'monte-g'));
      if (pietre.every(q => q.done) && !aperta) { aperta = true; if (near(CX, -8, 14)) hooks.toast('⛰️ Le venature dorate si accendono tutte insieme. Nella parete si apre una nicchia.'); premioZ.show(); } return true; };
    pietre.forEach((p, i) => powers.spot({ id: 'monte-pietra-' + i, x: p.x, z: p.z, r: 2.8, who: ['giulia'], shared: true, act: (gg, l) => fatto(p, l), hint: () => serve('giulia', 'Giulia') }));
    pietre.forEach((p, i) => add({ id: 'monte-segno-' + i, name: 'Una pietra incisa', pos: [p.x, 1, p.z + 0.9], radius: 2.2, markerY: 2, desc: 'Un segno spezzato.',
      open: () => [h('h2', {}, 'Una pietra incisa'), h('p', {}, p.done ? 'Il segno è di nuovo intero e brilla d\'oro.' : 'Un segno inciso a metà, come se il resto si fosse consumato. Chi ricorda com\'era?'), p.done ? null : h('p', { class: 'muted' }, 'Il dono della Memoria saprebbe ricomporlo. (Giulia: tasto F o pulsante della pietra)')] }));
    const premioZ = premio('monte', 'scaglia', CX, 1.1, -11.6, g, 0xffd060);
    animated.push((t, dt) => { if (!g.visible) return; slab.position.y += ((aperta ? -1.3 : 1.2) - slab.position.y) * Math.min(1, dt * 1.2); });
    // il geco che corre sulle venature
    const geco = new THREE.Group(); g.add(geco); { const gm = new THREE.MeshStandardMaterial({ color: 0x8ad06a, emissive: 0x2a5a1a, roughness: 0.5 }); mesh(new THREE.SphereGeometry(0.1, 8, 6), gm, 0, 0, 0, geco).scale.set(0.7, 0.5, 2); mesh(new THREE.ConeGeometry(0.04, 0.3, 4), gm, 0, 0, 0.3, geco).rotation.x = Math.PI / 2; }
    add({ id: 'monte-geco', name: 'Un geco', pos: [CX - 3, 1, -12], radius: 2.4, markerY: 2, desc: 'Corre sulle venature.', use: () => { diario.creatura('geco'); hooks.toast('🦎 Il geco si ferma su una venatura dorata, ti guarda, e sparisce in una fessura.'); } });
    animated.push(t => { if (!g.visible) return; geco.position.set(CX - 3 + Math.sin(t * 0.8) * 2.5, 1.5 + Math.sin(t * 1.3) * 0.8, -12.0); geco.rotation.set(Math.PI / 2, 0, Math.cos(t * 0.8) > 0 ? -Math.PI / 2 : Math.PI / 2); });
  }

  // ---------------------------------------------------------------- Risacca
  {
    const { CX, g } = base('risacca', { skyTop: 0x3a6aa8, skyHor: 0xd8ecff, ground: 0x6a8a7a, under: 0x5a6a6a, clouds: 0xe0f0ff, hemiSky: 0xe0f4ff, hemiGround: 0x3a4a5a, fog: { c: 0xcfe4f8, near: 35, far: 170 } });
    // il fiume di luce che attraversa l'isola (da ovest a est), tra z -4 e 0
    const rv = canvasTex(256, 64, c => { const gr = c.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#7fd4ff'); gr.addColorStop(0.5, '#e8fbff'); gr.addColorStop(1, '#7fd4ff'); c.fillStyle = gr; c.fillRect(0, 0, 256, 64); c.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 40; i++) c.fillRect(Math.random() * 256, Math.random() * 64, 18, 2); });
    rv.wrapS = rv.wrapT = THREE.RepeatWrapping; rv.repeat.set(6, 1);
    const river = mesh(new THREE.PlaneGeometry(32, 5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: rv, color: new THREE.Color(1, 1, 1).multiplyScalar(1.5), transparent: true, opacity: 0.95 }), CX, 0.05, -2, g);
    const riverSolids = []; for (let x = CX - 15; x <= CX + 15; x += 1.2) riverSolids.push(solid({ x, z: -2, w: 1.3, d: 3.6 }));
    // cascate che cadono dal bordo dell'isola
    const falls = []; for (const s of [-1, 1]) { const f = mesh(new THREE.PlaneGeometry(4, 24), new THREE.MeshBasicMaterial({ map: rv, color: new THREE.Color(1, 1, 1).multiplyScalar(1.3), transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }), CX + s * 15.6, -12, -2, g); f.rotation.y = Math.PI / 2; falls.push(f); }
    // le pietre del guado, sommerse finché la corrente non cambia
    const stones = []; for (let k = 0; k < 4; k++) { const s = mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.4, 10), lam(0x8a9aa0), CX + 3, -0.5, 0.6 - k * 1.3, g); stones.push(s); }
    let guado = false;
    const calma = (local) => { if (guado) return false; guado = true; riverSolids.forEach(s => { if (Math.abs(s.x - (CX + 3)) < 1.3) s.off = true; }); if (local || near(CX, 0, 12)) hooks.toast('🌊 La corrente gira, rallenta, e dall\'acqua emergono le pietre del guado.'); premioR.show(); return true; };
    mesh(new THREE.DodecahedronGeometry(0.7, 0), lam(0x5a7a8a), CX + 4.8, 0.4, 2.4, g); solid({ x: CX + 4.8, z: 2.4, r: 0.6 });
    powers.spot({ id: 'risacca-corrente', x: CX + 3.6, z: 2.6, r: 3.4, who: ['marco'], shared: true, act: (gg, l) => calma(l), hint: () => serve('marco', 'Marco') });
    add({ id: 'risacca-riva', name: 'La riva della corrente', pos: [CX + 4.2, 1, 3.4], radius: 2.4, markerY: 2.2, desc: 'L\'acqua corre troppo forte.',
      open: () => [h('h2', {}, 'La Risacca'), h('p', {}, guado ? 'Le pietre del guado sono fuori dall\'acqua: si può attraversare.' : 'L\'acqua brilla e corre troppo forte per attraversarla. Sotto la superficie si intravedono delle pietre.'), guado ? null : h('p', { class: 'muted' }, 'Il dono del Flusso saprebbe cambiare la corrente. (Marco: tasto F o pulsante della pietra)')] });
    // pesci di luce
    const fish = []; for (let i = 0; i < 8; i++) { const f = mesh(new THREE.SphereGeometry(0.1, 8, 6), glow(0xbfeaff, { k: 2.6 }), CX, 0.08, -2, g); f.scale.set(1, 0.5, 2.2); fish.push({ f, s: Math.random() * 30, v: 1 + Math.random() }); }
    add({ id: 'risacca-pesci', name: 'I pesci di luce', pos: [CX - 4, 0.5, 0.6], radius: 2.4, markerY: 1.5, desc: 'Nuotano nella corrente.', use: () => { diario.creatura('pesci'); hooks.toast('🐟 I pesci di luce si raccolgono vicino alla riva, poi si disperdono come scintille.'); } });
    const premioR = premio('risacca', 'goccia', CX + 6, 0.8, -9, g, 0x9fe0ff);
    animated.push((t, dt) => { if (!g.visible) return;
      rv.offset.x = (rv.offset.x + dt * (guado ? 0.05 : 0.35)) % 1; rv.offset.y = (rv.offset.y + dt * 0.4) % 1;
      stones.forEach((s, k) => { s.position.y += ((guado ? 0.12 : -0.5) - s.position.y) * Math.min(1, dt * (1 + k * 0.3)); });
      fish.forEach(o => { const x = CX - 15 + ((t * o.v * 2 + o.s) % 30); o.f.position.set(x, 0.08, -2 + Math.sin(t * 2 + o.s) * 1.2); }); });
  }

  // ---------------------------------------------------------------- Solaria
  {
    const { CX, g } = base('solaria', { skyTop: 0x6a7ad8, skyHor: 0xfff0d0, ground: 0xe8dcc0, under: 0xc8b898, clouds: 0xfff4e0, hemiSky: 0xfff4e0, hemiGround: 0x8a7a5a, fog: { c: 0xf8ead0, near: 40, far: 180 } });
    const gold = lam(0xe8c070), salt = K.saltWhite;
    // torri dorate e cupole di sale tutt'intorno alla piazza
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.26, r = 12.5, x = CX + Math.cos(a) * r, z = Math.sin(a) * r; if (z > 10 && Math.abs(x - CX) < 4) continue;
      const hh = 6 + (i % 4) * 3; mesh(new THREE.CylinderGeometry(0.9, 1.2, hh, 8), i % 2 ? salt : gold, x, hh / 2, z, g); mesh(new THREE.ConeGeometry(1.3, 3, 8), gold, x, hh + 1.5, z, g);
      if (i % 3 === 0) { const d = mesh(new THREE.SphereGeometry(2.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), salt, x + Math.cos(a) * 2.5, 0, z + Math.sin(a) * 2.5, g); }
      solid({ x, z, r: 1.4 }); }
    // la piazza: lastre chiare, e al centro la cupola chiusa
    mesh(new THREE.CylinderGeometry(9, 9, 0.06, 32), lam(0xf4ecdc), CX, 0.03, 0, g);
    const dome = mesh(new THREE.SphereGeometry(2.4, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), salt, CX, 0, -6, g); solid({ x: CX, z: -6, r: 2.6 });
    const domeGlow = halo(0xffe8a0, 8, CX, 2.2, -6, g, 0), domeLit = glow(0xfff4d8, { k: 1.4 });
    // tre specchi di luce: Sophia li accende, e i raggi vanno alla cupola
    const specchi = [[-6, 1], [6, 1], [0, 6]].map(([dx, dz], i) => {
      const x = CX + dx, z = dz; mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.2, 8), gold, x, 0.6, z, g); solid({ x, z, r: 0.6 });
      const disc = mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.15, emissive: 0xfff0c0, emissiveIntensity: 0 }), x, 1.6, z, g); disc.lookAt(CX, 1.6, -6);
      const len = Math.hypot(CX - x, -6 - z), ray = mesh(new THREE.CylinderGeometry(0.06, 0.06, len, 6, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0c0).multiplyScalar(3), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), (x + CX) / 2, 1.6, (z - 6) / 2, g);
      ray.lookAt(CX, 1.6, -6); ray.rotateX(Math.PI / 2);
      return { x, z, disc, ray, on: false };
    });
    let accesa = false;
    const accendi = (s, local) => { if (s.on) return false; s.on = true; if (local || near(s.x, s.z, 10)) hooks.toast('🔆 Lo specchio raccoglie la luce e la manda verso la cupola.');
      if (specchi.every(q => q.on) && !accesa) { accesa = true; if (near(CX, 0, 14)) hooks.toast('🏛️ La cupola di sale si accende da dentro, come una lampada. Sulla piazza cade una piccola tessera dorata.'); premioSo.show(); } return true; };
    specchi.forEach((s, i) => powers.spot({ id: 'solaria-specchio-' + i, x: s.x, z: s.z, r: 2.8, who: ['sophia'], shared: true, act: (gg, l) => accendi(s, l), hint: () => serve('sophia', 'Sophia') }));
    specchi.forEach((s, i) => add({ id: 'solaria-sp-' + i, name: 'Uno specchio di luce', pos: [s.x, 1, s.z + 0.8], radius: 2.2, markerY: 2.4, desc: 'Guarda verso la cupola.',
      open: () => [h('h2', {}, 'Uno specchio di luce'), h('p', {}, s.on ? 'Lo specchio è acceso: il suo raggio arriva alla cupola.' : 'Un disco lucido su un pilastro dorato, rivolto verso la cupola al centro della piazza. È spento.'), s.on ? null : h('p', { class: 'muted' }, 'Il dono della Luce saprebbe accenderlo. (Sophia: tasto F o pulsante della pietra)')] }));
    const premioSo = premio('solaria', 'tessera', CX, 0.7, -2.6, g, 0xffe080);
    // colombe di sale sulle cupole
    const doves = []; for (let i = 0; i < 6; i++) { const d = new THREE.Group(); g.add(d); const dm = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }); mesh(new THREE.SphereGeometry(0.12, 8, 6), dm, 0, 0, 0, d).scale.set(1, 0.8, 1.8); for (const s of [-1, 1]) { const w = mesh(new THREE.PlaneGeometry(0.4, 0.14), dm, s * 0.22, 0.02, 0, d); w.rotation.x = -Math.PI / 2; w.userData.s = s; } doves.push({ d, s: i * 1.1 }); }
    add({ id: 'solaria-colombe', name: 'Le colombe di sale', pos: [CX + 4, 1, -3], radius: 2.6, markerY: 2.6, desc: 'Volano intorno alla cupola.', use: () => { diario.creatura('colombe'); hooks.toast('🕊 Le colombe girano intorno alla cupola e si posano tutte insieme sulla cima.'); } });
    animated.push((t) => { if (!g.visible) return;
      specchi.forEach(s => { s.ray.material.opacity = s.on ? 0.6 + Math.sin(t * 4) * 0.15 : 0; s.disc.material.emissiveIntensity = s.on ? 2.2 : 0; });
      domeGlow.material.opacity = accesa ? 0.8 + Math.sin(t * 2) * 0.1 : 0; dome.material = accesa ? domeLit : salt;
      doves.forEach(o => { const a = t * 0.6 + o.s; o.d.position.set(CX + Math.cos(a) * 4, 4 + Math.sin(t + o.s) * 0.5, -6 + Math.sin(a) * 4); o.d.rotation.y = -a; o.d.children.forEach(c => { if (c.userData.s) c.rotation.z = c.userData.s * Math.sin(t * 12 + o.s) * 0.5; }); }); });
  }

  // i cancelli del belvedere: quando un cammino è aperto, il velo si dirada
  world.CAMMINI?.forEach(c => { if (world.apertura(c.id).aperto && c.veil) c.veil.material.opacity = 0.08; });

  return {
    groups,
    spawn: id => ({ x: LUOGHI_X[id], z: 10.5, yaw: 0 }),
    setRegion(region) { for (const [id, g] of Object.entries(groups)) g.visible = REG[region] === id; },
    groupOf: region => groups[REG[region]] || null,
    fogFor(zona) { return info[zona]?.fog || null; },
    arrivo(id) {
      const t = testo(id + '-1');
      hooks.toast(t || { selva: 'La Selva di Maestrale: qui il vento non smette mai.', monte: 'Il Monte Zavorra: roccia scura, venature dorate.', risacca: 'La Risacca: un fiume di luce attraversa l\'isola.', solaria: 'Solaria, la Città di Luce: torri dorate e cupole di sale.' }[id]);
    },
  };
}
