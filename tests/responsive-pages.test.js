const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pages = [
  'index.html',
  'agenda.html',
  'comercio.html',
  'evento.html',
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
    assert.match(html, /<meta\s+name=["']viewport["'][^>]*width=device-width/i, `${file} should include a viewport meta tag`);
  });
});

test('the responsive stylesheet includes mobile breakpoints and safe-area support', () => {
  assert.match(css, /@media \(max-width: 768px\)/i, 'expected a tablet/mobile breakpoint');
  assert.match(css, /env\(safe-area-inset-bottom\)/i, 'expected safe-area support for mobile devices');
  assert.match(css, /overflow-x:\s*hidden/i, 'expected horizontal overflow protection');
});
