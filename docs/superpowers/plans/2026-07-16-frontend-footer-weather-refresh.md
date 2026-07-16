# Frontend Footer and Weather Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir el pie de página de `index.html` según la referencia visual suministrada y sustituir la paleta celeste del módulo meteorológico por una paleta terracota complementaria al verde oliva institucional.

**Architecture:** Mantener HTML, CSS y JavaScript vanilla. El footer será una composición de tres franjas —coronamiento de marca, navegación institucional y créditos— construida con HTML semántico y CSS propio, sin depender de utilidades Tailwind para contraste o layout. El clima conserva su lógica y DOM actuales; cambia únicamente el sistema de color y sus estados interactivos.

**Tech Stack:** HTML5, CSS custom properties, JavaScript existente, Node.js `node:test`, verificación visual con navegador a 1440 px, 768 px y 375 px.

## Global Constraints

- Fuente visual principal: `C:/Users/Ricardo/Downloads/ChatGPT Image 16 jul 2026, 10_46_13 a.m..png`.
- El footer debe conservar el wordmark multicolor 3D existente y los enlaces municipales oficiales.
- El verde base continúa siendo `#274F10`; no introducir otra identidad cromática general.
- El módulo meteorológico no puede usar celeste o azul en fondo, borde ni hover.
- Paleta meteorológica aprobada para el plan: `#4B211C`, `#6F2F25`, `#98452E`, `#B85E38`, icono `#FFD27A`, texto `#FFFFFF`.
- No modificar la API meteorológica, IDs de campos, lógica de carga ni fallbacks.
- No agregar dependencias, imágenes remotas nuevas ni librerías de iconos.
- El footer debe funcionar aunque las utilidades Tailwind no carguen; sus estilos esenciales serán reglas CSS explícitas.
- Mantener foco visible, objetivos táctiles de 44 px y soporte `prefers-reduced-motion`.
- Mantener intactos los cambios actuales del panel admin; este plan toca solo frontend público y pruebas relacionadas.

---

## Diagnóstico actual

- En producción el footer posee la información correcta, pero el contraste colapsa: textos y enlaces oscuros quedan sobre verde oscuro.
- La jerarquía visual actual no coincide con la referencia: el wordmark no corona una onda limpia, las redes no se leen como botones y las columnas pierden alineación.
- El checkout local contiene una variante compacta que omite columnas institucionales que sí aparecen en producción y que las pruebas esperan.
- El clima usa `#0A4363`, `#0F5A7E`, `#17739B`, `#2189B8` y `#2E97C4`; ese bloque celeste se separa de la paleta oliva, dorada y multicolor del portal.
- El footer deseado tiene una franja crema superior, dos lomas verdes, wordmark superpuesto, línea dorada, botones sociales marfil, cuadrícula de cuatro columnas y créditos en verde casi negro.

## Dirección visual

### Footer

- **Coronamiento:** fondo crema `#F6F1E7`, silueta ondulada verde `#244C1D` y wordmark centrado superpuesto entre 72 y 92 px.
- **Franja social:** verde medio `#355F2B`, borde superior dorado `#D4A83C`, botones marfil `#F7F2E8` con iconos oliva.
- **Navegación:** fondo `#1F431B`, texto principal `#FFFFFF`, texto secundario `#D7E2CF`, títulos dorados `#E2BD58`.
- **Créditos:** fondo `#142B13`, divisor `rgba(226,189,88,.28)` y textos secundarios `#9EB292`.
- **Profundidad:** gradientes verticales suaves y un único halo detrás del wordmark; eliminar el tapiz circular que compite con la legibilidad.

### Clima

El terracota es el contrapeso cálido del oliva y toma colores ya presentes en las letras “S”, “a” y “e” del wordmark.

| Token | Valor | Uso |
|---|---:|---|
| `--weather-900` | `#4B211C` | Panel y sombra profunda |
| `--weather-800` | `#6F2F25` | Inicio del gradiente |
| `--weather-650` | `#98452E` | Final del gradiente |
| `--weather-500` | `#B85E38` | Hover controlado |
| `--weather-sun` | `#FFD27A` | Icono `light_mode` y acentos |
| `--weather-text` | `#FFFFFF` | Temperatura y métricas |

