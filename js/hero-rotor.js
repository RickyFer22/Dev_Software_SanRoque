/* Rotor de fotos para cabeceras: <div class="hero-rotor" data-interval="5000"> con varias <img>.
   Pasa una foto por vez; sin movimiento si el usuario lo pide reducido. */
(function () {
  'use strict';
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.hero-rotor').forEach((rotor) => {
    const slides = Array.from(rotor.querySelectorAll('img'));
    if (slides.length < 2) return;
    slides[0].classList.add('is-active');
    if (reduce) return;
    const every = Number(rotor.dataset.interval) || 5000;
    let i = 0;
    setInterval(() => {
      if (document.hidden) return;
      slides[i].classList.remove('is-active');
      i = (i + 1) % slides.length;
      slides[i].classList.add('is-active');
    }, every);
  });
})();
