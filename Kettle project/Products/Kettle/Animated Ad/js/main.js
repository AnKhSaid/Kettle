// MATET kettle ad — master timeline.
// Everything is driven by renderFrame(t): the GSAP timeline is seeked to t, then the
// procedural bits (particles, water, steam, projected callouts) and the 3D view are drawn.
import { create, PROFILE } from './kettle3d.js';

const { gsap, DrawSVGPlugin, MorphSVGPlugin, CustomEase } = window;
gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin, CustomEase);

export const DURATION = 30;
export const FPS = 30;
const RENDER = new URLSearchParams(location.search).has('render');

// ---------- helpers ----------
const $ = s => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = x => 1 - Math.pow(1 - x, 3);
const easeInOut = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
function svg(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function rand(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const mix = (a, b, k) => {
  const pa = a.match(/\w\w/g).map(h => parseInt(h, 16)), pb = b.match(/\w\w/g).map(h => parseInt(h, 16));
  return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], clamp(k))).toString(16).padStart(2, '0')).join('');
};
// split an element's text into word spans (Arabic stays shaped: we only split on spaces)
function words(el) {
  const walk = (node, cls) => {
    const out = [];
    node.childNodes.forEach(n => {
      if (n.nodeType === 3) n.textContent.split(/\s+/).filter(Boolean).forEach(w => out.push(`<span class="w ${cls}">${w}</span>`));
      else out.push(...walk(n, n.className || ''));
    });
    return out;
  };
  el.innerHTML = walk(el, '').join(' ');
  return [...el.querySelectorAll('.w')];
}

await Promise.all([...document.fonts].map(f => f.load()));
await document.fonts.ready;

// ---------- 3D ----------
const K = create($('#gl'));
K.buildLogo();
const gl = $('#gl');

// ---------- static builds ----------
// odometer
const odo = $('#odo');
const cols = [0, 1, 2].map(() => {
  const c = document.createElement('div'); c.className = 'col';
  const s = document.createElement('div'); s.className = 'strip';
  s.innerHTML = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => `<span>${d}</span>`).join('');
  c.appendChild(s); odo.appendChild(c); return { c, s };
});
const deg = document.createElement('div'); deg.className = 'deg'; deg.textContent = '°'; odo.appendChild(deg);
function setOdo(v) {
  const ones = v % 10, tens = Math.floor(v / 10) % 10 + clamp(v % 10 - 9), hund = Math.floor(v / 100) + clamp(v % 100 - 99);
  cols[2].s.style.transform = `translateY(${-ones}em)`;
  cols[1].s.style.transform = `translateY(${-tens}em)`;
  cols[0].s.style.transform = `translateY(${-hund}em)`;
  const hw = clamp(v - 99);   // hundreds column slides in only around 100
  cols[0].c.style.width = `${0.64 * hw}em`; cols[0].c.style.opacity = hw;
}

// ripples, splash, bubbles, confetti, ticks
const ripples = [0, 1, 2].map(() => svg('ellipse', { cx: 540, cy: 1010, rx: 0, ry: 0, opacity: 0 }, $('#ripples')));
const R = rand(7);
const splash = Array.from({ length: 10 }, (_, i) => ({ el: svg('circle', { r: 4 + R() * 5, opacity: 0 }, $('#splash')), vx: (R() - .5) * 520, vy: -380 - R() * 420 }));
const bubbles = Array.from({ length: 110 }, (_, i) => ({
  el: svg('circle', { r: 0, fill: i % 3 ? 'none' : 'rgba(242,237,227,.25)', stroke: 'var(--cream)', 'stroke-width': 3 + (i % 3) }, $('#bubbles')),
  x: R() * 1080, r: 6 + Math.pow(R(), 2) * 38, v: .6 + R() * .9, off: R() * 2200, ph: R() * 6.28,
}));
const confetti = Array.from({ length: 28 }, (_, i) => {
  const g = svg('g', {}, $('#confetti'));
  svg('use', { href: '#leafD', fill: ['#6AA344', '#3E7A38', '#8DBE5A', '#557f2f'][i % 4] }, g);
  return { g, a: (i / 28) * Math.PI * 2 + (R() - .5) * .3, d: 380 + R() * 420, rot: (R() - .5) * 900, s: .09 + R() * .1 };
});
const ticks = Array.from({ length: 60 }, (_, i) => {
  const a = i / 60 * Math.PI * 2 - Math.PI / 2, long = i % 5 === 0, r1 = 345, r2 = long ? 372 : 360;
  return svg('line', { x1: 540 + Math.cos(a) * r1, y1: 900 + Math.sin(a) * r1, x2: 540 + Math.cos(a) * r2, y2: 900 + Math.sin(a) * r2,
    stroke: long ? '#1B1A18' : '#B9B09F', 'stroke-width': long ? 5 : 3, 'stroke-linecap': 'round', opacity: 0 }, $('#ticks'));
});
const RING_D = 'M540 600 A300 300 0 1 1 539.99 600';
$('#ring').setAttribute('d', RING_D);