---

## Mapa de archivos

- Modify: `index.html` — estructura semántica completa del footer.
- Modify: `css/styles.css` — tokens, composición del footer, responsive y nueva paleta del clima.
- Modify: `tests/portal-ux.test.js` — contratos estáticos del footer y prohibición de azul en clima.
- Create: `tests/frontend-footer-weather.test.js` — pruebas específicas del rediseño.
- Create during QA: `output/frontend-footer-1440.png` — captura local, no se versiona.

---

### Task 1: Congelar el contrato visual y semántico

**Files:**
- Create: `tests/frontend-footer-weather.test.js`
- Modify: `tests/portal-ux.test.js`

**Interfaces:**
- Consumes: `index.html` y `css/styles.css`.
- Produces: guardias de estructura y color usadas por las demás tareas.

- [ ] **Step 1: Escribir las pruebas fallidas**

Crear `tests/frontend-footer-weather.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('el footer público implementa coronamiento, redes, navegación y créditos', () => {
  const html = read('index.html');
  for (const hook of [
    'footer-crown',
    'footer-social-band',
    'footer-navigation',
    'footer-brand-column',
    'footer-credit-band',
  ]) assert.match(html, new RegExp(`class="[^"]*${hook}`));

  assert.match(html, /aria-label="Redes sociales municipales"/);
  assert.match(html, /aria-label="Explorar San Roque"/);
  assert.match(html, /aria-label="Planificar la visita"/);
  assert.match(html, /aria-label="Canales institucionales"/);
});

test('los enlaces institucionales y créditos permanecen completos', () => {
  const html = read('index.html');
  assert.match(html, /https:\/\/www\.instagram\.com\/sanroque\.municipio/);
  assert.match(html, /https:\/\/www\.facebook\.com\/share\/1AW5YTS5oZ\//);
  assert.match(html, /Daniel Almirón/);
  assert.match(html, /Lucas Sánchez/);
  assert.match(html, /Milca Martínez/);
  assert.match(html, /Román Rossi/);
  assert.match(html, /Tomás Rolet/);
  assert.match(html, /Javier Legal/);
  assert.match(html, /Yésica Ponce/);
});

test('el clima usa terracota complementario y no azul cielo', () => {
  const css = read('css/styles.css');
  const weather = css.match(/\/\* ── WEATHER WIDGET[\s\S]*?(?=\/\* ──)/)?.[0] || '';
  assert.match(weather, /--weather-900:\s*#4B211C/i);
  assert.match(weather, /--weather-800:\s*#6F2F25/i);
  assert.match(weather, /--weather-650:\s*#98452E/i);
  assert.match(weather, /--weather-sun:\s*#FFD27A/i);
  assert.doesNotMatch(weather, /#0A4363|#0F5A7E|#17739B|#2189B8|#2E97C4/i);
});

test('el footer define layouts específicos para tablet y móvil', () => {
  const css = read('css/styles.css');
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.footer-navigation/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*\.footer-crown/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
```

- [ ] **Step 2: Ejecutar y observar el rojo inicial**

Run: `node --test tests/frontend-footer-weather.test.js`

Expected: FAIL por hooks de footer y tokens meteorológicos inexistentes.

- [ ] **Step 3: Corregir las expectativas históricas de `portal-ux`**

Conservar las pruebas de enlaces oficiales y autores; actualizar únicamente copys que ya usan acentos reales:

```js
assert.match(html, /Tomás Rolet/);
assert.match(html, /Profesora:\s*Yésica Ponce/);
assert.match(html, /Creado por pasantes|Desarrollado por estudiantes/);
```

- [ ] **Step 4: Ejecutar ambas pruebas y confirmar que fallan solo por el nuevo diseño**

Run: `node --test tests/frontend-footer-weather.test.js tests/portal-ux.test.js`

