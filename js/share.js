// js/share.js
// Compartir un ítem del portal con enlace propio (permalink).
// - buildUrl(param, id): arma la URL absoluta con ?param=id sobre la página actual.
// - share(param, id, title): usa la Web Share API nativa; si no está, copia al portapapeles.
// Reutilizado por alojamientos (?h=) y gastronomía (?g=).

(function (global) {
  'use strict';

  function buildUrl(param, id) {
    // Gastronomía tiene URL amigable propia (/gastronomia/<id>); el resto
    // sigue usando el parámetro de query sobre la página actual.
    if (param === 'g') {
      const u = new URL('/gastronomia/' + encodeURIComponent(id), global.location.origin);
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

  // Lee el parámetro (?h= / ?g=) de la URL actual. Para 'g' también acepta
  // la URL amigable /gastronomia/<id> (sin query string).
  function paramFromUrl(param) {
    try {
      const url = new URL(global.location.href);
      const fromQuery = url.searchParams.get(param);
      if (fromQuery) return fromQuery;
      if (param === 'g') {
        const match = url.pathname.match(/^\/gastronomia\/([a-zA-Z0-9_-]+)\/?$/);
        if (match) return decodeURIComponent(match[1]);
      }
      return null;
    } catch (_) { return null; }
  }

  global.VsrShare = { buildUrl, share, paramFromUrl };
})(window);