// kettle line art, drawn in kettle space (y up) and placed at pose A
const POSE_A = { x: 13, y: -281 };
const kl = $('#kLines');
kl.setAttribute('transform', `translate(${540 + POSE_A.x} ${960 - POSE_A.y}) scale(1 -1)`);
const Bd = PROFILE.body;
const arc = []; for (let i = 0; i <= 8; i++) {
  const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2 + Math.atan2(Bd.r0 - Bd.r1, Bd.h));
  arc.push([Bd.r0 - Bd.round + Math.cos(a) * Bd.round, Bd.round + Math.sin(a) * Bd.round]);
}
const bodyD = `M${-Bd.r1} ${Bd.h} ` + [...arc].reverse().map(([x, y]) => `L${-x} ${y}`).join(' ') + ' ' + arc.map(([x, y]) => `L${x} ${y}`).join(' ') + ` L${Bd.r1} ${Bd.h} Z`;
const handleD = PROFILE.handle.map(c => c[0] + c.slice(1).join(' ')).join(' ') + ' Z';
const spoutD = 'M' + PROFILE.spout[0][0].join(' ') + ' ' + PROFILE.spout.map(s => 'C' + s.slice(1).map(p => p.join(' ')).join(' ')).join(' ');
const D = PROFILE.dial, P = PROFILE.base;
const rr = (x0, y0, x1, y1, r) => `M${x0 + r} ${y0} H${x1 - r} Q${x1} ${y0} ${x1} ${y0 + r} V${y1 - r} Q${x1} ${y1} ${x1 - r} ${y1} H${x0 + r} Q${x0} ${y1} ${x0} ${y1 - r} V${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} Z`;
const lineParts = [
  ['base', rr(P.x0 - 6, -P.h, P.x1 + 6, 0, 14)],
  ['dial', `M${D.x - D.r} 0 V${D.h - 5} Q${D.x - D.r} ${D.h} ${D.x - D.r + 5} ${D.h} H${D.x + D.r - 5} Q${D.x + D.r} ${D.h} ${D.x + D.r} ${D.h - 5} V0`],
  ['body', bodyD],
  ['lid', rr(-114, Bd.h, 114, Bd.h + 24, 5)],
  ['stem', `M-16 ${Bd.h + 24} V${Bd.h + 48} M16 ${Bd.h + 24} V${Bd.h + 48}`],
  ['knob', rr(-64, Bd.h + 48, 64, Bd.h + 72, 8)],
  ['handle', handleD],
  ['spout', spoutD],
].map(([id, d]) => svg('path', { d, class: 'ink', id: 'kl-' + id, 'stroke-width': id === 'spout' ? 17 : 5 }, kl));
// dial position on screen at pose A (target of the ring morph)
const dialScreen = { x0: 540 + POSE_A.x + D.x - D.r, x1: 540 + POSE_A.x + D.x + D.r, y0: 960 - POSE_A.y - D.h, y1: 960 - POSE_A.y };
const DIAL_D = `M${dialScreen.x0} ${dialScreen.y1} V${dialScreen.y0 + 5} Q${dialScreen.x0} ${dialScreen.y0} ${dialScreen.x0 + 5} ${dialScreen.y0} H${dialScreen.x1 - 5} Q${dialScreen.x1} ${dialScreen.y0} ${dialScreen.x1} ${dialScreen.y0 + 5} V${dialScreen.y1}`;

// callout leaders
const calls = [
  { pill: $('#p1'), obj: K.pot, at: [-300, 330, 0], pos: [230, 640] },
  { pill: $('#p2'), obj: K.pot, at: [60, 452, 40], pos: [850, 610] },
  { pill: $('#p3'), obj: K.base, at: [D.x, D.h, D.z], pos: [860, 1500] },
  { pill: $('#p4'), obj: K.pot, at: [100, 150, 140], pos: [240, 1500] },
].map(c => ({ ...c, line: svg('line', { 'stroke-width': 3 }, $('#leaders')), dot: svg('circle', { r: 9 }, $('#leaders')) }));

// steam wisps
const steam = Array.from({ length: 4 }, (_, i) => {
  const g = svg('g', {}, $('#steam'));
  const d = `M0 0 C-22 -40 22 -80 0 -120 C-22 -160 22 -200 0 -240`;
  const soft = svg('path', { d, fill: 'none', stroke: '#fff', 'stroke-width': 26, 'stroke-linecap': 'round', filter: 'url(#soft)', opacity: .7, pathLength: 1 }, g);
  const line = svg('path', { d, fill: 'none', stroke: '#8a8275', 'stroke-width': 4, 'stroke-linecap': 'round', pathLength: 1 }, g);
  return { g, soft, line, dx: (i - 1.5) * 34, ph: i * .27 };
});
const drops = Array.from({ length: 8 }, () => ({ el: svg('circle', { r: 3 + R() * 4 }, $('#drops')), a: -Math.PI / 2 + (R() - .5) * 2.2, v: 90 + R() * 120, ph: R() }));

