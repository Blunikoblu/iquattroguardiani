// Luminos · il mondo del libro. Punto di ingresso: collega mondo, personaggi, rete e interfaccia.
import * as THREE from 'three';
import { createFX } from './fx.js?v=202611191625';
import { EMOTES, FRASI, AVATARS, NET, ZONES } from './config.js?v=202611191625';
import { h } from './util.js?v=202611191625';
import { audio } from './audio.js?v=202611191625';
import { Avatar, previewRenderer } from './avatars.js?v=202611191625';
import { buildWorld, zoneOf, regionOf } from './world.js?v=202611191625';
import { createDiario } from './diario.js?v=202611191625';
import { createPowers } from './powers.js?v=202611191625';
import { createAttivita } from './attivita.js?v=202611191625';
import { createLuoghi } from './luoghi.js?v=202611191625';
import { RUNE_CACCIA } from './rune.js?v=202611191625';
import { testo } from './testi.js?v=202611191625';
import { createCollider, createPlayer } from './player.js?v=202611191625';
import { createNet } from './net.js?v=202611191625';
import { createUI } from './ui.js?v=202611191625';

const isTouch = matchMedia('(pointer: coarse)').matches;
if (new URLSearchParams(location.search).has('rec')) document.documentElement.classList.add('rec'); // riprese: senza interfaccia
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem('lu_' + k); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('lu_' + k, v); } catch (e) {} },
};
const safeUrl = u => (typeof u === 'string' && /^https:\/\//.test(u)) ? u : null;

// Dati pubblici (data di uscita, modulo, social): solo da data.json nel repository.
const data = { uscita: null, periodo: null, modulo: null, copertina: null, aperture: {}, instagram: null, facebook: null, tiktok: null, threads: null, acquisto: null, estratto: null, parole: [] };
try { const r = await fetch('data.json', { cache: 'no-store' }); if (r.ok) Object.assign(data, await r.json()); } catch (e) {}
for (const k of ['modulo', 'instagram', 'facebook', 'tiktok', 'threads', 'acquisto', 'estratto']) data[k] = safeUrl(data[k]);
data.parole = Array.isArray(data.parole) ? data.parole.filter(x => typeof x === 'string' && /^[0-9a-f]{64}$/.test(x)) : [];
if (data.copertina && !/^[a-z0-9/_.-]+\.(jpg|jpeg|png|webp)$/i.test(data.copertina)) data.copertina = null;

const ui = createUI();
$('help').textContent = isTouch
  ? 'Joystick per camminare · trascina per girarti · tocca un punto o un oggetto per andarci'
  : 'WASD per camminare · trascina per girarti · clic su un punto per andarci · E per aprire · V cambia vista';

// ---------- Rendering ----------
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
let pixelRatio = Math.min(devicePixelRatio, isTouch ? 1.5 : 2);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfe4f4, 60, 320);
scene.background = new THREE.Color(0xcfe4f4);
const camera = new THREE.PerspectiveCamera(isTouch ? 70 : 64, innerWidth / innerHeight, 0.05, 800);
camera.rotation.order = 'YXZ';
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); });

// ---------- Mondo ----------
const hooks = {
  toast: t => ui.toast(t),
  openPanel: (nodes, label) => ui.openPanel(nodes, { label }),
  becomeGuardian: id => { ui.closePanel(); setGuardian(id); },
  takeStone: id => takeStone(id),
  travel: where => travel(where),
  race: () => attivita.raceUse(),
  tide: () => { if (entered && zoneOf(player.pos.x, player.pos.z) === 'spiaggia') ui.toast('✨ Arriva la marea di luce! Dove passa, lascia il sale.'); },
};
const world = buildWorld(scene, data, hooks);

const fx = createFX(renderer, scene, camera, { isTouch, quality: store.get('grafica', null) });
fx.makeWater(world.sea);

// ---------- Sicurezza: nascondere, silenziare, segnalare (solo su questo dispositivo, tranne la segnalazione) ----------
const safety = { hidden: new Set(), hideAll: store.get('nascondi', '0') === '1', mute: store.get('muto', '0') === '1' };
let tutorial = { refresh() {}, tick() {} };

// ---------- Taccuino, poteri, attività e i quattro cammini ----------
const secrets = createDiario({ scene, ui, audio, rune: RUNE_CACCIA, onChange: () => { $('secretsN').textContent = `${secrets.count}/${secrets.total}`; tutorial.refresh(); } });
const powers = createPowers({ scene, ui, audio, diario: secrets });
const meInfo = () => ({ x: player.pos.x, z: player.pos.z, y: player.y, av: myChoice.av, nick: myChoice.nick });
const actHooks = {
  toast: t => ui.toast(t), others: () => others, walkTo: (x, z) => routeTo(x, z), party: () => me.play('party'),
  discover: (id, at) => secrets.discover(id, tmp.set(at.x, at.y, at.z)), store, fadeTo: (f, c) => fadeTo(f, c),
  teleport: (x, z, yaw) => player.teleport(x, z, yaw), travel: w => travel(w),
};
const attivita = createAttivita({ world, scene, ui, audio, diario: secrets, powers, net: { get online() { return net.online; }, act: (k, d) => net.act(k, d) }, me: meInfo, hooks: actHooks });
const luoghi = createLuoghi({ world, scene, ui, audio, diario: secrets, powers, me: meInfo, hooks: actHooks });

const collider = createCollider(0.3);
collider.areas.push(...world.areas);
collider.solids.push(...world.solids);

let viewMode = store.get('vista', 'terza');
const player = createPlayer(canvas, collider, {
  isTouch, spawn: world.spawn, joy: $('joy'), knob: $('knob'),
  pitchMin: -0.9, pitchMax: 1.0,
  onStep: () => { if (!reduceMotion) audio.step(); },
  onTap: (x, y) => onTap(x, y),
  groundAt: (x, z) => attivita.groundAt(x, z),
  onFall: () => attivita.onFall(),
  onJump: () => audio.tone(520),
});
const routeTo = (x, z, then) => player.walkTo(x, z, then);

