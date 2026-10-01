/* Ficha histórica de cada objeto en la visita virtual.
 * - Carga lo PUBLICADO desde /api/museo/visita y lo combina con el contenido de escenas.js (que queda como respaldo
 *   si la API no responde, p. ej. en un servidor estático).
 * - Dibuja los apartados (Su historia, Para qué se utilizaba, Qué observar, Fotografías y detalles, Fuentes consultadas)
 *   solo cuando tienen contenido. Todo el texto se inserta con nodos DOM (textContent): sin innerHTML.
 * - Modo vista previa del administrador: ?vista-previa=<id> (requiere sesión; muestra el borrador guardado). */
(function () {
  'use strict';
  const D = window.VISITA_MUSEO;
  const QS = new URLSearchParams(location.search);
  const PREVIEW = QS.get('vista-previa');
  const CERT = { documentado: 'Documentado', aproximado: 'Aproximado', atribucion: 'Atribución', testimonio: 'Testimonio oral' };
  const INGRESO = { donacion: 'Donación', compra: 'Compra', legado: 'Legado', transferencia: 'Transferencia', hallazgo: 'Hallazgo', desconocida: 'Forma de ingreso desconocida', otra: 'Otra forma de ingreso' };
  const $ = (id) => document.getElementById(id);
  const node = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined && text !== null) n.textContent = text; return n; };

  // Markdown acotado (negrita, cursiva, listas, citas, enlaces https) dibujado con nodos DOM.
  function markdown(text, root) {
    const inline = (s, parent) => {
      const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g;
      let last = 0, m;
      while ((m = re.exec(s))) {
        parent.append(document.createTextNode(s.slice(last, m.index)));
        const t = m[0];
        if (t.startsWith('**')) parent.append(node('strong', '', t.slice(2, -2)));
        else if (t.startsWith('*')) parent.append(node('em', '', t.slice(1, -1)));
        else { const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(t); const a = node('a', '', mm[1]); a.href = mm[2]; a.target = '_blank'; a.rel = 'noopener noreferrer'; parent.append(a); }
        last = m.index + t.length;
      }
      parent.append(document.createTextNode(s.slice(last)));
    };
    String(text || '').split(/\n{2,}/).forEach((block) => {
      const ls = block.split('\n');
      if (ls.every((l) => /^- /.test(l))) { const ul = node('ul'); ls.forEach((l) => { const li = node('li'); inline(l.slice(2), li); ul.append(li); }); root.append(ul); }
      else if (ls.every((l) => /^> ?/.test(l))) { const q = node('blockquote'); inline(ls.map((l) => l.replace(/^> ?/, '')).join(' '), q); root.append(q); }
      else { const p = node('p'); inline(ls.join(' '), p); root.append(p); }
    });
  }

  const cert = (c) => (CERT[c] ? node('span', 'vm-cert', CERT[c]) : null);
  const bigImg = (set) => (set.imgs || []).slice(-1)[0];

  /* ---------- Datos: API pública → piezas de la visita ---------- */
  function adapt(pub, prev) {
    const d = Object.assign({}, prev || {});
    d.titulo = pub.titulo;
    d.descripcion = pub.resumen || '';
    d.epoca = pub.periodo ? pub.periodo.texto : ''; d.epocaCert = pub.periodo ? pub.periodo.certeza : '';
    d.procedencia = pub.procedencia ? pub.procedencia.texto : ''; d.procCert = pub.procedencia ? pub.procedencia.certeza : '';
    d.autor = pub.autor ? pub.autor.texto : ''; d.autorCert = pub.autor ? pub.autor.certeza : '';
    d.detalle = pub.observar || '';
    d.vermas = (pub.vermas && pub.vermas.length) ? pub.vermas : (d.vermas || []);
    d.ficha = pub;
    delete d.imgs;
    if (pub.foto && pub.foto.imgs && pub.foto.imgs.length) {
      const m = /^\/visita-museo\/img\/piezas\/([\w-]+)-\d+\.webp$/.exec(pub.foto.imgs[0].url);
      if (m) d.foto = m[1]; // fotografía estática de la visita: conserva la vista previa borrosa y los tamaños
      else { d.imgs = pub.foto.imgs; d.fw = pub.foto.w; d.fh = pub.foto.h; }
      d.fotoAlt = pub.foto.alt || pub.titulo; d.fotoCap = pub.foto.caption || ''; d.fotoCredit = pub.foto.credit || ''; d.fotoRights = pub.foto.rights || '';
    }
    return d;
  }

  function findPoint(id) { for (const s of Object.values(D.escenas)) { const p = s.puntos.find((q) => q.id === id); if (p) return p; } return null; }

  function merge(data) {
    Object.entries(data.objetos || {}).forEach(([id, pub]) => { D.piezas[id] = adapt(pub, D.piezas[id]); });
    Object.entries(data.vinculos || {}).forEach(([pid, obj]) => { const p = findPoint(pid); if (p && ['piece', 'story', 'audio'].includes(p.type)) p.piece = obj; });
    (data.puntos || []).forEach((p) => { const s = D.escenas[p.escena]; if (s && !s.puntos.some((q) => q.id === p.id)) s.puntos.push({ id: p.id, type: p.type || 'piece', piece: p.piece, x: p.x, y: p.y, label: p.label }); });
    // Fichas de la visita que se retiraron de publicación: dejan de mostrarse
    const ocultos = new Set(data.ocultos || []);
    if (ocultos.size) {
      Object.values(D.escenas).forEach((s) => { s.puntos = s.puntos.filter((p) => !(p.piece && ocultos.has(p.piece))); });
      ocultos.forEach((id) => { delete D.piezas[id]; });
    }
  }

  async function getJson(url, opts, ms) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try { const r = await fetch(url, Object.assign({ signal: ctl.signal }, opts)); return r.ok ? await r.json() : null; } catch (e) { return null; } finally { clearTimeout(t); }
  }

  const info = { preview: null };
  async function load() {
    if (PREVIEW) {
      const r = await getJson('/admin/api/museo/objetos/' + encodeURIComponent(PREVIEW) + '/vista-previa', { credentials: 'include', cache: 'no-store' }, 4000);
      if (!r || !r.objeto) { info.preview = { error: true }; return; }
      D.piezas[PREVIEW] = adapt(r.objeto, D.piezas[PREVIEW]);
      const link = (r.vinculos || [])[0];
      let escena = link && link.escena && D.escenas[link.escena] ? link.escena : D.inicio, punto = link ? link.punto : null;
      if (!findPoint(punto)) { // ficha todavía sin punto: se muestra sobre la sala de inicio
        punto = 'vp-preview';
        D.escenas[escena].puntos.push({ id: punto, type: 'piece', piece: PREVIEW, x: 50, y: 55, label: 'Vista previa de la ficha' });
      }
      findPoint(punto).piece = PREVIEW; // el punto vinculado muestra el borrador
      info.preview = { id: PREVIEW, escena, punto };
      return;
    }
    const data = await getJson('/api/museo/visita', { credentials: 'omit' }, 2500);
    if (data) merge(data);
  }

  /* ---------- Panel: datos de identificación ---------- */
  function fillMeta(meta, d) {
    meta.textContent = '';
    const f = d.ficha || {};
    const rows = [['Época', d.epoca, d.epocaCert], ['Procedencia', d.procedencia, d.procCert], ['Autor / origen', d.autor, d.autorCert], ['Materiales', [f.materiales, f.tecnica].filter(Boolean).join(' · ')]];
    if (f.ingreso) rows.push(['Ingreso al museo', [INGRESO[f.ingreso.forma], f.ingreso.fecha && f.ingreso.fecha.texto].filter(Boolean).join(' · '), f.ingreso.fecha && f.ingreso.fecha.certeza]);
    rows.forEach(([k, v, c]) => {
      if (!v) return;
      const row = node('div'); const dt = node('dt', '', k); const dd = node('dd', '', v);
      const b = cert(c); if (b) dd.append(' ', b);
      row.append(dt, dd); meta.append(row);
    });
    meta.hidden = !meta.children.length;
  }

  /* ---------- Panel: “Conocer más de su historia” ---------- */
  const section = (title, id) => { const s = node('section', 'vm-ap'); s.setAttribute('aria-labelledby', id); const h = node('h3', '', title); h.id = id; h.tabIndex = -1; s.append(h); return s; };

  function timeline(items, root) {
    const ol = node('ol', 'vm-timeline');
    items.forEach((ev) => {
      const li = node('li');
      const head = node('div', 'vm-tl-head');
      if (ev.fecha) head.append(node('time', '', ev.fecha));
      const b = cert(ev.certeza); if (b) head.append(b);
      li.append(head, node('strong', '', ev.titulo));
      if (ev.descripcion) { const d = node('div', 'vm-tl-desc'); markdown(ev.descripcion, d); li.append(d); }
      if (ev.fuentes && ev.fuentes.length) li.append(node('p', 'vm-tl-src', 'Fuente: ' + ev.fuentes.join('; ')));
      if (ev.imagenes && ev.imagenes.length) li.append(gallery(ev.imagenes, ev.titulo));
      ol.append(li);
    });
    root.append(ol);
  }

  function gallery(list, fallbackAlt) {
    const g = node('div', 'vm-gal');
    list.forEach((it) => {
      const small = (it.imgs || [])[0], big = bigImg(it);
      if (!small || !big) return;
      const fig = node('figure', 'vm-gal-item');
      const btn = node('button', 'vm-gal-btn'); btn.type = 'button'; btn.setAttribute('aria-label', 'Ampliar: ' + (it.caption || it.alt || fallbackAlt || 'fotografía'));
      const img = node('img'); img.src = small.url; img.alt = it.alt || it.caption || ''; img.loading = 'lazy'; img.decoding = 'async';
      if (it.w && it.h) { img.width = small.w; img.height = Math.round(small.w * it.h / it.w); }
      btn.append(img);
      btn.addEventListener('click', () => window.VisitaMuseo && window.VisitaMuseo.lightbox({ url: big.url, alt: it.alt || it.caption || '', caption: [it.caption, it.credit, it.rights].filter(Boolean).join(' · ') }, btn));
      fig.append(btn);
      const cap = [it.caption, it.credit].filter(Boolean).join(' · ');
      if (cap) fig.append(node('figcaption', '', cap));
      g.append(fig);
    });
    return g;
  }

  function sources(list, root) {
    const ol = node('ol', 'vm-srcs');
    list.forEach((s) => {
      const li = node('li');
      const parts = [s.autor, s.titulo, s.fecha, s.referencia, s.paginas ? 'pp. ' + s.paginas : ''].filter(Boolean);
      li.append(document.createTextNode(parts.join('. ') || s.enlace || 'Fuente'));
      if (s.enlace) { li.append(' '); const a = node('a', '', 'Ver enlace'); a.href = s.enlace; a.target = '_blank'; a.rel = 'noopener noreferrer'; li.append(a); }
      if (s.documento) { li.append(' '); const a = node('a', '', 'Documento (PDF)'); a.href = s.documento.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; li.append(a); }
      if (s.observaciones) li.append(node('em', 'vm-src-obs', ' ' + s.observaciones));
      ol.append(li);
    });
    root.append(ol);
  }

  // Devuelve true si el apartado "Qué observar" quedó dentro de la ficha ampliada (y no hace falta el desplegable aparte).
  function fillExtra(d) {
    const box = $('vm-pextra'), btn = $('vm-pconoc');
    box.textContent = ''; box.hidden = true; btn.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.textContent = 'Conocer más de su historia';
    const f = d.ficha;
    if (!f) return false;
    const sec = [];
    if (f.historia || (f.cronologia && f.cronologia.length) || (f.cronologiaSinFecha && f.cronologiaSinFecha.length) || f.relacionados) {
      const s = section('Su historia', 'vm-ap-his');
      if (f.historia) { const b = node('div', 'vm-md'); markdown(f.historia, b); s.append(b); }
      if (f.relacionados) { s.append(node('h4', '', 'Personas y acontecimientos relacionados')); const b = node('div', 'vm-md'); markdown(f.relacionados, b); s.append(b); }
      if (f.cronologia && f.cronologia.length) { s.append(node('h4', '', 'Cronología')); timeline(f.cronologia, s); }
      if (f.cronologiaSinFecha && f.cronologiaSinFecha.length) { s.append(node('h4', '', 'Sin fecha conocida')); timeline(f.cronologiaSinFecha, s); }
      sec.push(s);
    }
    if (f.usoOriginal) { const s = section('Para qué se utilizaba', 'vm-ap-uso'); const b = node('div', 'vm-md'); markdown(f.usoOriginal, b); s.append(b); sec.push(s); }
    const others = sec.length;
    const wantsObs = f.curiosidades || (f.observar && (others || (f.galeria && f.galeria.length) || (f.fuentes && f.fuentes.length)));
    if (wantsObs) {
      const s = section('Qué observar', 'vm-ap-obs');
      if (f.observar) { const b = node('div', 'vm-md'); markdown(f.observar, b); s.append(b); }
      if (f.curiosidades) { s.append(node('h4', '', 'Curiosidades')); const b = node('div', 'vm-md'); markdown(f.curiosidades, b); s.append(b); }
      sec.push(s);
    }
    if (f.galeria && f.galeria.length) { const s = section('Fotografías y detalles', 'vm-ap-gal'); s.append(gallery(f.galeria, d.titulo)); sec.push(s); }
    if (f.fuentes && f.fuentes.length) { const s = section('Fuentes consultadas', 'vm-ap-src'); sources(f.fuentes, s); sec.push(s); }
    if (!sec.length) return false;
    sec.forEach((s) => box.append(s));
    btn.hidden = false;
    btn.onclick = () => {
      const open = box.hidden;
      box.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Mostrar menos' : 'Conocer más de su historia';
      if (open) { const h = box.querySelector('h3'); if (h) { h.focus({ preventScroll: true }); box.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); } }
    };
    return !!wantsObs;
  }

  function fillCaption(d) {
    const cap = $('vm-pcap');
    const text = [d.fotoCap, d.fotoCredit, d.fotoRights].filter(Boolean).join(' · ');
    cap.textContent = text; cap.hidden = !text;
  }

  // Elige la variante más chica que alcance (nunca amplía).
  function pickUrl(d, need) { const v = d.imgs.find((x) => x.w >= need) || d.imgs[d.imgs.length - 1]; return v.url; }

  window.VisitaFicha = { ready: load(), info, fillMeta, fillExtra, fillCaption, pickUrl, markdown };
})();
