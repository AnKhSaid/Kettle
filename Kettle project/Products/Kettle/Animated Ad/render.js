// Renders index.html frame by frame into an MP4 (Chromium via Playwright + ffmpeg).
//
//   node render.js                          -> matet-ad.mp4 (muxes audio/mix.wav if present)
//   node render.js --stills 1,5.5,12        -> PNG stills in stills/ for quick review
//   node render.js --from 10 --to 15 --out part.mp4
//
// Env: FFMPEG (default "ffmpeg"), CHROMIUM (optional Chromium executable path).
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(process.execPath, '../../lib/node_modules/playwright'))); }

const dir = __dirname;
const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const stills = arg('--stills');
const out = arg('--out', 'matet-ad.mp4');

// tiny static server (ES modules don't load from file://)
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const p = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(dir) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/index.html?render=1`;
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}),
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-compositing'],   // gpu compositing reuses stale tiles (ghosting)
  });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
  const { DURATION, FPS } = await page.evaluate(() => ({ DURATION: window.DURATION, FPS: window.FPS }));

  if (stills) {
    fs.mkdirSync(path.join(dir, 'stills'), { recursive: true });
    for (const s of stills.split(',').map(Number)) {
      await page.evaluate(t => window.renderFrame(t), s);
      await page.screenshot({ path: path.join(dir, 'stills', `t${s.toFixed(2)}.png`) });
    }
    console.log('stills done');
  } else {
    const from = Number(arg('--from', 0)), to = Number(arg('--to', DURATION));
    const f0 = Math.round(from * FPS), f1 = Math.round(to * FPS);
    const audio = path.join(dir, 'audio', 'mix.wav');
    const withAudio = fs.existsSync(audio) && !process.argv.includes('--silent');
    const ff = spawn(FFMPEG, [
      '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      ...(withAudio ? ['-ss', String(from), '-t', String(to - from), '-i', audio] : []),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart',
      ...(withAudio ? ['-c:a', 'aac', '-b:a', '256k', '-shortest'] : []),
      path.join(dir, out),
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = f0; f < f1; f++) {
      await page.evaluate(t => window.renderFrame(t), f / FPS);
      const buf = await page.screenshot({ type: 'png' });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if ((f - f0) % 90 === 0) console.log(`frame ${f - f0}/${f1 - f0}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log('done ->', out);
  }
  await browser.close();
  server.close();
})();
