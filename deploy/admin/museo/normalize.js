'use strict';

// Modelo de una ficha histórica del museo: normalización, validación y proyección pública.
// TODO es opcional salvo el nombre. La proyección pública (toPublic) es una LISTA BLANCA:
// lo que no se copia explícitamente allí (notas internas, inventario, donante, conservación,
// adjuntos internos, eventos internos) jamás sale por la API pública.

const crypto = require('crypto');

const CERTEZAS = ['', 'documentado', 'aproximado', 'atribucion', 'testimonio'];
const FECHA_TIPOS = ['', 'desconocida', 'exacta', 'anio', 'intervalo', 'hacia', 'siglo'];
const FUENTE_TIPOS = ['libro', 'documento', 'enlace', 'fotografia', 'entrevista', 'registro', 'otro'];
const INGRESO_FORMAS = ['', 'donacion', 'compra', 'legado', 'transferencia', 'hallazgo', 'desconocida', 'otra'];
const CATEGORIAS = ['', 'escultura', 'imagen-religiosa', 'mobiliario', 'herramienta', 'arma', 'instrumento', 'documento', 'fotografia', 'pintura', 'objeto-cotidiano', 'textil', 'arquitectura', 'otra'];
const LIMITES = { galeria: 30, fuentes: 40, cronologia: 60 };
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ROMANOS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];

const newId = (prefix) => `${prefix}_${crypto.randomBytes(5).toString('hex')}`;

// Texto de una línea: sin etiquetas, espacios colapsados.
function line(v, max = 200) {
  if (v === undefined || v === null) return '';
  let s = String(v).replace(/<[^>]*>/g, '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.length > max) s = s.slice(0, max);
  return s;
}

// Texto enriquecido: Markdown acotado (párrafos, **negrita**, *cursiva*, listas "- ", citas "> ", [texto](https://…)).
// No se guarda HTML: se eliminan las etiquetas y solo sobreviven enlaces http(s). El cliente lo dibuja con nodos DOM.
function rich(v, max = 20000) {
  if (v === undefined || v === null) return '';
  let s = String(v).replace(/<[^>]*>/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\r\n?/g, '\n');
  s = s.replace(/\[([^\]\n]{1,200})\]\(([^)\s]{1,500})\)/g, (m, text, url) => (/^https?:\/\/[^\s]+$/i.test(url) ? `[${text}](${url})` : text));
  s = s.split('\n').map((l) => l.replace(/[^\S\n]+/g, ' ').trimEnd()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return s.length > max ? s.slice(0, max) : s;
}

function url(v) {
  const s = line(v, 600);
  return /^https?:\/\/[^\s]+$/i.test(s) ? s : '';
}

function oneOf(v, list, fallback = '') {
  const s = line(v, 40).toLowerCase();
  return list.includes(s) ? s : fallback;
}

function bool(v, fallback = false) {
  if (v === undefined || v === null || v === '') return fallback;
  return v === true || v === 'true' || v === 1 || v === '1' || v === 'on';
}

function validYear(v) {
  const n = parseInt(String(v).slice(0, 4), 10);
  return Number.isInteger(n) && n >= 1 && n <= 2100 ? n : null;
}

function validIsoDate(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || '').trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

// Fecha incierta: guarda por separado el dato estructurado (si existe) y el texto que verá el visitante.
// Nunca exige una fecha exacta; "desconocida" y los textos libres son válidos.
function fecha(input, { allowEmpty = true } = {}) {
  const f = input && typeof input === 'object' ? input : {};
  const tipo = oneOf(f.tipo, FECHA_TIPOS, '');
  const out = { tipo, desde: '', hasta: '', texto: line(f.texto, 120), orden: null };
  let auto = '';
  if (tipo === 'exacta') {
    const d = validIsoDate(f.desde);
    if (d) { out.desde = d; const [y, m, dd] = d.split('-').map(Number); out.orden = y + (m - 1) / 12 + (dd - 1) / 372; auto = `${dd} de ${MESES[m - 1]} de ${y}`; }
  } else if (tipo === 'anio' || tipo === 'hacia') {
    const y = validYear(f.desde);
    if (y) { out.desde = String(y); out.orden = y; auto = tipo === 'hacia' ? `Hacia ${y}` : String(y); }
  } else if (tipo === 'intervalo') {
    const a = validYear(f.desde), b = validYear(f.hasta);
    if (a) { out.desde = String(a); out.orden = a; auto = String(a); }
    if (a && b && b >= a) { out.hasta = String(b); auto = `${a}–${b}`; }
  } else if (tipo === 'siglo') {
    const n = parseInt(f.desde, 10);
    if (Number.isInteger(n) && n >= 1 && n <= 21) { out.desde = String(n); out.orden = (n - 1) * 100; auto = `Siglo ${ROMANOS[n]}`; }
  } else if (tipo === 'desconocida') {
    auto = 'Fecha desconocida';
  }
  if (!out.texto) out.texto = auto;
  if (!out.texto && !allowEmpty) out.texto = '';
  return out;
}

