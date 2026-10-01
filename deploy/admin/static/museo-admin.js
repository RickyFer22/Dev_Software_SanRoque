/* Administrador del museo: núcleo, catálogo y editor de fichas históricas.
 * Se apoya en museo-admin-sections.js (formularios) y museo-admin-media.js (imágenes y puntos de la visita).
 * Todo se construye con nodos DOM (textContent): ningún dato del servidor pasa por innerHTML. */
(function () {
  'use strict';
  const M = window.MuseoAdmin = { state: {}, ui: {} };
  const S = M.state;
  Object.assign(S, { catalogo: null, view: 'lista', listTab: 'catalogo', filtros: { q: '', sala: '', categoria: '', estado: '', signal: '' }, obj: null, datos: null, saved: '', tab: 'general', archivos: [], busy: false });

  /* ---------- Utilidades ---------- */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    kids.flat().forEach((c) => { if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return el;
  }
  const toast = (m, t) => (window.showToast ? window.showToast(m, t) : window.alert(m));
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
  const ESTADOS = { borrador: 'Borrador', publicado: 'Publicado', cambios: 'Cambios sin publicar', retirado: 'Retirado' };
  const CERTEZAS = [['', 'Sin indicar'], ['documentado', 'Documentado'], ['aproximado', 'Aproximado'], ['atribucion', 'Atribución'], ['testimonio', 'Testimonio oral']];
  const CATEGORIAS = { escultura: 'Escultura', 'imagen-religiosa': 'Imagen religiosa', mobiliario: 'Mobiliario', herramienta: 'Herramienta', arma: 'Arma', instrumento: 'Instrumento', documento: 'Documento', fotografia: 'Fotografía', pintura: 'Pintura', 'objeto-cotidiano': 'Objeto cotidiano', textil: 'Textil', arquitectura: 'Arquitectura', otra: 'Otra' };
  const can = () => !!(S.catalogo && S.catalogo.puede.editar);

  async function api(method, url, body, isForm) {
    const opt = { method, credentials: 'include', headers: {} };
    if (body && !isForm) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    if (isForm) opt.body = body;
    let r;
    try { r = await fetch(url, opt); } catch (e) { return { ok: false, status: 0, body: { error: 'No hay conexión con el servidor.' } }; }
    let j = null; try { j = await r.json(); } catch (e) { /* sin cuerpo */ }
    if (r.status === 401 && window.redirectToLogin) window.redirectToLogin('expired');
    return { ok: r.ok, status: r.status, body: j || {} };
  }
  const A = '/admin/api/museo';

  // Diálogo de una línea de texto (reemplaza a window.prompt). Resuelve con el texto o null si se cancela.
  function ask({ title, label, value = '', help = '', confirmLabel = 'Aceptar' }) {
    return new Promise((resolve) => {
      const dlg = h('dialog', { class: 'confirm-dialog museo-ask', 'aria-labelledby': 'museo-ask-t' });
      const inp = h('input', { type: 'text', value, 'aria-label': label });
      const done = (v) => { dlg.close(); dlg.remove(); resolve(v); };
      const form = h('form', { onsubmit: (e) => { e.preventDefault(); done(inp.value.trim() || null); } },
        h('h3', { id: 'museo-ask-t', text: title }), h('label', { class: 'museo-field' }, h('span', { class: 'museo-label', text: label }), inp, help ? h('span', { class: 'field-help', text: help }) : null),
        h('div', { class: 'dialog-actions' }, h('button', { type: 'button', class: 'cancel-button', text: 'Cancelar', onclick: () => done(null) }), h('button', { type: 'submit', text: confirmLabel })));
      dlg.append(form);
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); done(null); });
      document.body.append(dlg); dlg.showModal(); inp.focus(); inp.select();
    });
  }

  /* ---------- Controles reutilizables ---------- */
  const isDirty = () => !!S.datos && JSON.stringify(S.datos) !== S.saved;
  function touch() {
    const ind = document.getElementById('museo-dirty');
    if (!ind) return;
    const d = isDirty();
    ind.textContent = d ? 'Cambios sin guardar' : 'Todo guardado';
    ind.classList.toggle('is-dirty', d);
    const save = document.getElementById('museo-save'); if (save) save.disabled = !d || S.busy;
  }

  function field(label, control, help, cls) {
    return h('label', { class: 'museo-field ' + (cls || '') }, h('span', { class: 'museo-label', text: label }), control, help ? h('span', { class: 'field-help', text: help }) : null);
  }
  function input(obj, key, { type = 'text', placeholder = '', max, list } = {}) {
    const el = h('input', { type, placeholder, maxlength: max, disabled: !can(), list });
    el.value = obj[key] == null ? '' : obj[key];
    el.addEventListener('input', () => { obj[key] = el.value; touch(); });
    return el;
  }
  function select(obj, key, options) {
    const el = h('select', { disabled: !can() }, options.map(([v, t]) => h('option', { value: v, text: t })));
    el.value = obj[key] || '';
    el.addEventListener('change', () => { obj[key] = el.value; touch(); });
    return el;
  }
  function toggle(obj, key, text) {
    const cb = h('input', { type: 'checkbox', disabled: !can() });
    cb.checked = !!obj[key];
    cb.addEventListener('change', () => { obj[key] = cb.checked; touch(); });
    return h('label', { class: 'checkbox-field museo-check' }, cb, h('span', { text }));
  }
  const certezaSelect = (obj, key = 'certeza') => select(obj, key, CERTEZAS);

  // Texto enriquecido (Markdown acotado) con barra de formato y vista previa. Nunca se guarda HTML.
  function richField(obj, key, label, { rows = 6, help = '' } = {}) {
    const ta = h('textarea', { rows, disabled: !can(), class: 'museo-rich' });
    ta.value = obj[key] || '';
    ta.addEventListener('input', () => { obj[key] = ta.value; touch(); if (!prev.hidden) paint(); });
    const wrap = (a, b) => () => { const s = ta.selectionStart, e = ta.selectionEnd, t = ta.value; ta.value = t.slice(0, s) + a + (t.slice(s, e) || 'texto') + b + t.slice(e); ta.dispatchEvent(new Event('input')); ta.focus(); };
    const lines = (p) => () => { const s = ta.selectionStart, e = ta.selectionEnd, t = ta.value; const chunk = t.slice(s, e) || 'elemento'; ta.value = t.slice(0, s) + chunk.split('\n').map((l) => p + l).join('\n') + t.slice(e); ta.dispatchEvent(new Event('input')); ta.focus(); };
    const link = async () => { const u = await ask({ title: 'Insertar enlace', label: 'Dirección del enlace', value: 'https://', help: 'Solo se admiten enlaces http(s).' }); if (u && /^https?:\/\/[^\s]+$/i.test(u)) wrap('[', `](${u})`)(); };
    const bar = h('div', { class: 'museo-rtbar', role: 'toolbar', 'aria-label': 'Formato de ' + label },
      [['N', 'Negrita', wrap('**', '**')], ['C', 'Cursiva', wrap('*', '*')], ['• Lista', 'Lista', lines('- ')], ['“ Cita', 'Cita', lines('> ')], ['Enlace', 'Insertar enlace', link]].map(([t, a, f]) => h('button', { type: 'button', class: 'cancel-button', 'aria-label': a, title: a, text: t, disabled: !can(), onclick: f })));
    const prev = h('div', { class: 'museo-rtprev', hidden: true });
    const paint = () => { prev.textContent = ''; M.renderMarkdown(ta.value, prev); };
    const tg = h('button', { type: 'button', class: 'cancel-button', text: 'Vista previa', 'aria-pressed': 'false', onclick: () => { prev.hidden = !prev.hidden; tg.setAttribute('aria-pressed', String(!prev.hidden)); if (!prev.hidden) paint(); } });
    bar.append(tg);
    return h('div', { class: 'museo-field' }, h('span', { class: 'museo-label', text: label }), bar, ta, prev, help ? h('span', { class: 'field-help', text: help }) : null);
  }

  // Dibuja el Markdown acotado con nodos DOM (negrita, cursiva, listas, citas, enlaces https).
  M.renderMarkdown = function (text, root) {
    const inline = (s, parent) => {
      const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g;
      let last = 0, m;
      while ((m = re.exec(s))) {
        parent.append(document.createTextNode(s.slice(last, m.index)));
        const t = m[0];
        if (t.startsWith('**')) parent.append(h('strong', { text: t.slice(2, -2) }));
        else if (t.startsWith('*')) parent.append(h('em', { text: t.slice(1, -1) }));
        else { const mm = /\[([^\]]+)\]\(([^)]+)\)/.exec(t); parent.append(h('a', { href: mm[2], target: '_blank', rel: 'noopener noreferrer', text: mm[1] })); }
        last = m.index + t.length;
      }
      parent.append(document.createTextNode(s.slice(last)));
    };
    String(text || '').split(/\n{2,}/).forEach((block) => {
      const ls = block.split('\n');
      if (ls.every((l) => /^- /.test(l))) { const ul = h('ul'); ls.forEach((l) => { const li = h('li'); inline(l.slice(2), li); ul.append(li); }); root.append(ul); }
      else if (ls.every((l) => /^> ?/.test(l))) { const q = h('blockquote'); inline(ls.map((l) => l.replace(/^> ?/, '')).join(' '), q); root.append(q); }
      else { const p = h('p'); inline(ls.join(' '), p); root.append(p); }
    });
  };

  // Fecha con incertidumbre: dato estructurado (opcional) + texto visible + grado de certeza.
  const FECHA_TIPOS = [['', 'Sin dato'], ['desconocida', 'Fecha desconocida'], ['exacta', 'Fecha exacta'], ['anio', 'Un año'], ['hacia', 'Hacia un año (aproximada)'], ['intervalo', 'Entre dos años'], ['siglo', 'Un siglo']];
  const ROMANOS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
  function autoFecha(f) {
    if (f.tipo === 'desconocida') return 'Fecha desconocida';
    if (f.tipo === 'exacta' && /^\d{4}-\d{2}-\d{2}$/.test(f.desde)) { const [y, m, d] = f.desde.split('-').map(Number); return `${d}/${m}/${y}`; }
    if (f.tipo === 'anio' && f.desde) return f.desde;
    if (f.tipo === 'hacia' && f.desde) return `Hacia ${f.desde}`;
    if (f.tipo === 'intervalo' && f.desde) return f.hasta && +f.hasta >= +f.desde ? `${f.desde}–${f.hasta}` : f.desde;
    if (f.tipo === 'siglo' && +f.desde >= 1 && +f.desde <= 21) return `Siglo ${ROMANOS[+f.desde]}`;
    return '';
  }
  // `holder` = objeto que contiene la fecha (con { texto, certeza, fecha:{…} }) o un evento ({ fecha:{…}, certeza }).
  function dateField(holder, label, { visibleKey = null } = {}) {
    holder.fecha = holder.fecha && typeof holder.fecha === 'object' ? holder.fecha : { tipo: '', desde: '', hasta: '', texto: '' };
    const f = holder.fecha;
    const box = h('div', { class: 'museo-date' });
    const textKey = visibleKey; // para periodo/ingreso el texto visible vive en holder.texto
    const draw = () => {
      box.textContent = '';
      const tipo = select(f, 'tipo', FECHA_TIPOS);
      tipo.addEventListener('change', () => { f.desde = ''; f.hasta = ''; draw(); });
      const parts = [field('Tipo de dato', tipo)];
      if (f.tipo === 'exacta') parts.push(field('Fecha', input(f, 'desde', { type: 'date' })));
      if (f.tipo === 'anio' || f.tipo === 'hacia') parts.push(field('Año', input(f, 'desde', { type: 'number', placeholder: 'Ej: 1920' })));
      if (f.tipo === 'intervalo') parts.push(field('Desde (año)', input(f, 'desde', { type: 'number' })), field('Hasta (año)', input(f, 'hasta', { type: 'number' })));
      if (f.tipo === 'siglo') parts.push(field('Siglo', select(f, 'desde', ROMANOS.map((r, i) => [i ? String(i) : '', i ? `Siglo ${r}` : 'Elegí…']))));
      const holderText = textKey ? holder : f;
      const key = textKey || 'texto';
      const txt = input(holderText, key, { placeholder: autoFecha(f) || 'Ej: hacia 1920, fines del siglo XIX…' });
      parts.push(field('Texto que verá el visitante', txt, 'Si lo dejás vacío se usa el dato de la izquierda. Podés escribir libremente (“fines del siglo XIX”).'));
      if (holder.certeza !== undefined || textKey) parts.push(field('Grado de certeza', certezaSelect(holder)));
      box.append(...parts);
    };
    draw();
    return h('fieldset', { class: 'museo-fieldset museo-datefs' }, h('legend', { text: label }), box);
  }

  Object.assign(M.ui, { ask, h, toast, fmtDate, field, input, select, toggle, certezaSelect, richField, dateField, api, A, can, touch, isDirty, ESTADOS, CERTEZAS, CATEGORIAS, autoFecha });

  /* ---------- Raíz de la sección ---------- */
  let root = null;
  const statePill = (estado) => h('span', { class: 'pill status-pill museo-st-' + estado, text: ESTADOS[estado] || estado });

  M.open = async function () {
    root = document.getElementById('museo');
    if (!root) return;
    if (S.view === 'editor' && S.obj) return; // se conserva la ficha abierta al volver a la sección
    await loadCatalogo();
    render();
  };

  async function loadCatalogo() {
    const r = await api('GET', A + '/catalogo');
    if (!r.ok) { root.textContent = ''; root.append(h('div', { class: 'empty-state' }, h('p', { text: r.status === 403 ? 'No tenés permiso para ver esta sección.' : 'No se pudo cargar el catálogo.' }))); return false; }
    S.catalogo = r.body;
    return true;
  }
  M.reloadCatalogo = loadCatalogo;

  function render() {
    if (!S.catalogo) return;
    root.textContent = '';
    if (S.view === 'editor') return M.renderEditor(root);
    root.append(renderLista());
  }
  M.render = render;

  /* ---------- Catálogo ---------- */
  const SIGNALS = [['sinHistoria', 'Sin historia'], ['necesitaFuentes', 'Necesitan fuentes'], ['pendienteRevision', 'Pendientes de revisión'], ['cambiosSinPublicar', 'Con cambios sin publicar']];

  function renderLista() {
    const c = S.catalogo;
    const f = S.filtros;
    const tabs = h('div', { class: 'editor-tabs', role: 'tablist' }, [['catalogo', 'Catálogo de objetos'], ['visita', 'Salas y puntos de la visita']].map(([id, t]) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(S.listTab === id), text: t, onclick: () => { S.listTab = id; render(); } })));
    if (S.listTab === 'visita') return h('div', { class: 'museo-wrap' }, h('div', { class: 'panel-title' }, h('h2', { text: 'Fichas históricas del museo' })), tabs, M.renderVisita());

    const counts = SIGNALS.map(([k]) => c.objetos.filter((o) => o.signals[k]).length);
    const match = (o) => {
      const q = f.q.trim().toLowerCase();
      if (q && !(o.nombre.toLowerCase().includes(q) || (o.inventario || '').toLowerCase().includes(q))) return false;
      if (f.sala && o.sala !== f.sala) return false;
      if (f.categoria && o.categoria !== f.categoria) return false;
      if (f.estado && o.estado !== f.estado) return false;
      if (f.signal && !o.signals[f.signal]) return false;
      return true;
    };
    const items = c.objetos.filter(match).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    const search = h('input', { type: 'search', placeholder: 'Buscar por nombre o código de inventario', 'aria-label': 'Buscar fichas', value: f.q });
    search.addEventListener('input', () => { f.q = search.value; clearTimeout(M._t); M._t = setTimeout(() => { const pos = search.selectionStart; render(); const s2 = root.querySelector('input[type="search"]'); if (s2) { s2.focus(); s2.setSelectionRange(pos, pos); } }, 200); });
    const sel = (key, label, opts) => { const el = h('select', { 'aria-label': label }, [h('option', { value: '', text: label }), ...opts.map(([v, t]) => h('option', { value: v, text: t }))]); el.value = f[key]; el.addEventListener('change', () => { f[key] = el.value; render(); }); return el; };
    const chips = h('div', { class: 'museo-chips', role: 'group', 'aria-label': 'Señales de investigación' }, SIGNALS.map(([k, t], i) => h('button', { type: 'button', class: 'museo-chip' + (f.signal === k ? ' is-on' : ''), 'aria-pressed': String(f.signal === k), onclick: () => { f.signal = f.signal === k ? '' : k; render(); } }, t, h('b', { text: counts[i] }))));
    const salas = c.escenas.map((e) => [e.id, e.nombre]);

    const list = items.length ? items.map((o) => h('div', { class: 'list-row list-row-with-thumb museo-row' },
      h('img', { class: 'list-thumb', src: o.thumb || '', alt: '', loading: 'lazy' }),
      h('div', { class: 'museo-row-main' },
        h('strong', { text: o.nombre || '(sin nombre)' }),
        h('div', { class: 'small', text: [o.inventario && 'Inv. ' + o.inventario, (salas.find((s) => s[0] === o.sala) || [])[1], CATEGORIAS[o.categoria]].filter(Boolean).join(' · ') || 'Sin ubicación ni categoría' }),
        h('div', { class: 'museo-flags' }, statePill(o.estado), SIGNALS.filter(([k]) => o.signals[k]).map(([k, t]) => h('span', { class: 'museo-flag', text: { sinHistoria: 'Sin historia', necesitaFuentes: 'Necesita fuentes', pendienteRevision: 'A revisar', cambiosSinPublicar: 'Cambios sin publicar' }[k] }))),
        h('div', { class: 'small', text: `Editada por ${o.updatedBy || '—'} · ${fmtDate(o.updatedAt)}` })),
      h('div', { class: 'list-actions' }, h('button', { type: 'button', text: can() ? 'Editar' : 'Ver', onclick: () => abrir(o.id) })))) : [h('div', { class: 'empty-state' }, h('p', { text: 'Ningún objeto coincide con la búsqueda.' }))];

    return h('div', { class: 'museo-wrap' },
      h('div', { class: 'panel-title' }, h('h2', { text: 'Fichas históricas del museo' }), can() ? h('button', { type: 'button', text: '+ Nuevo objeto', onclick: nuevoObjeto }) : null),
      tabs,
      h('p', { class: 'field-help', text: `${c.objetos.length} objetos · ${c.objetos.filter((o) => o.estado === 'publicado' || o.estado === 'cambios').length} publicados. Las señales ayudan a organizar la investigación y no impiden publicar una ficha breve.` }),
      h('div', { class: 'museo-filters' }, search, sel('sala', 'Todas las salas', salas), sel('categoria', 'Todas las categorías', Object.entries(CATEGORIAS)), sel('estado', 'Todos los estados', Object.entries(ESTADOS))),
      chips, h('div', { class: 'museo-list' }, list));
  }

  async function nuevoObjeto() {
    const nombre = await ask({ title: 'Nuevo objeto', label: 'Nombre del objeto', help: 'Podés completar el resto después: todos los demás campos son opcionales.', confirmLabel: 'Crear ficha' });
    if (!nombre || !nombre.trim()) return;
    const r = await api('POST', A + '/objetos', { nombre: nombre.trim() });
    if (!r.ok) return toast(r.body.error || 'No se pudo crear la ficha.', 'error');
    toast('Ficha creada. Completala cuando quieras: todos los campos son opcionales.');
    await loadCatalogo();
    cargarEditor(r.body);
  }

  async function abrir(id) {
    const r = await api('GET', `${A}/objetos/${encodeURIComponent(id)}`);
    if (!r.ok) return toast(r.body.error || 'No se pudo abrir la ficha.', 'error');
    await M.loadArchivos();
    cargarEditor(r.body);
  }

  function cargarEditor(detail) {
    S.obj = detail;
    S.datos = JSON.parse(JSON.stringify(detail.borrador));
    S.saved = JSON.stringify(detail.borrador);
    S.tab = 'general';
    S.view = 'editor';
    M.loadArchivos().then(render);
  }

  M.loadArchivos = async function () {
    const r = await api('GET', A + '/archivos');
    if (r.ok) S.archivos = r.body.archivos;
  };

  /* ---------- Editor ---------- */
  const TABS = [['general', 'Información general'], ['historia', 'Historia'], ['cronologia', 'Cronología'], ['imagenes', 'Imágenes'], ['fuentes', 'Fuentes'], ['visita', 'En la visita'], ['historial', 'Historial']];

  M.renderEditor = function (host) {
    const o = S.obj, d = S.datos;
    const editable = can();
    const dirty = isDirty();
    const header = h('div', { class: 'museo-ehead' },
      h('div', {},
        h('button', { type: 'button', class: 'cancel-button', text: '← Catálogo', onclick: volver }),
        h('h2', { text: d.nombre || '(sin nombre)' }),
        h('div', { class: 'museo-meta' }, statePill(o.estado), h('span', { class: 'small', text: `Última modificación: ${o.updatedBy || '—'} · ${fmtDate(o.updatedAt)}` }), h('span', { id: 'museo-dirty', class: 'unsaved-indicator' + (dirty ? ' is-dirty' : ''), text: dirty ? 'Cambios sin guardar' : 'Todo guardado' }))),
      editable ? h('div', { class: 'museo-actions', role: 'group', 'aria-label': 'Acciones de la ficha' },
        h('button', { type: 'button', id: 'museo-save', text: 'Guardar borrador', disabled: !dirty, onclick: () => guardar() }),
        h('button', { type: 'button', class: 'cancel-button', text: 'Vista previa', onclick: previsualizar }),
        h('button', { type: 'button', class: 'btn-gold', text: o.estado === 'publicado' ? 'Publicado ✓' : (o.estado === 'cambios' ? 'Publicar cambios' : 'Publicar'), disabled: o.estado === 'publicado' && !dirty, onclick: publicar }),
        o.publicado && !o.retirado ? h('button', { type: 'button', class: 'cancel-button', text: 'Retirar de publicación', onclick: retirar }) : null,
        S.catalogo.puede.eliminar ? h('button', { type: 'button', class: 'btn-danger', text: 'Eliminar', onclick: eliminar }) : null)
        : h('p', { class: 'field-help', text: 'Tenés acceso de solo lectura.' }));
    const tabs = h('div', { class: 'editor-tabs', role: 'tablist' }, TABS.map(([id, t]) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(S.tab === id), text: t, onclick: () => { S.tab = id; render(); } })));
    const panel = h('div', { class: 'editor-tab-panel museo-panel', role: 'tabpanel' });
    const build = { general: M.tabGeneral, historia: M.tabHistoria, cronologia: M.tabCronologia, imagenes: M.tabImagenes, fuentes: M.tabFuentes, visita: M.tabVisita, historial: M.tabHistorial }[S.tab];
    panel.append(build());
    const errors = h('div', { id: 'museo-errors', class: 'form-errors', hidden: true, role: 'alert' });
    host.append(h('div', { class: 'card museo-editor' }, header, errors, tabs, panel));
  };

  async function volver() {
    if (isDirty() && !(await window.AdminUI.confirmAction({ title: 'Cambios sin guardar', message: 'Si salís ahora perdés los cambios que no guardaste.', confirmLabel: 'Salir sin guardar', danger: true }))) return;
    S.view = 'lista'; S.obj = null; S.datos = null; S.saved = '';
    await loadCatalogo(); render();
  }

  function showErrors(list) {
    const box = document.getElementById('museo-errors');
    if (!box) return toast(list[0], 'error');
    box.textContent = '';
    box.append(h('strong', { text: 'No se pudo completar la acción:' }), h('ul', {}, list.map((e) => h('li', { text: e }))));
    box.hidden = false;
    box.scrollIntoView({ block: 'nearest' });
  }

  // Guarda el borrador con control de concurrencia. Devuelve true si quedó guardado.
  async function guardar({ silent = false } = {}) {
    if (S.busy) return false;
    S.busy = true; touch();
    const r = await api('PUT', `${A}/objetos/${S.obj.id}`, { baseRev: S.obj.rev, datos: S.datos });
    S.busy = false;
    if (r.status === 409 && r.body.code === 'conflict') { await resolverConflicto(r.body); return false; }
    if (!r.ok) { showErrors(r.body.errors || [r.body.error || 'No se pudo guardar.']); touch(); return false; }
    S.obj = r.body;
    S.datos = JSON.parse(JSON.stringify(r.body.borrador));
    S.saved = JSON.stringify(r.body.borrador);
    if (!silent) toast(r.body.sinCambios ? 'No había cambios para guardar.' : 'Borrador guardado.');
    render();
    return true;
  }

  // Dos ediciones simultáneas: nunca se pisa en silencio. Se ofrece elegir campo por campo.
  const CAMPOS = { nombre: 'Nombre', inventario: 'Inventario', categoria: 'Categoría', sala: 'Sala', resumen: 'Descripción breve', historia: 'Historia', periodo: 'Época', autor: 'Autor / origen', procedencia: 'Procedencia', materiales: 'Materiales', tecnica: 'Técnica', usoOriginal: 'Uso original', ingreso: 'Ingreso al museo', relacionados: 'Personas y acontecimientos', vermas: 'Fichas relacionadas', observar: 'Qué observar', curiosidades: 'Curiosidades', conservacion: 'Conservación', notasInternas: 'Notas internas', donante: 'Donante', pendiente: 'Pendiente de investigación', necesitaRevision: 'Marca de revisión', imagen: 'Imagen principal', galeria: 'Galería', fuentes: 'Fuentes', cronologia: 'Cronología' };
  const brief = (v) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s.length > 140 ? s.slice(0, 140) + '…' : (s || '(vacío)'); };

  M.ui.CAMPOS = CAMPOS; M.ui.brief = brief;

  function resolverConflicto(body) {
    return new Promise((resolve) => {
      const theirs = body.actual.datos, mine = S.datos, base = body.base;
      const diff = Object.keys(CAMPOS).filter((k) => JSON.stringify(mine[k]) !== JSON.stringify(theirs[k]));
      const choice = {};
      diff.forEach((k) => { // fusión automática cuando solo una de las partes cambió respecto de la base
        if (base && JSON.stringify(mine[k]) === JSON.stringify(base[k])) choice[k] = 'theirs';
        else if (base && JSON.stringify(theirs[k]) === JSON.stringify(base[k])) choice[k] = 'mine';
        else choice[k] = 'mine';
      });
      const dlg = h('dialog', { class: 'confirm-dialog museo-conflict', 'aria-labelledby': 'museo-conf-t' });
      const close = (v) => { dlg.close(); dlg.remove(); resolve(v); };
      const rows = diff.map((k) => {
        const name = 'c_' + k;
        const radio = (val, text, preview) => h('label', { class: 'museo-conf-opt' }, h('input', { type: 'radio', name, value: val, checked: choice[k] === val, onchange: () => { choice[k] = val; } }), h('span', {}, h('b', { text }), h('em', { text: brief(preview) })));
        return h('fieldset', { class: 'museo-fieldset' }, h('legend', { text: CAMPOS[k] }), radio('mine', 'Mantener lo mío', mine[k]), radio('theirs', `Usar lo de ${body.actual.updatedBy || 'la otra persona'}`, theirs[k]));
      });
      dlg.append(
        h('h3', { id: 'museo-conf-t', text: 'Esta ficha cambió mientras la editabas' }),
        h('p', { text: `${body.actual.updatedBy || 'Otra persona'} guardó cambios (${fmtDate(body.actual.updatedAt)}). ${diff.length ? 'Elegí qué conservar en cada campo distinto:' : 'Los datos son idénticos: se actualizará la revisión.'}` }),
        h('div', { class: 'museo-conf-list' }, rows),
        h('div', { class: 'dialog-actions' },
          h('button', { type: 'button', class: 'cancel-button', text: 'Cancelar', onclick: () => close(false) }),
          h('button', { type: 'button', class: 'btn-danger', text: 'Descartar lo mío', onclick: () => { adoptar(body.actual); close(true); } }),
          h('button', { type: 'button', text: 'Aplicar y guardar', onclick: async () => {
            const merged = JSON.parse(JSON.stringify(theirs));
            diff.forEach((k) => { if (choice[k] === 'mine') merged[k] = mine[k]; });
            S.obj.rev = body.actual.rev; S.obj.updatedBy = body.actual.updatedBy; S.obj.updatedAt = body.actual.updatedAt;
            S.datos = merged; close(true); await guardar();
          } })));
      document.body.append(dlg);
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(false); });
      dlg.showModal();
    });
  }
  function adoptar(actual) {
    S.obj.rev = actual.rev; S.obj.updatedBy = actual.updatedBy; S.obj.updatedAt = actual.updatedAt;
    S.datos = JSON.parse(JSON.stringify(actual.datos)); S.saved = JSON.stringify(actual.datos); render();
  }

  async function publicar() {
    if (isDirty() && !(await guardar({ silent: true }))) return;
    const okc = await window.AdminUI.confirmAction({ title: 'Publicar la ficha', message: 'Los visitantes verán esta versión en la visita virtual: nombre, textos, fotografías y fuentes marcadas como públicas. Las notas internas y los datos del donante nunca se publican.', confirmLabel: 'Publicar' });
    if (!okc) return;
    const r = await api('POST', `${A}/objetos/${S.obj.id}/publicar`, { baseRev: S.obj.rev });
    if (r.status === 409 && r.body.code === 'conflict') return resolverConflicto(r.body);
    if (!r.ok) return showErrors(r.body.errors || [r.body.error || 'No se pudo publicar.']);
    S.obj = r.body; toast('Ficha publicada.'); render();
  }

  async function retirar() {
    if (!(await window.AdminUI.confirmAction({ title: 'Retirar de publicación', message: 'La ficha deja de mostrarse en la visita virtual. Se conserva todo el contenido y podés volver a publicarla.', confirmLabel: 'Retirar', danger: true }))) return;
    const r = await api('POST', `${A}/objetos/${S.obj.id}/retirar`, {});
    if (!r.ok) return showErrors([r.body.error || 'No se pudo retirar.']);
    S.obj = r.body; toast('Ficha retirada de publicación.'); render();
  }

  async function eliminar() {
    if (!(await window.AdminUI.confirmAction({ title: 'Eliminar la ficha', message: `Se elimina “${S.datos.nombre}” con su historial. Esta acción no se puede deshacer.`, confirmLabel: 'Eliminar', danger: true }))) return;
    const r = await api('DELETE', `${A}/objetos/${S.obj.id}`);
    if (!r.ok) return showErrors([r.body.error || 'No se pudo eliminar.']);
    S.view = 'lista'; S.obj = null; S.datos = null; S.saved = '';
    toast('Ficha eliminada.'); await loadCatalogo(); render();
  }

  // Vista previa: la ficha real dentro de la visita virtual, con el borrador guardado.
  async function previsualizar() {
    if (isDirty()) {
      if (!(await window.AdminUI.confirmAction({ title: 'Vista previa', message: 'Para ver la última versión se guardará el borrador (no se publica).', confirmLabel: 'Guardar y ver' }))) return;
      if (!(await guardar({ silent: true }))) return;
    }
    const dlg = h('dialog', { class: 'museo-preview', 'aria-label': 'Vista previa de la ficha pública' });
    const frame = h('iframe', { src: `/visita-museo/?vista-previa=${encodeURIComponent(S.obj.id)}`, title: 'Vista previa de la ficha en la visita virtual' });
    const stage = h('div', { class: 'museo-preview-stage', 'data-device': 'desktop' }, frame);
    const dev = (id, t) => h('button', { type: 'button', class: 'cancel-button', text: t, onclick: () => { stage.dataset.device = id; } });
    const close = () => { dlg.close(); dlg.remove(); };
    dlg.append(h('div', { class: 'museo-preview-bar' }, h('strong', { text: 'Vista previa (borrador guardado)' }), h('span', { class: 'museo-preview-devs' }, dev('desktop', 'Escritorio'), dev('mobile', 'Celular')), h('button', { type: 'button', text: 'Cerrar', onclick: close })), stage);
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    document.body.append(dlg); dlg.showModal();
  }

  M.guardar = guardar; M.abrir = abrir; M.showErrors = showErrors; M.statePill = statePill; M.adoptar = adoptar;

  /* ---------- Advertencia antes de salir con cambios sin guardar ---------- */
  window.addEventListener('beforeunload', (e) => { if (S.view === 'editor' && isDirty()) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('click', (e) => {
    if (!(S.view === 'editor' && isDirty())) return;
    const nav = e.target.closest('.nav-item, [data-goto], #logout');
    if (nav && !window.confirm('Tenés cambios sin guardar en una ficha del museo. ¿Salir de todos modos?')) { e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);

  M.openObject = abrir;
})();