// sun rays
for (let i = 0; i < 16; i++) {
  const a = i / 16 * Math.PI * 2;
  svg('line', { x1: Math.cos(a) * 205, y1: Math.sin(a) * 205, x2: Math.cos(a) * (i % 2 ? 245 : 275), y2: Math.sin(a) * (i % 2 ? 245 : 275) }, $('#rays'));
}
// solar panel line art
{
  const g = $('#panel'); g.setAttribute('transform', 'translate(200 1560)');
  const parts = ['M-150 40 L130 40 L90 -80 L-190 -80 Z', 'M-170 -20 L110 -20', 'M-103 40 L-133 -80 M-57 40 L-77 -80 M-10 40 L-20 -80 M36 40 L37 -80 M83 40 L93 -80', 'M-20 40 L-10 110 M-60 110 H40'];
  parts.forEach((d, i) => svg('path', { d, class: 'ink', style: i === 0 ? 'fill: #2d4a63' : i === 1 || i === 2 ? 'stroke: #cfe3f0; stroke-width: 3' : '' }, g));
}
const sparks = Array.from({ length: 5 }, () => svg('circle', { r: 9, filter: 'url(#glow)' }, $('#sparks')));
// how-to overlays
const pRing = [0, 1].map(() => svg('ellipse', { rx: 0, ry: 0, opacity: 0 }, $('#howto')));
const turnArc = svg('path', { d: '', 'marker-end': '', opacity: 0 }, $('#howto'));
const turnHead = svg('path', { d: '', fill: 'var(--leaf)', stroke: 'none', opacity: 0 }, $('#howto'));

// text prep
const wD = [...words($('#tD')), ...words($('#tD2'))], wE1 = words($('#tE1')), wF = [...words($('#tF')), ...words($('#tF2'))], wG1 = words($('#tG1')), wI1 = words($('#tI1'));

// ---------- state driven by the timeline ----------
const S = {
  leafP: 0, leafUp: 0, burn: 0, flood: 0, floodX: 540, floodY: 1010, boil: 0, bubbleFade: 0, shake: 0,
  odo: 40, odoOp: 0, odoGreen: 0, odoScale: 1, odoX: 0, odoY: 0, ringOp: 0, tickK: 0, confetti: 0, punch: 0,
  reveal: 0, ledOn: 0, led: 77, call: [0, 0, 0, 0], gourd: 0, pour: 0, pourEnd: 0, wet: 0, steam: 0, steamAt: 0,
  sun: 0, wire: 0, spark: 0, press: 0, turn: 0, steamTip: 0, leaf2: 0, shine: 0, flash: 0, halo: 0, haloY: 1000,
};

// ---------- the timeline ----------
CustomEase.create('slam', 'M0,0 C0.1,0.6 0.2,1.12 0.42,1.06 0.62,1 0.8,1 1,1');
const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
const at = (time, target, vars) => tl.to(target, { duration: .6, ...vars }, time);
const set = (time, target, vars) => tl.set(target, vars, time);
const wordSlam = (ws, time, stagger = .1) => ws.forEach((w, i) => tl.fromTo(w, { opacity: 0, scale: 1.8, y: 20 },
  { opacity: 1, scale: 1, y: 0, duration: .45, ease: 'slam' }, time + i * stagger));
const out = (sel, time, dur = .35) => tl.to(sel, { opacity: 0, y: -30, duration: dur, ease: 'power2.in' }, time);

// initial states
set(0, '#tA, #tB', { '--p': 0 });
set(0, '#tD, #tD2, #tE1, #tE2, #tF, #tF2, #tG1, #tG2, #tI1, #tI2, #step', { opacity: 1 });
set(0, [...wD, ...wE1, ...wF, ...wG1, ...wI1], { opacity: 0 });
set(0, '#tE2, #tG2, #tI2', { opacity: 0 });
set(0, '#scribble', { drawSVG: '0% 0%' });
set(0, '#ring', { drawSVG: '0% 0%', opacity: 0 });
set(0, lineParts, { drawSVG: '0% 0%', opacity: 1 });
set(0, K.rig.position, { x: POSE_A.x, y: POSE_A.y, z: 0 });
set(0, K.rig.rotation, { x: 0, y: 0, z: 0 });
set(0, K.rig.scale, { x: 1, y: 1, z: 1 });
set(0, K.lift.rotation, { z: 0 });
set(0, K.lift.position, { y: 250 });
set(0, K.dial.rotation, { y: 0 });
set(0, K.gourd.position, { x: -440 });
set(0, '#tileInner', { drawSVG: '0% 0%' });

// A — 0.0 → 2.4 : a leaf falls onto water. "The secret isn't in the leaves…"
at(0, S, { leafP: 1, duration: 1.5, ease: 'none' });
at(.35, '#tA', { '--p': 112, duration: 1.3, ease: 'power1.inOut' });
out('#tA', 2.25, .3);

// B — 2.4 → 4.8 : the water boils. "…nor in boiling water"
at(2.3, S, { flood: 2300, duration: .6, ease: 'power2.in' });
at(2.5, S, { boil: 1, duration: 1.9, ease: 'power1.in' });
at(2.6, S, { odoOp: 1, duration: .3 });
at(2.6, S, { odo: 100, duration: 1.6, ease: 'power2.in' });
at(2.6, S, { leafUp: 1, duration: 1.7, ease: 'power2.in' });
at(2.6, S, { burn: 1, duration: 1.4, ease: 'none' });
at(2.95, '#tB', { '--p': 112, duration: 1.0, ease: 'power1.inOut' });
at(3.2, S, { shake: 1, duration: 1.0, ease: 'power2.in' });
at(4.2, '#scribble', { drawSVG: '0% 100%', duration: .28, ease: 'power2.out' });

