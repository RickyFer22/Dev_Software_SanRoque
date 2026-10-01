'use strict';

// Pruebas del módulo de fichas históricas del museo. Arrancan el servidor real en un DATA_DIR temporal.
//   node tests/museo.test.js
// Cubre el flujo completo (crear → historia/fuentes/fotos → borrador → publicar → ampliar sin tocar lo
// publicado → recuperar revisión), permisos, conflictos, validación de archivos y que ningún dato interno
// aparezca en las respuestas públicas.

const assert = require('assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const crypto = require('crypto');
const sharp = require('sharp');

const PORT = 4137;
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'vsr-museo-'));
// Credenciales de prueba generadas en cada ejecución (nada se guarda en el repositorio).
const SETUP_PW = crypto.randomBytes(12).toString('hex');
const USER_PW = crypto.randomBytes(12).toString('hex');
const SECRETS = ['NOTA-INTERNA-SECRETA', 'DONANTE-SECRETO', 'INV-0042', 'CONSERVACION-SECRETA', 'EVENTO-INTERNO', 'FUENTE-OCULTA-XYZ', 'PENDIENTE-SECRETO', 'telefono-donante-555'];

function req(method, urlPath, { body, cookie, raw, headers } = {}) {
  return new Promise((resolve, reject) => {
    let data = null, type = 'application/json';
    if (raw) { data = raw.body; type = raw.type; } else if (body) data = Buffer.from(JSON.stringify(body));
    const r = http.request(BASE + urlPath, { method, headers: Object.assign(data ? { 'Content-Type': type, 'Content-Length': data.length } : {}, cookie ? { Cookie: cookie } : {}, headers || {}) }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        let json = null; try { json = JSON.parse(buf.toString('utf8')); } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, body: json, buf, text: buf.toString('utf8') });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function multipart(parts) {
  const boundary = '----vsr' + Math.random().toString(16).slice(2);
  const chunks = [];
  parts.forEach((p) => {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${p.name}"\r\nContent-Type: ${p.type}\r\n\r\n`));
    chunks.push(p.data, Buffer.from('\r\n'));
  });
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { type: `multipart/form-data; boundary=${boundary}`, body: Buffer.concat(chunks) };
}

const cookieOf = (res) => (res.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');
let child;
function start() {
  return new Promise((resolve, reject) => {
    child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
      env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', ADMIN_USER: 'gestion.turistica.sr', ADMIN_SETUP_PASSWORD: SETUP_PW, SESSION_SECRET: 'test-secret-strong', LOGIN_MAX_FAILURES: '50', LOGIN_DELAY_STEP_MS: '0' }),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let ready = false;
    const on = (d) => { if (!ready && /escuchando/.test(String(d))) { ready = true; resolve(); } };
    child.stdout.on('data', on); child.stderr.on('data', on);
    child.on('exit', (c) => { if (!ready) reject(new Error('server exited ' + c)); });
    setTimeout(() => { if (!ready) reject(new Error('server timeout')); }, 10000);
  });
}
const stop = () => new Promise((r) => { if (!child) return r(); child.once('exit', r); child.kill('SIGKILL'); });

const results = [];
let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; results.push('  PASS  ' + name); } catch (e) { failed++; results.push('  FAIL  ' + name + '  => ' + e.message); }
}

(async () => {
  await start();
  const login = async (username, password) => { const r = await req('POST', '/admin/login', { body: { username, password } }); assert.strictEqual(r.status, 200, 'login ' + username); return cookieOf(r); };
  const admin = await login('gestion.turistica.sr', SETUP_PW);
  for (const [u, role] of [['ed', 'editor'], ['lector', 'viewer']]) {
    const r = await req('POST', '/admin/api/users', { cookie: admin, body: { username: u, name: u, role, status: 'active', password: USER_PW } });
    assert.strictEqual(r.status, 201, 'crear usuario ' + u);
  }
  const editor = await login('ed', USER_PW);
  const lector = await login('lector', USER_PW);
  const A = '/admin/api/museo';

  await test('sin sesión: la administración responde 401; la API pública es accesible', async () => {
    assert.strictEqual((await req('GET', A + '/catalogo')).status, 401);
    assert.strictEqual((await req('PUT', A + '/objetos/caldero', { body: {} })).status, 401);
    assert.strictEqual((await req('GET', '/api/museo/visita')).status, 200);
  });

  await test('migración: las 27 piezas actuales quedan publicadas, sin duplicarse al reiniciar', async () => {
    const pub = (await req('GET', '/api/museo/visita')).body;
    assert.strictEqual(Object.keys(pub.objetos).length, 27);
    assert.ok(pub.objetos.acta && /1773/.test(pub.objetos.acta.periodo.texto));
    assert.ok(pub.objetos.caldero.foto.imgs.length >= 2);
    const cat = (await req('GET', A + '/catalogo', { cookie: admin })).body;
    assert.strictEqual(cat.objetos.length, 27);
    assert.strictEqual(cat.escenas.length, 31);
    assert.ok(cat.objetos.every((o) => o.estado === 'publicado'));
  });

  let id, rev;
  await test('1. crear un objeto con información mínima (solo el nombre)', async () => {
    const r = await req('POST', A + '/objetos', { cookie: editor, body: { nombre: 'Mate de plata' } });
    assert.strictEqual(r.status, 201);
    id = r.body.id; rev = r.body.rev;
    assert.strictEqual(id, 'mate-de-plata');
    assert.strictEqual(r.body.estado, 'borrador');
    assert.ok(r.body.signals.sinHistoria);
    assert.strictEqual((await req('POST', A + '/objetos', { cookie: editor, body: { nombre: '' } })).status, 400);
  });

  await test('un objeto en borrador no aparece en la API pública', async () => {
    assert.ok(!(await req('GET', '/api/museo/visita')).body.objetos[id]);
  });

  let imgId, internaId, docId;
  await test('2a. subir fotografías (WebP en varios tamaños, original conservado) y validar formatos', async () => {
    const png = await sharp({ create: { width: 2000, height: 1300, channels: 3, background: '#a33' } }).png().toBuffer();
    const small = await sharp({ create: { width: 500, height: 300, channels: 3, background: '#33a' } }).jpeg().toBuffer();
    const r = await req('POST', A + '/archivos', { cookie: editor, raw: multipart([{ name: 'frente.png', type: 'image/png', data: png }, { name: 'detalle.jpg', type: 'image/jpeg', data: small }]) });
    assert.strictEqual(r.status, 201, r.text);
    const [a, b] = r.body.archivos;
    imgId = a.id; internaId = b.id;
    assert.strictEqual(a.tipo, 'imagen'); assert.ok(a.original);
    const meta = await sharp((await req('GET', `${A}/img/${a.id}/1800`, { cookie: editor })).buf).metadata();
    assert.strictEqual(meta.format, 'webp'); assert.strictEqual(Math.max(meta.width, meta.height), 1800);
    // la imagen chica (500 px) NO se amplía: su variante máxima es 500
    const m2 = (await req('GET', A + '/archivos', { cookie: editor })).body.archivos.find((x) => x.id === b.id);
    assert.ok(m2 && m2.w === 500);
    const dir = path.join(DATA_DIR, 'museo-archivos', b.id);
    assert.ok(fs.readdirSync(dir).some((f) => f.startsWith('original.')), 'original conservado');
    assert.ok(!fs.readdirSync(dir).some((f) => /^(640|1200|1800)\.webp$/.test(f)), 'no se amplió la imagen chica');
    // formatos inválidos: SVG y ejecutable disfrazado de PNG
    const bad = await req('POST', A + '/archivos', { cookie: editor, raw: multipart([{ name: 'x.svg', type: 'image/svg+xml', data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>') }, { name: 'virus.png', type: 'image/png', data: Buffer.from('MZ\x90\x00 not an image') }]) });
    assert.strictEqual(bad.status, 415);
    assert.strictEqual(bad.body.errors.length, 2);
  });

  await test('2b. subir un PDF y validar su firma', async () => {
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
    const r = await req('POST', A + '/archivos', { cookie: editor, raw: multipart([{ name: 'acta.pdf', type: 'application/pdf', data: pdf }]) });
    assert.strictEqual(r.status, 201); docId = r.body.archivos[0].id;
    const fake = await req('POST', A + '/archivos', { cookie: editor, raw: multipart([{ name: 'fake.pdf', type: 'application/pdf', data: Buffer.from('no soy un pdf') }]) });
    assert.strictEqual(fake.status, 415);
  });

  const datos = () => ({
    nombre: 'Mate de plata', inventario: 'INV-0042', categoria: 'objeto-cotidiano', sala: 'sala',
    resumen: 'Mate con bombilla.',
    historia: 'Se usaba en reuniones.\n\n<script>alert(1)</script>**Importante** y [enlace](https://ejemplo.org) y [malo](javascript:alert(1))',
    periodo: { texto: '', certeza: 'aproximado', fecha: { tipo: 'hacia', desde: '1920' } },
    autor: { texto: 'Taller desconocido', certeza: 'atribucion' },
    procedencia: { texto: 'Corrientes', certeza: 'testimonio' },
    materiales: 'Plata', usoOriginal: 'Tomar mate en familia.',
    ingreso: { forma: 'donacion', fecha: { texto: 'década de 1980', certeza: 'testimonio' } },
    observar: 'El grabado de la base.', conservacion: 'CONSERVACION-SECRETA',
    notasInternas: 'NOTA-INTERNA-SECRETA', pendiente: 'PENDIENTE-SECRETO', necesitaRevision: true,
    donante: { nombre: 'DONANTE-SECRETO', contacto: 'telefono-donante-555' },
    imagen: { tipo: 'archivo', ref: imgId, alt: 'Frente del mate', caption: 'Vista frontal', credit: 'Archivo del museo' },
    galeria: [{ tipo: 'archivo', ref: internaId, caption: 'IMG-INTERNA-CAPTION', publico: false }, { tipo: 'archivo', ref: imgId, caption: 'Detalle', publico: true }],
    fuentes: [
      { tipo: 'libro', titulo: 'Historia de San Roque', autor: 'A. Pérez', paginas: '12-14', publica: true, archivoId: docId, adjuntoPublico: false },
      { tipo: 'entrevista', titulo: 'FUENTE-OCULTA-XYZ', publica: false },
      { tipo: 'enlace', titulo: 'Sitio', enlace: 'javascript:alert(1)', publica: true },
    ],
    cronologia: [
      { titulo: 'Donación', fecha: { tipo: 'anio', desde: '1985' }, certeza: 'testimonio', publico: true },
      { titulo: 'Fabricación', fecha: { tipo: 'hacia', desde: '1920' }, publico: true },
      { titulo: 'Sin fecha conocida', descripcion: 'Se desconoce cuándo.', fecha: { tipo: 'desconocida' }, publico: true },
      { titulo: 'EVENTO-INTERNO', fecha: { tipo: 'anio', desde: '1999' }, publico: false },
    ],
  });

  await test('2c/3. completar historia, fuentes, cronología y fotos; guardar borrador (sin publicar)', async () => {
    const r = await req('PUT', `${A}/objetos/${id}`, { cookie: editor, body: { baseRev: rev, datos: datos() } });
    assert.strictEqual(r.status, 200, r.text);
    assert.strictEqual(r.body.rev, rev + 1); rev = r.body.rev;
    const b = r.body.borrador;
    assert.ok(!/<script/i.test(b.historia), 'sin etiquetas');
    assert.ok(b.historia.includes('[enlace](https://ejemplo.org)'));
    assert.ok(!b.historia.includes('javascript:'), 'enlace peligroso eliminado');
    assert.strictEqual(b.periodo.texto, 'Hacia 1920', 'texto automático desde la fecha estructurada');
    assert.strictEqual(b.fuentes.length, 3);
    assert.strictEqual(b.fuentes[2].enlace, '', 'enlace javascript: rechazado');
    assert.strictEqual(r.body.estado, 'borrador');
  });

  await test('fechas inciertas: "siglo XIX", intervalos y fecha inválida no bloquean', async () => {
    const d = datos();
    d.cronologia = [{ titulo: 'a', fecha: { tipo: 'siglo', desde: '19' } }, { titulo: 'b', fecha: { tipo: 'intervalo', desde: '1900', hasta: '1910' } }, { titulo: 'c', fecha: { tipo: 'exacta', desde: '1920-02-31' } }, { titulo: 'd', fecha: { tipo: 'exacta', desde: '1920-03-15' } }];
    const r = await req('PUT', `${A}/objetos/${id}`, { cookie: editor, body: { baseRev: rev, datos: d } });
    assert.strictEqual(r.status, 200); rev = r.body.rev;
    const t = r.body.borrador.cronologia.map((e) => e.fecha.texto);
    assert.deepStrictEqual(t, ['Siglo XIX', '1900–1910', '', '15 de marzo de 1920']);
    assert.strictEqual(r.body.borrador.cronologia[2].fecha.orden, null, 'la fecha inválida queda sin orden');
    // restaurar el contenido completo
    const r2 = await req('PUT', `${A}/objetos/${id}`, { cookie: editor, body: { baseRev: rev, datos: datos() } });
    rev = r2.body.rev;
  });

  await test('señales de catálogo: necesita revisión; cambios sin publicar tras publicar y editar', async () => {
    const c = (await req('GET', A + '/catalogo', { cookie: editor })).body.objetos.find((o) => o.id === id);
    assert.ok(c.signals.pendienteRevision);
    assert.ok(!c.signals.sinHistoria);
  });

  await test('4. vista previa del borrador y publicación', async () => {
    const pv = await req('GET', `${A}/objetos/${id}/vista-previa`, { cookie: editor });
    assert.strictEqual(pv.status, 200);
    assert.ok(pv.body.objeto.historia);
    assert.strictEqual((await req('POST', `${A}/objetos/${id}/publicar`, { cookie: editor, body: { baseRev: 1 } })).status, 409, 'publicar exige la revisión vista');
    const r = await req('POST', `${A}/objetos/${id}/publicar`, { cookie: editor, body: { baseRev: rev } });
    assert.strictEqual(r.status, 200, r.text);
    assert.strictEqual(r.body.estado, 'publicado');
    const noName = await req('POST', A + '/objetos', { cookie: editor, body: { nombre: 'Vacío' } });
    assert.strictEqual((await req('POST', `${A}/objetos/${noName.body.id}/publicar`, { cookie: editor, body: { baseRev: 1 } })).status, 422, 'una ficha sin texto no se publica');
  });

  let pubHistoria;
  await test('5. la ficha publicada se consulta desde la visita (API pública) con sus apartados', async () => {
    const o = (await req('GET', '/api/museo/visita')).body.objetos[id];
    assert.ok(o, 'publicada');
    pubHistoria = o.historia;
    assert.strictEqual(o.titulo, 'Mate de plata');
    assert.strictEqual(o.periodo.certeza, 'aproximado');
    assert.strictEqual(o.autor.certeza, 'atribucion');
    assert.strictEqual(o.galeria.length, 1, 'solo la galería pública');
    assert.deepStrictEqual(o.cronologia.map((e) => e.titulo), ['Fabricación', 'Donación'], 'ordenada; el evento interno no sale');
    assert.deepStrictEqual(o.cronologiaSinFecha.map((e) => e.titulo), ['Sin fecha conocida'], 'sin fecha, por separado');
    assert.strictEqual(o.fuentes.length, 2, 'solo las fuentes públicas (la interna no sale)');
    assert.ok(!o.fuentes.some((f) => /FUENTE-OCULTA/.test(f.titulo)));
    assert.ok(o.fuentes.some((f) => f.titulo === 'Historia de San Roque'));
    assert.ok(!o.fuentes.some((f) => f.documento), 'adjunto no público no se ofrece');
  });

  await test('8. ningún dato interno aparece en la API pública ni en sus archivos', async () => {
    const all = (await req('GET', '/api/museo/visita')).text;
    SECRETS.forEach((s) => assert.ok(!all.includes(s), 'se filtró: ' + s));
    // imágenes: la principal es pública; la marcada como interna y el original, no
    const pubImg = (await req('GET', '/api/museo/visita')).body.objetos[id].foto.imgs[0].url;
    const ok = await req('GET', pubImg); assert.strictEqual(ok.status, 200); assert.strictEqual(ok.headers['content-type'], 'image/webp');
    assert.strictEqual((await req('GET', `/api/museo/img/${internaId}/500.webp`)).status, 404, 'imagen interna');
    assert.strictEqual((await req('GET', `/api/museo/doc/${docId}`)).status, 404, 'documento interno');
    assert.strictEqual((await req('GET', `/api/museo/img/${imgId}/2000.webp`)).status, 404, 'no hay variante inexistente ni original');
    assert.strictEqual((await req('GET', `/api/museo/img/..%2F..%2Fmuseo.json/640.webp`)).status, 404, 'path traversal');
    assert.strictEqual((await req('GET', `${A}/img/${internaId}/500`)).status, 401, 'sin sesión no se ve lo interno');
  });

  await test('publicar dos veces la misma versión no repite revisiones', async () => {
    const before = (await req('GET', `${A}/objetos/${id}`, { cookie: editor })).body.revisiones.length;
    const again = await req('POST', `${A}/objetos/${id}/publicar`, { cookie: editor, body: { baseRev: rev } });
    assert.strictEqual(again.status, 200); assert.ok(again.body.sinCambios);
    assert.strictEqual((await req('GET', `${A}/objetos/${id}`, { cookie: editor })).body.revisiones.length, before);
  });

  await test('6. ampliar la historia en borrador NO altera la versión publicada hasta publicar de nuevo', async () => {
    const d = datos(); d.historia += '\n\nNuevo párrafo investigado.'; d.resumen = 'Resumen nuevo.';
    const r = await req('PUT', `${A}/objetos/${id}`, { cookie: editor, body: { baseRev: rev, datos: d } });
    assert.strictEqual(r.status, 200); rev = r.body.rev;
    assert.strictEqual(r.body.estado, 'cambios');
    const o = (await req('GET', '/api/museo/visita')).body.objetos[id];
    assert.strictEqual(o.historia, pubHistoria);
    assert.notStrictEqual(o.resumen, 'Resumen nuevo.');
    const c = (await req('GET', A + '/catalogo', { cookie: editor })).body.objetos.find((x) => x.id === id);
    assert.ok(c.signals.cambiosSinPublicar);
    const pub = await req('POST', `${A}/objetos/${id}/publicar`, { cookie: editor, body: { baseRev: rev } });
    assert.strictEqual(pub.status, 200);
    assert.ok((await req('GET', '/api/museo/visita')).body.objetos[id].historia.includes('Nuevo párrafo'));
  });

  await test('7. historial de revisiones y recuperación de una versión anterior', async () => {
    const det = (await req('GET', `${A}/objetos/${id}`, { cookie: editor })).body;
    assert.ok(det.revisiones.length >= 3);
    assert.ok(det.revisiones.some((r) => r.accion === 'publicar'));
    assert.ok(det.revisiones[0].by === 'ed');
    const old = det.revisiones.filter((r) => r.restaurable && r.accion !== 'crear').pop(); // la más antigua con contenido
    const snap = (await req('GET', `${A}/objetos/${id}/revisiones/${old.rev}`, { cookie: editor })).body;
    assert.ok(snap.datos);
    const bad = await req('POST', `${A}/objetos/${id}/restaurar`, { cookie: editor, body: { rev: old.rev, baseRev: 1 } });
    assert.strictEqual(bad.status, 409);
    const r = await req('POST', `${A}/objetos/${id}/restaurar`, { cookie: editor, body: { rev: old.rev, baseRev: rev } });
    assert.strictEqual(r.status, 200); rev = r.body.rev;
    assert.ok(!r.body.borrador.historia.includes('Nuevo párrafo'), 'el borrador volvió a la versión anterior');
    assert.ok((await req('GET', '/api/museo/visita')).body.objetos[id].historia.includes('Nuevo párrafo'), 'lo publicado no cambia al restaurar');
    assert.strictEqual(r.body.estado, 'cambios');
  });

  await test('ediciones simultáneas: el segundo guardado recibe 409 con la versión actual y la base', async () => {
    const cur = (await req('GET', `${A}/objetos/${id}`, { cookie: editor })).body;
    const a = datos(); a.materiales = 'Plata de Potosí';
    const first = await req('PUT', `${A}/objetos/${id}`, { cookie: admin, body: { baseRev: cur.rev, datos: a } });
    assert.strictEqual(first.status, 200);
    const b = datos(); b.usoOriginal = 'Otro uso';
    const second = await req('PUT', `${A}/objetos/${id}`, { cookie: editor, body: { baseRev: cur.rev, datos: b } });
    assert.strictEqual(second.status, 409);
    assert.strictEqual(second.body.code, 'conflict');
    assert.strictEqual(second.body.actual.datos.materiales, 'Plata de Potosí');
    assert.strictEqual(second.body.actual.updatedBy, 'gestion.turistica.sr');
    assert.ok(second.body.base && second.body.base.materiales !== 'Plata de Potosí', 'se entrega la base para fusionar');
    rev = first.body.rev;
  });

  await test('permisos por acción: lector solo lee; editor no elimina; super-admin elimina', async () => {
    assert.strictEqual((await req('GET', `${A}/objetos/${id}`, { cookie: lector })).status, 200);
    assert.strictEqual((await req('PUT', `${A}/objetos/${id}`, { cookie: lector, body: { baseRev: rev, datos: datos() } })).status, 403);
    assert.strictEqual((await req('POST', `${A}/objetos/${id}/publicar`, { cookie: lector, body: { baseRev: rev } })).status, 403);
    assert.strictEqual((await req('POST', A + '/archivos', { cookie: lector, raw: multipart([{ name: 'a.pdf', type: 'application/pdf', data: Buffer.from('%PDF-1.4 x') }]) })).status, 403);
    assert.strictEqual((await req('DELETE', `${A}/objetos/${id}`, { cookie: editor })).status, 403);
    assert.strictEqual((await req('PUT', A + '/vinculos', { cookie: lector, body: { punto: 'c-caldero', objeto: id } })).status, 403);
  });

  await test('vincular una ficha a varios puntos de la visita sin duplicarla; puntos nuevos', async () => {
    const r = await req('PUT', A + '/vinculos', { cookie: editor, body: { punto: 'c-caldero', objeto: id } });
    assert.strictEqual(r.status, 200);
    const p = await req('POST', A + '/puntos', { cookie: editor, body: { escena: 'sala', x: 40, y: 60, label: 'Mirar el mate', objeto: id } });
    assert.strictEqual(p.status, 201);
    const pub = (await req('GET', '/api/museo/visita')).body;
    assert.strictEqual(pub.vinculos['c-caldero'], id);
    assert.ok(pub.puntos.some((x) => x.piece === id && x.escena === 'sala'));
    assert.strictEqual((await req('POST', A + '/puntos', { cookie: editor, body: { escena: 'sala', x: 140, y: 60 } })).status, 400, 'posición fuera de la foto');
    assert.strictEqual((await req('PUT', A + '/vinculos', { cookie: editor, body: { punto: 'c-caldero', objeto: 'no-existe' } })).status, 404);
    const det = (await req('GET', `${A}/objetos/${id}`, { cookie: editor })).body;
    assert.ok(det.puntos.length >= 2);
    await req('PUT', A + '/vinculos', { cookie: editor, body: { punto: 'c-caldero', objeto: '' } }); // restablece
  });

  await test('retirar de publicación oculta la ficha y sus archivos', async () => {
    const r = await req('POST', `${A}/objetos/${id}/retirar`, { cookie: editor, body: {} });
    assert.strictEqual(r.status, 200); assert.strictEqual(r.body.estado, 'retirado');
    const pub = (await req('GET', '/api/museo/visita')).body;
    assert.ok(!pub.objetos[id]);
    assert.ok(!pub.puntos.some((x) => x.piece === id), 'los puntos de una ficha retirada no se publican');
    assert.strictEqual((await req('GET', `/api/museo/img/${imgId}/1800.webp`)).status, 404);
  });

  await test('retirar una pieza original de la visita la oculta; no se revela la existencia de borradores nuevos', async () => {
    const cald = (await req('GET', A + '/objetos/caldero', { cookie: editor })).body;
    assert.strictEqual((await req('POST', `${A}/objetos/caldero/retirar`, { cookie: editor, body: {} })).status, 200);
    const pub = (await req('GET', '/api/museo/visita')).body;
    assert.ok(pub.ocultos.includes('caldero') && !pub.objetos.caldero);
    const draft = await req('POST', A + '/objetos', { cookie: editor, body: { nombre: 'Borrador secreto nuevo' } });
    const all = (await req('GET', '/api/museo/visita')).text;
    assert.ok(!all.includes('borrador-secreto-nuevo') && !all.includes('Borrador secreto'), 'un borrador nuevo no aparece ni como id');
    await req('POST', `${A}/objetos/caldero/publicar`, { cookie: editor, body: { baseRev: cald.rev } });
    assert.ok((await req('GET', '/api/museo/visita')).body.objetos.caldero, 'se puede volver a publicar');
    await req('DELETE', `${A}/objetos/${draft.body.id}`, { cookie: admin });
  });

  await test('archivos en uso no se pueden eliminar; el original no se sirve en público', async () => {
    assert.strictEqual((await req('DELETE', `${A}/archivos/${imgId}`, { cookie: editor })).status, 409);
    assert.strictEqual((await req('GET', `${A}/archivos/${imgId}/original`, { cookie: lector })).status, 403);
    assert.strictEqual((await req('GET', `${A}/archivos/${imgId}/original`, { cookie: editor })).status, 200);
  });

  await test('super-admin elimina una ficha; el borrado se audita', async () => {
    const tmp = await req('POST', A + '/objetos', { cookie: editor, body: { nombre: 'Para borrar' } });
    assert.strictEqual((await req('DELETE', `${A}/objetos/${tmp.body.id}`, { cookie: admin })).status, 200);
    assert.strictEqual((await req('GET', `${A}/objetos/${tmp.body.id}`, { cookie: admin })).status, 404);
    const audit = (await req('GET', '/admin/api/audit', { cookie: admin })).body.audit;
    assert.ok(audit.some((a) => a.resource === 'museo' && a.action === 'publish'));
    assert.ok(audit.some((a) => a.resource === 'museo' && a.action === 'delete'));
    assert.ok(!JSON.stringify(audit).includes('DONANTE-SECRETO'), 'la auditoría no copia datos personales');
  });

  await test('persistencia: al reiniciar se conservan fichas, revisiones y archivos; la migración no duplica', async () => {
    await stop(); await start();
    const c = await login('gestion.turistica.sr', SETUP_PW);
    const cat = (await req('GET', A + '/catalogo', { cookie: c })).body;
    assert.strictEqual(cat.objetos.length, 29, '27 sembradas + las 2 creadas en la prueba (una se borra)');
    const det = (await req('GET', `${A}/objetos/${id}`, { cookie: c })).body;
    assert.ok(det.revisiones.length >= 4);
    assert.strictEqual((await req('GET', `${A}/img/${imgId}/1800`, { cookie: c })).status, 200);
  });

  await stop();
  try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch (_) {}
  console.log(results.join('\n'));
  console.log(`\n${passed} pasaron, ${failed} fallaron`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); stop().then(() => process.exit(1)); });
