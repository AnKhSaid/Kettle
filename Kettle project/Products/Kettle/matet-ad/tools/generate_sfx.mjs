// Generates option 1's sound effects with ElevenLabs Sound Effects (text -> sound).
//   ELEVENLABS_API_KEY=... node tools/generate_sfx.mjs [takes=3] [name,name,...]
// Reads tools/sfx-prompts.json and writes audio-src/sfx/elevenlabs/<name>-<take>.mp3.
// Existing takes are skipped, so it can be re-run after a failure without paying twice.
import fs from "node:fs";
import path from "node:path";

const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("Set ELEVENLABS_API_KEY in the environment.");
  process.exit(1);
}
const root = path.resolve(import.meta.dirname, "..");
const { sounds } = JSON.parse(fs.readFileSync(path.join(root, "tools", "sfx-prompts.json"), "utf8"));
const takes = Number(process.argv[2] ?? 3);
const only = process.argv[3]?.split(",");
const outDir = path.join(root, "audio-src", "sfx", "elevenlabs");
fs.mkdirSync(outDir, { recursive: true });

for (const s of sounds.filter((x) => !only || only.includes(x.name))) {
  for (let k = 1; k <= takes; k++) {
    const file = path.join(outDir, `${s.name}-${k}.mp3`);
    if (fs.existsSync(file)) continue;
    const res = await fetch("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192", {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ text: s.text, duration_seconds: Math.min(22, Math.max(0.5, s.seconds)), prompt_influence: 0.55 }),
    });
    if (!res.ok) {
      console.error(`${s.name}-${k}: HTTP ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    console.log("wrote", path.relative(root, file));
  }
}
