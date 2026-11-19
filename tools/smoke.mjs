// Rauchtest: node tools/smoke.mjs [tag ...]  -> lädt Türchen, startet, drückt Tasten, meldet Fehler.
// Screenshots: tools/shots/tagNN.png (Desktop) und tagNN-m.png (Handy)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

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
const days = process.argv.slice(2).map(Number).filter(Boolean);
const list = days.length ? days : Array.from({ length: 24 }, (_, i) => i + 1);
const shots = path.join(root, 'tools', 'shots'); fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch();
let failed = 0;
for (const n of list) {
  for (const mobile of [false, true]) {
    const context = await browser.newContext(mobile
      ? { viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }
      : { viewport: { width: 1100, height: 760 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto(`${base}/?vorschau=rentier${mobile ? '&pad=1' : ''}#/${n}`);
    try {
      await page.waitForTimeout(400); await page.locator('.card .btn.primary').click({ timeout: 5000 });
      if (await page.locator('.card').count()) errors.push('Overlay nach Start noch sichtbar (Spiel nicht gebaut oder Fehler in create)');
      await page.waitForTimeout(700);
      const box = await page.locator('.stage').boundingBox();
      for (let i = 0; i < 14; i++) {
        const key = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'x'][i % 6];
        await page.keyboard.down(key); await page.waitForTimeout(90); await page.keyboard.up(key);
        const x = box.x + box.width * (0.2 + 0.6 * Math.random()), y = box.y + box.height * (0.2 + 0.6 * Math.random());
        if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
        await page.waitForTimeout(60);
      }
      await page.waitForTimeout(600);
      const empty = await page.evaluate(() => !document.querySelector('.stage')?.children.length);
      if (empty) errors.push('Spielfläche ist leer');
    } catch (e) { errors.push('ablauf: ' + e.message.split('\n')[0]); }
    await page.screenshot({ path: path.join(shots, `tag${String(n).padStart(2, '0')}${mobile ? '-m' : ''}.png`) });
    console.log(`Tag ${n} ${mobile ? 'mobil  ' : 'desktop'}: ${errors.length ? 'FEHLER\n  ' + [...new Set(errors)].join('\n  ') : 'ok'}`);
    if (errors.length) failed++;
    await context.close();
  }
}
await browser.close(); server.close();
process.exit(failed ? 1 : 0);
