(function () {
  const galleries = new Map();
  const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
  const MAX_BYTES = 5 * 1024 * 1024;

  const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
  const galleryHost = (resource) => document.querySelector(`[data-media-gallery="${resource}"]`);

  function normalizeEntry(item, index) {
    const url = item.url || item.variants?.large?.url || item.variants?.hero?.url || '';
    return {
      mediaId: item.mediaId || item.id || '',
      url,
      thumb: item.thumb || item.variants?.thumb?.url || url,
      alt: item.alt || '',
      caption: item.caption || '',
      role: item.role || (index === 0 ? 'cover' : 'gallery'),
      order: index,
      focalPoint: item.focalPoint || { x: 50, y: 50 },
    };
  }

  function syncLegacyFields(resource) {
    const items = getGallery(resource);
    const cover = items.find((item) => item.role === 'cover') || items[0];
    const prefix = resource === 'alojamientos' ? 'alojamiento' : 'gastronomia';
    const main = document.getElementById(resource === 'alojamientos' ? 'alojamiento-mainImg' : 'gastronomia-imagen');
    const legacyGallery = document.getElementById(`${prefix}-galeria`);
    if (main) main.value = cover?.url || '';
    if (legacyGallery) legacyGallery.value = items.filter((item) => item !== cover).map((item) => item.url).join(', ');
    main?.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function renderGallery(resource) {
    const host = galleryHost(resource);
    if (!host) return;
    const items = getGallery(resource);
    const prefix = resource === 'alojamientos' ? 'alojamiento' : 'gastronomia';
    host.innerHTML = `
      <div class="media-gallery-toolbar">
        <button type="button" data-media-upload-trigger="${resource}">Subir fotografías</button>
        <button type="button" class="cancel-button" data-media-library-trigger="${resource}">Elegir de la biblioteca</button>
        <span>${items.length} ${items.length === 1 ? 'fotografía' : 'fotografías'}</span>
      </div>
      <div class="media-gallery-list" role="list">
        ${items.map((item, index) => `<article class="media-editor-item" draggable="true" role="listitem" data-media-index="${index}">
          ${(item.thumb || item.url) ? `<img src="${esc(item.thumb || item.url)}" alt="" loading="lazy">` : ''}
          <div class="media-editor-copy">
            <div class="media-editor-top"><strong>${item.role === 'cover' ? 'Portada' : item.role === 'social' ? 'Redes' : 'Galería'}</strong><span>${index + 1}</span></div>
            <label>Texto alternativo<input data-media-alt="${index}" value="${esc(item.alt)}" placeholder="Describí lo que se ve" /></label>
            <label>Epígrafe<input data-media-caption="${index}" value="${esc(item.caption)}" placeholder="Opcional" /></label>
            <div class="media-editor-actions">
              <button type="button" class="cancel-button" data-media-role="cover" data-media-index="${index}">Usar de portada</button>
              <button type="button" class="cancel-button" data-media-role="social" data-media-index="${index}">Usar en redes</button>
              <button type="button" class="cancel-button" data-media-move="up" data-media-index="${index}" aria-label="Mover imagen hacia arriba">↑</button>
              <button type="button" class="cancel-button" data-media-move="down" data-media-index="${index}" aria-label="Mover imagen hacia abajo">↓</button>
              <button type="button" class="danger-button" data-media-remove="${index}">Quitar</button>
            </div>
          </div>
        </article>`).join('') || '<div class="empty-state"><strong>La fotografía vende la experiencia.</strong><p>Subí una portada horizontal y después agregá detalles del lugar.</p></div>'}
      </div>`;
    const fileInput = document.getElementById(`${prefix}-image-file`);
    host.querySelector('[data-media-upload-trigger]')?.addEventListener('click', () => fileInput?.click());
    host.querySelector('[data-media-library-trigger]')?.addEventListener('click', () => openLibrary(resource));
    bindGalleryEvents(resource, host);
    syncLegacyFields(resource);
  }

  function bindGalleryEvents(resource, host) {
    host.querySelectorAll('[data-media-alt]').forEach((input) => input.addEventListener('input', () => {
      galleries.get(resource)[Number(input.dataset.mediaAlt)].alt = input.value;
    }));
    host.querySelectorAll('[data-media-caption]').forEach((input) => input.addEventListener('input', () => {
      galleries.get(resource)[Number(input.dataset.mediaCaption)].caption = input.value;
    }));
    host.querySelectorAll('[data-media-role]').forEach((button) => button.addEventListener('click', () => {
      const role = button.dataset.mediaRole;
      const selected = galleries.get(resource)[Number(button.dataset.mediaIndex)];
      galleries.get(resource).forEach((item) => { if (item.role === role) item.role = 'gallery'; });
      selected.role = role;
      renderGallery(resource);
    }));
    host.querySelectorAll('[data-media-remove]').forEach((button) => button.addEventListener('click', () => {
      galleries.get(resource).splice(Number(button.dataset.mediaRemove), 1);
      if (galleries.get(resource).length && !galleries.get(resource).some((item) => item.role === 'cover')) galleries.get(resource)[0].role = 'cover';
      renderGallery(resource);
    }));
    host.querySelectorAll('[data-media-move]').forEach((button) => button.addEventListener('click', () => move(resource, Number(button.dataset.mediaIndex), button.dataset.mediaMove === 'up' ? -1 : 1)));
    let from = null;
    host.querySelectorAll('.media-editor-item').forEach((item) => {
      item.addEventListener('dragstart', () => { from = Number(item.dataset.mediaIndex); item.classList.add('dragging'); });
      item.addEventListener('dragend', () => item.classList.remove('dragging'));
      item.addEventListener('dragover', (event) => event.preventDefault());
      item.addEventListener('drop', (event) => { event.preventDefault(); moveTo(resource, from, Number(item.dataset.mediaIndex)); });
    });
  }

  function move(resource, index, delta) { moveTo(resource, index, index + delta); }
  function moveTo(resource, from, to) {
    const items = galleries.get(resource) || [];
    if (!Number.isInteger(from) || to < 0 || to >= items.length || from === to) return;
    const [entry] = items.splice(from, 1);
    items.splice(to, 0, entry);
    renderGallery(resource);
  }

  function getGallery(resource) {
    return (galleries.get(resource) || []).map((item, order) => ({ ...item, order }));
  }

  function serializeMediaGallery(resource) {
    return { mediaGallery: getGallery(resource) };
  }

  function setGallery(resource, items) {
    galleries.set(resource, (Array.isArray(items) ? items : []).map(normalizeEntry));
    renderGallery(resource);
  }

  function validateFiles(files) {
    return Array.from(files || []).filter((file) => {
      if (!ALLOWED.has(file.type)) { window.showToast?.(`${file.name}: formato no permitido.`, 'error'); return false; }
      if (file.size > MAX_BYTES) { window.showToast?.(`${file.name}: supera 5 MB.`, 'error'); return false; }
      return true;
    }).slice(0, 12);
  }

  function uploadFiles(files, resource) {
    const accepted = validateFiles(files);
    if (!accepted.length) return;
    const queue = document.getElementById('media-upload-queue') || galleryHost(resource);
    if (queue) queue.setAttribute('aria-live', 'polite');
    const row = document.createElement('div');
    row.className = 'media-upload-row';
    row.innerHTML = `<div><strong>${accepted.length} ${accepted.length === 1 ? 'imagen' : 'imágenes'}</strong><span>Preparando optimización…</span></div><progress max="100" value="0">0%</progress>`;
    queue?.prepend(row);
    const data = new FormData();
    accepted.forEach((file) => data.append('files', file, file.name));
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/admin/api/media/upload');
    xhr.withCredentials = true;
    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;
      const value = Math.round((event.loaded / event.total) * 100);
      row.querySelector('progress').value = value;
      row.querySelector('span').textContent = value < 100 ? `Subiendo ${value}%` : 'Generando variantes WebP y AVIF…';
    });
    xhr.addEventListener('load', () => {
      let result = {};
      try { result = JSON.parse(xhr.responseText || '{}'); } catch (_) {}
      if (xhr.status < 200 || xhr.status >= 300) { row.classList.add('error'); row.querySelector('span').textContent = result.error || 'No se pudo procesar la carga.'; return; }
      row.classList.add('complete'); row.querySelector('progress').value = 100; row.querySelector('span').textContent = 'Carga y optimización completas.';
      if (resource) setGallery(resource, [...getGallery(resource), ...(result.media || []).map(normalizeEntry)]);
      document.dispatchEvent(new CustomEvent('media:uploaded', { detail: result.media || [] }));
    });
    xhr.addEventListener('error', () => { row.classList.add('error'); row.querySelector('span').textContent = 'Se perdió la conexión durante la carga.'; });
    xhr.send(data);
  }

  async function openLibrary(resource) {
    const response = await fetch('/admin/api/media', { credentials: 'include' });
    if (!response.ok) return;
    const data = await response.json();
    const picker = document.getElementById('media-picker');
    const grid = document.getElementById('media-picker-grid');
    grid.innerHTML = (data.media || []).map((item) => {
      const thumb = item.variants?.thumb?.url || item.url || '';
      return `<button type="button" class="media-choice" data-media-id="${esc(item.id)}">${thumb ? `<img src="${esc(thumb)}" alt="${esc(item.alt)}">` : ''}<span>${esc(item.filename)}</span></button>`;
    }).join('') || '<div class="empty-state"><p>No hay fotografías cargadas.</p></div>';
    picker.hidden = false;
    grid.querySelectorAll('[data-media-id]').forEach((button) => button.addEventListener('click', () => {
      const item = data.media.find((entry) => entry.id === button.dataset.mediaId);
      setGallery(resource, [...getGallery(resource), normalizeEntry(item, getGallery(resource).length)]);
      picker.hidden = true;
    }));
    picker.querySelector('input,button')?.focus();
  }

  document.addEventListener('DOMContentLoaded', () => {
    ['alojamientos', 'gastronomia'].forEach((resource) => setGallery(resource, []));
    document.querySelectorAll('#alojamiento-image-file,#gastronomia-image-file').forEach((input) => input.addEventListener('change', () => {
      uploadFiles(input.files, input.id.startsWith('alojamiento') ? 'alojamientos' : 'gastronomia');
      input.value = '';
    }));
    const dropzone = document.getElementById('media-dropzone');
    const centralInput = document.getElementById('media-upload-input');
    centralInput?.addEventListener('change', () => { uploadFiles(centralInput.files); centralInput.value = ''; });
    dropzone?.addEventListener('dragover', (event) => { event.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone?.addEventListener('drop', (event) => { event.preventDefault(); dropzone.classList.remove('dragover'); uploadFiles(event.dataTransfer.files); });
    dropzone?.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); centralInput?.click(); } });
    document.addEventListener('media:uploaded', () => window.loadResource?.('uploads'));
  });

  window.MediaManager = Object.freeze({ getGallery, setGallery, serializeMediaGallery, uploadFiles, openLibrary });
})();