// ---------- Il mio personaggio ----------
let myChoice = { nick: store.get('nick', ''), av: store.get('av', 'marco') };
if (!AVATARS.some(a => a.id === myChoice.av)) myChoice.av = 'marco';
const colOf = id => AVATARS.find(a => a.id === id)?.col || '#f5c56b';
let me = null;
function buildMe() {
  if (me) { scene.remove(me.g); me.dispose(); }
  me = new Avatar(myChoice.av, colOf(myChoice.av), null); scene.add(me.g); fx.cast(me.g);
}
buildMe();
function setGuardian(id) {
  myChoice.av = id; store.set('av', id); buildMe(); me.play('party'); paintPower?.();
  net.updateMe({ av: id });
  ui.toast(`Adesso sei ${AVATARS.find(a => a.id === id).nome}. ${testo('potere-' + id)}`);
}

// ---------- Altri visitatori ----------
const others = new Map(); // id -> { meta, av, x, z, r, has, seen, metT }
function addOther(id, meta) {
  const av = new Avatar(meta.av, meta.col, meta.nick);
  av.g.visible = false; scene.add(av.g); fx.cast(av.g);
  others.set(id, { meta, av, x: 0, z: 0, r: 0, has: false, seen: performance.now(), metT: -1e9 });
}
function removeOther(id) { const o = others.get(id); if (!o) return; scene.remove(o.av.g); o.av.dispose(); others.delete(id); }

$('secretsN').textContent = `${secrets.count}/${secrets.total}`;
{ const disc = secrets.discover; secrets.discover = (id, at) => { const r = disc(id, at); if (r && id === 'aquiloni') secrets.creatura('coda-lunga'); if (r && id === 'delfini') secrets.creatura('tursiope'); return r; }; }

const net = createNet({
  onStatus: (mode, msg) => { ui.setStatus(mode, mode === 'online' || mode === 'online-pubblico' ? '' : msg); if (mode === 'solo') ui.setCount(1); if (mode.startsWith('online')) setTimeout(() => attivita.requestState(), 1800); },
  onCount: n => ui.setCount(n),
  onPeerJoin: (id, meta, notify) => { addOther(id, meta); if (notify && entered) { ui.toast(`${meta.nick} è arrivato a Luminos`, 'join'); audio.join(); } },
  onPeerUpdate: (id, meta) => {
    const o = others.get(id); if (!o) return;
    if (o.meta.av !== meta.av) {
      const vis = o.av.g.visible, pos = o.av.g.position.clone(), rot = o.av.g.rotation.y, keep = { x: o.x, z: o.z, r: o.r, has: o.has };
      removeOther(id); addOther(id, meta);
      const n = others.get(id); Object.assign(n, keep); n.av.g.position.copy(pos); n.av.g.rotation.y = rot; n.av.g.visible = vis;
    } else { if (o.meta.nick !== meta.nick) o.av.setNick(meta.nick); o.meta = meta; }
  },
  onPeerLeave: (id, meta, silent) => { removeOther(id); if (!silent && entered) { ui.toast(`${meta.nick} è tornato a Marechiaro`, 'leave'); audio.leave(); } },
  onPos: (id, x, z, r, y) => {
    const o = others.get(id); if (!o) return;
    if (!o.has || Math.hypot(x - o.av.g.position.x, z - o.av.g.position.z) > 4) { o.av.g.position.set(x, y, z); o.av.g.rotation.y = r; }
    o.x = x; o.z = z; o.r = r; o.y = y; o.has = true; o.seen = performance.now(); o.av.g.visible = !safety.hidden.has(id) && !safety.hideAll;
  },
  onAct: (id, k, d) => {
    const o = others.get(id); if (!o) return;
    if (k === 'pw') { const quiet = safety.hideAll || safety.hidden.has(id); powers.remote(d.g, o.x, o.y || 0, o.z, d.s, id, quiet); return; }
    if ((safety.mute || safety.hidden.has(id)) && (k === 'gara' && d.c === 'call')) return;
    attivita.onAct(id, k, d, o);
  },
  onSay: (id, e, target) => {
    const o = others.get(id); if (!o || safety.mute || safety.hideAll || safety.hidden.has(id)) return;
    showSay(o.av, e); audio.pop();
    if (target === net.myId) ui.toast(`${o.meta.nick} ti saluta 👋`, 'join');
  },
});

// reazione (emoji) o frase pronta, mostrata sopra un personaggio
function showSay(av, id) {
  const em = EMOTES.find(x => x.id === id);
  if (em) { av.showEmote(em.glyph); if (em.anim) av.play(em.anim); return; }
  const f = FRASI.find(x => x.id === id);
  if (f) { av.say(f.testo, 4500); av.play('hop'); }
}
function say(id, target) {
  audio.unlock();
  if (!net.say(id, target)) return;
  if (viewMode === 'terza') showSay(me, id);
  else { const em = EMOTES.find(x => x.id === id), f = FRASI.find(x => x.id === id); const b = h('div', { class: 'selfemo' + (f ? ' frase' : ''), 'aria-hidden': 'true' }, em ? em.glyph : f.testo); document.body.append(b); setTimeout(() => b.remove(), 1800); }
  audio.pop();
}
ui.emoteBar(say);

// ---------- Interazione con gli oggetti ----------
const promptBtn = $('prompt');
let current = null;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
function use(o) {
  if (!o || (o.enabled && !o.enabled())) return;
  audio.unlock();
  if (o.secret && (!o.canDiscover || o.canDiscover())) secrets.discover(o.secret, tmp.copy(o.pos).setY(o.markerY ?? o.pos.y + 0.4));
  if (o.use) { o.use(); return; }
  audio.open();
  ui.openPanel(o.open(), { label: o.name, onClose: () => audio.close() });
}
promptBtn.onclick = () => use(current);

function pickTarget() {
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), px = player.pos.x, pz = player.pos.z;
  let best = null, bestS = -1;
  for (const o of world.objects) {
    const dx = o.pos.x - px, dz = o.pos.z - pz, dist = Math.hypot(dx, dz);
    const r = o.hidden ? o.radius * 0.8 : o.radius;
    o._near = dist <= r && (!o.enabled || o.enabled());
    if (o.proximity && dist < o.proximity && o.secret && !secrets.has(o.secret) && !riding) use(o);
    if (!o._near) continue;
    const dot = dist > 0.01 ? (dx * fx + dz * fz) / dist : 1;
    const s = dot - dist * 0.12 + (o.hidden ? -0.1 : 0);
    if (dot > 0.15 && s > bestS) { best = o; bestS = s; }
  }
  return best;
}

