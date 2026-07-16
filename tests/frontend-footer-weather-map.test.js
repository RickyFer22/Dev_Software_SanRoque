const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('footer exposes the approved institutional information architecture', () => {
  const html = read('index.html');

  assert.match(html, /class="footer-social-band"/);
  assert.match(html, /Portal oficial de turismo y cultura/);
  assert.match(html, /Proyecto educativo · tecnología local/i);
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
