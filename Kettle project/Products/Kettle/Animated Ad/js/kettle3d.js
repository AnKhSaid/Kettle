// 3D MATET kettle + mate gourd.
// World units are screen pixels: with the camera below, a point at z = 0 lands at
// screen (540 + x, 960 - y). The kettle is modelled from the same profile numbers
// as the 2D line art (see PROFILE), so the drawing can hand over to the 3D model.
import * as THREE from '../lib/three/three.module.js';
import { RoomEnvironment } from '../lib/three/RoomEnvironment.js';
import { DecalGeometry } from '../lib/three/DecalGeometry.js';

export const W = 1080, H = 1920;
const FOV = 14;
const DIST = (H / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2));

// ---------- shared profile (kettle space: origin = body bottom centre, y up) ----------
export const PROFILE = {
  body: { r0: 200, r1: 105, h: 420, round: 26 },
  handle: [ // outline in the XY plane
    ['M', 88, 404], ['L', 258, 404], ['Q', 282, 404, 286, 380], ['L', 330, 120], ['Q', 334, 88, 306, 88],
    ['L', 298, 88], ['Q', 274, 88, 271, 112], ['L', 235, 342], ['L', 100, 342],
  ],
  spout: [ // cubic segments, XY plane
    [[-168, 70], [-240, 85], [-285, 130], [-295, 230]],
    [[-295, 230], [-304, 320], [-290, 400], [-308, 452]],
    [[-308, 452], [-320, 488], [-345, 508], [-372, 506]],
    [[-372, 506], [-390, 504], [-402, 492], [-412, 474]],
  ],
  tip: [-412, 474],
  base: { x0: -240, x1: 380, z: 215, h: 50 },
  dial: { x: 300, z: 40, r: 58, h: 44 },
};