Expected: las aserciones históricas válidas pasan; los hooks nuevos continúan en rojo.

- [ ] **Step 5: Commit**

```bash
git add tests/frontend-footer-weather.test.js tests/portal-ux.test.js
git commit -m "test(frontend): definir contrato de footer y clima"
```

---

### Task 2: Reconstruir el HTML semántico del footer

**Files:**
- Modify: `index.html:486`
- Test: `tests/frontend-footer-weather.test.js`

**Interfaces:**
- Consumes: `.sr-wordmark` existente y URLs municipales existentes.
- Produces: hooks estructurales para CSS sin cambiar URLs públicas.

- [ ] **Step 1: Reemplazar el footer actual por la estructura final**

```html
<footer id="contacto" class="site-footer" aria-labelledby="footer-title">
  <div class="footer-crown">
    <div class="footer-hills" aria-hidden="true"></div>
    <span class="sr-wordmark sr-wordmark-footer" aria-label="San Roque">
      <span class="sr-l1">S</span><span class="sr-l2">a</span><span class="sr-l3">n</span>&nbsp;<span class="sr-l4">R</span><span class="sr-l5">o</span><span class="sr-l6">q</span><span class="sr-l7">u</span><span class="sr-l8">e</span>
    </span>
  </div>

  <div class="footer-social-band">
    <div class="footer-social-links" aria-label="Redes sociales municipales">
      <a href="https://www.instagram.com/sanroque.municipio" target="_blank" rel="noopener noreferrer" aria-label="Seguir a la Municipalidad de San Roque en Instagram"><i class="fa-brands fa-instagram" aria-hidden="true"></i><span>Instagram</span></a>
      <a href="https://www.facebook.com/share/1AW5YTS5oZ/" target="_blank" rel="noopener noreferrer" aria-label="Seguir a la Municipalidad de San Roque en Facebook"><i class="fa-brands fa-facebook-f" aria-hidden="true"></i><span>Facebook</span></a>
    </div>
  </div>

  <div class="footer-navigation">
    <section class="footer-brand-column">
      <h2 id="footer-title">Viví San Roque</h2>
      <p>Portal oficial de turismo y cultura de la Municipalidad de San Roque.</p>
      <a href="https://www.instagram.com/sanroque.municipio" target="_blank" rel="noopener noreferrer">@sanroque.municipio</a>
      <span>SAN ROQUE · CORRIENTES</span>
    </section>
    <nav aria-label="Explorar San Roque"><h3>Explorá</h3><a href="#hero-section">Qué hacer</a><a href="#agenda">Agenda</a><a href="gastronomia.html">Gastronomía</a></nav>
    <nav aria-label="Planificar la visita"><h3>Planificá</h3><a href="#accommodations-carousel">Dónde alojarme</a><a href="#datos-utiles">Guía práctica</a><a href="#datos-utiles">Remises y servicios</a></nav>
    <nav aria-label="Canales institucionales"><h3>Institucional</h3><a href="https://munisanroque.ar" target="_blank" rel="noopener noreferrer">Municipalidad de San Roque</a><a href="https://www.instagram.com/sanroque.municipio" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.facebook.com/share/1AW5YTS5oZ/" target="_blank" rel="noopener noreferrer">Facebook</a></nav>
  </div>

  <div class="footer-credit-band">
    <span class="footer-credit-kicker">Proyecto educativo · Tecnología local</span>
    <strong>Desarrollado por estudiantes de 3.<sup>er</sup> año de la Tecnicatura Superior en Desarrollo de Software</strong>
    <span>Instituto Superior de Formación Docente «Juan García de Cossio»</span>
    <span>Autores: Daniel Almirón · Lucas Sánchez · Milca Martínez · Román Rossi · Tomás Rolet</span>
    <span>Ayudante: Javier Legal · Profesora: Yésica Ponce</span>
    <small>© 2026 Municipalidad de San Roque · Portal oficial de turismo y cultura · Todos los derechos reservados.</small>
  </div>
</footer>
```

