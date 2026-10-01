/* Experiencia de uso del panel: guarda con estado de carga (sin envíos duplicados), validación junto al campo,
 * mensajes de error comprensibles, confirmación de borrado que nombra el registro, auditoría legible con
 * paginación y estados de carga en los listados. Se apoya en las funciones y datos que ya usa app.js; no
 * cambia ningún contrato con el backend. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };

  /* ---------- 1. Seguimiento de pedidos que modifican datos ---------- */
  const nativeFetch = window.fetch.bind(window);
  let mutations = 0, pending = 0;
  window.fetch = function (input, init) {
    const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD') return nativeFetch(input, init);
    mutations += 1; pending += 1;
    return nativeFetch(input, init).finally(() => { pending -= 1; if (!pending) document.dispatchEvent(new Event('ux:idle')); });
  };

  /* ---------- 2. Mensajes de error comprensibles ---------- */
  const HTTP = { 400: 'Los datos enviados no son válidos.', 401: 'Tu sesión venció. Volvé a iniciar sesión.', 403: 'No tenés permiso para esta acción.', 404: 'No se encontró el registro.', 409: 'Hubo un conflicto con otra modificación. Actualizá y volvé a intentar.', 413: 'El archivo es demasiado grande.', 415: 'Formato de archivo no admitido.', 429: 'Demasiados intentos. Esperá un momento.', 500: 'Error del servidor. Intentá de nuevo en unos minutos.' };
  function friendly(message) {
    const text = String(message || '');
    const json = /\{\s*"error"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(text);
    const code = /\b([45]\d\d)\b\s+[A-Za-zÁ-ú ]*(?:\{|$)/.exec(text);
    if (!json && !code) return text;
    const head = text.replace(/\s*\b[45]\d\d\b.*$/s, '').replace(/:\s*$/, '');
    const generic = json && /^(Forbidden|Unauthenticated|Not found|Invalid payload)$/i.test(json[1]);
    const byCode = code ? (HTTP[code[1]] || HTTP[Math.floor(code[1] / 100) * 100] || '') : '';
    const detail = json && !(generic && byCode) ? json[1].replace(/\\"/g, '"') : byCode;
    return (head ? head + ': ' : '') + detail;
  }
  const baseToast = window.showToast;
  window.showToast = function (message, type) {
    if (typeof baseToast === 'function') baseToast(type === 'error' ? friendly(message) : message, type);
  };
  const host = document.getElementById('toast-host');
  if (host) { host.setAttribute('aria-live', 'polite'); host.setAttribute('role', 'status'); }

  /* ---------- 3. Validación junto al campo ---------- */
  const RULES = {
    users: [['user-username', 'Ingresá el nombre de usuario.']],
    eventos: [['event-titulo', 'Ingresá el título del evento.']],
    actividades: [['actividades-titulo', 'Ingresá el título.']],
    alojamientos: [['alojamiento-titulo', 'Ingresá el nombre del alojamiento.'], ['alojamiento-categoria', 'Elegí una categoría.']],
    gastronomia: [['gastronomia-nombre', 'Ingresá el nombre comercial.'], ['gastronomia-tipo', 'Elegí el tipo de propuesta.']],
    tickets: [['ticket-title', 'Resumí el problema en el título.'], ['ticket-message', 'Describí el problema.']],
    'datos-utiles': [['datos-utiles-categoria', 'Ingresá la categoría (por ejemplo: remises).']],
  };
  const EXTRA = { tickets: [['ticket-email', (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Ese email no parece válido (ejemplo: nombre@dominio.com).']] };

  function clearError(field) {
    field.removeAttribute('aria-invalid');
    const id = field.getAttribute('aria-describedby');
    if (id && id.startsWith('ux-err-')) { document.getElementById(id)?.remove(); field.removeAttribute('aria-describedby'); }
  }
  function showError(field, message) {
    clearError(field);
    const err = el('span', 'ux-field-error', message);
    err.id = 'ux-err-' + field.id; err.setAttribute('role', 'alert');
    (field.closest('label') || field.parentElement).append(err);
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', err.id);
    field.addEventListener('input', () => clearError(field), { once: true });
    field.addEventListener('change', () => clearError(field), { once: true });
  }
  function validate(panel, resource) {
    if (!panel) return true;
    panel.querySelectorAll('[aria-describedby^="ux-err-"]').forEach(clearError);
    const bad = [];
    (RULES[resource] || []).forEach(([id, msg]) => { const f = document.getElementById(id); if (f && !String(f.value || '').trim()) bad.push([f, msg]); });
    (EXTRA[resource] || []).forEach(([id, ok, msg]) => { const f = document.getElementById(id); if (f && !ok(String(f.value || '').trim())) bad.push([f, msg]); });
    const summary = panel.querySelector('[data-form-errors]');
    if (summary) {
      summary.hidden = !bad.length; summary.textContent = '';
      if (bad.length) { summary.append(el('strong', '', bad.length === 1 ? 'Revisá este campo:' : 'Revisá estos campos:')); const ul = el('ul'); bad.forEach(([, m]) => ul.append(el('li', '', m))); summary.append(ul); }
    }
    bad.forEach(([f, m]) => showError(f, m));
    if (bad.length) {
      const tab = bad[0][0].closest('[data-editor-panel]');
      if (tab && tab.hidden) panel.querySelector(`[data-editor-tab="${tab.dataset.editorPanel}"]`)?.click();
      bad[0][0].focus();
      window.showToast(bad.length === 1 ? bad[0][1] : `Faltan ${bad.length} datos obligatorios.`, 'error');
    }
    return !bad.length;
  }

  /* ---------- 4. Guardado con estado de carga y sin envíos duplicados ---------- */
  const GUARDED = '[data-action="submit"], [data-action="restore-backup"]';
  function setBusy(button, busy) {
    if (busy) { button.dataset.uxLabel = button.textContent; button.setAttribute('aria-busy', 'true'); button.textContent = button.dataset.action === 'submit' ? 'Guardando…' : 'Procesando…'; }
    else { button.removeAttribute('aria-busy'); if (button.dataset.uxLabel) button.textContent = button.dataset.uxLabel; delete button.dataset.uxLabel; }
  }
  document.addEventListener('click', (event) => {
    const button = event.target.closest(GUARDED);
    if (!button) return;
    if (button.getAttribute('aria-busy') === 'true') { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); return; } // segundo clic mientras guarda
    if (button.dataset.action === 'submit' && !validate(button.closest('[data-editor]'), button.dataset.resource)) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); return;
    }
    setBusy(button, true);
    const started = mutations;
    const release = () => setBusy(button, false);
    setTimeout(() => {
      if (mutations === started || !pending) release(); // no hubo pedido (p. ej. la validación propia lo frenó) o ya terminó
      else document.addEventListener('ux:idle', release, { once: true });
    }, 200);
  }, true);

  /* ---------- 5. Confirmación de borrado que dice qué se elimina ---------- */
  let deleting = null;
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="delete"]');
    if (!button) return;
    const row = button.closest('.list-row, .upload-card, .crm-row, tr');
    const name = row && (row.querySelector('strong')?.textContent || '').trim();
    deleting = name ? { name, hideable: !!row.querySelector('[data-action="hide"], [data-quick-activo], [data-quick-status]') } : null;
  }, true);
  if (window.AdminUI && window.AdminUI.confirmAction) {
    const baseConfirm = window.AdminUI.confirmAction;
    window.AdminUI.confirmAction = function (opts) {
      if (opts && opts.danger && opts.title === 'Eliminar registro' && deleting) {
        const msg = `Se eliminará «${deleting.name}» del panel y no se podrá recuperar.` + (deleting.hideable ? ' Si solo querés que deje de verse en el portal, cambiá su estado a “Oculto”.' : '');
        opts = Object.assign({}, opts, { title: `Eliminar «${deleting.name}»`, message: msg });
      }
      return baseConfirm(opts);
    };
  }

  /* ---------- 6. Auditoría legible (y con valores escapados) ---------- */
  const ACTIONS = { create: 'Creación', update: 'Edición', delete: 'Eliminación', publish: 'Publicación', unpublish: 'Retiro de publicación', restore: 'Restauración', upload: 'Subida de archivo', link: 'Vínculo con la visita', login: 'Inicio de sesión' };
  const KINDS = { alojamientos: 'Alojamiento', gastronomia: 'Gastronomía', eventos: 'Evento', actividades: 'Lugar o experiencia', users: 'Usuario', tickets: 'Ticket', datos_utiles: 'Servicio útil', museo: 'Ficha del museo', 'museo-archivo': 'Archivo del museo', 'museo-punto': 'Punto de la visita', media: 'Multimedia', uploads: 'Archivo', sitio: 'Portada', announcement: 'Anuncio' };
  const ROLES = { 'super-admin': 'Super admin', editor: 'Editor', viewer: 'Solo lectura', guest: 'Invitado' };
  const esc = (v) => (typeof window.escapeLog === 'function' ? window.escapeLog(String(v ?? '')) : String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  window.renderAudit = function (entry) {
    if (!entry || typeof entry !== 'object') return '';
    const when = entry.createdAt ? new Date(entry.createdAt).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' }) : '';
    const action = ACTIONS[entry.action] || entry.action;
    const hasChanges = entry.changes && Object.keys(entry.changes).length;
    return `
    <div class="list-row">
      <div class="ux-audit">
        <div class="ux-audit-head"><span class="ux-act${entry.action === 'delete' ? ' is-delete' : ''}">${esc(action)}</span><strong>${esc(KINDS[entry.resource] || entry.resource)}</strong></div>
        <div class="small"><code>${esc(entry.resourceId)}</code></div>
        <div class="small">${esc(entry.adminUser || 'anónimo')} · ${esc(ROLES[entry.adminRole] || entry.adminRole || '')} · <time datetime="${esc(entry.createdAt)}">${esc(when)}</time></div>
        ${hasChanges ? `<details><summary class="small">Ver datos del cambio</summary><pre>${esc(JSON.stringify(entry.changes, null, 2))}</pre></details>` : ''}
      </div>
      <div class="list-actions"><button type="button" data-action="view-audit" data-resource="audit" data-id="${esc(entry.id)}">Ver detalle</button></div>
    </div>`;
  };

  /* ---------- 7. Paginación de listados largos ---------- */
  function paginate(listHost, size) {
    listHost.querySelector('.ux-more')?.remove();
    const all = [...listHost.children].filter((n) => n.matches('.list-row'));
    const rows = all.filter((n) => !n.classList.contains('ux-off'));
    all.forEach((r) => { r.hidden = false; });
    if (rows.length <= size) return;
    let shown = size;
    const more = el('div', 'ux-more');
    const btn = el('button', '');
    btn.type = 'button';
    const paint = () => {
      rows.forEach((r, i) => { r.hidden = i >= shown; });
      const left = rows.length - shown;
      if (left <= 0) more.remove(); else btn.textContent = `Mostrar más (${left} restantes)`;
    };
    btn.addEventListener('click', () => { shown += size; paint(); rows[shown - size]?.querySelector('button, a')?.focus({ preventScroll: false }); });
    more.append(btn); listHost.append(more); paint();
  }
  const auditList = document.getElementById('audit-list');
  if (auditList) {
    // Filtro por tipo de acción (se combina con la búsqueda y la paginación)
    const bar = document.querySelector('#audit .toolbar');
    if (bar && !bar.querySelector('.ux-filter')) {
      const label = el('label', 'ux-filter', 'Tipo de acción');
      const sel = el('select');
      sel.append(Object.assign(el('option', '', 'Todas'), { value: '' }));
      Object.entries(ACTIONS).forEach(([k, v]) => sel.append(Object.assign(el('option', '', v), { value: v })));
      label.append(sel); bar.append(label);
      sel.addEventListener('change', () => {
        auditList.querySelectorAll('.list-row').forEach((r) => { const t = r.querySelector('.ux-act'); r.classList.toggle('ux-off', !!sel.value && (!t || t.textContent !== sel.value)); });
        paginate(auditList, 25);
      });
    }
    const own = (n) => n.nodeType === 1 && n.classList.contains('ux-more');
    const obs = new MutationObserver((records) => {
      // los cambios que hace la propia paginación (agregar/quitar el botón) no deben volver a paginar
      if (records.every((r) => [...r.addedNodes, ...r.removedNodes].every(own))) return;
      obs.disconnect(); paginate(auditList, 25); obs.observe(auditList, { childList: true });
    });
    obs.observe(auditList, { childList: true });
  }

  /* ---------- 8. Estados de carga en los listados ---------- */
  if (typeof window.loadResource === 'function') {
    const baseLoad = window.loadResource;
    window.loadResource = async function (resource) {
      const list = document.getElementById(`${resource}-list`);
      let skeleton = null;
      if (list && !list.children.length) {
        list.setAttribute('aria-busy', 'true');
        skeleton = el('div', 'ux-skel'); skeleton.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < 3; i += 1) skeleton.append(el('i'));
        list.append(skeleton);
      }
      try { return await baseLoad(resource); } finally { if (list) { list.removeAttribute('aria-busy'); if (skeleton && skeleton.isConnected) skeleton.remove(); } }
    };
  }
})();
