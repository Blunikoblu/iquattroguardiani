// Il mondo del libro, fino al capitolo 5 (livello "B").
// Tre regioni lontane tra loro, collegate come nel libro:
//   M · Marechiaro (x ≈ 0): case bianche sulla collina, molo di legno, Tonino, la barca di Marco.
//   G · Grotta dei Sussurri (x ≈ 200): si arriva in barca; rune azzurre, fessura, caverna di sale, lago, isola delle quattro pietre, arco di luce.
//   L · Luminos (x ≈ 400): spiaggia di sale sotto due soli, ponti di luce, Giardini Sospesi, Giardino dell'Equilibrio,
//       porta del palazzo, belvedere con i quattro cammini (ancora chiusi).
// Si vede solo la regione in cui ti trovi (più leggero sui telefoni).
// I pannelli sono costruiti con h() (DOM + textContent): niente innerHTML.
import * as THREE from 'three';
import { AVATARS } from './config.js?v=202611201615';
import { h, wrapText } from './util.js?v=202611201615';
import { Avatar } from './avatars.js?v=202611201615';
import { drawRune } from './secrets.js?v=202611201615';

const GOLD = 0xf5c56b;
let seed = 11;
const srnd = (a, b) => { seed = (seed * 16807) % 2147483647; return a + (seed / 2147483647) * (b - a); };
const rnd = (a, b) => a + Math.random() * (b - a);

// Rettangoli percorribili.
export const AREAS = [
  // Marechiaro
  { id: 'banchina', x0: -12, x1: 12, z0: 12, z1: 18.5 },
  { id: 'molo', x0: -1.6, x1: 1.6, z0: 0, z1: 13.2 },
  // Grotta dei Sussurri
  { id: 'approdo', x0: 195, x1: 205, z0: 15.4, z1: 22 },
  { id: 'tunnel', x0: 198.7, x1: 201.3, z0: 3.8, z1: 16.4 },
  { id: 'fessura', x0: 199.45, x1: 200.55, z0: 0.4, z1: 4.9 },
  { id: 'caverna', x0: 187, x1: 213, z0: -26, z1: 1.3 },
  // Luminos
  { id: 'spiaggia', x0: 386, x1: 414, z0: -6, z1: 10 },
  { id: 'ponte1', x0: 413, x1: 429, z0: 1.1, z1: 2.9 },
  { id: 'giardini', x0: 428, x1: 450, z0: -8, z1: 12.5 },
  { id: 'ponte2', x0: 438.1, x1: 439.9, z0: -22.4, z1: -6.6 },
  { id: 'arena', x0: 432, x1: 446, z0: -38, z1: -21.6 },
  { id: 'ponte3', x0: 438.1, x1: 439.9, z0: 11.3, z1: 21.2 },
  { id: 'belvedere', x0: 432, x1: 446, z0: 20, z1: 26 },
];
export function zoneOf(x, z) {
  if (x < 100) return x < -12.0 ? 'scogli' : 'marechiaro';
  if (x < 300) return x > 232 ? 'sala' : z > 1.1 ? 'grotta' : 'lago';
  if (x >= 550) return x < 650 ? 'selva' : x < 750 ? 'monte' : x < 850 ? 'risacca' : 'solaria';
  if (x < 413) return z < -6.2 ? 'percorso' : 'spiaggia';
  if (x < 428.5) return 'ponte';
  if (z < -21.4) return 'arena';
  if (z < -7.6) return 'ponte';
  if (z > 20.1) return 'belvedere';
  if (z > 12.4) return 'ponte';
  return 'giardini';
}
// regioni: M Marechiaro, G grotta, L Luminos; i quattro cammini: V selva, Z monte, R risacca, S solaria
export const regionOf = x => x < 100 ? 'M' : x < 300 ? 'G' : x < 550 ? 'L' : x < 650 ? 'V' : x < 750 ? 'Z' : x < 850 ? 'R' : 'S';

// pseudo-ciclo del giorno a Luminos, uguale per tutti i visitatori: 16 minuti (giorno, tramonto, notte, alba)
export function luminosDay(now = Date.now()) {
  const p = (now / 1000 % 960) / 960;
  if (p < 0.62) return { p, k: 1 };
  if (p < 0.72) return { p, k: 1 - (p - 0.62) / 0.1 };
  if (p < 0.92) return { p, k: 0 };
  return { p, k: (p - 0.92) / 0.08 };
}
// marea di luce: ogni 4 minuti, dura 9 secondi (stesso momento per tutti)
export function tideState(now = Date.now()) { const t = now / 1000 % 240; return { on: t < 9, t, next: 240 - t }; }

