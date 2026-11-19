// Personaggi low-poly: i quattro Guardiani su uno "scheletro" comune (corpo, testa, braccia e gambe con perno),
// così le animazioni (camminata, saluto, festa, risata, incontro, attesa) valgono per tutti.
// Guardano verso -Z, come la camera con yaw = 0.
import * as THREE from 'three';

const cache = new Map();
const G = (key, make) => cache.get(key) || (cache.set(key, make()), cache.get(key));
const box = (w, h, d) => G(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const ico = (r, d = 0) => G(`i${r},${d}`, () => new THREE.IcosahedronGeometry(r, d));
const cyl = (a, b, h, s = 7) => G(`c${a},${b},${h},${s}`, () => new THREE.CylinderGeometry(a, b, h, s));
const cone = (r, h, s = 4) => G(`k${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s));
const matCache = new Map();
const lam = c => { const k = 'l' + c; if (!matCache.has(k)) matCache.set(k, new THREE.MeshLambertMaterial({ color: c, flatShading: true })); return matCache.get(k); };
const flat = c => { const k = 'f' + c; if (!matCache.has(k)) matCache.set(k, new THREE.MeshBasicMaterial({ color: c })); return matCache.get(k); };

function part(geo, mat, x, y, z, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; }
// Arto con perno in alto (anca o spalla): ruota in modo naturale.
function limb(w, h, d, mat, x, y, z, parent) {
  const piv = new THREE.Group(); piv.position.set(x, y, z); parent.add(piv);
  part(G(`limb${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d).translate(0, -h / 2, 0)), mat, 0, 0, 0, piv);
  return piv;
}
const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const lighten = (hex, k) => new THREE.Color(hex).lerp(new THREE.Color(0xffffff), k).getHex();

