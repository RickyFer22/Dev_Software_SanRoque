/* Administrador del museo: pestañas del formulario (general, historia, cronología, fuentes, historial). */
(function () {
  'use strict';
  const M = window.MuseoAdmin;
  const { ask, h, field, input, select, toggle, certezaSelect, richField, dateField, touch, can, fmtDate, api, A, CATEGORIAS, toast } = M.ui;
  const S = M.state;
  const rid = (p) => p + '_' + Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => b.toString(16).padStart(2, '0')).join('');

  const note = (cls, title, text) => h('div', { class: 'museo-note ' + cls }, h('strong', { text: title }), h('span', { text }));
  const fieldset = (legend, cls, ...kids) => h('fieldset', { class: 'museo-fieldset ' + (cls || '') }, h('legend', { text: legend }), ...kids);
  const grid = (...kids) => h('div', { class: 'museo-grid' }, ...kids);
  const moveBtns = (arr, i, redraw) => h('span', { class: 'museo-move' },
    h('button', { type: 'button', class: 'cancel-button', 'aria-label': 'Subir', text: '↑', disabled: i === 0 || !can(), onclick: () => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; touch(); redraw(); } }),
    h('button', { type: 'button', class: 'cancel-button', 'aria-label': 'Bajar', text: '↓', disabled: i === arr.length - 1 || !can(), onclick: () => { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; touch(); redraw(); } }));
  const removeBtn = (arr, i, redraw, what) => h('button', { type: 'button', class: 'cancel-button museo-del', text: 'Quitar', disabled: !can(), onclick: async () => { if (await window.AdminUI.confirmAction({ title: 'Quitar', message: `¿Quitar ${what}?`, confirmLabel: 'Quitar', danger: true })) { arr.splice(i, 1); touch(); redraw(); } } });

  /* ---------- Información general ---------- */
  M.tabGeneral = function () {
    const d = S.datos, c = S.catalogo;
    const others = c.objetos.filter((o) => o.id !== S.obj.id).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const rel = h('select', { multiple: true, size: 6, disabled: !can(), 'aria-label': 'Fichas relacionadas' }, others.map((o) => h('option', { value: o.id, text: o.nombre, selected: (d.vermas || []).includes(o.id) })));
    rel.addEventListener('change', () => { d.vermas = [...rel.selectedOptions].map((o) => o.value).slice(0, 6); touch(); });
    d.periodo = d.periodo || { texto: '', certeza: '', fecha: {} };
    d.ingreso = d.ingreso || { forma: '', fecha: { texto: '', certeza: '', fecha: {} } };
    d.donante = d.donante || { nombre: '', contacto: '', notas: '' };
    return h('div', {},
      note('is-public', 'Información pública', 'Lo que se escriba acá puede mostrarse al visitante cuando se publique la ficha. Todos los campos son opcionales salvo el nombre.'),
      grid(
        field('Nombre del objeto *', input(d, 'nombre', { max: 200 })),
        field('Categoría', select(d, 'categoria', [['', 'Sin categoría'], ...Object.entries(CATEGORIAS)])),
        field('Sala o ubicación', select(d, 'sala', [['', 'Sin sala asignada'], ...c.escenas.map((e) => [e.id, e.nombre])]))),
      richField(d, 'resumen', 'Descripción breve para el visitante', { rows: 3, help: 'Una o dos frases. Es lo primero que se lee al examinar la pieza.' }),
      dateField(d.periodo, 'Fecha, período o época', { visibleKey: 'texto' }),
      grid(
        h('div', {}, field('Autor, fabricante o cultura de origen', input(d.autor, 'texto', { max: 300 })), field('Grado de certeza', certezaSelect(d.autor))),
        h('div', {}, field('Lugar de procedencia', input(d.procedencia, 'texto', { max: 300 })), field('Grado de certeza', certezaSelect(d.procedencia)))),
      grid(field('Materiales', input(d, 'materiales', { max: 400 })), field('Técnica', input(d, 'tecnica', { max: 400 }))),
      fieldset('Ingreso al museo', 'museo-pubfs',
        field('Forma de ingreso', select(d.ingreso, 'forma', [['', 'Sin dato'], ['donacion', 'Donación'], ['compra', 'Compra'], ['legado', 'Legado'], ['transferencia', 'Transferencia'], ['hallazgo', 'Hallazgo'], ['desconocida', 'Desconocida'], ['otra', 'Otra']])),
        dateField(d.ingreso.fecha, 'Fecha de ingreso', { visibleKey: 'texto' })),
      richField(d, 'relacionados', 'Personas o acontecimientos relacionados', { rows: 3, help: 'Solo datos que se puedan respaldar. Evitá datos personales de terceros vivos.' }),
      field('Fichas relacionadas (“Seguí con…”)', rel, 'Hasta 6 objetos que se sugieren al terminar de leer esta ficha. Mantené Ctrl/⌘ para elegir varios.'),
      note('is-internal', 'Solo para el equipo — nunca se publica', 'Estos datos no salen del administrador ni aparecen en la visita, en la vista pública ni en sus respuestas de datos.'),
      fieldset('Datos internos', 'museo-intfs',
        grid(field('Código de inventario', input(d, 'inventario', { max: 60 })), field('Estado de conservación', input(d, 'conservacion', { max: 600 }))),
        richField(d, 'notasInternas', 'Notas internas del equipo', { rows: 4 }),
        richField(d, 'pendiente', 'Pendiente de investigación', { rows: 3, help: 'Qué falta averiguar. Registrar lo desconocido es parte del trabajo.' }),
        toggle(d, 'necesitaRevision', 'Marcar como pendiente de revisión')),
      fieldset('Donante (datos personales)', 'museo-intfs',
        grid(field('Nombre', input(d.donante, 'nombre', { max: 200 })), field('Contacto', input(d.donante, 'contacto', { max: 300 }))),
        richField(d.donante, 'notas', 'Notas sobre la donación', { rows: 3 })));
  };

  /* ---------- Historia ---------- */
  M.tabHistoria = function () {
    const d = S.datos;
    return h('div', {},
      note('is-public', 'Se muestra en la visita', 'Cada apartado aparece solo si tiene contenido. Podés empezar con una descripción y ampliar la historia con el tiempo.'),
      richField(d, 'historia', 'Su historia', { rows: 14, help: 'Relato principal. Admite negrita, cursiva, listas, citas y enlaces. No inventes datos: lo que no se sepa, anotalo como pendiente en la pestaña general.' }),
      richField(d, 'usoOriginal', 'Para qué se utilizaba', { rows: 4 }),
      richField(d, 'observar', 'Qué observar', { rows: 4, help: 'Detalles reales y visibles de la pieza (“Mirá este detalle”).' }),
      richField(d, 'curiosidades', 'Curiosidades', { rows: 4 }));
  };

  /* ---------- Cronología ---------- */
  const yearOf = (ev) => { const f = ev.fecha || {}; if (f.tipo === 'siglo') return (+f.desde - 1) * 100; return /^\d{4}/.test(f.desde || '') && ['exacta', 'anio', 'hacia', 'intervalo'].includes(f.tipo) ? +f.desde.slice(0, 4) + (f.tipo === 'exacta' ? (+f.desde.slice(5, 7) || 1) / 13 : 0) : null; };
  M.tabCronologia = function () {
    const d = S.datos, box = h('div', { class: 'museo-list' });
    const imgs = S.archivos.filter((a) => a.tipo === 'imagen');
    const redraw = () => { box.textContent = ''; paint(); };
    const paint = () => {
      if (!d.cronologia.length) box.append(h('div', { class: 'empty-state' }, h('p', { text: 'Todavía no hay acontecimientos. Agregá fabricación, uso, traslado, donación, restauración o exposición cuando lo sepas.' })));
      d.cronologia.forEach((ev, i) => {
        ev.fecha = ev.fecha || { tipo: '', desde: '', hasta: '', texto: '' }; if (ev.certeza === undefined) ev.certeza = '';
        const srcs = d.fuentes.length ? h('div', { class: 'museo-checks' }, d.fuentes.map((s) => { const cb = h('input', { type: 'checkbox', disabled: !can() }); cb.checked = (ev.fuentes || []).includes(s.id); cb.addEventListener('change', () => { ev.fuentes = (ev.fuentes || []).filter((x) => x !== s.id); if (cb.checked) ev.fuentes.push(s.id); touch(); }); return h('label', { class: 'checkbox-field museo-check' }, cb, h('span', { text: s.titulo || s.referencia || 'Fuente sin título' })); })) : h('span', { class: 'field-help', text: 'Cargá fuentes en la pestaña Fuentes para respaldarlo.' });
        const im = imgs.length ? h('select', { multiple: true, size: 3, disabled: !can(), 'aria-label': 'Imágenes del acontecimiento' }, imgs.map((a) => h('option', { value: a.id, text: a.nombre, selected: (ev.imagenes || []).includes(a.id) }))) : h('span', { class: 'field-help', text: 'Subí fotografías en la pestaña Imágenes.' });
        if (imgs.length) im.addEventListener('change', () => { ev.imagenes = [...im.selectedOptions].map((o) => o.value); touch(); });
        box.append(h('article', { class: 'museo-card' },
          h('div', { class: 'museo-card-head' }, h('strong', { text: ev.titulo || `Acontecimiento ${i + 1}` }), h('span', { class: 'pill status-pill ' + (ev.publico === false ? 'hidden' : 'published'), text: ev.publico === false ? 'Interno' : 'Público' }), !yearOf(ev) ? h('span', { class: 'museo-flag', text: 'Sin fecha estructurada' }) : null, h('span', { class: 'museo-spacer' }), moveBtns(d.cronologia, i, redraw), removeBtn(d.cronologia, i, redraw, 'este acontecimiento')),
          field('Título', input(ev, 'titulo', { max: 200, placeholder: 'Ej: Donación al museo, restauración, traslado…' })),
          dateField(ev, 'Fecha del acontecimiento'),
          richField(ev, 'descripcion', 'Descripción', { rows: 3 }),
          field('Fuentes que lo respaldan', srcs), field('Fotografías o documentos asociados', im),
          toggle(ev, 'publico', 'Mostrar a los visitantes (si lo desmarcás es solo interno)')));
      });
    };
    paint();
    return h('div', {},
      note('is-public', 'Cronología de la pieza', 'Los acontecimientos con fecha estructurada se ordenan solos en la visita. Los que no tienen fecha se muestran aparte, sin asignarles una posición histórica.'),
      can() ? h('div', { class: 'museo-toolbar' },
        h('button', { type: 'button', text: '+ Acontecimiento', onclick: () => { d.cronologia.push({ id: rid('evt'), titulo: '', descripcion: '', fecha: { tipo: '', desde: '', hasta: '', texto: '' }, certeza: '', fuentes: [], imagenes: [], publico: true }); touch(); redraw(); } }),
        h('button', { type: 'button', class: 'cancel-button', text: 'Ordenar por fecha', onclick: () => { d.cronologia.sort((a, b) => { const x = yearOf(a), y = yearOf(b); return x === null ? (y === null ? 0 : 1) : (y === null ? -1 : x - y); }); touch(); redraw(); } })) : null,
      box);
  };

  /* ---------- Fuentes ---------- */
  const TIPOS = [['libro', 'Libro o publicación'], ['documento', 'Documento o archivo'], ['enlace', 'Enlace'], ['fotografia', 'Fotografía histórica'], ['entrevista', 'Entrevista o testimonio oral'], ['registro', 'Registro del museo'], ['otro', 'Otra']];
  M.tabFuentes = function () {
    const d = S.datos, box = h('div', { class: 'museo-list' });
    const redraw = () => { box.textContent = ''; paint(); };
    const paint = () => {
      if (!d.fuentes.length) box.append(h('div', { class: 'empty-state' }, h('p', { text: 'Sin fuentes registradas. Si todavía no hay respaldo, anotalo como pendiente de investigación en la pestaña general.' })));
      d.fuentes.forEach((f, i) => {
        const adj = h('select', { disabled: !can(), 'aria-label': 'Archivo adjunto' }, [h('option', { value: '', text: 'Sin archivo adjunto' }), ...S.archivos.map((a) => h('option', { value: a.id, text: `${a.tipo === 'imagen' ? '🖼' : '📄'} ${a.nombre}` }))]);
        adj.value = f.archivoId || '';
        adj.addEventListener('change', () => { f.archivoId = adj.value; touch(); });
        const events = d.cronologia.filter((e) => e.titulo).map((e) => [e.titulo, e.titulo]);
        const vinc = h('input', { type: 'text', list: 'museo-vinc-' + i, disabled: !can(), placeholder: 'Dato o acontecimiento que respalda (opcional)' });
        vinc.value = f.vinculo || ''; vinc.addEventListener('input', () => { f.vinculo = vinc.value; touch(); });
        box.append(h('article', { class: 'museo-card' },
          h('div', { class: 'museo-card-head' }, h('strong', { text: f.titulo || f.referencia || `Fuente ${i + 1}` }), h('span', { class: 'pill status-pill ' + (f.publica === false ? 'hidden' : 'published'), text: f.publica === false ? 'Interna' : 'Pública' }), h('span', { class: 'museo-spacer' }), moveBtns(d.fuentes, i, redraw), removeBtn(d.fuentes, i, redraw, 'esta fuente')),
          grid(field('Tipo de fuente', select(f, 'tipo', TIPOS)), field('Título', input(f, 'titulo', { max: 300 })), field('Autor o informante', input(f, 'autor', { max: 200 }))),
          grid(field('Fecha', input(f, 'fecha', { max: 80, placeholder: 'Ej: 1953, marzo de 1980' })), field('Referencia', input(f, 'referencia', { max: 300 })), field('Páginas', input(f, 'paginas', { max: 60 }))),
          grid(field('Enlace', input(f, 'enlace', { type: 'url', max: 600, placeholder: 'https://…' })), field('Archivo adjunto', adj)),
          field('Respalda a…', vinc, null), h('datalist', { id: 'museo-vinc-' + i }, events.map(([v]) => h('option', { value: v }))),
          field('Observaciones', input(f, 'observaciones', { max: 600 })),
          h('div', { class: 'museo-checks' }, toggle(f, 'publica', 'Mostrar esta fuente a los visitantes'), toggle(f, 'adjuntoPublico', 'Permitir descargar el archivo adjunto (documentos privados quedan sin marcar)'))));
      });
    };
    paint();
    return h('div', {},
      note('is-public', 'Fuentes y respaldo histórico', 'Una ficha puede publicarse sin fuentes, pero el catálogo la marcará como “necesita fuentes”. No se completa nada automáticamente.'),
      can() ? h('div', { class: 'museo-toolbar' }, h('button', { type: 'button', text: '+ Fuente', onclick: () => { d.fuentes.push({ id: rid('src'), tipo: 'libro', titulo: '', autor: '', fecha: '', referencia: '', paginas: '', enlace: '', archivoId: '', observaciones: '', vinculo: '', publica: true, adjuntoPublico: false }); touch(); redraw(); } }), M.uploadButton ? M.uploadButton('Subir archivo (PDF o imagen)', () => M.render()) : null) : null,
      box);
  };

  /* ---------- Historial de revisiones ---------- */
  const ACCIONES = { crear: 'Creación', guardar: 'Borrador guardado', publicar: 'Publicación', retirar: 'Retiro', restaurar: 'Restauración' };
  M.tabHistorial = function () {
    const o = S.obj;
    const rows = o.revisiones.map((r) => h('tr', {},
      h('td', { text: `#${r.rev}` }), h('td', { text: fmtDate(r.at) }), h('td', { text: r.by }),
      h('td', {}, ACCIONES[r.accion] || r.accion, o.publicado && o.publicado.rev === r.rev && r.accion === 'publicar' ? h('span', { class: 'museo-flag', text: 'versión publicada' }) : null),
      h('td', { class: 'small', text: (r.campos || []).map((k) => M.ui.CAMPOS[k] || k).join(', ') || (r.nota || '—') }),
      h('td', {}, r.restaurable ? h('span', { class: 'list-actions' },
        h('button', { type: 'button', class: 'cancel-button', text: 'Ver cambios', onclick: () => verCambios(r.rev) }),
        can() ? h('button', { type: 'button', text: 'Restaurar', onclick: () => restaurar(r.rev) }) : null) : null)));
    return h('div', {},
      note('is-public', 'Historial', `Cada guardado, publicación y restauración queda registrado. Restaurar crea un nuevo borrador con esa versión: no modifica lo publicado hasta que vuelvas a publicar.${o.publicado ? ` Publicada: revisión #${o.publicado.rev} por ${o.publicado.by} (${fmtDate(o.publicado.at)}).` : ''}`),
      h('div', { class: 'museo-tablewrap' }, h('table', { class: 'data-table museo-table' }, h('thead', {}, h('tr', {}, ['Rev.', 'Fecha', 'Usuario', 'Acción', 'Campos / nota', ''].map((t) => h('th', { text: t })))), h('tbody', {}, rows))));
  };

  async function verCambios(rev) {
    const r = await api('GET', `${A}/objetos/${S.obj.id}/revisiones/${rev}`);
    if (!r.ok) return toast(r.body.error || 'No se pudo cargar la revisión.', 'error');
    const diff = Object.keys(M.ui.CAMPOS).filter((k) => JSON.stringify(r.body.datos[k]) !== JSON.stringify(S.datos[k]));
    const dlg = h('dialog', { class: 'confirm-dialog museo-conflict', 'aria-label': 'Diferencias con el borrador actual' });
    const close = () => { dlg.close(); dlg.remove(); };
    dlg.append(h('h3', { text: `Revisión #${rev} frente al borrador actual` }),
      diff.length ? h('div', { class: 'museo-conf-list' }, diff.map((k) => h('fieldset', { class: 'museo-fieldset' }, h('legend', { text: M.ui.CAMPOS[k] }), h('p', {}, h('b', { text: 'Revisión: ' }), M.ui.brief(r.body.datos[k])), h('p', {}, h('b', { text: 'Actual: ' }), M.ui.brief(S.datos[k]))))) : h('p', { text: 'No hay diferencias con el borrador actual.' }),
      h('div', { class: 'dialog-actions' }, h('button', { type: 'button', text: 'Cerrar', onclick: close })));
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    document.body.append(dlg); dlg.showModal();
  }

  async function restaurar(rev) {
    if (S.datos && JSON.stringify(S.datos) !== S.saved) return toast('Guardá o descartá los cambios actuales antes de restaurar una revisión.', 'error');
    if (!(await window.AdminUI.confirmAction({ title: 'Restaurar revisión', message: `El borrador volverá a la versión #${rev}. Lo publicado no cambia hasta que vuelvas a publicar.`, confirmLabel: 'Restaurar' }))) return;
    const r = await api('POST', `${A}/objetos/${S.obj.id}/restaurar`, { rev, baseRev: S.obj.rev });
    if (!r.ok) return M.showErrors([r.body.error || 'No se pudo restaurar.']);
    S.obj = r.body; S.datos = JSON.parse(JSON.stringify(r.body.borrador)); S.saved = JSON.stringify(r.body.borrador);
    toast(`Se restauró la revisión #${rev} como borrador.`); M.render();
  }
})();