- [ ] **Step 2: Verificar que los enlaces sean navegables y externos seguros**

Run: `rg -n -P 'target="_blank"(?![^>]*rel="noopener noreferrer")' index.html`

Expected: sin coincidencias dentro del footer.

- [ ] **Step 3: Ejecutar pruebas estructurales**

Run: `node --test tests/frontend-footer-weather.test.js`

Expected: estructura y contenido pasan; color y responsive continúan en rojo.

- [ ] **Step 4: Commit**

```bash
git add index.html tests/frontend-footer-weather.test.js
git commit -m "feat(frontend): reconstruir estructura institucional del footer"
```

---

### Task 3: Reproducir la composición visual de la referencia

**Files:**
- Modify: `css/styles.css:920`
- Test: `tests/frontend-footer-weather.test.js`

**Interfaces:**
- Consumes: hooks creados en Task 2.
- Produces: footer desktop de cuatro columnas y adaptaciones tablet/móvil.

- [ ] **Step 1: Reemplazar las reglas del footer por tokens independientes**

```css
.site-footer {
  --footer-cream: #F6F1E7;
  --footer-hill: #244C1D;
  --footer-mid: #355F2B;
  --footer-main: #1F431B;
  --footer-deep: #142B13;
  --footer-gold: #D4A83C;
  --footer-text: #FFFFFF;
  --footer-muted: #D7E2CF;
  position: relative;
  margin-top: 104px;
  overflow: visible;
  background: var(--footer-main);
  color: var(--footer-text);
}
```

- [ ] **Step 2: Construir coronamiento, lomas y wordmark superpuesto**

```css
.footer-crown { position: relative; height: 104px; background: var(--footer-cream); }
.footer-hills { position: absolute; inset: 38px 0 0; overflow: hidden; background: var(--footer-hill); }
.footer-hills::before, .footer-hills::after { content: ""; position: absolute; width: 62%; height: 100px; bottom: 28px; border-radius: 50% 50% 0 0; background: var(--footer-hill); }
.footer-hills::before { left: -7%; transform: rotate(2deg); }
.footer-hills::after { right: -8%; transform: rotate(-2deg); }
.sr-wordmark-footer { position: absolute; z-index: 2; left: 50%; bottom: 18px; transform: translateX(-50%); width: max-content; max-width: 92vw; font-size: clamp(58px, 8.6vw, 128px); line-height: .82; letter-spacing: -.045em; }
.sr-wordmark-footer span { text-shadow: 0 -1px 0 rgba(255,255,255,.34), 2px 2px 0 #1A1A16, 4px 4px 0 #11120E, 7px 8px 14px rgba(0,0,0,.46); }
```

- [ ] **Step 3: Implementar redes y cuadrícula institucional**

```css
.footer-social-band { display: grid; place-items: center; min-height: 138px; padding: 32px 24px; border-top: 3px solid var(--footer-gold); background: radial-gradient(circle at 50% 15%, #47783B 0%, var(--footer-mid) 58%, #2B5424 100%); }
.footer-social-links { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
.footer-social-links a { min-height: 46px; display: inline-flex; align-items: center; gap: 10px; padding: 0 20px; border-radius: 999px; background: #F7F2E8; color: #193A18; font-size: 13px; font-weight: 800; text-decoration: none; box-shadow: 0 8px 22px rgba(11,35,13,.18); }
.footer-navigation { display: grid; grid-template-columns: 1.35fr repeat(3, 1fr); gap: clamp(28px, 5vw, 76px); max-width: 1240px; margin: 0 auto; padding: 48px 28px 52px; background: var(--footer-main); }
.footer-navigation nav, .footer-brand-column { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
.footer-navigation h2 { margin: 0 0 4px; font: 800 clamp(26px, 2.4vw, 36px)/1 "Syne", sans-serif; }
.footer-navigation h3 { margin: 0 0 5px; color: #E2BD58; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; }
.footer-navigation a { color: var(--footer-text); text-decoration: none; line-height: 1.35; }
.footer-navigation nav a::before { content: "—"; margin-right: 10px; color: #8AA970; }
.footer-brand-column p { max-width: 300px; margin: 0; color: var(--footer-muted); line-height: 1.6; }
.footer-brand-column > span { margin-top: 5px; color: #BFD0B2; font-size: 10px; font-weight: 800; letter-spacing: .17em; }
```

