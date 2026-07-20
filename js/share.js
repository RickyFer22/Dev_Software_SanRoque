// js/share.js
// Compartir un ítem del portal con enlace propio (permalink).
// - buildUrl(param, id): arma la URL amigable /<seccion>/<id> (alojamientos y
//   gastronomía) o, para el resto, ?param=id sobre la página actual.
// - share(param, id, title): usa la Web Share API nativa; si no está, copia al portapapeles.
// Reutilizado por alojamientos (?h= / /hospedajes/<id>) y gastronomía (?g= / /gastronomia/<id>).

(function (global) {
  'use strict';

  // Un único mapa gobierna tanto la construcción de la URL amigable como su
  // lectura — agregar una sección nueva con link propio es sumar una línea acá.
  const FRIENDLY_SECTIONS = { g: 'gastronomia', h: 'hospedajes' };

  function buildUrl(param, id) {
    const section = FRIENDLY_SECTIONS[param];
    if (section) {
      const u = new URL('/' + section + '/' + encodeURIComponent(id), global.location.origin);
      return u.toString();
    }
    const u = new URL(global.location.href);
    u.hash = '';
    u.searchParams.set(param, id);
    return u.toString();
  }

  async function share(param, id, title) {
    const url = buildUrl(param, id);
    const data = {
      title: title || 'Portal Turístico de San Roque',
      text: `Mirá "${title || 'este lugar'}" en el Portal Turístico de San Roque`,
      url,
    };
    if (global.navigator && typeof global.navigator.share === 'function') {
      try { await global.navigator.share(data); return { ok: true, method: 'native' }; }
      catch (e) { if (e && e.name === 'AbortError') return { ok: false, aborted: true }; }
    }
    try {
      await global.navigator.clipboard.writeText(url);
      return { ok: true, method: 'clipboard' };
    } catch (_) {
      global.prompt('Copiá el enlace para compartir:', url);
      return { ok: true, method: 'prompt' };
    }
  }

  // Lee el parámetro (?h= / ?g=) de la URL actual. También acepta la URL
  // amigable correspondiente (/hospedajes/<id>, /gastronomia/<id>).
  function paramFromUrl(param) {
    try {
      const url = new URL(global.location.href);
      const fromQuery = url.searchParams.get(param);
      if (fromQuery) return fromQuery;
      const section = FRIENDLY_SECTIONS[param];
      if (section) {
        const match = url.pathname.match(new RegExp('^/' + section + '/([a-zA-Z0-9_-]+)/?$'));
        if (match) return decodeURIComponent(match[1]);
      }
      return null;
    } catch (_) { return null; }
  }

  global.VsrShare = { buildUrl, share, paramFromUrl };
})(window);
