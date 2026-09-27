import * as THREE from "three";
import { ease as E, HEIGHT, prog, track, WIDTH } from "../lib/time";
import { CAMERA_DIST, CAMERA_FOV, POSE_A, PROFILE } from "./profile";

// Everything the 3D kettle does over the ad, as a pure function of global time (seconds).
// KettleStage renders it; 2D overlays use `project()` to pin lines and water to it.
export type KettlePose = {
  rig: { x: number; y: number; rx: number; ry: number; s: number };
  liftY: number;
  tilt: number;
  dialRy: number;
  led: number;
  ledOn: number;
  gourd: number;
  wet: number;
  press: number;
  reveal: number;
};

export const kettlePose = (t: number): KettlePose => ({
  rig: {
    x: track(t, [
      [0, POSE_A.x], [14.3, POSE_A.x], [15.2, 115, E.inOut3], [19.1, 115], [19.9, -20, E.inOut3],
      [21.4, -20], [22.0, -520, E.inOut3], [23.1, -520], [24.0, 12, E.inOut3],
    ]),
    y: track(t, [
      [0, POSE_A.y], [11.2, POSE_A.y], [12.8, -300, E.inOut2], [14.3, -300], [15.2, -440, E.inOut3],
      [19.1, -440], [19.9, -420, E.inOut3], [23.1, -420], [24.0, -290, E.inOut3],
    ]),
    rx: track(t, [
      [0, 0], [11.2, 0], [12.8, 0.2, E.inOut2], [14.3, 0.2], [15.2, 0.14, E.inOut3],
      [21.4, 0.14], [22.0, 0.55, E.inOut3], [23.1, 0.55], [24.0, 0.1, E.inOut3],
    ]),
    ry: track(t, [
      [0, 0], [11.2, 0], [12.8, 0.62, E.inOut2], [14.3, 0.32, E.sine], [15.2, -0.15, E.inOut3],
      [19.1, -0.15], [19.9, 0.45, E.inOut3], [21.4, 0.45], [22.0, -0.15, E.inOut3],
      [23.1, -0.15], [24.0, -0.45, E.inOut3], [28.2, 0, E.out3],
    ]),
    s: track(t, [
      [0, 1], [14.3, 1], [15.2, 0.92, E.inOut3], [19.1, 0.92], [19.9, 0.82, E.inOut3],
      [21.4, 0.82], [22.0, 2.1, E.inOut3], [23.1, 2.1], [24.0, 0.95, E.inOut3],
    ]),
  },
  liftY: track(t, [[0, PROFILE.pivot[1]], [15.05, PROFILE.pivot[1]], [15.85, 460, E.inOut2], [18.6, 460], [19.2, PROFILE.pivot[1], E.inOut2]]),
  tilt: track(t, [[0, 0], [15.05, 0], [15.85, 0.45, E.inOut2], [18.6, 0.45], [19.2, 0, E.inOut2]]),
  dialRy: track(t, [[0, 0], [22.5, 0], [23.1, -2.4, E.inOut2]]),
  led: t < 21.45 ? 77 : track(t, [[21.45, 28], [22.5, 28], [23.1, 77, E.inOut2]]),
  ledOn: t < 21.45 ? prog(t, 11.35, 11.65) : prog(t, 21.95, 22.1),
  gourd: t < 19 ? prog(t, 14.55, 15.15, E.backOut) : 1 - prog(t, 19.05, 19.4, E.backIn),
  wet: prog(t, 15.95, 16.85, E.out2) * 0.55,
  press: t < 23.1 ? prog(t, 21.9, 22.5, E.out2) : 0,
  // bottom-to-top wipe that turns the ink drawing into the 3D kettle
  reveal: prog(t, 10.55, 11.3, E.inOut2),
});

// --------------------------------------------------------------------------- projection
// A mirror of the scene graph with the same camera, so 2D layers can find where a point
// on the kettle lands on screen (e.g. callout leader lines, the stream from the spout).
const camera = new THREE.PerspectiveCamera(CAMERA_FOV, WIDTH / HEIGHT, 100, CAMERA_DIST * 3);
camera.position.set(0, 0, CAMERA_DIST);
camera.lookAt(0, 0, 0);
camera.updateMatrixWorld(true);
camera.updateProjectionMatrix();

const rig = new THREE.Object3D();
const lift = new THREE.Object3D();
const pot = new THREE.Object3D();
const base = new THREE.Object3D();
const gourd = new THREE.Object3D();
rig.add(lift, base, gourd);
lift.add(pot);
pot.position.set(-PROFILE.pivot[0], -PROFILE.pivot[1], 0);
gourd.position.set(-440, -PROFILE.base.h, 90);

export const GOURD_SCALE = 1.4;

export const applyPose = (o: { rig: THREE.Object3D; lift: THREE.Object3D; gourd: THREE.Object3D }, p: KettlePose) => {
  o.rig.position.set(p.rig.x, p.rig.y, 0);
  o.rig.rotation.set(p.rig.rx, p.rig.ry, 0);
  o.rig.scale.setScalar(p.rig.s);
  o.lift.position.set(PROFILE.pivot[0], p.liftY, 0);
  o.lift.rotation.set(0, 0, p.tilt);
  o.gourd.scale.setScalar(GOURD_SCALE * Math.max(0.0001, p.gourd));
  o.gourd.rotation.set(0, (1 - p.gourd) * 2, 0);
};

const v = new THREE.Vector3();
export type Part = "pot" | "base" | "gourd";

/** Screen position (px) of a point given in a part's local space, at time t. */
export const project = (t: number, part: Part, local: readonly [number, number, number]) => {
  applyPose({ rig, lift, gourd }, kettlePose(t));
  rig.updateMatrixWorld(true);
  const obj = part === "pot" ? pot : part === "base" ? base : gourd;
  v.set(local[0], local[1], local[2]).applyMatrix4(obj.matrixWorld).project(camera);
  return { x: ((v.x + 1) / 2) * WIDTH, y: ((1 - v.y) / 2) * HEIGHT };
};
