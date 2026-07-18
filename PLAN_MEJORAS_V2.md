# Plan de mejora — Portal Viví San Roque

**Proyecto:** `Dev_Software_SanRoque`  
**Sitio:** https://vivisanroque.munisanroque.ar  
**Stack:** HTML/CSS/JS vanilla, Leaflet, admin Node (`deploy/admin`), clima proxy, Docker/Nginx/Traefik  
**Fecha del plan:** 2026-07-17  
**Estado:** Plan guardado · v2 (dirección de arte + anti-saturación de verde)

---

## 1. Contexto y objetivo

El portal municipal de turismo ya tiene funcionalidad sólida (alojamientos, gastronomía, mapa, clima, monjita, TurisBot, admin). Hoy la percepción se ve limitada por:

1. **Contenido visual incompleto** (placeholders y rutas rotas).
2. **Saturación de verde oliva** en grandes superficies (hero overlays, splash, footer, badges) que compite con las fotos.
3. **Peso de assets** (logo 1,2 MB, video 72 MB, JPEG pesados).
4. **Inconsistencias** entre páginas y menú móvil.
5. **Admin denso** para operadores municipales.
6. **Higiene de repo** (legados, cookies, capturas de validación).

**Objetivo:** un portal **premium de turismo regional** (naturaleza + cultura + gastronomía + hospedaje), moderno, minimalista y elegante: mucho aire, fotos protagonistas, navegación clara y sensación institucional sin verse “todo verde”.

**Restricciones técnicas:**
- Mantener stack vanilla + admin actual (sin React/Next).
- No tocar secretos ni ampliar RBAC.
- Logo municipal **solo** en branding (splash compacto, favicon, login), nunca como foto de contenido.
- No copiar el diseño de Turismo de Oberá: **replicar principios** (aire, foto, claridad), no su layout pixel a pixel.
- Deploy a prod solo con confirmación del usuario.

---

## 2. Dirección de arte (Director de Arte Senior · turismo gastronómico)

### 2.1 Principios (inspirados en portales turísticos premium, tipo Oberá)

| Principio | Qué implica en San Roque |
|-----------|--------------------------|
| **Foto primero** | Las imágenes de platos, paisajes y hospedajes ocupan el 60–70 % del peso visual; el color de marca es acento, no relleno |
| **Mucho espacio en blanco** | Márgenes generosos, secciones con respiro, menos cajas verdes apiladas |
| **Minimalismo elegante** | Menos decoración (gradientes pesados, badges densos); más tipografía y foto |
| **Jerarquía clara** | 1 H1, subtítulo, CTA; luego grilla de cards |
| **Naturaleza + autenticidad** | Madera, luz natural, vegetación y cocina regional en el estilo fotográfico |
| **Mobile first** | Cards a 1 columna, filtros scrollables, targets ≥ 44 px |
| **Institucional sin saturación** | Verde de marca en botones, links y detalles — **no** en fondos de página enteros |

### 2.2 Regla no negociable: no saturar con verde oliva

**Prohibido / a eliminar o reducir:**
- Fondos de sección enteros en `#274F10` / oliva sólido.
- Overlays verdes opacos sobre fotos del hero (usar negro suave o scrim neutro `rgba(0,0,0,.35–.45)`).
- Splash a pantalla completa verde durante mucho tiempo (acortar o fondo crema + crest pequeño).
- Footer de 3 franjas **todas** verdes oscuras → aligerar: crema + una franja verde acotada + créditos neutros.
- Badges, pills y chips con relleno oliva masivo.

**Permitido (uso controlado del verde):**
- Botones primarios y estados hover.
- Links activos y subrayados sutiles.
- Borde izquierdo de títulos de sección (4 px).
- Iconos de categoría y marcadores del mapa.
- Máximo **~15–20 %** del área visible en viewport desktop como superficie verde de marca.

### 2.3 Nueva paleta (tokens CSS)

