// js/monjita.js
// Colección interactiva de la Monjita Dominica en el hero:
//  - Mini-rotor: alterna las imágenes de la tarjeta del hero.
//  - Modal: galería con miniaturas + nota (historia). Cierra con X, backdrop o Escape.

(function () {
  'use strict';

  const SOURCES = [
    'img/monjita/monjita-4.jpg',
    'img/monjita/monjita-5.jpg',
    'img/monjita/monjita-1.jpg',
    'img/monjita/monjita-2.jpg',
    'img/monjita/monjita-3.jpg',
  ];

  document.addEventListener('DOMContentLoaded', () => {
    // Mini-rotor de la tarjeta del hero.
    const heroImgs = Array.from(document.querySelectorAll('.monjita-hero-img'));
    if (heroImgs.length > 1) {
      let idx = 0;
      setInterval(() => {
        heroImgs[idx].classList.remove('is-active');
        idx = (idx + 1) % heroImgs.length;
        heroImgs[idx].classList.add('is-active');
      }, 2800);
    }

    const modal = document.getElementById('monjita-modal');
    const openBtn = document.getElementById('monjita-open');
    const main = document.getElementById('monjita-gallery-main');
    const thumbs = document.getElementById('monjita-thumbs');
    if (!modal || !openBtn) return;

    // Galería de miniaturas.
    if (thumbs && main) {
      SOURCES.forEach((src, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'monjita-thumb' + (i === 0 ? ' is-active' : '');
        b.innerHTML = `<img src="${src}" alt="Monjita dominica ${i + 1}" loading="lazy" />`;
        b.addEventListener('click', () => {
          main.src = src;
          thumbs.querySelectorAll('.monjita-thumb').forEach((t) => t.classList.remove('is-active'));
          b.classList.add('is-active');
        });
        thumbs.appendChild(b);
      });
    }

    let lastFocus = null;
    const open = () => {
      lastFocus = document.activeElement;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      const x = modal.querySelector('.monjita-modal-x');
      if (x) x.focus();
    };
    const close = () => {
      modal.hidden = true;
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };

    openBtn.addEventListener('click', open);
    modal.querySelectorAll('[data-monjita-close]').forEach((el) => el.addEventListener('click', close));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) close();
    });
  });
})();
