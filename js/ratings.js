// js/ratings.js
// Módulo compartido de calificaciones (estrellas) del portal público.
// Reutilizado por index.html (alojamientos) y gastronomia.html.
//
// - Muestra el PROMEDIO (solo lectura) de cada ítem: `type:id`.
// - Permite votar 1..5. El servidor limita a 1 voto por IP por ítem y persiste.
// - Recuerda el voto propio en localStorage para bloquear la UI.
// Autocontenido: inyecta sus estilos, no depende del CSS de la página.

(function (global) {
  'use strict';

  const BASE = (typeof global.BACKEND_BASE !== 'undefined' && global.BACKEND_BASE) || '';
  const STORAGE_KEY = 'vsr_user_votes';
  let cache = {}; // 'type:id' -> { average, count }

  const key = (type, id) => `${type}:${id}`;

  function readVotes() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (_) { return {}; }
  }
  function writeVote(type, id, rating) {
    const v = readVotes(); v[key(type, id)] = rating;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch (_) {}
  }

  function setRatings(map) { cache = map || {}; }
  function getAverage(type, id) { return cache[key(type, id)] || null; }
  function yourVote(type, id) { return readVotes()[key(type, id)] || null; }

  async function load() {
    try {
      const res = await fetch(`${BASE}/api/ratings`);
      if (res.ok) { const d = await res.json(); setRatings(d.ratings || {}); }
    } catch (_) { /* silencioso: el portal sigue funcionando sin ratings */ }
    return cache;
  }

  // Estrellas de solo lectura para un promedio (soporta medias).
  function starsHtml(value, px) {
    const v = Number(value) || 0; const size = px || 18; let html = '';
    for (let i = 1; i <= 5; i++) {
      if (v >= i) html += `<span class="material-symbols-outlined vsr-star-fill" style="font-size:${size}px">star</span>`;
      else if (v >= i - 0.5) html += `<span class="material-symbols-outlined vsr-star-fill" style="font-size:${size}px">star_half</span>`;
      else html += `<span class="material-symbols-outlined vsr-star-empty" style="font-size:${size}px">star</span>`;
    }
    return html;
  }

  // Insignia de promedio: estrellas + "4.3 · 12 votos" o "Sin calificaciones aún".
  function averageBadgeHtml(type, id, px) {
    const a = getAverage(type, id);
    if (!a || !a.count) {
      return `<span class="vsr-avg"><span class="vsr-avg-stars">${starsHtml(0, px)}</span><span class="vsr-avg-empty">Sin calificaciones aún</span></span>`;
    }
    const plural = a.count === 1 ? 'voto' : 'votos';
    return `<span class="vsr-avg"><span class="vsr-avg-stars">${starsHtml(a.average, px)}</span><span class="vsr-avg-num">${a.average.toFixed(1)} · ${a.count} ${plural}</span></span>`;
  }

  async function vote(type, id, rating) {
    let data = {};
    let ok = false;
    try {
      const res = await fetch(`${BASE}/api/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType: type, itemId: id, rating }),
      });
      data = await res.json().catch(() => ({}));
      ok = res.ok && !!data.ok;
    } catch (_) { ok = false; }
    if (ok) {
      cache[key(type, id)] = { average: data.average, count: data.count };
      writeVote(type, id, rating);
    }
    return Object.assign({ ok }, data);
  }

  // Estrellas interactivas "Tu calificación" dentro de `container`
  // (requiere data-type y data-id). Bloquea tras votar y actualiza el promedio.
  function mountInteractive(container, onVoted) {
    const type = container.getAttribute('data-type');
    const id = container.getAttribute('data-id');
    if (!type || !id || container.dataset.vsrMounted) return;
    container.dataset.vsrMounted = '1';

    container.classList.add('vsr-rate');
    const avgEl = document.createElement('div');
    avgEl.className = 'vsr-rate-avg-line';
    const row = document.createElement('div');
    row.className = 'vsr-rate-row';
    const label = document.createElement('span');
    label.className = 'vsr-rate-label';
    const starsWrap = document.createElement('div');
    starsWrap.className = 'vsr-rate-stars';

    const buttons = [];
    for (let i = 1; i <= 5; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'vsr-rate-btn';
      b.setAttribute('aria-label', `${i} estrella${i > 1 ? 's' : ''}`);
      b.innerHTML = '<span class="material-symbols-outlined">star</span>';
      buttons.push(b);
      starsWrap.appendChild(b);
    }

    const paint = (n) => buttons.forEach((b, i) => b.classList.toggle('on', i < n));
    const refreshAvg = () => {
      const a = getAverage(type, id);
      const hasVotes = !!(a && a.count > 0);
      if (!hasVotes) {
        avgEl.innerHTML = '';
        if (avgEl.parentNode) avgEl.parentNode.removeChild(avgEl);
        return;
      }
      if (!avgEl.parentNode) container.insertBefore(avgEl, row);
      avgEl.innerHTML = averageBadgeHtml(type, id, 16);
    };

    const mine = yourVote(type, id);
    const lock = (n) => {
      paint(n);
      container.classList.add('voted');
      label.textContent = '¡Gracias por tu voto!';
      buttons.forEach((b) => (b.disabled = true));
    };

    if (!mine) {
      label.textContent = 'Tu calificación:';
      buttons.forEach((b, i) => {
        b.addEventListener('mouseenter', () => paint(i + 1));
        b.addEventListener('mouseleave', () => paint(yourVote(type, id) || 0));
        b.addEventListener('click', async () => {
          if (yourVote(type, id)) return;
          const val = i + 1;
          lock(val);
          const res = await vote(type, id, val);
          if (!res.ok) { label.textContent = 'No se pudo registrar. Probá más tarde.'; }
          refreshAvg();
          if (res.ok && typeof onVoted === 'function') onVoted({ average: res.average, count: res.count });
        });
      });
    } else {
      lock(mine);
    }

    row.appendChild(label);
    row.appendChild(starsWrap);
    container.appendChild(row);
    refreshAvg();
  }

  function mountAllInteractive(root) {
    (root || document).querySelectorAll('.vsr-interactive').forEach(mountInteractive);
  }

  // Estilos inyectados una sola vez.
  function injectStyles() {
    if (document.getElementById('vsr-ratings-styles')) return;
    const css = `
      .vsr-star-fill{color:#d4a83c;font-variation-settings:'FILL' 1;vertical-align:middle}
      .vsr-star-empty{color:#d8d8d8;vertical-align:middle}
      .vsr-avg{display:inline-flex;align-items:center;gap:8px}
      .vsr-avg-stars{display:inline-flex;line-height:1}
      .vsr-avg-num{font-size:13px;font-weight:700;color:#4b5563}
      .vsr-avg-empty{font-size:13px;color:#9ca3af}
      .vsr-rate{display:flex;flex-direction:column;gap:6px}
      .vsr-rate-avg-line{min-height:20px}
      .vsr-rate-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
      .vsr-rate-label{font-size:13px;font-weight:700;color:#134e4a}
      .vsr-rate-stars{display:inline-flex;gap:2px}
      .vsr-rate-btn{background:none;border:0;padding:0;cursor:pointer;line-height:1;color:#d8d8d8;transition:transform .12s ease}
      .vsr-rate-btn .material-symbols-outlined{font-size:26px}
      .vsr-rate-btn:hover{transform:scale(1.15)}
      .vsr-rate-btn.on{color:#d4a83c}
      .vsr-rate-btn.on .material-symbols-outlined{font-variation-settings:'FILL' 1}
      .vsr-rate.voted .vsr-rate-btn{cursor:default}
      .vsr-rate-btn:disabled:hover{transform:none}
      .vsr-highlight{outline:3px solid #d4a83c;outline-offset:4px;border-radius:18px;transition:outline-color .4s ease}
    `;
    const style = document.createElement('style');
    style.id = 'vsr-ratings-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }
  injectStyles();

  global.VsrRatings = {
    load, setRatings, getAverage, yourVote,
    starsHtml, averageBadgeHtml, vote,
    mountInteractive, mountAllInteractive,
  };
})(window);
