// 指定秒のフレームを PNG で書き出し、コンタクトシートを作る（QA用・高速）
// node tools/preview.mjs <outDir> 0.5 2 4.2 ...   /  node tools/preview.mjs <outDir> --every 0.5
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright'))); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || 'preview');
const rest = process.argv.slice(3);
const times = rest[0] === '--every'
  ? Array.from({ length: Math.floor(15 / Number(rest[1])) }, (_, i) => +(i * Number(rest[1])).toFixed(3))
  : rest.map(Number);
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(r);
}).listen(0);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', e => console.error('pageerror', e));
await page.goto(`http://127.0.0.1:${server.address().port}/index.html?capture=1&mb=1`);
await page.waitForFunction(() => window.__reelReady === true, null, { timeout: 60000 });
const files = [];
for (const [i, t] of times.entries()) {
  await page.evaluate(t => Reel.draw(t), t);
  const f = path.join(OUT, `${String(i).padStart(3, '0')}_t${t.toFixed(2)}.png`);
  await page.screenshot({ path: f });
  files.push(f);
}
await browser.close();
server.close();
if (process.env.FFMPEG && files.length > 1) {
  const cols = Math.min(6, files.length), rows = Math.ceil(files.length / cols);
  execFileSync(process.env.FFMPEG, ['-y', '-loglevel', 'error', '-pattern_type', 'glob', '-i', path.join(OUT, '*_t*.png'),
    '-vf', `scale=320:-1,tile=${cols}x${rows}`, '-frames:v', '1', path.join(OUT, 'sheet.png')]);
  console.log('sheet:', path.join(OUT, 'sheet.png'));
}
console.log(`${files.length} frames → ${OUT}`);