export function buildWorld(scene, data, hooks) {
  const mats = new Map();
  const lam = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o })); return mats.get(k); };
  const glow = (c, o = {}) => { const { k = 3.3, ...rest } = o; const m = new THREE.MeshBasicMaterial({ color: c, ...rest }); m.color.multiplyScalar(k); return m; };
  const mesh = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const box = (w, hh, d, c, x, y, z, parent) => mesh(new THREE.BoxGeometry(w, hh, d), typeof c === 'number' ? lam(c) : c, x, y, z, parent);
  function canvasTex(w, hh, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = hh; const g = c.getContext('2d'); draw(g, w, hh);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData = { c, g }; return t;
  }
  const sign = (w, hh, tex, x, y, z, ry, parent) => { const m = mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ map: tex, transparent: true }), x, y, z, parent); m.rotation.y = ry || 0; return m; };
  const haloTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const halo = (color, size, x, y, z, parent, opacity = 0.8) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.set(size, size, 1); s.position.set(x, y, z); parent.add(s); return s;
  };
  function plaque(title, lines, w = 512, hh = 300, col = '#f5c56b', bg = 'rgba(18,16,38,0.92)') {
    return canvasTex(w, hh, (g) => {
      g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, w, hh, 22); g.fill();
      g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.roundRect(8, 8, w - 16, hh - 16, 16); g.stroke();
      g.fillStyle = col; g.textAlign = 'center'; g.font = `bold ${Math.round(w / 13)}px Georgia`; g.fillText(title, w / 2, hh * 0.32);
      g.fillStyle = '#efeaf8'; g.font = `${Math.round(w / 22)}px Georgia`;
      lines.forEach((l, i) => g.fillText(l, w / 2, hh * 0.53 + i * (w / 17)));
    });
  }

  const objects = [], solids = [], animated = [];
  const solid = (x, z, w, d) => solids.push({ x, z, w, d });
  const solidR = (x, z, r) => solids.push({ x, z, r });
  // bordo invisibile di un'isola ellittica: tanti piccoli ostacoli in cerchio, con varchi dove arrivano i ponti
  function edge(cx, cz, rx, rz, gaps = []) {
    for (let a = 0; a < Math.PI * 2; a += 0.06) {
      if (gaps.some(g => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < 0.16)) continue;
      solidR(cx + Math.cos(a) * rx, cz + Math.sin(a) * rz, 0.45);
    }
  }
  const markerGeo = new THREE.OctahedronGeometry(0.06, 0), markerMat = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.95, fog: false });
  function add(o) {
    o.pos = new THREE.Vector3(...o.pos);
    o.marker = new THREE.Mesh(markerGeo, markerMat); o.marker.position.copy(o.pos); o.marker.visible = false; scene.add(o.marker);
    objects.push(o); return o;
  }
  const npcs = [];
  function npc(kind, x, z, yaw, opts = {}) {
    const av = new Avatar(kind, '#ffffff', null);
    av.g.position.set(x, opts.y || 0, z); av.g.rotation.y = yaw; opts.parent.add(av.g);
    if (opts.seated) av.setSeated(true);
    av.lines = opts.lines || null; av.nextSay = 0;
    npcs.push(av); return av;
  }
  // chi passa vicino riceve il saluto (solo frasi del libro approvate da Nicola)
  animated.push((t, dt, ctx) => { for (const a of npcs) { if (!a.g.parent?.visible) continue; a.update(dt, 0, t);
    if (a.lines && ctx?.me && t > a.nextSay && Math.hypot(a.g.position.x - ctx.me.x, a.g.position.z - ctx.me.z) < 3.2) { a.say(a.lines[Math.floor(Math.random() * a.lines.length)], 6500, { maxLines: 5 }); a.nextSay = t + 45; } } });

  const gM = new THREE.Group(), gG = new THREE.Group(), gL = new THREE.Group();
  scene.add(gM, gG, gL);

  // =====================================================================
  // M · MARECHIARO, ad agosto
  // =====================================================================
  gM.add(new THREE.HemisphereLight(0xcfe6ff, 0x9a8a70, 1.5));
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.7); sun.position.set(22, 40, -60); gM.add(sun);
  // cielo d'estate
  {
    const geo = new THREE.SphereGeometry(300, 24, 12), col = new Float32Array(geo.attributes.position.count * 3), top = new THREE.Color(0x3f86d8), hor = new THREE.Color(0xd6ecff), c = new THREE.Color();
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = Math.max(0, p.getY(i) / 300); c.copy(hor).lerp(top, Math.min(1, y * 2.2)); c.toArray(col, i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const sky = mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }), 100, 0, 0, gM); sky.renderOrder = -1;
    mesh(new THREE.CircleGeometry(9, 20), glow(0xfff8e0, { fog: false }), 120, 110, -230, gM).lookAt(100, 0, 0);
    for (let i = 0; i < 12; i++) { const cl = new THREE.Group(); for (let k = 0; k < 3; k++) { const m = mesh(new THREE.IcosahedronGeometry(rnd(4, 8), 0), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, fog: false }), k * 7 - 7, rnd(-1, 1), rnd(-2, 2), cl); m.scale.y = 0.5; } cl.position.set(rnd(-150, 350), rnd(55, 90), rnd(-240, -120)); gM.add(cl); }
  }
  // il mare (onde sui vertici, ombreggiatura piatta)
  const seaGeo = new THREE.PlaneGeometry(700, 360, 70, 36); seaGeo.rotateX(-Math.PI / 2);
  const sea = mesh(seaGeo, new THREE.MeshLambertMaterial({ color: 0x1f7ab8, emissive: 0x0a3050, flatShading: true }), 100, -0.45, -60, gM); sea.userData.noShadow = true;
  const seaP = seaGeo.attributes.position, seaBase = Float32Array.from(seaP.array); let seaAcc = 0;
  animated.push((t, dt) => {
    if (!gM.visible || !sea.visible) return; seaAcc += dt; if (seaAcc < 1 / 25) return; seaAcc = 0;
    for (let i = 0; i < seaP.count; i++) { const x = seaBase[i * 3], z = seaBase[i * 3 + 2]; seaP.array[i * 3 + 1] = Math.sin(x * 0.12 + t * 1.1) * 0.12 + Math.cos(z * 0.1 + t * 0.8) * 0.12; }
    seaP.needsUpdate = true;
  });
  // banchina di pietra, il sentiero che sale e la collina con le case bianche a gradini
  const quayTex = canvasTex(256, 256, (g, w, hh) => { g.fillStyle = '#c9bca4'; g.fillRect(0, 0, w, hh); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = ['#d3c6ad', '#c2b499', '#d9cdb6', '#bfb095'][(x * 3 + y * 5) % 4]; g.fillRect(x * 32 + (y % 2) * 16 + 1, y * 32 + 1, 30, 30); } });
  quayTex.wrapS = quayTex.wrapT = THREE.RepeatWrapping; quayTex.repeat.set(10, 3);
  mesh(new THREE.BoxGeometry(80, 1.2, 9), new THREE.MeshLambertMaterial({ map: quayTex }), 0, -0.6, 15, gM);
  const hillMat = lam(0x9a8f62);
  for (let i = 0; i < 9; i++) { const zz = 21 + i * 4, yy = i * 2.2; box(110 - i * 7, yy + 2.2, 4.2, i % 2 ? hillMat : lam(0x8a8358), 0, (yy + 2.2) / 2 - 1, zz, gM); }
  // case bianche con le persiane verdi
  const houses = [];
  const white = lam(0xf4f0e6), roof = lam(0xc9774a), shutter = lam(0x3f7a52), shutterOpen = lam(0x2f5a3c), win = lam(0x3a4658);
  for (let i = 0; i < 8; i++) {
    const zz = 22 + i * 4, yy = i * 2.2 + 1.2, span = 50 - i * 3.2;
    for (let x = -span; x < span; x += srnd(5, 8)) {
      if (i === 0 && Math.abs(x) < 13) continue;
      const w = srnd(3.4, 5), hh = srnd(3.2, 5.2), d = 3.4;
      box(w, hh, d, white, x, yy + hh / 2, zz, gM); houses.push({ x, w, hh, yy, zz, d });
      if (srnd(0, 1) < 0.5) box(w + 0.2, 0.25, d + 0.2, roof, x, yy + hh + 0.12, zz, gM);
      for (let fx = x - w / 2 + 0.9; fx < x + w / 2 - 0.6; fx += 1.5) { const fy = yy + hh * 0.62; box(0.55, 0.8, 0.05, win, fx, fy, zz - d / 2 - 0.02, gM); box(0.28, 0.82, 0.06, shutter, fx - 0.42, fy, zz - d / 2 - 0.03, gM); box(0.28, 0.82, 0.06, shutterOpen, fx + 0.42, fy, zz - d / 2 - 0.03, gM); }
    }
  }
  // l'ultima casa in cima alla collina, con le persiane verdi accostate
  box(5, 4.6, 3.6, white, 6, 8 * 2.2 + 1.2 + 2.3, 22 + 8 * 4, gM); box(0.9, 1.1, 0.06, shutter, 6, 8 * 2.2 + 1.2 + 3, 22 + 8 * 4 - 1.83, gM);

  // ---- Marechiaro più viva: buganvillee, gerani, pini marittimi, campanile, faraglioni, gatti del porto, vele, delfini ----
  {
    const bug = [lam(0xc8287a), lam(0xe0449a), lam(0xa8206a)], leafD = lam(0x3f6a34), pot = lam(0xb5603a), ger = [lam(0xd8303a), lam(0xf06a8a), lam(0xffffff)];
    const pineCrown = lam(0x355a2e), pineCrown2 = lam(0x2c4e28), bark = lam(0x6a4a34);
    const blobGeo = new THREE.IcosahedronGeometry(1, 1);
    const ball = (mat, x, y, z, r, parent = gM) => { const m = mesh(blobGeo, mat, x, y, z, parent); m.scale.setScalar(r); return m; };
    // buganvillee che ricadono dalle facciate
    let bi = 0;
    for (const hs of houses) { if (srnd(0, 1) > 0.32) continue; const side = srnd(0, 1) < 0.5 ? -1 : 1, fx = hs.x + side * (hs.w / 2 - 0.35), fz = hs.zz - hs.d / 2 - 0.25;
      for (let k = 0; k < 7; k++) ball(k < 2 ? leafD : bug[(bi + k) % 3], fx + srnd(-0.5, 0.5), hs.yy + hs.hh * srnd(0.35, 1.02), fz + srnd(-0.15, 0.1), srnd(0.28, 0.5)); bi++; }
    // vasi di gerani lungo il bordo della banchina e davanti al forno
    for (const [x, z] of [[-11.4, 18.9], [-10.6, 18.9], [-5.6, 18.95], [-4.8, 18.95], [2.5, 18.9], [3.3, 18.9], [10.6, 18.9], [11.4, 18.9], [-11.6, 12.4], [11.6, 12.4]]) {
      mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.4, 8), pot, x, 0.2, z, gM);
      for (let k = 0; k < 4; k++) ball(k ? ger[(Math.abs(x * 3) + k) % 3 | 0] : leafD, x + srnd(-0.12, 0.12), 0.48 + srnd(0, 0.12), z + srnd(-0.12, 0.12), k ? 0.09 : 0.2);
      if (Math.abs(z - 12.4) < 0.1) solidR(x, z, 0.3);
    }
    // pini marittimi sui fianchi della collina
    const pine = (x, y, z, s) => { const t = mesh(new THREE.CylinderGeometry(0.16 * s, 0.24 * s, 5 * s, 6), bark, x, y + 2.5 * s, z, gM); t.rotation.z = srnd(-0.2, 0.2);
      const top = y + 5 * s; for (let k = 0; k < 4; k++) { const c = ball(k % 2 ? pineCrown : pineCrown2, x + srnd(-1.3, 1.3) * s + Math.sin(t.rotation.z) * -2.5 * s, top + srnd(-0.2, 0.5) * s, z + srnd(-1, 1) * s, 1.5 * s); c.scale.y = 0.55 * s; } };
    for (let i = 0; i < 9; i++) { const zz = 21 + i * 4, yy = i * 2.2 + 1.1; for (const side of [-1, 1]) if (srnd(0, 1) < 0.75) pine(side * srnd(48 - i * 3.6, 56 - i * 3.6), yy, zz + srnd(-1, 1), srnd(0.8, 1.2)); }
    pine(-24, 0, 26.5, 1.1); pine(30, 2.2, 25, 0.9);
    // il campanile della chiesa, a metà collina
    { const cx = -15, cy = 6 * 2.2 + 1.2, cz = 46.5, ochre = lam(0xe8d2a4);
      box(7, 6, 5, white, cx + 4.5, cy + 3, cz + 0.5, gM); box(7.4, 0.4, 5.4, roof, cx + 4.5, cy + 6.1, cz + 0.5, gM);
      mesh(new THREE.ConeGeometry(4.6, 2, 4).rotateY(Math.PI / 4), roof, cx + 4.5, cy + 7.3, cz + 0.5, gM).scale.set(1.08, 1, 0.78);
      mesh(new THREE.CircleGeometry(0.8, 16), lam(0x3a4658), cx + 4.5, cy + 4.3, cz - 2.02, gM).rotation.y = Math.PI;
      box(2.6, 12, 2.6, ochre, cx, cy + 6, cz, gM);
      for (const [dx, dz, ry] of [[0, -1.32, 0], [1.32, 0, Math.PI / 2], [-1.32, 0, Math.PI / 2], [0, 1.32, 0]]) { const o = box(0.9, 1.5, 0.06, lam(0x2a2620), cx + dx, cy + 10.4, cz + dz, gM); o.rotation.y = ry; }
      mesh(new THREE.ConeGeometry(0.4, 0.55, 10), lam(0x9a7a3a), cx, cy + 10.25, cz, gM);
      box(3, 0.3, 3, ochre, cx, cy + 12.1, cz, gM); mesh(new THREE.ConeGeometry(1.9, 2.6, 4).rotateY(Math.PI / 4), roof, cx, cy + 13.5, cz, gM);
      mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 4), lam(0x3a3a3a), cx, cy + 15.3, cz, gM);
      const clock = canvasTex(64, 64, g => { g.fillStyle = '#fbf6ea'; g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill(); g.strokeStyle = '#3a3026'; g.lineWidth = 3; g.stroke(); g.beginPath(); g.moveTo(32, 32); g.lineTo(32, 12); g.moveTo(32, 32); g.lineTo(46, 36); g.stroke(); });
      sign(1.1, 1.1, clock, cx, cy + 8.3, cz - 1.32, Math.PI, gM).rotation.y = 0; }
    // faraglioni al largo
    const rockM = lam(0x9a8c74), rockD = lam(0x7e715c);
    for (const [x, z, hgt, r] of [[-34, -34, 15, 4], [-27, -40, 10, 3], [-40, -44, 7, 2.6], [46, -58, 12, 3.6]]) {
      const g = new THREE.Group(); g.position.set(x, -1, z); gM.add(g);
      for (let k = 0; k < 4; k++) { const m = mesh(new THREE.DodecahedronGeometry(r * (1 - k * 0.18), 0), k % 2 ? rockD : rockM, srnd(-0.6, 0.6), hgt * (0.15 + k * 0.24), srnd(-0.6, 0.6), g); m.scale.y = 1.4; }
      ball(leafD, 0, hgt * 0.95 + r * 0.5, 0, r * 0.45, g).scale.y = r * 0.18;
    }
    // lampioni sulla banchina
    for (const x of [-10.8, 10.8]) { mesh(new THREE.CylinderGeometry(0.06, 0.09, 3.2, 6), lam(0x2a2e34), x, 1.6, 12.6, gM); box(0.36, 0.42, 0.36, lam(0x2a2e34), x, 3.35, 12.6, gM); box(0.28, 0.3, 0.28, glow(0xfff0c0, { k: 1.4 }), x, 3.33, 12.6, gM); solidR(x, 12.6, 0.2); }
    // ombrelloni e tavolini davanti al forno
    for (const [x, z, c] of [[-11, 16.2, 0xe8e2d0], [-3.6, 17.4, 0x3f7a8a]]) {
      mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 5), lam(0x6a5a4a), x, 1.15, z, gM);
      mesh(new THREE.ConeGeometry(1.4, 0.5, 8, 1, true), new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide, flatShading: true }), x, 2.35, z, gM);
      mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 12), lam(0xf4f0e6), x, 0.75, z, gM); mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 5), lam(0x3a3a3a), x, 0.37, z, gM);
      for (const a of [0.4, 2.6]) { const cx = x + Math.cos(a) * 0.8, cz = z + Math.sin(a) * 0.8; box(0.38, 0.05, 0.38, 0x8a5a3a, cx, 0.46, cz, gM); box(0.38, 0.4, 0.05, 0x8a5a3a, cx + Math.cos(a) * 0.18, 0.66, cz + Math.sin(a) * 0.18, gM).rotation.y = -a + Math.PI / 2; }
      solidR(x, z, 1.05);
    }
    // gatti del porto che dormono al sole
    const cats = [];
    const cat = (x, y, z, ry, col, col2, parent = gM) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); const m = lam(col), m2 = lam(col2);
      const b = ball(m, 0, 0.12, 0, 0.2, g); b.scale.set(0.24, 0.13, 0.17); const hd = ball(m, 0.17, 0.11, 0.08, 0.1, g);
      for (const s of [-1, 1]) { const e = mesh(new THREE.ConeGeometry(0.035, 0.07, 4), m2, 0.19 + s * 0.04, 0.2, 0.08, g); e.rotation.z = -s * 0.3; }
      const tl = mesh(new THREE.TorusGeometry(0.17, 0.03, 5, 12, Math.PI * 1.2), m2, 0, 0.05, 0, g); tl.rotation.x = Math.PI / 2;
      cats.push({ b, s: srnd(0, 6) }); return g; };
    cat(-4.1, 0, 13.15, 0.4, 0xd8893a, 0xb86a2a); cat(13.2, 0.0, 18.8, 2.2, 0x2a2a2e, 0x1a1a1e); cat(-12.4, 0.0, 15.3, -1, 0xeeeae2, 0x9a9590);
    solidR(-4.1, 13.15, 0.3); solidR(-12.4, 15.3, 0.3);
    animated.push(t => { if (!gM.visible) return; for (const c of cats) c.b.scale.y = 0.13 + Math.sin(t * 1.4 + c.s) * 0.008; });
    // vele al largo
    const sails = [];
    for (let i = 0; i < 3; i++) { const g = new THREE.Group(); gM.add(g); box(1.2, 0.5, 4, 0xf4f0e6, 0, 0, 0, g);
      const sg = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0.3, -1.4, 0, 6, 0.6, 0, 0.3, 1.6], 3)); sg.computeVertexNormals();
      mesh(sg, new THREE.MeshLambertMaterial({ color: i === 1 ? 0xf2d27a : 0xffffff, side: THREE.DoubleSide }), 0, 0, 0, g); g.userData = { z: -60 - i * 22, v: 0.6 + i * 0.25, o: i * 70 }; sails.push(g); }
    animated.push(t => { if (!gM.visible) return; for (const g of sails) { const u = g.userData, x = -90 + ((t * u.v + u.o) % 200); g.position.set(x, -0.1, u.z); g.rotation.set(0, Math.PI / 2, Math.sin(t * 0.8 + u.o) * 0.04); } });
    // un branco di tursiopi che salta al largo, ogni tanto
    const pod = [];
    for (let i = 0; i < 3; i++) { const d = new THREE.Group(); gM.add(d); const dm = lam(0x8fa4b8);
      ball(dm, 0, 0, 0, 1, d).scale.set(0.24, 0.22, 0.75); const sn = ball(dm, 0, -0.02, -0.75, 1, d); sn.scale.set(0.07, 0.06, 0.16);
      const f = mesh(new THREE.ConeGeometry(0.07, 0.24, 4), lam(0x7a8ea4), 0, 0.22, 0.05, d); f.rotation.x = -0.5; f.scale.z = 0.35;
      const tl = box(0.5, 0.03, 0.14, 0x7a8ea4, 0, 0, 0.8, d); d.visible = false; pod.push(d); }
    animated.push(t => { if (!gM.visible) return; const P = 13, cyc = Math.floor(t / P), u = t / P - cyc, bx = 22 + (cyc % 4) * 9, bz = -26 - (cyc % 3) * 7;
      pod.forEach((d, i) => { const k = (u - i * 0.07) * 5; if (k < 0 || k > 1) { d.visible = false; return; } d.visible = true;
        d.position.set(bx + i * 1.6 + k * 6, -0.4 + Math.sin(k * Math.PI) * 1.6, bz + i * 0.9); d.rotation.order = 'YXZ'; d.rotation.set(Math.cos(k * Math.PI) * 0.9, -Math.PI / 2, 0); }); });
  }
  // il faro di Marechiaro, sul promontorio
  box(16, 3, 14, 0x8a7d62, -46, 0.5, -6, gM); mesh(new THREE.CylinderGeometry(1.1, 1.5, 11, 10), lam(0xf4f0e6), -46, 7.5, -6, gM);
  for (let y = 4; y < 12; y += 3) mesh(new THREE.CylinderGeometry(1.2, 1.25, 0.9, 10), lam(0xc0443a), -46, y, -6, gM);
  mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.2, 8), glow(0xfff3c4), -46, 13.6, -6, gM); mesh(new THREE.ConeGeometry(1.1, 1.0, 8), lam(0x3a3a40), -46, 14.7, -6, gM);
  // gabbiani
  const gulls = [], gullGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.2, -0.6, 0.12, 0.1, 0, 0, 0.1, 0, 0, -0.2, 0.6, 0.12, 0.1, 0, 0, 0.1], 3));
  for (let i = 0; i < 9; i++) { const b = mesh(gullGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), 0, 0, 0, gM); gulls.push({ b, r: rnd(6, 20), s: rnd(0, 6), y: rnd(7, 14), v: rnd(0.15, 0.35), cx: rnd(-15, 15), cz: rnd(-10, 6) }); }
  animated.push(t => { if (!gM.visible) return; for (const o of gulls) { const a = t * o.v + o.s; o.b.position.set(o.cx + Math.cos(a) * o.r, o.y + Math.sin(t * 1.3 + o.s) * 0.4, o.cz + Math.sin(a) * o.r); o.b.rotation.y = -a; o.b.scale.y = 1 + Math.sin(t * 6 + o.s) * 0.5; } });
  // il molo di legno, con i pali
  const planks = canvasTex(128, 512, (g, w, hh) => { for (let i = 0; i < 32; i++) { g.fillStyle = i % 2 ? '#9a7450' : '#8a6644'; g.fillRect(0, i * 16, w, 15); g.fillStyle = '#5a4128'; g.fillRect(0, i * 16 + 15, w, 1); } });
  mesh(new THREE.BoxGeometry(3.2, 0.25, 12.8), new THREE.MeshLambertMaterial({ map: planks }), 0, -0.12, 6.3, gM);
  for (let z = 0.2; z < 12.5; z += 2.05) for (const x of [-1.5, 1.5]) mesh(new THREE.CylinderGeometry(0.13, 0.13, 2.2, 6), lam(0x5a4128), x, 0.0, z, gM);
  // il palo in fondo al molo: il traguardo delle gare di Sophia
  const palo = mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.6, 7), lam(0x6a4a2c), 1.35, 0.55, 0.35, gM); solidR(1.35, 0.35, 0.2);
  // reti stese e barche
  for (const [x, z] of [[-8, 13], [9.5, 13.2]]) { const n = mesh(new THREE.IcosahedronGeometry(0.8, 1), lam(0x7a8a6a), x, 0.2, z, gM); n.scale.set(1.4, 0.35, 1); solidR(x, z, 1); }
  const boats = [];
  function boat(x, z, col, ry, parent, lampara) {
    const g = new THREE.Group(); g.position.set(x, -0.3, z); g.rotation.y = ry; parent.add(g);
    box(1.4, 0.5, 3.6, col, 0, 0.1, 0, g); box(1.1, 0.35, 3.0, 0xe8e0cf, 0, 0.3, 0, g); box(1.5, 0.1, 3.7, 0x6a4a2c, 0, 0.42, 0, g);
    box(1.1, 0.06, 0.25, 0x6a4a2c, 0, 0.42, -0.5, g); box(1.1, 0.06, 0.25, 0x6a4a2c, 0, 0.42, 0.7, g);
    const prow = mesh(new THREE.ConeGeometry(0.7, 1.1, 4), lam(col), 0, 0.1, -2.25, g); prow.rotation.set(-Math.PI / 2, Math.PI / 4, 0); prow.scale.set(1, 1, 0.45);
    if (lampara) { box(0.05, 0.7, 0.05, 0x3a2a20, 0, 0.8, -1.7, g); box(0.4, 0.05, 0.05, 0x3a2a20, 0, 1.15, -1.7, g); mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.22, 8), lam(0x8a8a80), 0.18, 1.0, -1.7, g); }
    const b = { g, s: rnd(0, 6), y: -0.3 }; boats.push(b); return b;
  }
  const marcoBoat = boat(2.75, 3.2, 0xe8e4da, 0, gM, true);
  boat(-3.2, 7, 0x2f6aa8, 0.1, gM); boat(-5.5, 1.5, 0xb8442e, 0.5, gM); boat(8, -6, 0x3d8a6a, -0.3, gM); boat(-14, -4, 0xd9b04a, 0.8, gM);
  animated.push(t => { for (const b of boats) { if (b.riding) continue; b.g.position.y = b.y + Math.sin(t * 1.2 + b.s) * 0.07; b.g.rotation.z = Math.sin(t * 0.9 + b.s) * 0.04; } });
  // pescherecci lontani, come puntini
  for (let i = 0; i < 4; i++) box(2.5, 1.2, 6, 0xd8d0c0, rnd(-60, 80), 0.2, rnd(-130, -90), gM);
  // delfini (si vedono durante la traversata)
  const dolphins = [];
  for (let i = 0; i < 4; i++) { const d = new THREE.Group(); mesh(new THREE.IcosahedronGeometry(0.3, 1), lam(0x8fa4b8), 0, 0, 0, d).scale.set(0.75, 0.7, 2.4); mesh(new THREE.ConeGeometry(0.07, 0.34, 6), lam(0x8fa4b8), 0, -0.02, -0.82, d).rotation.x = -Math.PI / 2; const f = mesh(new THREE.ConeGeometry(0.06, 0.2, 4), lam(0x7a8ea4), 0, 0.25, 0.05, d); f.rotation.x = -0.4; f.scale.z = 0.4; mesh(new THREE.BoxGeometry(0.5, 0.03, 0.12), lam(0x7a8ea4), 0, 0, 0.72, d); d.scale.setScalar(0.8); d.visible = false; gM.add(d); dolphins.push(d); }

  // Tonino, che rammenda le reti seduto su una cassa
  box(0.7, 0.45, 0.6, 0x7a5a3a, -2.9, 0.22, 13.4, gM); solid(-2.9, 13.4, 1.6, 1.4);
  npc('tonino', -2.9, 13.4, Math.PI * 0.85, { parent: gM, seated: true, lines: ['«Buona marea.»', '♪ … ♪'] });
  const tNet = mesh(new THREE.IcosahedronGeometry(0.6, 1), lam(0x8a9a7a), -2.3, 0.15, 12.8, gM); tNet.scale.set(1.3, 0.3, 1);
  add({ id: 'tonino', name: 'Il vecchio Tonino', pos: [-2.9, 0.9, 13.4], radius: 2.3, markerY: 2.3, desc: 'Rammenda le reti al sole.',
    open: () => [h('h2', {}, 'Il vecchio Tonino'),
      h('p', {}, 'Rammenda le reti al sole e canticchia un motivo senza parole, sempre lo stesso, che nessuno gli ha mai sentito finire.'),
      h('p', { class: 'quote' }, '«Buona marea», dice senza alzare la testa.'),
      h('p', {}, 'È il saluto dei vecchi di Marechiaro, quello che si dice a chiunque prenda il mare. Nessuno sa più da dove venga.'),
      h('p', { class: 'quote' }, '«E girate al largo dalla Secca.»')] });
  // il forno di Donna Rosa
  box(7, 4.2, 4, white, -8.5, 2.1, 21.2, gM); box(1.4, 2.2, 0.06, lam(0x5a3a22), -8.5, 1.1, 19.17, gM);
  box(1.6, 0.9, 0.05, glow(0xffc070), -6.2, 1.6, 19.17, gM); sign(2.6, 0.7, plaque('FORNO', ['di Donna Rosa'], 400, 140, '#7a4a22', 'rgba(250,244,230,.97)'), -8.5, 2.9, 19.14, 0, gM);
  add({ id: 'forno', name: 'Il forno di Donna Rosa', pos: [-8.5, 1.2, 18.6], radius: 2.2, markerY: 2.6, desc: 'Profumo di pane.',
    open: () => [h('h2', {}, 'Marechiaro'), h('p', {}, 'A Marechiaro, ad agosto, il mare brilla così forte che bisogna guardarlo con gli occhi socchiusi. Le case bianche salgono la collina a gradini, e l\'aria sa di sale, di alghe e del pane appena sfornato da Donna Rosa.')] });
  // la fontana: partenza della gara al molo
  mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.6, 12), lam(0xd8ccb4), -6, 0.3, 15.6, gM); mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.05, 12), lam(0x5aa8d8), -6, 0.58, 15.6, gM);
  mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.0, 8), lam(0xd8ccb4), -6, 0.95, 15.6, gM); solidR(-6, 15.6, 1.0);
  add({ id: 'fontana', name: 'La fontana (gara al molo)', pos: [-6, 0.8, 15.6], radius: 2.0, markerY: 1.9, desc: 'Parti da qui e corri fino al palo in fondo al molo.', use: () => hooks.race() });
  // le conchiglie di Luca e la lampara della barca di Marco
  mesh(new THREE.ConeGeometry(0.12, 0.18, 6), lam(0xf0d7c0), -1.0, 0.1, 7.6, gM).rotation.z = 1.3;
  mesh(new THREE.IcosahedronGeometry(0.1, 0), lam(0x9a9488), -0.85, 0.08, 7.9, gM);
  add({ id: 's-conchiglie', name: 'Sassi e conchiglie', pos: [-0.95, 0.15, 7.7], radius: 1.4, hidden: true, secret: 'conchiglie', markerY: 0.8, desc: 'Le conchiglie di Luca.',
    use: () => hooks.toast('🐚 Un sasso e una conchiglia, dimenticati sul molo. Luca ha sempre le tasche piene di sassi e conchiglie raccolti per strada.') });
  add({ id: 's-lampara', name: 'La lampara a prua', pos: [2.75, 0.9, 1.5], radius: 2.1, hidden: true, secret: 'lampara', markerY: 1.6, desc: 'La lampara della barca di Marco.',
    use: () => hooks.toast('🏮 A prua della barca di Marco c\'è una piccola lampara: gliel\'aveva regalata suo padre, per le sere in cui uscivano insieme a pescare con la lenza. È spenta.') });
  add({ id: 'barca', name: 'La barca di Marco', pos: [2.4, 0.5, 4.6], radius: 1.7, markerY: 1.5, desc: 'Si va per mare alla Grotta dei Sussurri.',
    open: () => [h('h2', {}, 'La barca di Marco'),
      h('p', {}, 'È la vecchia barca su cui Marco ha imparato a remare a sei anni. A Marechiaro i ragazzi sanno portare una barca prima di saper nuotare.'),
      h('p', {}, 'La Grotta dei Sussurri si apre alla base delle scogliere, oltre il promontorio a sud del paese. Si vede solo arrivando dal mare.'),
      h('p', {}, h('button', { class: 'btn', type: 'button', onclick: () => hooks.travel('grotta') }, 'Prendi il mare'))] });

  // il leggio del libro: copertina, ebook, iscrizione
  const coverTex = canvasTex(10, 16, (g) => { g.fillStyle = '#1a2a50'; g.fillRect(0, 0, 10, 16); });
  new THREE.TextureLoader().load(data.copertina || 'img/copertina.jpg', t => { t.colorSpace = THREE.SRGBColorSpace; cover.material.map = t; cover.material.needsUpdate = true; });
  box(0.9, 1.0, 0.6, 0x6a4a2c, 4.6, 0.5, 13.6, gM); solid(4.6, 13.6, 1.1, 0.8);
  const cover = sign(0.64, 1.0, coverTex, 4.6, 1.55, 13.25, 0, gM); cover.rotation.x = -0.28;
  add({ id: 'libro', name: 'Il libro', pos: [4.6, 1.2, 13.1], radius: 2.2, markerY: 2.4, desc: data.acquisto ? 'Copertina, ebook e avviso per il cartaceo.' : 'Copertina, uscita e iscrizione.', open: () => bookPanel() });
  box(0.9, 1.0, 0.6, 0x6a4a2c, 7.4, 0.5, 13.6, gM); solid(7.4, 13.6, 1.1, 0.8);
  const countTex = canvasTex(400, 300, () => {}), regSign = sign(0.9, 0.68, countTex, 7.4, 1.4, 13.28, 0, gM); regSign.rotation.x = -0.28;
  add({ id: 'registro', name: data.acquisto ? 'Avvisami per il cartaceo' : 'Avvisami quando esce', pos: [7.4, 1.1, 13.1], radius: 2.2, markerY: 2.2, desc: data.acquisto ? 'Iscrizione per sapere quando esce il libro cartaceo.' : 'Iscrizione per sapere quando esce il libro.', open: () => signupPanel() });
  function drawCount() {
    const { g } = countTex.userData, c = countdown();
    g.fillStyle = 'rgba(250,244,230,.97)'; g.fillRect(0, 0, 400, 300); g.strokeStyle = '#2f4f9a'; g.lineWidth = 6; g.strokeRect(10, 10, 380, 280);
    g.textAlign = 'center'; g.fillStyle = '#2f4f9a'; g.font = 'bold 30px Georgia'; g.fillText(data.acquisto ? 'IL LIBRO È USCITO' : 'IL LIBRO ESCE', 200, 70);
    g.fillStyle = '#1a1a2a';
    if (data.acquisto) { g.font = 'bold 44px Georgia'; g.fillText('ebook', 200, 140); g.font = '28px Georgia'; g.fillText('su Amazon', 200, 180); g.font = '20px Georgia'; g.fillText('cartaceo in arrivo: ti avviso', 200, 250); }
    else if (c.giorni != null) { g.font = 'bold 92px Georgia'; g.fillText(String(c.giorni), 200, 180); g.font = '26px Georgia'; g.fillText(c.giorni === 1 ? 'giorno' : 'giorni', 200, 220); g.font = '20px Georgia'; g.fillText('lascia la tua email: ti avviso', 200, 262); }
    else { g.font = 'bold 40px Georgia'; wrapText(g, c.periodo || 'presto', 200, 150, 340, 46, 2); g.font = '20px Georgia'; g.fillText('lascia la tua email: ti avviso', 200, 250); }
    countTex.needsUpdate = true;
  }
  drawCount(); setInterval(drawCount, 60000);

  // =====================================================================
  // G · GROTTA DEI SUSSURRI
  // =====================================================================
  const GX = 200;
  gG.add(new THREE.HemisphereLight(0x8fb0e8, 0x1a1a2a, 0.55));
  // fuori: il sole di agosto sulla scogliera, il mare e il cielo (dentro la grotta il sole non arriva)
  { const sunG = new THREE.DirectionalLight(0xfff0d8, 2.2); sunG.position.set(GX + 30, 40, 70); sunG.target.position.set(GX, 0, 12); gG.add(sunG, sunG.target);
    const fillG = new THREE.HemisphereLight(0xcfe6ff, 0x6a5a48, 0.9); fillG.position.set(GX, 30, 40); gG.add(fillG);
    const seaG = mesh(new THREE.PlaneGeometry(320, 140, 40, 14).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x1f7ab8, emissive: 0x0a3050, flatShading: true }), GX, -0.4, 86, gG); seaG.userData.noShadow = true;
    const sp = seaG.geometry.attributes.position, sb = Float32Array.from(sp.array); let acc = 0;
    animated.push((t, dt) => { if (!gG.visible) return; acc += dt; if (acc < 1 / 20) return; acc = 0; for (let i = 0; i < sp.count; i++) sp.array[i * 3 + 1] = Math.sin(sb[i * 3] * 0.12 + t * 1.1) * 0.12 + Math.cos(sb[i * 3 + 2] * 0.1 + t * 0.8) * 0.12; sp.needsUpdate = true; });
    const geo = new THREE.SphereGeometry(260, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), col = new Float32Array(geo.attributes.position.count * 3), top = new THREE.Color(0x3f86d8), hor = new THREE.Color(0xd6ecff), c = new THREE.Color();
    for (let i = 0; i < geo.attributes.position.count; i++) { c.copy(hor).lerp(top, Math.min(1, geo.attributes.position.getY(i) / 260 * 2.2)); c.toArray(col, i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const skyG = mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }), GX, 0, 40, gG); skyG.renderOrder = -1;
    // la costa che continua, con il promontorio a nord
    for (const [x, z, w, hh] of [[-70, 30, 50, 22], [70, 24, 60, 18], [-110, 60, 40, 30]]) box(w, hh, 14, lam(0x6e665e), GX + x, hh / 2 - 2, z, gG);
    // dentro la grotta il sole e il cielo non arrivano
    animated.push((t, dt, ctx) => { if (!gG.visible || !ctx?.me) return; const out = ctx.me.z > 14.2; sunG.intensity = out ? 2.2 : 0; fillG.intensity = out ? 0.9 : 0; skyG.visible = seaG.visible = out; });
  }
  // scogliera esterna, con l'apertura bassa e nera
  const cliff = lam(0x7a7066), cliffDark = lam(0x655c52);
  box(38.6, 26, 10, cliff, GX - 20.7, 12, 10, gG); box(38.6, 26, 10, cliff, GX + 20.7, 12, 10, gG); box(2.8, 22.6, 10, cliff, GX, 13.7, 10, gG); // la parete, con l'apertura bassa
  box(24, 3, 8, cliffDark, GX, -1, 19, gG); // lo scoglio dell'approdo
  for (let i = 0; i < 18; i++) { const r = mesh(new THREE.DodecahedronGeometry(srnd(0.8, 2), 0), cliffDark, GX + srnd(-12, 12), srnd(-0.3, 0.6), 22.5 + srnd(0, 3), gG); r.scale.y = 0.6; }
  for (let i = 0; i < 14; i++) { const r = mesh(new THREE.DodecahedronGeometry(srnd(1.5, 3.5), 0), cliff, GX + srnd(-30, 30), srnd(2, 22), 15.4, gG); }
  // alghe all'imboccatura
  for (let x = -1.3; x <= 1.3; x += 0.3) { const l = srnd(0.25, 0.6); box(0.05, l, 0.03, lam(0x3a6a3a), GX + x, 2.4 - l / 2, 15.35, gG); }
  // l'interno: buio, soffitto a vista solo nel tunnel
  const tunnelWall = lam(0x3a3634), salt = lam(0xcfd8e0);
  box(1, 3, 12.6, tunnelWall, GX - 1.8, 1.5, 10.1, gG); box(1, 3, 12.6, tunnelWall, GX + 1.8, 1.5, 10.1, gG); box(4.6, 1, 12.6, tunnelWall, GX, 2.9, 10.1, gG);
  box(4.6, 0.1, 13, lam(0x2c2a28), GX, 0.0, 10.1, gG);
  // croste di sale e chiazze di alghe sulle pareti
  for (let z = 4.5; z < 16; z += 0.7) for (const sx of [-1, 1]) if (srnd(0, 1) < 0.7) { const y = srnd(0.2, 2.2); box(0.02, srnd(0.08, 0.2), srnd(0.2, 0.5), y < 0.7 ? lam(0x2f4a34) : salt, GX + sx * 1.29, y, z, gG); }
  // le rune azzurre sulla parete del tunnel
  const runeWallTex = canvasTex(512, 128, (g) => { g.clearRect(0, 0, 512, 128); const s = ['vento', 'roccia', 'acqua', 'luce', 'roccia', 'vento', 'acqua']; s.forEach((r, i) => drawRune(g, r, 12 + i * 72, 24, 64, '#7fd4ff', 6)); });
  const runeWall = sign(2.2, 0.55, runeWallTex, GX + 1.27, 1.5, 10.2, -Math.PI / 2, gG); runeWall.material.blending = THREE.AdditiveBlending; runeWall.material.color.setScalar(4.5);
  const runeLight = new THREE.PointLight(0x6fc8ff, 3, 5, 1.6); runeLight.position.set(GX + 0.6, 1.5, 10.2); gG.add(runeLight);
  animated.push(t => { if (!gG.visible) return; const k = 0.6 + Math.sin(t * 1.8) * 0.4; runeWall.material.opacity = 0.5 + k * 0.5; runeLight.intensity = 1.5 + k * 2.5; });
  add({ id: 's-rune', name: 'Una fila di segni', pos: [GX + 1.1, 1.3, 10.2], radius: 1.8, secret: 'rune-grotta', markerY: 2.2, desc: 'Le rune azzurre.',
    open: () => [h('h2', {}, 'Le rune azzurre'),
      h('p', {}, 'Non sono graffiti. È una scrittura antica, e brilla di una luce azzurra che non viene dalla torcia.'),
      h('p', {}, 'Giulia li ha già visti: in un libro nella biblioteca del nonno. Sono rune, la scrittura degli antichi popoli del mare. Le copia sul quaderno, segno per segno.'),
      h('p', { class: 'quote' }, '«Il passaggio si apre a coloro che portano i quattro doni.»')] });
  add({ id: 's-silenzio', name: 'Il silenzio', pos: [GX, 0.6, 7.2], radius: 0.8, hidden: true, secret: 'silenzio', proximity: 1.3, markerY: 1.6, desc: 'Troppo silenzioso.',
    use: () => hooks.toast('🤫 Non si sente cadere nemmeno una goccia. In tutte le grotte che conosci, il mare si sente sempre. Qui no.') });
  // la fessura, e la caverna di sale che brilla
  box(1, 3, 3.8, tunnelWall, GX - 1.05, 1.5, 2.5, gG); box(1, 3, 3.8, tunnelWall, GX + 1.05, 1.5, 2.5, gG); box(3, 1, 3.8, tunnelWall, GX, 2.7, 2.5, gG);
  const CZ = -12.5;
  mesh(new THREE.CylinderGeometry(16, 16, 0.3, 28), lam(0x3a3a46), GX, -0.16, CZ, gG);
  // pareti di cristalli di sale (InstancedMesh)
  {
    const pos = [];
    for (let a = 0; a < Math.PI * 2; a += 0.07) for (let k = 0; k < 3; k++) { const r = 15.2 + k * 1.1 + srnd(-0.4, 0.4); const x = GX + Math.cos(a) * r, z = CZ + Math.sin(a) * r * 0.95; if (Math.abs(x - GX) < 1.6 && z > CZ + 12) continue; pos.push([x, z, srnd(1.5, 7) + k * 3, a]); }
    const im = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0xbfd8ee, emissive: 0x3a5a7a, flatShading: true }), pos.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    pos.forEach(([x, z, hh, a], i) => im.setMatrixAt(i, m.compose(p.set(x, hh / 2, z), q.setFromEuler(e.set(srnd(-0.3, 0.3), a, srnd(-0.3, 0.3))), s.set(srnd(0.5, 1.1), hh / 2, srnd(0.5, 1.1)))));
    gG.add(im);
    // migliaia di piccoli cristalli: punti luminosi sulle pareti
    const sp = []; for (let i = 0; i < 900; i++) { const a = rnd(0, 6.28), r = rnd(14.6, 16.5); sp.push(GX + Math.cos(a) * r, rnd(0.3, 9), CZ + Math.sin(a) * r * 0.95); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    const sparks = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xe8f4ff, size: 0.12, transparent: true, opacity: 0.9 })); gG.add(sparks);
    animated.push(t => { if (gG.visible) sparks.material.opacity = 0.65 + Math.sin(t * 2.3) * 0.25; });
  }
  // la volta, così alta che le torce non ci arrivano, con le stalattiti di sale
  { const dome = mesh(new THREE.CylinderGeometry(4, 18.5, 9, 28, 1, true), new THREE.MeshLambertMaterial({ color: 0x23232e, side: THREE.BackSide, flatShading: true }), GX, 15.5, CZ, gG); dome.userData.noShadow = true;
    const stM = new THREE.MeshLambertMaterial({ color: 0xaec4d8, emissive: 0x1a2a3a, flatShading: true });
    for (let i = 0; i < 70; i++) { const a = srnd(0, 6.28), r = srnd(5, 16), y = 11 + (16 - r) * 0.35 + 0.5, l = srnd(0.8, 3.2); const st = mesh(new THREE.ConeGeometry(srnd(0.12, 0.35), l, 5), stM, GX + Math.cos(a) * r, y - l / 2, CZ + Math.sin(a) * r * 0.95, gG); st.rotation.x = Math.PI; }
    // grandi grappoli di cristalli che brillano di luce propria
    const crG = new THREE.OctahedronGeometry(1, 0), crM = [new THREE.MeshStandardMaterial({ color: 0xd8ecff, emissive: 0x7fc8ff, emissiveIntensity: 1.6, roughness: 0.2, flatShading: true }), new THREE.MeshStandardMaterial({ color: 0xeef6ff, emissive: 0xbfe4ff, emissiveIntensity: 3.6, roughness: 0.2, flatShading: true })];
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + srnd(-0.12, 0.12), r = srnd(13.6, 14.6), x = GX + Math.cos(a) * r, z = CZ + Math.sin(a) * r * 0.95; if (Math.abs(x - GX) < 3.5 && z > CZ + 10) continue;
      const g = new THREE.Group(); g.position.set(x, 0, z); gG.add(g);
      for (let k = 0; k < 6; k++) { const hh = srnd(0.8, 2.6) * (k ? 1 : 1.5), m = mesh(crG, crM[k === 0 && i % 3 === 0 ? 1 : 0], srnd(-0.6, 0.6), hh * 0.5, srnd(-0.6, 0.6), g); m.scale.set(srnd(0.18, 0.3), hh * 0.55, srnd(0.18, 0.3)); m.rotation.set(srnd(-0.45, 0.45), srnd(0, 3), srnd(-0.45, 0.45)); }
      solidR(x, z, 1.1); }
    // il lago è così limpido che si possono contare i sassi sul fondo
    const pebG = new THREE.IcosahedronGeometry(1, 0), pebM = [lam(0x8a8f9a), lam(0x6a707c), lam(0xb0b4bc), lam(0x9a8a78)];
    for (let i = 0; i < 160; i++) { const a = rnd(0, 6.28), r = Math.sqrt(rnd(0, 1)) * 10.6; const m = mesh(pebG, pebM[i % 4], GX + Math.cos(a) * r, -0.02, CZ + Math.sin(a) * r, gG); m.scale.set(rnd(0.08, 0.22), 0.05, rnd(0.08, 0.2)); m.rotation.y = rnd(0, 3); }
  }
  add({ id: 's-sale', name: 'La parete che brilla', pos: [GX - 12.4, 1.4, CZ + 4], radius: 2.2, secret: 'sale', markerY: 2.4, desc: 'Sale che brilla di luce propria.',
    open: () => [h('h2', {}, 'Il lago di cristallo'), h('p', {}, 'Le pareti brillano: migliaia di piccoli cristalli, come il mare di notte quando ci passa sopra una lampara. Il soffitto è così alto che le torce non ci arrivano.'),
      h('p', {}, 'Giulia sfiora la parete e, per abitudine, si porta la punta del dito alla lingua, come fa con gli scogli.'), h('p', { class: 'quote' }, '«È sale. Sale che brilla di luce propria.»')] });
  // il lago, fermo e limpido: si cammina sull'acqua
  const lake = mesh(new THREE.CircleGeometry(11, 40), new THREE.MeshLambertMaterial({ color: 0x5fb8e8, emissive: 0x1a4a6a, transparent: true, opacity: 0.85 }), GX, 0.02, CZ, gG); lake.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 40; i++) { const a = rnd(0, 6.28), r = rnd(2, 10.5); mesh(new THREE.DodecahedronGeometry(rnd(0.08, 0.25), 0), lam(0x8a8a96), GX + Math.cos(a) * r, -0.08, CZ + Math.sin(a) * r, gG); }
  const caveLight = new THREE.PointLight(0x9fd8ff, 14, 26, 1.3); caveLight.position.set(GX, 6, CZ); gG.add(caveLight);
  // l'isola, poco più grande di una barca, con le quattro pietre in cerchio
  mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.5, 9), lam(0x5a5450), GX, -0.2, CZ, gG);
  edge(GX, CZ, 14.6, 13.9, [Math.PI / 2]);
  const stoneTex = {
    marco: (g) => { g.beginPath(); for (let a = 0; a < 9; a += 0.2) g.lineTo(64 + Math.cos(a) * a * 5, 64 + Math.sin(a) * a * 5); g.stroke(); },
    luca: (g) => { g.beginPath(); g.moveTo(64, 104); g.lineTo(64, 34); g.stroke(); for (let y = 50; y < 96; y += 14) { g.beginPath(); g.moveTo(64, y); g.lineTo(42, y - 14); g.moveTo(64, y); g.lineTo(86, y - 14); g.stroke(); } },
    giulia: (g) => { g.beginPath(); g.moveTo(26, 100); g.lineTo(64, 30); g.lineTo(102, 100); g.moveTo(46, 100); g.lineTo(64, 66); g.lineTo(82, 100); g.stroke(); },
    sophia: (g) => { g.beginPath(); for (let a = 0; a < 12; a += 0.2) g.lineTo(64 + Math.cos(a) * a * 3.6, 64 + Math.sin(a) * a * 3.6); g.stroke(); },
  };
  const stones = {};
  AVATARS.forEach((a, i) => {
    const ang = -Math.PI / 2 + i * Math.PI / 2, x = GX + Math.cos(ang) * 1.15, z = CZ + Math.sin(ang) * 1.15;
    const col = new THREE.Color(a.col);
    const st = mesh(new THREE.IcosahedronGeometry(0.26, 1), new THREE.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 3.6, transparent: true, opacity: 0.92, flatShading: true }), x, 0.6, z, gG); st.scale.y = 1.3;
    const sym = canvasTex(128, 128, (g) => { g.clearRect(0, 0, 128, 128); g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 7; g.lineCap = 'round'; stoneTex[a.id](g); });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: sym, transparent: true, depthWrite: false })); sp.scale.set(0.3, 0.3, 1); sp.position.set(x, 0.62, z); gG.add(sp);
    const hl = halo(a.col, 1.2, x, 0.6, z, gG, 0.55);
    stones[a.id] = { st, hl, sp };
    solidR(x, z, 0.28);
  });
  animated.push(t => { if (!gG.visible) return; Object.values(stones).forEach((o, i) => { o.st.position.y = o.sp.position.y = 0.6 + Math.sin(t * 1.5 + i) * 0.04; o.st.rotation.y = t * 0.4 + i; o.hl.material.opacity = 0.45 + Math.sin(t * 2 + i * 1.3) * 0.15; }); });
  const STONE_TXT = {
    marco: ['La pietra blu ha la luce del mare a mezzogiorno.', 'Marco ha dodici anni e porta sempre la giacca blu di suo padre, troppo grande, con le maniche che gli coprono metà delle mani. Non ha bisogno di guardare la costa per tenere la rotta: le correnti le sente nei remi. Non ne ha mai parlato con nessuno.', 'Il suo dono: il Flusso.'],
    sophia: ['La pietra bianca è la più luminosa di tutte, eppure la si può guardare senza socchiudere gli occhi.', 'Sophia corre sempre, con la coda alta di capelli scuri che salta a ogni passo. Con Marco fa a gara da quando avevano sei anni: chi arriva prima al molo, alla fontana, in cima alla scogliera. Il punteggio lo tiene lei.', 'Il suo dono: la Luce.'],
    giulia: ['La pietra marrone è scura e calda come terra bagnata.', 'Giulia porta gli occhiali e una borsa a tracolla piena di quaderni e matite. In nessun quaderno c\'è una pagina scritta storta: quelle, Giulia le strappa. Le rune della grotta le ha riconosciute da un libro della biblioteca del nonno.', 'Il suo dono: la Memoria.'],
    luca: ['La pietra verde sembra una foglia controluce.', 'Luca è il più piccolo del gruppo, nove anni appena, e ha sempre le tasche piene di sassi e conchiglie. Quando i delfini nuotano accanto alla barca, chiude gli occhi e sorride, come se ascoltasse qualcosa che gli altri non possono sentire.', 'Il suo dono: la Natura.'],
  };
  AVATARS.forEach((a, i) => {
    const ang = -Math.PI / 2 + i * Math.PI / 2;
    add({ id: 'pietra-' + a.id, name: `La pietra ${a.pietra}`, pos: [GX + Math.cos(ang) * 1.15, 0.6, CZ + Math.sin(ang) * 1.15], radius: 1.5, markerY: 1.25, desc: `La pietra di ${a.nome}.`,
      open: () => [h('h2', {}, 'Le quattro pietre'), h('h3', { style: `color:${a.col === '#f2f4ff' ? '#e8e4f4' : a.col}` }, a.nome),
        ...STONE_TXT[a.id].map(p => h('p', {}, p)),
        h('p', {}, h('button', { class: 'btn', type: 'button', onclick: () => hooks.takeStone(a.id) }, `Prendi la pietra ${a.pietra}`))] });
  });
  // l'arco di luce sul lago: oltre l'arco, una spiaggia bianca sotto due soli
  const archG = new THREE.Group(); archG.position.set(GX, 0, CZ - 6); gG.add(archG);
  const archRing = mesh(new THREE.TorusGeometry(2.2, 0.12, 8, 40, Math.PI), glow(0xfff4d8), 0, 0, 0, archG);
  const portalTex = canvasTex(256, 256, (g, w, hh) => {
    const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#6a4a9a'); gr.addColorStop(0.55, '#f3c47a'); gr.addColorStop(0.7, '#fff6e0'); gr.addColorStop(1, '#f4ecd8'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(90, 120, 16, 0, 7); g.fill(); g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(160, 108, 20, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)'; [[50, 70, 30], [190, 60, 24], [130, 50, 18]].forEach(([x, y, r]) => { g.fillRect(x - r, y, r * 2, 8); g.beginPath(); g.moveTo(x - r, y + 8); g.lineTo(x, y + 26); g.lineTo(x + r, y + 8); g.fill(); });
  });
  const portal = mesh(new THREE.CircleGeometry(2.1, 32, 0, Math.PI), new THREE.MeshBasicMaterial({ map: portalTex, transparent: true, opacity: 0, side: THREE.DoubleSide }), 0, 0, 0, archG);
  const archHalo = halo(0xfff0c8, 6, 0, 1.2, 0, archG, 0);
  archRing.visible = false;
  let archOpen = false;
  animated.push(t => { if (!gG.visible) return; const target = archOpen ? 1 : 0; portal.material.opacity += (target * 0.95 - portal.material.opacity) * 0.05; archHalo.material.opacity = portal.material.opacity * (0.45 + Math.sin(t * 2.4) * 0.15); archRing.visible = portal.material.opacity > 0.05; });
  add({ id: 'arco', name: "L'arco di luce", pos: [GX, 1, CZ - 6], radius: 2.4, markerY: 2.8, desc: 'Il passaggio verso Luminos.',
    use: () => { if (archOpen) hooks.travel('luminos'); else hooks.toast('L\'acqua è ferma. Prima prendi una delle quattro pietre.'); } });
  // la barca all'approdo, per tornare a Marechiaro
  boat(GX + 4.5, 23.6, 0xe8e4da, -0.6, gG, true);
  add({ id: 'barca-ritorno', name: 'La barca', pos: [GX + 3.6, 0.5, 21.6], radius: 2, markerY: 1.5, desc: 'Torna a Marechiaro.',
    open: () => [h('h2', {}, 'La barca'), h('p', {}, 'Legata a uno sperone di roccia, dove l\'acqua all\'ingresso è bassa.'), h('p', {}, h('button', { class: 'btn', type: 'button', onclick: () => hooks.travel('marechiaro') }, 'Torna a Marechiaro'))] });

  // =====================================================================
  // L · LUMINOS
  // =====================================================================
  const LX = 400;
  const hemiL = new THREE.HemisphereLight(0xffe8f0, 0x8a7aa8, 1.4); gL.add(hemiL);
  const sunL = new THREE.DirectionalLight(0xffe2b0, 1.4); sunL.position.set(LX + 40, 30, 120); gL.add(sunL);
  // cielo: dal viola al dorato; i due soli; isole di pietra bianca sospese; nubi sotto, dove dovrebbe esserci il mare
  const skyLGeo = new THREE.SphereGeometry(300, 32, 16), skyLCol = new Float32Array(skyLGeo.attributes.position.count * 3);
  skyLGeo.setAttribute('color', new THREE.BufferAttribute(skyLCol, 3));
  const skyL = mesh(skyLGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }), LX + 40, 0, 0, gL); skyL.renderOrder = -1;
  const SKYD = { top: new THREE.Color(0x5a3a8a), mid: new THREE.Color(0xc68ab8), hor: new THREE.Color(0xf7cf86), low: new THREE.Color(0xe8d0e8) };
  const SKYN = { top: new THREE.Color(0x0b1240), mid: new THREE.Color(0x14205a), hor: new THREE.Color(0x24306e), low: new THREE.Color(0x1a2050) };
  const _c = new THREE.Color(), _a = new THREE.Color(), _b = new THREE.Color();
  function paintSky(k, east) {
    const p = skyLGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 300, z = p.getZ(i) / 300;
      const pick = (S) => y > 0.3 ? _a.copy(S.mid).lerp(S.top, Math.min(1, (y - 0.3) / 0.6)) : y > 0 ? _a.copy(S.hor).lerp(S.mid, y / 0.3) : _a.copy(S.hor).lerp(S.low, Math.min(1, -y * 4));
      pick(SKYN); _b.copy(_a); pick(SKYD); _c.copy(_b).lerp(_a, k);
      // la macchia nera, piccola, a est (dalla parte opposta a quella dove scendono i soli)
      if (z < -0.95 && y > 0.0 && y < 0.1 && Math.abs(p.getX(i) / 300) < 0.25) _c.lerp(_b.set(0x0a0812), Math.min(0.75, (-z - 0.95) * 14) * east);
      _c.toArray(skyLCol, i * 3);
    }
    skyLGeo.attributes.color.needsUpdate = true;
  }
  const sunA = mesh(new THREE.CircleGeometry(7, 24), glow(0xf2f6ff, { fog: false }), LX + 20, 30, 260, gL), sunB = mesh(new THREE.CircleGeometry(9, 24), glow(0xffcc66, { fog: false }), LX + 60, 24, 255, gL);
  sunA.lookAt(LX, 0, 0); sunB.lookAt(LX, 0, 0);
  const sunHA = halo(0xe8eeff, 46, LX + 20, 30, 258, gL, 0.6), sunHB = halo(0xffc870, 56, LX + 60, 24, 253, gL, 0.6); sunHA.material.fog = sunHB.material.fog = false;
  // stelle e lampare (di notte): le lampare sono luci calde e immobili, basse sull'orizzonte
  const starG = new THREE.BufferGeometry(), sp = []; for (let i = 0; i < 420; i++) { const a = rnd(0, 6.28), e = rnd(0.15, 1.4); sp.push(LX + 40 + Math.cos(a) * Math.cos(e) * 280, Math.sin(e) * 280, Math.sin(a) * Math.cos(e) * 280); }
  starG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starG, new THREE.PointsMaterial({ color: 0xffffff, size: 1.1, fog: false, transparent: true, opacity: 0 })); gL.add(stars);
  const lp = []; for (let i = 0; i < 140; i++) { const a = rnd(-1.0, 1.0) + Math.PI / 2, r = rnd(220, 270); lp.push(LX + 40 + Math.cos(a) * r, rnd(-6, 8), Math.sin(a) * r); }
  const lampG = new THREE.BufferGeometry(); lampG.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  const lampare = new THREE.Points(lampG, new THREE.PointsMaterial({ map: haloTex, color: new THREE.Color(0xffd27a).multiplyScalar(4), size: 4.5, fog: false, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); gL.add(lampare);
  // isole sospese di pietra bianca, legate da ponti di luce (lontane, decorative)
  const islandMat = lam(0xf2eee6), islandUnder = lam(0xd8cfc0), bridgeMat = glow(0xfff1c8, { transparent: true, opacity: 0.55 });
  const floating = [];
  function floatIsland(x, y, z, r, parent = gL) {
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
    mesh(new THREE.CylinderGeometry(r, r * 0.9, r * 0.25, 9), islandMat, 0, 0, 0, g);
    const u = mesh(new THREE.ConeGeometry(r * 0.9, r * 1.6, 9), islandUnder, 0, -r * 0.9, 0, g); u.rotation.x = Math.PI;
    floating.push({ g, y, s: rnd(0, 6) }); return g;
  }
  const farIsl = [];
  for (let i = 0; i < 16; i++) { const a = srnd(0, Math.PI * 2), r = srnd(70, 160), x = LX + 30 + Math.cos(a) * r, z = Math.sin(a) * r, y = srnd(-10, 30); farIsl.push(floatIsland(x, y, z, srnd(3, 9)).position); }
  for (let i = 0; i < farIsl.length - 1; i += 2) { const a = farIsl[i], b = farIsl[i + 1], d = a.distanceTo(b); if (d > 70) continue; const br = mesh(new THREE.BoxGeometry(0.6, 0.15, d), bridgeMat, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, gL); br.lookAt(b); }
  animated.push(t => { if (!gL.visible) return; for (const f of floating) f.g.position.y = f.y + Math.sin(t * 0.4 + f.s) * 0.6; });
  // mare di nubi, sotto
  mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf0d8e8, fog: true }), LX, -40, 0, gL);
  for (let i = 0; i < 40; i++) { const c = mesh(new THREE.IcosahedronGeometry(srnd(6, 14), 0), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), LX + srnd(-150, 200), -34 + srnd(-3, 4), srnd(-180, 180), gL); c.scale.y = 0.4; }

  // --- la spiaggia di sale: granelli che brillano di luce propria ---
  const saltTex = canvasTex(256, 256, (g, w, hh) => { g.fillStyle = '#f6f0e2'; g.fillRect(0, 0, w, hh); for (let i = 0; i < 1600; i++) { g.fillStyle = ['#fffaf0', '#efe6d2', '#fff4d8', '#e8e0cc'][i % 4]; g.fillRect(Math.random() * w, Math.random() * hh, 2, 2); } });
  saltTex.wrapS = saltTex.wrapT = THREE.RepeatWrapping; saltTex.repeat.set(6, 4);
  mesh(new THREE.CylinderGeometry(19, 15, 3, 14).scale(1, 1, 0.62), new THREE.MeshLambertMaterial({ map: saltTex, emissive: 0x4a4030 }), LX, -1.5, 2, gL);
  const under = mesh(new THREE.ConeGeometry(15, 24, 14).scale(1, 1, 0.62), islandUnder, LX, -15, 2, gL); under.rotation.x = Math.PI;
  {
    const sp2 = []; for (let i = 0; i < 700; i++) { const a = rnd(0, 6.28), r = Math.sqrt(Math.random()) * 18; sp2.push(LX + Math.cos(a) * r, 0.03, 2 + Math.sin(a) * r * 0.6); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp2, 3));
    const glints = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xfff6d8, size: 0.09, transparent: true })); gL.add(glints);
    animated.push(t => { if (gL.visible) glints.material.opacity = 0.5 + Math.sin(t * 3.1) * 0.3; });
  }
  edge(LX, 2, 18.2, 11.2, [0, -Math.PI / 2]); // varchi: il ponte di luce (est) e il ponte sospeso (sud)
  // la fila delle ceste vuote e le vecchie rocce con le rune, piantate nel sale
  for (let x = LX - 10; x <= LX + 10; x += 2.2) { mesh(new THREE.CylinderGeometry(0.32, 0.25, 0.45, 8), lam(0xb08a52), x, 0.22, -3.6, gL); solidR(x, -3.6, 0.35); }
  const runeRocks = [[LX - 12, 5], [LX - 7, 7.5], [LX + 6, 7.2], [LX + 11, 4.5], [LX - 13, -1], [LX + 12.5, -2.4]];
  runeRocks.forEach(([x, z], i) => {
    const r = mesh(new THREE.DodecahedronGeometry(0.75, 0), lam(0x9a948a), x, 0.4, z, gL); r.scale.y = 1.5; solidR(x, z, 0.7);
    const t = canvasTex(128, 128, (g) => { g.clearRect(0, 0, 128, 128); drawRune(g, ['vento', 'roccia', 'acqua', 'luce'][i % 4], 20, 20, 88, '#ffe6a8', 7); });
    const s = sign(0.55, 0.55, t, x, 0.7, z + (z > 2 ? -0.72 : 0.72), z > 2 ? Math.PI : 0, gL); s.material.blending = THREE.AdditiveBlending;
  });
  add({ id: 'rocce', name: 'Le rocce con le rune', pos: [LX - 7, 0.8, 6.8], radius: 2, markerY: 2.0, desc: 'Segnano fin dove arriva la marea di luce.',
    open: () => [h('h2', {}, 'Le rocce con le rune'), h('p', {}, 'Tra una cesta e l\'altra spuntano vecchie rocce piantate nel sale, segnate da rune. Segnano fin dove arriva ogni marea. Il sale le ha in parte consumate.')] });
  // le raccoglitrici del sale, e l'anziana
  npc('raccoglitrice', LX - 4, -1.6, Math.PI * 0.1, { parent: gL }); npc('raccoglitrice', LX + 3.5, -1.2, -Math.PI * 0.2, { parent: gL, lines: ['♪ «C\'era una riva sola e una sola marea: di là le reti, di qua le ceste, e a tutti buona marea.» ♪'] }); npc('raccoglitrice', LX + 8, -1.4, -Math.PI * 0.6, { parent: gL });
  solidR(LX - 4, -1.6, 0.4); solidR(LX + 3.5, -1.2, 0.4); solidR(LX + 8, -1.4, 0.4);
  npc('anziana', LX + 1, 5.6, Math.PI * 0.95, { parent: gL, lines: ['«Buona marea.»', '«Le chiamiamo maree di luce.»', '«Domani vado al mercato di Solaria, da mia figlia. Volevo portarle il sale buono.»'] }); solidR(LX + 1, 5.6, 0.45);
  add({ id: 'anziana', name: "L'anziana del sale", pos: [LX + 1, 1, 5.6], radius: 2.2, markerY: 2.6, desc: 'Raccoglie il sale a manciate, senza fretta.', secret: 'canzone',
    open: () => [h('h2', {}, "L'anziana del sale"), h('p', { class: 'quote' }, '«Buona marea.»'),
      h('p', {}, 'Ha le mani screpolate come quelle dei pescatori di Marechiaro. Spiega che due volte al giorno la luce aumenta, come da voi sale la marea. Poi si ritira, e dove è passata lascia il sale di luce: sulle terrazze, sui tetti, sui rami degli alberi.'),
      h('p', { class: 'quote' }, '«Le chiamiamo maree di luce.»'),
      h('p', { class: 'quote' }, '«Domani vado al mercato di Solaria, da mia figlia. Volevo portarle il sale buono.»'),
      h('p', {}, 'Poco più in là, le raccoglitrici cantano mentre riempiono le ceste, con le stesse parole che tornano a ogni giro:'),
      h('p', { class: 'quote' }, 'C\'era una riva sola e una sola marea: di là le reti, di qua le ceste, e a tutti buona marea.'),
      h('p', { class: 'muted' }, `La prossima marea di luce arriva tra ${Math.ceil(tideState().next / 60)} minuti. Restate sulla spiaggia per vederla.`)] });
  // l'arco di luce per tornare alla Grotta dei Sussurri
  const backArch = new THREE.Group(); backArch.position.set(LX - 14, 0, 2); backArch.rotation.y = Math.PI / 2; gL.add(backArch);
  mesh(new THREE.TorusGeometry(1.9, 0.1, 8, 36, Math.PI), glow(0xfff4d8, { k: 1.5 }), 0, 0, 0, backArch);
  const backPortal = mesh(new THREE.CircleGeometry(1.8, 30, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x7ab8e0, transparent: true, opacity: 0.55, side: THREE.DoubleSide }), 0, 0, 0, backArch);
  animated.push(t => { if (gL.visible) backPortal.material.opacity = 0.4 + Math.sin(t * 2) * 0.15; });
  add({ id: 'arco-ritorno', name: "L'arco di luce", pos: [LX - 13.6, 1, 2], radius: 2, markerY: 2.6, desc: 'Riporta alla Grotta dei Sussurri.',
    open: () => [h('h2', {}, "L'arco di luce"), h('p', {}, 'Il portale conosce una sola strada: quella che riporta alla Grotta dei Sussurri.'), h('p', {}, h('button', { class: 'btn', type: 'button', onclick: () => hooks.travel('grottaDaLuminos') }, 'Torna nella grotta'))] });

  // --- la marea di luce: ogni 4 minuti risale la spiaggia e lascia il sale ---
  const tideMat = new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const tide = mesh(new THREE.PlaneGeometry(6, 14), tideMat, LX - 18, 0.6, 2, gL); tide.rotation.y = Math.PI / 2;
  const tideFloor = mesh(new THREE.PlaneGeometry(1, 13).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe6a8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), LX - 18, 0.05, 2, gL);
  const NS = 400, saltP = new Float32Array(NS * 3);
  for (let i = 0; i < NS; i++) { saltP[i * 3] = LX + rnd(-15, 15); saltP[i * 3 + 1] = 0.06; saltP[i * 3 + 2] = 2 + rnd(-6.5, 6.5); }
  const newSalt = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(saltP, 3)), new THREE.PointsMaterial({ color: 0xffe08a, size: 0.14, transparent: true, opacity: 0 })); gL.add(newSalt);
  let lastTide = false, tideFront = LX - 18;
  animated.push((t, dt, ctx) => {
    const st = tideState();
    if (st.on) {
      const f = st.t / 9, front = LX - 18 + f * 34;
      tide.position.x = front; tideMat.opacity = Math.sin(f * Math.PI) * 0.55; tide.scale.y = 1 + Math.sin(f * Math.PI) * 0.4;
      tideFloor.position.x = (LX - 18 + front) / 2; tideFloor.scale.x = Math.max(0.01, front - (LX - 18)); tideFloor.material.opacity = Math.sin(f * Math.PI) * 0.35;
      tideFront = front; newSalt.material.opacity = 0.9;
      if (!lastTide) hooks.tide?.();
    } else { tideMat.opacity = 0; tideFloor.material.opacity = 0; newSalt.material.opacity = Math.max(0, 0.9 - (st.t - 9) / 60); }
    // il sale nuovo compare solo dove la marea è già passata
    newSalt.geometry.setDrawRange(0, st.on ? Math.floor(NS * Math.min(1, (tideFront - (LX - 18)) / 34)) : NS);
    lastTide = st.on;
  });

  // --- ponti di luce: sotto i passi si allarga una piccola onda di colore ---
  // I ponti «comparivano sotto i piedi solo quando servivano»: da lontano se ne intuisce appena la traccia,
  // vicino al giocatore le lastre di luce si accendono una dopo l'altra.
  const tileGeo = new THREE.BoxGeometry(1, 0.06, 0.78), tileMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const bridgeTiles = [], tileCol = new THREE.Color(), tileBase = new THREE.Color(0xfff0c8);
  const lightBridge = (x0, z0, x1, z1, w) => {
    const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz), ry = Math.atan2(dx, dz);
    const b = mesh(new THREE.BoxGeometry(w, 0.1, len), new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.16, depthWrite: false }), (x0 + x1) / 2, -0.06, (z0 + z1) / 2, gL); b.rotation.y = ry; b.userData.noShadow = true;
    for (const s of [-1, 1]) { const r = mesh(new THREE.BoxGeometry(0.05, 0.05, len), glow(0xfff6dc, { k: 1.6 }), (x0 + x1) / 2 + Math.cos(ry) * s * w / 2, 0.7, (z0 + z1) / 2 - Math.sin(ry) * s * w / 2, gL); r.rotation.y = ry; }
    const n = Math.ceil(len / 0.82), im = new THREE.InstancedMesh(tileGeo, tileMat, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), sc = new THREE.Vector3(w * 0.96, 1, 1), pos = [];
    for (let i = 0; i < n; i++) { const k = (i + 0.5) / n, p = new THREE.Vector3(x0 + dx * k, 0.0, z0 + dz * k); pos.push(p); im.setMatrixAt(i, m4.compose(p, q, sc)); im.setColorAt(i, tileCol.setScalar(0)); }
    im.frustumCulled = false; gL.add(im); bridgeTiles.push({ im, pos, lv: new Float32Array(n) });
    return b;
  };
  animated.push((t, dt, ctx) => {
    if (!gL.visible || !ctx?.me) return;
    for (const B of bridgeTiles) {
      for (let i = 0; i < B.pos.length; i++) {
        const d = Math.hypot(B.pos[i].x - ctx.me.x, B.pos[i].z - ctx.me.z), want = d < 4.5 ? 1 : d < 7 ? (7 - d) / 2.5 : 0;
        B.lv[i] += (want - B.lv[i]) * Math.min(1, dt * (want > B.lv[i] ? 9 : 2.5));
        const shimmer = 0.85 + Math.sin(t * 3 + i * 0.7) * 0.15;
        B.im.setColorAt(i, tileCol.copy(tileBase).multiplyScalar(B.lv[i] * 0.75 * shimmer));
      }
      B.im.instanceColor.needsUpdate = true;
    }
  });
  lightBridge(LX + 13.5, 2, LX + 28.5, 2, 2);
  lightBridge(LX + 39, -7.5, LX + 39, -22, 2);
  lightBridge(LX + 39, 12.4, LX + 39, 20.2, 2);
  const rings = [];
  const ringGeo = new THREE.RingGeometry(0.25, 0.34, 24).rotateX(-Math.PI / 2);
  function footRing(x, z, color) {
    let r = rings.find(o => o.t <= 0);
    if (!r) { if (rings.length > 24) return; r = { m: new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })), t: 0 }; scene.add(r.m); rings.push(r); }
    r.m.material.color.set(color); r.m.position.set(x, 0.07, z); r.t = 1.1; r.m.visible = true;
  }
  animated.push((t, dt) => { for (const r of rings) { if (r.t <= 0) continue; r.t -= dt; const k = 1 - r.t / 1.1; r.m.scale.setScalar(1 + k * 4); r.m.material.opacity = (1 - k) * 0.8; if (r.t <= 0) r.m.visible = false; } });

  // --- i Giardini Sospesi: terrazze di cristallo a diverse altezze ---
  const GXL = LX + 39, GZ = 2.2;
  const crystalTex = canvasTex(256, 256, (g, w, hh) => { g.fillStyle = '#dcd4f0'; g.fillRect(0, 0, w, hh); for (let i = 0; i < 6; i++) for (let k = 0; k < 6; k++) { g.fillStyle = ['#e6e0f6', '#d2c8ec', '#ece6fa', '#cfc4e8'][(i + k * 2) % 4]; g.fillRect(i * 43 + 1, k * 43 + 1, 41, 41); } });
  crystalTex.wrapS = crystalTex.wrapT = THREE.RepeatWrapping; crystalTex.repeat.set(3, 3);
  const terraceMat = new THREE.MeshLambertMaterial({ map: crystalTex, emissive: 0x3a3060 });
  mesh(new THREE.CylinderGeometry(12.5, 11, 1.2, 12).scale(1, 1, 0.9), terraceMat, GXL, -0.6, GZ, gL);
  mesh(new THREE.ConeGeometry(11, 18, 12).scale(1, 1, 0.9), islandUnder, GXL, -10, GZ, gL).rotation.x = Math.PI;
  const terraces = [];
  for (const [dx, y, dz, r] of [[-15, 3.5, -8, 4], [14, 5, -6, 3.5], [-13, -2.5, 12, 3.2], [15, 2, 13, 4.2], [0, 9, -16, 3]]) {
    const g = new THREE.Group(); g.position.set(GXL + dx, y, GZ + dz); gL.add(g);
    mesh(new THREE.CylinderGeometry(r, r * 0.85, 0.5, 10), terraceMat, 0, 0, 0, g); mesh(new THREE.ConeGeometry(r * 0.8, r * 1.4, 10), islandUnder, 0, -r * 0.8, 0, g).rotation.x = Math.PI;
    for (let k = 0; k < 4; k++) { const a = k * 1.6; mesh(new THREE.OctahedronGeometry(0.15, 0), glow(0xbfe8ff), Math.cos(a) * r * 0.6, 0.35, Math.sin(a) * r * 0.6, g); }
    terraces.push({ g, y, s: rnd(0, 6) });
    // ponticello di luce verso la terrazza principale
    const from = new THREE.Vector3(GXL + dx * 0.68, 0, GZ + dz * 0.68), to = g.position.clone(); const d = from.distanceTo(to);
    const b = mesh(new THREE.BoxGeometry(0.7, 0.08, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0c8).multiplyScalar(1.7), transparent: true, opacity: 0.45 }), (from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2, gL); b.lookAt(to);
  }
  edge(GXL, GZ, 12.0, 10.9, [Math.PI, -Math.PI / 2, Math.PI / 2]);
  animated.push(t => { if (!gL.visible) return; for (const o of terraces) o.g.position.y = o.y + Math.sin(t * 0.5 + o.s) * 0.25; });
  // fiori luminosi
  { const fl = []; for (let i = 0; i < 70; i++) { const a = rnd(0, 6.28), r = rnd(3, 10.5); const x = GXL + Math.cos(a) * r, z = GZ + Math.sin(a) * r * 0.9; fl.push([x, z]); }
    const im = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.08, 0), glow(0xfff2c0), fl.length), m = new THREE.Matrix4(); fl.forEach(([x, z], i) => im.setMatrixAt(i, m.makeTranslation(x, 0.12, z))); gL.add(im); }
  // l'albero che cambia il colore delle foglie al ritmo di un respiro
  const treeX = GXL - 6, treeZ = GZ + 5;
  mesh(new THREE.CylinderGeometry(0.3, 0.5, 3, 7), lam(0xb8b0c8), treeX, 1.5, treeZ, gL); solidR(treeX, treeZ, 0.6);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x9fe0b8, flatShading: true, emissive: 0x204030 });
  for (const [dx, dy, dz, r] of [[0, 3.6, 0, 1.6], [0.9, 3.1, 0.4, 1.1], [-0.9, 3.2, -0.3, 1.2], [0, 4.4, 0.2, 1.0]]) mesh(new THREE.IcosahedronGeometry(r, 0), leafMat, treeX + dx, dy, treeZ + dz, gL);
  animated.push(t => { if (!gL.visible) return; const b = (Math.sin(t * 0.9) + 1) / 2; leafMat.color.setHSL(0.35 + b * 0.45, 0.55, 0.62); leafMat.emissive.setHSL(0.35 + b * 0.45, 0.5, 0.14); });
  add({ id: 's-albero', name: "L'albero", pos: [treeX, 1.2, treeZ], radius: 2.2, secret: 'albero', markerY: 5.4, desc: "Cambia colore al ritmo di un respiro.",
    open: () => [h('h2', {}, 'I Giardini Sospesi'), h('p', {}, 'Terrazze di cristallo che fluttuano a diverse altezze, collegate da ponti di luce. Questo albero cambia il colore delle foglie al ritmo di un respiro.'), h('p', {}, 'Giulia è rimasta ferma a guardarlo a lungo, e lo ha descritto sul taccuino nuovo che le ha regalato la Regina.')] });
  // gli uccelli con la coda lunga come quella degli aquiloni
  const kites = [];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group(); gL.add(g);
    mesh(gullGeo, new THREE.MeshBasicMaterial({ color: [0xff9ab8, 0x9ad8ff, 0xffe08a, 0xb8f0a8][i % 4], side: THREE.DoubleSide }), 0, 0, 0, g);
    for (let k = 1; k <= 5; k++) { const tl = mesh(new THREE.PlaneGeometry(0.12, 0.12), new THREE.MeshBasicMaterial({ color: [0xff6a8a, 0x5ab8ff, 0xffc84a, 0x7ad868][i % 4], side: THREE.DoubleSide }), 0, -k * 0.05, k * 0.32, g); tl.rotation.z = Math.PI / 4; }
    kites.push({ g, r: rnd(3, 7), s: rnd(0, 6), y: rnd(3.5, 6), v: rnd(0.25, 0.45) });
  }
  animated.push(t => { if (!gL.visible) return; for (const o of kites) { const a = t * o.v + o.s; o.g.position.set(GXL + 3 + Math.cos(a) * o.r, o.y + Math.sin(t * 1.4 + o.s) * 0.5, GZ + 3 + Math.sin(a) * o.r); o.g.rotation.y = -a; o.g.children[0].scale.y = 1 + Math.sin(t * 7 + o.s) * 0.6; } });
  add({ id: 's-aquiloni', name: 'Uccelli dalla coda lunga', pos: [GXL + 3, 0.8, GZ + 3], radius: 1.5, hidden: true, secret: 'aquiloni', proximity: 2.2, markerY: 2.5, desc: 'Code lunghe come aquiloni.',
    use: () => hooks.toast('🪁 Uno stormo di uccelli con la coda lunga come quella degli aquiloni. A Luca si sono posati sulle spalle e sulle braccia, senza che lui dicesse una parola.') });
  // i cerchi dei primi Guardiani: incisi nel cristallo, quasi cancellati, con quattro incavi come i punti di una bussola
  function circle(x, z, parent) {
    const t = canvasTex(256, 256, (g) => { g.clearRect(0, 0, 256, 256); g.strokeStyle = 'rgba(120,100,170,.55)'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 100, 0, 7); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 80, 0, 7); g.stroke(); g.fillStyle = 'rgba(90,70,140,.6)'; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; g.beginPath(); g.arc(128 + Math.cos(a) * 90, 128 + Math.sin(a) * 90, 13, 0, 7); g.fill(); } });
    const m = mesh(new THREE.PlaneGeometry(1.8, 1.8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }), x, 0.03, z, parent); return m;
  }
  const circleTxt = () => [h('h2', {}, 'Un cerchio dei primi Guardiani'), h('p', {}, 'Un cerchio inciso, quasi cancellato, con quattro piccoli incavi disposti come i punti di una bussola.'),
    h('p', { class: 'quote' }, '«Sono i cerchi dei primi Guardiani. Ce ne sono in tutto il palazzo. Proteggono chi li sa usare.»'), h('p', { class: 'muted' }, 'Giulia li cerca e li copia sul taccuino, uno per uno.')];
  circle(GXL + 6.5, GZ + 7.5, gL); add({ id: 's-cerchio1', name: 'Un cerchio inciso', pos: [GXL + 6.5, 0.1, GZ + 7.5], radius: 1.6, hidden: true, secret: 'cerchio-1', markerY: 0.9, desc: 'Quattro incavi.', open: circleTxt });
  circle(LX + 39, -21, gL); add({ id: 's-cerchio2', name: 'Un cerchio inciso', pos: [LX + 39, 0.1, -21], radius: 1.4, hidden: true, secret: 'cerchio-2', markerY: 0.9, desc: 'Quattro incavi.', open: circleTxt });
  circle(LX + 12, 6.8, gL); add({ id: 's-cerchio3', name: 'Un cerchio inciso', pos: [LX + 12, 0.1, 6.8], radius: 1.5, hidden: true, secret: 'cerchio-3', markerY: 0.9, desc: 'Quattro incavi.', open: circleTxt });

  // farfalle tra i fiori dei Giardini
  { const wingG = new THREE.PlaneGeometry(0.16, 0.12).translate(0.08, 0, 0), bf = [];
    const cols = [0xffd84a, 0x8ad8ff, 0xff9ac8, 0xffffff, 0xb8f08a];
    for (let i = 0; i < 16; i++) { const g = new THREE.Group(); gL.add(g); const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(cols[i % 5]).multiplyScalar(1.15), side: THREE.DoubleSide });
      const L = mesh(wingG, m, 0, 0, 0, g), R = mesh(wingG, m, 0, 0, 0, g); R.scale.x = -1;
      bf.push({ g, L, R, cx: GXL + srnd(-9, 9), cz: GZ + srnd(-8, 8), r: srnd(0.6, 2.2), s: srnd(0, 6), v: srnd(0.4, 0.9), y: srnd(0.5, 1.8) }); }
    animated.push(t => { if (!gL.visible) return; for (const b of bf) { const a = t * b.v + b.s; b.g.position.set(b.cx + Math.cos(a) * b.r + Math.sin(a * 2.3) * 0.3, b.y + Math.sin(a * 3.1) * 0.25, b.cz + Math.sin(a) * b.r); b.g.rotation.y = -a; const f = Math.sin(t * 16 + b.s) * 1.1; b.L.rotation.y = f; b.R.rotation.y = -f; } }); }
  // il sale di luce resta «sulle terrazze, sui tetti, sui rami degli alberi»: si riaccende a ogni marea e poi si spegne piano
  { const sp = [];
    for (let i = 0; i < 160; i++) { const a = rnd(0, 6.28), r = rnd(0.4, 3.2); sp.push(treeX + Math.cos(a) * r, rnd(2.6, 5.4), treeZ + Math.sin(a) * r); }
    for (let i = 0; i < 260; i++) { const a = rnd(0, 6.28), r = rnd(10.6, 12.2); sp.push(GXL + Math.cos(a) * r, 0.05, GZ + Math.sin(a) * r * 0.9); }
    const saltLeft = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)), new THREE.PointsMaterial({ map: haloTex, color: new THREE.Color(0xffe6a0).multiplyScalar(3.2), size: 0.22, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    gL.add(saltLeft);
    animated.push(t => { if (!gL.visible) return; const st = tideState(), since = st.on ? 0 : st.t - 9; saltLeft.material.opacity = st.on ? Math.min(1, st.t / 4) : Math.max(0.15, 1 - since / 120) * (0.85 + Math.sin(t * 2.2) * 0.15); }); }
  // --- il palazzo di sale e la sua porta altissima ---
  const PX = LX + 51.5;
  const saltWhite = new THREE.MeshLambertMaterial({ color: 0xf8f4ec, emissive: 0x3a3020, flatShading: true });
  mesh(new THREE.BoxGeometry(6, 14, 22), saltWhite, PX + 2.5, 6, GZ, gL);
  for (const [dz, hh, r] of [[-9, 22, 1.8], [9, 20, 1.6], [-4, 27, 1.4], [5, 30, 1.7], [0, 34, 1.2]]) { mesh(new THREE.CylinderGeometry(r, r * 1.2, hh, 8), saltWhite, PX + 5 + Math.abs(dz) * 0.2, hh / 2 - 1, GZ + dz, gL); mesh(new THREE.ConeGeometry(r * 1.3, r * 3, 8), saltWhite, PX + 5 + Math.abs(dz) * 0.2, hh + r * 1.5 - 1, GZ + dz, gL); }
  const doorTex = canvasTex(256, 512, (g, w, hh) => {
    g.fillStyle = '#e8e0d0'; g.fillRect(0, 0, w, hh); g.strokeStyle = '#8a7a62'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, hh - 12); g.beginPath(); g.moveTo(w / 2, 10); g.lineTo(w / 2, hh - 10); g.stroke();
    g.lineWidth = 3; g.strokeStyle = '#7a6a52';
    // barche e onde in alto
    for (const x of [64, 192]) { g.beginPath(); g.moveTo(x - 40, 120); g.lineTo(x + 40, 120); g.lineTo(x + 28, 140); g.lineTo(x - 28, 140); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(x, 120); g.lineTo(x, 62); g.lineTo(x + 30, 112); g.closePath(); g.stroke(); }
    for (let y = 160; y < 180; y += 10) { g.beginPath(); for (let x = 10; x < w - 10; x += 20) g.quadraticCurveTo(x + 5, y - 6, x + 10, y); g.stroke(); }
    // reti gettate in mare
    g.beginPath(); for (let i = 0; i < 7; i++) { g.moveTo(30 + i * 12, 200); g.lineTo(90 + i * 6, 290); } for (let k = 0; k < 6; k++) { g.moveTo(30 + k * 6, 200 + k * 15); g.lineTo(120 - k * 4, 200 + k * 15); } g.stroke();
    // figure con grandi ceste
    for (const x of [70, 186]) { g.beginPath(); g.arc(x, 330, 12, 0, 7); g.stroke(); g.beginPath(); g.moveTo(x, 342); g.lineTo(x, 400); g.moveTo(x - 20, 360); g.lineTo(x + 20, 360); g.moveTo(x, 400); g.lineTo(x - 14, 440); g.moveTo(x, 400); g.lineTo(x + 14, 440); g.stroke(); g.beginPath(); g.ellipse(x + 30, 372, 18, 12, 0, 0, 7); g.stroke(); }
    // conchiglie in basso
    for (const x of [64, 128, 192]) { g.beginPath(); g.arc(x, 480, 16, Math.PI, 0); g.stroke(); for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x, 480); g.lineTo(x + k * 7, 466); g.stroke(); } }
  });
  const door = sign(4, 8, doorTex, PX - 0.52, 4, GZ, -Math.PI / 2, gL);
  mesh(new THREE.TorusGeometry(2.3, 0.25, 6, 20, Math.PI), saltWhite, PX - 0.5, 8, GZ, gL).rotation.y = Math.PI / 2;
  halo(0xfff2c8, 3, PX - 0.7, 8.6, GZ, gL, 0.6);
  solid(PX, GZ, 1.2, 8);
  add({ id: 'porta', name: 'La porta del palazzo', pos: [PX - 1.4, 1.4, GZ], radius: 2.8, markerY: 4.4, desc: 'Incisa con barche, reti e ceste.',
    open: () => [h('h2', {}, 'La porta del palazzo'),
      h('p', {}, 'Una porta altissima. Sulla superficie sono incise barche, reti gettate in mare, uomini e donne che raccolgono qualcosa con grandi ceste.'),
      h('p', {}, 'Oltre questa porta c\'è la Regina Alithea. Dal soffitto della sala pendono migliaia di cristalli di sale, e la luce che danno è morbida come quella delle candele.'),
      h('p', { class: 'quote' }, '«Siate voi stessi. Il resto lo vedrà da sola.»'),
      h('p', { class: 'muted' }, 'Il palazzo, per ora, resta chiuso.')] });

  // --- il Giardino dell'Equilibrio: un'arena a cielo aperto, divisa in quattro ---
  const AX = LX + 39, AZ = -30;
  mesh(new THREE.CylinderGeometry(15, 12, 1.4, 20), lam(0xf0ece4), AX, -0.7, AZ, gL);
  mesh(new THREE.ConeGeometry(12, 20, 16), islandUnder, AX, -11, AZ, gL).rotation.x = Math.PI;
  edge(AX, AZ, 10.2, 10.2, [Math.PI / 2]);
  for (let k = 0; k < 4; k++) { const r0 = 10.6 + k * 1.1; const ring = mesh(new THREE.CylinderGeometry(r0 + 1.1, r0 + 1.1, 0.5 + k * 0.55, 32, 1, true, Math.PI * 0.06, Math.PI * 1.88), new THREE.MeshLambertMaterial({ color: 0xf6f2ea, side: THREE.DoubleSide, flatShading: true }), AX, (0.5 + k * 0.55) / 2, AZ, gL); }
  for (let k = 0; k < 4; k++) mesh(new THREE.RingGeometry(10.6 + k * 1.1, 11.7 + k * 1.1, 32, 1, Math.PI * 1.56, Math.PI * 1.88).rotateX(-Math.PI / 2), lam(0xeae4d8), AX, 0.5 + k * 0.55, AZ, gL);
  // i quattro settori
  const sectors = [
    { id: 'acqua', dx: 3.5, dz: -4, col: 0x5aa8e8, txt: 'una coperta d\'acqua' },
    { id: 'terra', dx: -3.5, dz: -4, col: 0x8a6a4a, txt: 'una di terra e rocce' },
    { id: 'piante', dx: -3.5, dz: 4, col: 0x4a9a5a, txt: 'una di piante rigogliose' },
    { id: 'sale', dx: 3.5, dz: 4, col: 0xf6f0e2, txt: 'e l\'ultima di sale, come la spiaggia dove erano arrivati' },
  ];
  const waterSec = mesh(new THREE.PlaneGeometry(6.6, 7.6).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x5aa8e8, emissive: 0x1a4a7a, transparent: true, opacity: 0.9 }), AX + 3.5, 0.03, AZ - 4, gL);
  mesh(new THREE.PlaneGeometry(6.6, 7.6).rotateX(-Math.PI / 2), lam(0x8a6a4a), AX - 3.5, 0.03, AZ - 4, gL);
  mesh(new THREE.PlaneGeometry(6.6, 7.6).rotateX(-Math.PI / 2), lam(0x3f8a4a), AX - 3.5, 0.03, AZ + 4, gL);
  mesh(new THREE.PlaneGeometry(6.6, 7.6).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: saltTex, emissive: 0x4a4030 }), AX + 3.5, 0.03, AZ + 4, gL);
  for (const [x, z] of [[-5.5, -6.5], [-2, -6], [-5, -2.2]]) { mesh(new THREE.DodecahedronGeometry(0.7, 0), lam(0x7a6450), AX + x, 0.5, AZ + z, gL); solidR(AX + x, AZ + z, 0.7); }
  for (let i = 0; i < 26; i++) { const x = AX - rnd(0.8, 6.3), z = AZ + rnd(0.8, 7.3); const b = mesh(new THREE.IcosahedronGeometry(rnd(0.25, 0.55), 0), lam(0x5ab868), x, 0.25, z, gL); b.scale.y = 0.8; }
  animated.push(t => { if (gL.visible) waterSec.material.emissive.setHSL(0.58, 0.6, 0.18 + Math.sin(t * 1.8) * 0.05); });
  add({ id: 'arena', name: "Il Giardino dell'Equilibrio", pos: [AX, 1, AZ + 8.5], radius: 2.4, markerY: 2.4, desc: 'Qui i Guardiani imparano a usare i loro doni.',
    open: () => [h('h2', {}, "Il Giardino dell'Equilibrio"),
      h('p', {}, 'Del giardino ha solo il nome: è un\'immensa arena circolare a cielo aperto, circondata da gradinate di pietra bianca. Il terreno al centro è diviso in quattro parti, una per ciascuno dei Guardiani: una coperta d\'acqua, una di terra e rocce, una di piante rigogliose, e l\'ultima di sale.'),
      h('p', { class: 'quote' }, '«Perché si chiama Giardino dell\'Equilibrio», chiese Luca, «se non c\'è nemmeno un fiore?»'),
      h('p', {}, 'Qui Aldor insegna ai Guardiani a usare i loro doni: il Flusso, la Natura, la Memoria, la Luce. Le pietre fanno solo metà del lavoro. L\'altra metà la fanno loro.')] });

  // --- il belvedere dei quattro cammini: i luoghi del viaggio, ancora chiusi ---
  const BX = LX + 39, BZ = 23;
  mesh(new THREE.CylinderGeometry(8, 6, 1, 12).scale(1, 1, 0.5), terraceMat, BX, -0.5, BZ, gL);
  mesh(new THREE.ConeGeometry(6, 10, 12).scale(1, 1, 0.5), islandUnder, BX, -6, BZ, gL).rotation.x = Math.PI;
  edge(BX, BZ, 7.4, 3.6, [-Math.PI / 2]);
  const CAMMINI = [
    { id: 'selva', nome: 'La Selva di Maestrale', dir: -0.75, dist: 110, col: 0xb8d8c8 },
    { id: 'monte', nome: 'Il Monte Zavorra', dir: -0.25, dist: 135, col: 0x2a2630 },
    { id: 'risacca', nome: 'La Risacca', dir: 0.25, dist: 125, col: 0x9fd8ff },
    { id: 'solaria', nome: 'Solaria, la Città di Luce', dir: 0.75, dist: 150, col: 0xffe0a0 },
  ];
  CAMMINI.forEach((c, i) => {
    const ex = BX + Math.sin(c.dir) * 3.5, ez = BZ + 3 + Math.cos(c.dir) * 0.6, tx = BX + Math.sin(c.dir) * c.dist, tz = BZ + Math.cos(c.dir) * c.dist;
    // un tratto di ponte di luce che si interrompe, e un cancello di luce chiuso
    const len = 5, mx = ex + Math.sin(c.dir) * len / 2, mz = ez + Math.cos(c.dir) * len / 2;
    const b = mesh(new THREE.BoxGeometry(1.4, 0.08, len), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0c8).multiplyScalar(1.7), transparent: true, opacity: 0.35 }), mx, -0.05, mz, gL); b.rotation.y = c.dir;
    const gx = ex + Math.sin(c.dir) * 1.2, gz = ez + Math.cos(c.dir) * 1.2;
    const gate = mesh(new THREE.TorusGeometry(1.1, 0.06, 6, 24, Math.PI), glow(0xfff4d8), gx, 0, gz, gL); gate.rotation.y = c.dir;
    const veil = mesh(new THREE.CircleGeometry(1.05, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.35, side: THREE.DoubleSide }), gx, 0, gz, gL); veil.rotation.y = c.dir;
    const t = canvasTex(400, 160, () => {});
    const s = sign(1.6, 0.64, t, gx - Math.sin(c.dir) * 0.15, 1.75, gz - Math.cos(c.dir) * 0.15, c.dir + Math.PI, gL);
    c.draw = () => { const { g } = t.userData, a = apertura(c.id); g.clearRect(0, 0, 400, 160); g.fillStyle = 'rgba(30,24,60,.88)'; g.beginPath(); g.roundRect(0, 0, 400, 160, 18); g.fill(); g.textAlign = 'center'; g.fillStyle = '#f5c56b'; g.font = 'bold 30px Georgia'; g.fillText(c.nome, 200, 62); g.fillStyle = '#efeaf8'; g.font = '24px Georgia'; g.fillText(a.testo, 200, 112); t.needsUpdate = true; };
    c.draw();
    solidR(gx, gz, 0.9);
    add({ id: 'cammino-' + c.id, name: c.nome, pos: [gx - Math.sin(c.dir) * 0.6, 1, gz - Math.cos(c.dir) * 0.6], radius: 1.9, markerY: 2.5, desc: 'Uno dei quattro cammini, ancora chiuso.',
      open: () => apertura(c.id).aperto
        ? [h('h2', {}, 'I quattro cammini'), h('h3', {}, c.nome), h('p', {}, 'Il ponte di luce si allunga oltre il cancello. Il cammino è aperto.'),
          h('p', {}, h('button', { class: 'btn', type: 'button', onclick: () => hooks.travel('cammino-' + c.id) }, 'Attraversa il cammino'))]
        : [h('h2', {}, 'I quattro cammini'), h('h3', {}, c.nome),
        h('p', {}, 'Laggiù, lontano, oltre il ponte di luce che si interrompe. Il cammino è ancora chiuso.'), h('p', { style: 'color:#f5c56b' }, apertura(c.id).lungo),
        h('p', { class: 'muted' }, 'I quattro cammini si aprono uno alla volta. Che cosa c\'è laggiù lo scoprirai camminandoci, o leggendo.')] });
    c.veil = veil;
    // il luogo, lontano, sopra il mare di nubi
    const g = new THREE.Group(); g.position.set(tx, 4 + i * 3, tz); gL.add(g);
    mesh(new THREE.CylinderGeometry(14, 12, 3, 12), islandMat, 0, 0, 0, g); mesh(new THREE.ConeGeometry(12, 22, 12), islandUnder, 0, -12, 0, g).rotation.x = Math.PI;
    if (c.id === 'selva') for (let k = 0; k < 12; k++) { const a = k * 0.55, r = 3 + (k % 4) * 2.4; mesh(new THREE.CylinderGeometry(0.7, 1.1, 22, 7), lam(0xb8b0a0), Math.cos(a) * r, 11, Math.sin(a) * r, g); mesh(new THREE.IcosahedronGeometry(5, 0), lam(0xc8e0d8), Math.cos(a) * r, 24, Math.sin(a) * r, g); }
    if (c.id === 'monte') { mesh(new THREE.ConeGeometry(11, 30, 7), lam(0x2a2630), 0, 16, 0, g); for (let k = 0; k < 6; k++) { const v = mesh(new THREE.BoxGeometry(0.3, 18, 0.3), glow(0xd8b04a, { k: 1 }), Math.cos(k) * 4, 12, Math.sin(k) * 4, g); v.rotation.z = Math.cos(k * 2) * 0.4; } }
    if (c.id === 'risacca') { for (let k = 0; k < 5; k++) { const f = mesh(new THREE.PlaneGeometry(2.5, 16), new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }), -6 + k * 3, 6 + (k % 2) * 4, 0, g); f.rotation.z = (k - 2) * 0.35; } }
    if (c.id === 'solaria') { for (let k = 0; k < 9; k++) { const a = k * 0.7, r = 2 + (k % 3) * 3.5, hh = 10 + (k % 4) * 6; mesh(new THREE.CylinderGeometry(0.9, 1.3, hh, 8), saltWhite, Math.cos(a) * r, hh / 2, Math.sin(a) * r, g); mesh(new THREE.ConeGeometry(1.4, 4, 8), lam(0xe8c070), Math.cos(a) * r, hh + 2, Math.sin(a) * r, g); }
      mesh(new THREE.CylinderGeometry(1.4, 1.8, 34, 10), saltWhite, 0, 17, 0, g); const beam = mesh(new THREE.ConeGeometry(4, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }), 0, 35, 0, g); beam.rotation.z = Math.PI / 2; beam.geometry.translate(0, -30, 0);
      const pivot = new THREE.Group(); pivot.position.set(0, 35, 0); g.add(pivot); beam.position.set(0, 0, 0); pivot.add(beam); halo(0xffe0a0, 14, 0, 35, 0, g, 0.7); animated.push(t => { if (gL.visible) pivot.rotation.y = t * 0.5; }); }
  });
  add({ id: 's-lampare', name: "L'orizzonte", pos: [BX, 0.6, BZ + 2.6], radius: 1.4, hidden: true, secret: 'lampare', markerY: 1.8, desc: 'Le lampare.',
    use: () => hooks.toast(night > 0.5 ? '🏮 Le lampare: luci calde, gialle, perfettamente immobili, basse sull\'orizzonte. «Il mare dall\'altra parte non dimentica niente. Trattiene la luce di ogni barca che l\'ha attraversato. E noi la vediamo da qui.»' : '🌅 Adesso c\'è la luce dei due soli. Torna qui quando tramontano: sull\'orizzonte compaiono altre luci.'), canDiscover: () => night > 0.5 });

  // --- giorno e notte di Luminos ---
  let night = 0, skyAcc = 99, lastK = -1;
  animated.push((t, dt) => {
    if (!gL.visible) return;
    const { k, p } = luminosDay(); night = 1 - k;
    skyAcc += dt; if (skyAcc > 0.5 || Math.abs(k - lastK) > 0.02) { skyAcc = 0; lastK = k; paintSky(k, 1); }
    hemiL.intensity = 0.55 + k * 0.9; sunL.intensity = 0.2 + k * 1.3;
    hemiL.color.setHSL(0.83, 0.6, 0.6 + k * 0.3);
    // i soli scendono uno dietro l'altro
    const set = p < 0.62 ? 0 : p < 0.75 ? (p - 0.62) / 0.13 : p < 0.92 ? 1 : 1 - (p - 0.92) / 0.08;
    sunA.position.y = 30 - set * 46; sunB.position.y = 24 - Math.min(1, set * 1.15) * 46; sunHA.position.y = sunA.position.y; sunHB.position.y = sunB.position.y;
    stars.material.opacity = night * 0.95; lampare.material.opacity = night;
  });
  // la luce di Luminos (di notte resta un blu profondo: a Luminos il buio vero non arriva mai)
  const FOG_L_DAY = new THREE.Color(0xe8c8d8), FOG_L_NIGHT = new THREE.Color(0x1e2a64), TIDE_GOLD = new THREE.Color(0xffd890);

  // ---------- pannelli condivisi ----------
  function countdown() {
    const u = data.uscita && /^\d{4}-\d{2}-\d{2}$/.test(data.uscita) ? new Date(data.uscita + 'T00:00:00') : null;
    if (!u) return { giorni: null, periodo: data.periodo };
    const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { giorni: Math.max(0, Math.round((u - today) / 86400000)), data: u.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) };
  }
  function apertura(id) {
    const d = data.aperture?.[id], u = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + 'T00:00:00') : null;
    if (!u) return { testo: 'si apre più avanti', lungo: 'Si apre più avanti.' };
    const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate()), g = Math.round((u - today) / 86400000);
    if (g <= 0) return { testo: 'aperto', lungo: 'Il cammino è aperto.', aperto: true };
    return { testo: `si apre tra ${g} ${g === 1 ? 'giorno' : 'giorni'}`, lungo: `Si apre il ${u.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}.` };
  }
  setInterval(() => CAMMINI.forEach(c => c.draw()), 3600000);
  function bookPanel() {
    const c = countdown();
    return [h('h2', {}, 'Il libro'), h('img', { src: data.copertina || 'img/copertina.jpg', alt: 'Copertina de «I quattro Guardiani e il regno perduto della Luce»', style: 'width:150px;float:right;margin:0 0 10px 14px;border-radius:4px' }),
      h('h3', {}, 'I quattro Guardiani e il regno perduto della Luce'),
      h('p', {}, 'Di Nicola Gobbini. Il primo volume della serie «I Quattro Guardiani», per ragazzi dai 9 ai 12 anni.'),
      h('p', { class: 'quote' }, 'Il mare ricorda ogni luce. Anche quelle che credevi spente.'),
      data.acquisto ? h('p', { style: 'color:#f5c56b;clear:both' }, 'L\'ebook è disponibile su Amazon (formato Kindle). La versione cartacea arriva presto.') : c.giorni != null ? h('div', { class: 'big', style: 'font-size:32px;clear:both' }, c.giorni === 0 ? 'Esce oggi!' : `${c.giorni} ${c.giorni === 1 ? 'giorno' : 'giorni'} all'uscita`) : h('p', { style: 'color:#f5c56b;clear:both' }, `Uscita: ${c.periodo || 'presto'}. La data esatta arriva qui appena c'è.`),
      h('p', {}, h('button', { class: 'btn', type: 'button', onclick: () => hooks.openPanel(signupPanel(), 'Avvisami quando esce') }, data.acquisto ? 'Avvisami quando esce il cartaceo' : 'Avvisami all\'uscita'))];
  }
  function signupPanel() {
    return [h('h2', {}, data.acquisto ? 'Avvisami quando esce il cartaceo' : 'Avvisami quando esce'),
      h('p', {}, data.acquisto ? 'L\'ebook è già disponibile. Lascia la tua email: ti scriviamo quando esce la versione cartacea. Nessuna pubblicità.' : 'Lascia la tua email e ricevi un messaggio il giorno in cui il libro esce. Niente altro.'),
      h('p', { class: 'muted' }, 'Il modulo è per adulti: genitori, insegnanti, bibliotecari e lettori grandi. Se hai meno di 14 anni, chiedi a un genitore di iscriversi per te.'),
      data.modulo ? h('p', {}, h('a', { class: 'btn', href: data.modulo, target: '_blank', rel: 'noopener' }, 'Apri il modulo di iscrizione')) : h('p', { style: 'color:#f5c56b' }, 'Il modulo arriva a breve.')];
  }

  // ---------- regioni ----------
  function setRegion(region, z) {
    gM.visible = region === 'M' || (region === 'G' && z > 12 && z < 60);
    gG.visible = region === 'G';
    gL.visible = region === 'L';
  }
  function fogFor(zona, z) {
    if (zona === 'marechiaro' || zona === 'scogli' || (zona === 'grotta' && z > 15.5)) return { c: 0xcfe4f4, near: 60, far: 320 };
    if (zona === 'grotta' || zona === 'lago' || zona === 'sala') return { c: 0x05070e, near: 5, far: zona === 'grotta' ? 22 : 42 };
    // durante la marea di luce il cielo di Luminos si scalda verso l'oro
    const st = tideState(), glowK = st.on ? Math.sin(st.t / 9 * Math.PI) : 0;
    return { c: FOG_L_NIGHT.clone().lerp(FOG_L_DAY, 1 - night).lerp(TIDE_GOLD, glowK * 0.6).getHex(), near: 45, far: 300 };
  }

  return {
    objects, solids, animated, areas: AREAS,
    spawn: { x: 0, z: 16.6, yaw: 0 },
    points: {
      grotta: { x: GX, z: 19.5, yaw: 0 }, luminos: { x: LX - 8, z: 2, yaw: -Math.PI / 2 }, grottaDaLuminos: { x: GX, z: CZ - 3.5, yaw: Math.PI }, marechiaro: { x: 2.4, z: 7, yaw: Math.PI },
    },
    marcoBoat, dolphins, stones, sea, CAMMINI, apertura,
    // attrezzi per costruire le attività e i nuovi luoghi negli altri moduli
    kit: { mesh, lam, glow, box, canvasTex, sign, halo, haloTex, add, npc, solid, solidR, edge, animated, gM, gG, gL, islandMat, islandUnder, saltWhite, LX, GX, CZ, GXL, GZ, BX, BZ, PX, AX, AZ },
    openArch() { archOpen = true; },
    get archOpen() { return archOpen; },
    footRing, setRegion, fogFor, bookPanel, signupPanel,
    get night() { return night; },
    groupOf(region) { return region === 'M' ? gM : region === 'G' ? gG : gL; },
    update(t, dt, ctx) { for (const f of animated) f(t, dt, ctx); },
  };
}
