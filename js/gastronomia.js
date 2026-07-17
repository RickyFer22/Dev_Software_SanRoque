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
    celiac: "Celíacos",
    restaurant: "Comedor",
    shower: "Duchas",
    delivery: "Delivery",
    ac_unit: "Climatizado",
    tv: "TV"
  };

  function crearCard(local) {
    const id = local.id || String(local.nombre || local.titulo || '').toLowerCase().replace(/\s+/g, '-');
    const nombre = local.nombre || local.titulo || 'Local';
    const servicios = (local.servicios || [])
      .map(servicio => `<li class="bg-neutral-100 px-3 py-1.5 rounded-md text-[11px] font-bold text-neutral-700 uppercase tracking-wider leading-tight">${serviceLabels[servicio] || servicio}</li>`)
      .join("");
    const ratingBadge = window.VsrRatings ? VsrRatings.averageBadgeHtml('gastronomia', id, 16) : '';

    return `
      <article id="gastro-${id}" data-gastro-id="${id}" class="relative group bg-canvas-white rounded-2xl overflow-hidden border border-outline-variant/30 shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer min-h-[620px] lg:min-h-[430px] card-item fade-in-up">
        <a href="comercio.html?id=${id}" target="_blank" class="absolute inset-0 w-full h-[40%] lg:h-full transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] lg:group-hover:w-[45%] z-0">
          <img src="${local.imagen || local.mainImg}" alt="${local.nombre || local.titulo}" class="w-full h-full object-cover img-zoom" loading="lazy" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-500 hidden lg:block lg:group-hover:opacity-0"></div>
        </a>

        <div class="absolute top-4 left-4 z-20 bg-moss-dark/90 text-canvas-white text-[10px] font-label-caps uppercase px-3 py-1.5 rounded-full tracking-wider font-bold shadow-md">Gastronomía</div>

        <div class="absolute inset-x-0 bottom-0 top-[40%] lg:top-0 lg:left-[45%] lg:right-0 bg-canvas-white p-5 sm:p-6 md:p-8 flex flex-col justify-center lg:opacity-0 lg:translate-x-8 lg:group-hover:opacity-100 lg:group-hover:translate-x-0 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] z-10 border-t lg:border-t-0 border-neutral-100">
          <h2 class="text-primary text-[21px] sm:text-[22px] font-bold font-headline-md mb-2 leading-tight">
            <a href="comercio.html?id=${id}" target="_blank" class="hover:text-river-teal hover:underline transition-colors">${local.nombre || local.titulo}</a>
          </h2>

          <div class="flex flex-wrap gap-3 text-[12px] text-neutral-600 font-bold mb-4 leading-tight">
            <span class="inline-flex items-center gap-1.5">
              <span class="material-symbols-outlined text-golden-sand text-[18px]">schedule</span>${local.horario || local.hora || 'Horario a confirmar'}</span>
            <span class="inline-flex items-center gap-1.5">
              <span class="material-symbols-outlined text-river-teal text-[18px]">location_on</span>${local.ubicacion || local.direccion || local.lugar || 'San Roque'}</span>
          </div>

          <p class="text-neutral-600 text-[14px] mb-3 leading-relaxed">${local.descripcion || ''}</p>

          <div class="mb-4">${ratingBadge}</div>

          <ul class="flex flex-wrap gap-1.5 mb-4">${servicios}</ul>

          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((local.ubicacion || local.direccion || local.lugar || 'San Roque') + ", San Roque, Corrientes")}" target="_blank" onclick="event.stopPropagation()" class="geo-btn mb-4 w-fit">
            <span class="material-symbols-outlined">location_on</span> Ver en mapa
          </a>

          <div class="mt-auto flex items-center gap-2 flex-wrap">
            <a href="https://wa.me/${local.whatsapp || local.waNumber || ''}" target="_blank" onclick="event.stopPropagation()" class="inline-flex w-fit items-center gap-1.5 px-6 py-3 bg-river-teal text-white rounded-full font-bold text-xs uppercase tracking-wider hover:bg-primary transition-all duration-300 hover:scale-105 shadow-md">
              WhatsApp <span class="material-symbols-outlined text-[16px]">open_in_new</span>
            </a>
            <button type="button" class="gastro-share-btn inline-flex w-fit items-center gap-1.5 px-5 py-3 bg-white text-river-teal border border-neutral-200 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-river-teal hover:text-white transition-all shadow-sm" data-share-id="${id}" data-share-name="${nombre.replace(/"/g, '&quot;')}" onclick="event.stopPropagation()">
              <span class="material-symbols-outlined text-[16px]">share</span> Compartir
            </button>
          </div>
        </div>
      </article>
    `;
  }

  let data = Array.isArray(window.gastronomiaData) ? window.gastronomiaData : [];
  let ratingsLoaded = false;
  try {
    const res = await fetch(`/api/data`);
    if (res.ok) {
      const payload = await res.json();
      if (Array.isArray(payload.gastronomia) && payload.gastronomia.length) {
        data = payload.gastronomia;
      }
      if (window.VsrRatings && payload.ratings) { VsrRatings.setRatings(payload.ratings); ratingsLoaded = true; }
    }
  } catch (err) {
    console.info('Usando gastronomía local por fallback', err.message);
  }
  if (window.VsrRatings && !ratingsLoaded) { try { await VsrRatings.load(); } catch (_) {} }

  const items = Array.isArray(data) ? data : Object.values(data || {});
  grid.innerHTML = items.map(crearCard).join("");

  // Redirigir a la landing de cada comercio al hacer click en la tarjeta (abre en nueva pestaña)
  grid.querySelectorAll('article[data-gastro-id]').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.vsr-interactive, .geo-btn, .gastro-share-btn, a[href*="wa.me"], a[href^="comercio.html"]')) {
        return;
      }
      const id = card.dataset.gastroId;
      window.open(`comercio.html?id=${id}`, '_blank');
    });
  });

  // Calificaciones interactivas por local.
  if (window.VsrRatings) VsrRatings.mountAllInteractive(grid);

  // Botón compartir por tarjeta (permalink ?g=<id>).
  grid.querySelectorAll('.gastro-share-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.VsrShare) return;
      const r = await VsrShare.share('g', btn.dataset.shareId, btn.dataset.shareName);
      if (r && r.method === 'clipboard') {
        const original = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">check</span> ¡Copiado!';
        setTimeout(() => { btn.innerHTML = original; }, 1800);
      }
    });
  });

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

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  }, { threshold: 0.05 });

  document.querySelectorAll("#gastronomia-grid .fade-in-up").forEach(card => observer.observe(card));
});
