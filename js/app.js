let map;
let mapUrbanLayer;
const mapMarkers = {};

// Límite urbano de San Roque (OpenStreetMap relation 9389182, simplificado para uso web).
const SAN_ROQUE_URBAN_TRACE = {
  type: 'Feature',
  properties: { name: 'Traza urbana de San Roque' },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-58.721909, -28.576320], [-58.721871, -28.580627], [-58.721772, -28.589526],
      [-58.717848, -28.587045], [-58.714684, -28.585054], [-58.709754, -28.584441],
      [-58.705041, -28.583948], [-58.700555, -28.583441], [-58.697238, -28.583051],
      [-58.696455, -28.582377], [-58.695684, -28.577030], [-58.695883, -28.576023],
      [-58.700914, -28.569988], [-58.703005, -28.567539], [-58.702859, -28.566762],
      [-58.704318, -28.565320], [-58.707805, -28.566912], [-58.708674, -28.565744],
      [-58.709639, -28.565357], [-58.711463, -28.565612], [-58.712111, -28.564952],
      [-58.715825, -28.566296], [-58.717642, -28.569516], [-58.721385, -28.571117],
      [-58.721739, -28.572516], [-58.721909, -28.576320]
    ]]
  }
};

function isAccommodationVisible(item) {
  if (!item) return false;
  const value = item.activo;
  if (value === 0 || value === '0' || value === false || value === 'false' || value === 'inactivo' || value === 'oculto' || value === 'hidden') {
    return false;
  }
  return true;
}

// alojamientosData también contiene lugares y servicios (farmacias, iglesias,
// policía, museos): solo los hospedajes van al listado, al mapa y al asistente.
const NON_LODGING_CATEGORIES = ['lugar', 'servicio', 'iglesia', 'salud', 'farmacia'];
function isLodging(item) {
  return !!item && !NON_LODGING_CATEGORIES.includes(item.categoria);
}

function isSanRoqueCoordinate(coords) {
  if (!Array.isArray(coords) || coords.length < 2) return false;
  const latitude = Number(coords[0]);
  const longitude = Number(coords[1]);
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -28.65 && latitude <= -28.50
    && longitude >= -58.80 && longitude <= -58.60;
}

function initMap() {
  if (!document.getElementById('main-map')) return;

  Object.keys(mapMarkers).forEach((id) => {
    const entry = mapMarkers[id];
    if (entry && entry.marker && map && map.hasLayer(entry.marker)) {
      map.removeLayer(entry.marker);
    }
    delete mapMarkers[id];
  });

  if (!map) {
    map = L.map('main-map', { scrollWheelZoom: false, zoomControl: true }).setView([-28.5744, -58.7083], 15);
    // Vista satelital con etiquetas (por defecto) + plano ilustrado CARTO.
    const sateliteBase = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Imágenes &copy; Esri &amp; colaboradores'
    });
    const sateliteEtiquetas = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; CARTO &copy; OpenStreetMap'
    });
    const vistaSatelite = L.layerGroup([sateliteBase, sateliteEtiquetas]);
    const vistaPlano = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; CARTO &copy; OpenStreetMap'
    });
    vistaSatelite.addTo(map);
    L.control.layers({ 'Satélite': vistaSatelite, 'Plano': vistaPlano }, null, { position: 'topright', collapsed: false }).addTo(map);
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);
  }

  if (mapUrbanLayer && map.hasLayer(mapUrbanLayer)) map.removeLayer(mapUrbanLayer);
  mapUrbanLayer = L.geoJSON(SAN_ROQUE_URBAN_TRACE, {
    style: {
      className: 'map-urban-trace',
      color: '#F2C14E',
      weight: 4,
      opacity: 0.98,
      fillColor: '#F5D98A',
      fillOpacity: 0.08,
      dashArray: '10 7'
    }
  }).addTo(map);
  mapUrbanLayer.bindTooltip('Traza urbana de San Roque', { sticky: true, className: 'map-trace-tooltip' });

  const lodgingBounds = L.latLngBounds([]);
  const accommodationIcon = L.divIcon({
    className: 'accommodation-map-marker',
    html: '<span class="material-symbols-outlined" aria-hidden="true">bed</span>',
    iconSize: [38, 44],
    iconAnchor: [19, 42],
    popupAnchor: [0, -40]
  });

  for(const [id,data] of Object.entries(alojamientosData)) {
    if(isSanRoqueCoordinate(data.coords) && isAccommodationVisible(data) && isLodging(data)) {
      const marker = L.marker(data.coords, { icon: accommodationIcon, title: data.titulo }).addTo(map);
      lodgingBounds.extend(data.coords);
      const mAvg = window.VsrRatings && VsrRatings.getAverage('alojamiento', id);
      const mRating = (mAvg && mAvg.count > 0)
        ? `<div class="text-golden-sand text-[11px] mb-3 font-bold">★ ${mAvg.average.toFixed(1)} <span class="text-neutral-400 font-medium">(${mAvg.count})</span></div>`
        : `<div class="text-neutral-400 text-[11px] mb-3">Sin calificaciones aún</div>`;
      marker.bindPopup(`<div class="text-center min-w-[160px] p-1"><img src="${data.mainImg}" class="w-full h-24 object-cover rounded-xl mb-3 shadow-sm"/><h3 class="font-bold text-primary text-[15px] leading-tight mb-1">${data.titulo}</h3>${mRating}<button onclick="navigateToDetails('${id}')" class="bg-river-teal text-white text-xs px-4 py-2 rounded-full font-bold w-full hover:bg-primary transition-colors">VER DETALLE</button></div>`);
      mapMarkers[id] = {marker,category:data.categoria};
    }
  }

  // Encuadre sobre los hospedajes; si todavía no hay ninguno, sobre la traza urbana.
  const bounds = lodgingBounds.isValid() ? lodgingBounds : mapUrbanLayer.getBounds();
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [56, 56], maxZoom: 16 });
}

function renderStars(ratingStr) {
  const rating = parseFloat(ratingStr); let html='';
  for(let i=1;i<=5;i++){
    if(rating>=i) html+='<span class="material-symbols-outlined filled text-[20px]">star</span>';
    else if(rating>=i-0.5) html+='<span class="material-symbols-outlined filled text-[20px]">star_half</span>';
    else html+='<span class="material-symbols-outlined text-[20px] text-neutral-300">star</span>';
  } return html;
}

// ═══ VOTING ═══
async function submitVote(itemType, itemId, rating) {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemType, itemId, rating })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo registrar el voto');
    return data;
  } catch (err) {
    console.error('[vote]', err);
    return { ok: false, error: err.message };
  }
}

