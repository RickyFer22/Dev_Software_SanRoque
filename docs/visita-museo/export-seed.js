'use strict';
// Genera deploy/admin/data/museo.seed.json (catálogo de salas, puntos y piezas actuales) a partir de
// visita-museo/js/escenas.js e imagenes.js. El administrador lo usa para sembrar las fichas existentes
// y para mostrar las salas. Ejecutar tras cambiar salas/puntos/piezas en escenas.js:
//   node docs/visita-museo/export-seed.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
global.window = {};
require(path.join(root, 'visita-museo', 'js', 'escenas.js'));
require(path.join(root, 'visita-museo', 'js', 'imagenes.js'));
const D = window.VISITA_MUSEO, I = window.VISITA_IMG;

const escenas = {};
Object.entries(D.escenas).forEach(([id, s]) => {
  escenas[id] = {
    nombre: s.nombre,
    puntos: s.puntos.map((p) => {
      const o = { id: p.id, type: p.type, label: p.label, x: p.x, y: p.y };
      ['piece', 'to', 'back', 'showAfter'].forEach((k) => { if (p[k] !== undefined) o[k] = p[k]; });
      return o;
    }),
  };
});
const piezas = {};
Object.entries(D.piezas).forEach(([id, p]) => {
  piezas[id] = { titulo: p.titulo, descripcion: p.descripcion || '', detalle: p.detalle || '', epoca: p.epoca || '', procedencia: p.procedencia || '', autor: p.autor || '', foto: p.foto || id, vermas: p.vermas || [], pendiente: !!p.pendiente };
});
const strip = (m) => ({ w: m.w, h: m.h, v: m.v });
const fotos = {}; Object.entries(I.piezas).forEach(([k, m]) => { fotos[k] = strip(m); });
const fotosEscenas = {}; Object.entries(I.escenas).forEach(([k, m]) => { fotosEscenas[k] = strip(m); });
const out = { generado: new Date().toISOString(), sectores: D.sectores.map((s) => ({ id: s.id, museo: s.museo, nombre: s.nombre, escenas: s.escenas })), escenas, piezas, fotos, fotosEscenas };
const dest = path.join(root, 'deploy', 'admin', 'data', 'museo.seed.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 1));
console.log('seed escrito:', dest, '|', Object.keys(escenas).length, 'salas,', Object.keys(piezas).length, 'piezas');