// Clic/tocco: su un oggetto → ci vai e lo apri; su un visitatore → ci vai e lo saluti; sul terreno → ci vai.
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function onTap(x, y) {
  if (!entered || ui.panelOpen || riding) return;
  audio.unlock();
  let best = null, bestD = isTouch ? 60 : 45;
  const test = (p, item) => { tmp.copy(p).project(camera); if (tmp.z > 1) return; const sx = (tmp.x + 1) / 2 * innerWidth, sy = (1 - tmp.y) / 2 * innerHeight; const d = Math.hypot(sx - x, sy - y); if (d < bestD) { bestD = d; best = item; } };
  for (const o of world.objects) { if ((o.hidden && !o._near && !(o.revealUntil > performance.now() / 1000)) || (o.enabled && !o.enabled())) continue; if (Math.hypot(o.pos.x - player.pos.x, o.pos.z - player.pos.z) > 18) continue; test(tmp2.set(o.pos.x, o.markerY ?? o.pos.y + 0.4, o.pos.z), { o }); }
  for (const [id, o] of others) if (o.av.g.visible) test(tmp2.set(o.av.g.position.x, 1.2, o.av.g.position.z), { id });
  if (best?.o) {
    const o = best.o, d = Math.hypot(o.pos.x - player.pos.x, o.pos.z - player.pos.z);
    if (d <= o.radius * 0.9) { use(o); return; }
    const k = Math.max(0, (d - o.radius * 0.6) / d);
    routeTo(player.pos.x + (o.pos.x - player.pos.x) * k, player.pos.z + (o.pos.z - player.pos.z) * k, () => { player.lookAt(o.pos.x, o.pos.z); use(o); });
    return;
  }
  if (best?.id) { const o = others.get(best.id); if (o) routeTo(o.av.g.position.x + 0.9, o.av.g.position.z + 0.9, () => { player.lookAt(o.av.g.position.x, o.av.g.position.z); say('wave', best.id); }); return; }
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  if (ray.ray.intersectPlane(ground, tmp)) {
    if (Math.hypot(tmp.x - player.pos.x, tmp.z - player.pos.z) > 40) return;
    if (!collider.blocked(tmp.x, tmp.z)) { routeTo(tmp.x, tmp.z); showTapMark(tmp); }
  }
}
const tapMark = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.24, 20), new THREE.MeshBasicMaterial({ color: 0xf5c56b, transparent: true, depthWrite: false }));
tapMark.rotation.x = -Math.PI / 2; tapMark.visible = false; scene.add(tapMark);
let tapT = 0;
function showTapMark(p) { tapMark.position.set(p.x, 0.05, p.z); tapMark.visible = true; tapT = 0.8; }

addEventListener('keydown', e => {
  if (!entered || e.target.tagName === 'INPUT' || ui.panelOpen) return;
  if ((e.code === 'KeyE' || e.code === 'Enter') && current) { e.preventDefault(); use(current); return; }
  if (e.code === 'KeyV') { setView(viewMode === 'terza' ? 'prima' : 'terza'); return; }
  if (e.code === 'KeyM') { toggleAudio(); return; }
  const em = EMOTES.find(x => x.key === e.key); if (em) say(em.id);
});

// ---------- Vista: terza persona (predefinita) o prima persona ----------
function setView(v) {
  viewMode = v; store.set('vista', v);
  $('cross').classList.toggle('third', v === 'terza');
  ui.toast(v === 'terza' ? 'Vista da dietro il personaggio.' : 'Vista in prima persona.');
}
$('cross').classList.toggle('third', viewMode === 'terza');
const camTarget = new THREE.Vector3(), camWant = new THREE.Vector3();
let camDist = 1;
function updateCamera(dt, zona) {
  const p = player.pos, yaw = player.yaw;
  if (viewMode === 'prima' || !entered) {
    camera.position.set(p.x, 1.45 + player.bob, p.z);
    camera.rotation.set(player.pitch, yaw, 0);
    me.g.visible = false;
    return;
  }
  me.g.visible = true;
  const portrait = camera.aspect < 0.85, tight = zona === 'grotta' || zona === 'ponte';
  const pitch = THREE.MathUtils.clamp((portrait ? 0.38 : 0.28) - player.pitch * 0.7, -0.15, 1.05);
  const dist = (portrait ? 4.6 : 3.8) * (tight ? 0.9 : 1);
  camTarget.set(p.x, riding ? 0.9 : 1.25, p.z);
  camWant.set(p.x + Math.sin(yaw) * Math.cos(pitch) * dist, camTarget.y + Math.sin(pitch) * dist, p.z + Math.cos(yaw) * Math.cos(pitch) * dist);
  // nelle Caverne la camera non passa attraverso le pareti di roccia
  let f = 1;
  if (zona === 'grotta' && !riding) for (; f > 0.25; f -= 0.05) { const x = camTarget.x + (camWant.x - camTarget.x) * f, z = camTarget.z + (camWant.z - camTarget.z) * f; if (collider.open(x, z, -0.4)) break; }
  camDist += (f - camDist) * Math.min(1, dt * 10);
  camera.position.lerpVectors(camTarget, camWant, camDist);
  if (camDist < 0.9) camera.position.y += (1 - camDist) * 2.5;
  camera.lookAt(camTarget.x - Math.sin(yaw) * 1.4, camTarget.y + (portrait ? 0.45 : 0.3), camTarget.z - Math.cos(yaw) * 1.4);
}

// ---------- Luoghi: nome, nebbia, suoni ----------
let myZone = 'marechiaro', areaT = 0, ambT = 0, ringT = 0;
const fogCol = new THREE.Color();
function onZoneChange(z, prev) {
  const tag = $('areaTag'); tag.textContent = ZONES[z].nome.toUpperCase(); tag.classList.add('show'); clearTimeout(areaT); areaT = setTimeout(() => tag.classList.remove('show'), 2600);
  if (z === 'ponte' && prev === 'spiaggia') ui.toast('Il ponte di luce non è solido come pietra, eppure regge. Guarda sotto i tuoi passi.');
  net.updateMe({ zona: z });
  secrets.setDove(ZONES[z].nome); secrets.luogo(z);
  if (z === 'percorso' && prev === 'spiaggia' && !secrets.hasBadge('ponte')) ui.toast('Il ponte sospeso: salta da una piattaforma all\'altra (barra spaziatrice o ⤒).');
}


