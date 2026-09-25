// Renders the showreel to MP4: node render.mjs [--mb 4] [--workers 4] [--out showreel.mp4] [--frames a:b]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright'))); }

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MB = Number(arg('mb', 4)), WORKERS = Number(arg('workers', Math.max(1, os.cpus().length))), OUT = path.resolve(arg('out', path.join(ROOT, 'showreel.mp4')));
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 60, DUR = 15, TOTAL = FPS * DUR;
const [F0, F1] = (arg('frames', `0:${TOTAL}`)).split(':').map(Number);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-'));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const URL_ = `http://127.0.0.1:${server.address().port}/index.html?capture=1&mb=${MB}`;

const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-gpu-vsync', '--autoplay-policy=no-user-gesture-required'] });
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('pageerror', e));
  await page.goto(URL_);
  await page.waitForFunction(() => window.__reelReady === true, null, { timeout: 60000 });
  return page;
}

// audio
{
  const page = await openPage();
  const b64 = await page.evaluate(async () => {
    const buf = await ReelAudio.render(48000);
    const bytes = new Uint8Array(ReelAudio.toWav(buf));
    let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  });
  fs.writeFileSync(path.join(TMP, 'audio.wav'), Buffer.from(b64, 'base64'));
  await page.close();
  console.log('audio rendered');
}

// frames
const t0 = Date.now();
let next = F0, done = 0;
await Promise.all(Array.from({ length: WORKERS }, async () => {
  const page = await openPage();
  while (next < F1) {
    const f = next++;
    await page.evaluate(t => Reel.draw(t), f / FPS);
    await page.screenshot({ path: path.join(TMP, `f${String(f).padStart(4, '0')}.png`), clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    if (++done % 60 === 0) console.log(`${done}/${F1 - F0} frames  ${((Date.now() - t0) / done).toFixed(0)}ms/frame`);
  }
  await page.close();
}));
await browser.close();
server.close();

execFileSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error',
  '-framerate', String(FPS), '-start_number', String(F0), '-i', path.join(TMP, 'f%04d.png'),
  '-ss', String(F0 / FPS), '-i', path.join(TMP, 'audio.wav'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
  '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
console.log('wrote', OUT, `(${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB) frames in ${TMP}`);
