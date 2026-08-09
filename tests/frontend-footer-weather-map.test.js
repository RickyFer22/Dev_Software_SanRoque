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
  const html = read('alojamientos.html');
  const app = read('js/app.js');
  const css = read('css/styles.css');

  assert.match(html, /class="map-legend"/);
  assert.match(html, /Traza urbana/);
  assert.match(html, /Calles, accesos y alojamientos/);
  assert.match(app, /SAN_ROQUE_URBAN_TRACE/);
  assert.match(app, /L\.geoJSON/);
  // Base satelital de Esri con etiquetas de CARTO (el mapa dejó de usar OSM).
  assert.match(app, /server\.arcgisonline\.com/);
  assert.match(app, /basemaps\.cartocdn\.com/);
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

test('the lodging section lives in its own page, not in the home', () => {
  const nginx = read('deploy/nginx.conf');
  assert.match(nginx, /location = \/donde-alojarme \{\s*rewrite \^ \/alojamientos\.html last;/);
  assert.match(nginx, /\/hospedajes\/\(\[a-zA-Z0-9_-\]\+\)\/\?\$ \/alojamientos\.html last;/);
  assert.match(read('js/app.js'), /pushState\(\{\}, '', '\/donde-alojarme'\)/);

  const aloj = read('alojamientos.html');
  assert.match(aloj, /id="accommodations-carousel"/);
  assert.match(aloj, /id="main-map"/);
  assert.match(aloj, /id="detailed-accommodation-view"/);

  // La portada ya no duplica el listado ni la ficha.
  const home = read('index.html');
  assert.doesNotMatch(home, /id="accommodations-carousel"/);
  assert.doesNotMatch(home, /id="detailed-accommodation-view"/);
  assert.match(home, /class="portal-shortcut"/);

  for (const file of ['index.html', 'agenda.html', 'gastronomia.html', 'guia-practica.html', 'que-hacer.html']) {
    assert.match(read(file), /href="\/donde-alojarme"/, file);
  }
});

test('event descriptions keep their line breaks end to end', () => {
  // El programa de un evento (novena, día central, horarios) se carga como
  // texto con saltos: si el servidor los colapsa, la ficha vuelve al ladrillo.
  const server = read('deploy/admin/server.js');
  assert.match(server, /function sanitizeMultiline/);
  assert.match(server, /out\.descripcion = sanitizeMultiline\(data\.descripcion \|\| '', 4000\)/);

  const details = read('js/detail-pages.js');
  assert.match(details, /function richText\(value\)/);
  assert.match(details, /inlineText\(line\.slice\(3\)\)/);   // "## " → h3
  assert.match(details, /inlineText\(line\.slice\(2\)\)/);   // "- "  → li
  // El resaltado se resuelve sobre el texto ya escapado, nunca antes.
  assert.match(details, /const inlineText = \(value\) => esc\(value\)\.replace\(\/\\\*\\\*/);
  assert.match(details, /class="detail-rich">\$\{richText\(item\.descripcion\)\}/);
  assert.match(read('css/styles.css'), /\.detail-rich h3/);

  // Las tarjetas muestran la entradilla sin marcas de formato: si el "##" o
  // los "**" llegan al listado, el visitante ve la sintaxis en pantalla.
  assert.match(details, /window\.VsrText = \{ richText, resumen: resumenTexto, esc \}/);
  for (const file of ['index.html', 'alojamientos.html', 'agenda.html']) {
    assert.match(read(file), /VsrText\.resumen\(/, file);
    assert.doesNotMatch(read(file), /\$\{evento\.descripcion \|\|/, file);
  }
  assert.match(read('css/styles.css'), /\.evento-card-resumen[^}]*line-clamp:3/s);
});

test('the Puente de la Vía long read exists and is linked from Qué hacer', () => {
  const page = read('puente-de-la-via.html');
  assert.match(page, /<h1>Puente de la Vía<\/h1>/);
  assert.match(page, /class="long-read/);
  // El ancho de lectura no puede depender de max-w-3xl: tw-base.css no la trae.
  assert.doesNotMatch(page, /max-w-3xl/);
  assert.match(read('css/styles.css'), /\.long-read \{[^}]*max-width:760px/s);
  assert.match(read('que-hacer.html'), /PAGINAS = \{ 'puente-carretero': 'puente-de-la-via\.html' \}/);
  // La URL vieja ya se compartió: tiene que seguir llegando a la ficha.
  assert.match(read('deploy/nginx.conf'), /location = \/puente-carretero\.html \{[\s\S]*?return 301 \/puente-de-la-via\.html;/);
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
