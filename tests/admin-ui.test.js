const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('admin carga el controlador visual antes de la aplicacion', () => {
  const html = read('deploy/admin/static/index.html');
  assert.match(html, /<script src="\/admin\/static\/admin-ui\.js"><\/script>\s*<script src="\/admin\/static\/app\.js"><\/script>/);
});

test('los CRUD usan editores bajo demanda', () => {
  const html = read('deploy/admin/static/index.html');
  for (const resource of ['alojamientos', 'gastronomia', 'eventos', 'datos-utiles', 'users']) {
    assert.match(html, new RegExp(`data-editor="${resource}"[\\s\\S]*hidden`));
  }
  assert.match(html, /id="editor-backdrop"/);
  assert.match(html, /id="editor-close"/);
});

test('la biblioteca se presenta en español y puede seleccionar un archivo', () => {
  const html = read('deploy/admin/static/index.html');
  assert.doesNotMatch(html, />Uploads</);
  assert.match(html, /Archivos/);
  assert.match(html, /id="media-picker"/);
  assert.match(html, /id="media-picker-grid"/);
});

test('la IU define estados de foco, móvil y movimiento reducido', () => {
  const css = read('deploy/admin/static/admin.css');
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 860px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('drawers y dialogos tienen nombres accesibles', () => {
  const html = read('deploy/admin/static/index.html');
  assert.match(html, /data-editor="alojamientos"[^>]+aria-label="Editor de alojamiento"/);
  assert.match(html, /id="confirm-dialog"/);
  assert.match(html, /data-close-media[^>]+aria-label="Cerrar biblioteca"/);
});

test('el resumen incluye bandeja operativa y actividad reciente', () => {
  const html = read('deploy/admin/static/index.html');
  assert.match(html, /id="work-queue"/);
  assert.match(html, /id="recent-activity"/);
  assert.match(html, /Para revisar/);
  assert.match(html, /Actividad reciente/);
});

test('la configuracion del bot usa divulgacion progresiva', () => {
  const html = read('deploy/admin/static/index.html');
  assert.match(html, /<details class="settings-disclosure"/);
  assert.match(html, /<details class="bot-api-row"/);
});

test('los modulos tecnicos tienen navegacion secundaria', () => {
  const html = read('deploy/admin/static/index.html');
  assert.match(html, /class="subnav"/);
  assert.match(html, /data-goto="observability"/);
  assert.match(html, /data-goto="seguridad"/);
  assert.match(html, /data-goto="audit"/);
  assert.match(html, /data-goto="analytics"/);
});

test('los filtros de estado estan presentes en los CRUD', () => {
  const html = read('deploy/admin/static/index.html');
  assert.match(html, /data-status-filter="all"[^>]*data-filter-resource="alojamientos"/);
  assert.match(html, /data-status-filter="published"/);
  assert.match(html, /data-status-filter="draft"/);
  assert.match(html, /data-status-filter="archived"/);
});

test('las acciones destructivas estan en submenu', () => {
  const html = read('deploy/admin/static/index.html');
  assert.match(html, /class="more-actions"/);
  assert.match(html, /<summary aria-label="Más acciones"/);
});

test('los campos de imagen tienen boton de biblioteca', () => {
  const html = read('deploy/admin/static/index.html');
  assert.match(html, /data-media-target="alojamiento-mainImg"/);
  assert.match(html, /data-media-target="gastronomia-imagen"/);
  assert.match(html, /Elegir de Archivos/);
});