// C — 4.8 → 7.2 : freeze, cool down to 77°
set(4.8, S, { shake: 0 });
out('#tB', 4.85, .3);
at(4.95, '#scribble', { opacity: 0, duration: .25 });
at(4.9, S, { bubbleFade: 1, duration: .8, ease: 'power2.in' });
set(4.9, S, { floodX: 540, floodY: 900 });
at(4.95, S, { odo: 77, duration: 1.7, ease: 'power2.inOut' });
at(5.0, S, { flood: 0, duration: 1.5, ease: 'power3.inOut' });
at(5.55, S, { odoGreen: 1, duration: .8, ease: 'power1.inOut' });
set(5.2, '#ring', { opacity: 1 });
at(5.2, '#ring', { drawSVG: '0% 77%', duration: 1.4, ease: 'power2.inOut' });
at(5.3, S, { tickK: 1, duration: 1.0, ease: 'none' });
at(6.6, S, { odoScale: .94, duration: .6, ease: 'power2.in' });    // wind-up before the drop

// D — 7.2 → 9.6 : the drop. "…but in the perfect degree"
at(7.2, S, { odoScale: 1, punch: 1, duration: .5, ease: 'elastic.out(1, .45)' });
at(7.2, S, { confetti: 1, duration: 1.3, ease: 'power2.out' });
tl.fromTo(S, { flash: .5 }, { flash: 0, duration: .5, ease: 'power2.out', immediateRender: false }, 7.2);
wordSlam(wD, 7.3, .12);
out('#tD, #tD2', 8.75, .35);
at(8.6, S, { tickK: 0, duration: .4, ease: 'power2.in' });
at(8.6, '#ring', { drawSVG: '0% 100%', duration: .3, ease: 'power2.inOut' });
at(8.9, '#ring', { morphSVG: DIAL_D, strokeWidth: 5, stroke: '#1B1A18', duration: .7, ease: 'power3.inOut' });
at(8.85, S, { odoScale: .1, odoX: dialScreen.x0 + D.r - 540, odoY: dialScreen.y0 - 900 + 22, duration: .7, ease: 'power3.inOut' });
at(9.35, S, { odoOp: 0, duration: .2 });

// E — 9.6 → 14.4 : line art → 3D kettle, turntable, callouts
set(9.55, '#ring', { opacity: 0 });
lineParts.forEach((p, i) => { if (i !== 1) at(9.5 + i * .12, p, { drawSVG: '0% 100%', duration: .55, ease: 'power2.inOut' }); });
set(9.5, lineParts[1], { drawSVG: '0% 100%' });
at(10.55, S, { reveal: 1, duration: .75, ease: 'power2.inOut' });
at(11.15, lineParts, { opacity: 0, duration: .35 });
at(11.35, S, { ledOn: 1, duration: .3 });
at(10.9, S, { halo: 1, duration: 1.0, ease: 'power3.out' });
at(14.2, S, { halo: 0, duration: .4, ease: 'power2.in' });
at(24.1, S, { halo: 1, duration: 1.0, ease: 'power3.out' });
set(24.0, S, { haloY: 1060 });
at(11.2, K.rig.rotation, { y: .62, x: .2, duration: 1.6, ease: 'power2.inOut' });
at(11.2, K.rig.position, { y: -300, duration: 1.6, ease: 'power2.inOut' });
at(12.8, K.rig.rotation, { y: .3, duration: 1.6, ease: 'sine.inOut' });
wordSlam(wE1, 11.2, .1);
tl.fromTo('#tE2', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .5 }, 11.6);
[12.0, 12.45, 12.9, 13.35].forEach((t0, i) => {
  tl.to(S.call, { [i]: 1, duration: .5, ease: 'back.out(2)' }, t0);
  tl.to(S.call, { [i]: 0, duration: .25, ease: 'power2.in' }, 14.05 + i * .04);
});
out('#tE1, #tE2', 14.2, .3);

// F — 14.4 → 19.2 : the pour, same temperature every time
at(14.3, K.rig.position, { x: 115, y: -440, duration: .9, ease: 'power3.inOut' });
at(14.3, K.rig.rotation, { y: -.15, x: .14, duration: .9, ease: 'power3.inOut' });
at(14.3, K.rig.scale, { x: .92, y: .92, z: .92, duration: .9, ease: 'power3.inOut' });
at(14.55, S, { gourd: 1, duration: .6, ease: 'back.out(1.6)' });
at(15.05, K.lift.rotation, { z: .45, duration: .8, ease: 'power2.inOut' });
at(15.05, K.lift.position, { y: 460, duration: .8, ease: 'power2.inOut' });
at(15.7, S, { pour: 1, duration: .35, ease: 'power2.in' });
at(15.95, S, { wet: .55, duration: .9, ease: 'power1.out' });
at(16.3, S, { steam: 1, duration: .8, ease: 'power1.out' });
wordSlam(wF, 15.0, .14);
[16.8, 17.4, 18.0].forEach((t0, i) => tl.fromTo('#b' + (i + 1), { opacity: 0, scale: .2, rotate: -25 }, { opacity: 1, scale: 1, rotate: 0, duration: .5, ease: 'back.out(2.2)' }, t0));
at(18.45, S, { pourEnd: 1, duration: .35, ease: 'power2.in' });
at(18.6, K.lift.rotation, { z: 0, duration: .6, ease: 'power2.inOut' });
at(18.6, K.lift.position, { y: 250, duration: .6, ease: 'power2.inOut' });
out('#tF, #tF2, .badge', 18.95, .3);
at(19.0, S, { steam: 0, duration: .3 });

