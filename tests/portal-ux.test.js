const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('public footer is Spanish, useful and does not expose admin', () => {
  const html = read('index.html');

  assert.match(html, /Política de privacidad/);
  assert.match(html, /Términos y condiciones/);
  assert.match(html, /Municipalidad de San Roque/);
  assert.match(html, /Oficina de Turismo/);
  assert.match(html, /Todos los derechos reservados/);
  assert.doesNotMatch(html, /Privacy Policy|Terms of Service|Local Government|Tourist Office/);
  assert.doesNotMatch(html, /href="\/admin(?:\/login)?"/);
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
