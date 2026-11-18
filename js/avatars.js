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
// I quattro Guardiani, come nelle illustrazioni del libro: Marco con la giacca blu di suo padre (troppo grande),
// Sophia con la coda alta di capelli scuri, Giulia con gli occhiali e il taccuino, Luca il più piccolo, ricci e felpa verde.
// Tutti con lo zaino. La pietra (c = colore) brilla nella mano destra.
const SKIN = 0xe9bb96;
function kid(c, r, o) {
  const s = o.s || 1;
  const top = lam(o.top), sleeve = lam(o.sleeve ?? o.top), pants = lam(o.pants), hair = lam(o.hair), skin = lam(SKIN), shoe = lam(o.shoe ?? 0x5a4636);
  r.hip = 0.56 * s;
  const tw = o.big ? 0.42 : 0.36;
  part(box(tw * s, 0.46 * s, 0.25 * s), top, 0, 0.23 * s, 0, r.body);
  if (o.inner) part(box(0.12 * s, 0.38 * s, 0.02), lam(o.inner), 0, 0.25 * s, -0.13 * s, r.body);
  if (o.hood) part(box(0.3 * s, 0.1 * s, 0.14 * s), top, 0, 0.47 * s, 0.1 * s, r.body);
  // zaino
  part(box(0.3 * s, 0.36 * s, 0.13 * s), lam(o.pack ?? 0x4a3a2e), 0, 0.26 * s, 0.19 * s, r.body);
  r.headY = 0.64 * s;
  part(box(0.32 * s, 0.32 * s, 0.3 * s), skin, 0, 0, 0, r.head);
  part(box(0.35 * s, 0.11 * s, 0.33 * s), hair, 0, 0.17 * s, 0.01, r.head);
  part(box(0.35 * s, 0.26 * s, 0.08 * s), hair, 0, 0.05 * s, 0.13 * s, r.head);
  part(box(0.05 * s, 0.2 * s, 0.3 * s), hair, -0.17 * s, 0.06 * s, 0.02, r.head); part(box(0.05 * s, 0.2 * s, 0.3 * s), hair, 0.17 * s, 0.06 * s, 0.02, r.head);
  part(box(0.3 * s, 0.07 * s, 0.05), hair, 0.03, 0.13 * s, -0.155 * s, r.head);
  if (o.long) { part(box(0.4 * s, 0.42 * s, 0.1 * s), hair, 0, -0.16 * s, 0.14 * s, r.head); part(box(0.07 * s, 0.34 * s, 0.14 * s), hair, -0.19 * s, -0.14 * s, 0.03, r.head); part(box(0.07 * s, 0.34 * s, 0.14 * s), hair, 0.19 * s, -0.14 * s, 0.03, r.head); }
  if (o.tail) { part(box(0.1 * s, 0.08 * s, 0.1 * s), hair, 0, 0.2 * s, 0.17 * s, r.head); const t = part(box(0.12 * s, 0.38 * s, 0.1 * s), hair, 0, 0.0, 0.24 * s, r.head); t.rotation.x = 0.45; }
  if (o.curls) for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const m = part(box(0.09 * s, 0.09 * s, 0.09 * s), hair, Math.cos(a) * 0.15 * s, 0.2 * s + (i % 2) * 0.03, Math.sin(a) * 0.14 * s, r.head); m.rotation.set(a, a * 2, 0.3); }
  if (o.messy) [[-0.1, 0.24, -0.06], [0.05, 0.25, 0.02], [0.13, 0.23, -0.08], [-0.04, 0.26, 0.1]].forEach(([x, y, z], i) => { const m = part(box(0.09 * s, 0.07 * s, 0.09 * s), hair, x * s, y * s, z * s, r.head); m.rotation.set(0.3 * i, i, -0.2 * i); });
  r.eyes = [part(box(0.045 * s, 0.06 * s, 0.02), flat(0x2a1d16), -0.075 * s, 0.01, -0.155 * s, r.head), part(box(0.045 * s, 0.06 * s, 0.02), flat(0x2a1d16), 0.075 * s, 0.01, -0.155 * s, r.head)];
  if (o.glasses) { const gl = flat(0x2a2522); for (const x of [-0.075, 0.075]) { part(box(0.1 * s, 0.015, 0.015), gl, x * s, 0.055 * s, -0.163 * s, r.head); part(box(0.1 * s, 0.015, 0.015), gl, x * s, -0.035 * s, -0.163 * s, r.head); part(box(0.015, 0.09 * s, 0.015), gl, (x - 0.05) * s, 0.01, -0.163 * s, r.head); part(box(0.015, 0.09 * s, 0.015), gl, (x + 0.05) * s, 0.01, -0.163 * s, r.head); } }
  part(box(0.07 * s, 0.02, 0.02), flat(0x9a4a3a), 0, -0.09 * s, -0.155 * s, r.head);
  const aw = o.big ? 0.11 : 0.09, al = o.big ? 0.44 : 0.4;
  r.arms = [limb(aw * s, al * s, aw * s, sleeve, -(tw / 2 + 0.05) * s, 0.44 * s, 0, r.body), limb(aw * s, al * s, aw * s, sleeve, (tw / 2 + 0.05) * s, 0.44 * s, 0, r.body)];
  r.arms.forEach(a => part(box(0.075 * s, 0.06 * s, 0.075 * s), skin, 0, -(al + 0.02) * s, 0, a));
  r.stone = part(ico(0.05 * s, 0), new THREE.MeshBasicMaterial({ color: c }), 0, -(al + 0.07) * s, -0.04, r.arms[1]);
  const legM = o.shorts ? skin : pants;
  r.legs = [limb(0.13 * s, 0.56 * s, 0.13 * s, legM, -0.09 * s, 0.56 * s, 0, r.g), limb(0.13 * s, 0.56 * s, 0.13 * s, legM, 0.09 * s, 0.56 * s, 0, r.g)];
  if (o.shorts) r.legs.forEach(l => part(box(0.15 * s, 0.22 * s, 0.15 * s), pants, 0, -0.1 * s, 0, l));
  r.legs.forEach(l => part(box(0.14 * s, 0.08 * s, 0.2 * s), shoe, 0, -0.53 * s, -0.025, l));
  return s;
}
// Adulti di Marechiaro e di Luminos (non sceglibili): Tonino, le raccoglitrici del sale, l'anziana del sale.
function adult(r, o) {
  const cloth = lam(o.cloth), skin = lam(SKIN), hair = lam(o.hair), pants = lam(o.pants ?? o.cloth);
  r.hip = 0.72; part(box(0.44, 0.6, 0.3), cloth, 0, 0.3, 0, r.body);
  if (o.apron) part(box(0.34, 0.5, 0.02), lam(o.apron), 0, 0.2, -0.16, r.body);
  if (o.robe) part(box(0.5, 0.7, 0.36), cloth, 0, -0.32, 0, r.body);
  r.headY = 0.8; part(box(0.3, 0.32, 0.3), skin, 0, 0, 0, r.head);
  part(box(0.33, 0.08, 0.33), hair, 0, 0.17, 0.01, r.head); part(box(0.33, 0.2, 0.07), hair, 0, 0.06, 0.14, r.head);
  if (o.beard) part(box(0.28, 0.16, 0.06), hair, 0, -0.12, -0.15, r.head);
  if (o.cap) { part(box(0.34, 0.1, 0.34), lam(o.cap), 0, 0.2, 0, r.head); part(box(0.3, 0.03, 0.12), lam(o.cap), 0, 0.15, -0.2, r.head); }
  if (o.scarf) part(box(0.36, 0.14, 0.34), lam(o.scarf), 0, 0.12, 0.01, r.head);
  if (o.long) part(box(0.34, 0.4, 0.08), hair, 0, -0.14, 0.14, r.head);
  r.eyes = [part(box(0.04, 0.035, 0.02), flat(0x2a1d16), -0.07, 0.02, -0.155, r.head), part(box(0.04, 0.035, 0.02), flat(0x2a1d16), 0.07, 0.02, -0.155, r.head)];
  r.arms = [limb(0.1, 0.48, 0.1, cloth, -0.27, 0.56, 0, r.body), limb(0.1, 0.48, 0.1, cloth, 0.27, 0.56, 0, r.body)];
  r.arms.forEach(a => part(box(0.08, 0.07, 0.08), skin, 0, -0.5, 0, a));
  if (o.basket) { const b = new THREE.Group(); b.position.set(0, -0.55, -0.18); r.arms[1].add(b); part(cyl(0.2, 0.15, 0.26, 8), lam(0xb08a52), 0, -0.1, 0, b); part(cyl(0.17, 0.17, 0.04, 8), flat(0xfff1c8), 0, 0.03, 0, b); }
  r.legs = o.robe ? [] : [limb(0.14, 0.72, 0.14, pants, -0.11, 0.72, 0, r.g), limb(0.14, 0.72, 0.14, pants, 0.11, 0.72, 0, r.g)];
  r.legs.forEach(l => part(box(0.15, 0.08, 0.22), lam(0x3a2e26), 0, -0.68, -0.03, l));
}
const BUILDERS = {
  marco(c, r) { kid(c, r, { top: 0x2f4f9a, sleeve: 0x2b4890, inner: 0x8a8f96, big: true, hood: true, pants: 0x6a5a44, hair: 0x3a2618, messy: true, pack: 0x3a2e26 }); },
  sophia(c, r) { kid(c, r, { top: 0xd8d6d0, pants: 0x5a7a9e, shorts: true, hair: 0x2a1c16, tail: true, pack: 0x3a3430 }); },
  giulia(c, r) {
    kid(c, r, { top: 0xbcb6ac, pants: 0x5a7090, hair: 0x9a6a3e, long: true, glasses: true, pack: 0x7a6a58 });
    const nb = part(box(0.15, 0.2, 0.035), lam(0x6a4224), 0, -0.36, -0.08, r.arms[0]); nb.rotation.x = -0.3;
    part(box(0.07, 0.07, 0.01), flat(0xd8b26a), 0, -0.36, -0.1, r.arms[0]);
  },
  luca(c, r) { kid(c, r, { s: 0.86, top: 0x4f6e46, pants: 0x4a5a72, hair: 0x7a4e2c, curls: true, hood: true, pack: 0x5a4636 }); },
  tonino(c, r) { adult(r, { cloth: 0x4a5a6a, pants: 0x3a3a40, hair: 0xd8d4cc, beard: true, cap: 0x2a3a5a }); },
  raccoglitrice(c, r) { adult(r, { cloth: 0xe8e2d4, apron: 0xc8bfa8, hair: 0x6a4a30, scarf: 0xd8c8a8, robe: true, basket: true }); },
  anziana(c, r) { adult(r, { cloth: 0xdcd4c4, apron: 0xb8ad94, hair: 0xe0dcd4, long: true, robe: true, basket: true }); },
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
  lines.push(line); if (lines.length > 3) { lines.length = 3; lines[2] = lines[2].replace(/\s*\S*$/, '') + '…'; }
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