// G — 19.2 → 21.6 : solar friendly, only 500 W
at(19.05, S, { gourd: 0, duration: .35, ease: 'back.in(1.5)' });
at(19.1, K.rig.position, { x: -20, y: -420, duration: .8, ease: 'power3.inOut' });
at(19.1, K.rig.rotation, { y: .45, x: .14, duration: .8, ease: 'power3.inOut' });
at(19.1, K.rig.scale, { x: .82, y: .82, z: .82, duration: .8, ease: 'power3.inOut' });
at(19.2, S, { sun: 1, duration: .9, ease: 'power3.out' });
wordSlam(wG1, 19.35, .1);
tl.fromTo('#tG2', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .5 }, 19.75);
at(19.6, '#panel', { opacity: 1, duration: .4 });
at(19.9, S, { wire: 1, duration: .5, ease: 'power2.out' });
at(20.2, S, { spark: 1.4, duration: 1.3, ease: 'none' });
out('#tG1, #tG2', 21.35, .3);
at(21.35, '#panel', { opacity: 0, duration: .3 });
at(21.35, S, { sun: 0, wire: 0, duration: .35, ease: 'power2.in' });

// H — 21.6 → 24.0 : press · turn · enjoy
set(21.45, S, { ledOn: 0, led: 28 });
at(21.4, K.rig.scale, { x: 2.1, y: 2.1, z: 2.1, duration: .6, ease: 'power3.inOut' });
at(21.4, K.rig.position, { x: -520, y: -420, duration: .6, ease: 'power3.inOut' });
at(21.4, K.rig.rotation, { y: -.15, x: .55, duration: .6, ease: 'power3.inOut' });
at(21.85, S, { press: 1, duration: .6, ease: 'power2.out' });
at(21.95, S, { ledOn: 1, duration: .15 });
at(22.45, K.dial.rotation, { y: -2.4, duration: .7, ease: 'power2.inOut' });
at(22.45, S, { led: 77, turn: 1, duration: .7, ease: 'power2.inOut' });
at(23.2, K.rig.scale, { x: .95, y: .95, z: .95, duration: .8, ease: 'power3.inOut' });
at(23.2, K.rig.position, { x: 12, y: -290, duration: .8, ease: 'power3.inOut' });
at(23.2, K.rig.rotation, { y: -.45, x: .1, duration: .8, ease: 'power3.inOut' });
at(23.35, S, { steamTip: 1, duration: .5 });
at(23.9, S, { steamTip: 0, duration: .5 });

// I — 24.0 → 30.0 : brand + call to action
at(24.0, K.rig.rotation, { y: .45, duration: 6, ease: 'sine.inOut' });
at(24.0, S, { leaf2: 1, duration: .9, ease: 'power2.inOut' });
tl.fromTo('#logoTile', { opacity: 0, scale: .3, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: .5, ease: 'back.out(1.8)' }, 24.6);
at(24.75, '#tileInner', { drawSVG: '0% 100%', duration: .5, ease: 'power2.inOut' });
tl.fromTo('#tileAr, #tileEn', { opacity: 0 }, { opacity: 1, duration: .3, stagger: .1 }, 25.0);
wordSlam(wI1, 25.05, .12);
tl.fromTo('#tI2', { opacity: 0, '--p': 0 }, { opacity: 1, '--p': 112, duration: .9, ease: 'power1.inOut' }, 25.5);
tl.fromTo('#cta', { opacity: 0, scale: .6, xPercent: -50, x: 0 }, { opacity: 1, scale: 1, xPercent: -50, duration: .55, ease: 'back.out(2)' }, 26.1);
tl.fromTo('#phone', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .45 }, 26.4);
tl.fromTo('#bsc', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .45 }, 26.7);
at(26.8, S, { shine: 1, duration: .8, ease: 'power1.inOut' });
at(28.3, S, { shine: 2, duration: .8, ease: 'power1.inOut' });
tl.to({}, { duration: .01 }, DURATION);

// step labels (swap on beats)
const STEPS = [['١', 'اضغط'], ['٢', 'أدِر'], ['٣', 'استمتع']];

// ---------- procedural layer ----------
const TIP = [PROFILE.tip[0] - 2, PROFILE.tip[1] - 8, 0];
function bubbleClock(t) { // integral of bubble speed: accelerates while boiling, freezes at 4.8
  let c = 0; const end = Math.min(t, 4.8);
  for (let x = 2.4; x < end; x += 1 / 120) c += (0.25 + 1.6 * Math.pow(prog(x, 2.4, 4.3), 1.6)) / 120;
  return c;
}