function initVotingForContainer(container) {
  const accId = container.getAttribute('data-id'); if(!accId) return;
  const savedVotes = JSON.parse(localStorage.getItem('userVotes')||'{}');
  const stars = container.querySelectorAll('.star-btn');
  const label = container.querySelector('.vote-label');
  container.classList.remove('pointer-events-none','bg-teal-50','border-teal-200');
  if(label){label.textContent='Votar';label.classList.remove('text-river-teal');label.classList.add('text-neutral-500');}
  stars.forEach(s=>s.querySelector('span').className='material-symbols-outlined text-[16px] md:text-[22px] text-neutral-300 transition-colors');
  const lockVote=(val)=>{
    container.classList.add('pointer-events-none','bg-teal-50','border-teal-200');
    if(label){label.textContent='¡Votado!';label.classList.replace('text-neutral-500','text-river-teal');}
    stars.forEach((s,i)=>{const icon=s.querySelector('span');if(i<val){icon.classList.add('filled','text-golden-sand');icon.classList.remove('text-neutral-300');}else{icon.classList.remove('filled','text-golden-sand');icon.classList.add('text-neutral-300');}});
  };
  if(savedVotes[accId]){lockVote(savedVotes[accId]);return;}
  if(container.dataset.listenerAttached) return;
  container.dataset.listenerAttached='true';
  stars.forEach((star,index)=>{
    star.addEventListener('mouseover',()=>{if(JSON.parse(localStorage.getItem('userVotes')||'{}')[accId]) return;stars.forEach((s,i)=>{const icon=s.querySelector('span');if(i<=index){icon.classList.add('filled','text-golden-sand');icon.classList.remove('text-neutral-300');}else{icon.classList.remove('filled','text-golden-sand');icon.classList.add('text-neutral-300');}});});
    star.addEventListener('mouseout',()=>{if(JSON.parse(localStorage.getItem('userVotes')||'{}')[accId]) return;stars.forEach(s=>{const icon=s.querySelector('span');icon.classList.remove('filled','text-golden-sand');icon.classList.add('text-neutral-300');});});
    star.addEventListener('click', async (e)=>{e.stopPropagation();const cv=JSON.parse(localStorage.getItem('userVotes')||'{}');if(cv[accId]) return;const val=index+1;cv[accId]=val;localStorage.setItem('userVotes',JSON.stringify(cv));const result = await submitVote('alojamiento', accId, val);document.querySelectorAll(`.interactive-stars[data-id="${accId}"]`).forEach(c=>{const l=c.querySelector('.vote-label');c.classList.add('pointer-events-none','bg-teal-50','border-teal-200');if(l){l.textContent = result.ok ? '¡Votado!' : 'Intenta más tarde';l.classList.replace('text-neutral-500', result.ok ? 'text-river-teal' : 'text-red-500');}c.querySelectorAll('.star-btn span').forEach((icon,i)=>{if(i<val){icon.classList.add('filled','text-golden-sand');icon.classList.remove('text-neutral-300');icon.style.transform='scale(1.3)';setTimeout(()=>icon.style.transform='scale(1)',200);}else{icon.classList.remove('filled','text-golden-sand');icon.classList.add('text-neutral-300');}});});});
  });
}

// Muestra el PROMEDIO de votos (o el rating base como fallback) en el detalle.
function updateDetailRating(id) {
  const avg = window.VsrRatings && VsrRatings.getAverage('alojamiento', id);
  const hasVotes = avg && avg.count > 0;
  const starsEl = document.getElementById('det-rating-stars');
  const numEl = document.getElementById('det-rating-number');
  const revEl = document.getElementById('det-reviews-count');
  const summaryEl = document.getElementById('det-rating-summary');
  // Solo se muestran calificaciones REALES del sistema de votos; sin votos → el bloque queda oculto.
  if (summaryEl) summaryEl.style.display = hasVotes ? '' : 'none';
  if (starsEl) starsEl.innerHTML = window.VsrRatings ? VsrRatings.starsHtml(hasVotes ? avg.average : 0, 20) : renderStars(hasVotes ? avg.average : 0);
  if (numEl) numEl.textContent = hasVotes ? avg.average.toFixed(1) : '';
  if (revEl) revEl.textContent = hasVotes ? `${avg.count} ${avg.count === 1 ? 'voto' : 'votos'}` : '';
  if (starsEl && !hasVotes) {
    starsEl.innerHTML = '';
  }
  if (numEl && !hasVotes) {
    numEl.textContent = '';
  }
}

// ═══ SPA NAV ═══
function navigateToDetails(id, skipPush) {
  const data = alojamientosData[id]; if(!data) return;
  document.getElementById('main-explorer-view').classList.replace('block','hidden');
  const detView = document.getElementById('detailed-accommodation-view');
  document.querySelector('.tourism-skip-link')?.setAttribute('href', '#detailed-accommodation-view');
  detView.classList.replace('hidden','block');
  detView.classList.remove('animate-view-in'); void detView.offsetWidth; detView.classList.add('animate-view-in');
  document.getElementById('mobile-sticky-contact').classList.replace('hidden','block');
  window.scrollTo({top:0,behavior:'smooth'});
  document.getElementById('det-title').textContent=data.titulo;
  updateDetailRating(id, data);
  document.getElementById('det-location').textContent=data.ubicacion;
  const detMapLink = document.getElementById('det-map-link');
  if (detMapLink) {
    if (data.mapsLink || data.mapUrl) {
      detMapLink.href = data.mapsLink || data.mapUrl;
      detMapLink.style.display = '';
    } else if (data.coords && data.coords.length === 2) {
      detMapLink.href = `https://www.google.com/maps/search/?api=1&query=${data.coords[0]},${data.coords[1]}`;
      detMapLink.style.display = '';
    } else {
      detMapLink.removeAttribute('href');
      detMapLink.style.display = 'none';
    }
  }
  const description = data.descripcionLarga || data.descripcion || '';
  document.getElementById('det-long-desc').textContent=description;
  const descriptionSection=document.getElementById('det-description-section');
  if(descriptionSection) descriptionSection.hidden=!description;
  document.getElementById('det-main-img').src=data.mainImg;
  const detStars=document.getElementById('det-interactive-stars');
  // Reemplaza el widget viejo por el módulo compartido de calificaciones.
  detStars.className='vsr-interactive';
  detStars.setAttribute('data-type','alojamiento');
  detStars.setAttribute('data-id',id);
  delete detStars.dataset.vsrMounted;
  detStars.innerHTML='';
  if (window.VsrRatings) VsrRatings.mountInteractive(detStars, ()=>updateDetailRating(id, data));
  const shareBtn=document.getElementById('det-share-btn');
  if (shareBtn && window.VsrShare) shareBtn.onclick=async ()=>{
    const r=await VsrShare.share('h', id, data.titulo);
    const lbl=document.getElementById('det-share-label');
    if (lbl && r && r.method==='clipboard') { lbl.textContent='¡Enlace copiado!'; setTimeout(()=>{ lbl.textContent='Compartir'; },1800); }
  };
  if (!skipPush && window.VsrShare) { try { history.pushState({h:id}, '', VsrShare.buildUrl('h', id)); } catch(_){} }
  const thumbContainer=document.getElementById('det-gallery-thumbs'); thumbContainer.innerHTML='';
  const richGallery=Array.isArray(data.mediaGallery)?data.mediaGallery:[];
  const galeria=[...new Set(richGallery.length?richGallery.map((entry)=>entry.variants?.large?.url||entry.url).filter(Boolean):[data.mainImg,...(Array.isArray(data.galeria)?data.galeria:[])].filter(Boolean))];
  galeria.forEach((imgUrl,i)=>{const btn=document.createElement('button');btn.className=`snap-center w-[130px] md:w-full h-20 rounded-xl overflow-hidden shrink-0 border-[3px] transition-all hover:scale-105 active:scale-95 ${i===0?'border-primary':'border-transparent opacity-80 hover:opacity-100'}`;btn.setAttribute('aria-label',`Ver fotografía ${i+1}`);const img=document.createElement('img');img.className='w-full h-full object-cover';img.src=imgUrl;img.alt='';img.loading='lazy';btn.appendChild(img);btn.onclick=()=>{document.getElementById('det-main-img').src=imgUrl;Array.from(thumbContainer.children).forEach(b=>b.classList.replace('border-primary','border-transparent'));btn.classList.replace('border-transparent','border-primary');};thumbContainer.appendChild(btn);});
  // Distribución/Capacidad y Servicios: ocultar la sección si no hay datos (evita headers huérfanos).
  const capList=Array.isArray(data.capacidad)?data.capacidad:[];
  const capSec=document.getElementById('det-capacity-section');
  document.getElementById('det-capacity-list').innerHTML=capList.map(c=>`<div class="capacity-row"><span class="material-symbols-outlined text-river-teal mt-0.5 text-[22px]">${c.icono||'chevron_right'}</span><div><div class="font-bold text-neutral-800 text-sm">${c.titulo||''}</div>${c.desc?`<div class="text-neutral-500 text-[13px] mt-0.5">${c.desc}</div>`:''}</div></div>`).join('');
  if (capSec) capSec.style.display = capList.length ? '' : 'none';
  const svcList=Array.isArray(data.servicios)?data.servicios:[];
  const svcSec=document.getElementById('det-services-section');
  document.getElementById('det-services-grid').innerHTML=svcList.map(s=>`<div class="service-badge"><span class="material-symbols-outlined text-[18px] text-river-teal">${s.icono||'check_circle'}</span><span>${s.texto||s}</span></div>`).join('');
  if (svcSec) svcSec.style.display = svcList.length ? '' : 'none';
  document.getElementById('det-checkin').textContent=data.checkin||''; document.getElementById('det-checkout').textContent=data.checkout||''; document.getElementById('det-cancellation').textContent=data.cancelacion||'';
  const policiesSection=document.getElementById('det-policies-section');
  if(policiesSection) policiesSection.hidden=![data.checkin,data.checkout,data.cancelacion].some(Boolean);
  setContactButtons(data);
}

