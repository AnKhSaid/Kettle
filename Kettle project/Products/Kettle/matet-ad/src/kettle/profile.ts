// Shared geometry of the MATET kettle, in "kettle space": origin at the bottom centre of the
// body, y up, 1 unit = 1 screen pixel at z = 0. The shapes are measured from the product
// photo in the brochure (the body is 420 units tall). The 2D line art and the 3D model are
// both built from these numbers, which is why the sketch lines up exactly with the 3D render.

/** Body radius at height h: a straight flare at the bottom that eases into a cylinder. */
export const bodyRadius = (h: number) => {
  const flare = h <= 235 ? 0.222 * (265 - h) : h >= 295 ? 0 : (0.222 * (295 - h) ** 2) / 120;
  return 134.5 + flare;
};

type Cmd = readonly (string | number)[];

export const PROFILE = {
  body: { h: 420 },
  // lid seam, lid and the knob on top of it: lathe profile (radius, height)
  lid: [[0, 423.6], [60, 423.4], [118, 422.6], [123.6, 421.9], [124.4, 419.6], [126, 419.4], [126.8, 421.2], [128.6, 421.6]] as const,
  knob: [
    [0, 423.4], [38, 423.4], [38.6, 431], [39.6, 439], [40.6, 445], [43.6, 450], [49, 454], [57, 457.6],
    [65, 460.6], [69.6, 463], [71.4, 466], [71.4, 474], [70.8, 478.4], [68.6, 481.4], [64, 483.6], [56, 484.6], [0, 485.2],
  ] as const,
  // brushed-steel band around the knob
  knobBand: [[69.6, 462.4], [71.8, 463.3], [72.3, 466], [71.8, 468.7], [69.6, 469.6]] as const,
  // open "7" handle, in the XY plane
  handle: [
    ["M", 126, 409],
    ["L", 190, 408],
    ["Q", 197.5, 407.6, 198.2, 414],
    ["L", 199.2, 423],
    ["Q", 200.2, 430.2, 207.6, 429.6],
    ["L", 271.5, 423.8],
    ["Q", 286.4, 422.4, 285.6, 409],
    ["L", 327.4, 128],
    ["Q", 330.5, 99, 312, 98.6],
    ["Q", 294.4, 98.4, 290.4, 107.4],
    ["L", 224.2, 330.8],
    ["Q", 221.2, 338, 211.4, 337.8],
    ["L", 126, 336],
  ] as ReadonlyArray<Cmd>,
  handleDepth: 44,
  // tapered gooseneck spout: centre line (x, y) and radius at each point
  spout: [
    [-150, 57, 17], [-184, 66, 16.4], [-227, 81, 14.6], [-246, 91.5, 13.8], [-267, 111, 13.1], [-283, 142, 12.7],
    [-293, 192, 12.3], [-301, 243, 12], [-308, 294, 11.8], [-314, 324, 11.5], [-331, 361, 11], [-341.5, 378, 10.5],
    [-356, 393, 9.9], [-371, 403.5, 9.1], [-387, 407.6, 8.2], [-400, 406.8, 7.6], [-407, 403.6, 7.3],
  ] as ReadonlyArray<readonly [number, number, number]>,
  tip: [-407, 403.6] as const,
  // cordless base: a rounded slab (left end hugs the kettle, big rounded right end)
  base: { x0: -205, x1: 440, z: 205, h: 64, rLeft: 205, rRight: 190, foot: 6 },
  dial: { x: 300, z: -12, r: 62, h: 38 },
  power: { x: 322, z: 128, r: 21 },
  statusLed: { x: 366, z: 56 },
  // the pot tilts around this point (in kettle space) when pouring
  pivot: [140, 250] as const,
} as const;

// Camera: a long lens, so the 3D kettle's side view matches the flat 2D drawing.
export const CAMERA_FOV = 14;
export const CAMERA_DIST = 1920 / 2 / Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180);

// Where the kettle sits on screen when the line drawing turns into the 3D model.
export const POSE_A = { x: 13, y: -281 } as const;

/** Body lathe profile (radius, height): rounded foot, flared sides, rounded rim. */
export const bodyProfilePoints = (): [number, number][] => {
  const r0 = bodyRadius(0);
  const pts: [number, number][] = [[0, 0], [r0 - 9, 0], [r0 - 4, 0.9], [r0 - 1.3, 2.8], [r0 - 0.2, 5.6]];
  for (let h = 9; h <= 412; h += h < 60 || (h > 220 && h < 310) ? 6 : 12) pts.push([bodyRadius(h), h]);
  const rt = bodyRadius(420);
  pts.push([rt, 413], [rt - 0.3, 416.4], [rt - 1.4, 419], [rt - 3.2, 420.8], [rt - 5.9, 421.6]);
  return pts;
};
