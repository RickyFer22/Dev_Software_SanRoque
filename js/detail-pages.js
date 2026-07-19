(function () {
  const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
  const asList = (value) => Array.isArray(value) ? value : [];
  const digits = (value) => String(value || '').replace(/[^\d+]/g, '');
  const serviceNames = { wifi: 'Wi-Fi', pets: 'Acepta mascotas', parking: 'Estacionamiento', videocam: 'Seguridad', celiac: 'Opciones para celíacos', restaurant: 'Consumo en el lugar', shower: 'Duchas', delivery: 'Delivery', ac_unit: 'Aire acondicionado', tv: 'Televisión' };

  function galleryItems(item) {
    const rich = asList(item.mediaGallery).filter((entry) => entry.url || entry.variants);
    if (rich.length) return rich;
    const urls = [...new Set([item.mainImg || item.imagen, ...asList(item.galeria)].filter(Boolean))];
    return urls.map((url, index) => ({ url, alt: index === 0 ? (item.titulo || item.nombre || '') : '', role: index === 0 ? 'cover' : 'gallery' }));
  }

  function setMeta(item, kind) {
    const name = item.seoTitle || item.titulo || item.nombre;
    const description = item.seoDescription || item.summary || item.descripcionLarga || item.descripcion || '';
    const image = item.socialImage || galleryItems(item).find((entry) => entry.role === 'social')?.url || galleryItems(item)[0]?.variants?.social?.url || galleryItems(item)[0]?.url;
    document.title = `${name} · Viví San Roque`;
    const set = (selector, value, attr = 'content') => { const node = document.querySelector(selector); if (node && value) node.setAttribute(attr, value); };
    set('meta[name="description"]', description);
    set('meta[property="og:title"]', name);
    set('meta[property="og:description"]', description);
    set('meta[property="og:image"]', image);
    set('meta[name="twitter:title"]', name);
    set('meta[name="twitter:description"]', description);
    set('meta[name="twitter:image"]', image);
    const canonical = item.canonical || location.href.split('#')[0];
    set('link[rel="canonical"]', canonical, 'href');
    let structured = document.getElementById('dynamic-tourism-schema');
    if (!structured) { structured = document.createElement('script'); structured.id = 'dynamic-tourism-schema'; structured.type = 'application/ld+json'; document.head.appendChild(structured); }
    const schema = {
      '@context': 'https://schema.org',
      '@type': kind === 'gastronomia' ? 'Restaurant' : 'LodgingBusiness',
      name,
      description: description || undefined,
      image: galleryItems(item).map((entry) => entry.variants?.large?.url || entry.url).filter(Boolean),
      address: item.direccion || item.ubicacion || undefined,
      telephone: item.telefono || undefined,
      url: canonical,
    };
    if (Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon))) schema.geo = { '@type': 'GeoCoordinates', latitude: Number(item.lat), longitude: Number(item.lon) };
    structured.textContent = JSON.stringify(schema);
  }

  function scoreRelated(candidate, current) {
    let score = 0;
    if ((candidate.categoria || candidate.tipo) === (current.categoria || current.tipo)) score += 5;
    const tags = new Set(asList(current.tags).map((tag) => String(tag).toLowerCase()));
    score += asList(candidate.tags).filter((tag) => tags.has(String(tag).toLowerCase())).length * 2;
    if (candidate.featured) score += 2;
    return score;
  }

  function related(items, current, limit = 3) {
    return items.filter((item) => String(item.id) !== String(current.id)).map((item) => ({ item, score: scoreRelated(item, current) })).sort((a, b) => b.score - a.score || Number(b.item.featuredOrder || 0) - Number(a.item.featuredOrder || 0) || String(a.item.titulo || a.item.nombre).localeCompare(String(b.item.titulo || b.item.nombre), 'es')).slice(0, limit).map((entry) => entry.item);
  }

  function relatedCards(items, kind) {
    return items.map((item) => {
      const name = item.titulo || item.nombre;
      const image = galleryItems(item)[0];
      const url = kind === 'gastronomia' ? `gastronomia.html?g=${encodeURIComponent(item.id)}` : `index.html?h=${encodeURIComponent(item.id)}`;
      return `<a class="tourism-related-card" href="${url}">${window.TourismGallery.responsivePicture(image || {}, '', 'lazy')}<div><span>${esc(item.categoria || item.tipo || '')}</span><h3>${esc(name)}</h3><p>${esc(item.summary || item.ubicacion || item.direccion || '')}</p></div></a>`;
    }).join('');
  }

  function enhanceAccommodation(data) {
    const id = new URLSearchParams(location.search).get('h');
    if (!id) return;
    const all = Object.entries(data || {}).map(([key, value]) => ({ ...value, id: value.id || key }));
    const item = all.find((entry) => String(entry.id) === id || entry.slug === id);
    if (!item) return;
    setTimeout(() => {
      setMeta(item, 'alojamiento');
      const images = galleryItems(item);
      const main = document.getElementById('det-main-img');
      if (main && images.length) {
        const first = images.find((entry) => entry.role === 'cover') || images[0];
        main.src = first.variants?.hero?.url || first.url;
        main.alt = first.alt || item.titulo || '';
        const srcset = ['card', 'medium', 'large', 'hero'].map((key) => first.variants?.[key]?.url ? `${first.variants[key].url} ${first.variants[key].width || 0}w` : '').filter(Boolean).join(', ');
        if (srcset) { main.srcset = srcset; main.sizes = '(max-width: 768px) 100vw, 760px'; }
        main.closest('div')?.setAttribute('role', 'button');
        main.closest('div')?.setAttribute('tabindex', '0');
        main.closest('div')?.setAttribute('aria-label', `Abrir galería de ${images.length} fotografías`);
        const open = (event) => window.TourismGallery.open(images, 0, event.currentTarget);
        main.closest('div')?.addEventListener('click', open);
        main.closest('div')?.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(event); } });
      }
      const description = item.descripcionLarga || item.descripcion || '';
      const descriptionSection = document.getElementById('det-description-section');
      if (descriptionSection) descriptionSection.hidden = !description;
      const policies = [item.checkin, item.checkout, item.cancelacion].filter(Boolean);
      const policiesSection = document.getElementById('det-policies-section');
      if (policiesSection) policiesSection.hidden = !policies.length;
      const mapLink = document.getElementById('det-map-link');
      const hasMap = item.mapsLink || item.mapUrl || (Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon))) || (item.coords && item.coords.length === 2);
      if (mapLink && !hasMap) mapLink.style.display = 'none';
      const host = document.getElementById('accommodation-related');
      const matches = related(all.filter((entry) => !['lugar', 'servicio', 'iglesia', 'salud', 'farmacia'].includes(entry.categoria)), item);
      if (host) {
        host.hidden = !matches.length;
        host.innerHTML = matches.length ? `<div class="tourism-section-heading"><span>Seguí descubriendo</span><h2 id="accommodation-related-title">Otros alojamientos</h2></div><div class="tourism-related-grid">${relatedCards(matches, 'alojamiento')}</div>` : '';
      }
    }, 80);
  }

  function contactLink(href, label, className = '') { return href ? `<a class="tourism-action ${className}" href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>` : ''; }

  function renderGastronomy(item, all) {
    const host = document.getElementById('gastronomy-detail');
    if (!host) return;
    const images = galleryItems(item);
    const mainImage = images.find((entry) => entry.role === 'cover') || images[0];
    const phone = digits(item.telefono);
    const whatsapp = digits(item.whatsapp || item.waNumber);
    const map = item.mapsLink || (Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon)) ? `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lon}` : '');
    const services = asList(item.servicios).map((service) => typeof service === 'string' ? (serviceNames[service] || String(service).replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase())) : service.texto).filter(Boolean);
    const matches = related(all, item);
    const estadoBadge = window.VsrHorario ? VsrHorario.badgeHtml(item.horario) : '';
    const waHref = whatsapp ? `https://wa.me/${whatsapp.replace(/^\+/, '')}` : '';
    host.innerHTML = `
      <button type="button" class="detail-back" data-gastro-back>Volver a gastronomía</button>
      <header class="tourism-detail-hero">
        <div class="detail-hero-media">${window.TourismGallery.responsivePicture(mainImage || {}, '', 'eager')}<button type="button" data-open-gastro-gallery>Ver todas las fotos <span>${images.length}</span></button></div>
        <div class="detail-hero-copy"><span>${esc(item.tipo || 'Gastronomía')}</span><h1>${esc(item.nombre || item.titulo)}</h1>${estadoBadge ? `<div class="detail-estado-line">${estadoBadge}</div>` : ''}${item.summary ? `<p>${esc(item.summary)}</p>` : ''}<div class="vsr-interactive detail-rating" data-type="gastronomia" data-id="${esc(item.id)}"></div><div class="tourism-actions">${contactLink(phone ? `tel:${phone}` : '', 'Llamar')}${contactLink(waHref, 'WhatsApp', 'primary')}${contactLink(map, 'Cómo llegar')}${contactLink(item.instagram, 'Instagram')}<button type="button" class="tourism-action" data-gastro-share>Compartir</button></div></div>
      </header>
      <div class="tourism-detail-layout">
        <article class="tourism-detail-main">
          ${item.descripcion ? `<section><span class="detail-kicker">La experiencia</span><h2>Sabores de San Roque</h2><p>${esc(item.descripcion)}</p></section>` : ''}
          ${services.length ? `<section><span class="detail-kicker">Servicios</span><h2>Lo que ofrece</h2><div class="detail-service-grid">${services.map((service) => `<span>${esc(service)}</span>`).join('')}</div></section>` : ''}
          ${images.length > 1 ? `<section><span class="detail-kicker">Galería</span><h2>Conocé el lugar</h2><div class="editorial-gallery">${images.slice(0, 5).map((image, index) => `<button type="button" data-gallery-index="${index}" aria-label="Abrir fotografía ${index + 1}">${window.TourismGallery.responsivePicture(image, '', 'lazy')}</button>`).join('')}</div></section>` : ''}
        </article>
        <aside class="tourism-practical-card"><span class="detail-kicker">Información práctica</span><h2>Planificá tu visita</h2>${estadoBadge ? `<div><strong>Estado</strong><p class="detail-estado-line">${estadoBadge}</p></div>` : ''}${item.direccion || item.ubicacion ? `<div><strong>Dirección</strong><p>${esc(item.direccion || item.ubicacion)}</p></div>` : ''}${item.horario ? `<div><strong>Horarios</strong><p>${esc(item.horario)}</p></div>` : ''}${item.specialties?.length ? `<div><strong>Especialidades</strong><p>${esc(item.specialties.join(' · '))}</p></div>` : ''}${contactLink(map, 'Abrir en Google Maps', 'primary')}</aside>
      </div>
      ${matches.length ? `<section class="tourism-related"><div class="tourism-section-heading"><span>Más mesas locales</span><h2>También puede interesarte</h2></div><div class="tourism-related-grid">${relatedCards(matches, 'gastronomia')}</div></section>` : ''}
      <nav class="gastro-action-bar" aria-label="Acciones rápidas">
        ${phone ? `<a href="tel:${esc(phone)}"><span class="material-symbols-outlined" aria-hidden="true">call</span>Llamar</a>` : ''}
        ${waHref ? `<a class="is-wa" href="${esc(waHref)}" target="_blank" rel="noopener"><span class="material-symbols-outlined" aria-hidden="true">chat</span>WhatsApp</a>` : ''}
        ${map ? `<a href="${esc(map)}" target="_blank" rel="noopener"><span class="material-symbols-outlined" aria-hidden="true">near_me</span>Cómo llegar</a>` : ''}
      </nav>`;
    host.hidden = false;
    ['hero-section', 'datos-utiles', 'gastronomia-grid'].forEach((id) => { const node = document.getElementById(id); if (node) { node.hidden = true; node.style.display = 'none'; } });
    [document.querySelector('#directory > div'), document.querySelector('.gastronomy-story-cta')].forEach((node) => { if (node) { node.hidden = true; node.style.display = 'none'; } });
    const directory = document.getElementById('directory');
    if (directory) { directory.style.paddingTop = '0'; directory.style.paddingBottom = '0'; }
    host.querySelector('[data-gastro-back]')?.addEventListener('click', () => { location.href = 'gastronomia.html'; });
    host.querySelector('[data-open-gastro-gallery]')?.addEventListener('click', (event) => window.TourismGallery.open(images, 0, event.currentTarget));
    host.querySelectorAll('[data-gallery-index]').forEach((button) => button.addEventListener('click', (event) => window.TourismGallery.open(images, Number(button.dataset.galleryIndex), event.currentTarget)));
    // Calificaciones: promedio + "Tu calificación" (1 voto por visitante).
    const ratingHost = host.querySelector('.detail-rating');
    if (ratingHost && window.VsrRatings) VsrRatings.mountInteractive(ratingHost);
    host.querySelector('[data-gastro-share]')?.addEventListener('click', async (event) => {
      if (!window.VsrShare) return;
      const result = await VsrShare.share('g', item.id, item.nombre || item.titulo);
      if (result && result.method === 'clipboard') {
        event.target.textContent = '¡Enlace copiado!';
        setTimeout(() => { event.target.textContent = 'Compartir'; }, 1800);
      }
    });
    setMeta(item, 'gastronomia');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  async function initGastronomyDetail() {
    const id = new URLSearchParams(location.search).get('g');
    if (!id || !document.getElementById('gastronomy-detail')) return;
    let items = asList(window.gastronomiaData);
    try {
      const response = await fetch('/api/data', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (asList(data.gastronomia).length) items = asList(data.gastronomia);
        if (data.ratings && window.VsrRatings) VsrRatings.setRatings(data.ratings);
      }
    } catch (_) {}
    if (window.VsrRatings && !VsrRatings.getAverage('gastronomia', id)) { try { await VsrRatings.load(); } catch (_) {} }
    const item = items.find((entry) => String(entry.id) === id || entry.slug === id);
    if (item) renderGastronomy(item, items);
  }

  document.addEventListener('appDataReady', (event) => enhanceAccommodation(event.detail?.alojamientos || window.alojamientosData));
  document.addEventListener('DOMContentLoaded', () => {
    if (window.appData?.alojamientos) enhanceAccommodation(window.appData.alojamientos);
    initGastronomyDetail();
  });
})();
