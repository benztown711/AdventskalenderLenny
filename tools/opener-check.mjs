// Türöffner-Test: node tools/opener-check.mjs <id|alle> [tag ...]
// Öffnet den Kalender in der Vorschau, tippt das Türchen an, prüft den Türöffner (Fehler, leere Fläche, Überlaufen,
// ein paar zufällige Tipps) und den Erfolgsweg bis zum Spielstart. Screenshots: tools/shots/op-<id>-NN(-m).png
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const ALL = ['frost', 'wirbel', 'schloss', 'dorf', 'karte', 'knobel'];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;
const [which = 'alle', ...rest] = process.argv.slice(2);
const ids = which === 'alle' ? ALL : [which];
const days = rest.map(Number).filter(Boolean);
const list = days.length ? days : [1, 7, 14, 21, 24];
const shots = path.join(root, 'tools', 'shots'); fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch();
let failed = 0;
for (const id of ids) for (const n of list) for (const mobile of [false, true]) for (const yesterday of (id === 'schloss' && n >= 21 ? [false, true] : [false])) {
  const context = await browser.newContext(mobile
    ? { viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }
    : { viewport: { width: 1100, height: 760 }, deviceScaleFactor: 1 });
  if (yesterday) await context.addInitScript(d => { localStorage.setItem('advent2026', JSON.stringify({ days: { [d]: { opened: true, played: true, stars: 2, best: 0, data: {} } } })); }, n - 1);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const tag = `op-${id}-${String(n).padStart(2, '0')}${yesterday ? '-gestern' : ''}${mobile ? '-m' : ''}`;
  try {
    await page.goto(`${base}/?vorschau=rentier&heute=24&tueroeffner=${id}`);
    await page.waitForTimeout(500);
    await page.locator(`.door[data-n="${n}"]`).click({ timeout: 4000 });
    await page.waitForSelector('.opener', { timeout: 3000 });
    await page.waitForTimeout(1000);
    const info = await page.evaluate(() => {
      const r = document.querySelector('.op-root'), st = document.querySelector('.op-stage');
      return { kids: r?.children.length || 0, over: Math.max(st.scrollWidth - st.clientWidth, document.documentElement.scrollWidth - innerWidth), text: r?.innerText || '' };
    });
    if (!info.kids) errors.push('Türöffner-Fläche ist leer');
    if (info.over > 1) errors.push(`horizontales Überlaufen um ${info.over}px`);
    if (!info.text.includes(String(n)) && !(id === 'schloss' && yesterday)) errors.push(`Zielzahl ${n} steht nirgends im Text`);
    await page.screenshot({ path: path.join(shots, tag + '.png') });
    const box = await page.locator('.op-root').boundingBox();
    for (let i = 0; i < 8; i++) {
      const x = box.x + box.width * (0.15 + 0.7 * Math.random()), y = box.y + Math.min(box.height, 560) * (0.15 + 0.7 * Math.random());
      if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
      await page.waitForTimeout(80);
    }
    if (await page.locator('.opener').count()) await page.evaluate(() => window.__opener?.solve());
    await page.waitForFunction(k => location.hash === '#/' + k && document.querySelector('.shell'), n, { timeout: 4000 });
  } catch (e) { errors.push('ablauf: ' + e.message.split('\n')[0]); }
  console.log(`${tag}: ${errors.length ? 'FEHLER\n  ' + [...new Set(errors)].join('\n  ') : 'ok'}`);
  if (errors.length) failed++;
  await context.close();
}
await browser.close(); server.close();
process.exit(failed ? 1 : 0);
