/* Calendario anual de fiestas y encuentros de San Roque (folleto turístico).
   Fuente única: se dibuja en cualquier <ol data-agenda-anual>. */
(function () {
  'use strict';
  const FIESTAS = [
    ['Enero / febrero', 'Carnavales'],
    ['Abril', 'Encuentro Regional de Emprendedores, Artesanos y Expositores'],
    ['Junio', 'Fiesta de la Gastronomía Tradicional y Regional'],
    ['Agosto', 'Fiestas Patronales'],
    ['Septiembre', 'Estudiantina'],
    ['Octubre', 'Recordatorio de la fundación de la localidad'],
    ['Noviembre', 'Fiesta de la Tradición y el Folclore'],
    ['Diciembre', 'Bingo de Carnaval'],
  ];
  document.querySelectorAll('[data-agenda-anual]').forEach((host) => {
    host.replaceChildren(...FIESTAS.map(([mes, titulo]) => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      const strong = document.createElement('strong');
      span.textContent = mes;
      strong.textContent = titulo;
      li.append(span, strong);
      return li;
    }));
  });
})();