function procedural(t) {
  K.scene.updateMatrixWorld(true);

  $('#flash').style.opacity = S.flash;
  $('#halo').setAttribute('r', 520 * S.halo); $('#halo').setAttribute('cy', S.haloY);
  $('#haloRing').setAttribute('r', 430 * easeOut(S.halo)); $('#haloRing').setAttribute('cy', S.haloY);
  $('#haloRing').setAttribute('opacity', S.halo);
  // shake
  const sh = S.shake * (t < 4.8 ? 1 : 0) + Math.max(0, 1 - (t - 7.2) / .35) * (t >= 7.2 ? .6 : 0);
  $('#world').style.transform = sh > 0.001
    ? `translate(${Math.sin(t * 61.3) * Math.cos(t * 17.1) * 16 * sh}px, ${Math.cos(t * 47.9) * Math.sin(t * 23.3) * 16 * sh}px) rotate(${Math.sin(t * 37.7) * .8 * sh}deg)`
    : '';

  // A/B leaf
  const leaf = $('#leaf');
  if (t < 4.6) {
    const p = S.leafP;
    let x = 560 + Math.sin(p * Math.PI * 2.5) * 150 * (1 - p * .75), y = lerp(-240, 1000, p), rot = 25 + Math.sin(p * Math.PI * 2.5 + 1) * 40 * (1 - p);
    if (t > 1.5) y += Math.sin((t - 1.5) * 7) * 8 * Math.exp(-(t - 1.5) * 1.5);
    const u = S.leafUp;
    x += Math.sin(t * 13) * 40 * u; y -= u * 1300; rot += u * u * 900 + Math.sin(t * 19) * 20 * u;
    leaf.setAttribute('transform', `translate(${x} ${y}) rotate(${rot}) scale(${.55 - u * .15})`);
    leaf.style.opacity = 1;
    $('#leafFill').setAttribute('fill', mix('6AA344', '6b3f1f', S.burn));
  } else leaf.style.opacity = 0;

  // ripples + splash
  ripples.forEach((e, k) => {
    const s = prog(t, 1.5 + k * .22, 1.5 + k * .22 + 1.2), on = t > 1.5 + k * .22 && s < 1 && t < 2.6;
    const rx = 30 + easeOut(s) * 430;
    e.setAttribute('rx', rx); e.setAttribute('ry', rx * .17); e.setAttribute('opacity', on ? (1 - s) * .8 : 0);
  });
  splash.forEach(d => {
    const tau = t - 1.5, on = tau > 0 && tau < .7;
    d.el.setAttribute('cx', 540 + d.vx * tau); d.el.setAttribute('cy', 1000 + d.vy * tau + 1400 * tau * tau);
    d.el.setAttribute('opacity', on ? 1 - tau / .7 : 0);
  });

  // flood + bubbles
  const fl = $('#flood');
  fl.setAttribute('r', S.flood); fl.setAttribute('cx', S.floodX); fl.setAttribute('cy', S.floodY);
  const clock = bubbleClock(t);
  const active = S.boil * bubbles.length;
  bubbles.forEach((b, i) => {
    const show = i < active && t < 5.8 && t > 2.4;
    if (!show) { b.el.setAttribute('r', 0); return; }
    const y = 2050 - ((clock * b.v * 900 + b.off) % 2300) + S.bubbleFade * 120;
    b.el.setAttribute('cx', b.x + Math.sin(clock * 5 + b.ph) * 14);
    b.el.setAttribute('cy', y);
    b.el.setAttribute('r', b.r * (1 - S.bubbleFade * .6));
    b.el.setAttribute('opacity', (1 - S.bubbleFade) * clamp((active - i) / 4));
  });

  // odometer
  setOdo(S.odo);
  odo.style.opacity = S.odoOp;
  odo.style.color = mix('F2EDE3', '3E7A38', S.odoGreen);
  odo.style.transform = `translate(${S.odoX}px, ${S.odoY}px) scale(${S.odoScale * (1 + Math.sin(S.punch * Math.PI) * .06)})`;

  // ticks + confetti
  ticks.forEach((l, i) => l.setAttribute('opacity', clamp(S.tickK * 60 - i) * (t < 9 ? 1 : 0)));
  confetti.forEach(c => {
    const k = S.confetti, on = k > 0 && k < 1;
    const d = c.d * easeOut(k);
    c.g.setAttribute('transform', `translate(${540 + Math.cos(c.a) * d} ${900 + Math.sin(c.a) * d + k * k * 160}) rotate(${c.rot * k}) scale(${c.s * (1 - k * .3)})`);
    c.g.setAttribute('opacity', on ? 1 - Math.pow(k, 3) : 0);
  });

  // 3D reveal wipe (bottom → top)
  const top = S.reveal >= 1 ? 0 : lerp(69, 36, S.reveal);
  gl.style.clipPath = S.reveal <= 0 ? 'inset(100% 0 0 0)' : `inset(${top}% 0 0 0)`;
  const scan = $('#scan');
  scan.setAttribute('y1', top / 100 * 1920); scan.setAttribute('y2', top / 100 * 1920);
  scan.setAttribute('opacity', S.reveal > 0 && S.reveal < 1 ? 1 : 0);

  // LED
  K.setLed(`${Math.round(S.led)}°`, S.ledOn);

  // callouts
  calls.forEach((c, i) => {
    const k = S.call[i];
    const a = K.project(c.obj, c.at);
    c.pill.style.opacity = clamp(k * 1.5);
    c.pill.style.transform = `translate(${c.pos[0]}px, ${c.pos[1]}px) translate(-50%, -50%) scale(${Math.max(0, k)})`;
    const kk = clamp(k);
    c.line.setAttribute('x1', c.pos[0]); c.line.setAttribute('y1', c.pos[1]);
    c.line.setAttribute('x2', lerp(c.pos[0], a.x, kk)); c.line.setAttribute('y2', lerp(c.pos[1], a.y, kk));
    c.line.setAttribute('opacity', kk > 0 ? 1 : 0);
    c.dot.setAttribute('cx', a.x); c.dot.setAttribute('cy', a.y); c.dot.setAttribute('r', 9 * clamp(k * 2 - 1));
  });

  // gourd
  K.gourd.scale.setScalar(1.25 * Math.max(0.0001, S.gourd));
  K.gourd.rotation.y = (1 - S.gourd) * 2;
  K.gourd.visible = S.gourd > 0.001;
  K.wet.material.opacity = S.wet;

  // water stream
  const stream = $('#stream'), hi = $('#streamHi');
  if (S.pour > 0 && S.pourEnd < 1) {
    K.scene.updateMatrixWorld(true);
    const tp = K.project(K.pot, TIP), m = K.project(K.gourd, [0, 178, 0]);
    const wob = Math.sin(t * 31) * 2.5;
    const d = `M${tp.x} ${tp.y} C${tp.x - 14} ${tp.y + 50} ${m.x + wob} ${lerp(tp.y, m.y, .45)} ${m.x + wob * .5} ${m.y}`;
    for (const e of [stream, hi]) {
      e.setAttribute('d', d); e.setAttribute('pathLength', 1);
      e.style.strokeDasharray = `${S.pour - S.pourEnd} 3`; e.style.strokeDashoffset = -S.pourEnd;
      e.setAttribute('opacity', 1);
    }
    hi.setAttribute('transform', 'translate(-3 0)'); hi.setAttribute('opacity', .8);
    drops.forEach(dr => {
      const cyc = ((t * 2.2 + dr.ph) % 1), on = S.pour >= 1 && S.pourEnd < .2;
      dr.el.setAttribute('cx', m.x + Math.cos(dr.a) * dr.v * cyc); dr.el.setAttribute('cy', m.y + Math.sin(dr.a) * dr.v * cyc + 260 * cyc * cyc);
      dr.el.setAttribute('opacity', on ? (1 - cyc) * .9 : 0);
    });
  } else {
    stream.setAttribute('opacity', 0); hi.setAttribute('opacity', 0);
    drops.forEach(dr => dr.el.setAttribute('opacity', 0));
  }

  // steam (from the gourd while pouring, from the spout in the how-to)
  const steamK = Math.max(S.steam, S.steamTip);
  if (steamK > 0) {
    const src = S.steamTip > S.steam ? K.project(K.pot, [PROFILE.tip[0], PROFILE.tip[1] + 10, 0]) : K.project(K.gourd, [0, 190, 0]);
    steam.forEach((w, i) => {
      const cyc = (t * .55 + w.ph) % 1;
      w.g.setAttribute('transform', `translate(${src.x + w.dx * (S.steamTip > S.steam ? .5 : 1)} ${src.y - 20 - cyc * 60}) scale(${S.steamTip > S.steam ? .7 : 1})`);
      for (const p of [w.soft, w.line]) { p.style.strokeDasharray = '.4 .6'; p.style.strokeDashoffset = -cyc + .4; }
      w.g.setAttribute('opacity', steamK * Math.sin(cyc * Math.PI) * .9);
    });
  } else steam.forEach(w => w.g.setAttribute('opacity', 0));

  // sun, wire, sparks
  const sun = $('#sun');
  sun.setAttribute('opacity', clamp(S.sun * 1.5));
  sun.setAttribute('transform', `translate(810 ${lerp(1250, 800, easeOut(clamp(S.sun)))}) scale(${lerp(.6, 1, clamp(S.sun))})`);
  $('#rays').setAttribute('transform', `rotate(${t * 22})`);
  const wire = $('#wire');
  if (S.wire > 0) {
    const b = K.project(K.base, [PROFILE.base.x0 + 30, -30, 60]);
    const d = `M330 1560 C 400 1560 ${b.x - 160} ${b.y + 40} ${b.x} ${b.y}`;
    wire.setAttribute('d', d); wire.setAttribute('opacity', S.wire);
    const L = wire.getTotalLength();
    sparks.forEach((s, i) => {
      const u = S.spark * 1.2 - i * .22, on = u > 0 && u < 1;
      const pt = wire.getPointAtLength(clamp(u) * L);
      s.setAttribute('cx', pt.x); s.setAttribute('cy', pt.y); s.setAttribute('opacity', on ? S.wire : 0);
    });
  } else { wire.setAttribute('opacity', 0); sparks.forEach(s => s.setAttribute('opacity', 0)); }

  // how-to: press ripples on the power icon, arc arrow around the dial
  if (t > 21.5 && t < 23.4) {
    const pw = K.project(K.base, [320, 1, 165]);
    pRing.forEach((e, k) => {
      const s = clamp(S.press * 1.3 - k * .3);
      e.setAttribute('cx', pw.x); e.setAttribute('cy', pw.y); e.setAttribute('rx', 20 + s * 90); e.setAttribute('ry', (20 + s * 90) * .55);
      e.setAttribute('opacity', s > 0 && s < 1 ? 1 - s : 0);
    });
    const c = K.project(K.base, [D.x, D.h, D.z]);
    const a0 = -2.4, a1 = a0 + S.turn * 2.6, rx = 190, ry = 110;
    const pts = []; for (let k = 0; k <= 30; k++) { const a = lerp(a0, a1, k / 30); pts.push(`${c.x + Math.cos(a) * rx} ${c.y + Math.sin(a) * ry}`); }
    turnArc.setAttribute('d', 'M' + pts.join(' L'));
    turnArc.setAttribute('opacity', S.turn > 0 && t < 23.2 ? 1 : 0);
    const ha = a1, hx = c.x + Math.cos(ha) * rx, hy = c.y + Math.sin(ha) * ry, tx = -Math.sin(ha) * rx, ty = Math.cos(ha) * ry, tl2 = Math.hypot(tx, ty);
    const ux = tx / tl2, uy = ty / tl2;
    turnHead.setAttribute('d', `M${hx + ux * 26} ${hy + uy * 26} L${hx - uy * 16} ${hy + ux * 16} L${hx + uy * 16} ${hy - ux * 16} Z`);
    turnHead.setAttribute('opacity', S.turn > 0.05 && t < 23.2 ? 1 : 0);
  } else { pRing.forEach(e => e.setAttribute('opacity', 0)); turnArc.setAttribute('opacity', 0); turnHead.setAttribute('opacity', 0); }
  const si = t < 22.4 ? 0 : t < 23.2 ? 1 : 2;
  $('#stepNum').textContent = STEPS[si][0]; $('#stepWord').textContent = STEPS[si][1];
  const pop = [21.65, 22.4, 23.2][si], pk = clamp((t - pop) / .3);
  const stepIn = prog(t, 21.65, 21.95), stepOut = prog(t, 23.8, 24.05);
  $('#step').style.opacity = stepIn * (1 - stepOut);
  $('#step').style.transform = `translateY(${-stepOut * 30}px) scale(${lerp(.6, 1, easeOut(pk)) * (si === 0 ? 1 : 1)})`;
  K.power.material.emissive.setRGB(.25 * S.press * (t < 23.2 ? 1 : 0), .7 * S.press * (t < 23.2 ? 1 : 0), .3 * S.press * (t < 23.2 ? 1 : 0));

  // leaf flies into the logo tile
  const l2 = $('#leaf2');
  if (S.leaf2 > 0) {
    const k = S.leaf2;
    const x = lerp(980, 540, k) + Math.sin(k * Math.PI) * -160, y = lerp(-160, 255, k) - Math.sin(k * Math.PI) * 40;
    l2.setAttribute('transform', `translate(${x} ${y}) rotate(${lerp(-200, 26, k)}) scale(${lerp(.5, .27, k)})`);
    l2.setAttribute('opacity', 1);
  } else l2.setAttribute('opacity', 0);

  // CTA shine
  $('#cta').style.setProperty('--shine', `${lerp(-200, 700, S.shine % 1 || (S.shine > 0 ? 1 : 0))}px`);
}