| Token | Hex | Uso |
|-------|-----|-----|
| `--brand-primary` | `#355E4A` | Botones, links activos, acentos de marca (verde salvia institucional, **más suave** que el oliva actual `#274F10`) |
| `--brand-primary-hover` | `#2C4F3D` | Hover de botones |
| `--surface` | `#F6F3EE` | Fondo de página (crema cálido — “aire” y anti-saturación) |
| `--surface-elevated` | `#FFFFFF` | Cards, paneles |
| `--text` | `#2F2F2F` | Cuerpo y títulos |
| `--text-muted` | `#5C5C5C` | Secundario |
| `--accent` | `#D8A441` | Dorado: focus, badges premium, detalles (escaso) |
| `--border` | `rgba(47,47,47,.08)` | Bordes de cards |
| `--shadow` | `0 8px 24px rgba(47,47,47,.08)` | Elevación sutil |
| `--radius-card` | `16px` | Todas las tarjetas |
| `--motion` | `300ms` | Hover, fade, elevación |

**Migración desde la paleta actual:**
- Sustituir usos masivos de `#274F10` / `#336a15` por `--brand-primary` solo en controles.
- Fondo `bg-background` / body → `--surface` (`#F6F3EE`), no verde.
- Clima terracota: **conservar** (contrapeso cálido ya validado; no volver al celeste).
- Wordmark multicolor del footer: conservar como sello de identidad local.

### 2.4 Tipografía

| Rol | Familia | Peso |
|-----|---------|------|
| Títulos | **Manrope** (preferida) o Inter | Bold (700) |
| Subtítulos | Manrope / Inter | Semibold (600) |
| Cuerpo | Manrope / Inter | Regular (400) |
| UI labels | Manrope / Inter | Medium (500), caps opcionales con tracking moderado |

**Acción:** reemplazar Syne + DM Sans + JetBrains en el portal público por Manrope (1 familia, menos requests). Material Symbols se puede mantener para iconos; Font Awesome solo si hace falta (ideal: un solo set).

### 2.5 Estilo fotográfico (brief para contenido)

- Cocina regional, luz natural, tonos cálidos, madera y vegetación.
- Composición editorial (no selfies ni fotos con logo superpuesto).
- Priorizar: platos locales, costanera, plaza, puente, fachadas de hospedaje.
- Placeholders neutros **crema/madera**, nunca escudo municipal.

### 2.6 Componentes de UI (especificación)

| Componente | Spec |
|------------|------|
| **Hero** | Imagen panorámica full-bleed; scrim neutro; título blanco o sobre panel crema translúcido; CTA primario + secundario ghost |
| **Buscador** | Input pill o barra redondeada 16px sobre hero o bajo hero; placeholder “Buscar alojamiento, plato o lugar…” |
| **Filtros** | Chips horizontales scroll (Todo / Hotel / Hospedaje / Restaurante / Evento); chip activo = relleno brand, inactivo = blanco + borde |
| **Cards** | `border-radius: 16px`, sombra suave, imagen 16:10 o 4:3 arriba, título, meta (rating, ubicación), hover elevación + `translateY(-4px)` en 300ms |
| **Carrusel** | Galería de detalle y monjita: snap horizontal, dots, lazy |
| **Contacto / horarios** | Bloque limpio con iconos outline; WhatsApp como CTA secundario verde brand |
| **Google Maps** | Botón outline “Ver en Maps” |
| **CTA reservas** | Primario brand; en detalle de alojamiento/gastro |
| **Footer turístico** | Crema + una franja brand acotada; redes; enlaces; créditos; **sin** tres verdes apilados densos |
| **Nav** | Barra clara al scrollear (fondo crema/blanco 95% blur); sobre hero puede ser transparente con texto blanco |

### 2.7 Microinteracciones

- Hover cards: elevación + sombra, **300 ms**, ease suave.
- Fade-in / scroll-reveal: opcional y **desactivado** si `prefers-reduced-motion`.
- Botones: hover color `#2C4F3D`, scale máximo 1.02 (sutil).
- No bounce agresivo ni animaciones &gt; 400 ms en UI crítica.

### 2.8 Objetivo de sensación

> Experiencia **premium** de turismo regional: naturaleza, cultura y cocina local como protagonistas. Institucional, moderno, elegante, acogedor y altamente usable — **sin murales de verde oliva**.

---

## 3. Diagnóstico técnico (repo — se conserva)

### 3.1 Qué ya funciona

