const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const publicFooterPages = [
  'index.html',
  'agenda.html',
  'comercio.html',
  'gastronomia.html',
  'guia-practica.html',
  'que-hacer.html',
];

test('footer exposes the approved institutional information architecture', () => {
  const html = read('index.html');

  assert.match(html, /class="footer-social-band"/);
  assert.match(html, /Portal oficial de turismo y cultura/);
  assert.match(html, /Proyecto educativo · tecnología local/i);
});

test('public footers remove obsolete legal copy while preserving institutional credits', () => {
  for (const file of publicFooterPages) {
    const html = read(file);
    assert.doesNotMatch(html, /Política de privacidad|Términos y condiciones/i, file);
    assert.match(html, /Proyecto educativo · tecnología local/i, file);
    assert.match(html, /Daniel Almirón · Lucas Sánchez · Milca Martínez · Román Rossi · Tomás Rolet/, file);
    assert.match(html, /<b>Ayudante:<\/b> Javier Legal[\s\S]*<b>Profesora:<\/b> Yésica Ponce/, file);
  }
});

test('footer compact layout halves its main vertical dimensions and uses olive credits', () => {
  const css = read('css/styles.css');

  assert.match(css, /\.footer-cream-crown\s*\{[^}]*height:\s*54px/s);
  assert.match(css, /\.footer-social-band\s*\{[^}]*padding:\s*36px 0 17px/s);
  assert.match(css, /\.site-footer \.footer-bottombar\s*\{[^}]*padding:\s*14px 0 0/s);
  assert.match(css, /\.site-footer \.academic-credits[^}]*color:\s*var\(--brand-primary\)/s);
  assert.match(css, /\.site-footer \.compact-footer-legal\s*\{[^}]*padding:\s*7px 24px 9px/s);
  assert.match(css, /\.site-footer \.academic-credits\s*\{[^}]*background:\s*transparent[^}]*color:\s*var\(--brand-primary\)/s);
  assert.doesNotMatch(css, /\.site-footer \.academic-credits,\s*\.site-footer \.compact-footer-legal\s*\{[^}]*color:\s*var\(--text-muted\)/s);
});

test('weather uses the warm complementary palette without blue surfaces', () => {
  const css = read('css/styles.css');
  const weatherBlock = css.match(/\/\* ── WEATHER WIDGET[\s\S]*?\.service-badge/)?.[0] || '';

  assert.match(weatherBlock, /--weather-900:\s*#4B211C/i);
  assert.match(weatherBlock, /--weather-500:\s*#B85E38/i);
  assert.match(weatherBlock, /--weather-sun:\s*#FFD27A/i);
  assert.doesNotMatch(weatherBlock, /#0A4363|#0F5A7E|#17739B|#2189B8|#2E97C4/i);
});

test('accommodation map renders a visible urban trace and accessible legend', () => {
  const html = read('index.html');
  const app = read('js/app.js');
  const css = read('css/styles.css');

  assert.match(html, /class="map-legend"/);
  assert.match(html, /Traza urbana/);
  assert.match(html, /Calles, accesos y alojamientos/);
  assert.match(app, /SAN_ROQUE_URBAN_TRACE/);
  assert.match(app, /L\.geoJSON/);
  assert.match(app, /tile\.openstreetmap\.org/);
  assert.match(app, /L\.control\.scale/);
  assert.match(app, /fitBounds/);
  assert.match(app, /isSanRoqueCoordinate/);
  assert.match(css, /\.map-urban-trace/);
  assert.match(css, /\.accommodation-map-marker/);
});

test('public footers credit the photographer', () => {
  for (const file of publicFooterPages) {
    const html = read(file);
    assert.match(html, /class="footer-photo-credit/, file);
    assert.match(html, /instagram\.com\/claritysanroque/, file);
  }
  assert.match(read('css/styles.css'), /\.footer-photo-credit\s*\{/);
});

test('the map only plots lodgings, never places or services', () => {
  const app = read('js/app.js');

  // alojamientosData mezcla hospedajes con lugares y servicios (farmacias,
  // iglesias, policía): sin este filtro el mapa los dibuja con ícono de cama.
  assert.match(app, /const NON_LODGING_CATEGORIES = \[[^\]]*'farmacia'[^\]]*\]/);
  const initMap = app.match(/function initMap\(\)[\s\S]*?\n\}/)?.[0] || '';
  assert.match(initMap, /isLodging\(data\)/);
  assert.match(initMap, /lodgingBounds/);
});

test('the lodging section is reachable through its own URL', () => {
  assert.match(read('deploy/nginx.conf'), /location = \/donde-alojarme/);
  assert.match(read('js/app.js'), /pushState\(\{\}, '', '\/donde-alojarme'\)/);
  for (const file of ['index.html', 'agenda.html', 'gastronomia.html', 'guia-practica.html', 'que-hacer.html']) {
    assert.match(read(file), /href="\/donde-alojarme"/, file);
  }
});

test('the Puente Carretero long read exists and is linked from Qué hacer', () => {
  const page = read('puente-carretero.html');
  assert.match(page, /<h1>Puente Carretero<\/h1>/);
  assert.match(page, /class="long-read/);
  // El ancho de lectura no puede depender de max-w-3xl: tw-base.css no la trae.
  assert.doesNotMatch(page, /max-w-3xl/);
  assert.match(read('css/styles.css'), /\.long-read \{[^}]*max-width:760px/s);
  assert.match(read('que-hacer.html'), /PAGINAS = \{ 'puente-carretero': 'puente-carretero\.html' \}/);
});

test('footer uses light tourism surfaces instead of broad olive fields', () => {
  const css = read('css/styles.css');

  assert.match(css, /\.site-footer\s*\{[^}]*background:\s*var\(--surface\)/s);
  assert.match(css, /\.footer-social-band\s*\{[^}]*background:\s*var\(--surface-elevated\)/s);
  assert.match(css, /\.footer-bottombar\s*\{[^}]*background:\s*#E8E2D4/s);
  assert.doesNotMatch(css, /--footer-olive(?:-deep)?:/);
});

test('footer closes with a thin institutional accent instead of a dark field', () => {
  const css = read('css/styles.css');

  assert.match(css, /\.site-footer::after\s*\{[^}]*height:\s*4px[^}]*background:\s*var\(--brand-primary\)/s);
  assert.match(css, /\.site-footer \.footer-bottombar\s*\{[^}]*background:\s*var\(--surface\)/s);
  assert.doesNotMatch(css, /\.footer-bottombar\s*\{[^}]*background:\s*var\(--footer-night\)/s);
});
