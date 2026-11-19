// Resa grafica: bagliori (bloom) sulle cose che brillano davvero (pietre, rune, cristalli, lampare, ponti di luce),
// tono cinematografico, ombre morbide e mare che riflette il cielo a Marechiaro.
// Qualità "alta" sul computer, "media" su telefoni e tablet; se il dispositivo fatica, scende da sola.
import * as THREE from 'three';
import { EffectComposer } from '../addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../addons/postprocessing/OutputPass.js';
import { Water } from '../addons/objects/Water.js';

// Mappa delle normali per l'acqua, generata qui (ripetibile senza cuciture).
function waterNormals(size = 256) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const g = cv.getContext('2d'), img = g.createImageData(size, size);
  const H = new Float32Array(size * size);
  const waves = [];
  for (let i = 0; i < 18; i++) waves.push({ kx: Math.round(Math.random() * 8 - 4) || 1, ky: Math.round(Math.random() * 8 - 4) || 2, a: 0.6 / (1 + i * 0.25), p: Math.random() * 6.28 });
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0; for (const w of waves) v += Math.sin((w.kx * x + w.ky * y) / size * Math.PI * 2 + w.p) * w.a;
    H[y * size + x] = v;
  }
  const at = (x, y) => H[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * 2.2, dy = (at(x, y + 1) - at(x, y - 1)) * 2.2;
    const n = new THREE.Vector3(-dx, -dy, 1).normalize(), i = (y * size + x) * 4;
    img.data[i] = (n.x * 0.5 + 0.5) * 255; img.data[i + 1] = (n.y * 0.5 + 0.5) * 255; img.data[i + 2] = (n.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function createFX(renderer, scene, camera, { isTouch }) {
  const params = new URLSearchParams(location.search);
  let quality = params.get('q') || (isTouch ? 'media' : 'alta');
  // colori come nelle illustrazioni: nessuna correzione di tono; brilla solo ciò che emette luce
  // (le superfici illuminate arrivano al massimo a ~2.8, le luci vere stanno sopra 3).
  renderer.toneMapping = THREE.NoToneMapping;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.75, 0.55, 2.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let useComposer = quality !== 'bassa';

  // Ombre: una sola luce del sole per regione, con la "scatola" delle ombre che segue il giocatore.
  const suns = [];
  scene.traverse(o => { if (o.isDirectionalLight) { o.updateMatrixWorld(); suns.push({ light: o, off: o.position.clone().sub(o.target.position).normalize().multiplyScalar(40) }); } });
  function setShadows(on) {
    renderer.shadowMap.enabled = on; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    for (const { light } of suns) {
      light.castShadow = on;
      if (on) {
        const s = light.shadow; s.mapSize.set(2048, 2048); s.bias = -0.0004; s.normalBias = 0.03;
        const c = s.camera; c.left = -28; c.right = 28; c.top = 28; c.bottom = -28; c.near = 1; c.far = 110; c.updateProjectionMatrix();
        if (!light.target.parent) scene.add(light.target);
      }
    }
    // chi riceve e chi proietta: tutto ciò che è illuminato; non il cielo, il mare di nubi, gli aloni.
    scene.traverse(o => {
      if (!o.isMesh || o.userData.noShadow) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      const lit = m && (m.isMeshLambertMaterial || m.isMeshStandardMaterial || m.isMeshPhongMaterial);
      o.receiveShadow = on && lit && !m.transparent;
      o.castShadow = on && lit && !m.transparent && !o.userData.ground && !o.isInstancedMesh;
    });
    scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
  }
  const shadowsOn = quality === 'alta';
  if (shadowsOn) setShadows(true);

  // Il mare di Marechiaro che riflette il cielo (solo qualità alta).
  let water = null;
  function makeWater(oldSea) {
    if (quality !== 'alta' || !oldSea) return;
    const geo = new THREE.PlaneGeometry(700, 360);
    water = new Water(geo, {
      textureWidth: 512, textureHeight: 512, waterNormals: waterNormals(),
      sunDirection: new THREE.Vector3(22, 40, -60).normalize(), sunColor: 0xfff2d8,
      waterColor: 0x1f86c8, distortionScale: 2.2, fog: true, alpha: 1,
    });
    // meno specchio e più blu: il mare di Marechiaro ad agosto, che brilla
    water.material.fragmentShader = water.material.fragmentShader
      .replace('float rf0 = 0.3;', 'float rf0 = 0.03;')
      .replace('reflectionSample * 0.9', 'reflectionSample * 0.5 * mix(vec3(1.0), waterColor * 3.2, 0.55)')
      .replace('vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;', 'vec3 scatter = (0.55 + 0.45 * max( 0.0, dot( surfaceNormal, eyeDirection ) )) * waterColor;');
    water.rotation.x = -Math.PI / 2;
    water.position.copy(oldSea.position).setY(-0.32);
    water.material.uniforms.size.value = 6;
    water.userData.noShadow = true;
    oldSea.parent.add(water);
    oldSea.visible = false;
    oldSea.userData.replaced = true;
  }

  function resize() { composer.setSize(innerWidth, innerHeight); composer.setPixelRatio(renderer.getPixelRatio()); bloom.resolution.set(innerWidth, innerHeight); }
  addEventListener('resize', resize);

  let slow = 0;
  return {
    get quality() { return quality; },
    makeWater,
    // dt per scendere di qualità da soli se il dispositivo fatica
    // una sola luce del sole proietta ombre: quella del luogo in cui ti trovi
    render(dt, focus, group) {
      if (water && water.parent && water.parent.visible) water.material.uniforms.time.value += dt * 0.55;
      if (renderer.shadowMap.enabled && focus) for (const { light, off } of suns) {
        const want = !group || light.parent === group;
        if (light.castShadow !== want) light.castShadow = want;
        if (!want || !light.parent || !light.parent.visible) continue;
        light.position.set(focus.x + off.x, off.y, focus.z + off.z); light.target.position.set(focus.x, 0, focus.z); light.target.updateMatrixWorld();
      }
      if (dt > 0.045) slow++; else slow = Math.max(0, slow - 1);
      if (slow > 120) {
        slow = 0;
        if (quality === 'alta') { quality = 'media'; setShadows(false); if (water) { water.visible = false; water.parent.children.forEach(c => { if (c.userData.replaced) c.visible = true; }); } }
        else if (quality === 'media') { quality = 'bassa'; useComposer = false; }
      }
      if (useComposer) composer.render(); else renderer.render(scene, camera);
    },
    resize,
    // personaggi aggiunti dopo: proiettano ombra anche loro
    cast(obj) { if (!renderer.shadowMap.enabled) return; obj.traverse(o => { if (o.isMesh && !o.material.transparent && (o.material.isMeshStandardMaterial || o.material.isMeshLambertMaterial)) o.castShadow = true; }); },
    // per le riprese dei video
    setQuality(q) { quality = q; useComposer = q !== 'bassa'; setShadows(q === 'alta'); },
  };
}
