/* Rotor de fotos para cabeceras: <div class="hero-rotor" data-interval="5000"> con varias <img>.
   Pasa una foto por vez; sin movimiento si el usuario lo pide reducido.
   js/sitio.js puede reemplazar las fotos con las del panel y llamar a VsrHeroRotor.start. */
(function () {
  'use strict';
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timers = new WeakMap();

  function start(rotor) {
    clearInterval(timers.get(rotor));
    const slides = Array.from(rotor.querySelectorAll('img'));
    if (!slides.length) return;
    slides.forEach((s) => s.classList.remove('is-active'));
    slides[0].classList.add('is-active');
    if (slides.length < 2 || reduce) return;
    const every = Number(rotor.dataset.interval) || 5000;
    let i = 0;
    timers.set(rotor, setInterval(() => {
      if (document.hidden) return;
      slides[i].classList.remove('is-active');
      i = (i + 1) % slides.length;
      slides[i].classList.add('is-active');
    }, every));
  }

  window.VsrHeroRotor = { start };
  document.querySelectorAll('.hero-rotor').forEach(start);
})();
