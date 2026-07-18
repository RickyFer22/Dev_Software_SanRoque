(function () {
  let dialog;
  let items = [];
  let index = 0;
  let returnFocus;
  let touchStart = 0;

  const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));

  function responsivePicture(item, className, loading = 'lazy') {
    const variants = item.variants || {};
    const fallback = variants.large?.url || variants.hero?.url || item.url || item.src || '';
    const webp = ['thumb', 'card', 'medium', 'large', 'hero'].map((key) => variants[key]?.url ? `${variants[key].url} ${variants[key].width || 0}w` : '').filter(Boolean).join(', ');
    const avif = ['thumb', 'card', 'medium', 'large', 'hero'].map((key) => variants[key]?.avifUrl ? `${variants[key].avifUrl} ${variants[key].width || 0}w` : '').filter(Boolean).join(', ');
    return `<picture>${avif ? `<source type="image/avif" srcset="${esc(avif)}">` : ''}${webp ? `<source type="image/webp" srcset="${esc(webp)}">` : ''}<img class="${esc(className || '')}" src="${esc(fallback)}" alt="${esc(item.alt || '')}" loading="${loading}" decoding="async" width="${item.width || 1600}" height="${item.height || 1000}"></picture>`;
  }

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.createElement('div');
    dialog.className = 'tourism-lightbox';
    dialog.hidden = true;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Galería de fotografías');
    dialog.innerHTML = '<div class="lightbox-toolbar"><span data-lightbox-count></span><button type="button" data-lightbox-close aria-label="Cerrar galería">Cerrar</button></div><button type="button" class="lightbox-arrow prev" data-lightbox-prev aria-label="Fotografía anterior">‹</button><div class="lightbox-stage" data-lightbox-stage></div><button type="button" class="lightbox-arrow next" data-lightbox-next aria-label="Fotografía siguiente">›</button><div class="lightbox-thumbs" data-lightbox-thumbs></div>';
    document.body.appendChild(dialog);
    dialog.querySelector('[data-lightbox-close]').addEventListener('click', close);
    dialog.querySelector('[data-lightbox-prev]').addEventListener('click', () => show(index - 1));
    dialog.querySelector('[data-lightbox-next]').addEventListener('click', () => show(index + 1));
    dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
    dialog.addEventListener('touchstart', (event) => { touchStart = event.touches[0].clientX; }, { passive: true });
    dialog.addEventListener('touchend', (event) => { const delta = event.changedTouches[0].clientX - touchStart; if (Math.abs(delta) > 45) show(index + (delta < 0 ? 1 : -1)); }, { passive: true });
    document.addEventListener('keydown', (event) => {
      if (dialog.hidden) return;
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') show(index + 1);
      if (event.key === 'ArrowLeft') show(index - 1);
      if (event.key === 'Tab') {
        const focusable = Array.from(dialog.querySelectorAll('button:not([hidden])'));
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    return dialog;
  }

  function show(next) {
    if (!items.length) return;
    index = (next + items.length) % items.length;
    const item = items[index];
    dialog.querySelector('[data-lightbox-count]').textContent = `${index + 1} de ${items.length}${item.caption ? ` · ${item.caption}` : ''}`;
    dialog.querySelector('[data-lightbox-stage]').innerHTML = responsivePicture(item, 'lightbox-image', 'eager');
    dialog.querySelector('[data-lightbox-thumbs]').innerHTML = items.map((entry, itemIndex) => `<button type="button" aria-label="Ver fotografía ${itemIndex + 1}" aria-current="${itemIndex === index ? 'true' : 'false'}" data-lightbox-index="${itemIndex}">${responsivePicture(entry, '', 'lazy')}</button>`).join('');
    dialog.querySelectorAll('[data-lightbox-index]').forEach((button) => button.addEventListener('click', () => show(Number(button.dataset.lightboxIndex))));
  }

  function open(nextItems, startIndex = 0, trigger) {
    items = (nextItems || []).filter((item) => item && (item.url || item.src || item.variants));
    if (!items.length) return;
    ensureDialog();
    returnFocus = trigger || document.activeElement;
    dialog.hidden = false;
    document.body.classList.add('lightbox-open');
    show(startIndex);
    dialog.querySelector('[data-lightbox-close]').focus();
  }

  function close() {
    if (!dialog) return;
    dialog.hidden = true;
    document.body.classList.remove('lightbox-open');
    returnFocus?.focus?.();
  }

  window.TourismGallery = Object.freeze({ open, close, responsivePicture });
})();
