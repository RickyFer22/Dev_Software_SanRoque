(function () {
  const paths = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    bed: '<path d="M2 19v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8M2 15h20M6 9V5h5a3 3 0 0 1 3 3v1"/>',
    utensils: '<path d="M3 2v7a3 3 0 0 0 6 0V2M6 2v20M17 2v20M17 2c3 3 4 6 4 9h-4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5 5-3Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    bot: '<rect x="4" y="6" width="16" height="13" rx="2"/><path d="M12 2v4M8 11h.01M16 11h.01M9 16h6"/>',
    activity: '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    backup: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    chart: '<path d="M4 19V9M10 19V5M16 19v-7M22 19V3M2 21h22"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7L20 14"/><path d="M20 7v4h-4"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h7"/>',
  };

  function icon(name, label) {
    const title = label ? `<title>${String(label).replace(/[<>&]/g, '')}</title>` : '';
    return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${label ? 'role="img"' : 'aria-hidden="true"'}>${title}${paths[name] || paths.info}</svg>`;
  }

  window.AdminIcons = Object.freeze({ icon, names: Object.keys(paths) });
})();
