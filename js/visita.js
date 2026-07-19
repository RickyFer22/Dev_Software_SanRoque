/* ══════════════════════════════════════════════════════════════
   ARMÁ TU VISITA — mini planificador de itinerario de San Roque
   El visitante junta hospedaje, sabores y eventos desde las cards
   y comparte el plan armado por WhatsApp. Persiste en localStorage.
   API pública: window.VsrVisita
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const STORE_KEY = 'vsr_visita_v1';
  const TYPES = {
    h: { label: 'Dónde duermo', emoji: '🛏', link: (id) => `${location.origin}/index.html?h=${encodeURIComponent(id)}` },
    g: { label: 'Dónde como', emoji: '🍽', link: (id) => `${location.origin}/gastronomia.html?g=${encodeURIComponent(id)}` },
    e: { label: 'Agenda', emoji: '🎉', link: () => `${location.origin}/index.html#agenda` },
  };

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter((i) => i && TYPES[i.t] && i.id && i.nombre) : [];
    } catch (_) { return []; }
  }

  let items = load();

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(items)); } catch (_) {}
  }

  function has(t, id) {
    return items.some((i) => i.t === t && String(i.id) === String(id));
  }

  function toggle(entry) {
    if (has(entry.t, entry.id)) {
      items = items.filter((i) => !(i.t === entry.t && String(i.id) === String(entry.id)));
    } else {
      items.push({ t: entry.t, id: String(entry.id), nombre: String(entry.nombre || '').slice(0, 120), meta: String(entry.meta || '').slice(0, 80) });
    }
    save();
    refreshUI();
  }

  function clearAll() {
    items = [];
    save();
    refreshUI();
    closePanel();
  }

  function buildText() {
    const lines = ['🌿 *Mi visita a San Roque*', ''];
    ['h', 'g', 'e'].forEach((t) => {
      const group = items.filter((i) => i.t === t);
      if (!group.length) return;
      lines.push(`${TYPES[t].emoji} *${TYPES[t].label}:*`);
      group.forEach((i) => {
        const meta = i.meta ? ` (${i.meta})` : '';
        lines.push(`• ${i.nombre}${meta}`);
        lines.push(`  ${TYPES[i.t].link(i.id)}`);
      });
      lines.push('');
    });
    lines.push(`Armá la tuya en ${location.origin}`);
    return lines.join('\n');
  }

  /* ── UI flotante ─────────────────────────────────────────── */

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let fab = null;
  let panel = null;

  function mountUI() {
    if (fab) return;
    fab = el(`
      <button type="button" class="visita-fab" aria-haspopup="dialog" aria-controls="visita-panel" aria-expanded="false" hidden>
        <span class="material-symbols-outlined" aria-hidden="true">map</span>
        <span class="visita-fab-label">Mi visita</span>
        <span class="visita-fab-count" aria-label="elementos agregados">0</span>
      </button>`);
    panel = el(`
      <div id="visita-panel" class="visita-panel" role="dialog" aria-label="Mi visita a San Roque" hidden>
        <div class="visita-panel-head">
          <div>
            <span class="visita-panel-kicker">Planificá tu finde</span>
            <strong>Mi visita a San Roque</strong>
          </div>
          <button type="button" class="visita-panel-x" data-visita-close aria-label="Cerrar">✕</button>
        </div>
        <div class="visita-panel-body" data-visita-list></div>
        <div class="visita-panel-actions">
          <a class="visita-btn visita-btn-wa" data-visita-wa href="#" target="_blank" rel="noopener">
            <span class="material-symbols-outlined" aria-hidden="true">send</span> Compartir por WhatsApp
          </a>
          <div class="visita-panel-row">
            <button type="button" class="visita-btn visita-btn-ghost" data-visita-copy>Copiar plan</button>
            <button type="button" class="visita-btn visita-btn-ghost visita-btn-danger" data-visita-clear>Vaciar</button>
          </div>
        </div>
      </div>`);
    document.body.appendChild(fab);
    document.body.appendChild(panel);

    fab.addEventListener('click', () => {
      panel.hidden ? openPanel() : closePanel();
    });
    panel.querySelector('[data-visita-close]').addEventListener('click', closePanel);
    panel.querySelector('[data-visita-clear]').addEventListener('click', () => {
      if (window.confirm('¿Vaciar tu visita? Se quitan todos los elementos.')) clearAll();
    });
    panel.querySelector('[data-visita-copy]').addEventListener('click', async (ev) => {
      try {
        await navigator.clipboard.writeText(buildText());
        ev.target.textContent = '¡Copiado!';
        setTimeout(() => { ev.target.textContent = 'Copiar plan'; }, 1800);
      } catch (_) {}
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && panel && !panel.hidden) closePanel();
    });
  }

  function openPanel() {
    renderPanel();
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
  }

  function closePanel() {
    if (panel) panel.hidden = true;
    if (fab) fab.setAttribute('aria-expanded', 'false');
  }

  function renderPanel() {
    const list = panel.querySelector('[data-visita-list]');
    if (!items.length) {
      list.innerHTML = '<p class="visita-empty">Todavía no agregaste nada. Tocá <strong>+ Mi visita</strong> en un hospedaje, un local gastronómico o un evento.</p>';
    } else {
      list.innerHTML = ['h', 'g', 'e'].map((t) => {
        const group = items.filter((i) => i.t === t);
        if (!group.length) return '';
        return `
          <div class="visita-group">
            <div class="visita-group-title">${TYPES[t].emoji} ${esc(TYPES[t].label)}</div>
            ${group.map((i) => `
              <div class="visita-item">
                <span class="visita-item-name">${esc(i.nombre)}${i.meta ? `<small>${esc(i.meta)}</small>` : ''}</span>
                <button type="button" class="visita-item-x" data-visita-remove data-vtype="${i.t}" data-vid="${esc(i.id)}" aria-label="Quitar ${esc(i.nombre)}">✕</button>
              </div>`).join('')}
          </div>`;
      }).join('');
    }
    list.querySelectorAll('[data-visita-remove]').forEach((btn) => {
      btn.addEventListener('click', () => toggle({ t: btn.dataset.vtype, id: btn.dataset.vid, nombre: '' }));
    });
    const wa = panel.querySelector('[data-visita-wa]');
    wa.href = `https://wa.me/?text=${encodeURIComponent(buildText())}`;
    wa.classList.toggle('is-disabled', !items.length);
  }

  function refreshUI() {
    if (!fab) return;
    const count = items.length;
    fab.querySelector('.visita-fab-count').textContent = String(count);
    fab.hidden = count === 0 && (panel ? panel.hidden : true);
    if (count === 0) closePanel();
    if (panel && !panel.hidden) renderPanel();
    // Estado de todos los botones "+ Mi visita" de la página
    document.querySelectorAll('.visita-add').forEach((btn) => {
      const added = has(btn.dataset.vtype, btn.dataset.vid);
      btn.classList.toggle('is-added', added);
      btn.setAttribute('aria-pressed', String(added));
      const label = btn.querySelector('.visita-add-label');
      if (label) label.textContent = added ? 'En mi visita' : 'Mi visita';
    });
  }

  /* ── Botones "+ Mi visita" (delegado) ────────────────────── */
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.visita-add');
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    toggle({ t: btn.dataset.vtype, id: btn.dataset.vid, nombre: btn.dataset.vnombre, meta: btn.dataset.vmeta || '' });
    if (fab) fab.hidden = false;
  });

  // Sincronizar entre pestañas / páginas
  window.addEventListener('storage', (ev) => {
    if (ev.key === STORE_KEY) {
      items = load();
      refreshUI();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    mountUI();
    refreshUI();
  });

  window.VsrVisita = Object.freeze({
    toggle, has, clearAll, buildText,
    refresh: refreshUI,
    buttonHtml(t, id, nombre, meta) {
      const safeName = esc(nombre);
      return `<button type="button" class="visita-add" data-vtype="${esc(t)}" data-vid="${esc(id)}" data-vnombre="${safeName}" data-vmeta="${esc(meta || '')}" aria-pressed="false" title="Agregar a mi visita"><span class="material-symbols-outlined" aria-hidden="true">add_location_alt</span><span class="visita-add-label">Mi visita</span></button>`;
    },
  });
})();