// Ogni costruttore riempie: body (gruppo che contiene torso e testa), head, arms[sx,dx], legs[sx,dx], extra.
// Le coordinate di braccia e torso sono relative al bacino (body), quelle delle gambe al suolo (g).
// I quattro Guardiani, come nelle illustrazioni del libro (stile morbido, testa grande, occhi espressivi):
// Marco con la felpa blu di suo padre, troppo grande; Sophia con la coda alta di capelli scuri e i pantaloncini;
// Giulia con gli occhiali, i capelli mossi e il taccuino; Luca, il più piccolo, ricci e felpa verde. Tutti con lo zaino.
// La pietra (c = colore) brilla nella mano destra.
const SKIN = 0xf0c2a0;
const std = (c, o = {}) => { const k = 's' + c + JSON.stringify(o); if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, metalness: 0, ...o })); return matCache.get(k); };
const sph = (r, w = 16, h = 12) => G(`sp${r},${w},${h}`, () => new THREE.SphereGeometry(r, w, h));
const cap = (r, l) => G(`cp${r},${l}`, () => new THREE.CapsuleGeometry(r, l, 4, 10));
const capDown = (r, l) => G(`cpd${r},${l}`, () => new THREE.CapsuleGeometry(r, l, 4, 10).translate(0, -(l / 2 + r) + r, 0));
function rlimb(r, l, mat, x, y, z, parent) { const piv = new THREE.Group(); piv.position.set(x, y, z); parent.add(piv); part(capDown(r, l), mat, 0, 0, 0, piv); return piv; }
const blob = (parent, mat, list) => list.forEach(([x, y, z, r, sx = 1, sy = 1, sz = 1]) => { const m = part(sph(r, 12, 10), mat, x, y, z, parent); m.scale.set(sx, sy, sz); });
function face(r, o, s) {
  const H = r.head, skin = std(SKIN), white = std(0xffffff, { roughness: 0.3 }), iris = std(o.iris ?? 0x5a3a22, { roughness: 0.25 }), dark = flat(0x1a120c), brow = std(o.brow ?? o.hair);
  // testa tonda, un po' più larga che alta, con orecchie
  const hd = part(sph(0.2 * s, 24, 18), skin, 0, 0, 0, H); hd.scale.set(1.04, 1, 0.98);
  part(sph(0.045 * s, 10, 8), skin, -0.2 * s, -0.01 * s, 0.01, H); part(sph(0.045 * s, 10, 8), skin, 0.2 * s, -0.01 * s, 0.01, H);
  r.eyes = [];
  for (const sx of [-1, 1]) {
    const eg = new THREE.Group(); eg.position.set(sx * 0.072 * s, 0.01 * s, -0.168 * s); H.add(eg);
    const w = part(sph(0.048 * s, 14, 10), white, 0, 0, 0, eg); w.scale.set(0.85, 1.05, 0.5);
    part(sph(0.032 * s, 12, 10), iris, 0, -0.003 * s, -0.016 * s, eg).scale.set(1, 1.08, 0.5);
    part(sph(0.016 * s, 8, 6), dark, 0, -0.003 * s, -0.026 * s, eg).scale.set(1, 1, 0.4);
    part(sph(0.008 * s, 6, 4), flat(0xffffff), sx * 0.01 * s - 0.006 * s, 0.014 * s, -0.031 * s, eg);
    r.eyes.push(eg);
    const b = part(box(0.07 * s, 0.014 * s, 0.02 * s), brow, sx * 0.075 * s, 0.075 * s, -0.172 * s, H); b.rotation.z = -sx * 0.12;
    const ck = part(sph(0.03 * s, 8, 6), std(0xf09a8a, { transparent: true, opacity: 0.45 }), sx * 0.11 * s, -0.06 * s, -0.15 * s, H); ck.scale.set(1, 0.6, 0.4);
  }
  part(sph(0.022 * s, 8, 6), std(0xe8ae8c), 0, -0.03 * s, -0.2 * s, H);
  const m = part(G('smile', () => new THREE.TorusGeometry(0.035, 0.007, 4, 12, Math.PI)), std(0x9a3a32), 0, -0.085 * s, -0.182 * s, H); m.rotation.z = Math.PI; m.scale.setScalar(s);
}
function hair(r, o, s) {
  const H = r.head, m = std(o.hair, { roughness: 0.65 });
  // calotta comune
  const capm = part(sph(0.212 * s, 20, 14), m, 0, 0.03 * s, 0.018 * s, H); capm.scale.set(1.05, 0.98, 1.05);
  if (o.style === 'messy') blob(H, m, [[-0.09, 0.15, -0.14, 0.07], [0.0, 0.17, -0.15, 0.075], [0.1, 0.14, -0.13, 0.065], [-0.15, 0.06, -0.1, 0.06], [0.16, 0.05, -0.09, 0.055], [-0.05, 0.22, 0.02, 0.08], [0.07, 0.21, 0.06, 0.08], [0, 0.12, 0.17, 0.09], [-0.12, 0.17, 0.08, 0.07], [0.13, 0.17, 0.05, 0.07]].map(a => [a[0] * s, a[1] * s, a[2] * s, a[3] * s]));
  if (o.style === 'curls') { const L = []; for (let i = 0; i < 22; i++) { const th = i / 22 * Math.PI * 2, ph = 0.25 + (i % 3) * 0.35; L.push([Math.cos(th) * Math.sin(ph) * 0.2 * s, (0.08 + Math.cos(ph) * 0.15) * s, Math.sin(th) * Math.sin(ph) * 0.2 * s + 0.01, 0.055 * s]); } L.push([0, 0.2 * s, 0, 0.09 * s], [-0.08 * s, 0.14 * s, -0.15 * s, 0.06 * s], [0.07 * s, 0.15 * s, -0.15 * s, 0.06 * s]); blob(H, m, L); }
  if (o.style === 'tail') {
    blob(H, m, [[-0.08, 0.12, -0.15, 0.06, 1.3, 0.6, 0.8], [0.08, 0.12, -0.15, 0.06, 1.3, 0.6, 0.8], [-0.17, 0.0, -0.06, 0.05, 0.7, 1.4, 1], [0.17, 0.0, -0.06, 0.05, 0.7, 1.4, 1]].map(a => [a[0] * s, a[1] * s, a[2] * s, a[3] * s, a[4], a[5], a[6]]));
    const t = new THREE.Group(); t.position.set(0, 0.17 * s, 0.17 * s); H.add(t);
    part(sph(0.03 * s, 8, 6), std(0xd0607a), 0, 0, 0, t);
    blob(t, m, [[0, -0.02, 0.06, 0.07], [0, -0.1, 0.12, 0.08], [0, -0.21, 0.15, 0.075], [0, -0.32, 0.15, 0.065], [0, -0.41, 0.13, 0.05]].map(a => [a[0] * s, a[1] * s, a[2] * s, a[3] * s]));
    r.tail = t;
  }
  if (o.style === 'long') {
    blob(H, m, [[-0.1, 0.13, -0.14, 0.07, 1.2, 0.7, 0.8], [0.06, 0.15, -0.15, 0.07, 1.4, 0.6, 0.8], [-0.2, -0.05, -0.04, 0.075, 0.8, 1.5, 1], [0.2, -0.05, -0.04, 0.075, 0.8, 1.5, 1], [-0.19, -0.22, 0.02, 0.08, 0.9, 1.4, 1], [0.19, -0.22, 0.02, 0.08, 0.9, 1.4, 1], [0, -0.12, 0.15, 0.17, 1.15, 1.3, 0.6], [-0.12, -0.3, 0.12, 0.09], [0.12, -0.3, 0.12, 0.09], [0, -0.32, 0.14, 0.1]].map(a => [a[0] * s, a[1] * s, a[2] * s, a[3] * s, a[4] ?? 1, a[5] ?? 1, a[6] ?? 1]));
  }
  if (o.glasses) { const gm = std(0x2a2522, { roughness: 0.4 }); for (const sx of [-1, 1]) { const g = part(G('rim', () => new THREE.TorusGeometry(0.048, 0.007, 6, 18)), gm, sx * 0.072 * s, 0.01 * s, -0.19 * s, H); g.scale.setScalar(s); } part(box(0.05 * s, 0.008, 0.008), gm, 0, 0.02 * s, -0.195 * s, H); }
}
function kid(c, r, o) {
  const s = o.s || 1;
  const top = std(o.top), sleeve = std(o.sleeve ?? o.top), pants = std(o.pants), skin = std(SKIN), shoe = std(o.shoe ?? 0x6a5040), sole = std(0xeeeae2);
  r.hip = 0.56 * s;
  // busto (felpa o maglietta), un po' più largo se la felpa è grande
  const bw = o.big ? 1.18 : 1;
  const t = part(cap(0.15 * s, 0.17 * s), top, 0, 0.21 * s, 0, r.body); t.scale.set(1.12 * bw, 1, 0.8);
  if (o.hood) { const hd = part(G('hood', () => new THREE.TorusGeometry(0.11, 0.045, 8, 16)), top, 0, 0.41 * s, 0.07 * s, r.body); hd.rotation.x = Math.PI / 2.4; hd.scale.setScalar(s * bw); }
  if (o.inner) { const sh = part(cap(0.1 * s, 0.1 * s), std(o.inner), 0, 0.24 * s, -0.045 * s, r.body); sh.scale.set(0.9, 1, 0.6); part(box(0.008, 0.3 * s, 0.01), std(0xc8c8c8, { metalness: 0.6, roughness: 0.3 }), 0.06 * s, 0.22 * s, -0.115 * s * bw, r.body); }
  if (o.strings) for (const sx of [-1, 1]) part(box(0.008, 0.12 * s, 0.008), std(0xeeeeee), sx * 0.04 * s, 0.31 * s, -0.12 * s, r.body);
  // zaino con spallacci
  const pk = std(o.pack ?? 0x4a3a2e);
  const bag = part(cap(0.12 * s, 0.12 * s), pk, 0, 0.24 * s, 0.17 * s, r.body); bag.scale.set(1.15, 1, 0.55);
  part(box(0.16 * s, 0.07 * s, 0.03), std(o.pack2 ?? 0x5a4636), 0, 0.15 * s, 0.24 * s, r.body);
  for (const sx of [-1, 1]) { const st = part(box(0.035 * s, 0.32 * s, 0.03 * s), pk, sx * 0.1 * s * bw, 0.25 * s, -0.11 * s, r.body); st.rotation.x = 0.1; }
  // testa
  r.headY = 0.62 * s;
  face(r, o, s); hair(r, o, s);
  // braccia (spalla come perno), mani
  const al = (o.big ? 0.26 : 0.22) * s, ar = (o.big ? 0.06 : 0.05) * s, sx0 = 0.19 * s * bw;
  r.arms = [rlimb(ar, al, sleeve, -sx0, 0.36 * s, 0, r.body), rlimb(ar, al, sleeve, sx0, 0.36 * s, 0, r.body)];
  if (o.short) r.arms.forEach(a => part(capDown(0.042 * s, 0.12 * s), skin, 0, -0.14 * s, 0, a));
  r.arms.forEach(a => part(sph(0.048 * s, 10, 8), skin, 0, -(al + ar + (o.big ? -0.02 : 0.02) * s), 0, a));
  r.stone = part(ico(0.05 * s, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2.2) }), 0, -(al + ar + 0.07 * s), -0.05, r.arms[1]);
  // gambe e scarpe
  const ll = 0.36 * s;
  const legM = o.shorts ? skin : pants;
  r.legs = [rlimb(0.068 * s, ll, legM, -0.085 * s, 0.56 * s, 0, r.g), rlimb(0.068 * s, ll, legM, 0.085 * s, 0.56 * s, 0, r.g)];
  if (o.shorts) r.legs.forEach(l => { const sh = part(cap(0.078 * s, 0.1 * s), pants, 0, -0.1 * s, 0, l); sh.scale.set(1.05, 1, 1.05); });
  if (o.cargo) r.legs.forEach((l, i) => part(box(0.03, 0.09 * s, 0.07 * s), std(shade(o.pants, 0.85)), (i ? 1 : -1) * 0.07 * s, -0.22 * s, 0, l));
  r.legs.forEach(l => { const sh = part(cap(0.06 * s, 0.1 * s), shoe, 0, -0.5 * s, -0.04 * s, l); sh.rotation.x = Math.PI / 2; sh.scale.set(1.05, 1, 0.8); const so = part(box(0.12 * s, 0.025, 0.24 * s), sole, 0, -0.545 * s, -0.04 * s, l); });
}
// Adulti di Marechiaro e di Luminos (non sceglibili): Tonino, le raccoglitrici del sale, l'anziana del sale.
function adult(r, o) {
  const cloth = std(o.cloth), skin = std(o.skin ?? 0xdba886), hairM = std(o.hair, { roughness: 0.7 }), pants = std(o.pants ?? o.cloth);
  r.hip = 0.74;
  const t = part(cap(0.19, 0.3), cloth, 0, 0.3, 0, r.body); t.scale.set(1.05, 1, 0.8);
  if (o.apron) { const ap = part(box(0.3, 0.5, 0.02), std(o.apron), 0, 0.1, -0.16, r.body); }
  if (o.robe) { const rb = part(G('robe', () => new THREE.CylinderGeometry(0.2, 0.32, 0.74, 14)), cloth, 0, -0.37, 0, r.body); }
  r.headY = 0.76;
  face(r, { hair: o.hair, iris: 0x4a3a2a, brow: o.hair }, 0.85);
  const H = r.head;
  const cp = part(sph(0.18, 18, 12), hairM, 0, 0.03, 0.02, H); cp.scale.set(1.04, 0.95, 1.04);
  if (o.long) blob(H, hairM, [[0, -0.12, 0.13, 0.15, 1.1, 1.4, 0.6], [-0.15, -0.1, 0.0, 0.07, 0.8, 1.6, 1], [0.15, -0.1, 0.0, 0.07, 0.8, 1.6, 1]]);
  if (o.bun) blob(H, hairM, [[0, 0.12, 0.17, 0.08]]);
  if (o.beard) { blob(H, hairM, [[0, -0.1, -0.12, 0.11, 1.2, 0.9, 0.7], [-0.09, -0.04, -0.13, 0.06], [0.09, -0.04, -0.13, 0.06]]); blob(H, hairM, [[-0.05, -0.04, -0.17, 0.035, 1.3, 0.6, 0.6], [0.05, -0.04, -0.17, 0.035, 1.3, 0.6, 0.6]]); }
  if (o.cap) { const cm = std(o.cap); const c1 = part(sph(0.185, 16, 10, 0), cm, 0, 0.07, 0.01, H); c1.scale.set(1.05, 0.6, 1.05); part(box(0.2, 0.02, 0.12), cm, 0, 0.06, -0.2, H); }
  if (o.scarf) { const sc = part(sph(0.2, 16, 12), std(o.scarf), 0, 0.05, 0.03, H); sc.scale.set(1.08, 0.95, 1.1); }
  r.arms = [rlimb(0.06, 0.34, cloth, -0.24, 0.48, 0, r.body), rlimb(0.06, 0.34, cloth, 0.24, 0.48, 0, r.body)];
  r.arms.forEach(a => part(sph(0.055, 10, 8), skin, 0, -0.46, 0, a));
  if (o.basket) { const b = new THREE.Group(); b.position.set(0, -0.5, -0.16); r.arms[1].add(b); part(cyl(0.2, 0.15, 0.24, 12), std(0xb08a52), 0, -0.1, 0, b); part(cyl(0.18, 0.18, 0.04, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff1c8).multiplyScalar(1.6) }), 0, 0.03, 0, b); }
  r.legs = o.robe ? [] : [rlimb(0.075, 0.52, pants, -0.1, 0.74, 0, r.g), rlimb(0.075, 0.52, pants, 0.1, 0.74, 0, r.g)];
  r.legs.forEach(l => { const sh = part(cap(0.065, 0.12), std(0x3a2e26), 0, -0.68, -0.05, l); sh.rotation.x = Math.PI / 2; });
}
const BUILDERS = {
  marco(c, r) { kid(c, r, { top: 0x26489a, sleeve: 0x22418c, inner: 0x7a838c, big: true, hood: true, pants: 0x6a5a44, cargo: true, hair: 0x3d2414, brow: 0x2a1a10, style: 'messy', pack: 0x2e2620, pack2: 0x4a3a2c }); },
  sophia(c, r) { kid(c, r, { top: 0xe8e4dc, short: true, pants: 0x5a7aa6, shorts: true, hair: 0x2a1a14, style: 'tail', pack: 0x2e2a28, pack2: 0x4a4038, shoe: 0x5a4a3a }); },
  giulia(c, r) {
    kid(c, r, { top: 0xcfc8bc, pants: 0x5a7090, hair: 0x9a6a3c, brow: 0x6a4424, style: 'long', glasses: true, pack: 0x8a7a64, pack2: 0x6a5a48, iris: 0x6a4a2a });
    const nb = new THREE.Group(); nb.position.set(0, -0.3, -0.07); r.arms[0].add(nb); nb.rotation.x = -0.3;
    part(box(0.15, 0.2, 0.035), std(0x6a3e20), 0, 0, 0, nb); part(G('rosa', () => new THREE.TorusGeometry(0.035, 0.005, 4, 16)), new THREE.MeshBasicMaterial({ color: 0xd8b26a }), 0, 0, -0.02, nb);
  },
  luca(c, r) { kid(c, r, { s: 0.86, top: 0x56704a, pants: 0x4a5a78, hair: 0x7a4a26, brow: 0x5a3418, style: 'curls', hood: true, strings: true, pack: 0x5a4636, pack2: 0x3e3026 }); },
  tonino(c, r) { adult(r, { cloth: 0x46586a, pants: 0x34343c, hair: 0xd8d4cc, beard: true, cap: 0x23365a }); },
  raccoglitrice(c, r) { adult(r, { cloth: 0xece6d8, apron: 0xc8bfa8, hair: 0x6a4a30, scarf: 0x8aa6c8, robe: true, basket: true }); },
  pescatore(c, r) { adult(r, { cloth: 0xc86a3a, pants: 0x2f3e56, hair: 0x4a3222, cap: 0x2f5a7a, skin: 0xc99070 }); },
  fornaia(c, r) { adult(r, { cloth: 0xf2ede2, apron: 0xe8dcc4, hair: 0x5a3a26, bun: true, pants: 0x6a4a3a }); },
  bambina(c, r) { kid(c, r, { s: 0.82, top: 0xe87a9a, pants: 0x6a8ac8, shorts: true, short: true, hair: 0xb07a3a, brow: 0x7a4a22, style: 'tail', pack: 0xf0c050, pack2: 0xd8a830 }); r.stone.visible = false; },
    anziana(c, r) { adult(r, { cloth: 0xe0d8c8, apron: 0xb8ad94, hair: 0xe8e4dc, long: true, bun: true, robe: true, basket: true }); },
};

