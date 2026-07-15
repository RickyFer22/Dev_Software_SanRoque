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
    const servicios = (local.servicios || [])
      .map(servicio => `<li class="bg-neutral-100 px-3 py-1.5 rounded-md text-[11px] font-bold text-neutral-700 uppercase tracking-wider leading-tight">${serviceLabels[servicio] || servicio}</li>`)
      .join("");

    return `
      <article class="relative group bg-canvas-white rounded-2xl overflow-hidden border border-outline-variant/30 shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer min-h-[620px] lg:min-h-[430px] card-item fade-in-up">
        <div class="absolute inset-0 w-full h-[40%] lg:h-full transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] lg:group-hover:w-[45%] z-0">
          <img src="${local.imagen || local.mainImg}" alt="${local.nombre || local.titulo}" class="w-full h-full object-cover img-zoom" loading="lazy" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-500 hidden lg:block lg:group-hover:opacity-0"></div>
        </div>

        <div class="absolute top-4 left-4 z-20 bg-moss-dark/90 text-canvas-white text-[10px] font-label-caps uppercase px-3 py-1.5 rounded-full tracking-wider font-bold shadow-md">Gastronomía</div>

        <div class="absolute inset-x-0 bottom-0 top-[40%] lg:top-0 lg:left-[45%] lg:right-0 bg-canvas-white p-5 sm:p-6 md:p-8 flex flex-col justify-center lg:opacity-0 lg:translate-x-8 lg:group-hover:opacity-100 lg:group-hover:translate-x-0 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] z-10 border-t lg:border-t-0 border-neutral-100">
          <h2 class="text-primary text-[21px] sm:text-[22px] font-bold font-headline-md mb-2 leading-tight">${local.nombre || local.titulo}</h2>

          <div class="flex flex-wrap gap-3 text-[12px] text-neutral-600 font-bold mb-4 leading-tight">
            <span class="inline-flex items-center gap-1.5">
              <span class="material-symbols-outlined text-golden-sand text-[18px]">schedule</span>${local.horario || local.hora || 'Horario a confirmar'}</span>
            <span class="inline-flex items-center gap-1.5">
              <span class="material-symbols-outlined text-river-teal text-[18px]">location_on</span>${local.ubicacion || local.direccion || local.lugar || 'San Roque'}</span>
          </div>

          <p class="text-neutral-600 text-[14px] mb-4 leading-relaxed">${local.descripcion || ''}</p>

          <ul class="flex flex-wrap gap-1.5 mb-4">${servicios}</ul>

          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((local.ubicacion || local.direccion || local.lugar || 'San Roque') + ", San Roque, Corrientes")}" target="_blank" onclick="event.stopPropagation()" class="geo-btn mb-4 w-fit">
            <span class="material-symbols-outlined">location_on</span> Ver en mapa
          </a>

          <a href="https://wa.me/${local.whatsapp || local.waNumber || ''}" target="_blank" onclick="event.stopPropagation()" class="mt-auto inline-flex w-fit items-center gap-1.5 px-6 py-3 bg-river-teal text-white rounded-full font-bold text-xs uppercase tracking-wider hover:bg-primary transition-all duration-300 hover:scale-105 shadow-md">
            WhatsApp <span class="material-symbols-outlined text-[16px]">open_in_new</span>
          </a>
        </div>
      </article>
    `;
  }

  let data = Array.isArray(window.gastronomiaData) ? window.gastronomiaData : [];
  try {
    const backendBase = window.location.port === '4000' ? '' : 'http://127.0.0.1:4000';
    const res = await fetch(`${backendBase}/api/data`);
    if (res.ok) {
      const payload = await res.json();
      if (Array.isArray(payload.gastronomia) && payload.gastronomia.length) {
        data = payload.gastronomia;
      } else if (payload && typeof payload === 'object' && Array.isArray(payload.gastronomia)) {
        data = payload.gastronomia;
      }
    }
  } catch (err) {
    console.info('Usando gastronomía local por fallback', err.message);
  }

  const items = Array.isArray(data) ? data : Object.values(data || {});
  grid.innerHTML = items.map(crearCard).join("");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  }, { threshold: 0.05 });

  document.querySelectorAll("#gastronomia-grid .fade-in-up").forEach(card => observer.observe(card));
});
