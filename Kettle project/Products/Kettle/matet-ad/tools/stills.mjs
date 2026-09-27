// Renders a few stills of the ad for quick review (bundles once, then renders each frame).
//   node tools/stills.mjs 1.2,7.6,12.9      -> out/stills/t1.20.png ...  (times in seconds)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const times = (process.argv[2] ?? "1,4,7.6,11,13,16,20,22.5,25,28").split(",").map(Number);
const compId = process.argv[3] ?? "MatetAd";
const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "out", "stills");
fs.mkdirSync(outDir, { recursive: true });

const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const chromiumOptions = { gl: "angle" };
const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts") });
const composition = await selectComposition({ serveUrl, id: compId, browserExecutable: fs.existsSync(browserExecutable) ? browserExecutable : null, chromiumOptions });
for (const t of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(t * composition.fps));
  const output = path.join(outDir, `t${t.toFixed(2)}.png`);
  await renderStill({
    serveUrl, composition, frame, output, imageFormat: "png", chromiumOptions,
    browserExecutable: fs.existsSync(browserExecutable) ? browserExecutable : null,
  });
  console.log("still", t);
}