const certeza = (v) => oneOf(v, CERTEZAS, '');

function dato(input, max = 300) {
  const d = input && typeof input === 'object' ? input : { texto: input };
  return { texto: line(d.texto, max), certeza: certeza(d.certeza) };
}

function archivoRef(v) { const s = line(v, 60); return /^[A-Za-z0-9_-]{3,60}$/.test(s) ? s : ''; }

function normalizeImagen(i) {
  const o = i && typeof i === 'object' ? i : {};
  const tipo = o.tipo === 'archivo' ? 'archivo' : (o.tipo === 'estatica' ? 'estatica' : '');
  const ref = archivoRef(o.ref);
  return {
    tipo: tipo && ref ? tipo : '', ref: tipo && ref ? ref : '',
    alt: line(o.alt, 240), caption: line(o.caption, 400), credit: line(o.credit, 200), rights: line(o.rights, 300),
  };
}

function normalizeGaleria(list) {
  return (Array.isArray(list) ? list : []).slice(0, LIMITES.galeria).map((g) => {
    const o = g && typeof g === 'object' ? g : {};
    return {
      id: archivoRef(o.id) || newId('img'),
      tipo: o.tipo === 'estatica' ? 'estatica' : 'archivo',
      ref: archivoRef(o.ref || o.archivoId),
      alt: line(o.alt, 240), caption: line(o.caption, 400), credit: line(o.credit, 200), rights: line(o.rights, 300),
      publico: bool(o.publico, true),
    };
  }).filter((g) => g.ref);
}

function normalizeFuentes(list) {
  return (Array.isArray(list) ? list : []).slice(0, LIMITES.fuentes).map((f) => {
    const o = f && typeof f === 'object' ? f : {};
    return {
      id: archivoRef(o.id) || newId('src'),
      tipo: oneOf(o.tipo, FUENTE_TIPOS, 'otro'),
      titulo: line(o.titulo, 300), autor: line(o.autor, 200), fecha: line(o.fecha, 80),
      referencia: line(o.referencia, 300), paginas: line(o.paginas, 60), enlace: url(o.enlace),
      archivoId: archivoRef(o.archivoId), observaciones: line(o.observaciones, 600),
      vinculo: line(o.vinculo, 120),            // dato o acontecimiento al que respalda (texto libre o id de evento)
      publica: bool(o.publica, true),            // la fuente se muestra al visitante
      adjuntoPublico: bool(o.adjuntoPublico, false), // el archivo adjunto se puede descargar
    };
  }).filter((f) => f.titulo || f.referencia || f.enlace || f.archivoId);
}

function normalizeCronologia(list) {
  return (Array.isArray(list) ? list : []).slice(0, LIMITES.cronologia).map((e) => {
    const o = e && typeof e === 'object' ? e : {};
    return {
      id: archivoRef(o.id) || newId('evt'),
      fecha: fecha(o.fecha),
      certeza: certeza(o.certeza),
      titulo: line(o.titulo, 200), descripcion: rich(o.descripcion, 3000),
      fuentes: (Array.isArray(o.fuentes) ? o.fuentes : []).map(archivoRef).filter(Boolean).slice(0, 20),
      imagenes: (Array.isArray(o.imagenes) ? o.imagenes : []).map(archivoRef).filter(Boolean).slice(0, 10),
      publico: bool(o.publico, true),
    };
  }).filter((e) => e.titulo || e.descripcion);
}

