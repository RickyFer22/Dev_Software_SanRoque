document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("gastronomia-grid");

  if (!grid) {
    console.error("No existe #gastronomia-grid en el DOM");
    return;
  }

  const serviceLabels = {
    wifi: "WiFi",
    pets: "Pet friendly",
    parking: "Estacionamiento",
    videocam: "Cámaras",
    celiac: "Sin TACC",
    restaurant: "En el lugar",
    shower: "Duchas",
    delivery: "Delivery",
    ac_unit: "Climatizado",
    tv: "TV"
  };
  // Nunca mostrar claves internas: si no está mapeada, se humaniza.
  const serviceLabel = (s) => serviceLabels[s] || String(s).replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

  // Varias fichas quedaron cargadas con la foto genérica del portal (una vista
  // nocturna de la iglesia, además de baja resolución): antes que mostrar algo
  // que no es el local, va el placeholder vectorial, nítido a cualquier tamaño.
  const GENERIC_IMAGES = ['hero.jpg', 'hero.jpg.jpg', 'og-image.jpg', 'logo-muni.jpg'];
  const localImage = (local) => {
    const src = String(local.imagen || local.mainImg || '').trim();
    const file = src.split('/').pop();
    return (!src || GENERIC_IMAGES.includes(file)) ? 'img/placeholder-gastronomia.svg' : src;
  };

  function crearCard(local) {
    const id = local.id || String(local.nombre || local.titulo || '').toLowerCase().replace(/\s+/g, '-');
    const nombre = local.nombre || local.titulo || 'Local';
    const servicios = (local.servicios || [])
      .map(servicio => `<li class="bg-neutral-100 px-3 py-1.5 rounded-md text-[11px] font-bold text-neutral-700 uppercase tracking-wider leading-tight">${serviceLabel(servicio)}</li>`)
      .join("");
    const ratingBadge = window.VsrRatings ? VsrRatings.averageBadgeHtml('gastronomia', id, 16) : '';
    const estadoBadge = window.VsrHorario ? VsrHorario.badgeHtml(local.horario || local.hora) : '';

    return `
      <article id="gastro-${id}" data-gastro-id="${id}" class="relative group bg-canvas-white rounded-2xl overflow-hidden border border-outline-variant/30 shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer min-h-[620px] lg:min-h-[500px] card-item fade-in-up">
        <a href="/gastronomia/${encodeURIComponent(id)}" class="absolute inset-0 w-full h-[40%] lg:h-full transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] lg:group-hover:w-[45%] z-0">
          <img src="${localImage(local)}" alt="${local.nombre || local.titulo}" class="w-full h-full object-cover img-zoom" loading="lazy" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-500 hidden lg:block lg:group-hover:opacity-0"></div>
        </a>

        <div class="absolute top-4 left-4 z-20 bg-moss-dark/90 text-canvas-white text-[10px] font-label-caps uppercase px-3 py-1.5 rounded-full tracking-wider font-bold shadow-md">${local.tipo ? String(local.tipo).replace(/^\w/, (c) => c.toUpperCase()) : 'Gastronomía'}</div>

        <div class="absolute inset-x-0 bottom-0 top-[40%] lg:top-0 lg:left-[45%] lg:right-0 bg-canvas-white p-5 sm:p-6 md:p-8 flex flex-col justify-start lg:justify-center lg:opacity-0 lg:translate-x-8 lg:group-hover:opacity-100 lg:group-hover:translate-x-0 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] z-10 border-t lg:border-t-0 border-neutral-100">
          <h2 class="text-primary text-[21px] sm:text-[22px] font-bold font-headline-md mb-2 leading-tight">
            <a href="/gastronomia/${encodeURIComponent(id)}" class="hover:text-river-teal hover:underline transition-colors">${local.nombre || local.titulo}</a>
          </h2>

          ${estadoBadge ? `<div class="mb-2">${estadoBadge}</div>` : ''}

          <div class="flex flex-wrap gap-3 text-[12px] text-neutral-600 font-bold mb-4 leading-tight">
            <span class="inline-flex items-center gap-1.5">
              <span class="material-symbols-outlined text-golden-sand text-[18px]">schedule</span>${local.horario || local.hora || 'Horario a confirmar'}</span>
            <span class="inline-flex items-center gap-1.5">
              <span class="material-symbols-outlined text-river-teal text-[18px]">location_on</span>${local.ubicacion || local.direccion || local.lugar || 'San Roque'}</span>
          </div>

          <p class="text-neutral-600 text-[14px] mb-3 leading-relaxed">${local.descripcion || ''}</p>

          <div class="mb-4">${ratingBadge}</div>

          <ul class="flex flex-wrap gap-1.5 mb-4">${servicios}</ul>

          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((local.ubicacion || local.direccion || local.lugar || 'San Roque') + ", San Roque, Corrientes")}" target="_blank" onclick="event.stopPropagation(); window.VsrTrack?.click('mapa','${id}')" class="geo-btn mb-4 w-fit">
            <span class="material-symbols-outlined">location_on</span> Ver en mapa
          </a>

          <div class="mt-auto flex items-center gap-2 flex-wrap">
            <a href="https://wa.me/${local.whatsapp || local.waNumber || ''}" target="_blank" onclick="event.stopPropagation(); window.VsrTrack?.click('whatsapp','${id}')" class="inline-flex w-fit items-center gap-1.5 px-6 py-3 bg-river-teal text-white rounded-full font-bold text-xs uppercase tracking-wider hover:bg-primary transition-all duration-300 hover:scale-105 shadow-md">
              WhatsApp <span class="material-symbols-outlined text-[16px]">open_in_new</span>
            </a>
            <button type="button" class="gastro-share-btn inline-flex w-fit items-center gap-1.5 px-5 py-3 bg-white text-river-teal border border-neutral-200 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-river-teal hover:text-white transition-all shadow-sm" data-share-id="${id}" data-share-name="${nombre.replace(/"/g, '&quot;')}" onclick="event.stopPropagation()">
              <span class="material-symbols-outlined text-[16px]">share</span> Compartir
            </button>
            ${window.VsrVisita ? VsrVisita.buttonHtml('g', id, nombre, local.tipo || '') : ''}
          </div>
        </div>
      </article>
    `;
  }

  // ── Carga de datos (API con fallback local) ────────────────────
  let data = Array.isArray(window.gastronomiaData) ? window.gastronomiaData : [];
  let ratingsLoaded = false;
  let loadError = false;
  try {
    const res = await fetch(`/api/data`);
    if (res.ok) {
      const payload = await res.json();
      if (Array.isArray(payload.gastronomia) && payload.gastronomia.length) {
        data = payload.gastronomia;
      }
      if (window.VsrRatings && payload.ratings) { VsrRatings.setRatings(payload.ratings); ratingsLoaded = true; }
    } else {
      loadError = true;
    }
  } catch (err) {
    loadError = true;
    console.info('Usando gastronomía local por fallback', err.message);
  }
  if (window.VsrRatings && !ratingsLoaded) { try { await VsrRatings.load(); } catch (_) {} }

  const items = (Array.isArray(data) ? data : Object.values(data || {}))
    .filter((local) => local && (local.nombre || local.titulo));

  // Error real: sin API y sin datos locales.
  if (!items.length) {
    grid.innerHTML = `
      <div class="col-span-full text-center rounded-3xl border border-dashed border-neutral-300 bg-white/80 px-6 py-14 text-neutral-600">
        <p class="font-bold text-primary text-lg mb-2">${loadError ? 'No pudimos cargar la información.' : 'Todavía no hay establecimientos publicados.'}</p>
        ${loadError ? '<button type="button" class="mt-2 px-6 py-3 rounded-full bg-river-teal text-white font-bold text-sm" onclick="location.reload()">Reintentar</button>' : ''}
      </div>`;
    return;
  }

  // ── Explorador: buscador, categorías y filtros ─────────────────
  const state = { q: '', cat: 'todas', filtros: new Set() };
  const norm = (v) => String(v || '').toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '');

  const categorias = [...new Set(items.map((l) => norm(l.tipo)).filter(Boolean))];
  const serviciosDisponibles = [...new Set(items.flatMap((l) => Array.isArray(l.servicios) ? l.servicios : []))];

  const FILTROS = [
    { id: 'abierto', label: 'Abierto ahora', test: (l) => { const e = window.VsrHorario && VsrHorario.estado(l.horario || l.hora); return Boolean(e && e.open); } },
    ...serviciosDisponibles.map((s) => ({ id: `serv:${s}`, label: serviceLabel(s), test: (l) => (l.servicios || []).includes(s) })),
  ];

  const catsHost = document.getElementById('gastro-cats');
  const filtersHost = document.getElementById('gastro-filters');
  const searchInput = document.getElementById('gastro-search');
  const resultsInfo = document.getElementById('gastro-results-info');

  function renderChips() {
    if (catsHost) {
      const chips = [['todas', `Todos (${items.length})`], ...categorias.map((c) => [c, `${c.replace(/^\w/, (x) => x.toUpperCase())} (${items.filter((l) => norm(l.tipo) === c).length})`])];
      catsHost.innerHTML = chips.map(([value, label]) => `<button type="button" class="gastro-chip ${state.cat === value ? 'active' : ''}" data-cat="${value}" aria-pressed="${state.cat === value}">${label}</button>`).join('');
      catsHost.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { state.cat = b.dataset.cat; aplicar(); }));
    }
    if (filtersHost) {
      filtersHost.innerHTML = FILTROS.map((f) => `<button type="button" class="gastro-chip gastro-chip-filter ${state.filtros.has(f.id) ? 'active' : ''}" data-filtro="${f.id}" aria-pressed="${state.filtros.has(f.id)}">${f.id === 'abierto' ? '<i class="gastro-dot" aria-hidden="true"></i>' : ''}${f.label}${state.filtros.has(f.id) ? ' ✕' : ''}</button>`).join('');
      filtersHost.querySelectorAll('[data-filtro]').forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.filtro;
        state.filtros.has(id) ? state.filtros.delete(id) : state.filtros.add(id);
        aplicar();
      }));
    }
  }

  function coincide(local) {
    if (state.cat !== 'todas' && norm(local.tipo) !== state.cat) return false;
    for (const fid of state.filtros) {
      const filtro = FILTROS.find((f) => f.id === fid);
      if (filtro && !filtro.test(local)) return false;
    }
    if (state.q) {
      const texto = norm([local.nombre, local.titulo, local.tipo, local.descripcion, local.direccion, local.ubicacion, (local.servicios || []).map(serviceLabel).join(' '), (local.specialties || []).join(' ')].join(' '));
      if (!texto.includes(norm(state.q))) return false;
    }
    return true;
  }

  // root: contenedor a "activar" (grilla principal o la tira de destacados;
  // ambas reutilizan crearCard(), así que necesitan el mismo cableado).
  function bindGrid(root = grid) {
    root.querySelectorAll('article[data-gastro-id]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.vsr-interactive, .geo-btn, .gastro-share-btn, .visita-add, a[href*="wa.me"], a[href^="/gastronomia/"]')) {
          return;
        }
        const id = card.dataset.gastroId;
        window.location.href = `/gastronomia/${encodeURIComponent(id)}`;
      });
    });
    if (window.VsrRatings) VsrRatings.mountAllInteractive(root);
    window.VsrVisita?.refresh();
    root.querySelectorAll('.gastro-share-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.VsrShare) return;
        window.VsrTrack?.click('compartir', btn.dataset.shareId);
        const r = await VsrShare.share('g', btn.dataset.shareId, btn.dataset.shareName);
        if (r && r.method === 'clipboard') {
          const original = btn.innerHTML;
          btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">check</span> ¡Copiado!';
          setTimeout(() => { btn.innerHTML = original; }, 1800);
        }
      });
    });
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    }, { threshold: 0.05 });
    root.querySelectorAll('.fade-in-up').forEach(card => observer.observe(card));
  }

  // ── Destacados rotativos: los marcados "Destacar" en el admin, en tandas
  // que cambian semana a semana (no siempre los mismos primeros N). ────
  function weekBucket() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    return Math.floor((now - start) / 604800000); // 7*24*60*60*1000
  }

  function renderFeatured() {
    const host = document.getElementById('gastro-featured');
    if (!host) return;
    const destacados = items.filter((l) => l.featured);
    if (!destacados.length) { host.hidden = true; host.innerHTML = ''; return; }
    const slots = Math.min(3, destacados.length);
    const offset = weekBucket() % destacados.length;
    const rotados = Array.from({ length: slots }, (_, i) => destacados[(offset + i) % destacados.length]);
    host.hidden = false;
    host.innerHTML = `
      <div class="gastro-featured-head">
        <span class="gastro-featured-kicker">Elegidos por el municipio</span>
        <h2>Destacados de la semana</h2>
      </div>
      <div class="gastro-featured-track">${rotados.map((local) => `<div class="gastro-featured-card">${crearCard(local)}</div>`).join('')}</div>
    `;
    bindGrid(host);
  }

  function aplicar() {
    const visibles = items.filter(coincide);
    if (!visibles.length) {
      grid.innerHTML = `
        <div class="col-span-full text-center rounded-3xl border border-dashed border-neutral-300 bg-white/80 px-6 py-14 text-neutral-600">
          <p class="font-bold text-primary text-lg mb-2">No encontramos establecimientos con esos filtros.</p>
          <p class="text-sm mb-4">Probá eliminando alguna opción o buscando otra cosa.</p>
          <button type="button" id="gastro-clear-filters" class="px-6 py-3 rounded-full bg-river-teal text-white font-bold text-sm">Quitar filtros</button>
        </div>`;
      document.getElementById('gastro-clear-filters')?.addEventListener('click', () => {
        state.q = ''; state.cat = 'todas'; state.filtros.clear();
        if (searchInput) searchInput.value = '';
        aplicar();
      });
    } else {
      grid.innerHTML = visibles.map(crearCard).join("");
      bindGrid();
    }
    renderChips();
    if (resultsInfo) {
      const activos = state.filtros.size + (state.cat !== 'todas' ? 1 : 0) + (state.q ? 1 : 0);
      resultsInfo.textContent = activos ? `${visibles.length} de ${items.length} establecimientos` : '';
    }
  }

  let searchTimer = 0;
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = searchInput.value.trim(); aplicar(); }, 220);
  });

  renderFeatured();
  aplicar();

  // Si se abrió con ?g=<id>, resaltar y desplazar a ese local.
  const focusId = window.VsrShare && VsrShare.paramFromUrl('g');
  if (focusId) {
    const el = document.getElementById('gastro-' + focusId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('vsr-highlight');
      setTimeout(() => el.classList.remove('vsr-highlight'), 3000);
    }
  }
});
