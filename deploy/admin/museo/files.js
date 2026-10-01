'use strict';

// Fotografías y documentos de las fichas del museo.
//  - Las imágenes se validan por firma real, se convierten a WebP en varios tamaños (sin ampliar nunca)
//    y el ORIGINAL se conserva como material fuente.
//  - Los archivos viven en DATA_DIR/museo-archivos/<id>/ (NO en la carpeta de subidas pública): solo se
//    entregan por rutas que verifican permisos o que el archivo pertenezca a una ficha publicada y público.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const IMG_SIZES = [[640, 76], [1200, 78], [1800, 80]]; // [lado mayor, calidad]
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_DOC_BYTES = 10 * 1024 * 1024;
const MAX_BATCH = 10;

const IMAGE_MAGIC = [
  { ext: 'webp', mime: 'image/webp', test: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  { ext: 'jpg', mime: 'image/jpeg', test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', mime: 'image/png', test: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: 'avif', mime: 'image/avif', test: (b) => b.length > 16 && /avif|avis/.test(b.toString('ascii', 8, 32)) && b.toString('ascii', 4, 8) === 'ftyp' },
];
const DOC_MAGIC = [
  { ext: 'pdf', mime: 'application/pdf', test: (b) => b.length > 5 && b.toString('ascii', 0, 5) === '%PDF-' },
];

const safeName = (n) => String(n || 'archivo').replace(/[\u0000-\u001f<>:"/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) || 'archivo';
const validId = (id) => /^[A-Za-z0-9_-]{3,60}$/.test(String(id || ''));

function createFiles({ dataDir, sharp }) {
  const root = path.join(dataDir, 'museo-archivos');
  fs.mkdirSync(root, { recursive: true });
  const dirOf = (id) => {
    if (!validId(id)) return null;
    const dir = path.join(root, id);
    return path.resolve(dir).startsWith(path.resolve(root) + path.sep) ? dir : null; // anti path-traversal
  };

  // Procesa un archivo subido. Devuelve el registro (sin guardarlo en el almacén).
  async function process(file, by) {
    if (!file || !Buffer.isBuffer(file.buffer) || !file.buffer.length) throw new Error('No se recibió el archivo.');
    const buf = file.buffer;
    const img = IMAGE_MAGIC.find((m) => m.test(buf));
    const doc = !img && DOC_MAGIC.find((m) => m.test(buf));
    if (!img && !doc) throw new Error('Formato no admitido. Imágenes: JPG, PNG, WebP o AVIF. Documentos: PDF.');
    if (img && buf.length > MAX_IMAGE_BYTES) throw new Error(`La imagen supera el máximo de ${MAX_IMAGE_BYTES / 1048576} MB.`);
    if (doc && buf.length > MAX_DOC_BYTES) throw new Error(`El documento supera el máximo de ${MAX_DOC_BYTES / 1048576} MB.`);

    const id = `f_${crypto.randomBytes(8).toString('hex')}`;
    const dir = dirOf(id);
    fs.mkdirSync(dir, { recursive: true });
    const rec = { id, tipo: img ? 'imagen' : 'documento', nombre: safeName(file.originalname), mime: (img || doc).mime, bytes: buf.length, createdAt: new Date().toISOString(), createdBy: by };
    try {
      if (img) {
        const meta = await sharp(buf, { failOn: 'warning', limitInputPixels: 80_000_000 }).metadata();
        if (!meta.width || !meta.height) throw new Error('No se pudieron leer las dimensiones de la imagen.');
        fs.writeFileSync(path.join(dir, `original.${img.ext}`), buf); // material fuente, nunca se publica
        rec.original = { ext: img.ext, bytes: buf.length };
        const oriented = sharp(buf, { limitInputPixels: 80_000_000 }).rotate();
        const info = await oriented.clone().toBuffer({ resolveWithObject: true });
        rec.w = info.info.width; rec.h = info.info.height;
        const native = Math.max(rec.w, rec.h);
        rec.variantes = [];
        for (const [edge, q] of IMG_SIZES) {
          if (edge > native && rec.variantes.length) continue;      // no se amplía: ya existe la versión máxima
          const out = await sharp(buf).rotate().resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true }).webp({ quality: q, effort: 4 }).toBuffer({ resolveWithObject: true });
          const name = `${Math.max(out.info.width, out.info.height)}.webp`;
          fs.writeFileSync(path.join(dir, name), out.data);
          if (!rec.variantes.some(([w]) => w === out.info.width)) rec.variantes.push([out.info.width, out.info.height]);
        }
        rec.mime = 'image/webp';
      } else {
        fs.writeFileSync(path.join(dir, `documento.${doc.ext}`), buf);
        rec.ext = doc.ext;
      }
    } catch (e) {
      fs.rmSync(dir, { recursive: true, force: true });
      throw e;
    }
    return rec;
  }

  function remove(id) { const d = dirOf(id); if (d) fs.rmSync(d, { recursive: true, force: true }); }

  // Devuelve la ruta del WebP más cercano al tamaño pedido (o null).
  function imagePath(rec, size) {
    const dir = dirOf(rec.id);
    if (!dir || rec.tipo !== 'imagen') return null;
    const want = parseInt(size, 10);
    const exact = (rec.variantes || []).find(([w, h]) => Math.max(w, h) === want);
    if (!exact) return null;
    const p = path.join(dir, `${Math.max(exact[0], exact[1])}.webp`);
    return fs.existsSync(p) ? p : null;
  }
  function docPath(rec) {
    const dir = dirOf(rec.id);
    if (!dir || rec.tipo !== 'documento') return null;
    const p = path.join(dir, `documento.${rec.ext || 'pdf'}`);
    return fs.existsSync(p) ? p : null;
  }
  function originalPath(rec) {
    const dir = dirOf(rec.id);
    if (!dir || !rec.original) return null;
    const p = path.join(dir, `original.${rec.original.ext}`);
    return fs.existsSync(p) ? p : null;
  }

  return { process, remove, imagePath, docPath, originalPath, MAX_BATCH, MAX_IMAGE_BYTES, MAX_DOC_BYTES, validId };
}

module.exports = { createFiles };
