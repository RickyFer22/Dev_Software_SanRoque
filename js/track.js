/* ══════════════════════════════════════════════════════════════
   ANALÍTICA DE CLICS — registra acciones concretas del visitante
   (WhatsApp, teléfono, mapa, compartir, apertura de ficha) contra
   /api/track. Fire-and-forget: nunca bloquea ni rompe la navegación
   (usa sendBeacon cuando existe, porque WhatsApp/tel/mapa navegan
   fuera o abren pestaña nueva antes de que un fetch normal termine).
   API: window.VsrTrack.click(event, id)
   ══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const VALID = new Set(['whatsapp', 'telefono', 'mapa', 'compartir', 'ficha']);

  function send(event, id) {
    if (!VALID.has(event) || !id) return;
    const body = JSON.stringify({ event, id: String(id) });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
        return;
      }
    } catch (_) { /* sigue al fallback */ }
    try {
      fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    } catch (_) { /* silencioso: la analítica nunca debe romper la acción del usuario */ }
  }

  global.VsrTrack = Object.freeze({ click: send });
})(window);
