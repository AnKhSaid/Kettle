import { bodyProfilePoints, POSE_A, PROFILE } from "./profile";

// The kettle as ink line art (kettle space, y up). Placed with LINE_ART_TRANSFORM it sits
// exactly on top of the 3D kettle at pose A, so the drawing can "turn into" the model.
const B = PROFILE.body;
const D = PROFILE.dial;
const P = PROFILE.base;

const roundRect = (x0: number, y0: number, x1: number, y1: number, r: number) =>
  `M${x0 + r} ${y0} H${x1 - r} Q${x1} ${y0} ${x1} ${y0 + r} V${y1 - r} Q${x1} ${y1} ${x1 - r} ${y1} H${x0 + r} Q${x0} ${y1} ${x0} ${y1 - r} V${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} Z`;

const arc = bodyProfilePoints().slice(1, -1);
const bodyD =
  `M${-B.r1} ${B.h} ` +
  [...arc].reverse().map(([x, y]) => `L${-x} ${y}`).join(" ") +
  " " +
  arc.map(([x, y]) => `L${x} ${y}`).join(" ") +
  ` L${B.r1} ${B.h} Z`;

const handleD = PROFILE.handle.map((c) => c[0] + c.slice(1).join(" ")).join(" ") + " Z";
const spoutD =
  `M${PROFILE.spout[0][0].join(" ")} ` +
  PROFILE.spout.map((s) => "C" + s.slice(1).map((p) => p.join(" ")).join(" ")).join(" ");

export type LinePart = { id: string; d: string; strokeWidth: number };

export const LINE_PARTS: LinePart[] = [
  { id: "base", d: roundRect(P.x0 - 6, -P.h, P.x1 + 6, 0, 14), strokeWidth: 5 },
  {
    id: "dial",
    d: `M${D.x - D.r} 0 V${D.h - 5} Q${D.x - D.r} ${D.h} ${D.x - D.r + 5} ${D.h} H${D.x + D.r - 5} Q${D.x + D.r} ${D.h} ${D.x + D.r} ${D.h - 5} V0`,
    strokeWidth: 5,
  },
  { id: "body", d: bodyD, strokeWidth: 5 },
  { id: "lid", d: roundRect(-114, B.h, 114, B.h + 24, 5), strokeWidth: 5 },
  { id: "stem", d: `M-16 ${B.h + 24} V${B.h + 48} M16 ${B.h + 24} V${B.h + 48}`, strokeWidth: 5 },
  { id: "knob", d: roundRect(-64, B.h + 48, 64, B.h + 72, 8), strokeWidth: 5 },
  { id: "handle", d: handleD, strokeWidth: 5 },
  { id: "spout", d: spoutD, strokeWidth: 17 },
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
