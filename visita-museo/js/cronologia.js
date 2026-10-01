/* Línea de tiempo del Museo de Arte Sacro: hechos de San Roque junto a hechos del país y del mundo,
 * para ver todo lo que el antiguo templo lleva presenciado. La usan la visita virtual y recorrido.html.
 *
 * k: 'local' (San Roque) | 'pais' (Argentina) | 'mundo'.  hasta: año final de un período.
 * Los hechos de San Roque salen de las reseñas citadas en `fuente`; las fechas de hechos del país y del mundo son
 * datos históricos generales. "Pendiente de validar" por el museo: cada hecho local debería confirmarse con la
 * documentación del archivo antes de difundirlo como definitivo.
 */
(function () {
  'use strict';
  const FUND = 1773; // fundación del pueblo
  const BUILT = 1783; // año en que se terminó el antiguo templo (hoy Museo de Arte Sacro)

  const HECHOS = [
    { y: 1773, f: '11 de octubre', k: 'local', t: 'Se funda el pueblo de San Roque',
      d: 'La fundación fue impulsada por Juan García de Cossio y el sacerdote Antonio de la Trinidad Martínez de Ibarra. Las primeras familias levantaron una capilla con sacristía y vivienda para el cura, en el paraje Paso de San Blas, junto al río Santa Lucía.', fuente: 'Municipio de San Roque' },
    { y: 1776, k: 'pais', t: 'Se crea el Virreinato del Río de la Plata',
      d: 'San Roque pertenece a ese territorio de la Corona española. La Argentina todavía no existe como país.' },
    { y: 1780, k: 'local', t: 'Se aprueba la creación de la parroquia',
      d: 'Es la fecha que señalan investigaciones históricas. El Arzobispado ubica la constitución de la parroquia dos años después: conviene distinguir la aprobación de la organización posterior.', fuente: 'Arzobispado de Corrientes' },
    { y: 1782, k: 'local', t: 'Se constituye la parroquia',
      d: 'Su influencia llegó a ser regional: el curato comprendía las capillas de Goya, Curuzú Cuatiá y Concepción.', fuente: 'Arzobispado de Corrientes' },
    { y: 1783, f: '12 de febrero', k: 'local', t: 'Se termina el antiguo templo',
      d: 'Es el edificio que hoy alberga el Museo de Arte Sacro. Su construcción original es de adobe, con paredes de un metro y medio de ancho.', fuente: 'El Litoral' },
    { y: 1810, f: '25 de mayo', k: 'pais', t: 'Revolución de Mayo',
      d: 'Comienza el camino hacia la independencia. El templo tiene 27 años.' },
    { y: 1816, f: '9 de julio', k: 'pais', t: 'Declaración de la Independencia',
      d: 'Nace formalmente el país. El templo ya llevaba 33 años en pie.' },
    { y: 1853, f: '1 de mayo', k: 'pais', t: 'Se sanciona la Constitución Nacional',
      d: 'Se organiza el país bajo una constitución que sigue vigente.' },
    { y: 1865, hasta: 1870, k: 'pais', t: 'Guerra de la Triple Alianza',
      d: 'Corrientes fue invadida por tropas paraguayas en 1865. El museo nuevo exhibe objetos de esa guerra.' },
    { y: 1865, k: 'local', t: 'San Roque, capital provisoria de Corrientes',
      d: 'Con la ciudad de Corrientes ocupada, el gobernador Manuel Ignacio Lagraña trasladó su gobierno al interior. La Casa Histórica (Casa Lagraña), en Benjamín Virasoro y San Martín, fue sede del Gobierno durante algunos meses.', fuente: 'Municipio de San Roque' },
    { y: 1870, k: 'local', t: 'Nueva fachada: pórtico y torre campanario',
      d: 'El templo modifica su fachada y suma el pórtico y la torre campanario que se ven hoy.', fuente: 'El Litoral' },
    { y: 1914, hasta: 1918, k: 'mundo', t: 'Primera Guerra Mundial',
      d: 'La Argentina se mantuvo neutral. El templo ya tenía más de 130 años.' },
    { y: 1930, f: '6 de septiembre', k: 'pais', t: 'Primer golpe de Estado del siglo XX',
      d: 'Una interrupción del orden constitucional que marcó buena parte del siglo.' },
    { y: 1939, hasta: 1945, k: 'mundo', t: 'Segunda Guerra Mundial',
      d: 'La Argentina fue neutral casi todo el conflicto y declaró la guerra al Eje recién en marzo de 1945.' },
    { y: 1941, k: 'local', t: 'El padre Ángel Esteban Romero asume la parroquia',
      d: 'Estará al frente durante 48 años, hasta 1989. El museo lleva hoy su nombre.', fuente: 'Diario El Libertador' },
    { y: 1968, k: 'local', t: 'Monumento Histórico Nacional',
      d: 'El antiguo templo es declarado Monumento Histórico Nacional por el Decreto 1791/1968.', fuente: 'Argentina.gob.ar' },
    { y: 1969, f: '20 de julio', k: 'mundo', t: 'El ser humano llega a la Luna',
      d: 'El templo cumplía 186 años.' },
    { y: 1973, k: 'local', t: 'Bicentenario del pueblo y nueva parroquia',
      d: 'Se levanta la actual parroquia San Roque de Montpellier, un edificio distinto de la antigua capilla.', fuente: 'Diario El Libertador' },
    { y: 1973, k: 'local', t: 'La Casa Histórica, Monumento Histórico Provincial',
      d: 'Queda protegida por la Ley N.º 3151, según cita el Ministerio de Obras Públicas de la Provincia.', fuente: 'Ministerio de Obras Públicas de Corrientes' },
    { y: 1976, hasta: 1983, k: 'pais', t: 'Última dictadura militar',
      d: 'Un período de ocho años de gobierno de facto.' },
    { y: 1982, k: 'local', t: 'El antiguo templo se convierte en museo',
      d: 'Pasa a albergar el Museo de Arte Sacro y Antigüedades Correntinas «Presbítero Ángel Esteban Romero».', fuente: 'Arzobispado de Corrientes' },
    { y: 1982, f: '2 de abril al 14 de junio', k: 'pais', t: 'Guerra de Malvinas',
      d: 'Ocurre el mismo año en que el templo se abre como museo.' },
    { y: 1983, f: '10 de diciembre', k: 'pais', t: 'Vuelve la democracia',
      d: 'Comienza el período democrático más largo de la historia argentina.' },
    { y: 1989, k: 'local', t: 'Termina la gestión del padre Romero',
      d: 'Estuvo 48 años al frente de la parroquia, de 1941 a 1989.', fuente: 'Diario El Libertador' },
    { y: 1994, k: 'pais', t: 'Reforma de la Constitución Nacional',
      d: 'Se actualiza el texto constitucional de 1853.' },
    { y: 2020, k: 'mundo', t: 'Pandemia de COVID-19',
      d: 'La Argentina decreta el aislamiento obligatorio en marzo y los espacios culturales cierran durante meses.' },
    { y: 2022, f: 'septiembre', k: 'local', t: 'Se informa la recuperación de la Casa Histórica',
      d: 'La Provincia anunció la puesta en valor de la casa, una ampliación que reproduce su configuración original y un museo de unos 900 m². Son características del proyecto anunciado.', fuente: 'Ministerio de Obras Públicas de Corrientes' },
    { y: 2023, f: '10 de octubre', k: 'local', t: 'Se inaugura el Museo de la Ciudad de San Roque',
      d: 'El museo nuevo, en vísperas de los 250 años de la localidad, integra con la Casa Lagraña y el antiguo Museo de Arte Sacro un complejo museográfico.', fuente: 'Agenda Corrientes, Corrientes al Día' },
  ];

  const ERAS = [
    [0, 'Virreinato del Río de la Plata'],
    [1810, 'Nace la Argentina'],
    [1900, 'Siglo XX'],
    [2000, 'Siglo XXI'],
  ];
  const TAG = { local: 'San Roque', pais: 'Argentina', mundo: 'Mundo' };
  const FILTROS = [['todo', 'Todo'], ['local', 'San Roque'], ['ext', 'País y mundo']];

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };

  function eraOf(y) {
    let name = ERAS[0][1];
    ERAS.forEach(([from, label]) => { if (y >= from) name = label; });
    return name;
  }

  function render(host, opts) {
    opts = opts || {};
    const now = new Date().getFullYear();
    const hechos = HECHOS.concat([{ y: now, k: 'local', hoy: true, t: 'Hoy',
      d: 'San Roque cumple ' + (now - FUND) + ' años. El antiguo templo sigue en pie y se recorre como museo, ' + (now - BUILT) + ' años después de terminarse.' }])
      .sort((a, b) => a.y - b.y);
    host.textContent = '';
    host.classList.add('ct');

    const hero = el('div', 'ct-hero');
    const big = el('p', 'ct-big');
    big.appendChild(el('strong', '', String(now - FUND)));
    big.appendChild(document.createTextNode(' años de historia'));
    hero.appendChild(big);
    hero.appendChild(el('p', 'ct-lead', 'San Roque se fundó en ' + FUND + ' y su antiguo templo se terminó en ' + BUILT + ': hoy es el Museo de Arte Sacro. Desde entonces pasaron la Revolución de Mayo, la Independencia, la Guerra de la Triple Alianza y las dos guerras mundiales.'));
    host.appendChild(hero);

    const bar = el('div', 'ct-filters');
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Qué hechos mostrar');
    host.appendChild(bar);

    const list = el('ol', 'ct-list');
    let lastEra = '';
    hechos.forEach((h) => {
      const era = eraOf(h.y);
      if (era !== lastEra) {
        lastEra = era;
        const eh = el('li', 'ct-era', era);
        eh.setAttribute('aria-hidden', 'true');
        list.appendChild(eh);
      }
      const li = el('li', 'ct-item is-' + (h.k === 'local' ? 'local' : 'ext') + (h.hoy ? ' is-hoy' : ''));
      li.dataset.k = h.k === 'local' ? 'local' : 'ext';
      const year = el('span', 'ct-year', h.y + (h.hasta ? '–' + h.hasta : ''));
      const card = el('div', 'ct-card');
      const tag = el('span', 'ct-tag', TAG[h.k]);
      card.appendChild(tag);
      card.appendChild(el('h3', '', h.t));
      if (h.f) card.appendChild(el('p', 'ct-date', h.f));
      card.appendChild(el('p', 'ct-desc', h.d));
      if (h.fuente) card.appendChild(el('p', 'ct-src', 'Fuente: ' + h.fuente));
      li.appendChild(year);
      li.appendChild(card);
      list.appendChild(li);
    });
    host.appendChild(list);
    host.appendChild(el('p', 'ct-note', 'Los hechos de San Roque se toman de reseñas históricas y están pendientes de validar con el archivo del museo.'));

    function apply(f) {
      list.querySelectorAll('.ct-item').forEach((li) => { li.hidden = f !== 'todo' && li.dataset.k !== f; });
      list.querySelectorAll('.ct-era').forEach((eh) => {
        let n = eh.nextElementSibling, any = false;
        while (n && !n.classList.contains('ct-era')) { if (!n.hidden) any = true; n = n.nextElementSibling; }
        eh.hidden = !any;
      });
      bar.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
    }
    FILTROS.forEach(([f, label]) => {
      const b = el('button', 'ct-chip', label);
      b.type = 'button';
      b.dataset.f = f;
      b.addEventListener('click', () => apply(f));
      bar.appendChild(b);
    });
    apply('todo');
  }

  window.CronologiaSacro = { render, hechos: HECHOS, anioTemplo: BUILT, anioFundacion: FUND };
})();