// ---------- Viaggi: la barca, l'arco di luce ----------
let riding = null, race = null;
const fade = h('div', { id: 'fade', 'aria-hidden': 'true' }); document.body.append(fade);
function fadeTo(mid, color = '#ffffff') {
  fade.style.background = color; fade.classList.add('on');
  setTimeout(() => { mid(); setTimeout(() => fade.classList.remove('on'), 120); }, 650);
}
function takeStone(id) {
  ui.closePanel();
  secrets.badge('pietra');
  if (myChoice.av !== id) setGuardian(id); else { me.play('party'); ui.toast(`La pietra ti riconosce, ${AVATARS.find(a => a.id === id).nome}.`); }
  if (!world.archOpen) { world.openArch(); audio.light(); setTimeout(() => ui.toast('La superficie del lago si solleva in un arco di luce. Oltre l\'arco c\'è una spiaggia bianca, sotto due soli.'), 900); }
}
// la traversata: da Marechiaro si esce in barca, si gira al largo e si doppia il promontorio
const RIDE = [[2.75, 3.2], [3.5, -8], [9, -24], [24, -40], [44, -50], [64, -52]];
function travel(where) {
  ui.closePanel(); race = null;
  if (where === 'grotta') {
    const b = world.marcoBoat; b.riding = true;
    riding = { t: 0, dur: 9, b, dolT: 0 };
    me.setSeated(true);
    ui.toast('Prendete il mare. Marco segue la costa: le correnti le sente nei remi.');
    return;
  }
  if (where === 'luminos') {
    audio.light();
    fadeTo(() => { const q = world.points.luminos; player.teleport(q.x, q.z, q.yaw); setTimeout(() => ui.toast('Non è sabbia: sono granelli di sale che brillano di luce propria. E davanti, dove dovrebbe esserci il mare, c\'è il cielo.'), 400); }, '#fff6e0');
    return;
  }
  if (where === 'grottaDaLuminos') { world.openArch(); fadeTo(() => { const q = world.points.grottaDaLuminos; player.teleport(q.x, q.z, q.yaw); }, '#fff6e0'); return; }
  if (where.startsWith('cammino-')) { const id = where.slice(8), q = luoghi.spawn(id); audio.light(); fadeTo(() => { player.teleport(q.x, q.z, q.yaw); setTimeout(() => luoghi.arrivo(id), 500); }, '#fff6e0'); return; }
  if (where === 'belvedere') { fadeTo(() => player.teleport(439, 21.8, Math.PI), '#fff6e0'); return; }
  if (where === 'marechiaro') { fadeTo(() => { const q = world.points.marechiaro; player.teleport(q.x, q.z, q.yaw); ui.toast('«Buona marea», dice Tonino, come dice a chiunque torni dal mare.'); }, '#e8f4ff'); }
}
function ridePoint(k, out) {
  const n = RIDE.length - 1, f = Math.min(n - 0.0001, k * n), i = Math.floor(f), u = f - i;
  out.x = RIDE[i][0] + (RIDE[i + 1][0] - RIDE[i][0]) * u; out.z = RIDE[i][1] + (RIDE[i + 1][1] - RIDE[i][1]) * u; return out;
}
const _rp = { x: 0, z: 0 }, _rq = { x: 0, z: 0 };
function rideStep(dt, time) {
  const r = riding; r.t += dt; const k = Math.min(1, r.t / r.dur), e = k * k * (3 - 2 * k);
  ridePoint(e, _rp); ridePoint(Math.min(1, e + 0.02), _rq);
  const yaw = Math.atan2(-(_rq.x - _rp.x), -(_rq.z - _rp.z));
  r.b.g.position.set(_rp.x, -0.3 + Math.sin(time * 2) * 0.06, _rp.z); r.b.g.rotation.set(0, yaw, Math.sin(time * 1.6) * 0.05);
  player.teleport(_rp.x, _rp.z, yaw); player.look(yaw, -0.15);
  // i delfini, accanto alla barca
  world.dolphins.forEach((d, i) => {
    const ph = (time * 0.9 + i * 0.6) % 2.4, j = ph < 1.2 ? Math.sin(ph / 1.2 * Math.PI) : -1;
    d.visible = k > 0.25 && k < 0.85;
    d.position.set(_rp.x + Math.cos(yaw) * (2.4 + i * 0.8) * (i % 2 ? 1 : -1) - Math.sin(yaw) * (i * 1.4 - 1), -0.5 + j * 1.3, _rp.z - Math.sin(yaw) * (2.4 + i * 0.8) * (i % 2 ? 1 : -1) - Math.cos(yaw) * (i * 1.4 - 1));
    d.rotation.set(-Math.cos(ph / 1.2 * Math.PI) * 0.9, yaw, 0);
  });
  if (k > 0.45 && !r.dol) { r.dol = true; secrets.discover('delfini', tmp.set(_rp.x, 1, _rp.z)); ui.toast('«Tursiopi», dice Giulia. Luca chiude gli occhi e sorride: «Sono felici. Dicono che oggi è un giorno speciale.»'); }
  if (k >= 1 && !r.done) {
    r.done = true;
    fadeTo(() => {
      world.dolphins.forEach(d => { d.visible = false; });
      r.b.riding = false; r.b.g.position.set(2.75, -0.3, 3.2); r.b.g.rotation.set(0, 0, 0);
      riding = null; me.setSeated(false);
      const q = world.points.grotta; player.teleport(q.x, q.z, q.yaw);
      ui.toast('Doppiato il promontorio, la Grotta dei Sussurri compare alla base della scogliera: un\'apertura bassa e nera nella roccia.');
    }, '#e8f4ff');
  }
}
// ---------- Pannelli dal menu ----------
function toggleAudio() { const on = audio.toggle(); audio.unlock(); ui.toast(on ? 'Suoni attivi.' : 'Suoni disattivati.'); return on; }
function teleportNear(o) {
  const dirs = [[player.pos.x - o.pos.x, player.pos.z - o.pos.z], [0, 1], [1, 0], [-1, 0], [0, -1]];
  for (const [dx, dz] of dirs) {
    const l = Math.hypot(dx, dz) || 1;
    for (const r of [1.2, 1.6, 2.0]) { const x = o.pos.x + dx / l * r, z = o.pos.z + dz / l * r; if (!collider.blocked(x, z)) { player.teleport(x, z); player.lookAt(o.pos.x, o.pos.z); return; } }
  }
}
const LUOGHI = ['marechiaro', 'grotta', 'lago', 'spiaggia', 'giardini', 'arena', 'belvedere'];
function listPanel() {
  const items = world.objects.filter(o => !o.hidden || (o.secret && secrets.has(o.secret)));
  const group = (z) => { const arr = items.filter(o => zoneOf(o.pos.x, o.pos.z) === z); return arr.length ? [h('h3', { style: 'margin-top:14px' }, ZONES[z].nome), h('ul', { class: 'list' }, ...arr.map(o => h('li', {}, h('button', { type: 'button', onclick: () => { ui.closePanel(); teleportNear(o); use(o); } }, h('b', {}, o.name), o.desc))))] : []; };
  ui.openPanel([h('h2', {}, 'Elenco dei luoghi'),
    h('p', { class: 'muted' }, 'Una versione senza 3D: scegli un oggetto e lo apro per te (e ti porto lì davanti).'),
    ...LUOGHI.flatMap(group)], { label: 'Elenco dei luoghi' });
}
function whoPanel() {
  const zn = z => ZONES[z]?.nome || '';
  const rows = [h('div', { class: 'who' }, h('i', { style: `background:${colOf(myChoice.av)}` }), `${myChoice.nick} (tu)`, h('span', { class: 'muted', style: 'margin-left:auto' }, zn(myZone)))];
  for (const [id, o] of others) {
    const hid = safety.hidden.has(id);
    rows.push(h('div', { class: 'who' }, h('i', { style: `background:${o.meta.col}` }), h('span', {}, o.meta.nick, h('br'), h('small', { class: 'muted' }, `${AVATARS.find(a => a.id === o.meta.av)?.nome || ''} · ${zn(o.meta.zona)}`)),
      h('span', { class: 'acts' },
        hid ? null : h('button', { type: 'button', 'aria-label': `Saluta ${o.meta.nick}`, onclick: () => { say('wave', id); ui.toast(`Hai salutato ${o.meta.nick} 👋`); } }, '👋'),
        hid ? null : h('button', { type: 'button', onclick: () => { ui.closePanel(); routeTo(o.x + 0.9, o.z + 0.9, () => player.lookAt(o.x, o.z)); } }, 'Raggiungi'),
        h('button', { type: 'button', onclick: () => { if (hid) safety.hidden.delete(id); else safety.hidden.add(id); whoPanel(); } }, hid ? 'Mostra' : 'Nascondi'),
        h('button', { type: 'button', class: 'warn', onclick: () => reportPanel(id) }, 'Segnala'))));
  }
  const m = net.mode;
  ui.openPanel([h('h2', {}, 'Chi è a Luminos'),
    h('p', { class: 'muted' }, m === 'online' || m === 'online-pubblico' ? `${others.size + 1} ${others.size ? 'Guardiani' : 'Guardiano'} nel mondo in questo momento.` : 'Il multiplayer non è attivo: vedi solo te stesso.'),
    ...rows,
    h('p', { class: 'muted', style: 'margin-top:12px;font-size:14px' }, 'A Luminos non c\'è una chat: ci si parla con reazioni e frasi già pronte. Nessuno può scriverti messaggi. "Nascondi" vale solo per te: quel Guardiano sparisce dal tuo schermo.'),
    h('div', { class: 'menu', style: 'margin-top:8px' },
      h('button', { type: 'button', onclick: () => { safety.hideAll = !safety.hideAll; store.set('nascondi', safety.hideAll ? '1' : '0'); ui.toast(safety.hideAll ? 'Gli altri Guardiani sono nascosti.' : 'Vedi di nuovo gli altri Guardiani.'); whoPanel(); } }, safety.hideAll ? '🙈 Altri Guardiani: nascosti' : '👀 Altri Guardiani: visibili', h('small', {}, 'tocca per cambiare')),
      h('button', { type: 'button', onclick: () => { safety.mute = !safety.mute; attivita.mute = safety.mute; store.set('muto', safety.mute ? '1' : '0'); ui.toast(safety.mute ? 'Reazioni e inviti degli altri: spenti.' : 'Reazioni e inviti degli altri: accesi.'); whoPanel(); } }, safety.mute ? '🔕 Reazioni e inviti: spenti' : '🔔 Reazioni e inviti: accesi', h('small', {}, 'saluti, frasi e inviti alle gare')),
      h('button', { type: 'button', onclick: exitNow }, '🚪 Esci subito', h('small', {}, 'nessuno ti vede più')))], { label: 'Chi è online' });
}
// segnalazione: un motivo da un elenco, niente testo libero. Il Guardiano segnalato sparisce subito dal tuo schermo.
function reportPanel(id) {
  const o = others.get(id); if (!o) return;
  const send = async motivo => {
    safety.hidden.add(id); ui.closePanel();
    const ok = await net.report(o.meta.nick, motivo, myZone);
    ui.toast(ok ? `Segnalazione inviata. Non vedrai più ${o.meta.nick}.` : `Non è stato possibile inviare la segnalazione, ma ${o.meta.nick} è nascosto per te.`);
  };
  ui.openPanel([h('h2', {}, `Segnala ${o.meta.nick}`), h('p', {}, 'Che cosa è successo?'),
    h('div', { class: 'menu' }, ...[['gesti', 'Reazioni o frasi usate per dare fastidio'], ['disturbo', 'Mi segue o mi blocca la strada'], ['nome', 'Il comportamento non va bene per questo mondo'], ['altro', 'Altro']].map(([k, t]) => h('button', { type: 'button', onclick: () => send(k) }, t))),
    h('p', { class: 'muted', style: 'margin-top:10px' }, 'La segnalazione è anonima: contiene solo il nome di Luminos del Guardiano, il motivo e il luogo. Se qualcosa ti ha fatto stare male, parlane con un adulto.')], { label: 'Segnala' });
}
// uscita rapida: si chiude la connessione e nessuno ti vede più
async function exitNow() {
  ui.closePanel(); entered = false; player.enabled = false;
  try { await net.close(); } catch (e) {}
  document.body.append(h('div', { id: 'uscita' }, h('div', {}, h('h2', {}, 'Sei uscito da Luminos'), h('p', {}, 'Nessuno ti vede più. Il tuo taccuino resta salvato in questo browser.'),
    h('button', { class: 'go', type: 'button', onclick: () => location.reload() }, 'Rientra'))));
}
function guardianPanel() {
  ui.openPanel([h('h2', {}, 'Il tuo Guardiano'),
    h('p', {}, `Il tuo nome a Luminos è ${myChoice.nick}.`),
    h('div', { class: 'menu' }, ...AVATARS.map(a => h('button', { type: 'button', onclick: () => { ui.closePanel(); setGuardian(a.id); } },
      h('span', { style: `color:${a.col}` }, '● '), a.nome, h('small', {}, `pietra ${a.pietra} · ${a.dono}`)))),
    h('p', {}, { marco: '💧 ', sophia: '☀️ ', giulia: '📜 ', luca: '🌿 ' }[myChoice.av], testo('potere-' + myChoice.av)),
    h('p', { class: 'muted', style: 'margin-top:12px' }, 'Puoi cambiare Guardiano quando vuoi: serve anche per gli enigmi che chiedono più doni. La scelta resta salvata solo in questo browser.')], { label: 'Il tuo Guardiano' });
}
function openTaccuino() { secrets.tut('taccuino'); tutorial.refresh(); ui.openPanel(secrets.panel(), { label: 'Taccuino' }); }
// il libro: copertina, presentazione, età, acquisto, estratto, social e parola segreta del libro
function libroPanel() {
  const social = [['Instagram', data.instagram], ['Facebook', data.facebook], ['TikTok', data.tiktok], ['Threads', data.threads]].filter(x => x[1]);
  const inp = h('input', { type: 'text', maxlength: '24', autocomplete: 'off', placeholder: 'una parola', 'aria-label': 'Parola segreta del libro' });
  return [...world.bookPanel(),
    data.acquisto ? h('p', {}, h('a', { class: 'btn', href: data.acquisto, target: '_blank', rel: 'noopener' }, 'Compra l\'ebook su Amazon')) : null,
    data.estratto ? h('p', {}, h('a', { href: data.estratto, target: '_blank', rel: 'noopener', style: 'color:#f5c56b' }, 'Leggi un estratto gratuito')) : null,
    social.length ? h('p', { class: 'muted' }, 'Canali ufficiali (per adulti): ', ...social.flatMap(([n, u], i) => [i ? ' · ' : '', h('a', { href: u, target: '_blank', rel: 'noopener', style: 'color:#f5c56b' }, n)])) : null,
    Array.isArray(data.parole) && data.parole.length ? h('div', { class: 'parola' }, h('h3', {}, 'Hai il libro?'), h('p', { class: 'muted' }, 'Tra le pagine ci sono parole che aprono sorprese qui a Luminos. La parola non lascia il tuo dispositivo.'),
      h('form', { onsubmit: async e => { e.preventDefault(); const ok = await secrets.parola(inp.value, data.parole); inp.value = ''; if (ok) { secrets.badge('lettore'); ui.toast('📖 Parola giusta! Il taccuino ha un nuovo distintivo.'); } else ui.toast('Non è una delle parole nascoste. Riprova.'); } }, inp, h('button', { class: 'btn', type: 'submit' }, 'Prova'))) : null];
}
function menuPanel() {
  const b = (label, sub, fn) => h('button', { type: 'button', onclick: fn }, label, h('small', {}, sub));
  ui.openPanel([h('h2', {}, 'Menu'),
    h('div', { class: 'menu' },
      b('🧍 Il tuo Guardiano', 'Marco, Sophia, Giulia o Luca', guardianPanel),
      b('📓 Taccuino', `${secrets.count}/${secrets.total} segreti · mappa, rune, creature`, openTaccuino),
      b('📖 Il libro', 'presentazione, uscita e iscrizione', () => ui.openPanel(libroPanel(), { label: 'Il libro' })),
      b('👥 Chi è a Luminos', 'saluta, nascondi, segnala', whoPanel),
      b('☰ Elenco dei luoghi', 'tutto il mondo, senza 3D', listPanel),
      b('🧭 Primi passi', 'rivedi la guida iniziale', () => { ui.closePanel(); tutorial.show(true); }),
      b(viewMode === 'terza' ? '🎥 Vista: da dietro' : '👁 Vista: prima persona', 'tocca per cambiare (tasto V)', () => { setView(viewMode === 'terza' ? 'prima' : 'terza'); ui.closePanel(); }),
      b(audio.enabled ? '🔊 Suoni: attivi' : '🔇 Suoni: spenti', 'molto discreti (tasto M)', () => { toggleAudio(); ui.closePanel(); }),
      b(audio.musicOn ? '🎵 Musica: attiva' : '🎵 Musica: spenta', 'sottofondo leggero, diverso in ogni luogo', () => { const on = audio.toggleMusic(); audio.unlock(); ui.toast(on ? 'Musica attiva.' : 'Musica spenta.'); ui.closePanel(); }),
      b(fx.quality === 'bassa' ? '🪶 Grafica: leggera' : '✨ Grafica: ' + fx.quality, 'per telefoni più lenti scegli leggera', () => { const q = fx.quality === 'alta' ? 'media' : fx.quality === 'media' ? 'bassa' : (isTouch ? 'media' : 'alta'); fx.setQuality(q); store.set('grafica', q); ui.toast('Grafica: ' + q + '.'); ui.closePanel(); }),
      b('⚓ Torna al molo', 'riparti da Marechiaro', () => { ui.closePanel(); fadeTo(() => player.teleport(world.spawn.x, world.spawn.z, world.spawn.yaw)); }),
      b('🚪 Esci', 'chiudi la connessione: nessuno ti vede più', exitNow)),
    h('p', { class: 'muted', style: 'margin-top:14px' }, isTouch
      ? 'Comandi: joystick per camminare, trascina per girarti, tocca un punto o un oggetto per andarci, pulsante dorato per aprire, pulsante colorato per usare la pietra, ⤒ per saltare.'
      : 'Comandi: WASD per camminare (Maiusc per correre), trascina o frecce per girarti, clic su un punto per andarci, E per aprire, F per usare la pietra, Spazio per saltare, 1–5 reazioni, V vista, M suoni, Esc chiude.')], { label: 'Menu' });
}
$('menuBtn').onclick = menuPanel;
$('countBtn').onclick = whoPanel;
$('secretsBtn').onclick = openTaccuino;