// Datos completos de una ficha (borrador). `input` es lo que envía el cliente; todo se vuelve a validar aquí.
function normalizeDatos(input) {
  const d = input && typeof input === 'object' ? input : {};
  const ing = d.ingreso && typeof d.ingreso === 'object' ? d.ingreso : {};
  const don = d.donante && typeof d.donante === 'object' ? d.donante : {};
  const periodo = Object.assign(dato(d.periodo, 120), { fecha: fecha(d.periodo && d.periodo.fecha) });
  if (!periodo.texto && periodo.fecha.texto) periodo.texto = periodo.fecha.texto; // el texto estructurado sirve de respaldo
  const ingFecha = Object.assign(dato(ing.fecha, 120), { fecha: fecha(ing.fecha && ing.fecha.fecha) });
  if (!ingFecha.texto && ingFecha.fecha.texto) ingFecha.texto = ingFecha.fecha.texto;
  return {
    nombre: line(d.nombre, 200),
    inventario: line(d.inventario, 60),                  // INTERNO
    categoria: oneOf(d.categoria, CATEGORIAS, ''),
    sala: line(d.sala, 60),
    resumen: rich(d.resumen, 600),
    historia: rich(d.historia, 20000),
    periodo,
    autor: dato(d.autor, 300),
    procedencia: dato(d.procedencia, 300),
    materiales: line(d.materiales, 400),
    tecnica: line(d.tecnica, 400),
    usoOriginal: rich(d.usoOriginal, 3000),
    ingreso: { forma: oneOf(ing.forma, INGRESO_FORMAS, ''), fecha: ingFecha },
    relacionados: rich(d.relacionados, 3000),
    vermas: (Array.isArray(d.vermas) ? d.vermas : []).map(archivoRef).filter(Boolean).slice(0, 6), // otras fichas sugeridas ("Seguí con")
    observar: rich(d.observar, 3000),
    curiosidades: rich(d.curiosidades, 3000),
    conservacion: line(d.conservacion, 600),             // INTERNO
    notasInternas: rich(d.notasInternas, 8000),          // INTERNO
    donante: { nombre: line(don.nombre, 200), contacto: line(don.contacto, 300), notas: rich(don.notas, 2000) }, // INTERNO / datos personales
    pendiente: rich(d.pendiente, 3000),                  // INTERNO: qué falta investigar
    necesitaRevision: bool(d.necesitaRevision, false),   // INTERNO
    imagen: normalizeImagen(d.imagen),
    galeria: normalizeGaleria(d.galeria),
    fuentes: normalizeFuentes(d.fuentes),
    cronologia: normalizeCronologia(d.cronologia),
  };
}

const hasText = (v) => typeof v === 'string' && v.trim().length > 0;

function sortCronologia(list) {
  const dated = list.filter((e) => e.fecha && e.fecha.orden !== null);
  const undated = list.filter((e) => !e.fecha || e.fecha.orden === null);
  dated.sort((a, b) => a.fecha.orden - b.fecha.orden);
  return { dated, undated };
}

// Archivos (ids) que una ficha publicada hace accesibles al público.
function publicFileIds(datos) {
  const ids = { imagenes: new Set(), documentos: new Set() };
  if (datos.imagen && datos.imagen.tipo === 'archivo') ids.imagenes.add(datos.imagen.ref);
  datos.galeria.filter((g) => g.publico && g.tipo === 'archivo').forEach((g) => ids.imagenes.add(g.ref));
  datos.cronologia.filter((e) => e.publico).forEach((e) => e.imagenes.forEach((i) => ids.imagenes.add(i)));
  datos.fuentes.filter((f) => f.publica && f.adjuntoPublico && f.archivoId).forEach((f) => ids.documentos.add(f.archivoId));
  return { imagenes: [...ids.imagenes], documentos: [...ids.documentos] };
}

// ctx.fileMeta(id) => { tipo:'imagen'|'documento', variantes:[[w,h],...] , nombre } | null
// ctx.staticFoto(ref) => { w, h, v:[[w,h],...] } | null
function imgSet(tipo, ref, ctx) {
  if (tipo === 'estatica') {
    const m = ctx.staticFoto && ctx.staticFoto(ref);
    if (!m) return null;
    return { w: m.w, h: m.h, imgs: m.v.map(([w, h]) => ({ w, url: `/visita-museo/img/piezas/${ref}-${Math.max(w, h)}.webp` })) };
  }
  const f = ctx.fileMeta && ctx.fileMeta(ref);
  if (!f || f.tipo !== 'imagen') return null;
  return { w: f.w, h: f.h, imgs: f.variantes.map(([w, h]) => ({ w, url: `/api/museo/img/${ref}/${Math.max(w, h)}.webp` })) };
}

function pubDato(d) { return hasText(d.texto) ? { texto: d.texto, certeza: d.certeza || '' } : null; }

