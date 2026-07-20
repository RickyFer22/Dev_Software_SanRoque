// Módulo de analytics del panel: métricas generales + clics del portal
// (gastronomía) registrados por /api/track.
const EVENT_LABELS = {
  whatsapp: 'WhatsApp',
  telefono: 'Teléfono',
  mapa: 'Cómo llegar',
  compartir: 'Compartir',
  ficha: 'Vistas de ficha',
};
const EVENT_ORDER = ['whatsapp', 'telefono', 'mapa', 'compartir', 'ficha'];

const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));

function renderClicksPanel(analytics, gastronomiaNames) {
  const clicks = analytics.gastroClicks || {};
  const keys = Object.keys(clicks);
  if (!keys.length) {
    return `
      <div class="card">
        <h2>Clics del portal · Gastronomía</h2>
        <p class="small">Todavía no hay clics registrados en WhatsApp, teléfono, mapa o compartir. Se completa a medida que los visitantes usan esos botones en las fichas.</p>
      </div>`;
  }

  // Totales por tipo de evento (WhatsApp / Teléfono / Mapa / Compartir / Vistas de ficha)
  const totals = Object.fromEntries(EVENT_ORDER.map((e) => [e, 0]));
  // Acumulado por establecimiento (todas las acciones sumadas, sin contar "ficha" para no inflar el ranking con solo vistas)
  const byItem = {};
  keys.forEach((key) => {
    const [event, ...idParts] = key.split(':');
    const id = idParts.join(':');
    const count = Number(clicks[key]) || 0;
    if (totals[event] !== undefined) totals[event] += count;
    byItem[id] = byItem[id] || { whatsapp: 0, telefono: 0, mapa: 0, compartir: 0, ficha: 0, total: 0 };
    if (byItem[id][event] !== undefined) byItem[id][event] = count;
    if (event !== 'ficha') byItem[id].total += count;
  });

  const ranking = Object.entries(byItem)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10);

  const tiles = EVENT_ORDER.map((event) => `
    <div class="card metric-card">
      <span class="small">${esc(EVENT_LABELS[event])}</span>
      <strong>${totals[event]}</strong>
    </div>`).join('');

  const rows = ranking.map(([id, counts]) => {
    const name = gastronomiaNames[id] || id;
    return `
      <tr>
        <td>${esc(name)}</td>
        <td>${counts.whatsapp}</td>
        <td>${counts.telefono}</td>
        <td>${counts.mapa}</td>
        <td>${counts.compartir}</td>
        <td>${counts.ficha}</td>
        <td><strong>${counts.total}</strong></td>
      </tr>`;
  }).join('');

  return `
    <div class="card">
      <h2>Clics del portal · Gastronomía</h2>
      <p class="small">Acciones concretas de los visitantes en cada ficha: cuántos contactaron por WhatsApp o teléfono, pidieron cómo llegar, compartieron o abrieron la ficha.</p>
      <div class="grid" style="margin:14px 0 18px">${tiles}</div>
      <div style="overflow-x:auto">
        <table class="data-table">
          <thead><tr><th>Establecimiento</th><th>WhatsApp</th><th>Teléfono</th><th>Mapa</th><th>Compartir</th><th>Vistas</th><th>Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

export function renderAnalyticsPanel(containerId, analytics, gastronomiaNames = {}) {
  const c = document.getElementById(containerId);
  if (!c) return;
  const users = analytics.usersCreated || 0;
  const uploads = analytics.uploads || 0;
  const recent = analytics.recent || [];
  c.innerHTML = `
    <div class="card">
      <h2>Analytics</h2>
      <div><strong>Usuarios creados:</strong> ${users}</div>
      <div><strong>Uploads:</strong> ${uploads}</div>
      <h3>Eventos recientes</h3>
      <ul>${(recent.slice(0,10).map(r=>`<li>${esc(r)}</li>`)).join('')}</ul>
    </div>
    ${renderClicksPanel(analytics, gastronomiaNames)}
  `;
}