| Área | Estado |
|------|--------|
| Portal multi-página + mapa + clima + bot | Operativo |
| Fallback sin escudo en hoteles | `PLACEHOLDER_ALOJ_IMG = hero.jpg.jpg` en `js/data.js` |
| Footer renovado + clima terracota | En `css/styles.css` |
| Deploy Docker + tests | Maduro para pasantía |

### 3.2 Problemas abiertos

| # | Problema | Impacto |
|---|----------|---------|
| A | Placeholders / `hero.jpg.jpg` en alojamientos y gastro | Cards poco creíbles |
| B | Seed `fotos/*.png` inexistentes en `admin.json` | 404 al reseedeear |
| C | Verde oliva dominante en UI | Compite con fotos; no se siente premium |
| D | `logo-muni.jpg` ~1,2 MB | LCP malo |
| E | `san-roque.mp4` ~72 MB | Repo/deploy pesados |
| F | Menú móvil `href="#"` / anclas rotas en home | Navegación inconsistente |
| G | Tipografía y páginas secundarias heterogéneas | Menos editorial |
| H | Admin denso | Operación lenta |
| I | Cookies y artefactos en repo | Riesgo / ruido |

---

## 4. Fases de implementación

### Fase P0 — Contenido e imágenes (1–2 días) — primero

Sin fotos reales, el rediseño se ve vacío.

1. Sanear `deploy/admin/data/admin.json` (`fotos/` → `img/…` válidas).
2. Actualizar `js/data.js` y `js/gastronomiaData.js` (placeholders neutros, no logo).
3. Crear `img/placeholder-alojamiento.webp` y `img/placeholder-gastro.webp` (crema/naturaleza).
4. Validar en `server.js`: no publicar con imagen vacía, `"x"` o `logo-muni`.
5. QA: cards sin escudo; Ariana/Estela con JPEG reales.

### Fase P1 — Sistema de diseño anti-saturación (2–3 días)

**Archivos:** `css/styles.css`, `css/tw-base.css` (tokens), `index.html` (clases de fondo), páginas secundarias.

1. Definir tokens de §2.3 en `:root`.
2. Body y secciones → `--surface` / blanco; **sacar verdes de fondo**.
3. Botones y nav activos → `--brand-primary` / hover.
4. Cards unificadas: radius 16px, sombra sutil, hover 300ms.
5. Hero: scrim neutro; menos overlay verde.
6. Splash: más corto o fondo crema + logo optimizado.
7. Footer: aligerar verdes (crema + una franja brand + créditos).
8. Tipografía → Manrope (Google Fonts o self-host).
9. Actualizar tests de color (`portal-ux`, footer/weather) para la nueva paleta **sin** exigir fondos oliva masivos.

### Fase P2 — Layout y componentes premium (3–5 días)

1. **Hero panorámico** + CTAs (Explorar hospedajes / Gastronomía).
2. **Buscador** + **filtros por categoría** (chips) en home y gastronomía.
3. **Grilla de cards** editorial (foto grande, meta mínima).
4. Detalle: carrusel, horarios, contacto, WhatsApp, Maps, CTA reserva.
5. Nav coherente desktop = hamburguesa = bottom nav (arreglar `href="#"`).
6. Unificar header/footer entre páginas (`js/layout.js` o includes).
7. Páginas `gastronomia.html`, `agenda.html`, `que-hacer.html`, `guia-practica.html` al mismo lenguaje visual.
8. A11y: foco, contraste sobre crema, monjita modal, reduced-motion.
9. SEO: OG 1200×630 fotográfico; títulos únicos.

### Fase P3 — Rendimiento (en paralelo a P1–P2)

| Asset | Acción | Meta |
|-------|--------|------|
| Logo splash | Comprimir a ≤120 KB WebP/JPG | LCP |
| JPEG de `img/` | WebP / reencode | Cards &lt; 100 KB |
| Video 72 MB | Fuera del path crítico / LFS / no first load | Deploy liviano |
| CDNs | Diferir Leaflet/AOS; un set de iconos | Menos bloqueo |

### Fase P4 — Admin usable (1 semana)

Según `docs/superpowers/plans/2026-07-16-admin-ui-vnext.md`:
- Drawer de edición, media picker, preview URL pública, toasts, resumen accionable.
- Validación de imagen alineada a la marca (no logo en contenido).
- UI admin puede seguir oliva **suave** en sidebar; no rehacer admin con la misma saturación del portal viejo.

