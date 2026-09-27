import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import { staticFile } from "remotion";
import { bodyProfilePoints, bodyRadius, PROFILE } from "./profile";

// Builds the kettle, its base and the carved mate gourd as plain three.js objects.
// KettleStage places them in the R3F scene and poses them for every frame.
// Materials are physically based so the studio HDRI gives them real-looking highlights:
// powder-coated matte black steel, satin plastic, brushed steel and a glass LED display.
export const buildKettle = () => {
  const potMat = new THREE.MeshPhysicalMaterial({ color: 0x141415, roughness: 0.5, clearcoat: 0.12, clearcoatRoughness: 0.32 });
  const handleMat = new THREE.MeshPhysicalMaterial({ color: 0x131314, roughness: 0.56, clearcoat: 0.06, clearcoatRoughness: 0.45 });
  const baseMat = new THREE.MeshPhysicalMaterial({ color: 0x121213, roughness: 0.42, clearcoat: 0.2, clearcoatRoughness: 0.2 });
  const footMat = new THREE.MeshPhysicalMaterial({ color: 0x0c0c0c, roughness: 0.7 });
  const glossBlack = new THREE.MeshPhysicalMaterial({ color: 0x0f0f10, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.05 });
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xdcdcdc, metalness: 1, roughness: 0.2, anisotropy: 0.6 });

  const shadowed = <T extends THREE.Mesh>(m: T) => {
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  const lathe = (pts: ReadonlyArray<readonly [number, number]>, mat: THREE.Material, seg = 160) =>
    shadowed(new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat));

  // ---------------- pot: body, lid, knob, handle, spout, logo
  const pot = new THREE.Group();
  const body = lathe(bodyProfilePoints(), potMat);
  pot.add(body);
  pot.add(lathe([...PROFILE.lid].reverse(), potMat)); // outside -> in, so the lid faces up
  pot.add(lathe(PROFILE.knob, glossBlack, 96));
  pot.add(lathe(PROFILE.knobBand, steel, 96));

  const hs = new THREE.Shape();
  for (const c of PROFILE.handle) {
    const [cmd, ...n] = c as [string, ...number[]];
    if (cmd === "M") hs.moveTo(n[0], n[1]);
    else if (cmd === "L") hs.lineTo(n[0], n[1]);
    else hs.quadraticCurveTo(n[0], n[1], n[2], n[3]);
  }
  hs.closePath();
  const bevel = 9;
  const hg = new THREE.ExtrudeGeometry(hs, {
    depth: PROFILE.handleDepth - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel, // keep the side walls on the measured outline
    bevelSegments: 6,
    curveSegments: 20,
  });
  hg.translate(0, 0, -PROFILE.handleDepth / 2 + bevel);
  pot.add(shadowed(new THREE.Mesh(hg, handleMat)));

  pot.add(shadowed(new THREE.Mesh(taperedTube(PROFILE.spout), potMat)));
  // the open end of the spout
  const tipDir = new THREE.Vector3(
    PROFILE.spout[PROFILE.spout.length - 1][0] - PROFILE.spout[PROFILE.spout.length - 2][0],
    PROFILE.spout[PROFILE.spout.length - 1][1] - PROFILE.spout[PROFILE.spout.length - 2][1],
    0,
  ).normalize();
  const tipR = PROFILE.spout[PROFILE.spout.length - 1][2];
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(tipR * 0.72, 24), new THREE.MeshBasicMaterial({ color: 0x050505 }));
  mouth.position.set(PROFILE.tip[0], PROFILE.tip[1], 0).addScaledVector(tipDir, 0.4);
  mouth.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tipDir);
  pot.add(mouth);
  const lip = new THREE.Mesh(new THREE.RingGeometry(tipR * 0.7, tipR * 1.001, 24), potMat);
  lip.position.copy(mouth.position).addScaledVector(tipDir, 0.1);
  lip.quaternion.copy(mouth.quaternion);
  pot.add(lip);

  // Logo print: the brochure logo turned into white ink, projected onto the flared body.
  const logoMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, transparent: true, roughness: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4,
  });
  const logoReady = new THREE.TextureLoader().loadAsync(staticFile("images/matet-logo-print.png")).then((tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    logoMat.map = tex;
    logoMat.needsUpdate = true;
  });
  // The pot sits at the origin while the decal is projected, so decal space == pot space.
  pot.updateMatrixWorld(true);
  const LOGO_H = 57;
  const decal = new THREE.Mesh(
    new DecalGeometry(body, new THREE.Vector3(0, LOGO_H, bodyRadius(LOGO_H)), new THREE.Euler(-Math.atan(0.222), 0, 0), new THREE.Vector3(58, 83, 120)),
    logoMat,
  );
  pot.add(decal);

  // The pot pivots around PROFILE.pivot: pot is offset inside its "lift" group.
  pot.position.set(-PROFILE.pivot[0], -PROFILE.pivot[1], 0);

  // ---------------- base: slab, foot, dial with LED display, power button, status light
  const base = new THREE.Group();
  const P = PROFILE.base;
  const slabH = P.h - P.foot;
  const bb = 9;
  const slab = new THREE.ExtrudeGeometry(basePlan(0), {
    depth: slabH - 2 * bb, bevelEnabled: true, bevelThickness: bb, bevelSize: bb, bevelOffset: -bb, bevelSegments: 7, curveSegments: 48,
  });
  slab.rotateX(Math.PI / 2); // shape y -> world z, extrusion -> down
  slab.translate(0, -bb, 0);
  base.add(shadowed(new THREE.Mesh(slab, baseMat)));
  const foot = new THREE.ExtrudeGeometry(basePlan(8), { depth: P.foot, bevelEnabled: false, curveSegments: 48 });
  foot.rotateX(Math.PI / 2);
  foot.translate(0, -slabH, 0);
  base.add(shadowed(new THREE.Mesh(foot, footMat)));

  // soft occlusion where the kettle stands on the base (fades when the kettle is lifted)
  const footAoMat = new THREE.MeshBasicMaterial({ map: radialTexture([[0.74, 0], [0.8, 0.55], [0.86, 0.2], [1, 0]]), transparent: true, depthWrite: false });
  const footAo = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), footAoMat);
  footAo.rotation.x = -Math.PI / 2;
  footAo.position.y = 0.35;
  base.add(footAo);

  const D = PROFILE.dial;
  const knurl = stripesTexture();
  const dialSide = new THREE.MeshPhysicalMaterial({ color: 0x121213, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.12, bumpMap: knurl, bumpScale: 0.6 });
  const dial = lathe([[0, 0], [D.r, 0], [D.r, D.h - 5], [D.r - 0.7, D.h - 2.3], [D.r - 2.4, D.h - 0.6], [D.r - 5, D.h], [0, D.h]], dialSide, 96);
  dial.position.set(D.x, 0, D.z);
  base.add(dial);
  const bezel = new THREE.Mesh(new THREE.RingGeometry(D.r - 8.5, D.r - 4.6, 96), new THREE.MeshPhysicalMaterial({ color: 0x2a2a2c, roughness: 0.28, metalness: 0.4 }));
  bezel.rotation.x = -Math.PI / 2;
  bezel.position.set(D.x, D.h + 0.15, D.z);
  base.add(bezel);

  const ledCanvas = document.createElement("canvas");
  ledCanvas.width = ledCanvas.height = 512;
  const ledTex = new THREE.CanvasTexture(ledCanvas);
  ledTex.colorSpace = THREE.SRGBColorSpace;
  ledTex.anisotropy = 8;
  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(D.r - 8.5, 96),
    new THREE.MeshPhysicalMaterial({ color: 0x000000, map: ledTex, emissiveMap: ledTex, emissive: 0xffffff, emissiveIntensity: 1.35, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02 }),
  );
  glass.rotation.x = -Math.PI / 2;
  glass.position.set(D.x, D.h + 0.3, D.z);
  base.add(glass);
  let ledKey = "";
  const setLed = (value: number, on: number) => {
    const key = `${value}|${on.toFixed(3)}`;
    if (key === ledKey) return;
    ledKey = key;
    drawLed(ledCanvas.getContext("2d")!, value, on);
    ledTex.needsUpdate = true;
  };

  const pwCanvas = document.createElement("canvas");
  pwCanvas.width = pwCanvas.height = 256;
  {
    const c = pwCanvas.getContext("2d")!;
    c.strokeStyle = "#e9e9e9";
    c.lineCap = "round";
    c.lineWidth = 7;
    c.beginPath();
    c.arc(128, 128, 118, 0, Math.PI * 2);
    c.stroke();
    c.lineWidth = 11;
    c.beginPath();
    c.arc(128, 134, 44, -Math.PI * 0.3, Math.PI * 1.3);
    c.stroke();
    c.beginPath();
    c.moveTo(128, 76);
    c.lineTo(128, 124);
    c.stroke();
  }
  const pwTex = new THREE.CanvasTexture(pwCanvas);
  pwTex.colorSpace = THREE.SRGBColorSpace;
  pwTex.anisotropy = 8;
  const powerMat = new THREE.MeshStandardMaterial({ map: pwTex, transparent: true, emissiveMap: pwTex, emissive: 0x000000, roughness: 0.4 });
  const power = new THREE.Mesh(new THREE.CircleGeometry(PROFILE.power.r, 48), powerMat);
  power.rotation.x = -Math.PI / 2;
  power.position.set(PROFILE.power.x, 0.5, PROFILE.power.z);
  base.add(power);
  const statusLed = new THREE.Mesh(new THREE.CircleGeometry(2.4, 20), new THREE.MeshBasicMaterial({ color: 0x8dff8a }));
  statusLed.rotation.x = -Math.PI / 2;
  statusLed.position.set(PROFILE.statusLed.x, 0.5, PROFILE.statusLed.z);
  base.add(statusLed);

  // soft contact shadow under the base, in the shape of the base
  const ao = new THREE.Mesh(new THREE.PlaneGeometry(P.x1 - P.x0 + 260, 2 * P.z + 260), new THREE.MeshBasicMaterial({ map: contactShadowTexture(), transparent: true, depthWrite: false }));
  ao.rotation.x = -Math.PI / 2;
  ao.position.set((P.x0 + P.x1) / 2, -P.h + 0.5, 0);
  base.add(ao);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.ShadowMaterial({ color: 0x3a2c18, opacity: 0.2 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -P.h;
  floor.receiveShadow = true;

  // ---------------- carved mate gourd with yerba and a steel bombilla
  const { gourd, wetMat } = buildGourd(steel);

  return { pot, base, dial, floor, gourd, wetMat, powerMat, footAoMat, setLed, texturesReady: logoReady };
};

export type KettleKit = ReturnType<typeof buildKettle>;

/** Tube along a smooth curve whose radius follows the control points (the gooseneck). */
const taperedTube = (pts: ReadonlyArray<readonly [number, number, number]>, n = 280, m = 28) => {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, "centripetal");
  const frames = curve.computeFrenetFrames(n, false);
  // radius against arc length, from the chord lengths between control points
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const radiusAt = (u: number) => {
    const d = u * acc[acc.length - 1];
    let i = 1;
    while (i < acc.length - 1 && acc[i] < d) i++;
    const k = (d - acc[i - 1]) / (acc[i] - acc[i - 1]);
    return pts[i - 1][2] + (pts[i][2] - pts[i - 1][2]) * Math.min(1, Math.max(0, k));
  };
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const p = new THREE.Vector3();
  const dir = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    curve.getPointAt(u, p);
    const r = radiusAt(u);
    for (let j = 0; j <= m; j++) {
      const a = (j / m) * Math.PI * 2;
      dir.copy(frames.normals[i]).multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[i], Math.sin(a));
      pos.push(p.x + dir.x * r, p.y + dir.y * r, p.z + dir.z * r);
      nor.push(dir.x, dir.y, dir.z);
      uv.push(j / m, u);
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const a = i * (m + 1) + j;
      const b = a + m + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
};

