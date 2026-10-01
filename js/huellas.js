/* Huellas de San Roque: el botón de reproducir cubre el póster hasta que el video se reproduce. */
(function () {
  'use strict';
  const stage = document.querySelector('[data-huellas]');
  if (!stage) return;
  const video = stage.querySelector('video');
  const btn = stage.querySelector('.hs-play');
  const sync = () => stage.classList.toggle('is-playing', !video.paused && !video.ended);
  btn.addEventListener('click', () => { video.play().catch(() => {}); video.focus({ preventScroll: true }); });
  ['play', 'playing', 'pause', 'ended'].forEach((e) => video.addEventListener(e, sync));
})();