### Fase P5 — Higiene de repo

- Quitar cookies del tracking; capturas a `output/` o gitignore.
- Legado `WEB_MUNI.html` / `JSS/`: no linkear; documentar.
- Confirmar `.env` fuera del artefacto público.

---

## 5. Orden sugerido

```text
Semana 1
  P0     Contenido + placeholders + validación publish
  P1     Tokens, fondos crema, botones brand, cards 16px, tipografía, footer liviano
  P3.1   Comprimir logo + 6–8 fotos clave

Semana 2
  P2     Hero, buscador, filtros, grillas, nav unificada, gastronomía premium
  P3.2   Lazy third-party + lazy images

Semana 3
  P4     Admin drawer + media picker
  P5     Limpieza repo + QA Lighthouse + capturas 375/768/1440
```

---

## 6. Archivos principales

| Prioridad | Archivo | Qué |
|-----------|---------|-----|
| P0 | `js/data.js`, `js/gastronomiaData.js`, `admin.json`, `server.js` | Datos e imágenes |
| P1–P2 | `css/styles.css`, `css/tw-base.css` | Tokens, anti-verde, cards, hero, footer |
| P1–P2 | `index.html`, `gastronomia.html`, demás HTML | Layout premium, nav, tipografía |
| P2 | `js/app.js`, `js/gastronomia.js` | Buscador, filtros, cards, lazy |
| P2 | `js/layout.js` (nuevo, opcional) | Nav/footer compartidos |
| P3 | `img/*` | Optimización + placeholders |
| P4 | `deploy/admin/static/*` | UX operativa |

---

## 7. Criterios de aceptación

### Dirección de arte
- [ ] Fondo de página crema/blanco; **ninguna** sección full-bleed verde oliva excepto franja de footer acotada o botones.
- [ ] Verde de marca visible sobre todo en CTAs y estado activo (≤ ~20 % del viewport).
- [ ] Cards 16px, sombra suave, hover 300ms.
- [ ] Tipografía Manrope/Inter legible; títulos bold.
- [ ] Gastronomía y hospedajes se sienten “editorial / premium”, no plantilla municipal densa.

### Contenido y perf
- [ ] Cero escudo en cards de contenido.
- [ ] Logo splash ≤ 150 KB.
- [ ] Menús alineados en las 5 destinos.
- [ ] Lighthouse Mobile: mejora medible vs baseline (Performance + a11y).

### Operación
- [ ] `/api/data` poblado en prod tras seed.
- [ ] Admin: editar + foto en &lt; 2 min; preview = portal.

---

## 8. Verificación

1. `node --test tests/*.test.js` (actualizar asserts de color/estructura).
2. Local: servidor estático o docker compose.
3. Capturas 1440 / 768 / 375: home, gastronomía, detalle, footer.
4. Checklist visual “anti-saturación”: captura con máscara — el verde no debe dominar el frame.
5. Smoke prod post-deploy: imágenes 200, favicon ok.

---

## 9. Fuera de alcance

- Copiar layout de Oberá u otro municipio.
- Migración a framework SPA.
- Rediseño total del chatbot o del clima (solo encaje visual con tokens).
- Multi-idioma / app nativa.

---

## 10. Relación con planes previos (conservados)

| Documento | Rol |
|-----------|-----|
| Este `plan.md` v2 | **Fuente de verdad** de la mejora (guardado) |
| `PLAN_MEJORAS.md` del repo | P0 imágenes/admin; complementar con anti-verde y dirección de arte |
| `2026-07-16-admin-ui-vnext.md` | Detalle de Fase P4 |
| `2026-07-16-frontend-footer-weather-refresh.md` | Base del footer; **evolucionar** hacia menos verde, más crema |

---

## 11. Primer paso al ejecutar

1. Congelar tokens CSS (`:root`) y una card de referencia en `styles.css`.
2. P0 datos/imágenes en paralelo.
3. Migrar body + hero + cards del home (sin tocar admin todavía).
4. Luego gastronomía como vitrina “foto primero”.
5. Seed/prod solo con confirmación.

---

*Plan v2 guardado: contenido + rendimiento + admin + **dirección de arte premium sin saturar de verde oliva**.*