/** Plan of the base (x, z): the left end hugs the kettle, the right end is a big round. */
const basePlan = (inset: number) => {
  const P = PROFILE.base;
  const zr = P.z - inset;
  const rl = P.rLeft - inset;
  const rr = P.rRight - inset;
  const cx = P.x1 - P.rRight;
  const zc = P.z - P.rRight;
  const s = new THREE.Shape();
  s.moveTo(0, -zr);
  s.lineTo(cx, -zr);
  s.absarc(cx, -zc, rr, -Math.PI / 2, 0, false);
  s.lineTo(cx + rr, zc);
  s.absarc(cx, zc, rr, 0, Math.PI / 2, false);
  s.lineTo(0, zr);
  s.absarc(0, 0, rl, Math.PI / 2, (3 * Math.PI) / 2, false);
  return s;
};

/** Canvas texture of a soft ring or disc: stops are [radius 0..1, opacity]. */
const radialTexture = (stops: [number, number][], color = "20,14,8") => {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  for (const [r, a] of stops) g.addColorStop(r, `rgba(${color},${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  return new THREE.CanvasTexture(c);
};

/** Blurred silhouette of the base, used as its contact shadow on the floor. */
const contactShadowTexture = () => {
  const P = PROFILE.base;
  const W = P.x1 - P.x0 + 260;
  const H = 2 * P.z + 260;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = Math.round((1024 * H) / W);
  const ctx = c.getContext("2d")!;
  const k = c.width / W;
  const path = (inset: number) => {
    const s = basePlan(inset);
    const pts = s.getPoints(64);
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = (p.x - P.x0 + 130) * k;
      const y = (p.y + P.z + 130) * k;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  };
  ctx.filter = `blur(${Math.round(46 * k)}px)`;
  ctx.fillStyle = "rgba(38,26,12,0.42)";
  path(-18);
  ctx.fill();
  ctx.filter = `blur(${Math.round(10 * k)}px)`;
  ctx.fillStyle = "rgba(20,14,6,0.65)";
  path(4);
  ctx.fill();
  return new THREE.CanvasTexture(c);
};

/** Fine vertical ribs for the dial's knurled side (used as a bump map). */
const stripesTexture = () => {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 8;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 1024, 8);
  ctx.fillStyle = "#fff";
  for (let x = 0; x < 1024; x += 8) ctx.fillRect(x, 0, 4, 8);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

// ---------------------------------------------------------------- 7-segment LED display
const SEGMENTS: Record<string, string> = {
  "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg", C: "adef",
};

const segment = (ctx: CanvasRenderingContext2D, cx: number, cy: number, len: number, th: number, vertical: boolean) => {
  const h = len / 2;
  const t = th / 2;
  const pts = vertical
    ? [[0, -h], [t, -h + t], [t, h - t], [0, h], [-t, h - t], [-t, -h + t]]
    : [[-h, 0], [-h + t, -t], [h - t, -t], [h, 0], [h - t, t], [-h + t, t]];
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(cx + x, cy + y) : ctx.lineTo(cx + x, cy + y)));
  ctx.closePath();
  ctx.fill();
};

const digit = (ctx: CanvasRenderingContext2D, ch: string, x: number, y: number, w: number, h: number, th: number) => {
  const on = SEGMENTS[ch] ?? "";
  const gap = th * 0.28;
  const vx = [x + th / 2, x + w - th / 2];
  const hy = [y + th / 2, y + h / 2, y + h - th / 2];
  const vl = h / 2 - th / 2 - 2 * gap;
  const hl = w - th - 2 * gap;
  const S: Record<string, () => void> = {
    a: () => segment(ctx, x + w / 2, hy[0], hl, th, false),
    g: () => segment(ctx, x + w / 2, hy[1], hl, th, false),
    d: () => segment(ctx, x + w / 2, hy[2], hl, th, false),
    f: () => segment(ctx, vx[0], (hy[0] + hy[1]) / 2, vl, th, true),
    b: () => segment(ctx, vx[1], (hy[0] + hy[1]) / 2, vl, th, true),
    e: () => segment(ctx, vx[0], (hy[1] + hy[2]) / 2, vl, th, true),
    c: () => segment(ctx, vx[1], (hy[1] + hy[2]) / 2, vl, th, true),
  };
  for (const s of on) S[s]();
};

/** The dial's display: white 7-segment digits and a ℃ sign on black glass. */
const drawLed = (ctx: CanvasRenderingContext2D, value: number, on: number) => {
  ctx.fillStyle = "#040404";
  ctx.fillRect(0, 0, 512, 512);
  if (on <= 0.001) return;
  const text = String(Math.round(value));
  const dw = 92;
  const dh = 168;
  const th = 17;
  const space = 20;
  const cw = 62;
  const total = text.length * dw + (text.length - 1) * space + 18 + 26 + 8 + cw;
  const x0 = 256 - total / 2;
  const y0 = 256 - dh / 2 + 4;
  const draw = () => {
    [...text].forEach((ch, i) => digit(ctx, ch, x0 + i * (dw + space), y0, dw, dh, th));
    const cx = x0 + text.length * dw + (text.length - 1) * space + 18;
    ctx.beginPath();
    ctx.arc(cx + 13, y0 + 16, 11, 0, Math.PI * 2);
    ctx.lineWidth = 7;
    ctx.stroke();
    digit(ctx, "C", cx + 34, y0 + 30, cw, dh * 0.64, th * 0.8);
  };
  ctx.globalAlpha = on;
  ctx.fillStyle = ctx.strokeStyle = "#eefcf2";
  ctx.shadowColor = "rgba(200,255,215,0.9)";
  ctx.shadowBlur = 22;
  draw();
  ctx.shadowBlur = 0;
  ctx.fillStyle = ctx.strokeStyle = "#ffffff";
  draw();
  ctx.globalAlpha = 1;
};

// ---------------------------------------------------------------- gourd
const buildGourd = (steel: THREE.Material) => {
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
  const wood = new THREE.MeshPhysicalMaterial({ map: woodTex, bumpMap: bumpTex, bumpScale: -3, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.35 });
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
  return { gourd, wetMat };
};
