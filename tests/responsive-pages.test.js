const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pages = [
  'index.html',
  'agenda.html',
  'comercio.html',
  'gastronomia.html',
  'gastronomia-premium.html',
  'guia-practica.html',
  'que-hacer.html'
];

const cssPath = path.join(root, 'css', 'styles.css');
const css = fs.readFileSync(cssPath, 'utf8');

test('the main public pages include a viewport meta tag for mobile devices', () => {
  pages.forEach((file) => {
    const fullPath = path.join(root, file);
    const html = fs.readFileSync(fullPath, 'utf8');
    // El orden de los atributos no importa: varias páginas escriben
    // content="…" antes de name="viewport".
    const viewport = html.match(/<meta[^>]*name=["']viewport["'][^>]*>/i);
    assert.ok(viewport, `${file} should include a viewport meta tag`);
    assert.match(viewport[0], /width=device-width/i, `${file} viewport should scale to the device`);
  });
});

test('the responsive stylesheet includes mobile breakpoints and safe-area support', () => {
  assert.match(css, /@media \(max-width: 768px\)/i, 'expected a tablet/mobile breakpoint');
  assert.match(css, /env\(safe-area-inset-bottom\)/i, 'expected safe-area support for mobile devices');
  assert.match(css, /overflow-x:\s*hidden/i, 'expected horizontal overflow protection');
});