// ---------- La pietra (potere) e il salto ----------
const powerBtn = $('powerBtn'), jumpBtn = $('jumpBtn');
function usePower() { if (!entered || riding || ui.panelOpen) return; audio.unlock(); me.play('hop'); powers.use(myChoice.av, player.pos, player.y, (g, s) => net.act('pw', s ? { g, s } : { g })); }
function paintPower() { const a = AVATARS.find(x => x.id === myChoice.av); powerBtn.style.setProperty('--c', a.col); powerBtn.setAttribute('aria-label', `Usa la pietra ${a.pietra}: ${a.dono}`); powerBtn.title = `${a.dono} (F)`; }
powerBtn.onclick = usePower;
jumpBtn.onclick = () => { if (entered && !ui.panelOpen) player.jump(); };
if (isTouch) jumpBtn.hidden = false;
addEventListener('keydown', e => { if (e.code === 'KeyF' && entered && !ui.panelOpen && e.target.tagName !== 'INPUT') usePower(); });
paintPower();

// ---------- Primi passi: cinque azioni, senza muri di testo ----------
tutorial = (() => {
  const box = $('tut'), steps = [
    ['guardiano', 'Scegli il tuo Guardiano', 'Fatto!'],
    ['muovi', 'Impara a muoverti', isTouch ? 'Usa il joystick in basso a sinistra, o tocca un punto per andarci.' : 'Usa WASD o le frecce, oppure fai clic su un punto. Spazio per saltare.'],
    ['segreto', 'Scopri il primo segreto', 'Cerca il rombo dorato: c\'è qualcosa vicino al molo.'],
    ['abitante', 'Incontra un abitante', 'Avvicinati a qualcuno sulla banchina: Tonino, Donna Rosa, il pescatore…'],
    ['taccuino', 'Apri il taccuino', 'Il pulsante 📓 in alto a sinistra: lì trovi la mappa e il prossimo indizio.'],
  ];
  let moved = 0, start = null, forced = false;
  function refresh() {
    if (secrets.count > 0) secrets.tut('segreto');
    const done = steps.filter(s => secrets.hasTut(s[0])).length;
    if (done >= steps.length && !forced) { box.hidden = true; return; }
    const cur = steps.find(s => !secrets.hasTut(s[0])) || steps[steps.length - 1];
    box.replaceChildren(h('button', { type: 'button', class: 'x', 'aria-label': 'Chiudi la guida', onclick: () => { box.hidden = true; forced = false; store.set('tutChiuso', '1'); } }, '✕'),
      h('small', {}, `PRIMI PASSI · ${done}/${steps.length}`), h('b', {}, cur[1]), h('span', {}, cur[2]),
      h('div', { class: 'dots' }, ...steps.map(s => h('i', { class: secrets.hasTut(s[0]) ? 'ok' : '' }))));
    box.hidden = !forced && store.get('tutChiuso', '0') === '1';
  }
  return {
    refresh,
    show(f) { forced = !!f; store.set('tutChiuso', '0'); refresh(); box.hidden = false; },
    tick(dt, zona) {
      if (!start) { start = { x: player.pos.x, z: player.pos.z }; secrets.tut('guardiano'); refresh(); }
      if (!secrets.hasTut('muovi')) { moved = Math.hypot(player.pos.x - start.x, player.pos.z - start.z); if (moved > 3) { secrets.tut('muovi'); refresh(); } }
      if (!secrets.hasTut('abitante') && attivita.nearAbitante(player.pos.x, player.pos.z)) { secrets.tut('abitante'); refresh(); }
    },
  };
})();

