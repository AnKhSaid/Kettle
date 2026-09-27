import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import { bodyProfilePoints, PROFILE } from "./profile";

// Builds the kettle, its base and the carved mate gourd as plain three.js objects.
// KettleStage places them in the R3F scene and poses them for every frame.
export const buildKettle = () => {
  const matte = new THREE.MeshStandardMaterial({ color: 0x19191a, roughness: 0.42, metalness: 0.35 });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1d, roughness: 0.5, metalness: 0.2 });
  const gloss = new THREE.MeshStandardMaterial({ color: 0x0f0f10, roughness: 0.18, metalness: 0.4 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.22, metalness: 1.0 });

  const lathe = (pts: [number, number][], mat: THREE.Material, seg = 128) => {
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // ---------------- pot (body, lid, knob, handle, spout, logo)
  const pot = new THREE.Group();
  const B = PROFILE.body;
  const body = lathe(bodyProfilePoints(), matte);
  pot.add(body);
  pot.add(lathe([[0, B.h], [110, B.h], [114, B.h + 4], [114, B.h + 20], [110, B.h + 24], [0, B.h + 24]], matte));
  pot.add(lathe([[0, B.h + 23], [16, B.h + 23], [16, B.h + 50], [0, B.h + 50]], matte, 48));
  pot.add(lathe([[0, B.h + 48], [58, B.h + 48], [64, B.h + 52], [64, B.h + 68], [58, B.h + 72], [0, B.h + 72]], matte));
  pot.add(lathe([[64.5, B.h + 57], [65.5, B.h + 57], [65.5, B.h + 62], [64.5, B.h + 62]], steel));

  const hs = new THREE.Shape();
  for (const c of PROFILE.handle) {
    const [cmd, ...n] = c as [string, ...number[]];
    if (cmd === "M") hs.moveTo(n[0], n[1]);
    else if (cmd === "L") hs.lineTo(n[0], n[1]);
    else hs.quadraticCurveTo(n[0], n[1], n[2], n[3]);
  }
  hs.closePath();
  const hg = new THREE.ExtrudeGeometry(hs, { depth: 34, bevelEnabled: true, bevelThickness: 7, bevelSize: 7, bevelSegments: 5, curveSegments: 16 });
  hg.translate(0, 0, -17);
  const handle = new THREE.Mesh(hg, matte);
  handle.castShadow = true;
  pot.add(handle);

  const spoutPath = new THREE.CurvePath<THREE.Vector3>();
  for (const s of PROFILE.spout) {
    const [a, b, c, d] = s.map(([x, y]) => new THREE.Vector3(x, y, 0));
    spoutPath.add(new THREE.CubicBezierCurve3(a, b, c, d));
  }
  const spout = new THREE.Mesh(new THREE.TubeGeometry(spoutPath, 200, 8.5, 20, false), matte);
  spout.castShadow = true;
  pot.add(spout);
  const tipCap = new THREE.Mesh(new THREE.SphereGeometry(8.5, 20, 12), matte);
  tipCap.position.set(PROFILE.tip[0], PROFILE.tip[1], 0);
  pot.add(tipCap);

  // logo decal (texture drawn once the fonts are loaded)
  const logoCanvas = document.createElement("canvas");
  logoCanvas.width = 256;
  logoCanvas.height = 320;
  const logoTex = new THREE.CanvasTexture(logoCanvas);
  logoTex.colorSpace = THREE.SRGBColorSpace;
  logoTex.anisotropy = 8;
  const logoMat = new THREE.MeshStandardMaterial({ map: logoTex, transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  // The pot sits at the origin while the decal is projected, so decal space == pot space.
  pot.updateMatrixWorld(true);
  const decalPos = new THREE.Vector3(0, 175, 250);
  const decal = new THREE.Mesh(
    new DecalGeometry(body, decalPos, new THREE.Euler(-Math.atan2(B.r0 - B.r1, B.h), 0, 0), new THREE.Vector3(84, 105, 240)),
    logoMat,
  );
  pot.add(decal);
  const drawLogo = () => {
    const c = logoCanvas.getContext("2d")!;
    c.clearRect(0, 0, 256, 320);
    c.strokeStyle = "#f3f3f3";
    c.lineWidth = 12;
    c.lineJoin = "round";
    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    };
    rr(58, 30, 140, 128, 30);
    c.stroke();
    c.save();
    c.translate(128, 94);
    c.rotate(0.45);
    c.scale(0.3, 0.3);
    c.fillStyle = "#f3f3f3";
    c.beginPath();
    c.moveTo(0, 150);
    c.bezierCurveTo(-140, 85, -135, -80, 0, -175);
    c.bezierCurveTo(135, -80, 140, 85, 0, 150);
    c.fill();
    c.strokeStyle = "#19191a";
    c.lineWidth = 12;
    c.beginPath();
    c.moveTo(0, 190);
    c.lineTo(0, -140);
    c.stroke();
    c.restore();
    c.fillStyle = "#f3f3f3";
    c.textAlign = "center";
    c.font = "600 44px Alexandria";
    c.fillText("متيت", 128, 222);
    c.fillText("MATET", 128, 280);
    logoTex.needsUpdate = true;
  };

  // The pot pivots around PROFILE.pivot: pot is offset inside its "lift" group.
  pot.position.set(-PROFILE.pivot[0], -PROFILE.pivot[1], 0);

  // ---------------- base, dial, LED, power icon
  const base = new THREE.Group();
  const P = PROFILE.base;
  const rr = 170;
  const bs = new THREE.Shape();
  bs.moveTo(P.x0 + rr, -P.z);
  bs.lineTo(P.x1 - rr, -P.z);
  bs.quadraticCurveTo(P.x1, -P.z, P.x1, -P.z + rr);
  bs.lineTo(P.x1, P.z - rr);
  bs.quadraticCurveTo(P.x1, P.z, P.x1 - rr, P.z);
  bs.lineTo(P.x0 + rr, P.z);
  bs.quadraticCurveTo(P.x0, P.z, P.x0, P.z - rr);
  bs.lineTo(P.x0, -P.z + rr);
  bs.quadraticCurveTo(P.x0, -P.z, P.x0 + rr, -P.z);
  const bg = new THREE.ExtrudeGeometry(bs, { depth: P.h - 12, bevelEnabled: true, bevelThickness: 6, bevelSize: 6, bevelSegments: 4, curveSegments: 32 });
  bg.rotateX(Math.PI / 2);
  bg.translate(0, -6, 0);
  const baseMesh = new THREE.Mesh(bg, baseMat);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  base.add(baseMesh);

  const D = PROFILE.dial;
  const dial = lathe([[0, 0], [D.r, 0], [D.r, D.h - 5], [D.r - 5, D.h], [0, D.h]], gloss, 64);
  dial.position.set(D.x, 0, D.z);
  base.add(dial);
  const notch = new THREE.Mesh(new THREE.BoxGeometry(3, D.h - 14, 10), steel);
  notch.position.set(0, (D.h - 14) / 2 + 4, D.r + 0.5);
  dial.add(notch);

  const ledCanvas = document.createElement("canvas");
  ledCanvas.width = ledCanvas.height = 256;
  const ledTex = new THREE.CanvasTexture(ledCanvas);
  ledTex.colorSpace = THREE.SRGBColorSpace;
  const led = new THREE.Mesh(
    new THREE.CircleGeometry(D.r - 8, 64),
    new THREE.MeshStandardMaterial({ map: ledTex, emissiveMap: ledTex, emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.15, metalness: 0 }),
  );
  led.rotation.x = -Math.PI / 2;
  led.position.set(D.x, D.h + 0.6, D.z);
  base.add(led);
  let ledKey = "";
  // `epoch` changes once the fonts are loaded, forcing a redraw with the real typeface.
  const setLed = (text: string, on: number, epoch = 0) => {
    const key = `${text}|${on.toFixed(3)}|${epoch}`;
    if (key === ledKey) return;
    ledKey = key;
    const c = ledCanvas.getContext("2d")!;
    c.fillStyle = "#070707";
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = `rgba(160,230,140,${0.35 * on})`;
    c.lineWidth = 6;
    c.beginPath();
    c.arc(128, 128, 118, 0, Math.PI * 2);
    c.stroke();
    c.globalAlpha = on;
    c.fillStyle = "#f4fff0";
    c.shadowColor = "#9fe08a";
    c.shadowBlur = 18;
    c.font = "300 104px Alexandria";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(text, 128, 136);
    c.globalAlpha = 1;
    c.shadowBlur = 0;
    ledTex.needsUpdate = true;
  };

  const pwCanvas = document.createElement("canvas");
  pwCanvas.width = pwCanvas.height = 128;
  {
    const c = pwCanvas.getContext("2d")!;
    c.strokeStyle = "#9a9a9a";
    c.lineWidth = 7;
    c.lineCap = "round";
    c.beginPath();
    c.arc(64, 64, 48, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.arc(64, 68, 22, -Math.PI * 0.3, Math.PI * 1.3);
    c.stroke();
    c.beginPath();
    c.moveTo(64, 36);
    c.lineTo(64, 62);
    c.stroke();
  }
  const pwTex = new THREE.CanvasTexture(pwCanvas);
  pwTex.colorSpace = THREE.SRGBColorSpace;
  const powerMat = new THREE.MeshStandardMaterial({ map: pwTex, transparent: true, emissiveMap: pwTex, emissive: 0x000000 });
  const power = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), powerMat);
  power.rotation.x = -Math.PI / 2;
  power.position.set(320, 0.8, 165);
  base.add(power);

  // soft contact shadow under the base
  const aoCanvas = document.createElement("canvas");
  aoCanvas.width = aoCanvas.height = 256;
  {
    const c = aoCanvas.getContext("2d")!;
    const g = c.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, "rgba(40,30,15,0.55)");
    g.addColorStop(0.55, "rgba(40,30,15,0.18)");
    g.addColorStop(1, "rgba(40,30,15,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  }
  const ao = new THREE.Mesh(new THREE.PlaneGeometry(900, 560), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(aoCanvas), transparent: true, depthWrite: false }));
  ao.rotation.x = -Math.PI / 2;
  ao.position.set(70, -P.h + 0.5, 0);
  base.add(ao);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.ShadowMaterial({ color: 0x3a2c18, opacity: 0.16 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -P.h;
  floor.receiveShadow = true;

  // ---------------- carved mate gourd with yerba and a steel bombilla
  const gourd = new THREE.Group();
  const woodCanvas = document.createElement("canvas");
  woodCanvas.width = 1024;
  woodCanvas.height = 512;
  {
    const c = woodCanvas.getContext("2d")!;
    const g = c.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#6e4122");
    g.addColorStop(0.5, "#8a5530");
    g.addColorStop(1, "#5c3519");
    c.fillStyle = g;
    c.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 900; i++) {
      const y = (i * 97.13) % 512;
      const x = (i * 331.7) % 1024;
      c.strokeStyle = `rgba(50,25,10,${0.05 + (i % 7) * 0.012})`;
      c.lineWidth = 1 + (i % 3);
      c.beginPath();
      c.moveTo(x, y);
      c.bezierCurveTo(x + 40, y + 6, x + 80, y - 6, x + 130, y + 3);
      c.stroke();
    }
    c.strokeStyle = "rgba(40,18,6,0.8)";
    c.lineWidth = 5;
    for (const yy of [150, 330]) {
      c.beginPath();
      c.moveTo(0, yy);
      c.lineTo(1024, yy);
      c.stroke();
    }
    for (let k = 0; k < 16; k++) {
      const x = k * 64 + 32;
      c.beginPath();
      c.moveTo(x, 170);
      c.lineTo(x + 26, 240);
      c.lineTo(x, 310);
      c.lineTo(x - 26, 240);
      c.closePath();
      c.stroke();
      c.beginPath();
      c.arc(x, 240, 9, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = "rgba(40,18,6,0.7)";
      c.beginPath();
      c.arc(x + 32, 240, 5, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(x - 20, 100);
      c.quadraticCurveTo(x, 60, x + 20, 100);
      c.stroke();
      c.beginPath();
      c.moveTo(x - 20, 380);
      c.quadraticCurveTo(x, 420, x + 20, 380);
      c.stroke();
    }
  }
  const woodTex = new THREE.CanvasTexture(woodCanvas);
  woodTex.colorSpace = THREE.SRGBColorSpace;
  woodTex.wrapS = THREE.RepeatWrapping;
  woodTex.anisotropy = 8;
  const bumpTex = new THREE.CanvasTexture(woodCanvas);
  bumpTex.wrapS = THREE.RepeatWrapping;
  const wood = new THREE.MeshStandardMaterial({ map: woodTex, bumpMap: bumpTex, bumpScale: -3, roughness: 0.62, metalness: 0 });
  const gpts: [number, number][] = [[0, 0], [45, 0], [80, 12], [104, 40], [114, 76], [110, 112], [98, 140], [88, 160], [87, 172], [92, 184], [96, 190], [90, 192], [82, 186], [80, 176]];
  const gourdMesh = new THREE.Mesh(new THREE.LatheGeometry(gpts.map(([r, y]) => new THREE.Vector2(r, y)), 96), wood);
  gourdMesh.castShadow = true;
  gourd.add(gourdMesh);
  const yCanvas = document.createElement("canvas");
  yCanvas.width = yCanvas.height = 512;
  {
    const c = yCanvas.getContext("2d")!;
    c.fillStyle = "#6f8f2e";
    c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) {
      const a = i * 2.39996;
      const r = Math.sqrt(i / 2600) * 256;
      c.fillStyle = ["#8fae3c", "#55711f", "#a8c25a", "#435a18", "#c4b35a"][i % 5];
      c.save();
      c.translate(256 + Math.cos(a) * r, 256 + Math.sin(a) * r);
      c.rotate(a * 3.1);
      c.fillRect(-7, -2.5, 14, 5);
      c.restore();
    }
  }
  const yTex = new THREE.CanvasTexture(yCanvas);
  yTex.colorSpace = THREE.SRGBColorSpace;
  const yerba = new THREE.Mesh(new THREE.CircleGeometry(82, 64), new THREE.MeshStandardMaterial({ map: yTex, roughness: 0.9 }));
  yerba.rotation.x = -Math.PI / 2;
  yerba.position.y = 178;
  gourd.add(yerba);
  const wetMat = new THREE.MeshStandardMaterial({ color: 0x2e4a12, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0 });
  const wet = new THREE.Mesh(new THREE.CircleGeometry(82, 64), wetMat);
  wet.rotation.x = -Math.PI / 2;
  wet.position.y = 178.5;
  gourd.add(wet);
  const bc = new THREE.CatmullRomCurve3([
    new THREE.Vector3(20, 120, 10),
    new THREE.Vector3(38, 200, 14),
    new THREE.Vector3(62, 300, 18),
    new THREE.Vector3(72, 330, 18),
    new THREE.Vector3(86, 336, 18),
  ]);
  const bombilla = new THREE.Mesh(new THREE.TubeGeometry(bc, 64, 6, 14, false), steel);
  bombilla.castShadow = true;
  gourd.add(bombilla);

  return { pot, base, dial, floor, gourd, wetMat, powerMat, setLed, drawLogo };
};

export type KettleKit = ReturnType<typeof buildKettle>;
