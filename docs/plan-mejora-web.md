# Plan de mejora · Portal turístico San Roque

Fecha: 2026-09-29. Estado: ejecutado el mismo día (ver "Resultado" al final).

## Fase 1 · Limpieza y peso (1–2 días)
Objetivo: carga rápida en celular con datos móviles, que es el uso real del turista.

- [ ] Reemplazar `img/hero.jpg.jpg` (447 KB, nombre con doble extensión) por WebP/AVIF; comprobar que sigue en uso.
- [ ] Pasar el resto de fotos `.jpeg` sueltas de `img/` (Plaza, Museo, costanera, PEATONAL, comidas, hospedajes) a WebP con `srcset`, como ya se hace en `img/alojamientos/` y `img/monjita/`.
- [ ] `san-roque.mp4` (2,4 MB): cargarlo solo en pantallas anchas y con `preload="none"`, con póster WebP; en móvil mostrar solo el póster.
- [ ] `turisbot-logo.png` (255 KB): convertir a WebP/SVG y dimensionarlo a su tamaño real.
- [ ] Renombrar archivos con espacios y mayúsculas (`PUENTE HISTORICO 2.jpeg`, `Plaza San Roque.jpeg`) a `kebab-case` y actualizar referencias.
- [ ] Quitar `Dev_Software_SanRoque-main.zip` y `js/*.code-workspace` del repositorio (archivos de trabajo, no del sitio).
- **Medir:** Lighthouse móvil antes y después. Meta: LCP < 2,5 s, CLS < 0,1, rendimiento ≥ 90.

## Fase 2 · Dependencias externas (1 día)
- [ ] Tailwind por CDN + Font Awesome + Leaflet + AOS + 4 familias de Google Fonts: dejar una sola familia de texto y una de títulos (máx. 2, según buena práctica web).
- [ ] Sustituir Font Awesome por los íconos Material que ya se usan, o por SVG propios; quitar AOS si solo anima aparición.
- [ ] Autoalojar fuentes (`font-display: swap`) y cargar Leaflet solo en las páginas con mapa.
- [ ] Añadir `Content-Security-Policy` y cabeceras de seguridad en `deploy/nginx.conf`.

## Fase 3 · Contenido y estructura (2–3 días)
- [ ] **Agenda única:** hoy el calendario anual está fijo en `index.html` y los eventos vienen del panel admin. Mover la agenda anual al panel (colección "fiestas anuales") para que se edite sin tocar código y se reutilice en `agenda.html`.
- [ ] Añadir en la portada un bloque "Cómo llegar" (RN 12, distancias desde Corrientes, Resistencia, Goya) y horarios del punto de informes; hoy solo está en el folleto.
- [ ] Página de "Recorrido histórico" que enlace las 10 paradas del folleto con las fichas de `que-hacer.html` (sin duplicar datos: una sola fuente en `js/data.js`).
- [ ] Teléfonos de alojamientos y comedores del folleto: verificar que coincidan con los del panel y con `alojamientos.html`.
- [ ] Versión en inglés (y quizá portugués, por cercanía con Brasil) de portada, agenda y guía práctica.

## Fase 4 · SEO y descubribilidad (1–2 días)
- [ ] `sitemap.xml` y `robots.txt` (no existen hoy).
- [ ] Datos estructurados JSON-LD: `TouristDestination` (portada), `LodgingBusiness`, `Restaurant`, `Event`.
- [ ] `lang="es-AR"` en todas las páginas (portada usa `es`); revisar canonical y OG de cada página.
- [ ] Alta en Google Business Profile del punto de informes y en Google Maps con las 10 paradas.
- [ ] Imagen OG específica por página (hoy una sola).

## Fase 5 · Accesibilidad y experiencia móvil (2 días)
- [ ] Auditoría WCAG 2.2 AA: contraste (verde sobre crema), foco visible, tamaño táctil ≥ 44 px, `prefers-reduced-motion` en animaciones y video.
- [ ] Menú inferior móvil + botón "Mi visita" + chatbot se superponen en pantallas chicas (se vio en la vista de 371 px): reorganizar para que no tapen contenido.
- [ ] Probar con lector de pantalla las tarjetas de eventos con `aria-live`.
- [ ] Funcionamiento sin conexión (PWA básica: `manifest` + service worker con caché de portada, agenda, guía práctica y mapa). Útil en zonas con señal débil.

## Fase 6 · Calidad y operación (continuo)
- [ ] Tests: añadir prueba que falle si una página enlaza a un archivo inexistente (habría detectado el enlace roto del folleto) y otra de tamaño máximo de imágenes.
- [ ] Lighthouse CI en GitHub Actions con umbrales (rendimiento ≥ 90, accesibilidad ≥ 95, SEO ≥ 95).
- [ ] `js/app.js` (1.434 líneas): dividir por sección (eventos, mapa, chatbot) para mantenerlo bajo ~800 líneas.
- [ ] Analítica ya existente (`track.js`): definir 4 métricas — clics al PDF del folleto, a WhatsApp de alojamientos, aperturas del chatbot y vistas de agenda — y revisarlas cada mes.
- [ ] Protocolo de actualización: quién carga eventos, quién revisa teléfonos y con qué frecuencia (mensual).

## Orden recomendado
1 → 4 → 3 → 5 → 2 → 6. Las fases 1 y 4 dan el mayor beneficio con menos riesgo; la 3 es la que más valor da al turista.

## Fuera de alcance por ahora
Reservas en línea, pagos, cuentas de usuario y app nativa: no se justifican hasta que la analítica muestre demanda.

## Resultado (2026-09-29)
- **Fase 1:** eliminados el `.zip`, el `.code-workspace` y `san-roque.mp4` (2,4 MB, sin uso); logo del bot y hero pasados a WebP; imágenes >300 KB recomprimidas. Los `.jpeg` con espacios en el nombre **no se renombraron**: el panel admin guarda esas rutas en su base de datos.
- **Fase 2:** fuentes autoalojadas (Manrope y Quicksand, 2 familias); fuera Syne, JetBrains Mono, Font Awesome (solo 3 íconos, ahora SVG) y AOS. Leaflet ya cargaba solo en portada y alojamientos. La CSP ya existía; se quitó `cdnjs` de la lista.
- **Fase 3:** agenda anual en un solo archivo (`js/agenda-anual.js`) usada por portada y agenda; bloque "Cómo llegar"; recorrido de 10 paradas en Qué hacer; páginas `/en/` y `/pt/`; teléfonos del folleto cargados en los datos base (había 9 alojamientos sin teléfono y Don Pedro / Esquivel estaban cruzados en el seed). *No se movió la agenda anual al panel admin.*
- **Fase 4:** `sitemap.xml` y `robots.txt` ya existían (los genera el admin); se sumaron las páginas estáticas y `/en/`, `/pt/`. JSON-LD `TouristDestination`, `lang="es-AR"`, hreflang e imagen OG propia por sección.
- **Fase 5:** manifiesto + service worker (portada, agenda y guías abren sin conexión); "Mi visita" compacto en móvil; foco visible y objetivos táctiles de 44 px. La auditoría con lector de pantalla queda pendiente (requiere prueba manual).
- **Fase 6:** tests de enlaces rotos, peso de imágenes y PWA; workflow semanal de Lighthouse; `app.js` dividido (1.431 → 633 líneas + `chatbot.js`); métricas nuevas (folleto, chatbot) en la analítica; protocolo en `docs/protocolo-actualizacion.md`.
