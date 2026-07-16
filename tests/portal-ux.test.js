const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('public footer is Spanish, useful and does not expose admin', () => {
  const html = read('index.html');
  const css = read('css/styles.css');

  assert.match(html, /class="[^"]*footer-social-pill[^"]*"/);
  assert.match(html, /Naturaleza, cultura e historia en el corazón de Corrientes/);
  assert.match(html, /Municipalidad de San Roque/);
  assert.doesNotMatch(html, /Oficina de Turismo/);
  assert.match(html, /Todos los derechos reservados/);
  assert.match(html, /Desarrollado por estudiantes de 3\.<sup>er<\/sup> año de la Tecnicatura Superior en Desarrollo de Software/);
  assert.match(html, /Daniel Almirón/);
  assert.match(html, /Lucas Sánchez/);
  assert.match(html, /Milca Martínez/);
  assert.match(html, /Román Rossi/);
  assert.match(html, /Tomás Rolet/);
  assert.match(html, /Ayudante:<\/b>\s*Javier Legal/);
  assert.match(html, /Profesora:<\/b>\s*Yésica Ponce/);
  assert.doesNotMatch(html, /Privacy Policy|Terms of Service|Local Government|Tourist Office/);
  assert.doesNotMatch(html, /href="\/admin(?:\/login)?"/);
  assert.match(css, /\.sr-l1\s*\{\s*color:#ef2024/);
  assert.match(css, /\.sr-l4\s*\{\s*color:#45ad2f/);
  assert.match(css, /\.sr-l6\s*\{\s*color:#68409b/);
  assert.match(css, /@media \(max-width:640px\)/);
});

test('gastronomy exposes the same accessible mobile selector as the home page', () => {
  const html = read('gastronomia.html');

  assert.match(html, /id="mobile-menu-toggle"/);
  assert.match(html, /aria-controls="mobile-nav-panel"/);
  assert.match(html, /id="mobile-nav-panel"/);
  assert.match(html, /aria-current="page"[^>]*>\s*<span[^>]*>restaurant/s);
});

test('gastronomy CTA and editorial components keep their redesign hooks', () => {
  const gastro = read('gastronomia.html');
  const css = read('css/styles.css');

  assert.match(gastro, /class="gastronomy-story-cta/);
  assert.match(gastro, /gastronomy-story-orbit/);
  assert.match(css, /\.events-banner-watermark/);
  assert.match(css, /\.events-editorial-banner/);
  assert.match(css, /\.gastronomy-story-cta/);
  assert.match(css, /\.academic-credits/);
});

test('weather fallbacks request complete current conditions without rendering NaN', () => {
  const sources = [read('js/app.js'), read('gastronomia.html')].join('\n');
  assert.match(sources, /current=temperature_2m%2Crelative_humidity_2m%2Capparent_temperature%2Csurface_pressure%2Cweather_code%2Cwind_speed_10m/);
  assert.match(sources, /Number\.isFinite\(Number\(pressure\)\)/);
});

test('chat messages from visitors and APIs are rendered as text, not executable HTML', () => {
  const app = read('js/app.js');
  const gastro = read('gastronomia.html');
  assert.doesNotMatch(app, /function addMsg\([\s\S]*?div\.innerHTML\s*=\s*text/);
  assert.doesNotMatch(gastro, /function addLocalMsg\([\s\S]*?div\.innerHTML\s*=\s*text/);
});

test('public footer uses the official municipality social links', () => {
  const html = read('index.html');

  assert.match(html, /https:\/\/www\.instagram\.com\/sanroque\.municipio/);
  assert.match(html, /https:\/\/www\.facebook\.com\/share\/1AW5YTS5oZ\//);
  assert.match(html, /aria-label="Seguir a la Municipalidad de San Roque en Instagram"/);
  assert.match(html, /aria-label="Seguir a la Municipalidad de San Roque en Facebook"/);
});

test('splash uses the official municipal crest and mobile navigation exposes state', () => {
  const html = read('index.html');
  const css = read('css/styles.css');

  assert.match(html, /class="splash-crest"[^>]+src="img\/logo-muni\.jpg"/);
  assert.match(html, /class="bottom-nav-item active"[^>]+aria-current="page"/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /\.chatbot\s*\{[^}]*bottom:\s*calc\(88px \+ env\(safe-area-inset-bottom\)\)/s);
});

test('premium login exposes accessible interaction states without browser alerts', () => {
  const html = read('deploy/admin/static/login.html');

  assert.match(html, /id="login-form"/);
  assert.match(html, /autocomplete="username"/);
  assert.match(html, /autocomplete="current-password"/);
  assert.match(html, /id="toggle-password"/);
  assert.match(html, /id="login-feedback"[^>]+aria-live="polite"/);
  assert.match(html, /aria-busy/);
  assert.match(html, /href="\/"/);
  assert.doesNotMatch(html, /alert\(/);
});