- [ ] **Step 4: Implementar franja de créditos**

```css
.footer-credit-band { display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 31px 24px 28px; background: var(--footer-deep); color: #9EB292; text-align: center; font-size: 12px; }
.footer-credit-kicker { color: #E2BD58; font-size: 10px; font-weight: 850; letter-spacing: .16em; text-transform: uppercase; }
.footer-credit-band strong { color: #EFF5EA; font-size: 13px; }
.footer-credit-band small { width: min(1180px, 100%); margin-top: 8px; padding-top: 14px; border-top: 1px solid rgba(226,189,88,.28); color: #7F9676; }
```

- [ ] **Step 5: Agregar responsive explícito**

```css
@media (max-width: 900px) {
  .footer-navigation { grid-template-columns: 1.4fr 1fr 1fr; }
  .footer-navigation nav:last-child { grid-column: 2 / -1; }
}
@media (max-width: 560px) {
  .site-footer { margin-top: 72px; }
  .footer-crown { height: 78px; }
  .footer-hills { inset-block-start: 34px; }
  .sr-wordmark-footer { bottom: 13px; font-size: clamp(44px, 15vw, 68px); }
  .footer-social-band { min-height: 112px; padding: 26px 18px; }
  .footer-social-links { width: 100%; }
  .footer-social-links a { flex: 1; justify-content: center; padding-inline: 14px; }
  .footer-navigation { grid-template-columns: 1fr 1fr; gap: 32px 20px; padding: 38px 22px 42px; }
  .footer-brand-column { grid-column: 1 / -1; }
  .footer-navigation nav:last-child { grid-column: 1 / -1; }
}
```

- [ ] **Step 6: Verificar pruebas**

Run: `node --test tests/frontend-footer-weather.test.js tests/portal-ux.test.js`

Expected: footer y responsive pasan; solo clima permanece pendiente.

- [ ] **Step 7: Commit**

```bash
git add css/styles.css tests/frontend-footer-weather.test.js
git commit -m "feat(frontend): aplicar footer editorial institucional"
```

---

### Task 4: Sustituir el celeste del clima por terracota

**Files:**
- Modify: `css/styles.css:46`
- Test: `tests/frontend-footer-weather.test.js`

**Interfaces:**
- Consumes: `.weather-sky`, `.weather-pill`, `.weather-widget` y IDs actuales.
- Produces: mismos estados y comportamiento con paleta complementaria.

- [ ] **Step 1: Reemplazar el bloque meteorológico**

```css
/* ── WEATHER WIDGET · terracota complementario del oliva ── */
:root {
  --weather-900: #4B211C;
  --weather-800: #6F2F25;
  --weather-650: #98452E;
  --weather-500: #B85E38;
  --weather-sun: #FFD27A;
  --weather-text: #FFFFFF;
}
.weather-sky { background: linear-gradient(155deg, var(--weather-900) 0%, var(--weather-800) 54%, var(--weather-650) 100%); box-shadow: 0 18px 44px -18px rgba(75,33,28,.72); }
.weather-pill { background: linear-gradient(135deg, var(--weather-800) 0%, var(--weather-650) 100%); border-color: rgba(255,210,122,.34) !important; }
.weather-pill span { color: var(--weather-text); text-shadow: 0 1px 3px rgba(45,16,13,.6); }
.weather-pill .text-sun-haze, .weather-panel .text-sun-haze, .weather-panel .text-golden-sand { color: var(--weather-sun) !important; }
.weather-widget:hover .weather-pill, .weather-widget:focus-within .weather-pill { background: linear-gradient(135deg, #5B261F 0%, var(--weather-500) 100%); }
```

- [ ] **Step 2: Mantener la legibilidad de métricas secundarias**

