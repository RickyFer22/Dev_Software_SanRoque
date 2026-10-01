'use strict';

// Almacén de las fichas del museo: archivo JSON propio (museo.json) con escritura atómica.
// Se separa de admin.json a propósito: los historiales de revisión pueden crecer y admin.json
// se reescribe completo en cada auditoría. Las migraciones son idempotentes y se registran por id.

const fs = require('fs');
const path = require('path');
const N = require('./normalize');

const SCHEMA = 1;
const MAX_REVISIONES = 30;
const COLAPSAR_MS = 10 * 60 * 1000; // guardados seguidos del mismo usuario dentro de 10 min comparten revisión

function emptyData() {
  return { schemaVersion: SCHEMA, objetos: [], archivos: [], vinculos: {}, puntosExtra: [], migrations: [] };
}

function loadSeed(seedPath) {
  try { return JSON.parse(fs.readFileSync(seedPath, 'utf8')); } catch (e) { return { escenas: {}, sectores: [], piezas: {}, fotos: {}, fotosEscenas: {} }; }
}

function createStore({ dataDir, seedPath }) {
  const file = path.join(dataDir, 'museo.json');
  const seed = loadSeed(seedPath);

  function normalizeShape(raw) {
    const d = raw && typeof raw === 'object' ? raw : {};
    return {
      schemaVersion: SCHEMA,
      objetos: Array.isArray(d.objetos) ? d.objetos : [],
      archivos: Array.isArray(d.archivos) ? d.archivos : [],
      vinculos: d.vinculos && typeof d.vinculos === 'object' ? d.vinculos : {},
      puntosExtra: Array.isArray(d.puntosExtra) ? d.puntosExtra : [],
      migrations: Array.isArray(d.migrations) ? d.migrations : [],
    };
  }

  let shared = null; // caché de solo lectura para la API pública (se invalida al guardar)
  function save(data) {
    shared = null;
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, file); // atómico: nunca queda un archivo a medio escribir
  }

  function load() {
    let data;
    try { data = normalizeShape(JSON.parse(fs.readFileSync(file, 'utf8'))); } catch (e) { data = emptyData(); }
    if (runMigrations(data)) save(data);
    return data;
  }

  // Solo lectura: NO modificar lo devuelto. Evita releer y parsear el archivo completo en cada pedido público.
  function loadShared() {
    try {
      const st = fs.statSync(file);
      const key = `${st.mtimeMs}:${st.size}`;
      if (shared && shared.key === key) return shared.data;
      const data = load();
      const st2 = fs.statSync(file);
      shared = { key: `${st2.mtimeMs}:${st2.size}`, data };
      return data;
    } catch (e) { return load(); }
  }

  // ---- Migraciones (se ejecutan una sola vez; conservan todo lo existente) ----
  const MIGRATIONS = [
    {
      id: '2026-10-01-semilla-piezas-visita',
      run(data) {
        // Cada pieza ya visible en la visita se convierte en una ficha PUBLICADA idéntica a lo que hoy se muestra.
        const now = new Date().toISOString();
        Object.entries(seed.piezas || {}).forEach(([id, p]) => {
          if (data.objetos.some((o) => o.id === id)) return;
          const sala = Object.keys(seed.escenas || {}).find((sid) => (seed.escenas[sid].puntos || []).some((pt) => pt.piece === id)) || '';
          const datos = N.normalizeDatos({
            nombre: p.titulo, sala, resumen: p.descripcion, observar: p.detalle || '',
            periodo: { texto: p.epoca || '', certeza: p.epoca ? 'documentado' : '' },
            procedencia: { texto: p.procedencia || '', certeza: p.procedencia ? 'documentado' : '' },
            autor: { texto: p.autor || '', certeza: '' },
            imagen: { tipo: 'estatica', ref: p.foto || id, alt: p.titulo },
            vermas: p.vermas || [],
            necesitaRevision: !!p.pendiente,
          });
          const obj = {
            id, createdAt: now, createdBy: 'migración', updatedAt: now, updatedBy: 'migración', rev: 1,
            borrador: datos, publicado: null, retirado: false,
            revisiones: [{ rev: 1, at: now, by: 'migración', accion: 'crear', nota: 'Importada desde la visita virtual', campos: [], datos }],
          };
          obj.publicado = snapshotPublic(data, obj, 'migración', now);
          data.objetos.push(obj);
        });
      },
    },
  ];

  function runMigrations(data) {
    let changed = false;
    MIGRATIONS.forEach((m) => {
      if (data.migrations.some((x) => x && x.id === m.id)) return;
      try { m.run(data); data.migrations.push({ id: m.id, at: new Date().toISOString() }); changed = true; } catch (e) { console.error('[museo] migración fallida', m.id, e); }
    });
    return changed;
  }

  // ---- Contexto para la proyección pública (archivos + fotos estáticas) ----
  function ctxFor(data) {
    const byId = new Map(data.archivos.map((a) => [a.id, a]));
    return {
      fileMeta: (id) => byId.get(id) || null,
      staticFoto: (ref) => (seed.fotos && seed.fotos[ref]) || null,
    };
  }

  function snapshotPublic(data, obj, by, at) {
    const pub = N.toPublic(obj.id, obj.borrador, ctxFor(data));
    pub.vermas = (obj.borrador.vermas || []).slice(0, 6);
    return { rev: obj.rev, at, by, pub, files: N.publicFileIds(obj.borrador) };
  }

  // ---- Revisiones ----
  function diffCampos(a, b) {
    const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    return [...keys].filter((k) => JSON.stringify((a || {})[k]) !== JSON.stringify((b || {})[k]));
  }

  function pushRevision(obj, { by, accion, nota, datos, prev }) {
    const at = new Date().toISOString();
    const last = obj.revisiones[obj.revisiones.length - 1];
    const campos = diffCampos(prev, datos);
    const entry = { rev: obj.rev, at, by, accion, nota: N.line(nota, 200), campos, datos };
    if (accion === 'guardar' && last && last.accion === 'guardar' && last.by === by && Date.now() - new Date(last.at).getTime() < COLAPSAR_MS && last.rev !== (obj.publicado && obj.publicado.rev)) {
      entry.campos = [...new Set([...(last.campos || []), ...campos])];
      obj.revisiones[obj.revisiones.length - 1] = entry; // se reemplaza la anterior: evita decenas de revisiones por autoguardado
    } else {
      obj.revisiones.push(entry);
    }
    while (obj.revisiones.length > MAX_REVISIONES) {
      // nunca se descarta la revisión actualmente publicada
      const idx = obj.revisiones.findIndex((r) => !obj.publicado || r.rev !== obj.publicado.rev);
      obj.revisiones.splice(idx < 0 ? 0 : idx, 1);
    }
    return entry;
  }

  return { load, loadShared, save, seed, ctxFor, snapshotPublic, pushRevision, MAX_REVISIONES };
}

module.exports = { createStore };