// ---------- Ciclo principale ----------
let entered = false;
let last = performance.now(), slowFrames = 0, manual = false, manualTime = 0;
function frame(t) {
  if (manual) { requestAnimationFrame(frame); return; }
  const dt = Math.min((t - last) / 1000, 0.05); last = t;
  tick(dt, t / 1000);
  requestAnimationFrame(frame);
}
function tick(dt, time) {
  player.enabled = entered && !ui.panelOpen && !riding;
  if (riding) rideStep(dt, time);
  const mySpeed = player.update(dt);
  const p = player.pos;
  const zona = zoneOf(p.x, p.z);
  if (zona !== myZone) { const prev = myZone; myZone = zona; if (entered) onZoneChange(zona, prev); }
  if (entered) net.sendPos(p.x, p.z, player.yaw, false, player.y);

  me.g.position.set(p.x, player.y, p.z); me.g.rotation.y = player.yaw;
  me.update(dt, mySpeed, time);

  const k = 1 - Math.exp(-dt * 10);
  for (const [id, o] of others) {
    const g = o.av.g;
    if (!o.has) continue;
    const px = g.position.x, pz = g.position.z;
    g.position.x += (o.x - px) * k; g.position.z += (o.z - pz) * k; g.position.y += ((o.y || 0) - g.position.y) * k;
    let dr = o.r - g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); g.rotation.y += dr * k;
    const dMe = Math.hypot(g.position.x - p.x, g.position.z - p.z);
    g.visible = dMe < 50 && !safety.hideAll && !safety.hidden.has(id);
    if (g.visible) o.av.update(dt, Math.hypot(g.position.x - px, g.position.z - pz) / Math.max(dt, 1e-3), time);
    if (entered && g.visible && dMe < 1.7 && time - o.metT > 40) { o.metT = time; o.av.play('meet'); if (viewMode === 'terza') me.play('meet'); }
    if (performance.now() - o.seen > NET.staleMs * 5 && !net.peers.has(id)) removeOther(id);
  }

  const target = entered && !ui.panelOpen ? pickTarget() : null;
  for (const o of world.objects) {
    const revealed = o.revealUntil > time && (!o.secret || !secrets.has(o.secret));
    const show = entered && ((o._near && (!o.hidden || o === target)) || revealed) && (!o.enabled || o.enabled());
    o.marker.visible = show;
    if (show) { o.marker.position.set(o.pos.x, (o.markerY ?? o.pos.y + 0.55) + Math.sin(time * 3) * 0.04, o.pos.z); o.marker.rotation.y = time * 1.5; o.marker.scale.setScalar(o === target ? 1.4 : 0.8); }
  }
  if (target !== current) { current = target; promptBtn.hidden = !target; if (target) promptBtn.textContent = (isTouch ? 'Tocca: ' : 'E · ') + target.name; }

  const reg = regionOf(p.x);
  world.setRegion(reg, p.z); luoghi.setRegion(reg);
  world.update(time, dt, { zona, me: p });
  attivita.update(time, dt); powers.update(dt);
  if (entered) tutorial.tick(dt, zona);
  // ponti di luce e lago: sotto i passi si allarga una piccola onda di colore
  ringT -= dt;
  if ((zona === 'ponte' || zona === 'lago') && mySpeed > 0.3 && ringT <= 0 && !riding) { ringT = 0.32; world.footRing(p.x, p.z, colOf(myChoice.av)); }
  secrets.update(dt);
  if (tapT > 0) { tapT -= dt; tapMark.scale.setScalar(1 + (0.8 - tapT)); tapMark.material.opacity = tapT; if (tapT <= 0) tapMark.visible = false; }

  // nebbia secondo il luogo
  const F = luoghi.fogFor(zona) || world.fogFor(zona, p.z), a = Math.min(1, dt * 2.5);
  scene.fog.color.lerp(fogCol.setHex(F.c), a); scene.fog.near += (F.near - scene.fog.near) * a; scene.fog.far += (F.far - scene.fog.far) * a; scene.background.copy(scene.fog.color);
  ambT -= dt;
  if (ambT <= 0) { ambT = 0.25; const amb = zona === 'marechiaro' || zona === 'scogli' || (zona === 'grotta' && p.z > 15.5) ? 'molo' : zona === 'grotta' || zona === 'lago' || zona === 'sala' ? 'caverne' : zona === 'selva' || zona === 'monte' || zona === 'risacca' ? zona : 'piazza'; audio.ambient(0.25, { area: amb, acqua: 0, t: time }); if (entered || cinema) audio.music(zona === 'marechiaro' || zona === 'scogli' || (zona === 'grotta' && p.z > 15.5) ? 'marechiaro' : zona === 'grotta' ? (p.z > 4.5 ? null : 'grotta') : zona === 'lago' || zona === 'sala' ? 'grotta' : 'luminos', world.night); }

  if (cinema) cinema(dt); else updateCamera(dt, zona);
  if (window.__lu?.camHook) window.__lu.camHook(camera, time, dt); // riprese dei video
  if (!manual && dt > 0.034) { if (++slowFrames > 90 && pixelRatio > 0.75) { pixelRatio = Math.max(0.75, pixelRatio - 0.25); renderer.setPixelRatio(pixelRatio); renderer.setSize(innerWidth, innerHeight, false); fx.resize(); slowFrames = 0; } }
  else slowFrames = Math.max(0, slowFrames - 1);
  fx.render(dt, p, luoghi.groupOf(reg) || world.groupOf(reg));
}
requestAnimationFrame(frame);

