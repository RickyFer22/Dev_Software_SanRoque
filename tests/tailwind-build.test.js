const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// Ganchos que sólo usa el JS para encontrar nodos o que estilan librerías
// externas (Font Awesome): no son utilidades y no salen del build.
const SIN_ESTILO_PROPIO = new Set([
  'chat-card-placeholder', 'chat-logo', 'gastro-chips-filters', 'gastro-share-btn',
  'interactive-stars', 'star-btn', 'vote-label', 'visita-fab-label', 'vsr-interactive',
  'vsr-avg', 'vsr-avg-empty', 'vsr-avg-num', 'vsr-avg-stars', 'vsr-star-empty', 'vsr-star-fill',
  'next', 'prev', 'light', 'fas', 'fa-brands',
]);

const classesIn = (source) => {
  const out = new Set();
  for (const m of source.matchAll(/class(?:Name)?="([^"]*)"/g)) {
    if (m[1].includes('${')) continue;
    m[1].split(/\s+/).filter(Boolean).forEach((c) => out.add(c));
  }
  return out;
};

test('el bundle compilado cubre las utilidades que usan las páginas', () => {
  const pages = fs.readdirSync(root).filter((f) => f.endsWith('.html') && f !== 'gastronomia-premium.html');
  const scripts = fs.readdirSync(path.join(root, 'js')).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f);

  const css = read('css/tw-base.css') + read('css/styles.css');
  const definidas = new Set();
  for (const m of css.matchAll(/\.((?:\\.|[^\s,{:>~+.[\]"'])+)/g)) definidas.add(m[1].replace(/\\/g, ''));
  // Las utilidades arbitrarias salen escapadas (las comas, por ejemplo, como
  // "\2c "), así que se busca el prefijo y los tramos legibles del valor.
  const tieneArbitraria = (c) => {
    const prefijo = c.slice(0, c.indexOf('[')).replace(/([./])/g, '\\$1');
    const tramos = c.match(/[a-z0-9]{3,}/gi) || [];
    return css.includes(`${prefijo}\\[`) && tramos.every((t) => css.includes(t));
  };

  const faltantes = [];
  for (const file of [...pages, ...scripts]) {
    for (const clase of classesIn(read(file))) {
      if (definidas.has(clase) || SIN_ESTILO_PROPIO.has(clase)) continue;
      if (clase.startsWith('material-symbols') || clase.startsWith('fa-')) continue;
      if (clase.includes('[') && tieneArbitraria(clase)) continue;
      faltantes.push(`${clase}  (${file})`);
    }
  }

  assert.deepEqual(faltantes, [], `Clases sin definir: falta correr "npm run build:css"\n  ${faltantes.join('\n  ')}`);
});

test('hay un único bundle de utilidades y se genera desde el repositorio', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts['build:css'], /tailwindcss -c tailwind\.config\.js/);
  assert.ok(fs.existsSync(path.join(root, 'tailwind.config.js')), 'falta tailwind.config.js');
  assert.ok(fs.existsSync(path.join(root, 'css/src/tailwind.css')), 'falta la entrada del build');
  assert.ok(!fs.existsSync(path.join(root, 'css/tw-gastronomia.css')), 'el bundle de gastronomía volvió a aparecer');

  // Todas las páginas comparten el mismo bundle: cuando eran dos, gastronomía
  // se quedó sin utilidades y el texto del hero salía gris sobre la foto.
  for (const file of fs.readdirSync(root).filter((f) => f.endsWith('.html'))) {
    assert.doesNotMatch(read(file), /tw-gastronomia\.css/, file);
  }
});