```css
.weather-panel .text-white\/50 { color: rgba(255,255,255,.72) !important; }
.weather-panel .text-white\/70 { color: rgba(255,255,255,.86) !important; }
.weather-panel .bg-white\/10 { background: rgba(255,255,255,.10) !important; border-color: rgba(255,210,122,.16) !important; }
```

- [ ] **Step 3: Ejecutar prueba de paleta**

Run: `node --test tests/frontend-footer-weather.test.js`

Expected: PASS y ninguna ocurrencia de la antigua paleta azul dentro del bloque weather.

- [ ] **Step 4: Confirmar que no se tocó la lógica meteorológica**

Run: `git diff -- js/app.js`

Expected: salida vacía.

- [ ] **Step 5: Commit**

```bash
git add css/styles.css tests/frontend-footer-weather.test.js
git commit -m "style(frontend): reemplazar clima celeste por terracota"
```

---

### Task 5: QA visual, accesibilidad y cierre

**Files:**
- Modify: `index.html`, `css/styles.css`
- Test: `tests/frontend-footer-weather.test.js`, `tests/portal-ux.test.js`

**Interfaces:**
- Produces: footer y clima verificables en producción sin regresiones del portal.

- [ ] **Step 1: Ejecutar pruebas específicas**

Run: `node --test tests/frontend-footer-weather.test.js tests/portal-ux.test.js`

Expected: todas PASS.

- [ ] **Step 2: Ejecutar sintaxis y suite pública**

Run: `node --check js/app.js && node --test tests/data-normalization.test.js tests/data-loads-fast.test.js tests/favicon-branding.test.js`

Expected: todas PASS.

- [ ] **Step 3: Capturar desktop**

Viewport: `1440 × 1000`.

Comprobar:

```text
El wordmark sobresale sobre las lomas sin cortarse.
Los dos botones sociales quedan centrados sobre la franja verde media.
Las cuatro columnas mantienen alineación superior y texto blanco.
Los créditos tienen contraste y no compiten con la navegación.
El clima se percibe terracota, no azul, y 22° continúa legible.
```

- [ ] **Step 4: Capturar tablet y móvil**

Viewports: `768 × 1024` y `375 × 812`.

Comprobar:

```text
No existe scroll horizontal.
El wordmark no sale del viewport.
Instagram y Facebook mantienen 44 px de alto.
Las columnas bajan a dos y luego a una agrupación legible.
El chatbot no tapa el copyright ni los enlaces.
```

- [ ] **Step 5: Verificar teclado y movimiento reducido**

```text
Tab alcanza redes y todos los enlaces del footer en orden lógico.
Focus visible usa dorado sobre verde.
Con prefers-reduced-motion: reduce no hay elevación ni desplazamiento animado.
```

- [ ] **Step 6: Revisar diff final**

Run: `git diff --check && git status --short`

Expected: sin whitespace inválido; únicamente archivos definidos en este plan y cambios previos del admin preservados.

---

## Criterios de aceptación

- Footer desktop coincide con la composición de la segunda imagen: wordmark superpuesto, lomas, franja social, cuatro columnas y créditos.
- Texto y enlaces del footer tienen contraste claro; no aparece texto negro sobre verde.
- El footer conserva URLs oficiales, autores, institución, ayudante, profesora y copyright 2026.
- En 375 px no hay desborde horizontal ni wordmark recortado.
- El módulo de clima no contiene celeste/azul y usa terracota `#6F2F25 → #98452E`.
- `light_mode` usa `#FFD27A`; temperatura y métricas usan blanco.
- La lógica de clima y sus endpoints no cambian.
- Pruebas específicas y públicas pasan; `git diff --check` queda limpio.

## Fuera de alcance

- Cambiar hero, cards, mapa, chatbot o páginas secundarias.
- Cambiar API meteorológica o lógica de datos.
- Reemplazar el wordmark multicolor.
- Rediseñar el panel admin.
- Incorporar nuevas redes sociales o contenido institucional no suministrado.
