import { bodyProfilePoints, POSE_A, PROFILE } from "./profile";

// The kettle as ink line art (kettle space, y up). Placed with LINE_ART_TRANSFORM it sits
// exactly on top of the 3D kettle at pose A, so the drawing can "turn into" the model.
const D = PROFILE.dial;
const P = PROFILE.base;

const roundRect = (x0: number, y0: number, x1: number, y1: number, r: number) =>
  `M${x0 + r} ${y0} H${x1 - r} Q${x1} ${y0} ${x1} ${y0 + r} V${y1 - r} Q${x1} ${y1} ${x1 - r} ${y1} H${x0 + r} Q${x0} ${y1} ${x0} ${y1 - r} V${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} Z`;

const f = (n: number) => n.toFixed(1);

/** Outline of a lathe profile seen from the side: up the left, over the top, down the right. */
const latheOutline = (pts: ReadonlyArray<readonly [number, number]>, closeBottom: boolean) => {
  const side = pts.filter(([r]) => r > 0);
  const left = side.map(([r, y]) => `${f(-r)} ${f(y)}`);
  const right = [...side].reverse().map(([r, y]) => `${f(r)} ${f(y)}`);
  return `M${[...left, ...right].join(" L")}${closeBottom ? " Z" : ""}`;
};

/** Outline of the tapered spout: both edges of the tube, joined at the tip. */
const spoutOutline = () => {
  const pts = PROFILE.spout.slice(1);
  const at = (i: number) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  const samples: [number, number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < 8; k++) {
      const u = k / 8;
      const u2 = u * u;
      const u3 = u2 * u;
      const cr = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      samples.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1]), p1[2] + (p2[2] - p1[2]) * u]);
    }
  }
  samples.push([...pts[pts.length - 1]]);
  const edge = (sign: number) =>
    samples.map(([x, y, r], i) => {
      const [ax, ay] = samples[Math.max(0, i - 1)];
      const [bx, by] = samples[Math.min(samples.length - 1, i + 1)];
      const len = Math.hypot(bx - ax, by - ay) || 1;
      return `${f(x - (sign * (by - ay) * r) / len)} ${f(y + (sign * (bx - ax) * r) / len)}`;
    });
  return `M${[...edge(1), ...edge(-1).reverse()].join(" L")}`;
};

const handleD = PROFILE.handle.map((c) => c[0] + c.slice(1).join(" ")).join(" ") + " Z";

export type LinePart = { id: string; d: string; strokeWidth: number };

const slabTop = -(P.h - P.foot);

export const LINE_PARTS: LinePart[] = [
  { id: "base", d: `${roundRect(P.x0, slabTop, P.x1, 0, 9)} M${P.x0 + 8} ${slabTop} V${-P.h} H${P.x1 - 8} V${slabTop}`, strokeWidth: 5 },
  {
    id: "dial",
    d: `M${D.x - D.r} 0 V${D.h - 5} Q${D.x - D.r} ${D.h} ${D.x - D.r + 5} ${D.h} H${D.x + D.r - 5} Q${D.x + D.r} ${D.h} ${D.x + D.r} ${D.h - 5} V0`,
    strokeWidth: 5,
  },
  { id: "body", d: latheOutline(bodyProfilePoints(), true), strokeWidth: 5 },
  { id: "knob", d: latheOutline(PROFILE.knob, false), strokeWidth: 5 },
  { id: "handle", d: handleD, strokeWidth: 5 },
  { id: "spout", d: spoutOutline(), strokeWidth: 5 },
];

export const LINE_ART_X = 540 + POSE_A.x;
export const LINE_ART_Y = 960 - POSE_A.y;
export const LINE_ART_TRANSFORM = `translate(${LINE_ART_X} ${LINE_ART_Y}) scale(1 -1)`;

// The dial's outline in screen space: the temperature ring morphs into this.
const dx0 = LINE_ART_X + D.x - D.r;
const dx1 = LINE_ART_X + D.x + D.r;
const dy0 = LINE_ART_Y - D.h;
const dy1 = LINE_ART_Y;
export const DIAL_SCREEN = { cx: (dx0 + dx1) / 2, cy: (dy0 + dy1) / 2 };
export const DIAL_OUTLINE_D = `M${dx0} ${dy1} V${dy0 + 5} Q${dx0} ${dy0} ${dx0 + 5} ${dy0} H${dx1 - 5} Q${dx1} ${dy0} ${dx1} ${dy0 + 5} V${dy1}`;
