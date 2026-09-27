// Shared geometry of the MATET kettle, in "kettle space": origin at the bottom centre of the
// body, y up, 1 unit = 1 screen pixel at z = 0. The 2D line art and the 3D model are both
// built from these numbers, which is why the sketch lines up exactly with the 3D render.
export const PROFILE = {
  body: { r0: 200, r1: 105, h: 420, round: 26 },
  handle: [
    ["M", 88, 404],
    ["L", 258, 404],
    ["Q", 282, 404, 286, 380],
    ["L", 330, 120],
    ["Q", 334, 88, 306, 88],
    ["L", 298, 88],
    ["Q", 274, 88, 271, 112],
    ["L", 235, 342],
    ["L", 100, 342],
  ] as ReadonlyArray<readonly (string | number)[]>,
  // gooseneck spout: cubic segments in the XY plane
  spout: [
    [[-168, 70], [-240, 85], [-285, 130], [-295, 230]],
    [[-295, 230], [-304, 320], [-290, 400], [-308, 452]],
    [[-308, 452], [-320, 488], [-345, 508], [-372, 506]],
    [[-372, 506], [-390, 504], [-402, 492], [-412, 474]],
  ] as ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
  tip: [-412, 474] as const,
  base: { x0: -240, x1: 380, z: 215, h: 50 },
  dial: { x: 300, z: 40, r: 58, h: 44 },
  // the pot tilts around this point (in kettle space) when pouring
  pivot: [140, 250] as const,
} as const;

// Camera: a long lens, so the 3D kettle's side view matches the flat 2D drawing.
export const CAMERA_FOV = 14;
export const CAMERA_DIST = 1920 / 2 / Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180);

// Where the kettle sits on screen when the line drawing turns into the 3D model.
export const POSE_A = { x: 13, y: -281 } as const;

// Rounded bottom corner of the body, as (radius, height) points.
export const bodyProfilePoints = (): [number, number][] => {
  const B = PROFILE.body;
  const pts: [number, number][] = [[0, 0]];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2 + Math.atan2(B.r0 - B.r1, B.h));
    pts.push([B.r0 - B.round + Math.cos(a) * B.round, B.round + Math.sin(a) * B.round]);
  }
  pts.push([B.r1, B.h]);
  return pts;
};