// ---------- render entry ----------
export function renderFrame(t) {
  tl.seek(t, false);
  procedural(t);
  K.render();
}
window.renderFrame = renderFrame;
window.DURATION = DURATION;
window.FPS = FPS;

// ---------- preview harness ----------
if (RENDER) document.body.classList.add('render');
function fit() {
  const st = $('#stage');
  if (RENDER) { st.style.transform = 'none'; return; }
  const s = Math.min(innerWidth / 1080, (innerHeight - 52) / 1920);
  st.style.transform = `translate(${(innerWidth - 1080 * s) / 2}px, 0) scale(${s})`;
}
addEventListener('resize', fit); fit();
renderFrame(0);
window.READY = true;
if (!RENDER) {
  let playing = true, t0 = performance.now(), cur = 0;
  const scrub = $('#scrub'), clock = $('#clock'), btn = $('#play');
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? 'Pause' : 'Play'; t0 = performance.now() - cur * 1000; };
  scrub.oninput = () => { cur = scrub.value / 3000 * DURATION; t0 = performance.now() - cur * 1000; renderFrame(cur); clock.textContent = cur.toFixed(2) + 's'; };
  const loop = now => {
    if (playing) { cur = ((now - t0) / 1000) % DURATION; renderFrame(cur); scrub.value = cur / DURATION * 3000; clock.textContent = cur.toFixed(2) + 's'; }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
