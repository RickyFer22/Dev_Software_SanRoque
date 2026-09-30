// Integridad del sitio estático: enlaces internos vivos y peso de los recursos.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pages = [
  ...fs.readdirSync(root).filter((f) => f.endsWith('.html')),
  'en/index.html',
  'pt/index.html',
];

function localRefs(html) {
  const refs = [];
  for (const m of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const ref = m[1];
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(ref) || /[{$]/.test(ref)) continue;
    refs.push(decodeURI(ref.split(/[?#]/)[0]));
  }
  return refs.filter(Boolean);
}

test('los enlaces y recursos locales de cada página existen', () => {
  const rotos = [];
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const ref of localRefs(html)) {
      // Rutas que resuelve nginx (deploy/nginx.conf), no son archivos.
      if (['/donde-alojarme', '/'].includes(ref) || /^\/(?:hospedajes|gastronomia|agenda)\//.test(ref)) continue;
      const target = path.join(root, ref);
      const file = fs.existsSync(target) && fs.statSync(target).isDirectory() ? path.join(target, 'index.html') : target;
      if (!fs.existsSync(file)) rotos.push(`${ref}  (${page})`);
    }
  }
  assert.deepEqual(rotos, []);
});

test('ninguna imagen del sitio supera 300 KB y el folleto PDF pesa menos de 3 MB', () => {
  const pesadas = [];
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    if (/\.(?:jpe?g|png|webp|gif)$/i.test(e.name) && fs.statSync(p).size > 300 * 1024) pesadas.push(path.relative(root, p));
  });
  walk(path.join(root, 'img'));
  assert.deepEqual(pesadas, []);
  const pdf = path.join(root, 'img/folleto/folleto-turismo-san-roque-octubre-2026.pdf');
  assert.ok(fs.statSync(pdf).size < 3 * 1024 * 1024, 'el folleto debe mantenerse liviano');
});

test('el service worker y el manifiesto existen y las páginas los enlazan', () => {
  assert.ok(fs.existsSync(path.join(root, 'sw.js')));
  JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  for (const page of ['index.html', 'agenda.html', 'guia-practica.html']) {
    assert.match(fs.readFileSync(path.join(root, page), 'utf8'), /rel="manifest"/, page);
  }
});