function makeSprite(canvas, h) {
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  s.scale.set(canvas.width / canvas.height * h, h, 1); s.renderOrder = 10; return s;
}
// Etichetta sopra la testa: testo disegnato su canvas (mai HTML).
export function makeLabel(text, color = '#f5c56b') {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  const font = '600 40px ui-sans-serif, system-ui, sans-serif';
  g.font = font; const w = Math.ceil(g.measureText(text).width) + 44;
  c.width = Math.min(512, w); c.height = 64;
  g.font = font; g.fillStyle = 'rgba(16,16,36,0.82)';
  g.beginPath(); g.roundRect(0, 0, c.width, 64, 30); g.fill();
  g.fillStyle = color; g.beginPath(); g.arc(24, 32, 8, 0, 7); g.fill();
  g.fillStyle = '#ecebe6'; g.textBaseline = 'middle'; g.fillText(text, 38, 34, c.width - 46);
  return makeSprite(c, 0.2);
}
// Fumetto con testo (chat o battute del robottino). Il testo è disegnato su canvas: niente HTML.
export function makeBubble(text, opts = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  const W = 520, font = '500 30px ui-sans-serif, system-ui, sans-serif';
  g.font = font;
  const words = String(text).split(' '); const lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > W - 48 && line) { lines.push(line); line = w; } else line = t; }
  lines.push(line); const ML = opts.maxLines || 3; if (lines.length > ML) { lines.length = ML; lines[ML - 1] = lines[ML - 1].replace(/\s*\S*$/, '') + '…'; }
  const tw = Math.min(W - 48, Math.max(...lines.map(l => g.measureText(l).width)));
  c.width = Math.ceil(tw + 48); c.height = 30 + lines.length * 38 + 26;
  g.font = font;
  g.fillStyle = opts.bg || '#ecebe6'; g.beginPath(); g.roundRect(2, 2, c.width - 4, c.height - 26, 18); g.fill();
  g.beginPath(); g.moveTo(c.width / 2 - 12, c.height - 25); g.lineTo(c.width / 2, c.height - 4); g.lineTo(c.width / 2 + 12, c.height - 25); g.fill();
  g.fillStyle = opts.fg || '#141413'; g.textBaseline = 'top';
  lines.forEach((l, i) => g.fillText(l, 24, 18 + i * 38, c.width - 48));
  return makeSprite(c, c.height / 512 * 1.15 * (opts.scale || 1));
}