// ---------- Conto alla rovescia nell'intro ----------
{
  const u = data.uscita && /^\d{4}-\d{2}-\d{2}$/.test(data.uscita) ? new Date(data.uscita + 'T00:00:00') : null;
  const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const g = u ? Math.max(0, Math.round((u - today) / 86400000)) : null;
  $('introCount').textContent = data.acquisto ? 'L\'ebook è disponibile su Amazon. Il cartaceo arriva presto.' : g != null ? (g === 0 ? 'Il libro esce oggi!' : `Mancano ${g} ${g === 1 ? 'giorno' : 'giorni'} all'uscita del libro.`) : `Uscita: ${data.periodo || 'presto'}.`;
  $('introSignup').onclick = () => ui.openPanel(world.signupPanel(), { label: 'Avvisami quando esce' });
  if (data.acquisto) {
    $('introSignup').textContent = 'Avvisami quando esce il cartaceo';
    $('introCount').append(' ', h('a', { href: data.acquisto, target: '_blank', rel: 'noopener', style: 'color:#f5c56b' }, 'Vai all\'ebook'));
  }
}

// ---------- Volo d'apertura su Marechiaro (si salta toccando lo schermo) ----------
let cinema = null;
function flyover() {
  if (reduceMotion || new URLSearchParams(location.search).has('nofly')) return Promise.resolve();
  return new Promise(done => {
    const P = [[-26, 16, -46], [-6, 9, -22], [9, 5.5, -4], [4, 3.6, 8.5], [0, 2.9, 20.4]].map(a => new THREE.Vector3(...a));
    const L = [[0, 10, 34], [0, 6, 26], [2, 2, 12], [0, 1.4, 14], [0, 1.3, 14]].map(a => new THREE.Vector3(...a));
    const cp = new THREE.CatmullRomCurve3(P), cl = new THREE.CatmullRomCurve3(L), look = new THREE.Vector3(), D = 8.5;
    const card = h('div', { class: 'cine' }, h('div', { class: 'cine-t' }, 'Marechiaro'), h('div', { class: 'cine-s' }, 'A Marechiaro, ad agosto, il mare brilla così forte che bisogna guardarlo con gli occhi socchiusi.'), h('div', { class: 'cine-k' }, isTouch ? 'tocca per saltare' : 'clic o spazio per saltare'));
    document.body.appendChild(card); requestAnimationFrame(() => card.classList.add('on'));
    let t = 0;
    const end = () => { if (!cinema) return; cinema = null; card.classList.remove('on'); setTimeout(() => card.remove(), 900); removeEventListener('pointerdown', end, true); removeEventListener('keydown', end, true); done(); };
    addEventListener('pointerdown', end, true); addEventListener('keydown', end, true);
    me.g.visible = false;
    cinema = dt => { t += dt; const u = Math.min(1, t / D), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      camera.position.copy(cp.getPoint(e)); camera.lookAt(look.copy(cl.getPoint(e))); if (u > 0.82) card.classList.remove('on'); if (u >= 1) end(); };
  });
}

