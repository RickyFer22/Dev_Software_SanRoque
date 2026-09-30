/* Contenido del sitio administrable desde el panel (/admin → «Portada y cabeceras»).
   1) Une los pedidos simultáneos a /api/data en uno solo.
   2) Aplica agenda anual, bloque Huellas, fotos de cabecera y folleto.
   Todo tiene un valor por defecto en el HTML: si la API no responde, la página se ve igual. */
(function () {
  'use strict';

  // ── 1. Un solo /api/data por carga ──
  const nativeFetch = window.fetch.bind(window);
  const TTL = 15000;
  let shared = null;
  let sharedAt = 0;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    if (method !== 'GET' || !/\/api\/data(\?|$)/.test(url)) return nativeFetch(input, init);
    if (!shared || Date.now() - sharedAt > TTL) {
      sharedAt = Date.now();
      shared = nativeFetch(input, init).catch((err) => { shared = null; throw err; });
    }
    return shared.then((res) => res.clone());
  };

  // ── 2. Aplicar el contenido ──
  const FIESTAS = [
    ['Enero / febrero', 'Carnavales'],
    ['Abril', 'Encuentro Regional de Emprendedores, Artesanos y Expositores'],
    ['Junio', 'Fiesta de la Gastronomía Tradicional y Regional'],
    ['Agosto', 'Fiestas Patronales'],
    ['Septiembre', 'Estudiantina'],
    ['Octubre', 'Recordatorio de la fundación de la localidad'],
    ['Noviembre', 'Fiesta de la Tradición y el Folclore'],
    ['Diciembre', 'Bingo de Carnaval'],
  ];

  function renderAgenda(items) {
    document.querySelectorAll('[data-agenda-anual]').forEach((host) => {
      host.replaceChildren(...items.map(([mes, titulo]) => {
        const li = document.createElement('li');
        const span = document.createElement('span');
        const strong = document.createElement('strong');
        span.textContent = mes;
        strong.textContent = titulo;
        li.append(span, strong);
        return li;
      }));
    });
  }

  function buildRotor(container, photos) {
    if (!container || photos.length < 2) return;
    container.replaceChildren(...photos.map((p, i) => {
      const img = document.createElement('img');
      img.src = p.url;
      img.alt = p.alt || '';
      img.loading = i === 0 ? 'eager' : 'lazy';
      return img;
    }));
    if (window.VsrHeroRotor) window.VsrHeroRotor.start(container);
  }

  function applyHuellas(h) {
    const block = document.getElementById('huellas');
    if (!block || !h) return;
    if (h.enabled === false) { block.hidden = true; return; }
    const set = (sel, text) => { const el = block.querySelector(sel); if (el && text) el.textContent = text; };
    set('#huellas-title', h.titulo);
    set('.huellas-lema', h.lema);
    const copy = block.querySelector('.huellas-copy');
    if (copy && h.textos && h.textos.length) {
      copy.querySelectorAll('p:not(.huellas-lema)').forEach((p) => p.remove());
      const lema = copy.querySelector('.huellas-lema');
      h.textos.forEach((t) => {
        const p = document.createElement('p');
        p.textContent = t;
        copy.insertBefore(p, lema);
      });
    }
    const video = block.querySelector('video');
    if (video && h.videoUrl && video.querySelector('source')?.getAttribute('src') !== h.videoUrl) {
      video.querySelector('source').setAttribute('src', h.videoUrl);
      video.load();
    }
    if (video && h.posterUrl) video.setAttribute('poster', h.posterUrl);
  }

  function lodgingPhotos(alojamientos) {
    const seen = new Set();
    const photos = [];
    (alojamientos || []).forEach((a) => {
      const list = [a.mainImg || a.imagen].concat(Array.isArray(a.galeria) ? a.galeria : []);
      list.slice(0, 2).forEach((u) => {
        const url = typeof u === 'string' ? u : (u && u.url);
        if (url && !seen.has(url) && !/placeholder/.test(url)) {
          seen.add(url);
          photos.push({ url, alt: a.titulo || a.nombre || 'Alojamiento de San Roque' });
        }
      });
    });
    return photos.slice(0, 10);
  }

  function apply(data) {
    const sitio = (data && data.sitio) || {};
    if (Array.isArray(sitio.agendaAnual) && sitio.agendaAnual.length) {
      renderAgenda(sitio.agendaAnual.map((a) => [a.mes, a.titulo]));
    }
    if (typeof sitio.agendaNota === 'string') {
      document.querySelectorAll('.home-year-note').forEach((el) => {
        el.replaceChildren();
        const b = document.createElement('strong');
        b.textContent = 'Y durante el año: ';
        el.append(b, document.createTextNode(sitio.agendaNota));
      });
    }
    applyHuellas(sitio.huellas);
    if (sitio.folletoUrl) {
      document.querySelectorAll('.home-flyer-link, [data-folleto]').forEach((a) => { a.href = sitio.folletoUrl; });
    }
    buildRotor(document.querySelector('.hero-rotor-comidas'), (sitio.fotosGastronomia || []).map((f) => ({ url: f.url, alt: f.alt })));
    const lodging = document.querySelector('.section-hero-media.hero-rotor');
    if (lodging) buildRotor(lodging, lodgingPhotos(data.alojamientos));
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderAgenda(FIESTAS);
    if (!document.querySelector('[data-agenda-anual], #huellas, .hero-rotor, .home-flyer-link')) return;
    fetch('/api/data').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) apply(d); }).catch(() => {});
  });
})();
