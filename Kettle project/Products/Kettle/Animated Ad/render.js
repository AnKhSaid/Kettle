// Renders index.html frame-by-frame to MP4.
//
//   node render.js                       -> matet-ad.mp4 (adds soundtrack.wav if present)
//   node render.js --stills 2,6,12,16    -> PNG stills at those seconds (for review)
//
// Needs: playwright (Chromium) and ffmpeg. Set FFMPEG=/path/to/ffmpeg if it is not on PATH.
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(process.execPath, '../../lib/node_modules/playwright'))); }

const dir = __dirname;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const args = process.argv.slice(2);
const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null;
const outArg = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'matet-ad.mp4';

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(dir, 'index.html') + '?render=1');
  await page.waitForFunction(() => window.READY === true);
  const { DURATION, FPS } = await page.evaluate(() => ({ DURATION: window.DURATION, FPS: window.FPS }));
  const stage = await page.$('#stage');

  if (stillsArg) {
    const outDir = path.join(dir, 'stills');
    fs.mkdirSync(outDir, { recursive: true });
    for (const s of stillsArg.split(',').map(Number)) {
      await page.evaluate(t => window.render(t), s);
      await stage.screenshot({ path: path.join(outDir, `t${s.toFixed(2)}.png`) });
      console.log('still', s);
    }
    await browser.close();
    return;
  }

  const frames = Math.round(DURATION * FPS);
  const audio = path.join(dir, 'soundtrack.wav');
  const hasAudio = fs.existsSync(audio);
  const ff = spawn(FFMPEG, [
    '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    ...(hasAudio ? ['-i', audio] : []),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-movflags', '+faststart',
    ...(hasAudio ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    path.join(dir, outArg),
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => window.render(t), i / FPS);
    const buf = await stage.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`frame ${i}/${frames}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('done ->', outArg);
})();