// Configura teléfono y WhatsApp con enlaces válidos. Si el alojamiento no tiene
// número cargado, se OCULTA el botón (nunca se generan tel:/wa.me rotos ni se
// promete un contacto que no existe).
function setContactButtons(data) {
  const digits = (v) => String(v == null ? '' : v).replace(/[^\d+]/g, '');
  const phone = digits(data.telefono);
  const wa = digits(data.waNumber || data.telefono);
  const setBtn = (elId, href) => {
    const el = document.getElementById(elId);
    if (!el) return;
    // Se usa style.display (no la clase .hidden) para no pisar utilidades
    // responsive como "hidden lg:flex" cuando el botón sí debe mostrarse.
    if (href) { el.href = href; el.style.display = ''; el.removeAttribute('aria-hidden'); }
    else { el.removeAttribute('href'); el.style.display = 'none'; el.setAttribute('aria-hidden', 'true'); }
  };
  const waUrl = wa ? `https://wa.me/${wa.replace(/^\+/, '')}?text=${encodeURIComponent(`Hola! Vi tu alojamiento "${data.titulo}" en el portal de San Roque...`)}` : '';
  setBtn('det-wa-btn-desktop', waUrl);
  setBtn('det-wa-btn-mobile', waUrl);
  setBtn('det-phone-btn', phone ? `tel:${phone}` : '');
}

function backToGrid() {
  document.getElementById('detailed-accommodation-view').classList.replace('block','hidden');
  document.getElementById('mobile-sticky-contact').classList.replace('block','hidden');
  // Antes reusaba location.pathname: con la URL amigable /hospedajes/<id>
  // eso dejaba la barra en /hospedajes/<id> aunque la grilla ya estuviera
  // visible. Al cerrar el detalle se vuelve al listado, que tiene URL propia.
  try { history.pushState({}, '', '/donde-alojarme'); } catch(_){}
  const mainView=document.getElementById('main-explorer-view');
  document.querySelector('.tourism-skip-link')?.setAttribute('href', '#main-explorer-view');
  mainView.classList.replace('hidden','block');
  mainView.classList.remove('animate-view-in'); void mainView.offsetWidth; mainView.classList.add('animate-view-in');
  window.scrollTo({top:0,behavior:'smooth'});
  if(map){setTimeout(()=>map.invalidateSize(),100);}
}

