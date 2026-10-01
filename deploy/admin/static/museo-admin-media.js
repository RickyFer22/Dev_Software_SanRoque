/* Administrador del museo: imágenes y documentos, y vínculos con los puntos de la visita virtual. */
(function () {
  'use strict';
  const M = window.MuseoAdmin;
  const { ask, h, field, input, toggle, richField, touch, can, fmtDate, api, A, toast } = M.ui;
  const S = M.state;
  const rid = (p) => p + '_' + Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => b.toString(16).padStart(2, '0')).join('');
  const kb = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB');
  const fileById = (id) => S.archivos.find((a) => a.id === id);
  const thumbOf = (it) => (it.tipo === 'estatica' ? `/visita-museo/img/piezas/${it.ref}-640.webp` : ((fileById(it.ref) || {}).thumb || ''));

  /* ---------- Subida de archivos (WebP para imágenes; originales conservados en el servidor) ---------- */
  async function subir(fileList, after) {
    if (!fileList || !fileList.length) return;
    const fd = new FormData();
    [...fileList].forEach((f) => fd.append('files', f));
    toast('Subiendo y optimizando…');
    const r = await api('POST', A + '/archivos', fd, true);
    (r.body.errors || []).forEach((e) => toast(e, 'error'));
    if (r.body.archivos && r.body.archivos.length) toast(`${r.body.archivos.length} archivo(s) subido(s). Las imágenes se convirtieron a WebP y se conservó el original.`);
    else if (!r.ok && !(r.body.errors || []).length) toast(r.body.error || 'No se pudo subir.', 'error');
    await M.loadArchivos();
    if (after) after(r.body.archivos || []);
  }
  M.uploadButton = function (label, after) {
    const inp = h('input', { type: 'file', multiple: true, accept: 'image/jpeg,image/png,image/webp,image/avif,application/pdf', hidden: true, 'aria-hidden': 'true' });
    inp.addEventListener('change', () => { subir(inp.files, after); inp.value = ''; });
    return h('span', {}, h('button', { type: 'button', class: 'cancel-button', text: label, disabled: !can(), onclick: () => inp.click() }), inp);
  };

  /* ---------- Pestaña Imágenes ---------- */
  M.tabImagenes = function () {
    const d = S.datos;
    d.imagen = d.imagen || { tipo: '', ref: '', alt: '', caption: '', credit: '', rights: '' };
    d.galeria = d.galeria || [];
    const main = h('div', { class: 'museo-card' });
    const gal = h('div', { class: 'museo-list' });
    const lib = h('div', { class: 'museo-libgrid' });

    const drawMain = () => {
      main.textContent = '';
      const src = d.imagen.tipo ? thumbOf(d.imagen) : '';
      main.append(
        h('div', { class: 'museo-card-head' }, h('strong', { text: 'Imagen principal' }), h('span', { class: 'museo-spacer' }), d.imagen.tipo && can() ? h('button', { type: 'button', class: 'cancel-button', text: 'Quitar', onclick: () => { d.imagen = { tipo: '', ref: '', alt: '', caption: '', credit: '', rights: '' }; touch(); drawMain(); } }) : null),
        h('div', { class: 'museo-imgrow' },
          src ? h('img', { class: 'museo-thumb', src, alt: d.imagen.alt || 'Imagen principal' }) : h('div', { class: 'museo-thumb is-empty', text: 'Sin imagen' }),
          h('div', { class: 'museo-imgfields' },
            field('Texto alternativo (para lectores de pantalla)', input(d.imagen, 'alt', { max: 240 })),
            field('Epígrafe', input(d.imagen, 'caption', { max: 400 })),
            h('div', { class: 'museo-grid' }, field('Autoría de la fotografía', input(d.imagen, 'credit', { max: 200 })), field('Derechos de uso', input(d.imagen, 'rights', { max: 300, placeholder: 'Ej: © Museo de San Roque' }))))),
        d.imagen.tipo === 'estatica' ? h('p', { class: 'field-help', text: 'Se usa la fotografía actual de la visita virtual. Podés reemplazarla eligiendo otra de la biblioteca.' }) : null);
    };

    const drawGal = () => {
      gal.textContent = '';
      if (!d.galeria.length) gal.append(h('div', { class: 'empty-state' }, h('p', { text: 'Sin fotografías de detalle. Agregá inscripciones, marcas, detalles o fotos históricas de contexto.' })));
      d.galeria.forEach((g, i) => {
        const src = thumbOf(g);
        gal.append(h('article', { class: 'museo-card' },
          h('div', { class: 'museo-card-head' }, h('strong', { text: `Fotografía ${i + 1}` }), h('span', { class: 'pill status-pill ' + (g.publico === false ? 'hidden' : 'published'), text: g.publico === false ? 'Interna' : 'Pública' }), h('span', { class: 'museo-spacer' }),
            h('span', { class: 'museo-move' },
              h('button', { type: 'button', class: 'cancel-button', 'aria-label': 'Subir', text: '↑', disabled: i === 0 || !can(), onclick: () => { [d.galeria[i - 1], d.galeria[i]] = [d.galeria[i], d.galeria[i - 1]]; touch(); drawGal(); } }),
              h('button', { type: 'button', class: 'cancel-button', 'aria-label': 'Bajar', text: '↓', disabled: i === d.galeria.length - 1 || !can(), onclick: () => { [d.galeria[i + 1], d.galeria[i]] = [d.galeria[i], d.galeria[i + 1]]; touch(); drawGal(); } })),
            h('button', { type: 'button', class: 'cancel-button museo-del', text: 'Quitar', disabled: !can(), onclick: () => { d.galeria.splice(i, 1); touch(); drawGal(); } })),
          h('div', { class: 'museo-imgrow' },
            src ? h('img', { class: 'museo-thumb', src, alt: g.alt || '' }) : h('div', { class: 'museo-thumb is-empty', text: 'No disponible' }),
            h('div', { class: 'museo-imgfields' },
              field('Epígrafe', input(g, 'caption', { max: 400 })),
              field('Texto alternativo', input(g, 'alt', { max: 240 })),
              h('div', { class: 'museo-grid' }, field('Autoría', input(g, 'credit', { max: 200 })), field('Derechos de uso', input(g, 'rights', { max: 300 }))),
              toggle(g, 'publico', 'Mostrar a los visitantes (desmarcá para dejarla interna)')))));
      });
    };

    const drawLib = () => {
      lib.textContent = '';
      S.archivos.forEach((a) => {
        const uso = a.usoEn.length ? `En uso: ${a.usoEn.map((u) => u.nombre).join(', ')}` : 'Sin usar';
        lib.append(h('article', { class: 'museo-libitem' },
          a.tipo === 'imagen' ? h('img', { src: a.thumb, alt: a.nombre, loading: 'lazy' }) : h('div', { class: 'museo-doc', text: 'PDF' }),
          h('div', { class: 'museo-libmeta' }, h('strong', { text: a.nombre }), h('span', { class: 'small', text: `${a.tipo === 'imagen' ? `${a.w}×${a.h} px · ` : ''}${kb(a.bytes)} · ${a.createdBy} · ${fmtDate(a.createdAt)}` }), h('span', { class: 'small', text: uso })),
          can() ? h('div', { class: 'list-actions' },
            a.tipo === 'imagen' ? h('button', { type: 'button', text: 'Principal', onclick: () => { d.imagen = Object.assign({}, d.imagen, { tipo: 'archivo', ref: a.id }); touch(); drawMain(); } }) : null,
            a.tipo === 'imagen' ? h('button', { type: 'button', class: 'cancel-button', text: '+ Galería', onclick: () => { d.galeria.push({ id: rid('img'), tipo: 'archivo', ref: a.id, alt: '', caption: '', credit: '', rights: '', publico: true }); touch(); drawGal(); } }) : null,
            a.original ? h('a', { class: 'btn cancel-button', href: `${A}/archivos/${a.id}/original`, text: 'Original' }) : null,
            h('button', { type: 'button', class: 'cancel-button museo-del', text: 'Eliminar', onclick: async () => { if (!(await window.AdminUI.confirmAction({ title: 'Eliminar archivo', message: 'El archivo se elimina de la biblioteca (solo si no está en uso).', confirmLabel: 'Eliminar', danger: true }))) return; const r = await api('DELETE', `${A}/archivos/${a.id}`); if (!r.ok) return toast(r.body.error || 'No se pudo eliminar.', 'error'); await M.loadArchivos(); drawLib(); } })) : null));
      });
      if (!S.archivos.length) lib.append(h('div', { class: 'empty-state' }, h('p', { text: 'La biblioteca está vacía.' })));
    };

    const after = (created) => {
      created.filter((c) => c.tipo === 'imagen').forEach((c) => {
        if (!d.imagen.tipo) d.imagen = Object.assign({}, d.imagen, { tipo: 'archivo', ref: c.id });
        else d.galeria.push({ id: rid('img'), tipo: 'archivo', ref: c.id, alt: '', caption: '', credit: '', rights: '', publico: true });
      });
      if (created.length) touch();
      drawMain(); drawGal(); drawLib();
    };
    const drop = h('div', { class: 'museo-drop', tabindex: '0', role: 'button', 'aria-label': 'Subir fotografías o documentos' },
      h('strong', { text: 'Arrastrá fotografías o documentos acá' }),
      h('span', { class: 'small', text: 'JPG, PNG, WebP o AVIF hasta 20 MB (se convierten a WebP y se conserva el original) · PDF hasta 10 MB' }),
      M.uploadButton('Elegir archivos', after));
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', (e) => { if (can()) subir(e.dataTransfer.files, after); });
    drawMain(); drawGal(); drawLib();
    return h('div', {},
      h('div', { class: 'museo-note is-public' }, h('strong', { text: 'Fotografías y documentos' }), h('span', { text: 'Las imágenes y fotos de detalle se muestran en la ficha pública. Las marcadas como internas, los originales y los documentos privados nunca se publican.' })),
      can() ? drop : null, main,
      h('h3', { class: 'museo-h3', text: 'Fotografías de detalle, inscripciones, marcas y contexto' }), gal,
      h('h3', { class: 'museo-h3', text: 'Biblioteca de archivos del museo' }), lib);
  };

  /* ---------- Puntos de la visita virtual ---------- */
  async function refreshPuntos() {
    await M.reloadCatalogo();
    if (S.obj) { const r = await api('GET', `${A}/objetos/${S.obj.id}`); if (r.ok) S.obj.puntos = r.body.puntos; }
  }

  // Selector de puntos sobre la foto de cada sala: vincular un objeto existente (sin duplicar su ficha) o agregar un punto.
  function pointPicker(getObj) {
    const c = S.catalogo;
    const st = { escena: (c.escenas[0] || {}).id };
    const box = h('div', { class: 'museo-picker' });
    const paint = () => {
      box.textContent = '';
      const sc = c.escenas.find((e) => e.id === st.escena) || c.escenas[0];
      if (!sc) return;
      const objId = getObj();
      const nameOf = (id) => ((c.objetos.find((o) => o.id === id) || {}).nombre) || (id ? id : 'Sin ficha');
      const sel = h('select', { 'aria-label': 'Sala' }, c.escenas.map((e) => h('option', { value: e.id, text: `${e.nombre} (${e.sector})` })));
      sel.value = sc.id; sel.addEventListener('change', () => { st.escena = sel.value; paint(); });
      const stage = h('div', { class: 'museo-stage', title: can() && objId ? 'Hacé clic en la foto para agregar un punto nuevo' : '' }, h('img', { src: sc.img, alt: `Foto de ${sc.nombre}` }),
        sc.puntos.map((p) => h('button', { type: 'button', class: 'museo-pin' + (p.objeto === objId && objId ? ' is-mine' : ''), style: `left:${p.x}%;top:${p.y}%`, title: `${p.label} → ${nameOf(p.objeto)}`, 'aria-label': `${p.label}, vinculado a ${nameOf(p.objeto)}`, onclick: (e) => { e.stopPropagation(); document.getElementById('pt-' + p.id)?.scrollIntoView({ block: 'nearest' }); document.getElementById('pt-' + p.id)?.classList.add('is-flash'); } })));
      stage.addEventListener('click', async (e) => {
        if (!can() || !objId) return;
        const r0 = stage.getBoundingClientRect();
        const x = ((e.clientX - r0.left) / r0.width) * 100, y = ((e.clientY - r0.top) / r0.height) * 100;
        const label = await ask({ title: 'Nuevo punto en la visita', label: 'Nombre breve del punto (lo ve el visitante)', value: 'Examinar ' + nameOf(objId).toLowerCase(), confirmLabel: 'Agregar punto' });
        if (!label) return;
        const r = await api('POST', A + '/puntos', { escena: sc.id, x, y, label, objeto: objId, type: 'piece' });
        if (!r.ok) return toast(r.body.error || 'No se pudo crear el punto.', 'error');
        toast('Punto agregado. Aparece en la visita cuando la ficha esté publicada.'); await refreshPuntos(); paint();
      });
      const rows = sc.puntos.map((p) => h('li', { id: 'pt-' + p.id, class: 'museo-ptrow' },
        h('span', { class: 'museo-ptname' }, h('strong', { text: p.label }), h('span', { class: 'small', text: ` → ${nameOf(p.objeto)}${p.extra ? ' · agregado desde el administrador' : ''}` })),
        can() ? h('span', { class: 'list-actions' },
          objId && p.objeto !== objId ? h('button', { type: 'button', text: 'Vincular acá', onclick: async () => { const r = await api('PUT', A + '/vinculos', { punto: p.id, objeto: objId }); if (!r.ok) return toast(r.body.error || 'No se pudo vincular.', 'error'); toast('Vinculado: la ficha se comparte, no se duplica.'); await refreshPuntos(); paint(); } }) : null,
          !p.extra && p.objeto ? h('button', { type: 'button', class: 'cancel-button', text: 'Restablecer', title: 'Vuelve al objeto original de este punto', onclick: async () => { await api('PUT', A + '/vinculos', { punto: p.id, objeto: '' }); await refreshPuntos(); paint(); } }) : null,
          p.extra ? h('button', { type: 'button', class: 'cancel-button museo-del', text: 'Quitar punto', onclick: async () => { if (!(await window.AdminUI.confirmAction({ title: 'Quitar punto', message: 'El punto deja de aparecer en la visita (la ficha no se borra).', confirmLabel: 'Quitar', danger: true }))) return; await api('DELETE', `${A}/puntos/${p.id}`); await refreshPuntos(); paint(); } }) : null) : null));
      box.append(field('Sala', sel), stage, h('ul', { class: 'museo-ptlist' }, rows.length ? rows : [h('li', { class: 'small', text: 'Esta sala no tiene puntos de objetos.' })]));
    };
    paint();
    return box;
  }

  // Pestaña “En la visita” dentro de una ficha.
  M.tabVisita = function () {
    const o = S.obj;
    const mine = (o.puntos || []).map((p) => h('li', { class: 'museo-ptrow' }, h('strong', { text: p.label }), h('span', { class: 'small', text: ` · ${p.escenaNombre}` })));
    return h('div', {},
      h('div', { class: 'museo-note is-public' }, h('strong', { text: 'Dónde aparece este objeto' }), h('span', { text: 'Una misma ficha puede mostrarse desde varios puntos de la visita sin duplicarse. Las modificaciones de vínculos se aplican enseguida; el contenido se publica con el botón “Publicar”.' })),
      h('h3', { class: 'museo-h3', text: `Puntos vinculados (${mine.length})` }),
      h('ul', { class: 'museo-ptlist' }, mine.length ? mine : [h('li', { class: 'small', text: 'Este objeto todavía no está vinculado a ningún punto. Elegí una sala y vinculalo, o hacé clic en la foto para agregar un punto.' })]),
      h('h3', { class: 'museo-h3', text: 'Vincular a otro punto o agregar uno nuevo' }), pointPicker(() => S.obj.id),
      h('p', { class: 'field-help' }, 'Para ver cómo queda en la visita usá “Vista previa”.'));
  };

  // Pestaña global del catálogo: elegir un objeto y vincularlo a puntos.
  M.renderVisita = function () {
    const c = S.catalogo;
    const st = M._pickObj || (M._pickObj = { id: (c.objetos[0] || {}).id });
    const sel = h('select', { 'aria-label': 'Objeto a vincular' }, [...c.objetos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map((o) => h('option', { value: o.id, text: o.nombre })));
    sel.value = st.id; sel.addEventListener('change', () => { st.id = sel.value; M.render(); });
    return h('div', { class: 'museo-wrap' },
      h('div', { class: 'museo-note is-public' }, h('strong', { text: 'Salas y puntos de la visita' }), h('span', { text: 'Elegí un objeto, abrí una sala y vinculalo a un punto existente o hacé clic en la foto para crear uno nuevo. La ficha se comparte entre todos los puntos.' })),
      field('Objeto a vincular', sel), pointPicker(() => st.id));
  };
})();
