'use strict';

// API del museo: administración (autenticada, con permisos por acción) y API pública de solo lectura.
//
// Permisos:  leer  = super-admin, editor, viewer
//            editar / publicar / vincular / subir archivos = super-admin, editor
//            eliminar fichas = super-admin
// Lo público (/api/museo/*) sale únicamente de la versión PUBLICADA y de la proyección de lista blanca
// (normalize.toPublic): nunca de borradores, notas internas, datos de donantes ni adjuntos internos.

const path = require('path');
const N = require('./normalize');
const { createStore } = require('./store');
const { createFiles } = require('./files');

const READ = ['super-admin', 'editor', 'viewer'];
const EDIT = ['super-admin', 'editor'];
const DELETE = ['super-admin'];
const POINT_TYPES = ['piece', 'story', 'audio'];

function registerMuseo(app, deps) {
  const { DATA_DIR, multer, sharp, recordAudit, sendForbiddenOrUnauthenticated } = deps;
  const store = createStore({ dataDir: DATA_DIR, seedPath: path.join(__dirname, '..', 'data', 'museo.seed.json') });
  const files = createFiles({ dataDir: DATA_DIR, sharp });
  const seed = store.seed;
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: files.MAX_IMAGE_BYTES, files: files.MAX_BATCH, fields: 10 } });

  const can = (list, role) => list.includes(String(role || '').toLowerCase());
  const guard = (list) => (req, res, next) => (can(list, req.admin.role) ? next() : sendForbiddenOrUnauthenticated(req, res));
  const fail = (res, status, error, extra) => res.status(status).json(Object.assign({ error }, extra || {}));
  const find = (data, id) => data.objetos.find((o) => o.id === id);

  function slugify(text, data) {
    const base = String(text || 'objeto').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'objeto';
    let id = base, n = 2;
    while (data.objetos.some((o) => o.id === id)) id = `${base}-${n++}`;
    return id;
  }

  // ---- Puntos de la visita (catálogo de la semilla + vínculos + puntos agregados) ----
  function allPoints(data) {
    const out = [];
    Object.entries(seed.escenas || {}).forEach(([escena, s]) => {
      (s.puntos || []).forEach((p) => {
        if (!POINT_TYPES.includes(p.type)) return;
        out.push({ id: p.id, escena, escenaNombre: s.nombre, label: p.label, type: p.type, x: p.x, y: p.y, objeto: data.vinculos[p.id] !== undefined ? data.vinculos[p.id] : (p.piece || ''), extra: false });
      });
    });
    data.puntosExtra.forEach((p) => out.push({ id: p.id, escena: p.escena, escenaNombre: ((seed.escenas || {})[p.escena] || {}).nombre || p.escena, label: p.label, type: p.type, x: p.x, y: p.y, objeto: p.objeto || '', extra: true }));
    return out;
  }
  const pointsOf = (data, objId) => allPoints(data).filter((p) => p.objeto === objId);

  function thumbOf(d) {
    const i = d.imagen;
    if (!i || !i.tipo) return '';
    return i.tipo === 'estatica' ? `/visita-museo/img/piezas/${i.ref}-640.webp` : `/admin/api/museo/img/${i.ref}/640`;
  }

  function summary(obj) {
    const d = obj.borrador;
    return {
      id: obj.id, nombre: d.nombre, inventario: d.inventario, categoria: d.categoria, sala: d.sala,
      estado: N.estado(obj), signals: N.signals(obj), rev: obj.rev, updatedAt: obj.updatedAt, updatedBy: obj.updatedBy,
      publicadoAt: obj.publicado ? obj.publicado.at : null, thumb: thumbOf(d),
    };
  }

  function detail(data, obj) {
    return {
      id: obj.id, rev: obj.rev, estado: N.estado(obj), signals: N.signals(obj), borrador: obj.borrador,
      createdAt: obj.createdAt, createdBy: obj.createdBy, updatedAt: obj.updatedAt, updatedBy: obj.updatedBy,
      retirado: !!obj.retirado,
      publicado: obj.publicado ? { rev: obj.publicado.rev, at: obj.publicado.at, by: obj.publicado.by } : null,
      revisiones: obj.revisiones.map((r) => ({ rev: r.rev, at: r.at, by: r.by, accion: r.accion, nota: r.nota, campos: r.campos, restaurable: !!r.datos })).reverse(),
      puntos: pointsOf(data, obj.id),
    };
  }

  // Referencias a archivos que la ficha usa: deben existir y ser del tipo correcto.
  function checkFiles(data, d) {
    const byId = new Map(data.archivos.map((a) => [a.id, a]));
    const errors = [];
    const need = (id, tipo, donde) => { const f = byId.get(id); if (!f || f.tipo !== tipo) errors.push(`${donde}: el archivo ya no existe o no es ${tipo === 'imagen' ? 'una imagen' : 'un documento'}.`); };
    if (d.imagen.tipo === 'archivo') need(d.imagen.ref, 'imagen', 'Imagen principal');
    d.galeria.filter((g) => g.tipo === 'archivo').forEach((g, i) => need(g.ref, 'imagen', `Galería #${i + 1}`));
    d.fuentes.forEach((f, i) => { if (f.archivoId && !byId.has(f.archivoId)) errors.push(`Fuente #${i + 1}: el adjunto ya no existe.`); });
    d.cronologia.forEach((e, i) => e.imagenes.forEach((ref) => need(ref, 'imagen', `Acontecimiento #${i + 1}`)));
    return errors;
  }

  function conflict(res, data, obj, baseRev) {
    const base = obj.revisiones.find((r) => r.rev === Number(baseRev) && r.datos);
    return fail(res, 409, 'Otra persona modificó esta ficha mientras la editabas.', {
      code: 'conflict', actual: { rev: obj.rev, updatedBy: obj.updatedBy, updatedAt: obj.updatedAt, datos: obj.borrador }, base: base ? base.datos : null,
    });
  }

  const apiBase = '/admin/api/museo';

  // =========================  ADMINISTRACIÓN  =========================
  app.get(`${apiBase}/catalogo`, guard(READ), (req, res) => {
    const data = store.load();
    res.json({
      objetos: data.objetos.map(summary),
      escenas: Object.entries(seed.escenas || {}).map(([id, s]) => ({ id, nombre: s.nombre, img: `/visita-museo/img/escenas/${id}-900.webp`, sector: ((seed.sectores || []).find((x) => x.escenas.includes(id)) || {}).nombre || '', puntos: allPoints(data).filter((p) => p.escena === id) })),
      categorias: N.CATEGORIAS.filter(Boolean),
      puede: { editar: can(EDIT, req.admin.role), eliminar: can(DELETE, req.admin.role) },
    });
  });

  app.get(`${apiBase}/objetos/:id`, guard(READ), (req, res) => {
    const data = store.load();
    const obj = find(data, req.params.id);
    if (!obj) return fail(res, 404, 'No existe la ficha.');
    res.json(detail(data, obj));
  });

  app.post(`${apiBase}/objetos`, guard(EDIT), (req, res) => {
    const data = store.load();
    const datos = N.normalizeDatos(req.body || {});
    if (!N.hasText(datos.nombre)) return fail(res, 400, 'El nombre del objeto es obligatorio.');
    const errs = checkFiles(data, datos);
    if (errs.length) return fail(res, 400, errs[0], { errors: errs });
    const now = new Date().toISOString();
    const id = slugify(datos.nombre, data);
    const obj = { id, createdAt: now, createdBy: req.admin.user, updatedAt: now, updatedBy: req.admin.user, rev: 1, borrador: datos, publicado: null, retirado: false, revisiones: [] };
    store.pushRevision(obj, { by: req.admin.user, accion: 'crear', nota: 'Ficha creada', datos, prev: null });
    data.objetos.push(obj);
    store.save(data);
    recordAudit('create', 'museo', id, req, { nombre: datos.nombre });
    res.status(201).json(detail(data, obj));
  });

  // Guardar borrador. Control de concurrencia optimista: baseRev debe coincidir con la revisión vigente.
  app.put(`${apiBase}/objetos/:id`, guard(EDIT), (req, res) => {
    const data = store.load();
    const obj = find(data, req.params.id);
    if (!obj) return fail(res, 404, 'No existe la ficha.');
    const baseRev = Number(req.body && req.body.baseRev);
    if (baseRev !== obj.rev) return conflict(res, data, obj, baseRev);
    const datos = N.normalizeDatos(req.body && req.body.datos);
    if (!N.hasText(datos.nombre)) return fail(res, 400, 'El nombre del objeto es obligatorio.');
    const errs = checkFiles(data, datos);
    if (errs.length) return fail(res, 400, errs[0], { errors: errs });
    if (JSON.stringify(datos) === JSON.stringify(obj.borrador)) return res.json(Object.assign(detail(data, obj), { sinCambios: true }));
    const prev = obj.borrador;
    obj.rev += 1;
    obj.borrador = datos;
    obj.updatedAt = new Date().toISOString();
    obj.updatedBy = req.admin.user;
    const entry = store.pushRevision(obj, { by: req.admin.user, accion: 'guardar', nota: req.body && req.body.nota, datos, prev });
    store.save(data);
    recordAudit('update', 'museo', obj.id, req, { rev: obj.rev, campos: entry.campos });
    res.json(detail(data, obj));
  });

  app.get(`${apiBase}/objetos/:id/vista-previa`, guard(READ), (req, res) => {
    const data = store.load();
    const obj = find(data, req.params.id);
    if (!obj) return fail(res, 404, 'No existe la ficha.');
    const pub = N.toPublic(obj.id, obj.borrador, store.ctxFor(data));
    pub.vermas = (obj.borrador.vermas || []).slice(0, 6);
    res.set('Cache-Control', 'no-store');
    res.json({ objeto: pub, vinculos: pointsOf(data, obj.id).map((p) => ({ punto: p.id, escena: p.escena })) });
  });

  app.post(`${apiBase}/objetos/:id/publicar`, guard(EDIT), (req, res) => {
    const data = store.load();
    const obj = find(data, req.params.id);
    if (!obj) return fail(res, 404, 'No existe la ficha.');
    if (Number(req.body && req.body.baseRev) !== obj.rev) return conflict(res, data, obj, req.body && req.body.baseRev);
    const errors = N.validateForPublish(obj.borrador).concat(checkFiles(data, obj.borrador));
    if (errors.length) return fail(res, 422, errors[0], { errors });
    if (obj.publicado && obj.publicado.rev === obj.rev && !obj.retirado) return res.json(Object.assign(detail(data, obj), { sinCambios: true })); // ya está publicada: no se repite la revisión
    const now = new Date().toISOString();
    obj.publicado = store.snapshotPublic(data, obj, req.admin.user, now);
    obj.retirado = false;
    store.pushRevision(obj, { by: req.admin.user, accion: 'publicar', nota: req.body && req.body.nota, datos: null, prev: null });
    store.save(data);
    recordAudit('publish', 'museo', obj.id, req, { rev: obj.rev });
    res.json(detail(data, obj));
  });

  app.post(`${apiBase}/objetos/:id/retirar`, guard(EDIT), (req, res) => {
    const data = store.load();
    const obj = find(data, req.params.id);
    if (!obj) return fail(res, 404, 'No existe la ficha.');
    if (!obj.publicado || obj.retirado) return fail(res, 409, 'La ficha no está publicada.');
    obj.retirado = true;
    store.pushRevision(obj, { by: req.admin.user, accion: 'retirar', nota: req.body && req.body.nota, datos: null, prev: null });
    store.save(data);
    recordAudit('unpublish', 'museo', obj.id, req, { rev: obj.rev });
    res.json(detail(data, obj));
  });

  app.get(`${apiBase}/objetos/:id/revisiones/:rev`, guard(READ), (req, res) => {
    const data = store.load();
    const obj = find(data, req.params.id);
    const r = obj && obj.revisiones.find((x) => x.rev === Number(req.params.rev) && x.datos);
    if (!r) return fail(res, 404, 'No existe esa revisión.');
    res.json({ rev: r.rev, at: r.at, by: r.by, accion: r.accion, datos: r.datos });
  });

  app.post(`${apiBase}/objetos/:id/restaurar`, guard(EDIT), (req, res) => {
    const data = store.load();
    const obj = find(data, req.params.id);
    if (!obj) return fail(res, 404, 'No existe la ficha.');
    if (Number(req.body && req.body.baseRev) !== obj.rev) return conflict(res, data, obj, req.body && req.body.baseRev);
    const target = obj.revisiones.find((x) => x.rev === Number(req.body && req.body.rev) && x.datos);
    if (!target) return fail(res, 404, 'No existe esa revisión.');
    const datos = N.normalizeDatos(target.datos);
    // Las referencias a archivos eliminados se descartan en lugar de bloquear la recuperación.
    const have = new Set(data.archivos.map((a) => a.id));
    if (datos.imagen.tipo === 'archivo' && !have.has(datos.imagen.ref)) datos.imagen = N.normalizeImagen({});
    datos.galeria = datos.galeria.filter((g) => g.tipo !== 'archivo' || have.has(g.ref));
    datos.fuentes.forEach((f) => { if (f.archivoId && !have.has(f.archivoId)) f.archivoId = ''; });
    datos.cronologia.forEach((e) => { e.imagenes = e.imagenes.filter((r) => have.has(r)); });
    const prev = obj.borrador;
    obj.rev += 1;
    obj.borrador = datos;
    obj.updatedAt = new Date().toISOString();
    obj.updatedBy = req.admin.user;
    store.pushRevision(obj, { by: req.admin.user, accion: 'restaurar', nota: `Restaurada la revisión ${target.rev}`, datos, prev });
    store.save(data);
    recordAudit('restore', 'museo', obj.id, req, { desde: target.rev, rev: obj.rev });
    res.json(detail(data, obj));
  });

  app.delete(`${apiBase}/objetos/:id`, guard(DELETE), (req, res) => {
    const data = store.load();
    const i = data.objetos.findIndex((o) => o.id === req.params.id);
    if (i < 0) return fail(res, 404, 'No existe la ficha.');
    const [obj] = data.objetos.splice(i, 1);
    Object.keys(data.vinculos).forEach((k) => { if (data.vinculos[k] === obj.id) delete data.vinculos[k]; });
    data.puntosExtra = data.puntosExtra.filter((p) => p.objeto !== obj.id);
    store.save(data);
    recordAudit('delete', 'museo', obj.id, req, { nombre: obj.borrador.nombre });
    res.json({ success: true });
  });

  // ---- Vínculos objeto ↔ puntos de la visita (sin duplicar fichas) ----
  app.put(`${apiBase}/vinculos`, guard(EDIT), (req, res) => {
    const data = store.load();
    const punto = N.line(req.body && req.body.punto, 60);
    const objeto = N.line(req.body && req.body.objeto, 60);
    const pt = allPoints(data).find((p) => p.id === punto);
    if (!pt) return fail(res, 404, 'No existe ese punto de la visita.');
    if (objeto && !find(data, objeto)) return fail(res, 404, 'No existe la ficha elegida.');
    if (pt.extra) { const e = data.puntosExtra.find((p) => p.id === punto); e.objeto = objeto; }
    else if (!objeto) delete data.vinculos[punto]; // restablece el vínculo original
    else data.vinculos[punto] = objeto;
    store.save(data);
    recordAudit('link', 'museo', punto, req, { objeto });
    res.json({ puntos: allPoints(data).filter((p) => p.escena === pt.escena) });
  });

  app.post(`${apiBase}/puntos`, guard(EDIT), (req, res) => {
    const data = store.load();
    const b = req.body || {};
    const escena = N.line(b.escena, 60);
    const x = Number(b.x), y = Number(b.y);
    if (!(seed.escenas || {})[escena]) return fail(res, 400, 'La sala no existe.');
    if (!(x >= 0 && x <= 100 && y >= 0 && y <= 100)) return fail(res, 400, 'La posición debe estar dentro de la foto.');
    const objeto = N.line(b.objeto, 60);
    if (objeto && !find(data, objeto)) return fail(res, 404, 'No existe la ficha elegida.');
    const label = N.line(b.label, 80) || 'Examinar la pieza';
    const type = POINT_TYPES.includes(b.type) ? b.type : 'piece';
    const p = { id: N.newId('px'), escena, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, type, label, objeto };
    data.puntosExtra.push(p);
    store.save(data);
    recordAudit('create', 'museo-punto', p.id, req, { escena, objeto });
    res.status(201).json({ puntos: allPoints(data).filter((q) => q.escena === escena) });
  });

  app.delete(`${apiBase}/puntos/:id`, guard(EDIT), (req, res) => {
    const data = store.load();
    const i = data.puntosExtra.findIndex((p) => p.id === req.params.id);
    if (i < 0) return fail(res, 404, 'Solo se pueden eliminar los puntos agregados desde el administrador.');
    const [p] = data.puntosExtra.splice(i, 1);
    store.save(data);
    recordAudit('delete', 'museo-punto', p.id, req, {});
    res.json({ puntos: allPoints(data).filter((q) => q.escena === p.escena) });
  });

  // ---- Archivos ----
  function usage(data, id) {
    const refs = [];
    data.objetos.forEach((o) => {
      const d = o.borrador;
      const used = (d.imagen.tipo === 'archivo' && d.imagen.ref === id) || d.galeria.some((g) => g.ref === id) || d.fuentes.some((f) => f.archivoId === id) || d.cronologia.some((e) => e.imagenes.includes(id));
      if (used) refs.push({ id: o.id, nombre: d.nombre });
    });
    return refs;
  }
  const fileView = (f, data) => ({ id: f.id, tipo: f.tipo, nombre: f.nombre, mime: f.mime, bytes: f.bytes, w: f.w, h: f.h, createdAt: f.createdAt, createdBy: f.createdBy, thumb: f.tipo === 'imagen' ? `/admin/api/museo/img/${f.id}/${Math.max(...f.variantes[0])}` : '', original: !!f.original, usoEn: usage(data, f.id) });

  app.get(`${apiBase}/archivos`, guard(READ), (req, res) => {
    const data = store.load();
    res.json({ archivos: data.archivos.map((f) => fileView(f, data)).reverse() });
  });

  app.post(`${apiBase}/archivos`, guard(EDIT), (req, res) => {
    upload.array('files', files.MAX_BATCH)(req, res, async (err) => {
      if (err) return fail(res, err.code === 'LIMIT_FILE_SIZE' ? 413 : 400, err.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera el tamaño máximo permitido.' : 'No se pudo recibir el archivo.');
      if (!req.files || !req.files.length) return fail(res, 400, 'Seleccioná al menos un archivo.');
      const created = [], errors = [];
      for (const f of req.files) {
        try { created.push(await files.process(f, req.admin.user)); } catch (e) { errors.push(`${f.originalname}: ${e.message}`); }
      }
      const data = store.load();
      data.archivos.push(...created);
      if (created.length) store.save(data);
      created.forEach((c) => recordAudit('upload', 'museo-archivo', c.id, req, { nombre: c.nombre, tipo: c.tipo, bytes: c.bytes }));
      res.status(created.length ? 201 : 415).json({ archivos: created.map((c) => fileView(c, data)), errors });
    });
  });

  app.delete(`${apiBase}/archivos/:id`, guard(EDIT), (req, res) => {
    const data = store.load();
    const i = data.archivos.findIndex((f) => f.id === req.params.id);
    if (i < 0) return fail(res, 404, 'No existe el archivo.');
    const refs = usage(data, req.params.id).concat(data.objetos.filter((o) => o.publicado && (o.publicado.files.imagenes.includes(req.params.id) || o.publicado.files.documentos.includes(req.params.id))).map((o) => ({ id: o.id, nombre: o.borrador.nombre })));
    if (refs.length) return fail(res, 409, 'El archivo está en uso en una ficha (borrador o publicada).', { usoEn: refs });
    const [f] = data.archivos.splice(i, 1);
    files.remove(f.id);
    store.save(data);
    recordAudit('delete', 'museo-archivo', f.id, req, { nombre: f.nombre });
    res.json({ success: true });
  });

  const sendFile = (res, p, mime, name, maxAge) => {
    if (!p) return fail(res, 404, 'No existe el archivo.');
    res.set('Content-Type', mime);
    res.set('Cache-Control', maxAge ? `public, max-age=${maxAge}` : 'private, no-store');
    if (name) res.set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(name)}`);
    return res.sendFile(p);
  };

  // Vistas internas (cualquier archivo, incluido lo no publicado)
  app.get(`${apiBase}/img/:id/:size`, guard(READ), (req, res) => {
    const f = store.load().archivos.find((x) => x.id === req.params.id);
    return sendFile(res, f && files.imagePath(f, req.params.size), 'image/webp');
  });
  app.get(`${apiBase}/doc/:id`, guard(READ), (req, res) => {
    const f = store.load().archivos.find((x) => x.id === req.params.id);
    return sendFile(res, f && files.docPath(f), 'application/pdf', f && f.nombre);
  });
  app.get(`${apiBase}/archivos/:id/original`, guard(EDIT), (req, res) => {
    const f = store.load().archivos.find((x) => x.id === req.params.id);
    const p = f && files.originalPath(f);
    if (!p) return fail(res, 404, 'No existe el original.');
    res.set('Cache-Control', 'private, no-store');
    return res.download(p, f.nombre);
  });

  // =========================  API PÚBLICA  =========================
  const visible = (o) => o.publicado && !o.retirado;
  function publicFiles(data) {
    const img = new Set(), doc = new Set();
    data.objetos.filter(visible).forEach((o) => { o.publicado.files.imagenes.forEach((x) => img.add(x)); o.publicado.files.documentos.forEach((x) => doc.add(x)); });
    return { img, doc };
  }

  app.get('/api/museo/visita', (req, res) => {
    const data = store.loadShared();
    const objetos = {};
    const ids = new Set();
    data.objetos.filter(visible).forEach((o) => { objetos[o.id] = o.publicado.pub; ids.add(o.id); });
    const vinculos = {};
    Object.entries(data.vinculos).forEach(([p, o]) => { if (ids.has(o)) vinculos[p] = o; });
    const puntos = data.puntosExtra.filter((p) => ids.has(p.objeto)).map((p) => ({ id: p.id, escena: p.escena, x: p.x, y: p.y, type: p.type, label: p.label, piece: p.objeto }));
    // Solo ids del catálogo original de la visita (no se revela la existencia de fichas nuevas en borrador)
    const ocultos = Object.keys(seed.piezas || {}).filter((id) => !ids.has(id));
    res.set('Cache-Control', 'public, max-age=30');
    res.json({ objetos, vinculos, puntos, ocultos });
  });

  app.get('/api/museo/img/:id/:size.webp', (req, res) => {
    const data = store.loadShared();
    if (!publicFiles(data).img.has(req.params.id)) return fail(res, 404, 'No existe el archivo.'); // interno, borrador o retirado => 404
    const f = data.archivos.find((x) => x.id === req.params.id);
    return sendFile(res, f && files.imagePath(f, req.params.size), 'image/webp', null, 300);
  });

  app.get('/api/museo/doc/:id', (req, res) => {
    const data = store.loadShared();
    if (!publicFiles(data).doc.has(req.params.id)) return fail(res, 404, 'No existe el archivo.');
    const f = data.archivos.find((x) => x.id === req.params.id);
    return sendFile(res, f && files.docPath(f), 'application/pdf', f && f.nombre, 300);
  });

  return { store, files };
}

module.exports = { registerMuseo };