const emoteTex = new Map();
function emoteSprite(glyph) {
  if (!emoteTex.has(glyph)) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#ecebe6'; g.beginPath(); g.arc(64, 60, 54, 0, 7); g.fill();
    g.beginPath(); g.moveTo(52, 108); g.lineTo(64, 126); g.lineTo(76, 108); g.fill();
    g.font = '64px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(glyph, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; emoteTex.set(glyph, t);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emoteTex.get(glyph), transparent: true, depthWrite: false }));
  s.scale.set(0.4, 0.4, 1); s.renderOrder = 11;
  return s;
}

const shadowGeo = new THREE.CircleGeometry(0.32, 12);
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });

const ANIMS = { wave: 2.0, laugh: 1.8, party: 2.6, hop: 0.6, meet: 1.3 };

export class Avatar {
  constructor(kind, color, nick, opts = {}) {
    this.kind = BUILDERS[kind] ? kind : 'marco'; this.color = color;
    this.g = new THREE.Group();
    this.body = new THREE.Group(); this.head = new THREE.Group();
    this.g.add(this.body); this.body.add(this.head);
    const r = { g: this.g, body: this.body, head: this.head, arms: [], legs: [], eyes: [] };
    BUILDERS[this.kind](new THREE.Color(color).getHex(), r);
    Object.assign(this, { arms: r.arms, legs: r.legs, eyes: r.eyes, tail: r.tail, floats: !!r.floats, hip: r.hip, stone: r.stone });
    this.body.position.y = r.hip; this.head.position.y = r.headY;
    this.topY = r.hip + r.headY + 0.45;
    if (!opts.noShadow) { const sh = new THREE.Mesh(shadowGeo, shadowMat); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.006; this.g.add(sh); }
    if (nick != null) { this.label = makeLabel(nick, color); this.label.position.y = this.topY; this.g.add(this.label); }
    this.walk = 0; this.emote = null; this.bubble = null; this.anim = null; this.seated = false;
    this.lookT = 0; this.lookYaw = 0; this.seed = Math.random() * 100;
  }
  setNick(nick) {
    if (this.label) { this.g.remove(this.label); this.label.material.map.dispose(); this.label.material.dispose(); }
    this.label = makeLabel(nick, this.color); this.label.position.y = this.topY; this.g.add(this.label);
  }
  showEmote(glyph) {
    if (this.emote) { this.g.remove(this.emote.s); this.emote.s.material.dispose(); }
    const s = emoteSprite(glyph); s.position.y = this.topY + 0.4; this.g.add(s);
    this.emote = { s, t: 0 };
  }
  say(text, ms = 6000, opts) {
    this.clearBubble();
    const s = makeBubble(text, opts); s.position.y = this.topY + 0.2 + s.scale.y / 2; this.g.add(s);
    this.bubble = { s, t: 0, life: ms / 1000 };
  }
  clearBubble() {
    if (!this.bubble) return; this.g.remove(this.bubble.s); this.bubble.s.material.map.dispose(); this.bubble.s.material.dispose(); this.bubble = null;
  }
  play(name) { if (ANIMS[name]) this.anim = { name, t: 0, dur: ANIMS[name] }; }
  dance() { this.play('party'); }
  setSeated(v) { this.seated = v; }