// ---------- Entrata ----------
const choice = await ui.intro(myChoice, previewRenderer);
myChoice = choice;
store.set('nick', choice.nick); store.set('av', choice.av);
buildMe();
audio.unlock();
await flyover();
entered = true;
$('secretsBtn').hidden = false; powerBtn.hidden = false;
attivita.mute = safety.mute;
secrets.setDove(ZONES[myZone]?.nome || ''); secrets.luogo(myZone);
tutorial.refresh();
// arrivo dal QR code stampato nel libro: un piccolo benvenuto e un distintivo (nessun dato raccolto)
if (new URLSearchParams(location.search).get('da') === 'libro') setTimeout(() => { secrets.badge('lettore'); ui.toast('📖 Benvenuto dal libro! Le pagine continuano qui.'); }, 2500);
audio.unlock();
net.start({ nick: choice.nick, av: choice.av, zona: myZone });
ui.toast(`Benvenuto a Marechiaro, ${choice.nick}. Il rombo dorato indica che puoi interagire. La barca di Marco è legata al molo.`);
setTimeout(() => { $('help').style.opacity = 0; }, 14000);

// Per i test automatici e le riprese dei video (nessun dato sensibile).
window.__lu = { fx, camera, player, world, net, others, ui, use, secrets, collider, setView, routeTo, onTap, scene, renderer, me: () => me, travel, takeStone, attivita, powers, luoghi, get riding() { return riding; },
  enter() { entered = true; }, step(dt) { manual = true; manualTime += dt; tick(dt, manualTime); } };
