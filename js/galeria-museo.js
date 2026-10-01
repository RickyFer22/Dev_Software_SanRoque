/* Galería del museo antiguo: ampliación en un cuadro de diálogo con teclado (←, →, Esc) y foco devuelto al cerrar. */
(function () {
  'use strict';
  const tl = document.getElementById('cronologia-host');
  if (tl && window.CronologiaSacro) window.CronologiaSacro.render(tl);
  const dlg = document.getElementById('ma-dialog');
  const btns = Array.from(document.querySelectorAll('.ma-btn'));
  if (!dlg || !btns.length || typeof dlg.showModal !== 'function') return;
  const img = dlg.querySelector('img'), cap = dlg.querySelector('figcaption');
  let cur = 0, opener = null;
  function show(i) {
    cur = (i + btns.length) % btns.length;
    const t = btns[cur].querySelector('img');
    img.src = t.dataset.full; img.alt = t.alt; cap.textContent = t.alt;
  }
  btns.forEach((b, i) => b.addEventListener('click', () => { opener = b; show(i); dlg.showModal(); dlg.querySelector('.ma-close').focus(); }));
  dlg.querySelector('.ma-prev').addEventListener('click', () => show(cur - 1));
  dlg.querySelector('.ma-next').addEventListener('click', () => show(cur + 1));
  dlg.querySelector('.ma-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') show(cur - 1); else if (e.key === 'ArrowRight') show(cur + 1); });
  dlg.addEventListener('close', () => { if (opener) opener.focus(); });
})();
