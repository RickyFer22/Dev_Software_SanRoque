/* ══════════════════════════════════════════════════════════════
   HORARIOS INTELIGENTES — calcula el estado de un comercio a
   partir de su texto de horario ("10:30 - 00:00", "24 horas",
   "11:30 a 14:30 y 20:00 a 23:30"…).
   API: window.VsrHorario.estado(horario) →
     { open, label, cierraPronto } | null si no se puede interpretar.
   ══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const RANGE_RE = /(\d{1,2})[:.](\d{2})\s*(?:-|–|a|hasta)\s*(\d{1,2})[:.](\d{2})/gi;

  function fmt(mins) {
    const m = ((mins % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }

  function parseRanges(text) {
    const ranges = [];
    let match;
    RANGE_RE.lastIndex = 0;
    while ((match = RANGE_RE.exec(text))) {
      const start = Number(match[1]) * 60 + Number(match[2]);
      const end = Number(match[3]) * 60 + Number(match[4]);
      if (start < 1440 && end < 1440) ranges.push({ start, end });
    }
    return ranges;
  }

  function estado(horario, reference) {
    const text = String(horario || '').toLowerCase();
    if (!text.trim()) return null;
    if (/24\s*(hs|h\b|horas)/.test(text)) {
      return { open: true, label: 'Abierto las 24 horas', cierraPronto: false };
    }
    const ranges = parseRanges(text);
    if (!ranges.length) return null;

    const now = reference instanceof Date ? reference : new Date();
    const current = now.getHours() * 60 + now.getMinutes();

    for (const range of ranges) {
      // Rango que cruza medianoche (ej. 18:00 - 00:30): el fin se corre un día.
      const end = range.end <= range.start ? range.end + 1440 : range.end;
      const cur = range.end <= range.start && current < range.start ? current + 1440 : current;
      if (cur >= range.start && cur < end) {
        const minutosRestantes = end - cur;
        if (minutosRestantes <= 45) {
          return { open: true, label: `Cierra pronto · ${fmt(range.end)}`, cierraPronto: true };
        }
        return { open: true, label: `Abierto · hasta las ${fmt(range.end)}`, cierraPronto: false };
      }
    }

    const proxima = ranges.map((r) => r.start).filter((s) => s > current).sort((a, b) => a - b)[0];
    if (proxima != null) {
      return { open: false, label: `Cerrado · abre a las ${fmt(proxima)}`, cierraPronto: false };
    }
    return { open: false, label: 'Cerrado por hoy', cierraPronto: false };
  }

  // Píldora HTML lista para usar en tarjetas y fichas.
  function badgeHtml(horario) {
    const e = estado(horario);
    if (!e) return '';
    const cls = e.open ? (e.cierraPronto ? 'is-soon' : 'is-open') : 'is-closed';
    return `<span class="gastro-estado ${cls}"><i aria-hidden="true"></i>${e.label}</span>`;
  }

  global.VsrHorario = Object.freeze({ estado, badgeHtml });
})(window);