function createAccommodationCard(id, data) {
  const image = data.mainImg || (Array.isArray(data.galeria) && data.galeria[0]) || 'img/hero.jpg.jpg';
  const categoryLabel = data.categoria === 'hotel' ? 'Hotel' : data.categoria === 'hospedaje' ? 'Hospedaje' : 'Alojamiento';
  const description = data.descripcionLarga || 'Alojamiento cómodo y bien ubicado en San Roque.';
  const services = Array.isArray(data.servicios) && data.servicios.length
    ? data.servicios.slice(0, 3).map(s => s.texto || s).join(' · ')
    : 'WiFi · comodidad · buena ubicación';
  const avg = window.VsrRatings && VsrRatings.getAverage('alojamiento', id);
  const hasVotes = avg && avg.count > 0;
  const ratingBadge = hasVotes
    ? `<div class="flex items-center gap-1 text-golden-sand font-bold text-sm"><span class="material-symbols-outlined text-[16px]">star</span>${avg.average.toFixed(1)} <span class="text-neutral-400 font-medium">(${avg.count})</span></div>`
    : `<div class="text-[11px] text-neutral-400 font-medium">Sin calificaciones aún</div>`;
  return `
    <article class="relative group bg-canvas-white rounded-[28px] overflow-hidden border border-outline-variant/30 shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer min-h-[560px] sm:min-h-[520px] card-item fade-in-up" data-category="${data.categoria || 'hospedaje'}" data-aos="fade-up" data-aos-duration="700">
      <div onclick="navigateToDetails('${id}')" class="absolute inset-0 h-[42%] sm:h-[46%] lg:h-full transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] lg:group-hover:w-[45%] z-0">
        <img src="${image}" alt="${data.titulo}" class="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-500 hidden lg:block lg:group-hover:opacity-0"></div>
      </div>
      <div class="absolute inset-x-0 bottom-0 top-[42%] sm:top-[46%] lg:top-0 lg:left-[45%] lg:right-0 bg-canvas-white p-5 sm:p-6 md:p-8 flex flex-col justify-center lg:opacity-0 lg:translate-x-8 lg:group-hover:opacity-100 lg:group-hover:translate-x-0 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] z-10 border-t lg:border-t-0 border-neutral-100">
        <div class="flex items-center justify-between gap-3 mb-4">
          <span class="text-[11px] uppercase tracking-[0.2em] text-river-teal font-bold">${categoryLabel}</span>
          ${ratingBadge}
        </div>
        <h3 class="text-xl font-bold text-primary leading-tight">${data.titulo}</h3>
        <p class="text-sm text-neutral-600 leading-relaxed">${description}</p>
        <div class="text-sm text-neutral-500 mt-3">${services}</div>
        <div class="flex items-center justify-between mt-6">
          <div class="text-sm text-neutral-500">📍 ${data.ubicacion || 'San Roque'}</div>
          <div class="flex items-center gap-2">
            ${window.VsrVisita ? VsrVisita.buttonHtml('h', id, data.titulo || 'Alojamiento', data.categoria || '') : ''}
            <button onclick="event.stopPropagation(); navigateToDetails('${id}')" class="px-4 py-2 rounded-full bg-river-teal text-white text-xs font-bold uppercase tracking-wider hover:bg-primary transition-all">Ver detalle</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderAccommodationCards() {
  const carousel = document.getElementById('accommodations-carousel');
  const toggleBtn = document.getElementById('btn-ver-mas-alojamientos');
  if (!carousel) return;

  const items = Object.entries(alojamientosData || {})
    .filter(([id, item]) => item && item.coords && isAccommodationVisible(item) && isLodging(item))
    .map(([id, item]) => ({ id, item }));

  if (!items.length) {
    carousel.innerHTML = '<div class="col-span-full text-center rounded-3xl border border-dashed border-neutral-300 bg-white/70 px-6 py-10 text-neutral-600">No hay hospedajes disponibles por el momento.</div>';
    if (toggleBtn) toggleBtn.classList.add('hidden');
    return;
  }

  let expanded = false;

  const renderCards = (list) => {
    carousel.innerHTML = list.map(({ id, item }) => `<div class="w-full">${createAccommodationCard(id, item)}</div>`).join('');
    window.VsrVisita?.refresh();

    document.querySelectorAll('.card-item').forEach((card) => {
      card.addEventListener('touchstart', () => card.classList.add('touch-active'), { passive: true });
      card.addEventListener('touchend', () => card.classList.remove('touch-active'));
      card.addEventListener('touchcancel', () => card.classList.remove('touch-active'));
    });

    if (window.AOS) window.AOS.refreshHard();
  };

  if (items.length > 3) {
    renderCards(items.slice(0, 3));
    if (toggleBtn) {
      toggleBtn.classList.remove('hidden');
      toggleBtn.textContent = expanded ? 'Ocultar' : 'Ver más';
      toggleBtn.onclick = () => {
        expanded = !expanded;
        renderCards(expanded ? items : items.slice(0, 3));
        toggleBtn.textContent = expanded ? 'Ocultar' : 'Ver más';
      };
    }
  } else {
    renderCards(items);
    if (toggleBtn) toggleBtn.classList.add('hidden');
  }
}

// ═══ DOMCONTENTLOADED ═══
let uiInitialized = false;

document.addEventListener("DOMContentLoaded",()=>{
  const observer=new IntersectionObserver((entries)=>{entries.forEach(e=>{if(e.isIntersecting) e.target.classList.add('visible');});},{threshold:0.05});
  document.querySelectorAll('.fade-in-up').forEach(el=>observer.observe(el));

  const mobileToggle=document.getElementById('mobile-menu-toggle');
  const mobilePanel=document.getElementById('mobile-nav-panel');
  if (mobileToggle && mobilePanel) {
    const setMobileMenuOpen=(open)=>{
      mobilePanel.classList.toggle('hidden', !open);
      mobileToggle.setAttribute('aria-expanded', String(open));
      mobileToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      const icon=mobileToggle.querySelector('span');
      if(icon) icon.textContent=open ? 'close' : 'menu';
    };
    mobileToggle.addEventListener('click',()=>{
      const isHidden=mobilePanel.classList.contains('hidden');
      setMobileMenuOpen(isHidden);
    });
    mobilePanel.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{
      setMobileMenuOpen(false);
    }));
    document.addEventListener('keydown',(event)=>{
      if(event.key==='Escape' && !mobilePanel.classList.contains('hidden')){
        setMobileMenuOpen(false);
        mobileToggle.focus();
      }
    });
    document.addEventListener('click',(event)=>{
      if(!mobilePanel.classList.contains('hidden') && !mobilePanel.contains(event.target) && !mobileToggle.contains(event.target)){
        setMobileMenuOpen(false);
      }
    });
  }

  // Inicializar el mapa y tarjetas cuando los datos estén listos
  // (el evento 'appDataReady' lo dispara data.js al terminar fetch o fallback)
  const initUI = () => {
    if (!uiInitialized) {
      if (window.AOS) {
        AOS.init({ once: true, duration: 700, easing: 'ease-out-cubic', offset: 80, mirror: false });
      }
      uiInitialized = true;
    }
    initMap();
    renderAccommodationCards();
    const filterBtns=document.querySelectorAll('.filter-btn');const cards=document.querySelectorAll('.card-item');
    if (!filterBtns.length) return;

    filterBtns.forEach((btn) => {
      btn.onclick = () => {
        filterBtns.forEach((b) => {
          b.classList.remove('bg-river-teal','text-canvas-white','shadow-sm');
          b.classList.add('bg-surface-container','text-on-surface-variant');
        });
        btn.classList.remove('bg-surface-container','text-on-surface-variant');
        btn.classList.add('bg-river-teal','text-canvas-white','shadow-sm');
        const f = btn.getAttribute('data-filter');
        cards.forEach((card) => {
          card.style.display = (f === 'all' || card.getAttribute('data-category') === f) ? 'block' : 'none';
        });
        for (const [id, markerObj] of Object.entries(mapMarkers)) {
          if (f === 'all' || markerObj.category === f) {
            if (!map.hasLayer(markerObj.marker)) map.addLayer(markerObj.marker);
          } else {
            if (map.hasLayer(markerObj.marker)) map.removeLayer(markerObj.marker);
          }
        }
      };
    });
  };

  const openFromPermalink = () => {
    const requested = window.VsrShare && VsrShare.paramFromUrl('h');
    const id = requested && (alojamientosData[requested] ? requested : Object.keys(alojamientosData).find((key) => alojamientosData[key]?.slug === requested));
    if (id) navigateToDetails(id, true);
  };

  document.addEventListener('appDataReady', async (e) => {
    // Si la API trae ratings, cargarlos en el módulo antes de renderizar.
    if (window.VsrRatings) {
      if (e.detail && e.detail.ratings) VsrRatings.setRatings(e.detail.ratings);
      else await VsrRatings.load();
    }
    // Si la API devolvió datosUtiles, fusionarlos con los locales
    const apiDU = e.detail && e.detail.datosUtiles;
    if (apiDU) {
      for (const [cat, val] of Object.entries(apiDU)) {
        if (val && typeof val === 'object') {
          datosUtilesInfo[cat] = { ...datosUtilesInfo[cat], ...val };
        }
      }
    }
    initUI();
    openFromPermalink();
  });

  // La API local puede responder antes de que este controlador termine de
  // registrarse; inicializar también desde el snapshot ya disponible evita
  // perder el permalink en conexiones rápidas o durante el fallback.
  if (window.appData && window.appData.alojamientos) {
    initUI();
    openFromPermalink();
  }

  window.addEventListener('popstate', () => {
    const requested = window.VsrShare && VsrShare.paramFromUrl('h');
    const id = requested && (alojamientosData[requested] ? requested : Object.keys(alojamientosData).find((key) => alojamientosData[key]?.slug === requested));
    if (id && alojamientosData[id]) navigateToDetails(id, true);
    else backToGrid();
  });

  // Fallback: si appDataReady no llega en 6s (red muy lenta), inicializar igual
  const fallbackTimer = setTimeout(() => {
    if (!map) initUI();
  }, 6000);
  document.addEventListener('appDataReady', () => clearTimeout(fallbackTimer), { once: true });

  window.addEventListener('scroll',()=>{const nav=document.getElementById('main-nav');if(window.scrollY>50){nav.classList.add('bg-primary/95','backdrop-blur-md','shadow-md','py-4');nav.classList.remove('bg-gradient-to-b','from-black/60','to-transparent','pt-6','pb-6');}else{nav.classList.remove('bg-primary/95','backdrop-blur-md','shadow-md','py-4');nav.classList.add('bg-gradient-to-b','from-black/60','to-transparent','pt-6','pb-6');}});
  document.querySelectorAll('.interactive-stars').forEach(initVotingForContainer);
  loadWeather();

});


function ts2h(unix,offset){const d=new Date((unix+offset)*1000);return String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0');}

function mapWeatherCode(code){
  if(code.includes('01')) return 'light_mode';
  if(code.includes('02')||code.includes('03')||code.includes('04')) return 'cloud';
  if(code.includes('09')||code.includes('10')) return 'rainy';
  if(code.includes('11')) return 'thunderstorm';
  if(code.includes('13')) return 'ac_unit';
  if(code.includes('50')) return 'foggy';
  return 'light_mode';
}

function weatherCodeInfo(code){
  if([0,1].includes(code)) return { icon:'light_mode', desc:'cielo despejado' };
  if([2,3].includes(code)) return { icon:'cloud', desc:'parcialmente nublado' };
  if([45,48].includes(code)) return { icon:'foggy', desc:'neblina' };
  if([51,53,55,61,63,65,80,81,82].includes(code)) return { icon:'rainy', desc:'lluvia' };
  if([95,96,99].includes(code)) return { icon:'thunderstorm', desc:'tormenta' };
  return { icon:'cloud', desc:'clima actual' };
}

function updateWeatherUI({ icon, temp, desc, humidity, wind, feels, pressure }){
  const iconEl = document.getElementById('weather-icon-top');
  const tempTop = document.getElementById('weather-temp-top');
  const wpTemp = document.getElementById('wp-temp');
  const wpDesc = document.getElementById('wp-desc');
  const wpIcon = document.getElementById('wp-icon');
  const wpHum = document.getElementById('wp-hum');
  const wpWind = document.getElementById('wp-wind');
  const wpFeel = document.getElementById('wp-feel');
  const wpPressure = document.getElementById('wp-pressure');
  const wpDate = document.getElementById('wp-date');
  if(iconEl) iconEl.textContent = icon;
  if(tempTop) tempTop.textContent = `${Math.round(temp)}°`;
  if(wpTemp) wpTemp.textContent = `${Math.round(temp)}°C`;
  if(wpDesc) wpDesc.textContent = desc;
  if(wpIcon) wpIcon.textContent = icon;
  if(wpHum) wpHum.textContent = `${humidity}%`;
  if(wpWind) wpWind.textContent = `${Math.round(wind)} km/h`;
  if(wpFeel) wpFeel.textContent = `${Math.round(feels)}°C`;
  if(wpPressure) wpPressure.textContent = Number.isFinite(Number(pressure)) ? `${Math.round(Number(pressure))} hPa` : '-- hPa';
  if(wpDate) wpDate.textContent = new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'});
}

async function loadWeather() {
  const fallback = async () => {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=-28.5768&longitude=-58.7168&current=temperature_2m%2Crelative_humidity_2m%2Capparent_temperature%2Csurface_pressure%2Cweather_code%2Cwind_speed_10m&timezone=America%2FArgentina%2FCordoba';
    const res = await fetch(url);
    if(!res.ok) throw new Error('Open-Meteo error');
    const d = await res.json();
    if(!d.current) throw new Error('Open-Meteo missing data');
    const info = weatherCodeInfo(d.current.weather_code);
    updateWeatherUI({
      icon: info.icon,
      temp: d.current.temperature_2m,
      desc: info.desc,
      humidity: d.current.relative_humidity_2m ?? '--',
      wind: d.current.wind_speed_10m ?? 0,
      feels: d.current.apparent_temperature ?? d.current.temperature_2m,
      pressure: d.current.surface_pressure ?? '--'
    });
  };

  try {
    const res = await fetch(`${BACKEND_BASE}/api/weather?lat=-28.5768&lon=-58.7168`);
    if(!res.ok) throw new Error('Backend weather error');
    const d = await res.json();
    if(d.error || !d.weather || !d.weather[0] || !d.main) throw new Error('Invalid backend weather payload');
    updateWeatherUI({
      icon: mapWeatherCode(d.weather[0].icon || ''),
      temp: d.main.temp,
      desc: d.weather[0].description || 'Clima actual',
      humidity: d.main.humidity ?? '--',
      wind: d.wind?.speed ? d.wind.speed * 3.6 : 0,
      feels: d.main.feels_like ?? d.main.temp,
      pressure: d.main.pressure ?? '--'
    });
    return;
  } catch (err) {
    console.warn('[weather] Backend failed, using Open-Meteo fallback', err.message);
    try {
      await fallback();
    } catch (fallbackErr) {
      console.error('[weather] Fallback failed', fallbackErr.message);
    }
  }
}

// ═══ INTRO SPLASH ═══
(function(){
  const splash=document.getElementById('intro-splash');
  const logo=document.getElementById('splash-logo');
  const text=document.getElementById('splash-text');
  if(!splash) return;
  if(sessionStorage.getItem('splashShown')){splash.classList.add('hidden-out');return;}
  requestAnimationFrame(()=>{setTimeout(()=>{logo.classList.add('show');text.classList.add('show');},80);});
  setTimeout(()=>{splash.classList.add('hidden-out');sessionStorage.setItem('splashShown','1');},1800);
})();

// ═══ TYPEWRITER ═══
(function(){
  const el=document.getElementById('hero-typewriter-text');
  if(!el) return;
  // Cada página define sus frases en data-phrases ("|" separa, "\n" corta línea);
  // sin ese atributo se usan las de la portada.
  const custom=(el.dataset.phrases||'').split('|').map((s)=>s.trim().replace(/\\n/g,'\n')).filter(Boolean);
  const phrases=custom.length?custom:['Bienvenido a\nSan Roque','Naturaleza, cultura\ne historia','Descubrí\nlo mejor de Corrientes'];
  let phraseIdx=0,charIdx=0,deleting=false,pauseTimer=null;
  function type(){
    if(!deleting){
      charIdx++;
      el.innerHTML=phrases[phraseIdx].slice(0,charIdx).replace('\n','<br>');
      if(charIdx===phrases[phraseIdx].length){deleting=true;clearTimeout(pauseTimer);pauseTimer=setTimeout(type,2600);return;}
      setTimeout(type,55+Math.random()*35);
    } else {
      charIdx--;
      el.innerHTML=phrases[phraseIdx].slice(0,charIdx).replace('\n','<br>');
      if(charIdx===0){deleting=false;phraseIdx=(phraseIdx+1)%phrases.length;setTimeout(type,380);return;}
      setTimeout(type,28+Math.random()*18);
    }
  }
  setTimeout(type,500);
})();

// ═══ DATOS ÚTILES E INFO CHATBOT ═══
const datosUtilesInfo = {
    remises:{
        titulo:"🚖 Remises",
        descripcion:"Servicio de remises disponibles en toda la ciudad. Te buscan donde estés.",
        contactos:[
            {nombre:"Remis choro", tel:"3777721215"},
            {nombre:"Romero ale", tel:"3777476810"},
            {nombre:"BALDOVINO", tel:"3777-711144"},
            {nombre:"PAULO", tel:"1130251880"},
            {nombre:"TELLO REMIS", tel:"3777446545"},
            {nombre:"TU REMIS", tel:"3777697065"},
            {nombre:"FONTANA", tel:"37775202117"},
            {nombre:"REMIS", tel:"37778207866"}
        ]
    },


    terminal:{
        titulo:"🚌 Terminal de Ómnibus",
        descripcion:"Terminal de colectivos de San Roque.",
        ubicacion:"https://www.google.com/maps/search/?api=1&query=-28.5767789,-58.7135694"
    },


    municipio:{
        titulo:"🏛️ Municipalidad",
        descripcion:"Atención al ciudadano y trámites municipales.",
        ubicacion:"https://www.google.com/maps/search/?api=1&query=-28.57680756168794,-58.708982356874806"
    },


    iglesias:{
        titulo:"⛪ Iglesias",
        descripcion:"Templos religiosos de San Roque.",
        lugares:[

            {
                nombre:"Parroquia San Roque de Montpellier",
                link:"https://www.google.com/maps/search/?api=1&query=-28.571590353744543,-58.711252302690546"
            },

            {
                nombre:"Iglesia Monte de Sion",
                link:"https://www.google.com/maps/search/?api=1&query=-28.575815684105844,-58.707426283145196"
            },

            {
                nombre:"Templo Filadelfia de San Roque",
                link:"https://www.google.com/maps/search/?api=1&query=-28.57730954160022,-58.70606541439768"
            },

            {
                nombre:"Salón del Reino de los Testigos de Jehová",
                link:"https://www.google.com/maps/search/?api=1&query=-28.577110361826733,-58.70697266022936"
            },

            {
                nombre:"Iglesia Evangélica Asamblea de Dios",
                link:"https://www.google.com/maps/search/?api=1&query=-28.580856838882077,-58.718072982275054"
            }

        ]
    },


    emergencias:{
        titulo:"🚨 Emergencias",
        descripcion:"Servicios de urgencia disponibles en San Roque.",
        lugares:[

            {
                nombre:"Policía de San Roque",
                link:"https://www.google.com/maps/search/?api=1&query=-28.570089924920314,-58.712608217644515"
            },

            {
                nombre:"Hospital de San Roque",
                link:"https://www.google.com/maps/search/?api=1&query=-28.577551339214832,-58.711226434897526"
            },

            {
                nombre:"Bomberos San Roque",
                link:"https://www.google.com/maps/search/?api=1&query=-28.577904318277724,-58.713826053599384"
            }

        ]
    },


    salud:{
        titulo:"🏥 Salud",
        descripcion:"Farmacias y atención médica.",
        lugares:[

            {
                nombre:"Farmar IV",
                link:"https://www.google.com/maps/search/?api=1&query=-28.57564523967805,-58.7115423787572"
            },

            {
                nombre:"Farmacia Itatí S.C.S",
                link:"https://www.google.com/maps/search/?api=1&query=-28.57490350407002,-58.70936387230284"
            },

            {
                nombre:"Farmacia Tressens II",
                link:"https://www.google.com/maps/search/?api=1&query=-28.575223851034433,-58.70882743052239"
            },

            {
                nombre:"Farmacia San Roque",
                link:"https://www.google.com/maps/search/?api=1&query=-28.57708938162111,-58.711638385451934"
            }

        ]
    },


    servicios:{
        titulo:"🏧 Servicios rápidos",
        descripcion:"Servicios útiles para visitantes.",
        lugares:[

            {
                nombre:"Municipalidad de San Roque",
                link:"https://www.google.com/maps/search/?api=1&query=-28.57680756168794,-58.708982356874806"
            },

            {
                nombre:"C.I.C extensión del municipio",
                link:"https://www.google.com/maps/search/?api=1&query=-28.575522578502625,-58.70431666637905"
            },

            {
                nombre:"Registro Civil",
                link:"https://www.google.com/maps/search/?api=1&query=-28.576534179577525,-58.70901613864172"
            }

        ]
    },


    turismo:{
        titulo:"📍 Lugares turísticos",
        descripcion:"Puntos importantes de San Roque.",

        lugares:[

            {
                nombre:"Plaza Principal Libertad",
                link:"https://www.google.com/maps/search/?api=1&query=-28.57098181276159,-58.71209180928368"
            },

            {
                nombre:"Museo de San Roque",
                link:"https://www.google.com/maps/search/?api=1&query=-28.57098181276159,-58.71209180928368"
            }

        ]
    }

};
window.datosUtilesInfo = datosUtilesInfo;

const BOT_API = (window.location.protocol === 'file:')
    ? 'http://127.0.0.1:4000/api/bot/chat'
    : '/api/bot/chat';
window.BOT_API = BOT_API;
let chatOpen = false;

const chatToggleBtn = document.getElementById("chatToggle");

chatToggleBtn.onclick = () => {
    chatOpen = !chatOpen;
    document.getElementById("chatWindow").style.display = chatOpen ? "flex" : "none";
    chatToggleBtn.setAttribute("aria-expanded", String(chatOpen));

    // Animación de click: el botón nunca se oculta, solo se anima
    chatToggleBtn.classList.remove("clicked");
    void chatToggleBtn.offsetWidth; // fuerza reinicio de la animación
    chatToggleBtn.classList.add("clicked");
};

chatToggleBtn.addEventListener("animationend", () => {
    chatToggleBtn.classList.remove("clicked");
});

// Minimizar el asistente: botón ✕ del encabezado y tecla Escape.
function closeChatWindow() {
    chatOpen = false;
    const win = document.getElementById("chatWindow");
    if (win) win.style.display = "none";
    chatToggleBtn.setAttribute("aria-expanded", "false");
}
document.querySelectorAll("[data-chat-close]").forEach((btn) => btn.addEventListener("click", closeChatWindow));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && chatOpen) closeChatWindow(); });

// Escucha de clicks en los botones de Datos Útiles
document.querySelectorAll('#lista-datos-utiles a').forEach(btn => {
    btn.addEventListener('click', function(e){
        e.preventDefault();
        chatOpen = true;
        document.getElementById("chatWindow").style.display = "flex";
        quickAsk(this.innerText.trim());
    });
});

function quickAsk(text){
    document.getElementById("chatInput").value = text;
    sendChat();
}

function detectDatosUtilesCategoryFromText(text){
  if(!text) return null;
  const t = String(text).toLowerCase();
  if(/polic|comisar|comisaria|policia/.test(t)) return 'emergencias';
  if(/hospital|salud|clinica/.test(t)) return 'emergencias';
  if(/remis|taxi|traslado/.test(t)) return 'remises';
  if(/municipio|intendencia|municipalidad/.test(t)) return 'municipio';
  if(/banco|cajero|corrientes/.test(t)) return 'servicios';
  if(/terminal|colectivo|ómnibus|omnibus/.test(t)) return 'terminal';
  return null;
}

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function sanitizeBotHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/&lt;b&gt;/g, '<b>')
        .replace(/&lt;\/b&gt;/g, '</b>')
        .replace(/&lt;br&gt;/g, '<br>');
}

function answerLocally(message) {
    const text = String(message || '').toLowerCase();
    if (/\b(fiesta patronal|fiestas patronales|patronal)\b/.test(text)) {
        return {
            reply: 'La Fiesta Patronal de San Roque se celebra el 16 de agosto de 2026 en la Parroquia San Roque de Montpellier. Habrá misa solemne, procesión y actividades culturales.',
            category: 'eventos'
        };
    }
    if (/\b(historia|cu[eé]ntame sobre la historia|origen de san roque|cómo nació san roque|cómo se fund[oó])\b/.test(text)) {
        return {
            reply: 'La historia de San Roque forma parte de su identidad como ciudad correntina. El portal municipal documenta su patrimonio, la tradición religiosa y el valor turístico de su comunidad.',
            category: 'general'
        };
    }
    if (/\b(remis|taxi|traslado|transporte)\b/.test(text)) {
        return { reply: 'Te comparto los remises oficiales de San Roque.', category: 'remises' };
    }
    if (/\b(comer|gastronom|restaurant|comedor|comida|sabores|restaurante)\b/.test(text)) {
        return { reply: 'Acá están las opciones gastronómicas disponibles en San Roque.', category: 'gastronomia' };
    }
    if (/\b(aloj|hotel|hospedaje|dormir|quedarse|estad[ií]a|estancia)\b/.test(text)) {
        return { reply: 'Estos son los alojamientos disponibles en San Roque.', category: 'alojamientos' };
    }
    if (/\b(evento|agenda|actividad|show|concierto|feria)\b/.test(text)) {
        return { reply: 'Estos son los próximos eventos publicados en San Roque.', category: 'eventos' };
    }
    const duMatch = text.match(/\b(terminal|municipio|iglesia|iglesias|emergencia|emergencias|salud|servicio|servicios|remis|remises|municipio|banco)\b/);
    if (duMatch) {
      // return specific category so sendChat can render datos útiles
      const key = duMatch[1];
      // normalize some plural forms
      if (key === 'iglesias') return { reply: 'Te paso información de las iglesias y templos de San Roque.', category: 'iglesias' };
      if (key === 'emergencia' || key === 'emergencias') return { reply: 'Te paso información de servicios de emergencias en San Roque.', category: 'emergencias' };
      if (key === 'remis' || key === 'remises') return { reply: 'Te comparto los remises oficiales de San Roque.', category: 'remises' };
      if (key === 'banco' || key === 'servicio' || key === 'servicios') return { reply: 'Te paso información de servicios oficiales y datos útiles de San Roque.', category: 'servicios' };
      return { reply: 'Te paso información de servicios oficiales y datos útiles de San Roque.', category: key };
    }
    return { reply: 'Soy el asistente turístico de San Roque. Puedo ayudarte con alojamientos, gastronomía, eventos y datos útiles oficiales.', category: 'general' };
}

function addMsg(text, user=false, options={html:false}){
    const box = document.getElementById("chatBox");
    const div = document.createElement("div");

    div.style.margin = "10px 0";
    div.style.padding = "12px";
    div.style.borderRadius = "14px";
    div.style.maxWidth = "85%";
    div.style.wordBreak = "break-word";
    div.style.whiteSpace = "pre-wrap";

    if(user){
        div.style.marginLeft = "auto";
        div.style.background = "#003633";
        div.style.color = "white";
        div.style.borderBottomRightRadius = "2px";
        div.textContent = text;
    } else {
        div.style.background = "white";
        div.style.color = "#333";
        div.style.borderBottomLeftRadius = "2px";
        div.style.boxShadow = "0 2px 5px rgba(0,0,0,0.05)";
        if (options.html) {
            div.classList.add('bot-with-cards');
            div.innerHTML = text;
        } else {
            div.innerHTML = sanitizeBotHtml(text);
        }
    }

    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function showTyping(){
    const box = document.getElementById("chatBox");
    const div = document.createElement("div");
    div.id = "typing";
    div.innerHTML = `<div class="typing"><span></span><span></span><span></span></div>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function hideTyping(){
    const t = document.getElementById("typing");
    if(t) t.remove();
}

function responderDatosUtiles(tipo) {
    const item = datosUtilesInfo[tipo];
    if(!item) return;
  const content = item.contenido || item;

  let html = `<b>${item.titulo || content.titulo || ''}</b><br>`;
  html += `<p style="margin-top:4px; font-size:13px; color:#475569;">${item.descripcion || content.descripcion || ''}</p>`;

  if (content.ubicacion) {
    html += `<p style="margin-top:8px;"><a target="_blank" href="${content.ubicacion}" style="color:#134E4A; font-weight:bold; text-decoration:underline;">📍 Ver ubicación en mapa</a></p>`;
  }

  const lugares = content.lugares || content.lugares || content.lugares;
  if (Array.isArray(lugares) && lugares.length) {
    html += `<ul style="margin-top:8px; padding-left:14px; list-style-type:disc; font-size:13px;">`;
    lugares.forEach(l => {
      const link = l.link || l.url || l.mapsLink || '';
      const label = l.nombre || l.titulo || l.label || '';
      if (link) html += `<li style="margin-top:4px;"><a target="_blank" href="${link}" style="color:#134E4A; font-weight:bold; text-decoration:underline;">${label}</a></li>`;
      else html += `<li style="margin-top:4px;">${label}</li>`;
    });
    html += `</ul>`;
  }

  const contactos = content.contactos || content.contactos || [];
  if (Array.isArray(contactos) && contactos.length) {
    html += `<div style="margin-top:8px; font-size:13px;"><b>Contactos directos:</b><ul style="padding-left:0; list-style-type:none; margin-top:4px;">`;
    contactos.forEach(c => {
      const tel = String(c.tel || c.telefono || c.phone || '').replace(/\D/g,'');
      const wa = c.whatsapp || c.wa || c.waNumber || '';
      html += `<li style="margin-top:6px; background:white; border:1px solid #e2e8f0; padding:6px 10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div><strong>${c.nombre || c.label || ''}</strong></div>
          <div style="display:flex; gap:6px; align-items:center;">
            ${wa ? `<a class="chat-card-button" href="https://wa.me/${String(wa).replace(/^\+/, '')}?text=${encodeURIComponent('Hola') }" target="_blank" rel="noopener">WhatsApp</a>` : ''}
            ${tel ? `<a href="tel:${tel}" style="background:#003633; color:white; padding:4px 8px; border-radius:6px; font-weight:bold; font-size:11px; text-decoration:none;">📞 ${c.tel || c.telefono || tel}</a>` : ''}
          </div>
        </li>`;
    });
    html += `</ul></div>`;
  }

  addMsg(html, false, { html: true });
}

function buildWaLink(rawNumber, text = 'Hola!') {
    const digits = String(rawNumber || '').replace(/[^\d+]/g, '');
    if (!digits) return '';
    const clean = digits.replace(/^\+/, '');
    return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

function renderChatCards(category) {
    const cardHeader = {
        remises: { title: 'Remises disponibles', subtitle: 'Contactos locales con WhatsApp directo' },
        alojamientos: { title: 'Alojamientos', subtitle: 'Consultá disponibilidad y detalles' },
        gastronomia: { title: 'Gastronomía recomendada', subtitle: 'Reservá o escribí por WhatsApp' },
    }[category];

    if (!cardHeader) return '';

    // If category is alojamientos, render a placeholder and hydrate it asynchronously
    if (category === 'alojamientos') {
      return `<div class="chat-card">
      <div class="chat-card-header">
        <div class="chat-card-title">${cardHeader.title}</div>
        <div class="chat-card-subtitle">${cardHeader.subtitle}</div>
      </div>
      <div class="chat-card-list"><div class="chat-card-placeholder" data-category="alojamientos"></div></div>
    </div>`;
    }

    // If category is gastronomia, render a placeholder and hydrate it asynchronously
    if (category === 'gastronomia') {
      return `<div class="chat-card">
      <div class="chat-card-header">
        <div class="chat-card-title">${cardHeader.title}</div>
        <div class="chat-card-subtitle">${cardHeader.subtitle}</div>
      </div>
      <div class="chat-card-list"><div class="chat-card-placeholder" data-category="gastronomia"></div></div>
    </div>`;
    }

    const items = category === 'remises'
        ? (Array.isArray(datosUtilesInfo.remises?.contactos) ? datosUtilesInfo.remises.contactos : [])
        : category === 'alojamientos'
            ? Object.entries(alojamientosData || {}).filter(([, item]) => isLodging(item)).slice(0, 6).map(([id, item]) => ({ id, ...item }))
            : Array.isArray(window.gastronomiaData) ? window.gastronomiaData.slice(0, 6) : [];

    if (!items.length) return '';

    const rows = items.map((item) => {
        if (category === 'remises') {
            const name = escapeHtml(item.nombre || '');
            const tel = escapeHtml(item.tel || '');
            const wa = buildWaLink(item.tel, `Hola! Quiero coordinar un remis con ${item.nombre} desde el portal de San Roque.`);
            return `<div class="chat-card-item">
                <div class="chat-card-item-info">
                    <div class="chat-card-item-title">${name}</div>
                    <div class="chat-card-item-subtitle">${tel}</div>
                </div>
                <div class="chat-card-actions">
                    ${wa ? `<a class="chat-card-button" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
                </div>
            </div>`;
        }

        if (category === 'alojamientos') {
            const title = escapeHtml(item.titulo || '');
            const location = escapeHtml(item.ubicacion || 'San Roque');
            const wa = buildWaLink(item.waNumber || item.telefono, `Hola! Quiero consultar disponibilidad de ${item.titulo} en San Roque.`);
            return `<div class="chat-card-item">
                <div class="chat-card-item-info">
                    <div class="chat-card-item-title">${title}</div>
                    <div class="chat-card-item-subtitle">${location}</div>
                </div>
                <div class="chat-card-actions">
                    <button class="chat-card-button" type="button" onclick="navigateToDetails('${item.id}')">Ver detalle</button>
                    ${wa ? `<a class="chat-card-button" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
                </div>
            </div>`;
        }

        const name = escapeHtml(item.nombre || '');
        const location = escapeHtml(item.ubicacion || 'San Roque');
        const wa = buildWaLink(item.whatsapp || item.telefono, `Hola! Quiero consultar sobre ${item.nombre} en San Roque.`);
        return `<div class="chat-card-item">
            <div class="chat-card-item-info">
                <div class="chat-card-item-title">${name}</div>
                <div class="chat-card-item-subtitle">${location}</div>
            </div>
            <div class="chat-card-actions">
                ${wa ? `<a class="chat-card-button" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
            </div>
        </div>`;
    }).join('');

    return `<div class="chat-card">
        <div class="chat-card-header">
            <div class="chat-card-title">${cardHeader.title}</div>
            <div class="chat-card-subtitle">${cardHeader.subtitle}</div>
        </div>
        <div class="chat-card-list">${rows}</div>
    </div>`;
}

// Fetch alojamientos from API (/api/data) with graceful fallback to in-memory data
async function fetchAlojamientosFromApi() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error('API no disponible');
    const json = await res.json();
    // API may return object with alojamientos map or array
    let alojamientos = [];
    if (Array.isArray(json.alojamientos)) alojamientos = json.alojamientos;
    else if (json.alojamientos && typeof json.alojamientos === 'object') alojamientos = Object.entries(json.alojamientos).map(([id, v]) => ({ id, ...v }));
    return alojamientos;
  } catch (err) {
    // fallback to global data if available
    try {
      if (window.alojamientosData) return Object.entries(window.alojamientosData).map(([id, v]) => ({ id, ...v }));
    } catch (e) {}
    return [];
  }
}

// Fetch gastronomia from API (/api/data) with graceful fallback to in-memory data
async function fetchGastronomiaFromApi() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error('API no disponible');
    const json = await res.json();
    let gastronomia = [];
    if (Array.isArray(json.gastronomia)) gastronomia = json.gastronomia;
    return gastronomia;
  } catch (err) {
    try {
      if (Array.isArray(window.gastronomiaData)) return window.gastronomiaData;
    } catch (e) {}
    return [];
  }
}

function renderGastronomiaItem(item) {
  const title = escapeHtml(item.titulo || item.nombre || '');
  const location = escapeHtml(item.ubicacion || 'San Roque');
  const wa = buildWaLink(item.whatsapp || item.telefono || item.waNumber, `Hola! Quiero consultar sobre ${item.titulo || item.nombre} en San Roque.`);
  return `<div class="chat-card-item">
        <div class="chat-card-item-info">
          <div class="chat-card-item-title">${title}</div>
          <div class="chat-card-item-subtitle">${location}</div>
        </div>
        <div class="chat-card-actions">
          ${wa ? `<a class="chat-card-button" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        </div>
      </div>`;
}

// Replace placeholder inside the last bot message with real gastronomia fetched from API
async function hydrateGastronomiaInMessage(messageDiv) {
  if (!messageDiv) return;
  const placeholder = messageDiv.querySelector('.chat-card-placeholder[data-category="gastronomia"]');
  if (!placeholder) return;
  const items = await fetchGastronomiaFromApi();
  const list = (items || []).slice(0, 8).map(renderGastronomiaItem).join('');
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-card';
  wrapper.innerHTML = `<div class="chat-card-header"><div class="chat-card-title">Gastronomía</div><div class="chat-card-subtitle">Reservá o escribí por WhatsApp</div></div><div class="chat-card-list">${list}</div>`;
  placeholder.replaceWith(wrapper.querySelector('.chat-card-list'));
}

function renderAlojamientoItem(item) {
  const title = escapeHtml(item.titulo || item.nombre || '');
  const location = escapeHtml(item.ubicacion || 'San Roque');
  const wa = buildWaLink(item.waNumber || item.telefono || item.whatsapp, `Hola! Quiero consultar disponibilidad de ${item.titulo || item.nombre} en San Roque.`);
  return `<div class="chat-card-item">
        <div class="chat-card-item-info">
          <div class="chat-card-item-title">${title}</div>
          <div class="chat-card-item-subtitle">${location}</div>
        </div>
        <div class="chat-card-actions">
          <button class="chat-card-button" type="button" onclick="navigateToDetails('${item.id}')">Ver detalle</button>
          ${wa ? `<a class="chat-card-button" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        </div>
      </div>`;
}

// Replace placeholder inside the last bot message with real alojamientos fetched from API
async function hydrateAlojamientosInMessage(messageDiv) {
  if (!messageDiv) return;
  const placeholder = messageDiv.querySelector('.chat-card-placeholder');
  if (!placeholder) return;
  const items = await fetchAlojamientosFromApi();
  const list = (items || []).slice(0, 8).map(renderAlojamientoItem).join('');
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-card';
  wrapper.innerHTML = `<div class="chat-card-header"><div class="chat-card-title">Alojamientos</div><div class="chat-card-subtitle">Consultá disponibilidad y detalles</div></div><div class="chat-card-list">${list}</div>`;
  placeholder.replaceWith(wrapper.querySelector('.chat-card-list'));
}

const CHAT_API_URL = window.BOT_API || '/api/bot/chat';

async function sendChat(){
    const input = document.getElementById("chatInput");
    const text = input.value.trim();
    if(!text) return;

    addMsg(text, true);
    input.value = "";
    showTyping();

    const localResponse = answerLocally(text);

    try {
        const response = await fetch(CHAT_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();
        hideTyping();

        const botResponse = data.reply || data.response || data.message || localResponse.reply || "Respuesta recibida";
        const category = data.category || localResponse.category || 'general';
        // If user asked about datos útiles (policía/hospital/municipio/banco), prefer structured datosUtiles
        const duFromText = detectDatosUtilesCategoryFromText(text);
        if (duFromText && datosUtilesInfo && datosUtilesInfo[duFromText]) {
          responderDatosUtiles(duFromText);
          hideTyping();
          return;
        }
        const safeBotResponse = sanitizeBotHtml(botResponse);
        // If it's a datos utiles category, render the detailed block with map/phone
        if (datosUtilesInfo && datosUtilesInfo[category]) {
          // For datos útiles we render the structured block only (avoid duplicate titles)
          responderDatosUtiles(category);
        } else {
          const cards = renderChatCards(category);
          if (cards) {
            addMsg(`${safeBotResponse}<br>${cards}`, false, { html: true });
            if (category === 'alojamientos') {
              const box = document.getElementById('chatBox');
              const last = box && box.lastElementChild;
              hydrateAlojamientosInMessage(last).catch(() => {});
            } else if (category === 'gastronomia') {
              const box = document.getElementById('chatBox');
              const last = box && box.lastElementChild;
              hydrateGastronomiaInMessage(last).catch(() => {});
            }
          } else {
            addMsg(safeBotResponse);
          }
        }

    } catch (error) {
        console.error("Error al conectar con la API:", error);
        hideTyping();

        if (localResponse) {
            const safeBotResponse = sanitizeBotHtml(localResponse.reply);
            // If localResponse maps to datos utiles, render that detailed block
            if (datosUtilesInfo && datosUtilesInfo[localResponse.category]) {
              // Avoid duplicating the textual title; render structured block only
              responderDatosUtiles(localResponse.category);
            } else {
                const cards = renderChatCards(localResponse.category);
                if (cards) {
                    addMsg(`${safeBotResponse}<br>${cards}`, false, { html: true });
                    if (localResponse.category === 'alojamientos') {
                      const box = document.getElementById('chatBox');
                      const last = box && box.lastElementChild;
                      hydrateAlojamientosInMessage(last).catch(() => {});
                    } else if (localResponse.category === 'gastronomia') {
                      const box = document.getElementById('chatBox');
                      const last = box && box.lastElementChild;
                      hydrateGastronomiaInMessage(last).catch(() => {});
                    }
                } else {
                    addMsg(safeBotResponse);
                }
            }
        } else {
            addMsg("⚠️ Lo siento, tuve un problema de conexión con el servidor.");
        }
    }
}

// Mensaje inicial del bot
setTimeout(() => {
    addMsg(`👋 <b>¡Bienvenido a MuniAyuda!</b><br><br>Soy el asistente virtual de Turismo de San Roque.<br><br>Puedo ayudarte con:<br>🏨 Hospedajes<br>🍕 Gastronomía<br>🎉 Eventos<br>🚓 Emergencias<br><br>¿Qué necesitás?`);
}, 1000);
