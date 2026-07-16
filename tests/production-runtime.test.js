const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('public pages use same-origin production endpoints', () => {
  const publicSources = [
    'index.html',
    'gastronomia.html',
    'js/app.js',
    'js/data.js',
    'js/gastronomia.js',
  ].map(read).join('\n');

  assert.doesNotMatch(publicSources, /127\.0\.0\.1:4000/);
  assert.doesNotMatch(read('index.html'), /href="\/admin(?:\/login)?"/);
  assert.match(read('js/data.js'), /fetch\(`\$\{BACKEND_BASE\}\/api\/data`/);
});

test('production CSP permits the weather fallback', () => {
  const nginx = read('deploy/nginx.conf');
  assert.match(nginx, /connect-src[^;"]*https:\/\/api\.open-meteo\.com/);
});

test('the bridge visual uses the municipal logo and fallback cards reference existing assets', () => {
  assert.match(read('css/styles.css'), /background-image:\s*url\('\.\.\/img\/logo-muni\.jpg'\)/);

  const data = read('js/data.js');
  const assetReferences = [...data.matchAll(/(?:mainImg|galeria):(?:\[)?['"]([^'"]+)/g)].map((match) => match[1]);
  for (const asset of assetReferences) {
    if (/^https?:\/\//.test(asset)) continue;
    assert.ok(fs.existsSync(path.join(root, asset)), `Missing referenced asset: ${asset}`);
  }
});

test('admin runtime does not initialize the incompatible connect-sqlite3 store', () => {
  const server = read('deploy/admin/server.js');
  const pkg = JSON.parse(read('deploy/admin/package.json'));

  assert.doesNotMatch(server, /connect-sqlite3/);
  assert.equal(pkg.dependencies['connect-sqlite3'], undefined);
  assert.equal(pkg.dependencies['better-sqlite3'], undefined);
});

test('admin container includes bot runtime and production migration scripts', () => {
  const dockerfile = read('deploy/admin/Dockerfile');
  assert.match(dockerfile, /COPY package\.json package-lock\.json server\.js(?: security\.js)? seed\.js bot-service\.js/);
  assert.match(dockerfile, /COPY scripts \.\/scripts/);
  assert.match(dockerfile, /node scripts\/migrate-bot-data\.js && exec node server\.js/);
});

test('deployment waits for the admin health endpoint', () => {
  const workflow = read('.github/workflows/deploy.yml');
  assert.match(workflow, /curl[^\n]+\/api\/data/);
  assert.match(workflow, /docker logs --tail 100 vivisanroque_admin/);
});

test('nginx keeps admin static assets behind the admin proxy', () => {
  const nginx = read('deploy/nginx.conf');
  assert.match(nginx, /location\s+\^~\s+\/admin\s*\{/);
});

test('nginx proxies the same-origin bot endpoint to the admin backend', () => {
  const nginx = read('deploy/nginx.conf');
  assert.match(nginx, /location\s*=\s*\/api\/bot\/chat\s*\{/);
  assert.doesNotMatch(nginx, /connect-src[^;\"]*muni-bot-production\.up\.railway\.app/);
});

test('admin dashboard avoids forbidden user requests and uses its proxied health route', () => {
  const app = read('deploy/admin/static/app.js');
  const server = read('deploy/admin/server.js');

  assert.match(app, /role\s*===\s*'super-admin'\s*\?\s*fetchJson\('\/admin\/api\/users'\)/);
  assert.match(app, /fetchJson\('\/admin\/api\/health'\)/);
  assert.match(server, /app\.get\('\/admin\/api\/health'/);
});
