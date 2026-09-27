// Loudness-masters the rendered ad for social media (-14 LUFS, -1.2 dBTP) without
// re-encoding the picture. Uses the ffmpeg that ships with Remotion.
//   node tools/master.mjs [in] [out]
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const input = process.argv[2] ?? path.join(root, "out", "matet-ad-raw.mp4");
const output = process.argv[3] ?? path.join(root, "matet-ad.mp4");
execFileSync(
  "npx",
  [
    "remotion", "ffmpeg", "-y", "-loglevel", "error", "-i", input,
    "-af", "loudnorm=I=-14:TP=-1.2:LRA=11",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart", output,
  ],
  { stdio: "inherit", cwd: root },
);
console.log("mastered ->", path.relative(root, output));