  // speed: metri al secondo (stimati dall'interpolazione per gli avatar remoti)
  update(dt, speed, time) {
    const moving = speed > 0.15 && !this.seated;
    this.walk += dt * (moving ? Math.min(12, 5 + speed * 2.5) : 0);
    const sw = moving ? Math.sin(this.walk) * 0.5 : 0;
    const L = this.legs, A = this.arms, k = Math.min(1, dt * 12);
    let bodyY = this.hip, bodyRotY = 0, bodyRotX = 0, bodyRotZ = 0, headRotX = 0, headRotZ = 0;
    let armL = -sw * 0.8, armR = sw * 0.8, armLz = 0, armRz = 0, legL = sw, legR = -sw;

    // piccoli movimenti da fermo: respiro, sguardo che si sposta, braccia rilassate
    if (!moving) {
      this.lookT -= dt;
      if (this.lookT <= 0) { this.lookT = 2.5 + Math.random() * 4; this.lookYaw = (Math.random() - 0.5) * 1.1; }
      bodyY += Math.sin(time * 2 + this.seed) * 0.008;
      armLz = -0.05 - Math.sin(time * 2 + this.seed) * 0.03; armRz = -armLz;
    } else { this.lookYaw = 0; bodyY += Math.abs(Math.sin(this.walk)) * 0.04; bodyRotX = 0.06; }
    if (this.floats) { bodyY += 0.12 + Math.sin(time * 2.2 + this.seed) * 0.05; legL = legR = 0; armL *= 0.4; armR *= 0.4; }
    if (this.seated) { legL = legR = -1.45; bodyY = 0.48 + (this.floats ? 0.1 : 0); armL = armR = this.typing ? -1.25 : -0.3; if (this.typing) { armL += Math.sin(time * 14) * 0.08; armR += Math.sin(time * 14 + 1.7) * 0.08; } }
    if (this.lookOverride != null) this.lookYaw = this.lookOverride;

    const a = this.anim;
    if (a) {
      a.t += dt; const p = a.t / a.dur, env = Math.sin(Math.min(1, p) * Math.PI);
      if (a.name === 'wave') { armR = -2.7 * Math.min(1, a.t * 5) * (p < 0.92 ? 1 : (1 - p) / 0.08); armRz = Math.sin(a.t * 14) * 0.45; headRotZ = 0.15 * env; }
      else if (a.name === 'laugh') { bodyRotX = -0.25 * env; headRotX = -0.35 * env; bodyY += Math.abs(Math.sin(a.t * 22)) * 0.03 * env; armL = armR = -0.4 * env; armLz = 0.4 * env; armRz = -0.4 * env; bodyRotZ = Math.sin(a.t * 18) * 0.05 * env; }
      else if (a.name === 'party') { bodyRotY = p * Math.PI * 2; bodyY += Math.abs(Math.sin(a.t * 9)) * 0.18; armL = armR = -2.9; armLz = Math.sin(a.t * 9) * 0.4; armRz = -armLz; legL = Math.sin(a.t * 9) * 0.3; legR = -legL; }
      else if (a.name === 'hop') { bodyY += Math.sin(Math.min(1, p) * Math.PI) * 0.12; armL = armR = -0.6 * env; }
      else if (a.name === 'meet') { bodyY += Math.sin(Math.min(1, p * 2) * Math.PI) * 0.1; armR = -2.5 * env; armRz = Math.sin(a.t * 12) * 0.35 * env; headRotZ = 0.2 * env; }
      if (a.t >= a.dur) this.anim = null;
    }

    if (L.length) { L[0].rotation.x += (legL - L[0].rotation.x) * k; L[1].rotation.x += (legR - L[1].rotation.x) * k; }
    if (A.length) {
      A[0].rotation.x += (armL - A[0].rotation.x) * k; A[1].rotation.x += (armR - A[1].rotation.x) * k;
      A[0].rotation.z += (armLz - A[0].rotation.z) * k; A[1].rotation.z += (armRz - A[1].rotation.z) * k;
    }
    this.body.position.y += (bodyY - this.body.position.y) * Math.min(1, dt * 20);
    this.body.rotation.y = bodyRotY; this.body.rotation.x += (bodyRotX - this.body.rotation.x) * k; this.body.rotation.z = bodyRotZ;
    this.head.rotation.y += (this.lookYaw - this.head.rotation.y) * Math.min(1, dt * 3);
    this.head.rotation.x += (headRotX - this.head.rotation.x) * k; this.head.rotation.z += (headRotZ - this.head.rotation.z) * k;
    if (this.tail) this.tail.rotation.y = Math.sin(time * (moving ? 8 : 3) + this.seed) * 0.4;
    const blink = (time + this.seed) % 4 < 0.12;
    for (const e of this.eyes) e.scale.y = blink ? 0.15 : 1;
    if (this.stone) this.stone.scale.setScalar(1 + Math.sin(time * 2.4 + this.seed) * 0.18);

    if (this.emote) {
      const e = this.emote; e.t += dt;
      e.s.position.y = this.topY + 0.4 + Math.min(e.t, 0.3) * 0.5 + (this.bubble ? this.bubble.s.scale.y : 0);
      const s = e.t < 0.15 ? e.t / 0.15 : e.t > 2.2 ? Math.max(0, 1 - (e.t - 2.2) / 0.4) : 1;
      e.s.scale.set(0.4 * s, 0.4 * s, 1);
      if (e.t > 2.6) { this.g.remove(e.s); e.s.material.dispose(); this.emote = null; }
    }
    if (this.bubble) {
      const b = this.bubble; b.t += dt;
      b.s.material.opacity = b.t < 0.15 ? b.t / 0.15 : b.t > b.life - 0.3 ? Math.max(0, (b.life - b.t) / 0.3) : 1;
      if (b.t > b.life) this.clearBubble();
    }
  }
  dispose() {
    this.clearBubble();
    if (this.label) { this.label.material.map.dispose(); this.label.material.dispose(); }
    if (this.emote) this.emote.s.material.dispose();
  }
}

