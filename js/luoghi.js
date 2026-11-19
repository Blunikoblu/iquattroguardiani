// I quattro cammini del belvedere: Selva di Maestrale, Monte Zavorra, Risacca, Solaria.
// Sono luoghi da esplorare SENZA la trama del libro (scelta di Nicola): paesaggi, creature, un enigma
// per il dono di un Guardiano, un oggetto speciale, una runa. Niente personaggi né eventi oltre il capitolo 5.
// Ogni luogo è un'isola sopra il mare di nubi, lontana dalle altre (si vede solo quella in cui ti trovi).
import * as THREE from 'three';
import { h } from './util.js?v=202611191243';
import { testo } from './testi.js?v=202611191243';

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
  // Dal libro (cap. 9): «un oceano verde e argento»; alberi enormi, tronchi larghi come case, chiome che spariscono
  // tra le nuvole, foglie argentate sempre in movimento; gli alberi (gli Antichi) camminano piano: le radici si
  // sollevano, fanno un passo e riaffondano. Aria densa che sa di muschio; un sussurro continuo, il vento.
  // Prima della Selva una collina di fiori blu; tutto intorno l'erba di corallo; un sentiero di luce che dentro si perde.
  {
    const { CX, g } = base('selva', { skyTop: 0x6a9aa0, skyHor: 0xdcefe6, ground: 0x47603e, under: 0x5a4a3c, clouds: 0xdcece4, hemiSky: 0xe8fff4, hemiGround: 0x34442c, fog: { c: 0xc4dccf, near: 22, far: 140 } });
    const bark = lam(0x5a4a3a), barkD = lam(0x4a3c30);
    const silver = [new THREE.MeshStandardMaterial({ color: 0xc8d8d0, metalness: 0.35, roughness: 0.45, flatShading: true }), new THREE.MeshStandardMaterial({ color: 0x9fbcae, metalness: 0.3, roughness: 0.5, flatShading: true }), new THREE.MeshStandardMaterial({ color: 0xdfe8e2, metalness: 0.4, roughness: 0.4, flatShading: true })];
    // nuvole basse dentro cui spariscono le chiome
    for (let i = 0; i < 14; i++) { const c = mesh(new THREE.IcosahedronGeometry(5 + Math.random() * 4, 1), new THREE.MeshLambertMaterial({ color: 0xeef4f0, transparent: true, opacity: 0.85, flatShading: true }), CX - 18 + Math.random() * 36, 27 + Math.random() * 3, -18 + Math.random() * 30, g); c.scale.y = 0.35; c.userData.noShadow = true; }
    // gli Antichi: tronchi enormi, radici che ogni tanto si sollevano
    const antichi = [];
    const posA = [[-11, -9], [-6, -12.5], [1, -13.5], [8, -11.5], [12, -6], [-13, -2], [13, 2], [-12, 6], [11, 8.5], [-7, 10.5], [6, 11.5]];
    posA.forEach(([dx, dz], i) => {
      const x = CX + dx, z = dz, r = 1.3 + (i % 3) * 0.45, hh = 26 + (i % 4) * 3, tg = new THREE.Group(); tg.position.set(x, 0, z); g.add(tg);
      mesh(new THREE.CylinderGeometry(r * 0.75, r * 1.15, hh, 10), i % 2 ? bark : barkD, 0, hh / 2, 0, tg);
      const crown = new THREE.Group(); crown.position.y = hh - 2; tg.add(crown);
      for (let k = 0; k < 7; k++) { const c = mesh(new THREE.IcosahedronGeometry(3 + Math.random() * 2, 0), silver[k % 3], (Math.random() - 0.5) * 7, Math.random() * 4, (Math.random() - 0.5) * 7, crown); c.scale.y = 0.6; }
      const roots = []; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + i, rt = mesh(new THREE.TorusGeometry(r * 0.9, r * 0.22, 5, 10, Math.PI), i % 2 ? bark : barkD, Math.cos(a) * r * 0.9, 0, Math.sin(a) * r * 0.9, tg); rt.rotation.y = -a; roots.push(rt); }
      antichi.push({ tg, crown, roots, s: i * 1.7 }); solid({ x, z, r: r + 0.5 });
    });
    // erba di corallo, e la collina di fiori blu vicino al cancello
    const coral = new THREE.MeshLambertMaterial({ color: 0xe8806a, flatShading: true }), coral2 = new THREE.MeshLambertMaterial({ color: 0xd8a070, flatShading: true });
    const bladeG = new THREE.ConeGeometry(0.05, 0.45, 3);
    for (let i = 0; i < 160; i++) { const a = Math.random() * 6.28, rr = 2 + Math.random() * 12.5, b = mesh(bladeG, i % 3 ? coral : coral2, CX + Math.cos(a) * rr, 0.22, Math.sin(a) * rr, g); b.rotation.z = (Math.random() - 0.5) * 0.5; }
    mesh(new THREE.SphereGeometry(4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), lam(0x557a4a), CX - 8, -1.6, 12, g).scale.y = 0.6;
    const blu = glow(0x7aa8ff, { k: 1.3 });
    for (let i = 0; i < 70; i++) { const a = Math.random() * 6.28, rr = Math.random() * 3.6; mesh(new THREE.SphereGeometry(0.07, 6, 4), blu, CX - 8 + Math.cos(a) * rr, 0.25 + Math.max(0, 0.6 - rr * 0.15), 12 + Math.sin(a) * rr, g); }
    solid({ x: CX - 8, z: 12, r: 3.2 });
    // il sentiero di luce: dal cancello entra nella Selva e poco a poco sparisce
    const pathM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffe6a0).multiplyScalar(1.6), transparent: true, depthWrite: false });
    for (let k = 0; k < 14; k++) { const z = 12.4 - k * 0.9, m = mesh(new THREE.CircleGeometry(0.32, 12), pathM.clone(), CX + Math.sin(k * 0.6) * 0.5, 0.03, z, g); m.rotation.x = -Math.PI / 2; m.material.opacity = Math.max(0, 0.85 - k * 0.07); }
    // l'Antico più vecchio, e le radici che chiudono la radura a nord
    const oldX = CX - 4, oldZ = -2.5;
    mesh(new THREE.CylinderGeometry(1.6, 2.4, 30, 12), barkD, oldX, 15, oldZ, g); solid({ x: oldX, z: oldZ, r: 2.4 });
    for (let k = 0; k < 8; k++) { const c = mesh(new THREE.IcosahedronGeometry(4, 0), silver[k % 3], oldX + Math.cos(k) * 4, 29 + Math.sin(k * 2) * 1.5, oldZ + Math.sin(k) * 4, g); c.scale.y = 0.6; }
    const roots = new THREE.Group(); g.add(roots); const rootSolids = [];
    for (let x = CX - 14; x <= CX + 14; x += 1.1) { const r = mesh(new THREE.TorusGeometry(0.6 + Math.random() * 0.4, 0.14, 5, 10, Math.PI), lam(0x5a4228), x, 0, -5.2 + Math.random() * 0.4, roots); r.rotation.y = Math.random(); rootSolids.push(solid({ x, z: -5.2, r: 0.75 })); }
    let open = false;
    const apri = (local) => { if (open) return false; open = true; rootSolids.forEach(s => { s.off = true; }); if (local || near(CX, -4, 12)) hooks.toast('🌿 Le radici si sollevano, fanno un passo indietro e riaffondano più in là. A nord si apre una radura.'); premioS.show(); return true; };
    powers.spot({ id: 'selva-albero', x: oldX, z: oldZ, r: 4.2, who: ['luca'], shared: true, act: (gg, l) => apri(l), hint: () => serve('luca', 'Luca') });
    add({ id: 'selva-vecchio', name: 'Un Antico', pos: [oldX + 1.8, 1, oldZ + 2], radius: 2.6, markerY: 2.4, desc: 'L\'albero più vecchio. Le sue radici chiudono la radura.',
      open: () => [h('h2', {}, 'Un Antico'), h('p', {}, 'Gli alberi della Selva si chiamano Antichi, e non stanno mai fermi. Questo è il più vecchio: non toccarlo.'), h('p', {}, open ? 'Le sue radici si sono spostate. La radura a nord è aperta.' : 'Le sue radici si intrecciano fino a chiudere il passaggio verso nord.'), h('p', { class: 'muted' }, open ? '' : 'Il dono della Natura saprebbe parlare con lui. (Luca: tasto F o pulsante della pietra)')] });
    const premioS = premio('selva', 'piuma', CX - 6, 0.8, -11, g, 0xd8ffe8);
    // un banco di pesci d'aria passa basso sopra il sentiero
    const fishG = new THREE.Group(); g.add(fishG); const fishM = new THREE.MeshStandardMaterial({ color: 0xbcd8e8, metalness: 0.5, roughness: 0.3 });
    for (let i = 0; i < 14; i++) { const f = new THREE.Group(); f.position.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 2); fishG.add(f); mesh(new THREE.SphereGeometry(0.12, 8, 6), fishM, 0, 0, 0, f).scale.set(0.6, 0.8, 2); const tl = mesh(new THREE.ConeGeometry(0.08, 0.16, 4), fishM, 0, 0, 0.28, f); tl.rotation.x = Math.PI / 2; f.userData.s = Math.random() * 6; }
    add({ id: 'selva-pesci', name: 'I pesci d\'aria', pos: [CX + 3, 1, 4], radius: 3, markerY: 2.6, desc: 'Nuotano nell\'aria, in banco.', use: () => { diario.creatura('pesci'); hooks.toast('🐟 Il banco di pesci d\'aria ti passa sopra la testa: si sente il fruscio delle pinne.'); } });
    // foglie argentate portate dal maestrale (da nord-ovest)
    const NL = 140, lp = new Float32Array(NL * 3); for (let i = 0; i < NL; i++) { lp[i * 3] = CX - 15 + Math.random() * 30; lp[i * 3 + 1] = Math.random() * 9; lp[i * 3 + 2] = -15 + Math.random() * 30; }
    const leaves = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(lp, 3)), new THREE.PointsMaterial({ color: 0xe0ece6, size: 0.13 })); g.add(leaves);
    animated.push((t, dt) => { if (!g.visible) return;
      for (let i = 0; i < NL; i++) { lp[i * 3] += dt * (2.0 + (i % 5) * 0.4); lp[i * 3 + 2] += dt * (1.2 + (i % 3) * 0.3); lp[i * 3 + 1] += Math.sin(t * 2 + i) * dt * 0.4; if (lp[i * 3] > CX + 15) lp[i * 3] = CX - 15; if (lp[i * 3 + 2] > 15) lp[i * 3 + 2] = -15; }
      leaves.geometry.attributes.position.needsUpdate = true;
      for (const a of antichi) { a.crown.rotation.z = Math.sin(t * 0.9 + a.s) * 0.04; a.crown.rotation.x = Math.sin(t * 1.3 + a.s) * 0.03;
        // ogni tanto una radice si solleva, fa un passo e riaffonda
        a.roots.forEach((r, k) => { const ph = ((t * 0.25 + a.s + k * 0.37) % 6); r.position.y = ph < 1 ? Math.sin(ph * Math.PI) * 0.5 : 0; }); }
      roots.children.forEach(r => { r.scale.setScalar(Math.max(0.01, r.scale.x + ((open ? 0.01 : 1) - r.scale.x) * dt * 1.5)); });
      const u = (t * 0.06) % 1; fishG.position.set(CX - 16 + u * 32, 3.2 + Math.sin(t * 0.7) * 0.4, 4 - u * 6); fishG.rotation.y = -Math.PI / 2 + 0.2;
      fishG.children.forEach(f => { f.rotation.y = Math.sin(t * 6 + f.userData.s) * 0.2; }); });
  }

  // ---------------------------------------------------------------- Monte Zavorra
  // Dal libro (cap. 10): colline di roccia nuda, aria più fredda e densa; una montagna enorme di roccia nera con
  // venature dorate da cima a fondo; sui fianchi nemmeno un granello di sale; la cima tra nuvole basse e ferme;
  // alla base una bocca di caverna buia. Nessun animale, nessuna pianta. Dentro, pareti coperte di incisioni.
  {
    const { CX, g } = base('monte', { skyTop: 0x4a4a62, skyHor: 0xcfc6b8, ground: 0x2c2a30, under: 0x34303a, clouds: 0xd0c8bc, hemiSky: 0xd8d4cc, hemiGround: 0x24222a, fog: { c: 0xbcb4a8, near: 30, far: 160 } });
    const rock = lam(0x3a3640), rock2 = lam(0x302c36), gold = glow(0xe8b84a, { k: 1.6 });
    // la montagna, con le venature dorate che la attraversano da cima a fondo
    const MZ = -26, MH = 46, MR = 20;
    mesh(new THREE.ConeGeometry(MR, MH, 9), rock, CX + 2, MH / 2 - 2, MZ, g);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.2, pts = []; for (let k = 0; k <= 14; k++) { const u = k / 14, rr = MR * (1 - u) + 0.15, w = Math.sin(u * 9 + i) * 0.12; pts.push(new THREE.Vector3(CX + 2 + Math.cos(a + w) * rr, -2 + u * MH, MZ + Math.sin(a + w) * rr)); }
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.12, 4), gold, 0, 0, 0, g); }
    // nuvole basse e ferme intorno alla cima
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, c = mesh(new THREE.IcosahedronGeometry(6, 1), new THREE.MeshLambertMaterial({ color: 0xd8d2c8, flatShading: true }), CX + 2 + Math.cos(a) * 7, MH - 12, MZ + Math.sin(a) * 7, g); c.scale.y = 0.4; }
    // la bocca della caverna, così buia che sembra assorbire la luce
    const mouth = mesh(new THREE.CircleGeometry(3, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x000000 }), CX, 0, -13.9, g);
    // colline di roccia nuda (senza sale, senza piante)
    for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, r = 7 + Math.random() * 6, x = CX + Math.cos(a) * r, z = Math.sin(a) * r * 0.9; if (z > 9 && Math.abs(x - CX) < 4) continue; if (z < -9 && Math.abs(x - CX) < 5) continue; const m = mesh(new THREE.DodecahedronGeometry(0.8 + Math.random() * 1.2, 0), i % 2 ? rock : rock2, x, 0.4, z, g); m.scale.y = 0.8 + Math.random(); solid({ x, z, r: 1.1 }); }
    // la parete ai piedi del monte, con la nicchia chiusa e le incisioni
    mesh(new THREE.BoxGeometry(14, 7, 2), rock, CX, 3.5, -15, g); solid({ x: CX, z: -14.6, w: 14, d: 1.8 });
    const slab = mesh(new THREE.BoxGeometry(1.8, 2.4, 0.4), rock2, CX - 4.5, 1.2, -13.9, g);
    const incTex = canvasTex(512, 256, c => { c.strokeStyle = 'rgba(200,170,110,.55)'; c.lineWidth = 3; for (let i = 0; i < 40; i++) { const x = Math.random() * 480 + 16, y = Math.random() * 220 + 18, s = 10 + Math.random() * 16; c.beginPath(); c.moveTo(x, y); c.lineTo(x + s * Math.cos(i), y + s * Math.sin(i * 1.3)); c.lineTo(x + s, y + s * 0.6); c.stroke(); } });
    sign(10, 5, incTex, CX, 3.2, -13.98, 0, g);
    // tre pietre incise con le rune spezzate: Giulia le legge e le rune tornano intere
    const pietre = [[-6, -4], [0, -7], [6, -4]].map(([dx, dz], i) => {
      const x = CX + dx, z = dz; mesh(new THREE.BoxGeometry(1.4, 1.6, 0.5), rock2, x, 0.8, z, g); solid({ x, z, r: 0.9 });
      const half = canvasTex(128, 128, c => { c.strokeStyle = '#8a7a5a'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(30, 20 + i * 8); c.lineTo(64, 64); c.lineTo(40, 108); c.stroke(); });
      const full = canvasTex(128, 128, c => { c.strokeStyle = '#ffd88a'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(30, 20 + i * 8); c.lineTo(64, 64); c.lineTo(40, 108); c.moveTo(64, 64); c.lineTo(98, 30 - i * 4); c.moveTo(64, 64); c.lineTo(96, 104); c.stroke(); });
      const face = sign(0.9, 0.9, half, x, 0.95, z + 0.26, 0, g);
      return { x, z, face, full, done: false };
    });
    let aperta = false;
    const fatto = (p, local) => { if (p.done) return false; p.done = true; p.face.material.map = p.full; p.face.material.color.setScalar(2.2); p.face.material.needsUpdate = true; if (local || near(p.x, p.z, 8)) hooks.toast(testo('monte-giulia', 'monte-g'));
      if (pietre.every(q => q.done) && !aperta) { aperta = true; if (near(CX, -8, 14)) hooks.toast('⛰️ Le venature dorate della parete si accendono. La lastra di pietra scivola giù e si apre una nicchia.'); premioZ.show(); } return true; };
    pietre.forEach((p, i) => powers.spot({ id: 'monte-pietra-' + i, x: p.x, z: p.z, r: 2.8, who: ['giulia'], shared: true, act: (gg, l) => fatto(p, l), hint: () => serve('giulia', 'Giulia') }));
    pietre.forEach((p, i) => add({ id: 'monte-segno-' + i, name: 'Una pietra incisa', pos: [p.x, 1, p.z + 0.9], radius: 2.2, markerY: 2, desc: 'Una runa spezzata.',
      open: () => [h('h2', {}, 'Una pietra incisa'), h('p', {}, p.done ? 'La runa è di nuovo intera e brilla d\'oro.' : 'Una runa incisa a metà, come se il resto si fosse consumato.'), p.done ? null : h('p', { class: 'muted' }, 'Il dono della Memoria saprebbe leggerla. (Giulia: tasto F o pulsante della pietra)')] }));
    const premioZ = premio('monte', 'scaglia', CX - 4.5, 1.1, -13.6, g, 0xffd060);
    animated.push((t, dt) => { if (!g.visible) return; slab.position.y += ((aperta ? -1.3 : 1.2) - slab.position.y) * Math.min(1, dt * 1.2); });
  }

  // ---------------------------------------------------------------- Risacca
  // Dal libro (cap. 11): il fiume scorre in tutte le direzioni: verso nord, verso sud, alcune correnti salgono verso
  // il cielo, altre scendono sottoterra. Le più forti tornano indietro, verso la sorgente, come l'onda che si ritira
  // dalla spiaggia (da qui il nome). L'acqua è trasparente e fredda.
  {
    const { CX, g } = base('risacca', { skyTop: 0x3a6aa8, skyHor: 0xd8ecff, ground: 0x6a8a7a, under: 0x5a6a6a, clouds: 0xe0f0ff, hemiSky: 0xe0f4ff, hemiGround: 0x3a4a5a, fog: { c: 0xcfe4f8, near: 35, far: 170 } });
    const rv = canvasTex(256, 64, c => { const gr = c.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(127,212,255,.75)'); gr.addColorStop(0.5, 'rgba(232,251,255,.9)'); gr.addColorStop(1, 'rgba(127,212,255,.75)'); c.fillStyle = gr; c.fillRect(0, 0, 256, 64); c.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 40; i++) c.fillRect(Math.random() * 256, Math.random() * 64, 18, 2); });
    rv.wrapS = rv.wrapT = THREE.RepeatWrapping;
    const flows = [];
    const flow = (geo, x, y, z, speed, rotY = 0, rotX = -Math.PI / 2, k = 1.4, op = 0.85) => { const tex = rv.clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(geo.parameters.width / 4, 1);
      const m = mesh(geo, new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1, 1, 1).multiplyScalar(k), transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false }), x, y, z, g); m.rotation.set(rotX, rotY, 0, 'YXZ'); flows.push({ tex, speed }); return m; };
    // il letto del fiume, con correnti in direzioni diverse: la più forte torna indietro, verso la sorgente
    flow(new THREE.PlaneGeometry(32, 5), CX, 0.05, -2, -0.5);             // verso la sorgente (ovest), forte
    flow(new THREE.PlaneGeometry(30, 1.6), CX, 0.07, -3.2, 0.18);         // verso est
    flow(new THREE.PlaneGeometry(6, 1.4), CX - 7, 0.08, -2, 0.25, Math.PI / 2);  // verso nord
    flow(new THREE.PlaneGeometry(6, 1.4), CX + 9, 0.08, -2, -0.25, Math.PI / 2); // verso sud
    // la sorgente, a ovest, dove tornano le correnti più forti
    mesh(new THREE.CylinderGeometry(1.4, 1.8, 1.2, 12), lam(0x8a9aa0), CX - 14.2, 0.2, -2, g); solid({ x: CX - 14.2, z: -2, r: 1.6 });
    // correnti che salgono verso il cielo, e altre che scendono sottoterra
    const colonne = [[-9, -1.4], [-2, -3.0], [5, -1.2], [11, -2.6]].map(([dx, dz], i) => { const c = mesh(new THREE.CylinderGeometry(0.22, 0.4, 30, 10, 1, true), new THREE.MeshBasicMaterial({ map: (() => { const t = rv.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 6); flows.push({ tex: t, speed: 0, up: 0.6 + i * 0.1 }); return t; })(), color: new THREE.Color(1, 1, 1).multiplyScalar(1.5), transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }), CX + dx, 15, dz, g); c.userData.noShadow = true; return c; });
    const gorghi = [[-4, -1.6], [8, -2.4]].map(([dx, dz]) => { const m = mesh(new THREE.RingGeometry(0.2, 1.1, 24, 1, 0, Math.PI * 1.7), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3a8ac8).multiplyScalar(1.2), transparent: true, opacity: 0.8, side: THREE.DoubleSide }), CX + dx, 0.09, dz, g); m.rotation.x = -Math.PI / 2; return m; });
    const riverSolids = []; for (let x = CX - 15; x <= CX + 15; x += 1.2) riverSolids.push(solid({ x, z: -2, w: 1.3, d: 3.6 }));
    // cascate che cadono dal bordo dell'isola, una verso il basso e una verso l'alto
    const falls = [[-1, -12, 1], [1, 12, -1]].map(([s, y, dir]) => { const f = flow(new THREE.PlaneGeometry(4, 24), CX + s * 15.6, y, -2, 0, Math.PI / 2, 0, 1.3, 0.7); flows[flows.length - 1].up = 0.5 * dir; flows[flows.length - 1].tex.repeat.set(1, 5); return f; });
    // le pietre del guado, sommerse finché la corrente non cambia
    const stones = []; for (let k = 0; k < 4; k++) { const s = mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.4, 10), lam(0x8a9aa0), CX + 3, -0.5, 0.6 - k * 1.3, g); stones.push(s); }
    let guado = false;
    const calma = (local) => { if (guado) return false; guado = true; riverSolids.forEach(s => { if (Math.abs(s.x - (CX + 3)) < 1.3) s.off = true; }); if (local || near(CX, 0, 12)) hooks.toast('🌊 Le correnti si girano tutte da una parte, e dall\'acqua emergono le pietre del guado.'); premioR.show(); return true; };
    mesh(new THREE.DodecahedronGeometry(0.7, 0), lam(0x5a7a8a), CX + 4.8, 0.4, 2.4, g); solid({ x: CX + 4.8, z: 2.4, r: 0.6 });
    powers.spot({ id: 'risacca-corrente', x: CX + 3.6, z: 2.6, r: 3.4, who: ['marco'], shared: true, act: (gg, l) => calma(l), hint: () => serve('marco', 'Marco') });
    add({ id: 'risacca-riva', name: 'La riva della Risacca', pos: [CX + 4.2, 1, 3.4], radius: 2.4, markerY: 2.2, desc: 'Le correnti vanno in tutte le direzioni.',
      open: () => [h('h2', {}, 'La Risacca'), h('p', {}, guado ? 'Le pietre del guado sono fuori dall\'acqua: si può attraversare.' : 'L\'acqua è trasparente e fredda, e corre da tutte le parti: di lato, all\'indietro, verso il cielo. Sotto la superficie si intravedono delle pietre.'), guado ? null : h('p', { class: 'muted' }, 'Il dono del Flusso saprebbe mettere d\'accordo le correnti. (Marco: tasto F o pulsante della pietra)')] });
    const premioR = premio('risacca', 'goccia', CX + 6, 0.8, -9, g, 0x9fe0ff);
    animated.push((t, dt) => { if (!g.visible) return;
      flows.forEach(f => { if (f.up != null) f.tex.offset.y = (f.tex.offset.y - dt * f.up * (guado ? 0.4 : 1)) % 1; else f.tex.offset.x = (f.tex.offset.x + dt * f.speed * (guado ? 0.3 : 1)) % 1; });
      gorghi.forEach((m, i) => { m.rotation.z += dt * (i ? 1.6 : -1.9); });
      colonne.forEach((c, i) => { c.scale.x = c.scale.z = 1 + Math.sin(t * 2 + i) * 0.1; });
      stones.forEach((s, k) => { s.position.y += ((guado ? 0.12 : -0.5) - s.position.y) * Math.min(1, dt * (1 + k * 0.3)); }); });
  }

  // ---------------------------------------------------------------- Solaria
  {
    const { CX, g } = base('solaria', { skyTop: 0x6a7ad8, skyHor: 0xfff0d0, ground: 0xe8dcc0, under: 0xc8b898, clouds: 0xfff4e0, hemiSky: 0xfff4e0, hemiGround: 0x8a7a5a, fog: { c: 0xf8ead0, near: 40, far: 180 } });
    const gold = lam(0xe8c070), salt = K.saltWhite;
    // torri dorate e cupole di sale tutt'intorno alla piazza
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.26, r = 12.5, x = CX + Math.cos(a) * r, z = Math.sin(a) * r; if (z > 10 && Math.abs(x - CX) < 4) continue;
      const hh = 6 + (i % 4) * 3; mesh(new THREE.CylinderGeometry(0.9, 1.2, hh, 8), i % 2 ? salt : gold, x, hh / 2, z, g); mesh(new THREE.ConeGeometry(1.3, 3, 8), gold, x, hh + 1.5, z, g);
      if (i % 3 === 0) { mesh(new THREE.SphereGeometry(2.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf8f4ec, roughness: 0.18, metalness: 0.25 }), x + Math.cos(a) * 2.5, 0, z + Math.sin(a) * 2.5, g); }
      solid({ x, z, r: 1.4 }); }
    // dal libro (cap. 11-12): guglie dorate, cupole di sale che riflettono la luce, ponti sospesi tra torri fluttuanti;
    // al centro una torre più alta di tutte, con in cima una luce dorata che gira; prati dorati e fiori che brillano di luce propria
    const domeSalt = new THREE.MeshStandardMaterial({ color: 0xf8f4ec, roughness: 0.18, metalness: 0.25 });
    const fl = []; [[-9, -9, 12], [9, -9, 14], [-11, 2, 10], [11, 3, 13]].forEach(([dx, dz, y], i) => { const tg = new THREE.Group(); tg.position.set(CX + dx, y, dz); g.add(tg);
      mesh(new THREE.CylinderGeometry(1.1, 0.5, 6, 8), gold, 0, 0, 0, tg); mesh(new THREE.ConeGeometry(1.3, 3.4, 8), gold, 0, 4.7, 0, tg); mesh(new THREE.SphereGeometry(1.4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), domeSalt, 0, 3, 0, tg);
      mesh(new THREE.ConeGeometry(0.9, 2.6, 8), salt, 0, -4.2, 0, tg).rotation.x = Math.PI; fl.push({ tg, y, s: i }); });
    const ponteM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0c8).multiplyScalar(1.6), transparent: true, opacity: 0.55 });
    const ponti = [[0, 1], [0, 2], [1, 3]].map(([a, b]) => { const m = mesh(new THREE.BoxGeometry(0.5, 0.08, 1), ponteM, 0, 0, 0, g); return { m, a, b }; });
    const tower = new THREE.Group(); tower.position.set(CX, 0, -13.6); g.add(tower);
    mesh(new THREE.CylinderGeometry(1.6, 2.2, 30, 10), salt, 0, 15, 0, tower); mesh(new THREE.CylinderGeometry(2.0, 2.0, 1.6, 10), gold, 0, 30.6, 0, tower); mesh(new THREE.ConeGeometry(2.2, 4, 10), gold, 0, 33.4, 0, tower);
    const towerBeam = new THREE.Group(); towerBeam.position.y = 30.6; tower.add(towerBeam);
    const beamM = mesh(new THREE.ConeGeometry(3, 34, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }), 17, 0, 0, towerBeam); beamM.rotation.z = Math.PI / 2;
    halo(0xffe0a0, 8, 0, 30.6, 0, tower, 0.8); solid({ x: CX, z: -13.6, r: 2.4 });
    // prati dorati e fiori che brillano
    const flor = [glow(0xffe680, { k: 2.2 }), glow(0xffb0d0, { k: 2 }), glow(0xbfe8ff, { k: 2 })];
    for (let i = 0; i < 90; i++) { const a = Math.random() * 6.28, r = 9.4 + Math.random() * 4.6, x = CX + Math.cos(a) * r, z = Math.sin(a) * r; mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 3), lam(0xc8a848), x, 0.17, z, g); mesh(new THREE.SphereGeometry(0.07, 6, 4), flor[i % 3], x, 0.37, z, g); }
    // il mercato di Solaria: banchi con le tende, ceste di sale, lanterne
    [[-6.5, -2.5], [6.5, -2.8], [-3.5, 4.5]].forEach(([dx, dz], i) => { const x = CX + dx, z = dz, tg = new THREE.Group(); tg.position.set(x, 0, z); tg.rotation.y = Math.atan2(-dx, -dz); g.add(tg);
      mesh(new THREE.BoxGeometry(2.2, 0.9, 0.9), lam(0xb08a52), 0, 0.45, 0, tg); for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 4), lam(0x8a6a3a), s * 1.05, 1.1, 0.4, tg);
      mesh(new THREE.BoxGeometry(2.4, 0.06, 1.3), lam([0xe8604a, 0x4a8ae8, 0xe8c04a][i]), 0, 2.2, 0.2, tg).rotation.x = 0.15;
      for (let k = 0; k < 3; k++) { mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.24, 10), lam(0xb08a52), -0.7 + k * 0.7, 1.02, 0, tg); mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 10), glow(0xfff1c8, { k: 1.6 }), -0.7 + k * 0.7, 1.15, 0, tg); }
      mesh(new THREE.SphereGeometry(0.12, 8, 6), glow(0xffd88a, { k: 2.6 }), 1.0, 1.9, 0.5, tg); solid({ x, z, r: 1.3 }); });
    add({ id: 'solaria-mercato', name: 'Il mercato di Solaria', pos: [CX - 6.5, 1, -1.2], radius: 2.4, markerY: 2.8, desc: 'Banchi, ceste di sale, lanterne.',
      open: () => [h('h2', {}, 'Il mercato di Solaria'), h('p', {}, 'Banchi con le tende colorate, ceste di sale di luce, lanterne accese anche di giorno.'), h('p', { class: 'muted' }, 'È qui che l\'anziana del sale porta il sale buono a sua figlia.')] });
    animated.push((t, dt) => { if (!g.visible) return; towerBeam.rotation.y = t * 0.5;
      fl.forEach(f => { f.tg.position.y = f.y + Math.sin(t * 0.5 + f.s) * 0.6; });
      ponti.forEach(p => { const A = fl[p.a].tg.position, B = fl[p.b].tg.position; p.m.position.set((A.x + B.x) / 2, (A.y + B.y) / 2 + 0.2, (A.z + B.z) / 2); p.m.scale.z = A.distanceTo(B); p.m.lookAt(B.x, B.y + 0.2, B.z); }); });
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
