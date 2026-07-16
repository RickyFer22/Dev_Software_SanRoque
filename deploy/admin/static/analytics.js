// Módulo sencillo de analytics para mostrar métricas guardadas en store.analytics
export function renderAnalyticsPanel(containerId, analytics) {
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
      <ul>${(recent.slice(0,10).map(r=>`<li>${r}</li>`)).join('')}</ul>
    </div>
  `;
}