// PROYECCIÓN PÚBLICA: solo campos aptos para el visitante, sin vacíos.
function toPublic(id, datos, ctx) {
  const out = { id, titulo: datos.nombre };
  if (hasText(datos.resumen)) out.resumen = datos.resumen;
  if (hasText(datos.categoria)) out.categoria = datos.categoria;
  const img = datos.imagen && datos.imagen.tipo ? imgSet(datos.imagen.tipo, datos.imagen.ref, ctx) : null;
  if (img) out.foto = Object.assign({ alt: datos.imagen.alt, caption: datos.imagen.caption, credit: datos.imagen.credit, rights: datos.imagen.rights }, img);
  const periodo = pubDato(datos.periodo); if (periodo) out.periodo = periodo;
  const autor = pubDato(datos.autor); if (autor) out.autor = autor;
  const proc = pubDato(datos.procedencia); if (proc) out.procedencia = proc;
  if (hasText(datos.materiales)) out.materiales = datos.materiales;
  if (hasText(datos.tecnica)) out.tecnica = datos.tecnica;
  if (hasText(datos.usoOriginal)) out.usoOriginal = datos.usoOriginal;
  const ingresoTxt = pubDato(datos.ingreso.fecha);
  if (datos.ingreso.forma || ingresoTxt) out.ingreso = { forma: datos.ingreso.forma, fecha: ingresoTxt };
  if (hasText(datos.relacionados)) out.relacionados = datos.relacionados;
  if (hasText(datos.historia)) out.historia = datos.historia;
  if (hasText(datos.observar)) out.observar = datos.observar;
  if (hasText(datos.curiosidades)) out.curiosidades = datos.curiosidades;

  const galeria = datos.galeria.filter((g) => g.publico).map((g) => {
    const set = imgSet(g.tipo, g.ref, ctx);
    return set ? Object.assign({ id: g.id, alt: g.alt, caption: g.caption, credit: g.credit, rights: g.rights }, set) : null;
  }).filter(Boolean);
  if (galeria.length) out.galeria = galeria;

  const fuentesPub = datos.fuentes.filter((f) => f.publica);
  const sourceById = new Map(fuentesPub.map((f) => [f.id, f]));
  if (fuentesPub.length) {
    out.fuentes = fuentesPub.map((f) => {
      const s = { id: f.id, tipo: f.tipo };
      ['titulo', 'autor', 'fecha', 'referencia', 'paginas', 'enlace', 'observaciones', 'vinculo'].forEach((k) => { if (hasText(f[k])) s[k] = f[k]; });
      if (f.archivoId && f.adjuntoPublico) { const dm = ctx.fileMeta && ctx.fileMeta(f.archivoId); if (dm && dm.tipo === 'documento') s.documento = { url: `/api/museo/doc/${f.archivoId}`, nombre: dm.nombre }; }
      return s;
    });
  }

  const eventos = datos.cronologia.filter((e) => e.publico).map((e) => {
    const ev = { id: e.id, titulo: e.titulo };
    if (e.fecha.texto) ev.fecha = e.fecha.texto;
    if (e.certeza) ev.certeza = e.certeza;
    if (hasText(e.descripcion)) ev.descripcion = e.descripcion;
    const refs = e.fuentes.map((sid) => sourceById.get(sid)).filter(Boolean).map((s) => s.titulo || s.referencia || s.enlace).filter(Boolean);
    if (refs.length) ev.fuentes = refs;
    const imgs = e.imagenes.map((ref) => imgSet('archivo', ref, ctx)).filter(Boolean);
    if (imgs.length) ev.imagenes = imgs;
    ev.orden = e.fecha.orden;
    return ev;
  });
  if (eventos.length) {
    const { dated, undated } = sortCronologia(eventos.map((ev) => ({ ...ev, fecha: { orden: ev.orden, texto: ev.fecha } })));
    const strip = (ev) => { const { orden, ...rest } = ev; rest.fecha = ev.fecha.texto || undefined; if (!rest.fecha) delete rest.fecha; return rest; };
    out.cronologia = dated.map(strip);
    if (undated.length) out.cronologiaSinFecha = undated.map(strip);
  }
  return out;
}

function validateForPublish(datos) {
  const errors = [];
  if (!hasText(datos.nombre)) errors.push('Falta el nombre del objeto.');
  if (!hasText(datos.resumen) && !hasText(datos.historia)) errors.push('Para publicar escribí al menos una descripción breve o la historia.');
  return errors;
}

// Señales para organizar la investigación (no impiden publicar).
function signals(obj) {
  const d = obj.borrador;
  const tieneHistoria = hasText(d.historia) || d.cronologia.length > 0;
  return {
    sinHistoria: !tieneHistoria,
    necesitaFuentes: tieneHistoria && d.fuentes.length === 0,
    pendienteRevision: !!d.necesitaRevision,
    cambiosSinPublicar: !!obj.publicado && obj.publicado.rev !== obj.rev,
  };
}

function estado(obj) {
  if (!obj.publicado) return 'borrador';
  if (obj.retirado) return 'retirado';
  return obj.publicado.rev === obj.rev ? 'publicado' : 'cambios';
}

module.exports = {
  CERTEZAS, FECHA_TIPOS, FUENTE_TIPOS, INGRESO_FORMAS, CATEGORIAS, LIMITES,
  line, rich, url, oneOf, bool, fecha, normalizeDatos, normalizeImagen, toPublic, publicFileIds,
  validateForPublish, signals, estado, newId, hasText,
};