// Anteprima per la scelta dell'avatar (renderer separato, solo mentre è visibile).
export function previewRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xfff1e0, 0x2a2622, 1.6));
  const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(2, 3, -2); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20); cam.position.set(0, 1.2, -3.9); cam.lookAt(0, 0.92, 0);
  let av = null, run = true, last = performance.now(), demoT = 0;
  function set(kind, color) {
    if (av) { sc.remove(av.g); av.dispose(); }
    av = new Avatar(kind, color, null, { noShadow: true }); sc.add(av.g); av.play('wave');
  }
  function loop(t) {
    if (!run) return;
    const w = canvas.clientWidth, hh = canvas.clientHeight;
    if (w && canvas.width !== Math.round(w * r.getPixelRatio())) { r.setSize(w, hh, false); cam.aspect = w / hh; cam.updateProjectionMatrix(); }
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (av) {
      av.g.rotation.y = Math.sin(t / 1600) * 0.5; av.update(dt, 0, t / 1000);
      demoT += dt; if (demoT > 4) { demoT = 0; av.play(['wave', 'laugh', 'party', 'hop'][Math.floor(Math.random() * 4)]); }
    }
    r.render(sc, cam); requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  return { set, stop() { run = false; r.dispose(); r.forceContextLoss(); } };
}
