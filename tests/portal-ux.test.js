const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const publicPages = [
  'index.html',
  'agenda.html',
  'comercio.html',
  'evento.html',
  'gastronomia.html',
  'gastronomia-premium.html',
  'guia-practica.html',
  'que-hacer.html',
];

test('public pages invalidate stale stylesheets and nginx revalidates CSS and JS', () => {
  for (const file of publicPages) {
    assert.match(read(file), /href="css\/styles\.css\?v=20260718-footer"/, file);
  }

  const nginx = read('deploy/nginx.conf');
  const revalidationBlock = nginx.match(/# CSS y JavaScript[\s\S]*?# Cache prolongada/)?.[0] || '';
  assert.match(revalidationBlock, /location ~\* \\\.\(\?:css\|js\)\$/);
  assert.match(revalidationBlock, /expires -1;/);
  assert.match(revalidationBlock, /Cache-Control "no-cache, must-revalidate"/);
});

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

test('tourism design system exposes the approved palette and interaction tokens', () => {
  const css = read('css/styles.css');

  assert.match(css, /--brand-primary:\s*#355E4A/i);
  assert.match(css, /--brand-primary-hover:\s*#2C4F3D/i);
  assert.match(css, /--surface:\s*#F6F3EE/i);
  assert.match(css, /--surface-elevated:\s*#FFFFFF/i);
  assert.match(css, /--text:\s*#2F2F2F/i);
  assert.match(css, /--accent:\s*#D8A441/i);
  assert.match(css, /--radius-card:\s*16px/i);
  assert.match(css, /--motion-base:\s*300ms/i);
});

test('public pages share the editorial tourism composition without losing dynamic hooks', () => {
  const home = read('index.html');
  const gastro = read('gastronomia.html');
  const premium = read('gastronomia-premium.html');
  const listings = ['agenda.html', 'que-hacer.html', 'guia-practica.html'].map(read);
  const details = ['comercio.html', 'evento.html'].map(read);

  assert.match(home, /id="hero-section"[^>]*class="[^"]*tourism-hero/);
  assert.match(home, /id="hero-search-input"/);
  assert.match(home, /id="accommodation-filters"/);
  assert.match(home, /id="accommodations-carousel"/);
  assert.match(home, /id="main-map"/);
  assert.match(home, /id="events-grid"/);
  assert.match(gastro, /<body[^>]*class="[^"]*tourism-page/);
  assert.match(gastro, /id="gastronomia-grid"/);
  assert.match(premium, /<body[^>]*class="[^"]*tourism-page/);
  assert.match(premium, /id="buscador"/);
  assert.match(premium, /id="filtros"/);
  assert.match(premium, /id="carousel"/);
  listings.forEach((html) => assert.match(html, /<header[^>]*class="[^"]*internal-hero/));
  details.forEach((html) => assert.match(html, /<header[^>]*class="[^"]*detail-hero/));
});

test('public navigation becomes a neutral glass surface after scrolling', () => {
  const css = read('css/styles.css');

  assert.match(css, /#main-nav\.bg-primary\\\/95\s*\{[^}]*background:\s*rgba\(255,255,255,\.94\)\s*!important/s);
  assert.match(css, /#main-nav\.bg-primary\\\/95[^}]*color:\s*var\(--text\)\s*!important/s);
  assert.match(css, /#mobile-nav-panel[^}]*background:\s*var\(--surface-elevated\)/s);
});
