/* Mapa de la Guía práctica: resalta la parada elegida en el mapa y en las referencias.
   Funciona con las referencias del HTML o con las que trae el panel (js/sitio.js las reemplaza). */
(function () {
  'use strict';
  const stage = document.querySelector('.city-map-stage');
  if (!stage) return;
  let pinned = 0;

  const items = () => Array.from(stage.querySelectorAll('.city-map-legend ol > li'));

  function mark(n) {
    stage.querySelectorAll('.is-hot').forEach((e) => e.classList.remove('is-hot'));
    if (!n) return;
    stage.querySelectorAll('.city-pin[data-stop="' + n + '"]').forEach((p) => p.classList.add('is-hot'));
    const li = items()[n - 1];
    if (li) li.classList.add('is-hot');
  }

  const stopOf = (el) => {
    const pin = el.closest('.city-pin');
    if (pin) return Number(pin.dataset.stop);
    const li = el.closest('.city-map-legend ol > li');
    return li ? items().indexOf(li) + 1 : 0;
  };

  ['mouseover', 'focusin'].forEach((type) => stage.addEventListener(type, (e) => {
    const n = stopOf(e.target);
    if (n) mark(n);
  }));
  ['mouseleave', 'focusout'].forEach((type) => stage.addEventListener(type, () => mark(pinned)));

  stage.addEventListener('click', (e) => {
    const pin = e.target.closest('.city-pin');
    if (!pin) return;
    const n = Number(pin.dataset.stop);
    pinned = pinned === n ? 0 : n;
    mark(pinned);
    const li = items()[n - 1];
    if (li && window.matchMedia('(max-width: 760px)').matches) li.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
})();
