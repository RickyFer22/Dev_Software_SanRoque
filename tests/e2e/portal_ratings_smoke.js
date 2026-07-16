'use strict';
// Smoke E2E del portal: estrellas, votación (promedio + 1/IP), compartir y permalinks.
// Levanta el server admin (API) + un static/proxy y maneja el portal con Chromium.
//   node tests/e2e/portal_ratings_smoke.js

const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

function loadPlaywright() {
  const candidates = ['playwright', process.env.PW_PATH, 'C:/Users/Ricardo/AppData/Roaming/npm/node_modules/playwright'];
  for (const c of candidates) {
    if (!c) continue;
    try { return require(c); } catch (_) { /* siguiente */ }
  }
  throw new Error('No se encontró Playwright. Instalá con: npm i -D playwright, o definí PW_PATH.');
}
const ROOT = path.join(__dirname, '..', '..');
const ADMIN = path.join(ROOT, 'deploy', 'admin', 'server.js');
const API_PORT = 4150;
const WEB_PORT = 4151;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'vsr-e2e-'));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webp': 'image/webp' };

function startAdmin() {
  return new Promise((resolve, reject) => {
    const c = spawn(process.execPath, [ADMIN], {
      env: Object.assign({}, process.env, { PORT: String(API_PORT), DATA_DIR, NODE_ENV: 'development', SESSION_SECRET: 'e2e' }),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let ready = false;
    const on = (d) => { if (!ready && /escuchando/.test(String(d))) { ready = true; resolve(c); } };
    c.stdout.on('data', on); c.stderr.on('data', on);
    setTimeout(() => !ready && reject(new Error('admin timeout')), 8000);
  });
}

function startWeb() {
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/')) {
      const proxy = http.request({ host: '127.0.0.1', port: API_PORT, path: req.url, method: req.method, headers: req.headers }, (up) => {
        res.writeHead(up.statusCode, up.headers); up.pipe(res);
      });
      proxy.on('error', () => { res.writeHead(502); res.end('proxy error'); });
      req.pipe(proxy);
      return;
    }
    let file = decodeURIComponent(req.url.split('?')[0]);
    if (file === '/') file = '/index.html';
    const full = path.join(ROOT, file);
    if (!full.startsWith(ROOT) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
    fs.createReadStream(full).pipe(res);
  });
  return new Promise((resolve) => server.listen(WEB_PORT, () => resolve(server)));
}

(async () => {
  const results = [];
  const ok = (n) => results.push('  PASS  ' + n);
  const bad = (n, e) => results.push('  FAIL  ' + n + ' => ' + e);
  const admin = await startAdmin();
  const web = await startWeb();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const base = `http://localhost:${WEB_PORT}`;

  try {
    // 1) Home carga y renderiza hospedajes con estrellas.
    await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#accommodations-carousel article', { timeout: 8000 });
    ok('home renderiza tarjetas de hospedaje');

    // 2) Abrir un detalle y votar.
    await page.click('#accommodations-carousel article button');
    await page.waitForSelector('#detailed-accommodation-view.block, #detailed-accommodation-view:not(.hidden)', { timeout: 5000 });
    await page.waitForSelector('#det-interactive-stars .vsr-rate-btn', { timeout: 5000 });
    const [voteResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/vote') && r.request().method() === 'POST', { timeout: 5000 }),
      page.click('#det-interactive-stars .vsr-rate-btn:nth-child(4)'),
    ]);
    const vjson = await voteResp.json();
    if (vjson.ok && vjson.count >= 1) ok('votar en detalle registra voto y promedio'); else bad('voto detalle', JSON.stringify(vjson));

    // 3) Permalink de hospedaje ?h= abre el detalle.
    await page.goto(`${base}/index.html?h=jr`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => {
      const v = document.getElementById('detailed-accommodation-view');
      return v && !v.classList.contains('hidden');
    }, { timeout: 6000 });
    ok('permalink ?h=jr abre el detalle');

    // 4) Gastronomía: estrellas por local y permalink ?g=.
    await page.goto(`${base}/gastronomia.html`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#gastronomia-grid .vsr-interactive .vsr-rate-btn', { timeout: 8000 });
    ok('gastronomía renderiza estrellas interactivas');
    await page.goto(`${base}/gastronomia.html?g=estela`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#gastro-estela', { timeout: 6000 });
    ok('permalink ?g=estela ubica el local');

    if (!errors.length) ok('sin errores de consola'); else bad('errores de consola', errors.slice(0, 3).join(' | '));
  } catch (e) {
    bad('excepción', e.message);
  }

  await browser.close();
  admin.kill('SIGKILL');
  web.close();
  try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch (_) {}
  const failed = results.filter((r) => r.startsWith('  FAIL')).length;
  console.log('\n' + results.join('\n') + `\n\n${results.length - failed}/${results.length} OK\n`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
