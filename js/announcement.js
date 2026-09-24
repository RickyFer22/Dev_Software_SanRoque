(function () {
  'use strict';

  function validImageUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    const url = value.trim();
    if (/^javascript:/i.test(url) || /^data:/i.test(url)) return '';
    return url;
  }

  function escapeAttribute(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function closeAnnouncement(dialog) {
    dialog.classList.remove('is-visible');
    dialog.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('announcement-open');
    window.setTimeout(() => dialog.remove(), 220);
  }

  function renderAnnouncement(config) {
    const imageUrl = validImageUrl(config && config.imageUrl);
    if (!config || config.enabled !== true || !imageUrl) return;

    const dialog = document.createElement('div');
    dialog.id = 'portal-announcement';
    dialog.className = 'portal-announcement';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Anuncio de San Roque');
    dialog.setAttribute('aria-hidden', 'true');
    dialog.innerHTML = `
      <div class="portal-announcement-backdrop" data-announcement-close></div>
      <div class="portal-announcement-panel" role="document">
        <button type="button" class="portal-announcement-close" data-announcement-close aria-label="Cerrar anuncio">&times;</button>
        <img class="portal-announcement-image" src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(config.alt || 'Anuncio de San Roque')}" />
      </div>
    `;
    document.body.appendChild(dialog);
    document.body.classList.add('announcement-open');

    const close = () => closeAnnouncement(dialog);
    dialog.querySelectorAll('[data-announcement-close]').forEach((element) => element.addEventListener('click', close));
    document.addEventListener('keydown', function onKeydown(event) {
      if (event.key === 'Escape' && document.body.contains(dialog)) {
        close();
        document.removeEventListener('keydown', onKeydown);
      }
    });
    dialog.querySelector('.portal-announcement-image').addEventListener('error', close);
    requestAnimationFrame(() => {
      dialog.setAttribute('aria-hidden', 'false');
      dialog.classList.add('is-visible');
      dialog.querySelector('.portal-announcement-close').focus();
    });
  }

  document.addEventListener('DOMContentLoaded', async function () {
    try {
      const response = await fetch('/api/data', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      renderAnnouncement(data.announcement);
    } catch (error) {
      console.info('No se pudo cargar el anuncio de entrada', error.message);
    }
  });
})();
