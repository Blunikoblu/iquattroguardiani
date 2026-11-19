// I poteri delle quattro pietre. Ogni Guardiano ha il suo dono, come nel libro:
//   Marco · il Flusso (acqua e correnti)   Sophia · la Luce (illumina, risveglia i cristalli, rivela)
//   Giulia · la Memoria (legge rune e segni) Luca · la Natura (animali e piante)
// Un potere si usa con il pulsante della pietra (tasto F). Agisce sui "punti" vicini registrati dai luoghi
// e dalle attività (spot). Gli altri visitatori vedono l'effetto; i punti condivisi si attivano per tutti.
import * as THREE from 'three';
import { testo } from './testi.js?v=202611191625';

const COL = { marco: 0x3f8cff, sophia: 0xfff2c8, giulia: 0xd89a52, luca: 0x5fd06e };

export function createPowers({ scene, ui, audio, diario }) {
  const spots = [];
  let cool = 0, hintT = 0;

  // --- effetti visivi (riutilizzati) ---
  const fxs = [];
  const ringGeo = new THREE.RingGeometry(0.6, 0.75, 40).rotateX(-Math.PI / 2);
  const sphGeo = new THREE.SphereGeometry(1, 20, 14);
  const leafGeo = new THREE.PlaneGeometry(0.12, 0.07);
  function effect(g, x, y, z) {
    const c = new THREE.Color(COL[g] || 0xffffff);
    const grp = new THREE.Group(); grp.position.set(x, y, z); scene.add(grp);
    const add = (geo, op = 0.9, k = 3) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(k), transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); grp.add(m); return m; };
    const parts = [];
    if (g === 'marco') { for (let i = 0; i < 3; i++) { const r = add(ringGeo, 0.8, 2.4); r.position.y = 0.06; r.userData.d = i * 0.18; parts.push(r); } }
    if (g === 'sophia') { const s = add(sphGeo, 0.5, 3.6); s.position.y = 1.0; parts.push(s); const l = new THREE.PointLight(0xfff0c8, 0, 12, 1.5); l.position.y = 1.4; grp.add(l); grp.userData.light = l; }
    if (g === 'giulia') { for (let i = 0; i < 6; i++) { const r = add(ringGeo, 0.7, 2.2); r.scale.setScalar(0.25); r.rotation.x = Math.PI / 2; r.position.set(Math.cos(i) * 0.6, 0.8, Math.sin(i) * 0.6); r.userData.a = i; parts.push(r); } }
    if (g === 'luca') { for (let i = 0; i < 18; i++) { const l = add(leafGeo, 0.95, 1.6); l.userData.a = i / 18 * Math.PI * 2; l.userData.r = 0.4 + (i % 3) * 0.25; parts.push(l); } }
    fxs.push({ g, grp, parts, t: 0, dur: g === 'sophia' ? 1.3 : 1.6 });
    if (fxs.length > 12) { const o = fxs.shift(); scene.remove(o.grp); }
  }
  function updateFx(dt) {
    for (let i = fxs.length - 1; i >= 0; i--) {
      const f = fxs[i]; f.t += dt; const k = f.t / f.dur;
      if (k >= 1) { scene.remove(f.grp); f.grp.traverse(o => o.material?.dispose?.()); fxs.splice(i, 1); continue; }
      if (f.g === 'marco') f.parts.forEach(r => { const u = Math.max(0, k - r.userData.d); r.scale.setScalar(0.3 + u * 6); r.material.opacity = Math.max(0, 0.8 - u * 1.1); });
      if (f.g === 'sophia') { const s = f.parts[0]; s.scale.setScalar(0.3 + k * 7); s.material.opacity = 0.5 * (1 - k); f.grp.userData.light.intensity = 30 * Math.sin(k * Math.PI); }
      if (f.g === 'giulia') f.parts.forEach(r => { const a = r.userData.a + k * 4; r.position.set(Math.cos(a) * (0.6 + k), 0.8 + k * 1.6, Math.sin(a) * (0.6 + k)); r.material.opacity = 0.7 * (1 - k); });
      if (f.g === 'luca') f.parts.forEach(l => { const a = l.userData.a + k * 5, r = l.userData.r + k * 1.4; l.position.set(Math.cos(a) * r, 0.3 + k * 2.2 + Math.sin(a * 2) * 0.2, Math.sin(a) * r); l.rotation.set(a, a * 2, 0); l.material.opacity = 0.95 * (1 - k); });
    }
  }

  return {
    // registra un punto su cui i poteri agiscono.
    // { id, x, z, r, who: ['marco', ...] | null (tutti), shared: bool, act(g, local, by) => true se qualcosa è successo, hint(g) => testo }
    spot(s) { spots.push(s); return s; },
    spots,
    effect,
    // uso locale del potere
    use(g, pos, y = 0, send) {
      if (cool > 0) return; cool = 1.1;
      audio.unlock?.(); audio.power?.(g);
      effect(g, pos.x, y, pos.z);
      diario.potere(g);
      let done = false, sharedId = null, wrong = null;
      for (const s of spots) {
        if (s.enabled && !s.enabled()) continue;
        if (Math.hypot(s.x - pos.x, s.z - pos.z) > s.r) continue;
        if (s.who && !s.who.includes(g)) { if (s.hint && !wrong) wrong = s; continue; }
        if (s.act(g, true)) { done = true; if (s.shared) sharedId = s.id; }
      }
      send?.(g, sharedId);
      if (!done) {
        if (wrong?.hint) ui.toast(wrong.hint(g));
        else if (performance.now() - hintT > 15000) { hintT = performance.now(); ui.toast(testo('potere-nulla')); }
      }
      return done;
    },
    // potere usato da un altro visitatore: effetto visivo e, se indica un punto condiviso, lo attiva anche qui
    remote(g, x, y, z, spotId, by, quiet) {
      if (!quiet) effect(g, x, y, z);
      if (!spotId) return;
      const s = spots.find(o => o.id === spotId && o.shared);
      if (s && Math.hypot(s.x - x, s.z - z) <= s.r + 1.5 && (!s.who || s.who.includes(g))) s.act(g, false, by);
    },
    update(dt) { cool = Math.max(0, cool - dt); updateFx(dt); },
  };
}
