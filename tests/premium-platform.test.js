const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('el CMS usa un registro unico y SVG locales, sin iconos Unicode improvisados', () => {
  const html = read('deploy/admin/static/index.html');
  const app = read('deploy/admin/static/app.js');
  const icons = read('deploy/admin/static/icons.js');

  assert.doesNotMatch(html, /[⌂◉◇☼◎☁☰◈⛨⇩▤▣]/);
  assert.match(app, /const ADMIN_SECTIONS\s*=/);
  assert.doesNotMatch(app, /const SECTION_TITLES\s*=/);
  assert.match(icons, /window\.AdminIcons/);
  assert.match(html, /id="admin-breadcrumb"/);
  assert.match(html, /id="sidebar-collapse"/);
});

test('el editor expone pestañas, workflow, SEO y una galería estructurada', () => {
  const html = read('deploy/admin/static/index.html');
  for (const resource of ['alojamiento', 'gastronomia']) {
    assert.match(html, new RegExp(`data-editor-tabs="${resource}`));
  }
  assert.match(html, /value="review">En revisión/);
  assert.match(html, /value="hidden">Oculto/);
  assert.match(html, /id="alojamiento-slug"/);
  assert.match(html, /id="gastronomia-seoTitle"/);
  assert.match(html, /data-media-gallery="alojamientos"/);
  assert.match(html, /data-media-gallery="gastronomia"/);
});

test('la biblioteca profesional dispone de carga múltiple y metadatos accesibles', () => {
  const html = read('deploy/admin/static/index.html');
  const manager = read('deploy/admin/static/media-manager.js');
  assert.match(html, /id="media-dropzone"/);
  assert.match(html, /id="media-upload-queue"/);
  assert.match(html, /accept="image\/jpeg,image\/png,image\/webp,image\/avif"/);
  assert.match(manager, /XMLHttpRequest/);
  assert.match(manager, /aria-live/);
  assert.match(manager, /mediaGallery/);
});

test('el backend declara modelo multimedia y variantes optimizadas', () => {
  const server = read('deploy/admin/server.js');
  const pkg = JSON.parse(read('deploy/admin/package.json'));
  assert.ok(pkg.dependencies.sharp);
  assert.ok(pkg.dependencies.multer);
  assert.match(server, /MEDIA_VARIANTS/);
  assert.match(server, /\/admin\/api\/media\/upload/);
  assert.match(server, /\/admin\/api\/media\/:id/);
  assert.match(server, /mediaGallery/);
  assert.match(server, /schemaVersion/);
});

test('el portal incluye galería editorial, lightbox, relacionados y SEO dinámico', () => {
  // La ficha de alojamiento vive en alojamientos.html desde que la sección
  // dejó de compartir página con la portada.
  const home = read('alojamientos.html');
  const gastro = read('gastronomia.html');
  const details = read('js/detail-pages.js');
  const gallery = read('js/gallery.js');
  const css = read('css/styles.css');

  assert.match(home, /id="tourism-detail"/);
  assert.match(gastro, /id="gastronomy-detail"/);
  assert.match(details, /application\/ld\+json/);
  assert.match(details, /related/i);
  assert.match(gallery, /role', 'dialog'/);
  assert.match(gallery, /ArrowRight/);
  assert.match(css, /\.editorial-gallery/);
  assert.match(css, /\.tourism-detail-hero/);
});