export function create(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;

  const camera = new THREE.PerspectiveCamera(FOV, W / H, 100, DIST * 3);
  camera.position.set(0, 0, DIST);
  camera.lookAt(0, 0, 0);

  // lights
  const key = new THREE.DirectionalLight(0xfff4e6, 2.2);
  key.position.set(-900, 1400, 1200);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -900, right: 900, top: 900, bottom: -900, near: 10, far: 5000 });
  key.shadow.radius = 10;
  key.shadow.bias = -0.0006;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xffffff, 1.4);
  rim.position.set(1200, 600, -900);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0xb8a98f, 0.5));

  // ---------- materials ----------
  const matte = new THREE.MeshStandardMaterial({ color: 0x19191a, roughness: 0.42, metalness: 0.35 });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1d, roughness: 0.5, metalness: 0.2 });
  const gloss = new THREE.MeshStandardMaterial({ color: 0x0f0f10, roughness: 0.18, metalness: 0.4 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.22, metalness: 1.0 });

  // ---------- kettle ----------
  const rig = new THREE.Group();          // the "table": position / turntable / zoom
  const lift = new THREE.Group();         // pour pivot: lifts & tilts the pot
  const pot = new THREE.Group();
  const base = new THREE.Group();
  lift.position.set(140, 250, 0); pot.position.set(-140, -250, 0);
  lift.add(pot);
  rig.add(base, lift);
  scene.add(rig);

  const B = PROFILE.body;
  const lathe = (pts, mat, seg = 128) => {
    const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
  };
  // body with rounded bottom edge
  const bodyPts = [[0, 0]];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2 + Math.atan2(B.r0 - B.r1, B.h));
    bodyPts.push([B.r0 - B.round + Math.cos(a) * B.round, B.round + Math.sin(a) * B.round]);
  }
  bodyPts.push([B.r1, B.h]);
  const body = lathe(bodyPts, matte);
  pot.add(body);
  // lid band, knob stem, knob cap (+ steel ring)
  pot.add(lathe([[0, B.h], [110, B.h], [114, B.h + 4], [114, B.h + 20], [110, B.h + 24], [0, B.h + 24]], matte));
  pot.add(lathe([[0, B.h + 23], [16, B.h + 23], [16, B.h + 50], [0, B.h + 50]], matte, 48));
  pot.add(lathe([[0, B.h + 48], [58, B.h + 48], [64, B.h + 52], [64, B.h + 68], [58, B.h + 72], [0, B.h + 72]], matte));
  const ring = lathe([[64.5, B.h + 57], [65.5, B.h + 57], [65.5, B.h + 62], [64.5, B.h + 62]], steel);
  pot.add(ring);

  // handle
  const hs = new THREE.Shape();
  for (const c of PROFILE.handle) {
    if (c[0] === 'M') hs.moveTo(c[1], c[2]);
    else if (c[0] === 'L') hs.lineTo(c[1], c[2]);
    else hs.quadraticCurveTo(c[1], c[2], c[3], c[4]);
  }
  hs.closePath();
  const hg = new THREE.ExtrudeGeometry(hs, { depth: 34, bevelEnabled: true, bevelThickness: 7, bevelSize: 7, bevelSegments: 5, curveSegments: 16 });
  hg.translate(0, 0, -17);
  const handle = new THREE.Mesh(hg, matte); handle.castShadow = true;
  pot.add(handle);

  // gooseneck spout
  const sp = new THREE.CurvePath();
  for (const s of PROFILE.spout) sp.add(new THREE.CubicBezierCurve3(...s.map(([x, y]) => new THREE.Vector3(x, y, 0))));
  const spout = new THREE.Mesh(new THREE.TubeGeometry(sp, 200, 8.5, 20, false), matte);
  spout.castShadow = true;
  pot.add(spout);
  const tipCap = new THREE.Mesh(new THREE.SphereGeometry(8.5, 20, 12), matte);
  tipCap.position.set(...PROFILE.tip, 0);
  pot.add(tipCap);

  // base slab (rounded rectangle, extruded downwards)
  const P = PROFILE.base, rr = 170;
  const bs = new THREE.Shape();
  bs.moveTo(P.x0 + rr, -P.z); bs.lineTo(P.x1 - rr, -P.z); bs.quadraticCurveTo(P.x1, -P.z, P.x1, -P.z + rr);
  bs.lineTo(P.x1, P.z - rr); bs.quadraticCurveTo(P.x1, P.z, P.x1 - rr, P.z); bs.lineTo(P.x0 + rr, P.z);
  bs.quadraticCurveTo(P.x0, P.z, P.x0, P.z - rr); bs.lineTo(P.x0, -P.z + rr); bs.quadraticCurveTo(P.x0, -P.z, P.x0 + rr, -P.z);
  const bg = new THREE.ExtrudeGeometry(bs, { depth: P.h - 12, bevelEnabled: true, bevelThickness: 6, bevelSize: 6, bevelSegments: 4, curveSegments: 32 });
  bg.rotateX(Math.PI / 2);   // extrude along -y
  bg.translate(0, -6, 0);
  const baseMesh = new THREE.Mesh(bg, baseMat); baseMesh.castShadow = true; baseMesh.receiveShadow = true;
  base.add(baseMesh);

  // dial + LED face
  const D = PROFILE.dial;
  const dial = lathe([[0, 0], [D.r, 0], [D.r, D.h - 5], [D.r - 5, D.h], [0, D.h]], gloss, 64);
  dial.position.set(D.x, 0, D.z);
  base.add(dial);
  const notch = new THREE.Mesh(new THREE.BoxGeometry(3, D.h - 14, 10), steel);   // marker so rotation reads
  notch.position.set(0, (D.h - 14) / 2 + 4, D.r + 0.5); dial.add(notch);
  const ledCanvas = document.createElement('canvas'); ledCanvas.width = ledCanvas.height = 256;
  const ledTex = new THREE.CanvasTexture(ledCanvas); ledTex.colorSpace = THREE.SRGBColorSpace;
  const led = new THREE.Mesh(new THREE.CircleGeometry(D.r - 8, 64),
    new THREE.MeshStandardMaterial({ map: ledTex, emissiveMap: ledTex, emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.15, metalness: 0 }));
  led.rotation.x = -Math.PI / 2; led.position.set(D.x, D.h + 0.6, D.z);
  base.add(led);
  let ledState = { text: '', on: 0 };
  function setLed(text, on = 1) {
    if (text === ledState.text && Math.abs(on - ledState.on) < 0.01) return;
    ledState = { text, on };
    const c = ledCanvas.getContext('2d');
    c.fillStyle = '#070707'; c.fillRect(0, 0, 256, 256);
    c.strokeStyle = `rgba(160,230,140,${0.35 * on})`; c.lineWidth = 6;
    c.beginPath(); c.arc(128, 128, 118, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = on;
    c.fillStyle = '#f4fff0'; c.shadowColor = '#9fe08a'; c.shadowBlur = 18;
    c.font = '300 104px Alexandria'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, 128, 136);
    c.globalAlpha = 1;
    ledTex.needsUpdate = true;
  }
  setLed('', 0);

  // power icon printed on the base
  const pwCanvas = document.createElement('canvas'); pwCanvas.width = pwCanvas.height = 128;
  { const c = pwCanvas.getContext('2d'); c.strokeStyle = '#9a9a9a'; c.lineWidth = 7; c.lineCap = 'round';
    c.beginPath(); c.arc(64, 64, 48, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(64, 68, 22, -Math.PI * 0.3, Math.PI * 1.3); c.stroke();
    c.beginPath(); c.moveTo(64, 36); c.lineTo(64, 62); c.stroke(); }
  const pwTex = new THREE.CanvasTexture(pwCanvas); pwTex.colorSpace = THREE.SRGBColorSpace;
  const power = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: pwTex, transparent: true, emissiveMap: pwTex, emissive: 0x000000 }));
  power.rotation.x = -Math.PI / 2; power.position.set(320, 0.8, 165);
  base.add(power);

  // logo decal on the body front
  const logoCanvas = document.createElement('canvas'); logoCanvas.width = 256; logoCanvas.height = 320;
  { const c = logoCanvas.getContext('2d');
    c.strokeStyle = '#f3f3f3'; c.lineWidth = 12; c.lineJoin = 'round';
    const rrect = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
    rrect(58, 30, 140, 128, 30); c.stroke();
    c.save(); c.translate(128, 94); c.rotate(0.45); c.scale(0.3, 0.3);
    c.fillStyle = '#f3f3f3'; c.beginPath(); c.moveTo(0, 150); c.bezierCurveTo(-140, 85, -135, -80, 0, -175); c.bezierCurveTo(135, -80, 140, 85, 0, 150); c.fill();
    c.strokeStyle = '#19191a'; c.lineWidth = 12; c.beginPath(); c.moveTo(0, 190); c.lineTo(0, -140); c.stroke(); c.restore();
    c.fillStyle = '#f3f3f3'; c.textAlign = 'center';
    c.font = '600 44px Alexandria'; c.fillText('متيت', 128, 222);
    c.font = '600 44px Alexandria'; c.fillText('MATET', 128, 280); }
  const logoTex = new THREE.CanvasTexture(logoCanvas); logoTex.colorSpace = THREE.SRGBColorSpace; logoTex.anisotropy = 8;
  const logoMat = new THREE.MeshStandardMaterial({ map: logoTex, transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  let logo = null;
  function buildLogo() { // must run after fonts load
    if (logo) pot.remove(logo);
    // DecalGeometry works in world space: refresh every ancestor's matrix first (a stale
    // parent matrix here used to shift the logo off the body), then convert to pot space.
    scene.updateMatrixWorld(true);
    const pos = new THREE.Vector3(0, 175, 0).applyMatrix4(body.matrixWorld);
    pos.z = 250;   // in front of the body; the decal box projects back onto the surface
    const ori = new THREE.Euler(-Math.atan2(95, 420), 0, 0);
    logo = new THREE.Mesh(new DecalGeometry(body, pos, ori, new THREE.Vector3(84, 105, 240)), logoMat);
    logo.geometry.applyMatrix4(new THREE.Matrix4().copy(pot.matrixWorld).invert());
    pot.add(logo);
  }

  // soft contact shadow (fake AO) + real shadow catcher
  const aoCanvas = document.createElement('canvas'); aoCanvas.width = aoCanvas.height = 256;
  { const c = aoCanvas.getContext('2d'); const g = c.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, 'rgba(40,30,15,0.55)'); g.addColorStop(0.55, 'rgba(40,30,15,0.18)'); g.addColorStop(1, 'rgba(40,30,15,0)');
    c.fillStyle = g; c.fillRect(0, 0, 256, 256); }
  const aoTex = new THREE.CanvasTexture(aoCanvas);
  const ao = new THREE.Mesh(new THREE.PlaneGeometry(900, 560), new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false }));
  ao.rotation.x = -Math.PI / 2; ao.position.set(70, -P.h + 0.5, 0);
  base.add(ao);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.ShadowMaterial({ color: 0x3a2c18, opacity: 0.16 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.position.y = -P.h;
  rig.add(floor);

  // ---------- mate gourd ----------
  const gourd = new THREE.Group();
  rig.add(gourd);
  const woodCanvas = document.createElement('canvas'); woodCanvas.width = 1024; woodCanvas.height = 512;
  { const c = woodCanvas.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#6e4122'); g.addColorStop(0.5, '#8a5530'); g.addColorStop(1, '#5c3519');
    c.fillStyle = g; c.fillRect(0, 0, 1024, 512);
    // fine grain
    for (let i = 0; i < 900; i++) { const y = (i * 97.13) % 512, x = (i * 331.7) % 1024;
      c.strokeStyle = `rgba(50,25,10,${0.05 + (i % 7) * 0.012})`; c.lineWidth = 1 + (i % 3);
      c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 40, y + 6, x + 80, y - 6, x + 130, y + 3); c.stroke(); }
    // carved bands with lozenges and dots (like the gourd in the brochure)
    c.strokeStyle = 'rgba(40,18,6,0.8)'; c.lineWidth = 5;
    for (const yy of [150, 330]) { c.beginPath(); c.moveTo(0, yy); c.lineTo(1024, yy); c.stroke(); }
    for (let k = 0; k < 16; k++) { const x = k * 64 + 32;
      c.beginPath(); c.moveTo(x, 170); c.lineTo(x + 26, 240); c.lineTo(x, 310); c.lineTo(x - 26, 240); c.closePath(); c.stroke();
      c.beginPath(); c.arc(x, 240, 9, 0, Math.PI * 2); c.stroke();
      c.fillStyle = 'rgba(40,18,6,0.7)'; c.beginPath(); c.arc(x + 32, 240, 5, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(x - 20, 100); c.quadraticCurveTo(x, 60, x + 20, 100); c.stroke();
      c.beginPath(); c.moveTo(x - 20, 380); c.quadraticCurveTo(x, 420, x + 20, 380); c.stroke(); } }
  const woodTex = new THREE.CanvasTexture(woodCanvas); woodTex.colorSpace = THREE.SRGBColorSpace; woodTex.wrapS = THREE.RepeatWrapping; woodTex.anisotropy = 8;
  const bumpTex = new THREE.CanvasTexture(woodCanvas); bumpTex.wrapS = THREE.RepeatWrapping;
  const wood = new THREE.MeshStandardMaterial({ map: woodTex, bumpMap: bumpTex, bumpScale: -3, roughness: 0.62, metalness: 0 });
  const gpts = [[0, 0], [45, 0], [80, 12], [104, 40], [114, 76], [110, 112], [98, 140], [88, 160], [87, 172], [92, 184], [96, 190], [90, 192], [82, 186], [80, 176]];
  const gourdMesh = new THREE.Mesh(new THREE.LatheGeometry(gpts.map(([r, y]) => new THREE.Vector2(r, y)), 96), wood);
  gourdMesh.castShadow = true;
  gourd.add(gourdMesh);
  // yerba surface
  const yCanvas = document.createElement('canvas'); yCanvas.width = yCanvas.height = 512;
  { const c = yCanvas.getContext('2d'); c.fillStyle = '#6f8f2e'; c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) { const a = i * 2.39996, r = Math.sqrt(i / 2600) * 256;
      const x = 256 + Math.cos(a) * r, y = 256 + Math.sin(a) * r;
      c.fillStyle = ['#8fae3c', '#55711f', '#a8c25a', '#435a18', '#c4b35a'][i % 5];
      c.save(); c.translate(x, y); c.rotate(a * 3.1); c.fillRect(-7, -2.5, 14, 5); c.restore(); } }
  const yTex = new THREE.CanvasTexture(yCanvas); yTex.colorSpace = THREE.SRGBColorSpace;
  const yerba = new THREE.Mesh(new THREE.CircleGeometry(82, 64), new THREE.MeshStandardMaterial({ map: yTex, roughness: 0.9 }));
  yerba.rotation.x = -Math.PI / 2; yerba.position.y = 178;
  gourd.add(yerba);
  // wet sheen that appears when water is poured
  const wet = new THREE.Mesh(new THREE.CircleGeometry(82, 64), new THREE.MeshStandardMaterial({ color: 0x2e4a12, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0 }));
  wet.rotation.x = -Math.PI / 2; wet.position.y = 178.5;
  gourd.add(wet);
  // bombilla (metal straw)
  const bc = new THREE.CatmullRomCurve3([new THREE.Vector3(20, 120, 10), new THREE.Vector3(38, 200, 14), new THREE.Vector3(62, 300, 18), new THREE.Vector3(72, 330, 18), new THREE.Vector3(86, 336, 18)]);
  const bombilla = new THREE.Mesh(new THREE.TubeGeometry(bc, 64, 6, 14, false), steel);
  bombilla.castShadow = true;
  gourd.add(bombilla);
  gourd.scale.setScalar(1.25);
  gourd.position.set(-560, -P.h, 90);

  // ---------- helpers ----------
  const v = new THREE.Vector3();
  function project(obj, local) { // local point on obj -> screen px
    v.set(...local); obj.localToWorld(v); v.project(camera);
    return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H };
  }
  function render() { renderer.render(scene, camera); }

  return { THREE, renderer, scene, camera, key, rig, lift, pot, base, dial, power, gourd, wet, floor, led, setLed, buildLogo, project, render, materials: { matte, baseMat, gloss, steel, wood } };
}
