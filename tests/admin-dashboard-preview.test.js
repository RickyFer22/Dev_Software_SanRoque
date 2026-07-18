const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('el resumen incluye una vista integrada del portal público', () => {
  const html = read('deploy/admin/static/index.html');

  assert.match(
    html,
    /<section class="[^"]*portal-preview-card[^"]*"[\s\S]*?<\/section>/,
    'la vista previa debe usar una etiqueta section balanceada para no anidar los CRUD dentro del resumen',
  );
  assert.match(html, /<h2[^>]*>Vista del portal<\/h2>/);
  assert.match(html, /id="portal-preview-frame"/);
  assert.match(html, /src="\/"/);
  assert.match(html, /title="Vista previa del portal público de Viví San Roque"/);
});

test('la vista permite alternar escritorio y móvil, recargar y abrir el portal', () => {
  const html = read('deploy/admin/static/index.html');
  const app = read('deploy/admin/static/app.js');

  assert.match(html, /data-preview-device="desktop"/);
  assert.match(html, /data-preview-device="mobile"/);
  assert.match(html, /id="portal-preview-refresh"/);
  assert.match(html, /href="\/"[^>]+target="_blank"/);
  assert.match(app, /function setPortalPreviewDevice\(device\)/);
  assert.match(app, /function refreshPortalPreview\(\)/);
});

test('la captura visual tiene layout responsive y respeta movimiento reducido', () => {
  const css = read('deploy/admin/static/admin.css');

  assert.match(css, /\.portal-preview-card/);
  assert.match(css, /\.portal-preview-stage\.is-mobile/);
  assert.match(css, /@media \(max-width: 860px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
